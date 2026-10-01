import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { getProfile } from '../lib/profile'
import type { Settings } from '../lib/settings'
import { speak } from '../lib/tts'
import { Icon } from '../ui/icons'
import Orb from '../ui/Orb'
import { TEACHERS, type TeacherKey, type ThemeVars } from '../ui/theme'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const GOALS = [3, 5, 10, 15]

interface Props {
  settings: Settings
  t: ThemeVars
  update: (patch: Partial<Settings>) => void
  onDone: () => void
}

/** Bienvenida: 1) hola · 2) elige profe · 3) nivel y meta diaria. */
export default function Onboarding({ settings, t, update, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [level, setLevel] = useState('B1')
  const [speaking, setSpeaking] = useState(false)
  const teacher = TEACHERS[settings.teacher]

  useEffect(() => {
    getProfile().then((p) => setLevel(p.levels.overall))
  }, [])

  const pickTeacher = async (k: TeacherKey) => {
    update({ teacher: k, voiceIndex: null })
    setSpeaking(true)
    // App.tsx ajusta la voz al cambiar de profe; esperamos un instante a que se aplique.
    setTimeout(async () => {
      await speak(`Hi! I'm ${TEACHERS[k].name}. Nice to meet you!`, settings.ttsRate, null).catch(() => {})
      setSpeaking(false)
    }, 50)
  }

  const finish = async () => {
    const p = await getProfile()
    await db.profile.put({ ...p, levels: { ...p.levels, overall: level } })
    update({ onboarded: true })
    onDone()
  }

  return (
    <div className="relative z-[2] flex h-full flex-col px-6 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+28px)]">
      <div className="flex h-11 items-center justify-between">
        {step > 0 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="glass grid h-11 w-11 place-items-center rounded-full"
            aria-label="Atrás"
          >
            <Icon name="back" size={20} stroke={1.8} />
          </button>
        ) : (
          <div className="text-2xl font-bold tracking-tight">
            Habla<span className="txt-acc">.</span>
          </div>
        )}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[7px] rounded transition-all duration-300"
              style={{ width: i === step ? 22 : 7, background: i === step ? 'var(--acc)' : 'var(--gb)' }}
            />
          ))}
        </div>
      </div>

      {step === 0 && (
        <div key="s0" className="anim-up flex flex-1 flex-col">
          <div className="grid flex-1 place-items-center">
            <Orb size={190} colors={t[settings.teacher]} active={speaking} />
          </div>
          <h1 className="text-[38px] leading-[1.05] font-semibold tracking-[-1px] text-pretty">Hola, soy tu profe de inglés</h1>
          <p className="txt-sub mt-3 text-base leading-snug">
            Conversaciones reales sobre los temas que te interesan, con correcciones al momento.
          </p>
          <button onClick={() => setStep(1)} className="btn-acc mt-7 h-[58px] rounded-full text-[17px]">
            Empezar
          </button>
        </div>
      )}

      {step === 1 && (
        <div key="s1" className="anim-up flex flex-1 flex-col">
          <h1 className="mt-6 text-[32px] font-semibold tracking-[-.8px]">Elige a tu profe</h1>
          <p className="txt-sub mt-2 text-[15px]">Puedes cambiarlo cuando quieras en Ajustes.</p>
          <div className="mt-7 flex flex-col gap-3.5">
            {(Object.keys(TEACHERS) as TeacherKey[]).map((k) => {
              const info = TEACHERS[k]
              const sel = settings.teacher === k
              return (
                <button
                  key={k}
                  onClick={() => pickTeacher(k)}
                  className="glass relative flex items-center gap-[18px] rounded-[28px] p-5 text-left"
                >
                  <Orb size={64} colors={t[k]} active={sel && speaking} />
                  <div className="min-w-0 flex-1">
                    <div className="txt-sub text-xs tracking-[1.2px] uppercase">{info.role}</div>
                    <div className="mt-0.5 text-[22px] font-semibold">{info.name}</div>
                    <div className="txt-sub mt-1 text-sm leading-snug">{info.desc}</div>
                  </div>
                  {sel && (
                    <>
                      <div className="pointer-events-none absolute -inset-px rounded-[28px] border-2" style={{ borderColor: 'var(--acc)' }} />
                      <div className="btn-acc grid h-7 w-7 flex-none place-items-center rounded-full">
                        <Icon name="check" size={16} stroke={2.4} />
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex-1" />
          <button onClick={() => setStep(2)} className="btn-acc h-[58px] rounded-full text-[17px]">
            Continuar con {teacher.name}
          </button>
        </div>
      )}

      {step === 2 && (
        <div key="s2" className="anim-up flex flex-1 flex-col">
          <h1 className="mt-6 text-[32px] font-semibold tracking-[-.8px]">¿Cuál es tu nivel?</h1>
          <p className="txt-sub mt-2 text-[15px]">{teacher.name} adapta el vocabulario y la velocidad.</p>
          <div className="mt-6 grid grid-cols-5 gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`h-14 rounded-[18px] text-[17px] ${l === level ? 'btn-acc' : 'glass font-medium'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="mt-8 text-xl font-semibold">Meta diaria</div>
          <p className="txt-sub mt-1.5 text-sm leading-snug">
            Minutos hablando tú. 5 minutos de voz equivalen a unos 15 de clase.
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                onClick={() => update({ dailyGoalMinutes: g })}
                className={`h-[52px] rounded-[18px] text-[15px] ${g === settings.dailyGoalMinutes ? 'btn-acc' : 'glass font-medium'}`}
              >
                {g} min
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={finish} className="btn-acc h-[58px] rounded-full text-[17px]">
            Empezar a hablar
          </button>
        </div>
      )}
    </div>
  )
}
