// Tablas en Markdown a partir de medir-pw.mjs. Uso: node resumen-pw.mjs medidas-linux/medidas.json [medidas-linux/medidas-real.json]
import { readFileSync } from 'node:fs'

const NAME = { todo: 'Todo activado', blur: 'sin cristal desenfocado', fondo: 'sin fondo de manchas', sombras: 'sin brillos ni sombras', anim: 'sin animaciones', mascota: 'sin mascota animada', ligero: '**todo apagado (CSS)**', 'ligero-real': '**Modo ligero (ajuste real)**' }
const f = (x, d = 1) => (x == null ? '—' : Number(x).toFixed(d))
const cpu = (w) => f(Math.max(0, w.renderer) + Math.max(0, w.gpu))
for (const file of process.argv.slice(2)) {
  const rows = JSON.parse(readFileSync(file, 'utf8'))
  console.log(`\n### ${file}`)
  for (const sc of [...new Set(rows.map((r) => r.sc))]) {
    const rs = rows.filter((r) => r.sc === sc)
    console.log(`\n#### ${sc}\n`)
    const tabs = sc === 'inicio'
    console.log('| Configuración | Reposo, mascota despierta: CPU % (render + GPU) · hilo % | Reposo, descanso: CPU % · hilo % | Desplazar 4×: hilo % · GPU % | Desplazar 6×: fps · hilo % |' + (tabs ? ' Cambiar pestañas 6×: fps · fotogramas > 50 ms |' : ''))
    console.log('|---|---|---|---|---|' + (tabs ? '---|' : ''))
    for (const r of rs) {
      const a = r.lento[4], b = r.lento[6]
      let l = `| ${NAME[r.cfg] ?? r.cfg} | ${cpu(r.despierta)} · ${f(r.despierta.main)} | ${cpu(r.descanso)} · ${f(r.descanso.main)} | ${f(a.scroll.main, 0)} · ${f(a.scroll.gpu, 0)} | ${f(b.scroll.fps, 0)} · ${f(b.scroll.main, 0)} |`
      if (tabs) l += ` ${f(b.tabs.fps, 0)} · ${b.tabs.largos} |`
      console.log(l)
    }
  }
}
