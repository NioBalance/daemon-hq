import { ShortcutsPanel } from 'daemon-production-hq'
import type { ReactNode } from 'react'

// È un Modal già composto (overlay fixed): serve uno sfondo app con altezza
// statica, altrimenti il documento resta a 0px e la cattura ritaglia.
function SfondoApp({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: 560,
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

export function PannelloScorciatoie() {
  return (
    <SfondoApp>
      <ShortcutsPanel onClose={() => {}} />
    </SfondoApp>
  )
}
