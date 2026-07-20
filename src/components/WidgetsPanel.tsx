import { useEffect, useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useNav } from '../lib/navigation'
import { useAuth } from '../auth/useAuth'
import { useActivity, markActivitySeen, type ActivityRow } from '../features/activity/queries'
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

/** Card Notifiche (handoff §7): righe con dot ember, testo e tempo mono. */
function NotificheCard({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { data: activity } = useActivity()
  const latest = (activity ?? []).slice(0, 8)

  return (
    <section className="fw-card" aria-label="Notifiche">
      <div className="fw-head">
        <span className="fw-title">Notifiche</span>
        <span className="fw-count">{latest.length}</span>
      </div>
      {latest.length ? (
        latest.map((a: ActivityRow) => {
          const clickable = !!a.tab
          return (
            <div
              key={a.id}
              className={`fwn-row${clickable ? ' clickable' : ''}`}
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
              <span className="fwn-dot" aria-hidden />
              <span className="fwn-txt">
                <strong>{a.author_name}</strong> {a.azione} {a.oggetto}
              </span>
              <span className="fwn-time">{timeAgo(a.created_at)}</span>
            </div>
          )
        })
      ) : (
        <p className="fw-empty">Nessuna attività ancora — comparirà qui man mano che il team lavora.</p>
      )}
    </section>
  )
}

/** Card Note per il team (handoff §7): pin ◆ amber + nota rapida underline. */
function NoteCard({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { profile } = useAuth()
  const { data: memos } = useMemos()
  const createMemo = useCreateMemo()
  const showToast = useToast()
  const [quickNote, setQuickNote] = useState('')
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

  return (
    <section className="fw-card" aria-label="Note per il team">
      <div className="fw-head">
        <span className="fw-title">Note per il team</span>
      </div>
      {pinned.length ? (
        pinned.map((memo) => (
          <div
            className="fwm-row"
            key={memo.id}
            onClick={() => onNavigate('notes')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onNavigate('notes')
              }
            }}
          >
            <span className="fwm-pin" aria-hidden>
              ◆
            </span>
            <span className="fwm-body">
              <span className="fwm-txt">{memo.testo}</span>
              <span className="fwm-meta">
                {memo.author_name} · {timeAgo(memo.created_at)}
              </span>
            </span>
          </div>
        ))
      ) : (
        <p className="fw-empty">Nessuna nota pinnata.</p>
      )}
      <div className="fw-add">
        <input
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          placeholder="Nota rapida…"
          aria-label="Nota rapida per il team"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleQuickAdd()
          }}
        />
        <button onClick={handleQuickAdd} disabled={createMemo.isPending} aria-label="Aggiungi nota">
          +
        </button>
      </div>
    </section>
  )
}

/** Widget flottanti persistenti (handoff §7): le UNICHE due card glass del
 *  cockpit. ≥1280px docked in alto a destra (il main riserva il padding);
 *  1200-1279px overlay sopra il contenuto; <1200px bottom-sheet «Team»
 *  sullo slot unico activeSheet. Toggle dalla campanella in top-nav. */
export default function WidgetsPanel() {
  const { profile } = useAuth()
  const { goTab, activeSheet, setActiveSheet, widgetsOpen } = useNav()
  const reduceMotion = useReducedMotion()

  const sheetOpen = activeSheet === 'widgets'

  useEffect(() => {
    if ((sheetOpen || widgetsOpen) && profile) markActivitySeen(profile.id)
  }, [sheetOpen, widgetsOpen, profile])

  return (
    <>
      {/* Desktop: stack flottante docked/overlay */}
      {widgetsOpen && (
        <aside className="fw-stack" aria-label="Widget team">
          <NotificheCard onNavigate={goTab} />
          <NoteCard onNavigate={goTab} />
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
              <NotificheCard onNavigate={goTab} />
              <NoteCard onNavigate={goTab} />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
