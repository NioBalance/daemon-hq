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

const R1 = 220 // articoli
const R2 = 440 // tech pack
const R3 = 660 // fornitori + campioni
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

  // Carico per fornitore (sub "N lavori"): tech pack + campioni che lo citano.
  const fornWorkload = new Map<string, number>()
  for (const t of techpacks) if (t.fornitore_id) fornWorkload.set(t.fornitore_id, (fornWorkload.get(t.fornitore_id) ?? 0) + 1)
  for (const s of samples) if (s.fornitore_id) fornWorkload.set(s.fornitore_id, (fornWorkload.get(s.fornitore_id) ?? 0) + 1)

  const tpsByArt = new Map<string, Techpack[]>()
  for (const a of arts) tpsByArt.set(a.id, techpacks.filter((t) => t.articolo_id === a.id))
  const spsOf = (tid: string) => samples.filter((s) => s.techpack_id === tid)

  // Un fornitore = un solo nodo, "posseduto" dal primo tech pack che lo cita.
  const fornOwnerTp = new Map<string, string>()
  for (const a of arts) for (const t of tpsByArt.get(a.id) ?? []) {
    if (t.fornitore_id && !fornOwnerTp.has(t.fornitore_id)) fornOwnerTp.set(t.fornitore_id, t.id)
  }
  const ownsForn = (t: Techpack) => !!t.fornitore_id && fornOwnerTp.get(t.fornitore_id) === t.id

  // Peso = n° foglie sotto il nodo → ogni ramo riceve spazio angolare
  // proporzionale al contenuto (raggiera 360°, meno sovrapposizioni).
  const tpWeight = (t: Techpack) => Math.max(1, spsOf(t.id).length + (ownsForn(t) ? 1 : 0))
  const artWeight = (a: Articolo) => {
    const tps = tpsByArt.get(a.id) ?? []
    return tps.length ? tps.reduce((sum, t) => sum + tpWeight(t), 0) : 1
  }
  const totalW = arts.reduce((s, a) => s + artWeight(a), 0) || 1

  let cursor = -Math.PI / 2 // parte dall'alto e gira in tondo
  for (const a of arts) {
    const w = artWeight(a)
    const span = (w / totalW) * 2 * Math.PI
    const mid = cursor + span / 2
    const pa = polar(R1, mid)
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

    const tps = tpsByArt.get(a.id) ?? []
    let tCursor = cursor
    for (const t of tps) {
      const tspan = (tpWeight(t) / w) * span
      const tmid = tCursor + tspan / 2
      const pt = polar(R2, tmid)
      const tStatus = techpackStatus(t)
      const tId = `techpack:${t.id}`
      nodes.push({ id: tId, kind: 'techpack', label: t.nome, sub: t.stato, status: tStatus, entityId: t.id, x: pt.x, y: pt.y })
      edges.push({ id: `e:${a.id}-${t.id}`, source: aId, target: tId, status: tStatus })

      const sps = spsOf(t.id)
      const nKids = Math.max(1, sps.length + (ownsForn(t) ? 1 : 0))
      const kspan = tspan / nKids
      let kCursor = tCursor

      if (ownsForn(t)) {
        const forn = fornitori.find((f) => f.id === t.fornitore_id)
        if (forn) {
          const pf = polar(R3, kCursor + kspan / 2)
          const fId = `fornitore:${forn.id}`
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
          edges.push({ id: `e:${t.id}-forn-${forn.id}`, source: tId, target: fId, status: 'neutral' })
          kCursor += kspan
        }
      } else if (t.fornitore_id) {
        // fornitore già come nodo altrove: solo l'arco
        edges.push({ id: `e:${t.id}-forn-${t.fornitore_id}`, source: tId, target: `fornitore:${t.fornitore_id}`, status: 'neutral' })
      }

      for (const s of sps) {
        const ps = polar(R3, kCursor + kspan / 2)
        const sStatus = sampleStatus(s)
        const sId = `sample:${s.id}`
        nodes.push({ id: sId, kind: 'sample', label: s.nome, sub: s.verdetto, status: sStatus, entityId: s.id, x: ps.x, y: ps.y })
        edges.push({ id: `e:${t.id}-${s.id}`, source: tId, target: sId, status: sStatus })
        kCursor += kspan
      }
      tCursor += tspan
    }
    cursor += span
  }

  return { nodes, edges }
}
