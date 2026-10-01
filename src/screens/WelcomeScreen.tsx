import { useEffect, useRef, useState } from 'react'
import { db, type Profile } from '../lib/db'
import { getProfile } from '../lib/profile'

// Bienvenida animada (diseño "Bienvenida"): un muñequito de gelatina con cara cae, rebota y te sigue con
// los ojos. Usuario nuevo: tres pasos (nombre, a qué se dedica, qué le gusta). Usuario que vuelve:
// "Welcome back" con su racha, nivel y último tema. Al entrar, el muñequito crece hasta llenar la pantalla.

type Phase = 'intro' | 'welcome' | 'loading' | 'setup' | 'back' | 'enter'

// Posición (fracción del alto), radio y órbita del muñequito en cada fase.
const TGT: Record<Phase, { y: number; r: number; orbit: number }> = {
  intro: { y: 0.437, r: 70, orbit: 0 },
  welcome: { y: 0.352, r: 78, orbit: 0 },
  loading: { y: 0.46, r: 58, orbit: 1.9 },
  setup: { y: 0.17, r: 44, orbit: 0 },
  back: { y: 0.34, r: 80, orbit: 0 },
  enter: { y: 0.5, r: 1150, orbit: 0 },
}

const LOAD_MSGS = ['Conociendo tu nivel', 'Eligiendo a tu profe', 'Ordenando los temas', 'Casi listo']
const ROLES = ['Estudiante', 'Tecnología', 'Salud', 'Educación', 'Negocios', 'Jubilado/a', 'Otro']
// Gustos → categorías de temas de la app.
const LIKES: [string, string][] = [
  ['Tecnología', 'tech'],
  ['IA', 'ai'],
  ['Noticias', 'news'],
  ['Viajes', 'travel'],
  ['Cine, series y música', 'movies'],
  ['Deportes', 'sports'],
  ['Negocios', 'business'],
  ['Ciencia', 'science'],
  ['Comida', 'food'],
  ['Dinero', 'money'],
  ['Emprender', 'startups'],
  ['Imaginar', 'whatif'],
]

interface Physics {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  vr: number
  sx: number
  sy: number
  vsx: number
  vsy: number
  fx: number
  fy: number
  fvx: number
  fvy: number
  px: number | null
  py: number | null
  down: boolean
  parts: { x: number; y: number; vx: number; vy: number; r: number; age: number }[]
  t: number
  landed: boolean
  happy: number
}

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
}

export default function WelcomeScreen({ returning, onImport, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [work, setWork] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [likes, setLikes] = useState<string[]>([])
  const [msgI, setMsgI] = useState(0)
  const [pokes, setPokes] = useState(0)
  const [importError, setImportError] = useState<string | null>(null)

  const box = useRef<HTMLDivElement>(null)
  const goo = useRef<SVGGElement>(null)
  const face = useRef<SVGGElement>(null)
  const eyes = useRef<SVGGElement>(null)
  const pupils = useRef<SVGGElement>(null)
  const mouth = useRef<SVGPathElement>(null)
  const glow = useRef<SVGCircleElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const phaseRef = useRef<Phase>('intro')
  const P = useRef<Physics | null>(null)
  const size = useRef({ w: window.innerWidth, h: window.innerHeight })
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Bucle de física (requestAnimationFrame), igual que en el diseño pero adaptado al tamaño real.
  useEffect(() => {
    const el = box.current!
    size.current = { w: el.clientWidth, h: el.clientHeight }
    const ro = new ResizeObserver(() => {
      size.current = { w: el.clientWidth, h: el.clientHeight }
      setDims(size.current)
    })
    ro.observe(el)
    const { w } = size.current
    P.current = { x: w / 2, y: -140, vx: 0, vy: 0, r: 46, vr: 0, sx: 1, sy: 1, vsx: 0, vsy: 0, fx: w / 2, fy: -140, fvx: 0, fvy: 0, px: null, py: null, down: false, parts: [], t: 0, landed: false, happy: 0 }
    let raf = 0
    const loop = () => {
      const p = P.current!
      const g = goo.current
      if (g) {
        const { w: W, h: H } = size.current
        const scale = Math.min(1, W / 370)
        p.t++
        const ph = phaseRef.current
        const T = TGT[ph]
        const tx0 = W / 2
        const ty0 = T.y * H
        const tr = ph === 'enter' ? Math.max(W, H) * 1.4 : T.r * scale
        const k = ph === 'enter' ? 0.03 : 0.06
        p.vx += (tx0 - p.x) * k
        p.vy += (ty0 - p.y) * k
        p.vx *= 0.82
        p.vy *= 0.82
        p.x += p.vx
        p.y += p.vy
        p.vr += (tr - p.r) * (ph === 'enter' ? 0.015 : 0.08)
        p.vr *= 0.82
        p.r += p.vr
        if (ph === 'intro' && !p.landed && p.y > ty0 - 6 && p.vy > 0) {
          p.landed = true
          squish(0.55)
          splash(7, 7)
        }
        p.vsx += (1 - p.sx) * 0.14
        p.vsx *= 0.86
        p.sx += p.vsx
        p.vsy += (1 - p.sy) * 0.14
        p.vsy *= 0.86
        p.sy += p.vsy
        const wob = Math.sin(p.t * 0.05) * 0.035
        const sxd = p.sx + wob
        const syd = p.sy - wob
        const r = p.r
        const huge = r > 400
        const ch = g.children
        ch[0].setAttribute('cx', String(p.x))
        ch[0].setAttribute('cy', String(p.y))
        ch[0].setAttribute('rx', String(r * sxd))
        ch[0].setAttribute('ry', String(r * syd))
        for (let i = 0; i < 5; i++) {
          const ang = p.t * 0.013 * (i % 2 ? 1 : -1) + i * 1.2566
          const d = T.orbit ? r * (T.orbit + 0.25 * Math.sin(p.t * 0.04 + i)) : r * (0.5 + 0.18 * Math.sin(p.t * 0.03 + i * 2))
          const sr = T.orbit ? r * (0.22 + 0.06 * Math.sin(p.t * 0.05 + i)) : r * 0.42
          const c = ch[1 + i]
          c.setAttribute('cx', String(p.x + Math.cos(ang) * d * sxd))
          c.setAttribute('cy', String(p.y + Math.sin(ang) * d * syd))
          c.setAttribute('r', String(huge ? 0 : sr))
        }
        // Un "brazo" de gelatina que se estira hacia el dedo.
        let tx = p.x
        let ty = p.y
        if (p.px != null && p.py != null && !huge) {
          const dx = p.px - p.x
          const dy = p.py - p.y
          const dist = Math.hypot(dx, dy) || 1
          if (dist < r * 3.4) {
            const reach = Math.min(dist, r * (p.down ? 1.75 : 1.3))
            tx = p.x + (dx / dist) * reach
            ty = p.y + (dy / dist) * reach
          }
        }
        p.fvx += (tx - p.fx) * 0.12
        p.fvy += (ty - p.fy) * 0.12
        p.fvx *= 0.74
        p.fvy *= 0.74
        p.fx += p.fvx
        p.fy += p.fvy
        ch[6].setAttribute('cx', String(p.fx))
        ch[6].setAttribute('cy', String(p.fy))
        ch[6].setAttribute('r', String(huge ? 0 : r * 0.4))
        p.parts = p.parts.filter((q) => {
          q.age++
          q.vx += (p.x - q.x) * 0.0035
          q.vy += (p.y - q.y) * 0.0035 + 0.06
          q.vx *= 0.965
          q.vy *= 0.965
          q.x += q.vx
          q.y += q.vy
          return q.age < 26 || Math.hypot(p.x - q.x, p.y - q.y) > r * 0.55
        })
        for (let i = 0; i < 10; i++) {
          const c = ch[7 + i]
          const q = p.parts[i]
          if (q) {
            c.setAttribute('cx', String(q.x))
            c.setAttribute('cy', String(q.y))
            c.setAttribute('r', String(q.r))
          } else c.setAttribute('r', '0')
        }
        glow.current?.setAttribute('cx', String(p.x))
        glow.current?.setAttribute('cy', String(p.y))
        glow.current?.setAttribute('r', String(Math.min(r * 2.3, 500)))
        if (face.current) {
          const s = r / 70
          face.current.setAttribute('transform', `translate(${p.x},${p.y}) scale(${s * sxd},${s * syd})`)
          face.current.style.opacity = r > 300 ? '0' : '1'
        }
        let lx = Math.sin(p.t * 0.02) * 3
        let ly = Math.cos(p.t * 0.017) * 2
        if (p.px != null && p.py != null) {
          const dx = p.px - p.x
          const dy = p.py - p.y
          const d = Math.hypot(dx, dy) || 1
          lx = (dx / d) * Math.min(5, d / 20)
          ly = (dy / d) * Math.min(4.5, d / 20)
        }
        pupils.current?.setAttribute('transform', `translate(${lx},${ly})`)
        const bt = p.t % 240
        const blink = bt < 8 ? (Math.abs(bt - 4) / 4) * 0.9 + 0.1 : 1
        eyes.current?.setAttribute('transform', `translate(0,-6) scale(1,${p.happy > 0 ? 0.55 : blink}) translate(0,6)`)
        if (p.happy > 0) p.happy--
        if (mouth.current) {
          mouth.current.setAttribute('d', p.happy > 0 ? 'M-9 10 Q0 24 9 10 Z' : ph === 'loading' ? 'M-5 13 Q0 15 5 13' : 'M-7 12 Q0 18 7 12')
          mouth.current.setAttribute('fill', p.happy > 0 ? '#1a0f04' : 'none')
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const t1 = setTimeout(() => setPhase(returning ? 'back' : 'welcome'), 3000)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      ro.disconnect()
    }
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function squish(a: number) {
    const p = P.current
    if (!p) return
    p.vsx += a
    p.vsy -= a
    p.happy = 40
  }
  function splash(n: number, sp: number) {
    const p = P.current
    if (!p) return
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const v = sp * (0.6 + Math.random() * 0.6)
      p.parts.push({ x: p.x + Math.cos(a) * p.r * 0.7, y: p.y + Math.sin(a) * p.r * 0.7, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: p.r * (0.16 + Math.random() * 0.12), age: 0 })
    }
    p.parts = p.parts.slice(-10)
  }
  const bump = () => squish(0.14)

  const pt = (e: React.PointerEvent) => {
    const b = box.current!.getBoundingClientRect()
    return [e.clientX - b.left, e.clientY - b.top] as const
  }

  // Mensajes de "Preparando tu espacio" y paso al formulario.
  useEffect(() => {
    if (phase !== 'loading') return
    const a = setInterval(() => setMsgI((x) => x + 1), 1100)
    const b = setTimeout(() => {
      splash(6, 6)
      setPhase('setup')
    }, 3000)
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

  const canNext = step === 0 ? name.trim().length > 0 : step === 2 ? likes.length > 0 : true

  const next = async () => {
    if (!canNext) {
      if (P.current) P.current.vx += 6 // "no" con la cabeza
      return
    }
    squish(0.25)
    splash(3, 5)
    if (step < 2) {
      setStep(step + 1)
      return
    }
    const p = await getProfile()
    const about = [role, work.trim()].filter(Boolean).join(' · ')
    const profile: Profile = { ...p, name: name.trim(), about, interests: likes }
    await db.profile.put(profile)
    setPhase('enter')
  }

  const firstName = (returning?.name ?? name).split(' ')[0]
  const chip = (sel: boolean) => (sel ? 'btn-acc scale-[1.04]' : 'glass')
  const W = dims.w
  const H = dims.h

  return (
    <div
      ref={box}
      onPointerMove={(e) => {
        const [x, y] = pt(e)
        if (P.current) {
          P.current.px = x
          P.current.py = y
        }
      }}
      onPointerDown={(e) => {
        const [x, y] = pt(e)
        const p = P.current
        if (!p) return
        p.px = x
        p.py = y
        p.down = true
        if (Math.hypot(x - p.x, y - p.y) < p.r * 1.25 && p.r < 400) {
          squish(0.45)
          splash(8, 8)
          p.vy -= 5
          setPokes((n) => n + 1)
        }
      }}
      onPointerUp={() => P.current && (P.current.down = false)}
      onPointerLeave={() => {
        if (P.current) {
          P.current.px = null
          P.current.down = false
        }
      }}
      className="relative z-[2] h-full w-full overflow-hidden select-none"
      style={{ touchAction: phase === 'setup' ? 'auto' : 'none' }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 z-[1] overflow-visible" aria-hidden>
        <defs>
          <filter id="bw-goo" filterUnits="userSpaceOnUse" x="-600" y="-600" width="3000" height="4000">
            <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="b" />
            <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="g" />
            <feComposite in="SourceGraphic" in2="g" operator="atop" />
          </filter>
          <radialGradient id="bw-fill" cx=".38" cy=".3" r=".8">
            <stop offset="0" stopColor="#ffe4a8" />
            <stop offset=".35" stopColor="#ffb14a" />
            <stop offset=".8" stopColor="#ff6a2b" />
            <stop offset="1" stopColor="#e2501a" />
          </radialGradient>
          <radialGradient id="bw-glow">
            <stop offset="0" stopColor="#ffb14a" stopOpacity=".45" />
            <stop offset=".5" stopColor="#2fd0b0" stopOpacity=".14" />
            <stop offset="1" stopColor="#2fd0b0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle ref={glow} cx={W / 2} cy={-200} r={160} fill="url(#bw-glow)" />
        <g ref={goo} filter="url(#bw-goo)">
          <ellipse cx={W / 2} cy={-200} rx={30} ry={30} fill="url(#bw-fill)" />
          {Array.from({ length: 6 }, (_, i) => (
            <circle key={`b${i}`} r={0} fill="url(#bw-fill)" />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <circle key={`p${i}`} r={0} fill="#ff8a3a" />
          ))}
        </g>
        <g ref={face} transform={`translate(${W / 2},-200)`} style={{ transition: 'opacity .3s' }}>
          <ellipse cx={-24} cy={-30} rx={15} ry={8} fill="#fff" opacity=".55" transform="rotate(-30 -24 -30)" />
          <g ref={eyes}>
            <ellipse cx={-17} cy={-6} rx={9} ry={11} fill="#fff" />
            <ellipse cx={17} cy={-6} rx={9} ry={11} fill="#fff" />
            <g ref={pupils}>
              <circle cx={-17} cy={-5} r={5.2} fill="#1a0f04" />
              <circle cx={17} cy={-5} r={5.2} fill="#1a0f04" />
              <circle cx={-15} cy={-8} r={1.8} fill="#fff" />
              <circle cx={19} cy={-8} r={1.8} fill="#fff" />
            </g>
          </g>
          <path ref={mouth} d="M-7 12 Q0 18 7 12" fill="none" stroke="#1a0f04" strokeWidth={2.6} strokeLinecap="round" />
          <ellipse cx={-30} cy={10} rx={7} ry={4} fill="#ff5a5a" opacity=".35" />
          <ellipse cx={30} cy={10} rx={7} ry={4} fill="#ff5a5a" opacity=".35" />
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 z-[3]">
        {phase === 'intro' && (
          <>
            <div className="absolute right-0 left-0 flex justify-center text-[58px] font-bold tracking-[-2px]" style={{ top: '60.7%' }}>
              {'Habla.'.split('').map((c, i) => (
                <span
                  key={i}
                  className="inline-block opacity-0"
                  style={{ color: c === '.' ? 'var(--acc)' : 'var(--tx)', animation: `bw-letter .7s cubic-bezier(.3,1.4,.5,1) ${1 + i * 0.09}s forwards` }}
                >
                  {c}
                </span>
              ))}
            </div>
            <div className="txt-sub absolute right-0 left-0 text-center text-[15px] opacity-0" style={{ top: '70.4%', animation: 'hb-fadein .8s 1.9s ease forwards' }}>
              Tu espacio para hablar inglés
            </div>
          </>
        )}

        {phase === 'welcome' && (
          <>
            <div className="txt-sub absolute right-0 left-0 text-center text-[13px]" style={{ top: '23.8%', animation: 'bw-bob 2s ease-in-out infinite' }}>
              {pokes === 0 ? 'Tócame' : pokes < 4 ? '¡Otra vez!' : 'Jeje, me haces cosquillas'}
            </div>
            <div className="anim-up absolute right-7 left-7 text-center" style={{ top: '51%' }}>
              <div className="txt-acc2 text-[15px] tracking-[1.5px] uppercase">Welcome to</div>
              <div className="mt-1 text-[52px] leading-[1.05] font-bold tracking-[-1.8px]">
                Habla<span className="txt-acc">.</span>
              </div>
              <div className="txt-sub mt-3 text-base leading-snug text-pretty">
                Un lugar tranquilo para practicar inglés hablando, a tu ritmo y sin miedo a equivocarte.
              </div>
            </div>
            <div
              className="pointer-events-auto absolute right-[22px] left-[22px] flex flex-col gap-2.5"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 40px)', animation: 'hb-up .6s .25s ease both' }}
            >
              <button
                onClick={() => {
                  squish(0.3)
                  setMsgI(0)
                  setPhase('loading')
                }}
                className="btn-acc h-[58px] rounded-full text-[17px]"
              >
                Soy nuevo, empecemos
              </button>
              <button onClick={() => fileInput.current?.click()} className="glass h-[58px] rounded-full text-base font-medium">
                Ya tengo mi perfil (importar copia)
              </button>
              {importError && (
                <div className="text-center text-[13px]" style={{ color: '#f87171' }}>
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
                    squish(0.35)
                    splash(5, 6)
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
            <div className="txt-sub relative mt-2 h-[22px] text-[15px]">
              <div key={msgI} className="absolute inset-0 flex justify-center" style={{ animation: 'ld-msg 1.1s ease both' }}>
                {LOAD_MSGS[Math.min(msgI, LOAD_MSGS.length - 1)]}
                <span style={{ animation: 'hb-dot 1s infinite' }}>…</span>
              </div>
            </div>
          </div>
        )}

        {phase === 'setup' && (
          <div className="anim-up pointer-events-auto absolute right-[18px] left-[18px] flex flex-col" style={{ top: '27.6%', bottom: 'calc(env(safe-area-inset-bottom) + 34px)' }}>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-[7px] rounded transition-all duration-300"
                  style={{ width: i === step ? 24 : 7, background: i <= step ? 'var(--acc)' : 'var(--gb)' }}
                />
              ))}
            </div>
            <div className="mt-[18px] text-center text-[28px] font-semibold tracking-[-.6px]">
              {['¿Cómo te llamas?', name ? `¿A qué te dedicas, ${name.split(' ')[0]}?` : '¿A qué te dedicas?', '¿Qué te gusta?'][step]}
            </div>
            <div className="txt-sub mt-1.5 text-center text-[15px]">
              {['Así te saludará tu profe', 'Para practicar situaciones de tu día a día', 'Elige al menos uno. Los temas saldrán de aquí'][step]}
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
              {step === 0 && (
                <div key="s0" className="anim-up mt-[26px]">
                  <input
                    value={name}
                    onChange={(e) => {
                      bump()
                      setName(e.target.value)
                    }}
                    placeholder="Tu nombre"
                    autoComplete="given-name"
                    className="glass h-[60px] w-full rounded-[30px] px-[22px] text-center text-[19px] outline-none"
                    style={{ color: 'var(--tx)' }}
                  />
                </div>
              )}
              {step === 1 && (
                <div key="s1" className="anim-up mt-[22px] flex flex-col gap-3">
                  <input
                    value={work}
                    onChange={(e) => {
                      bump()
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
                          bump()
                          setRole(role === r ? null : r)
                        }}
                        className={`h-[42px] rounded-[21px] px-4 text-[14.5px] transition-transform ${chip(role === r)}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {step === 2 && (
                <div key="s2" className="anim-up mt-[22px] flex flex-wrap justify-center gap-2">
                  {LIKES.map(([label, id]) => (
                    <button
                      key={id}
                      onClick={() => {
                        bump()
                        setLikes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
                      }}
                      className={`h-[42px] rounded-[21px] px-4 text-[14.5px] transition-transform ${chip(likes.includes(id))}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2.5">
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} className="glass grid h-[58px] w-[58px] flex-none place-items-center rounded-full" aria-label="Atrás">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
              )}
              <button onClick={next} className="btn-acc h-[58px] flex-1 rounded-full text-[17px] transition-opacity" style={{ opacity: canNext ? 1 : 0.45 }}>
                {step < 2 ? 'Siguiente' : 'Crear mi espacio'}
              </button>
            </div>
          </div>
        )}

        {phase === 'back' && returning && (
          <>
            <div className="anim-up absolute right-7 left-7 text-center" style={{ top: '49.8%' }}>
              <div className="txt-acc2 text-[15px]">Welcome back,</div>
              <div className="text-[44px] leading-[1.1] font-bold tracking-[-1.4px]">{firstName}</div>
              <div className="mt-[18px] flex justify-center gap-2">
                <span className="glass flex h-9 items-center gap-1.5 rounded-[18px] px-3.5 text-sm font-semibold">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 1.5 2 1.5 3 1-2 1.5-4 1.5-7" />
                  </svg>
                  {returning.streak} {returning.streak === 1 ? 'día' : 'días'}
                </span>
                <span className="glass flex h-9 items-center rounded-[18px] px-3.5 text-sm">Nivel {returning.level}</span>
              </div>
            </div>
            <div
              className="pointer-events-auto absolute right-[22px] left-[22px] flex flex-col gap-2.5"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 40px)', animation: 'hb-up .6s .2s ease both' }}
            >
              {returning.lastTopic && (
                <div className="glass flex items-center gap-3 rounded-3xl px-4 py-3.5">
                  <span className="txt-acc2 grid h-10 w-10 flex-none place-items-center rounded-full" style={{ border: '1px solid var(--gb)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 5h16v11H9l-5 4zM8 10h8M8 13h5" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="txt-sub block text-xs">Lo dejaste aquí</span>
                    <span className="block truncate text-[15px] font-semibold">{returning.lastTopic}</span>
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  squish(0.3)
                  setPhase('enter')
                }}
                className="btn-acc h-[58px] rounded-full text-[17px]"
              >
                Continuar donde lo dejé
              </button>
            </div>
          </>
        )}

        {phase === 'enter' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-[30px] text-center opacity-0"
            style={{ color: '#1a0f04', animation: 'hb-up .6s .7s ease forwards' }}
          >
            <div className="text-[15px] font-semibold tracking-[1.5px] uppercase opacity-70">{returning ? 'Entrando a Habla' : 'Tu espacio está listo'}</div>
            <div className="mt-1.5 text-[38px] leading-[1.1] font-bold tracking-[-1.2px] text-balance">
              {returning ? `Seguimos, ${firstName}` : firstName ? `Let's talk, ${firstName}!` : "Let's talk!"}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
