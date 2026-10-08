// Revisión móvil 5.9 · Bienvenida completa en com.shift.habla.debug con la clave ficticia (red falsa: instr.js + models-fake.js).
const log = []
const setVal = (el, v) => {
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
const B = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.innerText.trim()) && !b.disabled)
const step = async (re, wait = 1200) => {
  const b = B(re)
  log.push((b ? 'ok ' : 'NO ') + re)
  if (b) b.click()
  await s(wait)
  return !!b
}
await step(/Soy nuevo/, 4500)
setVal(document.querySelector('input'), 'Prueba')
await s(200)
await step(/^Siguiente/)
await step(/^Elegir a/)
;[...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Jubilado/a')?.click()
await s(300)
await step(/^Siguiente/)
for (const n of ['Noticias de hoy', 'Comida', 'Deportes']) {
  ;[...document.querySelectorAll('button')].find((x) => x.innerText.trim() === n)?.click()
  await s(250)
}
await step(/Crear mi espacio/, 2500)
// Bienvenida (Onboarding): puede haber pasos nuevos en la 5.9 (privacidad). Avanza con los botones conocidos.
for (let i = 0; i < 12; i++) {
  const t = document.body.innerText
  if (/Test de nivel|Vamos a conocer tu inglés/.test(t)) break
  const pw = document.querySelector('input[type=password]')
  if (pw && !/Clave válida/.test(t)) {
    setVal(pw, 'AIzaTEST-NO-REAL-0000000000000000000')
    await s(200)
    await step(/Comprobar clave/, 2000)
    continue
  }
  if (!(await step(/^(Empezar|Entendido|Continuar|Siguiente|Acepto|De acuerdo|Continuar con|Continuar al test)/, 1300))) {
    log.push('atasco: ' + t.slice(0, 160).replace(/\n/g, ' | '))
    break
  }
}
log.push('FIN: ' + document.body.innerText.slice(0, 120).replace(/\n/g, ' | '))
log.join('\n')
