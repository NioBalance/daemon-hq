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
  | 'oggi'
  | 'riunioni'
  | 'contratti'
  | 'publish'

// I gadget non sono più una sezione autonoma dell'Archivio (§5.1): vivono
// come riga orizzontale dentro Campioni e Catalogo.
export type ArchTab = 'inspo' | 'links'

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

// Struttura v4 (spec §2): 5 gruppi operativi in sidebar. Le voci `soon`
// atterrano su una pagina placeholder reale — palette e chord g+lettera
// funzionano comunque, mai un errore.
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operativo',
    title: 'Operativo',
    short: 'Operativo',
    entries: [
      { id: 'overview', label: 'Overview', tab: 'overview', shortcut: 'o' },
      { id: 'oggi', label: 'Oggi', tab: 'oggi', shortcut: 'g' },
      { id: 'dropx', label: 'Drops', tab: 'dropx', shortcut: 'r' },
      { id: 'chats', label: 'Chats', tab: 'chats', shortcut: 'h' },
    ],
  },
  {
    id: 'produzione',
    title: 'Produzione',
    short: 'Prod',
    entries: [
      { id: 'design', label: 'Design', tab: 'design', shortcut: 'd' },
      { id: 'techpack', label: 'Tech Pack', tab: 'techpack', shortcut: 't' },
      { id: 'samples', label: 'Campioni', tab: 'samples', shortcut: 'c' },
      { id: 'catalogo', label: 'Catalogo', tab: 'catalogo', shortcut: 'a' },
    ],
  },
  {
    id: 'documenti',
    title: 'Documenti',
    short: 'Doc',
    entries: [
      { id: 'riunioni', label: 'Riunioni', tab: 'riunioni', shortcut: 'u' },
      { id: 'contratti', label: 'Contratti', tab: 'contratti', shortcut: 's', soon: true },
      { id: 'notes', label: 'Note / Memo', tab: 'notes', shortcut: 'n' },
    ],
  },
  {
    id: 'pianificazione',
    title: 'Pianificazione',
    short: 'Piano',
    entries: [
      { id: 'timeline', label: 'Timeline', tab: 'drops', shortcut: 'l' },
      { id: 'fornitori', label: 'Fornitori', tab: 'fornitori', shortcut: 'f' },
    ],
  },
  {
    id: 'media-marketing',
    title: 'Media & Marketing',
    short: 'Media',
    entries: [
      { id: 'media', label: 'Media Studio', tab: 'media', shortcut: 'm' },
      { id: 'publish', label: 'Publish', tab: 'publish', shortcut: 'p' },
    ],
  },
]

// Utility trasversali fuori dalla sidebar (spec §2: vivono nella top-nav),
// ma sempre raggiungibili da palette e scorciatoie. Inspo resta una sub-tab
// dell'Archivio fino alla migrazione in Media Studio (Fase 4).
export const UTILITY_ENTRIES: NavEntry[] = [
  { id: 'cal', label: 'Calendario', tab: 'cal', shortcut: 'e' },
  { id: 'links', label: 'Link', tab: 'archivio', archTab: 'links', shortcut: 'k' },
  { id: 'inspo', label: 'Inspo', tab: 'archivio', archTab: 'inspo', shortcut: 'i' },
]

export const ALL_NAV_ENTRIES: NavEntry[] = [...NAV_GROUPS.flatMap((g) => g.entries), ...UTILITY_ENTRIES]

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
