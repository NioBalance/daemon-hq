import { useState, type FormEvent } from 'react'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
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
import { useTechpackFiles, type TechpackFile } from '../features/techpackFiles/queries'
import { useSignedUrl } from '../lib/useSignedUrl'
import { useAddNote } from '../features/notes/queries'
import { useAuth } from '../auth/useAuth'
import { OWNER_OPTS } from '../lib/tabs'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction, usePendingEntity } from '../lib/navigation'
import type { TechpackStato } from '../lib/database.types'

const TP_STATI: { value: TechpackStato; label: string }[] = [
  { value: 'bozza', label: 'Bozza' },
  { value: 'inviato', label: 'Inviato al fornitore' },
  { value: 'confermato', label: 'Confermato' },
  { value: 'in-produzione', label: 'In produzione' },
]

const statoLabel = (s: TechpackStato) => TP_STATI.find((x) => x.value === s)?.label ?? s
const statoDot = (v: TechpackStato) =>
  ({ bozza: 'var(--dim)', inviato: 'var(--amber)', confermato: 'var(--ok)', 'in-produzione': 'var(--ember)' })[v] ??
  'var(--dim)'

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

/** Mini-anteprima di un file della cartella: immagini via signed URL,
 *  icona per PDF e formati non-immagine; click apre il file. */
function TpThumb({ file }: { file: TechpackFile }) {
  const url = useSignedUrl(file.path)
  const isImg = file.tipo === 'img'
  return (
    <a
      className="tp-thumb"
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      title={file.nome}
      aria-label={`Apri ${file.nome}`}
      onClick={(e) => {
        e.stopPropagation()
        if (!url) e.preventDefault()
      }}
    >
      {isImg && url ? (
        <img src={url} alt="" loading="lazy" />
      ) : (
        <span className="tp-thumb-ext">{file.tipo === 'pdf' ? 'PDF' : (file.nome.split('.').pop() ?? '?').toUpperCase().slice(0, 4)}</span>
      )}
    </a>
  )
}

const TP_THUMBS_MAX = 6

/** Striscia anteprime sotto la riga: primi file della cartella + overflow. */
function TpThumbStrip({ files, onOpenFolder }: { files: TechpackFile[]; onOpenFolder: () => void }) {
  const anteprime = files.filter((x) => x.tipo !== 'link').slice(0, TP_THUMBS_MAX)
  if (!anteprime.length) return null
  const resto = files.filter((x) => x.tipo !== 'link').length - anteprime.length
  return (
    <div className="tp-thumbs">
      {anteprime.map((x) => (
        <TpThumb key={x.id} file={x} />
      ))}
      {resto > 0 && (
        <button
          className="tp-thumb tp-thumb-more"
          onClick={(e) => {
            e.stopPropagation()
            onOpenFolder()
          }}
          aria-label={`Altri ${resto} file — apri la cartella`}
        >
          +{resto}
        </button>
      )}
    </div>
  )
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
  const confirmDelete = useConfirmDelete()
  const logActivity = useActivityLogger()

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [formError, setFormError] = useState<string | null>(null)

  const saving = createTechpack.isPending || updateTechpack.isPending
  const draft = useFormDraft(`techpack:${editingId ?? 'new'}`, modalMode !== 'none', values, setValues)

  useRegisterNewAction(openCreate)

  usePendingEntity('techpack', !!techpacks, (id) => {
    const t = techpacks?.find((x) => x.id === id)
    if (t) openEdit(t)
  })

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
        logActivity('ha aggiornato il tech pack', `«${nome}»`, 'techpack')
      } else {
        const created = await createTechpack.mutateAsync(patch)
        logChange(created.id, 'ha creato la scheda')
        showToast('success', 'Tech pack creato.')
        logActivity('ha creato il tech pack', `«${nome}»`, 'techpack')
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

  function handleDelete(t: Techpack) {
    confirmDelete(`Eliminare "${t.nome}" (inclusa la cartella file)?`, async () => {
      await deleteTechpack.mutateAsync(t.id)
      logActivity('ha eliminato il tech pack', `«${t.nome}»`, 'techpack')
    }, 'Tech pack eliminato')
  }

  const fornNome = (id: string | null) => fornitori?.find((f) => f.id === id)?.nome ?? '—'

  return (
    <>
      <div className="pg-head">
        <div>
          <h2 className="ov-title">Tech Pack</h2>
          <div className="ov-sub">{(techpacks ?? []).length} SCHEDE · IL CONTRATTO COL FORNITORE</div>
        </div>
        <button className="tlink" onClick={openCreate}>
          + Tech pack
        </button>
      </div>
      <p className="pg-note">
        La scheda tecnica è il contratto col fornitore: materiali, colorway, taglie e stato di conferma.
      </p>

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
          {(techpacks ?? []).length ? (
            <div className="dtable" style={{ '--dt-cols': '2.2fr 1.1fr 1.2fr .8fr .9fr 40px' } as React.CSSProperties}>
              <div className="dt-headrow" aria-hidden>
                <span>Tech pack</span>
                <span>Stato</span>
                <span>Fornitore</span>
                <span>Owner</span>
                <span>Cartella</span>
                <span />
              </div>
              {(techpacks ?? []).map((t, i) => {
                const files = (tpFiles ?? []).filter((x) => x.techpack_id === t.id)
                const fileCount = files.length
                return (
                  <div className="tp-block" key={t.id}>
                  <div
                    className="dt-row clickable no-line"
                    onClick={() => openEdit(t)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openEdit(t)
                      }
                    }}
                  >
                    <span className="dt-main">
                      <span className="dt-name">{t.nome}</span>
                      <span className="dt-under">
                        TP-{String(i + 1).padStart(2, '0')} · {t.categoria ?? '—'} · {t.colorway || '—'} ·{' '}
                        {t.taglie || '—'}
                      </span>
                    </span>
                    <span className="dt-tag" style={{ color: 'var(--muted)' }}>
                      <span className="dt-dot" style={{ background: statoDot(t.stato) }} />
                      {statoLabel(t.stato)}
                    </span>
                    <span className="dt-meta">{fornNome(t.fornitore_id)}</span>
                    <span>
                      <OwnerBadge owner={t.owner} />
                    </span>
                    <button
                      className="tlink"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFolderId(t.id)
                      }}
                    >
                      {fileCount} file →
                    </button>
                    <button
                      className="dt-x"
                      aria-label={`Elimina ${t.nome}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(t)
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <TpThumbStrip files={files} onOpenFolder={() => setFolderId(t.id)} />
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon="note" text="Nessun tech pack. Creane uno dal design approvato." ctaLabel="+ Nuovo tech pack" onCta={openCreate} />
          )}
        </>
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
