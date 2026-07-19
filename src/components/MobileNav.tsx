import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { NAV_GROUPS, UTILITY_ENTRIES, ALL_NAV_ENTRIES, isEntryActive, type TabKey } from '../lib/tabs'
import { useNav } from '../lib/navigation'
import { BellIcon } from './WidgetsPanel'
import { useUnseenActivity } from '../features/activity/queries'
import { ICONS } from './navIcons'

// Voci dirette della bottom-nav v4 (spec §2 mobile): le 4 più usate.
const DIRECT_IDS = ['overview', 'oggi', 'dropx', 'media'] as const

/** Bottom-nav v4: 4 voci dirette + Menu (tutti i 5 gruppi + utility, che su
 *  mobile non hanno né sidebar né tastiera) + Team. Max 2 tap ovunque. Lo
 *  sheet usa lo slot unico activeSheet: aprirne uno chiude l'altro. */
export default function MobileNav({ activeTab }: { activeTab: TabKey }) {
  const { goEntry, archTab, activeSheet, setActiveSheet } = useNav()
  const reduceMotion = useReducedMotion()
  const unseen = useUnseenActivity()
  const direct = DIRECT_IDS.map((id) => ALL_NAV_ENTRIES.find((e) => e.id === id)!).filter(Boolean)
  const menuOpen = activeSheet === 'nav:menu'

  return (
    <>
      <nav className="bottom-nav" aria-label="Navigazione">
        {direct.map((entry) => (
          <button
            key={entry.id}
            className={`bottom-nav-btn${isEntryActive(entry, activeTab, archTab) ? ' active' : ''}`}
            onClick={() => goEntry(entry)}
          >
            {ICONS[entry.id]}
            <span>{entry.label === 'Media Studio' ? 'Media' : entry.label}</span>
          </button>
        ))}
        <button
          className={`bottom-nav-btn${menuOpen ? ' active' : ''}`}
          aria-expanded={menuOpen}
          onClick={() => setActiveSheet(menuOpen ? null : 'nav:menu')}
        >
          {ICONS.menu}
          <span>Menu</span>
        </button>
        <button
          className={`bottom-nav-btn${activeSheet === 'widgets' ? ' active' : ''}`}
          aria-expanded={activeSheet === 'widgets'}
          onClick={() => setActiveSheet(activeSheet === 'widgets' ? null : 'widgets')}
          style={{ position: 'relative' }}
        >
          <BellIcon />
          <span>Team</span>
          {unseen > 0 && <span className="widgets-badge">{unseen > 9 ? '9+' : unseen}</span>}
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
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
        {menuOpen && (
          <m.div
            key="sheet"
            className="sheet"
            role="dialog"
            aria-label="Menu"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="sheet-handle" />
            {NAV_GROUPS.map((group) => (
              <div key={group.id} className="sheet-group">
                <div className="sheet-title">{group.title}</div>
                {group.entries.map((entry) => (
                  <button
                    key={entry.id}
                    className={`sheet-item${isEntryActive(entry, activeTab, archTab) ? ' active' : ''}`}
                    onClick={() => goEntry(entry)}
                  >
                    {entry.label}
                    {entry.soon && <span className="soon-pill">Soon</span>}
                  </button>
                ))}
              </div>
            ))}
            <div className="sheet-group">
              <div className="sheet-title">Utility</div>
              {UTILITY_ENTRIES.map((entry) => (
                <button
                  key={entry.id}
                  className={`sheet-item${isEntryActive(entry, activeTab, archTab) ? ' active' : ''}`}
                  onClick={() => goEntry(entry)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
