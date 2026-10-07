// B7 · Tiempos de las consultas que hace la app al arrancar y en Progreso/Palabras con los datos sembrados (navegador).
const st = await import('/src/lib/stats.ts'), srs = await import('/src/lib/srs.ts'), bk = await import('/src/lib/backup.ts'), pr = await import('/src/lib/profile.ts')
const tm = async (n, f, r = 3) => { const ms = []; let v; for (let i = 0; i < r; i++) { const t = performance.now(); v = await f(); ms.push(Math.round(performance.now() - t)) } return [n, Math.min(...ms), Math.max(...ms)] }
const out = []
out.push(await tm('loadDashboard', st.loadDashboard))
out.push(await tm('getProfile', pr.getProfile))
out.push(await tm('weekMinutes', st.weekMinutes))
out.push(await tm('errorSummary', st.errorSummary))
out.push(await tm('wordsCollected', st.wordsCollected))
out.push(await tm('dueSummary', srs.dueSummary))
out.push(await tm('syncCards', srs.syncCards, 1))
let json = ''
out.push(await tm('buildBackup+stringify', async () => { json = JSON.stringify(await bk.buildBackup(), null, 1) }, 2))
JSON.stringify({ out, jsonKB: Math.round(json.length / 1024), heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null })
