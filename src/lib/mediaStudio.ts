import type { MediaTag } from './database.types'

/** Struttura del Media Studio (§4.1 della spec): 3 colonne, righe fisse.
 *  L'appartenenza di un media a una riga è un tag in media_tags — tag
 *  multipli = stesso asset in più righe, mai duplicati. */
export interface MediaRowDef {
  tag: MediaTag
  label: string
  /** Riga con campo testo "obiettivo/concept" (Adv-Idee, Stories). */
  hasObjective?: boolean
  /** Riga con collegamento rapido a Photoroom (Removed-bg). */
  photoroom?: boolean
}

export interface MediaColumnDef {
  id: 'sito' | 'creative' | 'instagram'
  title: string
  rows: MediaRowDef[]
}

export const MEDIA_COLUMNS: MediaColumnDef[] = [
  {
    id: 'sito',
    title: 'Sito',
    rows: [
      { tag: 'indossati', label: 'Foto Prodotti — Indossati' },
      { tag: 'bg-removed', label: 'Foto Prodotti — BG-Removed' },
      { tag: 'mobile', label: 'Mobile' },
      { tag: 'pc', label: 'PC / Banner' },
      { tag: 'loghi', label: 'Loghi' },
      { tag: 'shooting-archivio', label: 'Shooting Archivio' },
    ],
  },
  {
    id: 'creative',
    title: 'Creative',
    rows: [
      { tag: 'adv-pronte', label: 'Adv — Pronte' },
      { tag: 'adv-idee', label: 'Adv — Idee', hasObjective: true },
      { tag: 'removed-bg', label: 'Removed-bg', photoroom: true },
      { tag: 'in-edit', label: 'In-Edit' },
    ],
  },
  {
    id: 'instagram',
    title: 'Instagram',
    rows: [
      { tag: 'stories', label: 'Stories', hasObjective: true },
      { tag: 'post', label: 'Post' },
      { tag: 'bozze', label: 'Bozze' },
      { tag: 'reel', label: 'Reel' },
    ],
  },
]

export const ALL_MEDIA_ROWS: MediaRowDef[] = MEDIA_COLUMNS.flatMap((c) => c.rows)

export const rowLabel = (tag: MediaTag): string =>
  ALL_MEDIA_ROWS.find((r) => r.tag === tag)?.label ?? tag

export const PHOTOROOM_URL = 'https://www.photoroom.com'
