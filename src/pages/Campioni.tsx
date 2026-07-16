import PanelHead from '../components/PanelHead'

export default function Campioni() {
  return (
    <>
      <PanelHead
        title="Review Campioni"
        desc="Ogni sample valutato su 4 assi. Le note diventano il feedback da girare al fornitore."
        actions={<button className="btn">+ Nuovo campione</button>}
      />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
