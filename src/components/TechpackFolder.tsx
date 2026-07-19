import { useMemo, useRef, useState, type FormEvent } from 'react'
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
import { deleteMediaFile } from '../lib/upload'
import { useSignedUrl } from '../lib/useSignedUrl'
import {
  uploadTechpackFile,
  extractZip,
  sanitizeRelPath,
  tpTipo,
  getTpDownloadUrl,
  type TpEntry,
} from '../lib/techpackUpload'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import { useFormDraft } from '../lib/useFormDraft'
import type { Techpack } from '../features/techpacks/queries'

const LINK_FIELDS: FieldDef[] = [
  { key: 'nome', label: 'Nome (es. Cartella misure — Drive)' },
  { key: 'url', label: 'URL completo (https://…)' },
]

/** Icona/etichetta per il tipo di file nella riga dell'albero. */
function fileBadge(f: TechpackFile): string {
  if (f.tipo === 'link') return '🔗'
  if (f.tipo === 'img') return 'IMG'
  if (f.tipo === 'pdf') return 'PDF'
  return f.nome.split('.').pop()?.toUpperCase().slice(0, 4) ?? 'FILE'
}

function dirname(relPath: string): string {
  const i = relPath.lastIndexOf('/')
  return i === -1 ? '' : relPath.slice(0, i)
}

function basename(relPath: string): string {
  const i = relPath.lastIndexOf('/')
  return i === -1 ? relPath : relPath.slice(i + 1)
}

/** Cartella file di un tech pack, versione albero: upload di cartelle intere
 *  (webkitdirectory) o .zip estratti lato client, struttura preservata su
 *  Storage sotto techpacks/{id}/…; navigazione con breadcrumb, anteprima
 *  inline di immagini e PDF via signed URL, download, elimina. I link Drive
 *  restano per i video e i file oltre 50MB. */
export default function TechpackFolder({ techpack, onClose }: { techpack: Techpack; onClose: () => void }) {
  const { profile } = useAuth()
  const filesQ = useTechpackFiles()
  const addFile = useAddTechpackFile()
  const deleteFile = useDeleteTechpackFile()
  const addNote = useAddNote('techpacks')
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()

  const fileInput = useRef<HTMLInputElement | null>(null)
  const dirInput = useRef<HTMLInputElement | null>(null)
  const zipInput = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [cwd, setCwd] = useState('')
  const [preview, setPreview] = useState<TechpackFile | null>(null)
  const [linkModal, setLinkModal] = useState(false)
  const [linkValues, setLinkValues] = useState<FormValues>({ nome: '', url: '' })
  const [linkError, setLinkError] = useState<string | null>(null)
  const linkDraft = useFormDraft('tp-file-link:new', linkModal, linkValues, setLinkValues)

  const files = useMemo(
    () => (filesQ.data ?? []).filter((f) => f.techpack_id === techpack.id),
    [filesQ.data, techpack.id],
  )

  // Contenuto della directory corrente: sottocartelle (primo segmento dopo
  // cwd, con conteggio file) e file il cui percorso è esattamente cwd.
  const { dirs, items } = useMemo(() => {
    const dirCount = new Map<string, number>()
    const items: TechpackFile[] = []
    const prefix = cwd ? cwd + '/' : ''
    for (const f of files) {
      if (f.percorso === cwd) {
        items.push(f)
      } else if (f.percorso.startsWith(prefix) || cwd === '') {
        const rest = cwd === '' ? f.percorso : f.percorso.slice(prefix.length)
        if (!rest) continue
        const seg = rest.split('/')[0]
        dirCount.set(seg, (dirCount.get(seg) ?? 0) + 1)
      }
    }
    const dirs = [...dirCount.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    items.sort((a, b) => (a.tipo === 'link' ? 1 : 0) - (b.tipo === 'link' ? 1 : 0) || a.nome.localeCompare(b.nome))
    return { dirs, items }
  }, [files, cwd])

  const previewUrl = useSignedUrl(preview && preview.tipo !== 'link' ? preview.path : null)
  const crumbs = cwd ? cwd.split('/') : []

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

  /** Carica una lista di entry {percorso relativo, blob}, radicata in cwd:
   *  storage con upsert, riga DB solo se il file non esiste già lì. */
  async function uploadEntries(entries: TpEntry[], sorgente: string) {
    if (!entries.length) {
      showToast('error', 'Nessun file caricabile trovato.')
      return
    }
    setUploading({ done: 0, total: entries.length })
    let ok = 0
    for (const entry of entries) {
      const rel = cwd ? `${cwd}/${entry.relPath}` : entry.relPath
      const { path, error } = await uploadTechpackFile(techpack.id, rel, entry.blob)
      if (path) {
        const nome = basename(rel)
        const percorso = dirname(rel)
        const already = files.find((f) => f.percorso === percorso && f.nome === nome && f.tipo !== 'link')
        if (!already) {
          try {
            await addFile.mutateAsync({
              techpack_id: techpack.id,
              nome,
              tipo: tpTipo(nome),
              path,
              percorso,
            })
          } catch (err) {
            showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.')
            setUploading((u) => (u ? { ...u, done: u.done + 1 } : u))
            continue
          }
        }
        ok++
      } else if (error) {
        showToast('error', error)
      }
      setUploading((u) => (u ? { ...u, done: u.done + 1 } : u))
    }
    setUploading(null)
    if (ok > 0) {
      showToast('success', `${ok} file caricat${ok === 1 ? 'o' : 'i'}.`)
      log(`ha caricato ${ok} file (${sorgente})${cwd ? ` in «${cwd}»` : ''}`)
    }
  }

  function handleSingleFiles(list: File[]) {
    void uploadEntries(
      list.map((f) => ({ relPath: f.name, blob: f })),
      list.length === 1 ? `«${list[0].name}»` : 'upload diretto',
    )
  }

  function handleDirectory(list: File[]) {
    const entries: TpEntry[] = []
    for (const f of list) {
      const rel = sanitizeRelPath((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name)
      if (rel) entries.push({ relPath: rel, blob: f })
    }
    const root = entries[0]?.relPath.split('/')[0]
    void uploadEntries(entries, root ? `cartella «${root}»` : 'cartella')
  }

  async function handleZip(file: File) {
    setUploading({ done: 0, total: 1 })
    let entries: TpEntry[]
    try {
      entries = await extractZip(file)
    } catch {
      setUploading(null)
      showToast('error', `«${file.name}» non è uno zip leggibile.`)
      return
    }
    setUploading(null)
    await uploadEntries(entries, `zip «${file.name}»`)
  }

  async function handleDownload(f: TechpackFile) {
    const url = await getTpDownloadUrl(f.path, f.nome)
    if (!url) {
      showToast('error', 'Download non disponibile, riprova.')
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = f.nome
    a.click()
  }

  function handleDeleteFile(f: TechpackFile) {
    confirmDelete(`Rimuovere "${f.nome}" dalla cartella?`, async () => {
      await deleteFile.mutateAsync(f.id)
      if (f.path) void deleteMediaFile(f.path)
      log(`ha rimosso «${f.nome}»`)
      setPreview((p) => (p?.id === f.id ? null : p))
    }, 'File rimosso')
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

  return (
    <Modal title={`Cartella — ${techpack.nome}`} onClose={onClose} wide>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <span className="code">
          {files.length} FILE · MAX 50MB — VIDEO E FILE PIÙ PESANTI COME LINK DRIVE
        </span>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn sm ghost" onClick={() => setLinkModal(true)}>
            + Link Drive
          </button>
          <button className="btn sm ghost" onClick={() => zipInput.current?.click()} disabled={!!uploading}>
            + Zip
          </button>
          <button className="btn sm ghost" onClick={() => dirInput.current?.click()} disabled={!!uploading}>
            + Cartella
          </button>
          <button className="btn sm" onClick={() => fileInput.current?.click()} disabled={!!uploading}>
            {uploading ? `${uploading.done}/${uploading.total}…` : '+ File'}
          </button>
        </div>
      </div>

      <nav className="tpf-crumbs" aria-label="Percorso cartella">
        <button className="tpf-crumb" onClick={() => setCwd('')} disabled={!cwd}>
          {techpack.nome}
        </button>
        {crumbs.map((seg, i) => (
          <span key={i} className="tpf-crumb-seg">
            <span className="tpf-crumb-sep" aria-hidden>
              /
            </span>
            <button
              className="tpf-crumb"
              onClick={() => setCwd(crumbs.slice(0, i + 1).join('/'))}
              disabled={i === crumbs.length - 1}
            >
              {seg}
            </button>
          </span>
        ))}
      </nav>

      {dirs.length || items.length ? (
        <ul className="tpf-tree">
          {dirs.map(([seg, count]) => (
            <li key={'d:' + seg}>
              <button className="tpf-row tpf-dir" onClick={() => setCwd(cwd ? `${cwd}/${seg}` : seg)}>
                <span className="tpf-badge" aria-hidden>
                  ▸
                </span>
                <span className="tpf-row-name">{seg}</span>
                <span className="tpf-row-meta">{count} file</span>
              </button>
            </li>
          ))}
          {items.map((f) => (
            <li key={f.id}>
              <div className={`tpf-row${preview?.id === f.id ? ' sel' : ''}`}>
                <span className="tpf-badge">{fileBadge(f)}</span>
                {f.tipo === 'link' ? (
                  <a className="tpf-row-name" href={f.url ?? '#'} target="_blank" rel="noopener noreferrer">
                    {f.nome}
                  </a>
                ) : f.tipo === 'img' || f.tipo === 'pdf' ? (
                  <button
                    className="tpf-row-name as-btn"
                    onClick={() => setPreview((p) => (p?.id === f.id ? null : f))}
                  >
                    {f.nome}
                  </button>
                ) : (
                  <span className="tpf-row-name">{f.nome}</span>
                )}
                <span className="tpf-row-actions">
                  {f.tipo !== 'link' && (
                    <button className="tx" onClick={() => void handleDownload(f)} aria-label={`Scarica ${f.nome}`} title="Scarica">
                      ↓
                    </button>
                  )}
                  <button className="tx" onClick={() => handleDeleteFile(f)} aria-label={`Rimuovi ${f.nome}`} title="Rimuovi">
                    ✕
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty" style={{ padding: 20 }}>
          {cwd
            ? 'Sottocartella vuota.'
            : 'Cartella vuota — carica bozzetti e schede misure, una cartella intera o uno zip; video e file pesanti come link Drive.'}
        </div>
      )}

      {preview && (
        <div className="tpf-pane">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="code">{preview.nome}</span>
            <button className="tx" onClick={() => setPreview(null)} aria-label="Chiudi anteprima">
              ✕
            </button>
          </div>
          {!previewUrl ? (
            <div className="empty" style={{ padding: 16 }}>
              Carico l'anteprima…
            </div>
          ) : preview.tipo === 'img' ? (
            <img className="tpf-pane-img" src={previewUrl} alt={preview.nome} />
          ) : (
            <iframe className="tpf-pane-pdf" src={previewUrl} title={preview.nome} />
          )}
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf,.ai,.psd,.eps,.svg,.tif,.tiff,.txt,.csv,.xlsx,.docx"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const list = Array.from(e.target.files ?? [])
          e.target.value = ''
          handleSingleFiles(list)
        }}
      />
      <input
        ref={dirInput}
        type="file"
        // @ts-expect-error webkitdirectory non è nei tipi React ma è supportato ovunque
        webkitdirectory=""
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const list = Array.from(e.target.files ?? [])
          e.target.value = ''
          handleDirectory(list)
        }}
      />
      <input
        ref={zipInput}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleZip(file)
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
