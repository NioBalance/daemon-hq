import { useState, type ComponentType } from 'react'
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

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [meName, setMeName] = useState('Utente')

  const Page = PAGES[activeTab]

  return (
    <>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        meName={meName}
        onMeClick={() => {
          const name = window.prompt('Il tuo nome (firma delle note):', meName)
          if (name && name.trim()) setMeName(name.trim())
        }}
      />
      <main>
        <section className="panel active">
          <Page />
        </section>
      </main>
    </>
  )
}

export default App
