// Revisión móvil 5.9 · R14: una clave que contenga «MALA» recibe de la red falsa el error real de Google (400 API_KEY_INVALID).
(() => {
  const Cap = window.Capacitor
  if (!Cap || Cap.__badKey) return 'ya'
  Cap.__badKey = true
  const err = { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } }
  const bad = (u, h) => /MALA/.test(String(u || '')) || /MALA/.test(JSON.stringify(h || {}))
  const onp = Cap.nativePromise.bind(Cap)
  Cap.nativePromise = async (plugin, method, opts) => {
    if (plugin === 'CapacitorHttp' && /generativelanguage/.test(String(opts?.url)) && bad(opts?.url, opts?.headers)) {
      window.__badHits = (window.__badHits || 0) + 1
      return { status: 400, headers: {}, data: err, url: opts.url }
    }
    return onp(plugin, method, opts)
  }
  return 'clave mala lista'
})()
