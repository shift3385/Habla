// 5.11 (M-10): repaso con 1 de cada 4 tarjetas en «Escucha y repite» y ajuste «Que decida Habla» (auto-pase).
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

test('M-10: posiciones 4, 8, 12… en «Escucha y repite»; nunca en tarjetas de Gramática', async () => {
  const { reviewMode, LISTEN_EVERY } = await loadFresh('/src/lib/srs.ts')
  assert.equal(LISTEN_EVERY, 4)
  const mistake = { source: 'mistake' }
  const listen = []
  for (let i = 0; i < 24; i++) if (reviewMode(i, mistake) === 'listen') listen.push(i + 1)
  assert.deepEqual(listen, [4, 8, 12, 16, 20, 24])
  assert.equal(reviewMode(3, { source: 'lookup' }), 'listen')
  for (let i = 0; i < 40; i++) assert.equal(reviewMode(i, { source: 'grammar' }), 'say', `Gramática en ${i + 1}`)
  // Una cola mezclada: 1 de cada 4 como mucho, y solo en las que no son de Gramática.
  const queue = Array.from({ length: 20 }, (_, i) => ({ source: i % 3 === 0 ? 'grammar' : 'mistake' }))
  const modes = queue.map((c, i) => reviewMode(i, c))
  assert.ok(modes.filter((m) => m === 'listen').length <= 5)
  modes.forEach((m, i) => m === 'listen' && assert.notEqual(queue[i].source, 'grammar'))
})

test('M-10: el auto-pase aplica EXACTAMENTE suggestedGrade; con «No lo sé» o apagado, no pasa solo', async () => {
  const { autoGrade, suggestedGrade, AUTO_GRADE_SECONDS } = await loadFresh('/src/lib/srs.ts')
  assert.equal(AUTO_GRADE_SECONDS, 3)
  for (const verdict of ['correct', 'almost', 'wrong']) {
    const r = { transcript: 'x', verdict, feedbackEs: '' }
    assert.equal(autoGrade(r, true), suggestedGrade(verdict), verdict)
    assert.equal(autoGrade(r, false), null, `${verdict} con el ajuste apagado`)
  }
  assert.equal(autoGrade('unknown', true), null)
  assert.equal(autoGrade(null, true), null)
  // REV-11-D2-04: mientras la mascota explica (primera vez), no pasa sola; al cerrarla, sí.
  const ok = { transcript: 'x', verdict: 'correct', feedbackEs: '' }
  assert.equal(autoGrade(ok, true, true), null)
  assert.equal(autoGrade(ok, true, false), suggestedGrade('correct'))
})

test('M-10: «Que decida Habla» viene apagado por defecto (autonomía del alumno)', async () => {
  const fs = await import('node:fs/promises')
  const src = await fs.readFile(new URL('../src/lib/settings.ts', import.meta.url), 'utf8')
  assert.match(src, /reviewAutoGrade: false/)
})

test('M-10: la pantalla del Repaso enseña la cuenta atrás, la cancela con un toque y en segundo plano', async () => {
  const fs = await import('node:fs/promises')
  const src = await fs.readFile(new URL('../src/screens/ReviewScreen.tsx', import.meta.url), 'utf8')
  // REV-11-D2-04: la pantalla le pasa la espera a la explicación de la mascota (la de la primera vez).
  assert.match(src, /autoGrade\(result, settings\.reviewAutoGrade, helpPending\)/)
  assert.match(src, /const helpPending = step === 'result' && !settings\.reviewHelpSeen/)
  assert.match(src, /onPointerDownCapture=\{\(\) => autoLeft !== null && cancelAuto\.current\(\)\}/, 'un toque la cancela')
  assert.match(src, /whenBackground\(stop\)/, 'en segundo plano no corre')
  assert.match(src, /data-autograde=\{autoLeft\}/, 'visible')
  assert.match(src, /reviewMode\(i, card\)/)
  // La evaluación es la misma en los dos modos (una sola llamada a evaluateDrill).
  assert.equal(src.match(/evaluateDrill\(/g).length, 1)
})
