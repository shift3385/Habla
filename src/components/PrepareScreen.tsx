import { useEffect, useState } from 'react'
import { Icon, type IconName } from '../ui/icons'
import Orb from '../ui/Orb'

// Pantalla de preparación (diseño "Cargando"): el orbe del profe respira mientras aparecen iconos de
// clase a su alrededor. Éxito: los iconos viajan al orbe, pop + onda. Error: todo se apaga y sube una tarjeta.

export type PrepareKind = 'clase' | 'test' | 'eval'
export type PrepareState = 'loading' | 'done' | 'error'

const ICONS: IconName[] = ['book', 'headphones', 'notebook', 'pencil', 'cards', 'cap', 'soundwave', 'bubble']
const POS = [-90, -30, 30, 90, 150, 210].map((d) => (d * Math.PI) / 180)
const RADIUS = 125

const TEXT: Record<PrepareKind, { title: string; done: string; msgs: string[]; error: string }> = {
  clase: {
    title: 'Preparando tu clase',
    done: '¡Clase lista!',
    msgs: ['Eligiendo el tema', 'Buscando vocabulario', 'Preparando la conversación', 'Ajustando a tu nivel'],
    error: 'No pudimos preparar la clase',
  },
  test: {
    title: 'Preparando tu test',
    done: '¡Test listo!',
    msgs: ['Seleccionando preguntas', 'Mezclando ejercicios', 'Preparando los audios', 'Calibrando la dificultad'],
    error: 'No pudimos preparar el test',
  },
  eval: {
    title: 'Evaluando tu inglés',
    done: '¡Ya tenemos tu nivel!',
    msgs: ['Escuchando tus respuestas', 'Revisando la gramática', 'Midiendo tu fluidez', 'Calculando tu nivel'],
    error: 'No pudimos evaluar tu test',
  },
}

interface Props {
  kind: PrepareKind
  state: PrepareState
  colors: [string, string]
  teacherName: string
  /** Título concreto de lo que se prepara (p. ej. "Preparando el test de gramática"). */
  title?: string
  errorText?: string
  onRetry?: () => void
  onBack?: () => void
}

export default function PrepareScreen({ kind, state, colors, teacherName, title, errorText, onRetry, onBack }: Props) {
  const [tick, setTick] = useState(0)
  const [msgI, setMsgI] = useState(0)
  const text = TEXT[kind]

  useEffect(() => {
    if (state !== 'loading') return
    const a = setInterval(() => setTick((x) => x + 1), 700)
    const b = setInterval(() => setMsgI((x) => x + 1), 2400)
    return () => {
      clearInterval(a)
      clearInterval(b)
    }
  }, [state])

  const done = state === 'done'
  const error = state === 'error'
  const live: number[] = []
  if (!error) for (let k = Math.max(0, tick - 3); k <= tick; k++) live.push(k)

  return (
    <div className="relative z-[2] flex h-full flex-col items-center justify-center px-7">
      <div className="relative grid h-[330px] w-[330px] place-items-center">
        <div
          className="ld-ring absolute h-[250px] w-[250px] rounded-full"
          style={{ border: '1px dashed var(--gb)', animation: 'hb-spin 40s linear infinite', opacity: error ? 0 : 1, transition: 'opacity .6s' }}
        />
        {live.map((k) => {
          const a = POS[k % POS.length]
          const x = Math.cos(a) * RADIUS
          const y = Math.sin(a) * RADIUS
          return (
            <div
              key={k}
              className={done ? 'ld-suck' : ''}
              style={
                {
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  marginLeft: -27 + x,
                  marginTop: -27 + y,
                  '--ld-tx': `${-x}px`,
                  '--ld-ty': `${-y}px`,
                  animation: done ? 'ld-suck .5s ease-in forwards' : undefined,
                } as React.CSSProperties
              }
            >
              <div className="ld-item" style={{ animation: done ? 'none' : 'ld-item 2.8s ease-in-out forwards' }}>
                <div className="glass txt-acc2 grid h-[54px] w-[54px] place-items-center rounded-full">
                  <Icon name={ICONS[(k * 3) % ICONS.length]} size={24} stroke={1.6} />
                </div>
              </div>
            </div>
          )
        })}
        {done && (
          <div
            key="burst"
            className="ld-burst absolute h-[120px] w-[120px] rounded-full"
            style={{ border: '2px solid var(--acc)', animation: 'ld-burst .7s .45s ease-out both' }}
          />
        )}
        <div
          key={state}
          style={{
            animation: done ? 'ld-pop .7s cubic-bezier(.3,1.6,.5,1)' : `ld-breathe ${error ? 7 : 4}s ease-in-out infinite`,
            filter: error ? 'grayscale(1) brightness(.7)' : 'none',
            transition: 'filter .8s',
          }}
        >
          <Orb size={120} colors={colors} active={!error} />
        </div>
      </div>

      <div className="mt-[34px] h-16 w-full text-center">
        {state === 'loading' && (
          <>
            <div className="text-2xl font-semibold tracking-[-.4px]">{title ?? text.title}</div>
            <div className="txt-sub relative mt-2 h-[22px] text-[15px]">
              <div key={msgI} className="ld-msg absolute inset-0 flex items-center justify-center gap-0.5" style={{ animation: 'ld-msg 2.4s ease both' }}>
                {text.msgs[msgI % text.msgs.length]}
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ animation: `hb-dot 1.2s ${i * 0.2}s infinite` }}>
                    .
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
        {done && (
          <div className="anim-up">
            <div className="text-2xl font-semibold tracking-[-.4px]">{text.done}</div>
            <div className="txt-sub mt-2 text-[15px]">{kind === 'clase' ? `${teacherName} te espera` : kind === 'test' ? '¡Mucha suerte!' : 'Preparando tu resultado'}</div>
          </div>
        )}
      </div>

      {error && (
        <div
          className="glass absolute right-5 left-5 rounded-[28px] p-5 text-center"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 36px)', animation: 'hb-up .5s cubic-bezier(.3,1.3,.5,1) both' }}
        >
          <div className="text-lg font-semibold">{text.error}</div>
          <div className="txt-sub mt-1.5 text-sm leading-snug">{errorText}</div>
          <div className={`mt-4 grid gap-2 ${onBack ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {onBack && (
              <button onClick={onBack} className="field h-12 rounded-3xl text-[15px] font-medium">
                Volver
              </button>
            )}
            {onRetry && (
              <button onClick={onRetry} className="btn-acc h-12 rounded-3xl text-[15px]">
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
