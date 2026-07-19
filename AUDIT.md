# AUDIT — DÆMON Production HQ v3.0.0

Revisione da senior engineer esterno. Ambito: architettura, data layer Supabase e RLS, gestione errori, performance, sicurezza, accessibilità. Nessuna modifica applicata: solo rilievi, ordinati per gravità, con stima di sforzo (**S** < 1h · **M** ≈ mezza giornata · **L** 1-2 giorni).

Contesto assunto: strumento interno per team di 2-5 persone fidate. Alcuni rilievi "bassi" lo sarebbero molto meno se l'app fosse esposta a utenti esterni.

---

## 🔴 Critici

### C1 — Chiunque si registri diventa membro del team con pieni poteri
**Dove:** modello RLS (`0002`+) — quasi tutte le policy sono `to authenticated using (true)`.
Il confine di sicurezza dell'intera app è "essere autenticati". Ma con le impostazioni di default di Supabase **le signup via email sono aperte**: chiunque conosca l'URL del sito può inserire la propria email, ricevere l'OTP e ottenere lettura+scrittura+cancellazione su tutti i dati del brand (fornitori, contratti, KPI, revenue). Non è verificabile dal codice se le signup siano già state chiuse nel dashboard: **da verificare subito**.
**Rimedio:** Dashboard → Authentication → disabilitare "Allow new users to sign up" (il team esistente continua a loggarsi) — oppure una tabella `allowed_emails` + policy/trigger che rifiuti profili non in lista.
**Sforzo:** S (config) / M (allowlist robusta).

---

## 🟠 Alti

### A1 — Bucket storage pubblico in lettura, PDF dei tech pack inclusi
**Dove:** `0002_domain_tables.sql` (`public: true`), `0005` estende ai PDF.
Le schede tecniche sono "il contratto col fornitore" (parole della UI) e stanno su URL pubblici: chiunque ottenga un link (inoltro, log, screenshot) accede al file senza login, per sempre. I path UUID non sono indovinabili ma non sono una protezione.
**Rimedio:** bucket privato + `createSignedUrl` con scadenza al posto di `getPublicUrl` (toccare `upload.ts` e i punti di render; le URL firmate vanno richieste async → piccolo refactor su thumb/lightbox/cartelle).
**Sforzo:** M/L.

### A2 — Date calcolate in UTC: countdown e "oggi" sbagliati di un giorno la sera
**Dove:** `src/lib/format.ts` → `todayIso()` usa `toISOString()` (UTC); `daysUntil()` confronta date-only parse-ate come UTC.
In Italia (UTC+1/+2), tra mezzanotte e l'1/2 di notte `todayIso()` restituisce **ieri**: il countdown T−N, il marker "oggi" del calendario, gli alert "SCADUTA/7 GIORNI" e la vista anno sbagliano di un giorno. Anche `fmtDate(created_at)` (slice dell'ISO UTC) mostra il giorno precedente per le attività serali.
**Rimedio:** `todayIso` da componenti locali (`getFullYear/Month/Date`), stessa cosa per la formattazione dei timestamp.
**Sforzo:** S.

### A3 — Nessun Error Boundary: un errore di render = schermo bianco
**Dove:** `App.tsx` / `main.tsx`.
Query e mutation hanno gestione errori buona (retry, toast, messaggi nel modal), ma un'eccezione in fase di render (dato inatteso, bug) fa crollare l'intero albero React senza alcun messaggio. Per una PWA usata da telefono è un vicolo cieco: serve refresh manuale.
**Rimedio:** ErrorBoundary al livello App (e idealmente attorno a ogni pagina lazy) con schermata "qualcosa è andato storto + ricarica".
**Sforzo:** S.

### A4 — Dati stantii tra utenti: niente realtime e focus-refetch disattivato
**Dove:** `queryClient.ts` (`refetchOnWindowFocus: false`, scelto per il bugfix dei form) + nessuna subscription.
Le modifiche di un collega arrivano solo se l'utente naviga altrove e torna dopo i 30s di staleTime, o compie una mutation propria. Per uno strumento di team è facile lavorare su dati vecchi (es. due persone che modificano lo stesso tech pack: ultimo-che-salva-vince, senza accorgersene). Il widget attività mitiga ma non risolve.
**Rimedio:** Supabase Realtime (postgres_changes → invalidateQueries) sulle tabelle calde, oppure `refetchInterval` moderato — il sistema bozze già protegge i form aperti, quindi il motivo originale del blocco non vale più per i refetch in background.
**Sforzo:** M.

---

## 🟡 Medi

### M1 — Modal senza semantica né gestione focus
**Dove:** `components/Modal.tsx` (usato da ~20 flussi).
Nessun `role="dialog"`/`aria-modal`, il focus non entra nel modal all'apertura né torna al trigger alla chiusura, non c'è focus-trap, ed **Escape non chiude** (chiude palette/sheet ma non i modal — incoerente). Screen reader e utenti tastiera si perdono. `ConfirmProvider` ha `role="alertdialog"` ma stessi problemi di focus.
**Rimedio:** role/aria-modal/aria-labelledby, autofocus sul primo campo, ritorno focus, Escape, trap (o adottare un piccolo primitive tipo `<dialog>` nativo).
**Sforzo:** M.

### M2 — Label non associate agli input
**Dove:** `components/FormFields.tsx` (tutti i form dell'app).
`<label>` è un fratello dell'input senza `htmlFor`/`id`: gli screen reader annunciano input anonimi e il click sulla label non porta il focus.
**Rimedio:** generare `id` dal `field.key` + `htmlFor` (3 punti nel file).
**Sforzo:** S.

### M3 — backdrop-blur su elementi ripetuti per-item
**Dove:** `global.css` — `.link-card`, `.drop-row`, `.drop-card`, `.chan-card` hanno blur ma sono renderizzati **in lista** (uno per link/drop/canale). Viola la regola dichiarata nel commit di Fase 1.5 ("blur solo su elementi persistenti, mai su liste") e su hardware modesto il costo è reale, aggravato dal `transform` hover che invalida il layer.
**Rimedio:** spostarli su `--solid-1` (come card/art-card); tenere il blur su header, modal, sheet, pannello widget, kcol (5 fissi), ticker.
**Sforzo:** S.

### M4 — NavContext monolitico e non memoizzato
**Dove:** `App.tsx` → `<NavContext.Provider value={{ ...12 campi... }}>` con oggetto ricreato a ogni render.
Ogni cambiamento di stato in AppShell (tab, sheet, palette, pendingEntity…) rifà il value → re-render di tutti i consumer (pagina, nav, widget, card che usano `useNav`). A questa scala regge, ma è attrito gratuito e crescerà.
**Rimedio:** `useMemo` sul value; opzionale: separare il context in due (azioni stabili / stato variabile).
**Sforzo:** S (memo) / M (split).

### M5 — Undo differito: due difetti del pattern
**Dove:** `ConfirmProvider.tsx`.
(a) Se l'utente chiude la tab entro i 5 secondi, il timer muore e **l'eliminazione non avviene mai**: l'utente crede di aver cancellato, l'elemento ricompare. (b) Durante la finestra di undo l'elemento resta visibile identico in lista: si può ricliccare "Elimina" (secondo timer sullo stesso id) e il feedback è ambiguo.
**Rimedio:** (a) flush della coda in `beforeunload` (o accettare e documentare); (b) rimozione ottimistica dalla cache React Query con ripristino su Annulla, oppure stato "in eliminazione…" sull'item.
**Sforzo:** M.

### M6 — Errore nel fetch del profilo → onboarding → rischio sovrascrittura
**Dove:** `auth/AuthContext.tsx` → `loadProfile` ignora l'errore (`maybeSingle` + data null).
Se la SELECT fallisce per rete, `profile=null` ⇒ stato `onboarding`: l'utente rivede "come ti chiami" e salvando fa upsert che può sovrascrivere nome/ruolo esistenti.
**Rimedio:** distinguere "profilo assente" da "fetch fallito" (errore → schermata retry, non onboarding).
**Sforzo:** S.

### M7 — URL non validati renderizzati come href/iframe
**Dove:** `LinkCard`, canali Chats, `media.url`, iframe Calendario.
I link salvati da un utente autenticato finiscono in `href` senza controllo di protocollo → `javascript:` eseguibile al click di un collega (XSS interno). L'URL dell'embed è validato solo nel client che lo salva: un insert diretto (o altro client) può mettere qualsiasi `src` nell'iframe di tutti.
**Rimedio:** helper `safeHref()` (solo http/https) nei punti di render + CHECK a DB sulla riga embed (`url like 'https://calendar.google.com/%'`).
**Sforzo:** S.

### M8 — recharts nel chunk della landing
**Dove:** Overview (~95KB gz del chunk sono recharts).
Overview è la pagina d'ingresso: paga il costo dei grafici anche per chi apre l'app per un'altra sezione da palette/scorciatoia.
**Rimedio:** lazy-load di `ChartBits` dentro Overview (Suspense sui soli grafici) o sostituire le sparkline con SVG hand-rolled (già fatto per i ring).
**Sforzo:** M.

---

## 🟢 Bassi

| # | Rilievo | Dove | Sforzo |
|---|---|---|---|
| B1 | `author_name`/`inserito_da` auto-dichiarati: un membro può firmare come un altro (l'`author_id` resta vero, ma la UI mostra il nome) | notes, team_memos, activity, kpi | S (render dal join su profiles o trigger che forza il nome) |
| B2 | Policy delete condivisa su `activity`: chiunque può svuotare il log (serve al trim FIFO client) | 0006 | S (trim via funzione SECURITY DEFINER o pg_cron) |
| B3 | Fetch-all senza paginazione su tutte le tabelle; media/notes/tasks cresceranno | features/*/queries.ts | M (quando serve) |
| B4 | Re-render a tappeto: ogni `ArticoloCard`/`NotesList` si sottoscrive alle liste intere (spuntare 1 task ridisegna tutte le card) | ArticoloCard, NotesList | M (select nelle query o memo per-card) |
| B5 | ~14 file di query con boilerplate CRUD identico: un factory `createCrudHooks(table)` dimezzerebbe il codice | features/ | M (facoltativo) |
| B6 | Colonna `ordine` su media/gadgets/inspo/links mai usata per riordino (la UI non esiste); media ordinati per created_at | schema + pagine | S (decidere: implementare o rimuovere dal modello mentale) |
| B7 | Ticker: contenuto duplicato ×2 per il loop letto due volte dagli screen reader | Overview | S (`aria-hidden` sulla seconda copia) |
| B8 | Google Fonts da CDN: dipendenza esterna a runtime, FOUT/CLS al primo load, tema GDPR | index.html | S (self-host con fontsource) |
| B9 | Bozze in sessionStorage senza scoping utente: logout/login di un altro utente nella stessa tab può ereditare/ripristinare bozze altrui | useFormDraft | S (userId nella chiave) |
| B10 | `useUpdateMedia` non restituisce la riga (unico difforme dal pattern) | features/media | S |
| B11 | Dead code minore: `.soon-pill` ormai senza consumatori (nessuna entry `soon`), keyframe `panelIn` usato solo dalla palette | tabs.ts, css | S |
| B12 | DnD kanban non annuncia nulla agli screen reader (le frecce restano l'alternativa accessibile — accettabile, ma da documentare) | Design.tsx | S (aria-live opzionale) |
| B13 | `activity` trim: cutoff calcolato dalla cache pre-insert; in teoria due client concorrenti possono potare qualche riga in più del cap | features/activity | S (spostare lato server, vedi B2) |

---

## Cosa funziona bene (per onestà di bilancio)

- RLS ovunque, con eccezioni pensate (notes/memos author-only; profiles self-write) — il problema è il confine (C1), non il disegno interno.
- Gestione errori di mutation uniforme (errore nel modal senza perdere l'input, toast altrove) + sistema bozze con debounce/beforeunload: sopra la media.
- Bundle disciplinato: code-splitting per pagina, cmdk e framer features in chunk separati, LazyMotion `strict`, recharts confinato (v. M8).
- `prefers-reduced-motion` rispettato sistematicamente su ~15 animazioni; focus-visible globale; 22 aria-label aggiunti in Fase 6.
- Migrations idempotenti e transazionali, rieseguibili senza danni; seed non distruttivi.
- Upload: validazione MIME+size sia client sia bucket, compressione client, errori per-file.

## Priorità suggerita

1. **Subito (mezz'ora):** C1 (verifica/chiusura signup) + A2 (timezone) + A3 (ErrorBoundary) + M2 (label) + M3 (blur liste) + M7 (safeHref).
2. **Prossima sessione:** A4 (realtime), M1 (modal a11y), M5 (undo robusto), M6 (profilo).
3. **Quando capita:** A1 (signed URLs — il più oneroso ma il più importante dopo C1), M4, M8, e i Bassi a piacere.
