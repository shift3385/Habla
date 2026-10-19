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

// --- Clase: tocar «big» en la respuesta del profe abre la HOJA; sinónimo y antónimo dentro de la misma hoja.
await viewport(390, 844)
await goto(ORIGIN)
for (let i = 0; i < 60; i++) {
  if (await ev(`return !!document.querySelector('[aria-label="Palabras"]')`)) break
  for (const t of ['Continuar donde lo dejé', 'Entendido']) if (await ev(`${HELPERS} return !!byText('${t}')`)) await click(`byText('${t}')`)
  await sleep(250)
}
await click(`byText('Tema libre')`)
await sleep(600)
await click(`byText('Mi trabajo')`)
await sleep(300)
await click(`byText('Empezar a hablar')`)
for (let i = 0; i < 40; i++) {
  if (await ev(`return [...document.querySelectorAll('[role=button]')].some((b) => b.innerText.trim() === 'big')`)) break
  await sleep(300)
}
console.log((await text()).slice(0, 600).split(String.fromCharCode(10)).join(' | '))
await click(`[...document.querySelectorAll('[role=button]')].find((b) => b.innerText.trim() === 'big')`)
await waitFor(`document.body.innerText.includes('Consulta en contexto') && document.body.innerText.includes('Sinónimos')`, 'hoja con big')
await ev(`document.querySelector('.fixed.inset-0.z-50 .overflow-y-auto').scrollTop = 9999; return 1`)
await click(`byLabel('Consultar large')`)
await waitFor(`document.body.innerText.includes('Sinónimo de big')`, 'large (scroll)')
await sleep(400)
ok(await ev(`${HELPERS} const r = btns().find((b) => b.getAttribute('aria-label') === 'Volver a big').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight`), 'clase: tras tocar un chip abajo, «‹ big» queda a la vista (sube al principio)')
await waitFor(`document.body.innerText.includes('Sinónimo de big') && document.body.innerText.includes('De tamaño grande')`, 'large en la hoja')
await click(`byLabel('Consultar small')`)
await waitFor(`document.body.innerText.includes('Antónimo de large') && document.body.innerText.includes('De poco tamaño')`, 'small en la hoja')
ok((await ev(`return document.querySelectorAll('.fixed.inset-0.z-50').length`)) === 1, 'clase: una sola hoja (sin modal sobre modal)')
await shot('sin-hoja-clase-390x844.png')
await androidBack()
await waitFor(`document.body.innerText.includes('Sinónimo de big')`, 'Atrás → large')
ok((await text()).includes('Consulta en contexto'), 'clase: Atrás (Android) vuelve a large sin cerrar la hoja')
await androidBack()
await waitFor(`!document.body.innerText.includes('Sinónimo de big') && document.body.innerText.includes('De gran tamaño')`, 'Atrás → big')
ok((await text()).includes('Consulta en contexto'), 'clase: Atrás vuelve a big con la hoja abierta')
await androidBack()
await waitFor(`!document.body.innerText.includes('Consulta en contexto')`, 'hoja cerrada')
ok(!(await text()).includes('Consulta en contexto') && (await text()).includes('It was a big house'), 'clase: con la pila vacía Atrás cierra la hoja y la clase sigue')
// Error de red: mensaje amable + Reintentar en la misma hoja.
await ev(`window.__lex.fail = true; return 1`)
await click(`[...document.querySelectorAll('[role=button]')].find((b) => b.innerText.trim() === 'river')`)
await waitFor(`document.body.innerText.includes('Reintentar') && document.body.innerText.includes('Consulta en contexto')`, 'error en la hoja')
ok((await text()).includes('Fallo simulado de red'), 'clase: el error de red se muestra en la hoja (friendlyError)')
await shot('sin-error-390x844.png')
await ev(`window.__lex.fail = false; return 1`)
await click(`btns().filter((b) => b.innerText.trim() === 'Reintentar').at(-1)`)
await waitFor(`document.body.innerText.includes('Significado simulado')`, 'reintento')
ok(true, 'clase: Reintentar carga la consulta')
writeFileSync(join(HERE, 'cdp-log.txt'), log.join('\n'))
ws.close()
proc.kill()
console.log(log.filter((l) => l.startsWith('FAIL')).length ? 'HAY FALLOS' : 'TODO OK')
