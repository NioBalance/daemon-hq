import { lazy, Suspense } from 'react'
import PageNav from '../components/ui-v2/PageNav'
import { Loading, ErrorState } from '../components/QueryState'
import { useCanvas } from '../features/lavagna/queries'
import { useAuth } from '../auth/useAuth'

const LavagnaCanvas = lazy(() => import('./LavagnaCanvas'))

export default function Lavagna() {
  const { data, isLoading, isError, error, refetch } = useCanvas()
  const { profile } = useAuth()

  return (
    <>
      <PageNav
        title="Lavagna"
        sub="canvas libero · appunti e brainstorming (non legato ai dati)"
        actions={<span className="code">Doppio-click o «+ Nodo» · trascina tra i nodi per collegare</span>}
      />

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
