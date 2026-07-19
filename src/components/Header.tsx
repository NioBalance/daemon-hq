import type { TabKey } from '../lib/tabs'
import { UTILITY_ENTRIES } from '../lib/tabs'
import { useNav } from '../lib/navigation'
import { ICONS } from './navIcons'
import starLogo from '../assets/star-logo.png'

function AiIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  )
}

/** Top-nav v4 (handoff §2): 66px, glass leggero, hairline sotto, NIENTE
 *  wordmark (il brand vive in sidebar). Al centro la stella ember (home);
 *  a destra le utility trasversali: Calendario, Link, AI, ricerca, avatar. */
export default function Header({
  activeTab,
  onTabChange,
  meName,
  onMeClick,
  onSearchClick,
}: {
  activeTab: TabKey
  onTabChange: (t: TabKey) => void
  meName: string
  onMeClick: () => void
  onSearchClick: () => void
}) {
  const { goEntry, archTab } = useNav()
  const cal = UTILITY_ENTRIES.find((e) => e.id === 'cal')!
  const links = UTILITY_ENTRIES.find((e) => e.id === 'links')!

  return (
    <header className="topnav">
      <button
        className="star-logo-wrap"
        onClick={() => onTabChange('overview')}
        title="Overview"
        aria-label="Vai a Overview"
      >
        <img src={starLogo} alt="" />
      </button>
      <div className="tn-right">
        <button
          className={`hicon${activeTab === 'cal' ? ' active' : ''}`}
          title="Calendario (g poi e)"
          aria-label="Calendario"
          onClick={() => goEntry(cal)}
        >
          {ICONS.cal}
        </button>
        <button
          className={`hicon${activeTab === 'archivio' && archTab === 'links' ? ' active' : ''}`}
          title="Link del brand (g poi k)"
          aria-label="Link del brand"
          onClick={() => goEntry(links)}
        >
          {ICONS.links}
        </button>
        <button
          className={`hicon${activeTab === 'ai' ? ' active' : ''}`}
          title="AI — strumenti e link"
          aria-label="AI"
          onClick={() => onTabChange('ai')}
        >
          <AiIcon />
        </button>
        <button className="tn-search" onClick={onSearchClick} title="Cerca (Ctrl+K)">
          <SearchIcon />
          <span className="tn-search-label">Cerca ovunque</span>
          <span className="kbd">⌘K</span>
        </button>
        <button className="tn-avatar" onClick={onMeClick} title={`${meName || 'Profilo'} — cambia profilo`}>
          {(meName || '?').slice(0, 1).toUpperCase()}
          <span className="tn-avatar-dot" aria-hidden />
        </button>
      </div>
    </header>
  )
}
