import { useDrops, useDropFasi } from '../drops/queries'
import { useArticoli, useArticoloTasks } from '../articoli/queries'
import { useSamples } from '../samples/queries'
import { useTechpacks } from '../techpacks/queries'
import { useFornitori } from '../fornitori/queries'
import { todayIso, addDaysIso, fmtDate, daysUntil, localDateIso } from '../../lib/format'
import type { Owner } from '../../lib/tabs'

export type OggiFonte = 'fase' | 'task' | 'campione' | 'techpack'
export type OggiUrgenza = 'scaduto' | 'oggi' | 'settimana' | 'attesa'

export interface OggiItem {
  key: string
  fonte: OggiFonte
  urgenza: OggiUrgenza
  /** Etichetta fonte mostrata sulla riga (nome drop, nome articolo, …). */
  tag: string
  testo: string
  owner: Owner | null
  /** Check diretto: presente solo dove la fonte ha un flag done. */
  faseId?: string
  taskId?: string
  /** Click-through: dettaglio articolo globale o deep-open entità. */
  articoloId?: string
  entity?: { kind: 'sample' | 'techpack'; id: string; tab: 'samples' | 'techpack' }
}

export const OGGI_URGENZE: { key: OggiUrgenza; label: string }[] = [
  { key: 'scaduto', label: 'Scaduto' },
  { key: 'oggi', label: 'Oggi' },
  { key: 'settimana', label: 'Questa settimana' },
  { key: 'attesa', label: 'Senza scadenza' },
]

export const OGGI_FONTI: { key: OggiFonte; label: string }[] = [
  { key: 'fase', label: 'Fasi drop' },
  { key: 'task', label: 'Task articolo' },
  { key: 'campione', label: 'Campioni' },
  { key: 'techpack', label: 'Tech pack' },
]

/** Aggrega le 4 fonti di lavoro esistenti nella lista della pagina Oggi
 *  (spec §4). Stesso hook per pagina e badge sidebar: il conteggio coincide
 *  per costruzione. Fasi oltre i 7 giorni restano in Timeline. */
export function useOggiItems() {
  const drops = useDrops()
  const fasi = useDropFasi()
  const articoli = useArticoli()
  const tasks = useArticoloTasks()
  const samples = useSamples()
  const techpacks = useTechpacks()
  const fornitori = useFornitori()

  const queries = [drops, fasi, articoli, tasks, samples, techpacks, fornitori]
  const isLoading = queries.some((q) => q.isLoading)
  const firstError = queries.find((q) => q.isError)

  const todayStr = todayIso()
  const soonStr = addDaysIso(todayStr, 7)
  const items: OggiItem[] = []

  if (!isLoading && !firstError) {
    const dropById = new Map((drops.data ?? []).map((d) => [d.id, d]))
    const articoloById = new Map((articoli.data ?? []).map((a) => [a.id, a]))
    const fornitoreById = new Map((fornitori.data ?? []).map((f) => [f.id, f]))

    for (const f of fasi.data ?? []) {
      if (f.done || !f.data || f.data > soonStr) continue
      const drop = dropById.get(f.drop_id)
      if (!drop) continue
      const urgenza: OggiUrgenza = f.data < todayStr ? 'scaduto' : f.data === todayStr ? 'oggi' : 'settimana'
      items.push({
        key: 'f' + f.id,
        fonte: 'fase',
        urgenza,
        tag: drop.nome,
        testo:
          urgenza === 'scaduto'
            ? `«${f.nome}» era prevista per il ${fmtDate(f.data)}`
            : `«${f.nome}» — ${urgenza === 'oggi' ? 'scade oggi' : `entro il ${fmtDate(f.data)}`}`,
        owner: drop.owner,
        faseId: f.id,
      })
    }

    for (const t of tasks.data ?? []) {
      if (t.done) continue
      const articolo = articoloById.get(t.articolo_id)
      if (!articolo) continue
      items.push({
        key: 't' + t.id,
        fonte: 'task',
        urgenza: 'attesa',
        tag: articolo.nome,
        testo: t.testo,
        owner: null,
        taskId: t.id,
        articoloId: articolo.id,
      })
    }

    for (const s of samples.data ?? []) {
      if (s.verdetto !== 'in-review') continue
      items.push({
        key: 's' + s.id,
        fonte: 'campione',
        urgenza: 'attesa',
        tag: 'Campione',
        testo: `«${s.nome}» da valutare`,
        owner: s.owner,
        entity: { kind: 'sample', id: s.id, tab: 'samples' },
      })
    }

    for (const t of techpacks.data ?? []) {
      if (t.stato !== 'inviato') continue
      const fornNome = t.fornitore_id ? (fornitoreById.get(t.fornitore_id)?.nome ?? '—') : '—'
      const giorniFermo = Math.max(0, -daysUntil(localDateIso(t.updated_at)))
      items.push({
        key: 'p' + t.id,
        fonte: 'techpack',
        urgenza: 'attesa',
        tag: 'Tech Pack',
        testo: `«${t.nome}» in attesa da ${fornNome}${giorniFermo > 0 ? ` — fermo da ${giorniFermo}g` : ''}`,
        owner: t.owner,
        entity: { kind: 'techpack', id: t.id, tab: 'techpack' },
      })
    }

    const rank: Record<OggiUrgenza, number> = { scaduto: 0, oggi: 1, settimana: 2, attesa: 3 }
    items.sort((a, b) => rank[a.urgenza] - rank[b.urgenza])
  }

  return {
    items,
    count: items.length,
    isLoading,
    error: firstError ? (firstError.error as Error) : null,
    refetch: () => queries.forEach((q) => q.refetch()),
  }
}
