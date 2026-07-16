import { createContext, useContext } from 'react'
import type { TabKey } from './tabs'

export interface NavContextValue {
  goTab: (tab: TabKey) => void
  goCategoria: (categoria: string) => void
  catFilter: string
  setCatFilter: (categoria: string) => void
}

export const NavContext = createContext<NavContextValue | null>(null)

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavContext.Provider')
  return ctx
}
