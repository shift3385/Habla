import { db, type Profile } from './db'
import { askGemini, withRetry, type JsonSchema, type Models } from './gemini'
import { describeStudent, getProfile } from './profile'
import { STRUCTURE_HINTS } from './teacher'

// Fase 4: plan de 12 semanas y lección del día.
// Gemini crea el esquema de las 12 semanas (un foco por semana) justo después del test, y las 5 lecciones
// de cada semana cuando esa semana empieza: así se adaptan a cómo vas. Las semanas 4, 8 y 12 son de repaso
// y van seguidas del re-test (fase 5); tras cada re-test se rehacen las semanas que aún no empezaste.

export const PLAN_WEEKS = 12
export const LESSONS_PER_WEEK = 5
export const REVIEW_WEEKS = [4, 8, 12]
/** Respuestas mínimas en una clase para que la lección cuente como hecha. */
export const LESSON_MIN_TURNS = 3
const DAY = 86_400_000

export type LessonKind = 'conversation' | 'roleplay' | 'story' | 'debate' | 'describe'

export interface PlanLesson {
  id: string // w3l2 = semana 3, lección 2
  week: number
  n: number // 1–5
  titleEs: string
  kind: LessonKind
  situationEn: string // instrucciones para el profe: papel y situación
  targetEn: string // lo que el profe debe hacer usar al alumno
  phrases: { en: string; es: string }[]
  missionEs: string // objetivo concreto para el alumno
  openerEn: string // primera pregunta del profe
}

export interface PlanWeek {
  n: number // 1–12
  titleEs: string
  focusEn: string
  focusEs: string
  canDoEs: string // "Al final de la semana podrás…"
  themeEn: string
  review: boolean
  lessons?: PlanLesson[] // se generan al empezar la semana
}

export interface StudyPlan {
  createdAt: number
  start: number // medianoche local del día en que empezó el plan
  levelAtStart: string
  weeks: PlanWeek[]
  done: Record<string, { date: number; sessionId: number }>
  adaptedAt?: number // última adaptación tras un re-test
}

// ---------------------------------------------------------------------------
// Calendario

function midnight(ts: number) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Semana del plan en la que estás hoy (1–12; 13 = plan terminado). */
export function currentWeek(plan: StudyPlan, now = Date.now()): number {
  return Math.min(PLAN_WEEKS + 1, Math.floor((midnight(now) - plan.start) / (7 * DAY)) + 1)
}

export function weekDone(plan: StudyPlan, n: number): number {
  return Object.keys(plan.done).filter((id) => id.startsWith(`w${n}l`)).length
}

export function totalDone(plan: StudyPlan): number {
  return Object.keys(plan.done).length
}

export function doneToday(plan: StudyPlan, now = Date.now()): boolean {
  const today = midnight(now)
  return Object.values(plan.done).some((d) => d.date >= today)
}

export interface TodayLesson {
  week: PlanWeek
  lesson: PlanLesson | null // null: las lecciones de esa semana aún no se han generado
  ahead: boolean // la semana actual ya está completa: es de la siguiente
}

/**
 * Lección del día: la primera sin hacer de la semana actual. Si la semana ya está completa, la primera
 * de la siguiente (se puede ir adelantado). Las de semanas pasadas sin hacer se quedan en "Mi plan".
 */
export function todayLesson(plan: StudyPlan, now = Date.now()): TodayLesson | null {
  const cur = currentWeek(plan, now)
  for (const n of [cur, cur + 1]) {
    const week = plan.weeks.find((w) => w.n === n)
    if (!week) continue
    if (!week.lessons) return { week, lesson: null, ahead: n > cur }
    const lesson = week.lessons.find((l) => !plan.done[l.id])
    if (lesson) return { week, lesson, ahead: n > cur }
  }
  return null
}

export function findLesson(plan: StudyPlan, id: string): { week: PlanWeek; lesson: PlanLesson } | null {
  for (const week of plan.weeks) {
    const lesson = week.lessons?.find((l) => l.id === id)
    if (lesson) return { week, lesson }
  }
  return null
}

// ---------------------------------------------------------------------------
// Guardado (dentro del perfil: entra en las copias de seguridad sin cambiar su formato)

export async function getPlan(): Promise<StudyPlan | null> {
  return (await getProfile()).plan ?? null
}

async function savePlan(plan: StudyPlan | undefined) {
  await db.profile.update('me', { plan })
}

export async function markLessonDone(id: string, sessionId: number) {
  const plan = await getPlan()
  if (!plan || plan.done[id]) return
  await savePlan({ ...plan, done: { ...plan.done, [id]: { date: Date.now(), sessionId } } })
}

export async function deletePlan() {
  await savePlan(undefined)
}

// ---------------------------------------------------------------------------
// Generación con Gemini

const SYSTEM =
  'You are an expert English teacher and curriculum designer (CEFR) who builds motivating, realistic speaking courses for adult Spanish speakers.'

function studentBrief(p: Profile, frequent: string[]): string {
  const l = p.levels
  return `- Levels: overall ${l.overall}; grammar ${l.grammar}; reading ${l.reading}; listening ${l.listening}; speaking ${l.speaking}.
- ${describeStudent(p)}
- Weaknesses found in their level test: ${p.weaknesses.length ? p.weaknesses.join('; ') : 'none recorded'}.
- Structures they often get wrong in class: ${frequent.length ? frequent.join('; ') : 'not enough data yet'}.`
}

/** Estructuras que más falla últimamente (de los errores corregidos en clase). */
async function frequentStructures(): Promise<string[]> {
  const recent = await db.mistakes.orderBy('createdAt').reverse().limit(40).toArray()
  const counts = new Map<string, number>()
  for (const m of recent) if (STRUCTURE_HINTS[m.category]) counts.set(m.category, (counts.get(m.category) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => STRUCTURE_HINTS[c as keyof typeof STRUCTURE_HINTS])
}

const WEEKS_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['weeks'],
  properties: {
    weeks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title_es', 'focus_en', 'focus_es', 'can_do_es', 'theme_en'],
        properties: {
          title_es: { type: 'string' },
          focus_en: { type: 'string' },
          focus_es: { type: 'string' },
          can_do_es: { type: 'string' },
          theme_en: { type: 'string' },
        },
      },
    },
  },
}

interface RawWeek {
  title_es: string
  focus_en: string
  focus_es: string
  can_do_es: string
  theme_en: string
}

/** Pide a Gemini las semanas `from`..12. Con `kept`, las anteriores se le pasan como contexto. */
async function generateWeeks(apiKey: string, models: Models, p: Profile, from: number, kept: PlanWeek[]): Promise<PlanWeek[]> {
  const count = PLAN_WEEKS - from + 1
  const frequent = await frequentStructures()
  const before = kept.length
    ? `\nWeeks already done (do not repeat their focus, build on them):\n${kept.map((w) => `- Week ${w.n}: ${w.focusEn}`).join('\n')}\n`
    : ''
  const task = `Design weeks ${from} to ${PLAN_WEEKS} (${count} weeks) of a 12-week English SPEAKING plan for this student.

# Student
${studentBrief(p, frequent)}
${before}
# Rules
- Each week has ONE main language focus (a grammar structure or a communicative function) and a real-life theme connected to the student's reasons for learning and interests.
- Progression: weeks 1-3 fix their weaknesses, weeks 5-7 expand their range, weeks 9-11 build fluency in complex real situations. By week 12 they should be working one step above their current speaking level.
- Weeks 4, 8 and 12 are REVIEW weeks: they mix the focus of the 3 previous weeks (a level re-test follows them). Make that clear in the title.
- "title_es": short Spanish title, max 5 words.
- "focus_en": the target for the teacher, specific (e.g. "Present perfect vs past simple to talk about life experiences").
- "focus_es": the same in simple Spanish for the student.
- "can_do_es": one sentence starting with "Podrás…" describing what they will be able to do.
- "theme_en": the real-life theme of the week.
Return exactly ${count} weeks, in order.`

  const raw = await withRetry({ ...models, timeoutMs: 90_000 }, (model) =>
    askGemini<{ weeks: RawWeek[] }>(apiKey, model, {
      system: SYSTEM,
      contents: [{ role: 'user', parts: [{ text: task }] }],
      schema: WEEKS_SCHEMA,
      temperature: 0.7,
      maxTokens: 6000,
    }),
  )
  const weeks = (raw.weeks ?? []).slice(0, count)
  if (weeks.length < count) throw new Error('Gemini no devolvió el plan completo. Inténtalo de nuevo.')
  return weeks.map((w, i) => {
    const n = from + i
    return {
      n,
      titleEs: String(w.title_es ?? '').trim() || `Semana ${n}`,
      focusEn: String(w.focus_en ?? '').trim(),
      focusEs: String(w.focus_es ?? '').trim(),
      canDoEs: String(w.can_do_es ?? '').trim(),
      themeEn: String(w.theme_en ?? '').trim(),
      review: REVIEW_WEEKS.includes(n),
    }
  })
}

const LESSONS_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['lessons'],
  properties: {
    lessons: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title_es', 'kind', 'situation_en', 'target_en', 'phrases', 'mission_es', 'opener_en'],
        properties: {
          title_es: { type: 'string' },
          kind: { type: 'string', enum: ['conversation', 'roleplay', 'story', 'debate', 'describe'] },
          situation_en: { type: 'string' },
          target_en: { type: 'string' },
          phrases: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['en', 'es'],
              properties: { en: { type: 'string' }, es: { type: 'string' } },
            },
          },
          mission_es: { type: 'string' },
          opener_en: { type: 'string' },
        },
      },
    },
  },
}

interface RawLesson {
  title_es: string
  kind: LessonKind
  situation_en: string
  target_en: string
  phrases: { en: string; es: string }[]
  mission_es: string
  opener_en: string
}

async function generateLessons(apiKey: string, models: Models, p: Profile, plan: StudyPlan, week: PlanWeek): Promise<PlanLesson[]> {
  const frequent = await frequentStructures()
  const previous = plan.weeks.filter((w) => w.n < week.n && w.n >= week.n - 3)
  const task = `Create the ${LESSONS_PER_WEEK} speaking lessons of week ${week.n} of this student's 12-week plan.
Each lesson is a 10-15 minute VOICE conversation with an AI English coach (no reading or writing).

# Student
${studentBrief(p, frequent)}

# This week
- Title: ${week.titleEs}
- Language focus: ${week.focusEn}
- Theme: ${week.themeEn}
- Goal: ${week.canDoEs}${week.review ? `\n- REVIEW week: mix these previous focuses: ${previous.map((w) => w.focusEn).join('; ')}` : ''}

# Rules
- Build up across the week: lesson 1 discovers the focus in a relaxed conversation; lessons 2-3 practise it in everyday situations; lesson 4 is a realistic role-play; lesson 5 is a free challenge (a story, a debate or a longer explanation) using everything.
- Vary the situations and connect them to the student's interests and reasons for learning. Adapt the difficulty to their speaking level (${p.levels.speaking}).
- "title_es": Spanish title, max 6 words.
- "kind": conversation, roleplay, story, debate or describe.
- "situation_en": 2-3 sentences of instructions for the coach: who the coach plays and what situation it is.
- "target_en": exactly what the coach must make the student use, with 1-2 examples.
- "phrases": 3 useful phrases that use the focus, with Spanish translation.
- "mission_es": one concrete, measurable goal for the student in Spanish (e.g. "Cuenta 3 experiencias usando 'I've never…'").
- "opener_en": the coach's first question to start the lesson.`

  const raw = await withRetry({ ...models, timeoutMs: 90_000 }, (model) =>
    askGemini<{ lessons: RawLesson[] }>(apiKey, model, {
      system: SYSTEM,
      contents: [{ role: 'user', parts: [{ text: task }] }],
      schema: LESSONS_SCHEMA,
      temperature: 0.8,
      maxTokens: 6000,
    }),
  )
  const lessons = (raw.lessons ?? []).slice(0, LESSONS_PER_WEEK)
  if (!lessons.length) throw new Error('Gemini no devolvió las lecciones. Inténtalo de nuevo.')
  return lessons.map((l, i) => ({
    id: `w${week.n}l${i + 1}`,
    week: week.n,
    n: i + 1,
    titleEs: String(l.title_es ?? '').trim() || `Lección ${i + 1}`,
    kind: (['conversation', 'roleplay', 'story', 'debate', 'describe'] as const).includes(l.kind) ? l.kind : 'conversation',
    situationEn: String(l.situation_en ?? '').trim(),
    targetEn: String(l.target_en ?? '').trim(),
    phrases: (Array.isArray(l.phrases) ? l.phrases : []).filter((x) => x?.en && x?.es).slice(0, 3),
    missionEs: String(l.mission_es ?? '').trim(),
    openerEn: String(l.opener_en ?? '').trim(),
  }))
}

// Una sola generación a la vez (el Inicio y Mi plan pueden pedirla a la vez).
let busy: Promise<StudyPlan> | null = null
function once(work: () => Promise<StudyPlan>): Promise<StudyPlan> {
  if (!busy) busy = work().finally(() => (busy = null))
  return busy
}

/** Crea el plan (12 semanas + lecciones de la semana 1). */
export function createPlan(apiKey: string, models: Models): Promise<StudyPlan> {
  return once(async () => {
    const p = await getProfile()
    const weeks = await generateWeeks(apiKey, models, p, 1, [])
    const plan: StudyPlan = { createdAt: Date.now(), start: midnight(Date.now()), levelAtStart: p.levels.overall, weeks, done: {} }
    weeks[0].lessons = await generateLessons(apiKey, models, p, plan, weeks[0])
    await savePlan(plan)
    return plan
  })
}

/** Genera las lecciones de una semana si aún no las tiene (la actual, la siguiente o una elegida en Mi plan). */
export function ensureWeekLessons(apiKey: string, models: Models, n: number): Promise<StudyPlan> {
  return once(async () => {
    const p = await getProfile()
    const plan = p.plan
    if (!plan) throw new Error('No hay plan.')
    const week = plan.weeks.find((w) => w.n === n)
    if (!week || week.lessons) return plan
    const lessons = await generateLessons(apiKey, models, p, plan, week)
    const next: StudyPlan = { ...plan, weeks: plan.weeks.map((w) => (w.n === n ? { ...w, lessons } : w)) }
    await savePlan(next)
    return next
  })
}

/**
 * Tras un re-test (fase 5): rehace las semanas que aún no empezaste con tu nuevo nivel y tus nuevas debilidades.
 * Las semanas con alguna lección hecha (y la actual) se conservan.
 */
export function adaptPlanAfterTest(apiKey: string, models: Models): Promise<StudyPlan> {
  return once(async () => {
    const p = await getProfile()
    const plan = p.plan
    if (!plan) throw new Error('No hay plan.')
    const cur = currentWeek(plan)
    const from = Math.max(cur + 1, ...plan.weeks.filter((w) => weekDone(plan, w.n) > 0).map((w) => w.n + 1))
    if (from > PLAN_WEEKS) return plan
    const kept = plan.weeks.filter((w) => w.n < from)
    const fresh = await generateWeeks(apiKey, models, p, from, kept)
    const next: StudyPlan = { ...plan, weeks: [...kept, ...fresh], adaptedAt: Date.now() }
    await savePlan(next)
    return next
  })
}

// ---------------------------------------------------------------------------
// Instrucciones para el profe en una lección del plan

export function lessonBrief(week: PlanWeek, lesson: PlanLesson): string {
  return `This is lesson ${lesson.n} of week ${week.n} of the student's 12-week speaking plan ("${week.titleEs}").
Situation: ${lesson.situationEn}
Language focus of the week: ${week.focusEn}.
Target for this lesson: ${lesson.targetEn}
Create many natural chances for the student to use the target (ask questions that require it). When they make a mistake with the target, give that correction priority. Encourage these phrases: ${lesson.phrases.map((x) => `"${x.en}"`).join(', ')}.
The student's mission (shown on their screen): ${lesson.missionEs}
Start with this question (or a close variation): "${lesson.openerEn}"`
}

export const KIND_ES: Record<LessonKind, string> = {
  conversation: 'Conversación',
  roleplay: 'Role-play',
  story: 'Historia',
  debate: 'Debate',
  describe: 'Describir',
}
