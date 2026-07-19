import { Sparkline } from 'daemon-production-hq'
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

export function AndamentoKpi() {
  return (
    <Canvas>
      <div style={{ maxWidth: 260 }}>
        <div className="code" style={{ marginBottom: 6 }}>
          INSTAGRAM FOLLOWERS
        </div>
        <Sparkline data={[1180, 1220, 1240, 1310, 1298, 1380, 1442, 1490]} />
      </div>
    </Canvas>
  )
}

export function SerieCorta() {
  return (
    <Canvas>
      <div style={{ maxWidth: 260 }}>
        <Sparkline data={[12, 18]} height={32} />
      </div>
    </Canvas>
  )
}
