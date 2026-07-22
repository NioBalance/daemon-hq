import { useState } from 'react'
import type { TabKey } from '../lib/tabs'
import { UTILITY_ENTRIES } from '../lib/tabs'
import { useNav } from '../lib/navigation'
import { ICONS } from './navIcons'
import { BellIcon } from './WidgetsPanel'
import { useUnseenActivity } from '../features/activity/queries'
import { useTheme } from '../lib/useTheme'
import starLogo from '../assets/star-logo.png'
import starLogoLight from '../assets/daemon-star-blue.png'

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
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
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
  const { goEntry, archTab, widgetsOpen, setWidgetsOpen, setActiveSheet } = useNav()
  const { theme, toggleTheme } = useTheme()
  // Impulso "notare le icone" a ogni nuovo accesso (una volta per sessione,
  // non a ogni navigazione interna): sessionStorage, non localStorage.
  const [notice] = useState(() => {
    if (sessionStorage.getItem('dhq:icons-seen')) return false
    sessionStorage.setItem('dhq:icons-seen', '1')
    return true
  })
  const unseen = useUnseenActivity()
  const cal = UTILITY_ENTRIES.find((e) => e.id === 'cal')!
  const links = UTILITY_ENTRIES.find((e) => e.id === 'links')!

  function toggleWidgets() {
    // Sotto il breakpoint della bottom-nav i widget vivono nello sheet Team.
    if (window.matchMedia('(max-width: 1199px)').matches) {
      setActiveSheet('widgets')
    } else {
      setWidgetsOpen(!widgetsOpen)
    }
  }

  return (
    <header className="topnav">
      <button
        className="star-logo-wrap"
        onClick={() => onTabChange('overview')}
        title="Overview"
        aria-label="Vai a Overview"
      >
        <img src={theme === 'light' ? starLogoLight : starLogo} alt="" />
      </button>
      <div className={`tn-right${notice ? ' notice' : ''}`}>
        <button
          className="hicon"
          title={theme === 'light' ? 'Passa al tema scuro' : 'Passa al tema chiaro'}
          aria-label={theme === 'light' ? 'Passa al tema scuro' : 'Passa al tema chiaro'}
          onClick={toggleTheme}
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
        <button
          className={`hicon${widgetsOpen ? ' active' : ''}`}
          title="Notifiche e note del team"
          aria-label="Notifiche e note del team"
          onClick={toggleWidgets}
          style={{ position: 'relative' }}
        >
          <BellIcon />
          {unseen > 0 && <span className="widgets-badge">{unseen > 9 ? '9+' : unseen}</span>}
        </button>
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
