export function Loading({ label = 'Caricamento…' }: { label?: string }) {
  return <div className="empty">{label}</div>
}

/** Skeleton shimmer scuri per liste immagini durante il load. */
export function SkeletonGrid({
  count = 8,
  height = 190,
  minWidth = 180,
}: {
  count?: number
  height?: number
  minWidth?: number
}) {
  return (
    <div
      className="skeleton-grid"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))` }}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="empty">
      <p>Errore nel caricamento dei dati: {message}</p>
      <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={onRetry}>
        Riprova
      </button>
    </div>
  )
}
