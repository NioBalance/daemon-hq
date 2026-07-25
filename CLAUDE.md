# DÆMON HQ

Dashboard operativa interna del brand gymwear DÆMON (Arcadia Digital Solutions).
Team: Andrea (lead) + Leo. App: daemon-hq.netlify.app (PWA).

## Stack
Vite + React + TypeScript · Supabase (Postgres, Storage, Auth OTP magic link) · Framer Motion (LazyMotion strict) · Recharts · i18next it/en · Netlify (deploy auto da GitHub).

## Design — fonte di verità
- `docs/design/daemon-hq-design-system-v5-ember-cockpit.md` → **ogni valore visivo viene da qui** (colori, tipo, spazi, raggi, glass, componenti, grafici, motion, formattazione dati).
- `docs/design/daemon-hq-v4-operational-redesign.md` → struttura app, sezioni, gruppi nav (resta valido).
- `docs/design/archive/` → spec v3 e materiale di riferimento: NON seguirli, solo consultazione storica.
- `docs/design/refs/*.png` → screenshot di riferimento estetico (peso blur, densità): utili per giudicare, non da clonare.

## Regole fisse (non negoziabili)
- Migrazioni SQL: **mai eseguirle** — genera il file `.sql`, le lancia Andrea nel SQL Editor Supabase.
- **Mai toccare i seed data.** Rimuovere label statiche ≠ cancellare seed.
- OTP = **8 cifre**, non 6.
- Redesign v5 = solo estetica: **nessuna migrazione schema richiesta**.
- Componenti nuovi in `/components/ui-v2`; i vecchi non ricevono fix estetici, solo sostituzione.
- Numeri sempre JetBrains Mono tabulare (`"tnum"`). Un KPI proporzionale è un bug.
- Ember è l'unico accento brand; destructive = cremisi 350, mai ember per errori.
- Glow: max 3 elementi per viewport (nav attiva, CTA, KPI hero, DaemonCore).
- `prefers-reduced-motion` rispettato ovunque.

## Workflow
1. Ogni intervento significativo: prima **piano** (plan mode), poi codice dopo approvazione.
2. Una fase per sessione. Ogni fase termina con: commit + push → deploy Netlify auto.
3. Dopo ogni deploy: **bump versione service worker** (cache PWA stantia altrimenti).
4. Claude Code non vede l'app autenticata: le correzioni visive arrivano via screenshot incollati da Andrea in sessione.

## Fasi redesign v5 (§14 della spec)
1. Token & util (CSS vars, scala tipo, raggi/ombre, formatCurrency/Date/Delta/Duration, script tema pre-mount)
2. Primitive (Button + semantic-tag, Badge unificato, KPI card, empty state, skeleton, toast)
3. Superfici (sidebar glass flottante, tabelle + drawer, kanban card, calendario, Recharts)
4. Polish (motion, reduced-motion, audit contrasto, pass mobile completo)
