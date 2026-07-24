import { useId } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import { ComposedChart, Area, Line, BarChart, Bar, Cell, ResponsiveContainer } from 'recharts'

/** Anello di progresso SVG che si riempie al mount (pathLength via Framer). */
export function ProgressRing({
  value,
  size = 72,
  stroke = 5,
  label,
}: {
  /** 0..1 */
  value: number
  size?: number
  stroke?: number
  label?: string
}) {
  const reduceMotion = useReducedMotion()
  const r = (size - stroke) / 2
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface2)" strokeWidth={stroke} />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ember)"
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 5px rgba(226,56,42,.55))' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: clamped }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="ring-label">{label ?? `${Math.round(clamped * 100)}%`}</span>
    </div>
  )
}

/** Punto luminoso solo sull'ultimo campione: ancora il valore corrente sulla
 *  linea senza ripetere assi/tooltip — l'unico "dato" visibile sul disegno. */
function makeEndDot(color: string, lastIndex: number) {
  return function EndDot(props: { cx?: number; cy?: number; index?: number }) {
    const { cx, cy, index } = props
    if (index !== lastIndex || cx == null || cy == null) return <g />
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill={color}
        stroke="none"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    )
  }
}

/** Sparkline: linea con alone sfumato sotto e punto luminoso sull'ultimo
 *  valore, draw-in one-shot al mount (fermo con reduced-motion). Mono-serie:
 *  il colore identifica il grafico, il valore vive nel testo accanto. */
export function Sparkline({
  data,
  height = 40,
  color = 'var(--ember)',
}: {
  data: number[]
  height?: number
  color?: string
}) {
  const reduceMotion = useReducedMotion()
  const gradId = useId()
  if (data.length < 2) return <div className="spark-empty" style={{ height }} />
  const points = data.map((v, i) => ({ i, v }))
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 4, right: 3, bottom: 2, left: 3 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="none"
            fill={`url(#${gradId})`}
            isAnimationActive={!reduceMotion}
            animationDuration={1400}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            dot={makeEndDot(color, points.length - 1)}
            isAnimationActive={!reduceMotion}
            animationDuration={1400}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Mini bar chart senza assi rumorosi: ogni barra sfuma verso l'alto nel suo
 *  colore, grow-up al mount, fermo con reduced-motion. */
export function MiniBars({
  data,
  height = 44,
}: {
  data: { label: string; value: number; color?: string }[]
  height?: number
}) {
  const reduceMotion = useReducedMotion()
  const gradId = useId()
  const colors = [...new Set(data.map((d) => d.color ?? 'var(--ember)'))]
  const idFor = (c: string) => `${gradId}-${colors.indexOf(c)}`
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            {colors.map((c) => (
              <linearGradient key={c} id={idFor(c)} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={1} />
                <stop offset="100%" stopColor={c} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
          <Bar
            dataKey="value"
            radius={[4, 4, 1, 1]}
            isAnimationActive={!reduceMotion}
            animationDuration={600}
            animationEasing="ease-out"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={`url(#${idFor(d.color ?? 'var(--ember)')})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
