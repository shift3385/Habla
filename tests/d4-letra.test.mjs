// 5.10.1 · D4 fase 2 «letra» (REG-M-05 completo): tamaño de letra que escala SOLO el texto, combinado con la letra
// del sistema y con topes (vertical 1,3 · horizontal 1,15), y migración de text-[NNpx] a fs-NN.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'
import { migrate } from '../scripts/migrate-font-tokens.mjs'

after(closeServer)

const src = new URL('../src/', import.meta.url)
const read = (p) => readFileSync(new URL(p, src), 'utf8')

test('las 4 opciones fijas y lo guardado raro cuenta como Normal', async () => {
  const F = await loadFresh('/src/lib/fontScale.ts')
  assert.deepEqual(
    F.FONT_SCALES.map((o) => [o.label, o.value]),
    [
      ['Pequeña', 0.9],
      ['Normal', 1],
      ['Grande', 1.15],
      ['Muy grande', 1.3],
    ],
  )
  for (const v of [undefined, null, 'grande', 2, 0, 1.2]) assert.equal(F.normalizeFontScale(v), 1, String(v))
})

test('escala efectiva = elección × sistema, con suelo 0,85 y topes 1,3 (vertical) y 1,15 (horizontal)', async () => {
  const F = await loadFresh('/src/lib/fontScale.ts')
  const e = F.effectiveFontScale
  assert.equal(e(1, 1, false), 1, 'Normal con la letra del sistema normal: exactamente como antes')
  assert.equal(e(1.15, 1, false), 1.15)
  assert.equal(e(1.3, 1, false), 1.3)
  assert.equal(e(1.3, 1, true), 1.15, 'en horizontal, como mucho Grande (el micro de la clase)')
  assert.equal(e(1, 1.3, false), 1.3, 'la letra grande del sistema (Galaxy A11) se respeta…')
  assert.equal(e(1.3, 1.3, false), 1.3, '…con tope')
  assert.equal(e(1, 0.86, false), 0.86, 'POCO con letra pequeña del sistema')
  assert.equal(e(0.9, 0.86, false), 0.85, 'suelo')
  assert.equal(e(1, NaN, false), 1, 'sistema desconocido = 1')
  assert.equal(F.fontScaleCapped(1.3, 1, true), true)
  assert.equal(F.fontScaleCapped(1.15, 1, true), false)
  assert.equal(F.fontScaleCapped(1.3, 1, false), false)
})

test('REV-F-02: en vertical con poco alto (320×640) el tope también es 1,15', async () => {
  const F = await loadFresh('/src/lib/fontScale.ts')
  assert.equal(F.isTightScreen(320, 640), true, '320×640 (zoom 0,8 de viewport.ts)')
  assert.equal(F.isTightScreen(780, 360), true, 'horizontal')
  assert.equal(F.isTightScreen(390, 844), false, 'POCO')
  assert.equal(F.isTightScreen(360, 780), false, 'Galaxy A11 en vertical')
  assert.equal(F.effectiveFontScale(1.3, 1, F.isTightScreen(320, 640)), 1.15)
  assert.equal(F.effectiveFontScale(1.3, 1, F.isTightScreen(390, 844)), 1.3)
})

test('ajuste nuevo con valor por defecto (llega solo a instalaciones antiguas)', () => {
  const s = read('lib/settings.ts')
  assert.match(s, /fontScale: number/)
  assert.match(s, /fontScale: 1,/)
})

test('migración: text-[NNpx] → fs-NN, con variantes y sin tocar lo demás', () => {
  assert.equal(migrate('className="txt-sub text-[12.5px] leading-snug"'), 'className="txt-sub fs-12.5 leading-snug"')
  assert.equal(migrate("`a ${x ? 'text-[13px]' : 'text-[15px]'}`"), "`a ${x ? 'fs-13' : 'fs-15'}`")
  assert.equal(migrate('sm:text-[14px] !text-[11px]'), 'sm:fs-14 !fs-11')
  assert.equal(migrate('text-sm text-[var(--x)] text-[#fff] tracking-[1.2px]'), 'text-sm text-[var(--x)] text-[#fff] tracking-[1.2px]')
})

test('en src/ ya no quedan tamaños fijos en px (tampoco en la prueba de sonido ni el selector de audio)', () => {
  const left = []
  const walk = (dir) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(tsx?|css)$/.test(n)) {
        const m = readFileSync(p, 'utf8').match(/text-\[\d+(?:\.\d+)?px\]/g)
        if (m) left.push(`${n}: ${m.length}`)
      }
    }
  }
  walk(fileURLToPath(new URL('../src/', import.meta.url)))
  assert.deepEqual(left, [])
})

test('index.css: los tamaños de Tailwind y fs-* multiplican --fs; los arreglos solo con letra grande', () => {
  const css = read('index.css')
  for (const k of ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl']) assert.match(css, new RegExp(`--text-${k}: calc\\([\\d.]+rem \\* var\\(--fs, 1\\)\\)`), k)
  assert.match(css, /@utility fs-\* \{\s*font-size: calc\(--value\(number\) \* 1px \* var\(--fs, 1\)\);/)
  // Con «Normal» no hay data-fs: ningún arreglo cambia la app.
  for (const sel of ['.fs-clamp', '.seg-count', '.skill-row', '.pron-grid', '.home-sub', '.cv-status']) {
    assert.match(css, new RegExp(`html\\[data-(landscape|fs)\\][^{]*\\${sel}`), sel)
  }
})

test('Ajustes: «Tema y mascota» pasa a «Apariencia» con «Tamaño de letra» y vista previa', () => {
  const s = read('screens/SettingsScreen.tsx')
  assert.match(s, /look: \{ title: 'Apariencia'/)
  assert.match(s, /Tamaño de letra/)
  assert.match(s, /Vista previa/)
  // 5.11.x: «Tema y mascota» vuelve, pero como subsección de Apariencia (menú), no como nombre de la sección.
  assert.doesNotMatch(s, /look: \{ title: 'Tema y mascota'/)
  assert.match(s, /lookTheme: \{ title: 'Tema y mascota'/)
})
