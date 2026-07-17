export type TabKey =
  | 'overview'
  | 'dropx'
  | 'catalogo'
  | 'design'
  | 'techpack'
  | 'samples'
  | 'drops'
  | 'fornitori'
  | 'archivio'
  | 'ai'
  | 'media'
  | 'chats'
  | 'cal'
  | 'notes'

export type ArchTab = 'gadgets' | 'inspo' | 'links'

export interface NavEntry {
  id: string
  label: string
  tab: TabKey
  /** Per le voci che atterrano su una sub-tab dell'Archivio (Inspo, Link). */
  archTab?: ArchTab
  /** Lettera del chord "g + lettera". */
  shortcut: string
  /** Voce visibile ma la pagina arriva in una fase successiva. */
  soon?: boolean
}

export interface NavGroup {
  id: string
  title: string
  /** Etichetta corta per la bottom-nav mobile. */
  short: string
  entries: NavEntry[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'production',
    title: 'Production / Design',
    short: 'Production',
    entries: [
      { id: 'design', label: 'Design', tab: 'design', shortcut: 'd' },
      { id: 'techpack', label: 'Tech Pack', tab: 'techpack', shortcut: 't' },
      { id: 'samples', label: 'Campioni', tab: 'samples', shortcut: 'c' },
      { id: 'inspo', label: 'Inspo', tab: 'archivio', archTab: 'inspo', shortcut: 'i' },
    ],
  },
  {
    id: 'gestione',
    title: 'Gestione / PM',
    short: 'Gestione',
    entries: [
      { id: 'timeline', label: 'Timeline', tab: 'drops', shortcut: 'l' },
      { id: 'fornitori', label: 'Fornitori', tab: 'fornitori', shortcut: 'f' },
      { id: 'cal', label: 'Calendario', tab: 'cal', shortcut: 'e' },
      { id: 'notes', label: 'Note / Memo', tab: 'notes', shortcut: 'n', soon: true },
      { id: 'links', label: 'Link', tab: 'archivio', archTab: 'links', shortcut: 'k' },
    ],
  },
  {
    id: 'live',
    title: 'Live Now',
    short: 'Live',
    entries: [
      { id: 'overview', label: 'Overview', tab: 'overview', shortcut: 'o' },
      { id: 'dropx', label: 'Drops', tab: 'dropx', shortcut: 'r' },
      { id: 'catalogo', label: 'Catalogo', tab: 'catalogo', shortcut: 'a' },
      { id: 'media', label: 'Media Studio', tab: 'media', shortcut: 'm' },
      { id: 'chats', label: 'Chats', tab: 'chats', shortcut: 'h' },
    ],
  },
]

export const ALL_NAV_ENTRIES: NavEntry[] = NAV_GROUPS.flatMap((g) => g.entries)

export function isEntryActive(entry: NavEntry, activeTab: TabKey, archTab: ArchTab): boolean {
  if (entry.tab !== activeTab) return false
  if (entry.archTab && entry.archTab !== archTab) return false
  return true
}

export const OWNER_OPTS = [
  { v: 'design', l: 'Design' },
  { v: 'logistica', l: 'Logistica' },
  { v: 'fornitori', l: 'Fornitori' },
] as const

export type Owner = (typeof OWNER_OPTS)[number]['v']
