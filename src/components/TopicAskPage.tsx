import { useState } from 'react'
import { Icon } from '../ui/icons'
import type { MascotElement } from '../ui/Mascot'
import type { ThemeVars } from '../ui/theme'
import MascotPage from './MascotPage'

export type AskKind = 'free' | 'debate'

interface Props {
  kind: AskKind
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
export default function TopicAskPage({ kind, element, t, onStart, onClose }: Props) {
  const [step, setStep] = useState(kind === 'free' ? 1 : 0)
  const [text, setText] = useState('')
  const [cheer, setCheer] = useState(false)
  const ready = text.trim().length >= 3
  const mood = cheer ? 'happy' : text ? 'listening' : 'idle'

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
        onBack={onClose}
      >
        <div className="flex flex-col gap-2.5">
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
      onBack={debate ? () => setStep(0) : onClose}
      primary={{
        label: debate ? 'Empezar el debate' : 'Empezar a hablar',
        disabled: !ready,
        onClick: () => ready && onStart(text.trim()),
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        autoFocus
        maxLength={160}
        placeholder={debate ? 'Ej.: ¿Deberían prohibir los móviles en los colegios?' : 'Ej.: mi viaje a Japón, el último partido, cómo aprender a cocinar…'}
        className="glass w-full resize-none rounded-[26px] px-5 py-4 text-center text-[17px] leading-snug outline-none"
        style={{ color: 'var(--tx)' }}
      />
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
