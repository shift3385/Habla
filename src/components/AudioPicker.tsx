import { App as CapApp } from '@capacitor/app'
import { useCallback, useEffect, useRef, useState } from 'react'
import { applyAudioMode, audioState, AUDIO_MODES, onAudioDevicesChanged, type AudioMode, type AudioState } from '../lib/audioRoute'
import { interruptForSoundTest } from '../lib/lifecycle'
import { onMicOpened, setMicMode, trustDefaultMic } from '../lib/recorder'
import type { Settings } from '../lib/settings'
import { Icon } from '../ui/icons'
import type { ThemeVars } from '../ui/theme'
import SoundTest, { type TestMode } from './SoundTest'

// Último modo aplicado (compartido entre montajes del selector).
let lastApplied: AudioMode | 'none' | null = null
// Auriculares que ya pasaron la prueba de sonido en esta conexión (se olvida al desconectarlos).
let testedFor: string | null = null


interface Props {
  settings: Settings
  t: ThemeVars
  update: (p: Partial<Settings>) => void
}

/**
 * Selector de audio con auriculares. Al conectar unos auriculares (o al abrir la app con ellos puestos) pregunta
 * por dónde quieres escuchar al profe y por dónde hablar, y lo recuerda para esos auriculares. Al pasar la app a
 * segundo plano se devuelve el audio del teléfono a la normalidad, y al volver se reaplica.
 *
 * Prueba de sonido OBLIGATORIA (decisión del dueño, 2026-10-08, tras MOV-4): cada vez que se conectan unos
 * auriculares, en cualquier pantalla, después de elegir (o con lo ya elegido) llega la prueba de audio y sonido
 * (SoundTest) y no se sigue hasta pasarla. Lo que pasa la prueba es lo que se guarda para esos auriculares.
 * También se abre desde Ajustes → Profe y voz → Prueba de sonido (sin auriculares, prueba el teléfono).
 */
export default function AudioPicker({ settings, t, update }: Props) {
  const [state, setState] = useState<AudioState | null>(null)
  const [open, setOpen] = useState(false)
  const [test, setTest] = useState<{ mode: TestMode; n: number } | null>(null)
  const testRef = useRef(test)
  useEffect(() => {
    testRef.current = test
  }, [test])
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

  const startTest = useCallback((mode: TestMode) => {
    interruptForSoundTest() // corta lo que suene o grabe: la prueba necesita el micro y el audio
    setTest((x) => ({ mode, n: (x?.n ?? 0) + 1 }))
  }, [])

  // Auriculares conectados o desconectados: aplica lo que elegiste para ellos (o pregunta) y pasa la prueba.
  const check = useCallback(
    async (s: AudioState) => {
      console.info(`[HABLA-MIC] audio: ${s.headset ? `auriculares «${s.headsetName}»` : 'sin auriculares'} · probados: ${testedFor ?? '—'}`)
      setState(s)
      if (!s.headset) {
        testedFor = null
        setOpen(false)
        setTest(null)
        await apply('none')
        return
      }
      const pref = prefsRef.current[s.headsetName]
      if (pref) await apply(pref)
      if (testedFor === s.headsetName) return // ya pasaron la prueba en esta conexión (p. ej. vuelta del segundo plano)
      const running = testRef.current?.mode
      if (running === 'none') setTest(null) // la prueba del teléfono no tapa a los auriculares que acaban de llegar
      if (pref) {
        if (running !== pref) startTest(pref) // la misma prueba ya en marcha no se reinicia
      } else setOpen(true)
    },
    [apply, startTest],
  )

  useEffect(() => {
    audioState().then(check)
    // Android conecta los auriculares Bluetooth por etapas (audio A2DP, luego el micro HFP): se vuelve a mirar al
    // cabo de 1,5 s por si el primer aviso llegó a medias (el dueño conectó unos MI03 y no salió el selector).
    let later = 0
    const off = onAudioDevicesChanged((s) => {
      check(s)
      clearTimeout(later)
      later = window.setTimeout(() => audioState().then(check), 1500)
    })
    const show = () => audioState().then((s) => {
      setState(s)
      setError(null)
      setOpen(true)
    })
    window.addEventListener('habla:audio-picker', show)
    const sound = () =>
      audioState().then((s) => {
        setState(s)
        setOpen(false)
        startTest(s.headset ? (prefsRef.current[s.headsetName] ?? 'headset') : 'none')
      })
    window.addEventListener('habla:sound-test', sound)
    // En segundo plano no se retiene el "modo llamada" (afectaría a otras apps); al volver se reaplica.
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        applyAudioMode('none')
        lastApplied = null // al volver se reaplica
      } else audioState().then(check)
    })
    return () => {
      off()
      clearTimeout(later)
      window.removeEventListener('habla:audio-picker', show)
      window.removeEventListener('habla:sound-test', sound)
      sub.then((x) => x.remove())
    }
  }, [check, startTest])

  const choose = async (mode: AudioMode) => {
    setError(null)
    const ok = await apply(mode, true)
    if (!ok && mode === 'headset') {
      setError(
        'Android no dio permiso para usar el micrófono de los auriculares. Actívalo en Ajustes del teléfono → Apps → Habla → Permisos → Dispositivos cercanos, o elige otra opción.',
      )
      return
    }
    setOpen(false)
    startTest(mode) // lo elegido se guarda al pasar la prueba
  }

  const passed = useCallback(() => {
    const mode = test?.mode
    if (mode === 'headset') trustDefaultMic() // probado con tu voz: no se vuelve a medir al grabar
    if (state?.headset && mode && mode !== 'none') {
      testedFor = state.headsetName
      update({ audioPrefs: { ...prefsRef.current, [state.headsetName]: mode } })
    }
    setTest(null)
  }, [test, state, update])

  if (test)
    return (
      <SoundTest
        key={test.n}
        settings={settings}
        t={t}
        mode={test.mode}
        headsetName={state?.headset ? state.headsetName : ''}
        onPassed={passed}
        onUsePhoneMic={async () => {
          await apply('split', true)
          startTest('split')
        }}
        onChooseOther={
          state?.headset
            ? () => {
                setTest(null)
                setOpen(true)
              }
            : undefined
        }
      />
    )

  if (!open || !state?.headset) return null
  const current = prefs[state.headsetName]

  return (
    <div className="absolute inset-0 z-[40] flex items-end" style={{ background: 'rgba(0,0,0,.45)' }} onClick={() => {
        if (!current) return
        setOpen(false)
        if (testedFor !== state.headsetName) startTest(current) // cerrar el selector no se salta la prueba
      }}
    >
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
