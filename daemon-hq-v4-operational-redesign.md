# DÆMON HQ · v4 — Operational Redesign

> Documento per Claude Design (`/design-sync`) e Claude Code.
> Sostituisce l'impostazione del redesign v3. Il v3 ha consegnato il **linguaggio visivo** (glass, ember, tipografia, motion): quello si tiene. Il v4 cambia il **baricentro**: da app feature-driven (14 sezioni-database) ad app operations-driven (ogni schermata risponde a "come sta andando / cosa faccio adesso").

---

## 0. Diagnosi — perché serve il v4

**Cosa non ha funzionato nel v3.** Le 14 sezioni sono liste di record ben vestite. Nessuna schermata risponde alle domande operative quotidiane: *cosa devo fare oggi? cosa è cambiato? cosa è bloccato? come sta andando il drop?* La settimana di lavoro è andata quasi tutta sul layer decorativo (nav proximity, spider-lines, trapezoidi) perché lo spec v3 chiedeva quello. Il problema non era l'esecuzione: era il brief.

**Cosa ha funzionato in Digital Hub (1–2 prompt).** Brief orientato al risultato: poche sezioni-workspace, ognuna con pipeline di card azionabili (stati: Urgente / Da fare / In corso / Live / Pubblicato), scadenze visibili sulle card, stat in testa. L'utente entra e sa cosa fare.

**Cosa insegna PartnerTribe (screenshot di riferimento).** Zero effetti speciali, massima leggibilità operativa:
- **Sidebar sinistra fissa** con gruppi espandibili e voce attiva evidente — con 14 sezioni è più onesta di qualsiasi nav orizzontale creativa.
- **KPI card pattern**: numero grande + etichetta + progressbar + **una CTA** per card ("gestisci ›", "vai alla sezione ›"). Ogni numero è una porta, non un ornamento.
- **Gruppo "Documenti"** con Meeting Overview, Memo Meeting, Proposte, Contratti — la memoria decisionale e contrattuale del business, che a DAEMON HQ **manca del tutto**.

**Regola del v4:** ogni intervento si giudica con una sola domanda — *riduce il tempo tra "apro l'app" e "so cosa fare"?* Se no, non entra.

---

## 1. Cosa si tiene, cosa si ferma

**Si tiene (dal v3):** palette void/bone/ember, toast system, Framer Motion (LazyMotion strict), command palette cmd+K, stella ember pulsante, PWA, tutto il layer dati Supabase + RLS + Storage. La tipografia e le superfici seguono le **regole finali di §1.1** (che aggiornano il v3: via IBM Plex Mono, via i container).

### 1.1 Regole di stile finali (fonte di verità del v4)

Queste quattro regole prevalgono su qualunque indicazione estetica precedente (v3 incluso):

1. **Editoriale-minimal.** La pagina è un flusso tipografico su void, non un insieme di scatole. La gerarchia la fanno tipografia, spaziatura e colore — non i pannelli.
2. **Niente container/box.** Sezioni, liste e card non vivono dentro riquadri con bordo+sfondo. Le superfici piene restano solo ai layer che flottano sopra la pagina (modal, sheet, toast, palette); il glass si ritira a quel ruolo.
3. **Font: tre famiglie con ruoli rigidi.** **Anton ESCLUSIVAMENTE sul logo/wordmark** «DÆMON» (sidebar espansa e monogramma DÆ collassato — provato Chakra Petch sul wordmark: non funziona). **Poppins** per titoli, eyebrow e numeri hero. **Space Grotesk** per UI e body. Codici/date/etichette tecniche in monospace di sistema (`ui-monospace` stack) — IBM Plex Mono e Chakra Petch escono del tutto.
4. **Separazione ad aria e hairline.** Dove serve dividere: spazio bianco generoso e hairline `1px var(--line)` — mai un box. Le hairline sono l'unico tratto di confine ammesso nel flusso di pagina.

**Si ferma:** solo le iterazioni *fini a sé stesse* sull'estetica della nav. Gli asset costruiti **non si buttano, si riusano con una funzione**: le spider-lines diventano l'animazione di apertura dei sotto-menu (→ §2), gli effetti di prossimità restano in forma raffinata — il target per Claude Design resta **UI/UX premium**. La regola è: prima il corpo operativo, poi nuove esplorazioni estetiche; il linguaggio premium già costruito si mette al servizio della funzione.

---

## 2. Navigazione — ibrida: sidebar operativa + top-nav scorciatoie

**Sidebar sinistra (desktop)** — fissa, collassabile a icone, pattern PartnerTribe nella struttura ma con il linguaggio DÆMON:
- In testa alla sidebar: **monogramma "DÆ"** come firma dell'elemento (versione compatta del logo testuale; da collassata resta solo il monogramma + le icone).
- **Icone professionali line-art**: outline "vuote", stroke sottile, **effetto simil-neon soft** — glow leggero ember/bianco su hover e voce attiva, coerente col glow di sistema. Niente emoji, niente icone piene.
- Voce attiva: marker ember + sfondo surface + icona in glow.
- **Effetti di prossimità mantenuti in forma raffinata**: le voci vicine al cursore schiariscono progressivamente (transizione 150–200ms, sobria, senza scale aggressivi) — il tratto premium resta, al servizio della leggibilità.
- **Spider-lines riusate con funzione nuova**: all'apertura/espansione di un gruppo, le linee si *disegnano* (draw-in SVG animato) dal titolo del gruppo verso le voci, come connettori che accompagnano l'apertura dinamica dei sotto-menu. L'asset decorativo v3 diventa feedback funzionale.
- In fondo: identità utente (avatar iniziale colorato) e stato sync.

**Top-nav (mantenuta)** — barra superiore leggera con la **stella ember al centro** (click → Overview, comportamento home) e le **scorciatoie** che in sidebar non entrano o starebbero male: Calendario, Link, ricerca/cmd+K, quick actions (+), identità e stato sync se non in sidebar. È la casa naturale delle utility trasversali — evita di gonfiare la sidebar.

Mobile: bottom-nav con le 4 voci più usate (Overview, Oggi, Drops, Media) + hamburger per il resto; le scorciatoie della top-nav confluiscono nell'header compatto. Max 2 tap ovunque (regola già valida, confermata).

### Struttura v4

**OPERATIVO** *(nuovo gruppo — la giornata)*
- **Overview** — command center (§3)
- **Oggi / Settimana** — agenda operativa unificata (§4)
- Drops
- Chats

**PRODUZIONE**
- Design (kanban)
- Tech Pack
- Campioni
- Catalogo

**DOCUMENTI** *(ispirato a PartnerTribe "Documenti" — la memoria scritta del brand)*
- **Riunioni** — Meeting Overview + Memo (§5)
- **Contratti & Accordi** — fornitori, collab, listini (§5)
- Note / Memo

**PIANIFICAZIONE** *(il PM vero e proprio — tempo e controparti)*
- Timeline
- Fornitori

**MEDIA & MARKETING**
- Media Studio *(assorbe Inspo — §6)*
- **Adv & Campagne** *(nuovo, pattern Digital Hub — §7)*

> **Calendario e Link escono dalla sidebar** → diventano scorciatoie della top-nav (§2): sono utility trasversali, non sezioni di lavoro.
> Inspo sparisce come pagina autonoma (→ §6). Le sezioni passano da 14 piatte a 5 gruppi con gerarchia chiara + top-nav per le utility.

---

## 3. Overview — da "alert + KPI" a command center

Layout a fascia, dall'alto:

1. **Riga KPI card (pattern PartnerTribe)**: 4–6 card, ciascuna = numero hero + etichetta + micro-trend/progressbar + una CTA che porta alla sezione. Metriche: countdown drop (T−X con % pipeline), articoli pronti (task done/totali), qualità campioni (media + % approvati), tech pack per stato, KPI esterni da `kpi_snapshots` (follower IG, ordini) con delta settimanale — come già deciso in chat: dato manuale onesto via mini-form, trend disegnato dall'app.
2. **"Adesso"**: le 3–5 cose più urgenti tra *tutte* le fonti (fasi drop in scadenza, task articolo, action item riunioni, campioni in review) — cliccabili, aprono la scheda. È l'estratto della pagina Oggi (§4).
3. **Ultima attività**: ultimi 5 change dal log, con avatar autore.
4. **Quick actions**: + Articolo, + Nota, + Memo riunione, + Upload media.

Niente altro. L'Overview non è un indice: è il tachimetro + il volante.

---

## 4. Oggi / Settimana — agenda operativa unificata (nuova pagina)

Il problema attuale: le "cose da fare" vivono in 4 posti (task articolo, fasi drop, campioni in review, e ora action item riunioni). Nessuno le vede insieme.

- Vista unica che **aggrega tutte le fonti di lavoro** in una lista per scadenza: Oggi / Questa settimana / Prossime / Senza data.
- Ogni riga: cosa, da dove viene (badge: Drop V · fase / Articolo / Riunione 12/07), owner, scadenza, check diretto.
- Filtro "solo mie" / "team". Il check qui completa l'item alla fonte (stessa entità, non copia).
- Tecnica: nessuna tabella nuova — è una **vista aggregata** su entità esistenti + `meeting_actions` (§5). Zero duplicazione dati.

È la pagina che mancava per il "mi aspettavo di più": trasforma l'app da archivio a strumento di lavoro quotidiano.

---

## 5. Documenti — Riunioni e Contratti (il buco più grande)

### 5.1 Riunioni (Meeting Overview + Memo)
- **Meeting Overview**: lista riunioni (data, partecipanti, titolo, stato) — passate e pianificate.
- **Memo riunione** (scheda): note firmate durante/dopo l'incontro, **Decisioni** (righe evidenziate — diventano la memoria decisionale del brand, ricercabili da cmd+K), **Action item** con owner e scadenza → confluiscono in Oggi/Settimana e nell'Overview.
- Pattern dati: riusa note firmate + nuova tabella `meetings` + `meeting_actions`.

### 5.2 Contratti & Accordi
- Registro documenti: fornitori (condizioni 30/70, pagamenti 60gg — oggi sepolte nelle note fornitore), collaborazioni, listini/preventivi.
- Ogni voce: titolo, controparte, data, stato (bozza / inviato / firmato / scaduto), PDF su Supabase Storage (pattern Tech Pack già costruito), scadenza opzionale → alert in Overview ("contratto X scade tra 30gg").
- Collegamento bidirezionale con la scheda Fornitore.

---

## 6. Fix Inspo → dentro Media Studio

Inspo come pagina autonoma è nata male: due sistemi immagini paralleli, e nella build attuale non carica immagini come dovrebbe. Soluzione: **Inspo diventa un tag/riga di Media Studio** (il sistema multi-tag della Fase 3 esiste già per questo). Upload, lightbox, note firmate: tutto gratis dal sistema esistente. Migrazione: le voci inspo attuali diventano media taggati `inspo`; la pagina sparisce dal menu. Un solo posto per tutte le immagini del brand.

---

## 7. Adv & Campagne — il pezzo di Digital Hub che ha senso qui

Non copiare Digital Hub (resta lo strumento client-facing di ARCADIA): portare in DAEMON HQ il suo *pattern* per la parte marketing del brand:

- **Board campagne** per piattaforma (Meta / TikTok / Google): card campagna con stato (Bozza / Pianificata / Live / In pausa / Chiusa), budget, date, obiettivo, link alla piattaforma.
- Le creative collegate pescano da **Media Studio → colonna Creative** (tag, non duplicati).
- Scadenze campagna → Oggi/Settimana e Calendario.
- Fase 2 (futura): collegamento hub-to-hub con Digital Hub o API Meta — non ora.

---

## 8. Pattern trasversali (da applicare ovunque)

- **Ogni card con numero ha una CTA** (lezione PartnerTribe). Niente numeri morti.
- **Stati con lo stesso vocabolario ovunque** (lezione Digital Hub): Bozza / Pianificato / In corso / In review / Fatto / Urgente — colori coerenti cross-sezione.
- **Scadenza visibile sulla card**, non solo dentro il dettaglio.
- **Tutto ciò che ha una data** finisce automaticamente in: Calendario (Vista HQ), Oggi/Settimana, e — se critico — Overview.
- **cmd+K cerca anche**: decisioni delle riunioni, contratti, campagne.

---

## 9. Priorità di build (per Claude Code)

Ordine pensato per valore operativo immediato, non per comodità tecnica:

1. **Nav ibrida v4** (sidebar DÆ con icone neon + top-nav scorciatoie con stella, regrouping nei 5 gruppi, spider-lines riusate come apertura animata dei gruppi) — cambia subito la percezione.
2. **Oggi/Settimana** (vista aggregata) + Overview command center con KPI card CTA.
3. **Riunioni** (meetings + actions) — sblocca la memoria decisionale.
4. **Inspo → Media Studio** (migrazione tag) + **Contratti**.
5. **Adv & Campagne.**
6. Rifiniture (empty states, undo, contatori sidebar).

Prima del punto 1: chiudere il **blocco critico dell'audit** (C1 signup aperto, A2 timezone, A3 ErrorBoundary) — inutile ridisegnare una casa con la porta aperta.

## 10. Nota per /design-sync (Claude Design)

Da sincronizzare come riferimenti: **layout sidebar + KPI card pattern di PartnerTribe** (struttura, non estetica — l'estetica resta la nostra: void/glass/ember), **pipeline card con stati e scadenze di Digital Hub**, e i riferimenti PLM già scelti (**Techpacker, Backbone PLM**) per le schede prodotto/tech pack. Il design system v3 (token, motion) è la base, **corretto dalle regole finali di §1.1** (editoriale-minimal, niente container, tre famiglie font a ruoli rigidi, aria + hairline): Claude Design deve comporre *layout operativi* con quel linguaggio, non inventarne un altro.

---

## 11. Template Claude Design — mappa d'uso per il progetto

Ogni tipo di template disponibile, con la sua funzione qui. Nessuno lasciato fuori: quelli non applicabili sono segnati come tali invece di essere ignorati.

- **Color + typography** — sincronizzazione letterale del design system: palette void/bone/ember, Anton (solo logo) + Poppins + Space Grotesk con mono di sistema sui codici (regole §1.1). Primo template da generare: è la base su cui si allineano tutti gli altri.
- **Wireframe** — per strutturare le pagine nuove prima del mockup pieno: Riunioni, Adv & Campagne, Contratti. Più veloce del mockup completo per validare la struttura prima di vestirla.
- **UI mockups** — le schermate principali: Overview cockpit, Media Studio a 3 colonne, Tech Pack come file manager, sidebar + top-nav. Il mockup HTML già condiviso è il ponte diretto verso questo template.
- **Mobile app UI** — versione PWA mobile: bottom-nav, drawer, regola dei 2 tap, widget come bottom-sheet.
- **Diagram** — uso privilegiato in questo progetto, sia come strumento di design sia come pattern *dentro l'app stessa* (→ §11.1).
- **Animation** — prototipazione mirata delle micro-interazioni prima di scriverle in Framer Motion: draw-in delle spider-lines, effetto di prossimità, conferma checkbox, transizioni pagina.
- **Document** — documentazione interna strutturata: griglia di vetting fornitori, condizioni contrattuali standard (30/70, pagamento 60gg), changelog tech pack.
- **HTML email** — fuori scope MVP, utile per v5: sollecito automatico fornitore, recap settimanale drop, digest attività per chi non apre l'app.
- **Research** — già impiegato (Techpacker, Backbone PLM, competitor PLM); da riusare per validare i pattern Riunioni/Adv contro strumenti simili prima di costruirli.
- **Slides** — non operativo per l'app; utile fuori dal prodotto per un pitch/recap del brand a partner o fornitori. Non prioritario.
- **3D object** — non rilevante per ora: l'app non gestisce visualizzazione 3D di capi o pattern. Fuori scope esplicito, non dimenticato.
- **Résumé** — non applicabile al progetto.
- **Filer** — mappa diretta sul Tech Pack come file manager (v3 §5.2): cartelle con anteprime miste PNG/JPEG/PDF per ogni tech pack. Probabilmente il template più utile insieme a Diagram, perché è esattamente il pattern richiesto lì — utile anche per Media Studio (righe/colonne come cartelle) e per Contratti (registro documenti per fornitore).

### 11.1 Diagram — anche dentro l'app, non solo come strumento di design

Ci sono almeno quattro punti dove un diagramma è la UI giusta per vedere una connessione operativa, non solo un artefatto di pianificazione:

1. **Pipeline drop (Timeline, vista anno)** — invece della sola barra di avanzamento lineare, un diagramma di flusso Design → Tech Pack → Campione → Produzione → Drop con ogni articolo come nodo colorato per stato. Arricchisce il toggle "anno intero" già previsto nella v3 (§5.4).
2. **Mappa fornitori (Fornitori)** — diagramma a livelli: core / capsule / backup, con connessioni verso gli articoli/tech pack assegnati. Rende visibile a colpo d'occhio la strategia dual-supplier che oggi vive solo nel testo delle note.
3. **Flusso decisionale (Riunioni)** — decisione → action item → task come catena visiva invece di tre liste separate. È la rappresentazione naturale del "collante operativo" descritto in §5.
4. **Architettura di navigazione (uso interno team)** — un diagramma della sidebar a 5 gruppi + top-nav, utile prima della build per verificare che nessuna voce sia orfana o duplicata.

Per Claude Code: i punti 1–3 sono candidati concreti a diventare **componenti diagram reali nell'app**, non solo mockup di design — da valutare in build se conviene una libreria leggera (es. React Flow) o SVG custom coerente col resto del design system.

---

## 12. Backlog v4 — richieste aggiunte in corso d'opera (20 lug 2026)

Documentate qui per non perderle; **non ancora in build**. Ogni voce entra nella fase indicata, con piano preventivo come da metodo.

### 12.1 Estetica (dentro le fasi di de-boxing già previste)

- **Icone top-nav neon**: Calendario, Link e le altre utility in stile **neon rosso**, con animazione **"wave"** — le icone si illuminano in fila una dopo l'altra (rosso → bianco → rosso) a intervalli regolari. Con `prefers-reduced-motion`: statiche rosse, nessuna onda.

### 12.2 Nuove funzioni (nuove viste HQ — ognuna una sotto-fase con piano)

- **Campioni — foto campione**: upload immagine sulla scheda campione (riuso di ImageUpload esistente, bucket `media`, signed URL). Colonna `img_path` → migration dedicata.
- **Fornitori — identità e contatto diretto**: campo **logo** (upload), **telefono**, e **link chat diretto** cliccabile (WhatsApp `wa.me` / Instagram DM). Migration dedicata (logo_path, telefono, chat_url).
- **Drops — Registro errori & lezioni**: nuova vista tabellare che traccia gli errori commessi per **ambito** (produzione, logistica, fornitore, design) con **causa**, **azione correttiva** e **stato**. Obiettivo: memoria operativa degli sbagli per non ripeterli — completa la memoria decisionale delle Riunioni (§5). Migration dedicata (`error_log` o simile).
- **Più viste HQ con diagrammi e spider-map** per orientarsi: valutare pagina per pagina dove un diagramma aggiunge valore reale (es. mappa relazioni drop→articoli→fornitori, timeline visuale del drop). Si aggancia a §11.1; da definire con piano dedicato prima di costruire.
- **Overview — sezione «Sito web»** *(fattibile a breve)*: due **preview della homepage** (desktop + mobile) via servizio screenshot-on-demand (es. thum.io) dato l'URL del sito — snapshot sempre aggiornato, zero backend. Sotto, due bottoni: **«Vai a Shopify»** (admin) e **«Visita sito»** (storefront). Gli URL sono configurabili e salvati come link (pattern righe fisse di `links` già usato per il Calendario embed).

### 12.3 Chats — ripensare la pagina (fase avanzata SEPARATA)

Obiettivo: **chat live vere** (WhatsApp / Instagram / ManyChat) al posto del registro manuale attuale. Nota tecnica vincolante: un inbox live richiede integrazione API (Meta Graph / ManyChat) con **backend e webhook** — è un progetto a sé, con superficie di sicurezza propria, NON rientra nel de-boxing estetico né nelle sotto-fasi di §12.2. Da pianificare come fase avanzata autonoma quando il resto del v4 è consolidato.

### 12.4 Backlog avanzato — la «fase API» (progetti a sé: API + backend)

Voci che richiedono integrazioni esterne autenticate e un backend: si pianificano **insieme**, come fase autonoma, quando si decide di collegare Shopify/Meta.

- **Mappamondo 3D ordini/visitatori live**: globo (globe.gl / three.js) con ordini e visitatori in tempo reale — richiede API Shopify realtime + geolocalizzazione, oltre alla libreria 3D (peso bundle da valutare: chunk lazy dedicato).
- **Inbox chat live** (§12.3) — stessa famiglia: API Meta/ManyChat + webhook.
- **KPI automatici**: le metriche di `kpi_snapshots` oggi inserite a mano (follower, ordini, revenue) alimentate direttamente dalle API Shopify/Meta.
