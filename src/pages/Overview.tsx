import PanelHead from '../components/PanelHead'
import { Loading, ErrorState } from '../components/QueryState'
import { useDrops, useDropFasi } from '../features/drops/queries'
import { useArticoli, useArticoloTasks } from '../features/articoli/queries'
import { useDesigns } from '../features/designs/queries'
import { useTechpacks } from '../features/techpacks/queries'
import { useSamples } from '../features/samples/queries'
import { useFornitori } from '../features/fornitori/queries'
import { fmtDate, todayIso, addDaysIso, daysUntil } from '../lib/format'

interface Alert {
  red: boolean
  code: string
  txt: string
}

export default function Overview() {
  const drops = useDrops()
  const fasi = useDropFasi()
  const articoli = useArticoli()
  const tasks = useArticoloTasks()
  const designs = useDesigns()
  const techpacks = useTechpacks()
  const samples = useSamples()
  const fornitori = useFornitori()

  const queries = [drops, fasi, articoli, tasks, designs, techpacks, samples, fornitori]
  const isLoading = queries.some((q) => q.isLoading)
  const firstError = queries.find((q) => q.isError)

  function retryAll() {
    queries.forEach((q) => q.refetch())
  }

  if (isLoading) {
    return (
      <>
        <PanelHead title="Overview" desc="Statistiche di produzione e alert automatici." />
        <Loading label="Caricamento overview…" />
      </>
    )
  }

  if (firstError) {
    return (
      <>
        <PanelHead title="Overview" desc="Statistiche di produzione e alert automatici." />
        <ErrorState message={(firstError.error as Error).message} onRetry={retryAll} />
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

  const todayStr = todayIso()
  const soonStr = addDaysIso(todayStr, 7)

  const tpConfermati = techpacksList.filter((t) => t.stato === 'confermato' || t.stato === 'in-produzione').length
  const smpAperti = samplesList.filter((s) => s.verdetto === 'in-review' || s.verdetto === 'revisione').length
  const openTasks = tasksList.filter((t) => !t.done).length
  const fornitoriAttivi = fornitoriList.filter((f) => f.stato === 'attivo').length
  const designApprovati = designsList.filter((d) => d.fase === 'approvato').length

  const nextDrop = [...dropList]
    .filter((d) => d.data_lancio)
    .sort((a, b) => (a.data_lancio as string).localeCompare(b.data_lancio as string))
    .find((d) => (d.data_lancio as string) >= todayStr)
  const days = nextDrop ? daysUntil(nextDrop.data_lancio as string) : null
  const dropName = nextDrop?.nome ?? 'Nessun drop pianificato'

  const alerts: Alert[] = []

  fasiList.forEach((f) => {
    if (f.done || !f.data) return
    const drop = dropList.find((d) => d.id === f.drop_id)
    if (!drop) return
    if (f.data < todayStr) {
      alerts.push({ red: true, code: 'SCADUTA', txt: `${drop.nome} → «${f.nome}» era prevista per il ${fmtDate(f.data)}` })
    } else if (f.data <= soonStr) {
      alerts.push({ red: false, code: '7 GIORNI', txt: `${drop.nome} → «${f.nome}» in scadenza il ${fmtDate(f.data)}` })
    }
  })

  techpacksList
    .filter((t) => t.stato === 'inviato')
    .forEach((t) => {
      const fornNome = fornitoriList.find((f) => f.id === t.fornitore_id)?.nome ?? '—'
      alerts.push({ red: false, code: 'ATTESA', txt: `Tech pack «${t.nome}» inviato a ${fornNome} — in attesa di conferma` })
    })

  samplesList
    .filter((s) => s.verdetto === 'in-review')
    .forEach((s) => {
      alerts.push({ red: false, code: 'REVIEW', txt: `Campione «${s.nome}» da valutare` })
    })

  return (
    <>
      <div className="stats">
        <div className="stat hot">
          <div className="lbl">Prossimo drop</div>
          <div className="num">{days ?? '—'}</div>
          <div className="lbl">
            {dropName}
            {typeof days === 'number' ? ' · giorni' : ''}
          </div>
        </div>
        <div className="stat">
          <div className="lbl">Articoli</div>
          <div className="num">{articoliList.length}</div>
          <div className="lbl">{openTasks} task aperte</div>
        </div>
        <div className="stat">
          <div className="lbl">Design in pipeline</div>
          <div className="num">{designsList.length}</div>
          <div className="lbl">{designApprovati} approvati</div>
        </div>
        <div className="stat">
          <div className="lbl">Tech pack</div>
          <div className="num">{techpacksList.length}</div>
          <div className="lbl">{tpConfermati} confermati</div>
        </div>
        <div className="stat">
          <div className="lbl">Campioni aperti</div>
          <div className="num">{smpAperti}</div>
          <div className="lbl">su {samplesList.length} totali</div>
        </div>
        <div className="stat">
          <div className="lbl">Fornitori attivi</div>
          <div className="num">{fornitoriAttivi}</div>
          <div className="lbl">su {fornitoriList.length} in scheda</div>
        </div>
      </div>

      <PanelHead title="Da fare adesso" desc="Alert automatici: fasi in scadenza, tech pack in attesa, campioni da valutare." />
      {alerts.length ? (
        alerts.map((a, i) => (
          <div className={`alert-item${a.red ? ' red' : ''}`} key={i}>
            <span className="code">{a.code}</span>
            <span>{a.txt}</span>
          </div>
        ))
      ) : (
        <div className="empty">Nessun alert. Tutto sotto controllo.</div>
      )}
    </>
  )
}
