import { useRef, useState } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import { NAV_GROUPS, isEntryActive, type TabKey } from '../lib/tabs'
import { useNav } from '../lib/navigation'
import { useProximity } from '../lib/useProximity'
import { useAuth } from '../auth/useAuth'
import { useSamples } from '../features/samples/queries'
import { useTechpacks } from '../features/techpacks/queries'
import { ICONS } from './navIcons'

const COLLAPSE_KEY = 'dhq:sidebar-collapsed'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden style={{ transform: open ? undefined : 'rotate(180deg)' }}>
      <path d="M14.5 6.5L9 12l5.5 5.5" />
    </svg>
  )
}

/** Sidebar operativa v4 (spec §2, handoff §1): sticky full-height, 5 gruppi,
 *  collassabile a rail di icone. Voce attiva = tick ember + icona in glow,
 *  nessun riempimento. I badge contano solo dati veri (campioni in review,
 *  tech pack inviati in attesa del fornitore). */
export default function Sidebar({ activeTab }: { activeTab: TabKey }) {
  const { goEntry, archTab } = useNav()
  const { profile } = useAuth()
  const reduceMotion = useReducedMotion()
  const navRef = useRef<HTMLElement | null>(null)
  useProximity(navRef)

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      return !c
    })
  }

  const samplesQ = useSamples()
  const techpacksQ = useTechpacks()
  const badges: Record<string, number> = {
    samples: (samplesQ.data ?? []).filter((s) => s.verdetto === 'in-review').length,
    techpack: (techpacksQ.data ?? []).filter((t) => t.stato === 'inviato').length,
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sb-head">
        {collapsed ? (
          <button className="sb-brand mono" onClick={toggle} title="Espandi menu" aria-label="Espandi menu">
            D<span className="ae">Æ</span>
          </button>
        ) : (
          <>
            <div>
              <div className="sb-brand">
                D<span className="ae">Æ</span>MON
              </div>
              <div className="sb-sub">DASHBOARD</div>
            </div>
            <button className="sb-collapse" onClick={toggle} title="Riduci menu" aria-label="Riduci menu">
              <ChevronIcon open />
            </button>
          </>
        )}
      </div>

      <nav className="sb-nav" ref={navRef} aria-label="Sezioni">
        {NAV_GROUPS.map((group) => (
          <div className="sb-group" key={group.id}>
            {!collapsed && <div className="sb-eyebrow">{group.title}</div>}
            {/* Spider-line riusata (spec §2): il connettore si disegna dal
                titolo verso le voci quando il gruppo (ri)appare espanso. */}
            {!collapsed && !reduceMotion && (
              <svg className="sb-spider" viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden>
                <m.line
                  x1="1"
                  y1="0"
                  x2="1"
                  y2="100"
                  stroke="var(--ember)"
                  strokeOpacity="0.28"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
            )}
            <ul>
              {group.entries.map((entry) => {
                const active = isEntryActive(entry, activeTab, archTab)
                const badge = badges[entry.id]
                return (
                  <li key={entry.id}>
                    <button
                      className={`sb-item${active ? ' active' : ''}`}
                      data-prox
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? entry.label : undefined}
                      onClick={() => goEntry(entry)}
                    >
                      <span className="sb-icon">{ICONS[entry.id]}</span>
                      {!collapsed && <span className="sb-label">{entry.label}</span>}
                      {!collapsed && entry.soon && <span className="soon-pill">Soon</span>}
                      {!collapsed && !entry.soon && badge > 0 && <span className="sb-badge">{badge}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="sb-foot">
          <span className="sb-avatar">{(profile?.nome || '?').slice(0, 1).toUpperCase()}</span>
          <span className="sb-foot-name">{profile?.nome || '—'}</span>
          <span className="sb-foot-sync">
            <span className="sb-foot-dot" aria-hidden /> sync
          </span>
        </div>
      )}
    </aside>
  )
}
