import { useState } from 'react'
import OwnerBadge from '../components/OwnerBadge'
import { ErrorState } from '../components/QueryState'
import { useUpdateFase } from '../features/drops/queries'
import { useToggleTask } from '../features/articoli/queries'
import { useActivityLogger } from '../features/activity/queries'
import {
  useOggiItems,
  OGGI_URGENZE,
  OGGI_FONTI,
  type OggiItem,
} from '../features/oggi/aggregate'
import { useNav } from '../lib/navigation'
import { useToast } from '../lib/useToast'

type Vista = 'urgenza' | 'tipo'

/** Pagina Oggi (spec §4): l'agenda operativa aggregata — task articolo,
 *  fasi drop in scadenza, campioni in review, tech pack fermi, insieme.
 *  Il check completa ALLA FONTE (stessa entità, non una copia); campioni e
 *  tech pack sono decisioni, non spunte: deep-open sulla scheda. Stile v4:
 *  eyebrow + righe hairline, zero container. */
export default function Oggi() {
  const { goTab, openArticolo, openEntity } = useNav()
  const showToast = useToast()
  const logActivity = useActivityLogger()
  const updateFase = useUpdateFase()
  const toggleTask = useToggleTask()
  const oggi = useOggiItems()

  const [vista, setVista] = useState<Vista>('urgenza')

  const headDate = new Date()
    .toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })
    .toUpperCase()

  function completa(item: OggiItem) {
    if (item.faseId) {
      updateFase.mutate(
        { id: item.faseId, patch: { done: true } },
        {
          onSuccess: () => {
            showToast('success', 'Fase completata.')
            logActivity('ha completato la fase', item.tag, 'drops')
          },
          onError: (err) =>
            showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.'),
        },
      )
    } else if (item.taskId) {
      toggleTask.mutate(
        { id: item.taskId, done: true },
        {
          onSuccess: () => {
            showToast('success', 'Task completata.')
            logActivity('ha completato una task di', item.tag, 'dropx')
          },
          onError: (err) =>
            showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.'),
        },
      )
    }
  }

  function apri(item: OggiItem) {
    if (item.articoloId) {
      openArticolo(item.articoloId)
    } else if (item.entity) {
      goTab(item.entity.tab)
      openEntity(item.entity.kind, item.entity.id)
    } else {
      goTab('drops')
    }
  }

  if (oggi.isLoading) {
    return (
      <div aria-busy="true" aria-label="Caricamento agenda">
        <div className="ov-head">
          <h2 className="ov-title">Oggi</h2>
          <div className="skeleton" style={{ width: 220, height: 12 }} />
        </div>
        {Array.from({ length: 3 }, (_, g) => (
          <div key={g} style={{ marginBottom: 30 }}>
            <div className="skeleton" style={{ width: 120, height: 10, marginBottom: 14 }} />
            {Array.from({ length: 3 }, (_, i) => (
              <div className="skeleton" key={i} style={{ height: 14, marginBottom: 12 }} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (oggi.error) {
    return (
      <>
        <div className="ov-head">
          <h2 className="ov-title">Oggi</h2>
        </div>
        <ErrorState message={oggi.error.message} onRetry={oggi.refetch} />
      </>
    )
  }

  const groups =
    vista === 'urgenza'
      ? OGGI_URGENZE.map((u) => ({
          key: u.key,
          label: u.label,
          hot: u.key === 'scaduto',
          items: oggi.items.filter((i) => i.urgenza === u.key),
        }))
      : OGGI_FONTI.map((f) => ({
          key: f.key,
          label: f.label,
          hot: false,
          items: oggi.items.filter((i) => i.fonte === f.key),
        }))

  return (
    <>
      <div className="ov-head og-head">
        <div>
          <h2 className="ov-title">Oggi</h2>
          <div className="ov-sub">
            {oggi.count ? `${oggi.count} VOC${oggi.count === 1 ? 'E' : 'I'} APERTE` : 'NIENTE IN CODA'} · {headDate}
          </div>
        </div>
        <div className="og-toggle" role="tablist" aria-label="Raggruppamento">
          {(
            [
              ['urgenza', 'Urgenza'],
              ['tipo', 'Tipo'],
            ] as [Vista, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v}
              className={`og-tab${vista === v ? ' active' : ''}`}
              onClick={() => setVista(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {oggi.count === 0 ? (
        <div className="ov-empty">
          <div className="ov-empty-title">Niente in scadenza</div>
          <p className="ov-empty-desc">
            Nessuna fase entro la settimana, nessuna task aperta, niente in review. Tutto sotto controllo.
          </p>
          <div className="ov-quick">
            <button className="tlink" onClick={() => goTab('drops')}>Timeline →</button>
            <button className="tlink" onClick={() => goTab('dropx')}>Drops →</button>
          </div>
        </div>
      ) : (
        groups
          .filter((g) => g.items.length)
          .map((g) => (
            <section key={g.key} className="og-group" aria-label={g.label}>
              <h3 className={`og-eyebrow${g.hot ? ' hot' : ''}`}>
                {g.label} <span className="og-count">{g.items.length}</span>
              </h3>
              <ul className="now-list">
                {g.items.map((item) => (
                  <li className="now-row" key={item.key}>
                    {item.faseId || item.taskId ? (
                      <input
                        type="checkbox"
                        className="now-check"
                        aria-label={`Completa: ${item.testo}`}
                        disabled={updateFase.isPending || toggleTask.isPending}
                        onChange={() => completa(item)}
                      />
                    ) : (
                      <span
                        className={`now-dot${item.urgenza === 'scaduto' ? ' urgent' : ''}`}
                        aria-hidden
                      />
                    )}
                    <button className="now-txt" onClick={() => apri(item)}>
                      <span className="now-tag">{item.tag}</span>
                      {item.testo}
                    </button>
                    {item.owner && (
                      <span className="og-owner">
                        <OwnerBadge owner={item.owner} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </>
  )
}
