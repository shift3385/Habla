import { App as CapApp } from '@capacitor/app'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  audioState,
  AUDIO_MODES,
  bluetoothGranted,
  isForeground,
  ensureHeadsetRoute,
  onAudioDevicesChanged,
  releaseAfterMic,
  setHeadsetWanted,
  settleRoute,
  type AudioMode,
  type AudioState,
} from '../lib/audioRoute'
import { interruptForSoundTest } from '../lib/lifecycle'
import { onMicClosed, onMicDistrusted, onMicOpened, setHeadsetName, setMicMode, trustDefaultMic } from '../lib/recorder'
import { loadChecked, markChecked, needsCheck } from '../lib/soundCheck'
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
  /**
   * REG-M-03: ¿se puede preguntar ya (selector o prueba de sonido)? No antes de terminar la bienvenida y el tutorial con
   * la clave de Gemini guardada, ni en mitad del test de nivel (App.tsx). Mientras tanto solo se aplica lo ya elegido.
   */
  ready?: boolean
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
 *
 * 5.10.1 (REG-M-03): la prueba ya no sale en cada conexión ni en cada arranque: solo con auriculares nuevos, si cambió el
 * modo elegido o si la última falló (o el micro salió mudo en uso real). Se recuerda por nombre en Preferences
 * (soundCheck.ts). Y nunca antes de la bienvenida y la clave, ni cortando el test de nivel (`ready`).
 */
export default function AudioPicker({ settings, t, update, ready = true }: Props) {
  const readyRef = useRef(ready)
  useEffect(() => {
    readyRef.current = ready
  }, [ready])
  const [state, setState] = useState<AudioState | null>(null)
  const [open, setOpen] = useState(false)
  const [test, setTest] = useState<{ mode: TestMode; n: number } | null>(null)
  const testRef = useRef(test)
  useEffect(() => {
    // REG-M-01: la prueba de sonido fija ella misma la ruta de los auriculares; al cerrarse, la ruta solo se queda si
    // hay una pantalla que graba abierta (la clase, el repaso…). En el Inicio vuelve al teléfono.
    if (testRef.current && !test) settleRoute()
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
      onMicClosed(null)
      setMicMode('auto')
      setHeadsetWanted(false) // suelta la ruta (setRoute phone)
      return true
    }
    // 5.10.1 (REG-M-01): elegir «Todo por los auriculares» ya no fija la ruta en toda la app (antes quedaba en «modo
    // llamada» también en el Inicio). Aquí solo se pide el permiso de Bluetooth; la ruta la retienen las pantallas que
    // graban, solo cuando te toca hablar (audioRoute: al acabar la voz del profe), y se suelta al salir o al minimizar.
    const ok = mode === 'headset' ? await bluetoothGranted().catch(() => false) : true
    setMicMode(ok ? mode : 'split')
    setHeadsetWanted(ok && mode === 'headset')
    // Al abrir el micro solo se comprueba la ruta (preparada al acabar el profe) y se aplica si falta; al soltarlo
    // (enviar o descartar) se suelta, para que el profe responda con calidad normal (decisión del dueño, ronda 2).
    onMicOpened(ok && mode === 'headset' ? async () => void (await ensureHeadsetRoute()) : null)
    onMicClosed(ok && mode === 'headset' ? releaseAfterMic : null)
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
      setHeadsetName(s.headset ? s.headsetName : '') // REG-M-01: el Recorder recuerda qué auriculares ya dieron señal
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
      // REG-M-03: aún no se pregunta nada (bienvenida, tutorial sin clave o test de nivel): al estar listo se vuelve a mirar.
      // REV-D1-02 (privacidad): con la app oculta tampoco (auriculares conectados con Habla minimizada); al volver a primer
      // plano, appStateChange vuelve a llamar a check().
      if (!readyRef.current || !isForeground()) return
      // REG-M-03: probados antes con este mismo modo y sin fallos: no se repite la prueba.
      if (pref && !needsCheck((await loadChecked())[s.headsetName], pref)) {
        testedFor = s.headsetName
        if (pref === 'headset') trustDefaultMic()
        console.info(`[HABLA-MIC] auriculares «${s.headsetName}» ya probados en modo ${pref}: sin prueba de sonido`)
        return
      }
      const running = testRef.current?.mode
      if (running === 'none') setTest(null) // la prueba del teléfono no tapa a los auriculares que acaban de llegar
      if (pref) {
        if (running !== pref) startTest(pref) // la misma prueba ya en marcha no se reinicia
      } else setOpen(true)
    },
    [apply, startTest],
  )

  // REG-M-03: al quedar lista la app (fin de la bienvenida y la clave, fin del test de nivel) se mira si toca preguntar.
  useEffect(() => {
    if (ready) audioState().then(check)
  }, [ready, check])

  // REG-M-03: un micro mudo con estos auriculares en uso real (grabación vacía) apunta el fallo: la próxima vez se prueba.
  useEffect(() => {
    onMicDistrusted((name) => {
      if (!name) return
      const mode = prefsRef.current[name]
      if (mode) markChecked(name, mode, false).catch(() => {})
      if (testedFor === name) testedFor = null
    })
    return () => onMicDistrusted(null)
  }, [])

  useEffect(() => {
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
        // La ruta la suelta lifecycle (suspendRoute) y, en nativo, el plugin en onStop. Al volver se reaplica lo elegido.
        lastApplied = null
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
      markChecked(state.headsetName, mode, true).catch(() => {}) // REG-M-03: no se repite en cada arranque
    }
    setTest(null)
  }, [test, state, update])

  // REG-M-03: no se oyó voz: se apunta el fallo para esos auriculares (la próxima conexión vuelve a probar).
  const failed = useCallback(() => {
    const mode = test?.mode
    if (state?.headset && mode && mode !== 'none') markChecked(state.headsetName, mode, false).catch(() => {})
  }, [test, state])

  if (test)
    return (
      <SoundTest
        key={test.n}
        settings={settings}
        t={t}
        mode={test.mode}
        headsetName={state?.headset ? state.headsetName : ''}
        onPassed={passed}
        onFailed={failed}
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
        // 5.10.1 (REG-M-05): con letra grande en horizontal (360 px de alto) la hoja no cabe: se desplaza en vez de cortar el título.
        className="anim-up max-h-full w-full overflow-y-auto rounded-t-[30px] px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+22px)]"
        style={{ background: 'var(--bg)', borderTop: '1px solid var(--gb)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="btn-acc grid h-11 w-11 flex-none place-items-center rounded-full">
            <Icon name="headphones" size={20} />
          </span>
          <div className="min-w-0">
            <div className="text-lg font-semibold">Auriculares conectados</div>
            <div className="fs-clamp txt-sub truncate fs-13">{state.headsetName || 'Auriculares'}</div>
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
                <span className="block fs-15 font-semibold">{m.title}</span>
                <span className="txt-sub block fs-12.5">{m.desc}</span>
              </span>
              {current === m.key && <Icon name="check" size={18} stroke={2.2} color="var(--acc)" />}
            </button>
          ))}
        </div>
        {error && (
          <p className="mt-3 text-sm" style={{ color: 'var(--bad)' }}>
            {error}
          </p>
        )}
        <div className="txt-sub mt-3 text-center text-xs">Se recuerda para estos auriculares. Puedes cambiarlo en Ajustes → Profe y voz.</div>
      </div>
    </div>
  )
}
