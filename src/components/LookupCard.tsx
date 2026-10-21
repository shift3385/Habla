import { useState } from 'react'
import type { Lookup } from '../lib/db'
import { setSaved } from '../lib/lookup'
import { relatedWords, type LookupRelation } from '../lib/lookupStack'
import { speak, toggleSpeak } from '../lib/tts'
import { Icon } from '../ui/icons'
import SpeakIcon from './SpeakIcon'

interface Props {
  lookup: Lookup
  ttsRate: number
  voiceIndex: number | null
  /** v5.10: tocar un sinónimo/antónimo abre su consulta en la misma vista (pila de LookupStack). */
  onRelated?: (word: string, kind: LookupRelation['kind']) => void
  onSavedChange?: (saved: boolean) => void
}

/** Resultado de una consulta: significado en contexto, por qué, otros significados, registro, ejemplo. */
export default function LookupCard({ lookup, ttsRate, voiceIndex, onRelated, onSavedChange }: Props) {
  const r = lookup.result
  const [saved, setSavedState] = useState(lookup.saved)
  // Las consultas guardadas antes de la 5.10 no traen sinónimos ni antónimos: entonces no se pinta la sección.
  const synonyms = relatedWords(r.synonyms, r.headword)
  const antonyms = relatedWords(r.antonyms, r.headword)

  const toggleSave = async () => {
    const next = !saved
    setSavedState(next)
    onSavedChange?.(next)
    if (lookup.id) await setSaved(lookup.id, next)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="glass rounded-[24px] p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleSpeak(r.headword, ttsRate, voiceIndex)}
            className="btn-acc grid h-11 w-11 flex-none place-items-center rounded-full"
            aria-label="Escuchar la pronunciación"
          >
            <SpeakIcon speakKey={r.headword} name="speakerWave" size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="fs-22 leading-tight font-semibold break-words">{r.headword}</div>
            <div className="txt-sub fs-13">
              {[r.ipa, r.partOfSpeech].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button
            onClick={toggleSave}
            className={`flex h-9 flex-none items-center gap-1.5 rounded-[18px] px-3 fs-13 ${saved ? 'btn-acc' : 'field'}`}
          >
            <Icon name={saved ? 'check' : 'flag'} size={14} />
            {saved ? 'Guardada' : 'Guardar'}
          </button>
        </div>
        {r.translation && (
          <div className="mt-3 fs-19 font-semibold" style={{ color: 'var(--acc)' }}>
            {r.translation}
          </div>
        )}
        {lookup.context && <div className="txt-sub mt-1 fs-13 italic">"{lookup.context}"</div>}
        <p className="mt-2 fs-15 leading-snug">{r.meaningEs}</p>
        {r.whyEs && (
          <p className="txt-sub mt-1.5 fs-13.5 leading-snug">
            <b className="font-semibold">¿Por qué aquí? </b>
            {r.whyEs}
          </p>
        )}
      </div>

      {r.falseFriendEs && (
        <div className="rounded-[20px] px-4 py-3 fs-14" style={{ background: 'var(--acc)', color: 'var(--ink)' }}>
          <b>Ojo, falso amigo:</b> {r.falseFriendEs}
        </div>
      )}

      {r.exampleEn && (
        <button onClick={() => toggleSpeak(r.exampleEn, ttsRate, voiceIndex)} className="glass rounded-[20px] px-4 py-3 text-left">
          <span className="txt-sub mb-0.5 flex items-center gap-1.5 text-xs">
            <SpeakIcon speakKey={r.exampleEn} size={12} /> Ejemplo con este mismo sentido
          </span>
          <span className="block fs-15">{r.exampleEn}</span>
          <span className="txt-sub block fs-13">{r.exampleEs}</span>
        </button>
      )}

      {synonyms.length > 0 && (
        <RelatedWords title="Sinónimos" words={synonyms} kind="synonym" onOpen={onRelated} ttsRate={ttsRate} voiceIndex={voiceIndex} />
      )}
      {antonyms.length > 0 && (
        <RelatedWords title="Antónimos" words={antonyms} kind="antonym" onOpen={onRelated} ttsRate={ttsRate} voiceIndex={voiceIndex} />
      )}

      {r.otherMeanings.length > 0 && (
        <div className="glass rounded-[20px] px-4 py-3">
          <div className="mb-1.5 text-sm font-semibold">Otros significados</div>
          <div className="flex flex-col gap-2">
            {r.otherMeanings.map((m, i) => (
              <div key={i} className="fs-13.5 leading-snug">
                <div>{m.meaningEs}</div>
                <div className="txt-sub">
                  {m.exampleEn} — {m.exampleEs}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(r.register || r.collocations.length > 0) && (
        <div className="glass rounded-[20px] px-4 py-3 fs-13.5">
          {r.register && (
            <div>
              <b className="font-semibold">Registro: </b>
              {r.register}
            </div>
          )}
          {r.collocations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.collocations.map((c) => (
                <button key={c} onClick={() => speak(c, ttsRate, voiceIndex)} className="field min-h-8 max-w-full rounded-2xl px-2.5 py-1 text-left fs-13 break-words">
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * v5.10 (punto 3): chips de sinónimos o antónimos. Cada chip tiene dos zonas: el texto abre su consulta (con el contexto
 * de la palabra original) y ▶/⏸ lee la palabra con la voz común (toggleSpeak + SpeakIcon, como el resto de la app).
 */
function RelatedWords({
  title,
  words,
  kind,
  onOpen,
  ttsRate,
  voiceIndex,
}: {
  title: string
  words: string[]
  kind: LookupRelation['kind']
  onOpen?: (word: string, kind: LookupRelation['kind']) => void
  ttsRate: number
  voiceIndex: number | null
}) {
  return (
    <div className="glass rounded-[20px] px-4 py-3">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {words.map((w) => (
          <span key={w} className="field flex min-h-9 max-w-full items-stretch overflow-hidden rounded-[18px] fs-13.5">
            <button
              onClick={() => onOpen?.(w, kind)}
              disabled={!onOpen}
              className="min-w-0 py-1 pr-1.5 pl-3 text-left break-words"
              aria-label={`Consultar ${w}`}
            >
              {w}
            </button>
            <button
              onClick={() => toggleSpeak(w, ttsRate, voiceIndex)}
              className="txt-acc2 grid w-9 flex-none place-items-center"
              aria-label={`Escuchar ${w}`}
            >
              <SpeakIcon speakKey={w} size={15} />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
