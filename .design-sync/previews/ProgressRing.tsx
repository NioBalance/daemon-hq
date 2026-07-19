import { ProgressRing, MotionRoot } from 'daemon-production-hq'
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

export function AvanzamentoFasi() {
  return (
    <Canvas><MotionRoot>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <ProgressRing value={0.15} />
        <ProgressRing value={0.55} />
        <ProgressRing value={1} />
      </div>
    </MotionRoot></Canvas>
  )
}

export function ConEtichetta() {
  return (
    <Canvas><MotionRoot>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <ProgressRing value={0.71} size={96} stroke={6} label="5/7" />
        <ProgressRing value={0.3} size={56} stroke={4} />
      </div>
    </MotionRoot></Canvas>
  )
}
