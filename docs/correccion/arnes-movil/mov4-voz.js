// MOV-4 · ¿el micro Bluetooth da voz cuando alguien HABLA? (2026-10-08). Ruta auriculares → getUserMedia → pico de
// cada medio segundo durante 12 s. Solo niveles: no se guarda audio. Al terminar, ruta del teléfono.
const AR = Capacitor.Plugins.AudioRoute
const out = []
const t0 = performance.now()
const ms = () => Math.round(performance.now() - t0)
await AR.setRoute({ route: typeof __MOV4_ROUTE === 'string' ? __MOV4_ROUTE : 'headset' })
await new Promise((r) => setTimeout(r, 600))
const opts = __MOV4_OPTS
const st = await navigator.mediaDevices.getUserMedia({ audio: opts })
out.push(`${ms()} abierto: "${st.getAudioTracks()[0].label}" · ${JSON.stringify(st.getAudioTracks()[0].getSettings())}`)
const ctx = new AudioContext()
await ctx.resume()
const an = ctx.createAnalyser()
an.fftSize = 2048
ctx.createMediaStreamSource(st).connect(an)
const buf = new Float32Array(2048)
for (let i = 0; i < 16; i++) {
  let peak = 0
  const s = performance.now()
  while (performance.now() - s < 500) {
    await new Promise((r) => setTimeout(r, 25))
    an.getFloatTimeDomainData(buf)
    for (const v of buf) peak = Math.max(peak, Math.abs(v))
  }
  out.push(`${ms()} pico ${peak.toFixed(4)}`)
}
ctx.close()
st.getTracks().forEach((t) => t.stop())
await AR.setRoute({ route: 'phone' })
out.join('\n')
