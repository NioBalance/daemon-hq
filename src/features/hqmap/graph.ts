import { todayIso } from '../../lib/format'
import type { Drop, DropFase } from '../drops/queries'
import type { Articolo, ArticoloTask } from '../articoli/queries'
import type { Techpack } from '../techpacks/queries'
import type { Sample } from '../samples/queries'
import type { Fornitore } from '../fornitori/queries'

export type NodeStatus = 'ok' | 'warn' | 'bad' | 'neutral'
export type NodeKind = 'drop' | 'articolo' | 'techpack' | 'fornitore' | 'sample'

export interface HqNode {
  id: string
  kind: NodeKind
  label: string
  sub: string
  status: NodeStatus
  entityId: string
  x: number
  y: number
}
export interface HqEdge {
  id: string
  source: string
  target: string
  status: NodeStatus
}

export const STATUS_COLOR: Record<NodeStatus, string> = {
  ok: 'var(--ok)',
  warn: 'var(--amber)',
  bad: 'var(--ember)',
  neutral: 'var(--dim)',
}
export const STATUS_LABEL: Record<NodeStatus, string> = {
  ok: 'A posto',
  warn: 'In corso',
  bad: 'Bloccato',
  neutral: 'Da definire',
}
export const KIND_LABEL: Record<NodeKind, string> = {
  drop: 'Drop',
  articolo: 'Articolo',
  techpack: 'Tech pack',
  fornitore: 'Fornitore',
  sample: 'Campione',
}

function dropStatus(fasi: DropFase[], today: string): NodeStatus {
  if (!fasi.length) return 'neutral'
  if (fasi.some((f) => !f.done && f.data && f.data < today)) return 'bad'
  if (fasi.every((f) => f.done)) return 'ok'
  return 'warn'
}
function articoloStatus(tasks: ArticoloTask[]): NodeStatus {
  if (!tasks.length) return 'neutral'
  return tasks.every((t) => t.done) ? 'ok' : 'warn'
}
function techpackStatus(t: Techpack): NodeStatus {
  if (t.stato === 'confermato' || t.stato === 'in-produzione') return 'ok'
  if (t.stato === 'inviato') return 'warn'
  return 'neutral'
}
function sampleStatus(s: Sample): NodeStatus {
  if (s.verdetto === 'approvato') return 'ok'
  if (s.verdetto === 'scartato') return 'bad'
  return 'warn'
}

const R1 = 210 // articoli
const R2 = 400 // tech pack
const R3 = 580 // fornitori + campioni
const polar = (r: number, a: number) => ({ x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) })

export interface HqData {
  drop: Drop
  fasi: DropFase[]
  articoli: Articolo[]
  tasks: ArticoloTask[]
  techpacks: Techpack[]
  samples: Sample[]
  fornitori: Fornitore[]
}

/** Costruisce nodi+archi della HQ Map per un drop, SOLO da relazioni reali:
 *  drop→articoli (drop_id), articolo→techpack (techpacks.articolo_id),
 *  techpack→fornitore (fornitore_id), techpack→campione (samples.techpack_id).
 *  Layout a raggiera auto-generato (i nodi restano trascinabili in React Flow). */
export function buildHqGraph(data: HqData): { nodes: HqNode[]; edges: HqEdge[] } {
  const { drop, fasi, articoli, tasks, techpacks, samples, fornitori } = data
  const today = todayIso()
  const nodes: HqNode[] = []
  const edges: HqEdge[] = []

  const dropFasi = fasi.filter((f) => f.drop_id === drop.id)
  nodes.push({
    id: `drop:${drop.id}`,
    kind: 'drop',
    label: drop.nome,
    sub: dropFasi.length ? `${dropFasi.filter((f) => f.done).length}/${dropFasi.length} fasi` : 'senza fasi',
    status: dropStatus(dropFasi, today),
    entityId: drop.id,
    x: 0,
    y: 0,
  })

  const arts = articoli.filter((a) => a.drop_id === drop.id)
  const fornPlaced = new Map<string, string>() // fornitore_id → node id
  const fornWorkload = new Map<string, number>()
  for (const t of techpacks) if (t.fornitore_id) fornWorkload.set(t.fornitore_id, (fornWorkload.get(t.fornitore_id) ?? 0) + 1)
  for (const s of samples) if (s.fornitore_id) fornWorkload.set(s.fornitore_id, (fornWorkload.get(s.fornitore_id) ?? 0) + 1)

  const nArt = Math.max(1, arts.length)
  arts.forEach((a, i) => {
    const angle = -Math.PI / 2 + ((i + 0.5) / nArt) * 2 * Math.PI
    const pa = polar(R1, angle)
    const aTasks = tasks.filter((t) => t.articolo_id === a.id)
    const aStatus = articoloStatus(aTasks)
    const aId = `articolo:${a.id}`
    nodes.push({
      id: aId,
      kind: 'articolo',
      label: a.nome,
      sub: aTasks.length ? `${aTasks.filter((t) => t.done).length}/${aTasks.length} task` : 'senza task',
      status: aStatus,
      entityId: a.id,
      x: pa.x,
      y: pa.y,
    })
    edges.push({ id: `e:${drop.id}-${a.id}`, source: `drop:${drop.id}`, target: aId, status: aStatus })

    const tps = techpacks.filter((t) => t.articolo_id === a.id)
    const spread = (2 * Math.PI) / nArt * 0.6
    tps.forEach((t, j) => {
      const tAngle = angle + (tps.length > 1 ? (j / (tps.length - 1) - 0.5) * spread : 0)
      const pt = polar(R2, tAngle)
      const tStatus = techpackStatus(t)
      const tId = `techpack:${t.id}`
      nodes.push({
        id: tId,
        kind: 'techpack',
        label: t.nome,
        sub: t.stato,
        status: tStatus,
        entityId: t.id,
        x: pt.x,
        y: pt.y,
      })
      edges.push({ id: `e:${a.id}-${t.id}`, source: aId, target: tId, status: tStatus })

      // fornitore (una volta per fornitore, vicino al primo tech pack)
      if (t.fornitore_id) {
        const forn = fornitori.find((f) => f.id === t.fornitore_id)
        if (forn) {
          let fId = fornPlaced.get(forn.id)
          if (!fId) {
            fId = `fornitore:${forn.id}`
            const pf = polar(R3, tAngle - 0.1)
            nodes.push({
              id: fId,
              kind: 'fornitore',
              label: forn.nome,
              sub: `${fornWorkload.get(forn.id) ?? 0} lavori`,
              status: 'neutral',
              entityId: forn.id,
              x: pf.x,
              y: pf.y,
            })
            fornPlaced.set(forn.id, fId)
          }
          edges.push({ id: `e:${t.id}-forn-${forn.id}`, source: tId, target: fId, status: 'neutral' })
        }
      }

      // campioni del tech pack
      const sps = samples.filter((s) => s.techpack_id === t.id)
      sps.forEach((s, k) => {
        const sAngle = tAngle + (k + 1) * 0.06
        const ps = polar(R3, sAngle)
        const sStatus = sampleStatus(s)
        const sId = `sample:${s.id}`
        nodes.push({
          id: sId,
          kind: 'sample',
          label: s.nome,
          sub: s.verdetto,
          status: sStatus,
          entityId: s.id,
          x: ps.x,
          y: ps.y,
        })
        edges.push({ id: `e:${t.id}-${s.id}`, source: tId, target: sId, status: sStatus })
      })
    })
  })

  return { nodes, edges }
}
