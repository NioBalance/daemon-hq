import { Loading } from 'daemon-production-hq'
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

export function Standard() {
  return (
    <Canvas>
      <Loading />
    </Canvas>
  )
}

export function EtichettaCustom() {
  return (
    <Canvas>
      <Loading label="Carico i fornitori…" />
    </Canvas>
  )
}
