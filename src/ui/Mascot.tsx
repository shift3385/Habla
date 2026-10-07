/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, createElement as h, type ReactNode } from 'react'

// Mascotas del tema (Claude Design V4 · Mascota.dc.html), portadas tal cual: SVG vectorial animado con
// requestAnimationFrame (a ritmo completo solo cuando se mueve; ver el planificador, v5.8.2). Cuerpo "slime" de 16 puntos, ojos que siguen el dedo, gestos propios en reposo,
// reacción al tocar y al estirar, y un secreto con 5 toques en 2,2 s.
//   flame = Chispa (Ember) · aqua = Gota (Marea) · terra = Musgo (Lumi) · aero = Brisa (Nimbo)

export type MascotElement = 'flame' | 'aqua' | 'terra' | 'aero'
export type MascotMood = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy'

interface Props {
  element: MascotElement
  mood?: MascotMood
  size?: number
  interactive?: boolean
  onTap?: () => void
  onSecret?: () => void
}

type Pt = [number, number]

const POOL = 28
const SH: Record<string, string> = {
  circ: 'M-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0Z',
  drop: 'M0-1.7C.9-.5 1.1.2 1.1.6A1.1 1.1 0 0 1-1.1.6C-1.1.2-.9-.5 0-1.7Z',
  leaf: 'M0 1.2C-.8.5-.8-.6 0-1.3C.8-.6.8.5 0 1.2Z',
  streak: 'M-2 0Q0-.3 2 0Q0 .3-2 0Z',
}
const PAL: Record<MascotElement, { stops: string[]; alt?: string[]; eye: string; glow: string; op: number; rim: string }> = {
  flame: { stops: ['#ffe39a', '#ff8a2a', '#c83a10'], alt: ['#eaf8ff', '#5fb4ff', '#1d4fd1'], eye: '#3a1405', glow: '#ff7a2a', op: 1, rim: 'rgba(255,230,180,.5)' },
  aqua: { stops: ['#b5fbef', '#25b8b2', '#0a5a6e'], eye: '#062f3a', glow: '#2fd0c0', op: 0.93, rim: 'rgba(220,255,250,.65)' },
  terra: { stops: ['#e4eca8', '#98ae52', '#56652c'], eye: '#262d0e', glow: '#9fd25a', op: 1, rim: 'rgba(240,250,200,.35)' },
  aero: { stops: ['#ffffff', '#dcedff', '#9cc3ee'], eye: '#1d3967', glow: '#bfe0ff', op: 0.96, rim: 'rgba(255,255,255,.85)' },
}
const N = 16,
  RX = 58,
  RYT = 54,
  RYB = 28,
  BASE = 40,
  CY = 12
const BP: [number, number, number][] = Array.from({ length: N }, (_, i) => {
  const a = -Math.PI / 2 + (i / N) * Math.PI * 2,
    s = Math.sin(a),
    c = Math.cos(a)
  return [c * RX * (s > 0 ? 1 + 0.1 * s : 1), CY + (s < 0 ? s * RYT : s * RYB), s]
})
const TONG = [
  [12, 0.45],
  [13, 0.7],
  [14, 0.9],
  [15, 1],
  [0, 1.12],
  [1, 1],
  [2, 0.9],
  [3, 0.7],
  [4, 0.45],
]
const DROPS = [
  [-66, -30, 5.5],
  [70, -16, 4.5],
  [-50, -62, 3.8],
  [54, -64, 3.2],
]
const SPECK = [
  [-30, -2, 2.2],
  [-12, 10, 1.6],
  [20, 2, 2],
  [34, 16, 1.4],
  [-40, 18, 1.8],
  [8, 26, 2.4],
  [-20, 30, 1.5],
  [44, 4, 1.6],
  [-6, 0, 1.3],
  [26, 30, 1.8],
  [-48, 6, 1.2],
  [14, 14, 1.5],
]
const BUB = [
  [-18, 0],
  [10, 1.7],
  [26, 3.1],
  [-30, 4.4],
  [0, 5.6],
  [18, 6.9],
]
const CLOUDS = [
  [64, -28, 1.15],
  [-66, 8, 1.05],
  [46, 28, 0.8],
  [-44, -50, 0.75],
]
const CLOUD = 'M-14 6a7 7 0 0 1 1-13a9 9 0 0 1 16-3a7 7 0 0 1 11 6a6 6 0 0 1 1 10Z'
const WIND = ['M-104 -4Q-86 -26 -60 -22', 'M66 -48Q90 -54 104 -32', 'M72 32Q94 24 106 38']
const SWIRL = ['M-32 20C-34 2 -10 -6 -4 8C0 18 -16 22 -18 12', 'M14 -18C24 -28 42 -16 34 -2C28 8 16 2 20 -6']
const f1 = (n: number) => n.toFixed(1)
const lerpC = (a: string, b: string, k: number) => {
  const p = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)),
    A = p(a),
    B = p(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')
}
function blob(p: Pt[]) {
  const n = p.length
  let d = `M${f1(p[0][0])} ${f1(p[0][1])}`
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n],
      b = p[i],
      c = p[(i + 1) % n],
      e = p[(i + 2) % n]
    d += `C${f1(b[0] + (c[0] - a[0]) / 6)} ${f1(b[1] + (c[1] - a[1]) / 6)} ${f1(c[0] - (e[0] - b[0]) / 6)} ${f1(c[1] - (e[1] - b[1]) / 6)} ${f1(c[0])} ${f1(c[1])}`
  }
  return d + 'Z'
}
const INIT_D = blob(BP.map(([x, y]) => [x, y]))
function tongue(B: Pt, nx: number, ny: number, tx: number, ty: number, L: number, w: number, sw: number) {
  const l = [B[0] - tx * w, B[1] - ty * w],
    rr = [B[0] + tx * w, B[1] + ty * w],
    tip = [B[0] + nx * L + tx * sw, B[1] + ny * L + ty * sw]
  const cl = [l[0] + nx * L * 0.55 - tx * w * 0.15, l[1] + ny * L * 0.55 - ty * w * 0.15],
    cr = [rr[0] + nx * L * 0.55 + tx * w * 0.15, rr[1] + ny * L * 0.55 + ty * w * 0.15]
  return `M${f1(l[0])} ${f1(l[1])}Q${f1(cl[0])} ${f1(cl[1])} ${f1(tip[0])} ${f1(tip[1])}Q${f1(cr[0])} ${f1(cr[1])} ${f1(rr[0])} ${f1(rr[1])}Z`
}

// ---------------------------------------------------------------------------------------------------------------
// Consumo (v5.8.2, AUD-RES-701 / AUD-ARQ-110): antes cada mascota tenía su propio bucle a 60–120 fps aunque estuviera
// quieta (≈1 núcleo en reposo; dos mascotas, dos bucles). Ahora hay UN solo planificador para todas: a ritmo
// completo solo mientras hay movimiento (toque, salto, partículas, habla, ojos siguiendo el dedo); en reposo, unos
// 15 fps (el balanceo es lento y se ve igual); 4 fps con «reducir movimiento» del sistema; nada si la mascota no
// se ve (fuera de pantalla, tapada por desmontaje o app oculta). Y entre fotogramas lentos no se pide ningún rAF.
const IDLE_MS = 66
const REDUCED_MS = 250
const HIDDEN_MS = 500
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const live = new Set<Mascot>()
let rafId = 0
let timer = 0
function schedule() {
  if (rafId || !live.size) return
  let next = Infinity
  for (const m of live) next = Math.min(next, m.nextAt)
  const wait = next - performance.now()
  if (timer) clearTimeout(timer)
  timer = 0
  // Hasta el próximo fotograma lento no hace falta despertar al compositor.
  if (wait > 20) timer = window.setTimeout(() => ((timer = 0), schedule()), wait - 12)
  else rafId = requestAnimationFrame(loop)
}
function loop(t: number) {
  rafId = 0
  for (const m of [...live]) if (t >= m.nextAt - 8) m.frame(t)
  schedule()
}

export default class Mascot extends Component<Props> {
  /** Cuándo toca el próximo fotograma de esta mascota (planificador compartido). */
  nextAt = 0
  visible = true
  io: IntersectionObserver | null = null
  uid = 'm' + Math.random().toString(36).slice(2, 8)
  r: Record<string, any> = {}
  _rf: Record<string, (el: any) => void> = {}
  P: any = null
  _el: MascotElement = 'flame'

  rf(n: string) {
    return this._rf[n] || (this._rf[n] = (el: any) => {
      this.r[n] = el
    })
  }
  fresh() {
    const t = performance.now()
    return { sx: 1, sy: 1, vsx: 0, vsy: 0, hop: 0, vhop: 0, dx: 0, dy: 0, vdx: 0, vdy: 0, tdx: 0, tdy: 0, lx: 0, ly: 0, amp: 0, jig: 0, burst: 0, happy: 0, surprise: 0, lift: 0, vlift: 0, tilt: 0, sprout: 1, vsp: 0, bloom: 0, rain: 0, mw: 9, mt: 1.5, mh: 8, taps: [] as number[], parts: new Array(POOL).fill(null), pi: 0, ptr: null as Pt | null, ptrT: 0, down: null as any, blinkAt: t + 1500, blinkS: -1e9, quirkAt: t + 4000, secretUntil: 0, rippleS: -1e9, flipS: 0, idc: 0, spinA: 0, spinV: 0, lastM: null as Pt | null, dizzy: 0 } as any
  }
  componentDidMount() {
    this.P = this.fresh()
    this._el = this.props.element || 'flame'
    window.addEventListener('pointermove', this.onWin)
    if (typeof IntersectionObserver === 'function' && this.r.svg) {
      this.io = new IntersectionObserver((es) => {
        this.visible = es.some((e) => e.isIntersecting)
        if (this.visible) this.wake()
      })
      this.io.observe(this.r.svg)
    }
    live.add(this)
    this.wake()
  }
  componentWillUnmount() {
    live.delete(this)
    this.io?.disconnect()
    window.removeEventListener('pointermove', this.onWin)
  }
  /** Vuelve al ritmo completo ya (toque, cambio de ánimo, dedo cerca). */
  wake() {
    this.nextAt = 0
    if (rafId === 0) schedule()
  }
  componentDidUpdate() {
    this.wake()
    const el = this.props.element || 'flame'
    if (this._el !== el) {
      this._el = el
      this.P = this.fresh()
    }
  }
  loc(e: { clientX: number; clientY: number }): Pt | null {
    const s = this.r.svg
    if (!s) return null
    const b = s.getBoundingClientRect()
    if (!b.width) return null
    return [((e.clientX - b.left) / b.width) * 220 - 110, ((e.clientY - b.top) / b.height) * 220 - 125]
  }
  onWin = (e: PointerEvent) => {
    const p = this.loc(e)
    if (p && this.P) {
      this.P.ptr = p
      this.P.ptrT = performance.now()
      this.wake()
    }
  }
  inter() {
    return this.props.interactive !== false
  }
  squish(a: number) {
    this.P.vsx += a
    this.P.vsy -= a
  }
  hopv(v: number) {
    const P = this.P
    if (P.hop > -2) P.vhop = -v
  }
  spawn(o: any) {
    const P = this.P
    let i = P.parts.findIndex((q: any) => !q || q.life <= 0)
    if (i < 0) {
      i = P.pi
      P.pi = (P.pi + 1) % POOL
    }
    const q = { x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0.98, life: 40, s: 2, rot: 0, vr: 0, shape: 'circ', color: '#fff', op: 1, ph: Math.random() * 6, ...o, id: ++P.idc }
    q.max = q.life
    P.parts[i] = q
  }
  oxy(): Pt {
    const P = this.P
    return [0, this.props.element === 'aero' ? Math.sin(performance.now() * 0.0016) * 6 - 12 + P.lift : P.hop]
  }
  tap() {
    const P = this.P,
      el = this.props.element || 'flame',
      R = Math.random,
      t = performance.now(),
      [ox, oy] = this.oxy()
    P.taps = P.taps.filter((x: number) => t - x < 2200)
    P.taps.push(t)
    this.squish(0.3)
    P.happy = 50
    P.jig = 1
    P.burst = 1
    P.quirkAt = t + 7000
    if (el === 'flame') {
      this.hopv(7)
      for (let k = 0; k < 12; k++) {
        const a = -Math.PI / 2 + (k / 11 - 0.5) * 2.6,
          v = 3 + R() * 3
        this.spawn({ x: ox + Math.cos(a) * 30, y: oy - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.08, drag: 0.96, life: 40, s: 2 + R() * 1.6, color: R() < 0.5 ? '#ffd36b' : '#ff6a2b' })
      }
    }
    if (el === 'aqua') {
      this.hopv(6)
      P.rippleS = t
      for (let k = 0; k < 12; k++) {
        const a = -Math.PI / 2 + (R() - 0.5) * 2.4,
          v = 3 + R() * 3.5
        this.spawn({ x: ox + Math.cos(a) * 30, y: oy - 18, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.22, life: 60, s: 3 + R() * 2, shape: 'drop', color: '#6ee6df', orient: true, ground: true })
      }
    }
    if (el === 'terra') {
      this.hopv(10)
      P.vsp += 0.5
      for (let k = 0; k < 8; k++) this.spawn({ x: ox + (R() - 0.5) * 100, y: BASE, vx: (R() - 0.5) * 2.5, vy: -0.6 - R() * 0.8, g: -0.005, life: 40, s: 5 + R() * 4, color: '#cbb98a', op: 0.5, grow: true })
      for (let k = 0; k < 3; k++) this.spawn({ x: ox, y: oy - 44, vx: (R() - 0.5) * 4, vy: -3 - R() * 2, g: 0.07, drag: 0.97, vr: (R() - 0.5) * 12, shape: 'leaf', s: 7, color: '#6fae3a', life: 70 })
    }
    if (el === 'aero') {
      P.vlift -= 7.5
      for (let k = 0; k < 8; k++) {
        const sd = k % 2 ? 1 : -1
        this.spawn({ x: ox + sd * 60, y: oy + R() * 50 - 25, vx: sd * (3 + R() * 2), vy: 0, shape: 'streak', s: 7, color: '#fff', op: 0.75, life: 30, drag: 0.95 })
      }
      for (let k = 0; k < 5; k++) this.spawn({ x: ox + (R() - 0.5) * 90, y: oy + 30, vx: (R() - 0.5) * 1.5, vy: 0.4, s: 6, color: '#fff', op: 0.6, life: 40, grow: true })
    }
    this.props.onTap?.()
    if (P.taps.length >= 5) {
      P.taps = []
      this.secret()
    }
  }
  secret() {
    const P = this.P,
      el = this.props.element || 'flame',
      R = Math.random,
      t = performance.now(),
      [ox, oy] = this.oxy()
    P.secretUntil = t + 5500
    P.happy = 90
    if (el === 'flame') {
      this.hopv(10)
      for (let k = 0; k < 22; k++) {
        const a = R() * Math.PI * 2,
          v = 3 + R() * 4
        this.spawn({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, g: 0.06, drag: 0.96, life: 55, s: 2.5 + R() * 2, color: R() < 0.5 ? '#bfe6ff' : '#5fb4ff' })
      }
    }
    if (el === 'aqua') {
      this.hopv(8)
      for (let k = 0; k < 18; k++) {
        const a = -Math.PI / 2 + (R() - 0.5) * 1.2,
          v = 5 + R() * 4
        this.spawn({ x: ox, y: oy - 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.22, life: 70, s: 3 + R() * 2, shape: 'drop', color: '#9ff7e8', orient: true, ground: true })
      }
    }
    if (el === 'terra') {
      this.hopv(6)
      for (let k = 0; k < 10; k++) {
        const a = R() * Math.PI * 2
        this.spawn({ x: ox, y: oy - 56, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5 - 1, g: 0.03, drag: 0.97, vr: (R() - 0.5) * 10, shape: 'leaf', s: 5, color: '#ff9ec4', life: 80 })
      }
    }
    if (el === 'aero') {
      P.flipS = t
      P.vlift -= 10
      for (let k = 0; k < 10; k++) {
        const a = R() * Math.PI * 2
        this.spawn({ x: ox + Math.cos(a) * 40, y: oy + Math.sin(a) * 30, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, s: 7, color: '#fff', op: 0.7, life: 50, grow: true })
      }
    }
    this.props.onSecret?.()
  }
  quirk(el: MascotElement) {
    const P = this.P,
      R = Math.random,
      [ox, oy] = this.oxy()
    if (el !== 'aero') this.hopv(4)
    this.squish(0.1)
    if (el === 'flame') for (let k = 0; k < 5; k++) this.spawn({ x: ox + (R() - 0.5) * 30, y: oy - 40, vx: (R() - 0.5) * 2, vy: -2 - R() * 2, g: 0.05, life: 35, s: 1.6, color: '#ffd36b' })
    if (el === 'aqua') this.spawn({ x: ox + 6, y: oy - 40, vx: 0.2, vy: -0.8, g: -0.02, life: 70, s: 5, color: 'rgba(255,255,255,.45)' })
    if (el === 'terra') {
      P.vsp += 0.25
      P.jig = 0.6
    }
    if (el === 'aero') P.vlift -= 4
  }
  pDown = (e: React.PointerEvent<SVGSVGElement>) => {
    this.wake()
    if (!this.inter() || !this.P) return
    const p = this.loc(e)
    if (!p) return
    // Que el toque en la mascota no active el botón o la tarjeta que la contiene.
    e.stopPropagation()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Algunos WebView no lo permiten.
    }
    this.P.down = { x: p[0], y: p[1], t: performance.now(), moved: false }
    this.P.lastM = p
    this.squish(0.08)
  }
  pMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const P = this.P
    if (!P || !P.down) return
    const p = this.loc(e)
    if (!p) return
    const dx = p[0] - P.down.x,
      dy = p[1] - P.down.y,
      l = Math.hypot(dx, dy)
    if (l > 6) {
      P.down.moved = true
      P.surprise = 1
    }
    const m = Math.min(l, 50) / (l || 1)
    P.tdx = dx * m * 0.9
    P.tdy = dy * m * 0.9
    if (this.props.element === 'aero' && P.lastM) {
      const md = Math.hypot(p[0] - P.lastM[0], p[1] - P.lastM[1])
      const dir = (p[0] - P.lastM[0]) * -p[1] + (p[1] - P.lastM[1]) * p[0] >= 0 ? 1 : -1
      P.spinV = Math.max(-42, Math.min(42, P.spinV + dir * md * 0.09))
    }
    P.lastM = p
  }
  pUp = (e?: React.SyntheticEvent) => {
    const P = this.P
    if (!P || !P.down) return
    e?.stopPropagation()
    const dt = performance.now() - P.down.t,
      mv = P.down.moved
    P.down = null
    P.tdx = 0
    P.tdy = 0
    P.surprise = 0
    P.quirkAt = performance.now() + 7000
    P.lastM = null
    if (mv && this.props.element === 'aqua') {
      const st = Math.hypot(P.dx, P.dy)
      if (st > 8) {
        const R = Math.random,
          [ox, oy] = this.oxy(),
          ux = P.dx / st,
          uy = P.dy / st,
          n = Math.round(6 + st * 0.35),
          k = st / 50
        P.rippleS = performance.now()
        P.vdx -= P.dx * 0.25
        P.vdy -= P.dy * 0.25
        for (let i = 0; i < n; i++) {
          const back = i < n * 0.6,
            a = Math.atan2(back ? -uy : uy, back ? -ux : ux) + (R() - 0.5) * 1.4,
            v = (2.5 + R() * 3.5) * (0.6 + k * 0.8)
          this.spawn({ x: ox + (back ? -ux : ux) * 40, y: oy + CY + (back ? -uy : uy) * 26, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.2 * k, g: 0.22, life: 55 + R() * 20, s: 2.2 + R() * 2.4 * k, shape: 'drop', color: R() < 0.3 ? '#d8fffb' : '#6ee6df', orient: true, ground: true })
        }
        for (let i = 0; i < 4; i++) this.spawn({ x: ox + (R() - 0.5) * 50, y: oy + CY + (R() - 0.5) * 30, vx: (R() - 0.5) * 2, vy: -1.5 - R() * 1.5, g: 0.04, life: 22, s: 1.4, color: '#ffffff', op: 0.9 })
      }
    }
    if (mv && this.props.element === 'flame' && performance.now() < P.secretUntil) {
      const st = Math.hypot(P.dx, P.dy)
      if (st > 8) {
        const R = Math.random,
          [ox, oy] = this.oxy(),
          k = st / 50
        P.burst = 1.6 + k * 0.8
        P.secretUntil += 1500
        this.squish(0.45)
        this.hopv(8 + k * 4)
        P.happy = 40
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2,
            v = 4 + R() * 3 + k * 2
          this.spawn({ x: ox + Math.cos(a) * 30, y: oy + CY + Math.sin(a) * 22, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: 0.03, drag: 0.93, life: 24 + R() * 12, s: 2 + R() * 2, color: R() < 0.5 ? '#e6f6ff' : '#5fb4ff' })
        }
        for (let i = 0; i < 12; i++) {
          const a = R() * Math.PI * 2,
            v = 6 + R() * 4
          this.spawn({ x: ox + Math.cos(a) * 40, y: oy + CY + Math.sin(a) * 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.9, life: 12 + R() * 8, s: 3 + R() * 2, shape: 'streak', rot: a * 57.3, color: '#ffffff' })
        }
      }
    }
    if (mv && this.props.element === 'flame' && !P.splitS && performance.now() >= P.secretUntil) {
      const st = Math.hypot(P.dx, P.dy)
      if (st > 8) {
        const R = Math.random,
          [ox, oy] = this.oxy(),
          n = 2 + Math.floor(R() * 4),
          base = R() * Math.PI * 2
        P.splitS = performance.now()
        P.splitN = n
        P.splitO = Array.from({ length: n }, (_, i) => [base + (i / n) * Math.PI * 2 + (R() - 0.5) * 0.5, 52 + R() * 22])
        P.dx = P.dy = P.vdx = P.vdy = 0
        for (let i = 0; i < 14; i++) {
          const a = R() * Math.PI * 2,
            v = 2 + R() * 4
          this.spawn({ x: ox, y: oy + CY, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, g: 0.06, drag: 0.95, life: 30 + R() * 15, s: 1.6 + R() * 1.6, color: R() < 0.5 ? '#ffd36b' : '#ff6a2b' })
        }
      }
    }
    if (mv && this.props.element === 'terra') {
      const st = Math.hypot(P.dx, P.dy)
      if (st > 8) {
        const R = Math.random,
          [ox, oy] = this.oxy(),
          ux = P.dx / st,
          uy = P.dy / st,
          k = st / 50,
          n = Math.round(5 + st * 0.25)
        P.vdx -= P.dx * 0.2
        P.vdy -= P.dy * 0.2
        P.vsp += 0.35
        P.jig = 1
        for (let i = 0; i < n; i++) {
          const a = Math.atan2(-uy, -ux) + (R() - 0.5) * 1.8,
            v = (2 + R() * 3) * (0.6 + k * 0.7)
          this.spawn({ x: ox + (R() - 0.5) * 60, y: oy - 20 + (R() - 0.5) * 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.5 * k, g: 0.09, drag: 0.97, vr: (R() - 0.5) * 16, shape: 'leaf', s: 3 + R() * 2.5, color: ['#5f9a2c', '#7fbf3f', '#a8d860', '#4b7f25'][i % 4], life: 60 + R() * 25, ground: true })
        }
        for (let i = 0; i < 4; i++) this.spawn({ x: ox + (R() - 0.5) * 90, y: BASE, vx: (R() - 0.5) * 2, vy: -0.5 - R() * 0.6, g: -0.005, life: 35, s: 4 + R() * 3, color: '#cbb98a', op: 0.45, grow: true })
        if (P.bloom > 0.5) {
          const tx = ox + 10,
            ty = oy - 46
          for (let i = 0; i < 6 + Math.round(k * 4); i++) {
            const a = Math.atan2(-uy, -ux) + (R() - 0.5) * 2.4,
              v = 1.5 + R() * 2.5 * (0.6 + k)
            this.spawn({ x: tx, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, g: 0.025, drag: 0.975, vr: (R() - 0.5) * 10, shape: 'leaf', s: 3.5 + R() * 2, color: R() < 0.5 ? '#ff9ec4' : '#ffc2db', life: 90 + R() * 30, sway: true })
          }
        }
      }
    }
    if (!mv && dt < 450) this.tap()
    else if (Math.abs(P.spinV) > 3) {
      P.surprise = 1
      P.vlift -= Math.abs(P.spinV) * 0.25
    } else {
      this.squish(0.22)
      P.jig = 1
      P.happy = 30
    }
  }

  frame(now: number) {
    const P = this.P,
      r = this.r
    // Sin cuerpo dibujado, fuera de la vista o con la app oculta: no se pinta; se vuelve a mirar en medio segundo.
    if (!P || !r.body || !r.body.isConnected || !this.visible || document.hidden) {
      this.nextAt = now + HIDDEN_MS
      return
    }
    this.draw()
    this.lastDraw = performance.now()
    // En reposo, el próximo fotograma cae en una rejilla común: varias mascotas quietas comparten despertar.
    const step = reducedMotion() ? REDUCED_MS : IDLE_MS
    this.nextAt = this.busy() ? 0 : Math.ceil((now + step) / step) * step
  }
  /** ¿Hay movimiento que necesite el ritmo completo? */
  busy(): boolean {
    const P = this.P,
      t = performance.now()
    if (this.props.mood === 'speaking' || P.down || t - P.ptrT < 1500 || P.happy > 0 || P.secretUntil > t) return true
    const moving = Math.abs(P.vsx) + Math.abs(P.vsy) + Math.abs(P.vhop) + Math.abs(P.vdx) + Math.abs(P.vdy) + Math.abs(P.spinV ?? 0)
    // (La cara de sorpresa es fija: no necesita ritmo completo por sí sola.)
    // Las partículas de ambiente (chispas, burbujas…) no obligan al ritmo completo: avanzan por tiempo (ver draw).
    // Umbrales por lo que se ve, no por lo que queda (medido en Chromium, 20 s en reposo): el muelle de altura de
    // Brisa (vlift) apenas se amortigua y por debajo de 0,3 solo mueve ~2 px; el temblor de Musgo (jig) por debajo
    // de 0,1 deforma <1 %. Con 0,05 y 0,03 seguían a ritmo completo ~3 s y ~1 s tras cada gesto (29 y 20 dibujos/s).
    return moving > 0.05 || Math.abs(P.vlift ?? 0) > 0.3 || P.jig > 0.1 || P.burst > 0.03
  }
  /** Momento del último dibujo (para que las partículas no vayan a cámara lenta a ritmo reducido). */
  lastDraw = 0
  draw() {
    const P = this.P,
      r = this.r
    const t = performance.now(),
      steps = this.lastDraw ? Math.min(6, Math.max(1, Math.round((t - this.lastDraw) / 16.7))) : 1,
      el = this.props.element || 'flame',
      mood = this.props.mood || 'idle',
      R = Math.random,
      pal = PAL[el] || PAL.flame
    const secret = t < P.secretUntil
    const ta = mood === 'speaking' ? (0.35 + 0.65 * Math.abs(Math.sin(t * 0.0078) * Math.sin(t * 0.0029 + 1))) * (0.75 + R() * 0.35) : mood === 'listening' ? 0.1 : 0
    P.amp += (ta - P.amp) * 0.25
    P.vsx += (1 - P.sx) * 0.15
    P.vsx *= 0.84
    P.sx += P.vsx
    P.vsy += (1 - P.sy) * 0.15
    P.vsy *= 0.84
    P.sy += P.vsy
    P.vhop += 0.8
    P.hop += P.vhop
    if (P.hop > 0) {
      if (P.vhop > 4) this.squish(Math.min(0.4, P.vhop * 0.035))
      P.hop = 0
      P.vhop = 0
    }
    P.vdx += (P.tdx - P.dx) * 0.18
    P.vdx *= 0.78
    P.dx += P.vdx
    P.vdy += (P.tdy - P.dy) * 0.18
    P.vdy *= 0.78
    P.dy += P.vdy
    P.jig *= 0.96
    P.burst *= 0.94
    if (P.happy > 0) P.happy--
    if (mood === 'idle' && !P.down && t > P.quirkAt) {
      this.quirk(el)
      P.quirkAt = t + 5000 + R() * 4000
    }
    const ox = 0
    let oy = P.hop
    if (el === 'aero') {
      P.vlift += -P.lift * 0.02
      P.vlift *= 0.95
      P.lift += P.vlift
      oy = Math.sin(t * 0.0016) * 6 - 12 + P.lift
    }
    const sx = P.sx * (1 + P.amp * 0.03),
      sy = P.sy * (1 + P.amp * 0.06) * (mood === 'listening' ? 1.03 : 1)
    const wob = 0.02 + P.jig * 0.06 + P.amp * 0.025
    const dl = Math.hypot(P.dx, P.dy),
      ux = dl ? P.dx / dl : 0,
      uy = dl ? P.dy / dl : 0
    const pts: Pt[] = BP.map(([x, y, s], i) => {
      const m = 1 + wob * (Math.sin(t * 0.0032 + i * 1.9) * 0.6 + Math.sin(t * 0.0021 + i * 0.7) * 0.4) * (s > 0.5 ? 0.3 : 1)
      let X = x * m * sx,
        Y = BASE + (CY + (y - CY) * m - BASE) * sy
      const nx = x / RX,
        ny = (y - CY) / RYT,
        nl = Math.hypot(nx, ny) || 1,
        w = Math.max(0, (nx * ux + ny * uy) / nl)
      X += P.dx * (w * w * 0.85 + 0.12)
      Y += P.dy * (w * w * 0.85 + 0.12)
      return [X + ox, Y + oy]
    })
    const d = blob(pts)
    r.body.setAttribute('d', d)
    r.clip?.setAttribute('d', d)
    const BT = `translate(${ox + P.dx * 0.12} ${oy + BASE + P.dy * 0.12}) scale(${sx} ${sy}) translate(0 ${-BASE})`
    r.decor?.setAttribute('transform', BT)
    r.gloss?.setAttribute('transform', BT)
    let tlx: number, tly: number
    if (mood === 'thinking') {
      tlx = 2.6
      tly = -3
    } else if (P.ptr && t - P.ptrT < 3000) {
      const vx = P.ptr[0] - ox,
        vy = P.ptr[1] - (oy + CY),
        vl = Math.hypot(vx, vy) || 1,
        k = Math.min(1, vl / 60)
      tlx = (vx / vl) * 3.4 * k
      tly = (vy / vl) * 2.8 * k
    } else {
      tlx = Math.sin(t * 0.0007) * 2.4
      tly = Math.sin(t * 0.0011) * 1.2
    }
    P.lx += (tlx - P.lx) * 0.15
    P.ly += (tly - P.ly) * 0.15
    r.face?.setAttribute('transform', `${BT} translate(${P.lx * 1.6} ${4 + P.ly * 1.2})`)
    if (t > P.blinkAt) {
      P.blinkS = t
      P.blinkAt = t + 2500 + R() * 3000
    }
    const bp = (t - P.blinkS) / 140,
      blink = bp >= 0 && bp < 1 ? Math.abs(bp * 2 - 1) * 0.9 + 0.1 : 1
    const es = P.surprise ? 1.2 : mood === 'listening' ? 1.14 : 1
    const happy = P.happy > 0 || mood === 'happy'
    if (r.eyesOpen) {
      r.eyesOpen.setAttribute('opacity', happy ? 0 : 1)
      r.eyesHappy.setAttribute('opacity', happy ? 1 : 0)
      r.eyeL.setAttribute('transform', `translate(${-17 + P.lx} ${-6 + P.ly}) scale(${es} ${es * blink})`)
      r.eyeR.setAttribute('transform', `translate(${17 + P.lx} ${-6 + P.ly}) scale(${es} ${es * blink})`)
    }
    let mw = 9,
      mt = 1.5,
      mh = 8
    if (P.surprise) {
      mw = 5
      mt = -9
      mh = 8
    } else if (happy) {
      mw = 11
      mt = 1
      mh = 12
    } else if (mood === 'speaking') {
      mw = 7 + P.amp * 2
      mt = 0
      mh = 2.5 + P.amp * 11
    } else if (mood === 'thinking') {
      mw = 4.5
      mt = 0
      mh = 2
    } else if (mood === 'listening') {
      mw = 6
      mt = 0
      mh = 5
    }
    const ml = mood === 'speaking' ? 0.5 : 0.2
    P.mw += (mw - P.mw) * ml
    P.mt += (mt - P.mt) * ml
    P.mh += (mh - P.mh) * ml
    if (r.mouth) {
      r.mouth.setAttribute('d', `M${f1(-P.mw)} 8Q0 ${f1(8 + P.mt)} ${f1(P.mw)} 8Q0 ${f1(8 + 2 * P.mh)} ${f1(-P.mw)} 8Z`)
      r.tongue.setAttribute('cy', 8 + P.mh * 0.72)
      r.tongue.setAttribute('rx', P.mw * 0.45)
      r.tongue.setAttribute('ry', Math.max(0, P.mh * 0.22))
      r.tongue.setAttribute('opacity', P.mh > 5 && P.mt > -3 ? 1 : 0)
    }
    const hgt = -oy
    if (r.glow) {
      r.glow.setAttribute('cx', ox)
      r.glow.setAttribute('cy', oy + CY)
      r.glow.setAttribute('opacity', Math.min(1, 0.55 + P.amp * 0.4 + P.burst * 0.3))
    }
    if (r.shadow) {
      const k = Math.max(0.4, 1 - hgt / 110)
      r.shadow.setAttribute('cx', ox + P.dx * 0.2)
      r.shadow.setAttribute('cy', BASE + 5)
      r.shadow.setAttribute('rx', Math.max(0, 50 * sx * k))
      r.shadow.setAttribute('ry', Math.max(0, 6 * k))
      r.shadow.setAttribute('opacity', 0.25 * k)
    }
    let fa = 0
    if (P.flipS) {
      const p = (t - P.flipS) / 950
      if (p >= 1) P.flipS = 0
      else fa = (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2) * 360
    }
    const tt = (mood === 'thinking' ? 6 : 0) + P.dx * 0.25 + (el === 'aero' ? Math.sin(t * 0.0011) * 4 : 0)
    P.tilt += (tt - P.tilt) * 0.1
    let ms = 1
    if (el === 'flame' && P.splitS) {
      const p = (t - P.splitS) / 1400,
        ez = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
      if (p >= 1) {
        P.splitS = 0
        P.splitE = 0
        this.squish(0.4)
        P.happy = 45
        P.burst = 1
        const blue = secret
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (R() - 0.5) * 2.6,
            v = 3 + R() * 3
          this.spawn({ x: ox, y: oy - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.08, drag: 0.96, life: 35, s: 2 + R() * 1.5, color: blue ? '#bfe6ff' : '#ffd36b' })
        }
      } else {
        const e = p < 0.28 ? ez(p / 0.28) : p < 0.62 ? 1 : 1 - ez((p - 0.62) / 0.38)
        P.splitE = e
        P.splitP = p
        ms = 1 - e * 0.9
      }
    }
    if (el === 'aero') {
      const av = Math.abs(P.spinV)
      if (av > 1.2) {
        P.spinA += P.spinV
        P.spinV *= P.down ? 0.995 : 0.982
        P.vlift -= av * 0.012
        P.surprise = av > 6 ? 1 : P.surprise
        P.dizzy = Math.max(P.dizzy, Math.min(1, av / 20))
        if (R() < av * 0.035) {
          const a = R() * Math.PI * 2,
            rr = 55 + R() * 30,
            sd = Math.sign(P.spinV)
          this.spawn({ x: ox + Math.cos(a) * rr, y: oy + CY + Math.sin(a) * rr * 0.6, vx: -Math.sin(a) * sd * (2 + av * 0.12), vy: Math.cos(a) * sd * (1.2 + av * 0.06) - 0.6, shape: 'streak', s: 6 + av * 0.15, color: '#fff', op: 0.75, life: 26, drag: 0.96 })
        }
        if (R() < av * 0.01) {
          const a = R() * Math.PI * 2
          this.spawn({ x: ox + Math.cos(a) * 40, y: oy + 20, vx: Math.cos(a) * 1.5, vy: -0.5, s: 5, color: '#fff', op: 0.5, life: 40, grow: true })
        }
      } else {
        const tgt = Math.round(P.spinA / 360) * 360
        P.spinV += (tgt - P.spinA) * 0.03
        P.spinV *= 0.86
        P.spinA += P.spinV
        if (!P.down && P.dizzy > 0.05 && Math.abs(tgt - P.spinA) < 2) P.surprise = 0
      }
      if (P.dizzy > 0) {
        P.dizzy *= 0.992
        P.jig = Math.max(P.jig, P.dizzy * 0.5)
      }
    }
    r.main?.setAttribute(
      'transform',
      `rotate(${P.tilt + fa + P.spinA + (P.dizzy > 0.05 ? Math.sin(t * 0.012) * 10 * P.dizzy : 0)} ${ox} ${oy + CY}) translate(${ox} ${oy + CY}) scale(${ms}) translate(${-ox} ${-(oy + CY)})`,
    )
    if (el === 'flame' && r.fl0)
      for (let i = 0; i < 5; i++) {
        const g = r['fl' + i]
        if (!P.splitS || i >= P.splitN) {
          g.setAttribute('opacity', 0)
          continue
        }
        const e = P.splitE,
          [a, rad] = P.splitO[i],
          hop = Math.abs(Math.sin(P.splitP * Math.PI * 4 + i * 1.3)) * 12 * e
        g.setAttribute('transform', `translate(${ox + Math.cos(a) * rad * e} ${oy + CY + 8 * e + Math.sin(a) * rad * 0.5 * e - hop}) scale(${0.25 + e * 0.75})`)
        g.setAttribute('opacity', Math.min(1, e * 3))
        const hh = (12 + 6 * Math.sin(t * 0.02 + i * 2)) * (secret ? 1.3 : 1),
          sw = Math.sin(t * 0.015 + i) * 4
        r['flt' + i].setAttribute('d', `M-13 -4Q-14 ${-18 - hh * 0.5} ${sw} ${-22 - hh}Q14 ${-18 - hh * 0.5} 13 -4Z`)
        r['flt' + i].setAttribute('fill', P.cOut || '#ff5a1f')
        r['fli' + i].setAttribute('d', `M-7 -8Q-7 ${-18 - hh * 0.3} ${sw * 0.6} ${-20 - hh * 0.6}Q7 ${-18 - hh * 0.3} 7 -8Z`)
        r['fli' + i].setAttribute('fill', P.cIn || '#ffc14a')
      }
    const heat = ((mood === 'listening' ? 0.8 : 1) + P.amp * 0.9 + P.burst * 1.3) * (el === 'flame' ? 1 + 0.3 * (P.bm || 0) : 1)
    if (el === 'flame' && R() < 0.45 * (P.bm || 0)) {
      const a = R() * Math.PI * 2,
        v = 3 + R() * 4
      this.spawn({ x: ox + Math.cos(a) * 46, y: oy + CY - 8 + Math.sin(a) * 34, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: 0.05, drag: 0.92, life: 10 + R() * 10, s: 2 + R() * 2.2, shape: 'streak', rot: a * 57.3, color: R() < 0.5 ? '#e6f6ff' : '#7fd0ff' })
    }
    if (el === 'flame' && r.fo0) {
      const tm = secret ? 1 : 0
      P.bm = P.bm || 0
      P.bm += (tm - P.bm) * 0.035
      if (Math.abs(P.bm - tm) < 0.003) P.bm = tm
      if (P.bmA !== P.bm) {
        P.bmA = P.bm
        const k = P.bm < 0.5 ? 2 * P.bm * P.bm : 1 - Math.pow(-2 * P.bm + 2, 2) / 2
        ;['s0', 's1', 's2'].forEach((n, i) => r[n].setAttribute('stop-color', lerpC(pal.stops[i], pal.alt![i], k)))
        P.cOut = lerpC('#ff5a1f', '#3d8bff', k)
        P.cIn = lerpC('#ffc14a', '#bfe6ff', k)
        TONG.forEach((_, j) => {
          r['fo' + j].setAttribute('fill', P.cOut)
          r['fi' + j].setAttribute('fill', P.cIn)
        })
      }
      const c: Pt = [ox, oy + BASE + (CY - BASE) * sy]
      TONG.forEach(([idx, sz], j) => {
        const p = pts[idx]
        let nx = p[0] - c[0],
          ny = p[1] - c[1]
        const nl = Math.hypot(nx, ny) || 1
        nx /= nl
        ny /= nl
        const tx = -ny,
          ty = nx,
          B: Pt = [c[0] + (p[0] - c[0]) * 0.8, c[1] + (p[1] - c[1]) * 0.8]
        const hh = 24 * sz * (0.72 + 0.28 * Math.sin(t * 0.011 + j * 1.3) + 0.12 * Math.sin(t * 0.029 + j * 2.3)) * heat,
          w = 11 * sz,
          sw = Math.sin(t * 0.008 + j * 1.7) * 5 * sz
        r['fo' + j].setAttribute('d', tongue(B, nx, ny, tx, ty, hh + nl * 0.2, w, sw))
        r['fi' + j].setAttribute('d', tongue(B, nx, ny, tx, ty, hh * 0.6 + nl * 0.2, w * 0.55, sw * 0.6))
      })
      r.core.setAttribute('opacity', Math.min(1, 0.55 + 0.3 * Math.sin(t * 0.006) + P.amp * 0.3))
      r.inf.setAttribute('transform', `translate(0 40) scale(${1 + 0.08 * Math.sin(t * 0.013)} ${1 + 0.12 * Math.sin(t * 0.017) + P.amp * 0.3}) translate(0 -40)`)
      if (R() < 0.1 * heat)
        this.spawn({ x: ox + (R() - 0.5) * 70, y: oy - 20 - R() * 20, vx: (R() - 0.5) * 0.6, vy: -1 - R() * 1.2, g: -0.01, life: 50 + R() * 30, s: 1.4 + R() * 1.4, color: R() < (P.bm || 0) ? '#9fd0ff' : R() < 0.5 ? '#ffb14a' : '#ff6a2b', sway: true })
    }
    if (el === 'aqua' && r.b0) {
      BUB.forEach(([bx, ph], k) => {
        const cyc = (t * 0.00045 * (1 + P.amp * 2) + ph / 7) % 1,
          b = r['b' + k]
        b.setAttribute('cx', bx + Math.sin(t * 0.003 + ph * 3) * 4)
        b.setAttribute('cy', BASE - 4 - cyc * 80)
        b.setAttribute('r', 1.6 + (k % 3) * 0.9)
        b.setAttribute('opacity', Math.sin(cyc * Math.PI) * 0.85)
      })
      r.l0.setAttribute('transform', `translate(-22 ${26 + Math.sin(t * 0.002) * 1.5}) rotate(${Math.sin(t * 0.0015) * 8})`)
      r.l1.setAttribute('transform', `translate(22 ${31 + Math.sin(t * 0.0023 + 1) * 1.5}) rotate(${160 + Math.sin(t * 0.0017) * 8}) scale(.8)`)
      DROPS.forEach(([x, y, s], k) =>
        r['d' + k].setAttribute(
          'transform',
          `translate(${x * (1 + P.burst * 0.25) + ox + Math.sin(t * 0.002 + k) * 2} ${y + oy + Math.sin(t * 0.0026 + k * 1.7) * 4 - P.burst * 8}) rotate(${Math.sin(t * 0.002 + k) * 15}) scale(${s * (1 + P.burst * 0.4 + P.amp * 0.3)})`,
        ),
      )
      const rp = (t - P.rippleS) / 800
      if (rp < 1) {
        r.ripple.setAttribute('cx', ox)
        r.ripple.setAttribute('cy', BASE + 4)
        r.ripple.setAttribute('rx', 40 + rp * 70)
        r.ripple.setAttribute('ry', (40 + rp * 70) * 0.18)
        r.ripple.setAttribute('opacity', (1 - rp) * 0.8)
      } else r.ripple.setAttribute('opacity', 0)
      P.rain += ((secret ? 0.85 : 0) - P.rain) * 0.05
      r.rain.setAttribute('opacity', P.rain)
      r.rain.setAttribute('transform', `translate(${ox} ${oy}) scale(${0.8 + P.rain * 0.25})`)
      if (R() < 0.008) this.spawn({ x: ox + (R() < 0.5 ? -1 : 1) * RX * sx * 0.9, y: oy + 12, vx: 0, vy: 0.3, g: 0.12, life: 40, s: 3, shape: 'drop', color: '#5fd8d4', ground: true })
    }
    if (el === 'terra' && r.lf0) {
      P.vsp += (1 - P.sprout) * 0.12
      P.vsp *= 0.82
      P.sprout += P.vsp
      P.bloom += ((secret ? 1 : 0) - P.bloom) * 0.08
      const top = pts[0]
      ;[
        [-38, 0.8],
        [4, 1],
        [42, 0.75],
      ].forEach(([a, s], k) => {
        const sw = Math.sin(t * 0.0025 + k * 1.3) * 6 * (1 + P.amp * 2) + P.jig * 14 * Math.sin(t * 0.03 + k)
        r['lf' + k].setAttribute('transform', `translate(${top[0]} ${top[1] + 6}) rotate(${a + sw + P.tilt}) scale(${s * P.sprout})`)
      })
      r.flower.setAttribute('transform', `translate(${top[0] + 10} ${top[1] - 4}) scale(${Math.max(0, P.bloom)}) rotate(${t * 0.03})`)
      r.peb.setAttribute('transform', `translate(${ox} 0)`)
    }
    if (el === 'aero' && r.c0) {
      CLOUDS.forEach(([x, y, s], k) =>
        r['c' + k].setAttribute(
          'transform',
          `translate(${x * (1 + P.burst * 0.2) + ox + Math.sin(t * 0.0012 + k * 2) * 6} ${y + oy + Math.sin(t * 0.0017 + k) * 3}) scale(${s * (1 + P.burst * 0.35 + 0.04 * Math.sin(t * 0.002 + k))})`,
        ),
      )
      const off = -(t * 0.04 * (1 + P.amp * 2 + P.burst * 3)) % 194
      r.w0.setAttribute('stroke-dashoffset', off)
      r.w1.setAttribute('stroke-dashoffset', off * 1.3)
      WIND.forEach((_, k) => {
        r['wd' + k].setAttribute('stroke-dashoffset', (off * 1.6 + k * 40) % 166)
        r['wd' + k].setAttribute('transform', `translate(${ox} ${oy})`)
      })
    }
    for (let i = 0; i < POOL; i++) {
      const e = r['p' + i]
      if (!e) continue
      const q = P.parts[i]
      if (!q || q.life <= 0) {
        if (e.__vis !== 0) {
          e.setAttribute('opacity', 0)
          e.__vis = 0
        }
        continue
      }
      // En reposo se pinta a ~15 fps: las partículas avanzan los pasos de 60 fps que tocan, para no ir a cámara lenta.
      for (let st = 0; st < steps && q.life > 0; st++) {
        q.vx *= q.drag
        q.vy += q.g
        q.x += q.vx + (q.sway ? Math.sin(t * 0.006 + q.ph) * 0.3 : 0)
        q.y += q.vy
        q.rot += q.vr
        q.life--
        if (q.ground && q.y > BASE + 4 && q.vy > 0) {
          q.y = BASE + 4
          q.vy = 0
          q.vx *= 0.5
          q.life = Math.min(q.life, 5)
        }
      }
      if (e.__sid !== q.id) {
        e.setAttribute('d', SH[q.shape])
        e.setAttribute('fill', q.color)
        e.__sid = q.id
      }
      const fr = q.life / q.max,
        sc = q.s * (q.grow ? 1 + (1 - fr) * 1.6 : 1),
        rot = q.orient ? Math.atan2(q.vy, q.vx) * 57.3 + 90 : q.rot
      e.setAttribute('transform', `translate(${f1(q.x)} ${f1(q.y)}) rotate(${f1(rot)}) scale(${f1(sc)})`)
      e.setAttribute('opacity', Math.min(1, fr * 2.5) * q.op)
      e.__vis = 1
    }
  }

  render(): ReactNode {
    const el: MascotElement = PAL[this.props.element] ? this.props.element : 'flame',
      pal = PAL[el],
      u = this.uid,
      R = (n: string) => this.rf(n),
      size = Number(this.props.size) || 200,
      inter = this.inter()
    const cloud = (k: number) =>
      h('g', { key: 'c' + k, ref: R('c' + k) }, h('path', { d: CLOUD, fill: '#bcd6f5', opacity: 0.55, transform: 'translate(1.5 3)' }), h('path', { d: CLOUD, fill: '#fff', opacity: 0.95 }))
    const lily = (k: number) =>
      h('g', { key: 'l' + k, ref: R('l' + k) }, h('path', { d: 'M0 0L10 -2.2A10.5 6 0 1 1 10 2.2Z', fill: '#4cbf73' }), h('path', { d: 'M0 0L-8 -2M0 0L-7 3', stroke: '#2f8f55', strokeWidth: 0.8 }))
    const back =
      el === 'flame'
        ? [...TONG.map((_, j) => h('path', { key: 'fo' + j, ref: R('fo' + j), fill: '#ff5a1f', opacity: 0.92 })), ...TONG.map((_, j) => h('path', { key: 'fi' + j, ref: R('fi' + j), fill: '#ffc14a' }))]
        : el === 'aqua'
          ? [
              h(
                'g',
                { key: 'rain', ref: R('rain'), opacity: 0, fill: 'none', strokeWidth: 5, strokeLinecap: 'round' },
                (
                  [
                    ['#ff7a7a', 84],
                    ['#ffd36b', 76],
                    ['#7fe8a0', 68],
                    ['#7fc8ff', 60],
                  ] as [string, number][]
                ).map(([c, rr]) => h('path', { key: c, stroke: c, d: `M${-rr} -6A${rr} ${rr} 0 0 1 ${rr} -6` })),
              ),
            ]
          : el === 'aero'
            ? [cloud(2), cloud(3), ...WIND.map((dd, k) => h('path', { key: 'wd' + k, ref: R('wd' + k), d: dd, fill: 'none', stroke: '#fff', strokeOpacity: 0.55, strokeWidth: 2.4, strokeLinecap: 'round', strokeDasharray: '26 140' }))]
            : []
    const decor =
      el === 'flame'
        ? [h('ellipse', { key: 'core', ref: R('core'), cx: 0, cy: 22, rx: 38, ry: 28, fill: `url(#${u}k)` }), h('path', { key: 'inf', ref: R('inf'), d: 'M0 40C-17 31 -15 12 -4 -2C-2 9 4 11 7 2C17 15 17 31 0 40Z', fill: '#ffe08a', opacity: 0.6 })]
        : el === 'aqua'
          ? [
              h('path', { key: 'sh', d: 'M-50 14Q0 32 50 14', stroke: '#fff', strokeOpacity: 0.15, strokeWidth: 6, fill: 'none' }),
              ...BUB.map((_, k) => h('circle', { key: 'b' + k, ref: R('b' + k), fill: 'rgba(255,255,255,.18)', stroke: '#fff', strokeOpacity: 0.75, strokeWidth: 1 })),
              lily(0),
              lily(1),
            ]
          : el === 'terra'
            ? [
                h('ellipse', { key: 'rust', cx: 28, cy: 26, rx: 20, ry: 10, fill: '#8a5a2a', opacity: 0.35 }),
                ...SPECK.map(([x, y, rr], k) => h('circle', { key: 's' + k, cx: x, cy: y, r: rr, fill: k % 2 ? '#efe9b0' : '#5a4a22', opacity: 0.55 })),
                h('path', { key: 'moss', d: 'M-80 -80H80V-14Q66 -4 50 -12Q36 -2 20 -10Q4 0 -12 -9Q-28 1 -42 -10Q-58 -2 -80 -12Z', fill: '#5f9a2c', opacity: 0.92 }),
                ...[
                  [-46, -12, 5],
                  [-20, -8, 4],
                  [8, -8, 5],
                  [34, -10, 4],
                  [56, -12, 3.5],
                ].map(([x, y, rr], k) => h('circle', { key: 'mb' + k, cx: x, cy: y, r: rr, fill: '#5f9a2c' })),
                h('path', { key: 'mh', d: 'M-40 -32Q-20 -40 0 -36', stroke: '#a8d860', strokeWidth: 3, fill: 'none', opacity: 0.6, strokeLinecap: 'round' }),
              ]
            : [
                h('path', { key: 'ic', d: CLOUD, transform: 'translate(-18 32) scale(1.5)', fill: '#fff', opacity: 0.4 }),
                ...SWIRL.map((dd, k) => h('path', { key: 'w' + k, ref: R('w' + k), d: dd, fill: 'none', stroke: '#fff', strokeOpacity: 0.85, strokeWidth: 2.6, strokeLinecap: 'round', strokeDasharray: '34 160' })),
              ]
    const front =
      el === 'aqua'
        ? DROPS.map((_, k) => h('path', { key: 'd' + k, ref: R('d' + k), d: SH.drop, fill: '#6ee6df', opacity: 0.95 }))
        : el === 'terra'
          ? [
              ...[0, 1, 2].map((k) =>
                h(
                  'g',
                  { key: 'lf' + k, ref: R('lf' + k), transform: `translate(0 -36) rotate(${[-38, 4, 42][k]}) scale(${[0.8, 1, 0.75][k]})` },
                  h('path', { d: 'M0 0C-7 -6 -8 -16 0 -25C8 -16 7 -6 0 0Z', fill: k === 1 ? '#7fbf3f' : '#5f9f2f' }),
                  h('path', { d: 'M0 -2L0 -21', stroke: '#3f6f1f', strokeWidth: 1.1, strokeLinecap: 'round' }),
                ),
              ),
              h(
                'g',
                { key: 'fl', ref: R('flower'), transform: 'scale(0)' },
                ...[0, 72, 144, 216, 288].map((a) => h('ellipse', { key: a, cx: 0, cy: -7, rx: 4.5, ry: 7, fill: '#ff9ec4', transform: `rotate(${a})` })),
                h('circle', { r: 4, fill: '#ffd36b' }),
              ),
            ]
          : el === 'aero'
            ? [cloud(0), cloud(1)]
            : []
    return h(
      'div',
      { style: { width: size, height: size, lineHeight: 0, display: 'inline-block', flex: 'none' } },
      h(
        'svg',
        {
          key: el,
          ref: R('svg'),
          viewBox: '-110 -125 220 220',
          width: size,
          height: size,
          style: { display: 'block', overflow: 'visible', touchAction: 'none', cursor: inter ? 'pointer' : 'default', userSelect: 'none', WebkitTapHighlightColor: 'transparent', pointerEvents: inter ? 'auto' : 'none' },
          onPointerDown: this.pDown,
          onPointerMove: this.pMove,
          onPointerUp: this.pUp,
          onPointerCancel: this.pUp,
          onClick: inter ? (e: React.MouseEvent) => e.stopPropagation() : undefined,
          'aria-hidden': true,
        },
        h(
          'defs',
          null,
          h('radialGradient', { id: u + 'g', cx: 0.38, cy: 0.3, r: 0.85 }, h('stop', { ref: R('s0'), offset: 0, stopColor: pal.stops[0] }), h('stop', { ref: R('s1'), offset: 0.5, stopColor: pal.stops[1] }), h('stop', { ref: R('s2'), offset: 1, stopColor: pal.stops[2] })),
          h('radialGradient', { id: u + 'w' }, h('stop', { offset: 0, stopColor: pal.glow, stopOpacity: 0.5 }), h('stop', { offset: 1, stopColor: pal.glow, stopOpacity: 0 })),
          h('radialGradient', { id: u + 'k' }, h('stop', { offset: 0, stopColor: '#fff6c8', stopOpacity: 0.95 }), h('stop', { offset: 0.5, stopColor: '#ffd36b', stopOpacity: 0.6 }), h('stop', { offset: 1, stopColor: '#ffd36b', stopOpacity: 0 })),
          h('clipPath', { id: u + 'c' }, h('path', { ref: R('clip'), d: INIT_D })),
        ),
        h('circle', { ref: R('glow'), cx: 0, cy: CY, r: 100, fill: `url(#${u}w)` }),
        h('ellipse', { ref: R('shadow'), cx: 0, cy: BASE + 5, rx: 50, ry: 6, fill: '#000', opacity: 0.22 }),
        el === 'aqua' && h('ellipse', { ref: R('ripple'), fill: 'none', stroke: '#6ee6df', strokeWidth: 1.5, opacity: 0 }),
        h(
          'g',
          { ref: R('main') },
          ...back,
          h('path', { ref: R('body'), d: INIT_D, fill: `url(#${u}g)`, opacity: pal.op, stroke: pal.rim, strokeWidth: 1.2 }),
          h('g', { clipPath: `url(#${u}c)` }, h('g', { ref: R('decor') }, ...decor)),
          h('g', { ref: R('gloss') }, h('ellipse', { cx: -24, cy: -24, rx: 14, ry: 7.5, fill: '#fff', opacity: 0.6, transform: 'rotate(-32 -24 -24)' }), h('circle', { cx: -40, cy: -8, r: 3, fill: '#fff', opacity: 0.5 })),
          h(
            'g',
            { ref: R('face') },
            h(
              'g',
              { ref: R('eyesOpen') },
              h('g', { ref: R('eyeL'), transform: 'translate(-17 -6)' }, h('ellipse', { rx: 7.5, ry: 10, fill: pal.eye }), h('circle', { cx: 2.4, cy: -4, r: 3, fill: '#fff' }), h('circle', { cx: -2.2, cy: 3.5, r: 1.3, fill: '#fff', opacity: 0.8 })),
              h('g', { ref: R('eyeR'), transform: 'translate(17 -6)' }, h('ellipse', { rx: 7.5, ry: 10, fill: pal.eye }), h('circle', { cx: 2.4, cy: -4, r: 3, fill: '#fff' }), h('circle', { cx: -2.2, cy: 3.5, r: 1.3, fill: '#fff', opacity: 0.8 })),
            ),
            h('g', { ref: R('eyesHappy'), opacity: 0, fill: 'none', stroke: pal.eye, strokeWidth: 3.4, strokeLinecap: 'round' }, h('path', { d: 'M-24 -4Q-17 -13 -10 -4' }), h('path', { d: 'M10 -4Q17 -13 24 -4' })),
            h('path', { ref: R('mouth'), fill: pal.eye, d: 'M-9 8Q0 9.5 9 8Q0 24 -9 8Z' }),
            h('ellipse', { ref: R('tongue'), cx: 0, cy: 14, rx: 4, ry: 2, fill: '#ff7a8a' }),
            h('ellipse', { cx: -30, cy: 7, rx: 6.5, ry: 3.5, fill: '#ff6a7a', opacity: 0.35 }),
            h('ellipse', { cx: 30, cy: 7, rx: 6.5, ry: 3.5, fill: '#ff6a7a', opacity: 0.35 }),
          ),
          ...front,
        ),
        el === 'flame' &&
          h(
            'g',
            null,
            [0, 1, 2, 3, 4].map((i) =>
              h(
                'g',
                { key: 'fl' + i, ref: R('fl' + i), opacity: 0 },
                h('path', { ref: R('flt' + i), fill: '#ff5a1f', opacity: 0.92 }),
                h('path', { ref: R('fli' + i), fill: '#ffc14a' }),
                h('circle', { r: 22, fill: `url(#${u}g)`, stroke: pal.rim, strokeWidth: 1 }),
                h('ellipse', { cx: -7, cy: -2, rx: 3, ry: 4, fill: pal.eye }),
                h('ellipse', { cx: 7, cy: -2, rx: 3, ry: 4, fill: pal.eye }),
                h('circle', { cx: -6, cy: -4, r: 1.2, fill: '#fff' }),
                h('circle', { cx: 8, cy: -4, r: 1.2, fill: '#fff' }),
                h('path', { d: 'M-4 5Q0 9 4 5', stroke: pal.eye, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' }),
              ),
            ),
          ),
        el === 'terra' &&
          h(
            'g',
            { ref: R('peb') },
            (
              [
                [-56, 40, 10, 6.5, '#9a9a8a'],
                [62, 41, 8, 5, '#8a8a7c'],
                [-38, 45, 5, 3.5, '#b0ae9c'],
                [46, 46, 4, 3, '#a3a291'],
              ] as [number, number, number, number, string][]
            ).map(([x, y, a, b, c]) => h('ellipse', { key: x, cx: x, cy: y, rx: a, ry: b, fill: c })),
          ),
        h(
          'g',
          null,
          Array.from({ length: POOL }, (_, i) => h('path', { key: i, ref: R('p' + i), opacity: 0 })),
        ),
      ),
    )
  }
}
