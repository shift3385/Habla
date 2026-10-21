import { useEffect, useRef, useState, type ReactNode } from 'react'
import GrammarExercises from '../components/GrammarExercises'
import GrammarSpeak from '../components/GrammarSpeak'
import { LevelChip, StatusChip } from '../components/GrammarTopicRow'
import SpeakIcon from '../components/SpeakIcon'
import type { GrammarProgress } from '../lib/db'
import { findTopic, sectionOf, type GrammarExample, type GrammarForm, type GrammarMistake } from '../lib/grammar'
import { markTopicSeen } from '../lib/grammarProgress'
import type { Settings } from '../lib/settings'
import { stopSpeakingIf, toggleSpeak, toggleSpeakSpanish, useSpeaking } from '../lib/tts'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import Segmented from '../ui/Segmented'
import { THEME_INFO } from '../ui/theme'

export type TopicPart = 'explain' | 'exercises' | 'speak'

/** Frase en inglés con ▶/⏸ (pieza común de la 5.9.1) y su traducción debajo. */
function ExampleRow({ e }: { e: GrammarExample }) {
  // 5.10.1 (REG-A4-07): el lector de pantalla sabe si suena (aria-pressed), no solo el icono.
  const on = useSpeaking(e.en)
  return (
    <button onClick={() => toggleSpeak(e.en)} aria-pressed={on} className="flex w-full items-start gap-2.5 py-1.5 text-left">
      <span className="field txt-acc2 mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full">
        <SpeakIcon speakKey={e.en} size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block fs-15 leading-snug font-medium break-words">{e.en}</span>
        <span className="txt-sub block fs-13 leading-snug break-words">{e.es}</span>
        {e.noteEs && <span className="txt-acc2 mt-0.5 block fs-12.5 leading-snug break-words">💡 {e.noteEs}</span>}
      </span>
    </button>
  )
}

/** Un error típico: lo incorrecto tachado y la forma correcta con ▶/⏸. */
function MistakeRow({ m }: { m: GrammarMistake }) {
  const on = useSpeaking(m.right)
  return (
    <div className="fs-14 leading-snug">
      {/* 5.10.1 (REG-A4-03): verde y rojo del tema (legibles también en claro). */}
      <div className="flex items-start gap-1.5 break-words" style={{ color: 'var(--bad)' }}>
        <Icon name="close" size={15} stroke={2.4} className="mt-0.5 flex-none" />
        <span className="line-through decoration-1">{m.wrong}</span>
      </div>
      {/* 5.10.1 (REG-A4-05/07): toque de 40 px de alto y aria-pressed. */}
      <button
        onClick={() => toggleSpeak(m.right)}
        aria-pressed={on}
        className="flex min-h-10 items-start gap-1.5 py-1.5 text-left font-semibold break-words"
        style={{ color: 'var(--ok)' }}
      >
        <Icon name="check" size={15} stroke={2.4} className="mt-0.5 flex-none" />
        <span>{m.right}</span>
        <SpeakIcon speakKey={m.right} size={14} className="mt-0.5 flex-none" />
      </button>
      <div className="txt-sub fs-13">{m.whyEs}</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass rounded-[22px] px-4 py-3">
      <div className="txt-acc2 mb-1.5 text-xs tracking-[1.2px] uppercase">{title}</div>
      {children}
    </div>
  )
}

const FORMS: { key: keyof NonNullable<ReturnType<typeof findTopic>>['forms']; label: string; mark: string }[] = [
  { key: 'affirmative', label: 'Afirmativa', mark: '+' },
  { key: 'negative', label: 'Negativa', mark: '−' },
  { key: 'question', label: 'Pregunta', mark: '?' },
]

/**
 * v5.10: un tema de Gramática. «Explícame» (la mascota explica, fórmulas, ejemplos con ▶/⏸, errores típicos y temas
 * relacionados), «Ejercicios» y «Dilo tú» (D2), más «Pregúntale a <mascota>» y «Practicar en una clase» (D3).
 * Abierto desde una clase (hoja de Gramática), no se ofrecen «Dilo tú» ni otra clase: el micro es de la clase.
 */
export default function GrammarTopicScreen({
  id,
  settings,
  update,
  initialPart = 'explain',
  onBack,
  onOpenTopic,
  onAsk,
  onPracticeClass,
  inClass,
}: {
  id: string
  settings: Settings
  update: (p: Partial<Settings>) => void
  initialPart?: TopicPart
  onBack: () => void
  onOpenTopic: (id: string) => void
  onAsk?: () => void
  onPracticeClass?: () => void
  inClass?: boolean
}) {
  const topic = findTopic(id)
  const info = THEME_INFO[settings.theme]
  const [part, setPartRaw] = useState<TopicPart>(initialPart)
  const [progress, setProgress] = useState<GrammarProgress | undefined>()
  const top = useRef<HTMLDivElement>(null)

  // 5.10.1 (REG-M-07, REG-A1-05): la explicación (1–2 min) deja de sonar al cambiar de parte (Ejercicios, Dilo tú) y al
  // salir del tema por cualquier camino (Atrás, un relacionado, «Pregúntale», «Practicar en una clase», cerrar la hoja):
  // todos desmontan esta pantalla. Solo se para la explicación: el profe de una clase que hay debajo de la hoja, no.
  const explainKey = `explain:${id}`
  const setPart = (p: TopicPart) => {
    if (p !== 'explain') stopSpeakingIf(explainKey)
    setPartRaw(p)
  }
  useEffect(() => () => void stopSpeakingIf(explainKey), [explainKey])
  // Al salir por un botón se para ya, sin esperar al desmontaje: «Practicar en una clase» puede abrir antes un aviso.
  const leave = (go?: () => void) => {
    stopSpeakingIf(explainKey)
    go?.()
  }
  // …y mientras suena, si el ▶ del globo se va de la vista al bajar, queda un ⏸ flotante abajo para pararla.
  const explaining = useSpeaking(explainKey)
  const explainBtn = useRef<HTMLButtonElement>(null)
  const [btnInView, setBtnInView] = useState(true)
  useEffect(() => {
    const el = explainBtn.current
    if (!explaining || !el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => {
      setBtnInView(e.isIntersecting)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      setBtnInView(true)
    }
  }, [explaining, part, id])

  // Abrir el tema lo marca como visto. Al saltar a un relacionado, se vuelve arriba y a «Explícame».
  useEffect(() => {
    if (!findTopic(id)) return
    markTopicSeen(id)
      .then(setProgress)
      .catch(() => {})
  }, [id])
  useEffect(() => {
    top.current?.closest('.tab-content')?.scrollTo({ top: 0 })
  }, [id, part])

  if (!topic) {
    return (
      <div className="anim-in flex flex-col gap-3">
        <button onClick={onBack} className="glass grid h-11 w-11 place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="glass txt-sub rounded-[22px] p-5 text-center text-sm">Este tema ya no existe.</div>
      </div>
    )
  }
  const section = sectionOf(topic.id)
  const related = topic.related.map((r) => findTopic(r)).filter((t) => !!t)

  return (
    <div ref={top} key={topic.id} className="anim-in flex flex-col gap-3">
      <div className="flex min-h-[54px] items-center gap-3">
        <button onClick={() => leave(onBack)} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="fs-22 leading-tight font-semibold tracking-[-.4px] break-words">{topic.name}</div>
          <div className="txt-sub fs-13 leading-tight break-words">
            {topic.nameEs}
            {section ? ` · ${section.titleEs}` : ''}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <LevelChip level={topic.level} />
        <StatusChip progress={progress} />
        {progress?.lastRound && (
          <span className="txt-sub fs-12">
            Última ronda: {progress.lastRound.correct}/{progress.lastRound.total}
          </span>
        )}
      </div>

      <Segmented
        value={part}
        onChange={setPart}
        options={[
          { value: 'explain', label: 'Explícame' },
          { value: 'exercises', label: 'Ejercicios', count: topic.exercises.length },
          ...(!inClass && topic.speaking.length ? [{ value: 'speak' as const, label: 'Dilo tú' }] : []),
        ]}
      />

      {part === 'explain' ? (
        <div key="explain" className="anim-up flex flex-col gap-3">
          {/* La mascota explica (patrón de los globos: ella a un lado, su globo al otro). */}
          <div className="flex items-start gap-2.5">
            <Mascot element={info.mascot} size={64} mood="speaking" />
            <div className="tip-bubble relative min-w-0 flex-1 rounded-[20px] px-4 py-3 fs-14.5 leading-snug">
              {/* v5.10 (P4, uso real): la explicación también se puede escuchar (en español). */}
              <button
                ref={explainBtn}
                type="button"
                onClick={() => toggleSpeakSpanish([topic.summaryEs, ...topic.explanationEs].join(' '), explainKey)}
                className="txt-acc2 float-right -mt-1.5 -mr-2.5 ml-1 grid h-10 w-10 place-items-center rounded-full"
                aria-pressed={explaining}
                aria-label={explaining ? 'Parar la explicación' : 'Escuchar la explicación'}
                title="Escúchala"
              >
                <SpeakIcon speakKey={explainKey} size={17} stroke={1.8} />
              </button>
              <div className="mb-1.5 font-semibold">{topic.summaryEs}</div>
              {topic.explanationEs.map((p, k) => (
                <p key={k} className={k ? 'mt-1.5' : ''}>
                  {p}
                </p>
              ))}
              <div className="txt-sub mt-1.5 fs-11.5">— {info.mascotName}</div>
            </div>
          </div>

          {FORMS.some((f) => topic.forms[f.key]) && (
            <Card title="Cómo se forma">
              <div className="flex flex-col gap-2.5">
                {FORMS.map(({ key, label, mark }) => {
                  const f: GrammarForm | null = topic.forms[key]
                  if (!f) return null
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 fs-13.5 font-semibold">
                        <span className="btn-acc grid h-6 w-6 flex-none place-items-center rounded-full fs-14 leading-none">{mark}</span>
                        {label}
                      </div>
                      <div className="field mt-1 rounded-[14px] px-3 py-2 fs-14 leading-snug font-medium break-words">{f.pattern}</div>
                      {f.examples.map((e) => (
                        <ExampleRow key={e.en} e={e} />
                      ))}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          <Card title="Ejemplos">
            {topic.examples.map((e) => (
              <ExampleRow key={e.en} e={e} />
            ))}
          </Card>

          {topic.commonMistakes.length > 0 && (
            <Card title="Errores típicos">
              <div className="flex flex-col gap-2.5">
                {topic.commonMistakes.map((m) => (
                  <MistakeRow key={m.wrong} m={m} />
                ))}
              </div>
            </Card>
          )}

          {related.length > 0 && (
            <Card title="Relacionado">
              <div className="flex flex-wrap gap-1.5">
                {related.map((t) => (
                  <button key={t.id} onClick={() => leave(() => onOpenTopic(t.id))} className="field flex min-h-10 items-center gap-1 rounded-[20px] px-3 py-1.5 text-left fs-13">
                    {t.nameEs}
                    <Icon name="chevR" size={13} />
                  </button>
                ))}
              </div>
            </Card>
          )}

          <button onClick={() => setPart('exercises')} className="btn-acc flex h-[54px] items-center justify-center gap-2 rounded-full fs-16">
            <Icon name="pencil" size={18} />
            Hacer los ejercicios
          </button>
          {(onAsk || (onPracticeClass && !inClass)) && (
            <div className="grid grid-cols-2 gap-2">
              {onAsk && (
                <button onClick={() => leave(onAsk)} className={`glass flex min-h-[50px] items-center justify-center gap-2 rounded-[25px] px-3 fs-14 font-semibold ${onPracticeClass && !inClass ? '' : 'col-span-2'}`}>
                  <Icon name="bubble" size={17} />
                  Pregúntale a {info.mascotName}
                </button>
              )}
              {onPracticeClass && !inClass && (
                <button onClick={() => leave(onPracticeClass)} className={`glass flex min-h-[50px] items-center justify-center gap-2 rounded-[25px] px-3 fs-14 font-semibold ${onAsk ? '' : 'col-span-2'}`}>
                  <Icon name="mic" size={17} />
                  Practicar en una clase
                </button>
              )}
            </div>
          )}
          {explaining && !btnInView && (
            // 5.10.1 (REG-M-07): ⏸ a la vista mientras suena la explicación (pegado abajo, encima de la barra de pestañas).
            // REV-D2-01: el sticky ya respeta el padding-bottom de .tab-content (el hueco de la barra): basta un margen fijo.
            <div className="pointer-events-none sticky z-[5] flex h-0 justify-center" style={{ bottom: 8 }}>
              <button
                type="button"
                onClick={() => stopSpeakingIf(explainKey)}
                className="btn-acc anim-up pointer-events-auto flex h-11 -translate-y-full items-center gap-2 rounded-full px-4 fs-14 font-semibold shadow-lg"
                aria-label="Parar la explicación"
              >
                <SpeakIcon speakKey={explainKey} size={16} stroke={1.8} />
                Parar la explicación
              </button>
            </div>
          )}
        </div>
      ) : part === 'speak' ? (
        <div key="speak" className="anim-up">
          <GrammarSpeak topic={topic} settings={settings} update={update} />
        </div>
      ) : (
        <div key="exercises" className="anim-up">
          <GrammarExercises
            topic={topic}
            mascot={info.mascot}
            mascotName={info.mascotName}
            onExplain={() => setPart('explain')}
            onRoundDone={setProgress}
          />
        </div>
      )}
    </div>
  )
}
