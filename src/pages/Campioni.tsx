import { useState, type FormEvent } from 'react'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import GadgetRow from '../components/GadgetRow'
import OwnerBadge from '../components/OwnerBadge'
import { useSamples, useCreateSample, useUpdateSample, useDeleteSample, type Sample } from '../features/samples/queries'
import ImageUpload from '../components/ImageUpload'
import { useSignedUrl } from '../lib/useSignedUrl'
import { useFornitori } from '../features/fornitori/queries'
import { OWNER_OPTS } from '../lib/tabs'
import { fmtDate } from '../lib/format'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction, usePendingEntity } from '../lib/navigation'
import type { SampleVerdetto } from '../lib/database.types'

const VERDETTI: { value: SampleVerdetto; label: string }[] = [
  { value: 'in-review', label: 'In review' },
  { value: 'approvato', label: 'Approvato' },
  { value: 'revisione', label: 'Da rivedere' },
  { value: 'scartato', label: 'Scartato' },
]

const verdettoLabel = (v: SampleVerdetto) => VERDETTI.find((x) => x.value === v)?.label ?? v
const verdettoDot = (v: SampleVerdetto) =>
  ({ 'in-review': 'var(--amber)', approvato: 'var(--ok)', revisione: 'var(--amber)', scartato: 'var(--ember)' })[v] ??
  'var(--dim)'
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
  img_path: '',
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
    img_path: s.img_path ?? '',
  }
}

/** Foto campione nella riga: thumb quadrato via signed URL, fallback ★. */
function SmpThumb({ path }: { path: string | null }) {
  const url = useSignedUrl(path)
  return (
    <span className="smp-thumb" aria-hidden>
      {url ? <img src={url} alt="" loading="lazy" /> : '★'}
    </span>
  )
}

export default function Campioni() {
  const { data: samples, isLoading, isError, error, refetch } = useSamples()
  const { data: fornitori } = useFornitori()
  const createSample = useCreateSample()
  const updateSample = useUpdateSample()
  const deleteSample = useDeleteSample()
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()
  const logActivity = useActivityLogger()

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [formError, setFormError] = useState<string | null>(null)

  const saving = createSample.isPending || updateSample.isPending
  const draft = useFormDraft(`campione:${editingId ?? 'new'}`, modalMode !== 'none', values, setValues)

  useRegisterNewAction(openCreate)

  usePendingEntity('sample', !!samples, (id) => {
    const s = samples?.find((x) => x.id === id)
    if (s) openEdit(s)
  })

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
      img_path: String(values.img_path ?? '') || null,
    }
    try {
      if (modalMode === 'edit' && editingId) {
        await updateSample.mutateAsync({ id: editingId, patch })
        showToast('success', 'Campione aggiornato.')
        logActivity('ha aggiornato il campione', `«${nome}»`, 'samples')
      } else {
        await createSample.mutateAsync(patch)
        showToast('success', 'Campione creato.')
        logActivity('ha creato il campione', `«${nome}»`, 'samples')
      }
      draft.clear()
      setModalMode('none')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function handleDelete(s: Sample) {
    confirmDelete(`Eliminare "${s.nome}"?`, async () => {
      await deleteSample.mutateAsync(s.id)
      logActivity('ha eliminato un campione', 'dalla review', 'samples')
    }, 'Campione eliminato')
  }

  const fornNome = (id: string | null) => fornitori?.find((f) => f.id === id)?.nome ?? '—'

  return (
    <>
      <div className="pg-head">
        <div>
          <h2 className="ov-title">Review Campioni</h2>
          <div className="ov-sub">
            {(samples ?? []).length} CAMPION{(samples ?? []).length === 1 ? 'E' : 'I'} · 4 ASSI DI VALUTAZIONE
          </div>
        </div>
        <button className="tlink" onClick={openCreate}>
          + Campione
        </button>
      </div>
      <p className="pg-note">Ogni sample valutato su 4 assi. Le note diventano il feedback da girare al fornitore.</p>

      {isLoading && (
        <div aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="skeleton" key={i} style={{ height: 16, marginBottom: 16 }} />
          ))}
        </div>
      )}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          {(samples ?? []).length ? (
            <div className="dtable" style={{ '--dt-cols': '2fr 1.7fr .6fr 1.1fr .9fr 40px' } as React.CSSProperties}>
              <div className="dt-headrow" aria-hidden>
                <span>Campione</span>
                <span>Punteggi</span>
                <span>Media</span>
                <span>Verdetto</span>
                <span>Owner</span>
                <span />
              </div>
              {(samples ?? []).map((s, i) => {
                const fit = s.fit ?? 3
                const tessuto = s.tessuto ?? 3
                const cuciture = s.cuciture ?? 3
                const colore = s.colore ?? 3
                const media = ((fit + tessuto + cuciture + colore) / 4).toFixed(1)
                return (
                  <div
                    className="dt-row clickable"
                    key={s.id}
                    onClick={() => openEdit(s)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openEdit(s)
                      }
                    }}
                  >
                    <span className="dt-main" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <SmpThumb path={s.img_path} />
                      <span style={{ minWidth: 0 }}>
                        <span className="dt-name">{s.nome}</span>
                        <span className="dt-under">
                          SMP-{String(i + 1).padStart(2, '0')} · {fornNome(s.fornitore_id)} · {fmtDate(s.data_arrivo)}
                        </span>
                      </span>
                    </span>
                    <span className="smp-scores">
                      {(
                        [
                          ['FIT', fit],
                          ['TES', tessuto],
                          ['CUC', cuciture],
                          ['COL', colore],
                        ] as [string, number][]
                      ).map(([l, v]) => (
                        <span className={`smp-score ${scoreClass(v)}`} key={l}>
                          {l} <b>{v}</b>
                        </span>
                      ))}
                    </span>
                    <span className="dt-big">{media}</span>
                    <span className="dt-tag" style={{ color: 'var(--muted)' }}>
                      <span className="dt-dot" style={{ background: verdettoDot(s.verdetto) }} />
                      {verdettoLabel(s.verdetto)}
                    </span>
                    <span>
                      <OwnerBadge owner={s.owner} />
                    </span>
                    <button
                      className="dt-x"
                      aria-label={`Elimina ${s.nome}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(s)
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon="star" text="Nessun campione registrato." ctaLabel="+ Nuovo campione" onCta={openCreate} />
          )}
        </>
      )}

      <hr className="divider" />
      <GadgetRow />

      {modalMode !== 'none' && (
        <Modal title={modalMode === 'edit' ? 'Modifica campione' : 'Nuovo campione'} onClose={() => setModalMode('none')}>
          <form onSubmit={handleSubmit}>
            <div className="f-logo-edit">
              <ImageUpload
                path={String(values.img_path ?? '') || null}
                entityType="samples"
                onUploaded={(p) => setValues((v) => ({ ...v, img_path: p }))}
                className="smp-photo-upload"
                fallback="+"
                title="Tocca per caricare/cambiare la foto del campione"
              />
              <span className="code">FOTO CAMPIONE (OPZIONALE)</span>
            </div>
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
