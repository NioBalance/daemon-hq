import { m, useReducedMotion } from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'

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

/** Sparkline minimale: linea sottile senza assi, draw-in one-shot al mount
 *  (fermo con reduced-motion). Mono-serie: il colore identifica il grafico,
 *  il valore vive nel testo accanto, mai sulla linea. */
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
  if (data.length < 2) return <div className="spark-empty" style={{ height }} />
  const points = data.map((v, i) => ({ i, v }))
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={!reduceMotion}
            animationDuration={1400}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Radar dei 4 assi di valutazione campione (fit/tessuto/cuciture/colore),
 *  scala fissa 1-5. Draw-in al mount, fermo con reduced-motion. */
export function ScoreRadar({
  scores,
  size = 200,
}: {
  scores: { asse: string; valore: number }[]
  size?: number
}) {
  const reduceMotion = useReducedMotion()
  return (
    <div style={{ width: '100%', height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={scores} outerRadius="72%">
          <PolarGrid stroke="var(--line)" />
          <PolarAngleAxis
            dataKey="asse"
            tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'var(--font-m)' }}
          />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
          <Radar
            dataKey="valore"
            stroke="var(--ember)"
            fill="var(--ember)"
            fillOpacity={0.22}
            isAnimationActive={!reduceMotion}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Mini bar chart senza assi rumorosi (colori per barra opzionali),
 *  grow-up al mount, fermo con reduced-motion. */
export function MiniBars({
  data,
  height = 44,
}: {
  data: { label: string; value: number; color?: string }[]
  height?: number
}) {
  const reduceMotion = useReducedMotion()
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Bar
            dataKey="value"
            radius={[3, 3, 0, 0]}
            isAnimationActive={!reduceMotion}
            animationDuration={600}
            animationEasing="ease-out"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? 'var(--ember)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
