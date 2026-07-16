import PanelHead from '../components/PanelHead'

export default function Archivio() {
  return (
    <>
      <PanelHead title="Archivio" actions={<button className="btn">+ Gadget</button>} />
      <div className="subtabs">
        <button className="chip active">Gadget (0)</button>
        <button className="chip">Inspirazione (0)</button>
        <button className="chip">Link (0)</button>
      </div>
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
