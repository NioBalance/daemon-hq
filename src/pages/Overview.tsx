import PanelHead from '../components/PanelHead'

export default function Overview() {
  return (
    <>
      <PanelHead title="Overview" desc="Statistiche di produzione e alert automatici." />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
