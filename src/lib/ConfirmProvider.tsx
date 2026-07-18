import { useCallback, useState, type ReactNode } from 'react'
import { ConfirmContext } from './confirm-context'
import { useToast } from './useToast'

interface PendingConfirm {
  message: string
  run: () => Promise<unknown> | unknown
  undoneLabel: string
}

const UNDO_WINDOW_MS = 5000

/** Sostituisce i confirm() nativi (§8): modal coerente col design system e,
 *  dopo la conferma, UNDO via toast — l'eliminazione reale parte solo allo
 *  scadere dei 5 secondi, "Annulla" la ferma del tutto. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const showToast = useToast()
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirmDelete = useCallback(
    (message: string, run: () => Promise<unknown> | unknown, undoneLabel = 'Eliminato') =>
      setPending({ message, run, undoneLabel }),
    [],
  )

  function onConfirm() {
    if (!pending) return
    const { run, undoneLabel } = pending
    setPending(null)
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      void (async () => {
        try {
          await run()
        } catch (err) {
          showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
        }
      })()
    }, UNDO_WINDOW_MS + 200)
    showToast(
      'info',
      `${undoneLabel} — 5 secondi per annullare.`,
      {
        label: 'Annulla',
        onClick: () => {
          cancelled = true
          window.clearTimeout(timer)
        },
      },
      UNDO_WINDOW_MS,
    )
  }

  return (
    <ConfirmContext.Provider value={{ confirmDelete }}>
      {children}
      {pending && (
        <div
          className="modal-bg open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPending(null)
          }}
        >
          <div className="modal" role="alertdialog" aria-label="Conferma eliminazione">
            <h3>Conferma eliminazione</h3>
            <p style={{ fontSize: 14 }}>{pending.message}</p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setPending(null)} autoFocus>
                Annulla
              </button>
              <button className="btn danger" onClick={onConfirm}>
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
