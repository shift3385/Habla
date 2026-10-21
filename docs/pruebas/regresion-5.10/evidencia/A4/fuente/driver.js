// A4 · REG-M-05: recorrido de pantallas para medir los dos mecanismos de tamaño de letra (usa arnes-a4.js y fuente.js).
;(() => {
  const W = (ms) => new Promise((r) => setTimeout(r, ms))
  const btn = (re) => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && !b.disabled).find((b) => re.test((b.getAttribute('aria-label') || '') + ' ' + b.innerText.trim()))
  const tap = (sel) => document.querySelector(sel)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'touch', isPrimary: true }))
  const home = async () => {
    for (let i = 0; i < 5; i++) {
      const b = document.querySelector('[aria-label="Atrás"], [aria-label="Salir del repaso"]')
      if (!b || /te espera/.test(document.body.innerText)) break
      b.click(); await W(600)
    }
    if (/Ya te vas/.test(document.body.innerText)) { btn(/Quedarme/)?.click(); await W(500) }
    document.querySelector('[aria-label="Hablar"]')?.click(); await W(700)
  }
  const gates = async () => {
    for (let i = 0; i < 6; i++) {
      const b = btn(/^ ?(Continuar donde lo dejé|Entrar|Ir al inicio|Más tarde)/)
      if (!b) { if (/te espera/.test(document.body.innerText)) break; await W(800); continue }
      b.click(); await W(1500)
    }
  }
  const S = {
    gate: async () => /pospuesto|re-test/.test(document.body.innerText),
    temas: async () => { await home(); btn(/^ ?Temas/)?.click(); await W(700); return true },
    gramatica: async () => { await home(); btn(/^ ?Gramática/)?.click(); await W(700); if (btn(/¡Vamos!/)) { btn(/¡Vamos!/).click(); await W(600) } return true },
    tema: async () => { await S.gramatica(); btn(/Tiempos verbales/)?.click(); await W(800); btn(/Abrir Past Simple/)?.click(); await W(900); return /Past Simple/.test(document.body.innerText) },
    ejercicio: async () => { btn(/^ ?Ejercicios/)?.click(); await W(800); const l = await __a4.step('order'); return l.at(-1) === 'order' },
    ejercicioResp: async () => { for (const b of [...document.querySelectorAll('button.field')].filter((b) => b.offsetParent && b.className.includes('h-9'))) { b.click(); await W(60) } await W(200); btn(/^ ?Comprobar/)?.click(); await W(900); return true },
    ajustes: async () => { await home(); document.querySelector('[aria-label="Ajustes"]')?.click(); await W(900); return true },
    claseIdeas: async () => {
      await home(); btn(/^ ?Temas/)?.click(); await W(500); btn(/^ ?Comida/)?.click(); await W(900)
      if (/clase en progreso/.test(document.body.innerText)) { btn(/Empezar nueva/)?.click(); await W(900) }
      await W(4000); btn(/¿Qué digo\?/)?.click(); await W(1500); return /cook pasta/.test(document.body.innerText)
    },
    claseCorr: async () => { __a4.gumDelay = 0; tap('[aria-label="Tocar para hablar"]'); await W(2200); tap('[aria-label="Enviar"]'); await W(6000); return /Ver en Gramática/.test(document.body.innerText) },
    informe: async () => { btn(/^ ?Terminar$/)?.click(); await W(1200); if (btn(/Terminar y evaluar/)) { btn(/Terminar y evaluar/).click() } await W(5000); return /Tu informe/.test(document.body.innerText) },
    repaso: async () => {
      if (btn(/Volver al inicio/)) { btn(/Volver al inicio/).click(); await W(1200) }
      await home(); btn(/Repaso de hoy/)?.click(); await W(1800); if (btn(/^ ?Entendido/)) { btn(/^ ?Entendido/).click(); await W(600) }
      tap('[aria-label="Tocar para hablar"]'); await W(2200); tap('[aria-label="Enviar"]'); await W(5000)
      if (btn(/^ ?Entendido/)) { btn(/^ ?Entendido/).click(); await W(800) }
      return /Cuándo quieres volver/.test(document.body.innerText)
    },
  }
  window.__drv = { W, btn, home, gates, S }
  // Ejecuta pantallas en orden y barre las escalas en cada una.
  window.__run = async (names) => {
    const res = {}
    for (const n of names) {
      let ok
      try { ok = await S[n]() } catch (e) { ok = 'ERROR ' + e.message }
      res[n] = ok === true ? await __fz.sweep() : 'NO SE LLEGÓ (' + ok + ') · ' + document.body.innerText.slice(0, 60).replace(/\n/g, ' / ')
    }
    return res
  }
  return 'driver instalado'
})()
