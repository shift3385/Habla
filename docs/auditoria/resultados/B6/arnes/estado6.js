// B6 · Resumen SIN valores de claves del estado de Habla (teléfono). Solo booleanos, longitudes, recuentos y fechas.
const P = Capacitor.Plugins.Preferences
const st = JSON.parse((await P.get({ key: 'habla.settings' })).value || '{}')
const sc = JSON.parse((await P.get({ key: 'habla.savedClass' })).value || 'null')
const k = (v) => ({ has: !!v, len: (v || '').length })
const nl = JSON.parse(localStorage.getItem('habla.netlog') || '[]')
JSON.stringify({
  gem: k(st.geminiKey), az: k(st.azureKey), secret: !!st.azureClientSecret, tenant: !!st.azureTenantId, resId: !!st.azureResourceId,
  azPlan: st.azurePlan, phon: st.phoneticsOn, userOff: st.phoneticsUserOff, f0ex: st.f0ExhaustedMonth, model: st.geminiModel, fast: st.geminiFastModel, fb: st.geminiFallbackModel,
  sc: sc && { sid: sc.sessionId, turns: sc.turns, hist: sc.history.length, scen: sc.scenarioId, savedAt: new Date(sc.savedAt).toISOString() },
  usageCache: localStorage.getItem('habla.azureUsage') ? new Date(JSON.parse(localStorage.getItem('habla.azureUsage')).at).toISOString() : null,
  netlog: { n: nl.length, last: nl.slice(-4).map((e) => ({ at: e.at ? new Date(e.at).toISOString().slice(11, 19) : e.t, what: (e.what || '').slice(0, 30), status: e.status, ms: e.ms })) },
  dbs: await indexedDB.databases(), hidden: document.hidden, upS: Math.round(performance.now() / 1000),
})
