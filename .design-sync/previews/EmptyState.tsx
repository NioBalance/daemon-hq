import { EmptyState } from 'daemon-production-hq'
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

export function ConCta() {
  return (
    <Canvas>
      <EmptyState icon="box" text="Nessun articolo in questo drop." ctaLabel="+ Nuovo articolo" onCta={() => {}} />
    </Canvas>
  )
}

export function SoloTesto() {
  return (
    <Canvas>
      <EmptyState icon="note" text="Nessuna nota ancora — scrivi la prima." />
    </Canvas>
  )
}

export function IconeDisponibili() {
  return (
    <Canvas>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <EmptyState icon="star" text="Nessun design in pipeline." />
        <EmptyState icon="photo" text="Nessun media caricato." />
        <EmptyState icon="chat" text="Nessuna conversazione aperta." />
        <EmptyState icon="calendar" text="Nessun evento questo mese." />
      </div>
    </Canvas>
  )
}
