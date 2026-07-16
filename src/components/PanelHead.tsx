import type { ReactNode } from 'react'

export default function PanelHead({
  title,
  desc,
  actions,
}: {
  title: string
  desc?: string
  actions?: ReactNode
}) {
  return (
    <div className="panel-head">
      <div>
        <div className="panel-title">{title}</div>
        {desc && <div className="panel-desc">{desc}</div>}
      </div>
      {actions}
    </div>
  )
}
