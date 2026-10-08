import { App as CapApp } from '@capacitor/app'
import { useCallback, useEffect, useRef, useState } from 'react'
import { applyAudioMode, audioState, AUDIO_MODES, forgetHeadsetCheck, onAudioDevicesChanged, type AudioMode, type AudioState } from '../lib/audioRoute'
import { onMicOpened, setMicMode } from '../lib/recorder'
import type { Settings } from '../lib/settings'
import { Icon } from '../ui/icons'

// Último modo aplicado (compartido entre montajes del selector).
let lastApplied: AudioMode | 'none' | null = null


interface Props {
  settings: Settings
  update: (p: Partial<Settings>) => void
}

/**
 * Selector de audio con auriculares. Al conectar unos auriculares (o al abrir la app con ellos puestos) pregunta
 * por dónde quieres escuchar al profe y por dónde hablar, y lo recuerda para esos auriculares. Al pasar la app a
 * segundo plano se devuelve el audio del teléfono a la normalidad, y al volver se reaplica.
 */
export default function AudioPicker({ settings, update }: Props) {
  const [state, setState] = useState<AudioState | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prefs = settings.audioPrefs
  const prefsRef = useRef(prefs)
  useEffect(() => {
    prefsRef.current = prefs
  }, [prefs])

  const apply = useCallback(async (mode: AudioMode | 'none', force = false) => {
    // El selector se monta de nuevo al cambiar de pantalla: no se reaplica lo mismo cada vez.
    if (!force && mode === lastApplied) return true
    lastApplied = mode
    forgetHeadsetCheck() // otros auriculares, o vuelta del segundo plano: se comprueba otra vez en la próxima clase
    if (mode === 'none') {
      onMicOpened(null)
      setMicMode('auto')
      await applyAudioMode('none')
      return true
    }
    const ok = await applyAudioMode(mode === 'headset' ? 'headset' : 'none')
    setMicMode(ok ? mode : 'split')
    // Cada vez que se abre el micro, se vuelven a fijar los auriculares (el WebView elige el suyo al abrirlo).
    onMicOpened(ok && mode === 'headset' ? async () => void (await applyAudioMode('headset')) : null)
    return ok
  }, [])

  // Auriculares conectados o desconectados: aplica lo que elegiste para ellos o pregunta.
  const check = useCallback(
    async (s: AudioState) => {
      setState(s)
      if (!s.headset) {
        setOpen(false)
        await apply('none')
        return
      }
      const pref = prefsRef.current[s.headsetName]
      if (pref) await apply(pref)
      else setOpen(true)
    },
    [apply],
  )

  useEffect(() => {
    audioState().then(check)
    const off = onAudioDevicesChanged(check)
    const show = () => audioState().then((s) => {
      setState(s)
      setError(null)
      setOpen(true)
    })
    window.addEventListener('habla:audio-picker', show)
    // En segundo plano no se retiene el "modo llamada" (afectaría a otras apps); al volver se reaplica.
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        applyAudioMode('none')
        lastApplied = null // al volver se reaplica
      } else audioState().then(check)
    })
    return () => {
      off()
      window.removeEventListener('habla:audio-picker', show)
      sub.then((x) => x.remove())
    }
  }, [check])

  const choose = async (mode: AudioMode) => {
    setError(null)
    const ok = await apply(mode, true)
    if (!ok && mode === 'headset') {
      setError(
        'Android no dio permiso para usar el micrófono de los auriculares. Actívalo en Ajustes del teléfono → Apps → Habla → Permisos → Dispositivos cercanos, o elige otra opción.',
      )
      return
    }
    if (state?.headsetName) update({ audioPrefs: { ...prefs, [state.headsetName]: mode } })
    setOpen(false)
  }

  if (!open || !state?.headset) return null
  const current = prefs[state.headsetName]

  return (
    <div className="absolute inset-0 z-[40] flex items-end" style={{ background: 'rgba(0,0,0,.45)' }} onClick={() => current && setOpen(false)}>
      <div
        className="anim-up w-full rounded-t-[30px] px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+22px)]"
        style={{ background: 'var(--bg)', borderTop: '1px solid var(--gb)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="btn-acc grid h-11 w-11 flex-none place-items-center rounded-full">
            <Icon name="headphones" size={20} />
          </span>
          <div className="min-w-0">
            <div className="text-lg font-semibold">Auriculares conectados</div>
            <div className="txt-sub truncate text-[13px]">{state.headsetName || 'Auriculares'}</div>
          </div>
        </div>
        <div className="txt-sub mt-3 text-sm">¿Por dónde quieres escuchar al profe y hablar?</div>
        <div className="mt-3 flex flex-col gap-2">
          {AUDIO_MODES.filter((m) => m.key !== 'headset' || state.headsetMic).map((m) => (
            <button
              key={m.key}
              onClick={() => choose(m.key)}
              className="glass flex items-center gap-3 rounded-[22px] px-4 py-3 text-left"
              style={current === m.key ? { border: '2px solid var(--acc)' } : undefined}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{m.title}</span>
                <span className="txt-sub block text-[12.5px]">{m.desc}</span>
              </span>
              {current === m.key && <Icon name="check" size={18} stroke={2.2} color="var(--acc)" />}
            </button>
          ))}
        </div>
        {error && (
          <p className="mt-3 text-sm" style={{ color: '#f87171' }}>
            {error}
          </p>
        )}
        <div className="txt-sub mt-3 text-center text-xs">Se recuerda para estos auriculares. Puedes cambiarlo en Ajustes → Profe y voz.</div>
      </div>
    </div>
  )
}
