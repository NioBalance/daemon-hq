import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)

/** Numero che sale da 0 al target al mount/cambio valore (rAF, ~500ms).
 *  Con prefers-reduced-motion mostra subito il target. */
export function useCountUp(target: number, duration = 500): number {
  const reduceMotion = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      setValue(target * easeOutCubic(p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(reduceMotion ? () => setValue(target) : tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduceMotion])

  return value
}
