// A4 · REG-M-05 «Tamaño de letra»: simulación de los dos mecanismos candidatos y medidas. Se inyecta DESPUÉS de arnes-a4.js.
//   (0, eval)(await (await fetch('/docs/pruebas/regresion-5.10/evidencia/A4/fuente/fuente.js')).text())
// - Azure simulado (fonética): issueToken y stt.speech.microsoft.com responden datos inventados; nunca sale nada.
// - __fz.text(k): (a) escala SOLO el texto: cada elemento con texto propio pasa a font-size = original × k (equivale a
//   convertir los px a rem y subir el font-size de <html>, o al textZoom del WebView). Los altos/anchos fijos NO cambian.
// - __fz.zoom(k): (b) multiplica el `zoom` de <html> que ya pone viewport.ts (escala toda la interfaz).
// - __fz.reset(), __fz.measure(), __fz.sweep(): las 2 × 4 combinaciones (0,9 · 1 · 1,15 · 1,3) sobre la pantalla actual.
;(() => {
  if (window.__fz) return 'fuente ya instalado'
  const fz = (window.__fz = { k: 1, mode: null })
  // ---------- Azure falso ----------
  const prev = window.fetch
  window.fetch = async (u, o) => {
    const url = typeof u === 'string' ? u : u.url
    if (/issueToken/.test(url)) return new Response('tok-falso', { status: 200 })
    if (/stt\.speech\.microsoft\.com/.test(url)) {
      const w = (word, acc, ph) => ({ Word: word, PronunciationAssessment: { AccuracyScore: acc, ErrorType: acc < 60 ? 'Mispronunciation' : 'None' }, Phonemes: ph.map(([p, a]) => ({ Phoneme: p, PronunciationAssessment: { AccuracyScore: a } })) })
      const body = { RecognitionStatus: 'Success', DisplayText: 'Yesterday I go to the beach.', NBest: [{ Display: 'Yesterday I go to the beach.', PronunciationAssessment: { AccuracyScore: 72, FluencyScore: 80, CompletenessScore: 100, PronScore: 74, ProsodyScore: 70 },
        Words: [w('Yesterday', 88, [['j', 90], ['ɛ', 85], ['s', 92], ['t', 80], ['ə', 88], ['d', 90], ['eɪ', 86]]), w('I', 95, [['aɪ', 95]]), w('go', 90, [['ɡ', 92], ['oʊ', 88]]), w('to', 70, [['t', 75], ['u', 65]]), w('the', 45, [['ð', 30], ['ə', 60]]), w('beach', 52, [['b', 80], ['iː', 40], ['tʃ', 50]])] }] }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return prev(u, o)
  }
  // ---------- mecanismo (a): solo texto ----------
  const touched = new Set()
  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
  const scaleEl = (el) => {
    if (el.dataset.fzOrig !== undefined || !(el instanceof HTMLElement)) return
    if (!hasOwnText(el) && !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
    el.dataset.fzOrig = el.style.fontSize || ''
    const px = parseFloat(getComputedStyle(el).fontSize)
    el.style.fontSize = px * fz.k + 'px'
    touched.add(el)
  }
  let mo = null
  fz.text = (k) => {
    fz.reset()
    fz.k = k
    fz.mode = 'texto'
    if (k === 1) return
    // Primero se leen todos los tamaños (sin escalar) y luego se aplican, para no multiplicar en cascada.
    const els = [...document.querySelectorAll('body *')].filter((e) => e instanceof HTMLElement && (hasOwnText(e) || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)))
    const sizes = els.map((e) => parseFloat(getComputedStyle(e).fontSize))
    els.forEach((e, i) => {
      e.dataset.fzOrig = e.style.fontSize || ''
      e.style.fontSize = sizes[i] * k + 'px'
      touched.add(e)
    })
    mo = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType === 1) { scaleEl(n); n.querySelectorAll?.('*').forEach(scaleEl) } else if (n.nodeType === 3 && n.parentElement) scaleEl(n.parentElement)
    })))
    mo.observe(document.body, { childList: true, subtree: true })
  }
  // ---------- mecanismo (b): zoom de toda la interfaz ----------
  fz.baseZoom = () => {
    const w = innerWidth, h = innerHeight
    return w > h ? 1 : Math.max(0.8, Math.min(1, w / 390, h / 800))
  }
  fz.zoom = (k) => {
    fz.reset()
    fz.k = k
    fz.mode = 'zoom'
    document.documentElement.style.zoom = String(Math.round(fz.baseZoom() * k * 1000) / 1000)
  }
  fz.reset = () => {
    mo?.disconnect()
    mo = null
    touched.forEach((e) => { e.style.fontSize = e.dataset.fzOrig; delete e.dataset.fzOrig })
    touched.clear()
    const z = fz.baseZoom()
    document.documentElement.style.zoom = z === 1 ? '' : String(Math.round(z * 1000) / 1000)
    fz.k = 1
    fz.mode = null
  }
  // ---------- medidas ----------
  const vis = (e) => e.offsetParent !== null || e.getClientRects().length
  const name = (e) => ((e.getAttribute?.('aria-label') || e.innerText || e.tagName) + '').trim().replace(/\s+/g, ' ').slice(0, 26)
  fz.measure = () => {
    const de = document.documentElement
    const W = innerWidth
    const tc = [...document.querySelectorAll('.tab-content')].filter(vis).pop()
    // Desbordes horizontales: algo sale por la derecha de la pantalla fuera de un contenedor con scroll propio.
    const wide = [...document.querySelectorAll('body *')].filter((e) => {
      if (!vis(e)) return false
      const r = e.getBoundingClientRect()
      if (r.width === 0 || r.right <= W + 1) return false
      for (let p = e.parentElement; p; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return false
      return true
    })
    // Texto cortado: el contenido no cabe en su caja y la caja no desplaza (overflow hidden/clip o truncate/line-clamp).
    const cut = [...document.querySelectorAll('body *')].filter((e) => {
      if (!vis(e) || !(e instanceof HTMLElement) || !e.innerText?.trim()) return false
      const cs = getComputedStyle(e)
      if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY)) return false
      const hidden = /(hidden|clip)/.test(cs.overflowX + cs.overflowY) || cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none'
      return hidden && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)
    })
    // Botones: el texto se sale del botón (alto/ancho fijo) o el botón se sale de la pantalla.
    const btn = [...document.querySelectorAll('button, [role=button], a')].filter(vis).filter((b) => {
      const r = b.getBoundingClientRect()
      return b.scrollWidth > b.clientWidth + 2 || b.scrollHeight > b.clientHeight + 2 || r.right > W + 1 || r.left < -1
    })
    fz.last = { wide, cut, btn }
    return {
      page: de.scrollHeight > de.clientHeight + 1 ? `SCROLL ${de.scrollHeight}/${de.clientHeight}` : 'ok',
      tab: tc ? (tc.scrollHeight > tc.clientHeight + 1 ? `desplaza ${tc.scrollHeight - tc.clientHeight}px` : 'ok') : '-',
      hscroll: de.scrollWidth > de.clientWidth + 1 ? `SÍ ${de.scrollWidth}/${de.clientWidth}` : 'no',
      wide: wide.length, cut: cut.length, btn: btn.length,
      ej: [...wide.slice(0, 2).map((e) => 'ancho:' + name(e)), ...cut.slice(0, 3).map((e) => 'corte:' + name(e)), ...btn.slice(0, 3).map((e) => 'botón:' + name(e))],
    }
  }
  // Solo se cuentan los problemas NUEVOS respecto a la escala 1 (los de la escala 1 son ruido del fondo o ya existían).
  fz.sweep = async (ks = [0.9, 1.15, 1.3]) => {
    fz.reset()
    await new Promise((r) => setTimeout(r, 300))
    const b = fz.measure()
    const base = new Set([...fz.last.wide, ...fz.last.cut, ...fz.last.btn])
    const out = { 'escala 1': `pág:${b.page} tab:${b.tab} h:${b.hscroll}` }
    for (const m of ['texto', 'zoom']) for (const k of ks) {
      if (m === 'texto') fz.text(k)
      else fz.zoom(k)
      await new Promise((r) => setTimeout(r, 350))
      const r = fz.measure()
      const nw = fz.last.wide.filter((e) => !base.has(e)), nc = fz.last.cut.filter((e) => !base.has(e)), nb = fz.last.btn.filter((e) => !base.has(e))
      const ej = [...nw.slice(0, 2).map((e) => 'ancho:' + name(e)), ...nc.slice(0, 3).map((e) => 'corte:' + name(e)), ...nb.slice(0, 4).map((e) => 'botón:' + name(e))]
      out[m + ' ' + k] = `pág:${r.page} tab:${r.tab} h:${r.hscroll} +ancho:${nw.length} +corte:${nc.length} +botón:${nb.length}` + (ej.length ? ' · ' + ej.join(' | ') : '')
    }
    fz.reset()
    return out
  }
  return 'fuente instalado'
})()
