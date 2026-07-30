import type { ReactNode } from 'react'
import { useNav } from '../../lib/navigation'
import { ICONS } from '../navIcons'

/** Barra di navigazione pagina (pattern MARF): freccia indietro → Overview,
 *  icona della sezione, titolo + riga di contesto, azioni a destra. Sostituisce
 *  le testate editoriali pg-head/PanelHead: dice dove sei e cosa puoi fare. */
export default function PageNav({
  title,
  sub,
  icon,
  actions,
}: {
  title: string
  sub?: ReactNode
  /** chiave in ICONS; default: la tab attiva */
  icon?: string
  actions?: ReactNode
}) {
  const { activeTab, goTab } = useNav()
  const ic = ICONS[icon ?? activeTab]
  return (
    <header className="pgnav">
      <button className="pgnav-back" aria-label="Torna alla Overview" title="Overview" onClick={() => goTab('overview')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14.5 5.5 8 12l6.5 6.5" />
        </svg>
      </button>
      {ic && (
        <span className="pgnav-icon" aria-hidden>
          {ic}
        </span>
      )}
      <div className="pgnav-main">
        <h2 className="pgnav-title">{title}</h2>
        {sub && <div className="pgnav-sub">{sub}</div>}
      </div>
      {actions && <div className="pgnav-actions">{actions}</div>}
    </header>
  )
}
