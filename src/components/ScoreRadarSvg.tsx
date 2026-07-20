import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'

// 4 assi ortogonali: Fit (alto), Tessuto (destra), Cuciture (basso), Colore (sinistra).
const AXES = [-90, 0, 90, 180]
const CX = 50
const CY = 50
const R = 34
const LABEL_POS = [
  { x: 50, y: 6 },
  { x: 88, y: 50 },
  { x: 50, y: 95 },
  { x: 12, y: 50 },
]

function pt(i: number, v: number) {
  const a = (AXES[i] * Math.PI) / 180
  const r = (v / 5) * R
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}
function ring(v: number) {
  return AXES.map((_, i) => {
    const p = pt(i, v)
    return `${p.x},${p.y}`
  }).join(' ')
}
const clamp = (v: number) => Math.min(5, Math.max(1, v))

/** Radar SVG dei 4 assi campione (scala 1-5). Read-only per l'anteprima, o
 *  editabile: si trascinano i vertici per cambiare i punteggi (onChange). */
export default function ScoreRadarSvg({
  scores,
  labels,
  size = 190,
  editable = false,
  onChange,
}: {
  scores: number[]
  labels: string[]
  size?: number
  editable?: boolean
  onChange?: (index: number, value: number) => void
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [drag, setDrag] = useState<number | null>(null)

  function toSvg(e: RPointerEvent) {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }
  function valueForAxis(i: number, sx: number, sy: number) {
    const a = (AXES[i] * Math.PI) / 180
    const proj = (sx - CX) * Math.cos(a) + (sy - CY) * Math.sin(a)
    return clamp(Math.round((proj / R) * 5))
  }
  function onMove(e: RPointerEvent) {
    if (drag === null || !onChange) return
    const { x, y } = toSvg(e)
    onChange(drag, valueForAxis(drag, x, y))
  }

  const dataPts = scores.map((v, i) => {
    const p = pt(i, clamp(v))
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`radar-svg${editable ? ' editable' : ''}`}
      role="img"
      aria-label="Valutazione campione"
      onPointerMove={onMove}
      onPointerUp={() => setDrag(null)}
      onPointerLeave={() => setDrag(null)}
    >
      {[1, 2, 3, 4, 5].map((v) => (
        <polygon key={v} points={ring(v)} fill="none" stroke="var(--line)" strokeWidth={0.5} />
      ))}
      {AXES.map((_, i) => {
        const p = pt(i, 5)
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="var(--line)" strokeWidth={0.5} />
      })}
      <polygon points={dataPts} fill="var(--ember)" fillOpacity={0.22} stroke="var(--ember)" strokeWidth={1} />
      {editable &&
        scores.map((v, i) => {
          const p = pt(i, clamp(v))
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={7}
                fill="transparent"
                style={{ cursor: 'grab', touchAction: 'none' }}
                onPointerDown={(e) => {
                  ;(e.target as Element).setPointerCapture(e.pointerId)
                  setDrag(i)
                }}
              />
              <circle cx={p.x} cy={p.y} r={3} className="radar-handle" />
            </g>
          )
        })}
      {labels.map((l, i) => (
        <text
          key={i}
          x={LABEL_POS[i].x}
          y={LABEL_POS[i].y}
          className="radar-lbl"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {l}
          {editable ? ` ${Math.round(clamp(scores[i]))}` : ''}
        </text>
      ))}
    </svg>
  )
}
