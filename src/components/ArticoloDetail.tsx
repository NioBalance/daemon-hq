import { useState, type FormEvent } from 'react'
import Modal from './Modal'
import ImageUpload from './ImageUpload'
import NotesList from './NotesList'
import FormFields, { type FieldDef, type FormValues } from './FormFields'
import {
  useArticoli,
  useUpdateArticolo,
  useDeleteArticolo,
  useArticoloTasks,
  useAddTask,
  useToggleTask,
  useDeleteTask,
} from '../features/articoli/queries'
import { useDrops } from '../features/drops/queries'
import { useNav } from '../lib/navigation'
import { onEnterOrSpace } from '../lib/a11y'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'

export default function ArticoloDetail({ articoloId, onClose }: { articoloId: string; onClose: () => void }) {
  const { goCategoria } = useNav()
  const { data: articoli } = useArticoli()
  const { data: drops } = useDrops()
  const { data: tasks } = useArticoloTasks()
  const updateArticolo = useUpdateArticolo()
  const deleteArticolo = useDeleteArticolo()
  const addTask = useAddTask()
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()
  const logActivity = useActivityLogger()

  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<FormValues>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [newTask, setNewTask] = useState('')
  const draft = useFormDraft(`articolo:${articoloId}`, editing, values, setValues)

  const articolo = articoli?.find((a) => a.id === articoloId)
  const myTasks = (tasks ?? []).filter((t) => t.articolo_id === articoloId)

  if (!articolo) return null

  const dropName = drops?.find((d) => d.id === articolo.drop_id)?.nome ?? '—'

  const ARTICOLO_FIELDS: FieldDef[] = [
    { key: 'nome', label: 'Nome articolo' },
    { key: 'categoria', label: 'Categoria (es. Felpe, Leggings, Top…)', half: true },
    { key: 'colori', label: 'Colori', half: true },
    {
      key: 'drop_id',
      label: 'Drop',
      type: 'select',
      options: [{ value: '', label: '— nessuno —' }, ...(drops ?? []).map((d) => ({ value: d.id, label: d.nome }))],
    },
  ]

  function startEdit() {
    setValues({
      nome: articolo!.nome,
      categoria: articolo!.categoria ?? '',
      colori: articolo!.colori ?? '',
      drop_id: articolo!.drop_id ?? '',
    })
    setFormError(null)
    setEditing(true)
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    const nome = String(values.nome ?? '').trim()
    if (!nome) {
      setFormError('Inserisci il nome articolo.')
      return
    }
    try {
      await updateArticolo.mutateAsync({
        id: articolo!.id,
        patch: {
          nome,
          categoria: String(values.categoria ?? '').trim() || null,
          colori: String(values.colori ?? '').trim() || null,
          drop_id: String(values.drop_id ?? '') || null,
        },
      })
      draft.clear()
      setEditing(false)
      showToast('success', 'Articolo aggiornato.')
      logActivity('ha aggiornato un articolo', `«${nome}»`, 'catalogo')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function handleDelete() {
    const { id, nome } = articolo!
    confirmDelete(`Eliminare "${nome}"?`, async () => {
      await deleteArticolo.mutateAsync(id)
      logActivity('ha eliminato un articolo', `«${nome}»`, 'catalogo')
    }, 'Articolo eliminato')
    onClose()
  }

  async function handleAddTask() {
    const testo = newTask.trim()
    if (!testo) return
    setNewTask('')
    await addTask.mutateAsync({ articolo_id: articolo!.id, testo, ordine: myTasks.length })
  }

  if (editing) {
    return (
      <Modal title="Modifica articolo" onClose={() => setEditing(false)} wide>
        <form onSubmit={handleSaveEdit}>
          <FormFields
            fields={ARTICOLO_FIELDS}
            values={values}
            onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
          />
          {formError && <p className="auth-msg err">{formError}</p>}
          <div className="modal-actions">
            <button className="btn ghost" type="button" onClick={() => setEditing(false)}>
              Annulla
            </button>
            <button className="btn" type="submit" disabled={updateArticolo.isPending}>
              {updateArticolo.isPending ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      </Modal>
    )
  }

  return (
    <Modal title={articolo.nome} onClose={onClose} wide>
      <ImageUpload
        path={articolo.img_path}
        entityType="articoli"
        className="detail-img"
        onUploaded={(path) => updateArticolo.mutate({ id: articolo.id, patch: { img_path: path } })}
      />
      <div className="row">
        <span
          className="badge click"
          onClick={() => {
            onClose()
            goCategoria(articolo.categoria || '__all__')
          }}
          onKeyDown={onEnterOrSpace(() => {
            onClose()
            goCategoria(articolo.categoria || '__all__')
          })}
          role="button"
          tabIndex={0}
        >
          {articolo.categoria || '—'}
        </span>
        <span className="badge">{articolo.colori || '—'}</span>
        <span className="badge steel">{dropName}</span>
      </div>
      <div className="card-actions">
        <button className="btn sm ghost" onClick={startEdit}>
          Modifica dati
        </button>
        <button className="btn sm danger" onClick={handleDelete}>
          Elimina
        </button>
      </div>
      <hr className="divider" style={{ margin: '16px 0' }} />
      <span className="code">
        TASK ({myTasks.filter((t) => t.done).length}/{myTasks.length})
      </span>
      <div className="tasklist">
        {myTasks.map((t) => (
          <div className={`task${t.done ? ' done' : ''}`} key={t.id}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggleTask.mutate({ id: t.id, done: !t.done })}
            />
            <span>{t.testo}</span>
            <button className="tx" onClick={() => deleteTask.mutate(t.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="noteadd">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Nuova task…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddTask()
          }}
        />
        <button className="btn sm" onClick={handleAddTask}>
          +
        </button>
      </div>
      <NotesList entityType="articoli" entityId={articolo.id} />
    </Modal>
  )
}
