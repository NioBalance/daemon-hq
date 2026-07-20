import { useReducedMotion } from 'framer-motion'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Drop, DropFase } from '../features/drops/queries'
import { addDaysIso, daysBetween, fmtDate, todayIso } from '../lib/format'

/** Nome breve della fase: la parte prima del trattino ("Content Production —
 *  shooting…" → "Content Production"). La descrizione lunga resta nel tooltip. */
function shortName(nome: string): string {
  return nome.split(/\s[—-]\s/)[0].trim() || nome
}

interface GanttRow {
  label: string
  fullName: string
  offset: number
  span: number
  color: string
  start: string
  end: string
  done: boolean
  estimated: boolean
}

const EST_WINDOW = 60 // giorni pre-lancio su cui distribuire le fasi stimate

function faseColor(done: boolean, end: string, todayStr: string): string {
  if (done) return 'var(--ok)'
  if (end < todayStr) return 'var(--ember)'
  return 'var(--amber)'
}

function GanttTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: GanttRow }> }) {
  if (!active || !payload || !payload.length) return null
  const row = payload[payload.length - 1].payload
  return (
    <div className="gantt-tip">
      <div className="gantt-tip-t">{row.fullName}</div>
      <div className="gantt-tip-d">
        {fmtDate(row.start)} → {fmtDate(row.end)} · {row.done ? 'completata' : 'da fare'}
        {row.estimated ? ' · data stimata' : ''}
      </div>
    </div>
  )
}

/** Mini-Gantt di UN drop: ogni fase è una barra dal traguardo precedente al
 *  proprio. Le fasi senza data sono stimate a ritroso dalla data di lancio
 *  (o da oggi) e mostrate tratteggiate/sbiadite. "Oggi" marcato. Draw-in al
 *  mount, fermo con reduced-motion. */
export default function GanttChart({ drop, fasi }: { drop: Drop; fasi: DropFase[] }) {
  const reduceMotion = useReducedMotion()
  const todayStr = todayIso()

  const ordered = [...fasi].sort((a, b) => a.ordine - b.ordine)
  if (!ordered.length) return null

  // Data effettiva di ogni fase: reale, oppure stimata distribuendo le fasi su
  // EST_WINDOW giorni che terminano alla data di lancio (o oggi).
  const anchor = drop.data_lancio ?? todayStr
  const n = ordered.length
  const step = n > 1 ? EST_WINDOW / (n - 1) : 0
  const withDates = ordered.map((f, i) => {
    const est = addDaysIso(anchor, -Math.round((n - 1 - i) * step))
    return { f, date: f.data ?? est, estimated: !f.data }
  })

  const rows: GanttRow[] = withDates.map((it, i) => {
    const end = it.date
    const prev = i > 0 ? withDates[i - 1].date : addDaysIso(end, -Math.round(step) || -7)
    const start = prev < end ? prev : addDaysIso(end, -3)
    return {
      label: shortName(it.f.nome),
      fullName: it.f.nome,
      offset: 0,
      span: Math.max(1, daysBetween(start, end)),
      color: faseColor(it.f.done, end, todayStr),
      start,
      end,
      done: it.f.done,
      estimated: it.estimated,
    }
  })

  const min = rows.map((r) => r.start).reduce((a, b) => (a < b ? a : b))
  const max = rows.map((r) => r.end).reduce((a, b) => (a > b ? a : b))
  const total = Math.max(1, daysBetween(min, max))
  for (const r of rows) r.offset = daysBetween(min, r.start)
  const todayOffset = daysBetween(min, todayStr)
  const showToday = todayOffset >= 0 && todayOffset <= total

  const height = rows.length * 38 + 42

  return (
    <div className="gantt-wrap" style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={rows} margin={{ top: 6, right: 20, bottom: 6, left: 6 }} barCategoryGap="42%">
          <XAxis
            type="number"
            domain={[0, total]}
            tickCount={5}
            tickFormatter={(v: number) => fmtDate(addDaysIso(min, Math.round(v)))}
            tick={{ fill: 'var(--dim)', fontSize: 9, fontFamily: 'var(--font-m)' }}
            stroke="var(--line)"
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            stroke="var(--line)"
            tickLine={false}
            interval={0}
          />
          <Tooltip content={<GanttTooltip />} cursor={{ fill: 'rgba(234,230,222,.03)' }} />
          <Bar dataKey="offset" stackId="a" fill="transparent" isAnimationActive={false} />
          <Bar
            dataKey="span"
            stackId="a"
            radius={[4, 4, 4, 4]}
            isAnimationActive={!reduceMotion}
            animationDuration={900}
            animationEasing="ease-out"
          >
            {rows.map((r, i) => (
              <Cell
                key={i}
                fill={r.color}
                fillOpacity={r.estimated ? 0.3 : 1}
                stroke={r.estimated ? r.color : 'none'}
                strokeWidth={r.estimated ? 1 : 0}
                strokeDasharray={r.estimated ? '3 2' : undefined}
              />
            ))}
          </Bar>
          {showToday && (
            <ReferenceLine
              x={todayOffset}
              stroke="var(--ember)"
              strokeWidth={1.5}
              label={{ value: 'oggi', position: 'top', fill: 'var(--ember)', fontSize: 9 }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
