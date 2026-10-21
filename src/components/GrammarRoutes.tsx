import { useEffect, useRef } from 'react'
import GrammarAskScreen from '../screens/GrammarAskScreen'
import GrammarSectionScreen from '../screens/GrammarSectionScreen'
import GrammarTopicScreen, { type TopicPart } from '../screens/GrammarTopicScreen'
import type { Settings } from '../lib/settings'

/** v5.10: pantallas de Gramática apiladas (Atrás vuelve a la anterior). Las usan el Inicio y la hoja de la clase. */
export type GramRoute =
  | { kind: 'section'; id: string }
  | { kind: 'topic'; id: string; part?: TopicPart }
  | { kind: 'ask'; topicId?: string; q?: string }

// 5.10.1 (REG-A4-09): altura a la que estabas en cada pantalla al apilar otra encima (tema → relacionado → Atrás vuelve
// a «Relacionado», no arriba del todo). La pila (Inicio u hoja) guarda los mismos objetos de ruta, así que basta con
// recordarla por objeto; se olvida sola al salir de la pila (WeakMap). Solo en memoria.
const scrollOf = new WeakMap<GramRoute, number>()

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
  const box = useRef<HTMLDivElement>(null)
  const scroller = () => box.current?.closest('.tab-content') ?? null
  const go = (r: GramRoute) => {
    const el = scroller()
    if (el) scrollOf.set(route, el.scrollTop)
    push(r)
  }
  // Al volver a una pantalla con altura guardada, se restaura. El tema sube arriba al montarse (su propio efecto), así
  // que se restaura en la siguiente vuelta del bucle, cuando ya han corrido todos los efectos del montaje.
  // REV-F-03: con StrictMode (npm run dev) React repite los efectos del tema recién montado DESPUÉS de este: restaurar
  // en el acto acababa en 1920 → 0. Tampoco se borra la altura aquí: se sobrescribe en el siguiente `go()` de esta
  // ruta y la ruta solo vuelve arriba tras un `go()` + Atrás, así que nunca se restaura una altura vieja.
  useEffect(() => {
    const y = scrollOf.get(route)
    if (y === undefined) return
    const t = setTimeout(() => scroller()?.scrollTo({ top: y }), 0)
    return () => clearTimeout(t)
  }, [route])

  const openTopic = (id: string) => go({ kind: 'topic', id })
  let screen
  if (route.kind === 'section') screen = <GrammarSectionScreen key={route.id} id={route.id} level={level} onBack={pop} onOpenTopic={openTopic} />
  else if (route.kind === 'ask')
    screen = (
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
  else
    screen = (
      <GrammarTopicScreen
        key={route.id}
        id={route.id}
        settings={settings}
        update={update}
        initialPart={route.part}
        onBack={pop}
        onOpenTopic={openTopic}
        onAsk={() => go({ kind: 'ask', topicId: route.id })}
        onPracticeClass={onPracticeClass && !inClass ? () => onPracticeClass(route.id) : undefined}
        inClass={inClass}
      />
    )
  // `contents`: el envoltorio no cuenta para el diseño; solo sirve para encontrar el contenedor que se desplaza.
  return (
    <div ref={box} className="contents">
      {screen}
    </div>
  )
}
