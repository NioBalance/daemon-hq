import { useEffect, useRef, useState } from 'react'

/** True la prima volta che l'elemento entra in viewport (poi resta true):
 *  usato per rimandare lavori costosi (render PDF) finché non servono. */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(() => !('IntersectionObserver' in window))

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          obs.disconnect()
        }
      },
      { rootMargin: '120px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [inView])

  return { ref, inView }
}
