// F0-4 de la 5.11 (PLAN §7): ¿Azure baja la nota del fonema y dice qué sonido salió (NBestPhonemeCount)?
// Se carga por CDP en «Habla debug»: node arnes/cdp.mjs -f arnes/f0-azure.js
// Luego: await f0Run(F0_LIST) → muestra en grande la palabra y cómo decirla, vibra, graba 2,5 s con el micro del
// teléfono, evalúa con Azure (clave de los ajustes del propio teléfono, nunca se imprime) y guarda el resultado
// resumido en window.__f0 (sin audio ni claves). El micro se cierra tras cada palabra (regla 9 de CLAUDE.md).

window.F0_LIST = [
  { ref: 'think', how: 'bien', target: 'θ' }, { ref: 'think', how: 'mal: «sink»', target: 'θ' },
  { ref: 'very', how: 'bien', target: 'v' }, { ref: 'very', how: 'mal: «berry»', target: 'v' },
  { ref: 'ship', how: 'bien (i corta)', target: 'ɪ' }, { ref: 'ship', how: 'mal: «sheep» (i larga)', target: 'ɪ' },
  { ref: 'cat', how: 'bien', target: 'æ' }, { ref: 'cat', how: 'mal: «cut»', target: 'æ' },
  { ref: 'Spain', how: 'bien', target: 's' }, { ref: 'Spain', how: 'mal: «Espain»', target: 's' },
  { ref: 'worked', how: 'bien (workt)', target: 't' }, { ref: 'worked', how: 'mal: «work-ed»', target: 't' },
  { ref: 'this', how: 'bien', target: 'ð' }, { ref: 'this', how: 'mal: «dis»', target: 'ð' },
  { ref: 'job', how: 'bien', target: 'dʒ' }, { ref: 'job', how: 'mal: «yob»', target: 'dʒ' },
  { ref: 'shoes', how: 'bien', target: 'ʃ' }, { ref: 'shoes', how: 'mal: «chooes»', target: 'ʃ' },
  { ref: 'zoo', how: 'bien (z que zumba)', target: 'z' }, { ref: 'zoo', how: 'mal: «soo»', target: 'z' },
]
window.__f0 = window.__f0 || []

function f0Panel(text, sub) {
  let p = document.getElementById('f0p')
  if (!p) {
    p = document.createElement('div')
    p.id = 'f0p'
    p.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b1f2a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font:600 22px system-ui;text-align:center;padding:24px'
    document.body.appendChild(p)
  }
  p.innerHTML = `<div style="font-size:64px;margin-bottom:12px">${text}</div><div>${sub}</div>`
}
function f0Close() { document.getElementById('f0p')?.remove() }

async function f0Rec(ms) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  try {
    const rec = new MediaRecorder(stream)
    const chunks = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    const done = new Promise((r) => (rec.onstop = r))
    rec.start()
    await new Promise((r) => setTimeout(r, ms))
    rec.stop()
    await done
    const buf = await new Blob(chunks).arrayBuffer()
    const ctx = new AudioContext()
    const audio = await ctx.decodeAudioData(buf)
    await ctx.close()
    const off = new OfflineAudioContext(1, Math.ceil(audio.duration * 16000), 16000)
    const src = off.createBufferSource()
    src.buffer = audio
    src.connect(off.destination)
    src.start()
    const pcm = (await off.startRendering()).getChannelData(0)
    const out = new DataView(new ArrayBuffer(44 + pcm.length * 2))
    const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)))
    w(0, 'RIFF'); out.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true); out.setUint32(24, 16000, true)
    out.setUint32(28, 32000, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, pcm.length * 2, true)
    for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true)
    let bin = ''
    const bytes = new Uint8Array(out.buffer)
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return btoa(bin)
  } finally {
    stream.getTracks().forEach((t) => t.stop())
  }
}

async function f0Assess(ref, b64) {
  const s = JSON.parse((await Capacitor.Plugins.Preferences.get({ key: 'habla.settings' })).value || '{}')
  const config = { ReferenceText: ref, GradingSystem: 'HundredMark', Granularity: 'Phoneme', Dimension: 'Comprehensive', EnableMiscue: true, PhonemeAlphabet: 'IPA', NBestPhonemeCount: 5 }
  const url = `https://${encodeURIComponent((s.azureRegion || '').trim())}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`
  const headers = { 'Ocp-Apim-Subscription-Key': (s.azureKey || '').trim(), 'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000', Accept: 'application/json', 'Pronunciation-Assessment': btoa(JSON.stringify(config)) }
  const r = await Capacitor.Plugins.CapacitorHttp.request({ method: 'POST', url, headers, data: b64, dataType: 'file', responseType: 'json', connectTimeout: 15000, readTimeout: 45000 })
  return { status: r.status, data: r.data }
}

// Resumen sin audio ni claves: palabra reconocida, notas por fonema y sus NBest.
function f0Summary(item, r) {
  const b = r.data?.NBest?.[0] || {}
  const words = (b.Words || []).map((w) => ({
    word: w.Word,
    acc: Math.round(w.PronunciationAssessment?.AccuracyScore ?? w.AccuracyScore ?? 0),
    err: w.PronunciationAssessment?.ErrorType ?? w.ErrorType,
    ph: (w.Phonemes || []).map((p) => ({
      p: p.Phoneme,
      acc: Math.round(p.PronunciationAssessment?.AccuracyScore ?? p.AccuracyScore ?? 0),
      nbest: (p.PronunciationAssessment?.NBestPhonemes || p.NBestPhonemes || []).map((n) => `${n.Phoneme}:${Math.round(n.Score)}`),
    })),
  }))
  return { ...item, status: r.status, recog: r.data?.RecognitionStatus, display: r.data?.DisplayText, pron: Math.round(b.PronunciationAssessment?.PronScore ?? b.PronScore ?? 0), words, at: Date.now() }
}

window.f0Run = async (list, from = 0) => {
  for (let i = from; i < list.length; i++) {
    const it = list[i]
    f0Panel(it.ref, `Prepárate para decirlo <b>${it.how}</b> · ${i + 1}/${list.length}`)
    await new Promise((r) => setTimeout(r, 2500))
    f0Panel(it.ref, `🎙 ¡AHORA! Dilo <b>${it.how}</b>`)
    Capacitor.Plugins.Haptics?.vibrate?.({ duration: 120 })
    const b64 = await f0Rec(2500)
    f0Panel('…', 'Evaluando')
    const r = await f0Assess(it.ref, b64)
    window.__f0.push(f0Summary(it, r))
  }
  f0Panel('✓', '¡Listo! Gracias')
  setTimeout(f0Close, 2500)
  return window.__f0.length
}
'f0-azure ok'
