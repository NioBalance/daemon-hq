import PanelHead from '../components/PanelHead'

export default function Catalogo() {
  return (
    <>
      <PanelHead
        title="Catalogo"
        desc="Tutti i capi del brand nel tempo, per categoria e per lancio. La memoria storica del prodotto."
        actions={<button className="btn">+ Articolo</button>}
      />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
