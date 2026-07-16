import { useArticoloTasks, type Articolo } from '../features/articoli/queries'
import { useNotesByType } from '../features/notes/queries'
import { getMediaUrl } from '../lib/upload'
import { useNav } from '../lib/navigation'

export default function ArticoloCard({ articolo, onClick }: { articolo: Articolo; onClick: () => void }) {
  const { goCategoria } = useNav()
  const { data: tasks } = useArticoloTasks()
  const { data: notes } = useNotesByType('articoli')
  const url = getMediaUrl(articolo.img_path)
  const myTasks = (tasks ?? []).filter((t) => t.articolo_id === articolo.id)
  const doneCount = myTasks.filter((t) => t.done).length
  const noteCount = (notes ?? []).filter((n) => n.entity_id === articolo.id).length

  return (
    <div className="art-card" onClick={onClick}>
      <div className="art-img" style={url ? { backgroundImage: `url(${url})` } : undefined}>
        {!url && 'Æ'}
      </div>
      <div className="art-body">
        <div className="nm">{articolo.nome}</div>
        <div className="cl">{articolo.colori || '—'}</div>
        <div className="row" style={{ marginTop: 6 }}>
          <span
            className="badge click"
            onClick={(e) => {
              e.stopPropagation()
              goCategoria(articolo.categoria || '__all__')
            }}
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
