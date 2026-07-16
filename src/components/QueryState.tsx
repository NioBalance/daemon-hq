export function Loading({ label = 'Caricamento…' }: { label?: string }) {
  return <div className="empty">{label}</div>
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
