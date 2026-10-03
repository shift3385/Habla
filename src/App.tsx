import { App as CapApp } from '@capacitor/app'
import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APP_VERSION } from './lib/changelog'
import AboutScreen from './screens/AboutScreen'
import Calibration from './screens/Calibration'
import Conversation from './screens/Conversation'
import Home from './screens/Home'
import Onboarding from './screens/Onboarding'
import { importBackup } from './lib/backup'
import { db } from './lib/db'
import { getScenario } from './lib/scenarios'
import { loadDashboard } from './lib/stats'
import ProfileSetup from './screens/ProfileSetup'
import WelcomeScreen, { type ReturningInfo } from './screens/WelcomeScreen'
import ProgressScreen from './screens/ProgressScreen'
import ReviewScreen from './screens/ReviewScreen'
import SettingsScreen, { type SettingsPage } from './screens/SettingsScreen'
import WordsScreen from './screens/WordsScreen'
import { getProfile, isPersonalized } from './lib/profile'
import { needsRecalibration, nextRetestAt } from './lib/levels'
import { adaptPlanAfterTest, doneToday, findLesson, todayLesson, type StudyPlan } from './lib/plan'
import { syncReminders } from './lib/reminders'
import PlanScreen from './screens/PlanScreen'
import FavoritesSetup from './screens/FavoritesSetup'
import NoticeGate from './screens/NoticeGate'
import { pendingNotices, type Notice } from './lib/notices'
import { hasValidFavorites } from './lib/topics'
import { loadSettings, mainModels, saveSettings, type Settings } from './lib/settings'
import { setTeacherVoice } from './lib/tts'
import Background from './ui/Background'
import AudioPicker from './components/AudioPicker'
import { Icon, type IconName } from './ui/icons'
import { cssVars, TEACHERS, themeVars } from './ui/theme'

type Tab = 'home' | 'words' | 'progress' | 'settings'

interface Lesson {
  key: number // cada clase monta un componente nuevo: nunca arrastra la anterior
  scenarioId: string
  categoryId?: string
  customTopic?: string // tema escrito por el alumno
  planLesson?: string // lección del plan de 12 semanas
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
  const [review, setReview] = useState(false)
  // Plan de 12 semanas (fase 4) y fecha del próximo re-test (fase 5).
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  // Ajustes abiertos directamente en una sección (p. ej. Tema y mascota desde el Inicio).
  const [settingsPage, setSettingsPage] = useState<SettingsPage | null>(null)
  const [retestAt, setRetestAt] = useState<number | null>(null)
  const [retestReady, setRetestReady] = useState(false)
  const [level, setLevel] = useState('B1')
  // Exactamente 3 temas favoritos (5.4): a quien venga de una versión anterior con otro número se le piden.
  const [needsFavs, setNeedsFavs] = useState(false)
  const backHandler = useRef<(() => void) | null>(null)
  const tabRef = useRef(tab)
  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  // Bienvenida animada en cada arranque: "Welcome back" si ya hay perfil, o el alta si es nuevo.
  const [splash, setSplash] = useState(true)
  // Avisos antes del Inicio (novedades, re-test, compañeros): se calculan una vez al terminar la bienvenida.
  const [gate, setGate] = useState<Notice[]>([])
  const [streak, setStreak] = useState(0)
  const [homework, setHomework] = useState<{ text: string; date: number } | null>(null)
  const settingsRef = useRef<Settings | null>(null)
  const retestReadyRef = useRef(false)
  const [returning, setReturning] = useState<ReturningInfo | null>(null)

  const refreshProfile = useCallback(async () => {
    const p = await getProfile() // también siembra el perfil inicial
    setPersonalized(isPersonalized(p))
    setNeedsFavs(isPersonalized(p) && !hasValidFavorites(p.interests))
    setCalibrated(!!p.calibratedAt)
    setPlan(p.plan ?? null)
    const at = nextRetestAt(p)
    setRetestAt(at)
    setRetestReady(!!at && Date.now() >= at)
    setLevel(p.levels.overall)
    return p
  }, [])

  useEffect(() => {
    // Los setState ocurren tras cargar datos asíncronos (IndexedDB/Preferences), no de forma síncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([loadSettings(), refreshProfile(), loadDashboard()]).then(async ([s, p, dash]) => {
      if (s.onboarded && isPersonalized(p)) {
        const last = (await db.sessions.orderBy('startedAt').reverse().limit(10).toArray()).find((x) => x.metrics?.turns)
        setReturning({
          name: p.name!,
          streak: dash.streak,
          level: p.levels.overall,
          lastTopic: last
            ? (last.topic?.titleEs ??
              last.topic?.title ??
              (last.planLesson && p.plan ? findLesson(p.plan, last.planLesson)?.lesson.titleEs : undefined) ??
              getScenario(last.scenario).title)
            : null,
        })
      }
      setStreak(dash.streak)
      setHomework(dash.lastHomework)
      setSettings(s)
    })
  }, [refreshProfile])

  useEffect(() => {
    settingsRef.current = settings
    retestReadyRef.current = retestReady
  }, [settings, retestReady])

  const endSplash = useCallback(() => {
    refreshProfile().then((p) => {
      const s = settingsRef.current
      // Solo para quien ya usaba la app: a un usuario nuevo no se le enseñan novedades ni avisos.
      if (s?.onboarded && isPersonalized(p) && p.calibratedAt) {
        setGate(pendingNotices(s, { retestReady: retestReadyRef.current, recalibrate: needsRecalibration(p), streak, homeworkDate: homework?.date }))
      }
      setSplash(false)
    })
  }, [refreshProfile, streak, homework])

  // "Ya tengo mi perfil": importar una copia de seguridad desde la bienvenida.
  const importFromWelcome = useCallback(async (file: File) => {
    await importBackup(file)
    const p = await refreshProfile()
    if (!isPersonalized(p)) throw new Error('La copia no tiene un perfil con nombre. Usa "Soy nuevo".')
    setSettings((s) => (s ? { ...s, onboarded: true } : s))
    return true
  }, [refreshProfile])

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

  // Avisos: recordatorio diario con la lección que toca y aviso del re-test. Se reprograman al cambiar algo.
  const reminderOn = settings?.reminderOn ?? false
  const reminderTime = settings?.reminderTime ?? '19:00'
  useEffect(() => {
    const today = plan ? todayLesson(plan) : null
    syncReminders({
      enabled: reminderOn,
      time: reminderTime,
      lessonTitle: today?.lesson?.titleEs,
      doneToday: plan ? doneToday(plan) : false,
      retestAt,
    })
  }, [reminderOn, reminderTime, plan, retestAt])

  if (!settings || !t || calibrated === null) return null

  // Selector de audio con auriculares: puede aparecer en cualquier pantalla.
  const picker = <AudioPicker settings={settings} update={update} />

  if (splash) {
    return (
      <Shell t={t} overlay={picker}>
        <WelcomeScreen
          returning={returning}
          onImport={importFromWelcome}
          onDone={endSplash}
          theme={settings.theme}
          mode={settings.mode}
          onTheme={(theme, mode) => update({ theme, mode })}
        />
      </Shell>
    )
  }

  if (!settings.onboarded) {
    return (
      <Shell t={t} overlay={picker}>
        <Onboarding settings={settings} t={t} update={update} onDone={() => setTab('home')} />
      </Shell>
    )
  }

  // Orden obligatorio para cada perfil: bienvenida → tu perfil → test de nivel.
  if (!personalized) {
    return (
      <Shell t={t} overlay={picker}>
        <ProfileSetup onDone={() => setPersonalized(true)} />
      </Shell>
    )
  }

  if (needsFavs) {
    return (
      <Shell t={t} overlay={picker}>
        <FavoritesSetup onDone={() => refreshProfile()} />
      </Shell>
    )
  }

  if (!calibrated || retest) {
    return (
      <Shell t={t} overlay={picker}>
        <Calibration
          settings={settings}
          t={t}
          update={update}
          registerBack={registerBack}
          onDone={() => {
            backHandler.current = null
            const wasRetest = retest
            setCalibrated(true)
            setRetest(false)
            setTab('home')
            // Tras el primer test no se enseñan las novedades de una versión que ya estrena.
            if (!wasRetest) update({ lastSeenVersion: APP_VERSION })
            setGate([])
            refreshProfile().then((p) => {
              // Tras un re-test, las semanas del plan que aún no empezaste se rehacen con tu nuevo nivel.
              if (wasRetest && p.plan && settings.geminiKey) {
                adaptPlanAfterTest(settings.geminiKey, mainModels(settings))
                  .then(setPlan)
                  .catch(() => {})
              }
            })
          }}
        />
      </Shell>
    )
  }

  if (gate.length) {
    return (
      <Shell t={t} overlay={picker}>
        <NoticeGate
          settings={settings}
          notices={gate}
          homework={homework}
          update={update}
          onDone={() => setGate([])}
          onRetest={() => {
            setGate([])
            setRetest(true)
          }}
          onOpenThemes={() => {
            setGate([])
            setSettingsPage('look')
            setTab('settings')
          }}
        />
      </Shell>
    )
  }

  if (review) {
    return (
      <Shell t={t} overlay={picker}>
        <ReviewScreen
          settings={settings}
          t={t}
          registerBack={registerBack}
          onExit={() => {
            backHandler.current = null
            setReview(false)
          }}
        />
      </Shell>
    )
  }

  if (lesson) {
    return (
      <Shell t={t} overlay={picker}>
        <Conversation
          key={lesson.key}
          scenarioId={lesson.scenarioId}
          categoryId={lesson.categoryId}
          customTopic={lesson.customTopic}
          planLesson={lesson.planLesson}
          settings={settings}
          t={t}
          update={update}
          onExit={() => {
            backHandler.current = null
            setLesson(null)
            setTab('home')
            refreshProfile() // lección del plan hecha, nivel por la práctica…
          }}
          registerBack={registerBack}
        />
      </Shell>
    )
  }

  const start = (scenarioId: string, categoryId?: string, customTopic?: string) =>
    setLesson({ key: Date.now(), scenarioId, categoryId, customTopic })
  const startPlanLesson = (id: string) => {
    backHandler.current = null
    setPlanOpen(false)
    setLesson({ key: Date.now(), scenarioId: 'plan', planLesson: id })
  }
  const openPlan = () => {
    setPlanOpen(true)
    backHandler.current = closePlan
  }
  const closePlan = () => {
    setPlanOpen(false)
    backHandler.current = null
  }

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
    <Shell t={t} overlay={picker}>
      <div className="no-scrollbar relative z-[2] h-full overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+112px)]">
        {about ? (
          <AboutScreen settings={settings} t={t} initialPage={about} onBack={closeAbout} />
        ) : planOpen ? (
          <PlanScreen
            settings={settings}
            plan={plan}
            level={level}
            onPlanChange={setPlan}
            onStartLesson={startPlanLesson}
            onBack={closePlan}
          />
        ) : (
          <>
            {tab === 'home' && (
              <Home
                settings={settings}
                t={t}
                update={update}
                onStart={start}
                onGoSettings={() => setTab('settings')}
                onReview={() => setReview(true)}
                plan={plan}
                calibrated={!!calibrated}
                onPlanChange={setPlan}
                onStartLesson={startPlanLesson}
                onOpenPlan={openPlan}
                registerBack={registerBack}
              />
            )}
            {tab === 'words' && <WordsScreen settings={settings} registerBack={registerBack} />}
            {tab === 'progress' && <ProgressScreen settings={settings} registerBack={registerBack} onReview={() => setReview(true)} />}
            {tab === 'settings' && (
              <SettingsScreen
                settings={settings}
                t={t}
                update={update}
                registerBack={registerBack}
                onRetest={() => setRetest(true)}
                onOpenAbout={() => openAbout('main')}
                initialPage={settingsPage}
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
          setPlanOpen(false)
          setSettingsPage(null)
          setTab(k)
        }}
      />
    </Shell>
  )
}

function Shell({ t, children, overlay }: { t: ReturnType<typeof themeVars>; children: React.ReactNode; overlay?: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-full max-w-xl overflow-hidden" style={{ color: 'var(--tx)' }}>
      <Background t={t} />
      {children}
      {overlay}
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
