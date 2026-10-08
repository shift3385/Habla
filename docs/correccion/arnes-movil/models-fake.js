// Revisión móvil 5.9 · Lista falsa de modelos de Gemini (para la bienvenida con clave ficticia). Se inyecta DESPUÉS de instr.js.
(() => {
  const Cap = window.Capacitor
  if (!Cap || Cap.__modelsFake) return 'ya'
  Cap.__modelsFake = true
  const list = { models: [{ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] }] }
  const isModels = (u) => /generativelanguage[^?]*\/models(\?|$)/.test(String(u || ''))
  const onp = Cap.nativePromise.bind(Cap)
  Cap.nativePromise = async (plugin, method, opts) => {
    if (plugin === 'CapacitorHttp' && isModels(opts?.url)) return { status: 200, headers: {}, data: list, url: opts.url }
    return onp(plugin, method, opts)
  }
  const of = window.fetch.bind(window)
  window.fetch = async (u, o) => (isModels(typeof u === 'string' ? u : u?.url) ? new Response(JSON.stringify(list), { status: 200 }) : of(u, o))
  return 'models falsos ok'
})()
