import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Alphabet, Phoneme, SoundExercise } from '../lib/sounds'
import { checkListen, checkOdd, checkSort, checkSpelling, listenRounds, normalizeSpelling, sayable, shuffle, spellOut, SPELL_GAP_MS } from '../lib/soundGame'
import { speakingKey } from '../lib/speaking'
import { speakUS, stopSpeaking, toggleSpeakUS, useSpeaking } from '../lib/tts'
import { Icon } from '../ui/icons'
import Mascot, { type MascotElement } from '../ui/Mascot'
import SpeakIcon from './SpeakIcon'

// 5.11 (S-10): ejercicios de escuchar y clasificar de Sonidos, todos por toques (nada de arrastrar en 320 px).
// Cada uno avisa al terminar con `onDone({ correct, total })`; la lección suma y guarda el progreso.

export interface ExerciseResult {
  correct: number
  total: number
}

interface Common {
  mascot: MascotElement
  mascotName: string
  onDone: (r: ExerciseResult) => void
}

const OK = 'var(--ok)'
const BAD = 'var(--bad)'
const showOnMount = (el: HTMLElement | null) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })

/** Globo de la mascota tras responder (acierto o fallo), con «Siguiente». */
function Feedback({ ok, mascot, mascotName, children, next, nextLabel = 'Siguiente' }: { ok: boolean; mascot: MascotElement; mascotName: string; children?: ReactNode; next: () => void; nextLabel?: string }) {
  return (
    <div ref={showOnMount} className="anim-up flex scroll-mb-[120px] flex-col gap-2.5">
      <div className="flex items-start gap-2.5">
        <Mascot element={mascot} size={52} mood={ok ? 'happy' : 'thinking'} />
        <div className="tip-bubble min-w-0 flex-1 rounded-[18px] px-3.5 py-2.5 fs-14 leading-snug">
          <div className="mb-0.5 flex items-center gap-1.5 font-semibold" style={{ color: ok ? OK : BAD }}>
            <Icon name={ok ? 'check' : 'close'} size={16} stroke={2.4} />
            {ok ? '¡Bien!' : 'Aún no'}
          </div>
          {children}
          <div className="txt-sub mt-1 fs-11.5">— {mascotName}</div>
        </div>
      </div>
      <button onClick={next} className="btn-acc h-[52px] rounded-full fs-16">
        {nextLabel}
      </button>
    </div>
  )
}

function Progress({ i, n }: { i: number; n: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--gb)' }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(i / Math.max(1, n)) * 100}%`, background: 'var(--acc)' }} />
      </div>
      <span className="txt-sub fs-12.5 tabular-nums">
        {Math.min(i + 1, n)} de {n}
      </span>
    </div>
  )
}

/** Botón grande «▶ Escuchar» (vuelve a sonar al tocarlo). */
function ListenButton({ speakKey, onClick, label = 'Escuchar otra vez' }: { speakKey: string; onClick: () => void; label?: string }) {
  const on = useSpeaking(speakKey)
  return (
    <button onClick={onClick} aria-pressed={on} className="glass mx-auto flex h-[64px] items-center gap-3 rounded-full pr-6 pl-2.5 fs-16 font-semibold">
      <span className="btn-acc grid h-[48px] w-[48px] place-items-center rounded-full">
        <SpeakIcon speakKey={speakKey} name="speakerWave" size={22} />
      </span>
      {label}
    </button>
  )
}

// ---- listen-choose ----

export function ListenChoose({ ex, seed, alphabet, ...c }: Common & { ex: Extract<SoundExercise, { type: 'listen-choose' }>; seed: number; alphabet?: Alphabet }) {
  const rounds = useMemo(() => listenRounds(ex.pairs, ex.rounds ?? 8, seed), [ex, seed])
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const round = rounds[i]
  const key = `listen:${ex.id}:${i}`
  // Cada ronda suena sola al aparecer (y se puede repetir).
  useEffect(() => {
    if (round) speakUS(sayable(round.word, ex.letters, alphabet), { key })
  }, [round, key, ex.letters, alphabet])
  useEffect(() => () => void stopSpeaking(), [])
  if (!round) return null
  const ok = chosen !== null && checkListen(round, chosen)
  const answer = (w: string) => {
    if (chosen !== null) return
    setChosen(w)
    if (checkListen(round, w)) setCorrect((n) => n + 1)
  }
  const next = () => {
    if (i + 1 >= rounds.length) return c.onDone({ correct, total: rounds.length })
    setChosen(null)
    setI(i + 1)
  }
  return (
    <div className="flex flex-col gap-3">
      <Progress i={i + (chosen ? 1 : 0)} n={rounds.length} />
      <div className="txt-acc2 text-xs tracking-[1.2px] uppercase">¿Cuál dijo?</div>
      <ListenButton speakKey={key} onClick={() => toggleSpeakUS(sayable(round.word, ex.letters, alphabet), { key })} />
      <div className={`grid gap-2 ${round.options.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {round.options.map((w) => {
          const right = chosen !== null && checkListen(round, w)
          const wrong = chosen === w && !right
          return (
            <button
              key={w}
              onClick={() => answer(w)}
              disabled={chosen !== null}
              className="glass flex min-h-[60px] items-center justify-center gap-1.5 rounded-[20px] px-2 fs-19 font-semibold break-words"
              style={right ? { borderColor: OK, boxShadow: `inset 0 0 0 1.5px ${OK}` } : wrong ? { borderColor: BAD, boxShadow: `inset 0 0 0 1.5px ${BAD}` } : undefined}
            >
              {w}
            </button>
          )
        })}
      </div>
      {chosen !== null && (
        <Feedback ok={ok} mascot={c.mascot} mascotName={c.mascotName} next={next} nextLabel={i + 1 < rounds.length ? 'Siguiente' : 'Terminar'}>
          {!ok && (
            <div>
              Era <b>{round.word}</b>; tú elegiste <b>{chosen}</b>. {ex.hintEs ?? 'Escúchalas otra vez:'}
              <PairPlay a={round.word} b={chosen} say={(w) => sayable(w, ex.letters, alphabet)} />
            </div>
          )}
        </Feedback>
      )}
    </div>
  )
}

function PairPlay({ a, b, say }: { a: string; b: string; say: (w: string) => string }) {
  const key = `pair:${a}/${b}`
  return (
    <button onClick={() => toggleSpeakUS([say(a), say(b)], { key, gapMs: 500 })} className="field mt-1.5 flex min-h-10 items-center gap-1.5 rounded-[20px] px-3 py-1.5 fs-14.5">
      <SpeakIcon speakKey={key} size={13} />
      <b className="font-semibold">{a}</b>
      <span className="txt-sub">/</span>
      <b className="font-semibold">{b}</b>
    </button>
  )
}

// ---- odd-one-out ----

export function OddOneOut({ ex, alphabet, ...c }: Common & { ex: Extract<SoundExercise, { type: 'odd-one-out' }>; alphabet?: Alphabet }) {
  const [chosen, setChosen] = useState<number | null>(null)
  const ok = chosen !== null && checkOdd(ex, chosen)
  return (
    <div className="flex flex-col gap-3">
      <div className="txt-acc2 text-xs tracking-[1.2px] uppercase">¿Cuál suena distinto?</div>
      <div className="txt-sub fs-13.5 leading-snug">Toca ▶ para oír cada palabra y elige la que tiene otro sonido.</div>
      <div className="grid gap-2">
        {ex.words.map((w, k) => {
          const right = chosen !== null && k === ex.answer
          const wrong = chosen === k && !right
          const key = `odd:${ex.id}:${w}`
          return (
            <div
              key={w}
              className="glass flex min-h-[52px] items-center gap-1 rounded-[20px] py-1 pr-1 pl-1"
              style={right ? { borderColor: OK, boxShadow: `inset 0 0 0 1.5px ${OK}` } : wrong ? { borderColor: BAD, boxShadow: `inset 0 0 0 1.5px ${BAD}` } : undefined}
            >
              <button onClick={() => toggleSpeakUS(sayable(w, ex.letters, alphabet), { key })} className="field txt-acc2 grid h-11 w-11 flex-none place-items-center rounded-full" aria-label={`Escuchar ${w}`}>
                <SpeakIcon speakKey={key} size={16} />
              </button>
              <button onClick={() => chosen === null && setChosen(k)} disabled={chosen !== null} className="flex min-h-11 min-w-0 flex-1 items-center px-2 text-left fs-17 font-semibold">
                {w}
              </button>
            </div>
          )
        })}
      </div>
      {chosen !== null && (
        <Feedback ok={ok} mascot={c.mascot} mascotName={c.mascotName} next={() => c.onDone({ correct: ok ? 1 : 0, total: 1 })}>
          {!ok && (
            <div>
              La distinta era <b>{ex.words[ex.answer]}</b>.
            </div>
          )}
          {ex.whyEs && <div>{ex.whyEs}</div>}
        </Feedback>
      )}
    </div>
  )
}

// ---- sort ----

export function Sort({ ex, phonemes, seed, alphabet, ...c }: Common & { ex: Extract<SoundExercise, { type: 'sort' }>; phonemes: Phoneme[]; seed: number; alphabet?: Alphabet }) {
  const words = useMemo(() => shuffle(ex.words, seed), [ex, seed])
  const [placed, setPlaced] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<ReturnType<typeof checkSort> | null>(null)
  const col = (id: string) => phonemes.find((p) => p.id === id)
  const all = words.every(([w]) => placed[w])
  // 3 columnas o etiquetas largas («/ɪd/ wanted»): los botones van debajo de la palabra (no caben al lado en 320 px).
  const wide = ex.columns.length > 2 || !!ex.columnLabels
  return (
    <div className="flex flex-col gap-3">
      <div className="txt-acc2 text-xs tracking-[1.2px] uppercase">Clasifica por su sonido</div>
      <div className="txt-sub fs-13.5 leading-snug">
        {ex.letters ? '¿Con qué sonido se dice el nombre de cada letra?' : '¿Qué sonido tiene cada palabra?'} Toca ▶ si quieres oírla.
      </div>
      <div className="grid gap-1.5">
        {words.map(([w, right]) => {
          const key = `sort:${ex.id}:${w}`
          const bad = checked && placed[w] !== right
          return (
            <div key={w} className={`glass flex min-h-[52px] items-center gap-1 rounded-[20px] py-1 pr-1 pl-1 ${wide ? 'flex-wrap' : ''}`} style={checked ? { borderColor: bad ? BAD : OK } : undefined}>
              <button onClick={() => toggleSpeakUS(sayable(w, ex.letters, alphabet), { key })} className="field txt-acc2 grid h-10 w-10 flex-none place-items-center rounded-full" aria-label={`Escuchar ${w}`}>
                <SpeakIcon speakKey={key} size={15} />
              </button>
              <span className="min-w-0 flex-1 truncate px-1.5 fs-16 font-semibold">{w}</span>
              <span className={wide ? 'grid w-full gap-1' : 'contents'} style={wide ? { gridTemplateColumns: `repeat(${ex.columns.length}, minmax(0, 1fr))` } : undefined}>
              {ex.columns.map((cid, ci) => {
                const on = placed[w] === cid
                const p = col(cid)
                return (
                  <button
                    key={cid}
                    onClick={() => !checked && setPlaced((x) => ({ ...x, [w]: cid }))}
                    disabled={!!checked}
                    aria-pressed={on}
                    className={`min-h-10 min-w-[52px] flex-none rounded-[16px] px-2 py-1 font-semibold ${wide ? 'fs-13 leading-tight' : 'fs-15'} ${on ? 'btn-acc' : 'field'}`}
                    style={checked && cid === right && !on ? { borderColor: OK, color: OK } : undefined}
                  >
                    {ex.columnLabels?.[ci] ?? `/${p?.ipa ?? cid}/`}
                  </button>
                )
              })}
              </span>
            </div>
          )
        })}
      </div>
      {checked ? (
        <Feedback ok={checked.ok} mascot={c.mascot} mascotName={c.mascotName} next={() => c.onDone({ correct: checked.correct, total: checked.total })}>
          <div>
            {checked.correct} de {checked.total} en su sitio.
            {!checked.ok && ` Las de borde rojo iban en ${ex.columns.length > 2 ? 'otra columna' : 'la otra columna'} (marcada en verde).`}
          </div>
        </Feedback>
      ) : (
        <button onClick={() => all && setChecked(checkSort(ex, placed))} disabled={!all} className="btn-acc h-[52px] rounded-full fs-16" style={{ opacity: all ? 1 : 0.45 }}>
          Comprobar
        </button>
      )}
    </div>
  )
}

// ---- spell-listen ----

export function SpellListen({ ex, alphabet, ...c }: Common & { ex: Extract<SoundExercise, { type: 'spell-listen' }>; alphabet?: Alphabet }) {
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState('')
  const [answered, setAnswered] = useState<boolean | null>(null)
  const [correct, setCorrect] = useState(0)
  const word = ex.items[i]
  const key = `spell:${ex.id}:${i}`
  const letters = useMemo(() => (word ? spellOut(word, alphabet) : []), [word, alphabet])
  const play = () => speakUS(letters, { key, gapMs: SPELL_GAP_MS })
  useEffect(() => {
    if (letters.length) speakUS(letters, { key, gapMs: SPELL_GAP_MS })
  }, [letters, key])
  useEffect(() => () => void stopSpeaking(), [])
  if (!word) return null
  const check = () => {
    if (answered !== null || !normalizeSpelling(typed)) return
    const ok = checkSpelling(word, typed)
    setAnswered(ok)
    if (ok) setCorrect((n) => n + 1)
  }
  const next = () => {
    if (i + 1 >= ex.items.length) return c.onDone({ correct, total: ex.items.length })
    setI(i + 1)
    setTyped('')
    setAnswered(null)
  }
  return (
    <div className="flex flex-col gap-3">
      <Progress i={i + (answered !== null ? 1 : 0)} n={ex.items.length} />
      <div className="txt-acc2 text-xs tracking-[1.2px] uppercase">Escucha el deletreo y escríbelo</div>
      {ex.hintEs && <div className="txt-sub fs-13.5 leading-snug">{ex.hintEs}</div>}
      <ListenButton speakKey={key} onClick={() => (speakingKey() === key ? stopSpeaking() : play())} />
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && check()}
        disabled={answered !== null}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Lo que oíste, letra a letra"
        placeholder="Escribe las letras"
        className="input text-center fs-20 font-semibold tracking-[3px] uppercase"
        style={answered !== null ? { borderColor: answered ? OK : BAD } : undefined}
      />
      {answered !== null ? (
        <Feedback ok={answered} mascot={c.mascot} mascotName={c.mascotName} next={next} nextLabel={i + 1 < ex.items.length ? 'Siguiente' : 'Terminar'}>
          {!answered && (
            <div>
              Era <b className="tracking-[2px]">{normalizeSpelling(word).split('').join('-')}</b>.
            </div>
          )}
        </Feedback>
      ) : (
        <button onClick={check} disabled={!normalizeSpelling(typed)} className="btn-acc h-[52px] rounded-full fs-16" style={{ opacity: normalizeSpelling(typed) ? 1 : 0.45 }}>
          Comprobar
        </button>
      )}
    </div>
  )
}

