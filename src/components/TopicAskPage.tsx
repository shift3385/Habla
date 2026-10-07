import { useEffect, useRef, useState } from 'react'
import { dictate } from '../lib/dictation'
import { isAborted } from '../lib/gemini'
import { MicError, Recorder } from '../lib/recorder'
import { fastModels, type Settings } from '../lib/settings'
import { analyzeSpeech, blobToBase64 } from '../lib/speech'
import { Icon } from '../ui/icons'
import type { MascotElement } from '../ui/Mascot'
import type { ThemeVars } from '../ui/theme'
import MascotPage from './MascotPage'

export type AskKind = 'free' | 'debate'

interface Props {
  kind: AskKind
  settings: Settings
  element: MascotElement
  t: ThemeVars
  /** customTopic vacío = que elija el profe (solo en debate). */
  onStart: (customTopic?: string) => void
  onClose: () => void
}

const EXAMPLES: Record<AskKind, string[]> = {
  free: ['Mi trabajo', 'Una película que me encantó', 'Mis planes para el fin de semana', 'Un viaje que quiero hacer'],
  debate: ['El teletrabajo', 'Las redes sociales y los jóvenes', 'La IA en el arte', 'Los móviles en los colegios'],
}

/**
 * Tema libre y Debate en la página de la mascota (como la bienvenida): te pregunta y respondes.
 * Debate: primero quién elige el tema (el profe o tú) y, si eres tú, cuál.
 */
export default function TopicAskPage({ kind, settings, element, t, onStart, onClose }: Props) {
  const [step, setStep] = useState(kind === 'free' ? 1 : 0)
  const [text, setText] = useState('')
  const [cheer, setCheer] = useState(false)
  // Dictado (NC-05): toca el micrófono, di el tema y vuelve a tocar; Gemini lo escribe aquí.
  const [mic, setMic] = useState<'idle' | 'recording' | 'writing'>('idle')
  const [micHint, setMicHint] = useState<string | null>(null)
  const recorder = useRef<Recorder | null>(null)
  // AUD-MIC-303: cada dictado pertenece a una «vuelta»; salir del paso, cerrar la hoja o desmontar la anula.
  // Un dictado anulado no empieza a grabar (aunque el micro termine de abrirse después) ni se envía a Gemini.
  const run = useRef(0)
  const abandon = () => {
    run.current++
    recorder.current?.close() // cancela también una apertura en curso (T1)
    setMic('idle')
  }
  useEffect(
    () => () => {
      run.current++
      recorder.current?.close()
    },
    [],
  )
  const goStep = (n: number) => {
    abandon()
    setMicHint(null)
    setStep(n)
  }
  const close = () => {
    abandon()
    onClose()
  }
  const ready = text.trim().length >= 3 && mic === 'idle'
  const mood = cheer ? 'happy' : mic === 'recording' ? 'listening' : mic === 'writing' ? 'thinking' : text ? 'listening' : 'idle'

  const toggleMic = async () => {
    if (mic === 'writing') return
    setMicHint(null)
    const mine = run.current
    const alive = () => run.current === mine
    if (mic === 'idle') {
      try {
        recorder.current ??= new Recorder()
        // false = se canceló mientras se abría (cambiaste de paso o cerraste): no se graba nada.
        if (!(await recorder.current.begin()) || !alive()) return
        setMic('recording')
      } catch (e) {
        if (alive()) setMicHint(e instanceof MicError ? e.message : 'No se pudo abrir el micrófono.')
      }
      return
    }
    setMic('writing')
    try {
      const rec = recorder.current!
      const { blob, seconds } = await rec.stop()
      rec.close()
      if (!alive()) return
      const analysis = await analyzeSpeech(blob)
      if (!alive()) return
      if (seconds < 0.7 || blob.size === 0 || (analysis && !analysis.hasSpeech)) {
        setMicHint('No te he oído. Toca el micrófono y dilo otra vez.')
        return
      }
      const base64 = await blobToBase64(blob)
      if (!alive()) return // AUD-MIC-303: el audio de un dictado abandonado no sale del teléfono
      const said = await dictate(settings.geminiKey, fastModels(settings), {
        base64,
        mimeType: blob.type.split(';')[0] || 'audio/webm',
      })
      if (!alive()) return
      if (said) setText(said.slice(0, 160))
      else setMicHint('No te he entendido. Prueba otra vez, un poco más cerca.')
    } catch (e) {
      if (alive() && !isAborted(e)) setMicHint((e as Error).message)
    } finally {
      if (alive()) setMic('idle')
    }
  }

  if (step === 0) {
    const option = (icon: 'spark' | 'pencil', title: string, desc: string, onClick: () => void) => (
      <button onClick={onClick} className="glass flex w-full items-center gap-3.5 rounded-[26px] px-4 py-4 text-left">
        <span className="btn-acc grid h-11 w-11 flex-none place-items-center rounded-full">
          <Icon name={icon} size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">{title}</span>
          <span className="txt-sub block text-[13px] leading-snug">{desc}</span>
        </span>
        <Icon name="chevR" size={16} stroke={2} color="var(--sub)" />
      </button>
    )
    return (
      <MascotPage
        overlay={{ t }}
        element={element}
        mood="idle"
        step={{ i: 0, n: 2 }}
        title="¿Quién elige el tema del debate?"
        subtitle="Tú defiendes una postura y el profe defenderá la contraria."
        onBack={close}
      >
        <div className="flex flex-col gap-2.5">
          {/* En el paso 0 no hay dictado posible: al volver aquí ya se anuló con goStep(0). */}
          {option('spark', 'Que elija el profe', 'Un tema actual y fácil de discutir', () => onStart())}
          {option('pencil', 'Lo propongo yo', 'Escribe el tema que quieres debatir', () => setStep(1))}
        </div>
      </MascotPage>
    )
  }

  const debate = kind === 'debate'
  return (
    <MascotPage
      overlay={{ t }}
      element={element}
      mood={mood}
      step={debate ? { i: 1, n: 2 } : undefined}
      title={debate ? '¿Qué tema quieres debatir?' : '¿De qué quieres hablar?'}
      subtitle={debate ? 'Escríbelo como una pregunta o una idea. El profe tomará la postura contraria.' : 'Cualquier tema: el profe prepara la clase sobre lo que escribas.'}
      onBack={debate ? () => goStep(0) : close}
      primary={{
        label: debate ? 'Empezar el debate' : 'Empezar a hablar',
        disabled: !ready,
        onClick: () => {
          if (!ready) return
          abandon()
          onStart(text.trim())
        },
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={160}
        placeholder={debate ? 'Ej.: ¿Deberían prohibir los móviles en los colegios?' : 'Ej.: mi viaje a Japón, el último partido, cómo aprender a cocinar…'}
        className="glass w-full resize-none rounded-[26px] px-5 py-4 text-center text-[17px] leading-snug outline-none"
        style={{ color: 'var(--tx)' }}
      />
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <button
          onClick={toggleMic}
          disabled={mic === 'writing'}
          className="btn-acc flex h-[48px] items-center gap-2 rounded-full px-5 text-[15px] disabled:opacity-60"
          style={mic === 'recording' ? { boxShadow: '0 0 0 8px var(--glow)' } : undefined}
          aria-label={mic === 'recording' ? 'Terminar de dictar' : 'Dictar por voz'}
        >
          {mic === 'recording' ? <span className="h-4 w-4 rounded-[4px]" style={{ background: 'var(--ink)' }} /> : <Icon name="mic" size={19} />}
          {mic === 'recording' ? 'Te escucho… toca para terminar' : mic === 'writing' ? 'Escribiendo lo que dijiste…' : 'Dictar por voz'}
        </button>
        {micHint && <div className="txt-sub text-center text-[13px]">{micHint}</div>}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {EXAMPLES[kind].map((x) => (
          <button
            key={x}
            onClick={() => {
              setText(x)
              setCheer(true)
              setTimeout(() => setCheer(false), 1200)
            }}
            className="glass h-[40px] rounded-[20px] px-4 text-[14px]"
          >
            {x}
          </button>
        ))}
      </div>
    </MascotPage>
  )
}
