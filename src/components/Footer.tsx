import arcadiaIcon from '../assets/arcadia-icon.png'

export default function Footer() {
  return (
    <footer className="app-credit">
      <img src={arcadiaIcon} alt="" className="app-credit-icon" />
      <span>
        App realizzata da <b>Arcadia</b> — Strutture Digitali &amp; Online Strategy
      </span>
    </footer>
  )
}
