import { useState } from 'react'
import Modal from '../Modal'
import { usePwaInstall } from '../../lib/usePwaInstall'

/** UI installazione PWA nelle tre sedi: card prominente (login), icona
 *  compatta (header) e voce del menu mobile. La meccanica sta tutta in
 *  usePwaInstall; qui solo presentazione. Su iOS il prompt nativo non
 *  esiste: la card mostra le istruzioni inline, icona e voce menu le
 *  aprono in un Modal. */

function ShareIcon() {
  // il glifo iOS: quadrato con freccia in su
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ verticalAlign: '-2px' }}>
      <path d="M12 3v12M8 6.5 12 3l4 3.5" />
      <path d="M6 10H5v11h14V10h-1" />
    </svg>
  )
}

function InstallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v11M7.5 10 12 14.5 16.5 10" />
      <path d="M4.5 17.5V20h15v-2.5" />
    </svg>
  )
}

function IosInstructions() {
  return (
    <ol className="pwa-ios-steps">
      <li>
        Apri l'app in <strong>Safari</strong> (da altri browser il passaggio non c'è).
      </li>
      <li>
        Tocca <ShareIcon /> <strong>Condividi</strong> nella barra in basso.
      </li>
      <li>
        Scorri e scegli <strong>«Aggiungi alla schermata Home»</strong>.
      </li>
    </ol>
  )
}

/** Blocco prominente per la schermata di login: chi riceve il link deve
 *  poter installare subito, senza prima accedere. */
export function PwaInstallCard() {
  const { mode, install, dismiss } = usePwaInstall()
  if (mode === 'hidden') return null
  return (
    <div className="pwa-card" role="region" aria-label="Installa l'app">
      <img src="/icons/icon-192.png" alt="" className="pwa-card-icon" />
      <div className="pwa-card-body">
        <strong className="pwa-card-title">Installa DÆMON HQ sul tuo dispositivo</strong>
        {mode === 'prompt' ? (
          <>
            <p className="pwa-card-desc">Schermo intero, icona sulla home, avvio immediato — anche offline.</p>
            <button className="btn pwa-card-cta" type="button" onClick={install}>
              Installa app
            </button>
          </>
        ) : (
          <IosInstructions />
        )}
      </div>
      <button className="pwa-card-x" type="button" onClick={dismiss} aria-label="Non mostrare più">
        ✕
      </button>
    </div>
  )
}

/** Icona compatta per la top-nav (accanto al toggle tema). */
export function PwaInstallButton() {
  const { mode, install } = usePwaInstall()
  const [iosOpen, setIosOpen] = useState(false)
  if (mode === 'hidden') return null
  return (
    <>
      <button
        className="hicon"
        type="button"
        title="Installa l'app"
        aria-label="Installa l'app"
        onClick={() => (mode === 'prompt' ? install() : setIosOpen(true))}
      >
        <InstallIcon />
      </button>
      {iosOpen && (
        <Modal title="Installa DÆMON HQ" onClose={() => setIosOpen(false)}>
          <IosInstructions />
        </Modal>
      )}
    </>
  )
}

/** Voce per il menu mobile (sheet). */
export function PwaInstallSheetItem() {
  const { mode, install } = usePwaInstall()
  const [iosOpen, setIosOpen] = useState(false)
  if (mode === 'hidden') return null
  return (
    <>
      <button className="sheet-item" type="button" onClick={() => (mode === 'prompt' ? install() : setIosOpen(true))}>
        Installa l'app sul dispositivo
      </button>
      {iosOpen && (
        <Modal title="Installa DÆMON HQ" onClose={() => setIosOpen(false)}>
          <IosInstructions />
        </Modal>
      )}
    </>
  )
}
