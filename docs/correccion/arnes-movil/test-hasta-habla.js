// Revisión móvil 5.9 · Recorre el test de nivel (gramática, lectura, audición) con «No lo sé» hasta la parte de Habla.
const log = []
const done = new Set()
const B = (re) => [...document.querySelectorAll('button')].find((b) => re.test((b.innerText || b.getAttribute('aria-label') || '').trim()) && !b.disabled)
for (let i = 0; i < 45; i++) {
  const t = document.body.innerText
  if (/4\/4 · Habla/.test(t) && /Tarea 1 de 3/.test(t)) {
    log.push('HABLA tarea 1')
    break
  }
  const head = t.split('\n').slice(0, 3).join(' | ').slice(0, 80)
  // Preguntas: «No lo sé» (gramática y comprensión). En lectura/audición puede haber varias preguntas a la vez.
  const nose = [...document.querySelectorAll('button')].filter((b) => /No lo sé/.test(b.innerText) && !b.disabled && !b.getAttribute('aria-pressed'))
  const key = head + nose.length
  if (nose.length && !done.has(key)) {
    done.add(key)
    nose.forEach((b) => b.click())
    await s(350)
  }
  const nx = B(/^(Siguiente|Continuar|Empezar|Comenzar|Listo|Entendido|Ver resumen|Seguir|Ir a|Terminar|Enviar respuestas|Confirmar|Sí, |Pasar a|Corregir|Comprobar|Ver el resumen|Siguiente texto|Siguiente audio)/)
  if (nx) {
    log.push(head + ' → ' + nx.innerText.trim().slice(0, 30))
    nx.click()
    await s(900)
    continue
  }
  // Audición: la vista previa cuenta atrás; hay que escuchar al menos una vez.
  const play = B(/Escuchar|Saltar la espera|Empezar a escuchar/)
  if (play) {
    log.push(head + ' → ' + play.innerText.trim().slice(0, 30))
    play.click()
    await s(2500)
    continue
  }
  await s(1500)
  if (i % 10 === 9) log.push('espera: ' + head)
}
log.slice(-40).join('\n') + '\nFIN: ' + document.body.innerText.slice(0, 160).replace(/\n/g, ' | ')
