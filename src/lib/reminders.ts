import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { THEME_INFO, type ThemeKey } from '../ui/theme'

// Notificaciones locales (sin servidor): recordatorio diario de la lección y aviso del re-test.

// Recordatorio diario = avisos sueltos (uno por día). El plugin no repite a una hora fija combinando "at" y
// "every", y así además el texto lleva la lección que toca y se salta el día ya hecho. Se reprograman cada vez que
// abres la app o terminas una lección. AUD-FLU-217 (v5.9): 30 días (ids 10–39) en vez de 7: si no abres Habla en
// una semana, los avisos ya no se acaban justo cuando más falta hacen.
const DAILY_IDS = Array.from({ length: 30 }, (_, i) => 10 + i)
const RETEST_ID = 2

const native = () => Capacitor.isNativePlatform()

/** Los avisos los da tu mascota: su nombre en el título y su imagen (res/drawable-nodpi/mascot_*.png). */
function mascotLook(theme: ThemeKey) {
  const name = THEME_INFO[theme]?.mascotName ?? 'Musgo'
  return { name, smallIcon: 'ic_stat_habla', largeIcon: `mascot_${name.toLowerCase()}` }
}

/** Pide permiso de notificaciones (Android 13+). Devuelve si está concedido. */
export async function askNotificationPermission(): Promise<boolean> {
  if (!native()) return false
  try {
    let p = await LocalNotifications.checkPermissions()
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') p = await LocalNotifications.requestPermissions()
    return p.display === 'granted'
  } catch {
    return false
  }
}

export async function notificationsGranted(): Promise<boolean> {
  return granted()
}

async function granted(): Promise<boolean> {
  if (!native()) return false
  try {
    return (await LocalNotifications.checkPermissions()).display === 'granted'
  } catch {
    return false
  }
}

export interface ReminderInfo {
  enabled: boolean
  time: string // HH:MM
  lessonTitle?: string // título de la próxima lección, para el texto del aviso
  doneToday: boolean
  retestAt?: number | null
  theme: ThemeKey
}

const PROBE_ID = 99

/**
 * 5.11 (M-09): el recordatorio diario ya no dice siempre lo mismo. El primero lleva la lección que toca (si la hay);
 * los demás rotan por la FECHA del aviso, así dos días seguidos nunca traen el mismo texto.
 * REV-11-D1-01: antes rotaba por la posición del aviso, y como `syncReminders` reprograma en cada arranque, quien abre
 * Habla a diario recibía siempre el primero (el mismo texto, como en la 5.10.1).
 */
export const DAILY_BODIES = [
  'Unos minutos hablando cada día marcan la diferencia. ¡Te espero!',
  '¿Charlamos un rato en inglés? Con unos minutos ya sumas a tu meta.',
  'Tu racha te espera: un poco de inglés hoy y sigue creciendo.',
  'Hoy es buen día para soltar la lengua. ¿Hablamos?',
]
export function dailyBody(at: Date, first: boolean, lessonTitle?: string): string {
  if (first && lessonTitle) return `Hoy toca: ${lessonTitle}. ¿Hablamos 10 minutos?`
  // Número de día local (mediodía: sin saltos por el cambio de hora).
  const day = Math.round(new Date(at.getFullYear(), at.getMonth(), at.getDate(), 12).getTime() / 864e5)
  return DAILY_BODIES[day % DAILY_BODIES.length]
}

/** Aviso de prueba en unos segundos, con la mascota elegida, para comprobar que llegan. */
export async function testReminder(theme: ThemeKey, lessonTitle?: string): Promise<boolean> {
  if (!(await askNotificationPermission())) return false
  const m = mascotLook(theme)
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: PROBE_ID,
          title: `${m.name}: así te avisaré cada día`,
          body: lessonTitle ? `Hoy toca: ${lessonTitle}. ¿Hablamos 10 minutos?` : 'Unos minutos hablando cada día marcan la diferencia.',
          smallIcon: m.smallIcon,
          largeIcon: m.largeIcon,
          schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
        },
      ],
    })
    return true
  } catch {
    return false
  }
}

/**
 * Reprograma los avisos. Se llama al abrir la app, al cambiar el ajuste y al terminar una lección,
 * para que el texto lleve la lección que toca y no avise de algo ya hecho hoy.
 */
export async function syncReminders(info: ReminderInfo): Promise<void> {
  if (!(await granted())) return
  try {
    await LocalNotifications.cancel({ notifications: [...DAILY_IDS, RETEST_ID].map((id) => ({ id })) })
    const notifications = []
    const look = mascotLook(info.theme)

    if (info.enabled) {
      const [h, m] = info.time.split(':').map(Number)
      // Si hoy ya hiciste la lección (o ya pasó la hora), se empieza mañana.
      const first = new Date()
      first.setHours(h, m, 0, 0)
      if (info.doneToday || first.getTime() <= Date.now()) first.setDate(first.getDate() + 1)
      DAILY_IDS.forEach((id, i) => {
        const at = new Date(first)
        at.setDate(first.getDate() + i)
        notifications.push({
          id,
          title: `${look.name}: tu lección de inglés te espera`,
          body: dailyBody(at, i === 0, info.lessonTitle),
          smallIcon: look.smallIcon,
          largeIcon: look.largeIcon,
          schedule: { at, allowWhileIdle: true },
        })
      })
    }

    if (info.retestAt && info.retestAt > Date.now()) {
      const at = new Date(info.retestAt)
      at.setHours(10, 0, 0, 0)
      if (at.getTime() < info.retestAt) at.setDate(at.getDate() + 1)
      notifications.push({
        id: RETEST_ID,
        title: `${look.name}: tu re-test está disponible`,
        body: 'Han pasado 4 semanas: haz el re-test y mira cuánto has avanzado.',
        smallIcon: look.smallIcon,
        largeIcon: look.largeIcon,
        schedule: { at, allowWhileIdle: true },
      })
    }

    if (notifications.length) await LocalNotifications.schedule({ notifications })
  } catch {
    // Sin notificaciones no se rompe nada.
  }
}
