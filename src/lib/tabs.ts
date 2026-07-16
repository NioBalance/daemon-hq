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

export const NAV_TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'dropx', label: 'Drops' },
  { key: 'catalogo', label: 'Catalogo' },
  { key: 'design', label: 'Design' },
  { key: 'techpack', label: 'Tech Pack' },
  { key: 'samples', label: 'Campioni' },
  { key: 'drops', label: 'Timeline' },
  { key: 'fornitori', label: 'Fornitori' },
  { key: 'archivio', label: 'Archivio' },
]

export const OWNER_OPTS = [
  { v: 'design', l: 'Design' },
  { v: 'logistica', l: 'Logistica' },
  { v: 'fornitori', l: 'Fornitori' },
] as const

export type Owner = (typeof OWNER_OPTS)[number]['v']
