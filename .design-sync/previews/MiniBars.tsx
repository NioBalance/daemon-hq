import { MiniBars } from 'daemon-production-hq'
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

export function QualitaCampioni() {
  return (
    <Canvas>
      <div style={{ maxWidth: 260 }}>
        <div className="code" style={{ marginBottom: 6 }}>
          QUALITÀ MEDIA CAMPIONI
        </div>
        <MiniBars
          data={[
            { label: 'Fit', value: 4.2 },
            { label: 'Tessuto', value: 3.8 },
            { label: 'Cuciture', value: 4.6 },
            { label: 'Colore', value: 4.0 },
          ]}
        />
      </div>
    </Canvas>
  )
}

export function ColoriPerBarra() {
  return (
    <Canvas>
      <div style={{ maxWidth: 260 }}>
        <MiniBars
          height={56}
          data={[
            { label: 'Bozza', value: 3, color: 'var(--steel)' },
            { label: 'Inviato', value: 5 },
            { label: 'Confermato', value: 2, color: '#7ee08a' },
          ]}
        />
      </div>
    </Canvas>
  )
}
