import { useRef, useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import MediaLightbox from '../components/MediaLightbox'
import { useMediaItems, useCreateMedia, type MediaItem } from '../features/media/queries'
import { useMediaTags, useAddMediaTag } from '../features/mediaTags/queries'
import { uploadMediaFile, getMediaUrl } from '../lib/upload'
import { MEDIA_COLUMNS, PHOTOROOM_URL, rowLabel, type MediaRowDef } from '../lib/mediaStudio'
import { useToast } from '../lib/useToast'
import { useActivityLogger } from '../features/activity/queries'
import { useFormDraft } from '../lib/useFormDraft'
import type { MediaTag } from '../lib/database.types'

const VIDEO_FIELDS: FieldDef[] = [
  { key: 'titolo', label: 'Titolo' },
  { key: 'url', label: 'Link esterno (Drive/Dropbox…)' },
]

type LightboxTarget = { tag: MediaTag | '__untagged__'; index: number }
type UploadProgress = { tag: MediaTag; done: number; total: number }

function Thumb({ item }: { item: MediaItem }) {
  const url = getMediaUrl(item.img_path)
  if (!url) return <span className="ph">{item.tipo === 'video' ? '▶' : 'Æ'}</span>
  return (
    <>
      <img src={url} alt="" loading="lazy" />
      {item.tipo === 'video' && <span className="play">▶</span>}
    </>
  )
}

function StudioRow({
  row,
  items,
  uploading,
  onOpen,
  onUpload,
  onAddVideo,
}: {
  row: MediaRowDef
  items: MediaItem[]
  uploading: UploadProgress | null
  onOpen: (index: number) => void
  onUpload: () => void
  onAddVideo: () => void
}) {
  return (
    <div className="ms-row">
      <div className="ms-row-head">
        <span className="ms-row-title">
          {row.label} <span className="ms-count">· {items.length}</span>
        </span>
        {row.photoroom && (
          <a className="btn sm ghost" href={PHOTOROOM_URL} target="_blank" rel="noopener" title="Apri Photoroom">
            Photoroom ↗
          </a>
        )}
        <button className="btn sm ghost" onClick={onAddVideo} title="Aggiungi un video come link esterno">
          + Video
        </button>
        <button className="btn sm" onClick={onUpload} disabled={!!uploading} title="Carica una o più foto">
          {uploading ? `${uploading.done}/${uploading.total}…` : '+ Foto'}
        </button>
      </div>
      {items.length ? (
        <div className="ms-scroll">
          {items.map((item, i) => (
            <button className="ms-thumb" key={item.id} onClick={() => onOpen(i)} title={item.titolo}>
              <Thumb item={item} />
            </button>
          ))}
        </div>
      ) : (
        <div className="ms-empty">Riga vuota — carica foto o tagga qui un media esistente.</div>
      )}
    </div>
  )
}

export default function MediaStudio() {
  const { data: media, isLoading, isError, error, refetch } = useMediaItems()
  const tagsQ = useMediaTags()
  const createMedia = useCreateMedia()
  const addTag = useAddMediaTag()
  const showToast = useToast()
  const logActivity = useActivityLogger()

  const [activeCol, setActiveCol] = useState<'sito' | 'creative' | 'instagram'>('sito')
  const [lightbox, setLightbox] = useState<LightboxTarget | null>(null)
  const [upload, setUpload] = useState<UploadProgress | null>(null)
  const [videoTarget, setVideoTarget] = useState<MediaTag | null>(null)
  const [videoValues, setVideoValues] = useState<FormValues>({ titolo: '', url: '' })
  const [videoError, setVideoError] = useState<string | null>(null)
  const videoDraft = useFormDraft('media-video:new', videoTarget !== null, videoValues, setVideoValues)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pendingTagRef = useRef<MediaTag | null>(null)

  const allMedia = media ?? []
  const allTags = tagsQ.data ?? []
  const byTag = new Map<MediaTag, MediaItem[]>()
  for (const t of allTags) {
    const item = allMedia.find((x) => x.id === t.media_id)
    if (item) byTag.set(t.tag, [...(byTag.get(t.tag) ?? []), item])
  }
  const taggedIds = new Set(allTags.map((t) => t.media_id))
  const untagged = allMedia.filter((x) => !taggedIds.has(x.id))

  function pickFiles(tag: MediaTag) {
    pendingTagRef.current = tag
    fileInputRef.current?.click()
  }

  async function handleFiles(files: File[]) {
    const tag = pendingTagRef.current
    pendingTagRef.current = null
    if (!tag || files.length === 0) return
    setUpload({ tag, done: 0, total: files.length })
    let ok = 0
    for (const file of files) {
      const { path, error: uploadError } = await uploadMediaFile(file, 'media')
      if (path) {
        try {
          const created = await createMedia.mutateAsync({
            titolo: file.name.replace(/\.[^.]+$/, ''),
            tipo: tag === 'loghi' ? 'logo' : 'foto',
            img_path: path,
            ordine: allMedia.length + ok,
          })
          await addTag.mutateAsync({ media_id: created.id, tag })
          ok++
        } catch (err) {
          showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.')
        }
      } else if (uploadError) {
        showToast('error', uploadError)
      }
      setUpload((u) => (u ? { ...u, done: u.done + 1 } : u))
    }
    setUpload(null)
    if (ok > 0) {
      showToast('success', `${ok} file caricat${ok === 1 ? 'o' : 'i'} in «${rowLabel(tag)}».`)
      logActivity('ha caricato', `${ok} media in «${rowLabel(tag)}»`, 'media')
    }
  }

  function openAddVideo(tag: MediaTag) {
    setVideoValues({ titolo: '', url: '' })
    setVideoError(null)
    setVideoTarget(tag)
  }

  async function handleVideoSubmit(e: FormEvent) {
    e.preventDefault()
    if (!videoTarget) return
    const titolo = String(videoValues.titolo ?? '').trim()
    const url = String(videoValues.url ?? '').trim()
    if (!titolo || !url) {
      setVideoError('Servono titolo e link.')
      return
    }
    try {
      const created = await createMedia.mutateAsync({ titolo, tipo: 'video', url, ordine: allMedia.length })
      await addTag.mutateAsync({ media_id: created.id, tag: videoTarget })
      videoDraft.clear()
      setVideoTarget(null)
      showToast('success', `Video aggiunto in «${rowLabel(videoTarget)}» — apri il lightbox per caricare l'anteprima.`)
      logActivity('ha aggiunto un video', `in «${rowLabel(videoTarget)}»`, 'media')
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  const lightboxItems = lightbox
    ? lightbox.tag === '__untagged__'
      ? untagged
      : (byTag.get(lightbox.tag) ?? [])
    : []

  return (
    <>
      <PanelHead
        title="Media Studio"
        desc="Tutto il materiale foto e video del brand, organizzato per destinazione: Sito, Creative, Instagram. Un asset può vivere in più righe con i tag (niente duplicati); tocca un media per aprire il lightbox con le azioni rapide."
        actions={<span className="code">{allMedia.length} ASSET</span>}
      />

      {isLoading && <Loading label="Caricamento media…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}
      {tagsQ.isError && (
        <div className="empty">
          Tabella dei tag non trovata: esegui la migration <strong>0004_media_studio.sql</strong> nel SQL
          Editor di Supabase. ({tagsQ.error.message})
        </div>
      )}

      {!isLoading && !isError && !tagsQ.isError && (
        <>
          {untagged.length > 0 && (
            <div className="ms-col ms-untagged">
              <StudioRow
                row={{ tag: 'in-edit', label: 'Da classificare' }}
                items={untagged}
                uploading={null}
                onOpen={(i) => setLightbox({ tag: '__untagged__', index: i })}
                onUpload={() => pickFiles('in-edit')}
                onAddVideo={() => openAddVideo('in-edit')}
              />
              <p className="code" style={{ display: 'block', marginTop: 4 }}>
                MEDIA SENZA TAG — APRILI E USA «SPOSTA / TAGGA» PER SISTEMARLI NELLE RIGHE
              </p>
            </div>
          )}

          <div className="chips ms-tabs">
            {MEDIA_COLUMNS.map((col) => (
              <button
                key={col.id}
                className={`chip${activeCol === col.id ? ' active' : ''}`}
                onClick={() => setActiveCol(col.id)}
              >
                {col.title}
              </button>
            ))}
          </div>

          <div className="ms-cols">
            {MEDIA_COLUMNS.map((col) => (
              <div key={col.id} className={`ms-col${activeCol !== col.id ? ' ms-col-off' : ''}`}>
                <div className="ms-col-title">{col.title}</div>
                {col.rows.map((row) => (
                  <StudioRow
                    key={row.tag}
                    row={row}
                    items={byTag.get(row.tag) ?? []}
                    uploading={upload?.tag === row.tag ? upload : null}
                    onOpen={(i) => setLightbox({ tag: row.tag, index: i })}
                    onUpload={() => pickFiles(row.tag)}
                    onAddVideo={() => openAddVideo(row.tag)}
                  />
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          void handleFiles(files)
        }}
      />

      {videoTarget && (
        <Modal title={`Nuovo video — ${rowLabel(videoTarget)}`} onClose={() => setVideoTarget(null)}>
          <form onSubmit={handleVideoSubmit}>
            <FormFields
              fields={VIDEO_FIELDS}
              values={videoValues}
              onChange={(k, v) => setVideoValues((s) => ({ ...s, [k]: v }))}
            />
            <p className="code" style={{ display: 'block', marginBottom: 10 }}>
              I VIDEO RESTANO SU DRIVE/DROPBOX — QUI VIVONO CON LINK E ANTEPRIMA (CARICABILE DAL LIGHTBOX)
            </p>
            {videoError && <p className="auth-msg err">{videoError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setVideoTarget(null)}>
                Annulla
              </button>
              <button className="btn" type="submit" disabled={createMedia.isPending}>
                {createMedia.isPending ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {lightbox && lightboxItems.length > 0 && (
        <MediaLightbox
          items={lightboxItems}
          index={Math.min(lightbox.index, lightboxItems.length - 1)}
          onIndexChange={(i) => setLightbox((l) => (l ? { ...l, index: i } : l))}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  )
}
