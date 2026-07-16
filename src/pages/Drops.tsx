import PanelHead from '../components/PanelHead'

export default function Drops() {
  return (
    <>
      <PanelHead
        title="Drops"
        desc="Una riga per lancio, dentro tutti gli articoli con foto, colori e avanzamento task. Tocca la categoria per vedere tutti i capi di quel tipo nel tempo."
        actions={
          <div className="row">
            <button className="btn ghost">+ Drop</button>
            <button className="btn">+ Articolo</button>
          </div>
        }
      />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
