import type { ReactNode } from 'react'
import { NAV_TABS, type TabKey } from '../lib/tabs'

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
function MediaIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <polygon points="8,5 19,12 8,19" />
    </svg>
  )
}
function ChatsIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  )
}
function CalIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  )
}

export default function Header({
  activeTab,
  onTabChange,
  meName,
  onMeClick,
}: {
  activeTab: TabKey
  onTabChange: (t: TabKey) => void
  meName: string
  onMeClick: () => void
}) {
  const shortcuts: { key: TabKey; icon: ReactNode; title: string }[] = [
    { key: 'ai', icon: <AiIcon />, title: 'AI — strumenti e link' },
    { key: 'media', icon: <MediaIcon />, title: 'Media — foto, video, loghi' },
    { key: 'chats', icon: <ChatsIcon />, title: 'Chats — customer care' },
  ]

  return (
    <header>
      <div className="watermark">Æ</div>
      <div className="hdr-inner">
        <div className="hdr-top">
          <div>
            <div className="logo">
              D<span className="ae">Æ</span>MON
            </div>
            <div className="hdr-sub">Production HQ · Design → Sample → Drop</div>
          </div>
          <div className="row">
            <div className="hicons">
              {shortcuts.map((s) => (
                <button
                  key={s.key}
                  className={`hicon${activeTab === s.key ? ' active' : ''}`}
                  title={s.title}
                  onClick={() => onTabChange(s.key)}
                >
                  {s.icon}
                </button>
              ))}
            </div>
            <button className="mechip" onClick={onMeClick} title="Cambia utente">
              <span className="dot">●</span> <span>{meName || 'Chi sei?'}</span>
            </button>
            <span className="code">{todayLabel()}</span>
            <button
              className={`hicon${activeTab === 'cal' ? ' active' : ''}`}
              title="Calendario — planner team"
              onClick={() => onTabChange('cal')}
            >
              <CalIcon />
            </button>
          </div>
        </div>
      </div>
      <nav>
        {NAV_TABS.map((t) => (
          <button
            key={t.key}
            className={`tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => onTabChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
