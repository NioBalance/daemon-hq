import { useEffect, useRef, type ReactNode } from 'react'

// Stack dei drawer aperti: Escape chiude solo quello più in alto (stesso
// pattern del Modal legacy, stack separato — i due tipi non si annidano
// nei siti di adozione attuali).
const drawerStack: symbol[] = []

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** Drawer v5 (spec §6.8): pannello glass-elevated che scorre da destra,
 *  420px (sm) / 480px (lg), full-screen sotto i 640. Header sticky con
 *  titolo + X. Stessa a11y del Modal: focus trap, Escape, ritorno focus. */
export default function Drawer({
  title,
  onClose,
  size = 'sm',
  children,
}: {
  title: string
  onClose: () => void
  size?: 'sm' | 'lg'
  children: ReactNode
}) {
  const boxRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const token = Symbol('drawer')
    drawerStack.push(token)
    const previouslyFocused = document.activeElement as HTMLElement | null
    const box = boxRef.current

    const focusables = () =>
      box ? Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute('disabled')) : []

    ;(focusables()[0] ?? box)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (drawerStack[drawerStack.length - 1] !== token) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab') {
        const list = focusables()
        if (!list.length) return
        const first = list[0]
        const last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const i = drawerStack.indexOf(token)
      if (i !== -1) drawerStack.splice(i, 1)
      previouslyFocused?.focus()
    }
  }, [])

  return (
    <div
      className="drawer-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside
        className={`drawer glass-elevated${size === 'lg' ? ' lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={boxRef}
        tabIndex={-1}
      >
        <header className="drawer-head">
          <h3 className="text-card-title">{title}</h3>
          <button className="drawer-x" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  )
}
