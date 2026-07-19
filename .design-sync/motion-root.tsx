import { LazyMotion, domAnimation } from 'framer-motion'
import type { ReactNode } from 'react'

/** Radice delle animazioni Framer: i componenti animati del DS (ProgressRing)
 *  usano m.* e SENZA questo wrapper restano statici. Nell'app il ruolo è
 *  svolto da LazyMotion in App.tsx; qui è un export del bundle così anche i
 *  design costruiti con la libreria animano. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}
