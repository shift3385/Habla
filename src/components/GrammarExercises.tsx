import { Fragment, useState } from 'react'
import type { GrammarProgress } from '../lib/db'
import { checkExercise, fullSentence, orderMatch, shuffleChoice, gapCount, gapParts, MASTERY_RATIO, type GrammarExercise, type GrammarTopic } from '../lib/grammar'
import { finishRound, recordAnswer } from '../lib/grammarProgress'
import { toggleSpeak } from '../lib/tts'
import { Icon } from '../ui/icons'
import Mascot, { type MascotElement } from '../ui/Mascot'
import SpeakIcon from './SpeakIcon'
import { scrollBehavior } from '../lib/effects' // 5.11.x: sin desplazamiento suave en modo ligero

/** Al aparecer la explicación (o el botón Siguiente), se desplaza a la vista sin quedar bajo la barra de pestañas. */
const showOnMount = (el: HTMLElement | null) => el?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() })

// 5.10.1 (REG-A4-03): verde y rojo por modo (theme.ts › cssVars): los fijos daban 2,1–2,7:1 en los temas claros.
const OK = 'var(--ok)'
const BAD = 'var(--bad)'

/** Enunciado con los huecos (____) dibujados como una raya del color del tema. */
function Prompt({ text }: { text: string }) {
  const parts = text.split(/_{3,}/)
  return (
    <div className="fs-19 leading-snug font-medium break-words">
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && <span className="txt-acc inline-block w-[3.2em] border-b-2 align-baseline" style={{ borderColor: 'var(--acc)' }} />}
        </Fragment>
      ))}
    </div>
  )
}

interface Answered {
  ok: boolean
  chosen?: number // opción elegida (choice)
}

/**
 * v5.10: ejercicios de un tema (elegir, completar, ordenar). Una ronda = todos una vez; cuenta el primer intento.
 * Al fallar, la mascota explica por qué (la opción elegida y la regla) y el ejercicio pasa al Repaso como tarjeta.
 * Al terminar la ronda se guarda el resultado: ≥ 80 % = tema dominado (grammar.ts, `isMasteryRound`).
 */
export default function GrammarExercises({
  topic,
  mascot,
  mascotName,
  onExplain,
  onRoundDone,
}: {
  topic: GrammarTopic
  mascot: MascotElement
  mascotName: string
  onExplain: () => void
  onRoundDone?: (p: GrammarProgress) => void
}) {
  const list = topic.exercises
  const [i, setI] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [answered, setAnswered] = useState<Answered | null>(null)
  const [gaps, setGaps] = useState<string[]>([])
  const [picked, setPicked] = useState<number[]>([]) // índices de `words` en el orden elegido
  const [done, setDone] = useState<GrammarProgress | null>(null)
  const [saving, setSaving] = useState(false)
  // Semilla de la ronda: las opciones de «elegir» se barajan igual mientras dura la ronda y distinto en la siguiente.
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const ex: GrammarExercise | undefined = list[i]

  const answer = (ok: boolean, chosen?: number) => {
    if (!ex || answered) return
    setAnswered({ ok, chosen })
    setResults((r) => [...r, ok])
    recordAnswer(topic, ex, ok).catch(() => {})
  }

  const next = async () => {
    if (i + 1 < list.length) {
      setI(i + 1)
      setAnswered(null)
      setGaps([])
      setPicked([])
      return
    }
    setSaving(true)
    const correct = results.filter(Boolean).length
    try {
      const p = await finishRound(topic.id, correct, list.length)
      setDone(p)
      onRoundDone?.(p)
    } catch {
      // Sin base de datos (modo privado raro): la ronda se enseña igual, sin guardar.
      setDone({ id: topic.id, lastAt: Date.now(), correct, attempts: list.length, rounds: 1, mastered: false, lastRound: { correct, total: list.length, at: Date.now() } })
    }
    setSaving(false)
  }

  const restart = () => {
    setI(0)
    setResults([])
    setAnswered(null)
    setGaps([])
    setPicked([])
    setDone(null)
    setSeed((x) => x + 1)
  }

  // ---- Resultado de la ronda
  if (done) {
    const correct = results.filter(Boolean).length
    const need = Math.ceil(MASTERY_RATIO * list.length - 1e-9)
    return (
      <div className="anim-up flex flex-col items-center gap-3 text-center">
        <Mascot element={mascot} size={110} mood={done.mastered ? 'happy' : 'idle'} />
        <div className="fs-24 font-semibold tracking-[-.4px]">{done.mastered ? '¡Tema dominado!' : '¡Ronda terminada!'}</div>
        <div className="fs-16">
          Acertaste <b>{correct}</b> de <b>{list.length}</b> a la primera.
        </div>
        <div className="txt-sub max-w-[340px] fs-13.5 leading-snug">
          {done.mastered
            ? 'Lo marco como dominado. Si en otra ronda bajas del 80 %, volverá a «visto» para que lo repases.'
            : `Para dominarlo necesitas ${need} de ${list.length} (80 %). Repasa la explicación y vuelve a intentarlo.`}
          {/* 5.10.1 (REG-A4-06): antes contaba solo las tarjetas NUEVAS («Los 2 que fallaste…» con 8 fallos): las repetidas ya estaban. */}
          {results.some((r) => !r) && ' Los ejercicios que fallaste están en tu Repaso.'}
        </div>
        <div className="mt-1 grid w-full grid-cols-2 gap-2">
          <button onClick={onExplain} className="glass h-[50px] rounded-[25px] fs-14.5 font-semibold">
            Ver la explicación
          </button>
          <button onClick={restart} className="btn-acc h-[50px] rounded-[25px] fs-14.5">
            Otra ronda
          </button>
        </div>
      </div>
    )
  }
  if (!ex) return null

  // 5.10.1 (REG-A3-06): si ordenaste bien con otra colocación válida (`alsoAccepted`), la frase que se enseña es la tuya.
  const sentence = fullSentence(ex, ex.type === 'order' && answered?.ok ? orderMatch(ex, picked.map((k) => ex.words[k])) : undefined)
  const choice = ex.type === 'choice' ? shuffleChoice(ex, seed) : null
  const canCheck =
    ex.type === 'gap' ? gapCount(ex.prompt) > 0 && Array.from({ length: gapCount(ex.prompt) }, (_, k) => (gaps[k] ?? '').trim()).every(Boolean) : ex.type === 'order' && picked.length === ex.words.length
  const check = () => {
    if (!canCheck) return
    if (ex.type === 'gap') answer(checkExercise(ex, Array.from({ length: gapCount(ex.prompt) }, (_, k) => gaps[k] ?? '')))
    else if (ex.type === 'order') answer(checkExercise(ex, picked.map((k) => ex.words[k])))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--gb)' }}>
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${((i + (answered ? 1 : 0)) / list.length) * 100}%`, background: 'var(--acc)' }} />
        </div>
        <span className="txt-sub fs-12.5 tabular-nums">
          {i + 1} de {list.length}
        </span>
      </div>

      <div key={ex.id} className="anim-in flex flex-col gap-3">
        <div className="txt-acc2 text-xs tracking-[1.2px] uppercase">
          {ex.type === 'choice' ? 'Elige la correcta' : ex.type === 'gap' ? 'Completa' : 'Ordena las palabras'}
        </div>

        {ex.type === 'choice' && (
          <>
            <Prompt text={ex.prompt} />
            <div className="grid gap-2">
              {choice!.options.map((o, k) => {
                const right = answered && k === choice!.answer
                const wrong = answered && k === answered.chosen && !answered.ok
                return (
                  <button
                    key={k}
                    onClick={() => answer(k === choice!.answer, k)}
                    disabled={!!answered}
                    className="glass flex min-h-[48px] items-center gap-2.5 rounded-[18px] px-4 py-2 text-left fs-15.5"
                    style={right ? { borderColor: OK, boxShadow: `inset 0 0 0 1.5px ${OK}` } : wrong ? { borderColor: BAD, boxShadow: `inset 0 0 0 1.5px ${BAD}` } : undefined}
                  >
                    <span className="min-w-0 flex-1 break-words">{o}</span>
                    {/* color por CSS (currentColor): var(--ok) no vale como atributo «stroke» del SVG */}
                    {right && <span className="flex" style={{ color: OK }}><Icon name="check" size={18} stroke={2.4} /></span>}
                    {wrong && <span className="flex" style={{ color: BAD }}><Icon name="close" size={18} stroke={2.4} /></span>}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {ex.type === 'gap' && (
          <>
            <div className="fs-19 leading-[2.2] font-medium break-words">
              {ex.prompt.split(/_{3,}/).map((p, k, arr) => (
                <Fragment key={k}>
                  {p}
                  {k < arr.length - 1 && (
                    <input
                      value={gaps[k] ?? ''}
                      onChange={(e) => setGaps((g) => Object.assign([...g], { [k]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && check()}
                      disabled={!!answered}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label={`Hueco ${k + 1}`}
                      className="input mx-1 inline-block h-[40px] w-[8.5em] max-w-[70vw] px-2.5 align-middle fs-16"
                      style={answered ? { borderColor: answered.ok ? OK : BAD } : undefined}
                    />
                  )}
                </Fragment>
              ))}
            </div>
          </>
        )}

        {ex.type === 'order' && (
          <>
            <div className="glass flex min-h-[56px] flex-wrap items-center gap-1.5 rounded-[18px] p-2" style={answered ? { borderColor: answered.ok ? OK : BAD } : undefined}>
              {picked.length === 0 && <span className="txt-sub px-2 fs-13.5">Toca las palabras en orden…</span>}
              {picked.map((k, pos) => (
                <button
                  key={`${k}-${pos}`}
                  onClick={() => setPicked((p) => p.filter((_, j) => j !== pos))}
                  disabled={!!answered}
                  className="btn-acc min-h-10 rounded-[14px] px-3 py-1.5 fs-15"
                >
                  {ex.words[k]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ex.words.map((w, k) =>
                picked.includes(k) ? null : (
                  <button key={k} onClick={() => setPicked((p) => [...p, k])} disabled={!!answered} className="field min-h-10 rounded-[14px] px-3 py-1.5 fs-15">
                    {w}
                  </button>
                ),
              )}
            </div>
          </>
        )}

        {answered ? (
          <div ref={showOnMount} className="anim-up flex scroll-mb-[120px] flex-col gap-2.5">
            <div className="flex items-start gap-2.5">
              <Mascot element={mascot} size={56} mood={answered.ok ? 'happy' : 'thinking'} />
              <div className="tip-bubble relative min-w-0 flex-1 rounded-[18px] px-3.5 py-2.5 fs-14 leading-snug">
                <div className="mb-1 flex items-center gap-1.5 font-semibold" style={{ color: answered.ok ? OK : BAD }}>
                  <Icon name={answered.ok ? 'check' : 'close'} size={16} stroke={2.4} />
                  {answered.ok ? '¡Correcto!' : 'Aún no'}
                </div>
                {!answered.ok && choice && answered.chosen !== undefined && choice.trapsEs[answered.chosen] && (
                  <div className="mb-1">
                    <b>«{choice.options[answered.chosen]}»</b>: {choice.trapsEs[answered.chosen]}
                  </div>
                )}
                {!answered.ok && ex.type === 'gap' && (
                  <div className="mb-1">
                    Era <b>{gapParts(ex).join(' … ')}</b>.
                  </div>
                )}
                <div>{ex.whyEs}</div>
                <div className="txt-sub mt-1 fs-11.5">— {mascotName}</div>
              </div>
            </div>
            <button onClick={() => toggleSpeak(sentence)} className="glass flex items-center gap-3 rounded-[20px] px-3.5 py-2.5 text-left">
              <span className="btn-acc grid h-9 w-9 flex-none place-items-center rounded-full">
                <SpeakIcon speakKey={sentence} size={16} />
              </span>
              <span className="min-w-0 flex-1 fs-15.5 font-semibold break-words">{sentence}</span>
            </button>
            {!answered.ok && <div className="txt-sub fs-12.5 leading-snug">Lo apunto en tu Repaso para que vuelva a salir.</div>}
            <button onClick={next} disabled={saving} className="btn-acc h-[52px] rounded-full fs-16">
              {i + 1 < list.length ? 'Siguiente' : 'Ver resultado'}
            </button>
          </div>
        ) : (
          ex.type !== 'choice' && (
            <button
              onClick={check}
              disabled={!canCheck}
              className="btn-acc h-[52px] rounded-full fs-16 transition-opacity"
              style={{ opacity: canCheck ? 1 : 0.45 }}
            >
              Comprobar
            </button>
          )
        )}
      </div>
    </div>
  )
}
