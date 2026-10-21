import { useEffect, useRef, useState } from 'react'
import { practiceLabel, practiceSheet, pronunciationLine, weakWords, type PronResult } from '../lib/pronunciation'
import { openSound } from '../lib/soundLink'
import { loadSounds, phonemeByAzure, type Phoneme } from '../lib/sounds'
import { speakingKey } from '../lib/speaking'
import { stopSpeaking } from '../lib/tts'
import { Icon } from '../ui/icons'
import SpeakIcon from './SpeakIcon'

/** Qué mide cada nota de Azure, contado para el alumno. */
const HELP: Record<string, string> = {
  Precisión: 'Qué tan bien suena cada sonido de cada palabra, comparado con un hablante nativo. Baja si cambias un sonido por otro o te lo comes (por ejemplo la /θ/ de «think» dicha como «tink»).',
  Fluidez: 'Qué tan seguido hablas. Las pausas largas, los cortes y los titubeos en medio de la frase la bajan; un ritmo natural la sube.',
  Completa: 'Cuánto de lo que querías decir se llegó a oír. Baja si te comes palabras o alguna no se entiende.',
  Entonación: 'La música de tu inglés: el acento en la sílaba correcta, subir y bajar la voz y las pausas naturales. Una voz plana (monótona) la baja.',
}

const verdict = (x: number) => (x >= 80 ? 'bien' : x >= 60 ? 'a mejorar' : 'a practicar')

/**
 * La pronunciación de tu respuesta (Azure): nota, cuatro medidas, una frase del coach y las palabras a cuidar.
 * `pausable` (v5.9): la palabra que suena muestra ⏸ y se para al tocarla otra vez. Es opcional porque en el test de
 * nivel no se puede pausar ningún audio (decisión del dueño): allí se usa sin él y queda como antes.
 * `practiceLink` (5.11, S-11): enlace «🔊 Practicar el sonido /θ/ en Sonidos», que abre la ficha encima (`openSound`).
 * Por defecto va con `pausable`: sale en la clase, el Repaso y «Dilo tú», y no en el test de nivel (que no se interrumpe).
 */
export default function PronunciationView({
  r,
  onSay,
  pausable = false,
  practiceLink = pausable,
}: {
  r: PronResult
  onSay: (word: string) => void
  pausable?: boolean
  practiceLink?: boolean
}) {
  const weak = weakWords(r)
  // 5.11 (S-11): las fichas se cargan aparte (import perezoso) y solo si hay enlace; hasta entonces no sale nada.
  const [sounds, setSounds] = useState<Phoneme[] | null>(null)
  useEffect(() => {
    if (!practiceLink) return
    let live = true
    loadSounds()
      .then((c) => live && setSounds(c.phonemes))
      .catch(() => {}) // sin contenido de Sonidos, sin enlace
    return () => {
      live = false
    }
  }, [practiceLink])
  const sheet = practiceLink && sounds ? practiceSheet(weak, (x) => phonemeByAzure(sounds, x.phoneme, x.word)) : undefined
  const tone = (x: number) => (x >= 80 ? 'var(--acc)' : x >= 60 ? 'var(--acc2)' : '#f59e0b')
  const items: [string, number | undefined][] = [
    ['Precisión', r.accuracy],
    ['Fluidez', r.fluency],
    ['Completa', r.completeness],
    ['Entonación', r.prosody],
  ]
  // Ayuda de cada nota: una burbuja que apunta a la nota tocada. Tocar fuera la oculta (no se quita de la pantalla).
  const [tip, setTip] = useState<number | null>(null)
  const row = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (tip === null) return
    const close = (e: PointerEvent) => {
      if (!row.current?.contains(e.target as Node)) setTip(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [tip])
  const shown = tip ?? 0
  const [tipLabel, tipValue] = items[shown]

  return (
    <div className="field rounded-[14px] px-3 py-2 fs-13" style={{ border: 0 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold">
          <Icon name="ear" size={14} /> Pronunciación
        </span>
        <b className="tabular-nums" style={{ color: tone(r.pron) }}>
          {r.pron}/100
        </b>
      </div>
      <div ref={row} className="pron-grid relative mt-1.5 grid grid-cols-4 gap-1 text-center">
        {items.map(([label, v], k) => (
          <button
            key={label}
            onClick={() => setTip((t) => (t === k ? null : k))}
            aria-expanded={tip === k}
            aria-label={`${label}: ${v ?? 'sin dato'}. Toca para saber qué mide`}
            className="min-w-0 rounded-[10px] py-0.5"
            style={{ background: tip === k ? 'var(--g)' : undefined }}
          >
            <div className="fs-13 font-semibold tabular-nums" style={{ color: v === undefined ? 'var(--sub)' : tone(v) }}>
              {v ?? '—'}
            </div>
            <div className="pron-label txt-sub truncate fs-10.5 underline decoration-dotted underline-offset-2">{label}</div>
          </button>
        ))}
        <div
          role="tooltip"
          aria-hidden={tip === null}
          className="tip-bubble absolute top-full right-0 left-0 z-20 mt-2 rounded-[14px] px-3 py-2 text-left fs-12.5 leading-snug shadow-lg transition-opacity duration-150"
          style={{
            opacity: tip === null ? 0 : 1,
            visibility: tip === null ? 'hidden' : 'visible',
            pointerEvents: tip === null ? 'none' : 'auto',
          }}
        >
          {/* Flecha que apunta a la nota tocada. */}
          <span
            className="pron-arrow absolute -top-[7px] h-3 w-3 rotate-45"
            // 5.10.1 (REG-M-05): con letra grande la rejilla pasa a 2 × 2 (index.css) y la flecha usa --a2.
            style={{ ['--a4' as string]: `calc(${shown * 25 + 12.5}% - 6px)`, ['--a2' as string]: `calc(${(shown % 2) * 50 + 25}% - 6px)`, left: 'var(--a4)', background: 'var(--tip-bg)', borderLeft: '1px solid var(--tip-border)', borderTop: '1px solid var(--tip-border)' }}
          />
          <b>{tipLabel}</b>
          {tipValue !== undefined && (
            <span className="txt-sub">
              {' '}
              · tu nota {tipValue}/100, {verdict(tipValue)}
            </span>
          )}
          <div className="mt-0.5">{HELP[tipLabel]}</div>
        </div>
      </div>
      <div className="mt-1.5 leading-snug">{pronunciationLine(r)}</div>
      {weak.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {weak.map((w) => (
            <button
              key={w.word}
              onClick={() => (pausable && speakingKey() === w.word ? stopSpeaking() : onSay(w.word))}
              className="glass flex min-h-7 max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 fs-12.5 break-words"
              // 5.10.1 (REG-A3-19): el consejo en español también en el chip (el IPA solo, un A2 no lo lee).
              title={`${w.heard ? `Te salió /${w.heard}/ en vez de /${w.phoneme}/. ` : ''}${w.tip ? `${w.tip}. Toca para oírla bien pronunciada` : 'Escúchala bien pronunciada'}`}
              aria-label={`Escuchar «${w.word}» bien pronunciada${w.heard ? `. Te salió /${w.heard}/ en vez de /${w.phoneme}/` : ''}${w.tip ? `: ${w.tip}` : ''}`}
            >
              {pausable ? <SpeakIcon speakKey={w.word} size={12} /> : <Icon name="speaker" size={12} />}
              <b>{w.word}</b>
              {/* 5.11 (M-11): con NBest de Azure, «/θ/ 45 · te salió /s/». Sin él, el chip queda como en la 5.10.1. */}
              {w.phoneme && !w.heard && <span className="txt-sub">/{w.phoneme}/</span>}
              {w.phoneme && w.heard && (
                <span className="txt-sub">
                  /{w.phoneme}/ {w.phonemeAccuracy} · te salió <b style={{ color: 'var(--acc2)' }}>/{w.heard}/</b>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {sheet && (
        // 5.11 (S-11): una sola línea (en 320×640 la tarjeta crece como mucho una línea); toque de 36 px con margen negativo.
        <button
          onClick={() => openSound(sheet.id)}
          className="txt-acc2 -mb-1.5 flex min-h-9 w-full min-w-0 items-center gap-1.5 text-left fs-12.5 font-semibold"
          aria-label={`${practiceLabel(sheet)}: abre la ficha sin salir de aquí`}
        >
          <span aria-hidden>🔊</span>
          <span className="truncate">{practiceLabel(sheet)}</span>
          <Icon name="chevR" size={13} stroke={2} />
        </button>
      )}
    </div>
  )
}
