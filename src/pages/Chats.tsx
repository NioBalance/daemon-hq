import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
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
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction } from '../lib/navigation'
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
const statoBadgeClass = (s: ChatStato) => (s === 'aperta' ? 'ember' : s === 'chiusa' ? 'ok' : 'amber')

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

export default function Chats() {
  const { data: chats, isLoading, isError, error, refetch } = useChats()
  const createChat = useCreateChat()
  const updateChat = useUpdateChat()
  const deleteChat = useDeleteChat()
  const showToast = useToast()

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
      }
      chatDraft.clear()
      setModalMode('none')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function handleDelete(c: Chat) {
    if (!window.confirm('Eliminare?')) return
    try {
      await deleteChat.mutateAsync(c.id)
      showToast('success', 'Conversazione eliminata.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
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
  async function handleDeleteChannel(c: ChatChannel) {
    if (!window.confirm('Eliminare canale?')) return
    try {
      await deleteChannel.mutateAsync(c.id)
      showToast('success', 'Canale eliminato.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
  }

  const open = (chats ?? []).filter((c) => c.stato !== 'chiusa')
  const closed = (chats ?? []).filter((c) => c.stato === 'chiusa')

  const chatCard = (c: Chat) => (
    <div className={`card conv ${c.stato}`} style={{ marginBottom: 10 }} key={c.id}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          <span className="card-title" style={{ margin: 0 }}>
            {c.cliente}
          </span>
          <span className="badge">{canaleLabel(c.canale)}</span>
          <span className={`badge ${statoBadgeClass(c.stato)}`}>{statoLabel(c.stato)}</span>
          <OwnerBadge owner={c.owner} />
        </div>
        <div className="row">
          <button className="btn sm ghost" onClick={() => openEdit(c)}>
            ✎
          </button>
          <button className="btn sm danger" onClick={() => handleDelete(c)}>
            ✕
          </button>
        </div>
      </div>
      <NotesList entityType="chats" entityId={c.id} />
    </div>
  )

  return (
    <>
      <PanelHead
        title="Chats — Customer Care"
        desc="Accesso rapido a ManyChat, WhatsApp e Direct + il registro delle conversazioni da seguire, con note firmate."
        actions={
          <button className="btn" onClick={openCreate}>
            + Conversazione
          </button>
        }
      />

      {isLoading && <Loading label="Caricamento conversazioni…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          <div className="chan-grid">
            {(channels ?? []).map((c) => (
              <div className="chan-card" key={c.id}>
                <div>
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
                <div className="row">
                  <button className="btn sm ghost" onClick={() => openEditChannel(c)}>
                    ✎
                  </button>
                  <button className="btn sm danger" onClick={() => handleDeleteChannel(c)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <div className="chan-card">
              <span style={{ color: 'var(--muted)' }}>Nuovo canale</span>
              <button className="btn sm ghost" onClick={openCreateChannel}>
                + Canale
              </button>
            </div>
          </div>

          <span className="code">DA SEGUIRE ({open.length})</span>
          <div style={{ marginTop: 10 }}>
            {open.length ? open.map(chatCard) : <div className="empty" style={{ padding: 18 }}>Nessuna conversazione aperta.</div>}
          </div>

          {closed.length > 0 && (
            <>
              <hr className="divider" />
              <span className="code">CHIUSE ({closed.length})</span>
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
