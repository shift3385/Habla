import { App as CapApp } from '@capacitor/app'
import { SystemBars, SystemBarsStyle } from '@capacitor/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APP_VERSION } from './lib/changelog'
import AboutScreen from './screens/AboutScreen'
import Calibration from './screens/Calibration'
import Conversation from './screens/Conversation'
import Home from './screens/Home'
import Onboarding from './screens/Onboarding'
import { applyBackup, readBackup } from './lib/backup'
import { expireRetestLeftovers } from './lib/testDraft'
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
import { askNotificationPermission, syncReminders } from './lib/reminders'
import PlanScreen from './screens/PlanScreen'
import FavoritesSetup from './screens/FavoritesSetup'
import NoticeGate from './screens/NoticeGate'
import { pendingNotices, type Notice } from './lib/notices'
import { hasValidFavorites } from './lib/topics'
import { loadSettings, mainModels, saveSettings, type Settings } from './lib/settings'
import { setTeacherVoice, setVoicePrefs } from './lib/tts'
import { applyOrientation } from './lib/orientation'
import { onPhoneticsQuota, startupCheck } from './lib/phonetics'
import { RecoveryScreen } from './components/Recovery'
import PhoneticsAlert from './components/PhoneticsAlert'
import Background from './ui/Background'
import AudioPicker from './components/AudioPicker'
import GeminiTroubleSheet from './components/GeminiTroubleSheet'
import { onGeminiTrouble, type Trouble } from './lib/geminiTrouble'
import { discardSavedClass, getSavedClass, type SavedClass } from './lib/savedClass'
import MascotPage from './components/MascotPage'
import GrammarSheet from './components/GrammarSheet'
import { onOpenGrammarTopic } from './lib/grammarLink'
import { Icon, type IconName } from './ui/icons'
import { cssVars, TEACHERS, THEME_INFO, themeVars } from './ui/theme'

type Tab = 'home' | 'words' | 'progress' | 'settings'

interface Lesson {
  key: number // cada clase monta un componente nuevo: nunca arrastra la anterior
  scenarioId: string
  categoryId?: string
  customTopic?: string // tema escrito por el alumno
  planLesson?: string // lección del plan de 12 semanas
  grammarTopic?: string // v5.10: «Practicar en una clase» desde un tema de Gramática
  resume?: SavedClass // clase guardada que se retoma (NC-16)
  finishNow?: boolean // v5.9: «Terminar» desde el Inicio: se abre la clase guardada y se cierra con su informe
}

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  // AUD-RES-704: si falla la carga inicial, pantalla de recuperación en vez de negro para siempre.
  const [bootError, setBootError] = useState<string | null>(null)
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
  const [profileLevels, setProfileLevels] = useState<Record<'grammar' | 'reading' | 'listening' | 'speaking', string> | null>(null)
  // Exactamente 3 temas favoritos (5.4): a quien venga de una versión anterior con otro número se le piden.
  const [needsFavs, setNeedsFavs] = useState(false)
  const backHandler = useRef<(() => void) | null>(null)
  // v5.10 (D3): hoja de Gramática encima de todo («📘 Ver en Gramática» en la clase y el informe). Su Atrás va primero.
  const [gramSheet, setGramSheet] = useState<string | null>(null)
  const sheetBack = useRef<(() => void) | null>(null)
  useEffect(() => onOpenGrammarTopic(setGramSheet), [])
  const registerSheetBack = useCallback((h: (() => void) | null) => {
    sheetBack.current = h
  }, [])
  const notifAsked = useRef(false)
  const tabRef = useRef(tab)
  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  // Bienvenida animada en cada arranque: "Welcome back" si ya hay perfil, o el alta si es nuevo.
  const [splash, setSplash] = useState(true)
  // Avisos antes del Inicio (novedades, re-test, compañeros): se calculan una vez al terminar la bienvenida.
  const [gate, setGate] = useState<Notice[]>([])
  // Problema con Gemini (saturado, lento, sin cuota, clave…): la mascota propone otro modelo u otra clave.
  const [trouble, setTrouble] = useState<Trouble | null>(null)
  const troubleSnooze = useRef(0)
  useEffect(
    () =>
      onGeminiTrouble((tr) => {
        // "Ahora no" calla los avisos de saturación un rato; los de clave o modelo se enseñan siempre.
        if ((tr.kind === 'slow' || tr.kind === 'quota') && Date.now() < troubleSnooze.current) return
        setTrouble((cur) => cur ?? tr)
      }),
    [],
  )
  // Clase en progreso guardada (NC-16) y preguntas de la mascota: empezar otra clase o cerrar la app (NC-15).
  const [savedClass, setSavedClass] = useState<SavedClass | null>(null)
  const savedRef = useRef<SavedClass | null>(null)
  const [askNew, setAskNew] = useState<(() => void) | null>(null)
  const [askExit, setAskExit] = useState(false)
  const loadSaved = useCallback(async () => {
    const s = await getSavedClass()
    savedRef.current = s
    setSavedClass(s)
    return s
  }, [])
  // Corrector fonético (Azure): comprobación al abrir y aviso de la mascota si el F0 se agota.
  const [phonAlert, setPhonAlert] = useState(false)
  useEffect(() => onPhoneticsQuota(() => setPhonAlert(true)), [])
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
    setProfileLevels(p.levels)
    return p
  }, [])

  useEffect(() => {
    // Los setState ocurren tras cargar datos asíncronos (IndexedDB/Preferences), no de forma síncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([loadSettings(), refreshProfile(), loadDashboard(), loadSaved()]).then(async ([s, p, dash]) => {
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
      // Restos de un re-test abandonado hace más de un mes (audios incluidos): fuera (AUD-FLU-204).
      if (p.calibratedAt) expireRetestLeftovers().catch(() => {})
      setStreak(dash.streak)
      setHomework(dash.lastHomework)
      setSettings(s)
    }).catch((e: unknown) => {
      console.error('[HABLA] fallo al arrancar', e)
      setBootError((e as Error)?.name || 'Error')
    })
  }, [refreshProfile, loadSaved])

  useEffect(() => {
    settingsRef.current = settings
    retestReadyRef.current = retestReady
  }, [settings, retestReady])

  const endSplash = useCallback(() => {
    refreshProfile().then((p) => {
      const s = settingsRef.current
      // Solo para quien ya usaba la app: a un usuario nuevo no se le enseñan novedades ni avisos.
      if (s?.onboarded && isPersonalized(p) && p.calibratedAt) {
        setGate(
          pendingNotices(s, {
            savedClass: !!savedRef.current,
            retestReady: retestReadyRef.current,
            recalibrate: needsRecalibration(p),
            streak,
            homeworkDate: homework?.date,
          }),
        )
      }
      setSplash(false)
    }).catch((e: unknown) => setBootError((e as Error)?.name || 'Error'))
  }, [refreshProfile, streak, homework])

  // "Ya tengo mi perfil": importar una copia de seguridad desde la bienvenida.
  const importFromWelcome = useCallback(async (file: File) => {
    // AUD-SEG-501: se comprueba la copia (y que traiga un perfil con nombre) ANTES de sustituir nada.
    const ready = await readBackup(file)
    const name = ready.backup.tables.profile[0]?.name
    if (typeof name !== 'string' || !name.trim()) throw new Error('La copia no tiene un perfil con nombre. Usa "Soy nuevo".')
    await applyBackup(ready)
    await refreshProfile()
    // AUD-FLU-200: la copia no trae la clave de Gemini. Con clave ya puesta se salta el tutorial (y se GUARDA, antes
    // se perdía al reiniciar); sin clave, el tutorial sigue y pasa por el paso de la clave.
    setSettings((s) => {
      if (!s || !s.geminiKey.trim()) return s
      const next = { ...s, onboarded: true }
      saveSettings(next)
      return next
    })
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
    setVoicePrefs(settings.ttsRate, settings.voiceIndex) // v5.9: para los botones ▶ que no reciben los ajustes (CorrectionView)
  }, [settings, t])

  const phonChecked = useRef(false)
  useEffect(() => {
    if (!settings || phonChecked.current) return
    phonChecked.current = true
    startupCheck(settings).then((r) => {
      if (Object.keys(r.patch).length) update(r.patch)
      if (r.alert) setPhonAlert(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  // Orientación elegida en Tema y mascota (p. ej. horizontal fija si el teléfono no gira).
  const orientation = settings?.orientation ?? 'auto'
  useEffect(() => {
    applyOrientation(orientation)
  }, [orientation])

  // Botón "atrás" de Android: primero la pantalla activa; si no, vuelve a Inicio; en Inicio sale.
  useEffect(() => {
    const sub = CapApp.addListener('backButton', () => {
      if (sheetBack.current) sheetBack.current()
      else if (backHandler.current) backHandler.current()
      else if (tabRef.current !== 'home') setTab('home')
      // En el Inicio: la mascota pregunta antes de cerrar (NC-15).
      else setAskExit((open) => !open)
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
  const reminderTheme = settings?.theme ?? 'lumi'
  useEffect(() => {
    const today = plan ? todayLesson(plan) : null
    // AUD-FLU-900: con el recordatorio activado, al arrancar se pide el permiso si Android aún no lo ha decidido
    // (antes solo se pedía al activar el interruptor, y sin permiso no se programaba nada sin avisar).
    const ask = reminderOn && !notifAsked.current
    if (ask) notifAsked.current = true // una vez por sesión: no saltar el diálogo tras cada lección
    ;(ask ? askNotificationPermission() : Promise.resolve(false)).then(() => syncReminders({
      enabled: reminderOn,
      time: reminderTime,
      lessonTitle: today?.lesson?.titleEs,
      doneToday: plan ? doneToday(plan) : false,
      retestAt,
      theme: reminderTheme,
    }))
  }, [reminderOn, reminderTime, plan, retestAt, reminderTheme])

  if (bootError) return <RecoveryScreen detail={bootError} />
  if (!settings || !t || calibrated === null) return null

  // Selector de audio con auriculares: puede aparecer en cualquier pantalla.
  const audioPicker = <AudioPicker settings={settings} t={t} update={update} />
  const picker = (
    <>
      {audioPicker}
      {gramSheet && (
        <GrammarSheet
          key={gramSheet}
          topicId={gramSheet}
          settings={settings}
          t={t}
          update={update}
          level={profileLevels?.grammar ?? level}
          onClose={() => setGramSheet(null)}
          registerBack={registerSheetBack}
        />
      )}
      {phonAlert && settings.onboarded && (
        <PhoneticsAlert
          settings={settings}
          t={t}
          onClose={() => setPhonAlert(false)}
          onOpenModels={() => {
            setPhonAlert(false)
            // AUD-FLU-207: en mitad de una clase no se corta (antes se desmontaba sin guardar). La fonética ya está
            // apagada: la clase sigue solo con Gemini y Ajustes → Modelos se puede abrir al terminar.
            if (lesson) return
            setLesson(null)
            setSettingsPage('gemini')
            setTab('settings')
          }}
        />
      )}
      {trouble && settings.onboarded && (
        <GeminiTroubleSheet
          trouble={trouble}
          settings={settings}
          t={t}
          update={update}
          onClose={() => setTrouble(null)}
          onLater={() => {
            troubleSnooze.current = Date.now() + 10 * 60_000
            setTrouble(null)
          }}
        />
      )}
    </>
  )

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
      <Shell t={t} overlay={audioPicker}>
        <Calibration
          settings={settings}
          t={t}
          update={update}
          registerBack={registerBack}
          onPause={
            calibrated
              ? () => {
                  // v5.9: re-test en pausa → al Inicio. Se retoma al volver a entrar al re-test (el progreso está guardado).
                  backHandler.current = null
                  setRetest(false)
                  setTab('home')
                }
              : undefined
          }
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
          savedClass={savedClass}
          levels={profileLevels ?? undefined}
          onResumeClass={() => {
            setGate([])
            resumeClass()
          }}
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
          update={update}
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
          grammarTopic={lesson.grammarTopic}
          resume={lesson.resume}
          finishNow={lesson.finishNow}
          settings={settings}
          t={t}
          update={update}
          onExit={() => {
            backHandler.current = null
            setLesson(null)
            setTab('home')
            refreshProfile() // lección del plan hecha, nivel por la práctica…
            loadSaved() // ¿quedó guardada para continuar?
          }}
          registerBack={registerBack}
        />
      </Shell>
    )
  }

  /** Con una clase guardada, antes de empezar otra se pregunta (solo se guarda una a la vez). */
  const guardNew = (go: () => void) => {
    if (!savedRef.current) return go()
    setAskNew(() => go)
  }
  const start = (scenarioId: string, categoryId?: string, customTopic?: string) =>
    guardNew(() => setLesson({ key: Date.now(), scenarioId, categoryId, customTopic }))
  // v5.10 (D3): «Practicar en una clase» desde un tema de Gramática (cuenta como cualquier otra clase).
  const startGrammar = (topicId: string) =>
    guardNew(() => setLesson({ key: Date.now(), scenarioId: 'grammar', grammarTopic: topicId }))
  const startPlanLesson = (id: string) =>
    guardNew(() => {
      backHandler.current = null
      setPlanOpen(false)
      setLesson({ key: Date.now(), scenarioId: 'plan', planLesson: id })
    })
  function resumeClass() {
    const s = savedRef.current
    if (!s) return
    backHandler.current = null
    setPlanOpen(false)
    setLesson({
      key: Date.now(),
      scenarioId: s.scenarioId,
      categoryId: s.categoryId,
      customTopic: s.customTopic,
      planLesson: s.planLesson,
      grammarTopic: s.grammarTopic,
      resume: s,
    })
  }
  /** v5.9: terminar la clase guardada sin seguirla, con la misma evaluación que «Terminar» dentro de la clase. */
  function finishSavedClass() {
    const s = savedRef.current
    if (!s) return
    if (!confirm(`¿Terminar «${s.title}» y ver tu evaluación? Ya no podrás seguirla.`)) return
    backHandler.current = null
    setPlanOpen(false)
    setLesson({
      key: Date.now(),
      scenarioId: s.scenarioId,
      categoryId: s.categoryId,
      customTopic: s.customTopic,
      planLesson: s.planLesson,
      resume: s,
      finishNow: true,
    })
  }

  // Preguntas de la mascota encima del Inicio.
  const mascotEl = THEME_INFO[settings.theme].mascot
  const dialogs = (
    <>
      {askNew && (
        <MascotPage
          overlay={{ t }}
          element={mascotEl}
          mood="thinking"
          title="Tienes una clase en progreso"
          subtitle={`«${savedClass?.title ?? 'Tu clase'}» quedó a medias. Si empiezas una nueva, esa se cierra tal como está (lo que hablaste cuenta en tu progreso) y ya no podrás seguirla. ¿Continuar?`}
          primary={{
            label: 'Reanudar la anterior',
            onClick: () => {
              setAskNew(null)
              resumeClass()
            },
          }}
          secondary={{
            label: 'Empezar nueva',
            onClick: async () => {
              const go = askNew
              setAskNew(null)
              await discardSavedClass()
              await loadSaved()
              go()
            },
          }}
          onBack={() => setAskNew(null)}
        />
      )}
      {askExit && (
        <MascotPage
          overlay={{ t }}
          element={mascotEl}
          mood="idle"
          title="¿Ya te vas?"
          subtitle={
            savedClass
              ? `Tu clase «${savedClass.title}» quedó guardada: la seguimos cuando vuelvas.`
              : 'Aquí te espero para la próxima clase.'
          }
          primary={{ label: 'Quedarme', onClick: () => setAskExit(false) }}
          secondary={{ label: 'Salir de Habla', onClick: () => CapApp.exitApp() }}
        />
      )}
    </>
  )
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
      <div className="tab-content no-scrollbar relative z-[2] h-full overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+112px)]">
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
                onOpenGoal={() => {
                  setSettingsPage('goal')
                  setTab('settings')
                }}
                onReview={() => setReview(true)}
                plan={plan}
                calibrated={!!calibrated}
                onPlanChange={setPlan}
                onStartLesson={startPlanLesson}
                onStartGrammar={(id) => (settings.geminiKey.trim() ? startGrammar(id) : setTab('settings'))}
                onOpenPlan={openPlan}
                registerBack={registerBack}
                savedClass={savedClass}
                onResumeClass={resumeClass}
                onFinishClass={finishSavedClass}
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
                onDataReplaced={() => {
                  loadSaved()
                  refreshProfile()
                }}
              />
            )}
          </>
        )}
      </div>
      {dialogs}
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
    <div className="shell relative mx-auto h-full max-w-xl overflow-hidden" style={{ color: 'var(--tx)' }}>
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
      className="tabbar absolute right-5 left-5 z-[5] grid h-[66px] gap-1 rounded-[33px] p-1.5"
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
            {sel && <span className="tab-label">{x.label}</span>}
          </button>
        )
      })}
    </nav>
  )
}
