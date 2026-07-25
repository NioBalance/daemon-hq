# DÆMON HQ — Design System v5 "Ember Cockpit"

> Documento normativo. Ogni valore qui definito è la **fonte di verità** per UI, componenti e grafici.
> Base: adattamento della spec MARF v1.0 all'identità DÆMON (void/bone/ember). Struttura app: v4 operational redesign (5 gruppi, cockpit).
> Stack: React + Vite, Tailwind (token via CSS variables HSL), Recharts, Framer Motion (LazyMotion strict), i18next it/en, Supabase, PWA Netlify.

---

## 0. Decisioni di adattamento (cosa si prende, cosa no)

| # | Da MARF | Decisione per DÆMON |
|---|---------|---------------------|
| D1 | Accento unico violetto Majorelle | **Ember resta l'unico accento brand.** Il violetto non entra. Poiché ember è un rosso-arancio, il `destructive` si sposta su **cremisi freddo** (hue 350) per non collidere: ember = energia, cremisi = problema. |
| D2 | Font Outfit unico | **Si tengono i font DÆMON**: Bricolage Grotesque (titoli), Inter (UI/body), JetBrains Mono (dati), Anton (SOLO logo Æ). Si adotta però la *scala* MARF (§3.2). |
| D3 | Glass surfaces + sidebar glass flottante | **Si adotta.** Supera l'attuale de-box editoriale: le card tornano, ma in vetro satinato; gli hairline sopravvivono come *steel divider* interni. |
| D4 | Light solo su pagine pubbliche | **No**: DÆMON ha il toggle globale. Light = **parchment** (identità pergamena esistente), non bianco puro. Script pre-mount con `THEME_VERSION` si adotta (previene flash + invalida temi vecchi). |
| D5 | Sistema badge severity (critical/high/medium) | **Si adotta ed è il motore del Registro Errori Drop.** |
| D6 | Menu, sezioni, drawer lead, profilo closer | **Non si copiano.** Si mappano i *pattern* sulle sezioni DÆMON (§13). |
| D7 | Glow come gerarchia (max 3/viewport) | **Si adotta**, con eccezione dichiarata: il **DaemonCore** conta come 1 dei 3 elementi glow in Overview. |
| D8 | Numeri sempre mono tabulare | **Si adotta.** Un KPI in font proporzionale è un bug. |
| D9 | Formattazione dati normativa (util uniche) | **Si adotta integralmente** (§10), locale it/en via i18next. |

Tre regole non negoziabili (ereditate e adattate):
1. **Un solo accento.** Ember `#E2382A` è l'unico colore di marca. Verde/ambra/cremisi/blu sono *semantici*, mai decorativi.
2. **Il glow è gerarchia.** Appare solo su: voce nav attiva, KPI hero, CTA primaria, DaemonCore. Mai più di 3 elementi per viewport.
3. **I numeri sono JetBrains Mono tabulare** (`font-feature-settings: "tnum"`). Sempre.

---

## 1. Fondamenta

### 1.1 Direzione estetica
**"Cockpit incandescente"**: superficie scura profonda (void), vetro satinato, un solo accento che *brucia* (ember) usato come energia, non come decorazione. Il dato è il protagonista: numeri grandi, monospazio, tabulari; tutto il resto è quieto. In light: pergamena calda, stessa disciplina.

### 1.2 Naming dei token
Prefisso `--dae-*` per i brand token; token semantici senza prefisso (compatibili shadcn/Tailwind). Formato HSL grezzo (`H S% L%`) per permettere `hsl(var(--x) / alpha)`.

---

## 2. Colore

### 2.1 Palette brand (fissa, non tematizzata)

```css
:root {
  --dae-ember:      5 76% 53%;    /* #E2382A — primario */
  --dae-ember-neon: 8 100% 70%;   /* testo accento su dark (equiv. morf-neon) */
  --dae-ember-deep: 5 63% 29%;    /* #7A241C — coda gradiente, bordi danger soft */
  --dae-amber:      37 73% 56%;   /* #E0A03C — warning / in attesa */
  --dae-void:       240 8% 5%;    /* #0B0B0D — fondo dark */
  --dae-steel:      240 9% 17%;   /* #27272F — bordi/divisori dark */
  --dae-bone:       40 22% 89%;   /* #EAE6DE — testo su dark / base parchment */
}
```

### 2.2 Semantici — DARK (default)

```css
.dark {
  --background: 240 6% 5%;
  --surface-1: 240 5% 8%;           /* card base */
  --surface-2: 240 5% 11%;          /* card annidata, input */
  --surface-3: 240 5% 14%;          /* hover, popover */
  --foreground: 40 22% 89%;         /* bone */
  --muted-foreground: 40 8% 68%;    /* contrasto ≥ 4.6:1 su glass */
  --subtle-foreground: 240 5% 50%;  /* SOLO metadati non essenziali */
  --border: 240 9% 17%;
  --border-strong: 240 9% 23%;
  --primary: var(--dae-ember);
  --primary-foreground: 40 22% 96%;
  --success: 137 40% 52%;   --success-fg: 137 55% 72%;
  --warning: 37 73% 56%;    --warning-fg: 37 90% 70%;
  --destructive: 350 70% 50%; --destructive-fg: 352 90% 74%;   /* cremisi ≠ ember */
  --info: 205 85% 58%;      --info-fg: 205 95% 74%;
  --hover-bg: 240 6% 13%;
  --ring: var(--dae-ember-neon);
}
```

### 2.3 Semantici — LIGHT "Parchment" (toggle globale)

```css
.light {
  --background: 40 30% 95%;         /* pergamena */
  --surface-1: 40 25% 98%;
  --surface-2: 40 20% 93%;
  --surface-3: 40 18% 90%;
  --foreground: 240 10% 10%;
  --muted-foreground: 240 6% 38%;
  --subtle-foreground: 240 5% 55%;
  --border: 40 12% 82%;
  --border-strong: 40 12% 74%;
  --primary: 5 72% 46%;             /* ember scurito per contrasto su chiaro */
  --hover-bg: 40 20% 91%;
  /* semantici: hue invariata, luminosità -8% */
}
```

### 2.4 Regole d'uso del colore
- **Testo colorato** usa sempre la variante `-fg` (più chiara), **sfondi/bordi** la base a bassa opacità: `bg-success/10 border-success/25 text-[hsl(var(--success-fg))]`.
- **Cremisi** riservato a: errori, blocchi produzione, azioni distruttive, severità `critical`. **Mai** per delta KPI negativi neutri: i delta usano freccia + `muted-foreground`; il colore entra solo se il KPI è sotto target del drop.
- **Ember** non è mai "errore": è attività, selezione, energia (nav attiva, CTA, fase in corso).
- Gradiente brand ("incandescenza"): `linear-gradient(135deg, hsl(var(--dae-ember)), hsl(var(--dae-amber)))`. Unico gradiente ammesso (avatar, CTA hero, progress pipeline).

### 2.5 Superfici glass

```css
.glass-surface {           /* card standard */
  background: hsl(var(--surface-1) / 0.72);
  backdrop-filter: blur(20px) saturate(1.15);
  border: 1px solid hsl(var(--border) / 0.8);
  border-radius: var(--radius-card);
}
.glass-sidebar {           /* sidebar */
  background: hsl(var(--surface-1) / 0.85);
  backdrop-filter: blur(28px) saturate(1.2);
}
.glass-elevated {          /* modali, popover, drawer articolo/tech pack */
  background: hsl(var(--surface-2) / 0.92);
  backdrop-filter: blur(32px);
  border: 1px solid hsl(var(--border-strong));
  box-shadow: var(--shadow-3);
}
```
Fallback senza `backdrop-filter`: background a opacità 0.97. In light il glass resta (pergamena traslucida), stesso set di classi.

---

## 3. Tipografia

### 3.1 Famiglie e ruoli

| Ruolo | Font | Pesi caricati | Uso |
|-------|------|---------------|-----|
| Display | **Bricolage Grotesque** | 600, 700 | Titoli pagina, titoli card, numeri di sezione. Mai sotto 15px. |
| UI / body | **Inter** | 400, 500, 600 | Tutto il resto dell'interfaccia. |
| Dati | **JetBrains Mono** | 400, 500, 700 | KPI, valori €, %, codici (`TP-01`, `DR-05`), orari, durate, celle numeriche. Sempre `"tnum"`. |
| Logo | **Anton** | 400 | SOLO logotipo DÆMON / watermark Æ. Mai testo UI. |

*Rimuovere dal bundle ogni peso non elencato.*

### 3.2 Scala tipografica (base 16px)

| Token | Size/Line | Font · Peso | Tracking | Uso |
|-------|-----------|-------------|----------|-----|
| `text-kpi-xl` | 40/44 | Mono 700 | -0.02em | KPI hero Overview |
| `text-kpi` | 28/32 | Mono 700 | -0.01em | KPI card standard |
| `text-kpi-sm` | 20/26 | Mono 600 | 0 | KPI secondari, valori su card |
| `text-page-title` | 20/28 | Bricolage 700 | -0.01em | Titolo pagina |
| `text-card-title` | 15/22 | Bricolage 600 | 0 | Titolo card |
| `text-body` | 13.5/20 | Inter 400 | 0 | Testo base UI e nav item |
| `text-table-cell` | 13/19 | Inter 400 | 0 | Celle tabella (Mono per colonne numeriche) |
| `text-caption` | 12/16 | Inter 400 | 0 | Descrizioni, note, sommari |
| `text-nav-label` | 10.5/14 | Inter 600 | 0.08em UPPER | Etichette gruppo sidebar, header tabella |
| `text-badge` | 10/13 | Inter 600 | 0.02em | Badge/chip |
| `text-micro` | 9.5/12 | Mono 600 | 0.03em UPPER | Severità, contatori, codici brevi |

Regola: massimo **3 livelli tipografici per card**. Se ne servono di più, la card va scomposta.

---

## 4. Spaziatura, griglia, densità

### 4.1 Scala
Base 4px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Fine-tune codificati come token (non eccezioni libere): `py-[9px]` nav item, `px-[5px]` badge.

### 4.2 Layout applicativo
```
Sidebar:         232px espansa · 64px collassata · transizione 200ms ease-out
                 flottante: inset-y-2, rounded-r-2xl, border-y + border-r
Contenuto:       max-width 1920px · padding 24px desktop / 12px mobile
Gap tra card:    16px (grid) · 12px dentro kanban Design
Padding card:    20px (p-5) standard · 16px compatte (KPI, kanban)
Colonna kanban:  min 280px · max 320px · gap 16px · scroll-x con snap
Drawer:          420px sm · 480px lg, da destra (articolo, tech pack, fornitore)
Modale:          max-w 560px (form) · 720px (dettaglio drop / sample review)
```

### 4.3 Densità tabelle
- Riga: `py-3 px-4` (min-height 48px) — comfort.
- Modalità **compact** (`py-2`, 38px) come preferenza utente per Tech Pack e Archivio.
- Colonne numeriche (€, qty, lead time): allineate a destra, Mono.

---

## 5. Raggi, bordi, elevazione

### 5.1 Raggi
```css
--radius-card: 16px;     /* card, drawer (kanban card: 12px) */
--radius-button: 10px;   /* bottoni, input, select */
--radius-badge: 6px;     /* badge/chip — unico, niente pill */
--radius-full: 9999px;   /* solo avatar e dot di stato */
```

### 5.2 Bordi e divisori
- Bordo card: `1px hsl(var(--border)/0.8)`.
- **Steel divider** (eredità del de-box): `1px` con gradiente orizzontale `transparent → hsl(var(--border-strong)) → transparent` — tra header/body sidebar e tra sezioni interne delle card.
- Indicatore attivo nav: `border-left 3px hsl(var(--primary))` + fondo `linear-gradient(90deg, primary/16%, primary/2%)` + `inset ring primary/20%`.

### 5.3 Elevazione (3 livelli + glow)
```css
--shadow-1: 0 1px 2px hsl(240 30% 2% / .4);            /* card a riposo */
--shadow-2: 0 8px 24px -8px hsl(240 30% 2% / .5);      /* hover card, dropdown */
--shadow-3: 0 24px 64px -16px hsl(240 30% 2% / .65);   /* modali, drawer */
--glow-ember: 0 0 24px hsl(var(--primary) / .30);      /* SOLO nav attiva, CTA, KPI hero, DaemonCore */
```

---

## 6. Componenti

### 6.1 Sidebar (nav v4, veste v5)
- 5 gruppi invariati: **Operativo · Produzione · Documenti · Pianificazione · Media & Marketing**. Etichette `text-nav-label`.
- Accanto all'etichetta gruppo: **icone integrazione con dot di stato** (check verde = connesso) quando arriverà la fase API — Shopify su Operativo, Meta/ManyChat su Media & Marketing. Predisporre lo slot ora, vuoto.
- Item: `text-body`, icona 17px `muted-foreground` (→ `primary` se attivo), `py-[9px] px-2.5`, `gap-2.5`.
- Header sidebar: logo Æ (Anton) + wordmark + badge `HQ` in `text-micro` su `primary/15`.
- Footer: switcher workspace (Arcadia) → utente (avatar gradiente incandescenza, nome, email) → notifiche → toggle IT/EN → impostazioni. Steel divider sopra.
- Collassata (64px): solo icone, tooltip a destra, badge contatori come dot.

### 6.2 Bottoni

| Variante | Stile | Uso |
|----------|-------|-----|
| `primary` | fondo `primary`, testo `primary-foreground`, `shadow-1`; hover `primary/90` + `glow-ember` | 1 per viewport (Nuovo drop, Nuovo tech pack) |
| `secondary` | bordo `border`, fondo trasparente; hover `hover-bg` + bordo `primary/30` | Azioni normali |
| `ghost` | solo hover `hover-bg` | Icone, azioni terziarie |
| `destructive` | come secondary ma bordo/testo `destructive`; fondo pieno solo in conferma modale | Elimina, Scarta sample |
| `semantic-tag` | fondo `{colore}/12`, bordo `{colore}/30`, testo `{colore}-fg` | Azioni di stato (Approva sample, Segna in produzione): tinte piatte, mai 4+ bottoni saturi affiancati |

Altezze: `sm 30px · md 36px · lg 44px`. Icona 16px, gap 8px. Focus: `ring 2px var(--ring) offset 2px`, sempre.

### 6.3 Badge / Chip (sistema unificato)
Un solo componente: `radius-badge`, `text-badge`, padding `2px 8px`.
- **status** (fasi pipeline): bordo `{colore}/40`, testo `{colore}-fg`, fondo trasparente. Mappa DÆMON: `Bozza` steel · `Inviato/Pianificato` info · `In corso/In produzione` primary · `In review` warning · `Confermato/Fatto` success · `Bloccato/Urgente` destructive.
- **meta** (contatori, owner, `Tot: 15`): bordo `border`, testo `foreground`, nessun colore.
- **event** (scadenza, drop date, shooting): fondo `{colore}/10`, senza bordo, icona 12px.
- **severity** (Registro Errori Drop): come status ma UPPERCASE `text-micro` — `critical` destructive · `high` warning · `medium` neutro.
Ordine su card: status → event → meta. Max 3 visibili + `+n`.

### 6.4 Card KPI (Overview / cockpit)
```
┌───────────────────────────────┐
│ LABEL UPPERCASE 10.5 muted    │  ← icona 16 a destra opzionale
│ €14k              (Mono 28)   │
│ €13.5k target · ↗ 4% v. sett. │  ← 12px; delta grigio, colore solo se sotto target
│ gestisci ›                    │  ← CTA obbligatoria (lezione PartnerTribe)
└───────────────────────────────┘
```
Padding 16px, gap 6px. Micro-progressbar 3px SOLO se esiste un target. **Ogni numero è una porta**: card intera cliccabile.

### 6.5 Card Kanban (Design board)
1. **Riga 1**: nome capo — `text-body` 600, 1 riga troncata.
2. **Riga 2**: codice `D-04` Mono `ember-neon` · categoria; data ultima attività a destra `text-caption subtle`.
3. **Riga 3**: badge (status → event → meta), max 3.
4. **Riga 4** (opz.): prossima azione — `text-caption`, icona 12px; scadenza vicina in `warning-fg`.
Card: `surface-2`, `radius 12px`, hover `surface-3 + shadow-2 + translateY(-1px)`, barra sinistra 3px nel colore di stato colonna.

### 6.6 Header colonna kanban
Nome 600 + contatore badge meta + micro-barra % sul totale board. Sticky su scroll verticale.

### 6.7 Tabelle (Tech Pack, Fornitori, Contratti, Archivio)
- Header sticky, `text-nav-label`, fondo `surface-1/0.9 blur`.
- Righe: divisore `border/60`, hover `hover-bg`, ingresso `fadeSlideIn` stagger 30ms (cap 12 righe).
- Colonne € e numeriche: destra, Mono. Colonna stato: badge status. Codici (`TP-01`) Mono mai troncati.
- Riga intera cliccabile → apre drawer.

### 6.8 Drawer dettaglio (articolo / tech pack / fornitore)
Fondo `glass-elevated`, header sticky con nome + X. Struttura fissa top→down: **Identità** (nome, codice, status+drop) → **Specifica** (collassabile: materiali, colorway, taglie) → **Fornitore/Owner** → **Azioni** (griglia `semantic-tag` 2 colonne) → **Note/Registro**.

### 6.9 Calendario (Riunioni + scadenze drop)
- Evento: barra sinistra 3px per tipo (Drop primary · Fornitore info · Riunione warning · Interno steel), titolo 12px 1 riga, orario Mono 10.5px.
- Altezza minima 24px; sotto 30 min → solo titolo, orario in tooltip. Overlap max 3 colonne, poi `+n altri`.
- Indicatore "adesso": linea 1.5px `destructive` con dot, solo giorno corrente.

### 6.10 Toast
Bottom-right desktop / top mobile, max-w 420px, `glass-elevated`, barra sinistra 3px semantica, auto-dismiss 5s (errori persistenti), max 3 in stack. Il verbo del bottone = il verbo del toast ("Pubblica" → "Pubblicato").

### 6.11 Empty state
Icona 32px `subtle` + titolo `text-body 600` + una riga `caption` + azione contestuale. Copy direttivo:
- `Nessun tech pack` → **"Nessun tech pack per questo drop"** + "Crea tech pack".
- `Nessun sample` → **"Nessun campione in review"** + "Registra arrivo".

### 6.12 Skeleton / loading
Skeleton `surface-2` shimmer 1.6s solo su: KPI, righe tabella, card kanban. Mai spinner full-page: shell (sidebar + header) renderizza sempre subito.

### 6.13 HQ Map (React Flow)
Nodi = mini glass-surface (`radius 12px`, padding 12px): titolo `text-body 600` + badge status; bordo sinistro 3px colore stato. Edge: `border-strong` 1.5px, animato (dash flow) solo sul percorso *attivo*. Selezione nodo = trattamento "selected" (§9). Sfondo: void con dot-grid `border/40`.

### 6.14 DaemonCore
Particelle in `ember` con falloff verso `amber` (gradiente incandescenza in 3D). È l'unico elemento con glow libero, ma **conta nel budget dei 3 glow** della viewport Overview: se DaemonCore è visibile, in pagina restano al massimo nav attiva + 1 CTA con glow.

---

## 7. Grafici (Recharts)

### 7.1 Regole globali
```
Grid:        solo linee orizzontali, 1px dashed 3-3, hsl(var(--border)/0.5)
Assi:        nessuna axis-line né tick-line; label 11px Mono, muted-foreground
Asse Y:      domain [0, 'auto'] per metriche non-negative (ricavi, pezzi, lead)
             ticks ~4, formato compatto (§10): 0 · 5k · 10k · 15k
Tooltip:     glass-elevated, radius 10px, titolo data 11px muted, valori Mono 13px
Legenda:     dot 8px + label 12px, sotto il grafico, gap 16px
Animazione:  800ms ease-out al mount; nessuna su update dati
```

### 7.2 Per tipo
- **Area (andamento vendite/KPI)**: stroke `primary` 2px, fill verticale `primary/25 → primary/0`, dot solo hover (r4, fill background, stroke primary 2), curve `monotone`.
- **Bar (confronto drop, sell-through)**: serie primaria `primary/85`, secondaria `success`, radius top 4px, larghezza max 28px, gap 32%. Valori < 3% del max → altezza minima 2px + valore reale in tooltip.
- **Sparkline (ticker Overview)**: stroke 1.5px `primary`, nessun asse, nessun dot, altezza 28px.
- **Progress pipeline drop**: track `surface-3`, fill gradiente incandescenza orizzontale, 8px card / 3px micro, radius full, valore Mono a destra.
- **Gantt (Timeline)**: barre `radius 4px`; fase futura `surface-3` bordo `border` · in corso gradiente incandescenza · fatta `success/70` · in ritardo bordo `destructive`. Oggi: linea verticale 1.5px `destructive`.
- **Barre distribuzione (Registro Errori)**: 0% → track vuoto con etichetta `0%` in `subtle` — mai verde su un conteggio nullo di outcome critici.

---

## 8. Motion (Framer Motion, LazyMotion strict)

```css
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
--dur-fast:    120ms;   /* hover, focus, toggle */
--dur-base:    200ms;   /* sidebar, tab, drawer  */
--dur-slow:    350ms;   /* fadeSlideIn liste, modali */
```
- `fadeSlideIn`: opacity 0→1, translateY 6px→0, 350ms, stagger 30ms, cap 12 elementi.
- Drawer: slide da destra 200ms + fade overlay. Spider-lines: restano come animazione di apertura gruppi sidebar (draw-in 200ms), unica eredità decorativa ammessa.
- Micro: hover card `translateY(-1px)` 120ms; press bottone `scale(0.98)`.
- **`prefers-reduced-motion: reduce`** → transizioni 0ms, stagger rimosso, shimmer → opacità statica, DaemonCore in frame statico. Obbligatorio.

---

## 9. Stati interattivi (matrice unica)

| Stato | Trattamento |
|-------|-------------|
| hover | `hover-bg` (o `surface-3` su card) + bordo `primary/30` dove c'è bordo |
| focus-visible | `ring 2px var(--ring)` offset 2px — mai rimosso, anche su righe tabella e nodi HQ Map |
| active/pressed | `scale(0.98)` o fondo `primary/20` |
| selected | come nav attiva: barra 3px + gradiente + inset ring |
| disabled | `opacity .5`, `pointer-events-none`, MAI solo cambio colore |
| loading | contenuto → skeleton; bottone → spinner 14px inline + label invariata |
| error (input) | bordo `destructive`, messaggio 12px `destructive-fg` sotto, icona nel campo |

---

## 10. Formattazione dati (normativa)

Util uniche (`formatCurrency`, `formatDate`, `formatDelta`, `formatDuration`) usate ovunque; vietato formattare inline.

| Dato | Regola (locale it) | Esempi |
|------|--------------------|--------|
| Valuta compatta (KPI, card, colonne) | `€` prefisso, `k` minuscola, 1 decimale solo se <10k e non intero | `€4k` · `€2,7k` · `€176k` · `€1,2M` |
| Valuta esatta (contratti, fatture, contabile) | it-IT completo | `4.500,00 €` |
| Zero | mai `0,00 €` nei KPI → `€0` | |
| Data breve (liste, card) | `gg MMM`, anno solo se ≠ corrente | `19 lug` · `19 lug 2025` |
| Data + ora (log, attività) | `gg/MM/aaaa · HH:mm` | `23/07/2026 · 22:14` |
| Range (drop, campagne) | `gg–gg MMM` stesso mese, altrimenti `gg MMM – gg MMM` | `20–26 lug` |
| Percentuali | 1 decimale sotto 10%, intere sopra; virgola it | `3,3%` · `27%` |
| Delta KPI | freccia `↗/↘` + valore; colore per §2.4 | `↘ 22% vs settimana scorsa` |
| Durate / lead time | `Xm Ys` · giorni `45gg` | `56s` · `45gg` |
| Codici | Mono, mai troncati | `TP-01` · `DR-05` · `D-12` |
| Pezzi/quantità | separatore migliaia it | `1.000 pz` |

In `en`: `€4.2k`, `Jul 19`, punto decimale. i18next gestisce entrambi.

---

## 11. Accessibilità (quality floor)

1. Contrasto: testo normale ≥ 4.5:1, large/bold ≥ 3:1 — verificato su **glass a riposo**. `muted-foreground` a L=68% è calcolato per questo.
2. Focus visibile su tutto il cliccabile, incluse righe tabella, card kanban e nodi HQ Map (`tabindex=0`, `role=button`, Enter/Space).
3. Target touch ≥ 40px su mobile (bottoni 30px desktop crescono sotto `lg`).
4. Kanban: drag&drop con alternativa da menu ("Sposta in…").
5. Grafici: `aria-label` con sintesi testuale ("Vendite drop V: €14k, +8% sulla settimana").
6. Colore mai unico portatore di significato: badge sempre con testo, stati con icona.
7. `notranslate` sul documento (previene crash React da auto-translate); i18n copre it/en nativamente.

---

## 12. Responsive / PWA

| Breakpoint | Comportamento |
|------------|---------------|
| < 640 | Sidebar → drawer da hamburger; KPI colonna singola; kanban 1 colonna con tab fasi; tabelle → card-list (label:valore); drawer full-screen; regola dei 2 tap |
| 640–1024 | KPI grid 2col; kanban scroll-x con snap; calendario vista 3 giorni |
| 1024–1440 | Layout completo, sidebar espansa |
| > 1440 | Contenuto cap 1920px centrato; kanban mostra più colonne, non più larghe |

Tema: script pre-mount in `index.html` con `daemon_theme` + `daemon_theme_v` (version bump invalida i temi salvati vecchi, evita flash). Dopo ogni deploy: bump service worker per invalidare cache PWA.

---

## 13. Mappa sezione → pattern

| Sezione DÆMON | Pattern v5 |
|---------------|-----------|
| Overview | KPI card §6.4 + sparkline §7.2 + activity log (righe `text-caption` + steel divider) + DaemonCore §6.14 |
| Oggi/Settimana | Righe-lista con badge event + azione a destra; raggruppate per giorno con `text-nav-label` |
| Design (kanban) | §6.5–6.6 |
| Tech Pack | Tabella §6.7 + drawer §6.8 + file-card con anteprima |
| Samples | Modale review 720px: 5 barre rating (progress §7.2) + verdetto `semantic-tag` |
| Timeline | Gantt §7.2 |
| Fornitori | Tabella §6.7 + drawer con griglia vetting collassabile |
| Riunioni | Calendario §6.9 + card agenda con decisioni → badge meta |
| Contratti | Tabella + drawer; importi in valuta esatta |
| Media Studio | 3 colonne di folder-card glass (radius 12, anteprima 16:9, contatore Mono) |
| Chats / Customer Care | Inbox: righe con avatar, ultima riga `caption` troncata, unread dot `primary` |
| Publish | Pipeline card stile Digital Hub con badge status v5 |
| HQ Map | §6.13 |
| Canvas | Toolbar flottante `glass-elevated`, resto libero |
| Registro Errori Drop | Tabella + badge **severity** §6.3 + distribuzione §7.2 |
| Archivio | Tabella compact + folder-card |

---

## 14. Piano di migrazione (per Claude Code)

**Fase 1 — Token & util:** CSS variables §2, scala tipo §3, raggi/ombre §5, util formattazione §10, script tema §12. Nessuna migrazione DB.
**Fase 2 — Primitive:** Button (con `semantic-tag`), Badge unificato, KPI card con CTA, empty state, skeleton, toast.
**Fase 3 — Superfici:** sidebar flottante glass §6.1, tabelle+drawer, kanban card, calendario, grafici Recharts §7.
**Fase 4 — Polish:** motion §8, reduced-motion, audit contrasto (axe), pass mobile completo.

Regole di convivenza: componenti nuovi in `/components/ui-v2`; i vecchi non ricevono fix estetici, solo sostituzione. Ogni fase = commit + sync GitHub → deploy Netlify → clear cache service worker. **Nessuna migrazione Supabase richiesta** (redesign = solo estetica; non toccare seed data).
