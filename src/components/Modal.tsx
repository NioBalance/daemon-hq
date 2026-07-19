import { useEffect, useRef, type ReactNode } from 'react'

// Stack dei modal aperti: con modal annidati (es. cartella tech pack → nuovo
// link) Escape deve chiudere solo quello più in alto, non entrambi.
const modalStack: symbol[] = []

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function Modal({
  title,
  onClose,
  wide,
  role = 'dialog',
  children,
}: {
  title: string
  onClose: () => void
  wide?: boolean
  role?: 'dialog' | 'alertdialog'
  children: ReactNode
}) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const token = Symbol('modal')
    modalStack.push(token)
    const previouslyFocused = document.activeElement as HTMLElement | null
    const box = boxRef.current

    const focusables = () =>
      box
        ? Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => !el.hasAttribute('disabled'),
          )
        : []

    // Focus dentro il modal all'apertura (primo campo/bottone, o il box).
    ;(focusables()[0] ?? box)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return
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
      const i = modalStack.indexOf(token)
      if (i !== -1) modalStack.splice(i, 1)
      previouslyFocused?.focus()
    }
  }, [])

  return (
    <div
      className="modal-bg open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={wide ? 'modal wide' : 'modal'}
        role={role}
        aria-modal="true"
        aria-label={title}
        ref={boxRef}
        tabIndex={-1}
      >
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}
