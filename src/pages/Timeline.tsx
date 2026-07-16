import PanelHead from '../components/PanelHead'

export default function Timeline() {
  return (
    <>
      <PanelHead
        title="Timeline Lanci"
        desc="Pipeline operativa per drop: sample → payout 30% → contenuti → store → pre-launch → drop live → saldo 70% e bulk. Buffer produzione +15gg sempre."
        actions={<button className="btn">+ Nuovo drop</button>}
      />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
