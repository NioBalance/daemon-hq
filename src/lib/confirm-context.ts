import { createContext, useContext } from 'react'

export interface ConfirmContextValue {
  /** Modal di conferma coerente al posto di confirm(): alla conferma
   *  l'eliminazione vera parte dopo ~5s, con toast "Annulla" per fermarla. */
  confirmDelete: (message: string, run: () => Promise<unknown> | unknown, undoneLabel?: string) => void
}

export const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirmDelete() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirmDelete must be used within ConfirmProvider')
  return ctx.confirmDelete
}
