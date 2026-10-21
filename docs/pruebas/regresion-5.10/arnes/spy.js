// Registra las llamadas al plugin AudioRoute (foco y ruta) con su tiempo en window.__logs
if (!window.__spy) {
  window.__spy = 1
  const orig = Capacitor.nativePromise.bind(Capacitor)
  Capacitor.nativePromise = (p, m, o) => {
    if (p === 'AudioRoute') window.__logs.push(Date.now() + ' plugin ' + m + ' ' + JSON.stringify(o || {}).slice(0, 80))
    return orig(p, m, o)
  }
}
'spy ok'
