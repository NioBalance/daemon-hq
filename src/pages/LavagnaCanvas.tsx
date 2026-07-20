import { createContext, useCallback, useContext, useMemo, useRef, useState, type MouseEvent as RME } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  NodeResizer,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { CanvasNode, CanvasEdge } from '../features/lavagna/queries'
import {
  createCanvasNode,
  updateCanvasNode,
  deleteCanvasNode,
  createCanvasEdge,
  deleteCanvasEdge,
} from '../features/lavagna/queries'
import { useNav } from '../lib/navigation'
import { useDrops } from '../features/drops/queries'
import { useArticoli } from '../features/articoli/queries'
import { useTechpacks } from '../features/techpacks/queries'
import { useSamples } from '../features/samples/queries'
import { useFornitori } from '../features/fornitori/queries'
import type { CanvasForma } from '../lib/database.types'

const COLORS = ['bone', 'ember', 'amber', 'ok', 'info', 'dim']
const COLOR_VAR: Record<string, string> = {
  bone: 'var(--bone)',
  ember: 'var(--ember)',
  amber: 'var(--amber)',
  ok: 'var(--ok)',
  info: 'var(--info)',
  dim: 'var(--dim)',
}
const SHAPES: CanvasForma[] = ['rect', 'pill', 'ellisse']
const radiusFor = (f: CanvasForma) => (f === 'ellisse' ? '50%' : f === 'pill' ? '999px' : '10px')

type LvData = {
  testo: string
  colore: string
  forma: CanvasForma
  ref_kind: string | null
  ref_id: string | null
  ref_label: string | null
}
type LvNode = Node<LvData>

interface LvActions {
  setText: (id: string, v: string) => void
  setColor: (id: string, v: string) => void
  cycleShape: (id: string) => void
  resized: (id: string, p: { x: number; y: number; width: number; height: number }) => void
  remove: (id: string) => void
  requestPin: (id: string) => void
  openRef: (d: LvData) => void
}
const Ctx = createContext<LvActions | null>(null)
const useLv = () => useContext(Ctx)!

function LvNodeView({ id, data, selected }: NodeProps<LvNode>) {
  const a = useLv()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data.testo)
  const col = COLOR_VAR[data.colore] ?? COLOR_VAR.bone

  return (
    <div
      className="lv-node"
      style={{
        width: '100%',
        height: '100%',
        borderColor: col,
        borderRadius: radiusFor(data.forma),
        background: `color-mix(in srgb, ${col} 12%, var(--surface))`,
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setText(data.testo)
        setEditing(true)
      }}
    >
      <NodeResizer isVisible={selected} minWidth={110} minHeight={46} lineClassName="lv-rz-line" handleClassName="lv-rz-h" onResizeEnd={(_e, p) => a.resized(id, p)} />
      {(['Top', 'Right', 'Bottom', 'Left'] as const).map((p) => (
        <Handle key={p} id={p.toLowerCase()} type="source" position={Position[p]} className="lv-handle" />
      ))}

      {editing ? (
        <textarea
          className="lv-edit nodrag"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setEditing(false)
            if (text !== data.testo) a.setText(id, text)
          }}
        />
      ) : (
        <span className={`lv-txt${data.testo ? '' : ' empty'}`}>{data.testo || 'Doppio-click per scrivere'}</span>
      )}

      {data.ref_label && (
        <button className="lv-ref nodrag" onClick={(e) => { e.stopPropagation(); a.openRef(data) }} title="Apri la scheda collegata">
          → {data.ref_label}
        </button>
      )}

      {selected && (
        <div className="lv-toolbar nodrag">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`lv-sw${data.colore === c ? ' on' : ''}`}
              style={{ background: COLOR_VAR[c] }}
              onClick={(e) => { e.stopPropagation(); a.setColor(id, c) }}
              aria-label={`Colore ${c}`}
            />
          ))}
          <button className="lv-tb" onClick={(e) => { e.stopPropagation(); a.cycleShape(id) }} title="Forma">◇</button>
          <button className="lv-tb" onClick={(e) => { e.stopPropagation(); a.requestPin(id) }} title="Appunta un riferimento">🔗</button>
          <button className="lv-tb del" onClick={(e) => { e.stopPropagation(); a.remove(id) }} title="Elimina">✕</button>
        </div>
      )}
    </div>
  )
}

const nodeTypes = { canvas: LvNodeView }

function toRf(n: CanvasNode): LvNode {
  return {
    id: n.id,
    type: 'canvas',
    position: { x: n.x, y: n.y },
    style: { width: n.w, height: n.h },
    data: { testo: n.testo, colore: n.colore, forma: n.forma, ref_kind: n.ref_kind, ref_id: n.ref_id, ref_label: n.ref_label },
  }
}

function Inner({ initialNodes, initialEdges, createdBy }: { initialNodes: CanvasNode[]; initialEdges: CanvasEdge[]; createdBy: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<LvNode>(initialNodes.map(toRf))
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: 'default', style: { stroke: 'var(--muted)', strokeWidth: 1.5 } })),
  )
  const rf = useReactFlow()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const { goTab, openArticolo, openEntity } = useNav()
  const [pinFor, setPinFor] = useState<string | null>(null)

  const patchData = useCallback(
    (id: string, patch: Partial<LvData>) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))),
    [setNodes],
  )

  const actions: LvActions = useMemo(
    () => ({
      setText: (id, v) => { patchData(id, { testo: v }); void updateCanvasNode(id, { testo: v }) },
      setColor: (id, v) => { patchData(id, { colore: v }); void updateCanvasNode(id, { colore: v }) },
      cycleShape: (id) =>
        setNodes((ns) =>
          ns.map((n) => {
            if (n.id !== id) return n
            const next = SHAPES[(SHAPES.indexOf(n.data.forma) + 1) % SHAPES.length]
            void updateCanvasNode(id, { forma: next })
            return { ...n, data: { ...n.data, forma: next } }
          }),
        ),
      resized: (id, p) => { void updateCanvasNode(id, { x: p.x, y: p.y, w: p.width, h: p.height }) },
      remove: (id) => { void rf.deleteElements({ nodes: [{ id }] }) },
      requestPin: (id) => setPinFor(id),
      openRef: (d) => {
        if (!d.ref_kind || !d.ref_id) return
        if (d.ref_kind === 'drop') goTab('dropx')
        else if (d.ref_kind === 'articolo') openArticolo(d.ref_id)
        else {
          const tab = d.ref_kind === 'techpack' ? 'techpack' : d.ref_kind === 'sample' ? 'samples' : 'fornitori'
          goTab(tab as 'techpack' | 'samples' | 'fornitori')
          openEntity(d.ref_kind, d.ref_id)
        }
      },
    }),
    [patchData, setNodes, rf, goTab, openArticolo, openEntity],
  )

  const addNode = useCallback(
    async (fx: number, fy: number) => {
      const row = await createCanvasNode({ x: fx, y: fy, testo: '', colore: 'bone', forma: 'rect', w: 170, h: 72, created_by: createdBy })
      setNodes((ns) => [...ns, toRf(row)])
    },
    [createdBy, setNodes],
  )

  const addAtCenter = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const p = rf.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    void addNode(p.x - 85, p.y - 36)
  }, [rf, addNode])

  function onPaneDoubleClick(e: RME) {
    const t = e.target as HTMLElement
    if (!t.classList.contains('react-flow__pane')) return
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    void addNode(p.x - 85, p.y - 36)
  }

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return
      const id = crypto.randomUUID()
      setEdges((es) => addEdge({ id, source: c.source!, target: c.target!, type: 'default', style: { stroke: 'var(--muted)', strokeWidth: 1.5 } }, es))
      void createCanvasEdge(id, c.source, c.target)
    },
    [setEdges],
  )

  return (
    <div className="lv-wrap" ref={wrapRef} onDoubleClick={onPaneDoubleClick}>
      <Ctx.Provider value={actions}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={(_e, n) => void updateCanvasNode(n.id, { x: n.position.x, y: n.position.y })}
          onNodesDelete={(ns) => ns.forEach((n) => void deleteCanvasNode(n.id))}
          onEdgesDelete={(es) => es.forEach((e) => void deleteCanvasEdge(e.id))}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={['Backspace', 'Delete']}
          zoomOnDoubleClick={false}
          fitView
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#33333d" gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </Ctx.Provider>

      <button className="lv-add" onClick={addAtCenter}>
        + nodo
      </button>

      {pinFor && <PinPicker onClose={() => setPinFor(null)} onPick={(kind, id, label) => { patchData(pinFor, { ref_kind: kind, ref_id: id, ref_label: label }); void updateCanvasNode(pinFor, { ref_kind: kind, ref_id: id, ref_label: label }); setPinFor(null) }} />}
    </div>
  )
}

function PinPicker({ onClose, onPick }: { onClose: () => void; onPick: (kind: string, id: string, label: string) => void }) {
  const [q, setQ] = useState('')
  const drops = useDrops().data ?? []
  const articoli = useArticoli().data ?? []
  const techpacks = useTechpacks().data ?? []
  const samples = useSamples().data ?? []
  const fornitori = useFornitori().data ?? []
  const all = [
    ...drops.map((d) => ({ kind: 'drop', id: d.id, label: d.nome })),
    ...articoli.map((a) => ({ kind: 'articolo', id: a.id, label: a.nome })),
    ...techpacks.map((t) => ({ kind: 'techpack', id: t.id, label: t.nome })),
    ...samples.map((s) => ({ kind: 'sample', id: s.id, label: s.nome })),
    ...fornitori.map((f) => ({ kind: 'fornitore', id: f.id, label: f.nome })),
  ]
  const ql = q.trim().toLowerCase()
  const list = (ql ? all.filter((x) => x.label.toLowerCase().includes(ql)) : all).slice(0, 40)
  return (
    <div className="lv-pin-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="lv-pin" role="dialog" aria-label="Appunta un riferimento">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca articolo, tech pack, campione, fornitore, drop…" />
        <ul>
          {list.map((x) => (
            <li key={`${x.kind}:${x.id}`}>
              <button onClick={() => onPick(x.kind, x.id, x.label)}>
                <span className="lv-pin-kind">{x.kind}</span> {x.label}
              </button>
            </li>
          ))}
          {!list.length && <li className="now-none">Nessun risultato.</li>}
        </ul>
      </div>
    </div>
  )
}

export default function LavagnaCanvas(props: { initialNodes: CanvasNode[]; initialEdges: CanvasEdge[]; createdBy: string }) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  )
}
