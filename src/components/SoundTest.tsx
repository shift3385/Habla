import { useCallback, useEffect, useRef, useState } from 'react'
import { applyAudioMode, type AudioMode } from '../lib/audioRoute'
import type { Settings } from '../lib/settings'
import { speak, stopSpeaking } from '../lib/tts'
import { Icon } from '../ui/icons'
import { THEME_INFO, teacherName, type ThemeVars } from '../ui/theme'
import MascotPage from './MascotPage'
import { VoiceMeter } from './TalkButton'

/**
 * Prueba de audio y sonido (decisión del dueño, 2026-10-08, tras MOV-4): la única forma fiable de saber si oyes al
 * profe y si te oye a ti es preguntártelo, como Zoom o Meet. Dos pasos:
 *   1. «¿Me oyes?»: la mascota dice una frase por el audio elegido y tú confirmas.
 *   2. «Ahora habla tú»: se abre el micro de ese audio y las barras siguen tu voz; se pasa sola al oírte ~0,5 s.
 * Si el micro de los auriculares no te oye, ofrece hablar al micro del teléfono (sigues oyendo por los auriculares).
 * El micro solo está abierto en el paso 2 y se cierra al salir de él (AUD-MIC-305).
 */

/** Modo que se prueba: el de los auriculares elegido, o 'none' (sin auriculares: altavoz y micro del teléfono). */
export type TestMode = AudioMode | 'none'

interface Props {
  settings: Settings
  t: ThemeVars
  mode: TestMode
  headsetName: string
  onPassed: () => void
  /** El micro de los auriculares no te oye: probar «escucho por los auriculares, hablo al teléfono». */
  onUsePhoneMic: () => void
  /** Volver a elegir por dónde escuchar y hablar (solo con auriculares). */
  onChooseOther?: () => void
}

const PROCESSING = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
const RAW = { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
/** Nivel (0–1) a partir del cual cuenta como voz, y cuánto tiempo de voz hace falta para pasar. */
const VOICE_LEVEL = 0.18
const VOICE_MS = 500
const LISTEN_TIMEOUT_MS = 12_000

type Step = 'hear' | 'notHeard' | 'talk' | 'notTalk' | 'micError' | 'passed'

export default function SoundTest({ settings, t, mode, headsetName, onPassed, onUsePhoneMic, onChooseOther }: Props) {
  const [step, setStep] = useState<Step>('hear')
  const [speaking, setSpeaking] = useState(false)
  const levelRef = useRef(0)
  const name = teacherName(settings.theme)
  const mascot = THEME_INFO[settings.theme].mascot
  const where = mode === 'none' || mode === 'phone' ? 'el altavoz del teléfono' : 'tus auriculares'
  const micWhere = mode === 'headset' ? 'el micrófono de tus auriculares' : 'el micrófono del teléfono'

  const say = useCallback(async () => {
    setSpeaking(true)
    await speak(`Hi! I'm ${name}. Can you hear me?`, settings.ttsRate, settings.voiceIndex).catch(() => {})
    setSpeaking(false)
  }, [name, settings.ttsRate, settings.voiceIndex])

  // Paso 1: la frase suena al entrar (y al volver a este paso).
  useEffect(() => {
    if (step !== 'hear') return
    const id = setTimeout(say, 400) // un respiro tras cortar lo que sonaba (y tras aplicar la ruta de audio)
    return () => {
      clearTimeout(id)
      stopSpeaking().catch(() => {})
    }
  }, [step, say])

  // Paso 2: micro abierto y nivel de la voz; se pasa al oírte VOICE_MS, o se rinde a los LISTEN_TIMEOUT_MS.
  useEffect(() => {
    if (step !== 'talk') return
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    let raf = 0
    let alive = true
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: mode === 'split' ? RAW : PROCESSING })
        // El WebView elige su dispositivo al abrir el micro: en modo auriculares se vuelven a fijar (como recorder.ts).
        if (mode === 'headset') await applyAudioMode('headset')
        if (!alive) return
        ctx = new AudioContext()
        await ctx.resume()
        const an = ctx.createAnalyser()
        an.fftSize = 512
        ctx.createMediaStreamSource(stream).connect(an)
        const buf = new Uint8Array(an.fftSize)
        const t0 = performance.now()
        let last = t0
        let voice = 0
        const tick = (now: number) => {
          if (!alive) return
          an.getByteTimeDomainData(buf)
          let sum = 0
          for (const v of buf) sum += ((v - 128) / 128) ** 2
          const level = Math.min(1, Math.sqrt(sum / buf.length) * 5)
          levelRef.current = level
          if (level > VOICE_LEVEL) voice += now - last
          last = now
          if (voice >= VOICE_MS) return setStep('passed')
          if (now - t0 > LISTEN_TIMEOUT_MS) return setStep('notTalk')
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch {
        if (alive) setStep('micError')
      }
    })()
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      levelRef.current = 0
      stream?.getTracks().forEach((tr) => tr.stop())
      ctx?.close().catch(() => {})
    }
  }, [step, mode])

  // Pasada: la mascota lo celebra un momento y la app sigue donde estabas.
  useEffect(() => {
    if (step !== 'passed') return
    const id = setTimeout(onPassed, 1400)
    return () => clearTimeout(id)
  }, [step, onPassed])

  const other = onChooseOther ? { label: 'Elegir otra opción de audio', onClick: onChooseOther } : undefined
  const header = headsetName ? `Prueba de sonido · ${headsetName}` : 'Prueba de sonido · teléfono'

  if (step === 'hear')
    return (
      <MascotPage
        overlay={{ t }}
        element={mascot}
        mood={speaking ? 'speaking' : 'idle'}
        step={{ i: 0, n: 2 }}
        title="¿Me oyes?"
        subtitle={`${header}. Te hablo por ${where}.`}
        primary={{ label: 'Sí, te oigo', onClick: () => setStep('talk') }}
        secondary={{ label: 'No te oigo', onClick: () => setStep('notHeard') }}
      >
        <button onClick={say} disabled={speaking} className="field mx-auto flex h-12 items-center gap-2 rounded-3xl px-5 text-[15px] font-medium">
          <Icon name="speakerWave" size={18} />
          {speaking ? `${name} hablando…` : 'Repetir'}
        </button>
      </MascotPage>
    )

  if (step === 'notHeard')
    return (
      <MascotPage
        overlay={{ t }}
        element={mascot}
        mood="thinking"
        title="No me oyes"
        subtitle={`Sube el volumen del teléfono${mode === 'none' ? '' : ' y comprueba que los auriculares estén puestos y encendidos'}, y probamos otra vez.`}
        primary={{ label: 'Probar otra vez', onClick: () => setStep('hear') }}
        secondary={other}
      />
    )

  if (step === 'talk')
    return (
      <MascotPage
        overlay={{ t }}
        element={mascot}
        mood="listening"
        step={{ i: 1, n: 2 }}
        title="Ahora habla tú"
        subtitle={`Di en voz alta: «Hello, ${name}!». Te escucho por ${micWhere}.`}
        secondary={{ label: 'Las barras no se mueven', onClick: () => setStep('notTalk') }}
      >
        <div className="flex justify-center pt-2">
          <div style={{ transform: 'scale(1.8)' }}>
            <VoiceMeter level={() => levelRef.current} />
          </div>
        </div>
      </MascotPage>
    )

  if (step === 'notTalk')
    return (
      <MascotPage
        overlay={{ t }}
        element={mascot}
        mood="thinking"
        title="No te oigo"
        subtitle={
          mode === 'headset'
            ? 'El micrófono de tus auriculares no me llega. Puedes hablarle al teléfono: me seguirás oyendo por los auriculares.'
            : 'Habla un poco más alto y cerca del teléfono, y probamos otra vez.'
        }
        primary={mode === 'headset' ? { label: 'Hablar al micro del teléfono', onClick: onUsePhoneMic } : { label: 'Probar otra vez', onClick: () => setStep('talk') }}
        secondary={mode === 'headset' ? { label: 'Probar otra vez', onClick: () => setStep('talk') } : other}
      />
    )

  if (step === 'micError')
    return (
      <MascotPage
        overlay={{ t }}
        element={mascot}
        mood="thinking"
        title="No puedo abrir el micrófono"
        subtitle="Revisa que Habla tenga permiso de micrófono: Ajustes del teléfono → Apps → Habla → Permisos."
        primary={{ label: 'Probar otra vez', onClick: () => setStep('talk') }}
        secondary={other}
      />
    )

  return <MascotPage overlay={{ t }} element={mascot} mood="happy" title="¡Te oigo perfecto!" subtitle="Prueba de sonido pasada. Seguimos." />
}
