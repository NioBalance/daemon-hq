import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import OwnerBadge from '../components/OwnerBadge'
import { useSamples, useCreateSample, useUpdateSample, useDeleteSample, type Sample } from '../features/samples/queries'
import { useFornitori } from '../features/fornitori/queries'
import { OWNER_OPTS } from '../lib/tabs'
import { fmtDate } from '../lib/format'
import { useToast } from '../lib/useToast'
import type { SampleVerdetto } from '../lib/database.types'

const VERDETTI: { value: SampleVerdetto; label: string }[] = [
  { value: 'in-review', label: 'In review' },
  { value: 'approvato', label: 'Approvato' },
  { value: 'revisione', label: 'Da rivedere' },
  { value: 'scartato', label: 'Scartato' },
]

const verdettoLabel = (v: SampleVerdetto) => VERDETTI.find((x) => x.value === v)?.label ?? v
const verdettoBadgeClass = (v: SampleVerdetto) =>
  ({ 'in-review': 'amber', approvato: 'ok', revisione: 'amber', scartato: 'ember' })[v] ?? 'steel'
const scoreClass = (n: number) => (n >= 4 ? 'good' : n >= 3 ? 'mid' : 'bad')

const EMPTY_VALUES: FormValues = {
  nome: '',
  fornitore_id: '',
  data_arrivo: '',
  fit: 3,
  tessuto: 3,
  cuciture: 3,
  colore: 3,
  verdetto: 'in-review',
  owner: 'design',
  note: '',
}

function sampleToValues(s: Sample): FormValues {
  return {
    nome: s.nome,
    fornitore_id: s.fornitore_id ?? '',
    data_arrivo: s.data_arrivo ?? '',
    fit: s.fit ?? 3,
    tessuto: s.tessuto ?? 3,
    cuciture: s.cuciture ?? 3,
    colore: s.colore ?? 3,
    verdetto: s.verdetto,
    owner: s.owner ?? 'design',
    note: s.note ?? '',
  }
}

export default function Campioni() {
  const { data: samples, isLoading, isError, error, refetch } = useSamples()
  const { data: fornitori } = useFornitori()
  const createSample = useCreateSample()
  const updateSample = useUpdateSample()
  const deleteSample = useDeleteSample()
  const showToast = useToast()

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [formError, setFormError] = useState<string | null>(null)

  const saving = createSample.isPending || updateSample.isPending

  const SMP_FIELDS: FieldDef[] = [
    { key: 'nome', label: 'Capo / campione' },
    {
      key: 'fornitore_id',
      label: 'Fornitore',
      type: 'select',
      half: true,
      options: [{ value: '', label: '—' }, ...(fornitori ?? []).map((f) => ({ value: f.id, label: f.nome }))],
    },
    { key: 'data_arrivo', label: 'Data arrivo', type: 'date', half: true },
    { key: 'fit', label: 'Fit (1–5)', type: 'number', half: true, min: 1, max: 5 },
    { key: 'tessuto', label: 'Tessuto (1–5)', type: 'number', half: true, min: 1, max: 5 },
    { key: 'cuciture', label: 'Cuciture (1–5)', type: 'number', half: true, min: 1, max: 5 },
    { key: 'colore', label: 'Colore / stampa (1–5)', type: 'number', half: true, min: 1, max: 5 },
    { key: 'verdetto', label: 'Verdetto', type: 'select', half: true, options: VERDETTI.map((o) => ({ value: o.value, label: o.label })) },
    { key: 'owner', label: 'Owner', type: 'select', half: true, options: OWNER_OPTS.map((o) => ({ value: o.v, label: o.l })) },
    { key: 'note', label: 'Note review (cosa correggere per il fornitore)', type: 'textarea' },
  ]

  function openCreate() {
    setValues(EMPTY_VALUES)
    setFormError(null)
    setEditingId(null)
    setModalMode('create')
  }

  function openEdit(s: Sample) {
    setValues(sampleToValues(s))
    setFormError(null)
    setEditingId(s.id)
    setModalMode('edit')
  }

  function clampScore(v: unknown): number {
    const n = Number(v) || 3
    return Math.min(5, Math.max(1, Math.round(n)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nome = String(values.nome ?? '').trim()
    if (!nome) {
      setFormError('Inserisci il nome del campione.')
      return
    }
    const patch = {
      nome,
      fornitore_id: String(values.fornitore_id ?? '') || null,
      data_arrivo: String(values.data_arrivo ?? '') || null,
      fit: clampScore(values.fit),
      tessuto: clampScore(values.tessuto),
      cuciture: clampScore(values.cuciture),
      colore: clampScore(values.colore),
      verdetto: values.verdetto as SampleVerdetto,
      owner: values.owner as Sample['owner'],
      note: String(values.note ?? '').trim() || null,
    }
    try {
      if (modalMode === 'edit' && editingId) {
        await updateSample.mutateAsync({ id: editingId, patch })
        showToast('success', 'Campione aggiornato.')
      } else {
        await createSample.mutateAsync(patch)
        showToast('success', 'Campione creato.')
      }
      setModalMode('none')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function handleDelete(s: Sample) {
    if (!window.confirm('Eliminare definitivamente?')) return
    try {
      await deleteSample.mutateAsync(s.id)
      showToast('success', 'Campione eliminato.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
  }

  const fornNome = (id: string | null) => fornitori?.find((f) => f.id === id)?.nome ?? '—'

  return (
    <>
      <PanelHead
        title="Review Campioni"
        desc="Ogni sample valutato su 4 assi. Le note diventano il feedback da girare al fornitore."
        actions={
          <button className="btn" onClick={openCreate}>
            + Nuovo campione
          </button>
        }
      />

      {isLoading && <Loading label="Caricamento campioni…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <div className="grid c3">
          {(samples ?? []).map((s, i) => {
            const fit = s.fit ?? 3
            const tessuto = s.tessuto ?? 3
            const cuciture = s.cuciture ?? 3
            const colore = s.colore ?? 3
            const media = ((fit + tessuto + cuciture + colore) / 4).toFixed(1)
            return (
              <div className="card" key={s.id}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="code">SMP-{String(i + 1).padStart(2, '0')}</span>
                  <span className={`badge ${verdettoBadgeClass(s.verdetto)}`}>{verdettoLabel(s.verdetto)}</span>
                </div>
                <div className="card-title">{s.nome}</div>
                <div className="card-meta">
                  {fornNome(s.fornitore_id)} · arrivato {fmtDate(s.data_arrivo)} · media <strong>{media}</strong>
                </div>
                <div className="scores">
                  <div className="score">
                    <div className={`v ${scoreClass(fit)}`}>{fit}</div>
                    <div className="l">Fit</div>
                  </div>
                  <div className="score">
                    <div className={`v ${scoreClass(tessuto)}`}>{tessuto}</div>
                    <div className="l">Tessuto</div>
                  </div>
                  <div className="score">
                    <div className={`v ${scoreClass(cuciture)}`}>{cuciture}</div>
                    <div className="l">Cuciture</div>
                  </div>
                  <div className="score">
                    <div className={`v ${scoreClass(colore)}`}>{colore}</div>
                    <div className="l">Colore</div>
                  </div>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <OwnerBadge owner={s.owner} />
                </div>
                {s.note && <div className="note">{s.note}</div>}
                <div className="card-actions">
                  <button className="btn sm ghost" onClick={() => openEdit(s)}>
                    Modifica
                  </button>
                  <button className="btn sm danger" onClick={() => handleDelete(s)}>
                    Elimina
                  </button>
                </div>
              </div>
            )
          })}
          {(samples ?? []).length === 0 && <div className="empty">Nessun campione registrato.</div>}
        </div>
      )}

      {modalMode !== 'none' && (
        <Modal title={modalMode === 'edit' ? 'Modifica campione' : 'Nuovo campione'} onClose={() => setModalMode('none')}>
          <form onSubmit={handleSubmit}>
            <FormFields
              fields={SMP_FIELDS}
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
