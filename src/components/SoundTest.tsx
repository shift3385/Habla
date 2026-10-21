import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isForeground, soundTestRoute, type AudioMode } from '../lib/audioRoute'
import { releaseAudioFocus, takeAudioFocus } from '../lib/audioFocus'
import { whenBackground } from '../lib/lifecycle'
import type { Settings } from '../lib/settings'
import { listenDelayMs, pickPhrase, rmsOfBytes, VoiceDetector } from '../lib/soundCheck'
import { speakSegments, stopSpeaking } from '../lib/tts'
import { THEME_INFO, type ThemeVars } from '../ui/theme'
import MascotPage from './MascotPage'
import { VoiceMeter } from './TalkButton'

/**
 * 5.10.1 (REG-M-03) · Prueba de sonido en UN paso y sin tocar (propuesta del dueño, diseño de A5 §«Pruebas de voz»).
 * Antes eran dos pasos: «¿Me oyes?» con un botón para confirmarlo (que nadie comprobaba) y luego «Ahora habla tú».
 *   1. La mascota dice «Si me oyes, dime: blue sky» SOLO por voz (la frase no se ve): si la repites es que la oíste, así
 *      que se comprueban a la vez la salida y el micro. En modo auriculares el micro se abre ya durante la instrucción,
 *      sin analizar nada, para que el canal de voz del Bluetooth esté activo al escuchar (tarda 1–3 s en el POCO).
 *   2. Al acabar la voz, +400 ms (600 ms con Bluetooth) para que calle el altavoz, la escucha empieza SOLA: vibración,
 *      «Te escucho…» y barras. Comprobación LOCAL (soundCheck.ts): voz por encima del ruido medido, corte con 800 ms de
 *      silencio, máx. 8 s. Sin Gemini ni coste.
 *   3. Sin voz → «No te he oído» con «Hablar al micro del teléfono» (auriculares) o «Probar otra vez».
 * «No te oigo» siempre visible. Tras 2 fallos aparece «Ver la frase» (ya no valida la salida, pero deja seguir a quien
 * oye poco). Privacidad: el micro solo está abierto con la prueba a la vista y la app en primer plano; al pasar a
 * segundo plano se cancela y se cierra, y al terminar se cierra siempre. El audio no se guarda ni se envía.
 */

/** Modo que se prueba: el de los auriculares elegido, o 'none' (sin auriculares: altavoz y micro del teléfono). */
export type TestMode = AudioMode | 'none'

interface Props {
  settings: Settings
  t: ThemeVars
  mode: TestMode
  headsetName: string
  onPassed: () => void
  /** No se oyó voz (para apuntar el fallo de esos auriculares). */
  onFailed?: () => void
  /** El micro de los auriculares no te oye: probar «escucho por los auriculares, hablo al teléfono». */
  onUsePhoneMic: () => void
  /** Volver a elegir por dónde escuchar y hablar (solo con auriculares). */
  onChooseOther?: () => void
}

const PROCESSING = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
const RAW = { echoCancellation: false, noiseSuppression: false, autoGainControl: false }

type Step = 'run' | 'notHeard' | 'noVoice' | 'micError' | 'passed'
/** Dentro de 'run': hablando la mascota, esperando a que calle el altavoz, escuchando. */
type Phase = 'speaking' | 'waiting' | 'listening'

export default function SoundTest({ settings, t, mode, headsetName, onPassed, onFailed, onUsePhoneMic, onChooseOther }: Props) {
  const [step, setStep] = useState<Step>('run')
  const [phase, setPhase] = useState<Phase>('speaking')
  const [tries, setTries] = useState(0) // intentos fallidos seguidos
  const [phrase, setPhrase] = useState(() => pickPhrase())
  const [showPhrase, setShowPhrase] = useState(false)
  const [left, setLeft] = useState(8)
  const levelRef = useRef(0)
  const mascot = THEME_INFO[settings.theme].mascot
  const headset = mode === 'headset'
  const bluetooth = mode === 'headset' || mode === 'split'
  const where = mode === 'none' || mode === 'phone' ? 'el altavoz del teléfono' : 'tus auriculares'
  const micWhere = headset ? 'el micrófono de tus auriculares' : 'el micrófono del teléfono'

  // Por referencia: un onFailed nuevo en cada pintado del padre no debe reiniciar el intento en curso.
  const failedRef = useRef(onFailed)
  useEffect(() => {
    failedRef.current = onFailed
  }, [onFailed])
  const fail = useCallback(() => {
    setTries((n) => n + 1)
    failedRef.current?.()
    setStep('noVoice')
  }, [])

  // Un intento: instrucción hablada → espera → escucha sola. Todo se cancela al salir del paso o en segundo plano.
  useEffect(() => {
    if (step !== 'run') return
    let alive = true
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    let timer = 0
    const cleanup = () => {
      alive = false
      clearInterval(timer)
      levelRef.current = 0
      stream?.getTracks().forEach((tr) => tr.stop()) // el micro se cierra siempre al terminar
      stream = null
      ctx?.close().catch(() => {})
      ctx = null
      releaseAudioFocus('mic')
    }
    const offBg = whenBackground(() => {
      // Privacidad: en segundo plano no se escucha. Al volver, la prueba se repite desde el principio.
      cleanup()
      stopSpeaking().catch(() => {})
      console.info('[HABLA-MIC] prueba de sonido cancelada: segundo plano')
      setStep('notHeard')
    })
    const openMic = async () => {
      if (stream) return stream
      if (!isForeground()) throw new Error('segundo plano') // REV-D1-02: nunca se abre el micro con la app oculta
      stream = await navigator.mediaDevices.getUserMedia({ audio: mode === 'split' ? RAW : PROCESSING })
      if (!alive) {
        stream.getTracks().forEach((tr) => tr.stop())
        throw new Error('cancelada')
      }
      return stream
    }
    ;(async () => {
      try {
        // REV-D1-02: con la app oculta no se fija la ruta, no se habla ni se abre el micro.
        if (!isForeground()) {
          cleanup()
          setStep('notHeard')
          return
        }
        await soundTestRoute(true, headset) // auriculares: instrucción y micro por el canal de voz
        if (!alive || !isForeground()) return
        await new Promise((r) => setTimeout(r, 300)) // un respiro tras cortar lo que sonaba y fijar la ruta
        if (!alive) return
        // Auriculares: el micro se abre YA (sin analizar) para que el Bluetooth active su micro mientras habla la mascota.
        const early = headset ? openMic() : null
        early?.catch(() => {})
        await speakSegments(
          [
            { lang: 'es', text: 'Si me oyes, dime:' },
            { lang: 'en', text: phrase },
          ],
          'sound-check',
        )
        if (!alive) return
        setPhase('waiting')
        await new Promise((r) => setTimeout(r, listenDelayMs(bluetooth)))
        if (!alive) return
        const s = await (early ?? openMic())
        if (!alive) return
        ctx = new AudioContext()
        await ctx.resume()
        const an = ctx.createAnalyser()
        an.fftSize = 1024
        ctx.createMediaStreamSource(s).connect(an)
        const buf = new Uint8Array(an.fftSize)
        const vad = new VoiceDetector()
        takeAudioFocus('mic') // la música de otras apps se pausa: no cuenta como voz
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}) // aviso de «te escucho», sin pitido
        setPhase('listening')
        const t0 = performance.now()
        let last = t0
        // Cada 30 ms con un temporizador (no requestAnimationFrame, que se para si la vista no se pinta).
        const tick = () => {
          const now = performance.now()
          if (!alive) return
          an.getByteTimeDomainData(buf)
          const rms = rmsOfBytes(buf)
          levelRef.current = Math.min(1, rms * 5)
          const st = vad.push(rms, now - last)
          last = now
          setLeft(Math.max(0, Math.ceil((8000 - (now - t0)) / 1000)))
          if (st === 'heard') {
            console.info(`[HABLA-MIC] prueba de sonido pasada (${mode}) en ${Math.round(now - t0)} ms`)
            cleanup()
            setStep('passed')
            return
          }
          if (st === 'timeout') {
            console.info(`[HABLA-MIC] prueba de sonido: sin voz en 8 s (${mode})`)
            cleanup()
            fail()
            return
          }
        }
        timer = window.setInterval(tick, 30)
      } catch (e) {
        if (!alive) return
        cleanup()
        console.warn('[HABLA-MIC] prueba de sonido: no se pudo abrir el micro', String(e))
        setStep('micError')
      }
    })()
    return () => {
      offBg()
      cleanup()
      stopSpeaking().catch(() => {})
    }
  }, [step, phrase, mode, headset, bluetooth, fail])

  // Al cerrarse la prueba (pasada, cambio de opción, desmontaje), la ruta vuelve a lo que toque.
  useEffect(() => () => void soundTestRoute(false, headset), [headset])

  // Pasada: la mascota lo celebra un momento y la app sigue donde estabas.
  useEffect(() => {
    if (step !== 'passed') return
    const id = setTimeout(onPassed, 1400)
    return () => clearTimeout(id)
  }, [step, onPassed])

  const retry = () => {
    setPhrase((p) => pickPhrase(p))
    setPhase('speaking')
    setStep('run')
  }
  const other = onChooseOther ? { label: 'Elegir otra opción de audio', onClick: onChooseOther } : undefined
  const header = headsetName ? `Prueba de sonido · ${headsetName}` : 'Prueba de sonido · teléfono'
  const notHear = { label: 'No te oigo', onClick: () => setStep('notHeard') }

  if (step === 'run') {
    const listening = phase === 'listening'
    return (
      <MascotPage
        overlay={{ t }}
        element={mascot}
        mood={listening ? 'listening' : phase === 'speaking' ? 'speaking' : 'idle'}
        title={listening ? 'Te escucho…' : '¿Me oyes?'}
        subtitle={
          listening
            ? `Dilo ahora en voz alta. Te escucho por ${micWhere}.`
            : `${header}. Escucha lo que te digo por ${where} y repítelo en voz alta.`
        }
        // REG-M-03: «No te oigo» siempre visible; tras 2 fallos, «Ver la frase» (para quien oye poco).
        primary={tries >= 2 && !showPhrase ? { label: 'Ver la frase', onClick: () => setShowPhrase(true) } : undefined}
        secondary={notHear}
      >
        {showPhrase && (
          <div className="tip-bubble mx-auto rounded-[20px] px-4 py-2.5 text-center fs-17 font-semibold" role="status">
            Di: «{phrase}»
          </div>
        )}
        <div className="flex min-h-[54px] flex-col items-center justify-center gap-1 pt-2" aria-live="polite">
          {listening ? (
            <>
              <div style={{ transform: 'scale(1.6)' }}>
                <VoiceMeter level={() => levelRef.current} />
              </div>
              <div className="txt-sub pt-2 fs-13 tabular-nums">{left} s</div>
            </>
          ) : (
            <div className="txt-sub fs-13">{phase === 'speaking' ? 'Escucha…' : 'Prepárate…'}</div>
          )}
        </div>
      </MascotPage>
    )
  }

  if (step === 'notHeard')
    return (
      <MascotPage
        overlay={{ t }}
        element={mascot}
        mood="thinking"
        title="¿No me oyes?"
        subtitle={`Sube el volumen del teléfono${mode === 'none' ? '' : ' y comprueba que tus auriculares estén puestos y encendidos'}, y probamos otra vez.`}
        primary={{ label: 'Probar otra vez', onClick: retry }}
        secondary={other}
      />
    )

  if (step === 'noVoice')
    return (
      <MascotPage
        overlay={{ t }}
        element={mascot}
        mood="thinking"
        // REG-N-01 (POCO): el modo nunca cambia en silencio. Tras el 1.er fallo, lo primero es «Probar otra vez» (quizá no
        // estabas listo); el micro del teléfono solo si lo eliges. Tras 2 fallos, la mascota lo propone claramente.
        title={headset && tries >= 2 ? 'Sigo sin oírte' : 'No te he oído'}
        subtitle={
          !headset
            ? 'Cuando acabe de hablar, di la frase un poco más alto y cerca del micrófono.'
            : tries >= 2
              ? 'El micrófono de tus auriculares no me llega. Te escucharé por el micro del teléfono y me seguirás oyendo por los auriculares. Puedes cambiarlo en Ajustes → Profe y voz.'
              : 'Quizá no estabas listo. Probamos otra vez: cuando acabe de hablar, di la frase. Si tus auriculares no me llegan, puedes hablarle al teléfono.'
        }
        primary={
          headset && tries >= 2
            ? { label: 'Vale, usar el micro del teléfono', onClick: onUsePhoneMic }
            : { label: 'Probar otra vez', onClick: retry }
        }
        secondary={
          headset
            ? tries >= 2
              ? { label: 'Probar otra vez', onClick: retry }
              : { label: 'Hablar al micro del teléfono', onClick: onUsePhoneMic }
            : (other ?? notHear)
        }
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
        primary={{ label: 'Probar otra vez', onClick: retry }}
        secondary={other}
      />
    )

  // REG-N-01: si se pasó con el micro del teléfono (elegido por ti), la mascota lo dice: nada cambia sin que lo sepas.
  return (
    <MascotPage
      overlay={{ t }}
      element={mascot}
      mood="happy"
      title="¡Te oigo perfecto!"
      subtitle={
        mode === 'split'
          ? 'Te escucharé por el micro del teléfono y me oirás por los auriculares. Puedes cambiarlo en Ajustes → Profe y voz.'
          : 'Prueba de sonido pasada. Seguimos.'
      }
    />
  )
}
