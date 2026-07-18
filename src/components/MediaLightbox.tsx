import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import NotesList from './NotesList'
import ImageUpload from './ImageUpload'
import { useMediaTags, useAddMediaTag, useRemoveMediaTag } from '../features/mediaTags/queries'
import { useUpdateMedia, useDeleteMedia, type MediaItem } from '../features/media/queries'
import { getMediaUrl, deleteMediaFile } from '../lib/upload'
import { ALL_MEDIA_ROWS } from '../lib/mediaStudio'
import { useToast } from '../lib/useToast'
import { useConfirmDelete } from '../lib/confirm-context'
import type { MediaTag } from '../lib/database.types'

const SWIPE_THRESHOLD_PX = 60

/** Lightbox fullscreen del Media Studio: frecce/swipe tra i media della
 *  stessa riga, azioni rapide (tagga/sposta — che fa anche da fallback
 *  robusto al drag-and-drop —, elimina, apri link), obiettivo/concept per
 *  Adv-Idee e Stories, note firmate. */
export default function MediaLightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: MediaItem[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const reduceMotion = useReducedMotion()
  const item = items[index]

  const prev = () => onIndexChange(index > 0 ? index - 1 : items.length - 1)
  const next = () => onIndexChange(index < items.length - 1 ? index + 1 : 0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (items.length < 2) return
      if (e.key === 'ArrowLeft') onIndexChange(index > 0 ? index - 1 : items.length - 1)
      if (e.key === 'ArrowRight') onIndexChange(index < items.length - 1 ? index + 1 : 0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, items.length, onIndexChange, onClose])

  const touchX = useRef<number | null>(null)

  if (!item) return null

  return (
    <AnimatePresence>
      <m.div
        key="lightbox"
        className="lightbox-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.25 }}
        role="dialog"
        aria-label={item.titolo}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="lightbox-top">
          <span className="code">
            {index + 1} / {items.length}
          </span>
          <span className="lightbox-title">{item.titolo}</span>
          <button className="hicon" onClick={onClose} aria-label="Chiudi" title="Chiudi (Esc)">
            ✕
          </button>
        </div>

        <div
          className="lightbox-img-wrap"
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null || items.length < 2) return
            const dx = e.changedTouches[0].clientX - touchX.current
            touchX.current = null
            if (dx > SWIPE_THRESHOLD_PX) prev()
            else if (dx < -SWIPE_THRESHOLD_PX) next()
          }}
        >
          {items.length > 1 && (
            <button className="hicon lightbox-nav prev" onClick={prev} aria-label="Precedente" title="← Precedente">
              ←
            </button>
          )}
          <LightboxImage key={item.id} item={item} reduceMotion={!!reduceMotion} />
          {items.length > 1 && (
            <button className="hicon lightbox-nav next" onClick={next} aria-label="Successivo" title="Successivo →">
              →
            </button>
          )}
        </div>

        <LightboxPanel key={`panel-${item.id}`} item={item} itemsLength={items.length} index={index} onIndexChange={onIndexChange} onClose={onClose} />
      </m.div>
    </AnimatePresence>
  )
}

function LightboxImage({ item, reduceMotion }: { item: MediaItem; reduceMotion: boolean }) {
  const url = getMediaUrl(item.img_path)
  const updateMedia = useUpdateMedia()
  if (!url && item.tipo === 'video') {
    return (
      <div className="lightbox-video-ph">
        <ImageUpload
          path={item.img_path}
          entityType="media"
          className="detail-img"
          fallback="▶"
          title="Tocca per caricare l'anteprima del video"
          onUploaded={(path) => updateMedia.mutate({ id: item.id, patch: { img_path: path } })}
        />
        <p className="code" style={{ textAlign: 'center', marginTop: 8 }}>
          Video esterno — carica un'anteprima
        </p>
      </div>
    )
  }
  if (!url) return <div className="lightbox-empty">Æ</div>
  return (
    <m.img
      className="lightbox-img"
      src={url}
      alt={item.titolo}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

function LightboxPanel({
  item,
  itemsLength,
  index,
  onIndexChange,
  onClose,
}: {
  item: MediaItem
  itemsLength: number
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const showToast = useToast()
  const confirmDelete = useConfirmDelete()
  const { data: allTags } = useMediaTags()
  const addTag = useAddMediaTag()
  const removeTag = useRemoveMediaTag()
  const updateMedia = useUpdateMedia()
  const deleteMedia = useDeleteMedia()

  const [showTags, setShowTags] = useState(false)
  const [obiettivo, setObiettivo] = useState(item.obiettivo ?? '')

  const myTags = new Set((allTags ?? []).filter((t) => t.media_id === item.id).map((t) => t.tag))
  const hasObjectiveRow = myTags.has('adv-idee') || myTags.has('stories')

  async function toggleTag(tag: MediaTag) {
    try {
      if (myTags.has(tag)) await removeTag.mutateAsync({ media_id: item.id, tag })
      else await addTag.mutateAsync({ media_id: item.id, tag })
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Operazione non riuscita.')
    }
  }

  function handleDelete() {
    const { id, titolo, img_path } = item
    confirmDelete(`Eliminare "${titolo}"?`, async () => {
      await deleteMedia.mutateAsync(id)
      void deleteMediaFile(img_path)
    }, 'Media eliminato')
    if (itemsLength <= 1) onClose()
    else onIndexChange(Math.min(index, itemsLength - 2))
  }

  async function saveObiettivo() {
    const trimmed = obiettivo.trim()
    if (trimmed === (item.obiettivo ?? '')) return
    try {
      await updateMedia.mutateAsync({ id: item.id, patch: { obiettivo: trimmed || null } })
      showToast('success', 'Obiettivo salvato.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }

  return (
    <div className="lightbox-panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          <span className="badge steel">{item.tipo}</span>
          {[...myTags].map((t) => (
            <span className="badge" key={t}>
              {t}
            </span>
          ))}
        </div>
        <div className="row">
          <button className="btn sm ghost" onClick={() => setShowTags((s) => !s)}>
            {showTags ? 'Chiudi tag' : 'Sposta / Tagga'}
          </button>
          {item.url && (
            <a className="btn sm ghost" href={item.url} target="_blank" rel="noopener">
              Apri link ↗
            </a>
          )}
          <button className="btn sm danger" onClick={handleDelete}>
            Elimina
          </button>
        </div>
      </div>

      {showTags && (
        <div className="lightbox-tags">
          {ALL_MEDIA_ROWS.map((row) => (
            <button
              key={row.tag}
              className={`chip${myTags.has(row.tag) ? ' active' : ''}`}
              onClick={() => toggleTag(row.tag)}
            >
              {row.label}
            </button>
          ))}
        </div>
      )}

      {hasObjectiveRow && (
        <div className="field" style={{ marginTop: 12 }}>
          <label>Obiettivo / concept</label>
          <textarea
            value={obiettivo}
            onChange={(e) => setObiettivo(e.target.value)}
            onBlur={saveObiettivo}
            placeholder="Cosa deve ottenere questa creative / story? Annota il concept."
          />
        </div>
      )}

      <NotesList entityType="media" entityId={item.id} />
    </div>
  )
}
