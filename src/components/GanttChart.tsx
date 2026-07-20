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

interface GanttRow {
  label: string
  drop: string
  fase: string
  offset: number
  span: number
  color: string
  start: string
  end: string
  done: boolean
}

/** Colore barra per stato fase: fatta = ok, scaduta non fatta = ember,
 *  futura = amber. */
function faseColor(f: DropFase, todayStr: string): string {
  if (f.done) return 'var(--ok)'
  if (f.data && f.data < todayStr) return 'var(--ember)'
  return 'var(--amber)'
}

function GanttTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: GanttRow }> }) {
  if (!active || !payload || !payload.length) return null
  const row = payload[payload.length - 1].payload
  return (
    <div className="gantt-tip">
      <div className="gantt-tip-t">
        {row.drop} · {row.fase}
      </div>
      <div className="gantt-tip-d">
        {fmtDate(row.start)} → {fmtDate(row.end)} · {row.done ? 'completata' : 'da fare'}
      </div>
    </div>
  )
}

/** Vista Gantt della pipeline drop: ogni fase è una barra sull'asse temporale,
 *  dal traguardo precedente al proprio (la durata per raggiungerla). "Oggi"
 *  marcato. Draw-in one-shot al mount, fermo con reduced-motion. */
export default function GanttChart({ drops, fasi }: { drops: Drop[]; fasi: DropFase[] }) {
  const reduceMotion = useReducedMotion()
  const todayStr = todayIso()

  const rows: GanttRow[] = []
  for (const d of drops) {
    const dropFasi = fasi
      .filter((f) => f.drop_id === d.id && f.data)
      .sort((a, b) => (a.data as string).localeCompare(b.data as string))
    let prev: string | null = null
    for (const f of dropFasi) {
      const end = f.data as string
      const start = prev ?? addDaysIso(end, -7)
      rows.push({
        label: `${d.nome} · ${f.nome}`,
        drop: d.nome,
        fase: f.nome,
        offset: 0, // riempito sotto, relativo al min globale
        span: Math.max(1, daysBetween(start, end)),
        color: faseColor(f, todayStr),
        start,
        end,
        done: f.done,
      })
      prev = end
    }
  }

  if (!rows.length) {
    return <div className="empty">Nessuna fase con data da mostrare nel Gantt.</div>
  }

  // asse: dal primo start all'ultimo end
  const allStarts = rows.map((r) => r.start)
  const allEnds = rows.map((r) => r.end)
  const min = allStarts.reduce((a, b) => (a < b ? a : b))
  const max = allEnds.reduce((a, b) => (a > b ? a : b))
  const total = Math.max(1, daysBetween(min, max))
  for (const r of rows) r.offset = daysBetween(min, r.start)
  const todayOffset = daysBetween(min, todayStr)
  const showToday = todayOffset >= 0 && todayOffset <= total

  const height = rows.length * 30 + 44

  return (
    <div className="gantt-wrap" style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={rows}
          margin={{ top: 6, right: 18, bottom: 6, left: 6 }}
          barCategoryGap="28%"
        >
          <XAxis
            type="number"
            domain={[0, total]}
            tickCount={6}
            tickFormatter={(v: number) => fmtDate(addDaysIso(min, Math.round(v)))}
            tick={{ fill: 'var(--dim)', fontSize: 9, fontFamily: 'var(--font-m)' }}
            stroke="var(--line)"
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={168}
            tick={{ fill: 'var(--muted)', fontSize: 10 }}
            stroke="var(--line)"
            tickLine={false}
            interval={0}
          />
          <Tooltip content={<GanttTooltip />} cursor={{ fill: 'rgba(234,230,222,.03)' }} />
          <Bar dataKey="offset" stackId="a" fill="transparent" isAnimationActive={false} />
          <Bar
            dataKey="span"
            stackId="a"
            radius={[3, 3, 3, 3]}
            isAnimationActive={!reduceMotion}
            animationDuration={900}
            animationEasing="ease-out"
          >
            {rows.map((r, i) => (
              <Cell key={i} fill={r.color} />
            ))}
          </Bar>
          {showToday && (
            <ReferenceLine
              x={todayOffset}
              stroke="var(--ember)"
              strokeDasharray="3 3"
              label={{ value: 'oggi', position: 'top', fill: 'var(--ember)', fontSize: 9 }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
