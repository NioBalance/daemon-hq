import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import OwnerBadge from '../components/OwnerBadge'
import TechpackFolder from '../components/TechpackFolder'
import {
  useTechpacks,
  useCreateTechpack,
  useUpdateTechpack,
  useDeleteTechpack,
  type Techpack,
} from '../features/techpacks/queries'
import { useFornitori } from '../features/fornitori/queries'
import { useTechpackFiles } from '../features/techpackFiles/queries'
import { useAddNote } from '../features/notes/queries'
import { useAuth } from '../auth/useAuth'
import { OWNER_OPTS } from '../lib/tabs'
import { useToast } from '../lib/useToast'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction } from '../lib/navigation'
import type { TechpackStato } from '../lib/database.types'

const TP_STATI: { value: TechpackStato; label: string }[] = [
  { value: 'bozza', label: 'Bozza' },
  { value: 'inviato', label: 'Inviato al fornitore' },
  { value: 'confermato', label: 'Confermato' },
  { value: 'in-produzione', label: 'In produzione' },
]

const statoLabel = (s: TechpackStato) => TP_STATI.find((x) => x.value === s)?.label ?? s
const statoBadgeClass = (s: TechpackStato) =>
  ({ bozza: 'steel', inviato: 'amber', confermato: 'ok', 'in-produzione': 'ember' })[s] ?? 'steel'

const EMPTY_VALUES: FormValues = {
  nome: '',
  categoria: '',
  colorway: '',
  materiali: '',
  taglie: '',
  stato: 'bozza',
  fornitore_id: '',
  owner: 'design',
  note: '',
}

function techpackToValues(t: Techpack): FormValues {
  return {
    nome: t.nome,
    categoria: t.categoria ?? '',
    colorway: t.colorway ?? '',
    materiali: t.materiali ?? '',
    taglie: t.taglie ?? '',
    stato: t.stato,
    fornitore_id: t.fornitore_id ?? '',
    owner: t.owner ?? 'design',
    note: t.note ?? '',
  }
}

export default function TechPack() {
  const { data: techpacks, isLoading, isError, error, refetch } = useTechpacks()
  const { data: fornitori } = useFornitori()
  const { data: tpFiles } = useTechpackFiles()
  const createTechpack = useCreateTechpack()
  const updateTechpack = useUpdateTechpack()
  const deleteTechpack = useDeleteTechpack()
  const addNote = useAddNote('techpacks')
  const { profile } = useAuth()
  const showToast = useToast()

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [formError, setFormError] = useState<string | null>(null)

  const saving = createTechpack.isPending || updateTechpack.isPending
  const draft = useFormDraft(`techpack:${editingId ?? 'new'}`, modalMode !== 'none', values, setValues)

  useRegisterNewAction(openCreate)

  const TP_FIELDS: FieldDef[] = [
    { key: 'nome', label: 'Nome capo' },
    { key: 'categoria', label: 'Categoria', half: true },
    { key: 'colorway', label: 'Colorway', half: true },
    { key: 'materiali', label: 'Materiali / composizione', type: 'textarea' },
    { key: 'taglie', label: 'Range taglie', half: true },
    { key: 'stato', label: 'Stato', type: 'select', half: true, options: TP_STATI.map((o) => ({ value: o.value, label: o.label })) },
    {
      key: 'fornitore_id',
      label: 'Fornitore',
      type: 'select',
      half: true,
      options: [{ value: '', label: '—' }, ...(fornitori ?? []).map((f) => ({ value: f.id, label: f.nome }))],
    },
    { key: 'owner', label: 'Owner', type: 'select', half: true, options: OWNER_OPTS.map((o) => ({ value: o.v, label: o.l })) },
    { key: 'note', label: 'Note (misure chiave, dettagli costruzione, link file)', type: 'textarea' },
  ]

  function openCreate() {
    setValues(EMPTY_VALUES)
    setFormError(null)
    setEditingId(null)
    setModalMode('create')
  }

  function openEdit(t: Techpack) {
    setValues(techpackToValues(t))
    setFormError(null)
    setEditingId(t.id)
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
      colorway: String(values.colorway ?? '').trim() || null,
      materiali: String(values.materiali ?? '').trim() || null,
      taglie: String(values.taglie ?? '').trim() || null,
      stato: values.stato as TechpackStato,
      fornitore_id: String(values.fornitore_id ?? '') || null,
      owner: values.owner as Techpack['owner'],
      note: String(values.note ?? '').trim() || null,
    }
    try {
      if (modalMode === 'edit' && editingId) {
        const original = techpacks?.find((t) => t.id === editingId)
        await updateTechpack.mutateAsync({ id: editingId, patch })
        logChange(
          editingId,
          original && original.stato !== patch.stato
            ? `ha cambiato lo stato in «${statoLabel(patch.stato)}»`
            : 'ha aggiornato la scheda',
        )
        showToast('success', 'Tech pack aggiornato.')
      } else {
        const created = await createTechpack.mutateAsync(patch)
        logChange(created.id, 'ha creato la scheda')
        showToast('success', 'Tech pack creato.')
      }
      draft.clear()
      setModalMode('none')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  // Changelog leggero (§5.2): ogni modifica scrive una riga firmata che riusa
  // il sistema note — visibile nella cartella del tech pack.
  function logChange(techpackId: string, testo: string) {
    if (!profile) return
    addNote.mutate({
      entity_type: 'techpacks',
      entity_id: techpackId,
      author_id: profile.id,
      author_name: profile.nome,
      testo,
    })
  }

  async function handleDelete(t: Techpack) {
    if (!window.confirm('Eliminare definitivamente?')) return
    try {
      await deleteTechpack.mutateAsync(t.id)
      showToast('success', 'Tech pack eliminato.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
  }

  const fornNome = (id: string | null) => fornitori?.find((f) => f.id === id)?.nome ?? '—'

  return (
    <>
      <PanelHead
        title="Tech Pack"
        desc="La scheda tecnica è il contratto col fornitore: materiali, colorway, taglie e stato di conferma."
        actions={
          <button className="btn" onClick={openCreate}>
            + Nuovo tech pack
          </button>
        }
      />

      {isLoading && <Loading label="Caricamento tech pack…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <div className="grid c3">
          {(techpacks ?? []).map((t, i) => {
            const fileCount = (tpFiles ?? []).filter((f) => f.techpack_id === t.id).length
            return (
            <div className={`card tp-card tp-${t.stato}`} key={t.id}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="code">TP-{String(i + 1).padStart(2, '0')}</span>
                <span className={`badge ${statoBadgeClass(t.stato)}`}>{statoLabel(t.stato)}</span>
              </div>
              <div className="card-title">{t.nome}</div>
              <div className="card-meta">
                {t.categoria} · {t.colorway || '—'} · {t.taglie || '—'}
              </div>
              {t.materiali && <div className="card-meta" style={{ marginTop: 6 }}>{t.materiali}</div>}
              <div className="row" style={{ marginTop: 10 }}>
                <span className="badge">Fornitore: {fornNome(t.fornitore_id)}</span>
                <OwnerBadge owner={t.owner} />
              </div>
              {t.note && <div className="note">{t.note}</div>}
              <div className="card-actions">
                <button className="btn sm" onClick={() => setFolderId(t.id)}>
                  Cartella ({fileCount})
                </button>
                <button className="btn sm ghost" onClick={() => openEdit(t)}>
                  Modifica
                </button>
                <button className="btn sm danger" onClick={() => handleDelete(t)}>
                  Elimina
                </button>
              </div>
            </div>
            )
          })}
          {(techpacks ?? []).length === 0 && (
            <div className="empty">Nessun tech pack. Creane uno dal design approvato.</div>
          )}
        </div>
      )}

      {folderId && (techpacks ?? []).some((t) => t.id === folderId) && (
        <TechpackFolder
          techpack={(techpacks ?? []).find((t) => t.id === folderId)!}
          onClose={() => setFolderId(null)}
        />
      )}

      {modalMode !== 'none' && (
        <Modal title={modalMode === 'edit' ? 'Modifica tech pack' : 'Nuovo tech pack'} onClose={() => setModalMode('none')}>
          <form onSubmit={handleSubmit}>
            <FormFields
              fields={TP_FIELDS}
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
