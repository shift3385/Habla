// Inyecta un script antes de cada carga y recarga la página: node arnes/precarga.mjs archivo.js
import { readFileSync } from 'node:fs'
const page = (await (await fetch('http://localhost:9333/json')).json()).find((p) => p.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((ok) => (ws.onopen = ok))
let id = 0
const send = (method, params = {}) => new Promise((ok) => { const i = ++id; ws.addEventListener('message', function f(m) { const d = JSON.parse(m.data); if (d.id === i) { ws.removeEventListener('message', f); ok(d) } }); ws.send(JSON.stringify({ id: i, method, params })) })
await send('Page.enable')
console.log(JSON.stringify(await send('Page.addScriptToEvaluateOnNewDocument', { source: readFileSync(process.argv[2], 'utf8') })))
await send('Page.reload')
await new Promise((ok) => setTimeout(ok, 8000)) // el script solo vive mientras la sesión CDP siga abierta
ws.close()
