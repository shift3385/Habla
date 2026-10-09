import GrammarAskScreen from '../screens/GrammarAskScreen'
import GrammarSectionScreen from '../screens/GrammarSectionScreen'
import GrammarTopicScreen, { type TopicPart } from '../screens/GrammarTopicScreen'
import type { Settings } from '../lib/settings'

/** v5.10: pantallas de Gramática apiladas (Atrás vuelve a la anterior). Las usan el Inicio y la hoja de la clase. */
export type GramRoute =
  | { kind: 'section'; id: string }
  | { kind: 'topic'; id: string; part?: TopicPart }
  | { kind: 'ask'; topicId?: string; q?: string }

/** Pinta la pantalla de arriba de la pila. */
export default function GrammarRoutes({
  route,
  settings,
  update,
  level,
  push,
  pop,
  onPracticeClass,
  inClass,
}: {
  route: GramRoute
  settings: Settings
  update: (p: Partial<Settings>) => void
  level: string
  push: (r: GramRoute) => void
  pop: () => void
  /** «Practicar en una clase» (no se ofrece si no hay clave o si ya estás en una clase). */
  onPracticeClass?: (topicId: string) => void
  inClass?: boolean
}) {
  const openTopic = (id: string) => push({ kind: 'topic', id })
  if (route.kind === 'section') return <GrammarSectionScreen key={route.id} id={route.id} level={level} onBack={pop} onOpenTopic={openTopic} />
  if (route.kind === 'ask')
    return (
      <GrammarAskScreen
        key={`${route.topicId ?? ''}:${route.q ?? ''}`}
        settings={settings}
        level={level}
        topicId={route.topicId}
        initialQuestion={route.q}
        onBack={pop}
        onOpenTopic={openTopic}
      />
    )
  return (
    <GrammarTopicScreen
      key={route.id}
      id={route.id}
      settings={settings}
      update={update}
      initialPart={route.part}
      onBack={pop}
      onOpenTopic={openTopic}
      onAsk={() => push({ kind: 'ask', topicId: route.id })}
      onPracticeClass={onPracticeClass && !inClass ? () => onPracticeClass(route.id) : undefined}
      inClass={inClass}
    />
  )
}
