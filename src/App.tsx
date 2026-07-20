import { lazy, Suspense, useCallback, useRef, useState, type ComponentType } from 'react'
import { LazyMotion, m, useReducedMotion } from 'framer-motion'

const loadMotionFeatures = () => import('./lib/motionFeatures').then((mod) => mod.default)
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import Login from './auth/Login'
import ProfileForm from './auth/ProfileForm'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ErrorBoundary from './components/ErrorBoundary'
import MobileNav from './components/MobileNav'
import WidgetsPanel from './components/WidgetsPanel'
import ShortcutsPanel from './components/ShortcutsPanel'
import { Loading } from './components/QueryState'
import ToastStack from './components/ToastStack'
import { ToastProvider } from './lib/ToastProvider'
import { ConfirmProvider } from './lib/ConfirmProvider'
import { NavContext } from './lib/navigation'
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
import type { ArchTab, NavEntry, TabKey } from './lib/tabs'

// Ogni pagina nel proprio chunk: si scarica solo quando l'utente apre quel
// tab, invece di un unico bundle da mezzo mega con tutte le sezioni.
const Overview = lazy(() => import('./pages/Overview'))
const Drops = lazy(() => import('./pages/Drops'))
const Catalogo = lazy(() => import('./pages/Catalogo'))
const Design = lazy(() => import('./pages/Design'))
const TechPack = lazy(() => import('./pages/TechPack'))
const Campioni = lazy(() => import('./pages/Campioni'))
const Timeline = lazy(() => import('./pages/Timeline'))
const Fornitori = lazy(() => import('./pages/Fornitori'))
const Archivio = lazy(() => import('./pages/Archivio'))
const Ai = lazy(() => import('./pages/Ai'))
const Media = lazy(() => import('./pages/Media'))
const Chats = lazy(() => import('./pages/Chats'))
const Calendario = lazy(() => import('./pages/Calendario'))
const Notes = lazy(() => import('./pages/Notes'))
const Oggi = lazy(() => import('./pages/Oggi'))
const Meeting = lazy(() => import('./pages/Meeting'))
const Publish = lazy(() => import('./pages/Publish'))
const HqMap = lazy(() => import('./pages/HqMap'))
const Lavagna = lazy(() => import('./pages/Lavagna'))
// Placeholder v4 (voci soon): un solo chunk, quattro pagine.
const ContrattiSoon = lazy(() => import('./pages/ComingSoon').then((m) => ({ default: m.ContrattiSoon })))
// Dettaglio articolo e palette montati a livello App (aperti da qualsiasi pagina).
const ArticoloDetail = lazy(() => import('./components/ArticoloDetail'))
const CommandPalette = lazy(() => import('./components/CommandPalette'))

const PAGES: Record<TabKey, ComponentType> = {
  overview: Overview,
  dropx: Drops,
  catalogo: Catalogo,
  design: Design,
  techpack: TechPack,
  samples: Campioni,
  drops: Timeline,
  fornitori: Fornitori,
  archivio: Archivio,
  ai: Ai,
  media: Media,
  chats: Chats,
  cal: Calendario,
  notes: Notes,
  oggi: Oggi,
  riunioni: Meeting,
  contratti: ContrattiSoon,
  publish: Publish,
  hqmap: HqMap,
  lavagna: Lavagna,
}

function AppShell() {
  const { status, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [editingProfile, setEditingProfile] = useState(false)
  const [catFilter, setCatFilter] = useState('__all__')
  const [archTab, setArchTab] = useState<ArchTab>('inspo')
  const [articoloId, setArticoloId] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [activeSheet, setActiveSheet] = useState<string | null>(null)
  const [widgetsOpen, setWidgetsOpenState] = useState(() => localStorage.getItem('daemon:widgets-open') === '1')
  const [pendingEntity, setPendingEntity] = useState<{ kind: string; id: string } | null>(null)
  const newActionRef = useRef<(() => void) | null>(null)
  const reduceMotion = useReducedMotion()

  const openEntity = useCallback((kind: string, id: string) => setPendingEntity({ kind, id }), [])
  const setWidgetsOpen = useCallback((open: boolean) => {
    setWidgetsOpenState(open)
    localStorage.setItem('daemon:widgets-open', open ? '1' : '0')
  }, [])
  const clearPendingEntity = useCallback(() => setPendingEntity(null), [])

  const goTab = useCallback((tab: TabKey) => {
    setActiveTab(tab)
    setActiveSheet(null)
  }, [])
  const goEntry = useCallback((entry: NavEntry) => {
    if (entry.archTab) setArchTab(entry.archTab)
    setActiveTab(entry.tab)
    setActiveSheet(null)
  }, [])
  const goCategoria = useCallback((categoria: string) => {
    setCatFilter(categoria)
    setActiveTab('catalogo')
    setActiveSheet(null)
  }, [])
  const openArticolo = useCallback((id: string) => setArticoloId(id), [])
  const setNewAction = useCallback((fn: (() => void) | null) => {
    newActionRef.current = fn
  }, [])
  const triggerNew = useCallback(() => {
    setActiveSheet(null)
    newActionRef.current?.()
  }, [])

  const ready = status === 'ready'
  useKeyboardShortcuts({
    goEntry: (entry) => {
      if (ready) goEntry(entry)
    },
    togglePalette: () => {
      if (ready) setPaletteOpen((o) => !o)
    },
    toggleShortcuts: () => {
      if (ready) setShortcutsOpen((o) => !o)
    },
    triggerNew: () => {
      if (ready) triggerNew()
    },
    closeOverlays: () => {
      let closed = false
      if (paletteOpen) {
        setPaletteOpen(false)
        closed = true
      }
      if (shortcutsOpen) {
        setShortcutsOpen(false)
        closed = true
      }
      if (activeSheet) {
        setActiveSheet(null)
        closed = true
      }
      return closed
    },
  })

  if (status === 'loading') {
    return (
      <div className="auth-screen">
        <div className="auth-box">
          <div className="logo">
            D<span className="ae">Æ</span>MON
          </div>
        </div>
      </div>
    )
  }

  if (status === 'signedOut') return <Login />
  if (status === 'onboarding') return <ProfileForm mode="onboarding" />

  const Page = PAGES[activeTab]

  return (
    <NavContext.Provider
      value={{
        goTab,
        goEntry,
        goCategoria,
        catFilter,
        setCatFilter,
        archTab,
        setArchTab,
        openArticolo,
        setNewAction,
        triggerNew,
        activeSheet,
        setActiveSheet,
        pendingEntity,
        openEntity,
        clearPendingEntity,
        widgetsOpen,
        setWidgetsOpen,
      }}
    >
      <div className="shell">
        <Sidebar activeTab={activeTab} />
        <div className={`shell-main${widgetsOpen ? ' widgets-docked' : ''}`}>
          <Header
            activeTab={activeTab}
            onTabChange={goTab}
            meName={profile?.nome ?? ''}
            onMeClick={() => setEditingProfile(true)}
            onSearchClick={() => setPaletteOpen(true)}
          />
          <main>
        <m.section
          className="panel active"
          key={activeTab}
          initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <ErrorBoundary zona="questa sezione" key={activeTab}>
            <Suspense fallback={<Loading label="Caricamento sezione…" />}>
              <Page />
            </Suspense>
          </ErrorBoundary>
        </m.section>
          </main>
        </div>
      </div>
      <MobileNav activeTab={activeTab} />
      <WidgetsPanel />
      {editingProfile && <ProfileForm mode="edit" onDone={() => setEditingProfile(false)} />}
      {articoloId && (
        <Suspense fallback={null}>
          <ArticoloDetail articoloId={articoloId} onClose={() => setArticoloId(null)} />
        </Suspense>
      )}
      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette onClose={() => setPaletteOpen(false)} />
        </Suspense>
      )}
      {shortcutsOpen && <ShortcutsPanel onClose={() => setShortcutsOpen(false)} />}
      <ToastStack />
    </NavContext.Provider>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <LazyMotion features={loadMotionFeatures} strict>
            <ErrorBoundary>
              <AppShell />
            </ErrorBoundary>
          </LazyMotion>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
