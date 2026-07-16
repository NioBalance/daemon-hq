import PanelHead from '../components/PanelHead'

export default function Ai() {
  return (
    <>
      <PanelHead
        title="AI"
        desc="Collegamenti rapidi agli strumenti AI del team: chat, generazione immagini, automazioni. Modificabili da chiunque."
        actions={<button className="btn">+ Strumento</button>}
      />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
