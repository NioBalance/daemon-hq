import type { ReactNode } from 'react'
import type { BadgeTone } from './badge-tones'

/** Badge/chip v5 unificato (spec §6.3): radius 6, niente pill.
 *  - status: bordo {colore}/40, testo {colore}-fg, fondo trasparente
 *  - meta: bordo neutro, testo foreground (contatori, owner, Tot: 15)
 *  - event: fondo {colore}/10 senza bordo, icona 12px (scadenze, drop date)
 *  - severity: come status ma UPPERCASE mono micro (Registro Errori)
 *  Ordine su card: status → event → meta. Max 3 visibili + "+n".
 *  La mappa stato→tono vive in badge-tones.ts (statusTone). */
export type BadgeKind = 'status' | 'meta' | 'event' | 'severity'

export default function Badge({
  kind = 'meta',
  tone = 'steel',
  icon,
  children,
}: {
  kind?: BadgeKind
  tone?: BadgeTone
  /** icona 12px, pensata per kind="event" */
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <span className={`badge2 badge2-${kind} tone-${tone}`}>
      {icon}
      {children}
    </span>
  )
}
