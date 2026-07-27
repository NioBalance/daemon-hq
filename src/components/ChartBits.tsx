import { m, useReducedMotion } from 'framer-motion'
import { LineChart, Line, BarChart, Bar, Cell, ResponsiveContainer } from 'recharts'

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

/** Sparkline v5 (spec §7.2, letterale): stroke 1.5px, nessun asse, nessun
 *  dot, nessuna area. Mono-serie: il colore identifica il grafico, il valore
 *  vive nel testo accanto, mai sulla linea. Draw-in one-shot al mount. */
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
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={!reduceMotion}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Mini bar chart v5 (spec §7.2): barre piatte /85, radius top 4, larghezza
 *  max 28px, senza assi rumorosi; grow-up al mount, fermo con reduced-motion. */
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
        <BarChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }} barCategoryGap="32%">
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={!reduceMotion}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? 'var(--ember)'} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
