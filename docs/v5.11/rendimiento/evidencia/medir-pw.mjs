// Medida del modo ligero con Playwright (Linux / Claude Cloud). NO es parte de la app.
// Misma idea que medir.mjs (que se colgaba al cargar con CDP crudo en Linux): app desde perf.html (red de IA falsa),
// 360×780 dpr 2, y cada grupo de efectos apagado por CSS inyectado (o, con `--real`, con el ajuste de la app).
// Mide: hilo principal y CPU de renderer+GPU en reposo (mascota despierta y en descanso), y fotogramas al desplazar,
// tocar la mascota y cambiar de pestaña con la CPU ralentizada 4× y 6×.
// Ojo: en el contenedor no hay GPU real (composición por software), más parecido a un teléfono modesto que a un PC.
// Uso: node medir-pw.mjs <carpeta-salida> [rapido] [--real]   (con `npx vite --port 5173` corriendo en la raíz)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PW = process.env.PLAYWRIGHT_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs'
const { chromium } = await import(PW)
const OUT = process.argv[2] || '.'
const QUICK = process.argv.includes('rapido')
const REAL = process.argv.includes('--real')
mkdirSync(OUT, { recursive: true })
const PORT = process.env.PERF_PORT || 5173
const URL = `http://perf.localhost:${PORT}/docs/v5.11/rendimiento/evidencia/perf.html`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--mute-audio'] })
const bcdp = await browser.newBrowserCDPSession()
const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Performance.enable', { timeDomain: 'timeTicks' })

// Datos ficticios: perfil calibrado y una clase larga guardada (como medir.mjs).
// Se siembra desde una página sin la app (version.json): si la app arranca a la vez, crea su perfil neutro encima.
const seed = async (effects) => {
  await page.goto(`http://perf.localhost:${PORT}/version.json`)
  return page.evaluate(async (effects) => {
    const v = await (await fetch('/version.json')).json()
    localStorage.setItem('CapacitorStorage.habla.settings', JSON.stringify({
      geminiKey: 'AIzaPERF-NO-REAL-000000000000000000000', onboarded: true, keysIntroSeen: true, lastSeenVersion: v.version,
      mascotTapped: true, mascotNudgeSeen: true, mascotNotices: false, mascotAdvice: false, homeworkSeen: Date.now() + 1e12,
      soundsIntroSeen: true, grammarIntroSeen: true, reviewHelpSeen: true, theme: 'marea', mode: 'light', ...(effects ? { effects } : {}),
    }))
    const { db } = await import('/src/lib/db.ts')
    if ((await db.profile.get('me'))?.name === 'Perf') return 'ya había datos'
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
    return 'datos ficticios listos'
  }, effects)
}
console.log(await seed(null))

const CSS = {
  blur: '*,*::before,*::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
  fondo: 'div[aria-hidden][style*="position: fixed"]>div[style*="blur("]{display:none!important}',
  sombras: '*,*::before,*::after{box-shadow:none!important;text-shadow:none!important}[style*="drop-shadow"]{filter:none!important}',
  anim: '*,*::before,*::after{animation:none!important;transition:none!important}',
  mascota: 'svg[viewBox="-110 -125 220 220"]{display:none!important}',
}
CSS.ligero = Object.values(CSS).join('\n')
const OFF = { blur: false, background: false, glow: false, motion: false, mascot: false }
const CONFIGS = REAL ? ['todo', 'ligero-real'] : QUICK ? ['todo', 'ligero'] : ['todo', 'blur', 'fondo', 'sombras', 'anim', 'mascota', 'ligero']

async function load(gate) {
  await page.goto(URL)
  for (let i = 0; i < 80; i++) {
    const r = await page.evaluate((gate) => {
      const btn = (re) => [...document.querySelectorAll('button,a,[role=button]')].find((x) => re.test(x.textContent.trim()))
      if (!gate && document.querySelector('button[aria-label="Ajustes"]')) return 'inicio'
      if (gate && document.querySelector('.cv-root')) return 'clase'
      btn(/^Continuar donde lo dej/)?.click()
      btn(new RegExp('^' + (gate || 'Ir al inicio')))?.click()
      return null
    }, gate).catch(() => null)
    if (r) return r
    await sleep(250)
  }
  return 'sin llegar: ' + (await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 160)))
}
const clickText = (re) => page.evaluate((s) => { const b = [...document.querySelectorAll('button,[role=button]')].find((x) => new RegExp(s).test(x.textContent.trim())); b?.click(); return !!b }, re)
const clickLabel = (l) => page.evaluate((l) => { const b = document.querySelector(`button[aria-label="${l}"]`); b?.click(); return !!b }, l)
const SCEN = {
  inicio: () => load(),
  clase: async () => { const r = await load('Continuar mi clase'); await sleep(3000); return r },
  sonidos: async () => { const r = await load(); await clickText('^Sonidos'); await sleep(2500); return r },
  apariencia: async () => { const r = await load(); await clickLabel('Ajustes'); await sleep(1000); await clickText('Apariencia'); await sleep(1500); return r },
}
const SCROLL = { clase: [180, 380, 1600], apariencia: [180, 420, 1600], sonidos: [180, 500, 900], inicio: [180, 500, 300] }

async function metrics() {
  const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]))
  const p = await bcdp.send('SystemInfo.getProcessInfo')
  const cpu = { renderer: 0, gpu: 0 }
  for (const x of p.processInfo) if (x.type === 'renderer' || x.type === 'GPU') cpu[x.type.toLowerCase()] += x.cpuTime
  return { t: m.Timestamp, task: m.TaskDuration, ...cpu }
}
const diff = (a, b) => {
  const dt = b.t - a.t
  const pct = (k) => +((100 * (b[k] - a[k])) / dt).toFixed(1)
  return { main: pct('task'), renderer: pct('renderer'), gpu: pct('gpu') }
}
async function idle(ms) {
  const a = await metrics()
  await sleep(ms)
  return diff(a, await metrics())
}
const fpsStart = () => page.evaluate(() => { const F = (window.__F = { ts: [], on: true }); const f = (t) => { if (!F.on) return; F.ts.push(t); requestAnimationFrame(f) }; requestAnimationFrame(f) })
const fpsStop = () => page.evaluate(() => { const F = window.__F; F.on = false; const d = []; for (let i = 1; i < F.ts.length; i++) d.push(F.ts[i] - F.ts[i - 1])
  d.sort((a, b) => a - b); const dur = F.ts.at(-1) - F.ts[0]; return { fps: +((1000 * d.length) / dur).toFixed(1), p95: +(d[Math.floor(d.length * 0.95)] ?? 0).toFixed(1), largos: d.filter((x) => x > 50).length } })
async function scrollFps([x, y, dist]) {
  const a = await metrics()
  await fpsStart()
  await cdp.send('Input.synthesizeScrollGesture', { x, y, yDistance: -dist, speed: 1400, gestureSourceType: 'touch' })
  await cdp.send('Input.synthesizeScrollGesture', { x, y, yDistance: dist, speed: 1400, gestureSourceType: 'touch' })
  return { ...(await fpsStop()), ...diff(a, await metrics()) }
}
async function tabsFps() {
  const a = await metrics()
  await fpsStart()
  for (const t of ['Progreso', 'Ajustes', 'Palabras', 'Hablar']) { await clickLabel(t); await sleep(900) }
  return { ...(await fpsStop()), ...diff(a, await metrics()) }
}
async function wake() {
  await page.mouse.move(180, 300)
  await page.mouse.move(190, 310)
}
const setCss = (css) => page.evaluate((css) => { let s = document.getElementById('perf-css'); if (!s) { s = document.createElement('style'); s.id = 'perf-css'; document.head.appendChild(s) } s.textContent = css }, css)

const results = []
for (const sc of Object.keys(SCEN)) {
  for (const cfg of CONFIGS) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    if (REAL) await seed(cfg === 'ligero-real' ? OFF : null)
    const r = await SCEN[sc]()
    if (r.startsWith('sin llegar')) { console.log(sc, cfg, r); continue }
    await setCss(REAL || cfg === 'todo' ? '' : CSS[cfg])
    await sleep(1500)
    if (cfg === CONFIGS[0] || cfg.startsWith('ligero')) await page.screenshot({ path: join(OUT, `${sc}-${cfg}.jpg`), type: 'jpeg', quality: 70 })
    await wake()
    await sleep(800)
    const despierta = await idle(QUICK ? 4000 : 6000)
    await sleep(QUICK ? 6000 : 5000)
    const descanso = await idle(QUICK ? 4000 : 6000)
    const row = { sc, cfg, despierta, descanso, lento: {} }
    for (const rate of [4, 6]) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate })
      const x = { scroll: await scrollFps(SCROLL[sc]) }
      if (sc === 'inicio') x.tabs = await tabsFps()
      row.lento[rate] = x
    }
    results.push(row)
    console.log(JSON.stringify(row))
    writeFileSync(join(OUT, `medidas${REAL ? '-real' : ''}.json`), JSON.stringify(results, null, 1))
  }
}
await browser.close()
