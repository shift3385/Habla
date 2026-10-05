// Lo que tu mascota te va contando en el Inicio, en globos que aparecen y se van (sin ocupar sitio en la pantalla).
// Dos tipos, que se activan por separado en Ajustes → Tema y mascota:
//  - Avisos: lo de hoy (clase a medias, lección, meta, repaso, racha, test). Lo que pide acción va primero.
//  - Consejos: cómo sacarle partido a la app y qué significa cada nota. Siguen por donde se quedaron la vez anterior.

export type TipAction = 'resume' | 'lesson' | 'review'

export interface Tip {
  id: string
  text: string
  /** Si lo hay, tocar el globo lo hace (seguir la clase, empezar la lección, abrir el repaso). */
  action?: TipAction
  /** Texto del botón que va dentro del globo cuando hay acción. */
  cta?: string
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
}

const short = (s: string, max = 40) => (s.length > max ? s.slice(0, max - 2).trimEnd() + '…' : s)
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** Avisos de hoy, en orden de importancia. */
export function buildTips(i: TipInput): Tip[] {
  const tips: Tip[] = []
  if (i.savedTitle) tips.push({ id: 'saved', text: `Tienes una clase a medias: «${short(i.savedTitle)}».`, action: 'resume', cta: 'Seguir la clase' })
  if (i.lessonTitle && !i.lessonDone) tips.push({ id: 'lesson', text: `Hoy te espera la lección «${short(i.lessonTitle)}».`, action: 'lesson', cta: 'Empezar la lección' })

  const mins = Math.floor(i.minutesToday)
  if (mins <= 0) tips.push({ id: 'goal', text: `Aún no has hablado hoy. ¿Hacemos tus ${i.goal} minutos?` })
  else if (mins < i.goal) tips.push({ id: 'goal', text: `Hoy llevas ${mins} de ${i.goal} min. Te ${plural(i.goal - mins, 'falta 1 minuto', `faltan ${i.goal - mins} minutos`)} para tu meta.` })
  else tips.push({ id: 'goal', text: '¡Meta de hoy cumplida! Lo que hables de más también suma.' })

  if (i.dueCards > 0) tips.push({ id: 'review', text: `Tienes ${i.dueCards} ${plural(i.dueCards, 'frase', 'frases')} para decir hoy en el repaso.`, action: 'review', cta: 'Repasar ahora' })

  if (i.streak >= 2) tips.push({ id: 'streak', text: `¡Llevas ${i.streak} días seguidos practicando! ${mins > 0 ? 'Hoy ya cuenta.' : 'Habla hoy y no rompas la racha.'}` })
  else tips.push({ id: 'streak', text: 'Un poco cada día y empezamos una racha. ¡La llama de arriba cuenta tus días seguidos!' })

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
}

/** Consejos de uso: qué significa cada nota, dónde se cambia cada cosa y trucos de la clase. */
export function buildAdvice(i: AdviceInput): Tip[] {
  const a: Tip[] = []
  if (!i.hasPurpose) a.push({ id: 'a-purpose', text: 'Aún no me has dicho para qué quieres el inglés. Cuéntamelo en Ajustes → Mi perfil y datos y adapto tus clases.' })
  a.push(
    { id: 'a-topics', text: '¿Quieres cambiar tus 3 temas del Inicio? Toca «Más temas» → «Cambiar mis 3 temas», o ve a Ajustes → Mi perfil y datos.' },
    { id: 'a-score', text: 'Al terminar cada clase verás tu nota de fluidez (0–100): mezcla tu velocidad, lo largas que son tus respuestas, las pausas y la precisión.' },
    { id: 'a-ppm', text: '«ppm» son las palabras por minuto que dices. Para conversar con soltura, la meta ronda las 120.' },
    { id: 'a-pauses', text: 'Las «pausas» que te cuento son silencios de más de 1 segundo en medio de tu respuesta. Menos pausas, más fluidez.' },
    { id: 'a-pron', text: 'Con la fonética de Azure, bajo cada respuesta ves Precisión, Fluidez, Completa y Entonación. Toca cada nota y te explico qué mide.' },
    { id: 'a-pron2', text: 'Precisión mide cómo suena cada sonido de cada palabra; Entonación, la música de la frase: el acento y subir y bajar la voz.' },
    { id: 'a-ideas', text: 'Si en clase te quedas en blanco, toca «¿Qué digo?» y te doy 3 maneras de empezar tu respuesta.' },
    { id: 'a-lookup', text: 'Toca cualquier palabra de lo que dice el profe y te explico qué significa en esa frase.' },
    { id: 'a-ear', text: 'Con «Modo oído» el texto del profe se oculta hasta que lo tocas: entrenas tu oído antes de leer.' },
    { id: 'a-lock', text: 'Desliza el micrófono hacia arriba hasta el candado y podrás hablar sin mantener el dedo. Hacia la izquierda, cancelas.' },
    { id: 'a-es', text: 'Toca «ES» bajo la respuesta del profe para verla en español.' },
    { id: 'a-words', text: 'Las palabras que guardas en la pestaña Palabras entran en tu repaso espaciado para que no se te olviden.' },
    { id: 'a-headset', text: 'Con auriculares con micrófono te entiendo mucho mejor, sobre todo si hay ruido.' },
    { id: 'a-speed', text: '¿El profe habla rápido? Baja la velocidad con la barra de la clase o en Ajustes → Profe y voz.' },
    { id: 'a-reminder', text: 'Puedo avisarte cada día a la hora que elijas: actívalo en Ajustes → Meta diaria.' },
    { id: 'a-backup', text: 'De vez en cuando guarda una copia de tus datos: Ajustes → Mi perfil y datos → Exportar.' },
  )
  if (!i.hasAzure) a.push({ id: 'a-azure', text: '¿Quieres que también te corrija la pronunciación sonido a sonido? Configura Azure en Ajustes → Modelos.' })
  return a
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
