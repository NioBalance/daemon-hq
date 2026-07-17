import { createContext, useContext, useEffect, useRef } from 'react'
import type { ArchTab, NavEntry, TabKey } from './tabs'

export interface NavContextValue {
  goTab: (tab: TabKey) => void
  /** Naviga a una voce dei gruppi (gestisce anche la sub-tab Archivio). */
  goEntry: (entry: NavEntry) => void
  goCategoria: (categoria: string) => void
  catFilter: string
  setCatFilter: (categoria: string) => void
  archTab: ArchTab
  setArchTab: (tab: ArchTab) => void
  /** Apre il dettaglio articolo globale (modal a livello App). */
  openArticolo: (id: string) => void
  /** Registra/azzera l'azione "nuovo" contestuale (scorciatoia "n"). */
  setNewAction: (fn: (() => void) | null) => void
  triggerNew: () => void
  /** Slot unico per gli sheet mobile (nav:<gruppo>, in futuro widgets — Fase 5):
   *  un solo sheet aperto alla volta, mai due sovrapposti. */
  activeSheet: string | null
  setActiveSheet: (sheet: string | null) => void
}

export const NavContext = createContext<NavContextValue | null>(null)

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavContext.Provider')
  return ctx
}

/** Le pagine registrano qui la loro azione di creazione primaria; la scorciatoia
 *  "n" invoca quella della pagina attiva. Si sgancia da sola all'unmount. */
export function useRegisterNewAction(fn: () => void) {
  const { setNewAction } = useNav()
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  })
  useEffect(() => {
    setNewAction(() => ref.current())
    return () => setNewAction(null)
  }, [setNewAction])
}
