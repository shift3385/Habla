// Revisión móvil 5.9 · Termina el test (tareas de habla con el micro simulado de instr.js) y llega al Inicio.
const out = []
for (let k = 0; k < 40; k++) {
  const t = document.body.innerText
  if (/¿De qué hablamos hoy\?/.test(t)) {
    out.push('INICIO')
    break
  }
  const m = t.match(/Tarea (\d) de 3/)
  if (m && /Toca para empezar a hablar|Toca y contesta/.test(t)) {
    clickAria('Grabar')
    await s(7000)
    clickAria('Parar')
    await s(2500)
    out.push('tarea ' + m[1] + ': ' + (t.match(/Grabado[^\n]*/) ? 'ya' : '') + (document.body.innerText.match(/(Grabado ✓[^\n]*|Necesito[^\n]*)/)?.[0] ?? '?'))
    continue
  }
  const b = [...document.querySelectorAll('button')].find((x) => /^(Siguiente|Ver mi nivel|Continuar|Entendido|Empezar|Ir al inicio|Ver mi plan|Listo|Vamos|Seguir)/.test(x.innerText.trim()) && !x.disabled)
  if (b) {
    out.push('→ ' + b.innerText.trim().slice(0, 30) + ' (' + t.split('\n').slice(0, 2).join(' | ').slice(0, 60) + ')')
    b.click()
    await s(2500)
    continue
  }
  await s(3000)
  if (k % 4 === 3) out.push('espera: ' + t.split('\n').slice(0, 3).join(' | ').slice(0, 90))
}
out.join('\n') + '\nFIN: ' + document.body.innerText.slice(0, 140).replace(/\n/g, ' | ')
