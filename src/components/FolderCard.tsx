import ImageUpload from './ImageUpload'
import NotesList from './NotesList'
import type { NoteEntityType } from '../lib/database.types'

export default function FolderCard({
  id,
  title,
  imgPath,
  entityType,
  onEditTitle,
  onDelete,
  onImageUploaded,
}: {
  id: string
  title: string
  imgPath: string | null
  entityType: NoteEntityType
  onEditTitle: () => void
  onDelete: () => void
  onImageUploaded: (path: string) => void
}) {
  return (
    <div className="folder-card">
      <ImageUpload
        path={imgPath}
        entityType={entityType}
        className="folder-img"
        onUploaded={onImageUploaded}
        title="Tocca per caricare foto"
      />
      <div className="folder-body">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="card-title" style={{ margin: 0 }}>
            {title}
          </span>
          <span className="row">
            <button className="btn sm ghost" onClick={onEditTitle}>
              ✎
            </button>
            <button className="btn sm danger" onClick={onDelete}>
              ✕
            </button>
          </span>
        </div>
        <NotesList entityType={entityType} entityId={id} />
      </div>
    </div>
  )
}
