// Lo que tu mascota te va contando en el Inicio, en globos que aparecen y se van (sin ocupar sitio en la pantalla).
// Orden: lo que pide acción primero (clase a medias, lección, meta, repaso) y luego lo informativo.

export type TipAction = 'resume' | 'lesson' | 'review'

export interface Tip {
  id: string
  text: string
  /** Si lo hay, tocar el globo lo hace (seguir la clase, empezar la lección, abrir el repaso). */
  action?: TipAction
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

export function buildTips(i: TipInput): Tip[] {
  const tips: Tip[] = []
  if (i.savedTitle) tips.push({ id: 'saved', text: `Tienes una clase a medias: «${short(i.savedTitle)}». Toca aquí y la seguimos.`, action: 'resume' })
  if (i.lessonTitle && !i.lessonDone) tips.push({ id: 'lesson', text: `Hoy te espera la lección «${short(i.lessonTitle)}». Toca aquí para empezarla.`, action: 'lesson' })

  const mins = Math.floor(i.minutesToday)
  if (mins <= 0) tips.push({ id: 'goal', text: `Aún no has hablado hoy. ¿Hacemos tus ${i.goal} minutos?` })
  else if (mins < i.goal) tips.push({ id: 'goal', text: `Hoy llevas ${mins} de ${i.goal} min. Te ${plural(i.goal - mins, 'falta 1 minuto', `faltan ${i.goal - mins} minutos`)} para tu meta.` })
  else tips.push({ id: 'goal', text: '¡Meta de hoy cumplida! Lo que hables de más también suma.' })

  if (i.dueCards > 0) tips.push({ id: 'review', text: `Tienes ${i.dueCards} ${plural(i.dueCards, 'frase', 'frases')} para decir hoy en el repaso. Toca aquí y repasamos.`, action: 'review' })

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

/** Cuánto se queda el globo a la vista: lo justo para leerlo con calma. */
export const tipDuration = (text: string) => Math.min(9000, 3200 + text.length * 50)
