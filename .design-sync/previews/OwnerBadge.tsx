import { OwnerBadge } from 'daemon-production-hq'
import type { ReactNode } from 'react'

// Le card preview hanno fondo bianco: il DS è dark, ogni story porta il
// proprio canvas con i token del body dell'app.
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

export function TreRuoli() {
  return (
    <Canvas>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <OwnerBadge owner="design" />
        <OwnerBadge owner="logistica" />
        <OwnerBadge owner="fornitori" />
      </div>
    </Canvas>
  )
}

export function InContesto() {
  return (
    <Canvas>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>Hoodie Oversize «Inferno»</span>
        <OwnerBadge owner="design" />
        <span className="code">DRP-001 · 18 LUG</span>
      </div>
    </Canvas>
  )
}
