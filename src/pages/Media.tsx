import PanelHead from '../components/PanelHead'

export default function Media() {
  return (
    <>
      <PanelHead
        title="Media"
        desc="Foto degli shooting, video brevi e loghi del brand. Le foto si caricano direttamente (compresse); i video restano su Drive e qui vivono con anteprima e link."
        actions={<button className="btn">+ Media</button>}
      />
      <div className="empty">Dati in arrivo — collegamento a Supabase nei prossimi step.</div>
    </>
  )
}
