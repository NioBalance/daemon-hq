import { useState, type FormEvent } from 'react'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import OwnerBadge from '../components/OwnerBadge'
import NotesList from '../components/NotesList'
import { useChats, useCreateChat, useUpdateChat, useDeleteChat, type Chat } from '../features/chats/queries'
import {
  useChatChannels,
  useCreateChatChannel,
  useUpdateChatChannel,
  useDeleteChatChannel,
  type ChatChannel,
} from '../features/chatChannels/queries'
import { OWNER_OPTS } from '../lib/tabs'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction, usePendingEntity } from '../lib/navigation'
import type { ChatCanale, ChatStato } from '../lib/database.types'

const CH_CANALI: { value: ChatCanale; label: string }[] = [
  { value: 'wa', label: 'WhatsApp' },
  { value: 'ig', label: 'Instagram' },
  { value: 'email', label: 'Email' },
]
const CH_STATI: { value: ChatStato; label: string }[] = [
  { value: 'aperta', label: 'Aperta' },
  { value: 'in-attesa', label: 'In attesa cliente' },
  { value: 'chiusa', label: 'Chiusa' },
]

const canaleLabel = (c: ChatCanale) => CH_CANALI.find((x) => x.value === c)?.label ?? c
const statoLabel = (s: ChatStato) => CH_STATI.find((x) => x.value === s)?.label ?? s
const statoDot = (s: ChatStato) => (s === 'aperta' ? 'var(--ember)' : s === 'chiusa' ? 'var(--ok)' : 'var(--amber)')

const CHAT_FIELDS: FieldDef[] = [
  { key: 'cliente', label: 'Cliente / conversazione' },
  { key: 'canale', label: 'Canale', type: 'select', half: true, options: CH_CANALI.map((o) => ({ value: o.value, label: o.label })) },
  { key: 'stato', label: 'Stato', type: 'select', half: true, options: CH_STATI.map((o) => ({ value: o.value, label: o.label })) },
  { key: 'owner', label: 'Chi la segue', type: 'select', options: OWNER_OPTS.map((o) => ({ value: o.v, label: o.l })) },
]

const CHANNEL_FIELDS: FieldDef[] = [
  { key: 'label', label: 'Nome' },
  { key: 'url', label: 'URL (es. app.manychat.com…)' },
]

/** Icona per i bottoni scorciatoia dei canali (§6.2), scelta dal nome. */
function ChannelIcon({ label }: { label: string }) {
  const l = label.toLowerCase()
  if (l.includes('whatsapp') || l.startsWith('wa'))
    return (
      <svg viewBox="0 0 24 24">
        <path d="M21 11.5a8.5 8.5 0 0 1-12.7 7.4L4 20l1.2-4.1A8.5 8.5 0 1 1 21 11.5z" />
        <path d="M9 9.5c.5 2.5 3 5 5.5 5.5l1-1.5-2-1-1 .5c-.8-.5-1.5-1.2-2-2l.5-1-1-2z" />
      </svg>
    )
  if (l.includes('instagram') || l.includes('direct'))
    return (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.6" />
      </svg>
    )
  if (l.includes('manychat') || l.includes('bot'))
    return (
      <svg viewBox="0 0 24 24">
        <rect x="4" y="7" width="16" height="12" rx="3" />
        <circle cx="9" cy="13" r="1" />
        <circle cx="15" cy="13" r="1" />
        <line x1="12" y1="3" x2="12" y2="7" />
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24">
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
    </svg>
  )
}

export default function Chats() {
  const { data: chats, isLoading, isError, error, refetch } = useChats()
  const createChat = useCreateChat()
  const updateChat = useUpdateChat()
  const deleteChat = useDeleteChat()
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()
  const logActivity = useActivityLogger()

  const { data: channels } = useChatChannels()
  const createChannel = useCreateChatChannel()
  const updateChannel = useUpdateChatChannel()
  const deleteChannel = useDeleteChatChannel()

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editing, setEditing] = useState<Chat | null>(null)
  const [values, setValues] = useState<FormValues>({ cliente: '', canale: 'wa', stato: 'aperta', owner: 'logistica' })
  const [formError, setFormError] = useState<string | null>(null)

  const [channelModal, setChannelModal] = useState<'none' | 'create' | 'edit'>('none')
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null)
  const [channelValues, setChannelValues] = useState<FormValues>({ label: '', url: '' })
  const [channelError, setChannelError] = useState<string | null>(null)
  const chatDraft = useFormDraft(`chat:${editing?.id ?? 'new'}`, modalMode !== 'none', values, setValues)
  const channelDraft = useFormDraft(
    `chat-channel:${editingChannel?.id ?? 'new'}`,
    channelModal !== 'none',
    channelValues,
    setChannelValues,
  )

  useRegisterNewAction(openCreate)

  usePendingEntity('chat', !!chats, (id) => {
    const c = chats?.find((x) => x.id === id)
    if (c) openEdit(c)
  })

  function openCreate() {
    setValues({ cliente: '', canale: 'wa', stato: 'aperta', owner: 'logistica' })
    setFormError(null)
    setEditing(null)
    setModalMode('create')
  }

  function openEdit(c: Chat) {
    setValues({ cliente: c.cliente, canale: c.canale, stato: c.stato, owner: c.owner ?? 'logistica' })
    setFormError(null)
    setEditing(c)
    setModalMode('edit')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cliente = String(values.cliente ?? '').trim()
    if (!cliente) {
      setFormError('Inserisci il nome del cliente/conversazione.')
      return
    }
    const patch = {
      cliente,
      canale: values.canale as ChatCanale,
      stato: values.stato as ChatStato,
      owner: values.owner as Chat['owner'],
    }
    try {
      if (modalMode === 'edit' && editing) {
        await updateChat.mutateAsync({ id: editing.id, patch })
        showToast('success', 'Conversazione aggiornata.')
      } else {
        await createChat.mutateAsync(patch)
        showToast('success', 'Conversazione creata.')
        logActivity('ha aperto una conversazione', 'nel customer care', 'chats')
      }
      chatDraft.clear()
      setModalMode('none')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function handleDelete(c: Chat) {
    confirmDelete(`Eliminare la conversazione con "${c.cliente}"?`, () => deleteChat.mutateAsync(c.id), 'Conversazione eliminata')
  }

  function openCreateChannel() {
    setChannelValues({ label: '', url: '' })
    setChannelError(null)
    setEditingChannel(null)
    setChannelModal('create')
  }
  function openEditChannel(c: ChatChannel) {
    setChannelValues({ label: c.label, url: c.url ?? '' })
    setChannelError(null)
    setEditingChannel(c)
    setChannelModal('edit')
  }
  async function handleChannelSubmit(e: FormEvent) {
    e.preventDefault()
    const label = String(channelValues.label ?? '').trim()
    if (!label) {
      setChannelError('Inserisci un nome.')
      return
    }
    const patch = { label, url: String(channelValues.url ?? '').trim() || null }
    try {
      if (channelModal === 'edit' && editingChannel) {
        await updateChannel.mutateAsync({ id: editingChannel.id, patch })
        showToast('success', 'Canale aggiornato.')
      } else {
        await createChannel.mutateAsync(patch)
        showToast('success', 'Canale creato.')
      }
      channelDraft.clear()
      setChannelModal('none')
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }
  function handleDeleteChannel(c: ChatChannel) {
    confirmDelete(`Eliminare il canale "${c.label}"?`, () => deleteChannel.mutateAsync(c.id), 'Canale eliminato')
  }

  const open = (chats ?? []).filter((c) => c.stato !== 'chiusa')
  const closed = (chats ?? []).filter((c) => c.stato === 'chiusa')

  const chatCard = (c: Chat) => (
    <div className="conv-row" key={c.id}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
          <span className="conv-name">{c.cliente}</span>
          <span className="dt-tag" style={{ color: 'var(--dim)' }}>{canaleLabel(c.canale)}</span>
          <span className="dt-tag" style={{ color: 'var(--muted)' }}>
            <span className="dt-dot" style={{ background: statoDot(c.stato) }} />
            {statoLabel(c.stato)}
          </span>
          <OwnerBadge owner={c.owner} />
        </div>
        <div className="row" style={{ gap: 14 }}>
          <button className="tlink" onClick={() => openEdit(c)} aria-label={`Modifica ${c.cliente}`}>✎</button>
          <button className="dt-x" onClick={() => handleDelete(c)} aria-label={`Elimina ${c.cliente}`}>✕</button>
        </div>
      </div>
      <NotesList entityType="chats" entityId={c.id} />
    </div>
  )

  return (
    <>
      <div className="pg-head">
        <div>
          <h2 className="ov-title">Chats — Customer Care</h2>
          <div className="ov-sub">{open.length} DA SEGUIRE · {closed.length} CHIUSE</div>
        </div>
        <button className="tlink" onClick={openCreate}>
          + Conversazione
        </button>
      </div>
      <p className="pg-note">
        Accesso rapido a ManyChat, WhatsApp e Direct + il registro delle conversazioni da seguire, con note firmate.
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
          <div className="chan-grid">
            {(channels ?? []).map((c) => (
              <div className="chan-card chan-big" key={c.id}>
                <span className="chan-icon" aria-hidden>
                  <ChannelIcon label={c.label} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noopener">
                      {c.label} ↗
                    </a>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{c.label}</span>
                  )}
                  <div className="url" style={{ fontFamily: 'var(--font-m)', fontSize: 10, color: 'var(--muted)' }}>
                    {c.url || 'URL non impostato'}
                  </div>
                </div>
                <div className="row" style={{ gap: 12 }}>
                  <button className="tlink" onClick={() => openEditChannel(c)} aria-label="Modifica">✎</button>
                  <button className="dt-x" onClick={() => handleDeleteChannel(c)} aria-label="Elimina">✕</button>
                </div>
              </div>
            ))}
            <div className="chan-card chan-add">
              <button className="tlink" onClick={openCreateChannel}>
                + Canale
              </button>
            </div>
          </div>

          <h3 className="pg-eyebrow" style={{ marginTop: 26 }}>Da seguire · {open.length}</h3>
          <div style={{ marginTop: 10 }}>
            {open.length ? open.map(chatCard) : <EmptyState icon="chat" text="Nessuna conversazione aperta." ctaLabel="+ Conversazione" onCta={openCreate} />}
          </div>

          {closed.length > 0 && (
            <>
              <h3 className="pg-eyebrow" style={{ marginTop: 26 }}>Chiuse · {closed.length}</h3>
              <div style={{ marginTop: 10 }}>{closed.map(chatCard)}</div>
            </>
          )}
        </>
      )}

      {modalMode !== 'none' && (
        <Modal title={modalMode === 'edit' ? 'Modifica conversazione' : 'Nuova conversazione'} onClose={() => setModalMode('none')}>
          <form onSubmit={handleSubmit}>
            <FormFields fields={CHAT_FIELDS} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
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

      {channelModal !== 'none' && (
        <Modal title={channelModal === 'edit' ? 'Modifica canale' : 'Nuovo canale'} onClose={() => setChannelModal('none')}>
          <form onSubmit={handleChannelSubmit}>
            <FormFields fields={CHANNEL_FIELDS} values={channelValues} onChange={(k, v) => setChannelValues((s) => ({ ...s, [k]: v }))} />
            {channelError && <p className="auth-msg err">{channelError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setChannelModal('none')}>
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
