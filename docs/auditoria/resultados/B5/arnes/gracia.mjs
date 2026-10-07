// B5 · Prueba de la lógica de gracia de confirmIdentity (src/lib/deviceAuth.ts) con un DeviceAuth simulado.
// Se transpila el archivo real con TypeScript y se sustituye '@capacitor/core' por un mock que cuenta los diálogos.
// Uso: node gracia.mjs   (desde cualquier carpeta; no toca el producto)
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const require = createRequire(join(root, 'package.json'))
const ts = require('typescript')
let src = readFileSync(join(root, 'src/lib/deviceAuth.ts'), 'utf8')
src = src.replace(/from '@capacitor\/core'/, "from './mock-core.mjs'")
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const dir = mkdtempSync(join(tmpdir(), 'b5-gracia-'))
writeFileSync(join(dir, 'mock-core.mjs'), `
export const state = { dialogs: [], answer: { ok: true } }
export const Capacitor = { getPlatform: () => 'android' }
export const registerPlugin = () => ({ confirm: async (o) => { state.dialogs.push(o.subtitle); if (state.answer === 'throw') throw new Error('x'); return state.answer } })
`)
writeFileSync(join(dir, 'deviceAuth.mjs'), js)
const { state } = await import(pathToFileURL(join(dir, 'mock-core.mjs')))
const { confirmIdentity } = await import(pathToFileURL(join(dir, 'deviceAuth.mjs')))

let now = 1_000_000
Date.now = () => now
const log = []
const step = async (t, why) => {
  now = 1_000_000 + t * 1000
  const before = state.dialogs.length
  const r = await confirmIdentity(why)
  log.push({ t_s: t, why, dialogoMostrado: state.dialogs.length > before, ok: r.ok })
}
// 1) cancelar no abre la gracia
state.answer = { ok: false }
await step(0, 'Para ver tu clave de Gemini (CANCELA)')
state.answer = 'throw'
await step(1, 'Para ver tu clave de Gemini (el plugin falla)')
// 2) confirmar y reutilizar para otras claves/propósitos
state.answer = { ok: true }
await step(2, 'Para ver tu clave de Gemini (CONFIRMA)')
state.answer = { ok: false } // si volviera a preguntar, se negaría
await step(30, 'Para ver tu clave de Azure Speech')
await step(40, 'Para ver el secreto de Azure')
await step(50, 'Para cambiar tu clave de Gemini')
await step(61.9, 'Para cambiar el secreto de Azure')
await step(62.1, 'Para ver tu clave de Gemini (tras 60 s)')
// 3) teléfono sin bloqueo
state.answer = { ok: true, insecure: true }
await step(200, 'Sin bloqueo: Para ver tu clave de Azure Speech')
await step(210, 'Sin bloqueo, 10 s después')
console.log(JSON.stringify(log, null, 1))
