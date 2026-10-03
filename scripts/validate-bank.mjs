// Valida el banco de ítems (src/bank/**/*.json) contra las reglas del marco del test.
// Uso: node scripts/validate-bank.mjs   (sale con código 1 si hay errores)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../src/bank/', import.meta.url))
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const files = []
const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.json') && files.push(join(d, f))))
walk(ROOT)

const errors = []
const warn = []
const err = (id, msg) => errors.push(`${id}: ${msg}`)
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim()

// Longitudes del marco (lectura en palabras; audición en segundos a ~150 palabras/min). Tolerancia 5 %.
const READ = { A1: [120, 200], A2: [120, 200], B1: [250, 350], B2: [400, 550], C1: [550, 800], C2: [550, 800] }
const LIST = { A1: [45, 90], A2: [45, 90], B1: [90, 150], B2: [150, 210], C1: [210, 300], C2: [210, 300] }
const inRange = (v, [a, b]) => v >= a * 0.95 && v <= b * 1.05
const READ_ORDER = [
  ['gist', 'mc'],
  ['detail', 'short'],
  ['detail', 'mc'],
  ['vocab', 'mc'],
  ['summary', 'short'],
  ['inference', 'mc'],
]

const items = files.flatMap((f) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'))
  } catch (e) {
    errors.push(`${f}: JSON inválido (${e.message})`)
    return []
  }
})

const ids = new Set()
const keyPos = [0, 0, 0, 0]

function checkMC(id, q, context = '') {
  if (!Array.isArray(q.options) || q.options.length !== 4) return err(id, 'opción múltiple sin 4 opciones')
  if (new Set(q.options.map(norm)).size !== 4) err(id, 'opciones repetidas')
  if (![0, 1, 2, 3].includes(q.key)) err(id, 'clave fuera de rango')
  keyPos[q.key]++
  const ans = norm(q.options[q.key] ?? '')
  if (ans.length > 3 && norm(q.prompt).includes(ans)) err(id, `la respuesta aparece literal en la pregunta: "${q.options[q.key]}"`)
  if (q.traps && q.traps.length !== 3) err(id, 'traps debe explicar las 3 opciones incorrectas')
  if (!q.prompt?.trim()) err(id, 'pregunta vacía' + context)
}

function checkShort(id, q, max) {
  if (!Array.isArray(q.accepted) || !q.accepted.length) return err(id, 'respuesta corta sin "accepted"')
  for (const a of q.accepted) if (words(a) > (q.maxWords ?? max)) err(id, `respuesta aceptada demasiado larga: "${a}"`)
  if ((q.maxWords ?? 0) > max) err(id, `maxWords > ${max}`)
}

for (const it of items) {
  const id = it.id ?? '(sin id)'
  if (ids.has(id)) err(id, 'id repetido')
  ids.add(id)
  if (it.skill !== 'speaking' && !LEVELS.includes(it.level)) err(id, 'nivel inválido')
  if (it.level && !id.includes(`_${it.level.toLowerCase()}_`)) err(id, `el id no coincide con el nivel ${it.level}`)
  if (!it.topic) err(id, 'sin tema')
  if (!it.model) err(id, 'sin modelo de referencia (IELTS/Cambridge…)')

  if (it.skill === 'grammar') {
    if (!it.point) err(id, 'sin punto gramatical')
    if (!['grammar', 'vocabulary'].includes(it.area)) err(id, 'area debe ser grammar o vocabulary')
    if (!/_{3,}/.test(it.prompt)) err(id, 'la frase no tiene hueco ___')
    if (it.format === 'mc') checkMC(id, it)
    else if (it.format === 'short') {
      checkShort(id, it, 4)
      if (!it.hint) err(id, 'hueco sin pista')
      if (!['B1', 'B2', 'C1', 'C2'].includes(it.level)) err(id, 'los huecos escritos van de B1 a C2')
    } else err(id, 'formato desconocido')
  } else if (it.skill === 'reading') {
    const w = words(it.text ?? '')
    if (!inRange(w, READ[it.level])) err(id, `texto de ${w} palabras (esperado ${READ[it.level].join('–')} para ${it.level})`)
    if (it.questions?.length !== 6) err(id, 'no tiene 6 preguntas')
    it.questions?.forEach((q, k) => {
      const [type, format] = READ_ORDER[k] ?? []
      if (q.type !== type || q.format !== format) err(id, `pregunta ${k + 1}: se esperaba ${type}/${format}, hay ${q.type}/${q.format}`)
      if (q.format === 'mc') checkMC(`${id}#${k + 1}`, q)
      else checkShort(`${id}#${k + 1}`, q, 3)
    })
  } else if (it.skill === 'listening') {
    const w = (it.script ?? []).reduce((a, x) => a + words(x.t), 0)
    const secs = Math.round((w / 150) * 60)
    if (!inRange(secs, LIST[it.level])) err(id, `guion de ~${secs} s (${w} palabras; esperado ${LIST[it.level].join('–')} s para ${it.level})`)
    const sp = new Set((it.speakers ?? []).map((s) => s.id))
    for (const line of it.script ?? []) if (!sp.has(line.s)) err(id, `hablante desconocido "${line.s}"`)
    if (['C1', 'C2'].includes(it.level) && sp.size < 2) warn.push(`${id}: C1–C2 conviene con al menos dos voces`)
    if (it.questions?.length !== 6) err(id, 'no tiene 6 preguntas')
    it.questions?.forEach((q, k) => (q.format === 'mc' ? checkMC(`${id}#${k + 1}`, q) : checkShort(`${id}#${k + 1}`, q, 3)))
  } else if (it.skill === 'speaking') {
    if (![1, 2, 3].includes(it.task)) err(id, 'tarea inválida')
    if (it.task === 1 && it.prompts?.length !== 2) err(id, 'la tarea 1 lleva 2 preguntas')
    if (it.task !== 1 && it.prompts?.length !== 1) err(id, 'las tareas 2 y 3 llevan 1 consigna')
    if (it.task === 2 && (it.cues?.length ?? 0) < 3) err(id, 'la tarjeta de la tarea 2 necesita 3+ puntos')
    if (!LEVELS.includes(it.from) || !LEVELS.includes(it.to)) err(id, 'from/to inválidos')
  } else err(id, 'skill desconocida')
}

// Resumen por sección y nivel, y temas repetidos dentro de cada nivel.
const count = {}
const topics = {}
for (const it of items) {
  const k = it.skill === 'grammar' ? `grammar-${it.format}` : it.skill === 'speaking' ? `speaking-t${it.task}${it.variant ? 's' : ''}` : it.skill
  const lv = it.level ?? `${it.from}-${it.to}`
  count[k] ??= {}
  count[k][lv] = (count[k][lv] ?? 0) + 1
  if (it.skill === 'reading' || it.skill === 'listening') {
    const tk = `${it.skill}/${it.level}/${it.topic}`
    topics[tk] = (topics[tk] ?? 0) + 1
  }
}
for (const [k, n] of Object.entries(topics)) if (n > 2) warn.push(`${k}: tema usado ${n} veces en el mismo nivel`)

console.log(`Banco: ${items.length} ítems en ${files.length} archivos`)
for (const [k, v] of Object.entries(count)) console.log(`  ${k.padEnd(14)} ${Object.entries(v).map(([l, n]) => `${l}:${n}`).join('  ')}`)
console.log(`  Posición de la clave (A/B/C/D): ${keyPos.join(' / ')}`)
if (warn.length) console.log(`\nAvisos (${warn.length}):\n  ` + warn.join('\n  '))
if (errors.length) {
  console.log(`\nERRORES (${errors.length}):\n  ` + errors.join('\n  '))
  process.exit(1)
}
console.log('\nOK: el banco cumple las reglas.')
