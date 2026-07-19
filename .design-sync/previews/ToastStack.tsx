import { useEffect } from 'react'
import { ToastProvider, ToastStack, useToast } from 'daemon-production-hq'
import type { ReactNode } from 'react'

// Il ToastStack è fixed in basso: sfondo app con altezza statica, e i toast
// vengono lanciati al mount con durata lunga così la cattura li vede.
function SfondoApp({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: 340,
        background: 'var(--void)',
        color: 'var(--bone)',
        fontFamily: 'var(--font-b)',
        fontSize: 15,
      }}
    >
      {children}
    </div>
  )
}

function LanciaToast() {
  const showToast = useToast()
  useEffect(() => {
    showToast('success', 'Fornitore salvato.', undefined, 60000)
    showToast('error', 'Upload non riuscito: file troppo grande.', undefined, 60000)
    showToast('info', 'File rimosso — 5 secondi per annullare.', { label: 'Annulla', onClick: () => {} }, 60000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

export function TreVarianti() {
  return (
    <SfondoApp>
      <ToastProvider>
        <LanciaToast />
        <ToastStack />
      </ToastProvider>
    </SfondoApp>
  )
}
