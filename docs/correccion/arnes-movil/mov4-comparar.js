// MOV-4 · comparación (2026-10-08), ~32 s mientras el dueño cuenta en voz alta con los auriculares puestos:
// (1) nativo AudioRecord desde el micro BT, (2) nativo desde el micro del teléfono, (3) WebView getUserMedia BT,
// (4) WebView getUserMedia con el deviceId del micro del teléfono. Picos por medio segundo (0–1). Sin guardar audio.
const AR = Capacitor.Plugins.AudioRoute
const out = []
const fmt = (a) => a.map((v) => v.toFixed(3)).join(' ')
async function web(label, audio) {
  const st = await navigator.mediaDevices.getUserMedia({ audio })
  const ctx = new AudioContext()
  await ctx.resume()
  const an = ctx.createAnalyser()
  an.fftSize = 2048
  ctx.createMediaStreamSource(st).connect(an)
  const buf = new Float32Array(2048)
  const peaks = []
  for (let i = 0; i < 12; i++) {
    let p = 0
    const s = performance.now()
    while (performance.now() - s < 500) {
      await new Promise((r) => setTimeout(r, 25))
      an.getFloatTimeDomainData(buf)
      for (const v of buf) p = Math.max(p, Math.abs(v))
    }
    peaks.push(p)
  }
  ctx.close()
  out.push(`${label} ("${st.getAudioTracks()[0].label}"): ${fmt(peaks)}`)
  st.getTracks().forEach((t) => t.stop())
}
await AR.setRoute({ route: 'headset' })
await new Promise((r) => setTimeout(r, 600))
let r = await AR.probeMic({ device: 'bt', ms: 6000 })
out.push(`1 nativo BT (pedido ${r.asked} · usado ${r.routed}): ${fmt(r.peaks)}`)
await web('3 WebView BT', { echoCancellation: true, noiseSuppression: true, autoGainControl: true })
await AR.setRoute({ route: 'phone' })
await new Promise((r) => setTimeout(r, 600))
r = await AR.probeMic({ device: 'phone', ms: 6000 })
out.push(`2 nativo teléfono (pedido ${r.asked} · usado ${r.routed}): ${fmt(r.peaks)}`)
const tel = (await navigator.mediaDevices.enumerateDevices()).find((d) => d.kind === 'audioinput' && /speakerphone/i.test(d.label))
await web('4 WebView teléfono', { deviceId: { exact: tel.deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true })
out.join('\n')
