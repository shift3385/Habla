import { unitOf, weekLabel, type ChallengeStatus } from '../lib/challenge'
import type { WeeklyChallenge } from '../lib/db'
import type { Settings } from '../lib/settings'
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
          <span className="txt-sub block fs-12.5">Reto de la semana</span>
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

/** Detalle: qué es, cómo va y las semanas anteriores. */
export function ChallengeView({ settings, status, history, onBack }: { settings: Settings; status: ChallengeStatus; history: WeeklyChallenge[]; onBack: () => void }) {
  const c = status.challenge
  const element = THEME_INFO[settings.theme]?.mascot ?? 'aqua'
  const doneCount = history.filter((h) => h.doneAt).length
  return (
    <div className="anim-in flex flex-col gap-3" data-challenge-view>
      <div className="flex h-[54px] items-center gap-3">
        <button onClick={onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="min-w-0">
          <div className="truncate text-xl font-semibold tracking-[-.4px]">Reto de la semana</div>
          <div className="txt-sub text-xs">Semana {weekLabel(c.id)}</div>
        </div>
      </div>

      <div className="flex items-start gap-2.5">
        <Mascot element={element} mood={status.done ? 'happy' : 'speaking'} size={44} interactive={false} />
        <div className="tip-bubble min-w-0 flex-1 rounded-[18px] px-3.5 py-2.5 fs-13.5 leading-snug">
          {status.done
            ? '¡Lo cumpliste! Lo que hagas de más esta semana también suma. El lunes te propongo otro reto.'
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
      </div>

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
