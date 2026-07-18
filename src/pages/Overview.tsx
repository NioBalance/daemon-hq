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
import { fmtDate, todayIso, addDaysIso, daysUntil } from '../lib/format'
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

function Delta({ pct }: { pct: number | null }) {
  if (pct === null || !isFinite(pct)) return null
  const up = pct >= 0
  return (
    <span className={`delta ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
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
  const articoliList = articoli.data ?? []
  const tasksList = tasks.data ?? []
  const designsList = designs.data ?? []
  const techpacksList = techpacks.data ?? []
  const samplesList = samples.data ?? []
  const fornitoriList = fornitori.data ?? []
  const activityList = activityQ.data ?? []
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

  const dropArticoli = nextDrop ? articoliList.filter((a) => a.drop_id === nextDrop.id) : []
  const dropArticoliIds = new Set(dropArticoli.map((a) => a.id))
  const dropTasks = tasksList.filter((t) => dropArticoliIds.has(t.articolo_id))
  const dropTasksDone = dropTasks.filter((t) => t.done).length
  const prontiPct = dropTasks.length ? dropTasksDone / dropTasks.length : 0

  const scored = samplesList
    .map((s) => [s.fit, s.tessuto, s.cuciture, s.colore].filter((n): n is number => n != null))
    .filter((a) => a.length > 0)
  const mediaCampioni = scored.length
    ? scored.reduce((sum, a) => sum + a.reduce((x, y) => x + y, 0) / a.length, 0) / scored.length
    : 0
  const pctApprovati = samplesList.length
    ? samplesList.filter((s) => s.verdetto === 'approvato').length / samplesList.length
    : 0
  const verdettoBars = [
    { label: 'In review', value: samplesList.filter((s) => s.verdetto === 'in-review').length, color: 'var(--amber)' },
    { label: 'Approvati', value: samplesList.filter((s) => s.verdetto === 'approvato').length, color: 'var(--ok)' },
    { label: 'Da rivedere', value: samplesList.filter((s) => s.verdetto === 'revisione').length, color: 'var(--steel)' },
    { label: 'Scartati', value: samplesList.filter((s) => s.verdetto === 'scartato').length, color: 'var(--ember)' },
  ]

  const tpConti = {
    bozza: techpacksList.filter((t) => t.stato === 'bozza').length,
    inviato: techpacksList.filter((t) => t.stato === 'inviato').length,
    confermato: techpacksList.filter((t) => t.stato === 'confermato').length,
    produzione: techpacksList.filter((t) => t.stato === 'in-produzione').length,
  }

  const weekAgoIso = addDaysIso(todayStr, -6)
  const attivita7g = activityList.filter((a) => a.created_at.slice(0, 10) >= weekAgoIso)
  const giorniBars = Array.from({ length: 7 }, (_, i) => {
    const day = addDaysIso(weekAgoIso, i)
    return {
      label: day.slice(8),
      value: attivita7g.filter((a) => a.created_at.slice(0, 10) === day).length,
      color: 'var(--ember)',
    }
  })

  // --- KPI esterni (kpi_snapshots) ---
  const kpiSeries = new Map<KpiMetrica, KpiSnapshot[]>()
  for (const snap of kpiList) {
    kpiSeries.set(snap.metrica, [...(kpiSeries.get(snap.metrica) ?? []), snap])
  }
  const kpiDelta = (series: KpiSnapshot[]): number | null => {
    const latest = series[series.length - 1]
    if (!latest) return null
    const prev = [...series].reverse().find((s) => s.data <= addDaysIso(latest.data, -28))
    if (!prev || prev.valore === 0) return null
    return ((latest.valore - prev.valore) / prev.valore) * 100
  }

  // --- Ticker ---
  const tickerItems: { label: string; value: string; delta?: number | null }[] = [
    { label: 'Prossimo drop', value: days !== null ? `T−${days}g` : '—' },
    { label: 'Fasi drop', value: `${Math.round(fasiPct * 100)}%` },
    { label: 'Articoli pronti', value: `${Math.round(prontiPct * 100)}%` },
    { label: 'Qualità campioni', value: mediaCampioni ? mediaCampioni.toFixed(1) : '—' },
    { label: 'Campioni ok', value: `${Math.round(pctApprovati * 100)}%` },
    { label: 'TP confermati', value: String(tpConti.confermato + tpConti.produzione) },
    { label: 'Attività 7g', value: String(attivita7g.length) },
    { label: 'Articoli', value: String(articoliList.length) },
    { label: 'Design pipeline', value: String(designsList.length) },
    { label: 'Fornitori attivi', value: String(fornitoriList.filter((f) => f.stato === 'attivo').length) },
    ...KPI_METRICHE.map((m) => {
      const series = kpiSeries.get(m.value) ?? []
      const latest = series[series.length - 1]
      return {
        label: m.label,
        value: latest ? `${latest.valore.toLocaleString('it-IT')}${m.unit ? ` ${m.unit}` : ''}` : '—',
        delta: kpiDelta(series),
      }
    }),
  ]

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
      <div className="kpi-ticker">
        <div className="kpi-ticker-track">
          {[0, 1].map((dup) =>
            tickerItems.map((it, i) => (
              <span className="kpi-tick" key={`${dup}-${i}`}>
                <span className="lbl">{it.label}</span>
                <span className="val">{it.value}</span>
                {it.delta !== undefined && <Delta pct={it.delta ?? null} />}
              </span>
            )),
          )}
        </div>
      </div>

      <div className="kpi-computed">
        <div className="card kpi-block">
          <span className="lbl">Prossimo drop</span>
          <div className="kpi-big hot">{days !== null ? <CountNum value={days} /> : '—'}</div>
          <span className="lbl">{nextDrop?.nome ?? 'Nessun drop pianificato'}{days !== null ? ' · giorni' : ''}</span>
          <div className="row" style={{ marginTop: 10, gap: 12 }}>
            <ProgressRing value={fasiPct} size={64} />
            <span className="card-meta">
              {fasiDone}/{nextFasi.length} fasi
              <br />
              completate
            </span>
          </div>
        </div>

        <div className="card kpi-block">
          <span className="lbl">Articoli pronti — drop attivo</span>
          <div className="row" style={{ marginTop: 10, gap: 12 }}>
            <ProgressRing value={prontiPct} size={72} />
            <span className="card-meta">
              {dropTasksDone}/{dropTasks.length} task completate su {dropArticoli.length} articoli
            </span>
          </div>
        </div>

        <div className="card kpi-block">
          <span className="lbl">Qualità campioni</span>
          <div className="kpi-big">
            {mediaCampioni ? <CountNum value={mediaCampioni} decimals={1} /> : '—'}
            <span className="kpi-big-sub"> / 5 · {Math.round(pctApprovati * 100)}% approvati</span>
          </div>
          <MiniBars data={verdettoBars} />
        </div>

        <div className="card kpi-block">
          <span className="lbl">Tech pack per stato</span>
          <div className="row" style={{ margin: '10px 0' }}>
            <span className="badge steel">Bozza {tpConti.bozza}</span>
            <span className="badge amber">Inviati {tpConti.inviato}</span>
            <span className="badge ok">Confermati {tpConti.confermato}</span>
            <span className="badge ember">In produzione {tpConti.produzione}</span>
          </div>
          <MiniBars
            data={[
              { label: 'Bozza', value: tpConti.bozza, color: 'var(--steel)' },
              { label: 'Inviati', value: tpConti.inviato, color: 'var(--amber)' },
              { label: 'Confermati', value: tpConti.confermato, color: 'var(--ok)' },
              { label: 'Produzione', value: tpConti.produzione, color: 'var(--ember)' },
            ]}
          />
        </div>

        <div className="card kpi-block">
          <span className="lbl">Attività team — 7 giorni</span>
          <div className="kpi-big">
            <CountNum value={attivita7g.length} />
            <span className="kpi-big-sub"> azioni</span>
          </div>
          {activityQ.isError ? (
            <p className="widgets-empty">Esegui la migration 0006_fase5.sql per attivare il log.</p>
          ) : (
            <MiniBars data={giorniBars} />
          )}
        </div>
      </div>

      <PanelHead
        title="KPI esterni"
        desc="Follower, ordini, pacchi, waitlist e revenue: inseriti a mano, tracciati nel tempo. Delta calcolato sul valore di ~un mese prima."
        actions={
          <button className="btn" onClick={() => openKpi()}>
            Aggiorna KPI
          </button>
        }
      />
      {kpiQ.isError ? (
        <div className="empty">
          KPI non disponibili — esegui la migration 0006_fase5.sql su Supabase, poi ricarica.
        </div>
      ) : (
        <div className="kpi-grid">
          {KPI_METRICHE.map((m) => {
            const series = kpiSeries.get(m.value) ?? []
            const latest = series[series.length - 1]
            if (!latest) {
              return (
                <div className="card kpi-block kpi-empty" key={m.value}>
                  <span className="lbl">{m.label}</span>
                  <p className="card-meta" style={{ margin: '10px 0' }}>
                    Nessun dato ancora.
                  </p>
                  <button className="btn sm ghost" onClick={() => openKpi(m.value)}>
                    Inserisci il primo valore
                  </button>
                </div>
              )
            }
            return (
              <div className="card kpi-block" key={m.value}>
                <span className="lbl">{m.label}</span>
                <div className="kpi-big">
                  <CountNum value={latest.valore} />
                  {m.unit && <span className="kpi-big-sub"> {m.unit}</span>}{' '}
                  <Delta pct={kpiDelta(series)} />
                </div>
                <Sparkline data={series.map((s) => s.valore)} />
                <span className="code" style={{ marginTop: 6 }}>
                  AGG. {fmtDate(latest.data)} · {latest.inserito_da}
                </span>
              </div>
            )
          })}
        </div>
      )}

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
