import { useState, type ComponentType } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import Login from './auth/Login'
import ProfileForm from './auth/ProfileForm'
import Header from './components/Header'
import type { TabKey } from './lib/tabs'
import Overview from './pages/Overview'
import Drops from './pages/Drops'
import Catalogo from './pages/Catalogo'
import Design from './pages/Design'
import TechPack from './pages/TechPack'
import Campioni from './pages/Campioni'
import Timeline from './pages/Timeline'
import Fornitori from './pages/Fornitori'
import Archivio from './pages/Archivio'
import Ai from './pages/Ai'
import Media from './pages/Media'
import Chats from './pages/Chats'
import Calendario from './pages/Calendario'

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
    <>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        meName={profile?.nome ?? ''}
        onMeClick={() => setEditingProfile(true)}
      />
      <main>
        <section className="panel active">
          <Page />
        </section>
      </main>
      {editingProfile && <ProfileForm mode="edit" onDone={() => setEditingProfile(false)} />}
    </>
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
