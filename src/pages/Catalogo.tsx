import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import ArticoloCard from '../components/ArticoloCard'
import ArticoloDetail from '../components/ArticoloDetail'
import { useArticoli, useCreateArticolo, type Articolo } from '../features/articoli/queries'
import { useDrops, type Drop } from '../features/drops/queries'
import { useNav } from '../lib/navigation'

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

export default function Catalogo() {
  const { catFilter, setCatFilter } = useNav()
  const { data: articoli, isLoading, isError, error, refetch } = useArticoli()
  const { data: drops } = useDrops()
  const createArticolo = useCreateArticolo()

  const [modalOpen, setModalOpen] = useState(false)
  const [values, setValues] = useState<FormValues>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [openArticoloId, setOpenArticoloId] = useState<string | null>(null)

  function openCreate() {
    setValues({ nome: '', categoria: '', colori: '', drop_id: '' })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nome = String(values.nome ?? '').trim()
    if (!nome) {
      setFormError('Inserisci il nome articolo.')
      return
    }
    try {
      await createArticolo.mutateAsync({
        nome,
        categoria: String(values.categoria ?? '').trim() || null,
        colori: String(values.colori ?? '').trim() || null,
        drop_id: String(values.drop_id ?? '') || null,
      })
      setModalOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  const all = articoli ?? []
  const cats = [...new Set(all.map((a) => a.categoria).filter((c): c is string => Boolean(c)))].sort()
  const list = catFilter === '__all__' ? all : all.filter((a) => a.categoria === catFilter)

  const dropNome = (id: string | null) => drops?.find((d) => d.id === id)?.nome ?? 'Senza drop'
  const byDrop = new Map<string, Articolo[]>()
  list.forEach((a) => {
    const k = dropNome(a.drop_id)
    byDrop.set(k, [...(byDrop.get(k) ?? []), a])
  })
  const dropOrder = [...byDrop.keys()].sort((x, y) => {
    const dx = drops?.find((d) => d.nome === x)
    const dy = drops?.find((d) => d.nome === y)
    return (dy?.data_lancio ?? '0').localeCompare(dx?.data_lancio ?? '0')
  })

  return (
    <>
      <PanelHead
        title="Catalogo"
        desc="Tutti i capi del brand nel tempo, per categoria e per lancio. La memoria storica del prodotto."
        actions={
          <button className="btn" onClick={openCreate}>
            + Articolo
          </button>
        }
      />

      {isLoading && <Loading label="Caricamento catalogo…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          <div className="chips">
            <button
              className={`chip${catFilter === '__all__' ? ' active' : ''}`}
              onClick={() => setCatFilter('__all__')}
            >
              Tutte ({all.length})
            </button>
            {cats.map((c) => (
              <button
                key={c}
                className={`chip${catFilter === c ? ' active' : ''}`}
                onClick={() => setCatFilter(c)}
              >
                {c} ({all.filter((a) => a.categoria === c).length})
              </button>
            ))}
          </div>

          {dropOrder.length ? (
            dropOrder.map((k) => (
              <div className="cat-group" key={k}>
                <h4>{k}</h4>
                <div className="art-grid">
                  {byDrop.get(k)!.map((a) => (
                    <ArticoloCard key={a.id} articolo={a} onClick={() => setOpenArticoloId(a.id)} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="empty">Nessun articolo in questa categoria.</div>
          )}
        </>
      )}

      {modalOpen && (
        <Modal title="Nuovo articolo" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <FormFields
              fields={articoloFields(drops ?? [])}
              values={values}
              onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
            />
            {formError && <p className="auth-msg err">{formError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setModalOpen(false)}>
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
