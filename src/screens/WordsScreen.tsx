import { useEffect, useState } from 'react'
import LookupCard from '../components/LookupCard'
import { db, type Lookup } from '../lib/db'
import { lookupWord } from '../lib/lookup'
import { getProfile } from '../lib/profile'
import type { Settings } from '../lib/settings'
import { Icon } from '../ui/icons'
import Segmented from '../ui/Segmented'

interface Props {
  settings: Settings
  registerBack: (h: (() => void) | null) => void
}

/** Consultas de palabras en contexto: escribe la palabra y, si puedes, la frase donde la viste. */
export default function WordsScreen({ settings, registerBack }: Props) {
  const [query, setQuery] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [current, setCurrent] = useState<Lookup | null>(null)
  const [history, setHistory] = useState<Lookup[]>([])
  const [seg, setSeg] = useState<'all' | 'saved'>('all')
  const [level, setLevel] = useState('B1')

  const reload = () =>
    db.lookups
      .orderBy('createdAt')
      .reverse()
      .limit(60)
      .toArray()
      .then(setHistory)

  useEffect(() => {
    reload()
    getProfile().then((p) => setLevel(p.levels.overall))
  }, [])

  // Atrás (Android) desde un resultado vuelve a la lista.
  useEffect(() => {
    registerBack(current ? () => (setCurrent(null), reload()) : null)
    return () => registerBack(null)
  }, [current, registerBack])

  const ask = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const l = await lookupWord(
        settings.geminiKey,
        { primary: settings.geminiModel, fallback: settings.geminiFallbackModel },
        query,
        context,
        level,
        ({ attempt, total }) => setHint(`Gemini está saturado, reintentando (${attempt}/${total})…`),
      )
      setCurrent(l)
      setQuery('')
      setContext('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
      setHint(null)
    }
  }

  if (current) {
    return (
      <div className="anim-in flex flex-col gap-3">
        <div className="flex h-[54px] items-center gap-3">
          <button
            onClick={() => {
              setCurrent(null)
              reload()
            }}
            className="glass grid h-11 w-11 flex-none place-items-center rounded-full"
            aria-label="Atrás"
          >
            <Icon name="back" size={20} stroke={1.8} />
          </button>
          <div className="text-2xl font-semibold tracking-[-.4px]">Palabras</div>
        </div>
        <LookupCard lookup={current} ttsRate={settings.ttsRate} voiceIndex={settings.voiceIndex} />
      </div>
    )
  }

  const list = seg === 'saved' ? history.filter((h) => h.saved) : history

  return (
    <div className="anim-up flex flex-col gap-3">
      <div className="flex h-[54px] items-center text-[28px] font-semibold tracking-[-.6px]">Palabras</div>
      <div className="glass rounded-[28px] p-4">
        <div className="txt-sub text-[13px] leading-snug">
          No es un traductor literal: te explica qué significa <b>en la frase donde la viste</b>. También al revés: escribe una palabra en español y te dice cómo se diría en inglés ahí.
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder='Palabra o expresión (p. ej. "run into")'
          className="input mt-3"
          autoCapitalize="none"
        />
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="¿En qué frase la viste? (opcional, pero mejora mucho la respuesta)"
          rows={2}
          className="input mt-2 h-auto resize-none py-3 leading-snug"
        />
        <button onClick={ask} disabled={!query.trim() || loading} className="btn-acc mt-2.5 h-[50px] w-full rounded-[25px] text-[15px]">
          {loading ? 'Consultando…' : 'Consultar'}
        </button>
        {hint && <p className="txt-sub mt-2 text-[13px]">{hint}</p>}
        {error && (
          <p className="mt-2 text-sm" style={{ color: '#f87171' }}>
            {error}
          </p>
        )}
        <p className="txt-sub mt-2.5 text-[12px] leading-snug">Consejo: en una clase, toca cualquier palabra del profe para consultarla al momento.</p>
      </div>

      {history.length > 0 && (
        <>
          <Segmented
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'all', label: 'Historial', count: history.length },
              { value: 'saved', label: 'Guardadas', count: history.filter((h) => h.saved).length },
            ]}
          />
          <div className="flex flex-col gap-2">
            {list.map((h) => (
              <button key={h.id} onClick={() => setCurrent(h)} className="glass flex items-center gap-3 rounded-[22px] px-4 py-2.5 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {h.result.headword} <span className="txt-sub font-normal">· {h.result.translation}</span>
                  </span>
                  {h.context && <span className="txt-sub block truncate text-[12.5px] italic">"{h.context}"</span>}
                </span>
                {h.saved && (
                  <span className="txt-acc2">
                    <Icon name="flag" size={15} />
                  </span>
                )}
                <Icon name="chevR" size={16} color="var(--sub)" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
