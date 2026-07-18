import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import OwnerBadge from '../components/OwnerBadge'
import { useDesigns, useCreateDesign, useUpdateDesign, useDeleteDesign, type Design } from '../features/designs/queries'
import { OWNER_OPTS } from '../lib/tabs'
import { useToast } from '../lib/useToast'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction } from '../lib/navigation'
import type { DesignFase } from '../lib/database.types'

const FASI: { key: DesignFase; label: string }[] = [
  { key: 'idea', label: 'Idea' },
  { key: 'sketch', label: 'Sketch' },
  { key: 'techpack', label: 'Tech Pack' },
  { key: 'campione', label: 'Campione' },
  { key: 'approvato', label: 'Approvato' },
]

const DESIGN_FIELDS: FieldDef[] = [
  { key: 'nome', label: 'Nome capo' },
  { key: 'categoria', label: 'Categoria', half: true },
  {
    key: 'owner',
    label: 'Owner',
    type: 'select',
    half: true,
    options: OWNER_OPTS.map((o) => ({ value: o.v, label: o.l })),
  },
  {
    key: 'fase',
    label: 'Fase',
    type: 'select',
    options: FASI.map((f) => ({ value: f.key, label: f.label })),
  },
  { key: 'note', label: 'Note', type: 'textarea' },
]

const EMPTY_VALUES: FormValues = { nome: '', categoria: '', owner: 'design', fase: 'idea', note: '' }

function designToValues(d: Design): FormValues {
  return {
    nome: d.nome,
    categoria: d.categoria ?? '',
    owner: d.owner ?? 'design',
    fase: d.fase,
    note: d.note ?? '',
  }
}

export default function DesignPage() {
  const { data: designs, isLoading, isError, error, refetch } = useDesigns()
  const createDesign = useCreateDesign()
  const updateDesign = useUpdateDesign()
  const deleteDesign = useDeleteDesign()
  const showToast = useToast()

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [formError, setFormError] = useState<string | null>(null)

  const saving = createDesign.isPending || updateDesign.isPending
  const draft = useFormDraft(`design:${editingId ?? 'new'}`, modalMode !== 'none', values, setValues)

  useRegisterNewAction(openCreate)

  function openCreate() {
    setValues(EMPTY_VALUES)
    setFormError(null)
    setEditingId(null)
    setModalMode('create')
  }

  function openEdit(d: Design) {
    setValues(designToValues(d))
    setFormError(null)
    setEditingId(d.id)
    setModalMode('edit')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nome = String(values.nome ?? '').trim()
    if (!nome) {
      setFormError('Inserisci il nome del capo.')
      return
    }
    const patch = {
      nome,
      categoria: String(values.categoria ?? '').trim() || null,
      owner: values.owner as Design['owner'],
      fase: values.fase as DesignFase,
      note: String(values.note ?? '').trim() || null,
    }
    try {
      if (modalMode === 'edit' && editingId) {
        await updateDesign.mutateAsync({ id: editingId, patch })
        showToast('success', 'Design aggiornato.')
      } else {
        const maxOrdine = Math.max(-1, ...(designs ?? []).map((d) => d.ordine))
        await createDesign.mutateAsync({ ...patch, ordine: maxOrdine + 1 })
        showToast('success', 'Design creato.')
      }
      draft.clear()
      setModalMode('none')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function handleDelete(d: Design) {
    if (!window.confirm('Eliminare definitivamente?')) return
    try {
      await deleteDesign.mutateAsync(d.id)
      showToast('success', 'Design eliminato.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
  }

  async function move(d: Design, dir: 1 | -1) {
    const i = FASI.findIndex((f) => f.key === d.fase)
    const next = FASI[Math.max(0, Math.min(FASI.length - 1, i + dir))]
    if (next.key === d.fase) return
    await updateDesign.mutateAsync({ id: d.id, patch: { fase: next.key } })
  }

  return (
    <>
      <PanelHead
        title="Pipeline Design"
        desc="Ogni capo attraversa 5 fasi. Quando arriva a «Tech Pack», crea la scheda nella tab dedicata."
        actions={
          <button className="btn" onClick={openCreate}>
            + Nuovo design
          </button>
        }
      />

      {isLoading && <Loading label="Caricamento pipeline…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <div className="kanban">
          {FASI.map((f, i) => {
            const items = (designs ?? []).filter((d) => d.fase === f.key)
            return (
              <div className="kcol" key={f.key}>
                <div className="kcol-head">
                  <span>{f.label}</span>
                  <span>{items.length}</span>
                </div>
                {items.map((d) => (
                  <div className="kcard" key={d.id}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="nm">{d.nome}</span>
                      <OwnerBadge owner={d.owner} />
                    </div>
                    <div className="ct">{d.categoria}</div>
                    {d.note && <div className="ct" style={{ marginTop: 4 }}>{d.note}</div>}
                    <div className="kmove">
                      {i > 0 && <button onClick={() => move(d, -1)}>←</button>}
                      {i < FASI.length - 1 && <button onClick={() => move(d, 1)}>→</button>}
                      <button onClick={() => openEdit(d)}>Modifica</button>
                      <button onClick={() => handleDelete(d)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {modalMode !== 'none' && (
        <Modal title={modalMode === 'edit' ? 'Modifica design' : 'Nuovo design'} onClose={() => setModalMode('none')}>
          <form onSubmit={handleSubmit}>
            <FormFields
              fields={DESIGN_FIELDS}
              values={values}
              onChange={(key, value) => setValues((v) => ({ ...v, [key]: value }))}
            />
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
