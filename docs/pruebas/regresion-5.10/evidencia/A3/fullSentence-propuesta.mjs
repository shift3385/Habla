// PROPUESTA A3 (regresión 5.10, 2026-10-20) para fullSentence() de src/lib/grammar.ts. NO es código de la app.
// Problema (REG-A3-01): la «frase completa» que se enseña con ▶ tras cada ejercicio, que se lee con la voz inglesa y que
// se guarda como `answerEn` de la tarjeta del Repaso arrastra la pista final «(can, negativa)», «(de ella)», el prefijo
// «frase en español» → y la separación «I 'll». Afecta a 94 de 667 ejercicios (91 los arregla esta función y 3 el contenido).
// Uso: node docs/pruebas/regresion-5.10/evidencia/A3/fullSentence-propuesta.mjs  (desde la raíz del repo)
import fs from 'node:fs'

const GAP = /_{3,}/g
const QUESTION_START = /^(do|does|did|is|are|was|were|have|has|had|can|could|should|will|would|may|might|must|what|where|when|who|whose|why|how|which)\b/i
const gapCount = (p) => (p.match(GAP) ?? []).length

export function fullSentence(ex) {
  if (ex.type === 'order') return /[.!?]$/.test(ex.answer) ? ex.answer : ex.answer + (QUESTION_START.test(ex.answer) ? '?' : '.')
  const parts = ex.type === 'choice' ? [ex.options[ex.answer]] : ex.answers[0].split(' / ')
  if (!gapCount(ex.prompt)) return ex.type === 'choice' ? ex.options[ex.answer] : ex.prompt
  // A3: enunciado-pregunta («… means: ____», «Which sentence…? ____»): la frase es la opción correcta, sin el enunciado.
  if (ex.type === 'choice' && /[:?]\s*_{3,}\s*$/.test(ex.prompt)) return ex.options[ex.answer]
  const fill = parts.length === 1 && gapCount(ex.prompt) > 1 ? parts[0].split(' / ') : parts
  let k = 0
  return ex.prompt
    .replace(/^«[^»]*»\s*→\s*/, '') // A3: «Deberías dormir más.» → … / «I'm hungry.» → …
    .replace(/^[^→«]*[.?!]\s*→\s*/, '') // A3: «If you don't practice, you won't improve. → …»
    .replace(/_{3,}(\s*\([^)]*\))?/g, () => fill[Math.min(k++, fill.length - 1)] ?? '')
    .replace(/\s*\([^)]*\)\s*$/, '') // A3: pista al final del enunciado: «(can, negativa)», «(de ella)», «(make o do)»
    .replace(/(\w)\s+'(ll|d|m|re|ve|s)\b/g, "$1'$2") // A3: opción «'ll» en «I ____ get it» → «I'll get it»
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const shown = new Set(process.argv.slice(2))
  let left = 0
  for (const f of fs.readdirSync('src/grammar')) {
    const s = JSON.parse(fs.readFileSync('src/grammar/' + f, 'utf8'))
    for (const t of s.topics)
      for (const x of t.exercises) {
        const out = fullSentence(x)
        const suspicious = /[«»→¿¡ɪ]|\(|\w\s'|means:|Which sentence|Which verb/.test(out) || /[áéíóúñ]/.test(out.replace(/Tomás|Ramón|Díaz|Bogotá|Cancún|café/g, ''))
        if (suspicious) left++
        if (suspicious || shown.has(x.id)) console.log((suspicious ? '!! ' : '   ') + x.id.padEnd(40) + ' | ' + out)
      }
  }
  console.log(`Quedan ${left} frases sospechosas.`)
}
