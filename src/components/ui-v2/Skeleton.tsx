import type { CSSProperties } from 'react'

/** Skeleton v5 (spec §6.12): shimmer 1.6s su surface-2, SOLO su KPI, righe
 *  tabella e card kanban. Mai spinner full-page: la shell renderizza sempre. */
export default function Skeleton({
  width,
  height = 14,
  radius,
  style,
}: {
  width?: number | string
  height?: number | string
  radius?: number | string
  style?: CSSProperties
}) {
  return <div className="skeleton" aria-hidden style={{ width, height, borderRadius: radius, ...style }} />
}
