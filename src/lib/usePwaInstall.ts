import { useCallback, useEffect, useState } from 'react'

/** Installazione PWA — meccanica condivisa da login, header e menu mobile.
 *
 *  - beforeinstallprompt viene CATTURATO a livello di modulo (il browser può
 *    lanciarlo prima che React monti i componenti): l'evento si salva e i
 *    consumer vengono notificati.
 *  - Su iOS/Safari l'evento non esiste mai: si rileva iOS e si mostrano le
 *    istruzioni Condividi → Aggiungi a Home.
 *  - Tutto nascosto se: già in PWA (display-mode standalone), dopo
 *    appinstalled, o se l'utente ha rifiutato (persistito in localStorage,
 *    non si ripropone a ogni caricamento). */

const DISMISS_KEY = 'daemon_pwa_dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let capturedPrompt: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // niente mini-infobar del browser: UI nostra
    capturedPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    capturedPrompt = null
    installed = true
    notify()
  })
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS si spaccia per Mac: Mac + touch = iPad
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export type PwaInstallMode = 'hidden' | 'prompt' | 'ios'

export function usePwaInstall(): { mode: PwaInstallMode; install: () => void; dismiss: () => void } {
  const [, force] = useState(0)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* storage pieno/bloccato: pazienza, si ripresenterà */
    }
    setDismissed(true)
  }, [])

  const install = useCallback(() => {
    const ev = capturedPrompt
    if (!ev) return
    void ev.prompt().then(() => ev.userChoice).then(({ outcome }) => {
      capturedPrompt = null
      if (outcome === 'dismissed') {
        // rifiuto esplicito del prompt nativo: non riproporre
        try {
          localStorage.setItem(DISMISS_KEY, '1')
        } catch {
          /* come sopra */
        }
      }
      notify()
    })
  }, [])

  let mode: PwaInstallMode = 'hidden'
  if (!dismissed && !installed && !isStandalone()) {
    if (capturedPrompt) mode = 'prompt'
    else if (isIos()) mode = 'ios'
  }
  return { mode, install, dismiss }
}
