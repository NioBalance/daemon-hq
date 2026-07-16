import PanelHead from '../components/PanelHead'

export default function Chats() {
  return (
    <>
      <PanelHead
        title="Chats — Customer Care"
        desc="Accesso rapido a ManyChat, WhatsApp e Direct + il registro delle conversazioni da seguire, con note firmate."
        actions={<button className="btn">+ Conversazione</button>}
      />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
