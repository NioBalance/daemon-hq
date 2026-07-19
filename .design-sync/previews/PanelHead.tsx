import { PanelHead } from 'daemon-production-hq'
import type { ReactNode } from 'react'

function Canvas({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--void)',
        color: 'var(--bone)',
        fontFamily: 'var(--font-b)',
        fontSize: 15,
        lineHeight: 1.5,
        padding: 20,
        borderRadius: 14,
      }}
    >
      {children}
    </div>
  )
}

export function ConAzione() {
  return (
    <Canvas>
      <PanelHead
        title="Fornitori"
        desc="Vetting, contatti e lead time dei laboratori."
        actions={<button className="btn sm">+ Nuovo fornitore</button>}
      />
    </Canvas>
  )
}

export function SoloTitolo() {
  return (
    <Canvas>
      <PanelHead title="Timeline" />
    </Canvas>
  )
}

export function AzioniMultiple() {
  return (
    <Canvas>
      <PanelHead
        title="Media Studio"
        desc="Foto prodotto, video e loghi del brand."
        actions={
          <div className="row">
            <button className="btn sm ghost">Filtra</button>
            <button className="btn sm">+ Carica</button>
          </div>
        }
      />
    </Canvas>
  )
}
