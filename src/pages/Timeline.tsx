import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
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
import { fmtDate, daysUntil } from '../lib/format'

export default function Timeline() {
  const { data: drops, isLoading, isError, error, refetch } = useDrops()
  const { data: fasi } = useDropFasi()
  const createDrop = useCreateDrop()
  const updateDrop = useUpdateDrop()
  const deleteDrop = useDeleteDrop()
  const addFase = useAddFase()
  const updateFase = useUpdateFase()
  const deleteFase = useDeleteFase()

  const [dropModal, setDropModal] = useState<'none' | 'create' | 'edit'>('none')
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null)
  const [dropValues, setDropValues] = useState<FormValues>(DROP_EMPTY_VALUES)
  const [dropError, setDropError] = useState<string | null>(null)

  const [faseModal, setFaseModal] = useState<{ dropId: string; fase: DropFase | null } | null>(null)
  const [faseValues, setFaseValues] = useState<FormValues>({ nome: '', data: '' })
  const [faseError, setFaseError] = useState<string | null>(null)

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
      } else {
        await createDrop.mutateAsync({ ...patch, withTemplate: dropValues.template !== 'no' })
      }
      setDropModal('none')
    } catch (err) {
      setDropError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function handleDeleteDrop(d: Drop) {
    if (!window.confirm('Eliminare definitivamente?')) return
    await deleteDrop.mutateAsync(d.id)
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

      {isLoading && <Loading label="Caricamento timeline…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          {sortedDrops.map((d) => {
            const dropFasi = (fasi ?? []).filter((f) => f.drop_id === d.id)
            const done = dropFasi.filter((f) => f.done).length
            const tot = dropFasi.length
            const days = d.data_lancio ? daysUntil(d.data_lancio) : null
            return (
              <div className="drop-card" key={d.id}>
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
          {sortedDrops.length === 0 && <div className="empty">Nessun drop pianificato.</div>}
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
