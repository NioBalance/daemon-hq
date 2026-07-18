import { useRef, useState, type FormEvent } from 'react'
import Modal from './Modal'
import FormFields, { type FieldDef, type FormValues } from './FormFields'
import NotesList from './NotesList'
import {
  useTechpackFiles,
  useAddTechpackFile,
  useDeleteTechpackFile,
  type TechpackFile,
} from '../features/techpackFiles/queries'
import { useAddNote } from '../features/notes/queries'
import { useAuth } from '../auth/useAuth'
import { uploadMediaFile, getMediaUrl, deleteMediaFile } from '../lib/upload'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useFormDraft } from '../lib/useFormDraft'
import type { Techpack } from '../features/techpacks/queries'

const LINK_FIELDS: FieldDef[] = [
  { key: 'nome', label: 'Nome (es. Cartella misure — Drive)' },
  { key: 'url', label: 'URL completo (https://…)' },
]

/** Cartella file di un tech pack (§5.2, fase 2 del file manager): thumbnail e
 *  PDF caricati DAVVERO su Storage (sono leggeri); video e file pesanti
 *  restano link a Drive. Ogni aggiunta/rimozione scrive una riga di
 *  changelog firmata (riusa le note). */
export default function TechpackFolder({ techpack, onClose }: { techpack: Techpack; onClose: () => void }) {
  const { profile } = useAuth()
  const filesQ = useTechpackFiles()
  const addFile = useAddTechpackFile()
  const deleteFile = useDeleteTechpackFile()
  const addNote = useAddNote('techpacks')
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()

  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [linkModal, setLinkModal] = useState(false)
  const [linkValues, setLinkValues] = useState<FormValues>({ nome: '', url: '' })
  const [linkError, setLinkError] = useState<string | null>(null)
  const linkDraft = useFormDraft('tp-file-link:new', linkModal, linkValues, setLinkValues)

  const files = (filesQ.data ?? []).filter((f) => f.techpack_id === techpack.id)

  function log(testo: string) {
    if (!profile) return
    addNote.mutate({
      entity_type: 'techpacks',
      entity_id: techpack.id,
      author_id: profile.id,
      author_name: profile.nome,
      testo,
    })
  }

  async function handleFiles(list: File[]) {
    if (!list.length) return
    setUploading({ done: 0, total: list.length })
    let ok = 0
    for (const file of list) {
      const { path, error } = await uploadMediaFile(file, 'techpacks')
      if (path) {
        try {
          await addFile.mutateAsync({
            techpack_id: techpack.id,
            nome: file.name,
            tipo: file.type === 'application/pdf' ? 'pdf' : 'img',
            path,
          })
          log(`ha aggiunto il file «${file.name}»`)
          ok++
        } catch (err) {
          showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.')
        }
      } else if (error) {
        showToast('error', error)
      }
      setUploading((u) => (u ? { ...u, done: u.done + 1 } : u))
    }
    setUploading(null)
    if (ok > 0) showToast('success', `${ok} file caricat${ok === 1 ? 'o' : 'i'} nella cartella.`)
  }

  async function handleAddLink(e: FormEvent) {
    e.preventDefault()
    const nome = String(linkValues.nome ?? '').trim()
    const url = String(linkValues.url ?? '').trim()
    if (!nome || !url) {
      setLinkError('Servono nome e URL.')
      return
    }
    try {
      await addFile.mutateAsync({ techpack_id: techpack.id, nome, tipo: 'link', url })
      log(`ha aggiunto il link «${nome}»`)
      linkDraft.clear()
      setLinkModal(false)
      showToast('success', 'Link aggiunto alla cartella.')
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  function handleDeleteFile(f: TechpackFile) {
    confirmDelete(`Rimuovere "${f.nome}" dalla cartella?`, async () => {
      await deleteFile.mutateAsync(f.id)
      if (f.path) void deleteMediaFile(f.path)
      log(`ha rimosso «${f.nome}»`)
    }, 'File rimosso')
  }

  return (
    <Modal title={`Cartella — ${techpack.nome}`} onClose={onClose} wide>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="code">
          {files.length} FILE · PNG/JPEG/PDF CARICATI DAVVERO — VIDEO E FILE PESANTI COME LINK DRIVE
        </span>
        <div className="row">
          <button className="btn sm ghost" onClick={() => setLinkModal(true)}>
            + Link Drive
          </button>
          <button className="btn sm" onClick={() => inputRef.current?.click()} disabled={!!uploading}>
            {uploading ? `${uploading.done}/${uploading.total}…` : '+ File'}
          </button>
        </div>
      </div>

      {files.length ? (
        <div className="tpf-grid">
          {files.map((f) => {
            const href = f.tipo === 'link' ? (f.url ?? '#') : (getMediaUrl(f.path) ?? '#')
            return (
              <div className="tpf-item" key={f.id}>
                <a className="tpf-preview" href={href} target="_blank" rel="noopener" title={f.nome}>
                  {f.tipo === 'img' ? (
                    <img src={getMediaUrl(f.path) ?? undefined} alt="" loading="lazy" />
                  ) : (
                    <span className="tpf-icon">{f.tipo === 'pdf' ? 'PDF' : '🔗'}</span>
                  )}
                </a>
                <div className="tpf-name" title={f.nome}>
                  {f.nome}
                </div>
                <button className="tx" onClick={() => handleDeleteFile(f)} aria-label={`Rimuovi ${f.nome}`}>
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty" style={{ padding: 20 }}>
          Cartella vuota — carica bozzetti, schede misure PDF o collega la cartella Drive.
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const list = Array.from(e.target.files ?? [])
          e.target.value = ''
          void handleFiles(list)
        }}
      />

      <NotesList entityType="techpacks" entityId={techpack.id} />

      {linkModal && (
        <Modal title="Nuovo link nella cartella" onClose={() => setLinkModal(false)}>
          <form onSubmit={handleAddLink}>
            <FormFields
              fields={LINK_FIELDS}
              values={linkValues}
              onChange={(k, v) => setLinkValues((s) => ({ ...s, [k]: v }))}
            />
            {linkError && <p className="auth-msg err">{linkError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setLinkModal(false)}>
                Annulla
              </button>
              <button className="btn" type="submit" disabled={addFile.isPending}>
                {addFile.isPending ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  )
}
