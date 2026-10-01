import { App as CapApp } from '@capacitor/app'
import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Conversation from './screens/Conversation'
import Home from './screens/Home'
import Onboarding from './screens/Onboarding'
import ProgressScreen from './screens/ProgressScreen'
import SettingsScreen from './screens/SettingsScreen'
import { getProfile } from './lib/profile'
import { loadSettings, saveSettings, type Settings } from './lib/settings'
import { setTeacherVoice } from './lib/tts'
import Background from './ui/Background'
import { Icon, type IconName } from './ui/icons'
import { cssVars, TEACHERS, themeVars } from './ui/theme'

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
    loadSettings().then(setSettings)
    getProfile() // siembra el perfil inicial la primera vez
  }, [])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      if (!s) return s
      const next = { ...s, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const t = useMemo(() => (settings ? themeVars(settings.theme, settings.mode) : null), [settings])

  // Tema → variables CSS en <html> (las usa todo, incluido el body), barra de estado y voz del profe.
  useEffect(() => {
    if (!settings || !t) return
    const root = document.documentElement
    for (const [k, v] of Object.entries(cssVars(t))) root.style.setProperty(k, v)
    root.style.colorScheme = settings.mode
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg)
    SystemBars.setStyle({ style: settings.mode === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
    const teacher = TEACHERS[settings.teacher]
    setTeacherVoice(teacher.lang, teacher.gender)
  }, [settings, t])

  // Botón "atrás" de Android: primero la pantalla activa; si no, vuelve a Inicio; en Inicio sale.
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

  if (!settings || !t) return null

  if (!settings.onboarded) {
    return (
      <Shell t={t}>
        <Onboarding settings={settings} t={t} update={update} onDone={() => setTab('home')} />
      </Shell>
    )
  }

  if (lesson) {
    return (
      <Shell t={t}>
        <Conversation
          key={lesson.key}
          scenarioId={lesson.scenarioId}
          categoryId={lesson.categoryId}
          settings={settings}
          t={t}
          update={update}
          onExit={() => {
            backHandler.current = null
            setLesson(null)
            setTab('home')
          }}
          registerBack={registerBack}
        />
      </Shell>
    )
  }

  const start = (scenarioId: string, categoryId?: string) => setLesson({ key: Date.now(), scenarioId, categoryId })

  return (
    <Shell t={t}>
      <div className="no-scrollbar relative z-[2] h-full overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+112px)]">
        {tab === 'home' && (
          <Home settings={settings} t={t} update={update} onStart={start} onGoSettings={() => setTab('settings')} />
        )}
        {tab === 'progress' && <ProgressScreen settings={settings} registerBack={registerBack} />}
        {tab === 'settings' && (
          <SettingsScreen settings={settings} t={t} update={update} registerBack={registerBack} />
        )}
      </div>
      <TabBar
        tab={tab}
        onChange={(k) => {
          backHandler.current = null
          setTab(k)
        }}
      />
    </Shell>
  )
}

function Shell({ t, children }: { t: ReturnType<typeof themeVars>; children: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-full max-w-xl overflow-hidden" style={{ color: 'var(--tx)' }}>
      <Background t={t} />
      {children}
    </div>
  )
}

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'home', label: 'Hablar', icon: 'mic' },
  { key: 'progress', label: 'Progreso', icon: 'bars' },
  { key: 'settings', label: 'Ajustes', icon: 'sliders' },
]

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="absolute right-5 left-5 z-[5] grid h-[66px] grid-cols-3 gap-1 rounded-[33px] p-1.5"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 18px)',
        background: 'var(--tab)',
        border: '1px solid var(--gb)',
        boxShadow: '0 12px 40px rgba(0,0,0,.25), var(--sh)',
        WebkitBackdropFilter: 'blur(28px)',
        backdropFilter: 'blur(28px)',
      }}
    >
      {TABS.map((x) => {
        const sel = x.key === tab
        return (
          <button
            key={x.key}
            onClick={() => onChange(x.key)}
            className={`flex items-center justify-center gap-[7px] rounded-[27px] text-sm ${sel ? 'btn-acc' : 'txt-sub font-medium'}`}
            style={sel ? { boxShadow: '0 6px 18px var(--glow)' } : undefined}
          >
            <Icon name={x.icon} size={19} stroke={sel ? 1.8 : 1.7} />
            {x.label}
          </button>
        )
      })}
    </nav>
  )
}
