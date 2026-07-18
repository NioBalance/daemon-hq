import { useState } from 'react'
import { Command } from 'cmdk'
import { useNav } from '../lib/navigation'
import { ALL_NAV_ENTRIES, type ArchTab, type NavEntry, type TabKey } from '../lib/tabs'
import { useArticoli } from '../features/articoli/queries'
import { useTechpacks } from '../features/techpacks/queries'
import { useSamples } from '../features/samples/queries'
import { useFornitori } from '../features/fornitori/queries'
import { useGadgets } from '../features/gadgets/queries'
import { useInspo } from '../features/inspo/queries'
import { useLinks } from '../features/links/queries'
import { useMediaItems } from '../features/media/queries'
import { useChats } from '../features/chats/queries'

interface EntityHit {
  id: string
  label: string
  type: string
  tab: TabKey
  archTab?: ArchTab
  /** Solo gli articoli aprono anche la scheda di dettaglio (deep-open per
   *  tutte le entità: Fase 6, vedi TODO.md). */
  articoloId?: string
}

const MAX_PER_GROUP = 8

/** AI vive fuori dai 3 gruppi (icona header) ma resta raggiungibile da qui. */
const AI_ENTRY: NavEntry = { id: 'ai', label: 'AI', tab: 'ai', shortcut: '' }

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const { goEntry, goTab, setArchTab, openArticolo } = useNav()
  const [query, setQuery] = useState('')

  const articoli = useArticoli().data ?? []
  const techpacks = useTechpacks().data ?? []
  const samples = useSamples().data ?? []
  const fornitori = useFornitori().data ?? []
  const gadgets = useGadgets().data ?? []
  const inspo = useInspo().data ?? []
  const links = useLinks().data ?? []
  const media = useMediaItems().data ?? []
  const chats = useChats().data ?? []

  const q = query.trim().toLowerCase()
  const matches = (s: string | null | undefined) => !!s && s.toLowerCase().includes(q)

  const navHits = q
    ? [...ALL_NAV_ENTRIES, AI_ENTRY].filter((e) => matches(e.label))
    : [...ALL_NAV_ENTRIES, AI_ENTRY]

  const entityGroups: { heading: string; hits: EntityHit[] }[] = q
    ? [
        {
          heading: 'Articoli',
          hits: articoli
            .filter((a) => matches(a.nome) || matches(a.categoria))
            .slice(0, MAX_PER_GROUP)
            .map((a) => ({ id: `art-${a.id}`, label: a.nome, type: 'Articolo', tab: 'catalogo' as TabKey, articoloId: a.id })),
        },
        {
          heading: 'Tech Pack',
          hits: techpacks
            .filter((t) => matches(t.nome) || matches(t.categoria))
            .slice(0, MAX_PER_GROUP)
            .map((t) => ({ id: `tp-${t.id}`, label: t.nome, type: 'Tech pack', tab: 'techpack' as TabKey })),
        },
        {
          heading: 'Campioni',
          hits: samples
            .filter((s) => matches(s.nome))
            .slice(0, MAX_PER_GROUP)
            .map((s) => ({ id: `smp-${s.id}`, label: s.nome, type: 'Campione', tab: 'samples' as TabKey })),
        },
        {
          heading: 'Fornitori',
          hits: fornitori
            .filter((f) => matches(f.nome) || matches(f.luogo))
            .slice(0, MAX_PER_GROUP)
            .map((f) => ({ id: `for-${f.id}`, label: f.nome, type: 'Fornitore', tab: 'fornitori' as TabKey })),
        },
        {
          // I gadget vivono nella riga dentro Catalogo (e Campioni), §5.1.
          heading: 'Gadget',
          hits: gadgets
            .filter((g) => matches(g.nome))
            .slice(0, MAX_PER_GROUP)
            .map((g) => ({ id: `gad-${g.id}`, label: g.nome, type: 'Gadget', tab: 'catalogo' as TabKey })),
        },
        {
          heading: 'Inspo',
          hits: inspo
            .filter((i) => matches(i.titolo))
            .slice(0, MAX_PER_GROUP)
            .map((i) => ({ id: `ins-${i.id}`, label: i.titolo, type: 'Inspo', tab: 'archivio' as TabKey, archTab: 'inspo' as ArchTab })),
        },
        {
          heading: 'Link',
          hits: links
            .filter((l) => matches(l.label))
            .slice(0, MAX_PER_GROUP)
            .map((l) => ({ id: `lnk-${l.id}`, label: l.label, type: 'Link', tab: 'archivio' as TabKey, archTab: 'links' as ArchTab })),
        },
        {
          heading: 'Media',
          hits: media
            .filter((m) => matches(m.titolo))
            .slice(0, MAX_PER_GROUP)
            .map((m) => ({ id: `med-${m.id}`, label: m.titolo, type: 'Media', tab: 'media' as TabKey })),
        },
        {
          heading: 'Chats',
          hits: chats
            .filter((c) => matches(c.cliente))
            .slice(0, MAX_PER_GROUP)
            .map((c) => ({ id: `cha-${c.id}`, label: c.cliente, type: 'Chat', tab: 'chats' as TabKey })),
        },
      ].filter((g) => g.hits.length > 0)
    : []

  const empty = q.length > 0 && navHits.length === 0 && entityGroups.length === 0

  function selectEntity(hit: EntityHit) {
    if (hit.archTab) setArchTab(hit.archTab)
    goTab(hit.tab)
    if (hit.articoloId) openArticolo(hit.articoloId)
    onClose()
  }

  return (
    <div
      className="palette-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Command
        className="palette"
        label="Ricerca globale"
        shouldFilter={false}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Cerca articoli, tech pack, fornitori… o vai a una sezione"
          autoFocus
        />
        <Command.List>
          {empty && <div className="palette-empty">Nessun risultato per «{query}».</div>}
          {navHits.length > 0 && (
            <Command.Group heading="Vai a">
              {navHits.map((entry) => (
                <Command.Item
                  key={`nav-${entry.id}`}
                  value={`nav-${entry.id}`}
                  onSelect={() => {
                    goEntry(entry)
                    onClose()
                  }}
                >
                  {entry.label}
                  <span className="palette-type">Sezione</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {entityGroups.map((group) => (
            <Command.Group heading={group.heading} key={group.heading}>
              {group.hits.map((hit) => (
                <Command.Item key={hit.id} value={hit.id} onSelect={() => selectEntity(hit)}>
                  {hit.label}
                  <span className="palette-type">{hit.type}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
        <div className="palette-hint">
          <span>
            <span className="kbd">↑↓</span> naviga
          </span>
          <span>
            <span className="kbd">Invio</span> apri
          </span>
          <span>
            <span className="kbd">Esc</span> chiudi
          </span>
        </div>
      </Command>
    </div>
  )
}
