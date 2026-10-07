// B8 · Ayudas del navegador (sobre B6/arnes/b6nav.js). Inyectar tras cada carga: (0,eval)(await (await fetch('/docs/auditoria/resultados/B8/arnes/nav8.js')).text())
(async () => {
  if (!window.__b6) (0, eval)(await (await fetch('/docs/auditoria/resultados/B6/arnes/b6nav.js')).text())
  window.setVal = (el, v) => {
    const p = Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')
    p.set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  // Qué clave ficticia hay guardada (nunca devuelve el valor)
  window.keyIs = () => {
    const s = JSON.parse(localStorage.getItem('CapacitorStorage.habla.settings') || '{}')
    const k = s.geminiKey || ''
    return k === 'AIzaTEST-NO-REAL-A000000000000000000' ? 'A' : k === 'AIzaTEST-NO-REAL-B000000000000000000' ? 'B' : k ? 'otra len ' + k.length : 'vacía'
  }
  window.go = async (...steps) => { const r = []; for (const s of steps) { r.push(clickText(s)); await wait(1000) } return r }
  return 'nav8 ok'
})()
