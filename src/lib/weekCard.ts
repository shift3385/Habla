// 5.13 (P-17): la tarjeta de la semana, la imagen que se comparte por WhatsApp desde Progreso → «Compartir mi semana».
// Este módulo es PURO (sin DOM ni Capacitor, se prueba en Node): decide qué entra en la tarjeta y qué no. Solo números de
// la semana, el reto y el último logro, y el nombre si lo tiene. NUNCA: nivel por habilidades, errores, lo que recuerda el
// profe, transcripciones ni claves. El dibujo y el envío están en weekCardImage.ts.
import { oneLine } from './missions'

/** Lo que la pantalla tiene a mano (puede traer más campos: aquí solo se copian los permitidos). */
export interface WeekCardInput {
  name?: unknown
  streak?: unknown
  /** Minutos de lunes a domingo (stats.ts › weekMinutes). */
  week?: unknown
  /** El reto de la semana y cuánto llevas (challenge.ts). */
  challenge?: { titleEs?: unknown; progress?: unknown; target?: unknown; unit?: unknown; done?: unknown } | null
  /** El último logro conseguido (milestones.ts). */
  milestone?: { emoji?: unknown; title?: unknown } | null
  /** «del 2 al 8 de noviembre». */
  weekLabel?: unknown
  /** Nombre de la mascota del tema (Gota, Chispa…). */
  mascotName?: unknown
}

export interface WeekCardData {
  name: string // '' si no lo tiene
  streak: number
  week: number[] // 7 valores, minutos ≥ 0
  minutes: number // total de la semana, entero
  days: number // días con práctica
  challenge: { title: string; progress: number; target: number; unit: string; done: boolean } | null
  milestone: { emoji: string; title: string } | null
  weekLabel: string
  mascotName: string
}

const int = (v: unknown, max = 100000) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0)
const text = (v: unknown, max: number) => oneLine(v, max)

/** Solo lo permitido, limpio y con tope. */
export function weekCardData(i: WeekCardInput): WeekCardData {
  const week = Array.from({ length: 7 }, (_, k) => {
    const v = Array.isArray(i.week) ? i.week[k] : 0
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(v, 24 * 60) : 0
  })
  const c = i.challenge
  const target = int(c?.target, 10000)
  const challenge =
    c && target > 0 && text(c.titleEs, 48)
      ? { title: text(c.titleEs, 48), progress: Math.min(int(c.progress, 10000), target), target, unit: text(c.unit, 16), done: c.done === true || int(c.progress) >= target }
      : null
  const m = i.milestone
  const milestone = m && text(m.title, 48) ? { emoji: text(m.emoji, 4), title: text(m.title, 48) } : null
  return {
    name: text(i.name, 24),
    streak: int(i.streak, 10000),
    week,
    minutes: Math.round(week.reduce((a, b) => a + b, 0)),
    days: week.filter((v) => v > 0).length,
    challenge,
    milestone,
    weekLabel: text(i.weekLabel, 48),
    mascotName: text(i.mascotName, 16) || 'Habla',
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Texto que acompaña a la imagen al compartir (una o dos líneas). */
export function weekCardText(d: WeekCardData): string {
  const who = d.name ? `${d.name} en Habla` : 'Mi semana en Habla'
  const parts = [`${plural(d.minutes, 'minuto', 'minutos')} hablando inglés`, `racha de ${plural(d.streak, 'día', 'días')}`]
  if (d.challenge) parts.push(d.challenge.done ? `reto «${d.challenge.title}» cumplido` : `reto: ${d.challenge.progress} de ${d.challenge.target}`)
  return `${who}: ${parts.join(' · ')}.`
}

/** Nombre del archivo de la imagen (la caché de Compartir lo reconoce: backup.ts › SHARE_CACHE_FILE). */
export const weekCardFileName = (now = new Date()) =>
  `habla-semana-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.png`

/** Tamaño de la imagen (4:5, el formato vertical de WhatsApp e Instagram). */
export const CARD_W = 1080
export const CARD_H = 1350
