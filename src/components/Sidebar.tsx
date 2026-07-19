import { useRef, useState, type ReactNode } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import { NAV_GROUPS, isEntryActive, type TabKey } from '../lib/tabs'
import { useNav } from '../lib/navigation'
import { useProximity } from '../lib/useProximity'
import { useAuth } from '../auth/useAuth'
import { useSamples } from '../features/samples/queries'
import { useTechpacks } from '../features/techpacks/queries'

const COLLAPSE_KEY = 'dhq:sidebar-collapsed'

/* Icone line-art 17px, stroke 1.5, nessun riempimento (handoff §Assets). */
const I = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)
const ICONS: Record<string, ReactNode> = {
  overview: I(<><circle cx="12" cy="12" r="8.5" /><path d="M12 12l3.5-3.5" /><path d="M12 6.5v1" /><path d="M17.5 12h-1" /><path d="M6.5 12h1" /></>),
  oggi: I(<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="M9 15l2 2 4-4" /></>),
  dropx: I(<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" /></>),
  chats: I(<><path d="M20 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 14-5z" /></>),
  design: I(<><path d="M15.5 4.5l4 4L8 20l-5 1 1-5z" /><path d="M13 7l4 4" /></>),
  techpack: I(<><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 12h7M9 16h5" /></>),
  samples: I(<><path d="M12 3l2.1 5.6L20 10.7l-5.9 2.1L12 18.5l-2.1-5.7L4 10.7l5.9-2.1z" /></>),
  catalogo: I(<><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>),
  riunioni: I(<><circle cx="9" cy="8.5" r="2.5" /><circle cx="16" cy="9.5" r="2" /><path d="M4.5 19c.5-3 2.5-4.5 4.5-4.5s4 1.5 4.5 4.5" /><path d="M15 15.5c1.8.2 3.2 1.4 3.7 3.5" /></>),
  contratti: I(<><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 14c1-1.4 2 .8 3-.6s2 .8 3-.6" /></>),
  notes: I(<><path d="M5 4h14v13l-4 4H5z" /><path d="M15 21v-4h4" /><path d="M9 9h6M9 13h4" /></>),
  timeline: I(<><path d="M4 6h9M4 12h13M4 18h7" /><circle cx="16.5" cy="6" r="1.5" /><circle cx="20.5" cy="12" r="1.5" /><circle cx="14.5" cy="18" r="1.5" /></>),
  fornitori: I(<><path d="M3 20V9l5 3V9l5 3V6h8v14z" /><path d="M17 10v.5M17 14v.5" /></>),
  media: I(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M3 17l5-5 4 4 3-3 6 6" /></>),
  publish: I(<><path d="M20 4L4 11l6 2.5L12.5 20 16 12z" /><path d="M20 4l-9.5 9.5" /></>),
}

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
