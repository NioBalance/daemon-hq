import PanelHead from '../components/PanelHead'

export default function Calendario() {
  return (
    <>
      <PanelHead
        title="Calendario"
        desc="Planner del team: incontri, deadline e date di lancio. Le date dei drop e delle fasi non completate entrano da sole dalla Timeline."
        actions={<button className="btn">+ Evento</button>}
      />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
