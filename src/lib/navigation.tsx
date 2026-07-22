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
  /** Deep-open dalla palette: la pagina di destinazione consuma la richiesta
   *  (usePendingEntity) e apre la scheda/modal dell'elemento. */
  pendingEntity: { kind: string; id: string } | null
  openEntity: (kind: string, id: string) => void
  clearPendingEntity: () => void
  /** Widget flottanti Notifiche/Note (Fase 2 v4): docked ≥1280px, overlay
   *  sotto; toggle dalla campanella in top-nav, stato ricordato. */
  widgetsOpen: boolean
  setWidgetsOpen: (open: boolean) => void
  /** Assistente DÆMON: naviga alla pagina e apre il suo form «nuovo» — il
   *  flag viene consumato da useRegisterNewAction al mount della pagina. */
  requestNew: (tab: TabKey) => void
  consumePendingNew: () => boolean
  /** Apre il pannello assistente DÆMON (core grande in Overview e FAB). */
  openAssist: () => void
}

export const NavContext = createContext<NavContextValue | null>(null)

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavContext.Provider')
  return ctx
}

/** Consuma una richiesta di deep-open (palette → scheda aperta): quando i
 *  dati della pagina sono pronti e il kind combacia, apre l'elemento e
 *  azzera la richiesta. Le setState passano da queueMicrotask per non
 *  scattare sincrone dentro l'effect. */
export function usePendingEntity(kind: string, ready: boolean, onOpen: (id: string) => void) {
  const { pendingEntity, clearPendingEntity } = useNav()
  const onOpenRef = useRef(onOpen)
  useEffect(() => {
    onOpenRef.current = onOpen
  })
  useEffect(() => {
    if (!ready || pendingEntity?.kind !== kind) return
    const id = pendingEntity.id
    queueMicrotask(() => {
      clearPendingEntity()
      onOpenRef.current(id)
    })
  }, [ready, pendingEntity, kind, clearPendingEntity])
}

/** Le pagine registrano qui la loro azione di creazione primaria; la scorciatoia
 *  "n" invoca quella della pagina attiva. Si sgancia da sola all'unmount. */
export function useRegisterNewAction(fn: () => void) {
  const { setNewAction, consumePendingNew } = useNav()
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  })
  useEffect(() => {
    setNewAction(() => ref.current())
    // Arrivo dall'assistente («aggiungi X» da un'altra pagina): la pagina di
    // destinazione è montata e registrata, apri subito il suo form nuovo.
    if (consumePendingNew()) queueMicrotask(() => ref.current())
    return () => setNewAction(null)
  }, [setNewAction, consumePendingNew])
}
