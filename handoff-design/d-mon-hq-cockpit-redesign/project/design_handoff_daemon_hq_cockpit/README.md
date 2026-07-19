# Handoff: DÆMON HQ — v4 Cockpit Redesign

## Overview
DÆMON HQ is the internal operations dashboard for a gymwear brand. The v4 redesign moves it from a feature/database-driven app (14 flat sections) to an **operations-driven cockpit** — every screen answers "how is it going / what do I do now?". This bundle covers 5 core screens, each with **loaded / empty / loading** states, plus a full-height operative sidebar and a relocated top-nav.

The visual language is **editorial-minimal**: hierarchy from typography and whitespace, hairline dividers instead of boxed cards. See the authoritative style spec in `daemon-hq-v4-operational-redesign.md` §12 (final style rules — source of truth) and the original approved direction in `daemon-hq-v4-mockup.html`.

## About the Design Files
The files in this bundle are **design references authored in HTML** (a streaming "Design Component" prototype + the original static mockup) — they show intended look and behavior, **not production code to copy directly**. The task is to **recreate these designs in the target codebase's environment** (the real app is React + Framer Motion + Supabase) using its established patterns, components, and libraries. `DAEMON HQ v4.dc.html` relies on a local `support.js` runtime specific to the design tool; treat it as a visual reference, not an importable module.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are specified. Recreate pixel-faithfully using the codebase's existing libraries. Exact hex/spacing/type values are in **Design Tokens** below.

## Screenshots
Rendered reference frames in `screens/` (captured at ~924px — below the 1280px breakpoint, so the floating widgets are collapsed to the top-nav bell; at ≥1280px they dock top-right):
- `01-screen.png` — Overview (loaded) · LIVE ticker (only box) + Anton number band + mini-charts grid
- `02-screen.png` — Meeting (loaded)
- `03-screen.png` — Publish pipeline (loaded)
- `04-screen.png` — Fornitori list (loaded)
- `05-screen.png` — Overview (empty)
- `06-screen.png` — Overview (loading)

## Global Layout
- Root is a horizontal flex: **full-height sticky sidebar** (left) + **content column** (right).
- Sidebar: `height:100vh`, `position:sticky; top:0`, `overflow-y:auto`, right hairline border. Width **236px** expanded / **70px** collapsed (`transition:width .25s cubic-bezier(.16,1,.3,1)`).
- Content column: a sticky **top-nav** (66px) + a `<main>` with `padding:32px 308px 48px 40px` (the large right padding reserves space for the floating widgets — see below).
- Two persistent floating premium widgets (Notifiche, Note) are fixed top-right on **every** screen.
- A floating dev "switcher" (bottom-center) toggles screen + data-state + sidebar collapse — this is a prototype affordance, **not** part of the product; omit in production.

## Screens / Views

### 1. Sidebar (persistent)
- **Purpose**: primary navigation, always visible; collapsible to icon rail.
- **Head**: brand lives here (top-nav no longer repeats it). Expanded → wordmark `DÆMON` (Anton 21px, "Æ" in ember) with `DASHBOARD` sub-label (9px, letter-spacing .26em, dim) + a collapse chevron button. Collapsed → just `DÆ` monogram (Anton 19px, clickable to re-expand). Head separated by a bottom hairline.
- **5 groups**, each with a Chakra Petch eyebrow title (10px, .2em tracking, dim, uppercase) that hides when collapsed:
  - **OPERATIVO**: Overview, Oggi (badge 6), Drops, Chats
  - **PRODUZIONE**: Design, Tech Pack (badge 1), Campioni (badge 2), Catalogo
  - **DOCUMENTI**: Riunioni, Contratti, Note / Memo
  - **PIANIFICAZIONE**: Timeline, Fornitori
  - **MEDIA & MARKETING**: Media Studio, Publish
- **Nav item**: `display:flex; gap:12px; padding:7px 2px`. Line-art SVG icon (17px, 1.5 stroke) + label (13px). Idle color `--muted`; hover → `--bone`. **Active** = text `--bone` + a 2px×15px ember tick at `left:-16px` + icon in ember with glow `drop-shadow(0 0 7px --ember-glow)`. **No background fill.** Badge counts use the mono font in ember.
- **Footer** (expanded only): `A · Andrea · sync ora`, above a top hairline.

### 2. Top-nav (persistent, in content column)
- 66px tall, sticky, `background:rgba(11,11,13,.72); backdrop-filter:blur(14px)`, bottom hairline. **No brand/wordmark** (moved to sidebar).
- **Center**: ember star (home → Overview), `animation:breathe 6s ease-in-out infinite alternate`.
- **Right** (`gap:20px`): Calendario icon, Link icon, "Cerca ovunque" + `⌘K` kbd, and a 31px avatar circle (`A`, ember, with an ok-green sync dot).

### 3. Overview (cockpit) — the command center
- **Page head**: title "Overview" (Chakra 26px) + mono sub `DOM 19 LUG 2026 · 13:42 — tutto sincronizzato`.
- **LIVE ticker** — the **ONLY box on the page**: a pill with an animated rotating conic-gradient border (`animation:spin 7s`) over a glass panel (`rgba(15,15,19,.9)` + `blur(12px)`). Pulsing `LIVE` dot + 4 key metrics, each small label + mono number: **Follower totali** 14.2k · **Clienti totali** 3.4k · **Ordini totali** 889 · **Ordini · Drop live** 128 (ember, current drop).
- **KPI number band** (editorial-minimal, hairline, NO box): 5 cells on a `border-top`/`border-bottom` band with thin vertical dividers — label + **big Anton number** (50px; hot one ember) + meta + CTA text-link. Cells: Prossimo drop 88 (ember), Campioni 2, Tech pack 1, Task oggi 6, Fornitori attivi 3.
- **Mini-charts grid** (hairline band, 5 **draw-in** charts, NO boxes, vertical dividers): Follower · 7gg (area line, `drawin`) · Task · settimana (7 bars, `growup`) · Pipeline Drop V (donut 43%, `drawin`) · Ordini · 30gg (area line ok, `drawin`) · Qualità campioni (donut 76%, `drawin`). Animations live only on these graphs.
- The two floating widgets (Notifiche, Note) are the only OTHER boxed elements (glass), docked/toggled top-right.
- **Two-column** area (`1.4fr / 1fr`, gap 44px): **Adesso** (list of urgent items across sources: checkbox + colored dot/label tag + text + owner initial, hairline rows) and **Ultima attività** (dot + text + mono time).
- **Empty state**: KPI band shows `—`/`0`; centered block "Il tuo cockpit è pronto" + text-link CTAs, no boxes.
- **Loading state**: shimmer skeleton lines (thin, no card containers) echoing the band + two columns.

### 4. Meeting (Riunioni)
- **Purpose**: memo with agenda auto-generated from open alerts + action items (decisional memory).
- Header: title + status label (Pianificata) + mono date/participants + "Firma memo →".
- Left col: **Agenda** ("auto-generata da alert") — numbered rows (Anton index) each with a colored dot + source label (da alert · Drop V / Tech Pack / Campione, or "aggiunto a mano"); then **Decisioni** as `border-left:2px solid --ok` accented lines (not boxes).
- Right col: **Action item** → Oggi/Settimana — checkbox + text + mono due date + owner; one completed (strikethrough, ok).
- Empty: "Nessuna riunione ancora" + "+ Nuova riunione". Loading: skeleton lines.

### 5. Publish (pipeline)
- **Purpose**: content pipeline **Idea → In-Edit → Pronto → Programmato → Pubblicato**.
- 5 columns (`grid`, gap 28px). Column header = status dot + name + mono count. Cards are **boxless** entries separated by hairlines: optional 4:5 media placeholder (radius 6, `linear-gradient(135deg,--surface2,--surface)` with a mono type label), title, platform label + mono date/metric. Column dot colors: Idea `--dim`, In-Edit `--amber`, Pronto `#5b8def`, Programmato `--ember`, Pubblicato `--ok` (published cards at 0.65 opacity).
- Empty: dim column headers + centered "Nessun contenuto in pipeline". Loading: skeleton columns.

### 6. Fornitori (list)
- **Purpose**: supplier registry, dual-supplier strategy (core / capsule / backup).
- Header + search (underline input) + filter text-links (active = ember underline).
- Table (no outer box): hairline header row + hairline rows. Columns `grid: 2fr 1fr 1.3fr .7fr 1.1fr` (all `minmax(0,·)`): **Fornitore** (name + mono city), **Tipo** (dot + label: Core ember / Capsule amber / Backup muted), **Condizioni** (e.g. 30/70 · pag. 60gg), **Articoli** (mono count), **Contratto** (dot + Firmato/Inviato/Bozza/Scade 30gg). 6 rows.
- Empty: "Nessun fornitore" + CTA. Loading: skeleton rows.

### 7. Floating premium widgets (Notifiche + Note) — persistent
- **Visibility**: at **≥1280px** they are docked top-right and `<main>` reserves `padding-right:300px` (no overlap). **Below 1280px** they are collapsed and opened as an overlay via a **top-nav bell** (ember badge) — `railOpen` state, default closed, so content is never obscured on narrow widths.
- `position:fixed; right:24px; top:88px; width:250px; z-index:15`, `max-height:calc(100vh-112px); overflow-y:auto`, stacked (gap 16).
- Each is a **glass card**: `background:rgba(20,20,24,.72); backdrop-filter:blur(16px); border:1px solid --line2; border-radius:16px; box-shadow:0 16px 44px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.02); padding:16px`. **These two are the only container-styled elements** — everything else is boxless.
- **Notifiche**: header + count (3), rows = ember dot (with glow) + text + mono time.
- **Note per il team**: header, `◆` amber pins + note + mono `author · date`, plus a "Nota rapida…" underline input with an ember `+`.

## Interactions & Behavior
- **Sidebar collapse**: toggles 236↔70px (width transition .25s). Labels, group titles, badges, footer hide when collapsed; head becomes centered `DÆ` monogram (click to expand).
- **Navigation**: sidebar items + the star (home) switch the active screen. Active screen drives the ember tick/icon-glow.
- **Data states** per screen: loaded / empty / loading (in the product these map to real fetch states).
- **Animations**: star `breathe` 6s alt; skeletons `shimmer` 1.4s; LIVE dot `livepulse` 1.7s; overview charts one-shot on mount (`drawin` 1.4s, `growup` .6s staggered, `donutdrop` 1.3s, `fadein`). Hover: nav/tools/links → `--bone` (~.15–.18s).
- Checkboxes use `accent-color:--ember`. Completing an item completes it at the source entity (Oggi/Settimana is an aggregated view, not a copy).

## State Management
- `screen`: `overview | meeting | publish | fornitori` (sidebar-driven).
- `view`: `loaded | empty | loading` per screen (real: derived from data-fetch status).
- `collapsed`: sidebar boolean.
- Data sources (per spec): drops/phases, articolo tasks, campioni review, `meetings` + `meeting_actions`, `kpi_snapshots`, media, contracts. Oggi/Settimana and Overview "Adesso" are **aggregated views** over existing entities — no duplicate tables.

## Design Tokens
Colors:
- `--void #0B0B0D` · `--surface #141418` · `--surface2 #1B1B21` · `--surface3 #22222B`
- `--line #212128` (hairline) · `--line2 #2C2C36`
- `--bone #EAE6DE` (text) · `--muted #8B8B96` · `--dim #5C5C68`
- `--ember #E2382A` · `--ember-dim #7A241C` · `--ember-glow rgba(226,56,42,.35)`
- `--amber #E0A03C` · `--ok #57B36C` · `--steel #3A3A44` · info blue `#5b8def`
- Body bg glow: `radial-gradient(ellipse 900px 480px at 50% -12%, rgba(226,56,42,.05), transparent 62%)`

Typography:
- **Anton** (`--font-d`) — logo/wordmark + big numbers only (KPI hero, agenda index, donut %).
- **Chakra Petch** (`--font-t`, 500/600/700) — titles, section headers, eyebrow labels.
- **Space Grotesk** (`--font-b`, 400–700) — body, labels, meta (default).
- **Bricolage Grotesque → Poppins** (`--font-m`) — technical voice for **dates & short codes only** (`22/07`, `2h fa`, `⌘K`, counters). *(Replaces the earlier IBM Plex Mono, now removed everywhere.)*

Radius: hairline/editorial elements = 0; soft minimal 6/8 (media thumbs, avatars, chips); premium widgets 14/16. Progress lines 2px. Borders/dividers 1px `--line`.
Status vocabulary (consistent cross-section, colors): Bozza `--dim` · Pianificato/Programmato `--ember` · In corso/In-Edit `--amber` · In review `--amber` · Fatto/Live `--ok` · Urgente `--ember`.

## Assets
- **Fonts**: Google Fonts — Anton, Chakra Petch, Space Grotesk, Bricolage Grotesque, Poppins.
- **Icons**: inline line-art SVG (1.4–1.5 stroke), no icon font, no emoji. Recreate with the codebase's icon set (Lucide-style) matching stroke weight.
- **Charts**: hand-authored SVG (no chart lib needed); in production use the app's charting approach (or lightweight SVG) preserving the draw-in/grow motion.
- **Images**: none — media slots are gradient placeholders to be filled with real assets.

## Files
- `DAEMON HQ v4.dc.html` — full interactive prototype (all 5 screens × 3 states, sidebar, top-nav, floating widgets, charts). Reference for layout/behavior; uses a tool-specific `support.js` runtime — not importable.
- `daemon-hq-v4-operational-redesign.md` — **source of truth**: product rationale (§0–11) + final style rules (§12).
- `daemon-hq-v4-mockup.html` — original approved static mockup (v4 Overview direction).
