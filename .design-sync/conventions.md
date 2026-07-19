# DÆMON HQ — convenzioni d'uso

Design system **dark-only** del brand DAEMON GYMWEAR: nero "void", accento rosso "ember", superfici glass. Non esiste tema chiaro — ogni schermata parte da fondo scuro.

## Setup obbligatorio

- **Canvas**: il CSS stila `body` (fondo `var(--void)` con radial ember, testo `var(--bone)`, font `var(--font-b)`). Se il tuo root non è `body`, replica: `background:var(--void); color:var(--bone); font-family:var(--font-b); font-size:15px; line-height:1.5`.
- **Animazioni**: i componenti animati (`ProgressRing`) usano Framer `m.*` — senza wrapper restano fermi. Avvolgi l'app UNA volta in `<MotionRoot>…</MotionRoot>`.
- **Toast**: `<ToastProvider>` intorno all'app, `<ToastStack/>` montato una volta dentro di esso, poi da qualunque componente `const showToast = useToast(); showToast('success', 'Salvato.')` (varianti: success/error/info; azione opzionale `{label, onClick}` per l'undo).

## Idioma di stile: classi CSS globali + token

Niente utility framework: vocabolario di classi proprio (definito in `styles.css`) + custom properties. Le principali:

- **Bottoni**: `btn` (primario ember) · `btn ghost` (bordo) · `btn danger` · `btn sm` (compatto, combinabile: `btn sm ghost`).
- **Layout**: `card` (superficie con radius 14) · `row` (flex gap) · `panel-head`/`panel-title`/`panel-desc` (testata sezione — o usa il componente `PanelHead`).
- **Testo**: `code` (IBM Plex Mono, uppercase, per codici/date/etichette tecniche: `DRP-001 · 18 LUG`) · `chip` (pill piccola).
- **Form**: label sopra input, mono uppercase; `fieldrow` per due campi affiancati — o meglio, usa `FormFields` che fa tutto.
- **Modal**: azioni sempre in fondo in `<div className="modal-actions">`.

Token chiave (tutti definiti in `styles.css`): colori `--void --bone --ember --ember-dim --amber --ok --muted --steel --line`; superfici `--solid-1 --solid-2 --surface --surface2 --glass-1 --glass-2` (+`--glass-blur --glass-border`); font `--font-b` (Space Grotesk, UI) `--font-m` (IBM Plex Mono, codici) `--font-title` (Chakra Petch, titoli gruppo) `--font-d` (Anton, numeri hero); raggi `--radius-sm`(8) `--radius-md`(14) `--radius-lg`(16) `--radius-pill`; timing `--dur`(350ms) `--dur-lux`(450ms) con `--ease-out`.

**Regola blur**: `backdrop-filter` solo su elementi persistenti e in numero fisso (header, modal, pannelli); MAI su elementi ripetuti in lista — lì fondo solido `var(--solid-1)` + `1px solid var(--line)`.

## Dove sta la verità

Leggi `styles.css` (e il suo import `_ds_bundle.css`) prima di inventare stili: quasi tutto ha già una classe. Le API dei componenti sono nei `.d.ts`, gli esempi nei `.prompt.md` di ciascun componente.

## Snippet idiomatico

```jsx
const { Modal, FormFields, PanelHead, OwnerBadge } = window.DaemonHQ
// pagina: testata + lista; creazione in un Modal con FormFields
<PanelHead title="Fornitori" desc="Vetting e lead time."
  actions={<button className="btn sm">+ Nuovo</button>} />
<div className="card">
  <div className="row">
    <span style={{ fontWeight: 600 }}>Atelier Nova SRL</span>
    <OwnerBadge owner="fornitori" />
    <span className="code">LEAD 21GG</span>
  </div>
</div>
<Modal title="Nuovo fornitore" onClose={chiudi}>
  <FormFields fields={campi} values={valori} onChange={aggiorna} />
  <div className="modal-actions">
    <button className="btn ghost" onClick={chiudi}>Annulla</button>
    <button className="btn" onClick={salva}>Salva</button>
  </div>
</Modal>
```
