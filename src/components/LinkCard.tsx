export default function LinkCard({
  label,
  url,
  onEdit,
  onDelete,
}: {
  label: string
  url: string | null
  onEdit: () => void
  onDelete?: () => void
}) {
  return (
    <div className="link-card">
      <div>
        {url ? (
          <a href={url} target="_blank" rel="noopener">
            {label} ↗
          </a>
        ) : (
          <span style={{ fontWeight: 600 }}>{label}</span>
        )}
        <div className="url">{url || 'URL non impostato'}</div>
      </div>
      <div className="row">
        <button className="btn sm ghost" onClick={onEdit}>
          ✎
        </button>
        {onDelete && (
          <button className="btn sm danger" onClick={onDelete}>
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
