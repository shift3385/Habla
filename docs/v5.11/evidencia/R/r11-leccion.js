// R · regresión 5.11: recorre una lección de Sonidos de principio a fin con toques (sin micro: «Dilo tú» se salta).
// Uso (con r11-nav.js cargado): await __L.run('Ship o sheep') → { pasos, cierre, fases, errores }
window.__L = {
  vis: (sel) => [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length),
  async step() {
    const btns = this.vis('button').filter((b) => !b.disabled && !/^Atrás$|^Ficha de|^Escuchar|^Hablar$|^Palabras$|^Progreso$|^Ajustes$/.test(b.getAttribute('aria-label') || '') && !/^Escuchar otra vez$|^Hablar$/.test(b.textContent.trim()))
    const t = (b) => b.textContent.trim()
    const say = btns.find((b) => /^Saltar esta$/.test(t(b)))
    if (say) { say.click(); return 'saltar' }
    const main = btns.find((b) => b.className.includes('btn-acc') && /Siguiente|Terminar|Comprobar|Empezar|Seguir|Vamos|Continuar|Listo/.test(t(b)))
    if (main) { main.click(); return 'principal:' + t(main) }
    const input = this.vis('input').find((i) => !i.disabled)
    if (input && !input.value) {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      set.call(input, 'abc')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      return 'escribir'
    }
    // Clasifica: en cada fila sin colocar (ningún botón con aria-pressed=true), su primera columna.
    const rows = [...new Set(this.vis('button[aria-pressed]').filter((b) => !b.disabled && !/Me sale|Aún no|Escuchar/.test(t(b))).map((b) => b.parentElement?.closest('.glass')))].filter(Boolean)
    const free = rows.find((r) => r.querySelector('button[aria-pressed]') && !r.querySelector('button[aria-pressed="true"]'))
    if (free) { free.querySelector('button[aria-pressed]').click(); return 'columna' }
    // Opciones (escucha, intrusa, clasificar por columna): la primera opción pulsable que no sea de la cabecera.
    const opt = btns.find((b) => !b.className.includes('btn-acc') && t(b) && !/Saltar|Ver la frase|^Atrás|^Ficha|Explícame|^Escucha$|^Clasifica$|^Dilo tú$|^Cierre$|^Deletrea$/.test(t(b)))
    if (opt) { opt.click(); return 'opción:' + t(opt).slice(0, 20) }
    const any = btns.find((b) => b.className.includes('btn-acc'))
    if (any) { any.click(); return 'acc:' + t(any).slice(0, 20) }
    return null
  },
  // Las 12 en segundo plano (el resultado va a window.__LR; se consulta después).
  async runAll(titles) {
    window.__LR = []
    for (const t of titles) {
      const r = await this.run(t)
      window.__LR.push({ t, ...r })
      const back = this.vis("button").find((b) => /^Volver$/.test(b.textContent.trim())) || this.vis("button").find((b) => b.getAttribute("aria-label") === "Atrás")
      back?.click()
      await new Promise((r) => setTimeout(r, 900))
    }
    window.__LR.push('FIN')
  },
  async run(title, max = 260) {
    const open = this.vis('button').find((b) => b.textContent.includes(title))
    if (!open) return { error: 'no encuentro la lección ' + title }
    open.click()
    await new Promise((r) => setTimeout(r, 900))
    const log = []
    let last = ''
    for (let i = 0; i < max; i++) {
      if (document.body.innerText.includes('Algo no ha ido bien')) return { error: 'pantalla de error', log: log.slice(-8) }
      const done = this.vis('button').find((b) => /^(Ver la ficha|Otra vez)$/.test(b.textContent.trim()))
      if (done) return { pasos: i, cierre: document.body.innerText.replace(/\s+/g, ' ').slice(0, 260), log: log.slice(-4) }
      const s = await this.step()
      log.push(s)
      if (!s) { await new Promise((r) => setTimeout(r, 500)); if (last === 'nada') return { atasco: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300), log: log.slice(-10) }; last = 'nada'; continue }
      last = s
      await new Promise((r) => setTimeout(r, 260))
    }
    return { max: true, ahora: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300), log: log.slice(-10) }
  },
}
'r11-leccion listo'
