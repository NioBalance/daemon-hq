import { useEffect, useRef } from 'react'
import { ALL_NAV_ENTRIES, type NavEntry } from './tabs'

interface ShortcutHandlers {
  goEntry: (entry: NavEntry) => void
  togglePalette: () => void
  toggleShortcuts: () => void
  triggerNew: () => void
  /** Chiude palette/pannello/sheet aperti; torna true se ha chiuso qualcosa. */
  closeOverlays: () => boolean
}

const CHORD_TIMEOUT_MS = 1200

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

/** Scorciatoie globali: Ctrl/Cmd+K palette (sempre, anche negli input),
 *  Escape chiude gli overlay, "g"+lettera naviga, "n" nuovo contestuale,
 *  "?" apre il pannello. Le lettere sono mute con il focus in un campo di
 *  testo o con un modal aperto. */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })
  const chordUntil = useRef(0)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const h = handlersRef.current
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        h.togglePalette()
        return
      }
      if (e.key === 'Escape') {
        if (h.closeOverlays()) e.preventDefault()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isEditable(e.target)) return
      if (document.querySelector('.modal-bg.open')) return

      const key = e.key.toLowerCase()
      if (Date.now() < chordUntil.current) {
        chordUntil.current = 0
        const entry = ALL_NAV_ENTRIES.find((x) => x.shortcut === key)
        if (entry) {
          e.preventDefault()
          h.goEntry(entry)
        }
        return
      }
      if (key === 'g') {
        chordUntil.current = Date.now() + CHORD_TIMEOUT_MS
        return
      }
      if (key === 'n') {
        e.preventDefault()
        h.triggerNew()
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        h.toggleShortcuts()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
