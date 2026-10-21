// Precarga (pruebas, APK debug): guarda los console.* de la app en window.__logs y mide el nivel RMS que leen los
// analizadores de audio (prueba de sonido, barras del micro): máximo por segundo en window.__rms.
;(function () {
  window.__logs = []
  window.__rms = []
  for (const k of ['log', 'info', 'warn', 'error']) {
    const o = console[k].bind(console)
    console[k] = (...a) => { try { window.__logs.push(Date.now() + ' ' + k + ' ' + a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ').slice(0, 240)) } catch {} ; o(...a) }
  }
  const wrap = (name) => {
    const orig = AnalyserNode.prototype[name]
    AnalyserNode.prototype[name] = function (arr) {
      orig.call(this, arr)
      let sum = 0
      for (let i = 0; i < arr.length; i++) { const v = name === 'getFloatTimeDomainData' ? arr[i] : (arr[i] - 128) / 128; sum += v * v }
      const rms = Math.sqrt(sum / arr.length)
      const sec = Math.floor(Date.now() / 1000)
      const last = window.__rms[window.__rms.length - 1]
      if (last && last.s === sec) last.max = Math.max(last.max, rms)
      else window.__rms.push({ s: sec, max: rms })
    }
  }
  wrap('getFloatTimeDomainData'); wrap('getByteTimeDomainData')
})()
