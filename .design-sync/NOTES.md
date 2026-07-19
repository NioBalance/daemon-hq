# design-sync — note di questo repo

- Il repo è un'APP Vite (non una libreria): niente dist di libreria. L'entry del bundle è
  `.design-sync/ds-entry.ts` (cfg.entry), che esporta SOLO i componenti presentazionali —
  la modalità synth-da-src trascinerebbe dentro `src/lib/supabase.ts`, che crasha a init
  (`import.meta.env.VITE_SUPABASE_URL` non definita fuori da Vite).
- `MotionRoot` (`.design-sync/motion-root.tsx`) è un export aggiunto dal sync, non esiste
  nell'app (dove il ruolo è di LazyMotion in App.tsx): senza, i componenti `m.*`
  (ProgressRing) restano fermi a pathLength 0. Le conventions dicono di avvolgere l'app.
- Font: l'app li carica da Google Fonts CDN (index.html). Per il bundle sono self-hostati
  in `.design-sync/fonts/` (16 woff2 latin+latin-ext + fonts.css), generati con lo script
  fetch-fonts (rigenerabili ripetendo il fetch da css2 con UA Chrome).
- Le card preview hanno `body{background:#fff}` inline: il DS è dark-only, quindi OGNI
  story authorata porta un proprio `Canvas`/`SfondoApp` con `var(--void)`.
- Componenti overlay (Modal, ShortcutsPanel, ToastStack): sono `position:fixed` — la story
  deve stendere un div statico con minHeight, altrimenti il documento resta a 0px e la
  cattura ritaglia una striscia.
- Render check: niente cache playwright — si usa il Chrome di sistema via
  `DS_CHROMIUM_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"` (playwright
  npm installato in `.ds-sync/`, nessun download chromium).
- I gruppi vengono dai frontmatter `category` dei doc stub in `.design-sync/docs/`
  (cfg.docsDir) — un doc per componente, in italiano.
- ToastStack/ToastProvider: i toast nelle preview vanno lanciati in useEffect con
  `durationMs` lungo (60000), altrimenti l'auto-dismiss li fa sparire prima della cattura.

## Known render warns

- Nessuno: l'ultimo validate è pulito (16/16, 0 bad/thin/variantsIdentical).

## Re-sync risks

- `ds-entry.ts` è una lista manuale: un componente presentazionale nuovo in
  `src/components/` NON entra da solo — va aggiunto a entry + componentSrcMap + doc stub.
- Le preview importano da 'daemon-production-hq' ma compongono API dell'app: se cambiano
  le props (es. FieldDef, varianti toast), le story compilano lo stesso (esbuild non
  type-checka) ma possono rendere sbagliato — guardare gli sheet, non fidarsi del build.
- I woff2 sono copie statiche: se il brand cambia pesi/famiglie su Google Fonts, il
  fetch va ripetuto e fonts.css rigenerato.
- Le classi citate in conventions.md sono verificate contro `_ds_bundle.css` di oggi:
  una rinominata in global.css le rende stantie — la validazione conventions del
  prossimo run le becca.
- ShortcutsPanel elenca le scorciatoie REALI dell'app (lib/tabs): se cambiano le tab,
  la card resta indietro finché non si rebuilda.
