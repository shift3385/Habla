import { useEffect, useState, type ReactNode } from 'react'
import MouthDiagram from '../components/MouthDiagram'
import SpeakIcon from '../components/SpeakIcon'
import { useSoundData } from '../components/useSoundData'
import { STATE_STYLE } from '../lib/soundGame'
import { stopSoundAudio, toggleSound } from '../lib/soundAudio'
import { audioUrl, lessonFor, loadAudioCredits, markSoundSeen, stateOf, type Phoneme, type SoundCatalog, type SoundProgress } from '../lib/sounds'
import type { Settings } from '../lib/settings'
// 5.11 (boca): los dibujos solo se importan aquí (pantallas de Sonidos, chunk diferido con React.lazy), nunca en el arranque.
import * as MOUTH from '../sounds/mouth'
import { stopSpeakingIf, toggleSpeakSpanishUS, toggleSpeakUS, useSpeaking } from '../lib/tts'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO } from '../ui/theme'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass rounded-[22px] px-4 py-3">
      <div className="txt-acc2 mb-1.5 text-xs tracking-[1.2px] uppercase">{title}</div>
      {children}
    </div>
  )
}

/** Palabra con ▶/⏸ (voz americana). */
export function WordChip({ word, slow }: { word: string; slow?: boolean }) {
  const key = `w:${slow ? 'slow:' : ''}${word}`
  const on = useSpeaking(key)
  return (
    <button onClick={() => toggleSpeakUS(word, { key, slow })} aria-pressed={on} className="field flex min-h-10 items-center gap-1.5 rounded-[20px] px-3 py-1.5 fs-14.5 font-medium">
      <SpeakIcon speakKey={key} size={13} />
      {word}
    </button>
  )
}

/** Par mínimo: suenan las dos palabras seguidas (▶▶). */
export function PairChip({ a, b }: { a: string; b: string }) {
  const key = `pair:${a}/${b}`
  const on = useSpeaking(key)
  return (
    <button onClick={() => toggleSpeakUS([a, b], { key, gapMs: 500 })} aria-pressed={on} className="field flex min-h-10 items-center gap-1.5 rounded-[20px] px-3 py-1.5 fs-14.5">
      <SpeakIcon speakKey={key} size={13} />
      <b className="font-semibold">{a}</b>
      <span className="txt-sub">/</span>
      {b}
    </button>
  )
}

const LIPS: Record<string, string> = { spread: 'estirados', neutral: 'relajados', rounded: 'redondos' }
const POSITIONS: { key: 'initial' | 'medial' | 'final'; label: string }[] = [
  { key: 'initial', label: 'Al principio' },
  { key: 'medial', label: 'En medio' },
  { key: 'final', label: 'Al final' },
]

/**
 * 5.11 (S-08): ficha de un sonido (DISENO §7.2). Cabecera /θ/ con la palabra clave ▶ y 🐢▶ (lenta) y, si hay
 * grabación, «▶ sonido suelto»; la mascota explica el gesto (se puede escuchar: el español con voz española y el inglés
 * con la americana); labios, lengua y voz; comparación con el español y error típico; ejemplos por posición, grafías,
 * pares mínimos, nota británica y «Practicar». La voz es siempre americana (tts.ts › speakUS), aunque el profe sea Leo.
 * Abierta encima de una clase (hoja), no se ofrece «Practicar»: el micro es el de la clase.
 */
export default function SoundScreen({
  id,
  settings,
  onBack,
  onOpenSound,
  onOpenLesson,
  inClass,
  catalog,
}: {
  id: string
  settings: Settings
  onBack: () => void
  onOpenSound: (id: string) => void
  onOpenLesson?: (id: string) => void
  inClass?: boolean
  /** Solo para los tests (recorrido de las fichas con react-dom/server): el contenido ya cargado. */
  catalog?: SoundCatalog
}) {
  const data = useSoundData(catalog)
  const info = THEME_INFO[settings.theme]
  const [progress, setProgress] = useState<SoundProgress | undefined>()
  const explainKey = `explain:sound:${id}`
  const explaining = useSpeaking(explainKey)
  const p: Phoneme | undefined = data?.phonemes.find((x) => x.id === id)
  // S-04: el sonido suelto, si lo hay (id del crédito → archivo de public/sounds/). Sin crédito, no hay botón.
  const [audio, setAudio] = useState<string | undefined>()
  useEffect(() => {
    if (!p?.audio) return
    loadAudioCredits()
      .then((cs) => {
        const c = cs.find((x) => x.id === p.audio)
        setAudio(c ? audioUrl(c) : undefined)
      })
      .catch(() => {})
  }, [p])

  useEffect(() => {
    if (!p) return
    markSoundSeen(p.id)
      .then(setProgress)
      .catch(() => {})
  }, [p])
  // Al salir de la ficha, no sigue sonando nada suyo (la explicación ni el sonido suelto).
  useEffect(
    () => () => {
      stopSpeakingIf(explainKey)
      stopSoundAudio()
    },
    [explainKey],
  )

  const back = (
    <button onClick={onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
      <Icon name="back" size={20} stroke={1.8} />
    </button>
  )
  if (!data) return <div className="txt-sub p-5 text-center text-sm">Cargando…</div>
  if (!p) {
    return (
      <div className="anim-in flex flex-col gap-3">
        {back}
        <div className="glass txt-sub rounded-[22px] p-5 text-center text-sm">Este sonido ya no existe.</div>
      </div>
    )
  }
  const lesson = lessonFor(data.lessons, p.id)
  const st = STATE_STYLE[stateOf(progress)]
  const a = p.articulation ?? {}
  const voice = p.voiced === true ? 'Con voz: la garganta vibra' : p.voiced === false ? 'Sin voz: solo aire' : undefined
  const lipsText = a.lipsEs ?? (a.lips ? LIPS[a.lips] : '—')
  const tongueText = a.tongueEs ?? '—'
  const voiceText = a.voiceEs ?? voice ?? '—'
  const related = (p.related ?? []).map((r) => data.phonemes.find((x) => x.id === r)).filter((x): x is Phoneme => !!x)
  const slowKey = `w:slow:${p.keyword}`
  const soundKey = `sound:${p.id}`

  return (
    <div key={p.id} className="anim-in flex flex-col gap-3">
      <div className="flex min-h-[54px] items-center gap-3">
        {back}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="fs-27 leading-tight font-semibold tracking-[-.4px]">/{p.ipa}/</span>
            <span className="fs-18 font-medium">{p.keyword}</span>
          </div>
          <div className="txt-sub fs-13 leading-tight break-words">{p.nameEs}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <SpeakBtn label={p.keyword} speakKey={`w:${p.keyword}`} onClick={() => toggleSpeakUS(p.keyword, { key: `w:${p.keyword}` })} />
        <SpeakBtn label="Lenta" icon="🐢" speakKey={slowKey} onClick={() => toggleSpeakUS(p.keyword, { key: slowKey, slow: true })} />
        {audio && <SpeakBtn label="Sonido suelto" speakKey={soundKey} onClick={() => toggleSound(audio, p.keyword, soundKey)} />}
        <span className="ml-auto flex h-[24px] items-center rounded-[12px] px-2 fs-11 font-semibold" style={{ border: `1px solid ${st.color}`, color: st.label === 'Nuevo' ? 'var(--sub)' : st.color }}>
          {st.label}
          {progress?.earOnly ? ' · de oído' : ''}
        </span>
      </div>

      {!!p.explanationEs?.length && (
        <div className="flex items-start gap-2.5">
          <Mascot element={info.mascot} size={60} mood="speaking" />
          <div className="tip-bubble relative min-w-0 flex-1 rounded-[20px] px-4 py-3 fs-14.5 leading-snug">
            <button
              type="button"
              onClick={() => toggleSpeakSpanishUS(p.explanationEs!.join(' '), explainKey)}
              className="txt-acc2 float-right -mt-1.5 -mr-2.5 ml-1 grid h-10 w-10 place-items-center rounded-full"
              aria-pressed={explaining}
              aria-label={explaining ? 'Parar la explicación' : 'Escuchar la explicación'}
            >
              <SpeakIcon speakKey={explainKey} size={17} stroke={1.8} />
            </button>
            {p.explanationEs.map((t, k) => (
              <p key={k} className={k ? 'mt-1.5' : ''}>
                {t}
              </p>
            ))}
            <div className="txt-sub mt-1.5 fs-11.5">— {info.mascotName}</div>
          </div>
        </div>
      )}

      {/* 5.11 (boca): con dibujo, el corte de perfil y la vista de frente sustituyen a los pictogramas; los textos de
          labios, lengua y voz siguen al lado del círculo de frente. Sin dibujo, los pictogramas de siempre. */}
      {MOUTH.MOUTH_BY_PHONEME[p.id] ? (
        <MouthDiagram phonemeId={p.id} data={MOUTH} ariaLabel={`Dibujo de la boca para /${p.ipa}/. Labios: ${lipsText}. Lengua: ${tongueText}. Voz: ${voiceText}.`}>
          <div className="flex flex-col gap-1">
            <MouthLine emoji="👄" title="Labios" text={lipsText} />
            <MouthLine emoji="👅" title="Lengua" text={tongueText} />
            <MouthLine emoji={p.voiced === false ? '🔇' : '🔊'} title="Voz" text={voiceText} />
          </div>
        </MouthDiagram>
      ) : (
        (a.lipsEs || a.tongueEs || voice || a.voiceEs) && (
          <div className="grid grid-cols-3 gap-1.5">
            <Picto emoji="👄" title="Labios" text={lipsText} />
            <Picto emoji="👅" title="Lengua" text={tongueText} />
            <Picto emoji={p.voiced === false ? '🔇' : '🔊'} title="Voz" text={voiceText} />
          </div>
        )
      )}

      {(p.spanishEs || p.mistakeEs) && (
        <Card title="Para quien habla español">
          {p.spanishEs && <p className="fs-14 leading-snug">{p.spanishEs}</p>}
          {p.mistakeEs && (
            <p className="mt-1.5 fs-14 leading-snug">
              <b style={{ color: 'var(--bad)' }}>Error típico:</b> {p.mistakeEs}
            </p>
          )}
        </Card>
      )}

      {p.examples && (
        <Card title="Ejemplos">
          <div className="flex flex-col gap-2">
            {POSITIONS.map(({ key, label }) =>
              p.examples?.[key]?.length ? (
                <div key={key}>
                  <div className="txt-sub mb-1 fs-12">{label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.examples[key]!.map((w) => (
                      <WordChip key={w} word={w} />
                    ))}
                  </div>
                </div>
              ) : null,
            )}
            {p.positionNoteEs && <div className="txt-acc2 fs-12.5 leading-snug">💡 {p.positionNoteEs}</div>}
          </div>
        </Card>
      )}

      {!!p.spellings?.length && (
        <Card title="Se escribe">
          <div className="flex flex-col gap-1">
            {p.spellings.map((s) => (
              <div key={s.pattern} className="fs-14 leading-snug break-words">
                <b className="txt-acc font-semibold">{s.pattern}</b>
                <span className="txt-sub"> · {s.examples.join(', ')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!!p.minimalPairs?.length && (
        <Card title="Pares mínimos">
          <div className="flex flex-col gap-2">
            {p.minimalPairs.map((mp) => {
              const other = data.phonemes.find((x) => x.id === mp.with)
              return (
                <div key={mp.with}>
                  <div className="txt-sub mb-1 fs-12">
                    /{p.ipa}/ o {other ? `/${other.ipa}/` : mp.with}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mp.pairs.slice(0, 6).map(([x, y]) => (
                      <PairChip key={`${x}/${y}`} a={x} b={y} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {!!p.sentences?.length && (
        <Card title="Frases">
          {p.sentences.map((s) => (
            <SentenceRow key={s.en} en={s.en} es={s.es} />
          ))}
        </Card>
      )}

      {p.ukNoteEs && (
        <div className="txt-sub px-1 fs-13 leading-snug">
          🇬🇧 <b className="font-semibold">En británico:</b> {p.ukNoteEs}
        </div>
      )}

      {related.length > 0 && (
        <Card title="Relacionados">
          <div className="flex flex-wrap gap-1.5">
            {related.map((r) => (
              <button key={r.id} onClick={() => onOpenSound(r.id)} className="field flex min-h-10 items-center gap-1 rounded-[20px] px-3 py-1.5 fs-14">
                <b className="font-semibold">/{r.ipa}/</b> {r.keyword}
                <Icon name="chevR" size={13} />
              </button>
            ))}
          </div>
        </Card>
      )}

      {!inClass && lesson && onOpenLesson && (
        <button onClick={() => onOpenLesson(lesson.id)} className="btn-acc flex min-h-[54px] items-center justify-center gap-2 rounded-full px-4 fs-16">
          <Icon name="mic" size={18} />
          Practicar · {lesson.minutes} min
        </button>
      )}
      {inClass && <div className="txt-sub px-1 text-center fs-12.5 leading-snug">Al terminar la clase, practícalo en la pestaña Sonidos del Inicio.</div>}
    </div>
  )
}

function SpeakBtn({ label, speakKey, onClick, icon }: { label: string; speakKey: string; onClick: () => void; icon?: string }) {
  const on = useSpeaking(speakKey)
  return (
    <button onClick={onClick} aria-pressed={on} className="field flex h-10 items-center gap-1.5 rounded-[20px] px-3 fs-14 font-semibold">
      {icon && <span aria-hidden>{icon}</span>}
      <SpeakIcon speakKey={speakKey} size={14} />
      {label}
    </button>
  )
}

function Picto({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="glass flex min-w-0 flex-col gap-0.5 rounded-[18px] px-2.5 py-2">
      <div className="flex items-center gap-1 fs-12 font-semibold">
        <span aria-hidden>{emoji}</span>
        {title}
      </div>
      <div className="txt-sub fs-12 leading-snug break-words">{text}</div>
    </div>
  )
}

/** 5.11 (boca): una línea de texto junto al dibujo (labios, lengua o voz). */
function MouthLine({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="fs-12.5 leading-snug break-words">
      <span aria-hidden>{emoji}</span> <b className="font-semibold">{title}:</b> <span className="txt-sub">{text}</span>
    </div>
  )
}

function SentenceRow({ en, es }: { en: string; es: string }) {
  const key = `w:${en}`
  const on = useSpeaking(key)
  return (
    <button onClick={() => toggleSpeakUS(en, { key })} aria-pressed={on} className="flex w-full items-start gap-2.5 py-1.5 text-left">
      <span className="field txt-acc2 mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full">
        <SpeakIcon speakKey={key} size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block fs-15 leading-snug font-medium break-words">{en}</span>
        <span className="txt-sub block fs-13 leading-snug break-words">{es}</span>
      </span>
    </button>
  )
}
