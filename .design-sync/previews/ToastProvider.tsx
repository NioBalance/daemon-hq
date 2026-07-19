import { useEffect } from 'react'
import { ToastProvider, ToastStack, useToast } from 'daemon-production-hq'
import type { ReactNode } from 'react'

function SfondoApp({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: 300,
        background: 'var(--void)',
        color: 'var(--bone)',
        fontFamily: 'var(--font-b)',
        fontSize: 15,
        padding: 20,
      }}
    >
      {children}
    </div>
  )
}

function ContenutoApp() {
  const showToast = useToast()
  useEffect(() => {
    showToast('success', 'Bozza ripristinata.', undefined, 60000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div>
      <p style={{ marginBottom: 10 }}>
        Il provider avvolge l'app: qualunque componente dentro può chiamare <span className="code">useToast()</span>.
      </p>
      <button className="btn sm" onClick={() => showToast('info', 'Notifica di esempio.')}>
        Mostra toast
      </button>
    </div>
  )
}

export function CablaggioCompleto() {
  return (
    <SfondoApp>
      <ToastProvider>
        <ContenutoApp />
        <ToastStack />
      </ToastProvider>
    </SfondoApp>
  )
}
