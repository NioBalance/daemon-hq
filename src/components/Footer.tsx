import arcadiaWordmark from '../assets/arcadia-wordmark.png'

export default function Footer() {
  return (
    <footer className="app-credit">
      <span>App realizzata da</span>
      <img
        src={arcadiaWordmark}
        alt="Arcadia — Strutture Digitali & Online Strategy"
        className="app-credit-logo"
      />
    </footer>
  )
}
