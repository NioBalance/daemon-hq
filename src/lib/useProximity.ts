import { useEffect, type RefObject } from 'react'

const FAR = 300
const NEAR = 70

/** Scrive la custom property --prox (0..1) su ogni figlio [data-prox] in base
 *  alla distanza del cursore dal suo centro; il CSS la usa per scala e
 *  luminosità graduali (effetto proximity della nav). Attivo solo con
 *  puntatore fine e senza prefers-reduced-motion; throttled via rAF. */
export function useProximity(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const finePointer = window.matchMedia('(pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let x = 0
    let y = 0
    let listening = false

    const groups = () => Array.from(root.querySelectorAll<HTMLElement>('[data-prox]'))

    const update = () => {
      raf = 0
      for (const g of groups()) {
        const r = g.getBoundingClientRect()
        const dist = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2))
        const p = Math.max(0, Math.min(1, 1 - (dist - NEAR) / (FAR - NEAR)))
        g.style.setProperty('--prox', p.toFixed(3))
      }
    }
    const onMove = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      if (!raf) raf = requestAnimationFrame(update)
    }
    const reset = () => {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
      for (const g of groups()) g.style.setProperty('--prox', '0')
    }
    const sync = () => {
      const enabled = finePointer.matches && !reducedMotion.matches
      if (enabled && !listening) {
        window.addEventListener('mousemove', onMove)
        document.documentElement.addEventListener('mouseleave', reset)
        listening = true
      } else if (!enabled && listening) {
        window.removeEventListener('mousemove', onMove)
        document.documentElement.removeEventListener('mouseleave', reset)
        listening = false
        reset()
      }
    }
    sync()
    finePointer.addEventListener('change', sync)
    reducedMotion.addEventListener('change', sync)
    return () => {
      finePointer.removeEventListener('change', sync)
      reducedMotion.removeEventListener('change', sync)
      if (listening) {
        window.removeEventListener('mousemove', onMove)
        document.documentElement.removeEventListener('mouseleave', reset)
      }
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ref])
}
