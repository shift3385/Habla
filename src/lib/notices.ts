import { APP_VERSION } from './changelog'
import type { Settings } from './settings'

// Avisos que la mascota cuenta antes del Inicio (pantalla NoticeGate).

export type Notice = 'news' | 'homework' | 'retest' | 'companions'

/** Día local (AAAA-MM-DD) para recordar "Más tarde" hasta mañana. */
export function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Avisos que toca enseñar antes del Inicio, en este orden. */
export function pendingNotices(s: Settings, o: { retestReady: boolean; streak: number; homeworkDate?: number }): Notice[] {
  const list: Notice[] = []
  if (s.lastSeenVersion !== APP_VERSION) list.push('news')
  if (o.homeworkDate && o.homeworkDate !== s.homeworkSeen) list.push('homework')
  if (o.retestReady && s.retestSnoozed !== todayKey()) list.push('retest')
  if (o.streak >= 3 && !s.mascotNudgeSeen) list.push('companions')
  return list
}

