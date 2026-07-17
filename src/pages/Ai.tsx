import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import LinkCard from '../components/LinkCard'
import { useAiLinks, useCreateAiLink, useUpdateAiLink, useDeleteAiLink, type AiLink } from '../features/aiLinks/queries'
import { useToast } from '../lib/useToast'

const AI_FIELDS: FieldDef[] = [
  { key: 'label', label: 'Nome strumento' },
  { key: 'url', label: 'URL (https://…)' },
]

export default function Ai() {
  const { data: links, isLoading, isError, error, refetch } = useAiLinks()
  const createLink = useCreateAiLink()
  const updateLink = useUpdateAiLink()
  const deleteLink = useDeleteAiLink()
  const showToast = useToast()

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editing, setEditing] = useState<AiLink | null>(null)
  const [values, setValues] = useState<FormValues>({ label: '', url: '' })
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setValues({ label: '', url: '' })
    setFormError(null)
    setEditing(null)
    setModalMode('create')
  }

  function openEdit(l: AiLink) {
    setValues({ label: l.label, url: l.url ?? '' })
    setFormError(null)
    setEditing(l)
    setModalMode('edit')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const label = String(values.label ?? '').trim()
    if (!label) {
      setFormError('Inserisci un nome.')
      return
    }
    const patch = { label, url: String(values.url ?? '').trim() || null }
    try {
      if (modalMode === 'edit' && editing) {
        await updateLink.mutateAsync({ id: editing.id, patch })
        showToast('success', 'Strumento aggiornato.')
      } else {
        await createLink.mutateAsync(patch)
        showToast('success', 'Strumento creato.')
      }
      setModalMode('none')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function handleDelete(l: AiLink) {
    if (!window.confirm('Eliminare?')) return
    try {
      await deleteLink.mutateAsync(l.id)
      showToast('success', 'Strumento eliminato.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
  }

  return (
    <>
      <PanelHead
        title="AI"
        desc="Collegamenti rapidi agli strumenti AI del team: chat, generazione immagini, automazioni. Modificabili da chiunque."
        actions={
          <button className="btn" onClick={openCreate}>
            + Strumento
          </button>
        }
      />

      {isLoading && <Loading label="Caricamento…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          {(links ?? []).map((l) => (
            <LinkCard key={l.id} label={l.label} url={l.url} onEdit={() => openEdit(l)} onDelete={() => handleDelete(l)} />
          ))}
          {(links ?? []).length === 0 && <div className="empty">Nessuno strumento collegato.</div>}
        </>
      )}

      {modalMode !== 'none' && (
        <Modal title={modalMode === 'edit' ? 'Modifica strumento' : 'Nuovo strumento AI'} onClose={() => setModalMode('none')}>
          <form onSubmit={handleSubmit}>
            <FormFields fields={AI_FIELDS} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
            {formError && <p className="auth-msg err">{formError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setModalMode('none')}>
                Annulla
              </button>
              <button className="btn" type="submit">
                Salva
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
