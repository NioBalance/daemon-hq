import { ErrorBoundary } from 'daemon-production-hq'
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

// Figlio che esplode a render: l'unico modo onesto di mostrare il fallback.
function Bomba(): ReactNode {
  throw new Error('fetch fallita: NetworkError when attempting to fetch resource')
}

export function FallbackDiZona() {
  return (
    <Canvas>
      <ErrorBoundary zona="questa sezione">
        <Bomba />
      </ErrorBoundary>
    </Canvas>
  )
}

export function ContenutoSano() {
  return (
    <Canvas>
      <ErrorBoundary zona="questa sezione">
        <p>Quando i figli non lanciano errori, il boundary è invisibile: renderizza i figli e basta.</p>
      </ErrorBoundary>
    </Canvas>
  )
}
