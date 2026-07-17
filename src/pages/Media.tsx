import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import ImageUpload from '../components/ImageUpload'
import NotesList from '../components/NotesList'
import { useMediaItems, useCreateMedia, useUpdateMedia, useDeleteMedia, type MediaItem } from '../features/media/queries'
import { useToast } from '../lib/useToast'
import type { MediaTipo } from '../lib/database.types'

const M_TIPI: { value: MediaTipo; label: string }[] = [
  { value: 'foto', label: 'Foto shooting' },
  { value: 'video', label: 'Video breve' },
  { value: 'logo', label: 'Logo / brand asset' },
]

const tipoLabel = (t: MediaTipo) => M_TIPI.find((x) => x.value === t)?.label ?? t

const MEDIA_FIELDS: FieldDef[] = [
  { key: 'titolo', label: 'Titolo (es. Shooting Drop V — hero leggings)' },
  { key: 'tipo', label: 'Tipo', type: 'select', half: true, options: M_TIPI.map((o) => ({ value: o.value, label: o.label })) },
  { key: 'url', label: 'Link esterno (Drive/Dropbox — obbligatorio per i video)', half: true },
]

export default function Media() {
  const { data: media, isLoading, isError, error, refetch } = useMediaItems()
  const createMedia = useCreateMedia()
  const updateMedia = useUpdateMedia()
  const deleteMedia = useDeleteMedia()
  const showToast = useToast()

  const [filter, setFilter] = useState<'__all__' | MediaTipo>('__all__')
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editing, setEditing] = useState<MediaItem | null>(null)
  const [values, setValues] = useState<FormValues>({ titolo: '', tipo: 'foto', url: '' })
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setValues({ titolo: '', tipo: 'foto', url: '' })
    setFormError(null)
    setEditing(null)
    setModalMode('create')
  }

  function openEdit(m: MediaItem) {
    setValues({ titolo: m.titolo, tipo: m.tipo, url: m.url ?? '' })
    setFormError(null)
    setEditing(m)
    setModalMode('edit')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const titolo = String(values.titolo ?? '').trim()
    if (!titolo) {
      setFormError('Inserisci un titolo.')
      return
    }
    const patch = {
      titolo,
      tipo: values.tipo as MediaTipo,
      url: String(values.url ?? '').trim() || null,
    }
    try {
      if (modalMode === 'edit' && editing) {
        await updateMedia.mutateAsync({ id: editing.id, patch })
        showToast('success', 'Media aggiornato.')
      } else {
        await createMedia.mutateAsync({ ...patch, ordine: media?.length ?? 0 })
        showToast('success', 'Media creato.')
      }
      setModalMode('none')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function handleDelete(m: MediaItem) {
    if (!window.confirm('Eliminare?')) return
    try {
      await deleteMedia.mutateAsync(m.id)
      showToast('success', 'Media eliminato.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
  }

  const all = media ?? []
  const list = filter === '__all__' ? all : all.filter((m) => m.tipo === filter)

  return (
    <>
      <PanelHead
        title="Media"
        desc="Foto degli shooting, video brevi e loghi del brand. Le foto si caricano direttamente (compresse); i video restano su Drive e qui vivono con anteprima e link."
        actions={
          <button className="btn" onClick={openCreate}>
            + Media
          </button>
        }
      />

      {isLoading && <Loading label="Caricamento media…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          <div className="chips">
            <button className={`chip${filter === '__all__' ? ' active' : ''}`} onClick={() => setFilter('__all__')}>
              Tutti ({all.length})
            </button>
            {M_TIPI.map((t) => (
              <button key={t.value} className={`chip${filter === t.value ? ' active' : ''}`} onClick={() => setFilter(t.value)}>
                {t.label} ({all.filter((m) => m.tipo === t.value).length})
              </button>
            ))}
          </div>

          <div className="media-grid">
            {list.map((m) => (
              <div className="media-card" key={m.id}>
                <ImageUpload
                  path={m.img_path}
                  entityType="media"
                  className="media-img"
                  onUploaded={(path) => updateMedia.mutate({ id: m.id, patch: { img_path: path } })}
                  title="Tocca per caricare/cambiare anteprima"
                >
                  {m.tipo === 'video' && <span className="play">▶</span>}
                </ImageUpload>
                <div className="media-body">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="card-title" style={{ margin: 0, fontSize: 14 }}>
                      {m.titolo}
                    </span>
                    <span className="badge steel">{tipoLabel(m.tipo)}</span>
                  </div>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noopener" style={{ color: 'var(--ember)', fontSize: 12, fontFamily: 'var(--font-m)' }}>
                      Apri file ↗
                    </a>
                  )}
                  <div className="card-actions">
                    <button className="btn sm ghost" onClick={() => openEdit(m)}>
                      ✎
                    </button>
                    <button className="btn sm danger" onClick={() => handleDelete(m)}>
                      ✕
                    </button>
                  </div>
                  <NotesList entityType="media" entityId={m.id} />
                </div>
              </div>
            ))}
            {list.length === 0 && <div className="empty">Nessun media. Carica il primo shooting.</div>}
          </div>
        </>
      )}

      {modalMode !== 'none' && (
        <Modal title={modalMode === 'edit' ? 'Modifica media' : 'Nuovo media'} onClose={() => setModalMode('none')}>
          <form onSubmit={handleSubmit}>
            <FormFields fields={MEDIA_FIELDS} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
            {formError && <p className="auth-msg err">{formError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setModalMode('none')}>
                Annulla
              </button>
              <button className="btn" type="submit" disabled={createMedia.isPending || updateMedia.isPending}>
                {createMedia.isPending || updateMedia.isPending ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
