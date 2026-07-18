import { useContext } from 'react'
import { ToastContext } from '../lib/toast-context'

const ICON: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ' }

export default function ToastStack() {
  const ctx = useContext(ToastContext)
  if (!ctx || ctx.toasts.length === 0) return null

  return (
    <div className="toast-stack">
      {ctx.toasts.map((t) => (
        <div className={`toast ${t.variant}`} key={t.id} role="status">
          <span className="toast-icon">{ICON[t.variant]}</span>
          <span>{t.message}</span>
          {t.action && (
            <button
              className="btn sm ghost"
              onClick={() => {
                t.action!.onClick()
                ctx.dismissToast(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="toast-close" onClick={() => ctx.dismissToast(t.id)} aria-label="Chiudi notifica">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
