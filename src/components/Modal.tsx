import type { ReactNode } from 'react'

export default function Modal({
  title,
  onClose,
  wide,
  children,
}: {
  title: string
  onClose: () => void
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div
      className="modal-bg open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={wide ? 'modal wide' : 'modal'}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}
