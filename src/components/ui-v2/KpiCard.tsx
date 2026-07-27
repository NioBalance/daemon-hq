import type { ReactNode } from 'react'

/** Card KPI v5 (spec §6.4): label uppercase, valore mono tabulare, riga
 *  target/delta in grigio (il colore entra solo se il KPI è sotto target,
 *  regola §2.4 — lo decide il chiamante via `meta`), CTA obbligatoria.
 *  "Ogni numero è una porta": la card intera è cliccabile.
 *  Micro-progressbar 3px SOLO se esiste un target (`progress` 0..1). */
export default function KpiCard({
  label,
  value,
  meta,
  ctaLabel,
  onOpen,
  icon,
  hero = false,
  progress,
}: {
  label: string
  value: ReactNode
  /** riga sotto il numero: "€13,5k target · ↗ 4% v. sett." (usa formatDelta) */
  meta?: ReactNode
  ctaLabel: string
  onOpen: () => void
  /** icona 16px opzionale a destra della label */
  icon?: ReactNode
  /** KPI hero Overview: scala 40px invece di 28px (conta nel budget glow) */
  hero?: boolean
  /** 0..1 — SOLO se esiste un target */
  progress?: number
}) {
  return (
    <button type="button" className={`kpi-card glass-surface${hero ? ' hero' : ''}`} onClick={onOpen}>
      <span className="kpi-card-head">
        <span className="text-nav-label kpi-card-label">{label}</span>
        {icon && <span className="kpi-card-icon">{icon}</span>}
      </span>
      <span className={hero ? 'text-kpi-xl' : 'text-kpi'}>{value}</span>
      {meta && <span className="text-caption kpi-card-meta">{meta}</span>}
      {progress != null && (
        <span className="kpi-card-bar" aria-hidden>
          <i style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </span>
      )}
      <span className="kpi-card-cta">{ctaLabel} ›</span>
    </button>
  )
}
