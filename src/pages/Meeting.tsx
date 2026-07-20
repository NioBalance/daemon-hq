import { useState, type FormEvent } from 'react'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import {
  useMeetings,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
  useMeetingActions,
  useAddMeetingAction,
  useUpdateMeetingAction,
  useDeleteMeetingAction,
  type Meeting,
} from '../features/meetings/queries'
import { useOggiItems } from '../features/oggi/aggregate'
import { useAuth } from '../auth/useAuth'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction } from '../lib/navigation'
import { fmtDate, todayIso } from '../lib/format'
import type { MeetingStato, MeetingPiattaforma } from '../lib/database.types'

const MEETING_FIELDS: FieldDef[] = [
  { key: 'titolo', label: 'Titolo riunione' },
  { key: 'data', label: 'Data', type: 'date', half: true },
  {
    key: 'stato',
    label: 'Stato',
    type: 'select',
    half: true,
    options: [
      { value: 'pianificata', label: 'Pianificata' },
      { value: 'conclusa', label: 'Conclusa' },
    ],
  },
  { key: 'partecipanti', label: 'Partecipanti (es. Andrea, Marco)' },
  { key: 'note', label: 'Verbale / appunti', type: 'textarea' },
]

const EMPTY: FormValues = {
  titolo: '',
  data: todayIso(),
  stato: 'pianificata',
  partecipanti: '',
  note: '',
  piattaforma: 'meet',
  link_riunione: '',
}

const statoDot = (s: MeetingStato) => (s === 'conclusa' ? 'var(--ok)' : 'var(--amber)')

// Piattaforme videochiamata: il servizio crea la stanza, l'utente incolla il
// link (la generazione via API resta backlog avanzato).
const PLATFORMS: { key: MeetingPiattaforma; label: string; create: string | null; color: string }[] = [
  { key: 'meet', label: 'Meet', create: 'https://meet.new', color: '#00ac47' },
  { key: 'zoom', label: 'Zoom', create: 'https://zoom.us/start', color: '#2d8cff' },
  { key: 'teams', label: 'Teams', create: 'https://teams.microsoft.com/l/meeting/new', color: '#6264a7' },
  { key: 'altro', label: 'Altro', create: null, color: 'var(--muted)' },
]
const platformOf = (k: MeetingPiattaforma | null) => PLATFORMS.find((p) => p.key === k) ?? null

function CamIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="6.5" width="12" height="11" rx="2" />
      <path d="M15 10.5l5-2.5v8l-5-2.5z" />
    </svg>
  )
}

export default function Meeting() {
  const meetingsQ = useMeetings()
  const actionsQ = useMeetingActions()
  const createMeeting = useCreateMeeting()
  const updateMeeting = useUpdateMeeting()
  const deleteMeeting = useDeleteMeeting()
  const addAction = useAddMeetingAction()
  const updateAction = useUpdateMeetingAction()
  const deleteAction = useDeleteMeetingAction()
  const oggi = useOggiItems()
  const { profile } = useAuth()
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()
  const logActivity = useActivityLogger()

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [formError, setFormError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [newAction, setNewAction] = useState('')
  const [newAssegn, setNewAssegn] = useState('')
  const [newScad, setNewScad] = useState('')

  const saving = createMeeting.isPending || updateMeeting.isPending
  const draft = useFormDraft(`meeting:${editingId ?? 'new'}`, modalMode !== 'none', values, setValues)

  useRegisterNewAction(openCreate)

  const meetings = meetingsQ.data ?? []
  const actions = actionsQ.data ?? []
  const openMeeting = meetings.find((m) => m.id === openId) ?? null
  const openActions = actions.filter((a) => a.meeting_id === openId)

  function openCreate() {
    setValues(EMPTY)
    setFormError(null)
    setEditingId(null)
    setModalMode('create')
  }

  function openEdit(m: Meeting) {
    setValues({
      titolo: m.titolo,
      data: m.data ?? '',
      stato: m.stato,
      partecipanti: m.partecipanti ?? '',
      note: m.note ?? '',
      piattaforma: m.piattaforma ?? 'meet',
      link_riunione: m.link_riunione ?? '',
    })
    setFormError(null)
    setEditingId(m.id)
    setModalMode('edit')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const titolo = String(values.titolo ?? '').trim()
    if (!titolo) {
      setFormError('Inserisci il titolo della riunione.')
      return
    }
    const link = String(values.link_riunione ?? '').trim()
    if (link && !link.startsWith('https://')) {
      setFormError('Il link della riunione deve essere un URL completo https://…')
      return
    }
    const patch = {
      titolo,
      data: String(values.data ?? '') || null,
      stato: values.stato as MeetingStato,
      partecipanti: String(values.partecipanti ?? '').trim() || null,
      note: String(values.note ?? '').trim() || null,
      piattaforma: values.piattaforma as MeetingPiattaforma,
      link_riunione: link || null,
    }
    try {
      if (modalMode === 'edit' && editingId) {
        await updateMeeting.mutateAsync({ id: editingId, patch })
        showToast('success', 'Riunione aggiornata.')
        logActivity('ha aggiornato la riunione', `«${titolo}»`, 'riunioni')
      } else {
        const id = await createMeeting.mutateAsync({
          ...patch,
          author_id: profile?.id ?? null,
          author_name: profile?.nome ?? '',
        })
        showToast('success', 'Riunione creata.')
        logActivity('ha creato la riunione', `«${titolo}»`, 'riunioni')
        setOpenId(id)
      }
      draft.clear()
      setModalMode('none')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function handleDelete(m: Meeting) {
    confirmDelete(`Eliminare "${m.titolo}" e i suoi action item?`, async () => {
      await deleteMeeting.mutateAsync(m.id)
      logActivity('ha eliminato la riunione', `«${m.titolo}»`, 'riunioni')
      if (openId === m.id) setOpenId(null)
    }, 'Riunione eliminata')
  }

  async function addActionItem(testo: string, assegnatario: string | null, scadenza: string | null) {
    if (!openId || !testo.trim()) return
    const ordine = openActions.length
    try {
      await addAction.mutateAsync({
        meeting_id: openId,
        testo: testo.trim(),
        assegnatario: assegnatario?.trim() || null,
        scadenza: scadenza || null,
        ordine,
      })
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function submitNewAction(e: FormEvent) {
    e.preventDefault()
    if (!newAction.trim()) return
    await addActionItem(newAction, newAssegn, newScad)
    setNewAction('')
    setNewAssegn('')
    setNewScad('')
  }

  function toggleAction(id: string, done: boolean) {
    updateAction.mutate({ id, patch: { done } })
  }

  function removeAction(id: string) {
    deleteAction.mutate(id)
  }

  if (meetingsQ.isError) {
    return (
      <>
        <div className="ov-head">
          <h2 className="ov-title">Riunioni</h2>
        </div>
        <ErrorState
          message={`${meetingsQ.error.message} — se le tabelle non esistono, esegui la migration 0012_riunioni.sql.`}
          onRetry={() => meetingsQ.refetch()}
        />
      </>
    )
  }

  return (
    <>
      <div className="pg-head">
        <div>
          <h2 className="ov-title">Riunioni</h2>
          <div className="ov-sub">
            {meetings.length} RIUNION{meetings.length === 1 ? 'E' : 'I'} · MEMORIA DECISIONALE DEL TEAM
          </div>
        </div>
        <button className="pg-add" onClick={openCreate}>
          + Riunione
        </button>
      </div>

      {meetingsQ.isLoading ? (
        <div aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="skeleton" key={i} style={{ height: 16, marginBottom: 16 }} />
          ))}
        </div>
      ) : (
        <div className="mtg-cols">
          <section aria-label="Riunioni">
            {meetings.length ? (
              <ul className="mtg-list">
                {meetings.map((m) => {
                  const nAct = actions.filter((a) => a.meeting_id === m.id)
                  const aperte = nAct.filter((a) => !a.done).length
                  return (
                    <li key={m.id}>
                      <button
                        className={`mtg-row${openId === m.id ? ' sel' : ''}`}
                        onClick={() => setOpenId(m.id === openId ? null : m.id)}
                      >
                        <span className="mtg-row-main">
                          <span className="mtg-title">{m.titolo}</span>
                          <span className="mtg-under">
                            {m.data ? fmtDate(m.data) : 'senza data'}
                            {m.partecipanti ? ` · ${m.partecipanti}` : ''}
                          </span>
                        </span>
                        <span className="mtg-row-meta">
                          {m.link_riunione && (
                            <span
                              className="mtg-row-cam"
                              title={`Entra${platformOf(m.piattaforma) ? ` su ${platformOf(m.piattaforma)!.label}` : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(m.link_riunione!, '_blank', 'noopener,noreferrer')
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  window.open(m.link_riunione!, '_blank', 'noopener,noreferrer')
                                }
                              }}
                            >
                              <CamIcon color={platformOf(m.piattaforma)?.color ?? 'var(--bone)'} />
                            </span>
                          )}
                          <span className="dt-tag" style={{ color: 'var(--muted)' }}>
                            <span className="dt-dot" style={{ background: statoDot(m.stato) }} />
                            {m.stato}
                          </span>
                          {nAct.length > 0 && (
                            <span className="mtg-count">
                              {aperte}/{nAct.length} azioni
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState icon="note" text="Nessuna riunione ancora." ctaLabel="+ Nuova riunione" onCta={openCreate} />
            )}
          </section>

          <aside aria-label="Dettaglio" className="mtg-detail">
            {openMeeting ? (
              <>
                <div className="mtg-detail-head">
                  <h3 className="ov-col-title" style={{ margin: 0 }}>
                    {openMeeting.titolo}
                  </h3>
                  <div className="row" style={{ gap: 14 }}>
                    <button className="tlink" onClick={() => openEdit(openMeeting)}>
                      Modifica
                    </button>
                    <button className="dt-x" onClick={() => handleDelete(openMeeting)} aria-label="Elimina riunione">
                      ✕
                    </button>
                  </div>
                </div>
                {openMeeting.link_riunione && (
                  <a
                    className="mtg-enter"
                    href={openMeeting.link_riunione}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={openMeeting.link_riunione}
                  >
                    <CamIcon color={platformOf(openMeeting.piattaforma)?.color ?? 'var(--bone)'} />
                    Entra{platformOf(openMeeting.piattaforma) ? ` su ${platformOf(openMeeting.piattaforma)!.label}` : ''} →
                  </a>
                )}
                {openMeeting.note && <p className="mtg-note">{openMeeting.note}</p>}

                <h4 className="pg-eyebrow" style={{ marginTop: 20 }}>
                  Action item
                </h4>
                {openActions.length ? (
                  <ul className="now-list">
                    {openActions.map((a) => (
                      <li className="now-row" key={a.id}>
                        <input
                          type="checkbox"
                          className="now-check"
                          checked={a.done}
                          aria-label={`Completa: ${a.testo}`}
                          onChange={(e) => toggleAction(a.id, e.target.checked)}
                        />
                        <span className={`mtg-act${a.done ? ' done' : ''}`}>
                          {a.testo}
                          <span className="mtg-act-meta">
                            {a.assegnatario ? `→ ${a.assegnatario}` : ''}
                            {a.scadenza ? ` · ${fmtDate(a.scadenza)}` : ''}
                          </span>
                        </span>
                        <button className="dt-x" onClick={() => removeAction(a.id)} aria-label="Rimuovi action item">
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="now-none">Nessun action item — aggiungine uno o promuovi uno spunto.</p>
                )}

                <form className="mtg-add" onSubmit={submitNewAction}>
                  <input
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    placeholder="Nuovo action item…"
                    aria-label="Nuovo action item"
                  />
                  <input
                    value={newAssegn}
                    onChange={(e) => setNewAssegn(e.target.value)}
                    placeholder="Assegnatario"
                    aria-label="Assegnatario"
                    className="mtg-add-who"
                  />
                  <input
                    type="date"
                    value={newScad}
                    onChange={(e) => setNewScad(e.target.value)}
                    aria-label="Scadenza"
                    className="mtg-add-when"
                  />
                  <button className="btn sm" type="submit" disabled={addAction.isPending || !newAction.trim()}>
                    +
                  </button>
                </form>

                <h4 className="pg-eyebrow" style={{ marginTop: 24 }}>
                  Spunti dalle urgenze <span className="mtg-live">live</span>
                </h4>
                {oggi.items.length ? (
                  <ul className="mtg-spunti">
                    {oggi.items.slice(0, 8).map((it) => (
                      <li key={it.key}>
                        <span className="mtg-spunto-txt">
                          <span className="now-tag">{it.tag}</span>
                          {it.testo}
                        </span>
                        <button
                          className="tlink"
                          onClick={() => void addActionItem(`${it.tag}: ${it.testo}`, null, null)}
                          title="Aggiungi come action item"
                        >
                          + azione
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="now-none">Nessuna urgenza aperta da discutere.</p>
                )}
              </>
            ) : (
              <p className="now-none">Seleziona una riunione per vederne verbale e action item.</p>
            )}
          </aside>
        </div>
      )}

      {modalMode !== 'none' && (
        <Modal title={modalMode === 'edit' ? 'Modifica riunione' : 'Nuova riunione'} onClose={() => setModalMode('none')}>
          <form onSubmit={handleSubmit}>
            <FormFields fields={MEETING_FIELDS} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />

            <div className="mtg-online">
              <span className="mtg-online-lbl">Riunione online</span>
              <div className="mtg-plat">
                {PLATFORMS.map((p) => (
                  <button
                    type="button"
                    key={p.key}
                    className={`mtg-plat-btn${values.piattaforma === p.key ? ' active' : ''}`}
                    onClick={() => setValues((s) => ({ ...s, piattaforma: p.key }))}
                  >
                    <CamIcon color={values.piattaforma === p.key ? p.color : 'var(--dim)'} />
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mtg-linkrow">
                <input
                  value={String(values.link_riunione ?? '')}
                  onChange={(e) => setValues((s) => ({ ...s, link_riunione: e.target.value }))}
                  placeholder="Incolla qui il link della stanza (https://…)"
                  aria-label="Link riunione"
                />
                {platformOf(values.piattaforma as MeetingPiattaforma)?.create && (
                  <a
                    className="btn sm ghost"
                    href={platformOf(values.piattaforma as MeetingPiattaforma)!.create!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Crea stanza →
                  </a>
                )}
              </div>
              <span className="mtg-online-hint">
                Crea la stanza sul servizio, copia il link e incollalo qui.
              </span>
            </div>

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
