import Modal from './Modal'
import { ALL_NAV_ENTRIES } from '../lib/tabs'

export default function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Scorciatoie tastiera" onClose={onClose}>
      <div className="shortcut-row">
        <span>Cerca / vai a (command palette)</span>
        <span>
          <span className="kbd">Ctrl</span> <span className="kbd">K</span>
        </span>
      </div>
      <div className="shortcut-row">
        <span>Nuovo elemento (contestuale alla pagina attiva)</span>
        <span className="kbd">N</span>
      </div>
      <div className="shortcut-row">
        <span>Questo pannello</span>
        <span className="kbd">?</span>
      </div>
      <p className="code" style={{ display: 'block', margin: '16px 0 6px' }}>
        NAVIGAZIONE — PREMI G POI LA LETTERA
      </p>
      {ALL_NAV_ENTRIES.map((entry) => (
        <div className="shortcut-row" key={entry.id}>
          <span>{entry.label}</span>
          <span>
            <span className="kbd">G</span> <span className="kbd">{entry.shortcut.toUpperCase()}</span>
          </span>
        </div>
      ))}
      <p className="palette-roadmap">
        La palette apre la scheda completa solo per gli articoli, per ora — l'apertura diretta per
        tutte le entità arriva con la Fase 6 (vedi TODO.md).
      </p>
    </Modal>
  )
}
