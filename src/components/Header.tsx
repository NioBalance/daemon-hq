import type { TabKey } from '../lib/tabs'
import NavGroups from './NavGroups'
import starLogo from '../assets/star-logo.png'

const todayLabel = () =>
  new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }).toUpperCase()

function AiIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  )
}

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
  return (
    <header>
      <button
        className="star-logo-wrap"
        onClick={() => onTabChange('overview')}
        title="Overview"
        aria-label="Vai a Overview"
      >
        <img src={starLogo} alt="" />
      </button>
      <div className="hdr-inner">
        <div className="hdr-top">
          <div>
            <div className="logo">
              D<span className="ae">Æ</span>MON
            </div>
            <div className="hdr-sub">TEAM DASHBOARD — HQ</div>
          </div>
          <div className="row">
            <div className="hicons">
              <button
                className={`hicon${activeTab === 'ai' ? ' active' : ''}`}
                title="AI — strumenti e link"
                onClick={() => onTabChange('ai')}
              >
                <AiIcon />
              </button>
              <button className="hicon" title="Cerca (Ctrl+K)" aria-label="Cerca" onClick={onSearchClick}>
                <SearchIcon />
              </button>
            </div>
            <button className="mechip" onClick={onMeClick} title="Cambia utente">
              <span className="dot">●</span> <span>{meName || 'Chi sei?'}</span>
            </button>
            <span className="code">{todayLabel()}</span>
          </div>
        </div>
      </div>
      <NavGroups activeTab={activeTab} />
    </header>
  )
}
