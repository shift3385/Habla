import { useEffect, useState } from 'react'
import { APP_VERSION, RELEASES } from '../lib/changelog'
import { SCENARIOS } from '../lib/scenarios'
import { dueSummary, syncCards, type DueSummary } from '../lib/srs'
import PlanCard from '../components/PlanCard'
import type { StudyPlan } from '../lib/plan'
import type { Settings } from '../lib/settings'
import { loadDashboard, type Dashboard } from '../lib/stats'
import { TOPIC_CATEGORIES } from '../lib/topics'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import Segmented from '../ui/Segmented'
import { TEACHERS, THEME_INFO, THEME_KEYS, type ThemeVars } from '../ui/theme'

interface Props {
  settings: Settings
  t: ThemeVars
  update: (patch: Partial<Settings>) => void
  onStart: (scenarioId: string, categoryId?: string) => void
  onGoSettings: () => void
  onOpenNews: () => void
  onReview: () => void
  plan: StudyPlan | null
  calibrated: boolean
  onPlanChange: (p: StudyPlan) => void
  onStartLesson: (id: string) => void
  onOpenPlan: () => void
  retestReady: boolean
  onRetest: () => void
  onOpenThemes: () => void // Ajustes → Tema y mascota
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 19 ? 'Good afternoon' : 'Good evening'
}

const PRACTICES = SCENARIOS.filter((s) => !s.hidden)

export default function Home({
  settings,
  update,
  onStart,
  onGoSettings,
  onOpenNews,
  onReview,
  plan,
  calibrated,
  onPlanChange,
  onStartLesson,
  onOpenPlan,
  retestReady,
  onRetest,
  onOpenThemes,
}: Props) {
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [seg, setSeg] = useState<'topics' | 'practices'>('topics')
  const [hwOpen, setHwOpen] = useState(false)
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
  const start = (scenarioId: string, categoryId?: string) => (keysReady ? onStart(scenarioId, categoryId) : onGoSettings())
  const surprise = () => start('free')

  return (
    <div className="anim-up">
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

      {(dash?.streak ?? 0) >= 3 && !settings.mascotNudgeSeen && (
        <div className="glass anim-up mt-2.5 rounded-[28px] p-4">
          <div className="flex items-center gap-1">
            {THEME_KEYS.filter((k) => k !== settings.theme)
              .slice(0, 2)
              .map((k) => (
                <Mascot key={k} element={THEME_INFO[k].mascot} mood="happy" size={54} interactive={false} />
              ))}
            <div className="min-w-0 flex-1 pl-1">
              <div className="text-base leading-tight font-semibold">
                {(() => {
                  const n = THEME_KEYS.filter((k) => k !== settings.theme).map((k) => THEME_INFO[k].mascotName)
                  return `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]} quieren conocerte`
                })()}
              </div>
              <div className="txt-sub mt-1 text-[13px]">¡{dash!.streak} días seguidos! Ya puedes probar otro compañero.</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => update({ mascotNudgeSeen: true })} className="field h-11 rounded-[22px] text-sm">
              Ahora no
            </button>
            <button
              onClick={() => {
                update({ mascotNudgeSeen: true })
                onOpenThemes()
              }}
              className="btn-acc h-11 rounded-[22px] text-sm"
            >
              Conocerlos
            </button>
          </div>
        </div>
      )}

      {settings.lastSeenVersion !== APP_VERSION && (
        <div className="anim-up mt-2.5 flex items-center gap-2">
          <button onClick={onOpenNews} className="glass flex min-w-0 flex-1 items-center gap-2.5 rounded-[22px] px-3.5 py-2.5 text-left">
            <span className="btn-acc grid h-7 w-7 flex-none place-items-center rounded-full">
              <Icon name="spark" size={14} stroke={1.8} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13.5px]">
              <b className="font-semibold">Novedades de la v{APP_VERSION}</b>
              <span className="txt-sub"> · {RELEASES[0].title}</span>
            </span>
          </button>
          <button
            onClick={() => update({ lastSeenVersion: APP_VERSION })}
            className="glass grid h-10 w-10 flex-none place-items-center rounded-full"
            aria-label="Descartar novedades"
          >
            <Icon name="back" size={14} className="rotate-[-90deg]" />
          </button>
        </div>
      )}

      {retestReady && keysReady && (
        <button onClick={onRetest} className="anim-up mt-2.5 flex w-full items-center gap-3 rounded-[22px] py-2.5 pr-2.5 pl-3.5 text-left btn-acc">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-full" style={{ background: 'rgba(255,255,255,.25)' }}>
            <Icon name="target" size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-semibold">Re-test disponible</span>
            <span className="block text-[12.5px] opacity-85">Mide lo que has avanzado en estas 4 semanas · 12 min</span>
          </span>
          <Icon name="chevR" size={16} stroke={2} />
        </button>
      )}

      <PlanCard
        settings={settings}
        plan={plan}
        calibrated={calibrated}
        onPlanChange={onPlanChange}
        onStartLesson={(id) => (keysReady ? onStartLesson(id) : onGoSettings())}
        onOpenPlan={onOpenPlan}
      />

      {due && due.total > 0 && (
        <button onClick={onReview} className="glass mt-2.5 flex w-full items-center gap-3 rounded-[22px] py-2.5 pr-2.5 pl-3.5 text-left">
          <span className="field txt-acc2 grid h-9 w-9 flex-none place-items-center rounded-full">
            <Icon name="cards" size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-semibold">Repaso de hoy</span>
            <span className="txt-sub block text-[12.5px]">
              {due.total} {due.total === 1 ? 'frase' : 'frases'} para decir en inglés · 2–5 min
            </span>
          </span>
          <span className="btn-acc flex h-9 items-center rounded-[18px] px-3.5 text-[13px]">Repasar</span>
        </button>
      )}

      {dash?.lastHomework && (
        <button onClick={() => setHwOpen((o) => !o)} className="glass mt-2.5 flex w-full items-start gap-2.5 rounded-[22px] px-3.5 py-2.5 text-left">
          <span className="txt-acc2 mt-0.5 flex-none">
            <Icon name="flag" size={16} />
          </span>
          <span className={`min-w-0 flex-1 text-[13.5px] leading-snug ${hwOpen ? '' : 'truncate'}`}>
            <b className="font-semibold">Tarea: </b>
            {dash.lastHomework.text}
          </span>
        </button>
      )}

      <div className="mt-[18px]">
        <Segmented
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'topics', label: 'Temas', count: TOPIC_CATEGORIES.length },
            { value: 'practices', label: 'Prácticas', count: PRACTICES.length },
          ]}
        />
      </div>

      {seg === 'topics' ? (
        <div key="topics" className="anim-up">
          <div className="mt-3 grid grid-cols-3 gap-2">
            {TOPIC_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => start('free', c.id)}
                className="glass relative flex h-[78px] flex-col items-center justify-between rounded-[20px] px-1.5 pt-2.5 pb-2"
              >
                <span className="field txt-acc2 grid h-[34px] w-[34px] place-items-center rounded-full">
                  <Icon name={c.icon} size={18} stroke={1.6} />
                </span>
                <span className="text-center text-[11.5px] leading-[1.15] text-balance">{c.title}</span>
                {c.live && (
                  <span
                    className="absolute top-[9px] right-[9px] h-1.5 w-1.5 rounded-full"
                    style={{ background: 'var(--dot)', boxShadow: '0 0 8px var(--dot)' }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="txt-sub mt-2.5 flex items-center justify-center gap-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--dot)' }} />
            con noticias reales y recientes
          </div>
        </div>
      ) : (
        <div key="practices" className="anim-up mt-3 flex flex-col gap-2">
          {PRACTICES.map((p) => (
            <button
              key={p.id}
              onClick={() => start(p.id)}
              className="glass flex h-[62px] items-center gap-3 rounded-[31px] px-2.5 text-left"
            >
              <span className="field txt-acc2 grid h-[42px] w-[42px] flex-none place-items-center rounded-full">
                <Icon name={p.icon} size={19} stroke={1.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{p.title}</span>
                <span className="txt-sub block truncate text-[12.5px]">{p.subtitle}</span>
              </span>
              <span className="txt-sub grid w-[30px] flex-none place-items-center">
                <Icon name="arrowUR" size={17} />
              </span>
            </button>
          ))}
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
