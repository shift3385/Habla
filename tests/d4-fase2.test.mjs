// 5.10.1 · D4 fase 2: REG-A2-03 (gracia de 60 s de confirmIdentity por credencial) y REG-A2-04 (copia y resumen del test
// que no se quedan en la caché tras Compartir).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')

test('REG-A2-03: confirmar una credencial no abre la gracia de las otras', async () => {
  const A = await loadFresh('/src/lib/deviceAuth.ts')
  const t0 = 1_000_000
  assert.equal(A.inGrace('gemini', t0), false, 'sin confirmar no hay gracia')
  A.rememberConfirmed('gemini', { ok: true }, t0)
  assert.equal(A.inGrace('gemini', t0 + 59_000), true, 'misma credencial: 60 s de gracia')
  assert.equal(A.inGrace('gemini', t0 + 60_000), false, 'pasado el minuto, se vuelve a pedir')
  assert.equal(A.inGrace('azure', t0 + 1000), false, 'ver la de Gemini no abre la de Azure')
  assert.equal(A.inGrace('monitor', t0 + 1000), false, 'ni el secreto de Monitor')
})

test('REG-A2-03: sin bloqueo de pantalla o con la confirmación fallida no se abre ninguna gracia', async () => {
  const A = await loadFresh('/src/lib/deviceAuth.ts')
  A.rememberConfirmed('azure', { ok: true, insecure: true }, 5000)
  assert.equal(A.inGrace('azure', 5001), false, 'insecure deja pasar esa vez, pero no abre el minuto')
  A.rememberConfirmed('azure', { ok: false }, 5000)
  assert.equal(A.inGrace('azure', 5001), false)
})

test('REG-A2-03: cada llamada pide su credencial', () => {
  const az = src('components/AzureSettings.tsx')
  assert.match(az, /confirmIdentity\(`Para ver \$\{what\}`, scope\)/)
  assert.match(az, /confirmIdentity\('Para cambiar tu clave de Azure Speech', 'azure'\)/)
  assert.match(az, /confirmIdentity\('Para cambiar el acceso a Azure Monitor', 'monitor'\)/)
  assert.match(az, /what="tu clave de Azure Speech" scope="azure"/)
  assert.match(az, /what="el secreto de Azure" scope="monitor"/)
  for (const f of ['components/GeminiFix.tsx', 'screens/SettingsScreen.tsx']) {
    for (const call of src(f).match(/confirmIdentity\([^)]*\)/g) ?? []) assert.match(call, /'gemini'\)$/, `${f}: ${call}`)
  }
})

test('REG-A2-04: solo se limpian los archivos que Habla deja para Compartir', async () => {
  const { SHARE_CACHE_FILE, cleanShareCache } = await loadFresh('/src/lib/backup.ts')
  for (const ok of ['habla-backup-2026-10-20.json', 'habla-test-2026-10-01.txt']) assert.ok(SHARE_CACHE_FILE.test(ok), ok)
  for (const no of ['habla-backup-2026-10-20.json.bak', 'otra-cosa.json', 'habla-draft.json', 'WebView', '../habla-backup-x.json', 'habla-test-x.mp3']) {
    assert.equal(SHARE_CACHE_FILE.test(no), false, no)
  }
  assert.equal(await cleanShareCache(), 0, 'en el navegador no hay nada que borrar y no falla')
})

test('REG-A2-04: la copia y el resumen del test se olvidan tras Compartir, y la caché se limpia al arrancar', () => {
  const b = src('lib/backup.ts')
  assert.match(b, /finally \{\s*forgetSharedFile\(fileName\)/)
  assert.match(src('lib/testSummary.ts'), /finally \{\s*forgetSharedFile\(fileName\)/)
  assert.match(src('App.tsx'), /cleanShareCache\(\)\.catch/)
})
