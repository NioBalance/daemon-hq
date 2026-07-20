import { useMemo } from 'react'
import { ReactFlow, Background, Controls, Handle, Position, type Node, type Edge, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { STATUS_COLOR, KIND_LABEL, type HqNode, type HqEdge } from '../features/hqmap/graph'

type FlowData = { node: HqNode; selected: boolean }

/** Nodo custom v4: glass, dot di stato, tipo + nome. */
function HqNodeView({ data }: NodeProps<Node<FlowData>>) {
  const { node, selected } = data
  return (
    <div className={`hqn hqn-${node.kind}${selected ? ' sel' : ''}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <span className="hqn-dot" style={{ background: STATUS_COLOR[node.status] }} />
      <span className="hqn-body">
        <span className="hqn-kind">{KIND_LABEL[node.kind]}</span>
        <span className="hqn-label">{node.label}</span>
        <span className="hqn-sub">{node.sub}</span>
      </span>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  )
}

const nodeTypes = { hq: HqNodeView }

export default function HqMapCanvas({
  nodes,
  edges,
  selectedId,
  onOpen,
  onSelect,
}: {
  nodes: HqNode[]
  edges: HqEdge[]
  selectedId: string | null
  onOpen: (node: HqNode) => void
  onSelect: (id: string) => void
}) {
  const rfNodes: Node<FlowData>[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: 'hq',
        position: { x: n.x, y: n.y },
        data: { node: n, selected: n.id === selectedId },
      })),
    [nodes, selectedId],
  )

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.status === 'bad',
        style: { stroke: STATUS_COLOR[e.status], strokeWidth: 1.5, opacity: 0.7 },
      })),
    [edges],
  )

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={1.6}
      proOptions={{ hideAttribution: true }}
      onNodeClick={(_e, n) => onOpen((n.data as FlowData).node)}
      onNodeDragStart={(_e, n) => onSelect(n.id)}
    >
      <Background color="#27272f" gap={22} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}
