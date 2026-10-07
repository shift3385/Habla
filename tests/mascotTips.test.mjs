// Avisos de la mascota en el Inicio (src/lib/mascotTips.ts). v5.9: AUD-FLU-900 (recordatorio sin permiso).
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const base = { minutesToday: 0, goal: 5, streak: 0, dueCards: 0, lessonDone: false, liveTopics: false, retestDays: null }

test('FLU-900: con el recordatorio bloqueado, la mascota lo dice primero y lleva a arreglarlo', async () => {
  const { buildTips } = await loadFresh('/src/lib/mascotTips.ts')
  const tips = buildTips({ ...base, remindersBlocked: true, savedTitle: 'Clase', dueCards: 3 })
  assert.equal(tips[0].id, 'notif')
  assert.equal(tips[0].action, 'notif')
  assert.ok(tips[0].cta)
})

test('Sin bloqueo no hay aviso de notificaciones', async () => {
  const { buildTips } = await loadFresh('/src/lib/mascotTips.ts')
  assert.equal(buildTips({ ...base }).some((t) => t.id === 'notif'), false)
})
