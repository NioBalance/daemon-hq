import type { KeyboardEvent } from 'react'

// Attiva un div/span reso cliccabile (role="button") anche da tastiera,
// come farebbe nativamente un <button>.
export function onEnterOrSpace<T = Element>(handler: () => void) {
  return (e: KeyboardEvent<T>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handler()
    }
  }
}
