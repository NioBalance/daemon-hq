import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastItem, type ToastVariant } from './toast-context'

const MAX_TOASTS = 3
const AUTO_DISMISS_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = crypto.randomUUID()
      setToasts((t) => {
        const next = [...t, { id, variant, message }]
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
      })
      const timer = window.setTimeout(() => dismissToast(id), AUTO_DISMISS_MS)
      timers.current.set(id, timer)
    },
    [dismissToast],
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>{children}</ToastContext.Provider>
  )
}
