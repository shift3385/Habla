// Diálogos con varios interlocutores (NC-06): "A: Hi! B: Hello, how are you? A: Fine." → una línea por persona.

export interface DialogueLine {
  who: string
  text: string
}

// "Nombre:" de 1 a 16 letras al principio o tras un espacio (A:, B:, Anna:, Waiter:, Person A:).
const SPEAKER = /(?:^|\s)((?:Person |Speaker )?[A-Z][A-Za-z]{0,15}):\s/g

/** Si el texto es un diálogo (al menos dos turnos y dos personas distintas), lo divide; si no, null. */
export function splitDialogue(text: string): DialogueLine[] | null {
  const marks = [...text.matchAll(SPEAKER)]
  if (marks.length < 2 || new Set(marks.map((m) => m[1])).size < 2) return null
  const lines: DialogueLine[] = []
  const lead = text.slice(0, marks[0].index).trim()
  if (lead) lines.push({ who: '', text: lead })
  marks.forEach((m, i) => {
    const start = m.index! + m[0].length
    const end = i + 1 < marks.length ? marks[i + 1].index! : text.length
    const t = text.slice(start, end).trim()
    if (t) lines.push({ who: m[1], text: t })
  })
  return lines
}
