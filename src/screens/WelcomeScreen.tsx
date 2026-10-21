import { useEffect, useRef, useState } from 'react'
import { db, type Profile } from '../lib/db'
import { getProfile } from '../lib/profile'
import Mascot from '../ui/Mascot'
import FavoritesPicker from '../components/FavoritesPicker'
import { FAV_COUNT } from '../lib/topics'
import { THEME_INFO, THEME_KEYS, type Mode, type ThemeKey } from '../ui/theme'

// Bienvenida animada: te recibe la mascota de tu tema (Chispa, Musgo, Gota o Brisa), que cae, rebota y te
// sigue con los ojos. Usuario nuevo: cuatro pasos (nombre, compañero, a qué se dedica, qué le gusta); al
// elegir compañero toda la pantalla cambia de tema. Usuario que vuelve: "Welcome back" con su racha, nivel y
// último tema. Al entrar, un círculo del color del tema sale de la mascota y llena la pantalla.

type Phase = 'intro' | 'welcome' | 'loading' | 'setup' | 'back' | 'enter'

// Posición (fracción del alto) y tamaño de la mascota en cada fase.
const SPOT: Record<Phase, { y: number; size: number }> = {
  intro: { y: 0.42, size: 230 },
  welcome: { y: 0.33, size: 240 },
  loading: { y: 0.44, size: 190 },
  setup: { y: 0.15, size: 130 },
  back: { y: 0.32, size: 240 },
  enter: { y: 0.45, size: 240 },
}

const LOAD_MSGS = ['Conociendo tu nivel', 'Eligiendo a tu profe', 'Ordenando los temas', 'Casi listo']
const ROLES = ['Estudiante', 'Tecnología', 'Salud', 'Educación', 'Negocios', 'Jubilado/a', 'Otro']

export interface ReturningInfo {
  name: string
  streak: number
  level: string
  lastTopic: string | null
}

interface Props {
  returning: ReturningInfo | null
  onImport: (file: File) => Promise<boolean>
  onDone: () => void
  theme: ThemeKey
  mode: Mode
  onTheme: (theme: ThemeKey, mode: Mode) => void
}

// Pasos del alta: nombre → compañero → a qué se dedica → qué le gusta.
const STEPS = 4

export default function WelcomeScreen({ returning, onImport, onDone, theme, mode, onTheme }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [work, setWork] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [likes, setLikes] = useState<string[]>([])
  const [msgI, setMsgI] = useState(0)
  const [pokes, setPokes] = useState(0)
  const [importError, setImportError] = useState<string | null>(null)
  const [cheer, setCheer] = useState(0) // la mascota salta contenta al elegirla
  useEffect(() => {
    if (!cheer) return
    const id = setTimeout(() => setCheer(0), 1600)
    return () => clearTimeout(id)
  }, [cheer])

  const fileInput = useRef<HTMLInputElement>(null)
  // En horizontal la bienvenida se dibuja más alta que la pantalla: al aparecer el botón, se desplaza hasta él
  // para que se vea sin tener que buscarlo.
  const continueBtn = useRef<HTMLButtonElement>(null)
  // Al terminar la caída de la intro, la mascota sonríe; con cada interacción salta contenta.
  const cheerUp = () => setCheer(Date.now())

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(returning ? 'back' : 'welcome'), 3000)
    return () => clearTimeout(t1)
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mensajes de "Preparando tu espacio" y paso al formulario.
  useEffect(() => {
    if (phase !== 'loading') return
    const a = setInterval(() => setMsgI((x) => x + 1), 1100)
    const b = setTimeout(() => setPhase('setup'), 3000)
    return () => {
      clearInterval(a)
      clearTimeout(b)
    }
  }, [phase])

  // Entrada: el muñequito llena la pantalla y se pasa a la app.
  useEffect(() => {
    if (phase !== 'enter') return
    const id = setTimeout(onDone, 2300)
    return () => clearTimeout(id)
  }, [phase, onDone])

  const canNext = step === 0 ? name.trim().length > 0 : step === STEPS - 1 ? likes.length === FAV_COUNT : true

  const next = async () => {
    if (!canNext) return
    cheerUp()
    if (step < STEPS - 1) {
      setStep(step + 1)
      return
    }
    const p = await getProfile()
    const about = [role, work.trim()].filter(Boolean).join(' · ')
    const profile: Profile = {
      ...p,
      name: name.trim(),
      about,
      interests: likes,
    }
    await db.profile.put(profile)
    setPhase('enter')
  }

  useEffect(() => {
    if (phase !== 'back' || !('landscape' in document.documentElement.dataset)) return
    const id = setTimeout(() => {
      // El lienzo alto se desplaza en #root: hasta el final, donde queda el botón con su margen.
      const root = document.getElementById('root')
      if (root && continueBtn.current) root.scrollTo({ top: root.scrollHeight, behavior: 'smooth' })
    }, 700)
    return () => clearTimeout(id)
  }, [phase])

  const firstName = (returning?.name ?? name).split(' ')[0]
  const chip = (sel: boolean) => (sel ? 'btn-acc scale-[1.04]' : 'glass')
  const spot = SPOT[phase]
  const mood = phase === 'loading' ? 'thinking' : cheer || phase === 'back' || phase === 'enter' ? 'happy' : 'idle'
  const hideMascot = phase === 'setup' && step === 1 // el paso del compañero tiene su propia mascota grande

  return (
    <div className="land-tall relative z-[2] h-full w-full overflow-hidden select-none">
      {/* La mascota del tema elegido: cae en la intro y se coloca en cada fase. */}
      <div
        className="absolute left-1/2 z-[1] transition-[top,opacity] duration-700"
        style={{
          top: `${spot.y * 100}%`,
          opacity: hideMascot ? 0 : 1,
          pointerEvents: hideMascot ? 'none' : 'auto',
          transitionTimingFunction: 'cubic-bezier(.3,1.25,.5,1)',
        }}
      >
        <div
          style={{
            transform: `translate(-50%, -58%) scale(${spot.size / 240})`,
            transition: 'transform .7s cubic-bezier(.3,1.25,.5,1)',
          }}
        >
          {/* Capa aparte para la caída: una animación de transform pisaría el centrado de arriba. */}
          <div
            style={{
              animation: 'bw-drop 1.1s cubic-bezier(.3,1.35,.5,1) both',
            }}
          >
            <Mascot
              key={theme}
              element={THEME_INFO[theme].mascot}
              mood={mood}
              size={240}
              onTap={() => {
                setPokes((n) => n + 1)
                cheerUp()
              }}
            />
          </div>
        </div>
      </div>

      {/* Entrada: un círculo del color del tema sale de la mascota y llena la pantalla. */}
      {phase === 'enter' && (
        <div
          className="pointer-events-none absolute left-1/2 z-[4] h-10 w-10 rounded-full"
          style={{
            top: `${spot.y * 100}%`,
            marginLeft: -20,
            marginTop: -20,
            background: 'var(--acc)',
            animation: 'bw-reveal 1.6s .5s cubic-bezier(.6,0,.4,1) both',
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-[3]">
        {phase === 'intro' && (
          <>
            <div className="absolute right-0 left-0 flex justify-center fs-58 font-bold tracking-[-2px]" style={{ top: '60.7%' }}>
              {'Habla.'.split('').map((c, i) => (
                <span
                  key={i}
                  className="inline-block opacity-0"
                  style={{
                    color: c === '.' ? 'var(--acc)' : 'var(--tx)',
                    animation: `bw-letter .7s cubic-bezier(.3,1.4,.5,1) ${1 + i * 0.09}s forwards`,
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
            <div
              className="txt-sub absolute right-0 left-0 text-center fs-15 opacity-0"
              style={{
                top: '70.4%',
                animation: 'hb-fadein .8s 1.9s ease forwards',
              }}
            >
              Tu espacio para hablar inglés
            </div>
          </>
        )}

        {phase === 'welcome' && (
          <>
            <div
              className="txt-sub absolute right-0 left-0 text-center fs-13"
              style={{
                top: '13%',
                animation: 'bw-bob 2s ease-in-out infinite',
              }}
            >
              {pokes === 0 ? 'Tócame' : pokes < 4 ? '¡Otra vez!' : 'Jeje, me haces cosquillas'}
            </div>
            <div className="anim-up absolute right-7 left-7 text-center" style={{ top: '51%' }}>
              <div className="txt-acc2 fs-15 tracking-[1.5px] uppercase">Welcome to</div>
              <div className="mt-1 fs-52 leading-[1.05] font-bold tracking-[-1.8px]">
                Habla<span className="txt-acc">.</span>
              </div>
              <div className="txt-sub mt-3 text-base leading-snug text-pretty">
                Un lugar tranquilo para practicar inglés hablando, a tu ritmo y sin miedo a equivocarte.
              </div>
            </div>
            <div
              className="pointer-events-auto absolute right-[22px] left-[22px] flex flex-col gap-2.5"
              style={{
                bottom: 'calc(env(safe-area-inset-bottom) + 40px)',
                animation: 'hb-up .6s .25s ease both',
              }}
            >
              <button
                onClick={() => {
                  cheerUp()
                  setMsgI(0)
                  setPhase('loading')
                }}
                className="btn-acc h-[58px] rounded-full fs-17"
              >
                Soy nuevo, empecemos
              </button>
              <button onClick={() => fileInput.current?.click()} className="glass h-[58px] rounded-full text-base font-medium">
                Ya tengo mi perfil (importar copia)
              </button>
              {importError && (
                <div className="text-center fs-13" style={{ color: 'var(--bad)' }}>
                  {importError}
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setImportError(null)
                  const ok = await onImport(f).catch((err) => {
                    setImportError((err as Error).message)
                    return false
                  })
                  if (ok) {
                    cheerUp()
                    setPhase('enter')
                  }
                }}
              />
            </div>
          </>
        )}

        {phase === 'loading' && (
          <div className="anim-up absolute right-0 left-0 text-center" style={{ top: '64.3%' }}>
            <div className="text-2xl font-semibold tracking-[-.4px]">Preparando tu espacio</div>
            <div className="txt-sub relative mt-2 h-[22px] fs-15">
              <div key={msgI} className="absolute inset-0 flex justify-center" style={{ animation: 'ld-msg 1.1s ease both' }}>
                {LOAD_MSGS[Math.min(msgI, LOAD_MSGS.length - 1)]}
                <span style={{ animation: 'hb-dot 1s infinite' }}>…</span>
              </div>
            </div>
          </div>
        )}

        {phase === 'setup' && (
          <div
            className="anim-up pointer-events-auto absolute right-[18px] left-[18px] flex flex-col transition-[top] duration-500"
            // En el paso del compañero el muñequito se oculta y el panel usa toda la pantalla.
            style={{
              top: step === 1 ? 'calc(env(safe-area-inset-top) + 28px)' : '27.6%',
              bottom: 'calc(env(safe-area-inset-bottom) + 34px)',
            }}
          >
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: STEPS }, (_, i) => (
                <span
                  key={i}
                  className="h-[7px] rounded transition-all duration-300"
                  style={{
                    width: i === step ? 24 : 7,
                    background: i <= step ? 'var(--acc)' : 'var(--gb)',
                  }}
                />
              ))}
            </div>
            <div className="mt-[18px] text-center fs-28 font-semibold tracking-[-.6px]">
              {
                [
                  '¿Cómo te llamas?',
                  'Elige a tu compañero',
                  name ? `¿A qué te dedicas, ${name.split(' ')[0]}?` : '¿A qué te dedicas?',
                  '¿Qué te gusta?',
                ][step]
              }
            </div>
            <div className="txt-sub mt-1.5 text-center fs-15">
              {
                [
                  'Así te saludará tu profe',
                  'Te acompañará en cada clase. Puedes cambiarlo cuando quieras.',
                  'Para practicar situaciones de tu día a día',
                  'Elige 3. Serán los temas de tu Inicio',
                ][step]
              }
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
              {step === 0 && (
                <div key="s0" className="anim-up mt-[26px]">
                  <input
                    value={name}
                    onChange={(e) => {
                      cheerUp()
                      setName(e.target.value)
                    }}
                    placeholder="Tu nombre"
                    autoComplete="given-name"
                    className="glass h-[60px] w-full rounded-[30px] px-[22px] text-center fs-19 outline-none"
                    style={{ color: 'var(--tx)' }}
                  />
                </div>
              )}
              {step === 1 && (
                <div key="sc" className="anim-up flex h-full min-h-[480px] flex-col">
                  <div className="relative grid flex-1 place-items-center">
                    <Mascot key={theme} element={THEME_INFO[theme].mascot} mood={cheer ? 'happy' : 'idle'} size={210} />
                    <div className="txt-sub anim-bob absolute right-0 bottom-0 left-0 text-center fs-13">
                      Tócalo o estíralo para conocerlo
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="fs-26 font-bold tracking-[-.5px]">{THEME_INFO[theme].mascotName}</div>
                    <div className="txt-sub mt-0.5 text-sm">{THEME_INFO[theme].personality}</div>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-[7px]">
                    {THEME_KEYS.map((k) => {
                      const sel = theme === k
                      return (
                        <button
                          key={k}
                          onClick={() => {
                            cheerUp()
                            setCheer(Date.now())
                            onTheme(k, THEME_INFO[k].defaultMode)
                          }}
                          className="flex h-[104px] flex-col items-center justify-center rounded-[22px]"
                          style={{
                            background: sel ? 'var(--field)' : 'var(--g)',
                            border: sel ? '2px solid var(--acc)' : '1px solid var(--gb)',
                            boxShadow: 'var(--sh)',
                          }}
                        >
                          <Mascot element={THEME_INFO[k].mascot} size={58} interactive={false} />
                          <span className="fs-13 font-semibold">{THEME_INFO[k].name}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="glass mt-2.5 grid grid-cols-2 gap-1 rounded-[22px] p-1">
                    {(['dark', 'light'] as Mode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => onTheme(theme, m)}
                        className={`h-10 rounded-[20px] text-sm ${mode === m ? 'btn-acc font-semibold' : 'txt-sub font-medium'}`}
                      >
                        {m === 'dark' ? 'Oscuro' : 'Claro'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {step === 2 && (
                <div key="s1" className="anim-up mt-[22px] flex flex-col gap-3">
                  <input
                    value={work}
                    onChange={(e) => {
                      cheerUp()
                      setWork(e.target.value)
                    }}
                    placeholder="Empresa, universidad, profesión… (opcional)"
                    className="glass h-14 w-full rounded-[28px] px-[22px] text-base outline-none"
                    style={{ color: 'var(--tx)' }}
                  />
                  <div className="flex flex-wrap justify-center gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          cheerUp()
                          setRole(role === r ? null : r)
                        }}
                        className={`h-[42px] rounded-[21px] px-4 fs-14.5 transition-transform ${chip(role === r)}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {step === 3 && (
                <div key="s2" className="anim-up mt-[18px]">
                  <FavoritesPicker
                    value={likes}
                    onChange={(ids) => {
                      cheerUp()
                      setLikes(ids)
                    }}
                  />
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2.5">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="glass grid h-[58px] w-[58px] flex-none place-items-center rounded-full"
                  aria-label="Atrás"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
              )}
              <button
                onClick={next}
                className="btn-acc h-[58px] flex-1 rounded-full fs-17 transition-opacity"
                style={{ opacity: canNext ? 1 : 0.45 }}
              >
                {step === 1 ? `Elegir a ${THEME_INFO[theme].mascotName}` : step < STEPS - 1 ? 'Siguiente' : 'Crear mi espacio'}
              </button>
            </div>
          </div>
        )}

        {phase === 'back' && returning && (
          <>
            <div className="anim-up absolute right-7 left-7 text-center" style={{ top: '49.8%' }}>
              <div className="txt-acc2 fs-15">Welcome back,</div>
              <div className="fs-44 leading-[1.1] font-bold tracking-[-1.4px]">{firstName}</div>
              <div className="mt-[18px] flex justify-center gap-2">
                <span className="glass flex h-9 items-center gap-1.5 rounded-[18px] px-3.5 text-sm font-semibold">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--acc)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 1.5 2 1.5 3 1-2 1.5-4 1.5-7" />
                  </svg>
                  {returning.streak} {returning.streak === 1 ? 'día' : 'días'}
                </span>
                <span className="glass flex h-9 items-center rounded-[18px] px-3.5 text-sm">Nivel {returning.level}</span>
              </div>
            </div>
            <div
              className="pointer-events-auto absolute right-[22px] left-[22px] flex flex-col gap-2.5"
              style={{
                bottom: 'calc(env(safe-area-inset-bottom) + 40px)',
                animation: 'hb-up .6s .2s ease both',
              }}
            >
              {returning.lastTopic && (
                <div className="glass flex items-center gap-3 rounded-3xl px-4 py-3.5">
                  <span
                    className="txt-acc2 grid h-10 w-10 flex-none place-items-center rounded-full"
                    style={{ border: '1px solid var(--gb)' }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 5h16v11H9l-5 4zM8 10h8M8 13h5" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="txt-sub block text-xs">Lo dejaste aquí</span>
                    <span className="block truncate fs-15 font-semibold">{returning.lastTopic}</span>
                  </span>
                </div>
              )}
              <button
                ref={continueBtn}
                onClick={() => {
                  cheerUp()
                  setPhase('enter')
                }}
                className="btn-acc h-[58px] rounded-full fs-17"
              >
                Continuar donde lo dejé
              </button>
            </div>
          </>
        )}

        {phase === 'enter' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-[30px] text-center opacity-0"
            style={{
              color: '#1a0f04',
              animation: 'hb-up .6s .7s ease forwards',
            }}
          >
            <div className="fs-15 font-semibold tracking-[1.5px] uppercase opacity-70">
              {returning ? 'Entrando a Habla' : 'Tu espacio está listo'}
            </div>
            <div className="mt-1.5 fs-38 leading-[1.1] font-bold tracking-[-1.2px] text-balance">
              {returning ? `Seguimos, ${firstName}` : firstName ? `Let's talk, ${firstName}!` : "Let's talk!"}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
