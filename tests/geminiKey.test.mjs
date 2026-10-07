// AUD-FLU-209: la clave de Gemini se comprueba antes de guardarla. Lista de modelos simulada: 0 llamadas reales.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const MODELS = [
  { id: 'gemini-3.5-flash', displayName: 'Flash' },
  { id: 'gemini-3.5-flash-lite', displayName: 'Flash-Lite' },
]
const current = { geminiModel: 'gemini-3.5-flash', geminiFallbackModel: 'gemini-3.5-flash-lite' }

test('Clave rechazada por Google: no hay nada que guardar (se conserva la anterior)', async () => {
  const { verifyGeminiKey } = await loadFresh('/src/lib/geminiKey.ts')
  const r = await verifyGeminiKey('AIzaFALSA-mal-copiada', current, async () => {
    throw new Error('La clave de Gemini no es válida.')
  })
  assert.equal(r.ok, false)
  assert.equal(r.patch, undefined)
  assert.match(r.error, /no es válida/)
})

test('Sin conexión: tampoco se guarda', async () => {
  const { verifyGeminiKey } = await loadFresh('/src/lib/geminiKey.ts')
  const r = await verifyGeminiKey('AIzaBuena', current, async () => {
    throw new Error('Sin conexión con Gemini. Revisa tu internet.')
  })
  assert.equal(r.ok, false)
  assert.match(r.error, /Sin conexión/)
})

test('Clave aceptada: devuelve la clave limpia y los modelos válidos para ella', async () => {
  const { verifyGeminiKey } = await loadFresh('/src/lib/geminiKey.ts')
  let asked = ''
  const r = await verifyGeminiKey('  AIzaBuena  ', current, async (k) => ((asked = k), MODELS))
  assert.equal(asked, 'AIzaBuena')
  assert.equal(r.ok, true)
  assert.deepEqual(r.patch, { geminiKey: 'AIzaBuena', geminiModel: 'gemini-3.5-flash', geminiFallbackModel: 'gemini-3.5-flash-lite', modelList: MODELS.map((m) => m.id) })
})

test('Clave aceptada pero sin el modelo elegido: elige uno disponible', async () => {
  const { verifyGeminiKey } = await loadFresh('/src/lib/geminiKey.ts')
  const r = await verifyGeminiKey('AIzaOtra', { geminiModel: 'gemini-9-pro', geminiFallbackModel: '' }, async () => MODELS)
  assert.equal(r.ok, true)
  assert.ok(MODELS.some((m) => m.id === r.patch.geminiModel))
  assert.notEqual(r.patch.geminiFallbackModel, r.patch.geminiModel)
})

test('Clave vacía: error sin llamar a Google', async () => {
  const { verifyGeminiKey } = await loadFresh('/src/lib/geminiKey.ts')
  let called = false
  const r = await verifyGeminiKey('   ', current, async () => ((called = true), MODELS))
  assert.equal(r.ok, false)
  assert.equal(called, false)
})

test('REV-U4-1 / E2E-604: textos al comprobar la clave (sin «Revísala en Ajustes» ni «prueba otro modelo»)', async () => {
  const { keyCheckError } = await loadFresh('/src/lib/gemini.ts')
  const invalid = { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', details: [{ reason: 'API_KEY_INVALID' }] } }
  for (const [status, data] of [[400, invalid], [401, null]]) {
    const t = keyCheckError(status, data)
    assert.match(t, /no es válida/)
    assert.match(t, /AI Studio/)
    assert.doesNotMatch(t, /Ajustes/)
  }
  const quota = keyCheckError(429, null)
  assert.match(quota, /Puede que sea buena/)
  assert.doesNotMatch(quota, /modelo|Ajustes/)
  assert.match(keyCheckError(503, null), /Puede que sea buena/)
  // El resto de casos siguen con el texto general (p. ej. 403: permisos de la clave).
  assert.match(keyCheckError(403, null), /permiso/)
})
