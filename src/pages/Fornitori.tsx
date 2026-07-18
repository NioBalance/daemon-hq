import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import { useToast } from '../lib/useToast'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction } from '../lib/navigation'
import type { FornitoreRuolo, FornitoreStato } from '../lib/database.types'
import {
  useFornitori,
  useCreateFornitore,
  useUpdateFornitore,
  useDeleteFornitore,
  type Fornitore,
} from '../features/fornitori/queries'

const F_RUOLI: { value: FornitoreRuolo; label: string }[] = [
  { value: 'core', label: 'Core line' },
  { value: 'capsule', label: 'Capsule / campionatura' },
  { value: 'backup', label: 'Backup (Strada B)' },
]

const F_STATI: { value: FornitoreStato; label: string }[] = [
  { value: 'da-contattare', label: 'Da contattare' },
  { value: 'vetting', label: 'In vetting' },
  { value: 'attivo', label: 'Attivo' },
  { value: 'scartato', label: 'Scartato' },
]

const RUOLO_ORDER: Record<FornitoreRuolo, number> = { core: 0, capsule: 1, backup: 2 }

const ruoloLabel = (r: FornitoreRuolo | null) => F_RUOLI.find((x) => x.value === r)?.label ?? r ?? '—'
const statoLabel = (s: FornitoreStato) => F_STATI.find((x) => x.value === s)?.label ?? s
const ruoloBadgeClass = (r: FornitoreRuolo | null) => (r === 'core' ? 'ember' : r === 'capsule' ? 'amber' : 'steel')
const statoBadgeClass = (s: FornitoreStato) =>
  ({ 'da-contattare': 'steel', vetting: 'amber', attivo: 'ok', scartato: 'ember' })[s] ?? 'steel'

const FORNITORE_FIELDS: FieldDef[] = [
  { key: 'nome', label: 'Nome fornitore' },
  { key: 'luogo', label: 'Località', half: true },
  {
    key: 'ruolo',
    label: 'Ruolo',
    type: 'select',
    half: true,
    options: F_RUOLI.map((o) => ({ value: o.value, label: o.label })),
  },
  {
    key: 'stato',
    label: 'Stato',
    type: 'select',
    half: true,
    options: F_STATI.map((o) => ({ value: o.value, label: o.label })),
  },
  { key: 'lead_time', label: 'Lead time', half: true },
  { key: 'contatto', label: 'Contatto (referente, email, telefono)' },
  { key: 'materiali', label: 'Materiali / specializzazione', type: 'textarea' },
  { key: 'note', label: 'Note vetting e condizioni (30% avvio / 70% saldo, pagamento 60gg…)', type: 'textarea' },
]

const EMPTY_VALUES: FormValues = {
  nome: '',
  luogo: '',
  ruolo: 'core',
  stato: 'da-contattare',
  lead_time: '',
  contatto: '',
  materiali: '',
  note: '',
}

function fornitoreToValues(f: Fornitore): FormValues {
  return {
    nome: f.nome,
    luogo: f.luogo ?? '',
    ruolo: f.ruolo ?? 'core',
    stato: f.stato,
    lead_time: f.lead_time ?? '',
    contatto: f.contatto ?? '',
    materiali: f.materiali ?? '',
    note: f.note ?? '',
  }
}

export default function Fornitori() {
  const { data: fornitori, isLoading, isError, error, refetch } = useFornitori()
  const createFornitore = useCreateFornitore()
  const updateFornitore = useUpdateFornitore()
  const deleteFornitore = useDeleteFornitore()
  const showToast = useToast()
  const logActivity = useActivityLogger()

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [formError, setFormError] = useState<string | null>(null)

  const saving = createFornitore.isPending || updateFornitore.isPending
  const draft = useFormDraft(`fornitore:${editingId ?? 'new'}`, modalMode !== 'none', values, setValues)

  useRegisterNewAction(openCreate)

  function openCreate() {
    setValues(EMPTY_VALUES)
    setFormError(null)
    setEditingId(null)
    setModalMode('create')
  }

  function openEdit(f: Fornitore) {
    setValues(fornitoreToValues(f))
    setFormError(null)
    setEditingId(f.id)
    setModalMode('edit')
  }

  function closeModal() {
    setModalMode('none')
    setFormError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nome = String(values.nome ?? '').trim()
    if (!nome) {
      setFormError('Inserisci il nome del fornitore.')
      return
    }
    const patch = {
      nome,
      luogo: String(values.luogo ?? '').trim() || null,
      ruolo: values.ruolo as FornitoreRuolo,
      stato: values.stato as FornitoreStato,
      lead_time: String(values.lead_time ?? '').trim() || null,
      contatto: String(values.contatto ?? '').trim() || null,
      materiali: String(values.materiali ?? '').trim() || null,
      note: String(values.note ?? '').trim() || null,
    }
    try {
      if (modalMode === 'edit' && editingId) {
        await updateFornitore.mutateAsync({ id: editingId, patch })
        showToast('success', 'Fornitore aggiornato.')
        logActivity('ha aggiornato il fornitore', `«${nome}»`, 'fornitori')
      } else {
        await createFornitore.mutateAsync(patch)
        showToast('success', 'Fornitore creato.')
        logActivity('ha creato il fornitore', `«${nome}»`, 'fornitori')
      }
      draft.clear()
      closeModal()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function handleDelete(f: Fornitore) {
    if (!window.confirm(`Eliminare "${f.nome}"?`)) return
    try {
      await deleteFornitore.mutateAsync(f.id)
      showToast('success', `"${f.nome}" eliminato.`)
      logActivity('ha eliminato il fornitore', `«${f.nome}»`, 'fornitori')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
  }

  const sorted = [...(fornitori ?? [])].sort(
    (a, b) => (RUOLO_ORDER[a.ruolo ?? 'backup'] ?? 9) - (RUOLO_ORDER[b.ruolo ?? 'backup'] ?? 9),
  )

  return (
    <>
      <PanelHead
        title="Fornitori"
        desc="Dual-supplier: produttore strutturato per la core line (1.000+ pz/mese) + laboratorio per le capsule. Condizioni target: 30% avvio, saldo dopo, preferenza pagamento 60gg, condizioni migliori al crescere degli ordini."
        actions={
          <button className="btn" onClick={openCreate}>
            + Nuovo fornitore
          </button>
        }
      />

      {isLoading && <Loading label="Caricamento fornitori…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <div className="grid c3">
          {sorted.map((f) => (
            <div className="card" key={f.id}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className={`badge ${ruoloBadgeClass(f.ruolo)}`}>{ruoloLabel(f.ruolo)}</span>
                <span className={`badge ${statoBadgeClass(f.stato)}`}>{statoLabel(f.stato)}</span>
              </div>
              <div className="card-title">{f.nome}</div>
              <div className="card-meta">
                {f.luogo}
                {f.lead_time ? ` · Lead time: ${f.lead_time}` : ''}
              </div>
              {f.contatto && <div className="card-meta" style={{ marginTop: 6 }}>☎ {f.contatto}</div>}
              {f.materiali && <div className="card-meta" style={{ marginTop: 6 }}>{f.materiali}</div>}
              {f.note && <div className="note">{f.note}</div>}
              <div className="card-actions">
                <button className="btn sm ghost" onClick={() => openEdit(f)}>
                  Modifica
                </button>
                <button className="btn sm danger" onClick={() => handleDelete(f)}>
                  Elimina
                </button>
              </div>
            </div>
          ))}
          {sorted.length === 0 && <EmptyState icon="box" text="Nessun fornitore in scheda." ctaLabel="+ Nuovo fornitore" onCta={openCreate} />}
        </div>
      )}

      <hr className="divider" />
      <div className="card">
        <span className="code">GRIGLIA DI VETTING — le domande che separano chi regge 1.000+ pz/mese</span>
        <div className="note" style={{ marginTop: 10 }}>
          1. Capacità mensile massima per categoria (leggings, top, felpe)?
          <br />
          2. Quanti clienti ricorrenti gestite già con questo volume?
          <br />
          3. Lead time a regime e tempo di ramp-up?
          <br />
          4. Politica tessuti: stock o da ordinare? Minimi su filato/tessuto?
          <br />
          5. Quality control su lotti ripetuti?
          <br />
          6. MOQ, costi extra per aggiunte/riordini, possibilità di bulk successivo?
          <br />
          7. Condizioni di pagamento: 30% upfront + saldo? Apertura a 60gg?
        </div>
      </div>

      {modalMode !== 'none' && (
        <Modal title={modalMode === 'edit' ? 'Modifica fornitore' : 'Nuovo fornitore'} onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <FormFields
              fields={FORNITORE_FIELDS}
              values={values}
              onChange={(key, value) => setValues((v) => ({ ...v, [key]: value }))}
            />
            {formError && <p className="auth-msg err">{formError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={closeModal}>
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
