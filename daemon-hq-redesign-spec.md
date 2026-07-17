# DÆMON — GYMWEAR HQ · Redesign Spec v3

> Documento di riferimento per la ristrutturazione completa dell'app "DAEMON-Production-HQ".
> Da usare come prompt iniziale per Claude Code. Le sezioni marcate **[BUILD]** contengono decisioni delegate alla fase di sviluppo; le sezioni marcate **[APERTO]** richiedono conferma del team prima di implementare.

---

## 0. Contesto

App attuale: single-file HTML (~vanilla JS) con persistenza team-wide via `window.storage` (chiave condivisa `dhq:main`, immagini compresse in chiavi separate `dhq:img:*`, retry con backoff, savebar/errbar). Gestisce la pipeline prodotto di un brand gymwear: design → tech pack → campioni → drop → catalogo, più fornitori, calendario, customer care e archivio media.

Obiettivo v3: **UI premium, futuristica, minimal ma densa di strumenti**, navigazione a gruppi, nuove pagine embed, Media Studio strutturato, Tech Pack come file manager, widget persistenti, micro-interazioni curate. L'app è usata da un team piccolo (2–5 persone), mobile-first ma con uso desktop frequente.

---

## 1. Architettura & Stack — [BUILD]

- Valutare il passaggio da single-file HTML a un progetto con build step (Vite + vanilla/Preact/React leggero). Criterio: se il totale supera ~3–4k righe o servono componenti riusabili complessi (file manager, lightbox, colonne Media Studio), il build step ripaga.
- **Mantenere il layer di persistenza esistente come base**: `persist()` con retry/backoff, stato condiviso `shared:true`, migrazione dai dati v1/v2 esistenti (**non perdere i dati attuali del team**: scrivere una funzione di migrazione che mappa il vecchio schema al nuovo).
- Aggiungere **versioning dello schema** (`S.schemaVersion`) per migrazioni future indolori.
- Tutte le scritture restano optimistic-UI: aggiorna subito, salva in background, rollback visivo solo su fallimento persistente.

---

## 2. Design System

### 2.1 Identità
- Palette attuale come base (void `#0B0B0D`, bone `#EAE6DE`, ember `#E2382A`, amber, ok-green, steel) — raffinarla, non stravolgerla. Aggiungere 2 livelli di elevazione in più (surface-3 per modali, surface-glow per hover).
- **Glow come firma visiva**: rosso ember per elementi brand/critici, bianco per interazione. Sempre morbido (blur ampio, opacità bassa), mai neon aggressivo.

### 2.2 Tipografia
- **Anton**: solo per il logo testuale "DÆMON" e pochissimi numeri hero (countdown, stat principali). Via da tutti i titoli di pagina.
- **IBM Plex Sans**: nuovo font principale per titoli pagina, voci menu, testo UI.
- **IBM Plex Mono**: mantenuto solo per codici tecnici (TP-01, SMP-02, date, badge) dove il mono ha senso semantico.
- Titoli pagina: IBM Plex Sans, peso medio-alto, **letter-spacing ampio** (es. `0.35em`, uppercase) — stile "MEDIA STUDIO", "TECH PACK". Il tracking largo è il tratto distintivo dei titoli in tutta l'app.

### 2.3 Header / Branding
Due loghi distinti:
- **Logo testuale "DÆMON"** (in alto a sinistra, dov'è oggi) — sotto: **"GYMWEAR — HQ"** (sostituisce "Production HQ · Design → Sample → Drop"), in Plex Mono piccolo, tracking largo.
- **Logo immagine — stella rossa** (asset `spollimerchlogoremovebg.png`): **piccolo, centrato in alto**, con **glow ember pulsante molto lento** (respiro ~6s, opacità 0.25→0.45) e ombre curve morbide sotto. Elemento separato dal logo testuale. Al click: torna a Overview (comportamento "home").
- Rimuovere o ridimensionare il watermark "Æ" gigante se confligge visivamente con la stella centrale — **[BUILD]** decidere guardando il risultato.

### 2.4 Micro-interazioni globali (la parte "premium")
- **Transizioni pagina**: fade+slide 200ms, `cubic-bezier(0.16, 1, 0.3, 1)`. Rispettare `prefers-reduced-motion` ovunque (già parzialmente fatto — estendere a tutte le animazioni).
- **Hover cards**: lift sottile (translateY -2px) + bordo che schiarisce + ombra glow bianca appena percettibile. 150ms.
- **Bottoni primari (ember)**: on-hover leggero aumento di luminosità + glow ember esterno soft; on-press scale 0.97.
- **Checkbox task/fasi**: al check, micro-animazione di conferma (tick che si disegna, riga che si barra con transizione, non a scatto).
- **Progressbar drop**: fill animato con leggero shimmer quando avanza.
- **Savebar**: sostituire con sistema toast coerente (successo/errore/info), angolo basso, auto-dismiss, stack massimo 3.
- **Skeleton loading**: per Media Studio e liste immagini, placeholder shimmer scuri invece di vuoto durante `hydrateImgs`.
- **Empty states**: ogni sezione vuota ha un empty state disegnato (icona line-art + una riga di testo + CTA), non solo testo grigio.
- **Numeri stat (Overview)**: count-up animato al primo render (300–500ms).

---

## 3. Navigazione — 3 gruppi + Overview

### 3.1 Struttura

**PRODUCTION / DESIGN**
- Design
- Tech Pack
- Campioni
- Inspo

**GESTIONE / PM**
- Timeline *(toggle: drop corrente ↔ anno intero)*
- Fornitori
- Calendario *(embed — §6)*
- Note / Memo *(nuova pagina — §5.3)*
- Link

**LIVE NOW**
- Overview
- Drops
- Catalogo
- Media Studio *(ex Archivio — §4)*
- Chats *(§6)*

### 3.2 Comportamento visivo del raggruppamento
- Niente dropdown a tendina. I 3 titoli di gruppo sono sempre visibili; le voci stanno **sotto una "curvatura ombra"** generata dal titolo — un'ombra morbida ad arco che scende dal titolo e "contiene" visivamente le voci del gruppo.
- **Animazione di prossimità (desktop)**: quando il mouse si avvicina a un gruppo, il gruppo **si ingrandisce leggermente** (scale ~1.03–1.05, origine dal titolo) e **le sue voci aumentano la luminosità del ~30%** (da muted verso bone, glow bianco sottile). L'effetto è graduale in base alla distanza del cursore (proximity-based, non solo on/off al hover diretto) — tipo dock macOS ma molto più sobrio. Transizione fluida, 200ms, senza scatti.
- **Voce attiva**: glow bianco costante soft + marker ember (bordo o dot), non solo underline.
- **Mobile**: l'effetto proximity non esiste — i gruppi diventano 3 sezioni collassabili-ma-aperte-di-default, oppure una bottom-nav con i 3 gruppi + Overview e le voci come secondo livello. **[BUILD]** scegliere in base a cosa regge meglio con 14 voci totali su schermo piccolo. La soluzione deve restare max 2 tap per qualsiasi pagina.
- Overview è la landing di default e resta raggiungibile anche dal click sulla stella centrale.

### 3.3 Miglioramenti navigazione proposti (novità)
- **Command palette (Cmd/Ctrl+K)**: ricerca globale su articoli, tech pack, campioni, fornitori, note, link — risultato → salto diretto alla scheda aperta. Su mobile: icona lente nell'header. È il moltiplicatore di produttività più grande per un'app con 14 sezioni.
- **Scorciatoie tastiera** (desktop): `g` poi lettera per navigare (g+o Overview, g+t Tech Pack…), `n` per "nuovo" contestuale alla pagina attiva. Mostrare hint in un pannellino richiamabile con `?`.

---

## 4. MEDIA STUDIO (ex Archivio)

Galleria/organizzazione di tutto il materiale foto e video del brand. Compressione automatica lato client che preserva qualità percepita HD (evolvere `compressFile()`: dimensione max più alta per asset "PC/banner", qualità adattiva in base al peso, mantenere sempre sotto i limiti di storage).

### 4.1 Struttura: 3 colonne, righe orizzontali per colonna

**Colonna SITO**
1. Foto Prodotti — sotto-diviso in **Indossati** e **BG-Removed**
2. Mobile (formati da 1:1 a verticali)
3. PC (orizzontali per banner high-res)
4. Loghi
5. Shooting Archivio

**Colonna CREATIVE**
1. Adv — divisa in **Pronte** e **Idee** (le Idee hanno campo testo per annotare il concept/obiettivo)
2. Removed-bg — con **collegamento rapido a Photoroom** (link anche nella pagina Link)
3. In-Edit (creative in corso di modifica)

**Colonna INSTAGRAM**
1. Stories — pianificazione in anticipo, check risultato visivo, campo testo per obiettivo (stesso pattern delle Idee Adv)
2. Post
3. Bozze
4. Reel — **[APERTO]** come gestire i video che servono anche in Sito e Creative: proposta = asset unico con **tag multipli** (un media può appartenere a più righe/colonne via tag, niente duplicati). I video restano link esterni (Drive) con thumbnail caricata, come oggi.

### 4.2 UX Media Studio
- Su desktop le 3 colonne sono affiancate; su mobile diventano 3 tab orizzontali in cima alla pagina.
- **Lightbox** al tap su qualsiasi immagine: fullscreen scuro, swipe/frecce tra immagini della stessa riga, azioni rapide (sposta di riga, tag, elimina, apri link esterno).
- **Upload multiplo** (selezione di più file in un colpo, con coda di compressione e progress).
- Drag-and-drop tra righe (desktop) per riclassificare un media. **[BUILD]** se il drag risulta fragile, fallback: menu "Sposta in…" nel lightbox.
- Contatore per riga (es. "Indossati · 24") e lazy-loading delle immagini per riga (carica solo righe visibili).

---

## 5. Pagine — modifiche e novità

### 5.1 Gadget
Rimossi come sezione autonoma: diventano una **riga orizzontale dentro Campioni e dentro Catalogo**, come elemento accessorio del capo/drop a cui appartengono. Mantengono foto + note firmate.

### 5.2 Tech Pack → file manager
- Ogni tech pack apribile come **cartella** con anteprime miste PNG / JPEG / PDF (grid di thumbnail; i PDF mostrano icona+nome o prima pagina se fattibile).
- **Vincolo tecnico**: `window.storage` gestisce solo testo/JSON. Le immagini possono continuare a passare dal sistema compresso attuale; per PDF e file "veri" serve storage esterno. **Proposta pragmatica fase 1**: i file del tech pack sono **link a Drive** (il team già usa Drive) con nome, tipo e thumbnail opzionale caricata — il "file manager" è quindi un indice visuale curato, non un vero upload binario. Upload reale = fase 2 con backend dedicato. **[APERTO]** confermare l'approccio fase 1.
- Aggiungere ai tech pack: **changelog leggero** (chi ha modificato cosa, quando — riusa il pattern note firmate) e stato colore per capire a colpo d'occhio bozza/inviato/confermato/in produzione (già esiste, renderlo più visibile: bordo colorato dell'intera card).

### 5.3 Note / Memo (nuova pagina, Gestione/PM)
- Bacheca di note generali del team non legate a un oggetto specifico: idee, decisioni, promemoria.
- Ogni nota: autore (sistema identità già esistente), data, testo, **pin** (le pinnate salgono in cima), opzionale tag colore (decisione / idea / urgente).
- Le note pinnate alimentano anche il widget persistente "Note per il team" (§7).

### 5.4 Timeline
- Toggle in testa: **Drop corrente** (vista pipeline dettagliata come oggi) ↔ **Anno intero** (vista compressa: tutti i drop su una linea temporale orizzontale con milestone, per capire sovrapposizioni e cadenza lanci).
- Nella vista anno: barre per drop, colore per stato, click → apre il dettaglio drop.

### 5.5 Overview
- Resta la landing. Migliorie: numeri con count-up, alert cliccabili (portano alla scheda interessata, non solo testo), sezione "ultima attività" (ultimi 5 change dal log — §7.1).

### 5.6 Fornitori, Design, Campioni, Drops, Catalogo, Inspo, Link
- Struttura dati invariata; ricevono il restyling del design system (card, hover, empty states, toast).
- **Design kanban**: aggiungere drag-and-drop delle card tra colonne (desktop), mantenendo i bottoni ←/→ come fallback e per mobile.
- **Link**: aggiungere **Photoroom** all'elenco seed; ogni link mostra favicon del dominio se recuperabile. Collegamento rapido a Photoroom anche dalla riga Removed-bg di Media Studio.
- **Campioni**: i 4 score (fit/tessuto/cuciture/colore) diventano input a tap diretto sulla card in modalità edit rapida (tap sul numero → stepper), senza aprire il modal completo.

---

## 6. Pagine embed

### 6.1 Calendario (Gestione/PM)
- **Google Calendar embeddato vero** (iframe ufficiale `calendar.google.com/calendar/embed?...`), tema scuro se possibile via parametri, altrimenti contenitore con cornice coerente col design.
- Il calendario custom JS attuale resta come **vista secondaria** ("Vista HQ") perché è l'unico posto dove le date drop/fasi entrano automaticamente — toggle Embed ↔ Vista HQ in testa alla pagina. **[BUILD]** se la doppia vista pesa troppo, tenere l'embed e portare le scadenze drop in un pannellino laterale "Prossime scadenze" accanto all'iframe.

### 6.2 Chats (LIVE NOW)
- **Niente embed reale di WhatsApp Business / Instagram Direct** (non esistono embed pubblici affidabili senza backend Meta API).
- Soluzione: **bottoni scorciatoia grandi e curati** che aprono WA Business, Instagram Direct, ManyChat (web/app native), stile card con icona + glow on-hover.
- Sotto: il **registro conversazioni interno** già esistente (cliente, canale, stato, note firmate) — invariato nella logica, restyling grafico.

---

## 7. Widget persistenti (sempre visibili)

Due "finestrine" fisse, fuori dal flusso delle tab. Su desktop: pannello laterale destro collassabile (o due card flottanti in basso a destra, impilate). Su mobile: bottom-sheet richiamabile con handle sempre visibile. **[BUILD]** scegliere il layout che non ruba spazio ai contenuti.

### 7.1 Notifiche — ultimi change
- **Log attività automatico**: ogni create/edit/delete significativo scrive una riga `{autore, azione, oggetto, timestamp}` in `S.activity` (cap a ~200 voci, FIFO).
- Il widget mostra le ultime 8–10; click su una voce → salta alla scheda. Badge count sui change non ancora visti dall'utente corrente (confronto con timestamp ultima visita, salvato in chiave personale).

### 7.2 Note per il team
- Mostra le note **pinnate** dalla pagina Note/Memo (§5.3) + input rapido per aggiungerne una al volo senza cambiare pagina.

### 7.3 KPI ticker — [APERTO]
- Terza finestrina opzionale: countdown prossimo drop + 2–3 scadenze critiche, sempre visibile. Confermare se includerla o se basta l'Overview.

---

## 8. Qualità e dettagli trasversali

- **Accessibilità**: focus-visible coerente (già presente sui tab — estendere ovunque), aria-label su icone, contrasto verificato sui muted, tutte le animazioni sotto `prefers-reduced-motion`.
- **Performance**: lazy-load immagini (IntersectionObserver), `hydrateImgs` solo su elementi visibili, debounce dei render pesanti.
- **Conferme distruttive**: sostituire i `confirm()` nativi con modal coerente + possibilità di **undo via toast** ("Eliminato — Annulla") per 5 secondi prima della cancellazione reale.
- **Identità utente**: mantenere il sistema "chi sei" attuale; mostrare l'iniziale/avatar colorato accanto alle note e nel log attività.
- **PWA-ready**: manifest + icona (stella rossa) per "aggiungi a home" su mobile — l'app è già usata da telefono, meritiamo l'icona.

---

## 9. Punti aperti (da confermare prima o durante la build)

1. **Reel/video multi-sezione** → proposta tag multipli su asset unico (§4.1).
2. **Tech Pack file manager fase 1** → indice visuale con link Drive, upload vero rimandato (§5.2).
3. **KPI ticker** come terzo widget persistente sì/no (§7.3).
4. **Layout widget persistenti** su desktop: pannello laterale vs card flottanti (§7).
5. **Watermark Æ** gigante: tenere, ridurre o togliere con la stella centrale (§2.3).

---

## 10. Fasi di build suggerite (per Claude Code)

1. **Fondamenta**: migrazione schema dati + design system (font, palette, glow, toast, transizioni) + nuovo header con doppio logo.
2. **Navigazione**: 3 gruppi con curvatura ombra + animazione proximity + versione mobile + command palette.
3. **Media Studio**: struttura colonne/righe, lightbox, upload multiplo, tag.
4. **Pagine nuove/modificate**: Note/Memo, Timeline anno, Tech Pack cartelle, Gadget in riga, Calendario embed, Chats.
5. **Widget persistenti + log attività.**
6. **Rifiniture**: micro-interazioni, empty states, skeleton, undo, PWA, accessibilità.

Ogni fase deve lasciare l'app funzionante e i dati del team intatti.
