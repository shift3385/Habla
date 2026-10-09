// Valida el contenido de Gramática (src/grammar/*.json) según docs/v5.10/FORMATO-contenido.md (v5.10).
// Uso: node scripts/validate-grammar.mjs [archivo-o-carpeta…]   (sin argumentos: src/grammar/)
// Sale con código 1 si hay errores. Los avisos (⚠) no bloquean: p. ej. `related` hacia una sección que aún no existe.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
export const CATEGORIES = ['article', 'uncountable', 'auxiliary', 'false_friend', 'tense', 'preposition', 'word_order', 'vocabulary', 'grammar', 'other']
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const GAP = /_{3,}/g

/**
 * Id numérico estable de un ejercicio para la tarjeta del Repaso (`cards.sourceId`, índice único `[source+sourceId]`).
 * FNV-1a de 32 bits del id de texto: no depende del orden de los archivos ni de los temas, así que añadir contenido
 * nunca cambia el número de una tarjeta ya creada. La MISMA función está en src/lib/grammar.ts (`exerciseCardId`);
 * `tests/grammar.test.mjs` comprueba que coinciden y este validador, que no hay colisiones en el catálogo.
 */
export function exerciseCardId(id) {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h || 1 // 0 no vale como id
}

/**
 * Texto comparable: sin pistas entre paréntesis («(learn)»), minúsculas, apóstrofos rectos, sin signos ni espacios
 * dobles. Cada hueco (____) queda como la marca «_».
 */
export const normPrompt = (s) =>
  String(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[’‘`´]/g, "'")
    .replace(/_{2,}/g, ' _ ')
    .replace(/[^a-z0-9'_ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const MIN_WORDS = 3 // por debajo («I am», «Thank you»), coincidir es inevitable y no indica reutilización
const MIN_CHARS = 12

/** Patrón de un texto normalizado: cada hueco vale 1–4 palabras; con límites de palabra (para buscarlo dentro de otro). */
function patternOf(n) {
  const src = n
    .split(' ')
    // Tras normPrompt solo quedan [a-z0-9'_]: nada que escapar en la expresión regular.
    .map((w) => (w === '_' ? "[a-z0-9'_]+(?: [a-z0-9'_]+){0,3}" : w))
    .join(' ')
  return { whole: new RegExp(`^${src}$`), inside: new RegExp(`(?:^| )${src}(?: |$)`) }
}

/**
 * Comparador con el banco del test (FORMATO: prohibido reutilizar sus frases). Indexa los enunciados por palabra para
 * no probar todas las parejas. `match(texto)` devuelve { kind: 'same' | 'inside', bank } o null:
 * - 'same': la misma frase (los huecos de cualquiera de las dos aceptan 1–4 palabras: «Have you ever ____ sushi?» =
 *   «Have you ever tried sushi?»). Es un error.
 * - 'inside': una contiene a la otra («What do you do?» dentro de «So, what do you do?»). Es un aviso: a veces es una
 *   expresión corriente, pero hay que mirarlo.
 */
export function bankMatcher(prompts) {
  const items = []
  const byWord = new Map()
  for (const raw of prompts) {
    const n = normPrompt(raw)
    const words = n.split(' ').filter((w) => w && w !== '_')
    if (words.length < MIN_WORDS || n.length < MIN_CHARS) continue
    const it = { raw, n, words, re: patternOf(n) }
    items.push(it)
    for (const w of new Set(words)) {
      if (!byWord.has(w)) byWord.set(w, [])
      byWord.get(w).push(it)
    }
  }
  const longest = (ws) => ws.reduce((a, b) => (b.length > a.length ? b : a), '')
  return (text) => {
    const n = normPrompt(text)
    const words = n.split(' ').filter((w) => w && w !== '_')
    if (!words.length) return null
    const mine = words.length >= MIN_WORDS && n.length >= MIN_CHARS ? patternOf(n) : null
    // Candidatos: comparten la palabra más larga de esta frase, o esta frase contiene la palabra más larga de ellos.
    const cands = new Set(byWord.get(longest(words)) ?? [])
    for (const w of new Set(words)) for (const it of byWord.get(w) ?? []) if (longest(it.words) === w) cands.add(it)
    let inside = null
    for (const it of cands) {
      if (it.re.whole.test(n) || (mine && mine.whole.test(it.n))) return { kind: 'same', bank: it.raw }
      if (!inside && (it.re.inside.test(n) || (mine && mine.inside.test(it.n)))) inside = { kind: 'inside', bank: it.raw }
    }
    return inside
  }
}

/** Todos los `prompt` (a cualquier profundidad) del banco del test de nivel. */
function bankPrompts() {
  const out = []
  const dir = join(ROOT, 'src/bank')
  if (!existsSync(dir)) return out
  const visit = (v) => {
    if (Array.isArray(v)) v.forEach(visit)
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'prompt' && typeof x === 'string') out.push(x)
        else visit(x)
      }
    }
  }
  const walk = (d) =>
    readdirSync(d).forEach((f) => {
      const p = join(d, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (f.endsWith('.json')) visit(JSON.parse(readFileSync(p, 'utf8')))
    })
  walk(dir)
  return out
}

/** Valida una lista de secciones ya leídas ({ file, data }). Devuelve { errors, warnings, stats }. */
export function validateSections(entries, { bank = [], icons = null } = {}) {
  const inBank = bankMatcher(Array.from(bank))
  const texts = [] // [dónde, qué, frase]: se comparan con el banco al final
  const errors = []
  const warnings = []
  const err = (where, msg) => errors.push(`${where}: ${msg}`)
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`)
  const isStr = (v) => typeof v === 'string' && v.trim().length > 0
  const topicIds = new Map() // id → archivo
  const exIds = new Set()
  const cardIds = new Map() // número → id de ejercicio
  const sectionIds = new Set()
  const orders = new Map()
  const related = [] // [dónde, id]
  let topics = 0
  let exercises = 0

  const checkExample = (where, e, { note = false } = {}) => {
    if (!e || typeof e !== 'object') return err(where, 'ejemplo sin {en, es}')
    if (!isStr(e.en)) err(where, 'ejemplo sin "en"')
    if (!isStr(e.es)) err(where, 'ejemplo sin "es"')
    if (note && e.noteEs !== undefined && typeof e.noteEs !== 'string') err(where, '"noteEs" debe ser texto')
    if (isStr(e.en)) texts.push([where, 'el ejemplo', e.en])
  }

  for (const { file, data: s } of entries) {
    const sw = basename(file)
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      err(sw, 'la sección debe ser un objeto')
      continue
    }
    if (!isStr(s.id) || !KEBAB.test(s.id)) err(sw, 'id de sección vacío o no kebab-case')
    else {
      if (sectionIds.has(s.id)) err(sw, `id de sección repetido: ${s.id}`)
      sectionIds.add(s.id)
      if (basename(file, '.json') !== s.id) err(sw, `el archivo debe llamarse ${s.id}.json`)
    }
    if (!Number.isInteger(s.order) || s.order < 1) err(sw, '"order" debe ser un entero ≥ 1')
    else if (orders.has(s.order)) err(sw, `"order" ${s.order} repetido (también en ${orders.get(s.order)})`)
    else orders.set(s.order, sw)
    for (const k of ['titleEn', 'titleEs', 'icon', 'descriptionEs']) if (!isStr(s[k])) err(sw, `falta "${k}"`)
    if (isStr(s.icon) && icons && !icons.has(s.icon)) warn(sw, `el icono "${s.icon}" no existe en src/ui/icon-paths.ts (lo añade desarrollo)`)
    if (!Array.isArray(s.topics) || !s.topics.length) {
      err(sw, 'sin temas')
      continue
    }

    for (const [ti, t] of s.topics.entries()) {
      topics++
      const tw = `${sw} › ${t?.id ?? `tema ${ti + 1}`}`
      if (!t || typeof t !== 'object') {
        err(tw, 'el tema debe ser un objeto')
        continue
      }
      if (!isStr(t.id) || !KEBAB.test(t.id)) err(tw, 'id de tema vacío o no kebab-case')
      else if (topicIds.has(t.id)) err(tw, `id de tema repetido (también en ${topicIds.get(t.id)})`)
      else topicIds.set(t.id, sw)
      for (const k of ['name', 'nameEs', 'summaryEs', 'classFocusEn']) if (!isStr(t[k])) err(tw, `falta "${k}"`)
      if (!LEVELS.includes(t.level)) err(tw, `nivel inválido: ${t.level}`)
      if (!Array.isArray(t.keywords) || !t.keywords.every(isStr)) err(tw, '"keywords" debe ser una lista de textos')
      else if (!t.keywords.length) warn(tw, 'sin "keywords" (el buscador lo encontrará peor)')
      if (!Array.isArray(t.categories) || !t.categories.length) err(tw, 'sin "categories"')
      else for (const c of t.categories) if (!CATEGORIES.includes(c)) err(tw, `categoría inválida: ${c}`)

      if (!Array.isArray(t.explanationEs) || t.explanationEs.length < 2 || t.explanationEs.length > 4 || !t.explanationEs.every(isStr))
        err(tw, '"explanationEs" debe tener 2–4 párrafos')
      else t.explanationEs.forEach((p, i) => p.length > 350 && warn(tw, `párrafo ${i + 1} de la explicación con ${p.length} caracteres (máx. 350)`))

      if (!t.forms || typeof t.forms !== 'object') err(tw, 'sin "forms"')
      else
        for (const k of ['affirmative', 'negative', 'question']) {
          const f = t.forms[k]
          if (f === null) continue
          if (!f || typeof f !== 'object') {
            err(tw, `forms.${k} falta (usa null si no tiene sentido)`)
            continue
          }
          if (!isStr(f.pattern)) err(tw, `forms.${k} sin "pattern"`)
          if (!Array.isArray(f.examples) || f.examples.length < 1 || f.examples.length > 2) err(tw, `forms.${k} debe tener 1–2 ejemplos`)
          else f.examples.forEach((e, i) => checkExample(`${tw} › forms.${k}[${i}]`, e))
        }

      if (!Array.isArray(t.examples) || t.examples.length < 4 || t.examples.length > 6) err(tw, '"examples" debe tener 4–6 ejemplos')
      if (Array.isArray(t.examples)) t.examples.forEach((e, i) => checkExample(`${tw} › examples[${i}]`, e, { note: true }))

      if (!Array.isArray(t.commonMistakes) || t.commonMistakes.length < 2 || t.commonMistakes.length > 4) err(tw, '"commonMistakes" debe tener 2–4 errores')
      if (Array.isArray(t.commonMistakes))
        t.commonMistakes.forEach((m, i) => {
          for (const k of ['wrong', 'right', 'whyEs']) if (!isStr(m?.[k])) err(`${tw} › commonMistakes[${i}]`, `falta "${k}"`)
          if (isStr(m?.wrong) && m.wrong === m.right) err(`${tw} › commonMistakes[${i}]`, '"wrong" y "right" son iguales')
          if (isStr(m?.right)) texts.push([`${tw} › commonMistakes[${i}]`, 'la frase correcta', m.right])
        })

      if (!Array.isArray(t.related) || !t.related.every(isStr)) err(tw, '"related" debe ser una lista de ids')
      else
        for (const r of t.related) {
          if (r === t.id) err(tw, '"related" se apunta a sí mismo')
          else related.push([tw, r])
        }

      if (!Array.isArray(t.speaking) || t.speaking.length < 2 || t.speaking.length > 3) err(tw, '"speaking" debe tener 2–3 retos')
      if (Array.isArray(t.speaking))
        t.speaking.forEach((p, i) => {
          for (const k of ['promptEs', 'modelEn', 'checkEs']) if (!isStr(p?.[k])) err(`${tw} › speaking[${i}]`, `falta "${k}"`)
          if (isStr(p?.modelEn)) texts.push([`${tw} › speaking[${i}]`, 'la respuesta modelo', p.modelEn])
        })

      if (!Array.isArray(t.exercises) || t.exercises.length < 6 || t.exercises.length > 8) err(tw, '"exercises" debe tener 6–8 ejercicios')
      if (!Array.isArray(t.exercises)) continue
      for (const [ei, x] of t.exercises.entries()) {
        exercises++
        const xw = `${tw} › ${x?.id ?? `ejercicio ${ei + 1}`}`
        if (!x || typeof x !== 'object') {
          err(xw, 'el ejercicio debe ser un objeto')
          continue
        }
        const m = isStr(x.id) ? x.id.match(/^(.*)-(\d+)$/) : null
        if (!m || m[1] !== t.id || Number(m[2]) < 1) err(xw, `id de ejercicio debe ser "${t.id}-<n>"`)
        if (isStr(x.id)) {
          if (exIds.has(x.id)) err(xw, 'id de ejercicio repetido')
          exIds.add(x.id)
          const n = exerciseCardId(x.id)
          if (cardIds.has(n) && cardIds.get(n) !== x.id) err(xw, `colisión del id numérico de tarjeta con ${cardIds.get(n)} (cambia el id)`)
          cardIds.set(n, x.id)
        }
        if (!isStr(x.whyEs)) err(xw, 'falta "whyEs"')
        const prompt = x.type === 'order' ? null : x.prompt
        if (x.type !== 'order') {
          if (!isStr(prompt)) err(xw, 'falta "prompt"')
          else texts.push([xw, 'el enunciado', prompt])
        }
        if (x.type === 'choice') {
          if (!Array.isArray(x.options) || x.options.length !== 4 || !x.options.every(isStr)) {
            err(xw, '"options" debe tener 4 opciones')
            continue
          }
          if (new Set(x.options.map((o) => o.trim().toLowerCase())).size !== x.options.length) err(xw, 'opciones repetidas')
          if (!Number.isInteger(x.answer) || x.answer < 0 || x.answer >= x.options.length) err(xw, '"answer" fuera de rango')
          if (!Array.isArray(x.trapsEs) || x.trapsEs.length !== x.options.length) err(xw, '"trapsEs" debe tener una entrada por opción')
          else
            x.trapsEs.forEach((tr, i) => {
              if (typeof tr !== 'string') err(xw, `trapsEs[${i}] debe ser texto`)
              else if (i === x.answer && tr !== '') err(xw, `trapsEs[${i}] (la correcta) debe ser ""`)
              else if (i !== x.answer && !tr.trim()) err(xw, `trapsEs[${i}] vacío: explica por qué esa opción está mal`)
            })
        } else if (x.type === 'gap') {
          if (!Array.isArray(x.answers) || !x.answers.length || !x.answers.every(isStr)) {
            err(xw, '"answers" debe ser una lista de respuestas válidas')
            continue
          }
          const gaps = isStr(prompt) ? (prompt.match(GAP) ?? []).length : 0
          if (!gaps) err(xw, 'el enunciado no tiene hueco ____')
          for (const a of x.answers) {
            const parts = a.split(' / ').length
            if (gaps && parts !== gaps) err(xw, `"${a}" tiene ${parts} parte(s) y el enunciado ${gaps} hueco(s) (sepáralas con " / ")`)
          }
        } else if (x.type === 'order') {
          if (!Array.isArray(x.words) || x.words.length < 3 || !x.words.every(isStr)) {
            err(xw, '"words" debe tener al menos 3 palabras')
            continue
          }
          if (!isStr(x.answer)) {
            err(xw, 'falta "answer" (la frase ordenada)')
            continue
          }
          if (/\.\s*$/.test(x.answer)) err(xw, '"answer" sin punto final')
          const a = x.answer.trim().split(/\s+/).sort().join(' ')
          const w = x.words.join(' ').trim().split(/\s+/).sort().join(' ')
          if (a !== w) err(xw, `"answer" no usa exactamente las palabras de "words"`)
          if (x.words.join(' ') === x.answer.trim()) warn(xw, '"words" ya está en el orden correcto')
          texts.push([xw, 'la frase ordenada', x.answer])
        } else err(xw, `tipo desconocido: ${x.type} (choice, gap u order)`)
      }
    }
  }

  // FORMATO: prohibido reutilizar frases del banco del test (si se ven antes del re-test, el test deja de medir).
  for (const [where, what, text] of texts) {
    const m = inBank(text)
    if (m?.kind === 'same') err(where, `${what} coincide con un enunciado del banco del test: "${text}" ≈ "${m.bank}"`)
    else if (m) warn(where, `${what} contiene (o está dentro de) un enunciado del banco del test: "${text}" ~ "${m.bank}" (revísalo)`)
  }
  for (const [where, r] of related) if (!topicIds.has(r)) warn(where, `"related" apunta a "${r}", que no existe (¿sección aún sin escribir?)`)
  return { errors, warnings, stats: { sections: sectionIds.size, topics, exercises } }
}

function iconNames() {
  const p = join(ROOT, 'src/ui/icon-paths.ts')
  if (!existsSync(p)) return null
  return new Set([...readFileSync(p, 'utf8').matchAll(/^\s+([A-Za-z0-9]+):\s*'/gm)].map((m) => m[1]))
}

function main() {
  const args = process.argv.slice(2)
  const targets = args.length ? args.map((a) => resolve(a)) : [join(ROOT, 'src/grammar')]
  const files = targets.flatMap((p) =>
    !existsSync(p) ? [] : statSync(p).isDirectory() ? readdirSync(p).filter((f) => f.endsWith('.json')).map((f) => join(p, f)) : [p],
  )
  const entries = []
  const parseErrors = []
  for (const f of files) {
    try {
      entries.push({ file: f, data: JSON.parse(readFileSync(f, 'utf8')) })
    } catch (e) {
      parseErrors.push(`${basename(f)}: JSON inválido (${e.message})`)
    }
  }
  const { errors, warnings, stats } = validateSections(entries, { bank: bankPrompts(), icons: iconNames() })
  errors.unshift(...parseErrors)
  for (const w of warnings) console.log(`⚠ ${w}`)
  for (const e of errors) console.log(`✗ ${e}`)
  console.log(`\n${files.length} archivos · ${stats.sections} secciones · ${stats.topics} temas · ${stats.exercises} ejercicios`)
  console.log(errors.length ? `${errors.length} errores, ${warnings.length} avisos` : `OK (${warnings.length} avisos)`)
  if (!files.length) console.log('(no hay archivos en src/grammar/ todavía)')
  process.exit(errors.length ? 1 : 0)
}

// Solo se ejecuta como script (los tests importan las funciones sin lanzar la validación).
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
