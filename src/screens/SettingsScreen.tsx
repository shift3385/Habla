import { useEffect, useRef, useState } from 'react'
import { exportBackup, importBackup } from '../lib/backup'
import type { Profile } from '../lib/db'
import { listModels, pickDefaultModel, type ModelInfo } from '../lib/gemini'
import { getProfile } from '../lib/profile'
import { saveSettings, type Settings } from '../lib/settings'
import { englishVoices, speak, type VoiceOption } from '../lib/tts'

interface Props {
  settings: Settings
  onSettingsChange: (s: Settings) => void
}

type Status = { kind: 'ok' | 'error' | 'info'; text: string } | null

export default function SettingsScreen({ settings, onSettingsChange }: Props) {
  const [geminiKey, setGeminiKey] = useState(settings.geminiKey)
  const [showKey, setShowKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<Status>(null)
  const [checking, setChecking] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [backupStatus, setBackupStatus] = useState<Status>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    englishVoices().then(setVoices)
    getProfile().then(setProfile)
    if (settings.geminiKey) {
      listModels(settings.geminiKey)
        .then(setModels)
        .catch(() => {})
    }
    // Solo al abrir la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (patch: Partial<Settings>) => {
    const s = { ...settings, ...patch }
    onSettingsChange(s)
    saveSettings(s)
  }

  const saveKey = async () => {
    const key = geminiKey.trim()
    update({ geminiKey: key })
    setChecking(true)
    setKeyStatus({ kind: 'info', text: 'Guardada. Comprobando…' })
    try {
      const list = await listModels(key)
      setModels(list)
      // Si el modelo elegido no existe para esta clave, elijo uno bueno automáticamente.
      const model = list.some((m) => m.id === settings.geminiModel) ? settings.geminiModel : pickDefaultModel(list)
      update({ geminiKey: key, geminiModel: model })
      setKeyStatus({ kind: 'ok', text: `✅ La clave funciona. Modelo: ${model}. ¡A hablar!` })
    } catch (e) {
      setKeyStatus({ kind: 'error', text: (e as Error).message })
    } finally {
      setChecking(false)
    }
  }

  const doExport = async () => {
    setBackupStatus({ kind: 'info', text: 'Preparando copia…' })
    try {
      const r = await exportBackup()
      setBackupStatus({
        kind: 'ok',
        text: r.savedPath ? `✅ Copia guardada en ${r.savedPath}` : '✅ Copia exportada.',
      })
    } catch (e) {
      setBackupStatus({ kind: 'error', text: `No se pudo exportar: ${(e as Error).message}` })
    }
  }

  const doImport = async (file: File | undefined) => {
    if (!file) return
    if (!confirm('Esto SUSTITUYE todo tu progreso actual por el del archivo. ¿Continuar?')) return
    try {
      const r = await importBackup(file)
      setBackupStatus({
        kind: 'ok',
        text: `✅ Importado: ${r.sessions} sesiones y ${r.mistakes} errores.`,
      })
      getProfile().then(setProfile)
    } catch (e) {
      setBackupStatus({ kind: 'error', text: (e as Error).message })
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-5">
      <h1 className="mb-4 text-2xl font-bold">Ajustes</h1>

      <Section title="🔑 Gemini">
        <p className="mb-3 text-xs text-slate-400">
          Consigue tu clave en aistudio.google.com → "Get API key". Se guarda solo en este teléfono y no se incluye en
          las copias de seguridad.
        </p>
        <Field label="GEMINI_API_KEY">
          <input
            type={showKey ? 'text' : 'password'}
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza…"
            autoComplete="off"
            className="input"
          />
        </Field>
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={showKey} onChange={(e) => setShowKey(e.target.checked)} />
          Mostrar clave
        </label>
        <button onClick={saveKey} disabled={checking} className="btn-primary">
          {checking ? 'Comprobando…' : 'Guardar y comprobar'}
        </button>
        <StatusLine s={keyStatus} />

        <Field label="Modelo">
          <select
            value={settings.geminiModel}
            onChange={(e) => update({ geminiModel: e.target.value })}
            className="input mt-3"
          >
            {!models.some((m) => m.id === settings.geminiModel) && (
              <option value={settings.geminiModel}>{settings.geminiModel}</option>
            )}
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-slate-400">
          Recomendado: el Flash más reciente. Los "lite" responden más rápido pero corrigen peor.
        </p>
      </Section>

      <Section title="🗣️ Voz del profe">
        <Field label={`Velocidad: ${settings.ttsRate.toFixed(2)}×`}>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={settings.ttsRate}
            onChange={(e) => update({ ttsRate: Number(e.target.value) })}
            className="w-full accent-orange-500"
          />
        </Field>
        <Field label="Voz">
          <select
            value={settings.voiceIndex ?? ''}
            onChange={(e) => update({ voiceIndex: e.target.value === '' ? null : Number(e.target.value) })}
            className="input"
          >
            <option value="">Por defecto (en-US)</option>
            {voices.map((v) => (
              <option key={v.index} value={v.index}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </Field>
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={settings.earMode} onChange={(e) => update({ earMode: e.target.checked })} />
          Modo oído por defecto (texto del profe oculto)
        </label>
        <button
          onClick={() =>
            speak("Hi! I'm your English coach. Tell me, what did you do yesterday?", settings.ttsRate, settings.voiceIndex)
          }
          className="btn-secondary"
        >
          🔊 Probar voz
        </button>
      </Section>

      <Section title="💾 Mis datos">
        <p className="mb-3 text-xs text-slate-400">
          Exporta tu progreso a un archivo JSON antes de reinstalar o cambiar de teléfono, e impórtalo después.
        </p>
        <div className="flex gap-2">
          <button onClick={doExport} className="btn-secondary flex-1">
            ⬆️ Exportar
          </button>
          <button onClick={() => fileInput.current?.click()} className="btn-secondary flex-1">
            ⬇️ Importar
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => doImport(e.target.files?.[0])}
        />
        <StatusLine s={backupStatus} />
      </Section>

      {profile && (
        <Section title="👤 Mi nivel">
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {(
              [
                ['General', profile.levels.overall],
                ['Gramática', profile.levels.grammar],
                ['Lectura', profile.levels.reading],
                ['Audición', profile.levels.listening],
                ['Habla', profile.levels.speaking],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-white/5 py-2">
                <div className="text-lg font-bold text-orange-300">{v}</div>
                <div className="text-slate-400">{k}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-2xl bg-slate-900 p-4 ring-1 ring-white/5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function StatusLine({ s }: { s: Status }) {
  if (!s) return null
  const color = s.kind === 'ok' ? 'text-emerald-300' : s.kind === 'error' ? 'text-red-300' : 'text-slate-300'
  return <p className={`mt-3 text-sm ${color}`}>{s.text}</p>
}
