import { lazy, Suspense } from 'react'
import { Loading, ErrorState } from '../components/QueryState'
import { useCanvas } from '../features/lavagna/queries'
import { useAuth } from '../auth/useAuth'

const LavagnaCanvas = lazy(() => import('./LavagnaCanvas'))

export default function Lavagna() {
  const { data, isLoading, isError, error, refetch } = useCanvas()
  const { profile } = useAuth()

  return (
    <>
      <div className="pg-head">
        <div>
          <h2 className="ov-title">Lavagna</h2>
          <div className="ov-sub">CANVAS LIBERO · APPUNTI E BRAINSTORMING (NON LEGATO AI DATI)</div>
        </div>
        <span className="code">DOPPIO-CLICK O «+ NODO» · TRASCINA TRA I NODI PER COLLEGARE</span>
      </div>

      {isLoading && <Loading label="Carico la lavagna…" />}
      {isError && (
        <ErrorState
          message={`${error.message} — se le tabelle non esistono, esegui la migration 0019_lavagna.sql.`}
          onRetry={() => refetch()}
        />
      )}
      {!isLoading && !isError && data && (
        <div className="lv-canvas">
          <Suspense fallback={<Loading label="Carico il canvas…" />}>
            <LavagnaCanvas initialNodes={data.nodes} initialEdges={data.edges} createdBy={profile?.nome ?? ''} />
          </Suspense>
        </div>
      )}
    </>
  )
}
