// B5 · Recorre el árbol de fibras de React desde #root y cuenta en qué componentes está la clave de Gemini
// (props.settings.geminiKey o props.apiKey). Devuelve SOLO recuentos y longitudes: nunca el valor (regla 2).
(() => {
  const root = document.getElementById('root')
  const ck = Object.keys(root).find((k) => k.startsWith('__reactContainer'))
  const seen = new Set()
  const names = {}
  let n = 0
  let keyLen = 0
  const stack = [root[ck]]
  while (stack.length) {
    const x = stack.pop()
    if (!x || seen.has(x)) continue
    seen.add(x)
    n++
    const p = x.memoizedProps
    if (p && typeof p === 'object') {
      let hit = false
      if (p.settings && typeof p.settings.geminiKey === 'string' && p.settings.geminiKey.length) { hit = true; keyLen = p.settings.geminiKey.length }
      if (typeof p.apiKey === 'string' && p.apiKey.length) hit = true
      if (hit) {
        const t = x.type
        const nm = typeof t === 'function' ? t.displayName || t.name || 'anónimo' : t && typeof t === 'object' ? 'memo/forwardRef' : String(t)
        names[nm] = (names[nm] || 0) + 1
      }
    }
    stack.push(x.child, x.sibling)
  }
  return { fibras: n, componentesConClave: Object.values(names).reduce((a, b) => a + b, 0), porNombre: names, longitudClave: keyLen, plugins: Object.keys(window.Capacitor?.Plugins || {}), plataforma: window.Capacitor?.getPlatform?.() }
})()
