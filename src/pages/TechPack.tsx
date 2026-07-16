import PanelHead from '../components/PanelHead'

export default function TechPack() {
  return (
    <>
      <PanelHead
        title="Tech Pack"
        desc="La scheda tecnica è il contratto col fornitore: materiali, colorway, taglie e stato di conferma."
        actions={<button className="btn">+ Nuovo tech pack</button>}
      />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
