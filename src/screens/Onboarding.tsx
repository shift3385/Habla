import { useState } from 'react'
import { APP_VERSION } from '../lib/changelog'
import { clearExhausted, listModels, pickDefaultModel, pickFallbackModel } from '../lib/gemini'
import type { Settings } from '../lib/settings'
import { speak } from '../lib/tts'
import { Icon } from '../ui/icons'
import HelpPoint from '../components/HelpPoint'
import Mascot, { type MascotElement } from '../ui/Mascot'
import { TEACHERS, THEME_INFO, type TeacherKey, type ThemeVars } from '../ui/theme'
import type { ReactNode } from 'react'

const GOALS = [3, 5, 10, 15]
/** Pasos: hola · cómo funciona · clave de Gemini · Azure (opcional) · profe · meta diaria. */
const STEPS = 6
const AISTUDIO = 'https://aistudio.google.com/apikey'
const AZURE = 'https://portal.azure.com'

/** La mascota explica: ella arriba y su globo debajo (mismo estilo que los globos del Inicio). */
function MascotSays({ element, children, speaking }: { element: MascotElement; children: ReactNode; speaking?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <Mascot element={element} size={110} mood={speaking ? 'speaking' : 'happy'} />
      <div className="tip-bubble relative mt-2 w-full rounded-[20px] px-4 py-3 text-[14.5px] leading-snug">
        <span
          className="absolute -top-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45"
          style={{ background: 'var(--tip-bg)', borderLeft: '1px solid var(--tip-border)', borderTop: '1px solid var(--tip-border)' }}
        />
        <div className="relative">{children}</div>
      </div>
    </div>
  )
}

const Point = HelpPoint

/** Enlace que Android abre en el navegador (Capacitor manda fuera de la app las webs ajenas). */
function OutLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="field txt-acc2 flex h-11 items-center justify-center gap-1.5 rounded-[22px] text-[14px] font-semibold">
      <Icon name="arrowUR" size={15} />
      {children}
    </a>
  )
}

interface Props {
  settings: Settings
  t: ThemeVars
  update: (patch: Partial<Settings>) => void
  onDone: () => void
}

/**
 * Bienvenida (solo la primera vez, o desde Ajustes → Ver la bienvenida otra vez). La mascota explica cómo funciona
 * Habla y para qué sirve cada clave antes de pedirla: 1) hola · 2) cómo funciona · 3) clave de Gemini ·
 * 4) Azure, opcional · 5) elige profe · 6) meta diaria. El nivel lo fija el test.
 */
export default function Onboarding({ settings, update, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [needsKey] = useState(() => !settings.geminiKey.trim())
  const [key, setKey] = useState(settings.geminiKey)
  const [keyStatus, setKeyStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [checking, setChecking] = useState(false)
  const teacher = TEACHERS[settings.teacher]
  const element = THEME_INFO[settings.theme].mascot
  const keyOk = !needsKey || keyStatus?.ok

  const checkKey = async () => {
    const k = key.trim()
    if (!k) return
    setChecking(true)
    try {
      const list = await listModels(k)
      const model = pickDefaultModel(list)
      clearExhausted()
      update({ geminiKey: k, geminiModel: model, geminiFallbackModel: pickFallbackModel(list, model), modelList: list.map((m) => m.id) })
      setKeyStatus({ ok: true, text: 'Clave válida ✓' })
    } catch (e) {
      setKeyStatus({ ok: false, text: (e as Error).message })
    } finally {
      setChecking(false)
    }
  }

  const pickTeacher = async (k: TeacherKey) => {
    update({ teacher: k, voiceIndex: null })
    setSpeaking(true)
    // App.tsx ajusta la voz al cambiar de profe; esperamos un instante a que se aplique.
    setTimeout(async () => {
      await speak(`Hi! I'm ${TEACHERS[k].name}. Nice to meet you!`, settings.ttsRate, null).catch(() => {})
      setSpeaking(false)
    }, 50)
  }

  const finish = () => {
    // Quien instala desde cero no necesita el aviso de novedades de esta versión.
    // …ni la explicación de las claves: se la acaba de dar la mascota en la bienvenida.
    update({ onboarded: true, lastSeenVersion: APP_VERSION, keysIntroSeen: true })
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
          {Array.from({ length: STEPS }, (_, i) => i).map((i) => (
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
            <Mascot element={THEME_INFO[settings.theme].mascot} size={220} mood={speaking ? 'speaking' : 'idle'} />
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
        <div key="s1" className="anim-up flex flex-1 flex-col overflow-y-auto">
          <h1 className="mt-4 text-[28px] font-semibold tracking-[-.7px]">Así funciona Habla</h1>
          <div className="mt-4">
            <MascotSays element={element}>
              Tu profe es una <b>inteligencia artificial</b>. Para que te escuche y te responda, Habla se conecta a una IA de Google: <b>Gemini</b>.
            </MascotSays>
          </div>
          <ul className="mt-5 flex flex-col gap-3">
            <Point icon="mic">Hablas en inglés como en un audio de WhatsApp.</Point>
            <Point icon="spark">Gemini entiende lo que dijiste, te corrige y tu profe te responde por voz.</Point>
            <Point icon="lock">Tu progreso, tus errores y tus palabras se guardan solo en este teléfono.</Point>
            {/* AUD-FLU-210: decir con claridad qué sale del teléfono. */}
            <Point icon="info">
              Para entenderte, <b>tu voz se envía a Google (Gemini)</b> en cada respuesta, junto con tu nombre, tu nivel y tus intereses para
              personalizar la clase.
            </Point>
          </ul>
          <div className="flex-1" />
          <button onClick={() => setStep(2)} className="btn-acc mt-5 h-[58px] flex-none rounded-full text-[17px]">
            Entendido
          </button>
        </div>
      )}

      {step === 2 && (
        <div key="s2" className="anim-up flex flex-1 flex-col overflow-y-auto">
          <h1 className="mt-4 text-[28px] font-semibold tracking-[-.7px]">Tu llave de Gemini</h1>
          <div className="mt-4">
            <MascotSays element={element}>
              Para usar Gemini cada persona necesita su propia <b>clave</b>: es como tu pase personal. Es <b>gratis</b> (con un límite de uso al día) y{' '}
              <b>se guarda solo en este teléfono</b>. Para verla o cambiarla en la app te pediré tu patrón, PIN o huella.
            </MascotSays>
          </div>
          {needsKey ? (
            <>
              <ol className="txt-sub mt-4 list-decimal pl-5 text-[13.5px] leading-snug">
                <li>Abre Google AI Studio (botón de abajo) e inicia sesión con tu cuenta de Google.</li>
                <li>Toca «Create API key» (Crear clave).</li>
                <li>Copia la clave: empieza por «AIza».</li>
                <li>Vuelve aquí, pégala y toca «Comprobar clave».</li>
              </ol>
              <div className="mt-3">
                <OutLink href={AISTUDIO}>Abrir Google AI Studio</OutLink>
              </div>
              <input
                type="password"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value)
                  setKeyStatus(null)
                }}
                placeholder="Pega tu clave (AIza…)"
                autoComplete="off"
                className="input mt-3"
              />
              <button onClick={checkKey} disabled={checking || !key.trim()} className="field mt-2 h-11 w-full flex-none rounded-[22px] font-medium disabled:opacity-50">
                {checking ? 'Comprobando…' : 'Comprobar clave'}
              </button>
              {keyStatus && (
                <p className="mt-2 text-sm" style={{ color: keyStatus.ok ? 'var(--acc2)' : '#f87171' }}>
                  {keyStatus.text}
                </p>
              )}
              <p className="txt-sub mt-2 text-[12px] leading-snug">Nunca va dentro de la app ni en tus copias de seguridad. Puedes cambiarla en Ajustes → Modelos.</p>
            </>
          ) : (
            <p className="mt-4 text-[14px]" style={{ color: 'var(--acc2)' }}>
              Ya tienes tu clave guardada ✓
            </p>
          )}
          <div className="flex-1" />
          <button onClick={() => setStep(3)} disabled={!keyOk} className="btn-acc mt-5 h-[58px] flex-none rounded-full text-[17px]">
            {keyOk ? 'Continuar' : 'Comprueba tu clave para seguir'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div key="s3" className="anim-up flex flex-1 flex-col overflow-y-auto">
          <h1 className="mt-4 text-[28px] font-semibold tracking-[-.7px]">
            Tu pronunciación <span className="txt-sub text-[18px] font-medium">(opcional)</span>
          </h1>
          <div className="mt-4">
            <MascotSays element={element}>
              Gemini corrige <b>lo que dices</b>. Si además quieres saber <b>cómo lo pronuncias</b>, sonido a sonido, puedo usar <b>Azure Speech</b> de Microsoft, con su
              propia clave.
            </MascotSays>
          </div>
          <ul className="mt-5 flex flex-col gap-3">
            <Point icon="ear">Bajo cada respuesta verás tu nota de pronunciación y las palabras o sonidos a cuidar.</Point>
            <Point icon="star">El plan F0 es gratis: 5 horas de audio al mes. Azure puede pedir una tarjeta solo para verificar tu cuenta.</Point>
            <Point icon="shield">Su clave también se guarda solo aquí, y verla o cambiarla pide tu bloqueo, igual que la de Gemini.</Point>
            <Point icon="info">Con la fonética activa, el audio de cada respuesta va también a Microsoft (Azure) para puntuarlo.</Point>
          </ul>
          <p className="txt-sub mt-4 text-[13px] leading-snug">
            <b>No hace falta ahora.</b> Sin Azure todo funciona con Gemini. Cuando quieras, actívalo en <b>Ajustes → Modelos → Azure Speech</b>.
          </p>
          <div className="mt-3">
            <OutLink href={AZURE}>Ver el portal de Azure</OutLink>
          </div>
          <div className="flex-1" />
          <button onClick={() => setStep(4)} className="btn-acc mt-5 h-[58px] flex-none rounded-full text-[17px]">
            Entendido, sigamos
          </button>
        </div>
      )}

      {step === 4 && (
        <div key="s4" className="anim-up flex flex-1 flex-col">
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
                  <Mascot element={THEME_INFO[settings.theme].mascot} size={76} mood={sel ? (speaking ? 'speaking' : 'happy') : 'idle'} interactive={false} />
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
          <button onClick={() => setStep(5)} className="btn-acc h-[58px] rounded-full text-[17px]">
            Continuar con {teacher.name}
          </button>
        </div>
      )}

      {step === 5 && (
        <div key="s5" className="anim-up flex flex-1 flex-col">
          <h1 className="mt-6 text-[32px] font-semibold tracking-[-.8px]">Tu meta diaria</h1>
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
          <p className="txt-sub mb-3 text-center text-[13px] leading-snug">
            A continuación harás un test de nivel (25–30 min) para que {teacher.name} adapte las clases a ti.
          </p>
          <button onClick={finish} disabled={!keyOk} className="btn-acc h-[58px] rounded-full text-[17px]">
            Continuar al test de nivel
          </button>
        </div>
      )}
    </div>
  )
}
