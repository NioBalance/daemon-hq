import type { ReactNode } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { NAV_GROUPS, isEntryActive, type TabKey } from '../lib/tabs'
import { useNav } from '../lib/navigation'

function OverviewIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
    </svg>
  )
}
function ProductionIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 19l7-7-3-3-7 7-1.5 4.5z" />
      <line x1="14.5" y1="7.5" x2="16.5" y2="9.5" />
    </svg>
  )
}
function GestioneIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="16" y2="12" />
      <line x1="4" y1="17" x2="12" y2="17" />
    </svg>
  )
}
function LiveIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  )
}

const GROUP_ICONS: Record<string, () => ReactNode> = {
  production: ProductionIcon,
  gestione: GestioneIcon,
  live: LiveIcon,
}

/** Bottom-nav a 2 livelli: Overview diretta + 3 gruppi che aprono un
 *  bottom-sheet con le voci (max 2 tap per qualsiasi pagina). Lo sheet usa lo
 *  slot unico activeSheet ("nav:<gruppo>") condiviso col futuro widget-sheet
 *  della Fase 5: aprire uno chiude l'altro per costruzione. */
export default function MobileNav({ activeTab }: { activeTab: TabKey }) {
  const { goTab, goEntry, archTab, activeSheet, setActiveSheet } = useNav()
  const reduceMotion = useReducedMotion()
  const openGroup = NAV_GROUPS.find((g) => activeSheet === `nav:${g.id}`)

  return (
    <>
      <nav className="bottom-nav" aria-label="Navigazione">
        <button
          className={`bottom-nav-btn${activeTab === 'overview' ? ' active' : ''}`}
          onClick={() => goTab('overview')}
        >
          <OverviewIcon />
          <span>Overview</span>
        </button>
        {NAV_GROUPS.map((group) => {
          const Icon = GROUP_ICONS[group.id]
          const groupActive = group.entries.some((e) => isEntryActive(e, activeTab, archTab))
          const isOpen = activeSheet === `nav:${group.id}`
          return (
            <button
              key={group.id}
              className={`bottom-nav-btn${groupActive ? ' active' : ''}`}
              aria-expanded={isOpen}
              onClick={() => setActiveSheet(isOpen ? null : `nav:${group.id}`)}
            >
              <Icon />
              <span>{group.short}</span>
            </button>
          )
        })}
      </nav>

      <AnimatePresence>
        {openGroup && (
          <m.div
            key="sheet-bg"
            className="sheet-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            onClick={() => setActiveSheet(null)}
          />
        )}
        {openGroup && (
          <m.div
            key="sheet"
            className="sheet"
            role="dialog"
            aria-label={openGroup.title}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="sheet-handle" />
            <div className="sheet-title">{openGroup.title}</div>
            {openGroup.entries.map((entry) => (
              <button
                key={entry.id}
                className={`sheet-item${isEntryActive(entry, activeTab, archTab) ? ' active' : ''}`}
                onClick={() => goEntry(entry)}
              >
                {entry.label}
                {entry.soon && <span className="soon-pill">Soon</span>}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
