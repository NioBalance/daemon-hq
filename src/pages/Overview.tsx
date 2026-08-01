import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { ErrorState } from '../components/QueryState'
import { ProgressRing, Sparkline, MiniBars } from '../components/ChartBits'
import KpiCard from '../components/ui-v2/KpiCard'
import { useLinks, useCreateLink, useUpdateLink } from '../features/links/queries'
import { uploadMediaFile, deleteMediaFile } from '../lib/upload'
import { useSignedUrl } from '../lib/useSignedUrl'
import { useDrops, useDropFasi, useUpdateFase } from '../features/drops/queries'
import { useArticoli, useArticoloTasks, useToggleTask } from '../features/articoli/queries'
import { useMemos, useCreateMemo } from '../features/memos/queries'
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
import { useTheme } from '../lib/useTheme'

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
  const { theme } = useTheme()
  const [glFailed, setGlFailed] = useState(false)
  const [glOk] = useState(webglAvailable)
  const onFallback = useCallback(() => setGlFailed(true), [])
  if (!glOk || reduce || glFailed) return <DaemonCore size={116} />
  return (
    <Suspense fallback={<DaemonCore size={116} />}>
      <DaemonCoreGL size={116} theme={theme} onFallback={onFallback} />
    </Suspense>
  )
}
import { useAuth } from '../auth/useAuth'
import { useToast } from '../lib/useToast'
import { useFormDraft } from '../lib/useFormDraft'
import { fmtDate, todayIso, addDaysIso, daysUntil, localDateIso, timeAgo, formatDelta } from '../lib/format'
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

/** Sezione dell'Overview: eyebrow + steel divider, entrata staggerata
 *  (stesso pattern LazyMotion-strict di App.tsx, guardia reduced-motion). */
function OvSection({ title, index, children }: { title: string; index: number; children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <m.section
      className="ov-sec"
      aria-label={title}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.09 * index, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="ov-sec-head">
        <span className="text-nav-label ov-sec-title">{title}</span>
        <span className="ov-sec-line" aria-hidden />
      </div>
      {children}
    </m.section>
  )
}

/** Iframe del negozio renderizzato alla larghezza reale del viewport scelto
 *  (desktop 1280 / mobile 390) e scalato via transform per stare nella
 *  finestra: la preview è il sito VERO in miniatura, non un embed schiacciato. */
function ScaledFrame({ url, frameWidth, ratio, title }: { url: string; frameWidth: number; ratio: number; title: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(0)
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / frameWidth))
    ro.observe(el)
    setScale(el.clientWidth / frameWidth)
    return () => ro.disconnect()
  }, [frameWidth])
  return (
    <div className="shop-win-view" ref={hostRef} style={{ aspectRatio: `${1 / ratio}` }}>
      {scale > 0 && (
        <iframe
          src={url}
          title={title}
          style={{
            width: frameWidth,
            height: Math.round(frameWidth * ratio),
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
            border: 'none',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}

const SHOP_LABEL_RE = /negozio|shop|store|sito/i

/** Righe `links` che ospitano i path storage degli screenshot del negozio
 *  (fallback quando il sito blocca l'iframe, es. password page). */
const SHOP_SHOT_LABELS = { desktop: 'Negozio screenshot desktop', mobile: 'Negozio screenshot mobile' } as const
type ShotKind = keyof typeof SHOP_SHOT_LABELS

/** Bottoni "nascosti" della finestra negozio (visibili solo all'hover della
 *  barra: chi guarda lo schermo non li vede): carica/sostituisci screenshot
 *  e, se presente, rimuovi per tornare alla preview live. */
function ShopShotBtn({ has, onFile, onClear }: { has: boolean; onFile: (f: File) => void; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  return (
    <span className="shop-shot-btns">
      <button
        type="button"
        className="shop-shot-btn"
        title={has ? 'Sostituisci lo screenshot' : 'Carica uno screenshot al posto della preview live'}
        aria-label="Carica screenshot del negozio"
        onClick={() => inputRef.current?.click()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
          <circle cx="12" cy="13" r="3.2" />
        </svg>
      </button>
      {has && (
        <button
          type="button"
          className="shop-shot-btn"
          title="Rimuovi lo screenshot (torna la preview live)"
          aria-label="Rimuovi screenshot"
          onClick={onClear}
        >
          ✕
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onFile(f)
        }}
      />
    </span>
  )
}

/** Sparkline di sfondo delle tile Insights: area + linea in currentColor,
 *  niente assi né dot — è atmosfera dietro il numero, non un grafico. */
function TileSpark({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const vals = values.slice(-12)
  const min = Math.min(...vals)
  const span = Math.max(...vals) - min || 1
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${29 - ((v - min) / span) * 24}`)
  return (
    <svg className="ins-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden>
      <polygon points={`0,32 ${pts.join(' ')} 100,32`} fill="currentColor" opacity="0.09" />
      <polyline points={pts.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.5" />
    </svg>
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
  const linksQ = useLinks()
  const createLink = useCreateLink()
  const updateLink = useUpdateLink()
  const memosQ = useMemos()
  const createMemo = useCreateMemo()
  const toggleTask = useToggleTask()
  const reduceMotion = useReducedMotion()

  // finestra Note: quick-add firmato direttamente dall'Overview
  const [noteTxt, setNoteTxt] = useState('')
  async function addQuickNote(e: FormEvent) {
    e.preventDefault()
    const testo = noteTxt.trim()
    if (!testo || !profile) return
    try {
      await createMemo.mutateAsync({ author_id: profile.id, author_name: profile.nome, testo, colore: null })
      setNoteTxt('')
      showToast('success', 'Nota pubblicata.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function completaTask(id: string) {
    toggleTask.mutate(
      { id, done: true },
      {
        onSuccess: () => showToast('success', 'Task completato.'),
        onError: (err) => showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.'),
      },
    )
  }

  // Preview negozio: stessa idea dell'embed Calendario — la config vive in una
  // riga `links` (match sulla label), salvata a runtime coi mutation hook.
  const shopLink =
    (linksQ.data ?? []).find(
      (l) => SHOP_LABEL_RE.test(l.label) && !Object.values(SHOP_SHOT_LABELS).includes(l.label as never) && l.url,
    ) ??
    (linksQ.data ?? []).find(
      (l) => SHOP_LABEL_RE.test(l.label) && !Object.values(SHOP_SHOT_LABELS).includes(l.label as never),
    )
  const [shopUrlInput, setShopUrlInput] = useState('')
  const shopSaving = createLink.isPending || updateLink.isPending

  // Screenshot del negozio: path storage in righe links dedicate; se presente
  // vince sull'iframe (che con una password page mostra solo un errore).
  const shotLinkOf = (kind: ShotKind) => (linksQ.data ?? []).find((l) => l.label === SHOP_SHOT_LABELS[kind])
  const shotDesktopUrl = useSignedUrl(shotLinkOf('desktop')?.url)
  const shotMobileUrl = useSignedUrl(shotLinkOf('mobile')?.url)

  async function saveShopShot(kind: ShotKind, file: File) {
    const { path, error } = await uploadMediaFile(file, 'shop')
    if (!path) {
      showToast('error', error ?? 'Upload non riuscito.')
      return
    }
    const existing = shotLinkOf(kind)
    try {
      if (existing) {
        const old = existing.url
        await updateLink.mutateAsync({ id: existing.id, patch: { url: path } })
        if (old && old !== path) void deleteMediaFile(old)
      } else {
        await createLink.mutateAsync({ label: SHOP_SHOT_LABELS[kind], url: path, ordine: 100 })
      }
      showToast('success', 'Screenshot del negozio caricato.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function clearShopShot(kind: ShotKind) {
    const existing = shotLinkOf(kind)
    if (!existing?.url) return
    try {
      const old = existing.url
      await updateLink.mutateAsync({ id: existing.id, patch: { url: null } })
      void deleteMediaFile(old)
      showToast('success', 'Screenshot rimosso — torna la preview live.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Operazione non riuscita.')
    }
  }

  async function saveShopUrl(e: FormEvent) {
    e.preventDefault()
    let url = shopUrlInput.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    try {
      new URL(url)
    } catch {
      showToast('error', 'URL non valido.')
      return
    }
    try {
      if (shopLink) await updateLink.mutateAsync({ id: shopLink.id, patch: { url } })
      else await createLink.mutateAsync({ label: 'Negozio online', url, ordine: 99 })
      setShopUrlInput('')
      showToast('success', 'Preview del negozio configurata.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

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
        <div className="ins-band" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <div className="skeleton" key={i} style={{ height: 88, borderRadius: 'var(--radius-card)' }} />
          ))}
        </div>
        <div className="ov-skel-band">
          {Array.from({ length: 5 }, (_, i) => (
            <div className="skeleton" key={i} style={{ height: 128, borderRadius: 'var(--radius-card)' }} />
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

      <div className="ins-head">
        <span className="lt-live">
          <span className="lt-dot" aria-hidden /> LIVE
        </span>
        <span className="ins-title">Insights</span>
        <button className="tlink ins-cta" onClick={() => openKpi()}>
          Aggiorna KPI →
        </button>
      </div>
      <div className="ins-band">
        {KPI_METRICHE.map((met, i) => {
          const series = kpiSeries.get(met.value) ?? []
          const latest = series[series.length - 1] ?? null
          const prev = series[series.length - 2] ?? null
          const delta = latest && prev && prev.valore !== 0 ? (latest.valore - prev.valore) / prev.valore : null
          return (
            <m.button
              key={met.value}
              className={`ins-tile${met.value === 'pacchi_drop' ? ' hot' : ''}`}
              aria-label={`${met.label}: ${latest ? latest.valore.toLocaleString('it-IT') : 'nessun dato'} — aggiorna`}
              onClick={() => openKpi(met.value)}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
            >
              <TileSpark values={series.map((s) => s.valore)} />
              <span className="ins-tile-head">
                <span className="ins-icon">{ICONS[TICKER_ICON[met.value]]}</span>
                <span className="ins-lbl">{met.label}</span>
              </span>
              <span className="ins-val">
                {latest ? <CountNum value={latest.valore} /> : '—'}
                {latest && met.unit ? <span className="ins-unit">{met.unit}</span> : null}
              </span>
              <span className="ins-delta">{delta !== null ? `${formatDelta(delta)} vs prec.` : 'primo snapshot'}</span>
            </m.button>
          )
        })}
      </div>

      <div className="ov-hero">
        <aside className="ov-win" aria-label="To do">
          <div className="ov-win-head">
            <span className="ov-win-icon" aria-hidden>{ICONS.oggi}</span>
            <span className="ov-win-title">To do</span>
            <span className="ov-win-count">{taskAperti} apert{taskAperti === 1 ? 'o' : 'i'}</span>
            <button className="tlink ov-win-link" onClick={() => goTab('oggi')}>
              Oggi →
            </button>
          </div>
          {taskAperti ? (
            <ul className="ov-win-list">
              {tasksList
                .filter((t) => !t.done)
                .slice(0, 5)
                .map((t) => (
                  <li className="ov-todo-row" key={t.id}>
                    <input
                      type="checkbox"
                      className="now-check"
                      aria-label={`Completa: ${t.testo}`}
                      disabled={toggleTask.isPending}
                      onChange={() => completaTask(t.id)}
                    />
                    <span className="ov-todo-txt">
                      {t.testo}
                      <span className="ov-todo-tag">
                        {(articoli.data ?? []).find((a) => a.id === t.articolo_id)?.nome ?? ''}
                      </span>
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="ov-win-empty">Tutto fatto. Niente in coda.</p>
          )}
        </aside>

        <button className="ov-core" onClick={openAssist} aria-label="Apri l'assistente DÆMON">
          <SmartCore />
          <span className="ov-core-cap">DÆMON — CHIEDI DOVE</span>
        </button>

        <aside className="ov-win" aria-label="Note del team">
          <div className="ov-win-head">
            <span className="ov-win-icon" aria-hidden>{ICONS.notes}</span>
            <span className="ov-win-title">Note team</span>
            <button className="tlink ov-win-link" onClick={() => goTab('notes')}>
              Note →
            </button>
          </div>
          <ul className="ov-win-list">
            {[...(memosQ.data ?? [])]
              .sort((a, b) => Number(b.pin) - Number(a.pin))
              .slice(0, 3)
              .map((memo) => (
                <li className="ov-note-row" key={memo.id}>
                  {memo.pin && <span className="ov-note-pin" aria-hidden>★</span>}
                  <strong>{memo.author_name}</strong> {memo.testo}
                </li>
              ))}
            {!(memosQ.data ?? []).length && <li className="ov-win-empty">Ancora nessuna nota.</li>}
          </ul>
          <form className="ov-note-add" onSubmit={addQuickNote}>
            <input
              value={noteTxt}
              onChange={(e) => setNoteTxt(e.target.value)}
              placeholder="Scrivi una nota al team…"
              aria-label="Nuova nota"
            />
            <button type="submit" disabled={!noteTxt.trim() || createMemo.isPending} aria-label="Pubblica nota">
              +
            </button>
          </form>
        </aside>
      </div>

      <OvSection title="Stato produzione" index={0}>
        <div className="ov-kpi-grid">
          <KpiCard
            label="Prossimo drop"
            icon={ICONS.dropx}
            tone={days !== null && days <= 14 ? 'urgent' : undefined}
            value={days !== null ? <CountNum value={days} /> : '—'}
            meta={nextDrop ? `${nextDrop.nome} · ${fasiDone}/${nextFasi.length} fasi` : 'Nessun drop pianificato'}
            ctaLabel="Timeline"
            onOpen={() => goTab('drops')}
            progress={nextFasi.length ? fasiDone / nextFasi.length : undefined}
          />
          <KpiCard
            label="Campioni"
            icon={ICONS.samples}
            tone={campioniInReview > 0 ? 'warn' : undefined}
            value={<CountNum value={campioniInReview} />}
            meta={`in review${mediaCampioni ? ` · media ${mediaCampioni.toFixed(1)}★` : ''}`}
            ctaLabel="Campioni"
            onOpen={() => goTab('samples')}
          />
          <KpiCard
            label="Tech pack"
            icon={ICONS.techpack}
            tone={tpConti.inviato > 0 ? 'warn' : undefined}
            value={<CountNum value={tpConti.inviato} />}
            meta={`in attesa fornitore · ${tpConti.confermato + tpConti.produzione} confermati`}
            ctaLabel="Tech Pack"
            onOpen={() => goTab('techpack')}
          />
          <KpiCard
            label="Task aperti"
            icon={ICONS.oggi}
            tone={taskAperti > 0 ? 'urgent' : 'ok'}
            value={<CountNum value={taskAperti} />}
            meta={`su ${tasksList.length} totali, articoli`}
            ctaLabel="Oggi"
            onOpen={() => goTab('oggi')}
          />
          <KpiCard
            label="Fornitori attivi"
            icon={ICONS.fornitori}
            tone="ok"
            value={<CountNum value={fornitoriAttivi.length} />}
            meta={`${fornitoriBackup} backup attivi`}
            ctaLabel="Fornitori"
            onOpen={() => goTab('fornitori')}
          />
        </div>
      </OvSection>

      <OvSection title="Andamento" index={1}>
        <div className="chart-band glass-surface">
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
      </OvSection>

      <OvSection title="Negozio online" index={2}>
        {shopLink?.url ? (
          <div className="shop-windows">
            <div className="shop-win glass-surface">
              <div className="shop-win-bar">
                <span className="shop-dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                <span className="shop-url">{new URL(shopLink.url).host}</span>
                <ShopShotBtn
                  has={!!shotDesktopUrl}
                  onFile={(f) => void saveShopShot('desktop', f)}
                  onClear={() => void clearShopShot('desktop')}
                />
                <a className="tlink" href={shopLink.url} target="_blank" rel="noopener">
                  Apri ↗
                </a>
              </div>
              {shotDesktopUrl ? (
                <div className="shop-win-view">
                  <img className="shop-shot-img" src={shotDesktopUrl} alt="Screenshot del negozio — desktop" />
                </div>
              ) : (
                <ScaledFrame url={shopLink.url} frameWidth={1280} ratio={0.62} title="Negozio — desktop" />
              )}
            </div>
            <div className="shop-win glass-surface shop-win-mobile">
              <div className="shop-win-bar">
                <span className="shop-dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                <span className="shop-url">mobile</span>
                <ShopShotBtn
                  has={!!shotMobileUrl}
                  onFile={(f) => void saveShopShot('mobile', f)}
                  onClear={() => void clearShopShot('mobile')}
                />
              </div>
              {shotMobileUrl ? (
                <div className="shop-win-view">
                  <img className="shop-shot-img" src={shotMobileUrl} alt="Screenshot del negozio — mobile" />
                </div>
              ) : (
                <ScaledFrame url={shopLink.url} frameWidth={390} ratio={1.9} title="Negozio — mobile" />
              )}
            </div>
          </div>
        ) : (
          <form className="shop-config" onSubmit={saveShopUrl}>
            <p className="shop-config-hint">
              Incolla l'URL del negozio per vederlo qui in due finestre live (desktop e mobile). Se il sito
              blocca l'embed, resta comunque il link «Apri ↗».
            </p>
            <div className="shop-config-row">
              <input
                value={shopUrlInput}
                onChange={(e) => setShopUrlInput(e.target.value)}
                placeholder="https://…"
                aria-label="URL del negozio online"
              />
              <button className="btn" type="submit" disabled={shopSaving || !shopUrlInput.trim()}>
                {shopSaving ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        )}
      </OvSection>

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
        <OvSection title="Operativo" index={3}>
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
        </OvSection>
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
