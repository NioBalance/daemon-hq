import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import { ProgressRing, Sparkline, MiniBars } from '../components/ChartBits'
import { useDrops, useDropFasi } from '../features/drops/queries'
import { useArticoli, useArticoloTasks } from '../features/articoli/queries'
import { useDesigns } from '../features/designs/queries'
import { useTechpacks } from '../features/techpacks/queries'
import { useSamples } from '../features/samples/queries'
import { useFornitori } from '../features/fornitori/queries'
import { useActivity, useActivityLogger } from '../features/activity/queries'
import { KPI_METRICHE, kpiLabel, useKpiSnapshots, useUpsertKpi, type KpiSnapshot } from '../features/kpi/queries'
import { useCountUp } from '../lib/useCountUp'
import { useNav } from '../lib/navigation'
import { useAuth } from '../auth/useAuth'
import { useToast } from '../lib/useToast'
import { useFormDraft } from '../lib/useFormDraft'
import { fmtDate, todayIso, addDaysIso, daysUntil, localDateIso } from '../lib/format'
import type { KpiMetrica } from '../lib/database.types'
import type { TabKey } from '../lib/tabs'

interface Alert {
  red: boolean
  code: string
  txt: string
  tab: TabKey
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
  const { goTab } = useNav()
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

  const [kpiOpen, setKpiOpen] = useState(false)
  const [kpiValues, setKpiValues] = useState<FormValues>({
    metrica: 'instagram_followers',
    valore: '',
    data: todayIso(),
  })
  const [kpiError, setKpiError] = useState<string | null>(null)
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
      <>
        <PanelHead title="Overview" desc="Cruscotto di produzione: KPI, avanzamento e alert." />
        <Loading label="Caricamento overview…" />
      </>
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
  const fasiPct = nextFasi.length ? fasiDone / nextFasi.length : 0


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

  // --- Alert (cliccabili: saltano alla sezione interessata) ---
  const alerts: Alert[] = []
  fasiList.forEach((f) => {
    if (f.done || !f.data) return
    const drop = dropList.find((d) => d.id === f.drop_id)
    if (!drop) return
    if (f.data < todayStr) {
      alerts.push({ red: true, code: 'SCADUTA', txt: `${drop.nome} → «${f.nome}» era prevista per il ${fmtDate(f.data)}`, tab: 'drops' })
    } else if (f.data <= soonStr) {
      alerts.push({ red: false, code: '7 GIORNI', txt: `${drop.nome} → «${f.nome}» in scadenza il ${fmtDate(f.data)}`, tab: 'drops' })
    }
  })
  techpacksList
    .filter((t) => t.stato === 'inviato')
    .forEach((t) => {
      const fornNome = fornitoriList.find((f) => f.id === t.fornitore_id)?.nome ?? '—'
      alerts.push({ red: false, code: 'ATTESA', txt: `Tech pack «${t.nome}» inviato a ${fornNome} — in attesa di conferma`, tab: 'techpack' })
    })
  samplesList
    .filter((s) => s.verdetto === 'in-review')
    .forEach((s) => {
      alerts.push({ red: false, code: 'REVIEW', txt: `Campione «${s.nome}» da valutare`, tab: 'samples' })
    })

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
              <span className={`lt-item${m.value === 'pacchi_drop' ? ' hot' : ''}`} key={m.value}>
                <span className="lt-lbl">{m.label}</span>
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

      <div className="kpi-band">
        <div className="kb-cell">
          <span className="kb-lbl">Prossimo drop</span>
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
          <span className="kb-lbl">Campioni</span>
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
          <span className="kb-lbl">Tech pack</span>
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
          <span className="kb-lbl">Task aperti</span>
          <div className="kb-num">
            <CountNum value={taskAperti} />
          </div>
          <span className="kb-meta">su {tasksList.length} totali, articoli</span>
          <button className="kb-cta" onClick={() => goTab('dropx')}>
            Drops →
          </button>
        </div>
        <div className="kb-cell">
          <span className="kb-lbl">Fornitori attivi</span>
          <div className="kb-num">
            <CountNum value={fornitoriAttivi.length} />
          </div>
          <span className="kb-meta">{fornitoriBackup} backup attivi</span>
          <button className="kb-cta" onClick={() => goTab('fornitori')}>
            Fornitori →
          </button>
        </div>
      </div>

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
          <span className="cb-lbl">Pipeline {nextDrop ? nextDrop.nome : 'drop'}</span>
          <ProgressRing value={fasiPct} size={62} stroke={4} />
          <span className="cb-val">{fasiDone}/{nextFasi.length} fasi</span>
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
          <span className="cb-lbl">Qualità campioni</span>
          <ProgressRing value={pctApprovati} size={62} stroke={4} />
          <span className="cb-val">{mediaCampioni ? `media ${mediaCampioni.toFixed(1)}★` : '—'}</span>
        </div>
      </div>

      <PanelHead title="Da fare adesso" desc="Alert automatici, cliccabili: fasi in scadenza, tech pack in attesa, campioni da valutare." />
      {alerts.length ? (
        alerts.map((a, i) => (
          <div
            className={`alert-item clickable${a.red ? ' red' : ''}`}
            key={i}
            onClick={() => goTab(a.tab)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                goTab(a.tab)
              }
            }}
          >
            <span className="code">{a.code}</span>
            <span>{a.txt}</span>
            <span className="alert-go">→</span>
          </div>
        ))
      ) : (
        <EmptyState icon="star" text="Nessun alert. Tutto sotto controllo." />
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
