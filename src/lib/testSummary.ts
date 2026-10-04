import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { BankQuestion } from './bank'
import type { CalibrationRecord, Skill } from './db'
import { overallBreakdown } from './levels'
import type { BlockResult, GrammarAnswer } from './placement'

// Resumen final de cada test (se guarda con el test y se puede abrir y guardar como archivo cuando quieras).

export interface SummaryRow {
  prompt: string
  given: string
  correct: string
  ok: boolean
  late?: boolean
}

export interface SummarySection {
  section: 'grammar' | 'reading' | 'listening'
  title: string // "Gramática", "Lectura · B1 · The climber who started at sixty"…
  ok: number
  total: number
  rows: SummaryRow[]
}

export interface TestSummary {
  sections: SummarySection[]
  speaking: { level: string; criteria?: Record<string, string>; reasons?: Record<string, string> }
}

const answerText = (q: BankQuestion, v: number | string | null) =>
  v === null || v === -1 || v === '' ? 'No sé' : typeof v === 'number' && q.format === 'mc' ? q.options[v] : String(v)
const rightText = (q: BankQuestion) => (q.format === 'mc' ? q.options[q.key] : q.accepted[0])

export function buildSummary(
  grammar: GrammarAnswer[],
  blocks: { reading: BlockResult[]; listening: BlockResult[] },
  speaking: TestSummary['speaking'],
): TestSummary {
  const sections: SummarySection[] = [
    {
      section: 'grammar',
      title: 'Gramática',
      ok: grammar.filter((a) => a.correct).length,
      total: grammar.length,
      rows: grammar.map((g) => ({
        prompt: g.item.format === 'short' ? `${g.item.prompt} (${g.item.hint})` : g.item.prompt,
        given: g.unknown ? 'No sé' : g.item.format === 'mc' ? g.item.options[g.value as number] : String(g.value),
        correct: g.item.format === 'mc' ? g.item.options[g.item.key] : g.item.accepted[0],
        ok: g.correct,
      })),
    },
  ]
  for (const kind of ['reading', 'listening'] as const)
    blocks[kind].forEach((b, n) => {
      const name = kind === 'reading' ? `Lectura · texto ${n + 1}` : `Audición · audio ${n + 1}`
      const title = b.item.skill === 'reading' ? `${name} · ${b.level} · ${b.item.title}` : `${name} · ${b.level} · ${b.item.title}`
      sections.push({
        section: kind,
        title,
        ok: b.correct.filter(Boolean).length,
        total: b.correct.length,
        rows: b.item.questions.map((q, qi) => ({
          prompt: q.prompt,
          given: answerText(q, b.answers[qi]),
          correct: rightText(q),
          ok: b.correct[qi],
          late: b.late?.[qi] || undefined,
        })),
      })
    })
  return { sections, speaking }
}

/** Aciertos de una parte (sumando sus bloques). */
export function partScore(s: TestSummary, section: SummarySection['section']) {
  const list = s.sections.filter((x) => x.section === section)
  return { ok: list.reduce((a, x) => a + x.ok, 0), total: list.reduce((a, x) => a + x.total, 0) }
}

/** Mini resumen de una línea: "Gramática 14/20 · Lectura 9/12 · Audición 8/12 · Habla B1". */
export function miniSummary(rec: CalibrationRecord): string {
  const s = rec.summary
  if (!s) {
    const g = rec.grammarAnswers ?? []
    return g.length ? `Gramática ${g.filter((a) => a.correct).length}/${g.length} · resumen completo no disponible (test anterior)` : 'Resumen no disponible (test anterior)'
  }
  const p = (k: SummarySection['section']) => partScore(s, k)
  return `Gramática ${p('grammar').ok}/${p('grammar').total} · Lectura ${p('reading').ok}/${p('reading').total} · Audición ${p('listening').ok}/${p('listening').total} · Habla ${s.speaking.level}`
}

const SKILL_ES: Record<Skill, string> = { grammar: 'Gramática', reading: 'Lectura', listening: 'Audición', speaking: 'Habla' }
const CRIT_ES: Record<string, string> = { fluency: 'Fluidez y coherencia', vocabulary: 'Vocabulario', grammar: 'Precisión gramatical', pronunciation: 'Pronunciación' }

/** El resumen como texto (para guardarlo o compartirlo). */
export function summaryText(rec: CalibrationRecord): string {
  const date = new Date(rec.date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
  const b = overallBreakdown(rec.levels as Record<Skill, string>)
  const skills = ['grammar', 'reading', 'listening', 'speaking'] as const
  const out: string[] = [
    `HABLA · Resumen del test de nivel (${date})`,
    '',
    `Nivel general: ${rec.levels.overall}`,
    `Fórmula: (${skills.map((k) => b.values[k]).join(' + ')}) / 4 = ${b.mean.toFixed(2).replace('.', ',')} → ${b.final}${b.capped ? ' (con tope por destreza débil)' : ''}`,
    '',
    ...skills.map((k) => `${SKILL_ES[k]}: ${rec.levels[k]}${rec.confidence?.[k] ? ` (confianza ${{ high: 'alta', medium: 'media', low: 'baja' }[rec.confidence[k]!]})` : ''}`),
  ]
  const s = rec.summary
  if (s) {
    out.push('', 'HABLA (mediana de 4 criterios)')
    for (const [k, v] of Object.entries(s.speaking.criteria ?? {})) out.push(`- ${CRIT_ES[k] ?? k}: ${v}${s.speaking.reasons?.[k] ? ` · ${s.speaking.reasons[k]}` : ''}`)
  }
  if (rec.strengthsEs?.length) out.push('', 'Lo que haces bien', ...rec.strengthsEs.map((x) => `- ${x}`))
  if (rec.weaknessesEs?.length) out.push('', 'Qué trabajar', ...rec.weaknessesEs.map((x) => `- ${x}`))
  if (s)
    for (const sec of s.sections) {
      out.push('', `${sec.title.toUpperCase()} · ${sec.ok}/${sec.total}`)
      sec.rows.forEach((r, i) => {
        out.push(`${i + 1}. ${r.prompt}`)
        out.push(`   ${r.ok ? '✓' : '✗'} Tu respuesta: ${r.late ? 'No sé (respondida tras cerrar la nota)' : r.given}${r.ok ? '' : ` · Correcta: ${r.correct}`}`)
      })
    }
  return out.join('\n')
}

/** Guarda el resumen en Documentos/Habla y abre Compartir (o lo descarga en el navegador). Devuelve dónde quedó. */
export async function saveSummaryFile(rec: CalibrationRecord): Promise<string | undefined> {
  const text = summaryText(rec)
  const fileName = `habla-test-${new Date(rec.date).toISOString().slice(0, 10)}.txt`
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    return fileName
  }
  let saved: string | undefined
  try {
    await Filesystem.writeFile({ path: `Habla/${fileName}`, data: text, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true })
    saved = `Documentos/Habla/${fileName}`
  } catch {
    // Algunas versiones de Android no lo permiten; queda Compartir.
  }
  try {
    const cached = await Filesystem.writeFile({ path: fileName, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: 'Resumen de mi test de Habla', files: [cached.uri] })
  } catch {
    // El usuario cerró Compartir: no pasa nada.
  }
  return saved
}
