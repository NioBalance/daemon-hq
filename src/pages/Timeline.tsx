import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import OwnerBadge from '../components/OwnerBadge'
import {
  useDrops,
  useCreateDrop,
  useUpdateDrop,
  useDeleteDrop,
  useDropFasi,
  useAddFase,
  useUpdateFase,
  useDeleteFase,
  type Drop,
  type DropFase,
} from '../features/drops/queries'
import { dropFields, DROP_EMPTY_VALUES, faseFields } from '../features/drops/formFields'
import { fmtDate, daysUntil, addDaysIso } from '../lib/format'
import { useToast } from '../lib/useToast'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction } from '../lib/navigation'

export default function Timeline() {
  const { data: drops, isLoading, isError, error, refetch } = useDrops()
  const { data: fasi } = useDropFasi()
  const createDrop = useCreateDrop()
  const updateDrop = useUpdateDrop()
  const deleteDrop = useDeleteDrop()
  const addFase = useAddFase()
  const updateFase = useUpdateFase()
  const deleteFase = useDeleteFase()
  const showToast = useToast()
  const logActivity = useActivityLogger()

  const [view, setView] = useState<'drop' | 'anno'>('drop')
  const [year, setYear] = useState(new Date().getFullYear())
  const [dropModal, setDropModal] = useState<'none' | 'create' | 'edit'>('none')
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null)
  const [dropValues, setDropValues] = useState<FormValues>(DROP_EMPTY_VALUES)
  const [dropError, setDropError] = useState<string | null>(null)

  const [faseModal, setFaseModal] = useState<{ dropId: string; fase: DropFase | null } | null>(null)
  const [faseValues, setFaseValues] = useState<FormValues>({ nome: '', data: '' })
  const [faseError, setFaseError] = useState<string | null>(null)
  const dropDraft = useFormDraft(`drop:${editingDrop?.id ?? 'new'}`, dropModal !== 'none', dropValues, setDropValues)
  const faseDraft = useFormDraft(`fase:${faseModal?.fase?.id ?? 'new'}`, faseModal !== null, faseValues, setFaseValues)

  useRegisterNewAction(openCreateDrop)

  function openCreateDrop() {
    setDropValues(DROP_EMPTY_VALUES)
    setDropError(null)
    setEditingDrop(null)
    setDropModal('create')
  }

  function openEditDrop(d: Drop) {
    setDropValues({ nome: d.nome, data_lancio: d.data_lancio ?? '', owner: d.owner ?? 'logistica', note: d.note ?? '' })
    setDropError(null)
    setEditingDrop(d)
    setDropModal('edit')
  }

  async function handleDropSubmit(e: FormEvent) {
    e.preventDefault()
    const nome = String(dropValues.nome ?? '').trim()
    if (!nome) {
      setDropError('Inserisci il nome del drop.')
      return
    }
    const patch = {
      nome,
      data_lancio: String(dropValues.data_lancio ?? '') || null,
      owner: dropValues.owner as Drop['owner'],
      note: String(dropValues.note ?? '').trim() || null,
    }
    try {
      if (dropModal === 'edit' && editingDrop) {
        await updateDrop.mutateAsync({ id: editingDrop.id, patch })
        showToast('success', 'Drop aggiornato.')
        logActivity('ha aggiornato il drop', `«${nome}»`, 'drops')
      } else {
        await createDrop.mutateAsync({ ...patch, withTemplate: dropValues.template !== 'no' })
        showToast('success', 'Drop creato.')
        logActivity('ha creato il drop', `«${nome}»`, 'drops')
      }
      dropDraft.clear()
      setDropModal('none')
    } catch (err) {
      setDropError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function handleDeleteDrop(d: Drop) {
    if (!window.confirm('Eliminare definitivamente?')) return
    try {
      await deleteDrop.mutateAsync(d.id)
      showToast('success', 'Drop eliminato.')
      logActivity('ha eliminato un drop', 'dalla timeline', 'drops')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
  }

  function openAddFase(dropId: string) {
    setFaseValues({ nome: '', data: '' })
    setFaseError(null)
    setFaseModal({ dropId, fase: null })
  }

  function openEditFase(dropId: string, f: DropFase) {
    setFaseValues({ nome: f.nome, data: f.data ?? '' })
    setFaseError(null)
    setFaseModal({ dropId, fase: f })
  }

  async function handleFaseSubmit(e: FormEvent) {
    e.preventDefault()
    const nome = String(faseValues.nome ?? '').trim()
    if (!nome || !faseModal) {
      setFaseError('Inserisci il nome della fase.')
      return
    }
    const data = String(faseValues.data ?? '') || null
    try {
      if (faseModal.fase) {
        await updateFase.mutateAsync({ id: faseModal.fase.id, patch: { nome, data } })
      } else {
        const dropFasiCount = (fasi ?? []).filter((f) => f.drop_id === faseModal.dropId).length
        await addFase.mutateAsync({ drop_id: faseModal.dropId, nome, data, ordine: dropFasiCount })
      }
      faseDraft.clear()
      setFaseModal(null)
    } catch (err) {
      setFaseError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function handleDeleteFase(f: DropFase) {
    await deleteFase.mutateAsync(f.id)
  }

  async function toggleFase(f: DropFase) {
    await updateFase.mutateAsync({ id: f.id, patch: { done: !f.done } })
  }

  const sortedDrops = [...(drops ?? [])].sort((a, b) => (a.data_lancio ?? '9999').localeCompare(b.data_lancio ?? '9999'))

  function gotoDrop(id: string) {
    setView('drop')
    window.setTimeout(
      () => document.getElementById(`drop-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      80,
    )
  }

  // Vista anno: barre posizionate in percentuale sull'anno selezionato —
  // inizio = prima fase datata (fallback lancio −30gg), fine = data lancio.
  const yearStart = new Date(year, 0, 1).getTime()
  const yearMs = new Date(year + 1, 0, 1).getTime() - yearStart
  const pctOfYear = (iso: string) =>
    Math.max(0, Math.min(100, ((new Date(iso + 'T00:00:00').getTime() - yearStart) / yearMs) * 100))
  const dropsInYear = sortedDrops.filter(
    (d) => d.data_lancio && new Date(d.data_lancio + 'T00:00:00').getFullYear() === year,
  )
  const dropsNoDate = sortedDrops.filter((d) => !d.data_lancio)
  const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

  return (
    <>
      <PanelHead
        title="Timeline Lanci"
        desc="Pipeline operativa per drop: sample → payout 30% → contenuti → store → pre-launch → drop live → saldo 70% e bulk. Buffer produzione +15gg sempre."
        actions={
          <button className="btn" onClick={openCreateDrop}>
            + Nuovo drop
          </button>
        }
      />

      <div className="chips">
        <button className={`chip${view === 'drop' ? ' active' : ''}`} onClick={() => setView('drop')}>
          Drop corrente
        </button>
        <button className={`chip${view === 'anno' ? ' active' : ''}`} onClick={() => setView('anno')}>
          Anno intero
        </button>
      </div>

      {isLoading && <Loading label="Caricamento timeline…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && view === 'anno' && (
        <div className="year-wrap">
          <div className="cal-head">
            <button className="btn sm ghost" onClick={() => setYear((y) => y - 1)}>
              ←
            </button>
            <span className="cal-month">{year}</span>
            <button className="btn sm ghost" onClick={() => setYear((y) => y + 1)}>
              →
            </button>
          </div>
          <div className="year-months">
            {MESI.map((mese) => (
              <div className="year-month" key={mese}>
                {mese}
              </div>
            ))}
          </div>
          {dropsInYear.map((d) => {
            const dropFasi = (fasi ?? []).filter((f) => f.drop_id === d.id)
            const done = dropFasi.filter((f) => f.done).length
            const dated = dropFasi.filter((f) => f.data).map((f) => f.data!)
            const startIso = dated.length ? dated.reduce((a, b) => (a < b ? a : b)) : addDaysIso(d.data_lancio!, -30)
            const left = pctOfYear(startIso)
            const width = Math.max(3, pctOfYear(d.data_lancio!) - left)
            const launched = daysUntil(d.data_lancio!) < 0
            return (
              <div className="year-row" key={d.id}>
                <button
                  className={`year-bar${launched ? ' launched' : ''}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={() => gotoDrop(d.id)}
                  title={`${d.nome} — lancio ${fmtDate(d.data_lancio)} · ${done}/${dropFasi.length} fasi`}
                >
                  {d.nome}
                </button>
              </div>
            )
          })}
          {dropsInYear.length === 0 && <div className="empty">Nessun drop con data lancio nel {year}.</div>}
          {dropsNoDate.length > 0 && (
            <p className="code" style={{ display: 'block', marginTop: 10 }}>
              SENZA DATA: {dropsNoDate.map((d) => d.nome).join(' · ')}
            </p>
          )}
          <div className="legend" style={{ marginTop: 12 }}>
            <span>
              <i style={{ background: 'var(--ember)' }} /> In pipeline
            </span>
            <span>
              <i style={{ background: 'var(--ok)' }} /> Lanciato
            </span>
          </div>
        </div>
      )}

      {!isLoading && !isError && view === 'drop' && (
        <>
          {sortedDrops.map((d) => {
            const dropFasi = (fasi ?? []).filter((f) => f.drop_id === d.id)
            const done = dropFasi.filter((f) => f.done).length
            const tot = dropFasi.length
            const days = d.data_lancio ? daysUntil(d.data_lancio) : null
            return (
              <div className="drop-card" key={d.id} id={`drop-${d.id}`}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div className="card-title" style={{ fontSize: 19, margin: 0 }}>
                      {d.nome}
                    </div>
                    <div className="card-meta">
                      Lancio: {fmtDate(d.data_lancio)}{' '}
                      {days !== null && (
                        <span className="countdown">
                          {days >= 0 ? `T−${days} giorni` : `lanciato da ${Math.abs(days)} giorni`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="row">
                    <OwnerBadge owner={d.owner} />
                    <button className="btn sm ghost" onClick={() => openEditDrop(d)}>
                      Modifica
                    </button>
                    <button className="btn sm ghost" onClick={() => openAddFase(d.id)}>
                      + Fase
                    </button>
                    <button className="btn sm danger" onClick={() => handleDeleteDrop(d)}>
                      ✕
                    </button>
                  </div>
                </div>
                <div className="progressbar">
                  <div className="fill" style={{ width: `${tot ? Math.round((done / tot) * 100) : 0}%` }} />
                </div>
                <div className="phases">
                  {dropFasi.map((f) => (
                    <div className={`phase${f.done ? ' done' : ''}`} key={f.id}>
                      <input type="checkbox" checked={f.done} onChange={() => toggleFase(f)} aria-label="Completa fase" />
                      <span className="pn">{f.nome}</span>
                      <span className="pd">{fmtDate(f.data)}</span>
                      <button className="btn sm ghost" onClick={() => openEditFase(d.id, f)}>
                        ✎
                      </button>
                      <button className="btn sm danger" onClick={() => handleDeleteFase(f)}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {d.note && <div className="note">{d.note}</div>}
              </div>
            )
          })}
          {sortedDrops.length === 0 && <EmptyState icon="calendar" text="Nessun drop pianificato." ctaLabel="+ Nuovo drop" onCta={openCreateDrop} />}
        </>
      )}

      {dropModal !== 'none' && (
        <Modal title={dropModal === 'edit' ? 'Modifica drop' : 'Nuovo drop'} onClose={() => setDropModal('none')}>
          <form onSubmit={handleDropSubmit}>
            <FormFields
              fields={dropFields(dropModal === 'edit')}
              values={dropValues}
              onChange={(k, v) => setDropValues((s) => ({ ...s, [k]: v }))}
            />
            {dropError && <p className="auth-msg err">{dropError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setDropModal('none')}>
                Annulla
              </button>
              <button className="btn" type="submit" disabled={createDrop.isPending || updateDrop.isPending}>
                {createDrop.isPending || updateDrop.isPending ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {faseModal && (
        <Modal title={faseModal.fase ? 'Modifica fase' : 'Nuova fase'} onClose={() => setFaseModal(null)}>
          <form onSubmit={handleFaseSubmit}>
            <FormFields
              fields={faseFields}
              values={faseValues}
              onChange={(k, v) => setFaseValues((s) => ({ ...s, [k]: v }))}
            />
            {faseError && <p className="auth-msg err">{faseError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setFaseModal(null)}>
                Annulla
              </button>
              <button className="btn" type="submit" disabled={addFase.isPending || updateFase.isPending}>
                {addFase.isPending || updateFase.isPending ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
