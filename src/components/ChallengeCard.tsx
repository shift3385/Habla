import { useState } from 'react'
import { unitOf, weekLabel, type ChallengeStatus } from '../lib/challenge'
import type { WeeklyChallenge } from '../lib/db'
import type { Settings } from '../lib/settings'
import { challengeMessage, challengeToCode, progressMessage, progressToCode } from '../lib/shareCode'
import { shareMessage } from '../lib/shareText'
import InfiniteList from './InfiniteList'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO } from '../ui/theme'

// 5.13 (P-14): el reto de la semana en Progreso: tarjeta con la barra y detalle con la explicación de la mascota y el
// historial. Se mide en el teléfono (challenge.ts), sin IA.

/** Barra «4 de 8» del reto. */
export function ChallengeBar({ progress, target, unit, done }: { progress: number; target: number; unit: string; done?: boolean }) {
  const p = done ? target : Math.min(progress, target)
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full"
        style={{ background: 'var(--gb)' }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={p}
        aria-label={`${p} de ${target} ${unit}`}
      >
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(p / Math.max(1, target)) * 100}%`, background: 'var(--acc)' }} />
      </div>
      <span className="flex-none fs-13 font-semibold whitespace-nowrap" data-challenge-count>
        {done ? '¡Cumplido!' : `${p} de ${target} ${unit}`}
      </span>
    </div>
  )
}

/** Tarjeta de Progreso (toca para ver el detalle). */
export function ChallengeCard({ status, onOpen }: { status: ChallengeStatus; onOpen: () => void }) {
  const c = status.challenge
  return (
    <button onClick={onOpen} className="glass flex flex-col gap-2 rounded-[22px] px-4 py-3 text-left" data-challenge-card>
      <span className="flex items-center gap-3">
        <span aria-hidden className="text-2xl">
          {status.done ? '🏅' : '🎯'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="txt-sub block fs-12.5">{challengeLabel(c)}</span>
          <span className="block fs-15 leading-snug font-semibold">{c.titleEs}</span>
        </span>
        <span className="txt-sub">
          <Icon name="chevR" size={16} stroke={1.8} />
        </span>
      </span>
      <ChallengeBar progress={status.progress} target={c.target} unit={unitOf(c)} done={status.done} />
    </button>
  )
}

/** «Reto de la semana», o «Reto con Ana» si te lo mandó alguien (5.13, Fase 3). */
const challengeLabel = (c: WeeklyChallenge) => (c.source === 'shared' ? (c.fromName ? `Reto con ${c.fromName}` : 'Reto compartido') : 'Reto de la semana')

/** Detalle: qué es, cómo va y las semanas anteriores. */
export function ChallengeView({
  settings,
  status,
  history,
  name,
  onBack,
  onPaste,
}: {
  settings: Settings
  status: ChallengeStatus
  history: WeeklyChallenge[]
  /** Tu nombre, para los códigos que mandas (5.13, Fase 3). */
  name: string
  onBack: () => void
  /** «Pegar un código» (el progreso que te manden). */
  onPaste?: () => void
}) {
  const c = status.challenge
  const element = THEME_INFO[settings.theme]?.mascot ?? 'aqua'
  const doneCount = history.filter((h) => h.doneAt).length
  const [note, setNote] = useState<string | null>(null)
  // 5.13 (Fase 3): «Retar a alguien» y «Mandar mi progreso»: un mensaje con el código para WhatsApp.
  const send = async (kind: 'challenge' | 'progress') => {
    setNote(null)
    const text = kind === 'challenge' ? challengeMessage(challengeToCode(c, name)) : progressMessage(progressToCode(c, status.done ? Math.max(status.progress, c.target) : status.progress, name))
    const r = await shareMessage(text, kind === 'challenge' ? 'Retar a alguien' : 'Mandar mi progreso')
    if (r === 'copied') setNote('Mensaje copiado: pégalo en WhatsApp.')
    else if (r === 'failed') setNote('No he podido abrir Compartir.')
  }
  const mine = status.done ? c.target : Math.min(status.progress, c.target)
  return (
    <div className="anim-in flex flex-col gap-3" data-challenge-view>
      <div className="flex h-[54px] items-center gap-3">
        <button onClick={onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="min-w-0">
          <div className="truncate text-xl font-semibold tracking-[-.4px]">{challengeLabel(c)}</div>
          <div className="txt-sub text-xs">Semana {weekLabel(c.id)}</div>
        </div>
      </div>

      <div className="flex items-start gap-2.5">
        <Mascot element={element} mood={status.done ? 'happy' : 'speaking'} size={44} interactive={false} />
        <div className="tip-bubble min-w-0 flex-1 rounded-[18px] px-3.5 py-2.5 fs-13.5 leading-snug">
          {status.done
            ? '¡Lo cumpliste! Lo que hagas de más esta semana también suma. El lunes te propongo otro reto.'
            : c.source === 'shared'
              ? `Este reto te lo mandó ${c.fromName || 'alguien'}. Lo mido yo, en tu teléfono, con lo que hablas tú. Para compararos, mandaos vuestro progreso con «Mandar mi progreso».`
              : 'Cada lunes te propongo un reto sacado de tus errores. Lo mido yo, en este teléfono, con lo que hablas (no gasta tu clave). Si no llegas, no pasa nada: el lunes hay otro.'}
        </div>
      </div>

      <div className="glass rounded-[28px] p-[18px]">
        <div className="fs-18 leading-snug font-semibold text-balance">{c.titleEs}</div>
        <p className="txt-sub mt-1 fs-14 leading-snug text-pretty">{c.goalEs}</p>
        <div className="mt-3">
          <ChallengeBar progress={status.progress} target={c.target} unit={unitOf(c)} done={status.done} />
        </div>
        {c.kind === 'clean' && (
          <p className="txt-sub mt-2.5 fs-12.5 leading-snug">Cuentan las respuestas habladas (no las escritas) de 10 palabras o más.</p>
        )}
        {/* 5.13 (Fase 3): lo que te mandó la otra persona de este reto. */}
        {c.rival && (
          <div className="mt-3 flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--gb)' }} data-rival>
            <div className="fs-14 font-semibold">
              {c.rival.name}: {Math.min(c.rival.progress, c.target)} de {c.target} · Tú: {mine} de {c.target}
            </div>
            <ChallengeBar progress={c.rival.progress} target={c.target} unit={unitOf(c)} />
            <div className="txt-sub fs-12">
              Lo mandó el {new Date(c.rival.at).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2.5">
        <button onClick={() => send('challenge')} className="glass flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-center fs-14 leading-tight font-semibold" data-send-challenge>
          <Icon name="upload" size={16} />
          Retar a alguien
        </button>
        <button onClick={() => send('progress')} className="glass flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-center fs-14 leading-tight font-semibold" data-send-progress>
          <Icon name="bars" size={16} />
          Mandar mi progreso
        </button>
      </div>
      {note && <div className="txt-sub px-1 text-center fs-13">{note}</div>}
      {onPaste && (
        <button onClick={onPaste} className="txt-acc2 -mt-1 h-10 fs-14 font-semibold" data-paste-open>
          Pegar un código que me mandaron
        </button>
      )}

      {history.length > 0 && (
        <>
          <div className="txt-sub mt-1 px-1 fs-13 font-semibold">
            Semanas anteriores · {doneCount} de {history.length} {history.length === 1 ? 'cumplido' : 'cumplidos'}
          </div>
          <InfiniteList
            items={history}
            render={(h) => (
            <div key={h.id} className="glass flex items-center gap-3 rounded-[20px] px-4 py-2.5" data-challenge-row={h.id} style={h.doneAt ? undefined : { opacity: 0.7 }}>
              <span aria-hidden className="w-7 flex-none text-center text-xl">
                {h.doneAt ? '🏅' : '🎯'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block fs-14.5 leading-snug font-semibold">{h.titleEs}</span>
                <span className="txt-sub block fs-12.5">
                  {weekLabel(h.id)} · {h.doneAt ? 'cumplido' : `${Math.min(h.progress ?? 0, h.target)} de ${h.target} ${unitOf(h)}`}
                </span>
              </span>
              {h.doneAt && (
                <span className="txt-acc2 flex-none">
                  <Icon name="check" size={18} stroke={2} />
                </span>
              )}
            </div>
            )}
          />
        </>
      )}
    </div>
  )
}
