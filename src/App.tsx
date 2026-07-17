import { lazy, Suspense, useState, type ComponentType } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import Login from './auth/Login'
import ProfileForm from './auth/ProfileForm'
import Header from './components/Header'
import { Loading } from './components/QueryState'
import { NavContext } from './lib/navigation'
import type { TabKey } from './lib/tabs'

// Ogni pagina nel proprio chunk: si scarica solo quando l'utente apre quel
// tab, invece di un unico bundle da mezzo mega con tutte e 13 le sezioni.
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
}

function AppShell() {
  const { status, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [editingProfile, setEditingProfile] = useState(false)
  const [catFilter, setCatFilter] = useState('__all__')

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
        goTab: setActiveTab,
        goCategoria: (categoria) => {
          setCatFilter(categoria)
          setActiveTab('catalogo')
        },
        catFilter,
        setCatFilter,
      }}
    >
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        meName={profile?.nome ?? ''}
        onMeClick={() => setEditingProfile(true)}
      />
      <main>
        <section className="panel active">
          <Suspense fallback={<Loading label="Caricamento sezione…" />}>
            <Page />
          </Suspense>
        </section>
      </main>
      {editingProfile && <ProfileForm mode="edit" onDone={() => setEditingProfile(false)} />}
    </NavContext.Provider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App
