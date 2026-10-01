import { useState } from 'react'
import type { Lookup } from '../lib/db'
import { setSaved } from '../lib/lookup'
import { speak } from '../lib/tts'
import { Icon } from '../ui/icons'

/** Resultado de una consulta: significado en contexto, por qué, otros significados, registro, ejemplo. */
export default function LookupCard({ lookup, ttsRate, voiceIndex }: { lookup: Lookup; ttsRate: number; voiceIndex: number | null }) {
  const r = lookup.result
  const [saved, setSavedState] = useState(lookup.saved)

  const toggleSave = async () => {
    const next = !saved
    setSavedState(next)
    if (lookup.id) await setSaved(lookup.id, next)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="glass rounded-[24px] p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => speak(r.headword, ttsRate, voiceIndex)}
            className="btn-acc grid h-11 w-11 flex-none place-items-center rounded-full"
            aria-label="Escuchar la pronunciación"
          >
            <Icon name="speakerWave" size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[22px] leading-tight font-semibold">{r.headword}</div>
            <div className="txt-sub text-[13px]">
              {[r.ipa, r.partOfSpeech].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button
            onClick={toggleSave}
            className={`flex h-9 flex-none items-center gap-1.5 rounded-[18px] px-3 text-[13px] ${saved ? 'btn-acc' : 'field'}`}
          >
            <Icon name={saved ? 'check' : 'flag'} size={14} />
            {saved ? 'Guardada' : 'Guardar'}
          </button>
        </div>
        {r.translation && (
          <div className="mt-3 text-[19px] font-semibold" style={{ color: 'var(--acc)' }}>
            {r.translation}
          </div>
        )}
        {lookup.context && <div className="txt-sub mt-1 text-[13px] italic">"{lookup.context}"</div>}
        <p className="mt-2 text-[15px] leading-snug">{r.meaningEs}</p>
        {r.whyEs && (
          <p className="txt-sub mt-1.5 text-[13.5px] leading-snug">
            <b className="font-semibold">¿Por qué aquí? </b>
            {r.whyEs}
          </p>
        )}
      </div>

      {r.falseFriendEs && (
        <div className="rounded-[20px] px-4 py-3 text-[14px]" style={{ background: 'var(--acc)', color: 'var(--ink)' }}>
          <b>Ojo, falso amigo:</b> {r.falseFriendEs}
        </div>
      )}

      {r.exampleEn && (
        <button onClick={() => speak(r.exampleEn, ttsRate, voiceIndex)} className="glass rounded-[20px] px-4 py-3 text-left">
          <span className="txt-sub mb-0.5 flex items-center gap-1.5 text-xs">
            <Icon name="speaker" size={12} /> Ejemplo con este mismo sentido
          </span>
          <span className="block text-[15px]">{r.exampleEn}</span>
          <span className="txt-sub block text-[13px]">{r.exampleEs}</span>
        </button>
      )}

      {r.otherMeanings.length > 0 && (
        <div className="glass rounded-[20px] px-4 py-3">
          <div className="mb-1.5 text-sm font-semibold">Otros significados</div>
          <div className="flex flex-col gap-2">
            {r.otherMeanings.map((m, i) => (
              <div key={i} className="text-[13.5px] leading-snug">
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
        <div className="glass rounded-[20px] px-4 py-3 text-[13.5px]">
          {r.register && (
            <div>
              <b className="font-semibold">Registro: </b>
              {r.register}
            </div>
          )}
          {r.collocations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.collocations.map((c) => (
                <button key={c} onClick={() => speak(c, ttsRate, voiceIndex)} className="field h-8 rounded-2xl px-2.5 text-[13px]">
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
