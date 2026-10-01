import { useEffect, useRef, useState } from 'react'
import { exportBackup, importBackup } from '../lib/backup'
import type { Profile } from '../lib/db'
import { listModels, pickDefaultModel, pickFallbackModel, type ModelInfo } from '../lib/gemini'
import ProfileForm from '../components/ProfileForm'
import { levelIdx, nextRetestAt } from '../lib/levels'
import { getProfile } from '../lib/profile'
import type { Settings } from '../lib/settings'
import { englishVoices, speak, type VoiceOption } from '../lib/tts'
import { Icon, type IconName } from '../ui/icons'
import Orb from '../ui/Orb'
import Switch from '../ui/Switch'
import { TEACHERS, THEME_INFO, THEMES, type Mode, type TeacherKey, type ThemeKey, type ThemeVars } from '../ui/theme'

type Page = 'voice' | 'look' | 'goal' | 'level' | 'gemini' | 'data'

const PAGES: Record<Page, { title: string; icon: IconName }> = {
  voice: { title: 'Profe y voz', icon: 'mic' },
  look: { title: 'Apariencia', icon: 'palette' },
  goal: { title: 'Meta diaria', icon: 'target' },
  level: { title: 'Mi perfil', icon: 'bars' },
  gemini: { title: 'Gemini', icon: 'key' },
  data: { title: 'Mis datos', icon: 'data' },
}


type Status = { kind: 'ok' | 'error' | 'info'; text: string } | null

interface Props {
  settings: Settings
  t: ThemeVars
  update: (patch: Partial<Settings>) => void
  registerBack: (h: (() => void) | null) => void
  onRetest: () => void
}

export default function SettingsScreen({ settings, t, update, registerBack, onRetest }: Props) {
  const [page, setPage] = useState<Page | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])

  useEffect(() => {
    getProfile().then(setProfile)
    if (settings.geminiKey) {
      listModels(settings.geminiKey)
        .then(setModels)
        .catch(() => {})
    }
    // Solo al abrir la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        {page === 'voice' && <VoicePage settings={settings} t={t} update={update} />}
        {page === 'look' && <LookPage settings={settings} update={update} />}
        {page === 'goal' && <GoalPage settings={settings} update={update} />}
        {page === 'level' && profile && (
          <>
            <Card>
              <ProfileForm submitLabel="Guardar mi perfil" onSaved={(p) => setProfile(p)} />
            </Card>
            <div className="txt-sub mt-1 px-1 text-sm">Mi nivel</div>
            <LevelPage profile={profile} onRetest={onRetest} />
          </>
        )}
        {page === 'gemini' && <GeminiPage settings={settings} update={update} models={models} setModels={setModels} />}
        {page === 'data' && <DataPage onImported={() => getProfile().then(setProfile)} />}
      </div>
    )
  }

  const tiles: { page: Page; value: string }[] = [
    { page: 'voice', value: `${teacher.name} · ${settings.ttsRate.toFixed(2)}×` },
    { page: 'look', value: `${THEME_INFO[settings.theme].name} · ${settings.mode === 'dark' ? 'Oscuro' : 'Claro'}` },
    { page: 'goal', value: `${settings.dailyGoalMinutes} min al día` },
    { page: 'level', value: `${profile?.name ?? ''} · nivel ${profile?.levels.overall ?? '—'}` },
    { page: 'gemini', value: settings.geminiKey ? settings.geminiModel : 'Falta la clave' },
    { page: 'data', value: 'Exportar o importar' },
  ]

  return (
    <div className="anim-up flex flex-col gap-3">
      <div className="flex h-[54px] items-center text-[28px] font-semibold tracking-[-.6px]">Ajustes</div>
      <button onClick={() => setPage('voice')} className="glass flex items-center gap-3.5 rounded-[28px] px-4 py-3.5 text-left">
        <Orb size={52} colors={t[settings.teacher]} />
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">{teacher.name}</span>
          <span className="txt-sub block text-[13px]">
            Tu profe · nivel {profile?.levels.overall ?? '—'} · meta {settings.dailyGoalMinutes} min
          </span>
        </span>
        <span className="flex h-[34px] items-center rounded-[17px] px-3 text-[13px]" style={{ border: '1px solid var(--gb)' }}>
          Cambiar
        </span>
      </button>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((x) => (
          <button
            key={x.page}
            onClick={() => setPage(x.page)}
            className="glass flex h-[108px] flex-col justify-between rounded-[26px] p-3.5 text-left"
          >
            <span className="flex w-full justify-between">
              <span className="field txt-acc2 grid h-[38px] w-[38px] place-items-center rounded-full">
                <Icon name={x.page === 'look' ? (settings.mode === 'dark' ? 'moon' : 'sun') : PAGES[x.page].icon} size={18} stroke={1.6} />
              </span>
              <Icon name="chevR" size={16} stroke={1.8} color="var(--sub)" />
            </span>
            <span className="w-full min-w-0">
              <span className="block text-[15px] font-semibold">{PAGES[x.page].title}</span>
              <span className="txt-sub block truncate text-[12.5px]">{x.value}</span>
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={() => update({ onboarded: false })}
        className="txt-sub h-10 text-sm underline underline-offset-[3px]"
      >
        Ver la bienvenida otra vez
      </button>
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

function VoicePage({ settings, t, update }: { settings: Settings; t: ThemeVars; update: (p: Partial<Settings>) => void }) {
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
            <Orb size={64} colors={t[k]} active={settings.teacher === k && testing} />
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
    height: 92,
    borderRadius: 18,
    background: `radial-gradient(circle at 20% 15%, ${x.b1}, transparent 60%), radial-gradient(circle at 85% 80%, ${x.b2}, transparent 60%), ${x.bg}`,
    border: '1px solid var(--gb)',
    position: 'relative',
  }
}

function LookPage({ settings, update }: { settings: Settings; update: (p: Partial<Settings>) => void }) {
  return (
    <>
      <div className="txt-sub px-1 text-sm">Tema</div>
      <div className="grid grid-cols-3 gap-2.5">
        {(Object.keys(THEME_INFO) as ThemeKey[]).map((k) => (
          <button key={k} onClick={() => update({ theme: k })} className="glass relative flex flex-col gap-2 rounded-[26px] p-2 pb-3">
            <div style={swatch(k, settings.mode)}>
              <span className="absolute right-2 bottom-2 h-5 w-5 rounded-full" style={{ background: THEMES[k][settings.mode].acc }} />
            </div>
            <span className="text-[15px] font-semibold">{THEME_INFO[k].name}</span>
            <span className="txt-sub -mt-2 text-[11px] leading-tight">{THEME_INFO[k].desc}</span>
            {settings.theme === k && <Selected />}
          </button>
        ))}
      </div>
      <div className="txt-sub mt-1 px-1 text-sm">Modo</div>
      <div className="grid grid-cols-2 gap-2.5">
        {(['dark', 'light'] as Mode[]).map((m) => (
          <button key={m} onClick={() => update({ mode: m })} className="glass relative flex flex-col gap-3 rounded-[26px] p-2.5 pb-3.5">
            <div style={swatch(settings.theme, m)} />
            <span className="text-base font-semibold">{m === 'dark' ? 'Oscuro' : 'Claro'}</span>
            {settings.mode === m && <Selected />}
          </button>
        ))}
      </div>
      <div className="txt-sub text-center text-[13px]">También puedes cambiar el modo desde el icono de sol y luna en Inicio.</div>
    </>
  )
}

function GoalPage({ settings, update }: { settings: Settings; update: (p: Partial<Settings>) => void }) {
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
  const skills: [string, string][] = [
    ['Gramática', profile.levels.grammar],
    ['Lectura', profile.levels.reading],
    ['Audición', profile.levels.listening],
    ['Habla', profile.levels.speaking],
  ]
  const retestAt = nextRetestAt(profile)
  const canRetest = !retestAt || now >= retestAt
  const fmt = (ts: number) => new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'long' })
  const events = [...(profile.levelEvents ?? [])].reverse().slice(0, 6)
  return (
    <>
      <Card className="text-center">
        <div className="txt-sub text-sm">Nivel general</div>
        <div className="mt-1 text-[48px] leading-none font-semibold tracking-[-1.5px]" style={{ color: 'var(--acc)' }}>
          {profile.levels.overall}
        </div>
        <div className="txt-sub mt-2 text-[13px] leading-snug">
          {profile.calibratedAt ? `Medido en el test del ${fmt(profile.calibratedAt)}.` : 'Aún sin test.'} No se puede
          cambiar a mano: sube con la práctica y con cada re-test.
        </div>
      </Card>
      <Card>
        <div className="txt-sub text-sm">Por habilidad</div>
        <div className="mt-2.5 flex flex-col gap-2">
          {skills.map(([n, l]) => (
            <div key={n} className="flex items-center gap-3">
              <span className="w-[84px] text-sm">{n}</span>
              <div className="h-2 flex-1 overflow-hidden rounded" style={{ background: 'var(--gb)' }}>
                <div className="h-full rounded" style={{ width: `${((levelIdx(l) + 1) / 6) * 100}%`, background: 'var(--acc)' }} />
              </div>
              <span className="txt-acc2 w-7 text-right font-semibold">{l}</span>
            </div>
          ))}
        </div>
      </Card>
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
      <button onClick={onRetest} disabled={!canRetest} className="btn-acc h-[52px] rounded-full text-[15px]">
        {canRetest ? 'Hacer el re-test de nivel' : `Re-test disponible el ${fmt(retestAt!)}`}
      </button>
    </>
  )
}

function GeminiPage({
  settings,
  update,
  models,
  setModels,
}: {
  settings: Settings
  update: (p: Partial<Settings>) => void
  models: ModelInfo[]
  setModels: (m: ModelInfo[]) => void
}) {
  const [key, setKey] = useState(settings.geminiKey)
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [checking, setChecking] = useState(false)

  const save = async () => {
    const k = key.trim()
    update({ geminiKey: k })
    setChecking(true)
    setStatus({ kind: 'info', text: 'Guardada. Comprobando…' })
    try {
      const list = await listModels(k)
      setModels(list)
      // Si el modelo elegido no existe para esta clave, elijo uno bueno automáticamente.
      const model = list.some((m) => m.id === settings.geminiModel) ? settings.geminiModel : pickDefaultModel(list)
      const fallback =
        list.some((m) => m.id === settings.geminiFallbackModel) && settings.geminiFallbackModel !== model
          ? settings.geminiFallbackModel
          : pickFallbackModel(list, model)
      update({ geminiKey: k, geminiModel: model, geminiFallbackModel: fallback })
      setStatus({ kind: 'ok', text: `Clave válida ✓ · modelo ${model}` })
    } catch (e) {
      setStatus({ kind: 'error', text: (e as Error).message })
    } finally {
      setChecking(false)
    }
  }

  const modelOptions = (current: string, exclude?: string) => (
    <>
      {current && !models.some((m) => m.id === current) && <option value={current}>{current}</option>}
      {models
        .filter((m) => m.id !== exclude)
        .map((m) => (
          <option key={m.id} value={m.id}>
            {m.id}
          </option>
        ))}
    </>
  )

  return (
    <>
      <Card>
        <div className="txt-sub text-[13px] leading-snug">
          Consigue tu clave en aistudio.google.com → "Get API key". Se guarda solo en este teléfono y no se incluye en las copias de seguridad.
        </div>
        <div className="txt-sub mt-3 text-xs tracking-[1px]">GEMINI_API_KEY</div>
        <div className="relative mt-2">
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIza…"
            autoComplete="off"
            className="input pr-[52px]"
          />
          <button onClick={() => setShow((s) => !s)} className="txt-sub absolute top-1.5 right-1.5 grid h-[38px] w-[38px] place-items-center rounded-full" aria-label="Mostrar u ocultar la clave">
            <Icon name="eye" size={18} />
          </button>
        </div>
        <button onClick={save} disabled={checking} className="btn-acc mt-2.5 h-[50px] w-full rounded-[25px] text-[15px]">
          {checking ? 'Comprobando…' : 'Guardar y comprobar'}
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
        <div className="txt-sub mt-2 text-xs leading-snug">La app reintenta sola 3 veces y después prueba este modelo.</div>
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
    if (!confirm('Esto SUSTITUYE todo tu progreso actual por el del archivo. ¿Continuar?')) return
    try {
      const r = await importBackup(file)
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
