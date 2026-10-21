// Se inyecta antes de cargar la página: guarda la función que recibe el botón Atrás de Android (App.backButton)
// para poder dispararla por CDP con window.__atras(). Solo pruebas (APK debug).
;(function () {
  const t = setInterval(() => {
    const C = window.Capacitor
    if (!C || !C.nativeCallback || C.__atrasHook) return
    C.__atrasHook = 1
    const orig = C.nativeCallback.bind(C)
    C.nativeCallback = (plugin, method, opts, cb) => {
      if (plugin === 'App' && method === 'addListener' && opts && opts.eventName === 'backButton') (window.__backCbs = window.__backCbs || []).push(cb)
      return orig(plugin, method, opts, cb)
    }
    window.__atras = () => { const l = window.__backCbs || []; l.forEach((cb) => cb({ canGoBack: false })); return l.length }
    clearInterval(t)
  }, 1)
})()
