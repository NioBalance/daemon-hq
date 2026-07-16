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

## Build

```bash
npm run build
npm run preview
```

## Deploy

Configurato per Netlify (`netlify.toml`): build command `npm run build`, publish dir `dist`.
