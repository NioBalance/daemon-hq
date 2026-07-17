import PanelHead from '../components/PanelHead'

export default function Notes() {
  return (
    <>
      <PanelHead
        title="Note / Memo"
        desc="Bacheca del team: idee, decisioni e promemoria con pin e tag colore. Le note pinnate alimenteranno il widget «Note per il team»."
      />
      <div className="empty">
        <span className="soon-pill" style={{ display: 'inline-block', marginBottom: 10 }}>
          In arrivo
        </span>
        <p>
          Questa sezione arriva con una delle prossime fasi del redesign — la voce è già al suo
          posto nella navigazione.
        </p>
      </div>
    </>
  )
}
