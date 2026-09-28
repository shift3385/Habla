import { useEffect, useState } from 'react'
import Conversation from './screens/Conversation'
import Home from './screens/Home'
import SettingsScreen from './screens/SettingsScreen'
import { getProfile } from './lib/profile'
import { hasKeys, loadSettings, type Settings } from './lib/settings'

type Tab = 'home' | 'settings'

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [scenarioId, setScenarioId] = useState<string | null>(null)

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s)
      if (!hasKeys(s)) setTab('settings')
    })
    getProfile() // siembra el perfil inicial la primera vez
  }, [])

  if (!settings) return null

  if (scenarioId) {
    return (
      <div className="mx-auto h-full max-w-xl pt-[env(safe-area-inset-top)]">
        <Conversation
          scenarioId={scenarioId}
          settings={settings}
          onSettingsChange={setSettings}
          onExit={() => setScenarioId(null)}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col pt-[env(safe-area-inset-top)]">
      <div className="min-h-0 flex-1">
        {tab === 'home' && (
          <Home keysReady={hasKeys(settings)} onStart={setScenarioId} onGoSettings={() => setTab('settings')} />
        )}
        {tab === 'settings' && <SettingsScreen settings={settings} onSettingsChange={setSettings} />}
      </div>
      <nav className="grid grid-cols-2 border-t border-white/10 bg-slate-950 pb-[env(safe-area-inset-bottom)]">
        <TabButton active={tab === 'home'} onClick={() => setTab('home')} icon="🎙️" label="Hablar" />
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon="⚙️" label="Ajustes" />
      </nav>
    </div>
  )
}

function TabButton(props: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={props.onClick}
      className={`flex flex-col items-center py-2 text-xs ${props.active ? 'text-orange-400' : 'text-slate-400'}`}
    >
      <span className="text-xl">{props.icon}</span>
      {props.label}
    </button>
  )
}
