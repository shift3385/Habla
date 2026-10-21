// Valida el contenido de Sonidos (src/sounds/*.json) y sus audios (public/sounds/) según docs/v5.11/FORMATO-sonidos.md
// (5.11, S-03). Uso: node scripts/validate-sounds.mjs   (o npm run validate:sounds)
// Sale con código 1 si hay errores. Los avisos (⚠) no bloquean. Sin dependencias, como validate-grammar.mjs.
// Si existe scripts/data/cmudict.dict (CMU Pronouncing Dictionary; solo en el PC, fuera de git y del APK), además
// comprueba que cada ejemplo lleva el sonido y que cada par mínimo se diferencia en él.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { bankMatcher } from './validate-grammar.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

// La voz del teléfono no sabe cuál de las dos lecturas usar: prohibidos sueltos en todo lo que suena con ▶.
export const HOMOGRAPHS = new Set(
  'live read lead wind tear close bow row wound minute object present record use does bass dove sow desert content permit produce refuse invalid polish'.split(
    ' ',
  ),
)
export const IPA = new Set('iː ɪ ɛ æ ɑ ɔ ʊ uː ʌ ə ɝ ɚ eɪ aɪ ɔɪ aʊ oʊ p b t d k ɡ f v θ ð s z ʃ ʒ h tʃ dʒ m n ŋ l ɹ w j'.split(' '))
export const AZURE = new Set('i ɪ ɛ æ ɑ ɔ ʊ u ʌ ə ɝ ɚ eɪ aɪ ɔɪ aʊ oʊ p b t d k ɡ g f v θ ð s z ʃ ʒ h tʃ dʒ m n ŋ l ɹ w j'.split(' '))
export const LEVELS = new Set(['A1', 'A2', 'B1', 'B2'])
export const KINDS = new Set(['vowel', 'diphthong', 'consonant', 'feature'])
export const TYPES = new Set(['listen-choose', 'odd-one-out', 'sort', 'say-word', 'say-pair', 'say-sentence', 'spell-listen'])
const BLOCKS = new Set(['vowels', 'diphthongs', 'consonants'])
const LIPS = new Set(['spread', 'neutral', 'rounded'])
const JAW = new Set(['close', 'mid', 'open'])
// /ɝ/ y /ɚ/ (er, axr) pueden compartir símbolo de Azure (F0-4 dirá cuál devuelve): el enlace va entonces a `er`.
const SHARED_AZURE = new Set(['er', 'axr'])
export const LIMITS = { jsonBytes: 300 * 1024, audioBytes: 30 * 1024, audioTotal: 0.6 * 1024 * 1024 }
const COMMONS = /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/
const LETTER = /^[A-Z]$/

const isStr = (v) => typeof v === 'string' && v.trim().length > 0
const isArr = Array.isArray

/**
 * Valida el contenido ya leído. `data`: { phonemes, lessons, alphabet, credits } (los objetos de cada JSON).
 * `opts.audio`: Map archivo → bytes de public/sounds/ (si falta, no se comprueban los audios). `opts.bank`: enunciados
 * del banco del test. `opts.dict`: Map palabra → fonemas ARPAbet (CMUdict), opcional.
 * Devuelve { errors, warnings, stats }.
 */
export function validateSounds(data, opts = {}) {
  const errors = []
  const warnings = []
  const err = (where, msg) => errors.push(`${where}: ${msg}`)
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`)
  // Muestra de S-02 (--muestra): las referencias a fichas que aún no están escritas son avisos, no errores.
  const ref = opts.sample ? warn : err
  const phonemes = data.phonemes?.phonemes
  const lessons = data.lessons?.lessons
  const alphabet = data.alphabet
  const credits = data.credits?.credits ?? []
  if (!isArr(phonemes)) return { errors: ['phonemes.json: falta la lista "phonemes"'], warnings, stats: {} }
  if (!isArr(lessons)) return { errors: ['lessons.json: falta la lista "lessons"'], warnings, stats: {} }

  // Todo lo que la voz va a leer suelto (▶): sin homógrafos. [dónde, palabra]
  const spoken = []
  const sayable = (where, w) => {
    if (!isStr(w)) return err(where, `palabra vacía o no es texto (${JSON.stringify(w)})`)
    spoken.push([where, w])
  }

  // --- Fichas ---
  const ids = new Set()
  const charts = new Map()
  for (const p of phonemes) {
    const w = `fonema ${p?.id}`
    if (!/^[a-z][a-z0-9-]*$/.test(p?.id ?? '')) err(w, 'id no válido (ARPAbet en minúsculas o rasgo con guiones)')
    if (ids.has(p.id)) err(w, 'id repetido')
    ids.add(p.id)
    if (!KINDS.has(p.kind)) err(w, `kind no válido «${p.kind}»`)
    const feature = p.kind === 'feature'
    if (!feature && !IPA.has(p.ipa)) err(w, `IPA desconocido «${p.ipa}»`)
    if (feature && !isStr(p.ipa)) err(w, 'falta "ipa" (etiqueta corta del rasgo)')
    if (!isArr(p.azure)) err(w, '"azure" debe ser una lista')
    for (const a of p.azure ?? []) if (!AZURE.has(a)) err(w, `símbolo de Azure desconocido «${a}»`)
    if (!feature && !(p.azure ?? []).length) err(w, 'sin símbolos de Azure')
    if (!LEVELS.has(p.level)) err(w, 'level no válido')
    if (![1, 2, 3].includes(p.difficulty)) err(w, 'difficulty no es 1, 2 o 3')
    if (!['P1', 'P2', 'P3'].includes(p.priority)) err(w, 'priority no es P1, P2 o P3')
    if (!feature) {
      const c = p.chart
      if (!c || !BLOCKS.has(c.block) || !Number.isInteger(c.row) || !Number.isInteger(c.col)) err(w, '"chart" no válido')
      else {
        const k = `${c.block}:${c.row}:${c.col}`
        if (charts.has(k) && !(SHARED_AZURE.has(charts.get(k)) && SHARED_AZURE.has(p.id))) err(w, `misma celda de la tabla que ${charts.get(k)}`)
        charts.set(k, p.id)
      }
      if (p.kind === 'consonant' && typeof p.voiced !== 'boolean') err(w, '"voiced" debe ser true o false en una consonante')
      if (p.kind !== 'consonant' && p.voiced !== null) err(w, '"voiced" debe ser null en una vocal')
    }
    for (const f of ['keyword', 'nameEs', 'tipShortEs', 'spanishEs', 'mistakeEs']) if (!isStr(p[f])) err(w, `falta "${f}"`)
    if (isStr(p.keyword)) sayable(`${w} (keyword)`, p.keyword)
    if ((p.tipShortEs ?? '').length > 90) err(w, `tipShortEs de más de 90 caracteres (${p.tipShortEs.length})`)
    if (/españa/i.test(`${p.tipShortEs}`)) err(w, 'tipShortEs menciona España: debe valer para Latinoamérica')
    const a = p.articulation ?? {}
    if (!LIPS.has(a.lips) || !JAW.has(a.jaw) || !isStr(a.place)) err(w, '"articulation" incompleta (lips, jaw, place)')
    for (const f of ['lipsEs', 'tongueEs', 'voiceEs']) {
      if (!isStr(a[f])) err(w, `falta articulation.${f}`)
      else if (a[f].length > 120) err(w, `articulation.${f} de más de 120 caracteres`)
    }
    if (!isArr(p.explanationEs) || p.explanationEs.length < 1 || p.explanationEs.length > 3) err(w, 'explanationEs debe tener 1–3 párrafos')
    for (const t of p.explanationEs ?? []) if (!isStr(t) || t.length > 300) err(w, 'párrafo de explicación vacío o de más de 300 caracteres')
    // España solo como dato añadido, nunca como pista única (REG-A3-18).
    for (const [f, t] of [['spanishEs', p.spanishEs], ...(p.explanationEs ?? []).map((x) => ['explanationEs', x])])
      if (/españa/i.test(`${t}`) && !/latinoam|en otros países|en muchos países|en todos/i.test(`${t}`)) warn(w, `${f} menciona España sin decir qué pasa en Latinoamérica`)
    if (!isArr(p.spellings) || !p.spellings.length) err(w, 'sin grafías ("spellings")')
    for (const s of p.spellings ?? []) {
      if (!isStr(s.pattern) || !isArr(s.examples) || !s.examples.length) err(w, `grafía no válida ${JSON.stringify(s)}`)
      for (const x of s.examples ?? []) sayable(`${w} (grafía ${s.pattern})`, x)
    }
    const ex = p.examples ?? {}
    for (const k of ['initial', 'medial', 'final']) {
      if (!isArr(ex[k])) err(w, `examples.${k} debe ser una lista (vacía si no existe en esa posición)`)
      for (const x of ex[k] ?? []) sayable(`${w} (ejemplo ${k})`, x)
    }
    const total = ['initial', 'medial', 'final'].reduce((n, k) => n + (ex[k]?.length ?? 0), 0)
    if (total < 4) err(w, `menos de 4 ejemplos (${total})`)
    if (!feature && ['initial', 'medial', 'final'].some((k) => !(ex[k] ?? []).length) && !isStr(p.positionNoteEs))
      err(w, 'falta un ejemplo por posición y no hay "positionNoteEs" que diga por qué')
    if (!isArr(p.minimalPairs)) err(w, '"minimalPairs" debe ser una lista')
    for (const mp of p.minimalPairs ?? []) {
      if (!isArr(mp.pairs) || mp.pairs.length < 3) err(w, `menos de 3 pares con ${mp.with}`)
      const seen = new Set()
      for (const pair of mp.pairs ?? []) {
        const [x, y] = isArr(pair) ? pair : []
        if (!isArr(pair) || pair.length !== 2 || !isStr(x) || !isStr(y) || x.toLowerCase() === y.toLowerCase()) {
          err(w, `par no válido ${JSON.stringify(pair)} (con ${mp.with})`)
          continue
        }
        const key = `${x}/${y}`.toLowerCase()
        if (seen.has(key)) err(w, `par repetido ${x}/${y}`)
        seen.add(key)
        sayable(`${w} (par ${x}/${y})`, x)
        sayable(`${w} (par ${x}/${y})`, y)
      }
    }
    if (!isArr(p.sentences) || !p.sentences.length) err(w, 'sin frases ("sentences")')
    for (const s of p.sentences ?? []) if (!isStr(s.en) || !isStr(s.es)) err(w, `frase no válida ${JSON.stringify(s)}`)
    if (!isArr(p.related)) err(w, '"related" debe ser una lista')
  }
  // Referencias cruzadas (con todos los ids ya leídos).
  for (const p of phonemes) {
    for (const r of p.related ?? []) if (!ids.has(r)) ref(`fonema ${p.id}`, `related desconocido ${r}`)
    for (const mp of p.minimalPairs ?? []) if (!ids.has(mp.with)) ref(`fonema ${p.id}`, `par con fonema desconocido ${mp.with}`)
  }
  // Un símbolo de Azure lleva a una sola ficha (si no, el enlace «Practicar el sonido» sería ambiguo).
  const norm = (a) => (a === 'g' ? 'ɡ' : a.replace(/ː/g, ''))
  const azureOwner = new Map()
  for (const p of phonemes)
    for (const a of p.azure ?? []) {
      const owner = azureOwner.get(norm(a))
      if (owner && owner !== p.id && !(SHARED_AZURE.has(owner) && SHARED_AZURE.has(p.id))) err(`fonema ${p.id}`, `símbolo de Azure «${a}» repetido: ya es de ${owner}`)
      if (!owner) azureOwner.set(norm(a), p.id)
    }

  // --- Audios sueltos (S-04) y créditos ---
  const creditIds = new Set()
  const creditFiles = new Set()
  let audioTotal = 0
  for (const c of credits) {
    const w = `crédito ${c?.id}`
    if (!isStr(c?.id) || creditIds.has(c.id)) err(w, 'id vacío o repetido')
    creditIds.add(c?.id)
    for (const f of ['file', 'phoneme', 'title', 'author', 'license', 'licenseUrl']) if (!isStr(c?.[f])) err(w, `falta "${f}"`)
    if (!COMMONS.test(c?.page ?? '')) err(w, '"page" debe ser la página del archivo en commons.wikimedia.org')
    if (typeof c?.modified !== 'boolean') err(w, '"modified" debe ser true o false')
    if (c?.modified && !isStr(c.modifiedEs)) err(w, 'modificado sin decir qué se cambió ("modifiedEs")')
    if (!/\.(ogg|oga|opus|webm|mp3|wav)$/i.test(c?.file ?? '')) err(w, `formato de audio no admitido «${c?.file}»`)
    if (isStr(c?.phoneme) && !ids.has(c.phoneme)) ref(w, `fonema desconocido ${c.phoneme}`)
    if (creditFiles.has(c?.file)) err(w, `archivo ${c.file} con dos créditos`)
    creditFiles.add(c?.file)
    if (opts.audio && isStr(c?.file)) {
      const bytes = opts.audio.get(c.file)
      if (bytes === undefined) err(w, `no existe public/sounds/${c.file}`)
      else {
        audioTotal += bytes
        if (bytes > LIMITS.audioBytes) err(w, `${c.file} pesa ${(bytes / 1024).toFixed(1)} KB (máx. ${LIMITS.audioBytes / 1024} KB)`)
      }
    }
  }
  for (const p of phonemes) {
    if (p.audio === undefined) continue
    const c = credits.find((x) => x.id === p.audio)
    if (!c) err(`fonema ${p.id}`, `audio «${p.audio}» sin crédito en credits.json`)
    else if (c.phoneme !== p.id) err(`fonema ${p.id}`, `el audio «${p.audio}» es del fonema ${c.phoneme}`)
  }
  if (opts.audio) {
    for (const f of opts.audio.keys()) if (!creditFiles.has(f)) err(`public/sounds/${f}`, 'audio sin crédito en credits.json')
    if (audioTotal > LIMITS.audioTotal) err('public/sounds', `los audios pesan ${(audioTotal / 1024).toFixed(0)} KB (máx. ${LIMITS.audioTotal / 1024} KB)`)
  }

  // --- Abecedario ---
  const letterIds = new Set()
  if (!alphabet || !isArr(alphabet.letters) || !isArr(alphabet.families)) err('alphabet.json', 'faltan "letters" o "families"')
  else {
    const famOf = new Map()
    for (const f of alphabet.families) {
      if (!isStr(f.id) || !isStr(f.ipa) || !isStr(f.labelEs) || !isArr(f.letters)) err(`familia ${f.id}`, 'familia incompleta (id, ipa, labelEs, letters)')
      if (f.id !== 'ar' && !ids.has(f.id)) ref(`familia ${f.id}`, 'no es el id de ninguna ficha')
      for (const l of f.letters ?? []) {
        if (famOf.has(l)) err(`letra ${l}`, `está en dos familias (${famOf.get(l)} y ${f.id})`)
        famOf.set(l, f.id)
      }
    }
    for (const l of alphabet.letters) {
      const w = `letra ${l?.letter}`
      if (!LETTER.test(l?.letter ?? '') || letterIds.has(l.letter)) err(w, 'letra no válida o repetida')
      letterIds.add(l?.letter)
      for (const f of ['ipa', 'family', 'soundsLikeEs', 'ttsText']) if (!isStr(l?.[f])) err(w, `falta "${f}"`)
      if (famOf.get(l?.letter) !== l?.family) err(w, `su familia («${l?.family}») no coincide con la lista de la familia («${famOf.get(l?.letter)}»)`)
      for (const x of l?.confusedWith ?? []) if (!LETTER.test(x)) err(w, `confusedWith no válido «${x}»`)
    }
    if (letterIds.size !== 26 || famOf.size !== 26) err('alphabet.json', `debe tener las 26 letras, cada una en una familia (hay ${letterIds.size} letras y ${famOf.size} en familias)`)
  }

  // --- Lecciones ---
  const lessonIds = new Set()
  const orders = new Set()
  let exercises = 0
  const checkLetters = (where, xs) => {
    for (const x of xs) if (!LETTER.test(x) || (letterIds.size && !letterIds.has(x))) err(where, `«${x}» no es una letra A–Z`)
  }
  for (const l of lessons) {
    const w = `lección ${l?.id}`
    if (!/^[A-Z][A-Za-z0-9]*$/.test(l?.id ?? '') || lessonIds.has(l.id)) err(w, 'id no válido o repetido')
    lessonIds.add(l?.id)
    if (!Number.isInteger(l?.order) || orders.has(l.order)) err(w, `order no válido o repetido (${l?.order})`)
    orders.add(l?.order)
    if (!Number.isInteger(l?.unit) || l.unit < 0 || l.unit > 7) err(w, 'unit fuera de 0–7')
    if (!isStr(l?.titleEs) || !isStr(l?.introEs)) err(w, 'faltan titleEs o introEs')
    if ((l?.introEs ?? '').length > 300) err(w, 'introEs de más de 300 caracteres')
    if (!LEVELS.has(l?.level)) err(w, 'level no válido')
    if (!(l?.minutes >= 3 && l?.minutes <= 10)) err(w, 'minutes fuera de 3–10')
    if (!isArr(l?.phonemes)) err(w, '"phonemes" debe ser una lista')
    for (const ph of l?.phonemes ?? []) if (!ids.has(ph)) ref(w, `fonema desconocido ${ph}`)
    if (!isArr(l?.exercises) || !l.exercises.length) err(w, 'sin ejercicios')
    const exIds = new Set()
    for (const e of l?.exercises ?? []) {
      exercises++
      const ew = `${w} · ${e?.id}`
      if (!TYPES.has(e?.type)) err(ew, `tipo desconocido ${e?.type}`)
      if (!e?.id?.startsWith(`${l.id}-`) || exIds.has(e.id)) err(ew, 'id de ejercicio no válido o repetido (<lección>-<n>)')
      exIds.add(e?.id)
      const say = (x) => (e.letters ? checkLetters(ew, [x]) : sayable(ew, x))
      if (e?.type === 'listen-choose') {
        if (!isArr(e.pairs) || e.pairs.length < 2) err(ew, 'listen-choose con menos de 2 pares')
        for (const p of e.pairs ?? []) {
          if (!isArr(p) || p.length < 2 || p.length > 3 || new Set(p.map((x) => `${x}`.toLowerCase())).size !== p.length) err(ew, `par no válido ${JSON.stringify(p)}`)
          for (const x of p ?? []) say(x)
        }
        if (!Number.isInteger(e.rounds) || e.rounds < 1 || e.rounds > 12) err(ew, 'rounds fuera de 1–12')
      } else if (e?.type === 'odd-one-out') {
        if (!isArr(e.words) || e.words.length < 3 || e.words.length > 5) err(ew, 'odd-one-out necesita 3–5 palabras')
        for (const x of e.words ?? []) say(x)
        if (!(Number.isInteger(e.answer) && e.answer >= 0 && e.answer < (e.words?.length ?? 0))) err(ew, 'answer fuera de rango')
        if (!isStr(e.whyEs)) err(ew, 'falta whyEs')
      } else if (e?.type === 'sort') {
        if (!isArr(e.columns) || e.columns.length < 2 || e.columns.length > 3) err(ew, 'sort necesita 2–3 columnas')
        for (const c of e.columns ?? []) if (!ids.has(c)) err(ew, `columna con fonema desconocido ${c}`)
        if (e.columnLabels !== undefined && (!isArr(e.columnLabels) || e.columnLabels.length !== e.columns?.length)) err(ew, 'columnLabels no tiene una etiqueta por columna')
        if (!isArr(e.words) || e.words.length < 4 || e.words.length > 6) err(ew, 'sort necesita 4–6 palabras (cabe en 320 px)')
        for (const pair of e.words ?? []) {
          const [x, col] = isArr(pair) ? pair : []
          say(x)
          if (!(e.columns ?? []).includes(col)) err(ew, `columna ${col} no está en columns`)
        }
        for (const c of e.columns ?? []) if (!(e.words ?? []).some((p) => p?.[1] === c)) err(ew, `la columna ${c} se queda vacía`)
      } else if (e?.type === 'say-word') {
        if (!ids.has(e.target)) err(ew, `target desconocido ${e.target}`)
        if (!isArr(e.words) || e.words.length < 3 || e.words.length > 6) err(ew, 'say-word necesita 3–6 palabras')
        for (const x of e.words ?? []) sayable(ew, x)
      } else if (e?.type === 'say-pair') {
        if (!isArr(e.pairs) || !e.pairs.length) err(ew, 'say-pair sin pares')
        for (const p of e.pairs ?? []) {
          if (!isArr(p) || p.length !== 2 || p[0] === p[1]) err(ew, `par no válido ${JSON.stringify(p)}`)
          for (const x of p ?? []) sayable(ew, x)
        }
      } else if (e?.type === 'say-sentence') {
        if (!isStr(e.en) || !isStr(e.es)) err(ew, 'faltan en o es')
        if (!isArr(e.targets) || !e.targets.length) err(ew, 'sin targets')
        for (const t of e.targets ?? []) if (!ids.has(t)) err(ew, `target desconocido ${t}`)
      } else if (e?.type === 'spell-listen') {
        if (!isArr(e.items) || e.items.length < 3) err(ew, 'spell-listen necesita al menos 3 cosas que deletrear')
        for (const x of e.items ?? []) if (!isStr(x) || !/^[A-Za-z][A-Za-z .@'-]*$/.test(x)) err(ew, `no se puede deletrear «${x}»`)
      }
    }
  }

  // --- Lo que suena: sin homógrafos ---
  for (const [where, x] of spoken) if (HOMOGRAPHS.has(x.toLowerCase())) err(where, `homógrafo «${x}»: la voz puede leerlo de dos formas`)

  // --- Frases del banco del test: prohibido reutilizarlas (FORMATO de Gramática) ---
  if (opts.bank?.length) {
    const inBank = bankMatcher(opts.bank)
    const texts = []
    for (const p of phonemes) for (const s of p.sentences ?? []) texts.push([`fonema ${p.id}`, s.en])
    for (const l of lessons) for (const e of l.exercises ?? []) if (e.type === 'say-sentence') texts.push([`lección ${l.id} · ${e.id}`, e.en])
    for (const [where, t] of texts) {
      const m = isStr(t) && inBank(t)
      if (m?.kind === 'same') err(where, `la frase coincide con un enunciado del banco del test: "${t}"`)
      else if (m) warn(where, `la frase contiene un enunciado del banco del test: "${t}" ~ "${m.bank}"`)
    }
  }

  // --- CMUdict (opcional) ---
  if (opts.dict) checkWithDict(phonemes, opts.dict, err, warn)

  return { errors, warnings, stats: { phonemes: phonemes.length, lessons: lessons.length, exercises, letters: letterIds.size, audios: credits.length, audioKB: Math.round(audioTotal / 1024) } }
}

// ARPAbet de CMUdict: ah1/ah2 = /ʌ/, ah0 = /ə/; er1/er2 = /ɝ/, er0 = /ɚ/; el resto, el id sin acento.
// La r americana: CMUdict escribe /ɹ/ + schwa como ER (around = ER0 AW1 N D), así que ER también cuenta como r.
const arpa = (id) => (id === 'ax' ? ['ah0'] : id === 'ah' ? ['ah1', 'ah2'] : id === 'axr' ? ['er0'] : id === 'er' ? ['er1', 'er2'] : id === 'r' ? ['r', 'er'] : [id])
// Una palabra puede tener varias pronunciaciones (caught = K AA1 T o K AO1 T): vale si alguna lleva el sonido.
const variants = (v) => (Array.isArray(v?.[0]) ? v : v ? [v] : [])
function checkWithDict(phonemes, dict, err, warn) {
  const same = (ph, a) => ph === a || (a.length <= 3 && !/\d$/.test(a) && ph.replace(/\d$/, '') === a)
  const has = (word, id) => variants(dict.get(word.toLowerCase())).some((v) => v.some((ph) => arpa(id).some((a) => same(ph, a))))
  for (const p of phonemes) {
    if (p.kind === 'feature') continue
    for (const k of ['initial', 'medial', 'final'])
      for (const x of p.examples?.[k] ?? []) {
        if (!dict.has(x.toLowerCase())) warn(`fonema ${p.id}`, `«${x}» no está en CMUdict`)
        else if (!has(x, p.id)) err(`fonema ${p.id}`, `«${x}» no contiene el sonido según CMUdict`)
      }
    for (const mp of p.minimalPairs ?? []) {
      const other = phonemes.find((q) => q.id === mp.with)
      for (const [a, b] of mp.pairs ?? []) {
        if (dict.has(a.toLowerCase()) && !has(a, p.id)) err(`fonema ${p.id}`, `par ${a}/${b}: «${a}» no lleva el sonido`)
        if (other?.kind !== 'feature' && dict.has(b.toLowerCase()) && !has(b, mp.with)) warn(`fonema ${p.id}`, `par ${a}/${b}: «${b}» no lleva ${mp.with} según CMUdict (revísalo)`)
        // REV-11-D3-01: un par mínimo se diferencia en UN fonema (bathe/bath no: cambia también la vocal).
        const A = variants(dict.get(a.toLowerCase()))
        const B = variants(dict.get(b.toLowerCase()))
        const strip = (v) => v.map((x) => x.replace(/\d$/, ''))
        const oneOff = (x, y) => x.length === y.length && x.filter((ph, i) => ph !== y[i]).length === 1
        if (A.length && B.length && !A.some((x) => B.some((y) => oneOff(strip(x), strip(y)))))
          warn(`fonema ${p.id}`, `par ${a}/${b}: según CMUdict no se diferencian en un solo sonido (revísalo)`)
      }
    }
  }
}

/** Lee CMUdict (formato cmusphinx: «ship SH IH1 P», variantes «word(2)», comentarios «#»): palabra → pronunciaciones. */
export function readDict(path) {
  const dict = new Map()
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const [word, ...ph] = line.replace(/#.*/, '').trim().split(/\s+/)
    if (!word) continue
    const key = word.replace(/\(\d+\)$/, '').toLowerCase()
    dict.set(key, [...(dict.get(key) ?? []), ph.map((x) => x.toLowerCase())])
  }
  return dict
}

function bankPrompts() {
  const out = []
  const visit = (v) => {
    if (isArr(v)) v.forEach(visit)
    else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) {
        if (k === 'prompt' && typeof x === 'string') out.push(x)
        else visit(x)
      }
  }
  const walk = (d) =>
    readdirSync(d).forEach((f) => {
      const p = join(d, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (f.endsWith('.json')) visit(JSON.parse(readFileSync(p, 'utf8')))
    })
  const dir = join(ROOT, 'src/bank')
  if (existsSync(dir)) walk(dir)
  return out
}

/**
 * Consejos de una línea derivados de las fichas (M-12): `byAzure` = símbolo de Azure → tipShortEs (el primero que lo
 * declara, como `buildAzureMap`), `byId` = id de la ficha → tipShortEs (incluye los rasgos `s-cluster`, `ed`…).
 */
export function tipsFrom(phonemes) {
  const byAzure = {}
  const byId = {}
  for (const p of phonemes) {
    byId[p.id] = p.tipShortEs
    for (const a of p.azure ?? []) byAzure[a] ??= p.tipShortEs
  }
  return { byAzure, byId }
}

function main() {
  const dir = join(ROOT, 'src/sounds')
  const errors = []
  const data = {}
  let jsonBytes = 0
  for (const name of ['phonemes', 'lessons', 'alphabet', 'credits']) {
    const f = join(dir, `${name}.json`)
    if (!existsSync(f)) {
      errors.push(`${name}.json: no existe`)
      continue
    }
    jsonBytes += statSync(f).size
    try {
      data[name] = JSON.parse(readFileSync(f, 'utf8'))
    } catch (e) {
      errors.push(`${name}.json: JSON inválido (${e.message})`)
    }
  }
  const audioDir = join(ROOT, 'public/sounds')
  const audio = new Map(existsSync(audioDir) ? readdirSync(audioDir).filter((f) => !f.startsWith('.')).map((f) => [f, statSync(join(audioDir, f)).size]) : [])
  const dictPath = join(ROOT, 'scripts/data/cmudict.dict')
  const dict = existsSync(dictPath) ? readDict(dictPath) : null
  const r = errors.length ? { errors: [], warnings: [], stats: {} } : validateSounds(data, { audio, bank: bankPrompts(), dict, sample: process.argv.includes('--muestra') })
  errors.push(...r.errors)
  // M-12 (para D1): tips.json es una copia pequeña de los `tipShortEs` (la importa pronunciation.ts sin cargar las fichas
  // en el arranque). Se genera con --write-tips y aquí se exige que esté al día.
  if (data.phonemes?.phonemes) {
    const tipsPath = join(dir, 'tips.json')
    const want = `${JSON.stringify(tipsFrom(data.phonemes.phonemes), null, 2)}\n`
    if (process.argv.includes('--write-tips')) {
      writeFileSync(tipsPath, want)
      console.log('tips.json escrito')
    } else if (!existsSync(tipsPath) || readFileSync(tipsPath, 'utf8').replace(/\r\n/g, '\n') !== want)
      errors.push('src/sounds/tips.json no está al día con phonemes.json: node scripts/validate-sounds.mjs --write-tips')
  }
  if (jsonBytes > LIMITS.jsonBytes) errors.push(`src/sounds: los JSON pesan ${(jsonBytes / 1024).toFixed(0)} KB (máx. ${LIMITS.jsonBytes / 1024} KB)`)
  for (const w of r.warnings) console.log(`⚠ ${w}`)
  for (const e of errors) console.log(`✗ ${e}`)
  if (!dict) console.log('(sin scripts/data/cmudict.dict: no se comprueban las transcripciones con CMUdict)')
  const s = r.stats
  console.log(`\n${s.phonemes ?? 0} fichas · ${s.lessons ?? 0} lecciones · ${s.exercises ?? 0} ejercicios · ${s.letters ?? 0} letras · ${s.audios ?? 0} audios (${s.audioKB ?? 0} KB) · JSON ${(jsonBytes / 1024).toFixed(0)} KB`)
  console.log(errors.length ? `${errors.length} errores, ${r.warnings.length} avisos` : `OK (${r.warnings.length} avisos)`)
  process.exit(errors.length ? 1 : 0)
}

// Solo se ejecuta como script (los tests importan validateSounds sin lanzar la validación).
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
