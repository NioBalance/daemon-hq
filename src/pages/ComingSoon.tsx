/** Placeholder elegante per le voci v4 la cui pagina arriva in una fase
 *  successiva (spec §9). Stile §1.1: flusso tipografico, aria e hairline,
 *  nessun container. Le voci sono già in nav perché la struttura a 5 gruppi
 *  si deve percepire subito. */
function Soon({ eyebrow, title, desc, fase }: { eyebrow: string; title: string; desc: string; fase: string }) {
  return (
    <div className="soon-page">
      <div className="soon-eyebrow">{eyebrow}</div>
      <h2 className="soon-title">{title}</h2>
      <p className="soon-desc">{desc}</p>
      <div className="soon-line" aria-hidden />
      <span className="code">IN ARRIVO — {fase}</span>
    </div>
  )
}

export function ContrattiSoon() {
  return (
    <Soon
      eyebrow="Documenti"
      title="Contratti & Accordi"
      desc="Il registro di condizioni, collaborazioni e listini: controparte, stato, PDF su Storage e scadenze che avvisano l'Overview prima che scadano loro."
      fase="FASE 5"
    />
  )
}

export function PublishSoon() {
  return (
    <Soon
      eyebrow="Media & Marketing"
      title="Publish"
      desc="La pipeline dei contenuti: Idea, In-Edit, Pronto, Programmato, Pubblicato. Le creative pescano da Media Studio, le scadenze finiscono in agenda."
      fase="FASE 6"
    />
  )
}
