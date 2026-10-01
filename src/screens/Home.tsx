import { useEffect, useState } from 'react'
import { APP_VERSION, RELEASES } from '../lib/changelog'
import { SCENARIOS } from '../lib/scenarios'
import type { Settings } from '../lib/settings'
import { loadDashboard, type Dashboard } from '../lib/stats'
import { TOPIC_CATEGORIES } from '../lib/topics'
import { Icon } from '../ui/icons'
import Orb from '../ui/Orb'
import Segmented from '../ui/Segmented'
import { TEACHERS, type ThemeVars } from '../ui/theme'

interface Props {
  settings: Settings
  t: ThemeVars
  update: (patch: Partial<Settings>) => void
  onStart: (scenarioId: string, categoryId?: string) => void
  onGoSettings: () => void
  onOpenNews: () => void
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 19 ? 'Good afternoon' : 'Good evening'
}

const PRACTICES = SCENARIOS.filter((s) => !s.hidden)

export default function Home({ settings, t, update, onStart, onGoSettings, onOpenNews }: Props) {
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [seg, setSeg] = useState<'topics' | 'practices'>('topics')
  const [hwOpen, setHwOpen] = useState(false)
  const keysReady = settings.geminiKey.trim().length > 0
  const teacher = TEACHERS[settings.teacher]
  const orbColors = t[settings.teacher]

  useEffect(() => {
    loadDashboard().then(setDash)
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
          <div className="glass flex items-center gap-3.5 rounded-full py-3 pr-3 pl-3.5">
            <SmallRing pct={pct} size={52} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">
                Hoy: {minsLabel} de {goal} min
              </div>
              <div className="txt-sub text-[13px]">hablando con {teacher.name}</div>
            </div>
            <button onClick={surprise} className="btn-acc flex h-[46px] items-center gap-1.5 rounded-[23px] px-4 text-[15px]">
              <Icon name="spark" size={16} stroke={1.8} />
              Sorpréndeme
            </button>
          </div>
        )}
        {settings.theme === 'lumi' && (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: '1.45fr 1fr' }}>
            <button
              onClick={() => start('open')}
              className="glass flex h-[86px] items-center gap-3 rounded-[26px] px-3.5 text-left"
            >
              <Orb size={52} colors={orbColors} />
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
        {settings.theme === 'aurora' && (
          <div className="glass flex items-center gap-3.5 rounded-[30px] py-3 pr-3 pl-4">
            <Orb size={62} colors={orbColors} />
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
