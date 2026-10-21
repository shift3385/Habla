// Medida de rendimiento de los efectos visuales (docs/v5.11/rendimiento/EVALUACION.md). NO es parte de la app.
// Lanza un Edge sin ventana con su propio perfil, emula un teléfono de 360×780 (dpr 2) y mide por CDP con cada grupo
// de efectos apagado por CSS inyectado (src/ no se toca):
//  - en reposo, a 1× (CPU real): CPU del renderer y de la GPU (SystemInfo.getProcessInfo) y tiempo de pintura y
//    rasterizado por trazado (Tracing: Paint, RasterTask, PrePaint, Layerize, UpdateLayerTree…);
//  - con la CPU ralentizada 4× y 6× (Emulation.setCPUThrottlingRate): fotogramas al desplazar, al tocar la mascota
//    y al cambiar de pestaña, y ocupación del hilo principal (Performance.getMetrics → TaskDuration).
//    (Con ralentización, la CPU del renderer sale ~100 % siempre: es el propio mecanismo de ralentizar.)
// La app se carga desde perf.html (red de IA falsa: nada sale a internet) en el origen aislado perf.localhost:5173.
// Uso: node docs/v5.11/rendimiento/evidencia/medir.mjs <carpeta-salida> [rapido] [--disable-gpu]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const OUT = process.argv[2] || '.'
const QUICK = process.argv.includes('rapido')
const NOGPU = process.argv.includes('--disable-gpu')
mkdirSync(OUT, { recursive: true })
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9339
const PROFILE = process.env.PERF_PROFILE || join(tmpdir(), 'habla-perf-edge-' + Date.now()) // perfil desechable, fuera de git
const URL = 'http://perf.localhost:5173/docs/v5.11/rendimiento/evidencia/perf.html'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--mute-audio', '--window-size=360,780',
  '--disable-extensions', '--disable-background-networking', '--disable-sync', '--disable-component-update',
  ...(NOGPU ? ['--disable-gpu'] : []),
], { stdio: 'ignore' })
process.on('exit', () => edge.kill())

async function json(path) {
  for (let i = 0; i < 50; i++) {
    try {
      return await (await fetch(`http://127.0.0.1:${PORT}${path}`)).json()
    } catch {
      await sleep(200)
    }
  }
  throw new Error('Edge no responde')
}

function client(ws) {
  const sock = new WebSocket(ws)
  let id = 0
  const wait = new Map()
  const on = new Map()
  sock.onmessage = (m) => {
    const d = JSON.parse(m.data)
    if (d.method && on.has(d.method)) on.get(d.method)(d.params)
    if (d.id && wait.has(d.id)) {
      const { res, rej } = wait.get(d.id)
      wait.delete(d.id)
      d.error ? rej(new Error(d.error.message)) : res(d.result)
    }
  }
  const ready = new Promise((r) => (sock.onopen = r))
  const send = (method, params = {}) =>
    ready.then(() => new Promise((res, rej) => {
      const i = ++id
      wait.set(i, { res, rej })
      sock.send(JSON.stringify({ id: i, method, params }))
    }))
  return { send, on: (k, f) => on.set(k, f), close: () => sock.close() }
}

const ver = await json('/json/version')
const browser = client(ver.webSocketDebuggerUrl)
const list = await json('/json/list')
const page = client(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
const ev = async (expr) => {
  const r = await page.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
  return r.result.value
}

async function viewport(w, h) {
  await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true })
}
await page.send('Page.enable')
await page.send('Runtime.enable')
await page.send('Performance.enable', { timeDomain: 'timeTicks' })
await viewport(360, 780)
console.log('procesos:', JSON.stringify((await browser.send('SystemInfo.getProcessInfo')).processInfo.map((p) => p.type)))

const clickRe = (re) => ev(`(() => { const b = [...document.querySelectorAll('button,[role=button]')].find((x) => ${re}.test(x.textContent.trim())); b && b.click(); return !!b })()`)
async function load(gate = 'Ir al inicio', intento = 0) {
  await page.send('Page.navigate', { url: URL })
  await sleep(1500)
  // «Welcome back» y «¡Hola de nuevo!» (clase a medias) al abrir: se entra al Inicio (o a la clase) en cuanto salen.
  const r = await ev(`(async () => {
    const want = ${JSON.stringify(gate)}
    const btn = (re) => [...document.querySelectorAll('button,a,[role=button]')].find((x) => re.test(x.textContent.trim()))
    for (let i = 0; i < 60; i++) {
      if (want === 'Ir al inicio' && document.querySelector('button[aria-label="Ajustes"]')) return 'inicio'
      if (want !== 'Ir al inicio' && document.querySelector('.cv-root')) return 'clase'
      const w = btn(/^Continuar donde lo dej/); if (w) w.click()
      const g = btn(new RegExp('^' + want)); if (g) g.click()
      await new Promise((r) => setTimeout(r, 250))
    }
    return 'sin llegar'
  })()`).catch((e) => 'error: ' + e.message)
  if (r !== 'inicio' && r !== 'clase' && intento < 3) return load(gate, intento + 1)
  await sleep(1500)
  return r
}
async function shot(name) {
  const r = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 72 })
  writeFileSync(join(OUT, name + '.jpg'), Buffer.from(r.data, 'base64'))
}

// --- Datos ficticios (perfil, clase larga guardada) -------------------------------------------------------------
await page.send('Page.navigate', { url: URL })
await sleep(4000)
console.log(await ev(`(async () => {
  const v = await (await fetch('/version.json')).json()
  localStorage.setItem('CapacitorStorage.habla.settings', JSON.stringify({
    geminiKey: 'AIzaPERF-NO-REAL-000000000000000000000', onboarded: true, keysIntroSeen: true, lastSeenVersion: v.version,
    mascotTapped: true, mascotNudgeSeen: true, mascotNotices: false, mascotAdvice: false, homeworkSeen: Date.now() + 1e12,
    soundsIntroSeen: true, grammarIntroSeen: true, reviewHelpSeen: true, theme: 'marea', mode: 'light',
  }))
  const { db } = await import('/src/lib/db.ts')
  const L = 'B1'
  await db.profile.put({ id: 'me', name: 'Perf', about: 'tester', weaknesses: [], goal: 'x', startedAt: Date.now() - 864e5,
    levels: { overall: L, grammar: L, reading: L, listening: L, speaking: L }, calibratedAt: Date.now() - 3600e3, purposes: [], interests: ['food', 'travel', 'movies'] })
  const sessionId = await db.sessions.add({ scenario: 'free', startedAt: Date.now() - 1800e3 })
  const history = []
  let t = Date.now() - 1700e3
  for (let i = 0; i < 20; i++) {
    const q = 'Nice! Tell me more about your trip number ' + i + '. What did you eat there, and who did you travel with?'
    const a = 'I go to the beach with my friends and we eat a lot of fish, it was very delicious and we stay three days.'
    await db.turns.add({ sessionId, role: 'teacher', text: q, translation: '¡Bien! Cuéntame más de tu viaje ' + i + '.', createdAt: t++ })
    await db.turns.add({ sessionId, role: 'user', text: a, createdAt: t++, audioSeconds: 9, speechSeconds: 8, pauses: [1.2],
      corrections: [{ original: 'I go to the beach', corrected: 'I went to the beach', explanationEs: 'Pasado: went.', category: 'grammar', spanish: 'Fui a la playa' }] })
    history.push({ role: 'model', text: q }, { role: 'user', text: a })
  }
  localStorage.setItem('CapacitorStorage.habla.savedClass', JSON.stringify({ sessionId, scenarioId: 'free', system: 'perf', history,
    mascot: 'aqua', title: 'Clase larga de prueba', turns: 20, savedAt: Date.now() }))
  return 'datos ficticios listos (sesión ' + sessionId + ')'
})()`))

// --- Grupos de efectos (CSS inyectado) ---------------------------------------------------------------------------
const CSS = {
  blur: '*,*::before,*::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
  fondo: 'div[aria-hidden][style*="position: fixed"]>div[style*="blur("]{display:none!important}',
  sombras: '*,*::before,*::after{box-shadow:none!important;text-shadow:none!important}[style*="drop-shadow"]{filter:none!important}',
  anim: '*,*::before,*::after{animation:none!important;transition:none!important}',
  // «Mascota quieta» se aproxima ocultándola: el planificador de Mascot.tsx deja de dibujar si no se ve (IntersectionObserver);
  // una mascota quieta de verdad se dibuja una vez y luego cuesta lo mismo que oculta.
  mascota: 'svg[viewBox="-110 -125 220 220"]{display:none!important}',
}
CSS.ligero = Object.values(CSS).join('\n')
const CONFIGS = QUICK ? ['todo', 'ligero'] : ['todo', 'blur', 'fondo', 'sombras', 'anim', 'mascota', 'ligero']
const setCfg = (cfg) =>
  ev(`(() => {
  let s = document.getElementById('perf-css'); if (!s) { s = document.createElement('style'); s.id = 'perf-css'; document.head.appendChild(s) }
  s.textContent = ${JSON.stringify(cfg === 'todo' ? '' : CSS[cfg])}; return ${JSON.stringify(cfg)} })()`)

async function metrics() {
  const m = Object.fromEntries((await page.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
  const p = await browser.send('SystemInfo.getProcessInfo')
  const cpu = { renderer: 0, gpu: 0, browser: 0, utility: 0 }
  for (const x of p.processInfo) cpu[x.type.toLowerCase()] = (cpu[x.type.toLowerCase()] ?? 0) + x.cpuTime
  return { t: m.Timestamp, task: m.TaskDuration, ...cpu }
}
const diff = (a, b) => {
  const dt = b.t - a.t
  const pct = (k) => +((100 * (b[k] - a[k])) / dt).toFixed(1)
  return { main: pct('task'), renderer: pct('renderer'), gpu: pct('gpu') }
}

// Trazado: tiempo de pintura (todas las hebras) en una ventana.
const PAINT = ['Paint', 'PaintImage', 'RasterTask', 'PrePaint', 'Layerize', 'UpdateLayerTree', 'CompositeLayers', 'Commit', 'Draw', 'DrawFrame', 'Layout', 'UpdateLayoutTree', 'RecalculateStyles', 'FunctionCall', 'TimerFire', 'FireAnimationFrame']
let traceBuf = []
let traceDone = null
page.on('Tracing.dataCollected', (p) => traceBuf.push(...p.value))
page.on('Tracing.tracingComplete', () => traceDone && traceDone())
async function traced(ms) {
  traceBuf = []
  await page.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,cc,viz', transferMode: 'ReportEvents' })
  const a = await metrics()
  await sleep(ms)
  const b = await metrics()
  const done = new Promise((r) => (traceDone = r))
  await page.send('Tracing.end')
  await done
  const sum = {}
  const count = {}
  for (const e of traceBuf) {
    if (e.ph !== 'X' || !PAINT.includes(e.name) || !e.dur) continue
    sum[e.name] = (sum[e.name] ?? 0) + e.dur / 1000
    count[e.name] = (count[e.name] ?? 0) + 1
  }
  const secs = ms / 1000
  const per = (k) => +((sum[k] ?? 0) / secs).toFixed(1) // ms por segundo
  return {
    ...diff(a, b),
    pintar: +(per('Paint') + per('PrePaint') + per('Layerize') + per('UpdateLayerTree')).toFixed(1),
    raster: per('RasterTask'),
    estilo: +(per('UpdateLayoutTree') + per('RecalculateStyles') + per('Layout')).toFixed(1),
    script: +(per('FunctionCall') + per('TimerFire') + per('FireAnimationFrame')).toFixed(1),
    paints: +((count.Paint ?? 0) / secs).toFixed(1), // pinturas por segundo
  }
}
async function window_(ms) {
  const a = await metrics()
  await sleep(ms)
  return diff(a, await metrics())
}

// Fotogramas: contador por rAF SOLO durante las interacciones (en reposo forzaría fotogramas).
const fpsStart = () => ev(`(() => { const F = (window.__F = { ts: [], on: true }); const f = (t) => { if (!F.on) return; F.ts.push(t); requestAnimationFrame(f) }; requestAnimationFrame(f); return 1 })()`)
const fpsStop = () =>
  ev(`(() => { const F = window.__F; if (!F) return null; F.on = false; const d = []; for (let i = 1; i < F.ts.length; i++) d.push(F.ts[i] - F.ts[i - 1])
  d.sort((a, b) => a - b); const dur = F.ts.at(-1) - F.ts[0]; return { fps: +((1000 * d.length) / dur).toFixed(1), p95: +(d[Math.floor(d.length * 0.95)] ?? 0).toFixed(1),
  largos: d.filter((x) => x > 50).length, n: d.length } })()`)

async function wakeMascots() {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 180, y: 300 })
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 190, y: 310 })
}
async function scrollFps([x, y, dist]) {
  const a = await metrics()
  await fpsStart()
  await page.send('Input.synthesizeScrollGesture', { x, y, yDistance: -dist, speed: 1400, repeatCount: 1, gestureSourceType: 'touch' })
  await page.send('Input.synthesizeScrollGesture', { x, y, yDistance: dist, speed: 1400, repeatCount: 1, gestureSourceType: 'touch' })
  return { ...(await fpsStop()), ...diff(a, await metrics()) }
}
async function tapMascotFps() {
  const r = await ev(`(() => { const s = [...document.querySelectorAll('svg[viewBox="-110 -125 220 220"]')].map((e) => e.getBoundingClientRect()).find((b) => b.width > 60)
    return s ? [s.x + s.width / 2, s.y + s.height / 2] : null })()`)
  if (!r) return null
  const a = await metrics()
  await fpsStart()
  for (let i = 0; i < 3; i++) {
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r[0], y: r[1], button: 'left', clickCount: 1 })
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r[0], y: r[1], button: 'left', clickCount: 1 })
    await sleep(700)
  }
  await sleep(800)
  return { ...(await fpsStop()), ...diff(a, await metrics()) }
}
// Cambiar de pestaña (Inicio ↔ Progreso ↔ Ajustes): animaciones anim-up/anim-in y la barra con desenfoque.
async function tabsFps() {
  const a = await metrics()
  await fpsStart()
  for (const t of ['Progreso', 'Ajustes', 'Palabras', 'Hablar']) {
    await ev(`(() => { const b = document.querySelector('button[aria-label="${t}"]'); b && b.click(); return !!b })()`)
    await sleep(900)
  }
  return { ...(await fpsStop()), ...diff(a, await metrics()) }
}
const domCount = () =>
  ev(`({ glass: document.querySelectorAll('.glass').length, mascotas: document.querySelectorAll('svg[viewBox="-110 -125 220 220"]').length,
  desenfoque: [...document.querySelectorAll('*')].filter((e) => { const s = getComputedStyle(e); return s.backdropFilter && s.backdropFilter !== 'none' }).length,
  alto: Math.max(...[...document.querySelectorAll('*')].map((e) => e.scrollHeight)) })`)

// --- Escenarios --------------------------------------------------------------------------------------------------
const SCEN = {
  inicio: async () => load(),
  clase: async () => {
    console.log('clase:', await load('Continuar mi clase'))
    await sleep(4000)
  },
  sonidos: async () => {
    await load()
    await clickRe('/^Sonidos/')
    await sleep(2500)
  },
  apariencia: async () => {
    await load()
    await ev(`(() => { const b = document.querySelector('button[aria-label="Ajustes"]'); b && b.click(); return !!b })()`)
    await sleep(1200)
    await clickRe('/Apariencia$/')
    await sleep(2000)
  },
}
const SCROLL = { clase: [180, 380, 1600], apariencia: [180, 420, 1600], sonidos: [180, 500, 900], inicio: [180, 500, 300] }

const results = []
const THROTTLES = QUICK ? [4] : [4, 6]
const IDLE = QUICK ? 4000 : 8000
for (const sc of Object.keys(SCEN)) {
  await page.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await SCEN[sc]()
  const dom = await domCount()
  await setCfg('todo')
  await shot(`${sc}-todo`)
  await setCfg('ligero')
  await sleep(400)
  await shot(`${sc}-ligero`)
  console.log(sc, JSON.stringify(dom))
  for (const cfg of CONFIGS) for (let intento = 0; intento < 3; intento++) try {
    if (intento) {
      console.log('reintento', sc, cfg, intento)
      await page.send('Emulation.setCPUThrottlingRate', { rate: 1 })
      await SCEN[sc]()
    }
    await page.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    await setCfg(cfg)
    await wakeMascots()
    await sleep(1600)
    const despierta = await traced(IDLE) // mascota a 8 fps (los 10 s tras el último movimiento)
    await sleep(Math.max(0, 11000 - IDLE))
    const descanso = await traced(IDLE) // modo descanso (2 fps)
    const row = { sc, cfg, dom, despierta, descanso, lento: {} }
    for (const rate of THROTTLES) {
      await page.send('Emulation.setCPUThrottlingRate', { rate })
      const r = { scroll: await scrollFps(SCROLL[sc]) }
      if (sc === 'inicio') {
        r.tap = await tapMascotFps()
        r.tabs = await tabsFps()
      }
      row.lento[rate] = r
    }
    results.push(row)
    console.log(JSON.stringify(row))
    writeFileSync(join(OUT, `medidas${NOGPU ? '-sin-gpu' : ''}.json`), JSON.stringify(results, null, 1))
    break
  } catch (e) {
    console.log('fallo', sc, cfg, e.message.slice(0, 120))
  }
}

// --- Longitud de Apariencia (sin ralentizar) ------------------------------------------------------------------------
await page.send('Emulation.setCPUThrottlingRate', { rate: 1 })
await setCfg('todo')
const longitud = []
if (!QUICK && !NOGPU) {
  for (const [w, h] of [[390, 844], [320, 640], [780, 360]]) {
    await viewport(w, h)
    await SCEN.apariencia()
    const m = await ev(`(() => { const sc = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY))
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0]; const z = getComputedStyle(document.documentElement).zoom
      const root = document.querySelector('.anim-in')
      const bloques = root ? [...root.children].map((e) => [e.textContent.trim().slice(0, 30), Math.round(e.getBoundingClientRect().height)]) : []
      return { contenedor: sc ? (sc.id || sc.className).slice(0, 40) : null, alto: sc?.scrollHeight, visible: sc?.clientHeight, pantallas: sc ? +(sc.scrollHeight / sc.clientHeight).toFixed(2) : null, zoom: z, mascotas: document.querySelectorAll('svg[viewBox="-110 -125 220 220"]').length, bloques } })()`)
    longitud.push({ w, h, ...m })
    console.log('apariencia', w, h, JSON.stringify(m))
    await shot(`apariencia-${w}x${h}-0`)
    for (let k = 1; k < Math.min(7, Math.ceil(m.pantallas || 1)); k++) {
      await ev(`(() => { const sc = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)).sort((a, b) => b.scrollHeight - a.scrollHeight)[0]; sc.scrollTop = ${k} * sc.clientHeight * 0.85; return 1 })()`)
      await sleep(400)
      await shot(`apariencia-${w}x${h}-${k}`)
    }
  }
  writeFileSync(join(OUT, 'apariencia-longitud.json'), JSON.stringify(longitud, null, 1))
}
console.log('red de IA falsa:', JSON.stringify(await ev('({ n: __PERF.net.length, bloqueadas: __PERF.blocked, urls: __PERF.net.slice(0, 5) })')))
browser.close()
page.close()
edge.kill()
process.exit(0)
