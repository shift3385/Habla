// Lo que tu mascota te va contando en el Inicio, en globos que aparecen y se van (sin ocupar sitio en la pantalla).
// Dos tipos, que se activan por separado en Ajustes → Tema y mascota:
//  - Avisos: lo de hoy (clase a medias, lección, meta, repaso, racha, test). Lo que pide acción va primero.
//  - Consejos: cómo sacarle partido a la app y qué significa cada nota. Siguen por donde se quedaron la vez anterior.

export type TipAction = 'resume' | 'lesson' | 'review' | 'notif'

export interface Tip {
  id: string
  text: string
  /** Si lo hay, tocar el globo lo hace (seguir la clase, empezar la lección, abrir el repaso). */
  action?: TipAction
  /** Texto del botón que va dentro del globo cuando hay acción. */
  cta?: string
  /** 5.11 (M-09): qué redacción es (grupo e índice). `noteTipShown` la apunta cuando el globo se muestra. */
  variant?: { group: string; index: number }
}

export interface TipInput {
  minutesToday: number
  goal: number
  streak: number
  dueCards: number
  savedTitle?: string
  lessonTitle?: string
  lessonDone: boolean
  liveTopics: boolean
  /** Días hasta poder repetir el test (0 o menos: ya se puede); null si no hay test hecho. */
  retestDays: number | null
  /** AUD-FLU-900: el recordatorio está activado, pero Android no deja enviar avisos. */
  remindersBlocked?: boolean
  /** 5.11 (M-04): ayer fue tu día de descanso (comodín de la racha): la mascota te lo cuenta. Opcional. */
  restedYesterday?: boolean
}

const short = (s: string, max = 40) => (s.length > max ? s.slice(0, max - 2).trimEnd() + '…' : s)
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

// 5.11 (M-09, P-09 de A5): cada aviso tiene 3–4 redacciones. Se elige una que no sea ninguna de las dos últimas
// MOSTRADAS (se recuerdan en este teléfono al mostrarse el globo, `noteTipShown`), así nunca sale la misma dos veces
// seguidas. REV-11-D1-05: la elección es fija durante una «ronda» (desde que se abre la app, o hasta `newTipRound()`):
// Home recalcula los avisos muchas veces mientras llegan los datos y un globo abierto no puede cambiar de texto.
const faltan = (n: number) => plural(n, 'falta 1 minuto', `faltan ${n} minutos`)
const frases = (n: number) => `${n} ${plural(n, 'frase', 'frases')}`
export const NOTICE_VARIANTS = {
  goalNone: [
    (goal: number) => `Aún no has hablado hoy. ¿Hacemos tus ${goal} minutos?`,
    (goal: number) => `Hoy todavía no hemos charlado. Con ${goal} minutos ya cumples tu meta.`,
    (goal: number) => `¿Charlamos un rato? Tu meta de hoy son ${goal} minutos.`,
    (goal: number) => `Tu inglés te espera: ${goal} minutos y la meta de hoy es tuya.`,
  ],
  goalSome: [
    (mins: number, goal: number) => `Hoy llevas ${mins} de ${goal} min. Te ${faltan(goal - mins)} para tu meta.`,
    (mins: number, goal: number) => `¡Vas bien! ${mins} de ${goal} min hoy; solo te ${faltan(goal - mins)}.`,
    (mins: number, goal: number) => `Ya hablaste ${mins} min hoy. Con ${plural(goal - mins, '1 minuto', `${goal - mins} minutos`)} más cumples tu meta.`,
    (mins: number, goal: number) => `Queda poco: te ${faltan(goal - mins)} para llegar a tus ${goal} minutos de hoy.`,
  ],
  goalDone: [
    () => '¡Meta de hoy cumplida! Lo que hables de más también suma.',
    () => '¡Lo lograste! Hoy ya cumpliste tu meta. Si quieres, seguimos un poco más.',
    () => 'Meta cumplida por hoy. Cada minuto de más es un regalo para tu inglés.',
  ],
  review: [
    (n: number) => `Tienes ${frases(n)} para decir hoy en el repaso.`,
    (n: number) => `Hay ${frases(n)} esperándote en el repaso. ¿Las dices en voz alta?`,
    (n: number) => `Tu repaso de hoy: ${frases(n)}. Unos minutos y no se te olvidan.`,
    (n: number) => `Repasa hoy ${n === 1 ? 'tu frase' : `tus ${n} frases`} y se te quedarán mejor.`,
  ],
  streak: [
    (n: number, today: boolean) => `¡Llevas ${n} días seguidos practicando! ${today ? 'Hoy ya cuenta.' : 'Habla hoy y no rompas la racha.'}`,
    (n: number, today: boolean) => `Racha de ${n} días. ¡Qué constancia! ${today ? 'Hoy ya cuenta.' : 'Habla hoy y sigue sumando.'}`,
    (n: number, today: boolean) => `${n} días seguidos: tu inglés lo nota. ${today ? 'Hoy ya cuenta.' : '¿Sumamos uno más hoy?'}`,
    (n: number, today: boolean) => `¡${n} días sin fallar! ${today ? 'Hoy ya está sumado.' : 'Habla hoy y no rompas la racha.'}`,
  ],
  streakStart: [
    () => 'Un poco cada día y empezamos una racha. ¡La llama de arriba cuenta tus días seguidos!',
    () => 'La llama de arriba cuenta tus días seguidos. ¿Empezamos una racha hoy?',
    () => 'Habla un poco cada día y verás crecer la llama de arriba. Un día de descanso por semana no la rompe.',
  ],
  // 5.11 (M-04): el comodín de la racha, contado al día siguiente (riesgo «¿por qué no subió mi racha?»).
  rested: [
    (today: boolean) => `Ayer descansaste; tu racha sigue a salvo. ${today ? 'Hoy ya cuenta.' : 'Habla hoy y sigue sumando.'}`,
    (today: boolean) => `Ayer descansaste; tu racha sigue a salvo: un día de descanso por semana no la rompe. ${today ? 'Hoy ya cuenta.' : '¿Hablamos hoy?'}`,
    (today: boolean) => `Ayer fue tu día de descanso y tu racha sigue a salvo. ${today ? 'Hoy ya suma.' : 'Eso sí: dos días seguidos sin hablar la rompen.'}`,
  ],
} as const

const VARIANT_KEY = 'habla.tipVariants'

function readRecent(): Record<string, number[]> {
  try {
    const v = JSON.parse(localStorage.getItem(VARIANT_KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {} // sin almacenamiento: sin memoria
  }
}

/** La ronda actual: una semilla y lo mostrado hasta su inicio (no cambia aunque se muestren globos durante ella). */
let round: { seed: number; recent: Record<string, number[]> } | null = null

/**
 * 5.11 (REV-11-D1-05): empieza otra ronda de redacciones (p. ej. al volver al Inicio). Sin llamarla, la ronda dura lo
 * que la app abierta. `seed` en [0, 1) solo para los tests.
 */
export function newTipRound(seed = Math.random()) {
  round = { seed, recent: readRecent() }
}

/** Índice de la redacción en esta ronda: sin repetir ninguna de las dos últimas mostradas de este aviso. Estable. */
export function pickVariant(group: string, count: number): number {
  round ??= { seed: Math.random(), recent: readRecent() }
  const last = round.recent[group]
  const recent = Array.isArray(last) ? last.slice(0, Math.min(2, count - 1)) : []
  const free = Array.from({ length: count }, (_, k) => k).filter((k) => !recent.includes(k))
  const list = free.length ? free : Array.from({ length: count }, (_, k) => k)
  return list[Math.floor(round.seed * list.length) % list.length]
}

/** Apunta la redacción mostrada (la llama `noteTipShown`). No cambia la ronda en curso. */
function noteVariantShown(v: { group: string; index: number }) {
  const all = readRecent()
  const prev = Array.isArray(all[v.group]) ? all[v.group] : []
  all[v.group] = [v.index, ...prev.filter((k) => k !== v.index)].slice(0, 2)
  try {
    localStorage.setItem(VARIANT_KEY, JSON.stringify(all))
  } catch {
    // sin almacenamiento: no pasa nada
  }
}

const variant = <A extends unknown[]>(group: keyof typeof NOTICE_VARIANTS, ...args: A): Pick<Tip, 'text' | 'variant'> => {
  const list = NOTICE_VARIANTS[group] as readonly ((...a: A) => string)[]
  const index = pickVariant(group, list.length)
  return { text: list[index](...args), variant: { group, index } }
}

/** Avisos de hoy, en orden de importancia. */
export function buildTips(i: TipInput): Tip[] {
  const tips: Tip[] = []
  if (i.remindersBlocked) {
    tips.push({ id: 'notif', text: 'Tu recordatorio diario está activado, pero Android no me deja avisarte.', action: 'notif', cta: 'Ver cómo arreglarlo' })
  }
  if (i.savedTitle) tips.push({ id: 'saved', text: `Tienes una clase a medias: «${short(i.savedTitle)}».`, action: 'resume', cta: 'Seguir la clase' })
  if (i.lessonTitle && !i.lessonDone) tips.push({ id: 'lesson', text: `Hoy te espera la lección «${short(i.lessonTitle)}».`, action: 'lesson', cta: 'Empezar la lección' })

  const mins = Math.floor(i.minutesToday)
  if (mins <= 0) tips.push({ id: 'goal', ...variant('goalNone', i.goal) })
  else if (mins < i.goal) tips.push({ id: 'goal', ...variant('goalSome', mins, i.goal) })
  else tips.push({ id: 'goal', ...variant('goalDone') })

  if (i.dueCards > 0) tips.push({ id: 'review', ...variant('review', i.dueCards), action: 'review', cta: 'Repasar ahora' })

  if (i.restedYesterday && i.streak >= 1) tips.push({ id: 'streak', ...variant('rested', mins > 0) })
  else if (i.streak >= 2) tips.push({ id: 'streak', ...variant('streak', i.streak, mins > 0) })
  else tips.push({ id: 'streak', ...variant('streakStart') })

  if (i.retestDays !== null && i.retestDays <= 7) {
    const d = Math.max(0, Math.ceil(i.retestDays))
    tips.push({
      id: 'retest',
      text:
        d === 0
          ? '¡Ya puedes repetir el test de nivel y ver cuánto has avanzado! Está en Ajustes → Mi nivel.'
          : d === 1
            ? 'Mañana ya podrás repetir el test de nivel para comprobar cuánto has avanzado.'
            : `En ${d} días podrás repetir el test de nivel para comprobar cuánto has avanzado.`,
    })
  }

  if (i.liveTopics) tips.push({ id: 'live', text: 'Los temas con puntito traen noticias reales y recientes: hablamos de lo que pasa hoy.' })
  return tips
}

export interface AdviceInput {
  /** Ya dijo para qué quiere el inglés (en su perfil). */
  hasPurpose: boolean
  /** Tiene configurada la fonética de Azure. */
  hasAzure: boolean
  /**
   * 5.10.1 (UX-04): tu meta de velocidad (fluency.ts › speakingGoal) y su nivel. Sin ella, el consejo no da cifra
   * (antes decía «ronda las 120», distinta de la del informe y de la nota).
   */
  wpmGoal?: { level: string; wpm: number }
}

/** Consejos de uso: qué significa cada nota, dónde se cambia cada cosa y trucos de la clase. */
export function buildAdvice(i: AdviceInput): Tip[] {
  const a: Tip[] = []
  if (!i.hasPurpose) a.push({ id: 'a-purpose', text: 'Aún no me has dicho para qué quieres el inglés. Cuéntamelo en Ajustes → Mi perfil y datos y adapto tus clases.' })
  a.push(
    { id: 'a-topics', text: '¿Quieres cambiar tus 3 temas del Inicio? Toca «Más temas» → «Cambiar mis 3 temas», o ve a Ajustes → Mi perfil y datos.' },
    { id: 'a-score', text: 'Al terminar cada clase verás tu nota de fluidez (0–100): mezcla tu velocidad, lo largas que son tus respuestas, las pausas y la precisión.' },
    {
      id: 'a-ppm',
      text: i.wpmGoal
        ? `«ppm» son las palabras por minuto que dices. Para tu nivel (${i.wpmGoal.level}), la meta es unas ${i.wpmGoal.wpm}: la ves en el informe de cada clase.`
        : '«ppm» son las palabras por minuto que dices. Tu meta, según tu nivel, sale en el informe de cada clase.',
    },
    { id: 'a-pauses', text: 'Las «pausas» que te cuento son silencios de más de 1 segundo en medio de tu respuesta. Menos pausas, más fluidez.' },
    { id: 'a-pron', text: 'Con la fonética de Azure, bajo cada respuesta ves Precisión, Fluidez, Completa y Entonación. Toca cada nota y te explico qué mide.' },
    { id: 'a-pron2', text: 'Precisión mide cómo suena cada sonido de cada palabra; Entonación, la música de la frase: el acento y subir y bajar la voz.' },
    { id: 'a-ideas', text: 'Si en clase te quedas en blanco, toca «¿Qué digo?» y te doy 3 maneras de empezar tu respuesta.' },
    { id: 'a-lookup', text: 'Toca cualquier palabra de lo que dice el profe y te explico qué significa en esa frase.' },
    { id: 'a-ear', text: 'Con «Modo oído» el texto del profe se oculta hasta que lo tocas: entrenas tu oído antes de leer.' },
    // 5.10.1 (UX-01): desde la 5.9 el micro es «toca para hablar, toca para enviar»: ya no hay candado ni deslizamiento.
    { id: 'a-mic', text: 'Toca el micro para hablar y tócalo otra vez para enviar. Si no te gustó, la papelera descarta la grabación.' },
    { id: 'a-es', text: 'Toca «ES» bajo la respuesta del profe para verla en español.' },
    { id: 'a-words', text: 'Las palabras que guardas en la pestaña Palabras entran en tu repaso espaciado para que no se te olviden.' },
    { id: 'a-headset', text: 'Con auriculares con micrófono te entiendo mucho mejor, sobre todo si hay ruido.' },
    { id: 'a-speed', text: '¿El profe habla rápido? Baja la velocidad con la barra de la clase o en Ajustes → Profe y voz.' },
    { id: 'a-reminder', text: 'Puedo avisarte cada día a la hora que elijas: actívalo en Ajustes → Meta diaria.' },
    { id: 'a-backup', text: 'De vez en cuando guarda una copia de tus datos: Ajustes → Mi perfil y datos → Exportar.' },
  )
  if (!i.hasAzure) a.push({ id: 'a-azure', text: '¿Quieres que también te corrija la pronunciación sonido a sonido? Configura Azure en Ajustes → Modelos.' })
  // 5.11 (M-09): los consejos «de temporada» (trucos que se aprenden una vez) se jubilan tras verse 2 veces.
  const seen = adviceSeen()
  return a.filter((t) => !SEASONAL_ADVICE.has(t.id) || (seen[t.id] ?? 0) < ADVICE_RETIRE_AFTER)
}

/**
 * 5.11 (M-09, P-09 de A5): consejos «de temporada»: trucos de la app que basta con aprender una vez. Tras verse
 * `ADVICE_RETIRE_AFTER` veces dejan de salir. Los permanentes (perfil, Azure, qué significan la nota y las ppm, copia y
 * recordatorio) siguen en la rueda.
 */
export const SEASONAL_ADVICE = new Set(['a-topics', 'a-pauses', 'a-pron', 'a-pron2', 'a-ideas', 'a-lookup', 'a-ear', 'a-mic', 'a-es', 'a-words', 'a-headset', 'a-speed'])
export const ADVICE_RETIRE_AFTER = 2
const SEEN_KEY = 'habla.adviceSeen'

function adviceSeen(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

/**
 * 5.11 (M-09): se llama cuando un globo se ha mostrado de verdad (Home › `onTipShown`). Cuenta las veces que se vio
 * cada consejo de temporada; sin almacenamiento no se jubila ninguno (siguen en rueda, como en la 5.10.1).
 */
export function noteTipShown(tip: Pick<Tip, 'id' | 'variant'>) {
  // 5.11 (REV-11-D1-05): la redacción de un aviso cuenta como «la última» cuando se muestra, no cuando se calcula.
  if (tip.variant) noteVariantShown(tip.variant)
  if (!SEASONAL_ADVICE.has(tip.id)) return
  const seen = adviceSeen()
  seen[tip.id] = (seen[tip.id] ?? 0) + 1
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
  } catch {
    // sin almacenamiento: no se jubila
  }
}

/** 5.11 (M-08): uno de la lista que cambia cada día (el tema que propone la mascota si falla el plan). */
export function pickOfTheDay<T>(list: T[], now = new Date()): T | undefined {
  if (!list.length) return undefined
  const day = Math.round(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime() / 864e5)
  return list[day % list.length]
}

/**
 * 5.11 (M-08, P-08 de A5): lo que dice la mascota cuando no se pudo preparar el plan o la lección, sin texto técnico.
 * Con alternativa: «mientras, ¿charlamos de <tema>?» (o «de lo que quieras» si es «Sorpréndeme»).
 */
export function planErrorMessage(op: 'create' | 'week', alt: { title: string } | null | undefined, hasAlt: boolean): string {
  const what = op === 'create' ? 'No he podido preparar tu plan de 12 semanas' : 'Hoy no he podido preparar tu lección'
  if (!hasAlt) return `${what}. ¿Lo intentamos otra vez?`
  return `${what}; mientras, ¿charlamos de ${alt ? `«${alt.title}»` : 'lo que quieras'}?`
}

/** Consejos empezando por `cursor` (por donde se quedaron la vez anterior). */
export const rotate = <T>(list: T[], cursor: number): T[] => (list.length ? [...list.slice(cursor % list.length), ...list.slice(0, cursor % list.length)] : list)

/** Intercala avisos y consejos (aviso, consejo, aviso, …); lo que sobre de uno de los dos va al final. */
export function interleave(notices: Tip[], advice: Tip[]): Tip[] {
  const out: Tip[] = []
  for (let k = 0; k < Math.max(notices.length, advice.length); k++) {
    if (notices[k]) out.push(notices[k])
    if (advice[k]) out.push(advice[k])
  }
  return out
}

// Tiempos de los globos.
/** Lo que se queda a la vista: lo que se tarda en leerlo con calma, entre 9 y 20 s (nunca más de 30). */
export const tipDuration = (text: string) => Math.max(9000, Math.min(20000, 4000 + text.length * 75))
const between = (a: number, b: number) => a + Math.random() * (b - a)
/** El primer globo no sale de golpe: entre 5 y 9 s después de abrir el Inicio. */
export const firstDelay = () => between(5000, 9000)
/** Pausa entre un globo y el siguiente: entre 40 y 75 s, para no agobiar. */
export const nextGap = () => between(40000, 75000)
