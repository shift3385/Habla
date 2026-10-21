/**
 * 5.11 (M-06, P-06 de A5 / R-01): variedad en el turno del profe. Antes el prompt decía «ALWAYS end your reply with
 * exactly one open question» y cada turno era una pregunta. Ahora ~70 % de los turnos siguen siendo una pregunta y ~30 %
 * una reacción + un mini-reto («dime 3 razones», «cuéntamelo como un chisme», «corrige mi frase»…).
 *
 * La decisión se toma AQUÍ, en código, y no al azar del modelo: es determinista (turno + semilla de la sesión), así que una
 * clase retomada sigue igual y los tests pueden medirla. Reglas: el primer turno siempre es pregunta; nunca dos retos
 * seguidos; nunca el mismo reto dos veces seguidas. 0 llamadas extra a Gemini: solo se añade una línea al prompt del turno.
 * No se usa en la clase de Gramática (GRAMMAR_OVERRIDES manda: el turno acaba con la siguiente tarea), ni en el test de
 * nivel ni en «Dilo tú» (tienen sus propios prompts, que no pasan por aquí).
 */

export type TurnStyle = 'question' | 'react-challenge'

export interface Challenge {
  id: string
  /** Lo que se le pide al profe (inglés, va al prompt). */
  en: string
  /** Para documentación y pruebas. */
  es: string
}

/** Mini-retos (≥ 6). Todos se dicen como una orden corta, sin signo de interrogación. */
export const CHALLENGES: readonly Challenge[] = [
  { id: 'three-reasons', en: 'ask for three reasons, e.g. "Give me three reasons why…"', es: 'Dime 3 razones' },
  { id: 'gossip', en: 'ask them to tell it again like juicy gossip to a friend, e.g. "Tell it to me like gossip!"', es: 'Cuéntamelo como un chisme' },
  {
    id: 'fix-my-sentence',
    en: 'say ONE short sentence about the topic with one typical learner mistake and ask them to fix it, e.g. "Fix my sentence: …"',
    es: 'Corrige mi frase',
  },
  { id: 'convince-me', en: 'take the opposite view in a few words and ask them to convince you, e.g. "Convince me!"', es: 'Convénceme' },
  { id: 'explain-child', en: 'ask them to explain it as if you were a ten-year-old child', es: 'Explícaselo a un niño de 10 años' },
  { id: 'imagine', en: 'give a short "imagine that…" situation about the topic and ask them to say what they would do', es: 'Imagina que… y dime qué harías' },
  { id: 'compare', en: 'give two options related to the topic and ask them to pick one and compare both', es: 'Compara dos opciones y elige' },
  { id: 'describe', en: 'ask them to describe something from their answer in detail, as if you could not see it', es: 'Descríbemelo como si no lo viera' },
]

/** Probabilidad de reto tras una pregunta. Como tras un reto siempre va pregunta, la proporción final es p / (1 + p) = 30 %. */
const P_CHALLENGE = 3 / 7

/** Hash entero → [0, 1) (mulberry32 de un paso): rápido, sin estado y estable entre plataformas. */
function unit(seed: number, i: number, salt: number): number {
  let t = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b) ^ Math.imul(salt, 0xc2b2ae35)) >>> 0
  t = (t + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export interface TurnPlan {
  style: TurnStyle
  /** Solo en `react-challenge`. */
  challenge?: Challenge
}

/** Los `count` primeros turnos de una sesión (el 0 es el saludo del profe). */
export function planTurns(count: number, seed: number): TurnPlan[] {
  const out: TurnPlan[] = []
  let lastChallenge = -1
  for (let i = 0; i < count; i++) {
    const prev = out[i - 1]
    if (i === 0 || prev.style === 'react-challenge' || unit(seed, i, 1) >= P_CHALLENGE) {
      out.push({ style: 'question' })
      continue
    }
    // Uno de los demás retos (nunca el mismo que el último).
    let k = Math.floor(unit(seed, i, 2) * (CHALLENGES.length - (lastChallenge < 0 ? 0 : 1)))
    if (lastChallenge >= 0 && k >= lastChallenge) k++
    lastChallenge = k
    out.push({ style: 'react-challenge', challenge: CHALLENGES[k] })
  }
  return out
}

/** Estilo del turno `turnIndex` (0 = saludo) de la sesión `seed`. */
export function turnStyle(turnIndex: number, seed: number): TurnStyle {
  return turnPlan(turnIndex, seed).style
}

export function turnPlan(turnIndex: number, seed: number): TurnPlan {
  const i = Math.max(0, Math.floor(turnIndex) || 0)
  return planTurns(i + 1, seed)[i]
}

/**
 * Instrucción que se añade al prompt de ESTE turno, o '' si el turno es una pregunta (el prompt base ya lo pide: así los
 * turnos de pregunta, el test, «Dilo tú» y la Gramática quedan idénticos a la 5.10.1).
 */
export function turnInstruction(plan: TurnPlan): string {
  if (plan.style !== 'react-challenge' || !plan.challenge) return ''
  return `# This turn only (it overrides "ALWAYS end your reply with exactly one open question")
- Do NOT ask a question in this reply and do not use a question mark.
- First react to what the student just said with genuine interest, surprise or humor (1-2 short sentences).
- Then end with this mini-challenge, said as one short, friendly instruction adapted to today's topic and the student's level: ${plan.challenge.en}.
- If heard_speech is false, ignore this section and just ask the student to repeat.`
}

/**
 * Lo que la clase añade al prompt del turno: '' en la clase de Gramática (GRAMMAR_OVERRIDES: acaba con la siguiente
 * tarea) y en los turnos de pregunta; la instrucción del reto en los demás.
 */
export function turnNoteFor(opts: { grammarClass: boolean; turnIndex: number; seed: number }): string {
  return opts.grammarClass ? '' : turnInstruction(turnPlan(opts.turnIndex, opts.seed))
}
