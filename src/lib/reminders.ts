import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { THEME_INFO, type ThemeKey } from '../ui/theme'

// Notificaciones locales (sin servidor): recordatorio diario de la lección y aviso del re-test.

// Recordatorio diario = 7 avisos sueltos (uno por día, ids 10–16). El plugin no repite a una hora fija
// combinando "at" y "every", y así además el texto lleva la lección que toca y se salta el día ya hecho.
// Se reprograman cada vez que abres la app o terminas una lección.
const DAILY_IDS = [10, 11, 12, 13, 14, 15, 16]
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
          body:
            i === 0 && info.lessonTitle
              ? `Hoy toca: ${info.lessonTitle}. ¿Hablamos 10 minutos?`
              : 'Unos minutos hablando cada día marcan la diferencia. ¡Te espero!',
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
