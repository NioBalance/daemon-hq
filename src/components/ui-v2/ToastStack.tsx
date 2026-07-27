import { useContext } from 'react'
import { ToastContext } from '../../lib/toast-context'

const ICON: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ' }

/** Toast v5 (spec §6.10): glass-elevated, barra sinistra 3px semantica,
 *  bottom-right desktop / top mobile, max 3 in stack (limite nel provider).
 *  Il verbo del bottone = il verbo del toast ("Pubblica" → "Pubblicato"). */
export default function ToastStack() {
  const ctx = useContext(ToastContext)
  if (!ctx || ctx.toasts.length === 0) return null

  return (
    <div className="toast2-stack">
      {ctx.toasts.map((t) => (
        <div className={`toast2 glass-elevated ${t.variant}`} key={t.id} role="status">
          <span className="toast2-icon" aria-hidden>
            {ICON[t.variant]}
          </span>
          <span className="toast2-msg">{t.message}</span>
          {t.action && (
            <button
              className="btn2 btn2-ghost btn2-sm"
              onClick={() => {
                t.action!.onClick()
                ctx.dismissToast(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="toast2-close" onClick={() => ctx.dismissToast(t.id)} aria-label="Chiudi notifica">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
