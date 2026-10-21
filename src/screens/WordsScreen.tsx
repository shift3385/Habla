import { useCallback, useEffect, useState } from 'react'
import LookupStack from '../components/LookupStack'
import { useLookupStack } from '../components/useLookupStack'
import { db, type Lookup, type SrsCard } from '../lib/db'
import { archivedCards, unarchiveCard } from '../lib/srs'
import { lookupWord } from '../lib/lookup'
import { getProfile } from '../lib/profile'
import { fastModels, type Settings } from '../lib/settings'
import { Icon } from '../ui/icons'
import Segmented from '../ui/Segmented'
import InfiniteList from '../components/InfiniteList'

interface Props {
  settings: Settings
  registerBack: (h: (() => void) | null) => void
}

/** Consultas de palabras en contexto: escribe la palabra y, si puedes, la frase donde la viste. */
export default function WordsScreen({ settings, registerBack }: Props) {
  const [query, setQuery] = useState('')
  const [context, setContext] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [current, setCurrent] = useState<Lookup | null>(null)
  const [history, setHistory] = useState<Lookup[]>([])
  const [seg, setSeg] = useState<'all' | 'saved' | 'known'>('all')
  // v5.9: frases del repaso marcadas «Ya me la sé» (se pueden volver a repasar).
  const [known, setKnown] = useState<SrsCard[]>([])
  const [level, setLevel] = useState('B1')

  const reload = useCallback(() => {
    db.lookups.orderBy('createdAt').reverse().limit(60).toArray().then(setHistory)
    archivedCards().then(setKnown)
  }, [])

  useEffect(() => {
    reload()
    getProfile().then((p) => setLevel(p.levels.overall))
  }, [reload])

  // Vuelve a la lista (y la recarga: los sinónimos/antónimos consultados entran en el Historial).
  const close = useCallback(() => {
    setCurrent(null)
    reload()
  }, [reload])

  const ask = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const l = await lookupWord(settings.geminiKey, fastModels(settings), query, context, level, ({ attempt, total }) =>
        setHint(`Gemini está saturado, reintentando (${attempt}/${total})…`),
      )
      setCurrent(l)
      setQuery('')
      setContext('')
      setShowContext(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
      setHint(null)
    }
  }

  if (current) {
    return <WordView key={current.id} root={current} settings={settings} level={level} registerBack={registerBack} onClose={close} />
  }

  const list = seg === 'saved' ? history.filter((h) => h.saved) : history

  return (
    <div className="anim-up flex flex-col gap-3">
      <div className="flex h-[54px] items-center fs-28 font-semibold tracking-[-.6px]">Palabras</div>
      {/* v5.10 (petición del dueño): buscador compacto. Una sola línea; la frase donde la viste se añade si la quieres y
          la explicación sale solo al tocar ⓘ. Así la lista de palabras tiene más sitio. */}
      <div className="glass min-w-0 rounded-[26px] p-2.5">
        <div className="flex items-center justify-between gap-2 pr-0.5 pl-2">
          <span className="txt-acc2 fs-11 tracking-[1.2px] uppercase">Buscador de palabras</span>
          <button onClick={() => setShowInfo((v) => !v)} className="txt-sub grid h-7 w-7 place-items-center rounded-full" aria-label="Cómo funciona">
            <Icon name="info" size={15} />
          </button>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="txt-sub pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
              <Icon name="search" size={16} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder="Palabra o expresión"
              className="input h-[46px] w-full min-w-0 pr-3 pl-10"
              autoCapitalize="none"
              enterKeyHint="search"
              aria-label="Palabra o expresión"
            />
          </div>
          <button
            onClick={ask}
            disabled={!query.trim() || loading}
            className="btn-acc grid h-[46px] w-[46px] flex-none place-items-center rounded-full"
            aria-label={loading ? 'Consultando…' : 'Consultar'}
          >
            <Icon name={loading ? 'spark' : 'arrowR'} size={18} stroke={2} />
          </button>
        </div>
        {showContext && (
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="¿En qué frase la viste? (mejora mucho la respuesta)"
            rows={2}
            autoFocus
            className="input mt-2 h-auto w-full min-w-0 resize-none py-3 leading-snug"
          />
        )}
        <div className="mt-1.5 flex items-center gap-2 px-1.5">
          <button
            onClick={() => {
              if (showContext) setContext('')
              setShowContext((v) => !v)
            }}
            className="txt-acc2 flex h-8 items-center gap-1 fs-13 font-medium"
          >
            <Icon name={showContext ? 'close' : 'pencil'} size={13} stroke={2} />
            {showContext ? 'Quitar la frase' : 'Añadir la frase donde la viste'}
          </button>
        </div>
        {showInfo && (
          <p className="txt-sub px-1.5 pb-1 fs-12.5 leading-snug">
            No es un traductor literal: te explica qué significa <b>en la frase donde la viste</b>. También al revés: escribe una palabra en
            español y te dice cómo se diría en inglés ahí. En una clase, toca cualquier palabra del profe para consultarla al momento.
          </p>
        )}
        {hint && <p className="txt-sub px-1.5 fs-13">{hint}</p>}
        {error && (
          <p className="px-1.5 text-sm" style={{ color: 'var(--bad)' }}>
            {error}
          </p>
        )}
      </div>

      {(history.length > 0 || known.length > 0) && (
        <>
          <Segmented
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'all', label: 'Historial', count: history.length },
              { value: 'saved', label: 'Guardadas', count: history.filter((h) => h.saved).length },
              ...(known.length ? [{ value: 'known' as const, label: 'Ya las sé', count: known.length }] : []),
            ]}
          />
          {seg === 'known' ? (
            <InfiniteList
              key="known"
              items={known}
              render={(c) => (
                <div key={c.id} className="glass flex items-center gap-3 rounded-[20px] px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block fs-15 leading-tight font-semibold break-words">{c.answerEn}</span>
                    <span className="txt-sub mt-0.5 line-clamp-2 block fs-12.5 leading-snug break-words">{c.promptEs}</span>
                  </span>
                  <button
                    onClick={async () => {
                      await unarchiveCard(c.id!)
                      if (known.length === 1) setSeg('all') // era la última: vuelve al historial
                      reload()
                    }}
                    className="field h-9 flex-none rounded-[18px] px-3 fs-12.5"
                  >
                    Repasar otra vez
                  </button>
                </div>
              )}
            />
          ) : list.length === 0 ? (
            <div className="glass txt-sub rounded-[22px] p-5 text-center text-sm">
              Aún no has guardado palabras. Ábrelas desde el Historial y toca «Guardar».
            </div>
          ) : (
            <InfiniteList
              key={seg}
              items={list}
              render={(h) => (
                <button key={h.id} onClick={() => setCurrent(h)} className="glass flex items-center gap-3 rounded-[20px] px-4 py-3 text-left">
                  {/* Palabra, traducción y frase en líneas propias: nada se sale de la tarjeta (NC-08). */}
                  <span className="min-w-0 flex-1">
                    <span className="block fs-15 leading-tight font-semibold break-words">{h.result.headword}</span>
                    <span className="txt-acc2 mt-0.5 line-clamp-2 block fs-13.5 leading-snug break-words">{h.result.translation}</span>
                    {h.context && <span className="txt-sub mt-1 line-clamp-2 block fs-12 leading-snug break-words italic">"{h.context}"</span>}
                  </span>
                  {h.saved && (
                    <span className="txt-acc2">
                      <Icon name="flag" size={15} />
                    </span>
                  )}
                  <Icon name="chevR" size={16} color="var(--sub)" />
                </button>
              )}
            />
          )}
        </>
      )}
    </div>
  )
}

/**
 * v5.10 (punto 3): una consulta abierta en Palabras, con su pila de sinónimos/antónimos. Atrás (Android) quita un paso
 * de la pila; con la palabra de partida arriba, vuelve a la lista. La flecha de la cabecera vuelve a la lista directamente.
 */
function WordView({
  root,
  settings,
  level,
  registerBack,
  onClose,
}: {
  root: Lookup
  settings: Settings
  level: string
  registerBack: (h: (() => void) | null) => void
  onClose: () => void
}) {
  const s = useLookupStack(root, { apiKey: settings.geminiKey, models: fastModels(settings), level })
  const { canPop, pop } = s

  useEffect(() => {
    registerBack(canPop ? pop : onClose)
    return () => registerBack(null)
  }, [canPop, pop, onClose, registerBack])

  return (
    <div className="anim-in flex flex-col gap-3">
      <div className="flex h-[54px] items-center gap-3">
        <button onClick={onClose} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="text-2xl font-semibold tracking-[-.4px]">Palabras</div>
      </div>
      <LookupStack s={s} ttsRate={settings.ttsRate} voiceIndex={settings.voiceIndex} />
    </div>
  )
}
