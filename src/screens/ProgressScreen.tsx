import { useEffect, useState } from 'react'
import InfiniteList from '../components/InfiniteList'
import ReportView from '../components/ReportView'
import SpeakIcon from '../components/SpeakIcon'
import TrendChart from '../components/TrendChart'
import { db, turnCorrections, type Correction, type Session } from '../lib/db'
import { loadMilestones, type MilestoneRow } from '../lib/milestones'
import { getScenario } from '../lib/scenarios'
import type { Settings } from '../lib/settings'
import { errorSummary, loadDashboard, weekMinutes, wordsCollected, type Dashboard, type ErrorSummary } from '../lib/stats'
import { toggleSpeak } from '../lib/tts'
import { Icon } from '../ui/icons'
import Segmented from '../ui/Segmented'
import { SmallRing } from './Home'

type Seg = 'errors' | 'words' | 'sessions'

function shortDate(ts: number) {
  return new Date(ts).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
  })
}

function sessionTitle(s: Session) {
  if (s.topic) return s.topic.titleEs || s.topic.title
  return getScenario(s.scenario).title
}

export default function ProgressScreen({
  settings,
  registerBack,
  onReview,
}: {
  settings: Settings
  registerBack: (h: (() => void) | null) => void
  onReview: () => void
}) {
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [week, setWeek] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [errors, setErrors] = useState<ErrorSummary[]>([])
  const [words, setWords] = useState<{ en: string; es: string }[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [seg, setSeg] = useState<Seg>('errors')
  const [openErr, setOpenErr] = useState<number | null>(null)
  const [open, setOpen] = useState<{
    s: Session
    corrections: Correction[]
  } | null>(null)
  const [todayIdx] = useState(() => (new Date().getDay() + 6) % 7)
  // 5.11 (M-03): «Tus logros» (lista con fecha; los que faltan, en gris con «Te faltan N»).
  const [logros, setLogros] = useState<MilestoneRow[] | null>(null)
  const [logrosOpen, setLogrosOpen] = useState(false)

  useEffect(() => {
    loadDashboard().then(setDash)
    weekMinutes().then(setWeek)
    errorSummary().then(setErrors)
    wordsCollected().then(setWords)
    loadMilestones()
      .then(setLogros)
      .catch(() => setLogros([]))
    db.sessions
      .orderBy('startedAt')
      .toArray()
      .then((all) => setSessions(all.filter((s) => s.metrics && s.metrics.turns > 0)))
  }, [])

  // Atrás (Android) desde el detalle de una sesión vuelve a la lista.
  useEffect(() => {
    registerBack(open ? () => setOpen(null) : logrosOpen ? () => setLogrosOpen(false) : null)
    return () => registerBack(null)
  }, [open, logrosOpen, registerBack])

  const openSession = async (s: Session) => {
    const turns = await db.turns.where('sessionId').equals(s.id!).toArray()
    setOpen({ s, corrections: turns.flatMap(turnCorrections) })
  }

  if (open) {
    return (
      <div className="anim-in flex flex-col gap-3">
        <div className="flex h-[54px] items-center gap-3">
          <button onClick={() => setOpen(null)} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
            <Icon name="back" size={20} stroke={1.8} />
          </button>
          <div className="min-w-0">
            <div className="truncate text-xl font-semibold tracking-[-.4px]">{sessionTitle(open.s)}</div>
            <div className="txt-sub text-xs">{new Date(open.s.startedAt).toLocaleString('es')}</div>
          </div>
        </div>
        <ReportView
          metrics={open.s.metrics!}
          report={open.s.report}
          corrections={open.corrections}
          topic={open.s.topic}
          session={open.s}
          ttsRate={settings.ttsRate}
          voiceIndex={settings.voiceIndex}
        />
      </div>
    )
  }

  if (logrosOpen && logros) return <Logros rows={logros} onBack={() => setLogrosOpen(false)} />

  const got = logros?.filter((r) => r.at).length ?? 0
  const goal = settings.dailyGoalMinutes
  const mins = dash?.minutesToday ?? 0
  const weekTotal = Math.round(week.reduce((a, b) => a + b, 0) * 10) / 10
  const maxW = Math.max(goal, ...week, 1)

  return (
    <div className="anim-up flex flex-col gap-3">
      <div className="flex h-[54px] items-center justify-between">
        <div className="fs-28 font-semibold tracking-[-.6px]">Progreso</div>
        <div className="glass flex h-[42px] items-center gap-1.5 rounded-[21px] px-3.5 text-sm font-semibold">
          <Icon name="flame" size={17} stroke={1.8} color="var(--acc)" />
          {dash?.streak ?? 0} {dash?.streak === 1 ? 'día' : 'días'}
        </div>
      </div>

      <div className="glass rounded-[28px] p-4">
        <div className="flex items-center gap-4">
          <SmallRing pct={mins / goal} size={76} />
          <div className="flex-1">
            <div className="txt-sub fs-13">Hoy</div>
            <div className="text-2xl font-semibold tracking-[-.4px]">
              {mins.toLocaleString('es')} / {goal} min
            </div>
            <div className="txt-sub fs-13">Semana: {weekTotal.toLocaleString('es')} min</div>
          </div>
        </div>
        <div className="mt-3.5 grid h-24 grid-cols-7 items-end gap-2.5" role="img" aria-label="Minutos hablando cada día de esta semana">
          {week.map((m, i) => (
            <div key={i} className="flex h-full flex-col items-center justify-end gap-1.5" title={`${m.toLocaleString('es')} min`}>
              <div
                className="w-full max-w-[26px] rounded-[10px] transition-[height] duration-500"
                style={{
                  height: Math.max(6, (m / maxW) * 70),
                  // v5.10: los días con práctica llevan el color del tema (se ve la racha de un vistazo); sin práctica, gris.
                  // Hoy, además, brilla.
                  background: m > 0 ? 'var(--acc)' : 'var(--gb)',
                  opacity: m > 0 || i === todayIdx ? 1 : 0.7,
                  boxShadow: i === todayIdx && m > 0 ? '0 6px 16px var(--glow)' : 'none',
                }}
              />
              <div className="txt-sub text-xs">{'LMXJVSD'[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {logros && logros.length > 0 && (
        <button onClick={() => setLogrosOpen(true)} className="glass flex items-center gap-3 rounded-[22px] px-4 py-3 text-left" data-logros>
          <span aria-hidden className="text-2xl">
            🏆
          </span>
          <span className="min-w-0 flex-1">
            <span className="block fs-15 font-semibold">Tus logros</span>
            <span className="txt-sub block fs-12.5">
              {got} de {logros.length}
              {got > 0 ? ` · el último: ${[...logros].filter((r) => r.at).sort((a, b) => b.at! - a.at!)[0].def.title}` : ' · el primero está cerca'}
            </span>
          </span>
          <span className="txt-sub">
            <Icon name="chevR" size={16} stroke={1.8} />
          </span>
        </button>
      )}

      <Segmented
        value={seg}
        onChange={setSeg}
        options={[
          { value: 'errors', label: 'Errores', count: errors.length },
          { value: 'words', label: 'Palabras', count: words.length },
          { value: 'sessions', label: 'Sesiones', count: sessions.length },
        ]}
      />

      {seg === 'errors' && (
        <div key="errors" className="anim-up flex flex-col gap-2">
          {errors.length === 0 && <Empty text="Aquí aparecerán las correcciones que te haga tu profe." />}
          {errors.length > 0 && (
            <button onClick={onReview} className="btn-acc flex h-12 items-center justify-center gap-2 rounded-3xl fs-15">
              <Icon name="cards" size={18} />
              Repasar mis errores en voz alta
            </button>
          )}
          {errors.length > 0 && (
            <InfiniteList
              items={errors}
              render={(e, i) => (
                <button
                  key={i}
                  onClick={() => setOpenErr(openErr === i ? null : i)}
                  className="glass flex items-center gap-2.5 rounded-[20px] px-4 py-2.5 text-left"
                >
                  <div className="min-w-0 flex-1 text-sm leading-[1.35]">
                    <span className="txt-sub line-through">{e.original}</span>
                    <br />
                    <span className="font-semibold">{e.corrected}</span>
                    {openErr === i && e.explanationEs && <span className="txt-sub mt-1 block fs-13">{e.explanationEs}</span>}
                  </div>
                  <div className="txt-sub flex-none text-xs">{e.count === 1 ? '1 vez' : `${e.count} veces`}</div>
                </button>
              )}
            />
          )}
        </div>
      )}

      {seg === 'words' && (
        <div key="words" className="anim-up flex flex-col gap-2">
          {words.length === 0 && <Empty text="Las palabras de tus temas y las frases del día se guardan aquí." />}
          {words.length > 0 && (
            <InfiniteList
              items={words}
              render={(w) => (
                <button
                  key={w.en}
                  onClick={() => toggleSpeak(w.en, settings.ttsRate, settings.voiceIndex)}
                  className="glass flex items-center gap-2.5 rounded-[20px] px-4 py-2.5 text-left"
                  aria-label={`Escuchar ${w.en}`}
                >
                  <div className="min-w-0 flex-1 text-sm leading-[1.35] break-words">
                    <span className="font-semibold">{w.en}</span>
                    {w.es && (
                      <>
                        <br />
                        <span className="txt-sub">{w.es}</span>
                      </>
                    )}
                  </div>
                  <span className="txt-acc2 flex-none">
                    <SpeakIcon speakKey={w.en} size={16} />
                  </span>
                </button>
              )}
            />
          )}
        </div>
      )}

      {seg === 'sessions' && (
        <div key="sessions" className="anim-up flex flex-col gap-2">
          {sessions.length === 0 ? (
            <Empty text="Termina tu primera conversación para ver tu nota de fluidez." />
          ) : (
            <>
              <div className="glass rounded-[28px] p-4">
                <div className="font-semibold">Nota de fluidez</div>
                <TrendChart
                  points={sessions.slice(-20).map((s) => ({
                    label: shortDate(s.startedAt),
                    value: s.metrics!.score,
                    detail: `${s.metrics!.wpm} ppm · ${s.metrics!.avgWords} palabras/resp. · ${s.metrics!.level}`,
                  }))}
                  unit="/100"
                  height={96}
                />
              </div>
              <InfiniteList
                items={[...sessions].reverse()}
                render={(s) => (
                  <button key={s.id} onClick={() => openSession(s)} className="glass flex items-center gap-3 rounded-[20px] p-2.5 text-left">
                    <span className="field txt-acc2 grid h-11 w-11 flex-none place-items-center rounded-full font-semibold">{s.metrics!.score}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate fs-15 font-semibold">{sessionTitle(s)}</span>
                      <span className="txt-sub block fs-12.5">
                        {shortDate(s.startedAt)} · {s.metrics!.wpm} ppm · {s.metrics!.turns} {s.metrics!.turns === 1 ? 'respuesta' : 'respuestas'}
                      </span>
                    </span>
                    <span className="txt-sub pr-2">
                      <Icon name="chevR" size={16} stroke={1.8} />
                    </span>
                  </button>
                )}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** 5.11 (M-03): «Tus logros», con fecha; los que faltan en gris con «Te faltan N». */
function Logros({ rows, onBack }: { rows: MilestoneRow[]; onBack: () => void }) {
  const got = rows.filter((r) => r.at).length
  return (
    <div className="anim-in flex flex-col gap-3">
      <div className="flex h-[54px] items-center gap-3">
        <button onClick={onBack} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
          <Icon name="back" size={20} stroke={1.8} />
        </button>
        <div className="min-w-0">
          <div className="truncate text-xl font-semibold tracking-[-.4px]">Tus logros</div>
          <div className="txt-sub text-xs">
            {got} de {rows.length} conseguidos
          </div>
        </div>
      </div>
      <InfiniteList
        items={[...rows.filter((r) => r.at).sort((a, b) => b.at! - a.at!), ...rows.filter((r) => !r.at)]}
        render={(r) => (
          <div
            key={r.def.id}
            className="glass flex items-center gap-3 rounded-[20px] px-4 py-2.5"
            style={r.at ? undefined : { opacity: 0.55, filter: 'grayscale(1)' }}
            data-milestone-row={r.def.id}
          >
            <span aria-hidden className="w-8 flex-none text-center text-2xl">
              {r.def.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block fs-15 leading-snug font-semibold">{r.def.title}</span>
              <span className="txt-sub block fs-12.5">{r.at ? `Conseguido el ${new Date(r.at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}` : r.left}</span>
            </span>
            {r.at && (
              <span className="txt-acc2 flex-none">
                <Icon name="check" size={18} stroke={2} />
              </span>
            )}
          </div>
        )}
      />
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="glass txt-sub w-full rounded-[22px] p-5 text-center text-sm">{text}</div>
}
