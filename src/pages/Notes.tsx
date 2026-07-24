import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import type { FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import EmptyState from '../components/EmptyState'
import { useMemos, useCreateMemo, useUpdateMemo, useDeleteMemo, type Memo } from '../features/memos/queries'
import { useAuth } from '../auth/useAuth'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction } from '../lib/navigation'
import { fmtDate } from '../lib/format'
import type { MemoColore } from '../lib/database.types'

const COLORI: { value: MemoColore; label: string }[] = [
  { value: 'decisione', label: 'Decisione' },
  { value: 'idea', label: 'Idea' },
  { value: 'urgente', label: 'Urgente' },
]

function MemoCard({
  memo,
  isMine,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  memo: Memo
  isMine: boolean
  onTogglePin: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={`card memo-card${memo.pin ? ' pinned' : ''}${memo.colore ? ` c-${memo.colore}` : ''}`}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          <span className="na code" style={{ color: 'var(--ember)' }}>
            {memo.author_name}
          </span>
          <span className="code">{fmtDate(memo.created_at)}</span>
          {memo.colore && <span className={`badge memo-tag ${memo.colore}`}>{memo.colore}</span>}
          {memo.pin && <span className="badge ember">Pin</span>}
        </div>
        {isMine && (
          <div className="row">
            <button className="btn sm ghost" onClick={onTogglePin} title={memo.pin ? 'Togli il pin' : 'Pinna in cima'}>
              {memo.pin ? 'Unpin' : 'Pin'}
            </button>
            <button className="btn sm ghost" onClick={onEdit} aria-label="Modifica">✎</button>
            <button className="btn sm danger" onClick={onDelete} aria-label="Elimina">✕</button>
          </div>
        )}
      </div>
      <p className="memo-text">{memo.testo}</p>
    </div>
  )
}

export default function Notes() {
  const { profile } = useAuth()
  const { data: memos, isLoading, isError, error, refetch } = useMemos()
  const createMemo = useCreateMemo()
  const updateMemo = useUpdateMemo()
  const deleteMemo = useDeleteMemo()
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()
  const logActivity = useActivityLogger()

  const [newValues, setNewValues] = useState<FormValues>({ testo: '', colore: '' })
  const [editing, setEditing] = useState<Memo | null>(null)
  const [editValues, setEditValues] = useState<FormValues>({ testo: '', colore: '' })
  const [editError, setEditError] = useState<string | null>(null)

  const newDraft = useFormDraft('memo:new', true, newValues, setNewValues)
  const editDraft = useFormDraft(`memo:${editing?.id ?? 'none'}`, editing !== null, editValues, setEditValues)

  useRegisterNewAction(() => document.getElementById('memo-new-testo')?.focus())

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    const testo = String(newValues.testo ?? '').trim()
    if (!testo || !profile) return
    try {
      await createMemo.mutateAsync({
        author_id: profile.id,
        author_name: profile.nome,
        testo,
        colore: (String(newValues.colore ?? '') || null) as MemoColore | null,
      })
      newDraft.clear()
      setNewValues({ testo: '', colore: '' })
      showToast('success', 'Nota pubblicata.')
      logActivity('ha pubblicato una nota', `«${testo.slice(0, 40)}${testo.length > 40 ? '…' : ''}»`, 'notes')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function openEdit(memo: Memo) {
    setEditValues({ testo: memo.testo, colore: memo.colore ?? '' })
    setEditError(null)
    setEditing(memo)
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    const testo = String(editValues.testo ?? '').trim()
    if (!testo) {
      setEditError('Il testo non può essere vuoto.')
      return
    }
    try {
      await updateMemo.mutateAsync({
        id: editing.id,
        patch: { testo, colore: (String(editValues.colore ?? '') || null) as MemoColore | null },
      })
      editDraft.clear()
      setEditing(null)
      showToast('success', 'Nota aggiornata.')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  async function togglePin(memo: Memo) {
    try {
      await updateMemo.mutateAsync({ id: memo.id, patch: { pin: !memo.pin } })
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Operazione non riuscita.')
    }
  }

  function handleDelete(memo: Memo) {
    confirmDelete('Eliminare questa nota?', () => deleteMemo.mutateAsync(memo.id), 'Nota eliminata')
  }

  const all = memos ?? []
  const pinned = all.filter((m) => m.pin)
  const others = all.filter((m) => !m.pin)

  return (
    <>
      <PanelHead
        title="Note / Memo"
        desc="Bacheca del team: idee, decisioni e promemoria non legati a un oggetto specifico. Le note pinnate salgono in cima (e alimenteranno il widget «Note per il team»). Ognuno modifica e cancella solo le proprie."
      />

      <form className="card memo-new" onSubmit={handleCreate}>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Nuova nota — firmata {profile?.nome}</label>
          <textarea
            id="memo-new-testo"
            value={String(newValues.testo ?? '')}
            onChange={(e) => setNewValues((v) => ({ ...v, testo: e.target.value }))}
            placeholder="Scrivi un'idea, una decisione, un promemoria…"
          />
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            {COLORI.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`chip memo-tag ${c.value}${newValues.colore === c.value ? ' active' : ''}`}
                onClick={() => setNewValues((v) => ({ ...v, colore: v.colore === c.value ? '' : c.value }))}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button className="btn" type="submit" disabled={createMemo.isPending || !String(newValues.testo ?? '').trim()}>
            {createMemo.isPending ? 'Pubblicazione…' : 'Pubblica'}
          </button>
        </div>
      </form>

      {isLoading && <Loading label="Caricamento bacheca…" />}
      {isError && (
        <ErrorState
          message={`${error.message} — se la tabella non esiste, esegui la migration 0005_fase4.sql su Supabase.`}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && (
        <>
          {pinned.length > 0 && (
            <>
              <span className="code">Pinnate ({pinned.length})</span>
              <div className="memo-grid">
                {pinned.map((memo) => (
                  <MemoCard
                    key={memo.id}
                    memo={memo}
                    isMine={memo.author_id === profile?.id}
                    onTogglePin={() => togglePin(memo)}
                    onEdit={() => openEdit(memo)}
                    onDelete={() => handleDelete(memo)}
                  />
                ))}
              </div>
            </>
          )}
          {others.length > 0 && (
            <>
              <span className="code">Bacheca ({others.length})</span>
              <div className="memo-grid">
                {others.map((memo) => (
                  <MemoCard
                    key={memo.id}
                    memo={memo}
                    isMine={memo.author_id === profile?.id}
                    onTogglePin={() => togglePin(memo)}
                    onEdit={() => openEdit(memo)}
                    onDelete={() => handleDelete(memo)}
                  />
                ))}
              </div>
            </>
          )}
          {all.length === 0 && <EmptyState icon="note" text="Bacheca vuota. Scrivi la prima nota del team." ctaLabel="Scrivi una nota" onCta={() => document.getElementById('memo-new-testo')?.focus()} />}
        </>
      )}

      {editing && (
        <Modal title="Modifica nota" onClose={() => setEditing(null)}>
          <form onSubmit={handleEdit}>
            <div className="field">
              <label>Testo</label>
              <textarea
                value={String(editValues.testo ?? '')}
                onChange={(e) => setEditValues((v) => ({ ...v, testo: e.target.value }))}
              />
            </div>
            <div className="row" style={{ marginBottom: 10 }}>
              {COLORI.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`chip memo-tag ${c.value}${editValues.colore === c.value ? ' active' : ''}`}
                  onClick={() => setEditValues((v) => ({ ...v, colore: v.colore === c.value ? '' : c.value }))}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {editError && <p className="auth-msg err">{editError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setEditing(null)}>
                Annulla
              </button>
              <button className="btn" type="submit" disabled={updateMemo.isPending}>
                {updateMemo.isPending ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
