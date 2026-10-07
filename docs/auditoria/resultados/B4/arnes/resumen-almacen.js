// B4 · Resumen SIN valores del almacenamiento de la app (CDP). Devuelve solo nombres, tamaños, recuentos y booleanos.
window.__b4sum = (async () => {
  const P = Capacitor.Plugins.Preferences
  const st = JSON.parse((await P.get({ key: 'habla.settings' })).value || '{}')
  const sc = JSON.parse((await P.get({ key: 'habla.savedClass' })).value || 'null')
  const prof = await new Promise((res) => { const r = indexedDB.open('habla'); r.onsuccess = () => { const tx = r.result.transaction('profile'); const g = tx.objectStore('profile').get('me'); g.onsuccess = () => res(g.result || {}); g.onerror = () => res({}) }; r.onerror = () => res({}) })
  const name = (prof.name || '').trim(), about = (prof.about || '').trim()
  const has = (s) => !!s && ((name && s.includes(name)) || (about.length > 3 && s.includes(about)))
  const k = (v) => ({ has: !!v, len: (v || '').length, p4: (v || '').slice(0, 4) })
  const nl = JSON.parse(localStorage.getItem('habla.netlog') || '[]')
  // OJO: indexedDB.open crea la BD si no existe (rompería testDraft.ts): solo se abre si ya existe.
  const draft = !(await indexedDB.databases()).some((d) => d.name === 'habla-draft') ? { existe: false } : await new Promise((res) => {
    const r = indexedDB.open('habla-draft')
    r.onsuccess = () => {
      const db = r.result, stores = [...db.objectStoreNames]
      if (!stores.length) return res({ stores })
      const tx = db.transaction(stores)
      const out = { stores, entries: {} }
      let pending = stores.length
      for (const s of stores) {
        const all = tx.objectStore(s).getAll(); const keys = tx.objectStore(s).getAllKeys()
        all.onsuccess = () => keys.onsuccess = () => {
          out.entries[s] = all.result.map((v, i) => ({ key: keys.result[i], savedAt: v?.savedAt ? new Date(v.savedAt).toISOString() : undefined, fields: Object.keys(v || {}), speech: Array.isArray(v?.speech) ? v.speech.map((x) => x ? { mime: x.mimeType, b64kb: Math.round((x.base64 || '').length / 1024) } : null) : undefined }))
          if (!--pending) res(out)
        }
        keys.onsuccess = () => { all.onsuccess?.() }
      }
    }
    r.onerror = () => res({ error: 'no abre' })
  })
  return {
    dbs: await indexedDB.databases(),
    localStorage: Object.keys(localStorage).map((x) => x + ':' + localStorage.getItem(x).length),
    settingsFields: Object.keys(st).length,
    keys: { gemini: k(st.geminiKey), azure: k(st.azureKey), secret: { has: !!st.azureClientSecret, len: (st.azureClientSecret || '').length }, tenant: !!st.azureTenantId, resourceIdOk: st.azureResourceId ? /^\/subscriptions\//.test(st.azureResourceId) : null, region: !!st.azureRegion, phoneticsOn: st.phoneticsOn },
    savedClass: sc ? { fields: Object.keys(sc), systemLen: (sc.system || '').length, systemHasProfile: has(sc.system), history: (sc.history || []).length } : null,
    netlog: { n: nl.length, fields: [...new Set(nl.flatMap((e) => Object.keys(e)))], whatHasProfile: nl.some((e) => has(e.what)), errorHasProfile: nl.some((e) => has(e.error)), errorAIza: nl.some((e) => /AIza/.test(e.error || '')), whatPrefixes: [...new Set(nl.map((e) => (e.what || '').slice(0, 22)))] },
    azureUsage: localStorage.getItem('habla.azureUsage') ? Object.keys(JSON.parse(localStorage.getItem('habla.azureUsage'))) : null,
    draft,
  }
})()
JSON.stringify(await window.__b4sum, null, 1)
