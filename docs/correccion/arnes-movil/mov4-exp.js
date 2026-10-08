// MOV-4 · experimento (2026-10-08): ¿cuánto tarda la ruta SCO en hacerse efectiva y qué hace el WebView con ella?
// Mide: (A) setRoute → cuándo getCommunicationDevice pasa a ser el Bluetooth; (B) getUserMedia por defecto → primera
// muestra distinta de cero y etiqueta; (C) tras cerrar la pista, ¿se mantiene la ruta?; (D) getUserMedia pidiendo el
// deviceId del micro Bluetooth. Solo lectura de niveles: no se guarda audio.
const AR = Capacitor.Plugins.AudioRoute
const t0 = performance.now()
const ms = () => Math.round(performance.now() - t0)
const log = []
const cur = async () => {
  const s = await AR.getDevices()
  return `${s.current ? s.current.name + '/' + s.current.type : 'ninguno'} modo=${s.mode}`
}
async function watch(label, dur) {
  let last = ''
  const end = performance.now() + dur
  while (performance.now() < end) {
    const c = await cur()
    if (c !== last) log.push(`${ms()} ${label}: ${c}`), (last = c)
    await new Promise((r) => setTimeout(r, 100))
  }
}
async function firstSignal(stream, max) {
  const ctx = new AudioContext()
  await ctx.resume()
  const an = ctx.createAnalyser()
  an.fftSize = 2048
  ctx.createMediaStreamSource(stream).connect(an)
  const buf = new Float32Array(2048)
  const s = performance.now()
  let first = -1
  let peak = 0
  while (performance.now() - s < max) {
    await new Promise((r) => setTimeout(r, 30))
    an.getFloatTimeDomainData(buf)
    const p = Math.max(...buf.map(Math.abs))
    peak = Math.max(peak, p)
    if (first < 0 && p > 0) first = Math.round(performance.now() - s)
  }
  ctx.close()
  return `primera señal ${first} ms · pico ${peak.toFixed(4)}`
}
async function open(label, audio) {
  const a = performance.now()
  const st = await navigator.mediaDevices.getUserMedia({ audio })
  const tr = st.getAudioTracks()[0]
  log.push(`${ms()} ${label}: abierto en ${Math.round(performance.now() - a)} ms · "${tr.label}" · ruta ${await cur()}`)
  log.push(`${ms()} ${label}: ${await firstSignal(st, 5000)} · ruta ${await cur()}`)
  st.getTracks().forEach((t) => t.stop())
  log.push(`${ms()} ${label}: cerrado`)
  await watch(label + ' tras cerrar', 2500)
}

log.push(`${ms()} inicio: ${await cur()}`)
await AR.setRoute({ route: 'phone' })
await watch('reposo', 800)
// (A)
const r = await AR.setRoute({ route: 'headset' })
log.push(`${ms()} setRoute headset → ok=${r.ok}`)
await watch('A ruta', 5000)
// (B)
await open('B gUM defecto', { echoCancellation: true, noiseSuppression: true, autoGainControl: true })
const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput')
log.push(`${ms()} entradas: ${devs.map((d) => `${d.label}=${d.deviceId.slice(0, 6)}`).join(' | ')}`)
// (D)
const bt = devs.find((d) => /bluetooth/i.test(d.label))
if (bt) {
  await AR.setRoute({ route: 'phone' })
  await watch('D reposo', 800)
  await open('D gUM deviceId BT (sin plugin)', { deviceId: { exact: bt.deviceId }, echoCancellation: true })
  const r2 = await AR.setRoute({ route: 'headset' })
  log.push(`${ms()} setRoute headset → ok=${r2.ok}`)
  await watch('E ruta', 4000)
  await open('E gUM deviceId BT (con plugin)', { deviceId: { exact: bt.deviceId }, echoCancellation: true })
}
await AR.setRoute({ route: 'phone' })
log.push(`${ms()} fin: ${await cur()}`)
log.join('\n')
