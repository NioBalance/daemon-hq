import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Etichetta della zona protetta, mostrata nel fallback. */
  zona?: string
}

interface State {
  error: Error | null
}

/** Rete di sicurezza contro gli errori di RENDER (audit A3): senza, una
 *  eccezione in un componente butta giù l'intero albero React e la PWA
 *  resta su schermo bianco. Montato attorno all'app e attorno alla pagina
 *  attiva (con key={activeTab}, così cambiare tab azzera l'errore). */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.zona ?? 'app', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="empty-state" role="alert" style={{ margin: '24px auto', maxWidth: 560 }}>
        <span aria-hidden>
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="var(--steel)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l10 18H2z" />
            <line x1="12" y1="10" x2="12" y2="14" />
            <circle cx="12" cy="17.2" r="0.6" />
          </svg>
        </span>
        <p>
          Qualcosa è andato storto{this.props.zona ? ` in ${this.props.zona}` : ''}.
          <br />
          <span className="code">{this.state.error.message}</span>
        </p>
        <div className="row">
          <button className="btn sm ghost" onClick={() => this.setState({ error: null })}>
            Riprova
          </button>
          <button className="btn sm" onClick={() => window.location.reload()}>
            Ricarica l'app
          </button>
        </div>
      </div>
    )
  }
}
