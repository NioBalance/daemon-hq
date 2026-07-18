import type { ReactNode } from 'react'

const ICONS: Record<string, ReactNode> = {
  box: (
    <svg viewBox="0 0 24 24">
      <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
      <path d="M3 8l9 5 9-5" />
      <line x1="12" y1="13" x2="12" y2="21" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24">
      <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
    </svg>
  ),
  photo: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M3 17l5-5 4 4 3-3 6 6" />
    </svg>
  ),
  note: (
    <svg viewBox="0 0 24 24">
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4" />
      <line x1="9" y1="12" x2="16" y2="12" />
      <line x1="9" y1="16" x2="14" y2="16" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24">
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  ),
}

/** Empty state illustrato (§2.4): icona line-art + una riga di testo + CTA. */
export default function EmptyState({
  icon = 'box',
  text,
  ctaLabel,
  onCta,
}: {
  icon?: string
  text: string
  ctaLabel?: string
  onCta?: () => void
}) {
  return (
    <div className="empty-state">
      <span aria-hidden>{ICONS[icon] ?? ICONS.box}</span>
      <p>{text}</p>
      {ctaLabel && onCta && (
        <button className="btn sm ghost" onClick={onCta}>
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
