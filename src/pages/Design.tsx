import PanelHead from '../components/PanelHead'

export default function Design() {
  return (
    <>
      <PanelHead
        title="Pipeline Design"
        desc="Ogni capo attraversa 5 fasi. Quando arriva a «Tech Pack», crea la scheda nella tab dedicata."
        actions={<button className="btn">+ Nuovo design</button>}
      />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
