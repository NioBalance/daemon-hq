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

## Setup Supabase — tabelle di dominio + storage (Step 3)

Un solo passo manuale, tutto il resto (incluso il bucket) è nello script SQL:

1. **SQL Editor** → incolla ed esegui [supabase/migrations/0002_domain_tables.sql](supabase/migrations/0002_domain_tables.sql) (dopo aver già eseguito la 0001). Crea le 17 tabelle di dominio (fornitori, drops, drop_fasi, articoli, articolo_tasks, designs, techpacks, samples, gadgets, inspo, links, ai_links, chat_channels, chats, media, events, notes), le relative RLS e il bucket storage `media`.
2. Verifica in **Table Editor** che le tabelle siano comparse, e in **Storage** che esista il bucket `media` (pubblico, limite 5 MB, formati immagine/audio/video consentiti).

Note sul modello:
- Tutte le tabelle sono a scrittura condivisa fra utenti autenticati (è uno strumento di team), **tranne `notes`**: chiunque può aggiungere una nota, ma solo l'autore può modificarla o cancellarla (`author_id = auth.uid()`).
- `designs`, `media`, `gadgets`, `inspo`, `links` hanno una colonna `ordine` per riordinare le card manualmente invece di affidarsi all'ordine di inserimento.
- Il bucket `media` accetta solo `image/jpeg`, `image/png`, `image/webp`, `audio/mpeg`, `video/mp4`, `video/quicktime`, max 5 MB per file — il limite è imposto dal bucket stesso (non solo dal client). Le foto vengono compresse automaticamente lato client prima dell'upload; per i video, la UI consiglierà di incollare un link (Drive/Dropbox) invece di caricarli, per evitare upload accidentali enormi.

## Build

```bash
npm run build
npm run preview
```

## Deploy

Configurato per Netlify (`netlify.toml`): build command `npm run build`, publish dir `dist`.
