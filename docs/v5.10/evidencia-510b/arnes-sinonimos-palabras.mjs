// Prueba en Chromium headless (Chrome instalado) de la pila de sinónimos/antónimos. Red y voz simuladas (lexmock.js).
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const OUT = 'D:/My Apps/HABLA/docs/v5.10/evidencia-510b'
mkdirSync(OUT, { recursive: true })
const MOCK = readFileSync(join(HERE, 'arnes-sinonimos-red.js'), 'utf8')
const ORIGIN = 'http://lex.localhost:5173'
const PORT = 9333
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const profile = mkdtempSync(join(tmpdir(), 'lexcdp-'))
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = []
const ok = (cond, msg) => {
  log.push(`${cond ? 'OK  ' : 'FAIL'} ${msg}`)
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${msg}`)
}

let targets
for (let i = 0; i < 50; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    if (targets.some((t) => t.type === 'page')) break
  } catch { /* aún arrancando */ }
  await sleep(200)
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d)
    pending.delete(d.id)
  }
}
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id
    pending.set(i, (d) => (d.error ? rej(new Error(method + ': ' + d.error.message)) : res(d.result)))
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const ev = async (body) => {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${body} })()`, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
  return r.result.value
}
const waitFor = async (cond, what, ms = 8000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (await ev(`return !!(${cond})`).catch(() => false)) return true
    await sleep(150)
  }
  ok(false, `esperando: ${what}`)
  return false
}
const text = () => ev('return document.body.innerText')
const HELPERS = `
  const btns = () => [...document.querySelectorAll('button')]
  const byLabel = (t) => btns().find((b) => b.getAttribute('aria-label') === t)
  const byText = (t) => btns().filter((b) => b.innerText.trim().includes(t)).at(-1)
  const set = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
`
const click = (expr) => ev(`${HELPERS} const el = ${expr}; if (!el) throw new Error('no está: ${expr.replace(/'/g, '')}'); el.click(); return true`)
const shot = async (name) => {
  await sleep(350)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(OUT, name), Buffer.from(data, 'base64'))
  console.log('  captura', name)
}
const noHScroll = (label) => ev('return document.documentElement.scrollWidth <= innerWidth + 1').then((v) => ok(v, `${label}: sin scroll horizontal`))
const androidBack = () => ev(`await window.Capacitor.Plugins.App.notifyListeners('backButton', { canGoBack: false }); return true`)
const heading = () => ev(`return [...document.querySelectorAll('.text-\\\\[22px\\\\]')].map((e) => e.innerText).join('|')`)

await send('Page.enable')
await send('Runtime.enable')
await send('Page.addScriptToEvaluateOnNewDocument', { source: MOCK })

const viewport = async (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true })
const goto = async (url) => {
  await send('Page.navigate', { url })
  await sleep(1500)
}

// --- Datos ficticios: ajustes con clave falsa, perfil «Lex» y una consulta ANTIGUA (sin synonyms/antonyms).
await viewport(390, 844)
await goto(ORIGIN)
await waitFor(`document.readyState === 'complete'`, 'carga')
await ev(`
  const s = await import('/src/lib/settings.ts')
  const cur = await s.loadSettings()
  await s.saveSettings({ ...cur, onboarded: true, keysIntroSeen: true, lastSeenVersion: '5.10', geminiKey: 'AIzaFAKE-LEX-000000000000000000000000' })
  const { db } = await import('/src/lib/db.ts')
  const p = await import('/src/lib/profile.ts')
  const prof = await p.getProfile()
  await db.profile.put({ ...prof, name: 'Lex', interests: ['news', 'ai', 'tech'], calibratedAt: Date.now() })
  if (!(await db.lookups.count())) await db.lookups.add({ query: 'bright', context: 'She is a very bright student.', saved: true, createdAt: Date.now() - 86400000,
    result: { headword: 'bright', ipa: '/braɪt/', partOfSpeech: 'adjetivo', translation: 'listo, inteligente', meaningEs: 'Inteligente, que aprende rápido.',
      whyEs: 'Habla de una estudiante, no de luz.', otherMeanings: [], register: 'neutro', collocations: ['bright idea'], falseFriendEs: '', exampleEn: 'He is a bright kid.', exampleEs: 'Es un niño listo.' } })
  return true
`)

async function openWords() {
  await goto(ORIGIN)
  for (let i = 0; i < 60; i++) {
    if (await ev(`return !!document.querySelector('[aria-label="Palabras"]')`)) break
    for (const t of ['Continuar donde lo dejé', 'Entendido']) if (await ev(`${HELPERS} return !!byText('${t}')`)) await click(`byText('${t}')`)
    await sleep(250)
  }
  if (!(await ev(`return !!document.querySelector('[aria-label="Palabras"]')`))) console.log((await text()).slice(0, 400))
  await click(`byLabel('Palabras')`)
  await waitFor(`document.body.innerText.includes('Consultar')`, 'Palabras')
}

async function ask(word, ctx) {
  await ev(`${HELPERS} set(document.querySelector('input.input'), ${JSON.stringify(word)}); set(document.querySelector('textarea'), ${JSON.stringify(ctx)}); return true`)
  await click(`byText('Consultar')`)
}

const sizes = [
  [390, 844],
  [780, 360],
  [320, 640],
]
for (const [w, h] of sizes) {
  const tag = `${w}x${h}`
  console.log(`--- ${tag}`)
  await viewport(w, h)
  await openWords()
  await ask('big', 'It was a big house.')
  await waitFor(`document.body.innerText.includes('Sinónimos')`, 'consulta de big')
  const t1 = await text()
  ok(/Sinónimos/.test(t1) && /Antónimos/.test(t1), `${tag}: big tiene Sinónimos y Antónimos`)
  const chips = await ev(`return [...document.querySelectorAll('button[aria-label^="Consultar "]')].map((b) => b.innerText)`)
  ok(JSON.stringify(chips) === JSON.stringify(['large', 'huge', 'enormous', 'massive', 'vast', 'giant', 'small', 'little']), `${tag}: chips limpios (máx. 6, sin «Big»): ${chips.join(', ')}`)
  ok(!(await ev(`${HELPERS} return !!btns().find((b) => (b.getAttribute('aria-label') || '').startsWith('Volver a'))`)), `${tag}: sin botón atrás en la palabra original`)
  if (w === 390) {
    await ev(`[...document.querySelectorAll('div')].find((d) => d.innerText.trim().startsWith('Sinónimos') && d.classList.contains('glass')).scrollIntoView({ block: 'center' }); return 1`)
    await shot(`sin-sinonimos-${tag}.png`)
  }
  await noHScroll(`${tag} big`)

  // big → large (sinónimo): carga en la misma vista.
  await click(`byLabel('Consultar large')`)
  await sleep(150)
  ok((await text()).includes('Buscando qué significa "large"'), `${tag}: estado de carga en la misma vista`)
  if (w === 390) await shot(`sin-cargando-${tag}.png`)
  await waitFor(`document.body.innerText.includes('Sinónimo de big') && document.body.innerText.includes('De tamaño grande')`, 'large')
  ok(await ev(`${HELPERS} return !!byLabel('Volver a big')`), `${tag}: botón «‹ big»`)

  // large → small (antónimo).
  await click(`byLabel('Consultar small')`)
  await waitFor(`document.body.innerText.includes('Antónimo de large') && document.body.innerText.includes('De poco tamaño')`, 'small')
  ok(await ev(`${HELPERS} return !!byLabel('Volver a large')`), `${tag}: botón «‹ large»`)
  await ev(`window.scrollTo(0, 0); document.querySelectorAll('*').forEach((e) => e.scrollTop && (e.scrollTop = 0)); return 1`)
  await shot(`sin-pila-${tag}.png`)
  await noHScroll(`${tag} small`)

  // ▶/⏸ de un chip (tiny, sinónimo de small).
  await click(`byLabel('Escuchar tiny')`)
  await sleep(300)
  const key = await ev(`return (await import('/src/lib/speaking.ts')).speakingKey()`)
  const pauseIcon = await ev(`${HELPERS} return byLabel('Escuchar tiny').innerHTML`)
  ok(key === 'tiny', `${tag}: ▶ del chip lee «tiny» (speakingKey=${key})`)
  if (w === 390) {
    await ev(`${HELPERS} byLabel('Escuchar tiny').scrollIntoView({ block: 'center' }); return 1`)
    await shot(`sin-play-${tag}.png`)
  }
  await click(`byLabel('Escuchar tiny')`)
  await sleep(200)
  const key2 = await ev(`return (await import('/src/lib/speaking.ts')).speakingKey()`)
  ok(key2 === null, `${tag}: ⏸ lo para (speakingKey=${key2})`)
  const playIcon = await ev(`${HELPERS} return byLabel('Escuchar tiny').innerHTML`)
  ok(pauseIcon !== playIcon, `${tag}: el icono cambia ▶ ↔ ⏸`)

  // Atrás (botón de la vista): small → large.
  await click(`byLabel('Volver a large')`)
  await waitFor(`document.body.innerText.includes('Sinónimo de big')`, 'vuelta a large')
  ok(!(await text()).includes('Antónimo de large'), `${tag}: «‹ large» vuelve a large`)
  // Atrás de Android: large → big.
  await androidBack()
  await waitFor(`document.body.innerText.includes('De gran tamaño') && !document.body.innerText.includes('Sinónimo de big')`, 'vuelta a big')
  ok(!(await ev(`${HELPERS} return !!btns().find((b) => (b.getAttribute('aria-label') || '').startsWith('Volver a'))`)), `${tag}: Atrás (Android) vuelve a big, sin botón atrás`)
  // Otra vez Atrás: con la pila vacía vuelve a la lista.
  await androidBack()
  await waitFor(`document.body.innerText.includes('Historial')`, 'lista')
  const hist = await ev(`return [...document.querySelectorAll('button .font-semibold')].map((e) => e.innerText)`)
  ok(['big', 'large', 'small'].every((x) => hist.includes(x)), `${tag}: las consultas de la pila están en el Historial (${hist.slice(0, 6).join(', ')})`)

  // Consulta antigua sin campos: ni «Sinónimos» ni «Antónimos».
  await click(`btns().find((b) => b.innerText.startsWith('bright'))`)
  await waitFor(`document.body.innerText.includes('Inteligente, que aprende')`, 'bright')
  const tb = await text()
  ok(!tb.includes('Sinónimos') && !tb.includes('Antónimos'), `${tag}: consulta antigua sin secciones vacías`)
  if (w === 320) await shot(`sin-antigua-${tag}.png`)
  await androidBack()
}

const calls = await ev(`return window.__lex.calls.map((c) => ({ q: c.q, syn: c.schemaHasSyn, rel: /tapped it as (a synonym|an antonym) of "([^"]+)"/.exec(c.prompt)?.slice(1).join(' '), ctx: /context: "([^"]+)"/.exec(c.prompt)?.[1] }))`)
const lk = calls.filter((c) => ['big', 'large', 'small'].includes(c.q))
ok(lk.every((c) => c.syn), 'el esquema enviado lleva synonyms/antonyms')
ok(lk.filter((c) => c.q === 'large').every((c) => c.rel === 'a synonym big' && c.ctx === 'It was a big house.'), 'large: prompt «synonym of big» con el contexto original')
ok(lk.filter((c) => c.q === 'small').every((c) => c.rel === 'an antonym large' && c.ctx === 'It was a big house.'), 'small: prompt «antonym of large» con el contexto original')
ok(lk.filter((c) => c.q === 'big').every((c) => !c.rel), 'big: sin línea de relación')
console.log('llamadas Gemini (simuladas):', calls.length, JSON.stringify(lk.slice(0, 3)))

writeFileSync(join(HERE, 'cdp-log.txt'), log.join('\n'))
ws.close()
proc.kill()
console.log(log.filter((l) => l.startsWith('FAIL')).length ? 'HAY FALLOS' : 'TODO OK')
