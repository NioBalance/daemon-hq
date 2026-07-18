import { useCallback, useMemo, useState, type FormEvent } from 'react'
import Modal from './Modal'
import FormFields, { type FieldDef, type FormValues } from './FormFields'
import FolderCard from './FolderCard'
import { useGadgets, useCreateGadget, useUpdateGadget, useDeleteGadget, type Gadget } from '../features/gadgets/queries'
import { useToast } from '../lib/useToast'
import { useFormDraft } from '../lib/useFormDraft'

const FIELDS: FieldDef[] = [{ key: 'value', label: 'Nome gadget' }]

/** Riga orizzontale dei gadget (§5.1): non più sezione autonoma dell'Archivio,
 *  vivono come elemento accessorio dentro Campioni e Catalogo. Foto + note
 *  firmate invariate (FolderCard). */
export default function GadgetRow() {
  const gadgets = useGadgets()
  const createGadget = useCreateGadget()
  const updateGadget = useUpdateGadget()
  const deleteGadget = useDeleteGadget()
  const showToast = useToast()

  const [modal, setModal] = useState<{ id: string | null } | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const draftValues = useMemo(() => ({ value }), [value])
  const setDraftValues = useCallback((v: FormValues) => setValue(String(v.value ?? '')), [])
  const draft = useFormDraft(`gadget:${modal?.id ?? 'new'}`, modal !== null, draftValues, setDraftValues)

  function openAdd() {
    setValue('')
    setError(null)
    setModal({ id: null })
  }
  function openEdit(g: Gadget) {
    setValue(g.nome)
    setError(null)
    setModal({ id: g.id })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || !modal) {
      setError('Inserisci un nome.')
      return
    }
    try {
      if (modal.id) {
        await updateGadget.mutateAsync({ id: modal.id, patch: { nome: trimmed } })
        showToast('success', 'Gadget aggiornato.')
      } else {
        await createGadget.mutateAsync({ nome: trimmed, ordine: gadgets.data?.length ?? 0 })
        showToast('success', 'Gadget creato.')
      }
      draft.clear()
      setModal(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function handleDelete(g: Gadget) {
    if (!window.confirm(`Eliminare "${g.nome}"?`)) return
    try {
      await deleteGadget.mutateAsync(g.id)
      showToast('success', 'Gadget eliminato.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
  }

  const list = gadgets.data ?? []

  return (
    <div className="gadget-row">
      <div className="ms-row-head">
        <span className="ms-row-title">
          Gadget <span className="ms-count">· {list.length}</span>
        </span>
        <button className="btn sm" onClick={openAdd}>
          + Gadget
        </button>
      </div>
      {list.length ? (
        <div className="gadget-scroll">
          {list.map((g) => (
            <FolderCard
              key={g.id}
              id={g.id}
              title={g.nome}
              imgPath={g.img_path}
              entityType="gadgets"
              onEditTitle={() => openEdit(g)}
              onDelete={() => handleDelete(g)}
              onImageUploaded={(path) => updateGadget.mutate({ id: g.id, patch: { img_path: path } })}
            />
          ))}
        </div>
      ) : (
        <div className="ms-empty">Nessun gadget — accessori e omaggi del brand vivono qui.</div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Modifica gadget' : 'Nuovo gadget'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <FormFields fields={FIELDS} values={{ value }} onChange={(_k, v) => setValue(String(v))} />
            {error && <p className="auth-msg err">{error}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setModal(null)}>
                Annulla
              </button>
              <button className="btn" type="submit">
                Salva
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
