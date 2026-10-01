import { App as CapApp } from '@capacitor/app'
import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APP_VERSION } from './lib/changelog'
import AboutScreen from './screens/AboutScreen'
import Calibration from './screens/Calibration'
import Conversation from './screens/Conversation'
import Home from './screens/Home'
import Onboarding from './screens/Onboarding'
import ProfileSetup from './screens/ProfileSetup'
import ProgressScreen from './screens/ProgressScreen'
import SettingsScreen from './screens/SettingsScreen'
import WordsScreen from './screens/WordsScreen'
import { getProfile, isPersonalized } from './lib/profile'
import { loadSettings, saveSettings, type Settings } from './lib/settings'
import { setTeacherVoice } from './lib/tts'
import Background from './ui/Background'
import { Icon, type IconName } from './ui/icons'
import { cssVars, TEACHERS, themeVars } from './ui/theme'

type Tab = 'home' | 'words' | 'progress' | 'settings'

interface Lesson {
  key: number // cada clase monta un componente nuevo: nunca arrastra la anterior
  scenarioId: string
  categoryId?: string
}

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [lesson, setLesson] = useState<Lesson | null>(null)
  // Test de calibración: obligatorio si el perfil no tiene nivel medido; también para el re-test.
  const [calibrated, setCalibrated] = useState<boolean | null>(null)
  const [personalized, setPersonalized] = useState(false)
  const [retest, setRetest] = useState(false)
  const [about, setAbout] = useState<'main' | 'news' | null>(null)
  const backHandler = useRef<(() => void) | null>(null)
  const tabRef = useRef(tab)
  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  useEffect(() => {
    loadSettings().then(setSettings)
    getProfile().then((p) => {
      // también siembra el perfil inicial
      setPersonalized(isPersonalized(p))
      setCalibrated(!!p.calibratedAt)
    })
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

  if (!settings || !t || calibrated === null) return null

  if (!settings.onboarded) {
    return (
      <Shell t={t}>
        <Onboarding settings={settings} t={t} update={update} onDone={() => setTab('home')} />
      </Shell>
    )
  }

  // Orden obligatorio para cada perfil: bienvenida → tu perfil → test de nivel.
  if (!personalized) {
    return (
      <Shell t={t}>
        <ProfileSetup onDone={() => setPersonalized(true)} />
      </Shell>
    )
  }

  if (!calibrated || retest) {
    return (
      <Shell t={t}>
        <Calibration
          settings={settings}
          t={t}
          update={update}
          registerBack={registerBack}
          onDone={() => {
            backHandler.current = null
            setCalibrated(true)
            setRetest(false)
            setTab('home')
          }}
        />
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

  // Acerca de: al abrirla se dan por vistas las novedades de esta versión.
  const openAbout = (page: 'main' | 'news') => {
    setAbout(page)
    update({ lastSeenVersion: APP_VERSION })
    backHandler.current = closeAbout
  }
  const closeAbout = () => {
    setAbout(null)
    backHandler.current = null
  }

  return (
    <Shell t={t}>
      <div className="no-scrollbar relative z-[2] h-full overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+112px)]">
        {about ? (
          <AboutScreen settings={settings} t={t} initialPage={about} onBack={closeAbout} />
        ) : (
          <>
            {tab === 'home' && (
              <Home
                settings={settings}
                t={t}
                update={update}
                onStart={start}
                onGoSettings={() => setTab('settings')}
                onOpenNews={() => openAbout('news')}
              />
            )}
            {tab === 'words' && <WordsScreen settings={settings} registerBack={registerBack} />}
            {tab === 'progress' && <ProgressScreen settings={settings} registerBack={registerBack} />}
            {tab === 'settings' && (
              <SettingsScreen
                settings={settings}
                t={t}
                update={update}
                registerBack={registerBack}
                onRetest={() => setRetest(true)}
                onOpenAbout={() => openAbout('main')}
              />
            )}
          </>
        )}
      </div>
      <TabBar
        tab={tab}
        onChange={(k) => {
          backHandler.current = null
          setAbout(null)
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
  { key: 'words', label: 'Palabras', icon: 'book' },
  { key: 'progress', label: 'Progreso', icon: 'bars' },
  { key: 'settings', label: 'Ajustes', icon: 'sliders' },
]

/** Barra flotante: la pestaña activa ocupa más y muestra su nombre; las demás, solo el icono. */
function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="absolute right-5 left-5 z-[5] grid h-[66px] gap-1 rounded-[33px] p-1.5"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 18px)',
        gridTemplateColumns: TABS.map((x) => (x.key === tab ? '1.9fr' : '1fr')).join(' '),
        transition: 'grid-template-columns .35s ease',
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
            aria-label={x.label}
          >
            <Icon name={x.icon} size={19} stroke={sel ? 1.8 : 1.7} />
            {sel && x.label}
          </button>
        )
      })}
    </nav>
  )
}
