import { useRef } from 'react'
import { NAV_GROUPS, isEntryActive, type TabKey } from '../lib/tabs'
import { useNav } from '../lib/navigation'
import { useProximity } from '../lib/useProximity'

export default function NavGroups({ activeTab }: { activeTab: TabKey }) {
  const { goEntry, archTab } = useNav()
  const navRef = useRef<HTMLElement | null>(null)
  useProximity(navRef)

  return (
    <nav className="nav-groups" ref={navRef} aria-label="Sezioni">
      {NAV_GROUPS.map((group) => (
        <div className="nav-group" key={group.id} data-prox>
          <div className="nav-group-title">{group.title}</div>
          <div className="nav-group-items">
            {group.entries.map((entry) => (
              <button
                key={entry.id}
                className={`nav-item${isEntryActive(entry, activeTab, archTab) ? ' active' : ''}`}
                onClick={() => goEntry(entry)}
              >
                {entry.label}
                {entry.soon && <span className="soon-pill">Soon</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
