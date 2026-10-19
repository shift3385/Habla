import { useEffect, useMemo, useState } from 'react'
import type { GrammarProgress } from '../lib/db'
import { forYouTopics, grammarSections, masteredIn, searchTopics, sectionIcon, sectionOf, type ForYouSignals } from '../lib/grammar'
import { loadForYouSignals, loadGrammarProgress } from '../lib/grammarProgress'
import { Icon } from '../ui/icons'
import GrammarTopicRow from './GrammarTopicRow'
import InfiniteList from './InfiniteList'

/**
 * v5.10: pestaña «Gramática» del Inicio. Buscador arriba y la lista de secciones con scroll propio (InfiniteList, sin
 * scroll de página). Con texto en el buscador, la lista pasa a ser de temas. Sin fila «Para ti» (decisión del dueño: los
 * chips se veían cortados y quitaban sitio a la lista); los temas recomendados llevan su ⭐ en las listas.
 */
export default function GrammarPanel({
  level,
  query,
  onQuery,
  onOpenSection,
  onOpenTopic,
  onAsk,
  mascotName,
}: {
  level: string
  query: string
  onQuery: (q: string) => void
  onOpenSection: (id: string) => void
  onOpenTopic: (id: string) => void
  /** D2: «Pregúntale a <mascota>» con lo que escribiste en el buscador. */
  onAsk?: (q: string) => void
  mascotName?: string
}) {
  const [progress, setProgress] = useState<Record<string, GrammarProgress>>({})
  const [signals, setSignals] = useState<ForYouSignals>({})
  useEffect(() => {
    loadGrammarProgress()
      .then(setProgress)
      .catch(() => {})
    // D3: «Para ti» tiene en cuenta tus errores de clase y la lección del plan de hoy.
    loadForYouSignals()
      .then(setSignals)
      .catch(() => {})
  }, [])
  const sections = grammarSections()
  const forYou = useMemo(() => forYouTopics(level, progress, 6, signals), [level, progress, signals])
  const forYouIds = useMemo(() => new Set(forYou.map((t) => t.id)), [forYou])
  const results = useMemo(() => (query.trim() ? searchTopics(query) : null), [query])

  if (!sections.length) {
    return (
      <div className="glass txt-sub mt-3 rounded-[22px] p-5 text-center text-sm leading-snug">
        Aún no hay temas de gramática en esta versión.
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="relative">
        <span className="txt-sub pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
          <Icon name="search" size={16} />
        </span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar tema de gramática"
          className="input h-[44px] w-full min-w-0 pr-10 pl-10 text-[14.5px]"
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="search"
          aria-label="Buscar en Gramática"
        />
        {query && (
          <button
            onClick={() => onQuery('')}
            className="txt-sub absolute top-1/2 right-1.5 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full"
            aria-label="Borrar la búsqueda"
          >
            <Icon name="close" size={15} />
          </button>
        )}
      </div>

      {results && onAsk && (
        // D2: si el buscador no basta, la duda va a la mascota con lo que escribiste.
        <button onClick={() => onAsk(query.trim())} className="glass flex h-[44px] items-center gap-2.5 rounded-[22px] px-3 text-left">
          <span className="btn-acc grid h-8 w-8 flex-none place-items-center rounded-full">
            <Icon name="bubble" size={15} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px]">
            <b className="font-semibold">Pregúntale a {mascotName}</b>
            <span className="txt-sub"> · «{query.trim()}»</span>
          </span>
        </button>
      )}

      {results ? (
        results.length ? (
          <InfiniteList
            key={`q:${query}`}
            items={results}
            render={(t) => (
              <GrammarTopicRow
                key={t.id}
                topic={t}
                progress={progress[t.id]}
                forYou={forYouIds.has(t.id)}
                sectionTitle={sectionOf(t.id)?.titleEs}
                onOpen={() => onOpenTopic(t.id)}
              />
            )}
          />
        ) : (
          <div className="glass txt-sub rounded-[22px] p-5 text-center text-sm leading-snug">
            No encuentro «{query.trim()}». Prueba con otra palabra, en inglés o en español.
          </div>
        )
      ) : (
        <InfiniteList
          key="sections"
          items={sections}
          render={(s) => {
            const done = masteredIn(s, progress)
            return (
              <button key={s.id} onClick={() => onOpenSection(s.id)} className="glass flex items-center gap-3 rounded-[20px] py-2.5 pr-2.5 pl-2.5 text-left">
                <span className="field txt-acc2 grid h-10 w-10 flex-none place-items-center rounded-full">
                  <Icon name={sectionIcon(s.icon)} size={18} stroke={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-tight font-semibold break-words">{s.titleEs}</span>
                  <span className="txt-sub mt-0.5 block text-[12px] leading-tight">
                    {s.titleEn} · {s.topics.length} {s.topics.length === 1 ? 'tema' : 'temas'}
                    {done > 0 && (
                      <b className="font-semibold" style={{ color: '#22c58b' }}>
                        {' '}
                        · {done} ✓
                      </b>
                    )}
                  </span>
                </span>
                <Icon name="chevR" size={16} color="var(--sub)" />
              </button>
            )
          }}
        />
      )}
    </div>
  )
}
