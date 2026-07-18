import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { useAddNote, useDeleteNote, useNotesByType } from '../features/notes/queries'
import type { NoteEntityType } from '../lib/database.types'
import { fmtDate } from '../lib/format'

export default function NotesList({ entityType, entityId }: { entityType: NoteEntityType; entityId: string }) {
  const { profile } = useAuth()
  const { data: allNotes } = useNotesByType(entityType)
  const addNote = useAddNote(entityType)
  const deleteNote = useDeleteNote(entityType)
  const [text, setText] = useState('')

  const notes = (allNotes ?? []).filter((n) => n.entity_id === entityId)

  async function handleAdd() {
    const trimmed = text.trim()
    if (!trimmed || !profile) return
    setText('')
    await addNote.mutateAsync({
      entity_type: entityType,
      entity_id: entityId,
      author_id: profile.id,
      author_name: profile.nome,
      testo: trimmed,
    })
  }

  return (
    <div className="notes">
      <span className="code">NOTE ({notes.length})</span>
      {notes.map((n) => (
        <div className="noteline" key={n.id}>
          <span className="na">{n.author_name}</span>
          <span className="nd">{fmtDate(n.created_at)}</span>
          {n.author_id === profile?.id && (
            <button className="nx" onClick={() => deleteNote.mutate(n.id)} title="Cancella nota" aria-label="Elimina">✕</button>
          )}
          <p>{n.testo}</p>
        </div>
      ))}
      <div className="noteadd">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Nota come ${profile?.nome ?? '…'}…`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
        />
        <button className="btn sm" onClick={handleAdd} aria-label="Aggiungi">+</button>
      </div>
    </div>
  )
}
