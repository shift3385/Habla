import { APP_VERSION } from './changelog'
import type { Settings } from './settings'

// Avisos que la mascota cuenta antes del Inicio (pantalla NoticeGate).

export type Notice = 'savedClass' | 'news' | 'keysIntro' | 'homework' | 'retest' | 'recalibrate' | 'companions'

/** Día local (AAAA-MM-DD) para recordar "Más tarde" hasta mañana. */
export function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Avisos que toca enseñar antes del Inicio, en este orden. */
export function pendingNotices(s: Settings, o: { savedClass?: boolean; retestReady: boolean; recalibrate?: boolean; streak: number; homeworkDate?: number }): Notice[] {
  const list: Notice[] = []
  // Una clase quedó guardada al cerrar la app: lo primero, la mascota ofrece continuarla (NC-16).
  if (o.savedClass) list.push('savedClass')
  if (s.lastSeenVersion !== APP_VERSION) list.push('news')
  // Quien instaló antes de la 5.8 puso su clave sin que nadie le explicara para qué: la mascota se lo cuenta una vez.
  if (!s.keysIntroSeen) list.push('keysIntro')
  if (o.homeworkDate && o.homeworkDate !== s.homeworkSeen) list.push('homework')
  // Mientras el test esté disponible, la mascota lo recuerda cada vez que abres la app.
  if (o.retestReady) list.push(o.recalibrate ? 'recalibrate' : 'retest')
  if (o.streak >= 3 && !s.mascotNudgeSeen) list.push('companions')
  return list
}

