import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { SCENARIOS } from '../lib/scenarios'
import { dueSummary, syncCards, type DueSummary } from '../lib/srs'
import PlanCard from '../components/PlanCard'
import { doneToday, todayLesson, type StudyPlan } from '../lib/plan'
import { nextRetestAt } from '../lib/levels'
import { buildAdvice, buildTips, interleave, newTipRound, noteTipShown, rotate, type Tip } from '../lib/mascotTips'
import { hasAzure } from '../lib/phonetics'
import MascotBubble from '../components/MascotBubble'
import type { Settings } from '../lib/settings'
import type { SavedClass } from '../lib/savedClass'
import { loadDashboard, type Dashboard } from '../lib/stats'
import { FAV_COUNT, favoriteCategories, TOPIC_CATEGORIES } from '../lib/topics'
import { getProfile } from '../lib/profile'
import { speakingGoal } from '../lib/fluency'
import { notificationsGranted } from '../lib/reminders'
import AllTopicsView from '../components/AllTopicsView'
import GrammarPanel from '../components/GrammarPanel'
import MascotPage from '../components/MascotPage'
import GrammarRoutes, { type GramRoute } from '../components/GrammarRoutes'
import { grammarSections } from '../lib/grammar'
import TopicAskPage, { type AskKind } from '../components/TopicAskPage'
import type { SoundRoute } from '../components/SoundRoutes'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import Segmented from '../ui/Segmented'
import { THEME_INFO, type ThemeVars, teacherName } from '../ui/theme'

interface Props {
  settings: Settings
  t: ThemeVars
  update: (patch: Partial<Settings>) => void
  onStart: (scenarioId: string, categoryId?: string, customTopic?: string) => void
  onGoSettings: () => void
  /** Ajustes → Meta diaria (permiso de notificaciones). */
  onOpenGoal?: () => void
  onReview: () => void
  plan: StudyPlan | null
  calibrated: boolean
  onPlanChange: (p: StudyPlan) => void
  onStartLesson: (id: string) => void
  /** v5.10 (D3): «Practicar en una clase» desde un tema de Gramática. */
  onStartGrammar?: (topicId: string) => void
  onOpenPlan: () => void
  registerBack: (h: (() => void) | null) => void
  savedClass?: SavedClass | null
  onResumeClass?: () => void
  /** v5.9: terminar la clase guardada (con su evaluación) sin seguirla. */
  onFinishClass?: () => void
}

// 5.11 (Sonidos): las pantallas de Sonidos se cargan al abrir la pestaña (React.lazy): no pesan en el arranque.
const SoundsPanel = lazy(() => import('../components/SoundsPanel'))
const SoundRoutes = lazy(() => import('../components/SoundRoutes'))
/** Mientras llega el código de Sonidos (una vez por sesión, desde el propio APK): un aviso discreto, sin saltos. */
const soundsLoading = <div className="txt-sub mt-3 p-5 text-center text-sm">Cargando sonidos…</div>

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 19 ? 'Good afternoon' : 'Good evening'
}

const PRACTICES = SCENARIOS.filter((s) => !s.hidden)


export default function Home({
  settings,
  t,
  update,
  onStart,
  onGoSettings,
  onOpenGoal,
  onReview,
  plan,
  calibrated,
  onPlanChange,
  onStartLesson,
  onStartGrammar,
  onOpenPlan,
  registerBack,
  savedClass,
  onResumeClass,
  onFinishClass,
}: Props) {
  // 5.11 (M-09, REV-11-D1-05): cada vez que se monta el Inicio (al volver de una clase, del Repaso, de otra pestaña…)
  // empieza otra ronda de redacciones de los globos. En el inicializador: antes de calcular los avisos de esta visita.
  useState(() => newTipRound())
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [seg, setSeg] = useState<'topics' | 'practices' | 'grammar' | 'sounds'>('topics')
  // v5.10 «Gramática»: pila de pantallas (sección → tema → relacionado…) y búsqueda (se conserva al volver).
  const [gram, setGram] = useState<GramRoute[]>([])
  const [gramQuery, setGramQuery] = useState('')
  const [gramLevel, setGramLevel] = useState('A2')
  const pushGram = useCallback((r: GramRoute) => setGram((g) => [...g, r]), [])
  const popGram = useCallback(() => setGram((g) => g.slice(0, -1)), [])
  // 5.11 (S-07) «Sonidos»: su propia pila (tabla → ficha → lección…), como Gramática.
  const [snd, setSnd] = useState<SoundRoute[]>([])
  const pushSnd = useCallback((r: SoundRoute) => setSnd((x) => [...x, r]), [])
  const popSnd = useCallback(() => setSnd((x) => x.slice(0, -1)), [])
  // Tus 3 temas (5.4): el Inicio solo muestra esos; el resto está en "Más temas".
  const [favs, setFavs] = useState<string[]>([])
  const [allOpen, setAllOpen] = useState(false)
  const [ask, setAsk] = useState<AskKind | null>(null)
  const [retestAt, setRetestAt] = useState<number | null>(null)
  const [hasPurpose, setHasPurpose] = useState(true)
  // 5.10.1 (UX-04): la meta de velocidad del consejo «ppm» es la de tu nivel al hablar (la misma que el informe).
  const [speakLevel, setSpeakLevel] = useState<string | undefined>()
  useEffect(() => {
    getProfile().then((p) => {
      setFavs(p.interests ?? [])
      setRetestAt(nextRetestAt(p))
      setHasPurpose(!!(p.purposes?.length || p.goal?.trim()))
      setGramLevel(p.levels.grammar || p.levels.overall)
      setSpeakLevel(p.levels.speaking || p.levels.overall)
    })
  }, [])
  // Atrás (Android): cierra la hoja o "Más temas" antes de salir del Inicio.
  // Solo mientras hay algo abierto: así no se borra el "atrás" de otras pantallas (Mi plan, Acerca de).
  // v5.10: dentro de Gramática, Atrás vuelve a la pantalla anterior (tema → sección → pestaña Gramática).
  const gramOpen = gram.length > 0
  const gramIntro = seg === 'grammar' && !settings.grammarIntroSeen
  const sndOpen = snd.length > 0
  const sndIntro = seg === 'sounds' && !settings.soundsIntroSeen
  useEffect(() => {
    if (!ask && !allOpen && !gramOpen && !gramIntro && !sndOpen && !sndIntro) return
    registerBack(ask ? () => setAsk(null) : allOpen ? () => setAllOpen(false) : gramOpen ? popGram : sndOpen ? popSnd : () => setSeg('topics'))
    return () => registerBack(null)
  }, [ask, allOpen, gramOpen, gramIntro, sndOpen, sndIntro, registerBack, popGram, popSnd])
  const keysReady = settings.geminiKey.trim().length > 0
  const info = THEME_INFO[settings.theme]
  // La mascota habla en globos flotantes (MascotBubble); tocarla pasa al siguiente.
  const mainRef = useRef<HTMLDivElement>(null)
  const mascotRef = useRef<HTMLSpanElement>(null)
  const surpriseRef = useRef<HTMLButtonElement>(null)
  const [nudge, setNudge] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const onSpeaking = useCallback((on: boolean) => setSpeaking(on), [])
  // Toca a tu mascota: la primera vez desaparece el globo "¡Tócame!"; después, te cuenta lo siguiente.
  const mascot = (size: number) => (
    <span ref={mascotRef} className="relative flex-none">
      <Mascot
        element={info.mascot}
        size={size}
        mood={speaking ? 'speaking' : undefined}
        onTap={() => {
          if (!settings.mascotTapped) update({ mascotTapped: true })
          setNudge((n) => n + 1)
        }}
      />
      {!settings.mascotTapped && (
        <span
          className="anim-bob pointer-events-none absolute -top-3 left-[60%] rounded-[14px_14px_14px_4px] px-2.5 py-1.5 fs-12 font-semibold whitespace-nowrap"
          style={{ background: 'var(--acc)', color: 'var(--ink)', boxShadow: '0 6px 18px var(--glow)' }}
        >
          ¡Tócame!
        </span>
      )}
    </span>
  )

  const [due, setDue] = useState<DueSummary | null>(null)

  useEffect(() => {
    loadDashboard().then(setDash)
    syncCards()
      .then(dueSummary)
      .then(setDue)
      .catch(() => {})
  }, [])

  const goal = settings.dailyGoalMinutes
  const mins = dash?.minutesToday ?? 0
  // Minutos enteros en la cabecera para que quepa en una línea, como en el diseño.
  const minsLabel = String(Math.floor(mins))
  const pct = Math.min(1, mins / goal)
  const start = (scenarioId: string, categoryId?: string, customTopic?: string) =>
    keysReady ? onStart(scenarioId, categoryId, customTopic) : onGoSettings()
  const surprise = () => start('free')

  const today = plan ? todayLesson(plan) : null
  const favCats = favoriteCategories(favs)
  // Por qué consejo se va (se guarda en este teléfono; si no se puede, empieza por el primero).
  const [adviceCursor] = useState(() => {
    try {
      return Number(localStorage.getItem('habla.adviceCursor')) || 0
    } catch {
      return 0
    }
  })
  const onTipShown = useCallback((tip: Tip) => {
    noteTipShown(tip) // 5.11 (M-09, I-4): los consejos «de temporada» se jubilan tras verse 2 veces
    if (!tip.id.startsWith('a-')) return
    try {
      localStorage.setItem('habla.adviceCursor', String((Number(localStorage.getItem('habla.adviceCursor')) || 0) + 1))
    } catch {
      // sin almacenamiento: no pasa nada
    }
  }, [])
  const azureOn = hasAzure(settings)
  // AUD-FLU-900: recordatorio activado sin permiso de notificaciones → la mascota lo dice (antes fallaba en silencio).
  const [notifDenied, setNotifDenied] = useState(false)
  useEffect(() => {
    if (!settings.reminderOn || !Capacitor.isNativePlatform()) return
    const check = () => notificationsGranted().then((ok) => setNotifDenied(!ok))
    check()
    // Al volver de los ajustes del teléfono (donde se concede el permiso), se mira otra vez.
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [settings.reminderOn])
  const remindersBlocked = settings.reminderOn && notifDenied
  const tips = useMemo(() => {
    const notices = settings.mascotNotices
      ? buildTips({
          minutesToday: mins,
          goal,
          streak: dash?.streak ?? 0,
          dueCards: due?.total ?? 0,
          savedTitle: savedClass?.title,
          lessonTitle: today?.lesson?.titleEs,
          lessonDone: plan ? doneToday(plan) : false,
          liveTopics: favCats.some((c) => c.live),
          retestDays: retestAt === null ? null : (retestAt - Date.now()) / 86400000,
          remindersBlocked,
          restedYesterday: dash?.restedYesterday, // 5.11 (M-04, I-4): «Ayer descansaste; tu racha sigue a salvo»
        })
      : []
    const advice = settings.mascotAdvice ? rotate(buildAdvice({ hasPurpose, hasAzure: azureOn, wpmGoal: speakLevel ? speakingGoal(speakLevel) : undefined }), adviceCursor) : []
    return interleave(notices, advice)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mins, goal, dash?.streak, dash?.restedYesterday, due?.total, savedClass?.title, today?.lesson?.id, plan, favs, retestAt, settings.mascotNotices, settings.mascotAdvice, hasPurpose, azureOn, adviceCursor, remindersBlocked, speakLevel])
  const onTip = (tip: Tip) => {
    if (tip.action === 'notif') onOpenGoal?.()
    else if (tip.action === 'resume') onResumeClass?.()
    else if (tip.action === 'review') onReview()
    else if (tip.action === 'lesson' && today?.lesson) {
      if (keysReady) onStartLesson(today.lesson.id)
      else onGoSettings()
    }
  }

  const askSheet = ask && (
    <TopicAskPage
      kind={ask}
      settings={settings}
      element={THEME_INFO[settings.theme].mascot}
      t={t}
      onClose={() => setAsk(null)}
      onStart={(text) => {
        setAsk(null)
        start(ask === 'debate' ? 'debate' : 'free', undefined, text)
      }}
    />
  )

  const gramTop = gram[gram.length - 1]
  if (gramTop) {
    return (
      <GrammarRoutes
        route={gramTop}
        settings={settings}
        update={update}
        level={gramLevel}
        push={pushGram}
        pop={popGram}
        onPracticeClass={onStartGrammar}
      />
    )
  }

  const sndTop = snd[snd.length - 1]
  if (sndTop)
    return (
      <Suspense fallback={soundsLoading}>
        <SoundRoutes route={sndTop} settings={settings} update={update} push={pushSnd} pop={popSnd} />
      </Suspense>
    )

  if (allOpen) {
    return (
      <>
        <AllTopicsView
          favs={favs}
          onPick={(id) => start('free', id)}
          onFree={() => setAsk('free')}
          onFavsChange={setFavs}
          onBack={() => setAllOpen(false)}
        />
        {askSheet}
      </>
    )
  }

  return (
    <div className="anim-up">
      {askSheet}
      {/* Cabecera */}
      <div className="flex min-h-[54px] items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="home-title fs-27 leading-[1.1] font-semibold tracking-[-.7px]">
            {greeting()}
            <span className="txt-acc">.</span>
          </div>
          {/* 5.10.1 (REG-A4-08): home-sub se oculta en vertical con poco alto (index.css) para que el Inicio no desplace. */}
          <div className="home-sub txt-sub mt-0.5 text-sm">¿De qué hablamos hoy?</div>
        </div>
        <div className="flex flex-none gap-2">
          <button
            onClick={() => update({ mode: settings.mode === 'dark' ? 'light' : 'dark' })}
            className="glass grid h-[42px] w-[42px] place-items-center rounded-full"
            aria-label="Cambiar modo claro u oscuro"
          >
            <Icon name={settings.mode === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          <div className="glass flex h-[42px] items-center gap-1.5 rounded-[21px] px-3.5 font-semibold" title="Días seguidos">
            <Icon name="flame" size={17} stroke={1.8} color="var(--acc)" />
            {dash?.streak ?? 0}
          </div>
        </div>
      </div>

      {!keysReady && (
        <button onClick={onGoSettings} className="glass mt-4 flex w-full items-center gap-3 rounded-[22px] p-3.5 text-left text-sm">
          <span className="field grid h-9 w-9 flex-none place-items-center rounded-full txt-acc2">
            <Icon name="key" size={17} />
          </span>
          <span>
            Antes de empezar, pega tu clave de Gemini en <b>Ajustes</b>.
          </span>
        </button>
      )}

      {/* Bloque principal (igual en todos los temas desde la 5.10). El globo de la mascota flota encima. */}
      <div ref={mainRef} className="relative mt-4">
        <MascotBubble
          tips={tips}
          wrap={mainRef}
          mascot={mascotRef}
          avoid={surpriseRef}
          nudge={nudge}
          paused={!settings.mascotTapped || !dash}
          onAction={onTip}
          onSpeaking={onSpeaking}
          onShown={onTipShown}
        />
        {/* v5.10 (decisión del dueño): la misma tarjeta en todos los temas: «<mascota> te espera», barra de la meta y ✦. */}
        <div className="glass flex items-center gap-2.5 rounded-[30px] py-1.5 pr-3 pl-1.5">
          {mascot(80)}
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold">{teacherName(settings.theme)} te espera</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-[3px]" style={{ background: 'var(--gb)' }}>
              <div className="h-full rounded-[3px] transition-[width] duration-500" style={{ width: `${pct * 100}%`, background: 'var(--acc)' }} />
            </div>
            <div className="txt-sub mt-1.5 text-xs">
              {minsLabel}/{goal} min hoy
            </div>
          </div>
          <button ref={surpriseRef} onClick={surprise} className="btn-acc grid h-[54px] w-[54px] flex-none place-items-center rounded-full" title="Sorpréndeme" aria-label="Sorpréndeme">
            <Icon name="spark" size={18} stroke={1.8} />
          </button>
        </div>
      </div>

      {savedClass && (
        <div className="glass mt-2 flex h-[48px] w-full items-center gap-2 rounded-[24px] pr-1.5 pl-2">
          <button onClick={onResumeClass} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <span className="btn-acc grid h-8 w-8 flex-none place-items-center rounded-full">
              <Icon name="mic" size={15} />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <b className="fs-clamp block truncate fs-14 font-semibold">Clase en progreso</b>
              <span className="fs-clamp txt-sub block truncate fs-12">{savedClass.title}</span>
            </span>
          </button>
          {onFinishClass && (
            <button onClick={onFinishClass} className="field flex h-9 flex-none items-center rounded-[18px] px-3 fs-13">
              Terminar
            </button>
          )}
          <button onClick={onResumeClass} className="btn-acc flex h-9 flex-none items-center rounded-[18px] px-3.5 fs-13">
            Continuar
          </button>
        </div>
      )}

      <PlanCard
        settings={settings}
        plan={plan}
        calibrated={calibrated}
        onPlanChange={onPlanChange}
        onStartLesson={(id) => (keysReady ? onStartLesson(id) : onGoSettings())}
        onOpenPlan={onOpenPlan}
        onOpenGrammar={(id) => pushGram({ kind: 'topic', id })}
        // 5.11 (M-08, I-4): si falla el plan, la mascota propone charlar de un tema (favorito del día o «Sorpréndeme»).
        favorites={favs}
        onAltTopic={(id) => (id ? start('free', id) : surprise())}
      />

      {due && due.total > 0 && (
        <button onClick={onReview} className="glass mt-2 flex h-[48px] w-full items-center gap-2.5 rounded-[24px] pr-1.5 pl-2 text-left">
          <span className="field txt-acc2 grid h-8 w-8 flex-none place-items-center rounded-full">
            <Icon name="cards" size={15} />
          </span>
          <span className="fs-clamp min-w-0 flex-1 truncate fs-14">
            <b className="font-semibold">Repaso de hoy</b>
            <span className="txt-sub"> · {due.total} {due.total === 1 ? 'frase' : 'frases'}</span>
          </span>
          <span className="btn-acc flex h-9 items-center rounded-[18px] px-3.5 fs-13">Repasar</span>
        </button>
      )}

      <div className="home-seg mt-3.5">
        <Segmented
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'topics', label: 'Temas', count: FAV_COUNT },
            { value: 'practices', label: 'Prácticas', count: PRACTICES.length },
            { value: 'grammar', label: 'Gramática', count: grammarSections().length },
            // 5.11 (S-07): cuarta pestaña. En teléfonos (< 420 px) los números se ocultan (index.css › .home-seg).
            { value: 'sounds', label: 'Sonidos' },
          ]}
        />
      </div>

      {seg === 'grammar' ? (
        <div key="grammar" className="anim-up">
          <GrammarPanel
            level={gramLevel}
            query={gramQuery}
            onQuery={setGramQuery}
            onOpenSection={(id) => pushGram({ kind: 'section', id })}
            onOpenTopic={(id) => pushGram({ kind: 'topic', id })}
            onAsk={(q) => pushGram({ kind: 'ask', q })}
            mascotName={info.mascotName}
          />
          {/* La primera vez, la mascota explica para qué sirve Gramática (patrón MascotPage, como el Repaso). */}
          {gramIntro && (
            <MascotPage
              overlay={{ t }}
              element={info.mascot}
              mood="speaking"
              title="Gramática, cuando la necesites"
              subtitle={`Aquí está la gramática de inglés explicada en español: cada tema con su fórmula, ejemplos que puedes escuchar, los errores típicos de quien habla español y ejercicios. Busca lo que quieras («pasado», «wish», «debería») o mira lo que te marco con ⭐ para tu nivel. Los ejercicios que falles irán a tu Repaso. Funciona sin internet y no gasta tu clave.`}
              primary={{ label: '¡Vamos!', onClick: () => update({ grammarIntroSeen: true }) }}
              secondary={{ label: 'Ahora no', onClick: () => setSeg('topics') }}
            />
          )}
        </div>
      ) : seg === 'sounds' ? (
        <div key="sounds" className="anim-up">
          <Suspense fallback={soundsLoading}>
            <SoundsPanel
              onOpenSound={(id) => pushSnd({ kind: 'sound', id })}
              onOpenLesson={(id) => pushSnd({ kind: 'lesson', id })}
              onOpenRoute={() => pushSnd({ kind: 'route' })}
              onOpenAlphabet={() => pushSnd({ kind: 'alphabet' })}
            />
          </Suspense>
          {/* 5.11 (S-07): la primera vez, la mascota explica Sonidos (DISENO §7.3). */}
          {sndIntro && (
            <MascotPage
              overlay={{ t }}
              element={info.mascot}
              mood="speaking"
              title="Sonidos del inglés"
              subtitle="El español tiene 5 vocales; el inglés, unas 15. Aquí aprendes a oírlas y a decirlas, con inglés americano: cada sonido tiene su ficha con palabras para escuchar, y la ruta te lleva paso a paso. Empieza por el abecedario o toca cualquier sonido de la tabla. Funciona sin internet; si tienes Azure, además te pongo nota."
              primary={{ label: '¡Vamos!', onClick: () => update({ soundsIntroSeen: true }) }}
              secondary={{ label: 'Ahora no', onClick: () => setSeg('topics') }}
            />
          )}
        </div>
      ) : seg === 'topics' ? (
        <div key="topics" className="anim-up">
          {/* Tus 3 temas: tarjetas grandes, sin scroll */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {favCats.map((c) => (
              <button
                key={c.id}
                onClick={() => start('free', c.id)}
                className="glass relative flex h-[96px] flex-col items-center justify-center gap-2 rounded-[22px] px-1.5"
              >
                <span className="field txt-acc2 grid h-[40px] w-[40px] place-items-center rounded-full">
                  <Icon name={c.icon} size={20} stroke={1.6} />
                </span>
                <span className="text-center fs-12 leading-[1.15] font-medium text-balance">{c.title}</span>
                {c.live && (
                  <span
                    className="absolute top-[10px] right-[10px] h-1.5 w-1.5 rounded-full"
                    style={{ background: 'var(--dot)', boxShadow: '0 0 8px var(--dot)' }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => (keysReady ? setAsk('free') : onGoSettings())} className="glass flex h-[52px] items-center gap-2.5 rounded-[26px] px-3">
              <span className="field txt-acc2 grid h-8 w-8 flex-none place-items-center rounded-full">
                <Icon name="pencil" size={15} />
              </span>
              <span className="text-left fs-13.5 leading-tight font-semibold">Tema libre</span>
            </button>
            <button onClick={() => setAllOpen(true)} className="glass flex h-[52px] items-center gap-2.5 rounded-[26px] px-3">
              <span className="field txt-acc2 grid h-8 w-8 flex-none place-items-center rounded-full">
                <Icon name="cards" size={15} />
              </span>
              <span className="min-w-0 flex-1 text-left fs-13.5 leading-tight font-semibold">Más temas</span>
              <span className="txt-sub text-xs">{TOPIC_CATEGORIES.length}</span>
            </button>
          </div>
        </div>
      ) : (
        <div key="practices" className="anim-up mt-3 grid grid-cols-2 gap-2">
          {PRACTICES.map((p, i) => {
            const open = () => (p.id === 'debate' ? (keysReady ? setAsk('debate') : onGoSettings()) : start(p.id))
            // La primera (tus puntos débiles) ocupa toda la fila; el resto, en cuadrícula de 2.
            return i === 0 ? (
              <button key={p.id} onClick={open} className="glass col-span-2 flex h-[60px] items-center gap-3 rounded-[30px] px-2.5 text-left">
                <span className="btn-acc grid h-[40px] w-[40px] flex-none place-items-center rounded-full">
                  <Icon name={p.icon} size={18} stroke={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block fs-15 font-semibold">{p.title}</span>
                  <span className="txt-sub block truncate fs-12.5">{p.subtitle}</span>
                </span>
                <span className="txt-sub grid w-[28px] flex-none place-items-center">
                  <Icon name="arrowUR" size={16} />
                </span>
              </button>
            ) : (
              <button key={p.id} onClick={open} className="glass flex h-[88px] flex-col gap-1.5 rounded-[22px] px-2.5 py-2.5 text-left">
                <span className="flex w-full items-center gap-2">
                  <span className="field txt-acc2 grid h-[32px] w-[32px] flex-none place-items-center rounded-full">
                    <Icon name={p.icon} size={16} stroke={1.6} />
                  </span>
                  <span className="line-clamp-2 min-w-0 flex-1 fs-13 leading-[1.15] font-semibold">{p.title}</span>
                </span>
                <span className="prac-desc txt-sub line-clamp-2 block fs-11.5 leading-[1.2]">{p.subtitle}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SmallRing({ pct, size, label }: { pct: number; size: number; label?: string }) {
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--gb)" strokeWidth="5" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke="var(--acc)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${Math.min(1, pct) * c} 999`}
          style={{ transition: 'stroke-dasharray .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-semibold" style={{ fontSize: size * 0.25 }}>
        {label ?? `${Math.round(Math.min(1, pct) * 100)}%`}
      </div>
    </div>
  )
}
