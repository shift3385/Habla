import { db, type StudentFact } from './db'

// 5.12 (P-11 de A5) «Lo que recuerda tu profe»: al terminar la clase, el informe (fluency.ts) devuelve 0–3 datos
// personales breves en español («El viernes tiene una entrevista de trabajo», «Su nieta se llama Ana»). Se guardan solo
// en este teléfono (tabla Dexie `facts`, máx. 20: los más antiguos salen), se ven, se editan y se borran en Ajustes, y
// viajan en las copias (son datos del alumno, no claves). El profe recibe los 5 más recientes en su prompt y PUEDE
// preguntar por uno al empezar (teacher.ts). Nada sensible: el prompt del informe lo prohíbe y aquí se filtra otra vez.

/** Datos que se guardan como mucho (al pasar, salen los más antiguos). */
export const MAX_FACTS = 20
/** Los que recibe el profe en cada clase (los más recientes). */
export const PROMPT_FACTS = 5
/** Los que puede apuntar el informe de una clase. */
export const NEW_FACTS_PER_CLASS = 3
/** Largo máximo de un dato (una frase corta). */
export const FACT_MAX = 120

/**
 * Red de seguridad para lo que el prompt ya prohíbe: salud, dinero, política, religión (y sexualidad). Si un dato las
 * toca, no se guarda. Mejor perder un dato inocente («va al médico el lunes») que guardar uno sensible.
 */
const SENSITIVE = new RegExp(
  [
    // salud (ir «al médico» como paciente; «su hija es médica» sí se guarda)
    'salud', 'enferm', 'hospital', 'c[áa]ncer', 'diagn[óo]stic', 'tratamiento', 'medicamento', 'pastilla', 'operaci[óo]n',
    'cirug[ií]a', 'embaraz', 'depresi', 'ansiedad', 'terapia', 'psiquiatr', '(?:al|del|el|la) m[ée]dic[oa]', 'cita m[ée]dica',
    // dinero
    'dinero', 'deuda', 'sueldo', 'salario', 'hipoteca', 'pr[ée]stamo', 'ahorros', '\\bbanco\\b',
    // política y religión
    'pol[ií]tic', '\\bvot[aoeé]', 'elecciones', 'religi', 'iglesia', '\\bmisa\\b', '\\bdios\\b', 'mezquita', 'sinagoga',
    // sexualidad
    'sexual',
  ].join('|'),
  'i',
)

/** Una línea, sin comillas dobles ni marcas que abran secciones del prompt, y con tope. '' si no es texto. */
export function cleanFact(s: unknown): string {
  if (typeof s !== 'string') return ''
  const t = s
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/["“”]/g, "'")
    .replace(/^[\s#>*\-•]+/, '')
    .replace(/ {2,}/g, ' ')
    .trim()
  return t.length > FACT_MAX ? t.slice(0, FACT_MAX - 1).trimEnd() + '…' : t
}

export const isSensitive = (s: string) => SENSITIVE.test(s)

/** Clave para comparar dos datos (sin mayúsculas, acentos ni puntuación). */
const key = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Los datos nuevos que devuelve el informe, listos para guardar: texto limpio, nada sensible, sin repetir los que ya se
 * recuerdan ni entre sí, y como mucho 3. Lo que no sea texto se ignora.
 */
export function newFacts(raw: unknown, known: readonly string[] = []): string[] {
  const seen = new Set(known.map(key))
  const out: string[] = []
  for (const x of Array.isArray(raw) ? raw : []) {
    const t = cleanFact(x)
    if (t.length < 4 || isSensitive(t) || seen.has(key(t))) continue
    seen.add(key(t))
    out.push(t)
    if (out.length >= NEW_FACTS_PER_CLASS) break
  }
  return out
}

/** Ids que sobran para quedarse con los `max` más recientes (por fecha de creación). */
export function overflowIds(rows: readonly Pick<StudentFact, 'id' | 'createdAt'>[], max = MAX_FACTS): number[] {
  return [...rows]
    .sort((a, b) => b.createdAt - a.createdAt || (b.id ?? 0) - (a.id ?? 0))
    .slice(max)
    .map((r) => r.id!)
    .filter((id) => id != null)
}

/** Los `n` más recientes (los que recibe el profe), del más nuevo al más antiguo. */
export function latestFacts(rows: readonly StudentFact[], n = PROMPT_FACTS): string[] {
  return [...rows]
    .sort((a, b) => b.createdAt - a.createdAt || (b.id ?? 0) - (a.id ?? 0))
    .slice(0, n)
    .map((r) => cleanFact(r.text))
    .filter(Boolean)
}

// --- Base de datos ----------------------------------------------------------------------------------------------

/** Todos los datos, del más nuevo al más antiguo. */
export async function listFacts(): Promise<StudentFact[]> {
  return (await db.facts.orderBy('createdAt').reverse().toArray()).filter((f) => f.text)
}

/** Lo que recibe el profe en esta clase. */
export async function factsForPrompt(): Promise<string[]> {
  return latestFacts(await db.facts.toArray())
}

/** Guarda los datos nuevos de una clase (ya limpios) y recorta a los 20 más recientes. Devuelve lo guardado. */
export async function rememberFacts(raw: unknown, sessionId?: number, now = Date.now()): Promise<string[]> {
  const known = (await db.facts.toArray()).map((f) => f.text)
  const fresh = newFacts(raw, known)
  if (!fresh.length) return []
  // Mismo orden que los dio el informe; milisegundos distintos para que el orden sea estable.
  await db.facts.bulkAdd(fresh.map((text, i) => ({ text, createdAt: now + i, ...(sessionId ? { sessionId } : {}) })))
  const extra = overflowIds(await db.facts.toArray())
  if (extra.length) await db.facts.bulkDelete(extra)
  return fresh
}

/** Cambia un dato. Vacío = se borra. Un texto sensible no se guarda (devuelve false). */
export async function editFact(id: number, text: string): Promise<boolean> {
  const t = cleanFact(text)
  if (!t) {
    await db.facts.delete(id)
    return true
  }
  if (isSensitive(t)) return false
  await db.facts.update(id, { text: t, updatedAt: Date.now() })
  return true
}

export const deleteFact = (id: number) => db.facts.delete(id)
export const deleteAllFacts = () => db.facts.clear()
