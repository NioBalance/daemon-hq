import { useEffect, useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useNav } from '../lib/navigation'
import { useAuth } from '../auth/useAuth'
import {
  useActivity,
  useUnseenActivity,
  markActivitySeen,
  type ActivityRow,
} from '../features/activity/queries'
import { useMemos, useCreateMemo } from '../features/memos/queries'
import { useToast } from '../lib/useToast'
import { timeAgo } from '../lib/format'
import type { TabKey } from '../lib/tabs'

export function BellIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
      <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
    </svg>
  )
}

/** Contenuto condiviso dei due widget (§7.1 + §7.2): notifiche ultimi change
 *  e note pinnate con aggiunta rapida. Usato dal pannello desktop e dallo
 *  sheet mobile. */
function WidgetsBody({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { profile } = useAuth()
  const { data: activity } = useActivity()
  const { data: memos } = useMemos()
  const createMemo = useCreateMemo()
  const showToast = useToast()
  const [quickNote, setQuickNote] = useState('')

  const latest = (activity ?? []).slice(0, 10)
  const pinned = (memos ?? []).filter((memo) => memo.pin)

  async function handleQuickAdd() {
    const testo = quickNote.trim()
    if (!testo || !profile) return
    try {
      await createMemo.mutateAsync({
        author_id: profile.id,
        author_name: profile.nome,
        testo,
        pin: true,
      })
      setQuickNote('')
      showToast('success', 'Nota pinnata sulla bacheca.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function activityRow(a: ActivityRow) {
    const clickable = !!a.tab
    return (
      <div
        key={a.id}
        className={`activity-row${clickable ? ' clickable' : ''}`}
        onClick={clickable ? () => onNavigate(a.tab as TabKey) : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onNavigate(a.tab as TabKey)
                }
              }
            : undefined
        }
      >
        <span className="activity-meta">
          <span className="activity-author">{a.author_name}</span>
          <span className="activity-time">{timeAgo(a.created_at)}</span>
        </span>
        <span className="activity-text">
          {a.azione} {a.oggetto}
        </span>
      </div>
    )
  }

  return (
    <>
      <p className="widgets-section-title">Notifiche — ultimi change</p>
      {latest.length ? (
        latest.map(activityRow)
      ) : (
        <p className="widgets-empty">
          Ancora nessuna attività registrata — comparirà qui man mano che il team lavora.
        </p>
      )}

      <p className="widgets-section-title" style={{ marginTop: 18 }}>
        Note per il team
      </p>
      {pinned.length ? (
        pinned.map((memo) => (
          <div className="widget-memo" key={memo.id} onClick={() => onNavigate('notes')} role="button" tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onNavigate('notes')
              }
            }}
          >
            <span className="activity-author">{memo.author_name}</span>
            <span className="widget-memo-text">{memo.testo}</span>
          </div>
        ))
      ) : (
        <p className="widgets-empty">Nessuna nota pinnata — pinna dalla bacheca o aggiungine una qui.</p>
      )}
      <div className="noteadd">
        <input
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          placeholder="Nota rapida per il team…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleQuickAdd()
          }}
        />
        <button className="btn sm" onClick={handleQuickAdd} disabled={createMemo.isPending}>
          +
        </button>
      </div>
    </>
  )
}

/** Widget persistenti (§7): pannello laterale destro collassabile su desktop,
 *  bottom-sheet su mobile agganciato allo slot unico activeSheet ("widgets"),
 *  lo stesso usato dagli sheet della nav — mai due sheet insieme. */
export default function WidgetsPanel() {
  const { profile } = useAuth()
  const { goTab, activeSheet, setActiveSheet } = useNav()
  const reduceMotion = useReducedMotion()
  const unseen = useUnseenActivity()
  const [open, setOpen] = useState(() => localStorage.getItem('daemon:widgets-open') === '1')

  function setOpenPersist(next: boolean) {
    setOpen(next)
    localStorage.setItem('daemon:widgets-open', next ? '1' : '0')
    if (next && profile) markActivitySeen(profile.id)
  }

  function navigateDesktop(tab: TabKey) {
    goTab(tab)
  }

  function navigateMobile(tab: TabKey) {
    goTab(tab) // goTab chiude anche lo sheet
  }

  const sheetOpen = activeSheet === 'widgets'

  useEffect(() => {
    if (sheetOpen && profile) markActivitySeen(profile.id)
  }, [sheetOpen, profile])

  return (
    <>
      {/* Desktop: rail collassata / pannello espanso */}
      {!open && (
        <button
          className="widgets-rail"
          onClick={() => setOpenPersist(true)}
          title="Notifiche e note del team"
          aria-label="Apri widget team"
        >
          <BellIcon />
          {unseen > 0 && <span className="widgets-badge">{unseen > 9 ? '9+' : unseen}</span>}
        </button>
      )}
      {open && (
        <aside className="widgets-panel" aria-label="Widget team">
          <div className="widgets-head">
            <span className="widgets-title">Team</span>
            <button className="toast-close" onClick={() => setOpenPersist(false)} aria-label="Chiudi pannello">
              ✕
            </button>
          </div>
          <div className="widgets-scroll">
            <WidgetsBody onNavigate={navigateDesktop} />
          </div>
        </aside>
      )}

      {/* Mobile: bottom-sheet sullo slot condiviso */}
      <AnimatePresence>
        {sheetOpen && (
          <m.div
            key="widgets-bg"
            className="sheet-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            onClick={() => setActiveSheet(null)}
          />
        )}
        {sheetOpen && (
          <m.div
            key="widgets-sheet"
            className="sheet"
            role="dialog"
            aria-label="Widget team"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="sheet-handle" />
            <div className="sheet-title">Team</div>
            <div className="widgets-sheet-scroll">
              <WidgetsBody onNavigate={navigateMobile} />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
