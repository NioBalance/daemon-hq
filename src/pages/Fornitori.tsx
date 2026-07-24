import { useState, type FormEvent } from 'react'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import NotesList from '../components/NotesList'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction, usePendingEntity } from '../lib/navigation'
import type { FornitoreRuolo, FornitoreStato } from '../lib/database.types'
import {
  useFornitori,
  useCreateFornitore,
  useUpdateFornitore,
  useDeleteFornitore,
  type Fornitore,
} from '../features/fornitori/queries'
import { useTechpacks } from '../features/techpacks/queries'
import ImageUpload from '../components/ImageUpload'
import CountryFlag from '../components/CountryFlag'
import { useSignedUrl } from '../lib/useSignedUrl'

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

const statoLabel = (s: FornitoreStato) => F_STATI.find((x) => x.value === s)?.label ?? s
const ruoloDot = (r: FornitoreRuolo | null) =>
  r === 'core' ? 'var(--ember)' : r === 'capsule' ? 'var(--amber)' : 'var(--dim)'
const statoDot = (s: FornitoreStato) =>
  ({ 'da-contattare': 'var(--dim)', vetting: 'var(--amber)', attivo: 'var(--ok)', scartato: 'var(--ember)' })[s] ??
  'var(--dim)'

const FORNITORE_FIELDS: FieldDef[] = [
  { key: 'nome', label: 'Nome fornitore' },
  { key: 'main_products', label: 'Prodotti principali (es. Leggings, Top)' },
  { key: 'luogo', label: 'Località (es. Carpi, IT)', half: true },
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
  { key: 'telefono', label: 'Telefono', half: true },
  { key: 'chat_url', label: 'Chat diretta (URL completo: https://wa.me/39… o https://instagram.com/…)' },
  { key: 'contatto', label: 'Contatto (referente, email…)' },
  { key: 'materiali', label: 'Materiali / specializzazione', type: 'textarea' },
  { key: 'note', label: 'Note vetting e condizioni (30% avvio / 70% saldo, pagamento 60gg…)', type: 'textarea' },
]

const EMPTY_VALUES: FormValues = {
  nome: '',
  main_products: '',
  luogo: '',
  ruolo: 'core',
  stato: 'da-contattare',
  lead_time: '',
  telefono: '',
  chat_url: '',
  contatto: '',
  materiali: '',
  note: '',
  logo_path: '',
}

function fornitoreToValues(f: Fornitore): FormValues {
  return {
    nome: f.nome,
    main_products: f.main_products ?? '',
    luogo: f.luogo ?? '',
    ruolo: f.ruolo ?? 'core',
    stato: f.stato,
    lead_time: f.lead_time ?? '',
    telefono: f.telefono ?? '',
    chat_url: f.chat_url ?? '',
    contatto: f.contatto ?? '',
    materiali: f.materiali ?? '',
    note: f.note ?? '',
    logo_path: f.logo_path ?? '',
  }
}

/** Logo fornitore nella riga: thumb rotondo via signed URL, fallback iniziale. */
function FLogo({ path, nome }: { path: string | null; nome: string }) {
  const url = useSignedUrl(path)
  return (
    <span className="f-logo" aria-hidden>
      {url ? <img src={url} alt="" loading="lazy" /> : nome.slice(0, 1).toUpperCase()}
    </span>
  )
}

type ChatKind = 'wa' | 'ig' | 'other'
function chatKind(url: string): ChatKind {
  if (/wa\.me|whatsapp/i.test(url)) return 'wa'
  if (/instagram/i.test(url)) return 'ig'
  return 'other'
}
const chatText = (k: ChatKind) => (k === 'wa' ? 'WhatsApp' : k === 'ig' ? 'Instagram' : 'Chat')

function ChatIcon({ kind }: { kind: ChatKind }) {
  if (kind === 'wa')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3.5 20.5l1.4-3.8A7.5 7.5 0 1 1 7.8 19z" />
        <path d="M9 9.2c0 2.8 2.3 5.1 5.1 5.1.5 0 .9-.5.9-1l-.1-.8-1.6-.5-.8.8c-.8-.4-1.5-1.1-1.9-1.9l.8-.8-.5-1.6-.8-.1c-.5 0-1 .4-1 .9z" />
      </svg>
    )
  if (kind === 'ig')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="16.7" cy="7.3" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M20 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 14-5z" />
    </svg>
  )
}

/** Scinde "Carpi, IT" in città + codice paese ISO-2. Senza codice esplicito
 *  assume IT (brand italiano, fornitori quasi tutti italiani); '' se nessuna
 *  località. */
function locationParts(luogo: string | null): { city: string; cc: string } {
  const raw = (luogo ?? '').trim()
  if (!raw) return { city: '—', cc: '' }
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  const hasCode = parts.length >= 2 && /^[A-Za-z]{2}$/.test(parts[parts.length - 1])
  const cc = hasCode ? parts[parts.length - 1].toUpperCase() : 'IT'
  const city = (hasCode ? parts.slice(0, -1) : parts).join(', ')
  return { city: city || '—', cc }
}

/** Cella Fornitore: logo, nome (primario), città con bandiera + telefono
 *  (secondari, su riga sotto), badge chat ben distanziato a destra. */
function FornitoreCell({ f }: { f: Fornitore }) {
  const { city, cc } = locationParts(f.luogo)
  const k = f.chat_url ? chatKind(f.chat_url) : null
  return (
    <span className="dt-main f-main">
      <FLogo path={f.logo_path} nome={f.nome} />
      <span className="f-idblock">
        <span className="dt-name">{f.nome}</span>
        <span className="dt-under">
          {cc && <CountryFlag cc={cc} size={16} />}
          <span className="f-city">{city}</span>
          {f.telefono ? ` · ${f.telefono}` : ''}
        </span>
      </span>
      {f.chat_url && k && (
        <a
          className={`f-chat f-chat-${k}`}
          href={f.chat_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={`Apri chat (${f.chat_url})`}
        >
          <ChatIcon kind={k} />
          {chatText(k)}
        </a>
      )}
    </span>
  )
}

const DT_COLS = '2.4fr 1.2fr .9fr 1fr .9fr .55fr 40px'

export default function Fornitori() {
  const { data: fornitori, isLoading, isError, error, refetch } = useFornitori()
  const techpacksQ = useTechpacks()
  const createFornitore = useCreateFornitore()
  const updateFornitore = useUpdateFornitore()
  const deleteFornitore = useDeleteFornitore()
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()
  const logActivity = useActivityLogger()

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [formError, setFormError] = useState<string | null>(null)
  // Filtri di sola presentazione (client-side, come da handoff)
  const [filtro, setFiltro] = useState<'tutti' | FornitoreRuolo>('tutti')
  const [cerca, setCerca] = useState('')

  const saving = createFornitore.isPending || updateFornitore.isPending
  const draft = useFormDraft(`fornitore:${editingId ?? 'new'}`, modalMode !== 'none', values, setValues)

  useRegisterNewAction(openCreate)

  usePendingEntity('fornitore', !!fornitori, (id) => {
    const f = fornitori?.find((x) => x.id === id)
    if (f) openEdit(f)
  })

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
    const chatUrl = String(values.chat_url ?? '').trim()
    if (chatUrl && !chatUrl.startsWith('https://')) {
      setFormError('La chat diretta deve essere un URL completo https://…')
      return
    }
    const patch = {
      nome,
      main_products: String(values.main_products ?? '').trim() || null,
      luogo: String(values.luogo ?? '').trim() || null,
      ruolo: values.ruolo as FornitoreRuolo,
      stato: values.stato as FornitoreStato,
      lead_time: String(values.lead_time ?? '').trim() || null,
      telefono: String(values.telefono ?? '').trim() || null,
      chat_url: chatUrl || null,
      logo_path: String(values.logo_path ?? '') || null,
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

  function handleDelete(f: Fornitore) {
    confirmDelete(`Eliminare "${f.nome}"?`, async () => {
      await deleteFornitore.mutateAsync(f.id)
      logActivity('ha eliminato il fornitore', `«${f.nome}»`, 'fornitori')
    }, 'Fornitore eliminato')
  }

  const tpPerFornitore = new Map<string, number>()
  for (const t of techpacksQ.data ?? []) {
    if (t.fornitore_id) tpPerFornitore.set(t.fornitore_id, (tpPerFornitore.get(t.fornitore_id) ?? 0) + 1)
  }

  const q = cerca.trim().toLowerCase()
  const sorted = [...(fornitori ?? [])]
    .filter((f) => filtro === 'tutti' || f.ruolo === filtro)
    .filter(
      (f) =>
        !q ||
        f.nome.toLowerCase().includes(q) ||
        (f.luogo ?? '').toLowerCase().includes(q) ||
        (f.main_products ?? '').toLowerCase().includes(q),
    )
    .sort((a, b) => (RUOLO_ORDER[a.ruolo ?? 'backup'] ?? 9) - (RUOLO_ORDER[b.ruolo ?? 'backup'] ?? 9))

  return (
    <>
      <div className="pg-head">
        <div>
          <h2 className="ov-title">Fornitori</h2>
          <div className="ov-sub">
            {(fornitori ?? []).length} CONTROPART{(fornitori ?? []).length === 1 ? 'E' : 'I'} · STRATEGIA DUAL-SUPPLIER
          </div>
        </div>
        <button className="pg-add" onClick={openCreate}>
          + Fornitore
        </button>
      </div>
      <p className="pg-note">
        Produttore strutturato per la core line (1.000+ pz/mese) + laboratorio per le capsule. Condizioni target: 30%
        avvio, saldo dopo, preferenza pagamento 60gg, condizioni migliori al crescere degli ordini.
      </p>

      {isLoading && (
        <div aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div className="skeleton" key={i} style={{ height: 16, marginBottom: 16 }} />
          ))}
        </div>
      )}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          <div className="dt-tools">
            <label className="dt-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
              <input
                value={cerca}
                onChange={(e) => setCerca(e.target.value)}
                placeholder="Filtra fornitori…"
                aria-label="Filtra fornitori"
              />
            </label>
            <div className="dt-filters" role="tablist" aria-label="Filtro ruolo">
              {(
                [
                  ['tutti', 'Tutti'],
                  ['core', 'Core'],
                  ['capsule', 'Capsule'],
                  ['backup', 'Backup'],
                ] as ['tutti' | FornitoreRuolo, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={filtro === v}
                  className={`dt-filter${filtro === v ? ' active' : ''}`}
                  onClick={() => setFiltro(v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {sorted.length ? (
            <div className="dtable" style={{ '--dt-cols': DT_COLS } as React.CSSProperties}>
              <div className="dt-headrow" aria-hidden>
                <span>Fornitore</span>
                <span>Main products</span>
                <span>Tipo</span>
                <span>Stato</span>
                <span>Lead time</span>
                <span>Tech pack</span>
                <span />
              </div>
              {sorted.map((f) => (
                <div
                  className="dt-row clickable"
                  key={f.id}
                  onClick={() => openEdit(f)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openEdit(f)
                    }
                  }}
                >
                  <FornitoreCell f={f} />
                  <span className="dt-meta">{f.main_products || '—'}</span>
                  <span className="dt-tag" style={{ color: ruoloDot(f.ruolo) }}>
                    <span className="dt-dot" style={{ background: ruoloDot(f.ruolo) }} />
                    {f.ruolo ?? '—'}
                  </span>
                  <span className="dt-tag" style={{ color: 'var(--muted)' }}>
                    <span className="dt-dot" style={{ background: statoDot(f.stato) }} />
                    {statoLabel(f.stato)}
                  </span>
                  <span className="dt-meta">{f.lead_time ?? '—'}</span>
                  <span className="dt-num">{tpPerFornitore.get(f.id) ?? 0}</span>
                  <button
                    className="dt-x"
                    aria-label={`Elimina ${f.nome}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(f)
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="box"
              text={q || filtro !== 'tutti' ? 'Nessun fornitore col filtro attivo.' : 'Nessun fornitore in scheda.'}
              ctaLabel="+ Nuovo fornitore"
              onCta={openCreate}
            />
          )}
        </>
      )}

      <section className="pg-section" aria-label="Griglia di vetting">
        <h3 className="pg-eyebrow">Griglia di vetting — chi regge 1.000+ pz/mese</h3>
        <div className="pg-lines">
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
      </section>

      {modalMode !== 'none' && (
        <Modal title={modalMode === 'edit' ? 'Modifica fornitore' : 'Nuovo fornitore'} onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <div className="f-logo-edit">
              <ImageUpload
                path={String(values.logo_path ?? '') || null}
                entityType="fornitori"
                onUploaded={(p) => setValues((v) => ({ ...v, logo_path: p }))}
                className="f-logo-upload"
                fallback="+"
                title="Tocca per caricare/cambiare il logo"
              />
              <span className="code">Logo (opzionale)</span>
            </div>
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
          {modalMode === 'edit' && editingId && <NotesList entityType="fornitori" entityId={editingId} />}
        </Modal>
      )}
    </>
  )
}
