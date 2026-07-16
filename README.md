# DÆMON — Production HQ

Dashboard di produzione per DÆMON GYMWEAR: drop, catalogo prodotto, pipeline design, tech pack, review campioni, timeline lanci, fornitori, archivio, media, customer care e calendario team.

Costruita con Vite + React + TypeScript, Supabase (Postgres + Storage + Auth) come backend, installabile come PWA.

## Sviluppo

```bash
npm install
npm run dev
```

Copia `.env.example` in `.env.local` e valorizza le variabili Supabase prima di avviare l'app (vedi Step 2 del progetto).

## Build

```bash
npm run build
npm run preview
```

## Deploy

Configurato per Netlify (`netlify.toml`): build command `npm run build`, publish dir `dist`.
