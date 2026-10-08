// Revisión móvil 5.9 · R9 camino feliz en clase: 3 turnos (micro y red simulados), «¿Qué digo?».
__b3.cfg.fake = true
__b3.cfg.deafAudio = false
const out = []
const turns0 = document.querySelectorAll('[class*="rounded-[24px_24px_8px_24px]"]').length
for (let k = 1; k <= 3; k++) {
  for (let i = 0; i < 20 && !document.querySelector('button[aria-label="Tocar para hablar"]'); i++) await s(500)
  const n0 = __b3.net.length
  out.push('turno ' + k + ': ' + tapTalk())
  await s(6000)
  out.push('  ' + tapTalk() + ' (enviar)')
  for (let i = 0; i < 30; i++) {
    await s(500)
    if (__b3.net.length > n0 && document.querySelector('button[aria-label="Tocar para hablar"]')) break
  }
  const net = __b3.net.slice(n0).map((n) => (n.audio ? 'audio ' : '') + n.kb + 'KB').join(',')
  const live = __b3.mic.filter((m) => m.track && m.track.readyState === 'live').length
  out.push('  red: ' + net + ' | micro vivo tras enviar: ' + live + ' | ' + (document.body.innerText.match(/(ppm[^\n]*|No te he oído[^\n]*)/) || ['—'])[0])
}
clickText('¿Qué digo?')
await s(3000)
out.push('¿Qué digo?: ' + (document.body.innerText.includes('Mi viaje a Japón') || /Prueba|Di algo|ideas/i.test(document.body.innerText) ? 'abre' : 'sin cambio') + ' | ' + btns().slice(-6).join(' / '))
out.push('texto: ' + document.body.innerText.slice(-300).replace(/\n/g, ' | '))
out.join('\n')
