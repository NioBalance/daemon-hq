import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import ArticoloCard from '../components/ArticoloCard'
import ArticoloDetail from '../components/ArticoloDetail'
import { useDrops, useCreateDrop, useUpdateDrop, useDeleteDrop, type Drop } from '../features/drops/queries'
import { useArticoli, useCreateArticolo } from '../features/articoli/queries'
import { OWNER_OPTS } from '../lib/tabs'
import { fmtDate } from '../lib/format'
import { useNav } from '../lib/navigation'

const DROP_FIELDS = (forEdit: boolean): FieldDef[] => [
  { key: 'nome', label: 'Nome drop (es. Drop VI — Inverno)' },
  { key: 'data_lancio', label: 'Data lancio', type: 'date', half: true },
  {
    key: 'owner',
    label: 'Owner',
    type: 'select',
    half: true,
    options: OWNER_OPTS.map((o) => ({ value: o.v, label: o.l })),
  },
  ...(forEdit
    ? []
    : ([
        {
          key: 'template',
          label: 'Fasi iniziali',
          type: 'select',
          options: [
            { value: 'si', label: 'Pipeline 30 giorni (7 fasi + payout 30/70)' },
            { value: 'no', label: 'Vuoto — le aggiungo io' },
          ],
        },
      ] as FieldDef[])),
  { key: 'note', label: 'Note strategiche', type: 'textarea' },
]

const DROP_EMPTY_VALUES: FormValues = { nome: '', data_lancio: '', owner: 'logistica', template: 'si', note: '' }

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
  const { goTab } = useNav()
  const { data: drops, isLoading, isError, error, refetch } = useDrops()
  const { data: articoli } = useArticoli()
  const createDrop = useCreateDrop()
  const updateDrop = useUpdateDrop()
  const deleteDrop = useDeleteDrop()
  const createArticolo = useCreateArticolo()

  const [dropModal, setDropModal] = useState<'none' | 'create' | 'edit'>('none')
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null)
  const [dropValues, setDropValues] = useState<FormValues>(DROP_EMPTY_VALUES)
  const [dropError, setDropError] = useState<string | null>(null)

  const [articoloModalOpen, setArticoloModalOpen] = useState(false)
  const [articoloValues, setArticoloValues] = useState<FormValues>({})
  const [articoloError, setArticoloError] = useState<string | null>(null)

  const [openArticoloId, setOpenArticoloId] = useState<string | null>(null)

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
      } else {
        await createDrop.mutateAsync({ ...patch, withTemplate: dropValues.template !== 'no' })
      }
      setDropModal('none')
    } catch (err) {
      setDropError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function handleDeleteDrop(d: Drop) {
    if (!window.confirm(`Eliminare "${d.nome}"? Gli articoli collegati restano ma senza drop.`)) return
    await deleteDrop.mutateAsync(d.id)
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
      setArticoloModalOpen(false)
      setOpenArticoloId(created.id)
    } catch (err) {
      setArticoloError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  const sortedDrops = [...(drops ?? [])].sort((a, b) => (a.data_lancio ?? '9999').localeCompare(b.data_lancio ?? '9999'))
  const orphanArticoli = (articoli ?? []).filter((a) => !a.drop_id || !drops?.some((d) => d.id === a.drop_id))

  return (
    <>
      <PanelHead
        title="Drops"
        desc="Una riga per lancio, dentro tutti gli articoli con foto, colori e avanzamento task. Tocca la categoria per vedere tutti i capi di quel tipo nel tempo."
        actions={
          <div className="row">
            <button className="btn ghost" onClick={openCreateDrop}>
              + Drop
            </button>
            <button className="btn" onClick={() => openCreateArticolo()}>
              + Articolo
            </button>
          </div>
        }
      />

      {isLoading && <Loading label="Caricamento drop…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          {sortedDrops.map((d) => {
            const arts = (articoli ?? []).filter((a) => a.drop_id === d.id)
            return (
              <div className="drop-row" key={d.id}>
                <div className="drop-row-head">
                  <div>
                    <span className="drop-row-title">{d.nome}</span>
                    <span className="code" style={{ marginLeft: 8 }}>
                      {fmtDate(d.data_lancio)}
                    </span>
                  </div>
                  <div className="row">
                    <button className="btn sm ghost" onClick={() => openCreateArticolo(d.id)}>
                      + Articolo qui
                    </button>
                    <button className="btn sm ghost" onClick={() => goTab('drops')}>
                      Timeline →
                    </button>
                    <button className="btn sm ghost" onClick={() => openEditDrop(d)}>
                      Modifica
                    </button>
                    <button className="btn sm danger" onClick={() => handleDeleteDrop(d)}>
                      ✕
                    </button>
                  </div>
                </div>
                {arts.length ? (
                  <div className="art-scroll">
                    {arts.map((a) => (
                      <ArticoloCard key={a.id} articolo={a} onClick={() => setOpenArticoloId(a.id)} />
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
          {sortedDrops.length === 0 && <div className="empty">Nessun drop. Creane uno.</div>}

          {orphanArticoli.length > 0 && (
            <div className="drop-row">
              <div className="drop-row-head">
                <span className="drop-row-title" style={{ color: 'var(--muted)' }}>
                  Senza drop
                </span>
              </div>
              <div className="art-scroll">
                {orphanArticoli.map((a) => (
                  <ArticoloCard key={a.id} articolo={a} onClick={() => setOpenArticoloId(a.id)} />
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
              fields={DROP_FIELDS(dropModal === 'edit')}
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

      {openArticoloId && <ArticoloDetail articoloId={openArticoloId} onClose={() => setOpenArticoloId(null)} />}
    </>
  )
}
