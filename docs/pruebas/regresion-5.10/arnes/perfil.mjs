// Perfil de CPU de la página durante N s (por CDP): node arnes/perfil.mjs 10
const r = await fetch('http://localhost:9333/json')
const page = (await r.json()).find((p) => p.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((ok) => (ws.onopen = ok))
let id = 0
const pend = new Map()
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id) } }
const send = (method, params = {}) => new Promise((ok) => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })) })
await send('Profiler.enable')
await send('Profiler.start')
await new Promise((ok) => setTimeout(ok, (+process.argv[2] || 10) * 1000))
const { profile } = await send('Profiler.stop')
const self = new Map()
const byId = new Map(profile.nodes.map((n) => [n.id, n]))
const dt = (profile.endTime - profile.startTime) / profile.samples.length / 1000
for (const s of profile.samples) {
  const n = byId.get(s); const f = n.callFrame
  const k = (f.functionName || '(anon)') + ' ' + (f.url.split('/').pop() || '') + ':' + f.lineNumber
  self.set(k, (self.get(k) || 0) + dt)
}
const total = (profile.endTime - profile.startTime) / 1000
const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 15)
console.log('ventana ms', total.toFixed(0))
for (const [k, v] of top) console.log((v / total * 100).toFixed(1) + '%', k)
ws.close()
