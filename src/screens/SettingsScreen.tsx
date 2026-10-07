import { useEffect, useRef, useState } from 'react'
import { applyBackup, exportBackup, readBackup } from '../lib/backup'
import type { CalibrationRecord, Profile } from '../lib/db'
import { clearExhausted, clearNetLog, exhaustedList, getNetLog, KNOWN_MODELS, listModels, mergeModels, type NetLog } from '../lib/gemini'
import { verifyGeminiKey } from '../lib/geminiKey'
import { Share } from '@capacitor/share'
import { askNotificationPermission, notificationsGranted, testReminder } from '../lib/reminders'
import { openAudioPicker } from '../lib/audioRoute'
import ProfileForm from '../components/ProfileForm'
import { ORIENTATIONS } from '../lib/orientation'
import SkillProgressCard from '../components/SkillProgressCard'
import AzureSettings from '../components/AzureSettings'
import { azureModelName, phoneticsState } from '../lib/phonetics'
import { Capacitor } from '@capacitor/core'
import { confirmIdentity, INSECURE_HINT } from '../lib/deviceAuth'
import TestSummaryView from '../components/TestSummaryView'
import { miniSummary } from '../lib/testSummary'
import { APP_VERSION } from '../lib/changelog'
import { levelAt, levelIdx, nextRetestAt, trajectoryOf } from '../lib/levels'
import { getProfile } from '../lib/profile'
import type { Settings } from '../lib/settings'
import { englishVoices, speak, type VoiceOption } from '../lib/tts'
import { Icon, type IconName } from '../ui/icons'
import Switch from '../ui/Switch'
import { TEACHERS, THEME_INFO, THEME_KEYS, THEMES, type Mode, type TeacherKey, type ThemeKey, type ThemeVars } from '../ui/theme'
import Mascot from '../ui/Mascot'

export type SettingsPage = 'voice' | 'look' | 'goal' | 'profile' | 'level' | 'gemini' | 'data' | 'diag'
type Page = SettingsPage

const PAGES: Record<Page, { title: string; icon: IconName }> = {
  voice: { title: 'Profe y voz', icon: 'mic' },
  look: { title: 'Tema y mascota', icon: 'palette' },
  goal: { title: 'Meta diaria', icon: 'target' },
  profile: { title: 'Mi perfil y datos', icon: 'pencil' },
  level: { title: 'Mi nivel', icon: 'bars' },
  gemini: { title: 'Modelos', icon: 'key' },
  data: { title: 'Mis datos', icon: 'data' },
  diag: { title: 'Diagnóstico', icon: 'chart' },
}


type Status = { kind: 'ok' | 'error' | 'info'; text: string } | null

interface Props {
  settings: Settings
  t: ThemeVars
  update: (patch: Partial<Settings>) => void
  registerBack: (h: (() => void) | null) => void
  onRetest: () => void
  onOpenAbout: () => void
  initialPage?: SettingsPage | null // p. ej. 'look' desde la tarjeta "…quieren conocerte"
}

export default function SettingsScreen({ settings, update, registerBack, onRetest, onOpenAbout, initialPage }: Props) {
  const [page, setPage] = useState<Page | null>(initialPage ?? null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    getProfile().then(setProfile)
  }, [])

  // Atrás (Android) desde una sección vuelve al panel.
  useEffect(() => {
    registerBack(page ? () => setPage(null) : null)
    return () => registerBack(null)
  }, [page, registerBack])

  const teacher = TEACHERS[settings.teacher]

  if (page) {
    return (
      <div key={page} className="anim-in flex flex-col gap-3">
        <div className="flex h-[54px] items-center gap-3">
          <button onClick={() => setPage(null)} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
            <Icon name="back" size={20} stroke={1.8} />
          </button>
          <div className="text-2xl font-semibold tracking-[-.4px]">{PAGES[page].title}</div>
        </div>
        {page === 'voice' && <VoicePage settings={settings} update={update} />}
        {page === 'look' && <LookPage settings={settings} update={update} />}
        {page === 'goal' && <GoalPage settings={settings} update={update} />}
        {page === 'profile' && profile && (
          <>
            <Card>
              <ProfileForm submitLabel="Guardar mi perfil" onSaved={(p) => setProfile(p)} />
            </Card>
            <div className="txt-sub mt-1 px-1 text-sm">Mis datos</div>
            <DataPage onImported={() => getProfile().then(setProfile)} />
            <button onClick={() => update({ onboarded: false })} className="txt-sub h-10 text-sm underline underline-offset-[3px]">
              Ver la bienvenida otra vez
            </button>
          </>
        )}
        {page === 'level' && profile && <LevelPage profile={profile} onRetest={onRetest} />}
        {page === 'gemini' && (
          <>
            <GeminiPage settings={settings} update={update} />
            <AzureSettings settings={settings} update={update} />
            <button onClick={() => setPage('diag')} className="glass flex h-[58px] items-center gap-3 rounded-[29px] px-2.5 text-left">
              <span className="field txt-acc2 grid h-[40px] w-[40px] flex-none place-items-center rounded-full">
                <Icon name="chart" size={18} stroke={1.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">Diagnóstico</span>
                <span className="txt-sub block text-[12.5px]">Velocidad de Gemini y errores recientes</span>
              </span>
              <Icon name="chevR" size={16} stroke={1.8} color="var(--sub)" />
            </button>
          </>
        )}
        {page === 'diag' && <DiagPage />}
        {page === 'data' && <DataPage onImported={() => getProfile().then(setProfile)} />}
      </div>
    )
  }

  // Cada opción muestra en grande lo que tienes elegido ahora y, en pequeño, de qué sección se trata.
  const theme = THEME_INFO[settings.theme]
  const tiles: { key: string; icon: IconName; value: string; value2?: string | null; label: string; onClick: () => void }[] = [
    { key: 'voice', icon: 'mic', value: `${teacher.name} · ${settings.ttsRate.toFixed(2)}×`, label: 'Profe y voz', onClick: () => setPage('voice') },
    {
      key: 'look',
      icon: settings.mode === 'dark' ? 'moon' : 'sun',
      value: `${theme.mascotName} · ${theme.name}`,
      label: 'Tema y mascota',
      onClick: () => setPage('look'),
    },
    { key: 'goal', icon: 'target', value: `${settings.dailyGoalMinutes} min al día`, label: 'Meta diaria', onClick: () => setPage('goal') },
    { key: 'profile', icon: 'pencil', value: profile?.name || 'Tu perfil', label: 'Mi perfil y datos', onClick: () => setPage('profile') },
    {
      key: 'gemini',
      icon: 'key',
      value: settings.geminiKey ? settings.geminiModel.replace('gemini-', 'Gemini ') : 'Falta la clave',
      value2: azureModelName(settings),
      label: `Modelos · ${phoneticsState(settings)}`,
      onClick: () => setPage('gemini'),
    },
    { key: 'about', icon: 'info', value: `Versión ${APP_VERSION}`, label: 'Acerca de Habla', onClick: onOpenAbout },
  ]
  const retestAt = profile ? nextRetestAt(profile) : null
  const days = retestAt ? Math.ceil((retestAt - Date.now()) / 86400000) : null

  return (
    <div className="anim-up flex flex-col gap-3">
      <div className="flex h-[48px] items-center text-[28px] font-semibold tracking-[-.6px]">Ajustes</div>
      {/* Resumen de tu nivel, contado por la mascota: tócalo para ver Mi nivel; con el re-test disponible, la
          etiqueta invita a revalidar el nivel y lo abre directamente. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setPage('level')}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setPage('level')}
        className="glass cursor-pointer rounded-[28px] p-3.5 text-left"
        aria-label="Ver los detalles de mi nivel"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-none">
            <Mascot element={theme.mascot} size={58} mood="happy" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="leading-none font-semibold tracking-[-1.2px]" style={{ color: 'var(--acc)' }}>
              <span className="text-[22px] tracking-[-0.4px]">Nivel </span>
              <span className="text-[38px]">{profile?.levels.overall ?? '—'}</span>
            </div>
          </div>
          {days !== null && days <= 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRetest()
              }}
              className="btn-acc max-w-[46%] flex-none rounded-[16px] px-3 py-1.5 text-center text-[12.5px] leading-tight font-semibold"
            >
              ¡Toca aquí para revalidar tu nivel!
            </button>
          ) : (
            <span className="flex-none rounded-full px-2.5 py-1 text-[11.5px]" style={{ border: '1px solid var(--gb)' }}>
              {days === null ? 'Sin test todavía' : `Nuevo test el ${new Date(retestAt!).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`}
            </span>
          )}
        </div>
        {profile && (
          <div className="mt-2.5">
            <SkillProgressCard levels={profile.levels} title="" bare />
          </div>
        )}
        {/* La mascota invita a tocar para ver el detalle. */}
        <div className="txt-acc2 mt-2.5 flex items-center justify-center gap-1 rounded-[14px] py-1.5 text-[13px] font-medium" style={{ background: 'var(--field)' }}>
          Toca aquí y te cuento los detalles de tu nivel
          <Icon name="chevR" size={13} stroke={2} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((x) => (
          <button key={x.key} onClick={x.onClick} className="glass flex min-h-[86px] flex-col justify-between gap-1.5 rounded-[24px] px-3.5 py-3 text-left">
            <span className="flex w-full items-center justify-between">
              <span className="field txt-acc2 grid h-[32px] w-[32px] place-items-center rounded-full">
                <Icon name={x.icon} size={16} stroke={1.6} />
              </span>
              <Icon name="chevR" size={15} stroke={1.8} color="var(--sub)" />
            </span>
            <span className="w-full min-w-0">
              <span className="block truncate text-[15px] leading-tight font-semibold">{x.value}</span>
              {x.value2 && <span className="block truncate text-[15px] leading-tight font-semibold">{x.value2}</span>}
              <span className="txt-sub block truncate text-[12px]">{x.label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-[28px] p-[18px] ${className}`}>{children}</div>
}

function StatusLine({ s }: { s: Status }) {
  if (!s) return null
  const color = s.kind === 'error' ? '#f87171' : s.kind === 'ok' ? 'var(--acc2)' : 'var(--sub)'
  return (
    <p className="mt-3 text-sm" style={{ color }}>
      {s.text}
    </p>
  )
}

function Selected() {
  return <span className="pointer-events-none absolute -inset-px rounded-[26px] border-2" style={{ borderColor: 'var(--acc)' }} />
}

function VoicePage({ settings, update }: { settings: Settings; update: (p: Partial<Settings>) => void }) {
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [testing, setTesting] = useState(false)
  const teacher = TEACHERS[settings.teacher]

  useEffect(() => {
    // La lista se ordena según el acento del profe, así que se recarga al cambiarlo.
    const id = setTimeout(() => englishVoices().then(setVoices), 60)
    return () => clearTimeout(id)
  }, [settings.teacher])

  const test = async () => {
    setTesting(true)
    await speak(`Hi! I'm ${teacher.name}. What would you like to talk about today?`, settings.ttsRate, settings.voiceIndex).catch(() => {})
    setTesting(false)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        {(Object.keys(TEACHERS) as TeacherKey[]).map((k) => (
          <button
            key={k}
            onClick={() => update({ teacher: k, voiceIndex: null })}
            className="glass relative flex flex-col items-center gap-2.5 rounded-[26px] px-3 pt-[18px] pb-3.5"
          >
            <Mascot
              element={THEME_INFO[settings.theme].mascot}
              mood={settings.teacher === k ? (testing ? 'speaking' : 'happy') : 'idle'}
              size={76}
              interactive={false}
            />
            <span className="text-lg font-semibold">{TEACHERS[k].name}</span>
            <span className="txt-sub -mt-2 text-center text-xs">{TEACHERS[k].desc.split('.')[0]}</span>
            {settings.teacher === k && <Selected />}
          </button>
        ))}
      </div>
      <Card>
        <div className="flex justify-between text-sm">
          <span>Velocidad</span>
          <span className="txt-sub">{settings.ttsRate.toFixed(2)}×</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={settings.ttsRate}
          onChange={(e) => update({ ttsRate: Number(e.target.value) })}
          className="mt-2 w-full"
          style={{ accentColor: 'var(--acc)' }}
        />
        <div className="relative mt-3">
          <select
            value={settings.voiceIndex ?? ''}
            onChange={(e) => update({ voiceIndex: e.target.value === '' ? null : Number(e.target.value) })}
            className="input pr-10"
          >
            <option value="">Automática ({teacher.gender === 'male' ? 'masculina' : 'femenina'} · {teacher.lang})</option>
            {voices.map((v) => (
              <option key={v.index} value={v.index}>
                {v.name} ({v.lang}{v.gender ? (v.gender === 'male' ? ' · masculina' : ' · femenina') : ''})
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-[17px] right-4">
            <Icon name="chevD" size={16} stroke={1.8} />
          </span>
        </div>
        <button onClick={() => update({ earMode: !settings.earMode })} className="mt-3.5 flex w-full items-center justify-between text-left text-[15px]">
          <span>
            Modo oído por defecto
            <span className="txt-sub block text-xs">Texto del profe oculto hasta tocarlo</span>
          </span>
          <Switch on={settings.earMode} />
        </button>
        <button onClick={test} className="field mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-3xl text-[15px] font-medium">
          <Icon name="speakerWave" size={18} />
          {testing ? `${teacher.name} hablando…` : 'Probar voz'}
        </button>
        <button onClick={openAudioPicker} className="field mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-3xl text-[15px] font-medium">
          <Icon name="headphones" size={18} />
          Audio con auriculares
        </button>
        <p className="txt-sub mt-2.5 text-xs leading-snug">
          Si la voz suena rara, elige otra voz en inglés. Si no hay ninguna, instala "Speech Services by Google" desde Play Store.
        </p>
      </Card>
    </>
  )
}

function swatch(theme: ThemeKey, mode: Mode): React.CSSProperties {
  const x = THEMES[theme][mode]
  return {
    background: `radial-gradient(circle at 15% 10%, ${x.b1}, transparent 65%), radial-gradient(circle at 90% 90%, ${x.b2}, transparent 65%), ${x.bg}`,
  }
}

/** Tema y mascota (diseño V4): se eligen juntos, como "compañero". Cada tema trae su modo por defecto. */
function LookPage({ settings, update }: { settings: Settings; update: (p: Partial<Settings>) => void }) {
  return (
    <>
      {THEME_KEYS.map((k) => {
        const info = THEME_INFO[k]
        const sel = settings.theme === k
        return (
          <button
            key={k}
            onClick={() => update({ theme: k, mode: info.defaultMode })}
            className="glass flex items-center gap-3.5 rounded-[28px] p-2 pr-4 text-left"
            style={sel ? { border: '2px solid var(--acc)' } : undefined}
          >
            <span className="grid h-[84px] w-[92px] flex-none place-items-center overflow-hidden rounded-[22px]" style={swatch(k, info.defaultMode)}>
              <Mascot element={info.mascot} mood={sel ? 'happy' : 'idle'} size={84} interactive={false} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold">{info.mascotName}</span>
              <span className="txt-sub block text-[13px]">
                Tema {info.name} · {info.kind}
              </span>
            </span>
            {sel ? (
              <span className="btn-acc grid h-[30px] w-[30px] flex-none place-items-center rounded-full">
                <Icon name="check" size={16} stroke={2.4} />
              </span>
            ) : (
              <span className="h-[30px] w-[30px] flex-none rounded-full" style={{ border: '1.5px solid var(--gb)' }} />
            )}
          </button>
        )
      })}
      <div className="txt-sub -mt-0.5 px-2.5 text-center text-[13px] leading-snug">
        Tu progreso, tu racha y la voz de tu profe no cambian. Tócala 5 veces seguidas: cada mascota guarda un secreto.
      </div>
      <Card>
        <div className="txt-sub text-sm">Modo</div>
        <div className="field mt-2 grid grid-cols-2 gap-1 rounded-[22px] p-1">
          {(['dark', 'light'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => update({ mode: m })}
              className={`h-10 rounded-[20px] text-sm ${settings.mode === m ? 'btn-acc font-semibold' : 'txt-sub font-medium'}`}
            >
              {m === 'dark' ? 'Oscuro' : 'Claro'}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <div className="txt-sub text-sm">Orientación de la pantalla</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {ORIENTATIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => update({ orientation: o.key })}
              className={`flex min-h-[64px] flex-col justify-center rounded-[18px] px-3 py-2 text-left ${settings.orientation === o.key ? 'btn-acc' : 'field'}`}
              aria-pressed={settings.orientation === o.key}
            >
              <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                <span
                  className="inline-block flex-none rounded-[3px]"
                  style={{
                    width: o.key === 'landscape' || o.key === 'reverseLandscape' ? 16 : 10,
                    height: o.key === 'landscape' || o.key === 'reverseLandscape' ? 10 : 16,
                    border: '2px solid currentColor',
                    opacity: o.key === 'auto' ? 0.6 : 1,
                  }}
                />
                {o.title}
              </span>
              <span className={`text-[11.5px] leading-snug ${settings.orientation === o.key ? 'opacity-85' : 'txt-sub'}`}>{o.desc}</span>
            </button>
          ))}
        </div>
        <div className="txt-sub mt-2 text-[12px] leading-snug">
          Útil si tu teléfono no gira solo o si una parte de la pantalla se ve mal: en horizontal, lo que quedaba en el borde izquierdo pasa arriba o abajo.
        </div>
      </Card>
      <Card>
        <div className="text-[15px] font-semibold">Globos de {THEME_INFO[settings.theme].mascotName} en el Inicio</div>
        <div className="txt-sub mt-0.5 text-[12px] leading-snug">
          Solo los globos que salen junto a tu mascota en el Inicio. Las demás ayudas (como la de las notas de pronunciación) no cambian.
        </div>
        {(
          [
            ['mascotNotices', 'Avisos', 'Tu clase a medias, la lección de hoy, tu meta, el repaso, tu racha y cuándo repetir el test'],
            ['mascotAdvice', 'Consejos de uso', 'Qué significa cada nota, dónde cambiar tus temas o tu perfil y trucos de la clase'],
          ] as const
        ).map(([key, title, desc]) => (
          <button key={key} onClick={() => update({ [key]: !settings[key] })} className="mt-3 flex w-full items-center justify-between gap-3 text-left text-[15px]">
            <span>
              {title}
              <span className="txt-sub block text-xs">{desc}</span>
            </span>
            <Switch on={settings[key]} />
          </button>
        ))}
        <div className="txt-sub mt-3 text-[12px] leading-snug">
          Salen de uno en uno: el primero a los pocos segundos de abrir el Inicio, cada globo se queda lo que tardas en leerlo (de 9 a 20 s) y entre uno y otro pasa entre 40 s y un minuto largo. Toca a tu mascota para oír el siguiente cuando quieras.
        </div>
      </Card>
    </>
  )
}

function GoalPage({ settings, update }: { settings: Settings; update: (p: Partial<Settings>) => void }) {
  const [denied, setDenied] = useState(false)
  const [probe, setProbe] = useState<'' | 'sent' | 'fail'>('')
  // Si el recordatorio está encendido pero Android ya no deja notificar, se avisa (si no, no llegaría nada).
  useEffect(() => {
    if (settings.reminderOn && Capacitor.isNativePlatform()) notificationsGranted().then((ok) => setDenied(!ok))
  }, [settings.reminderOn])
  const tryReminder = async () => {
    const ok = await testReminder(settings.theme)
    setProbe(ok ? 'sent' : 'fail')
    setDenied(!ok)
  }
  const toggleReminder = async () => {
    if (settings.reminderOn) return update({ reminderOn: false })
    const ok = await askNotificationPermission()
    setDenied(!ok)
    if (ok) update({ reminderOn: true })
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        {[3, 5, 10, 15].map((n) => {
          const sel = settings.dailyGoalMinutes === n
          return (
            <button
              key={n}
              onClick={() => update({ dailyGoalMinutes: n })}
              className={`flex h-[110px] flex-col items-center justify-center gap-0.5 rounded-[26px] ${sel ? 'btn-acc' : 'glass'}`}
            >
              <span className="text-[34px] font-semibold tracking-[-1px]">{n}</span>
              <span className={`text-[13px] ${sel ? '' : 'txt-sub'}`}>min · ≈ {n * 3} de clase</span>
            </button>
          )
        })}
      </div>
      <div className="txt-sub px-2.5 text-center text-[13px] leading-snug">
        Minutos hablando tú (no de sesión). 5 minutos de voz equivalen a unos 15 de clase.
      </div>
      <Card>
        <button onClick={toggleReminder} className="flex w-full items-center justify-between text-left text-[15px]">
          <span>
            Recordatorio diario
            <span className="txt-sub block text-xs">Un aviso con la lección del día, si aún no la hiciste</span>
          </span>
          <Switch on={settings.reminderOn} />
        </button>
        {settings.reminderOn && (
          <label className="mt-3.5 flex items-center justify-between text-[15px]">
            <span>Hora del aviso</span>
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(e) => e.target.value && update({ reminderTime: e.target.value })}
              className="input w-[120px] text-center"
            />
          </label>
        )}
        {settings.reminderOn && (
          <button onClick={tryReminder} className="txt-acc2 mt-3 w-full rounded-full py-2.5 text-[14px] font-medium" style={{ background: 'var(--field)' }}>
            Probar el aviso (llega en 5 s)
          </button>
        )}
        {probe === 'sent' && <p className="txt-sub mt-2 text-center text-xs">Bloquea o sal de la app: tu mascota te avisará en unos segundos.</p>}
        {denied && (
          <p className="mt-3 text-sm" style={{ color: '#f87171' }}>
            Android no dio permiso para notificaciones. Actívalo en Ajustes del teléfono → Apps → Habla → Notificaciones.
          </p>
        )}
      </Card>
    </>
  )
}

const SKILL_ES: Record<string, string> = {
  grammar: 'Gramática',
  reading: 'Lectura',
  listening: 'Audición',
  speaking: 'Habla',
  overall: 'General',
}

/** Solo lectura: el nivel lo fija el test y cambia con la práctica y los re-tests. */
function LevelPage({ profile, onRetest }: { profile: Profile; onRetest: () => void }) {
  const [now] = useState(() => Date.now())
  const [open, setOpen] = useState<CalibrationRecord | null>(null)
  if (open) return <TestSummaryView record={open} onBack={() => setOpen(null)} />
  const retestAt = nextRetestAt(profile)
  const canRetest = !retestAt || now >= retestAt
  const fmt = (ts: number) => new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'long' })
  // El primer test no es un "cambio": el B1 previo era solo un marcador.
  const firstTest = profile.tests?.[0]?.date
  const events = [...(profile.levelEvents ?? [])]
    .filter((e) => !(e.reason === 'test' && e.date === firstTest))
    .reverse()
    .slice(0, 6)
  const traj = trajectoryOf(profile)
  const speakingNow = levelAt(levelIdx(profile.levels.speaking))
  return (
    <>
      <Card className="text-center">
        <div className="txt-sub text-sm">Nivel general</div>
        <div className="mt-1 text-[48px] leading-none font-semibold tracking-[-1.5px]" style={{ color: 'var(--acc)' }}>
          {profile.levels.overall}
        </div>
        <div className="txt-sub mt-2 text-[13px] leading-snug">
          {profile.calibratedAt ? `Medido en el test del ${fmt(profile.calibratedAt)}.` : 'Aún sin test.'} No se puede
          cambiar a mano: tus clases proponen tu progreso y el re-test de cada 4 semanas lo ajusta (70 % test + 30 % clases).
        </div>
      </Card>
      <SkillProgressCard levels={profile.levels} />
      {profile.calibratedAt && (
        <Card>
          <div className="txt-sub text-sm">Lo que proponen tus clases</div>
          <div className="mt-1.5 flex items-center justify-between text-sm">
            <span>Habla</span>
            <b className="txt-acc2">{traj.speaking === speakingNow ? `se mantiene en ${speakingNow}` : `${speakingNow} → ${traj.speaking}`}</b>
          </div>
          <div className="txt-sub mt-1 text-[12.5px] leading-snug">
            {profile.trajectory?.sessions
              ? `Según tus últimas ${profile.trajectory.sessions} clases habladas. `
              : 'Tras 5 clases habladas verás aquí lo que proponen. '}
            No cambia tu nivel ahora: cuenta un 30 % en el próximo re-test.
          </div>
        </Card>
      )}
      {events.length > 0 && (
        <Card>
          <div className="txt-sub mb-2 text-sm">Cambios de nivel</div>
          {events.map((e, i) => (
            <div key={i} className="flex justify-between py-1 text-sm">
              <span>
                {SKILL_ES[e.skill]}: {e.from} → <b>{e.to}</b>
              </span>
              <span className="txt-sub">
                {e.reason === 'test' ? 'test' : 'práctica'} · {fmt(e.date)}
              </span>
            </div>
          ))}
        </Card>
      )}
      {(profile.tests?.length ?? 0) > 0 && (
        <Card>
          <div className="txt-sub mb-2 text-sm">Tus tests de nivel</div>
          {[...profile.tests!].reverse().map((tst, i) => (
            // Cómo fue el test (aciertos por parte); al tocarlo, el resumen completo, que también se puede guardar.
            <button
              key={i}
              onClick={() => setOpen(tst)}
              className="flex w-full items-center gap-2 py-2 text-left text-sm tabular-nums"
              style={{ borderTop: i ? '1px solid var(--gb)' : 0 }}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{fmt(tst.date)}</span>
                  <b className="txt-acc2">{tst.levels.overall}</b>
                </span>
                <span className="txt-sub block text-[12.5px] leading-snug">{miniSummary(tst)}</span>
                <span className="txt-acc2 mt-0.5 block text-[12px]">Ver el resumen completo{tst.summary ? ' y guardarlo' : ''}</span>
              </span>
              <Icon name="chevR" size={15} stroke={1.8} color="var(--sub)" />
            </button>
          ))}
        </Card>
      )}
      <button onClick={onRetest} disabled={!canRetest} className="btn-acc h-[52px] rounded-full text-[15px]">
        {canRetest ? 'Hacer el nuevo test de nivel' : `Nuevo test disponible el ${fmt(retestAt!)}`}
      </button>
    </>
  )
}

const KNOWN_IDS = new Set(KNOWN_MODELS)

function GeminiPage({ settings, update }: { settings: Settings; update: (p: Partial<Settings>) => void }) {
  // La clave guardada no se carga en el campo: solo tras confirmar con el bloqueo del teléfono (D-02).
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const saved = settings.geminiKey
  const ending = saved ? saved.slice(-4) : ''

  /** El ojo: con el campo vacío muestra la clave guardada, previa confirmación con patrón/PIN/huella. */
  const toggleShow = async () => {
    if (show) {
      setShow(false)
      if (key === saved) setKey('') // se vuelve a ocultar del todo
      return
    }
    if (!key && saved) {
      const r = await confirmIdentity('Para ver tu clave de Gemini')
      if (!r.ok) return setStatus({ kind: 'error', text: 'No se confirmó tu identidad: la clave sigue oculta.' })
      if (r.insecure && Capacitor.getPlatform() === 'android') setStatus({ kind: 'info', text: INSECURE_HINT })
      setKey(saved)
    }
    setShow(true)
  }
  const [status, setStatus] = useState<Status>(null)
  const [checking, setChecking] = useState(false)
  const [listStatus, setListStatus] = useState<Status>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [custom, setCustom] = useState('')

  // Siempre hay opciones: la última lista de Google + los modelos conocidos (+ los añadidos a mano).
  const models = mergeModels(settings.modelList)

  const refresh = async (silent = false) => {
    if (!settings.geminiKey) {
      if (!silent) setListStatus({ kind: 'error', text: 'Primero guarda tu clave de Gemini.' })
      return
    }
    setRefreshing(true)
    if (!silent) setListStatus({ kind: 'info', text: 'Pidiendo la lista a Google…' })
    try {
      const list = await listModels(settings.geminiKey)
      const ids = list.map((m) => m.id)
      // Conservo los que añadiste a mano aunque Google no los liste.
      update({ modelList: [...new Set([...ids, ...settings.modelList.filter((m) => !KNOWN_IDS.has(m) && !ids.includes(m))])] })
      if (!silent) setListStatus({ kind: 'ok', text: `Lista actualizada · ${ids.length} modelos disponibles` })
    } catch (e) {
      if (!silent) setListStatus({ kind: 'error', text: `${(e as Error).message} Puedes elegir igualmente de la lista conocida.` })
    } finally {
      setRefreshing(false)
    }
  }

  // Al entrar, actualizo la lista en segundo plano (sin mensajes si falla).
  useEffect(() => {
    refresh(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addCustom = () => {
    const id = custom.trim().replace(/^models\//, '')
    if (!/^[a-z0-9][a-z0-9.-]*$/i.test(id)) {
      setListStatus({ kind: 'error', text: 'Escribe el nombre exacto, por ejemplo gemini-3.5-flash-lite.' })
      return
    }
    update({ modelList: [...new Set([...settings.modelList, id])], geminiModel: id })
    setCustom('')
    setListStatus({ kind: 'ok', text: `Añadido y elegido como principal: ${id}` })
  }

  const save = async () => {
    // Campo vacío: se comprueba la clave guardada (sin verla ni cambiarla).
    const k = key.trim() || saved
    if (!k) return setStatus({ kind: 'error', text: 'Pega tu clave de Gemini.' })
    // Cambiar una clave que ya existe exige confirmar con el bloqueo del teléfono.
    if (saved && k !== saved) {
      const r = await confirmIdentity('Para cambiar tu clave de Gemini')
      if (!r.ok) return setStatus({ kind: 'error', text: 'No se confirmó tu identidad: la clave no se cambió.' })
    }
    // AUD-FLU-209: primero se comprueba con Google; solo si la acepta sustituye a la anterior.
    setChecking(true)
    setStatus({ kind: 'info', text: 'Comprobando con Google…' })
    try {
      const r = await verifyGeminiKey(k, settings)
      if (!r.ok) {
        const kept = saved && k !== saved ? ' No se cambió: sigues con tu clave anterior.' : ''
        return setStatus({ kind: 'error', text: `${r.error}${kept}` })
      }
      if (k !== settings.geminiKey) clearExhausted() // clave nueva: otras cuotas
      update(r.patch)
      setKey('')
      setStatus({ kind: 'ok', text: `Clave válida ✓ · modelo ${r.model}` })
    } finally {
      setChecking(false)
    }
  }

  const modelOptions = (current: string, exclude?: string) => (
    <>
      {current && !models.includes(current) && <option value={current}>{current}</option>}
      {models
        .filter((m) => m !== exclude)
        .map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
    </>
  )

  return (
    <>
      <Card>
        <div className="txt-sub text-[13px] leading-snug">
          Consigue tu clave en aistudio.google.com → "Get API key". Se guarda solo en este teléfono y no se incluye en las copias de seguridad. Para verla o cambiarla te pediremos el patrón, PIN o huella del teléfono.
        </div>
        <div className="txt-sub mt-3 text-xs tracking-[1px]">GEMINI_API_KEY</div>
        <div className="relative mt-2">
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={saved ? `Clave guardada · termina en …${ending}` : 'AIza…'}
            autoComplete="off"
            className="input pr-[52px]"
          />
          <button onClick={toggleShow} className="txt-sub absolute top-1.5 right-1.5 grid h-[38px] w-[38px] place-items-center rounded-full" aria-label="Mostrar u ocultar la clave">
            <Icon name="eye" size={18} />
          </button>
        </div>
        <button onClick={save} disabled={checking} className="btn-acc mt-2.5 h-[50px] w-full rounded-[25px] text-[15px]">
          {checking ? 'Comprobando…' : key.trim() && key.trim() !== saved ? 'Guardar y comprobar' : saved ? 'Comprobar mi clave' : 'Guardar y comprobar'}
        </button>
        <StatusLine s={status} />
      </Card>
      <Card>
        <div className="txt-sub text-sm">Modelo</div>
        <div className="relative mt-2">
          <select value={settings.geminiModel} onChange={(e) => update({ geminiModel: e.target.value })} className="input pr-10">
            {modelOptions(settings.geminiModel)}
          </select>
          <span className="pointer-events-none absolute top-[17px] right-4">
            <Icon name="chevD" size={16} stroke={1.8} />
          </span>
        </div>
        <div className="txt-sub mt-3 text-sm">Respaldo si está saturado (503)</div>
        <div className="relative mt-2">
          <select value={settings.geminiFallbackModel} onChange={(e) => update({ geminiFallbackModel: e.target.value })} className="input pr-10">
            <option value="">Ninguno</option>
            {modelOptions(settings.geminiFallbackModel, settings.geminiModel)}
          </select>
          <span className="pointer-events-none absolute top-[17px] right-4">
            <Icon name="chevD" size={16} stroke={1.8} />
          </span>
        </div>
        <div className="txt-sub mt-2 text-xs leading-snug">
          Si el principal está saturado, la app reintenta y después prueba este. Si se queda sin cuota, pasa a este al momento.
        </div>
        <div className="txt-sub mt-3 text-sm">Modelo rápido (ideas, tema, informe, palabras)</div>
        <div className="relative mt-2">
          <select value={settings.geminiFastModel} onChange={(e) => update({ geminiFastModel: e.target.value })} className="input pr-10">
            {modelOptions(settings.geminiFastModel)}
          </select>
          <span className="pointer-events-none absolute top-[17px] right-4">
            <Icon name="chevD" size={16} stroke={1.8} />
          </span>
        </div>
        <div className="txt-sub mt-2 text-xs leading-snug">Un Flash-Lite responde en 1–2 s. Si falla, se usa el principal.</div>
        <button onClick={() => refresh()} disabled={refreshing} className="glass mt-3 h-[44px] w-full rounded-[22px] text-sm font-medium">
          {refreshing ? 'Actualizando…' : 'Actualizar lista de modelos'}
        </button>
        <div className="txt-sub mt-3 text-sm">Otro modelo</div>
        <div className="mt-2 flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="gemini-…"
            autoComplete="off"
            autoCapitalize="none"
            className="input min-w-0 flex-1"
          />
          <button onClick={addCustom} disabled={!custom.trim()} className="btn-acc h-[50px] flex-none rounded-[25px] px-5 text-sm">
            Usar
          </button>
        </div>
        <StatusLine s={listStatus} />
      </Card>
    </>
  )
}

function DataPage({ onImported }: { onImported: () => void }) {
  const [status, setStatus] = useState<Status>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const doExport = async () => {
    setStatus({ kind: 'info', text: 'Preparando copia…' })
    try {
      const r = await exportBackup()
      setStatus({ kind: 'ok', text: r.savedPath ? `Copia guardada en ${r.savedPath} ✓` : 'Copia exportada ✓' })
    } catch (e) {
      setStatus({ kind: 'error', text: `No se pudo exportar: ${(e as Error).message}` })
    }
  }

  const doImport = async (file: File | undefined) => {
    if (!file) return
    try {
      // AUD-SEG-501: primero se comprueba la copia entera; si está mal, se dice por qué y no se toca nada.
      const ready = await readBackup(file)
      const { sessions, mistakes } = ready.summary
      if (!confirm(`La copia tiene ${sessions} sesiones y ${mistakes} errores. Esto SUSTITUYE todo tu progreso actual por el del archivo. ¿Continuar?`)) return
      const r = await applyBackup(ready)
      setStatus({ kind: 'ok', text: `Importado: ${r.sessions} sesiones y ${r.mistakes} errores ✓` })
      onImported()
    } catch (e) {
      setStatus({ kind: 'error', text: (e as Error).message })
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <Card>
      <div className="txt-sub text-sm leading-snug">
        Exporta tu progreso a un archivo JSON antes de reinstalar o cambiar de teléfono, e impórtalo después.
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <button onClick={doExport} className="field flex h-[50px] items-center justify-center gap-2 rounded-[25px] text-[15px] font-medium">
          <Icon name="upload" size={17} />
          Exportar
        </button>
        <button onClick={() => fileInput.current?.click()} className="field flex h-[50px] items-center justify-center gap-2 rounded-[25px] text-[15px] font-medium">
          <Icon name="download" size={17} />
          Importar
        </button>
      </div>
      <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => doImport(e.target.files?.[0])} />
      <StatusLine s={status} />
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Diagnóstico: últimas llamadas a Gemini (tiempos y errores) y modelos sin cuota.

const TASKS: [string, string][] = [
  ['Your name is', 'Clase'],
  ['You help English learners', '¿Qué digo?'],
  ['You pick conversation topics', 'Tema'],
  ['You are an expert, encouraging', 'Informe'],
  ['You are an expert CEFR examiner', 'Test'],
  ['You are an expert bilingual', 'Palabra'],
  ['You are a precise, encouraging', 'Repaso'],
]

function taskLabel(what: string) {
  return TASKS.find(([p]) => what.startsWith(p))?.[1] ?? what.slice(0, 18)
}

function statusLabel(e: NetLog) {
  if (e.status === 200) return 'OK'
  if (e.status === 429) return 'Sin cuota'
  if (e.status === 503) return 'Saturado'
  if (e.status === 0) return 'Sin conexión'
  return `Error ${e.status}`
}

function DiagPage() {
  const [log, setLog] = useState<NetLog[]>(() => getNetLog().reverse())
  const [quota, setQuota] = useState(() => exhaustedList())
  const ok = log.filter((e) => e.status === 200)
  const avg = ok.length ? Math.round(ok.reduce((a, e) => a + e.ms, 0) / ok.length / 100) / 10 : null
  const fails = log.length - ok.length
  const time = (ms: number) => new Date(ms).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  const share = () => {
    const lines = [...log]
      .reverse()
      .map(
        (e) =>
          `${new Date(e.at).toLocaleString('es')} · ${taskLabel(e.what)} · ${e.model} · ${statusLabel(e)} · ${(e.ms / 1000).toFixed(1)} s · ${e.kb} KB${e.error ? ` · ${e.error}` : ''}`,
      )
    Share.share({ title: 'Diagnóstico de Habla', text: `Habla ${APP_VERSION} · diagnóstico\n${lines.join('\n')}` }).catch(() => {})
  }

  return (
    <>
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-semibold">{avg ?? '—'}</div>
            <div className="txt-sub text-xs">s por respuesta</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{ok.length}</div>
            <div className="txt-sub text-xs">correctas</div>
          </div>
          <div>
            <div className="text-2xl font-semibold" style={{ color: fails ? '#f87171' : undefined }}>
              {fails}
            </div>
            <div className="txt-sub text-xs">fallidas</div>
          </div>
        </div>
        {quota.length > 0 && (
          <div className="mt-3 text-sm">
            <div className="txt-sub">Sin cuota ahora mismo (la app los salta):</div>
            {quota.map((q) => (
              <div key={q.key} className="mt-1">
                {q.key === 'search' ? 'Búsqueda de noticias' : q.key} · hasta las {time(q.until)}
              </div>
            ))}
            <button
              onClick={() => {
                clearExhausted()
                setQuota([])
              }}
              className="glass mt-2 h-10 w-full rounded-[20px] text-sm"
            >
              Volver a probarlos ya
            </button>
          </div>
        )}
      </Card>
      <Card>
        <div className="txt-sub mb-2 text-sm">Últimas llamadas a Gemini</div>
        {log.length === 0 && <div className="txt-sub text-sm">Aún no hay llamadas registradas.</div>}
        {log.slice(0, 40).map((e, i) => (
          <div
            key={i}
            className="flex items-center gap-2 border-b py-1.5 text-[12.5px] tabular-nums last:border-b-0"
            style={{ borderColor: 'var(--gb)' }}
          >
            <span className="txt-sub w-10 flex-none">{time(e.at)}</span>
            <span className="w-[72px] flex-none truncate">{taskLabel(e.what)}</span>
            <span className="txt-sub min-w-0 flex-1 truncate">{e.model.replace('gemini-', '')}</span>
            <span className="w-[68px] flex-none text-right" style={{ color: e.status === 200 ? 'var(--acc2)' : '#f87171' }}>
              {statusLabel(e)}
            </span>
            <span className="w-11 flex-none text-right">{(e.ms / 1000).toFixed(1)} s</span>
          </div>
        ))}
      </Card>
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={share} disabled={!log.length} className="btn-acc h-[50px] rounded-[25px] text-sm">
          Compartir
        </button>
        <button
          onClick={() => {
            clearNetLog()
            setLog([])
          }}
          className="glass h-[50px] rounded-[25px] text-sm"
        >
          Borrar registro
        </button>
      </div>
    </>
  )
}
