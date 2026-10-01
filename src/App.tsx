import { App as CapApp } from '@capacitor/app'
import { useCallback, useEffect, useRef, useState } from 'react'
import Conversation from './screens/Conversation'
import Home from './screens/Home'
import ProgressScreen from './screens/ProgressScreen'
import SettingsScreen from './screens/SettingsScreen'
import { getProfile } from './lib/profile'
import { hasKeys, loadSettings, type Settings } from './lib/settings'

type Tab = 'home' | 'progress' | 'settings'

interface Lesson {
  key: number // cada clase monta un componente nuevo: nunca arrastra la anterior
  scenarioId: string
  categoryId?: string
}

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const backHandler = useRef<(() => void) | null>(null)
  const tabRef = useRef(tab)
  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s)
      if (!hasKeys(s)) setTab('settings')
    })
    getProfile() // siembra el perfil inicial la primera vez
  }, [])

  // Botón "atrás" de Android: en clase lo gestiona la clase; en otra pestaña vuelve a Inicio; en Inicio sale.
  useEffect(() => {
    const sub = CapApp.addListener('backButton', () => {
      if (backHandler.current) backHandler.current()
      else if (tabRef.current !== 'home') setTab('home')
      else CapApp.minimizeApp()
    })
    return () => {
      sub.then((s) => s.remove())
    }
  }, [])

  const registerBack = useCallback((h: (() => void) | null) => {
    backHandler.current = h
  }, [])

  if (!settings) return null

  if (lesson) {
    return (
      <div className="mx-auto h-full max-w-xl pt-[env(safe-area-inset-top)]">
        <Conversation
          key={lesson.key}
          scenarioId={lesson.scenarioId}
          categoryId={lesson.categoryId}
          settings={settings}
          onSettingsChange={setSettings}
          onExit={() => {
            backHandler.current = null
            setLesson(null)
            setTab('home')
          }}
          registerBack={registerBack}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col pt-[env(safe-area-inset-top)]">
      <div className="min-h-0 flex-1">
        {tab === 'home' && (
          <Home
            keysReady={hasKeys(settings)}
            dailyGoalMinutes={settings.dailyGoalMinutes}
            onStart={(scenarioId, categoryId) => setLesson({ key: Date.now(), scenarioId, categoryId })}
            onGoSettings={() => setTab('settings')}
          />
        )}
        {tab === 'progress' && <ProgressScreen settings={settings} />}
        {tab === 'settings' && <SettingsScreen settings={settings} onSettingsChange={setSettings} />}
      </div>
      <nav className="grid grid-cols-3 border-t border-white/10 bg-slate-950 pb-[env(safe-area-inset-bottom)]">
        <TabButton active={tab === 'home'} onClick={() => setTab('home')} icon="🎙️" label="Hablar" />
        <TabButton active={tab === 'progress'} onClick={() => setTab('progress')} icon="📈" label="Progreso" />
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
