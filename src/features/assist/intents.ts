import { ALL_NAV_ENTRIES, type NavEntry, type TabKey } from '../../lib/tabs'

/** Contesto che un intento riceve per agire: solo navigazione e aperture,
 *  niente scritture — l'assistente porta nel posto giusto, non modifica. */
export interface AssistCtx {
  goTab: (tab: TabKey) => void
  goEntry: (entry: NavEntry) => void
  /** Naviga alla pagina e apre il suo form «nuovo» (requestNew nel NavContext). */
  requestNew: (tab: TabKey) => void
  /** Chiude l'assistente e apre la palette di ricerca globale. */
  openPalette: () => void
}

export interface AssistItem {
  id: string
  label: string
  hint?: string
  keywords: string[]
  run: (ctx: AssistCtx) => void
}

// ── Intenti statici: azioni e domande → destinazioni reali ────────────────
const INTENTS: AssistItem[] = [
  { id: 'add-articolo', label: 'Aggiungi un articolo', hint: 'Drops → nuovo articolo', keywords: ['articolo', 'capo', 'prodotto', 'nuovo', 'aggiungi', 'crea'], run: (c) => c.requestNew('dropx') },
  { id: 'add-drop', label: 'Crea un nuovo drop', hint: 'Timeline → nuovo drop con pipeline', keywords: ['drop', 'lancio', 'collezione', 'nuovo', 'crea'], run: (c) => c.requestNew('drops') },
  { id: 'add-fornitore', label: 'Aggiungi un fornitore', hint: 'Fornitori → nuovo', keywords: ['fornitore', 'supplier', 'produttore', 'aggiungi', 'nuovo'], run: (c) => c.requestNew('fornitori') },
  { id: 'add-techpack', label: 'Crea un tech pack', hint: 'Tech Pack → nuova scheda', keywords: ['tech', 'pack', 'scheda', 'tecnica', 'crea', 'nuovo'], run: (c) => c.requestNew('techpack') },
  { id: 'upload-techpack', label: 'Dove metto i file di un tech pack?', hint: 'Tech Pack → apri la cartella dalla riga', keywords: ['dove', 'metto', 'carico', 'file', 'pdf', 'cartella', 'zip', 'tech', 'pack'], run: (c) => c.goTab('techpack') },
  { id: 'add-campione', label: 'Registra un campione', hint: 'Campioni → nuovo con punteggi', keywords: ['campione', 'sample', 'review', 'registra', 'nuovo'], run: (c) => c.requestNew('samples') },
  { id: 'add-riunione', label: 'Pianifica una riunione', hint: 'Riunioni → nuova con stanza online', keywords: ['riunione', 'meeting', 'call', 'stanza', 'pianifica', 'nuova'], run: (c) => c.requestNew('riunioni') },
  { id: 'add-publish', label: 'Nuovo contenuto da pubblicare', hint: 'Publish → nuova card in pipeline', keywords: ['publish', 'post', 'reel', 'story', 'contenuto', 'social', 'nuovo'], run: (c) => c.requestNew('publish') },
  { id: 'add-nota', label: 'Scrivi una nota per il team', hint: 'Note / Memo → nuova', keywords: ['nota', 'memo', 'bacheca', 'scrivi', 'appunto'], run: (c) => c.requestNew('notes') },
  { id: 'upload-media', label: 'Carica foto o video', hint: 'Media Studio', keywords: ['foto', 'video', 'media', 'carica', 'upload', 'shooting', 'dove'], run: (c) => c.goTab('media') },
  { id: 'update-kpi', label: 'Aggiorna i KPI (follower, ordini…)', hint: 'Overview → form KPI', keywords: ['kpi', 'follower', 'ordini', 'revenue', 'waitlist', 'aggiorna', 'metriche'], run: (c) => c.requestNew('overview') },
  { id: 'today', label: 'Cosa devo fare oggi?', hint: 'Oggi — agenda aggregata', keywords: ['oggi', 'fare', 'urgente', 'scadenza', 'task', 'agenda', 'cosa'], run: (c) => c.goTab('oggi') },
  { id: 'map', label: 'Cosa blocca il drop?', hint: 'HQ Map — mappa operativa', keywords: ['blocca', 'bloccato', 'mappa', 'map', 'stato', 'drop', 'fornitore'], run: (c) => c.goTab('hqmap') },
  { id: 'lavagna', label: 'Apri la lavagna', hint: 'Canvas libero per appunti', keywords: ['lavagna', 'canvas', 'brainstorm', 'appunti', 'schema'], run: (c) => c.goTab('lavagna') },
  { id: 'gantt', label: 'Timeline dei lanci (Gantt)', hint: 'Timeline', keywords: ['gantt', 'timeline', 'fasi', 'pipeline', 'date', 'lanci'], run: (c) => c.goTab('drops') },
  { id: 'search', label: 'Cerca un elemento specifico…', hint: 'Apre la ricerca globale (Ctrl+K)', keywords: ['cerca', 'trova', 'ricerca', 'elemento', 'specifico'], run: (c) => c.openPalette() },
]

// Fallback «Vai a …» per ogni voce di navigazione (utility incluse).
const NAV_INTENTS: AssistItem[] = ALL_NAV_ENTRIES.map((e) => ({
  id: `nav-${e.id}`,
  label: `Vai a ${e.label}`,
  keywords: ['vai', 'apri', e.label.toLowerCase()],
  run: (c) => c.goEntry(e),
}))

/** Suggerimenti contestuali (query vuota) per pagina attiva. */
const CONTEXT_SUGGEST: Partial<Record<TabKey, string[]>> = {
  overview: ['update-kpi', 'today', 'map'],
  oggi: ['add-articolo', 'map', 'gantt'],
  dropx: ['add-articolo', 'add-drop', 'gantt'],
  drops: ['add-drop', 'map', 'add-articolo'],
  catalogo: ['add-articolo', 'upload-media'],
  design: ['add-techpack', 'add-articolo'],
  techpack: ['add-techpack', 'upload-techpack', 'map'],
  samples: ['add-campione', 'map'],
  fornitori: ['add-fornitore', 'add-techpack'],
  media: ['upload-media', 'add-publish'],
  publish: ['add-publish', 'upload-media'],
  riunioni: ['add-riunione', 'add-nota'],
  notes: ['add-nota', 'add-riunione'],
  hqmap: ['map', 'add-techpack', 'add-campione'],
  lavagna: ['add-nota', 'map'],
  chats: ['add-nota', 'today'],
  cal: ['add-riunione', 'add-drop'],
}

export interface AssistResults {
  suggested: AssistItem[]
  actions: AssistItem[]
  nav: AssistItem[]
}

function matches(item: AssistItem, q: string): boolean {
  return item.label.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q) || q.includes(k))
}

/** Provider statico: matching per parole chiave, zero latenza. */
function staticQuery(q: string, activeTab: TabKey): AssistResults {
  const query = q.trim().toLowerCase()
  if (!query) {
    const ids = CONTEXT_SUGGEST[activeTab] ?? []
    return {
      suggested: ids.map((id) => INTENTS.find((i) => i.id === id)!).filter(Boolean),
      actions: INTENTS.filter((i) => !ids.includes(i.id)),
      nav: [],
    }
  }
  return {
    suggested: [],
    actions: INTENTS.filter((i) => matches(i, query)),
    nav: NAV_INTENTS.filter((i) => matches(i, query)),
  }
}

// ── (c) PUNTO DI ESTENSIONE AI ────────────────────────────────────────────
// Contratto per un assistente vero: un provider riceve query e contesto e
// torna risultati in modo asincrono. Oggi è registrato SOLO il provider
// statico qui sopra; quando arriverà l'assistente AI (backlog §12.4), si
// implementa AssistProvider (es. chiamata a un backend LLM che torna intenti
// o risposte) e lo si aggiunge ad ASSIST_PROVIDERS: il pannello li interroga
// tutti e fonde i risultati, senza modifiche alla UI.
export interface AssistProvider {
  id: string
  query: (q: string, activeTab: TabKey) => Promise<AssistResults>
}

const staticProvider: AssistProvider = {
  id: 'static-intents',
  query: (q, tab) => Promise.resolve(staticQuery(q, tab)),
}

export const ASSIST_PROVIDERS: AssistProvider[] = [staticProvider]

/** Interroga tutti i provider e fonde i risultati (ordine di registrazione). */
export async function queryAssist(q: string, activeTab: TabKey): Promise<AssistResults> {
  const all = await Promise.all(ASSIST_PROVIDERS.map((p) => p.query(q, activeTab)))
  return {
    suggested: all.flatMap((r) => r.suggested),
    actions: all.flatMap((r) => r.actions),
    nav: all.flatMap((r) => r.nav),
  }
}
