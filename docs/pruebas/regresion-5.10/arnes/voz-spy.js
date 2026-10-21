// «Oyente» del lado de la app: registra cada frase que Habla manda a la voz del teléfono (texto exacto, idioma,
// velocidad y tono) en window.__voz. Así se comprueba qué dice cada voz sin tener que escucharlo.
// Se carga por CDP: node arnes/cdp.mjs -f arnes/voz-spy.js
if (!window.__vozSpy) {
  window.__vozSpy = 1
  window.__voz = []
  const orig = Capacitor.nativePromise.bind(Capacitor)
  Capacitor.nativePromise = (p, m, o) => {
    if (p === 'TextToSpeech' && m === 'speak') {
      window.__voz.push({ t: Date.now(), lang: o?.lang, rate: o?.rate, pitch: o?.pitch, text: String(o?.text ?? '').slice(0, 160) })
    }
    if (p === 'TextToSpeech' && m === 'stop') window.__voz.push({ t: Date.now(), stop: true })
    return orig(p, m, o)
  }
}
'voz-spy ok'
