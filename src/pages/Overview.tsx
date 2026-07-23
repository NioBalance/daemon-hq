import { lazy, Suspense, useCallback, useState, type FormEvent } from 'react'
import { useReducedMotion } from 'framer-motion'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { ErrorState } from '../components/QueryState'
import { ProgressRing, Sparkline, MiniBars } from '../components/ChartBits'
import { useDrops, useDropFasi, useUpdateFase } from '../features/drops/queries'
import { useArticoli, useArticoloTasks } from '../features/articoli/queries'
import { useDesigns } from '../features/designs/queries'
import { useTechpacks } from '../features/techpacks/queries'
import { useSamples } from '../features/samples/queries'
import { useFornitori } from '../features/fornitori/queries'
import { useActivity, useActivityLogger } from '../features/activity/queries'
import { KPI_METRICHE, kpiLabel, useKpiSnapshots, useUpsertKpi, type KpiSnapshot } from '../features/kpi/queries'
import { useCountUp } from '../lib/useCountUp'
import { useNav, useRegisterNewAction } from '../lib/navigation'
import DaemonCore from '../components/DaemonCore'
import { ICONS } from '../components/navIcons'

const TICKER_ICON: Record<KpiMetrica, keyof typeof ICONS> = {
  instagram_followers: 'instagram',
  ordini_totali: 'orders',
  pacchi_drop: 'pacchi',
  waitlist: 'waitlist',
  revenue_drop: 'revenue',
}

const DaemonCoreGL = lazy(() => import('../components/DaemonCoreGL'))

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Core con fallback a cascata: reduced-motion o WebGL assente → SVG;
 *  mentre il chunk three carica → SVG; errore GL a runtime → SVG. */
function SmartCore() {
  const reduce = useReducedMotion()
  const [glFailed, setGlFailed] = useState(false)
  const [glOk] = useState(webglAvailable)
  const onFallback = useCallback(() => setGlFailed(true), [])
  if (!glOk || reduce || glFailed) return <DaemonCore size={168} />
  return (
    <Suspense fallback={<DaemonCore size={168} />}>
      <DaemonCoreGL size={168} onFallback={onFallback} />
    </Suspense>
  )
}
import { useAuth } from '../auth/useAuth'
import { useToast } from '../lib/useToast'
import { useFormDraft } from '../lib/useFormDraft'
import { fmtDate, todayIso, addDaysIso, daysUntil, localDateIso, timeAgo } from '../lib/format'
import type { KpiMetrica } from '../lib/database.types'
import type { TabKey } from '../lib/tabs'

interface NowItem {
  key: string
  urgent: boolean
  tag: string
  txt: string
  tab: TabKey
  /** presente solo per le fasi drop: abilita il check che completa alla fonte */
  faseId?: string
}

function CountNum({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const v = useCountUp(value)
  return (
    <>
      {v.toLocaleString('it-IT', { maximumFractionDigits: decimals })}
      {suffix}
    </>
  )
}

const KPI_FIELDS: FieldDef[] = [
  {
    key: 'metrica',
    label: 'Metrica',
    type: 'select',
    options: KPI_METRICHE.map((m) => ({ value: m.value, label: m.label })),
  },
  { key: 'valore', label: 'Valore', type: 'number', half: true },
  { key: 'data', label: 'Data', type: 'date', half: true },
]

export default function Overview() {
  const { goTab, openAssist } = useNav()
  const { profile } = useAuth()
  const showToast = useToast()
  const logActivity = useActivityLogger()

  const drops = useDrops()
  const fasi = useDropFasi()
  const articoli = useArticoli()
  const tasks = useArticoloTasks()
  const designs = useDesigns()
  const techpacks = useTechpacks()
  const samples = useSamples()
  const fornitori = useFornitori()
  const kpiQ = useKpiSnapshots()
  const activityQ = useActivity()
  const upsertKpi = useUpsertKpi()
  const updateFase = useUpdateFase()

  const [kpiOpen, setKpiOpen] = useState(false)
  const [kpiValues, setKpiValues] = useState<FormValues>({
    metrica: 'instagram_followers',
    valore: '',
    data: todayIso(),
  })
  const [kpiError, setKpiError] = useState<string | null>(null)
  useRegisterNewAction(() => openKpi())
  const kpiDraft = useFormDraft('kpi:new', kpiOpen, kpiValues, setKpiValues)

  const queries = [drops, fasi, articoli, tasks, designs, techpacks, samples, fornitori]
  const isLoading = queries.some((q) => q.isLoading)
  const firstError = queries.find((q) => q.isError)

  function openKpi(metrica?: KpiMetrica) {
    setKpiValues({ metrica: metrica ?? 'instagram_followers', valore: '', data: todayIso() })
    setKpiError(null)
    setKpiOpen(true)
  }

  async function handleKpiSubmit(e: FormEvent) {
    e.preventDefault()
    const metrica = String(kpiValues.metrica) as KpiMetrica
    const valore = Number(kpiValues.valore)
    const data = String(kpiValues.data ?? '') || todayIso()
    if (!isFinite(valore) || kpiValues.valore === '') {
      setKpiError('Inserisci un valore numerico.')
      return
    }
    try {
      await upsertKpi.mutateAsync({ metrica, valore, data, inserito_da: profile?.nome ?? '—' })
      kpiDraft.clear()
      setKpiOpen(false)
      showToast('success', `${kpiLabel(metrica)} aggiornato.`)
      logActivity('ha aggiornato il KPI', kpiLabel(metrica), 'overview')
    } catch (err) {
      setKpiError(
        err instanceof Error
          ? `${err.message} — se la tabella non esiste, esegui la migration 0006_fase5.sql.`
          : 'Salvataggio non riuscito.',
      )
    }
  }

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Caricamento overview">
        <div className="ov-head">
          <h2 className="ov-title">Overview</h2>
          <div className="skeleton" style={{ width: 260, height: 12 }} />
        </div>
        <div className="skeleton" style={{ height: 58, borderRadius: 999, marginBottom: 34 }} />
        <div className="ov-skel-band">
          {Array.from({ length: 5 }, (_, i) => (
            <div className="skeleton" key={i} style={{ height: 90 }} />
          ))}
        </div>
        <div className="ov-skel-cols">
          <div>
            {Array.from({ length: 4 }, (_, i) => (
              <div className="skeleton" key={i} style={{ height: 14, marginBottom: 14 }} />
            ))}
          </div>
          <div>
            {Array.from({ length: 4 }, (_, i) => (
              <div className="skeleton" key={i} style={{ height: 14, marginBottom: 14 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (firstError) {
    return (
      <>
        <PanelHead title="Overview" desc="Cruscotto di produzione: KPI, avanzamento e alert." />
        <ErrorState message={(firstError.error as Error).message} onRetry={() => queries.forEach((q) => q.refetch())} />
      </>
    )
  }

  const dropList = drops.data ?? []
  const fasiList = fasi.data ?? []
  const tasksList = tasks.data ?? []
  const techpacksList = techpacks.data ?? []
  const samplesList = samples.data ?? []
  const fornitoriList = fornitori.data ?? []
  const kpiList = kpiQ.data ?? []

  const todayStr = todayIso()
  const soonStr = addDaysIso(todayStr, 7)

  // --- Metriche calcolate sui dati esistenti ---
  const nextDrop = [...dropList]
    .filter((d) => d.data_lancio)
    .sort((a, b) => (a.data_lancio as string).localeCompare(b.data_lancio as string))
    .find((d) => (d.data_lancio as string) >= todayStr)
  const days = nextDrop ? daysUntil(nextDrop.data_lancio as string) : null

  const nextFasi = nextDrop ? fasiList.filter((f) => f.drop_id === nextDrop.id) : []
  const fasiDone = nextFasi.filter((f) => f.done).length


  const scored = samplesList
    .map((s) => [s.fit, s.tessuto, s.cuciture, s.colore].filter((n): n is number => n != null))
    .filter((a) => a.length > 0)
  const mediaCampioni = scored.length
    ? scored.reduce((sum, a) => sum + a.reduce((x, y) => x + y, 0) / a.length, 0) / scored.length
    : 0

  const pctApprovati = samplesList.length
    ? samplesList.filter((s) => s.verdetto === 'approvato').length / samplesList.length
    : 0

  const activityList = activityQ.data ?? []
  const weekAgoIso = addDaysIso(todayStr, -6)
  const giorniBars = Array.from({ length: 7 }, (_, i) => {
    const day = addDaysIso(weekAgoIso, i)
    return {
      label: day.slice(8),
      value: activityList.filter((a) => localDateIso(a.created_at) === day).length,
      color: 'var(--ember)',
    }
  })

  const tpConti = {
    bozza: techpacksList.filter((t) => t.stato === 'bozza').length,
    inviato: techpacksList.filter((t) => t.stato === 'inviato').length,
    confermato: techpacksList.filter((t) => t.stato === 'confermato').length,
    produzione: techpacksList.filter((t) => t.stato === 'in-produzione').length,
  }


  // --- KPI esterni (kpi_snapshots) ---
  const kpiSeries = new Map<KpiMetrica, KpiSnapshot[]>()
  for (const snap of kpiList) {
    kpiSeries.set(snap.metrica, [...(kpiSeries.get(snap.metrica) ?? []), snap])
  }
  const followerVals = (kpiSeries.get('instagram_followers') ?? []).map((x) => x.valore)
  const ordiniVals = (kpiSeries.get('ordini_totali') ?? []).map((x) => x.valore)
  const revenueVals = (kpiSeries.get('revenue_drop') ?? []).map((x) => x.valore)

  // --- Cockpit: testata, ticker LIVE, number band ---
  const now = new Date()
  const headDate = now
    .toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()
  const headTime = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const syncOk = !kpiQ.isError && !activityQ.isError

  const kpiLatest = (m: KpiMetrica) => {
    const series = kpiSeries.get(m) ?? []
    return series[series.length - 1] ?? null
  }

  const campioniInReview = samplesList.filter((s) => s.verdetto === 'in-review').length
  const taskAperti = tasksList.filter((t) => !t.done).length
  const fornitoriAttivi = fornitoriList.filter((f) => f.stato === 'attivo')
  const fornitoriBackup = fornitoriList.filter((f) => f.ruolo === 'backup' && f.stato === 'attivo').length

  // --- Adesso: le urgenze cross-fonte (handoff §3.2). Check diretto solo
  // dove la fonte ha un flag done (fasi drop); il resto naviga alla sezione.
  const nowItems: NowItem[] = []
  fasiList.forEach((f) => {
    if (f.done || !f.data) return
    const drop = dropList.find((d) => d.id === f.drop_id)
    if (!drop) return
    if (f.data < todayStr) {
      nowItems.push({ key: 'f' + f.id, urgent: true, tag: drop.nome, txt: `«${f.nome}» era prevista per il ${fmtDate(f.data)}`, tab: 'drops', faseId: f.id })
    } else if (f.data <= soonStr) {
      nowItems.push({ key: 'f' + f.id, urgent: false, tag: drop.nome, txt: `«${f.nome}» in scadenza il ${fmtDate(f.data)}`, tab: 'drops', faseId: f.id })
    }
  })
  techpacksList
    .filter((t) => t.stato === 'inviato')
    .forEach((t) => {
      const fornNome = fornitoriList.find((f) => f.id === t.fornitore_id)?.nome ?? '—'
      nowItems.push({ key: 't' + t.id, urgent: false, tag: 'Tech Pack', txt: `«${t.nome}» in attesa di conferma da ${fornNome}`, tab: 'techpack' })
    })
  samplesList
    .filter((sm) => sm.verdetto === 'in-review')
    .forEach((sm) => {
      nowItems.push({ key: 's' + sm.id, urgent: false, tag: 'Campione', txt: `«${sm.nome}» da valutare`, tab: 'samples' })
    })
  nowItems.sort((a, b) => Number(b.urgent) - Number(a.urgent))
  const nowTop = nowItems.slice(0, 5)

  const isEmptyDb =
    !dropList.length && !techpacksList.length && !samplesList.length && !fornitoriList.length && !tasksList.length

  function completaFase(item: NowItem) {
    if (!item.faseId) return
    updateFase.mutate(
      { id: item.faseId, patch: { done: true } },
      {
        onSuccess: () => {
          showToast('success', 'Fase completata.')
          logActivity('ha completato la fase', item.txt.split('»')[0].slice(1), 'drops')
        },
        onError: (err) => showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.'),
      },
    )
  }

  return (
    <>
      <div className="ov-head">
        <h2 className="ov-title">Overview</h2>
        <div className="ov-sub">
          {headDate} · {headTime} — {syncOk ? <span className="ok">tutto sincronizzato</span> : 'sync parziale: esegui le migration mancanti'}
        </div>
      </div>

      <div className="live-ticker">
        <div className="live-ticker-in">
          <span className="lt-live">
            <span className="lt-dot" aria-hidden /> LIVE
          </span>
          <span className="lt-sep" aria-hidden />
          {KPI_METRICHE.map((m) => {
            const latest = kpiLatest(m.value)
            return (
              <span
                className={`lt-item${m.value === 'pacchi_drop' ? ' hot' : ''}`}
                key={m.value}
                role="group"
                aria-label={m.label}
              >
                <span className="lt-icon">{ICONS[TICKER_ICON[m.value]]}</span>
                <span className="lt-val">
                  {latest ? `${latest.valore.toLocaleString('it-IT')}${m.unit ? ` ${m.unit}` : ''}` : '—'}
                </span>
              </span>
            )
          })}
          <button className="tlink lt-cta" onClick={() => openKpi()}>
            Aggiorna KPI →
          </button>
        </div>
      </div>

      <button className="ov-core" onClick={openAssist} aria-label="Apri l'assistente DÆMON">
        <SmartCore />
        <span className="ov-core-cap">DÆMON — CHIEDI DOVE</span>
      </button>

      <div className="kpi-band">
        <div className="kb-cell">
          <span className={`kb-head${days !== null && days <= 14 ? ' urgent' : ''}`}>
            <span className="kb-icon">{ICONS.dropx}</span>
            <span className="kb-lbl">Prossimo drop</span>
          </span>
          <div className={`kb-num${days !== null && days <= 14 ? ' hot' : ''}`}>
            {days !== null ? <CountNum value={days} /> : '—'}
          </div>
          <span className="kb-meta">
            {nextDrop ? `${nextDrop.nome} · ${fasiDone}/${nextFasi.length} fasi` : 'Nessun drop pianificato'}
          </span>
          <button className="kb-cta" onClick={() => goTab('drops')}>
            Timeline →
          </button>
        </div>
        <div className="kb-cell">
          <span className={`kb-head${campioniInReview > 0 ? ' warn' : ''}`}>
            <span className="kb-icon">{ICONS.samples}</span>
            <span className="kb-lbl">Campioni</span>
          </span>
          <div className="kb-num">
            <CountNum value={campioniInReview} />
          </div>
          <span className="kb-meta">
            in review{mediaCampioni ? ` · media ${mediaCampioni.toFixed(1)}★` : ''}
          </span>
          <button className="kb-cta" onClick={() => goTab('samples')}>
            Campioni →
          </button>
        </div>
        <div className="kb-cell">
          <span className={`kb-head${tpConti.inviato > 0 ? ' warn' : ''}`}>
            <span className="kb-icon">{ICONS.techpack}</span>
            <span className="kb-lbl">Tech pack</span>
          </span>
          <div className="kb-num">
            <CountNum value={tpConti.inviato} />
          </div>
          <span className="kb-meta">
            in attesa fornitore · {tpConti.confermato + tpConti.produzione} confermati
          </span>
          <button className="kb-cta" onClick={() => goTab('techpack')}>
            Tech Pack →
          </button>
        </div>
        <div className="kb-cell">
          <span className={`kb-head${taskAperti > 0 ? ' urgent' : ' ok'}`}>
            <span className="kb-icon">{ICONS.oggi}</span>
            <span className="kb-lbl">Task aperti</span>
          </span>
          <div className="kb-num">
            <CountNum value={taskAperti} />
          </div>
          <span className="kb-meta">su {tasksList.length} totali, articoli</span>
          <button className="kb-cta" onClick={() => goTab('oggi')}>
            Oggi →
          </button>
        </div>
        <div className="kb-cell">
          <span className="kb-head ok">
            <span className="kb-icon">{ICONS.fornitori}</span>
            <span className="kb-lbl">Fornitori attivi</span>
          </span>
          <div className="kb-num">
            <CountNum value={fornitoriAttivi.length} />
          </div>
          <span className="kb-meta">{fornitoriBackup} backup attivi</span>
          <button className="kb-cta" onClick={() => goTab('fornitori')}>
            Fornitori →
          </button>
        </div>
      </div>

      <h3 className="ov-col-title">Andamento</h3>
      <div className="chart-band">
        <div className="cb-cell">
          <span className="cb-lbl">Follower · trend</span>
          {followerVals.length >= 2 ? (
            <Sparkline data={followerVals} height={46} />
          ) : (
            <span className="cb-none">servono 2+ snapshot</span>
          )}
          <span className="cb-val">
            {followerVals.length ? followerVals[followerVals.length - 1].toLocaleString('it-IT') : '—'}
          </span>
        </div>
        <div className="cb-cell">
          <span className="cb-lbl">Attività · 7gg</span>
          {activityQ.isError ? (
            <span className="cb-none">manca la migration 0006</span>
          ) : (
            <MiniBars data={giorniBars} height={46} />
          )}
          <span className="cb-val">{activityList.length ? giorniBars.reduce((a, b) => a + b.value, 0) : '—'} azioni</span>
        </div>
        <div className="cb-cell">
          <span className="cb-lbl">Ordini · trend</span>
          {ordiniVals.length >= 2 ? (
            <Sparkline data={ordiniVals} height={46} color="var(--ok)" />
          ) : (
            <span className="cb-none">servono 2+ snapshot</span>
          )}
          <span className="cb-val">
            {ordiniVals.length ? ordiniVals[ordiniVals.length - 1].toLocaleString('it-IT') : '—'}
          </span>
        </div>
        <div className="cb-cell">
          <span className="cb-lbl">Revenue · trend</span>
          {revenueVals.length >= 2 ? (
            <Sparkline data={revenueVals} height={46} color="var(--amber)" />
          ) : (
            <span className="cb-none">servono 2+ snapshot</span>
          )}
          <span className="cb-val">
            {revenueVals.length ? `${revenueVals[revenueVals.length - 1].toLocaleString('it-IT')} €` : '—'}
          </span>
        </div>
        <div className="cb-cell">
          <span className="cb-lbl">Qualità campioni</span>
          <ProgressRing value={pctApprovati} size={62} stroke={4} />
          <span className="cb-val">{mediaCampioni ? `media ${mediaCampioni.toFixed(1)}★` : '—'}</span>
        </div>
      </div>

      {isEmptyDb ? (
        <div className="ov-empty">
          <div className="ov-empty-title">Il tuo cockpit è pronto</div>
          <p className="ov-empty-desc">
            Appena il team inserisce drop, articoli e campioni, qui compaiono urgenze, avanzamento e attività.
          </p>
          <div className="ov-quick">
            <button className="tlink" onClick={() => goTab('dropx')}>+ Primo articolo</button>
            <button className="tlink" onClick={() => openKpi()}>Aggiorna KPI</button>
          </div>
        </div>
      ) : (
        <>
          <div className="ov-cols">
            <section aria-label="Adesso">
              <h3 className="ov-col-title">Adesso</h3>
              {nowTop.length ? (
                <ul className="now-list">
                  {nowTop.map((item) => (
                    <li className="now-row" key={item.key}>
                      {item.faseId ? (
                        <input
                          type="checkbox"
                          className="now-check"
                          aria-label={`Completa: ${item.txt}`}
                          disabled={updateFase.isPending}
                          onChange={() => completaFase(item)}
                        />
                      ) : (
                        <span className={`now-dot${item.urgent ? ' urgent' : ''}`} aria-hidden />
                      )}
                      <button className="now-txt" onClick={() => goTab(item.tab)}>
                        <span className="now-tag">{item.tag}</span>
                        {item.txt}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="now-none">Niente di urgente. Tutto sotto controllo.</p>
              )}
              <button className="tlink" style={{ marginTop: 10 }} onClick={() => goTab('oggi')}>
                Vedi tutto in Oggi →
              </button>
            </section>
            <section aria-label="Ultima attività">
              <h3 className="ov-col-title">Ultima attività</h3>
              {activityQ.isError ? (
                <p className="now-none">Log non attivo — esegui la migration 0006_fase5.sql.</p>
              ) : activityList.length ? (
                <ul className="act-list">
                  {activityList.slice(0, 5).map((a) => (
                    <li className="act-row" key={a.id}>
                      <span className="act-dot" aria-hidden />
                      <span className="act-txt">
                        <strong>{a.author_name}</strong> {a.azione} «{a.oggetto}»
                      </span>
                      <span className="act-time">{timeAgo(a.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="now-none">Ancora nessuna attività registrata.</p>
              )}
            </section>
          </div>
          <div className="ov-quick">
            <button className="tlink" onClick={() => goTab('dropx')}>+ Articolo</button>
            <button className="tlink" onClick={() => goTab('notes')}>+ Nota / Memo</button>
            <button className="tlink" onClick={() => goTab('media')}>+ Upload media</button>
            <button className="tlink" onClick={() => openKpi()}>Aggiorna KPI</button>
          </div>
        </>
      )}

      {kpiOpen && (
        <Modal title="Aggiorna KPI" onClose={() => setKpiOpen(false)}>
          <form onSubmit={handleKpiSubmit}>
            <FormFields
              fields={KPI_FIELDS}
              values={kpiValues}
              onChange={(k, v) => setKpiValues((s) => ({ ...s, [k]: v }))}
            />
            {kpiError && <p className="auth-msg err">{kpiError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setKpiOpen(false)}>
                Annulla
              </button>
              <button className="btn" type="submit" disabled={upsertKpi.isPending}>
                {upsertKpi.isPending ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
