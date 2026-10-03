import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../ui/icons'

export type AskKind = 'free' | 'debate'

interface Props {
  kind: AskKind
  /** customTopic vacío = que elija el profe (solo en debate). */
  onStart: (customTopic?: string) => void
  onClose: () => void
}

const TEXT: Record<AskKind, { title: string; question: string; placeholder: string; examples: string[] }> = {
  free: {
    title: 'Tema libre',
    question: '¿De qué quieres hablar?',
    placeholder: 'Ej.: mi viaje a Japón, el último partido, cómo aprender a cocinar…',
    examples: ['Mi trabajo', 'Una película que me encantó', 'Mis planes para el fin de semana'],
  },
  debate: {
    title: 'Debate',
    question: '¿Qué tema quieres debatir?',
    placeholder: 'Ej.: ¿Deberían prohibir los móviles en los colegios?',
    examples: ['El teletrabajo', 'Las redes sociales y los jóvenes', 'La IA en el arte'],
  },
}

/**
 * Hoja para elegir el tema: en "Tema libre" lo escribes tú; en "Debate" eliges si lo pone el profe o lo propones
 * tú (y el profe defenderá la postura contraria).
 */
export default function TopicAskSheet({ kind, onStart, onClose }: Props) {
  const [writing, setWriting] = useState(kind === 'free')
  const [text, setText] = useState('')
  const t = TEXT[kind]
  const ready = text.trim().length >= 3

  // Portal al <body>: así queda por encima de la barra de pestañas (el Inicio está dentro de otra capa).
  return createPortal(
    <div className="fixed inset-0 z-[50] flex items-end justify-center" style={{ background: 'rgba(0,0,0,.45)' }} onClick={onClose}>
      <div
        className="anim-up w-full max-w-xl rounded-t-[30px] px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+22px)]"
        style={{ background: 'var(--bg)', borderTop: '1px solid var(--gb)', color: 'var(--tx)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="btn-acc grid h-11 w-11 flex-none place-items-center rounded-full">
            <Icon name={kind === 'free' ? 'pencil' : 'scale'} size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold">{t.title}</div>
            <div className="txt-sub text-[13px]">
              {kind === 'free' ? 'Tú decides de qué hablar' : 'Defiende tu postura: el profe tomará la contraria'}
            </div>
          </div>
          <button onClick={onClose} className="glass grid h-10 w-10 flex-none place-items-center rounded-full" aria-label="Cerrar">
            <Icon name="back" size={16} className="rotate-[-90deg]" />
          </button>
        </div>

        {!writing ? (
          <div className="mt-4 flex flex-col gap-2">
            <button onClick={() => onStart()} className="glass flex items-center gap-3 rounded-[22px] px-4 py-3.5 text-left">
              <Icon name="spark" size={18} color="var(--acc)" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">Que elija el profe</span>
                <span className="txt-sub block text-[12.5px]">Un tema actual y fácil de discutir</span>
              </span>
            </button>
            <button onClick={() => setWriting(true)} className="glass flex items-center gap-3 rounded-[22px] px-4 py-3.5 text-left">
              <Icon name="pencil" size={18} color="var(--acc)" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">Propongo yo el tema</span>
                <span className="txt-sub block text-[12.5px]">Escribe de qué quieres debatir</span>
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="text-[15px] font-semibold">{t.question}</div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              autoFocus
              maxLength={160}
              placeholder={t.placeholder}
              className="input mt-2 h-auto resize-none py-3 leading-snug"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {t.examples.map((x) => (
                <button key={x} onClick={() => setText(x)} className="field h-8 rounded-2xl px-3 text-[12.5px]">
                  {x}
                </button>
              ))}
            </div>
            <button
              onClick={() => ready && onStart(text.trim())}
              disabled={!ready}
              className="btn-acc mt-4 h-[54px] w-full rounded-full text-[16px] transition-opacity"
              style={{ opacity: ready ? 1 : 0.45 }}
            >
              {kind === 'free' ? 'Empezar a hablar' : 'Empezar el debate'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
