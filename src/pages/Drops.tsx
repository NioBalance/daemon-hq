import { useState, type FormEvent } from 'react'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import NotesList from '../components/NotesList'
import ArticoloCard from '../components/ArticoloCard'
import PhaseFlow from '../components/PhaseFlow'
import { useDrops, useCreateDrop, useUpdateDrop, useDeleteDrop, useDropFasi, type Drop } from '../features/drops/queries'
import { dropFields, DROP_EMPTY_VALUES } from '../features/drops/formFields'
import { useArticoli, useCreateArticolo } from '../features/articoli/queries'
import { fmtDate } from '../lib/format'
import { useNav, useRegisterNewAction } from '../lib/navigation'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'

const articoloFields = (drops: Drop[]): FieldDef[] => [
  { key: 'nome', label: 'Nome articolo' },
  { key: 'categoria', label: 'Categoria (es. Felpe, Leggings, Top…)', half: true },
  { key: 'colori', label: 'Colori', half: true },
  {
    key: 'drop_id',
    label: 'Drop',
    type: 'select',
    options: [{ value: '', label: '— nessuno —' }, ...drops.map((d) => ({ value: d.id, label: d.nome }))],
  },
]

export default function Drops() {
  const { goTab, openArticolo } = useNav()
  const { data: drops, isLoading, isError, error, refetch } = useDrops()
  const { data: articoli } = useArticoli()
  const { data: fasi } = useDropFasi()
  const createDrop = useCreateDrop()
  const updateDrop = useUpdateDrop()
  const deleteDrop = useDeleteDrop()
  const createArticolo = useCreateArticolo()
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()
  const logActivity = useActivityLogger()

  const [dropModal, setDropModal] = useState<'none' | 'create' | 'edit'>('none')
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null)
  const [dropValues, setDropValues] = useState<FormValues>(DROP_EMPTY_VALUES)
  const [dropError, setDropError] = useState<string | null>(null)

  const [articoloModalOpen, setArticoloModalOpen] = useState(false)
  const [articoloValues, setArticoloValues] = useState<FormValues>({})
  const [articoloError, setArticoloError] = useState<string | null>(null)
  const dropDraft = useFormDraft(`drop:${editingDrop?.id ?? 'new'}`, dropModal !== 'none', dropValues, setDropValues)
  const articoloDraft = useFormDraft('articolo:new', articoloModalOpen, articoloValues, setArticoloValues)

  useRegisterNewAction(openCreateArticolo)

  function openCreateDrop() {
    setDropValues(DROP_EMPTY_VALUES)
    setDropError(null)
    setEditingDrop(null)
    setDropModal('create')
  }

  function openEditDrop(d: Drop) {
    setDropValues({
      nome: d.nome,
      data_lancio: d.data_lancio ?? '',
      owner: d.owner ?? 'logistica',
      note: d.note ?? '',
    })
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
        logActivity('ha aggiornato il drop', `«${nome}»`, 'dropx')
      } else {
        await createDrop.mutateAsync({ ...patch, withTemplate: dropValues.template !== 'no' })
        showToast('success', 'Drop creato.')
        logActivity('ha creato il drop', `«${nome}»`, 'dropx')
      }
      dropDraft.clear()
      setDropModal('none')
    } catch (err) {
      setDropError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function handleDeleteDrop(d: Drop) {
    confirmDelete(`Eliminare "${d.nome}"? Gli articoli collegati restano ma senza drop.`, async () => {
      await deleteDrop.mutateAsync(d.id)
      logActivity('ha eliminato il drop', `«${d.nome}»`, 'dropx')
    }, 'Drop eliminato')
  }

  function openCreateArticolo(dropId?: string) {
    setArticoloValues({ nome: '', categoria: '', colori: '', drop_id: dropId ?? '' })
    setArticoloError(null)
    setArticoloModalOpen(true)
  }

  async function handleArticoloSubmit(e: FormEvent) {
    e.preventDefault()
    const nome = String(articoloValues.nome ?? '').trim()
    if (!nome) {
      setArticoloError('Inserisci il nome articolo.')
      return
    }
    try {
      const created = await createArticolo.mutateAsync({
        nome,
        categoria: String(articoloValues.categoria ?? '').trim() || null,
        colori: String(articoloValues.colori ?? '').trim() || null,
        drop_id: String(articoloValues.drop_id ?? '') || null,
      })
      articoloDraft.clear()
      setArticoloModalOpen(false)
      openArticolo(created.id)
      showToast('success', 'Articolo creato.')
      logActivity('ha creato un articolo', `«${created.nome}»`, 'catalogo')
    } catch (err) {
      setArticoloError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  const sortedDrops = [...(drops ?? [])].sort((a, b) => (a.data_lancio ?? '9999').localeCompare(b.data_lancio ?? '9999'))
  const orphanArticoli = (articoli ?? []).filter((a) => !a.drop_id || !drops?.some((d) => d.id === a.drop_id))

  return (
    <>
      <div className="pg-head">
        <div>
          <h2 className="ov-title">Drops</h2>
          <div className="ov-sub">{(drops ?? []).length} LANCI · {(articoli ?? []).length} ARTICOLI</div>
        </div>
        <div className="row" style={{ gap: 20 }}>
          <button className="tlink" onClick={openCreateDrop}>
            + Drop
          </button>
          <button className="tlink" onClick={() => openCreateArticolo()}>
            + Articolo
          </button>
        </div>
      </div>
      <p className="pg-note">
        Una riga per lancio, dentro tutti gli articoli con foto, colori e avanzamento task. Tocca la categoria per
        vedere tutti i capi di quel tipo nel tempo.
      </p>

      {isLoading && (
        <div className="drop-row" aria-hidden>
          <div className="skeleton" style={{ height: 20, width: 220, marginBottom: 12 }} />
          <div className="art-scroll">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton" style={{ width: 190, height: 190 }} />
            ))}
          </div>
        </div>
      )}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          {sortedDrops.map((d) => {
            const arts = (articoli ?? []).filter((a) => a.drop_id === d.id)
            const dropFasi = (fasi ?? [])
              .filter((f) => f.drop_id === d.id)
              .sort((a, b) => (a.data ?? '9999').localeCompare(b.data ?? '9999'))
            return (
              <div className="drop-row" key={d.id}>
                <div className="drop-row-head">
                  <div>
                    <span className="drop-row-title">{d.nome}</span>
                    <span className="code" style={{ marginLeft: 8 }}>
                      {fmtDate(d.data_lancio)}
                    </span>
                  </div>
                  <div className="row" style={{ gap: 18 }}>
                    <button className="tlink" onClick={() => openCreateArticolo(d.id)}>
                      + Articolo qui
                    </button>
                    <button className="tlink" onClick={() => goTab('drops')}>
                      Timeline →
                    </button>
                    <button className="tlink" onClick={() => openEditDrop(d)}>
                      Modifica
                    </button>
                    <button className="dt-x" onClick={() => handleDeleteDrop(d)} aria-label="Elimina">✕</button>
                  </div>
                </div>
                {dropFasi.length > 0 && <PhaseFlow fasi={dropFasi} />}
                {arts.length ? (
                  <div className="art-scroll">
                    {arts.map((a) => (
                      <ArticoloCard key={a.id} articolo={a} onClick={() => openArticolo(a.id)} />
                    ))}
                  </div>
                ) : (
                  <div className="empty" style={{ padding: 20 }}>
                    Nessun articolo in questo drop.
                  </div>
                )}
              </div>
            )
          })}
          {sortedDrops.length === 0 && <EmptyState icon="box" text="Nessun drop. Creane uno." ctaLabel="+ Drop" onCta={openCreateDrop} />}

          {orphanArticoli.length > 0 && (
            <div className="drop-row">
              <div className="drop-row-head">
                <span className="drop-row-title" style={{ color: 'var(--muted)' }}>
                  Senza drop
                </span>
              </div>
              <div className="art-scroll">
                {orphanArticoli.map((a) => (
                  <ArticoloCard key={a.id} articolo={a} onClick={() => openArticolo(a.id)} />
                ))}
              </div>
            </div>
          )}
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
          {dropModal === 'edit' && editingDrop && <NotesList entityType="drops" entityId={editingDrop.id} />}
        </Modal>
      )}

      {articoloModalOpen && (
        <Modal title="Nuovo articolo" onClose={() => setArticoloModalOpen(false)}>
          <form onSubmit={handleArticoloSubmit}>
            <FormFields
              fields={articoloFields(drops ?? [])}
              values={articoloValues}
              onChange={(k, v) => setArticoloValues((s) => ({ ...s, [k]: v }))}
            />
            {articoloError && <p className="auth-msg err">{articoloError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setArticoloModalOpen(false)}>
                Annulla
              </button>
              <button className="btn" type="submit" disabled={createArticolo.isPending}>
                {createArticolo.isPending ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
