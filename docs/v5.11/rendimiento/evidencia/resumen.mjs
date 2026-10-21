// Tablas en Markdown a partir de medidas.json (medir.mjs). Uso: node resumen.mjs medidas/medidas.json
import { readFileSync } from 'node:fs'

const rows = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const NAME = { todo: 'Todo activado', blur: 'sin desenfoque (cristal)', fondo: 'sin fondo de manchas', sombras: 'sin sombras/brillos', anim: 'sin animaciones CSS', mascota: 'sin mascota animada', ligero: '**Modo ligero (todo)**' }
const f = (x, d = 1) => (x == null ? '—' : Number(x).toFixed(d))
const cpu = (w) => f(Math.max(0, w.renderer) + Math.max(0, w.gpu))
for (const sc of [...new Set(rows.map((r) => r.sc))]) {
  const rs = rows.filter((r) => r.sc === sc)
  console.log(`\n#### ${sc} (${JSON.stringify(rs[0].dom)})\n`)
  console.log('| Configuración | Reposo despierta: CPU % (rend.+GPU) · pintar ms/s · raster ms/s · pinturas/s | Descanso: CPU % · pintar · pinturas/s | 4×: desplazar fps · p95 ms · fotogramas > 50 ms · hilo principal % | 6×: desplazar fps · p95 · > 50 ms · hilo % |' + (sc === 'inicio' ? ' 4×: tocar mascota fps · > 50 ms | 4×: cambiar pestañas fps · > 50 ms · hilo % | 6×: pestañas fps · > 50 ms |' : ''))
  console.log('|---|---|---|---|---|' + (sc === 'inicio' ? '---|---|---|' : ''))
  for (const r of rs) {
    const d = r.despierta, s = r.descanso, a = r.lento[4] ?? {}, b = r.lento[6] ?? {}
    const sx = (x) => (x ? `${f(x.fps, 0)} · ${f(x.p95)} · ${x.largos} · ${f(x.main, 0)}` : '—')
    let line = `| ${NAME[r.cfg]} | ${cpu(d)} · ${f(d.pintar)} · ${f(d.raster)} · ${f(d.paints)} | ${cpu(s)} · ${f(s.pintar)} · ${f(s.paints)} | ${sx(a.scroll)} | ${sx(b.scroll)} |`
    if (sc === 'inicio') line += ` ${a.tap ? `${f(a.tap.fps, 0)} · ${a.tap.largos}` : '—'} | ${a.tabs ? `${f(a.tabs.fps, 0)} · ${a.tabs.largos} · ${f(a.tabs.main, 0)}` : '—'} | ${b.tabs ? `${f(b.tabs.fps, 0)} · ${b.tabs.largos}` : '—'} |`
    console.log(line)
  }
}
