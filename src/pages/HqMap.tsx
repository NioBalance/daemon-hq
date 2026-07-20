import { lazy, Suspense, useMemo, useState } from 'react'
import { Loading } from '../components/QueryState'
import { ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import { useDrops, useDropFasi } from '../features/drops/queries'
import { useArticoli, useArticoloTasks } from '../features/articoli/queries'
import { useTechpacks, useUpdateTechpack } from '../features/techpacks/queries'
import { useSamples, useUpdateSample } from '../features/samples/queries'
import { useFornitori } from '../features/fornitori/queries'
import {
  buildHqGraph,
  STATUS_COLOR,
  STATUS_LABEL,
  KIND_LABEL,
  type HqNode,
  type NodeKind,
} from '../features/hqmap/graph'
import { useNav } from '../lib/navigation'
import { useToast } from '../lib/useToast'
import { daysUntil } from '../lib/format'
import type { TechpackStato, SampleVerdetto } from '../lib/database.types'

const HqMapCanvas = lazy(() => import('./HqMapCanvas'))

const TP_STATI: TechpackStato[] = ['bozza', 'inviato', 'confermato', 'in-produzione']
const VERDETTI: SampleVerdetto[] = ['in-review', 'approvato', 'revisione', 'scartato']
const KIND_FILTERS: (NodeKind | 'tutti')[] = ['tutti', 'articolo', 'techpack', 'fornitore', 'sample']

export default function HqMap() {
  const dropsQ = useDrops()
  const fasiQ = useDropFasi()
  const articoliQ = useArticoli()
  const tasksQ = useArticoloTasks()
  const techpacksQ = useTechpacks()
  const samplesQ = useSamples()
  const fornitoriQ = useFornitori()
  const updateTechpack = useUpdateTechpack()
  const updateSample = useUpdateSample()
  const { goTab, openArticolo, openEntity } = useNav()
  const showToast = useToast()

  const queries = [dropsQ, fasiQ, articoliQ, tasksQ, techpacksQ, samplesQ, fornitoriQ]
  const isLoading = queries.some((q) => q.isLoading)
  const firstError = queries.find((q) => q.isError)

  const drops = useMemo(
    () => [...(dropsQ.data ?? [])].sort((a, b) => (a.data_lancio ?? '9999').localeCompare(b.data_lancio ?? '9999')),
    [dropsQ.data],
  )
  const activeDropId = drops.find((d) => d.data_lancio && daysUntil(d.data_lancio) >= 0)?.id ?? drops[0]?.id ?? null

  const [dropId, setDropId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterKind, setFilterKind] = useState<NodeKind | 'tutti'>('tutti')

  const currentDropId = dropId ?? activeDropId
  const drop = drops.find((d) => d.id === currentDropId) ?? null

  const graph = useMemo(() => {
    if (!drop) return { nodes: [], edges: [] }
    return buildHqGraph({
      drop,
      fasi: fasiQ.data ?? [],
      articoli: articoliQ.data ?? [],
      tasks: tasksQ.data ?? [],
      techpacks: techpacksQ.data ?? [],
      samples: samplesQ.data ?? [],
      fornitori: fornitoriQ.data ?? [],
    })
  }, [drop, fasiQ.data, articoliQ.data, tasksQ.data, techpacksQ.data, samplesQ.data, fornitoriQ.data])

  function openNode(n: HqNode) {
    setSelectedId(n.id)
    switch (n.kind) {
      case 'drop':
        goTab('dropx')
        break
      case 'articolo':
        openArticolo(n.entityId)
        break
      case 'techpack':
        goTab('techpack')
        openEntity('techpack', n.entityId)
        break
      case 'fornitore':
        goTab('fornitori')
        openEntity('fornitore', n.entityId)
        break
      case 'sample':
        goTab('samples')
        openEntity('sample', n.entityId)
        break
    }
  }

  function changeStato(n: HqNode, value: string) {
    if (n.kind === 'techpack') {
      updateTechpack.mutate(
        { id: n.entityId, patch: { stato: value as TechpackStato } },
        { onSuccess: () => showToast('success', 'Stato tech pack aggiornato.'), onError: (e) => showToast('error', e.message) },
      )
    } else if (n.kind === 'sample') {
      updateSample.mutate(
        { id: n.entityId, patch: { verdetto: value as SampleVerdetto } },
        { onSuccess: () => showToast('success', 'Verdetto campione aggiornato.'), onError: (e) => showToast('error', e.message) },
      )
    }
  }

  const listNodes = graph.nodes.filter((n) => n.kind !== 'drop' && (filterKind === 'tutti' || n.kind === filterKind))

  if (isLoading) {
    return (
      <>
        <div className="ov-head">
          <h2 className="ov-title">HQ Map</h2>
        </div>
        <Loading label="Carico la mappa…" />
      </>
    )
  }
  if (firstError) {
    return (
      <>
        <div className="ov-head">
          <h2 className="ov-title">HQ Map</h2>
        </div>
        <ErrorState
          message={`${(firstError.error as Error).message} — se mancano i collegamenti, esegui la migration 0017_hqmap_links.sql.`}
          onRetry={() => queries.forEach((q) => q.refetch())}
        />
      </>
    )
  }

  return (
    <>
      <div className="pg-head">
        <div>
          <h2 className="ov-title">HQ Map</h2>
          <div className="ov-sub">MAPPA OPERATIVA · DROP → ARTICOLI → TECH PACK → CAMPIONI</div>
        </div>
        {drops.length > 0 && (
          <select className="hq-dropsel" value={currentDropId ?? ''} onChange={(e) => setDropId(e.target.value)}>
            {drops.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {!drop ? (
        <EmptyState icon="box" text="Nessun drop. Creane uno per costruire la mappa." />
      ) : (
        <div className="hq-cols">
          <div className="hq-canvas">
            <Suspense fallback={<Loading label="Carico il grafo…" />}>
              <HqMapCanvas nodes={graph.nodes} edges={graph.edges} selectedId={selectedId} onOpen={openNode} onSelect={setSelectedId} />
            </Suspense>
            <div className="hq-legend">
              {(['ok', 'warn', 'bad'] as const).map((st) => (
                <span key={st}>
                  <i style={{ background: STATUS_COLOR[st] }} /> {STATUS_LABEL[st]}
                </span>
              ))}
            </div>
          </div>

          <aside className="hq-list" aria-label="Elementi della mappa">
            <div className="hq-filters">
              {KIND_FILTERS.map((k) => (
                <button
                  key={k}
                  className={`dt-filter${filterKind === k ? ' active' : ''}`}
                  onClick={() => setFilterKind(k)}
                >
                  {k === 'tutti' ? 'Tutti' : KIND_LABEL[k as NodeKind]}
                </button>
              ))}
            </div>
            {listNodes.length ? (
              <ul className="hq-rows">
                {listNodes.map((n) => (
                  <li
                    key={n.id}
                    className={`hq-row${selectedId === n.id ? ' sel' : ''}`}
                    onMouseEnter={() => setSelectedId(n.id)}
                  >
                    <span className="hq-row-dot" style={{ background: STATUS_COLOR[n.status] }} />
                    <span className="hq-row-body" onClick={() => setSelectedId(n.id)} role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(n.id) }}>
                      <span className="hq-row-kind">{KIND_LABEL[n.kind]}</span>
                      <span className="hq-row-label">{n.label}</span>
                    </span>
                    {n.kind === 'techpack' && (
                      <select
                        className="hq-row-stato"
                        value={n.sub}
                        onChange={(e) => changeStato(n, e.target.value)}
                        aria-label="Stato tech pack"
                      >
                        {TP_STATI.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    )}
                    {n.kind === 'sample' && (
                      <select
                        className="hq-row-stato"
                        value={n.sub}
                        onChange={(e) => changeStato(n, e.target.value)}
                        aria-label="Verdetto campione"
                      >
                        {VERDETTI.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    )}
                    <button className="tlink" onClick={() => openNode(n)}>
                      Apri →
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="now-none">
                Nessun elemento collegato a questo drop. Collega tech pack e campioni dai rispettivi form.
              </p>
            )}
          </aside>
        </div>
      )}
    </>
  )
}
