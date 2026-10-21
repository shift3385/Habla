// 5.10.1 (REG-M-05): migra los tamaños de letra fijos `text-[NNpx]` a `fs-NN` (mismo tamaño × --fs, ver index.css).
// Uso: node scripts/migrate-font-tokens.mjs [--dry] [archivos…]  (sin archivos: todo src/, salvo EXCLUDE).
// Conserva los finales de línea de cada archivo. Los text-xs…5xl no se tocan: ya escalan desde @theme.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
// Archivos que no se migran (ninguno: AudioPicker y SoundTest, de la prueba de sonido de D1, se migraron al entregarla).
const EXCLUDE = new Set()

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const given = args.filter((a) => !a.startsWith('--'))

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|css)$/.test(name)) out.push(p)
  }
  return out
}

export const migrate = (text) => text.replace(/(^|[\s"'`:{(!])text-\[(\d+(?:\.\d+)?)px\]/g, (_, pre, n) => `${pre}fs-${n}`)

const files = given.length ? given.map((f) => join(root, f)) : walk(join(root, 'src'))
let total = 0
for (const f of files) {
  const rel = relative(root, f).replace(/\\/g, '/')
  if (!given.length && EXCLUDE.has(rel)) continue
  const before = readFileSync(f, 'utf8')
  const after = migrate(before)
  if (after === before) continue
  const n = (before.match(/text-\[\d+(?:\.\d+)?px\]/g) ?? []).length
  total += n
  console.log(`${rel}: ${n}`)
  if (!dry) writeFileSync(f, after)
}
console.log(`${dry ? '(prueba) ' : ''}${total} tamaños migrados`)
