import { useState, type FormEvent } from 'react'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import OwnerBadge from '../components/OwnerBadge'
import {
  usePublishItems,
  useCreatePublishItem,
  useUpdatePublishItem,
  useDeletePublishItem,
  type PublishItem,
} from '../features/publish/queries'
import { useMediaItems } from '../features/media/queries'
import { useSignedUrl } from '../lib/useSignedUrl'
import { OWNER_OPTS } from '../lib/tabs'
import { fmtDate } from '../lib/format'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction } from '../lib/navigation'
import type { PublishFase, PublishTipo } from '../lib/database.types'

// Fasi con dot coerente col vocabolario del kanban Design (handoff Publish).
const FASI: { key: PublishFase; label: string; dot: string }[] = [
  { key: 'idea', label: 'Idea', dot: 'var(--dim)' },
  { key: 'in-edit', label: 'In-Edit', dot: 'var(--amber)' },
  { key: 'pronto', label: 'Pronto', dot: 'var(--info)' },
  { key: 'programmato', label: 'Programmato', dot: 'var(--ember)' },
  { key: 'pubblicato', label: 'Pubblicato', dot: 'var(--ok)' },
]

const TIPI: { value: PublishTipo; label: string }[] = [
  { value: 'post', label: 'Post' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' },
]

const EMPTY: FormValues = {
  titolo: '',
  tipo: 'post',
  canale: 'Instagram',
  fase: 'idea',
  data_programmata: '',
  media_id: '',
  owner: 'design',
  note: '',
}

/** Thumbnail dell'asset collegato (signed URL); niente se non collegato. */
function AssetThumb({ path }: { path: string | null | undefined }) {
  const url = useSignedUrl(path)
  if (!path) return null
  return <span className="pub-thumb">{url ? <img src={url} alt="" loading="lazy" /> : null}</span>
}

export default function Publish() {
  const itemsQ = usePublishItems()
  const mediaQ = useMediaItems()
  const createItem = useCreatePublishItem()
  const updateItem = useUpdatePublishItem()
  const deleteItem = useDeletePublishItem()
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()
  const logActivity = useActivityLogger()

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)

  const saving = createItem.isPending || updateItem.isPending
  const draft = useFormDraft(`publish:${editingId ?? 'new'}`, modalMode !== 'none', values, setValues)

  useRegisterNewAction(openCreate)

  const items = itemsQ.data ?? []
  const media = mediaQ.data ?? []
  const mediaById = new Map(media.map((m) => [m.id, m]))

  const FIELDS: FieldDef[] = [
    { key: 'titolo', label: 'Titolo contenuto' },
    { key: 'tipo', label: 'Tipo', type: 'select', half: true, options: TIPI.map((t) => ({ value: t.value, label: t.label })) },
    { key: 'canale', label: 'Canale (es. Instagram, TikTok)', half: true },
    { key: 'fase', label: 'Fase', type: 'select', half: true, options: FASI.map((f) => ({ value: f.key, label: f.label })) },
    { key: 'data_programmata', label: 'Data programmata', type: 'date', half: true },
    {
      key: 'media_id',
      label: 'Asset collegato (Media Studio)',
      type: 'select',
      options: [{ value: '', label: '— nessuno —' }, ...media.map((m) => ({ value: m.id, label: m.titolo }))],
    },
    { key: 'owner', label: 'Owner', type: 'select', half: true, options: OWNER_OPTS.map((o) => ({ value: o.v, label: o.l })) },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]

  function openCreate() {
    setValues(EMPTY)
    setFormError(null)
    setEditingId(null)
    setModalMode('create')
  }

  function openEdit(it: PublishItem) {
    setValues({
      titolo: it.titolo,
      tipo: it.tipo,
      canale: it.canale ?? '',
      fase: it.fase,
      data_programmata: it.data_programmata ?? '',
      media_id: it.media_id ?? '',
      owner: it.owner ?? 'design',
      note: it.note ?? '',
    })
    setFormError(null)
    setEditingId(it.id)
    setModalMode('edit')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const titolo = String(values.titolo ?? '').trim()
    if (!titolo) {
      setFormError('Inserisci il titolo del contenuto.')
      return
    }
    const patch = {
      titolo,
      tipo: values.tipo as PublishTipo,
      canale: String(values.canale ?? '').trim() || null,
      fase: values.fase as PublishFase,
      data_programmata: String(values.data_programmata ?? '') || null,
      media_id: String(values.media_id ?? '') || null,
      owner: values.owner as PublishItem['owner'],
      note: String(values.note ?? '').trim() || null,
    }
    try {
      if (modalMode === 'edit' && editingId) {
        await updateItem.mutateAsync({ id: editingId, patch })
        showToast('success', 'Contenuto aggiornato.')
        logActivity('ha aggiornato il contenuto', `«${titolo}»`, 'publish')
      } else {
        const ordine = Math.max(-1, ...items.filter((i) => i.fase === patch.fase).map((i) => i.ordine)) + 1
        await createItem.mutateAsync({ ...patch, ordine })
        showToast('success', 'Contenuto creato.')
        logActivity('ha creato il contenuto', `«${titolo}»`, 'publish')
      }
      draft.clear()
      setModalMode('none')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function handleDelete(it: PublishItem) {
    confirmDelete(`Eliminare "${it.titolo}"?`, async () => {
      await deleteItem.mutateAsync(it.id)
      logActivity('ha eliminato un contenuto', 'dalla pipeline', 'publish')
    }, 'Contenuto eliminato')
  }

  function move(it: PublishItem, dir: 1 | -1) {
    const i = FASI.findIndex((f) => f.key === it.fase)
    const next = FASI[Math.max(0, Math.min(FASI.length - 1, i + dir))]
    if (next.key === it.fase) return
    updateItem.mutate({ id: it.id, patch: { fase: next.key } })
  }

  if (itemsQ.isError) {
    return (
      <>
        <div className="ov-head">
          <h2 className="ov-title">Publish</h2>
        </div>
        <ErrorState
          message={`${itemsQ.error.message} — se la tabella non esiste, esegui la migration 0013_publish.sql.`}
          onRetry={() => itemsQ.refetch()}
        />
      </>
    )
  }

  return (
    <>
      <div className="pg-head">
        <div>
          <h2 className="ov-title">Publish</h2>
          <div className="ov-sub">{items.length} CONTENUT{items.length === 1 ? 'O' : 'I'} · PIPELINE EDITORIALE</div>
        </div>
        <button className="pg-add" onClick={openCreate}>
          + Contenuto
        </button>
      </div>

      {itemsQ.isLoading ? (
        <div aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="skeleton" key={i} style={{ height: 16, marginBottom: 16 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="star" text="Nessun contenuto in pipeline." ctaLabel="+ Contenuto" onCta={openCreate} />
      ) : (
        <div className="kanban">
          {FASI.map((f, fi) => {
            const col = items.filter((it) => it.fase === f.key)
            return (
              <div
                className="kcol"
                key={f.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain')
                  const dropped = items.find((x) => x.id === id)
                  if (dropped && dropped.fase !== f.key) updateItem.mutate({ id, patch: { fase: f.key } })
                }}
              >
                <div className="kcol-head">
                  <span className="kcol-name">
                    <span className="dt-dot" style={{ background: f.dot }} />
                    {f.label}
                  </span>
                  <span className="kcol-count">{col.length}</span>
                </div>
                {col.map((it) => {
                  const asset = it.media_id ? mediaById.get(it.media_id) : null
                  return (
                    <div
                      className={`kcard pub-card${it.fase === 'pubblicato' ? ' pub-done' : ''}`}
                      key={it.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', it.id)}
                    >
                      {asset && <AssetThumb path={asset.img_path} />}
                      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <span className="nm">{it.titolo}</span>
                        <OwnerBadge owner={it.owner} />
                      </div>
                      <div className="pub-meta">
                        <span className="pub-type">{it.tipo}</span>
                        {it.canale ? ` · ${it.canale}` : ''}
                        {it.data_programmata ? ` · ${fmtDate(it.data_programmata)}` : ''}
                      </div>
                      <div className="kmove">
                        {fi > 0 && (
                          <button onClick={() => move(it, -1)} aria-label="Fase precedente">
                            ←
                          </button>
                        )}
                        {fi < FASI.length - 1 && (
                          <button onClick={() => move(it, 1)} aria-label="Fase successiva">
                            →
                          </button>
                        )}
                        <button onClick={() => openEdit(it)}>Modifica</button>
                        <button onClick={() => handleDelete(it)} aria-label="Elimina">
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {modalMode !== 'none' && (
        <Modal title={modalMode === 'edit' ? 'Modifica contenuto' : 'Nuovo contenuto'} onClose={() => setModalMode('none')}>
          <form onSubmit={handleSubmit}>
            <FormFields fields={FIELDS} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
            {formError && <p className="auth-msg err">{formError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setModalMode('none')}>
                Annulla
              </button>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
