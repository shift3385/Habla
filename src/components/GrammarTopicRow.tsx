import type { GrammarProgress } from '../lib/db'
import { topicStatus, type GrammarTopic, type TopicStatus } from '../lib/grammar'
import { toggleSpeak } from '../lib/tts'
import { Icon } from '../ui/icons'
import SpeakIcon from './SpeakIcon'

// v5.10 «Gramática»: piezas comunes de las listas de temas (sección, buscador, «Para ti»).

const STATUS: Record<TopicStatus, { label: string; color: string }> = {
  new: { label: 'Nuevo', color: 'var(--sub)' },
  seen: { label: 'Visto', color: 'var(--acc2)' },
  mastered: { label: 'Dominado', color: '#22c58b' },
}

export function LevelChip({ level }: { level: string }) {
  return (
    <span className="field flex h-[22px] flex-none items-center rounded-[11px] px-2 text-[11px] font-semibold tabular-nums" title="Nivel MCER">
      {level}
    </span>
  )
}

export function StatusChip({ progress }: { progress?: GrammarProgress }) {
  const s = topicStatus(progress)
  const { label, color } = STATUS[s]
  return (
    <span className="flex h-[22px] flex-none items-center gap-1 rounded-[11px] px-2 text-[11px] font-semibold" style={{ color, border: `1px solid ${color}` }}>
      {s === 'mastered' && <Icon name="check" size={11} stroke={2.4} />}
      {label}
    </span>
  )
}

/**
 * Fila de un tema: nombre técnico en inglés (título), nombre en español debajo, nivel, estado, ⭐ si es «para ti» y
 * ▶/⏸ con su primer ejemplo (pieza común de la 5.9.1). El ▶ es un botón aparte (no se anidan botones).
 */
export default function GrammarTopicRow({
  topic,
  progress,
  forYou,
  sectionTitle,
  onOpen,
}: {
  topic: GrammarTopic
  progress?: GrammarProgress
  forYou?: boolean
  sectionTitle?: string
  onOpen: () => void
}) {
  const sample = topic.examples[0]?.en
  return (
    <div className="glass flex items-center gap-2 rounded-[20px] py-2 pr-2 pl-3.5">
      <button onClick={onOpen} className="flex min-w-0 flex-1 flex-col gap-1 py-1 text-left">
        <span className="flex items-center gap-1.5">
          {forYou && <Icon name="star" size={13} color="var(--acc)" stroke={2} />}
          <span className="min-w-0 text-[15px] leading-tight font-semibold break-words">{topic.name}</span>
        </span>
        <span className="txt-sub text-[12.5px] leading-tight break-words">
          {topic.nameEs}
          {sectionTitle ? ` · ${sectionTitle}` : ''}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <LevelChip level={topic.level} />
          <StatusChip progress={progress} />
        </span>
      </button>
      {sample && (
        <button
          onClick={() => toggleSpeak(sample)}
          className="field txt-acc2 grid h-10 w-10 flex-none place-items-center rounded-full"
          aria-label={`Escuchar un ejemplo: ${sample}`}
          title={sample}
        >
          <SpeakIcon speakKey={sample} size={16} />
        </button>
      )}
      <button onClick={onOpen} className="txt-sub grid h-10 w-6 flex-none place-items-center" aria-label={`Abrir ${topic.name}`}>
        <Icon name="chevR" size={16} />
      </button>
    </div>
  )
}
