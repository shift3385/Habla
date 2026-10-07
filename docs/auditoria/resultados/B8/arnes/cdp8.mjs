// B8 (copia de B3/arnes/cdp.mjs con -s 60d0718c) · Evalúa JavaScript en el WebView de Habla por CDP.
// Uso: node cdp.mjs "<expresión>"   |   node cdp.mjs -f archivo.js
// Requiere adb forward tcp:9333 → webview_devtools_remote_<pid> (lo hace este script si hace falta).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const ADB = process.env.LOCALAPPDATA + '\\Android\\Sdk\\platform-tools\\adb.exe'
const PORT = 9333

function forward() {
  const unix = execFileSync(ADB, ['-s', '60d0718c', 'shell', 'cat', '/proc/net/unix']).toString()
  const sock = [...unix.matchAll(/@?(webview_devtools_remote_\d+)/g)].map((m) => m[1]).at(-1)
  if (!sock) throw new Error('sin socket de devtools (¿app cerrada?)')
  execFileSync(ADB, ['-s', '60d0718c', 'forward', `tcp:${PORT}`, `localabstract:${sock}`])
  return sock
}

async function pages() {
  const r = await fetch(`http://localhost:${PORT}/json`)
  return (await r.json()).filter((p) => p.type === 'page')
}

let expr = process.argv[2] === '-f' ? readFileSync(process.argv[3], 'utf8') : process.argv[2]
if (process.argv[2] === '-f' && process.argv[4]) expr = process.argv[4] + '\n' + expr

let list
try {
  list = await pages()
} catch {
  forward()
  list = await pages()
}
if (!list.length) {
  forward()
  list = await pages()
}
const ws = new WebSocket(list[0].webSocketDebuggerUrl)
await new Promise((r, j) => {
  ws.onopen = r
  ws.onerror = j
})
const res = await new Promise((resolve) => {
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data)
    if (d.id === 1) resolve(d)
  }
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true, replMode: true, timeout: 600000 } }))
})
ws.close()
const v = res.result?.result
if (res.result?.exceptionDetails) console.log('EXCEPCIÓN', JSON.stringify(res.result.exceptionDetails).slice(0, 800))
else console.log(typeof v?.value === 'string' ? v.value : JSON.stringify(v?.value ?? v, null, 1))
