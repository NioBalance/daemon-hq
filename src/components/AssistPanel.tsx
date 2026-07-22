import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import DaemonCore from './DaemonCore'
import { useNav } from '../lib/navigation'
import { queryAssist, type AssistCtx, type AssistItem, type AssistResults } from '../features/assist/intents'
import type { TabKey } from '../lib/tabs'

/** Pannello DÆMON (b): navigazione assistita su registry di intenti — porta
 *  nel posto giusto e apre il form giusto, NON genera nulla. I risultati
 *  passano dai provider di features/assist/intents: quando arriverà un
 *  assistente AI vero (c), si registrerà lì senza toccare questo pannello. */
export default function AssistPanel({
  activeTab,
  onClose,
  onOpenPalette,
}: {
  activeTab: TabKey
  onClose: () => void
  onOpenPalette: () => void
}) {
  const { goTab, goEntry, requestNew } = useNav()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AssistResults>({ suggested: [], actions: [], nav: [] })

  useEffect(() => {
    let alive = true
    void queryAssist(query, activeTab).then((r) => {
      if (alive) setResults(r)
    })
    return () => {
      alive = false
    }
  }, [query, activeTab])

  const ctx: AssistCtx = {
    goTab,
    goEntry,
    requestNew,
    openPalette: onOpenPalette,
  }

  function pick(item: AssistItem) {
    item.run(ctx)
    if (item.id !== 'search') onClose()
  }

  const empty =
    query.trim().length > 0 && !results.suggested.length && !results.actions.length && !results.nav.length

  const group = (heading: string, items: AssistItem[]) =>
    items.length > 0 && (
      <Command.Group heading={heading}>
        {items.map((item) => (
          <Command.Item key={item.id} value={item.id} onSelect={() => pick(item)}>
            {item.label}
            {item.hint && <span className="palette-type">{item.hint}</span>}
          </Command.Item>
        ))}
      </Command.Group>
    )

  return (
    <div
      className="palette-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Command
        className="palette assist"
        label="Assistente DÆMON"
        shouldFilter={false}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <div className="as-head">
          <DaemonCore size={30} />
          <span className="as-title">
            DÆMON
            <span className="as-sub">Dimmi cosa vuoi fare — ti porto lì</span>
          </span>
        </div>
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="es. «aggiungi fornitore», «dove metto un tech pack?»…"
          autoFocus
        />
        <Command.List>
          {empty && (
            <div className="palette-empty">
              Non ho un'azione per «{query}» — prova la ricerca globale (Ctrl+K).
            </div>
          )}
          {group('Suggeriti qui', results.suggested)}
          {group(query.trim() ? 'Azioni' : 'Tutte le azioni', results.actions)}
          {group('Vai a', results.nav)}
        </Command.List>
        <div className="palette-hint">
          <span>
            <span className="kbd">↑↓</span> naviga
          </span>
          <span>
            <span className="kbd">Invio</span> vai
          </span>
          <span>
            <span className="kbd">Esc</span> chiudi
          </span>
        </div>
      </Command>
    </div>
  )
}
