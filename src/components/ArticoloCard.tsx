import type { KeyboardEvent, MouseEvent } from 'react'
import { useArticoloTasks, type Articolo } from '../features/articoli/queries'
import { useNotesByType } from '../features/notes/queries'
import { getMediaUrl } from '../lib/upload'
import { useNav } from '../lib/navigation'
import { onEnterOrSpace } from '../lib/a11y'

export default function ArticoloCard({ articolo, onClick }: { articolo: Articolo; onClick: () => void }) {
  const { goCategoria } = useNav()
  const { data: tasks } = useArticoloTasks()
  const { data: notes } = useNotesByType('articoli')
  const url = getMediaUrl(articolo.img_path)
  const myTasks = (tasks ?? []).filter((t) => t.articolo_id === articolo.id)
  const doneCount = myTasks.filter((t) => t.done).length
  const noteCount = (notes ?? []).filter((n) => n.entity_id === articolo.id).length

  function goToCategoria() {
    goCategoria(articolo.categoria || '__all__')
  }

  return (
    <div className="art-card" onClick={onClick} onKeyDown={onEnterOrSpace(onClick)} role="button" tabIndex={0}>
      <div className="art-img" style={url ? { backgroundImage: `url(${url})` } : undefined}>
        {!url && 'Æ'}
      </div>
      <div className="art-body">
        <div className="nm">{articolo.nome}</div>
        <div className="cl">{articolo.colori || '—'}</div>
        <div className="row" style={{ marginTop: 6 }}>
          <span
            className="badge click"
            onClick={(e: MouseEvent) => {
              e.stopPropagation()
              goToCategoria()
            }}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              e.stopPropagation()
              goToCategoria()
            }}
            role="button"
            tabIndex={0}
          >
            {articolo.categoria || '—'}
          </span>
        </div>
        <div className="tk">
          {doneCount}/{myTasks.length} task · {noteCount} note
        </div>
      </div>
    </div>
  )
}
