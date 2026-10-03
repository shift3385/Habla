import { useEffect, useState } from 'react'
import { SCENARIOS } from '../lib/scenarios'
import { dueSummary, syncCards, type DueSummary } from '../lib/srs'
import PlanCard from '../components/PlanCard'
import type { StudyPlan } from '../lib/plan'
import type { Settings } from '../lib/settings'
import { loadDashboard, type Dashboard } from '../lib/stats'
import { FAV_COUNT, favoriteCategories, TOPIC_CATEGORIES } from '../lib/topics'
import { getProfile } from '../lib/profile'
import AllTopicsView from '../components/AllTopicsView'
import TopicAskPage, { type AskKind } from '../components/TopicAskPage'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import Segmented from '../ui/Segmented'
import { TEACHERS, THEME_INFO, type ThemeVars } from '../ui/theme'

interface Props {
  settings: Settings
  t: ThemeVars
  update: (patch: Partial<Settings>) => void
  onStart: (scenarioId: string, categoryId?: string, customTopic?: string) => void
  onGoSettings: () => void
  onReview: () => void
  plan: StudyPlan | null
  calibrated: boolean
  onPlanChange: (p: StudyPlan) => void
  onStartLesson: (id: string) => void
  onOpenPlan: () => void
  registerBack: (h: (() => void) | null) => void
}

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
  onReview,
  plan,
  calibrated,
  onPlanChange,
  onStartLesson,
  onOpenPlan,
  registerBack,
}: Props) {
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [seg, setSeg] = useState<'topics' | 'practices'>('topics')
  // Tus 3 temas (5.4): el Inicio solo muestra esos; el resto está en "Más temas".
  const [favs, setFavs] = useState<string[]>([])
  const [allOpen, setAllOpen] = useState(false)
  const [ask, setAsk] = useState<AskKind | null>(null)
  useEffect(() => {
    getProfile().then((p) => setFavs(p.interests ?? []))
  }, [])
  // Atrás (Android): cierra la hoja o "Más temas" antes de salir del Inicio.
  // Solo mientras hay algo abierto: así no se borra el "atrás" de otras pantallas (Mi plan, Acerca de).
  useEffect(() => {
    if (!ask && !allOpen) return
    registerBack(ask ? () => setAsk(null) : () => setAllOpen(false))
    return () => registerBack(null)
  }, [ask, allOpen, registerBack])
  const keysReady = settings.geminiKey.trim().length > 0
  const teacher = TEACHERS[settings.teacher]
  const info = THEME_INFO[settings.theme]
  // Toca a tu mascota: la primera vez desaparece el globo "¡Tócame!".
  const mascot = (size: number) => (
    <span className="relative flex-none">
      <Mascot element={info.mascot} size={size} onTap={() => !settings.mascotTapped && update({ mascotTapped: true })} />
      {!settings.mascotTapped && (
        <span
          className="anim-bob pointer-events-none absolute -top-3 left-[60%] rounded-[14px_14px_14px_4px] px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap"
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

  const askSheet = ask && (
    <TopicAskPage
      kind={ask}
      element={THEME_INFO[settings.theme].mascot}
      t={t}
      onClose={() => setAsk(null)}
      onStart={(text) => {
        setAsk(null)
        start(ask === 'debate' ? 'debate' : 'free', undefined, text)
      }}
    />
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

  const favCats = favoriteCategories(favs)

  return (
    <div className="anim-up">
      {askSheet}
      {/* Cabecera */}
      <div className="flex h-[54px] items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-[27px] leading-[1.1] font-semibold tracking-[-.7px]">
            {greeting()}
            <span className="txt-acc">.</span>
          </div>
          <div className="txt-sub mt-0.5 text-sm">¿De qué hablamos hoy?</div>
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

      {/* Bloque principal: cambia según el tema, como en el diseño */}
      <div className="mt-4">
        {settings.theme === 'ember' && (
          <div className="glass flex items-center gap-1.5 rounded-full py-1 pr-2 pl-0.5">
            {mascot(64)}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">
                Hoy {minsLabel}/{goal} min
              </div>
              <div className="txt-sub truncate text-[13px]">con {teacher.name}</div>
            </div>
            <button onClick={surprise} className="btn-acc flex h-[46px] flex-none items-center gap-1.5 rounded-[23px] px-3.5 text-[14px]">
              <Icon name="spark" size={16} stroke={1.8} />
              Sorpréndeme
            </button>
          </div>
        )}
        {settings.theme === 'lumi' && (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: '1.45fr 1fr' }}>
            <button
              onClick={() => start('open')}
              className="glass flex h-[86px] items-center gap-1.5 rounded-[26px] pr-3.5 pl-1 text-left"
            >
              {mascot(70)}
              <span className="min-w-0">
                <span className="block text-base font-semibold">Charla libre</span>
                <span className="txt-sub block text-[13px]">
                  Hoy {minsLabel} de {goal} min
                </span>
              </span>
            </button>
            <button onClick={surprise} className="btn-acc flex h-[86px] flex-col items-center justify-center gap-1.5 rounded-[26px] text-[15px]">
              <Icon name="spark" size={16} stroke={1.8} />
              Sorpréndeme
            </button>
          </div>
        )}
        {(settings.theme === 'marea' || settings.theme === 'nimbo') && (
          <div className="glass flex items-center gap-2.5 rounded-[30px] py-1.5 pr-3 pl-1.5">
            {mascot(80)}
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold">{teacher.name} te espera</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-[3px]" style={{ background: 'var(--gb)' }}>
                <div className="h-full rounded-[3px] transition-[width] duration-500" style={{ width: `${pct * 100}%`, background: 'var(--acc)' }} />
              </div>
              <div className="txt-sub mt-1.5 text-xs">
                {minsLabel}/{goal} min hoy
              </div>
            </div>
            <button onClick={surprise} className="btn-acc grid h-[54px] w-[54px] flex-none place-items-center rounded-full" title="Sorpréndeme" aria-label="Sorpréndeme">
              <Icon name="spark" size={18} stroke={1.8} />
            </button>
          </div>
        )}
      </div>

      <PlanCard
        settings={settings}
        plan={plan}
        calibrated={calibrated}
        onPlanChange={onPlanChange}
        onStartLesson={(id) => (keysReady ? onStartLesson(id) : onGoSettings())}
        onOpenPlan={onOpenPlan}
      />

      {due && due.total > 0 && (
        <button onClick={onReview} className="glass mt-2 flex h-[48px] w-full items-center gap-2.5 rounded-[24px] pr-1.5 pl-2 text-left">
          <span className="field txt-acc2 grid h-8 w-8 flex-none place-items-center rounded-full">
            <Icon name="cards" size={15} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[14px]">
            <b className="font-semibold">Repaso de hoy</b>
            <span className="txt-sub"> · {due.total} {due.total === 1 ? 'frase' : 'frases'}</span>
          </span>
          <span className="btn-acc flex h-9 items-center rounded-[18px] px-3.5 text-[13px]">Repasar</span>
        </button>
      )}

      <div className="mt-3.5">
        <Segmented
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'topics', label: 'Temas', count: FAV_COUNT },
            { value: 'practices', label: 'Prácticas', count: PRACTICES.length },
          ]}
        />
      </div>

      {seg === 'topics' ? (
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
                <span className="text-center text-[12px] leading-[1.15] font-medium text-balance">{c.title}</span>
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
              <span className="text-left text-[13.5px] leading-tight font-semibold">Tema libre</span>
            </button>
            <button onClick={() => setAllOpen(true)} className="glass flex h-[52px] items-center gap-2.5 rounded-[26px] px-3">
              <span className="field txt-acc2 grid h-8 w-8 flex-none place-items-center rounded-full">
                <Icon name="cards" size={15} />
              </span>
              <span className="min-w-0 flex-1 text-left text-[13.5px] leading-tight font-semibold">Más temas</span>
              <span className="txt-sub text-xs">{TOPIC_CATEGORIES.length}</span>
            </button>
          </div>
          {favCats.some((c) => c.live) && (
            <div className="txt-sub mt-2.5 flex items-center justify-center gap-1.5 text-xs">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--dot)' }} />
              con noticias reales y recientes
            </div>
          )}
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
                  <span className="block text-[15px] font-semibold">{p.title}</span>
                  <span className="txt-sub block truncate text-[12.5px]">{p.subtitle}</span>
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
                  <span className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-[1.15] font-semibold">{p.title}</span>
                </span>
                <span className="txt-sub line-clamp-2 block text-[11.5px] leading-[1.2]">{p.subtitle}</span>
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
