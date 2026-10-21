import { useEffect, useState } from 'react'
import { useSoundData } from '../components/useSoundData'
import SpeakIcon from '../components/SpeakIcon'
import type { Settings } from '../lib/settings'
import { stopSpeakingIf, toggleSpeakUS, useSpeaking } from '../lib/tts'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO } from '../ui/theme'

function Letter({ letter, tts, onPick }: { letter: string; tts: string; onPick: () => void }) {
  const key = `letter:${letter}`
  const on = useSpeaking(key)
  return (
    <button
      onClick={() => {
        onPick()
        toggleSpeakUS(tts, { key })
      }}
      aria-pressed={on}
      aria-label={`Letra ${letter}`}
      className="field relative grid h-[48px] min-w-[48px] place-items-center rounded-[16px] fs-20 font-semibold"
      style={on ? { borderColor: 'var(--acc)', boxShadow: 'inset 0 0 0 1px var(--acc)' } : undefined}
    >
      {letter}
      <span className="txt-acc2 absolute right-1 bottom-0.5">
        <SpeakIcon speakKey={key} size={10} />
      </span>
    </button>
  )
}

/**
 * 5.11 (S-09): el abecedario por familias de sonido (las letras que riman: A H J K con «ei», B C D E G P T V Z con «i»
 * larga…). Cada letra suena con su nombre (`ttsText`, F0-5) y con la voz americana. Debajo, las lecciones del abecedario.
 */
export default function AlphabetScreen({ settings, onBack, onOpenLesson }: { settings: Settings; onBack: () => void; onOpenLesson?: (id: string) => void }) {
  const data = useSoundData()
  const info = THEME_INFO[settings.theme]
  useEffect(() => () => void stopSpeakingIf('letter:', true), [])
  const letters = new Map((data?.alphabet.letters ?? []).map((l) => [l.letter, l]))
  // La última letra tocada: debajo de su grupo, cómo suena (al estilo español) y su trampa, si la tiene.
  const [sel, setSel] = useState<string | null>(null)
  const lessons = (data?.lessons ?? []).filter((l) => l.unit === 1).sort((a, b) => a.order - b.order)
  return (
    <div className="anim-in flex flex-col gap-3">
      <div className="flex min-h-[54px] items-center gap-3">
        <button onClick={onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="fs-22 leading-tight font-semibold tracking-[-.4px]">El abecedario</div>
          <div className="txt-sub fs-13 leading-tight">Las letras, agrupadas por cómo suenan</div>
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <Mascot element={info.mascot} size={56} mood="speaking" />
        <div className="tip-bubble min-w-0 flex-1 rounded-[20px] px-4 py-3 fs-14 leading-snug">
          En inglés las letras no se llaman como en español. Las de cada grupo riman: si te sabes una, te sabes todas. Toca una
          letra para oírla.
          <div className="txt-sub mt-1 fs-11.5">— {info.mascotName}</div>
        </div>
      </div>
      {data?.alphabet.families.map((f) => (
        <div key={f.id} className="glass rounded-[22px] px-3.5 py-3">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="txt-acc fs-17 font-semibold">/{f.ipa}/</span>
            <span className="txt-sub fs-13">Riman con {f.labelEs}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {f.letters.map((l) => (
              <Letter key={l} letter={l} tts={letters.get(l)?.ttsText ?? `${l}.`} onPick={() => setSel(l)} />
            ))}
          </div>
          {sel && f.letters.includes(sel) && letters.get(sel) && (
            <div className="anim-up mt-2 fs-13.5 leading-snug">
              <b className="font-semibold">{sel}</b> suena {letters.get(sel)!.soundsLikeEs}
              {letters.get(sel)!.trapEs && <span className="txt-sub"> · {letters.get(sel)!.trapEs}</span>}
            </div>
          )}
        </div>
      ))}
      {lessons.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="txt-acc2 px-1 text-xs tracking-[1.2px] uppercase">Lecciones del abecedario</div>
          {lessons.map((l) => (
            <button
              key={l.id}
              onClick={() => onOpenLesson?.(l.id)}
              disabled={!onOpenLesson}
              className="glass flex min-h-[52px] items-center gap-3 rounded-[20px] px-3 text-left"
            >
              <span className="btn-acc grid h-8 w-8 flex-none place-items-center rounded-full">
                <Icon name="pencil" size={15} />
              </span>
              <span className="min-w-0 flex-1 fs-14.5 leading-tight font-semibold break-words">{l.titleEs}</span>
              <span className="txt-sub fs-12">{l.minutes} min</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
