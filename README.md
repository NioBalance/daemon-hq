# DÆMON — Production HQ

Dashboard di produzione per DÆMON GYMWEAR: drop, catalogo prodotto, pipeline design, tech pack, review campioni, timeline lanci, fornitori, archivio, media, customer care e calendario team.

Costruita con Vite + React + TypeScript, Supabase (Postgres + Storage + Auth) come backend, installabile come PWA.

## Sviluppo

```bash
npm install
npm run dev
```

Copia `.env.example` in `.env.local` e valorizza le variabili Supabase prima di avviare l'app (`.env.local` è già presente e configurato in questo repo di lavoro).

## Setup Supabase — Auth (Step 2)

Prima di provare il login, nel progetto Supabase (`clsyjggifbfwnrdbzprk`):

1. **SQL Editor** → incolla ed esegui [supabase/migrations/0001_profiles.sql](supabase/migrations/0001_profiles.sql). Crea la tabella `profiles` (nome + ruolo) con RLS.
2. **Authentication → URL Configuration** → *Site URL* = `http://localhost:5173` e aggiungi `http://localhost:5173/**` alle *Redirect URLs* (poi, al deploy, aggiungi anche l'URL Netlify).
3. **Email in produzione**: il servizio email integrato di Supabase ha un rate limit molto basso (pochi invii/ora), pensato solo per test. Per uso reale, in **Project Settings → Auth → SMTP Settings** collega un provider esterno (es. Zoho) inserendo host/porta/credenziali SMTP. È **solo configurazione lato Supabase** — il codice usa `supabase.auth.signInWithOtp()`, che non sa né gli importa quale server SMTP c'è dietro, quindi passare a Zoho (o altro) in futuro non richiede nessuna modifica all'app.

## Setup Supabase — login a codice invece del link (obbligatorio)

Il login ora funziona a **codice a 8 cifre digitato nella stessa finestra**, non più a link cliccabile (il link apriva il browser invece della PWA installata). Il codice arriva comunque via `signInWithOtp()` — stessa chiamata di prima — ma va confermato con `verifyOtp()`. Nota: Supabase invia un codice OTP a 8 cifre (non 6), il campo in login è dimensionato di conseguenza.

⚠️ **Passo obbligatorio**: il template email di default di Supabase mostra solo il link, non il codice — senza modificarlo il codice non è nemmeno visibile nell'email. In **Authentication → Email Templates → Magic Link**, sostituisci il contenuto con qualcosa che mostri `{{ .Token }}` (il codice a 8 cifre), ad esempio:

```html
<h2>DÆMON Production HQ</h2>
<p>Il tuo codice di accesso:</p>
<h1 style="letter-spacing:6px;font-size:32px">{{ .Token }}</h1>
<p>Scade tra un'ora. Se non l'hai richiesto tu, ignora questa email.</p>
```

Puoi rimuovere del tutto il link `{{ .ConfirmationURL }}` dal template — l'app non lo usa più per accedere, quindi non serve tenerlo (evita anche che qualcuno lo clicchi per abitudine finendo nel browser invece che nella PWA).

**"Resta connesso"**: la sessione persiste in `localStorage` (sopravvive a riavvii del browser/PWA) se la checkbox è spuntata in login (di default sì), altrimenti solo in `sessionStorage` per quella finestra. Tutto lato client, nessuna configurazione Supabase necessaria. Se in futuro vuoi limitare comunque la durata massima delle sessioni per tutto il progetto, è in **Authentication → Sessions**.

## Setup Supabase — tabelle di dominio + storage (Step 3)

Un solo passo manuale, tutto il resto (incluso il bucket) è nello script SQL:

1. **SQL Editor** → incolla ed esegui [supabase/migrations/0002_domain_tables.sql](supabase/migrations/0002_domain_tables.sql) (dopo aver già eseguito la 0001). Crea le 17 tabelle di dominio (fornitori, drops, drop_fasi, articoli, articolo_tasks, designs, techpacks, samples, gadgets, inspo, links, ai_links, chat_channels, chats, media, events, notes), le relative RLS e il bucket storage `media`.
2. Verifica in **Table Editor** che le tabelle siano comparse, e in **Storage** che esista il bucket `media` (pubblico, limite 5 MB, formati immagine/audio/video consentiti).

Note sul modello:
- Tutte le tabelle sono a scrittura condivisa fra utenti autenticati (è uno strumento di team), **tranne `notes`**: chiunque può aggiungere una nota, ma solo l'autore può modificarla o cancellarla (`author_id = auth.uid()`).
- `designs`, `media`, `gadgets`, `inspo`, `links` hanno una colonna `ordine` per riordinare le card manualmente invece di affidarsi all'ordine di inserimento.
- Il bucket `media` accetta solo `image/jpeg`, `image/png`, `image/webp`, `audio/mpeg`, `video/mp4`, `video/quicktime`, max 5 MB per file — il limite è imposto dal bucket stesso (non solo dal client). Le foto vengono compresse automaticamente lato client prima dell'upload; per i video, la UI consiglierà di incollare un link (Drive/Dropbox) invece di caricarli, per evitare upload accidentali enormi.

## Setup Supabase — dati seed (Step 4)

1. **SQL Editor** → incolla ed esegui [supabase/migrations/0003_seed_data.sql](supabase/migrations/0003_seed_data.sql) (dopo 0001 e 0002). Popola fornitori, il primo drop con la pipeline a 7 fasi, i suoi articoli con task, un design, un tech pack, un campione, il gadget "Logbook palestra" con la sua nota, i link rapidi del brand e i collegamenti AI/canali chat — sono gli stessi dati di esempio del prototipo HTML originale.
2. Verifica in **Table Editor** che le righe siano comparse (es. `fornitori` con 6 righe, `drop_fasi` con 7 righe legate a "Drop V — Autunno").

Lo script è idempotente (id fissi + `on conflict do nothing`): rieseguirlo non duplica righe né sovrascrive modifiche fatte a mano dopo il seed.

## Build

```bash
npm run build
npm run preview
```

## Icone PWA

Generate da [spolli-merch-logo-removebg.png](spolli-merch-logo-removebg.png) (il logo stella, sorgente tenuta nel repo) compositato su sfondo void `#0B0B0D`, in `public/icons/`. Per rigenerarle dopo un cambio logo:

```bash
npm install -D sharp
node scripts/generate-icons.mjs
npm uninstall sharp
```

`sharp` serve solo per questo script una tantum, non è una dipendenza dell'app.

## Deploy — checklist Netlify (Step 14)

`netlify.toml` è già pronto (build command `npm run build`, publish dir `dist`, redirect SPA, cache disabilitata su `sw.js`/`manifest.webmanifest`). Per andare in produzione:

1. **Netlify → Add new site → Import from Git**, collega questo repo.
2. **Site configuration → Environment variables**, aggiungi le due variabili (stessi valori di `.env.local`, mai committato):
   - `VITE_SUPABASE_URL` = `https://clsyjggifbfwnrdbzprk.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = la anon key del progetto (Supabase → Project Settings → API).
3. Deploya e prendi nota dell'URL assegnato (es. `https://nome-a-caso.netlify.app`, o il tuo dominio custom se lo colleghi).
4. **Supabase → Authentication → URL Configuration** (progetto `clsyjggifbfwnrdbzprk`):
   - *Site URL* → sostituisci con l'URL Netlify di produzione.
   - *Redirect URLs* → aggiungi `https://<il-tuo-sito>.netlify.app/**` (lascia anche `http://localhost:5173/**` se continui a sviluppare in locale).
5. Il template email (con `{{ .Token }}`, vedi sopra) non dipende dal dominio: il codice funziona identico in locale e in produzione, nessuna modifica al template quando cambi URL.
6. Se non l'hai già fatto per i test, collega l'SMTP esterno (Zoho o altro) in **Project Settings → Auth → SMTP Settings** — il rate limit dell'email integrata di Supabase è troppo basso per un uso di team reale.

### Test PWA (installabile su iOS e desktop)

- **iOS Safari**: apri l'URL di produzione → icona Condividi → "Aggiungi a Home". Verifica che l'icona sia la stella rossa (non il monogramma Æ) e che l'app si apra a schermo intero senza barra Safari.
- **Desktop (Chrome/Edge)**: apri l'URL → icona di installazione nella barra indirizzi (o menu → "Installa app") → verifica che si apra in una finestra propria, senza tab del browser.
- In entrambi i casi, dopo l'installazione, fai una modifica di prova (es. una nota) offline/online per confermare che il service worker non blocchi le chiamate a Supabase (deve fare solo caching degli asset statici, mai delle API).
