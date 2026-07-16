import PanelHead from '../components/PanelHead'

export default function Fornitori() {
  return (
    <>
      <PanelHead
        title="Fornitori"
        desc="Dual-supplier: produttore strutturato per la core line (1.000+ pz/mese) + laboratorio per le capsule. Condizioni target: 30% avvio, saldo dopo, preferenza pagamento 60gg, condizioni migliori al crescere degli ordini."
        actions={<button className="btn">+ Nuovo fornitore</button>}
      />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
