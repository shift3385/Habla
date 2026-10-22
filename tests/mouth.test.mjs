// 5.11 (boca): el dibujo de la boca de la ficha de Sonidos (MouthDiagram). Con un fixture de la misma forma que
// src/sounds/mouth.ts (docs/v5.11/sonidos-boca/CONTRATO.md): ids únicos («__U»), solo las etiquetas pedidas, ondas si
// es sonora, diptongos inicio → final. Si mouth.ts ya está generado, además: cubre las 44 fichas y no hay referencias rotas.
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const MOUTH_TS = new URL('../src/sounds/mouth.ts', import.meta.url)
const MARKS = ['tongue', 'teeth', 'lips', 'folds', 'velum']

const body = (k) =>
  `<defs><linearGradient id="sk__U"><stop offset="0" stop-color="#fff"/></linearGradient><clipPath id="cl__U"><path d="M0 0h1v1z"/></clipPath></defs>` +
  `<path d="M90 100h50v50z" fill="url(#sk__U)" clip-path="url(#cl__U)" data-pose="${k}"/>`
const pose = (id, nasal = false) => ({
  id,
  viewBox: '84 96 118 124',
  body: body(id),
  marks: { tongue: [154, 140], teeth: [154.5, 127], lips: [160.5, 153], folds: [114, 206], velum: [140, 118] },
  nasal,
})
const FIXTURE = {
  MOUTH_POSES: { 'th-dh': pose('th-dh'), 'm': pose('m', true), 'e': pose('e'), 'iy': pose('iy') },
  FRONT_SHAPES: { tongue: '<defs><radialGradient id="fs__U"/></defs><rect width="120" height="120" fill="url(#fs__U)"/>' },
  MOUTH_BY_PHONEME: {
    th: { pose: 'th-dh', front: 'tongue', labels: ['teeth', 'tongue', 'lips'], voiced: false },
    dh: { pose: 'th-dh', front: 'tongue', labels: ['teeth', 'tongue', 'lips', 'folds'], voiced: true },
    m: { pose: 'm', front: 'tongue', labels: ['lips', 'velum', 'folds'], voiced: true },
    ey: { pose: 'e', poseEnd: 'iy', front: 'tongue', labels: ['tongue', 'lips'], voiced: true },
    roto: { pose: 'no-existe', front: 'tongue', labels: [], voiced: false },
  },
}

async function render(...ids) {
  const { renderToString } = await import('react-dom/server')
  const { createElement, Fragment } = await import('react')
  const { default: MouthDiagram } = await loadFresh('/src/components/MouthDiagram.tsx')
  const els = ids.map((phonemeId) => createElement(MouthDiagram, { key: phonemeId, phonemeId, data: FIXTURE, ariaLabel: `boca ${phonemeId}` }))
  return renderToString(createElement(Fragment, null, ...els))
}
const labelsIn = (html) => [...html.matchAll(/data-mouth="label-(\w+)"/g)].map((m) => m[1])
const idsIn = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])

test('boca: «__U» se cambia por un id único válido y las url(#…) apuntan a ids que existen', async () => {
  const html = await render('th')
  assert.ok(!html.includes('__U'), 'no queda ningún «__U»')
  const ids = idsIn(html)
  assert.ok(ids.length >= 3, 'gradiente, clipPath y el de la vista de frente')
  for (const id of ids) assert.match(id, /^[A-Za-z][A-Za-z0-9_-]*$/, `id válido: ${id}`)
  for (const [, ref] of html.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref), `url(#${ref}) existe`)
  assert.ok(html.includes('role="img"') && html.includes('aria-label="boca th"'))
})

test('boca: dos dibujos en la misma página no repiten ids', async () => {
  const html = await render('th', 'dh')
  const ids = idsIn(html)
  assert.equal(new Set(ids).size, ids.length, `ids repetidos: ${ids}`)
})

test('boca: solo salen las etiquetas pedidas, en español', async () => {
  const th = await render('th')
  assert.deepEqual(labelsIn(th).sort(), ['lips', 'teeth', 'tongue'])
  assert.ok(th.includes('Dientes') && th.includes('Lengua') && th.includes('Labios'))
  assert.ok(!th.includes('Cuerdas vocales') && !th.includes('Velo bajado'))
  const m = await render('m')
  assert.deepEqual(labelsIn(m).sort(), ['folds', 'lips', 'velum'])
  assert.ok(m.includes('Velo bajado') && m.includes('aire por la nariz') && m.includes('Cuerdas vocales'))
  // Cada etiqueta tiene su línea hasta el punto que señala.
  assert.equal([...m.matchAll(/data-mouth="lead-/g)].length, 3)
})

test('boca: sonora → ondas sobre las cuerdas vocales; sorda → sin ondas', async () => {
  assert.ok((await render('dh')).includes('data-mouth="waves"'))
  assert.ok(!(await render('th')).includes('data-mouth="waves"'))
})

test('boca: diptongo → inicio y final, cada uno con su dibujo', async () => {
  const html = await render('ey')
  assert.ok(html.includes('Empieza') && html.includes('Termina'))
  assert.ok(html.includes('data-pose="e"') && html.includes('data-pose="iy"'))
  const ids = idsIn(html)
  assert.equal(new Set(ids).size, ids.length)
})

test('boca: sin dibujo (o con una pose que no existe), no pinta nada', async () => {
  assert.equal(await render('no-esta'), '')
  assert.equal(await render('roto'), '')
})

test('boca: mouth.ts cubre las 44 fichas de phonemes.json y no hay poses ni vistas de frente rotas', { skip: !existsSync(MOUTH_TS) && 'mouth.ts aún no está generado' }, async () => {
  const M = await loadFresh('/src/sounds/mouth.ts')
  const { phonemes } = JSON.parse(readFileSync(new URL('../src/sounds/phonemes.json', import.meta.url), 'utf8'))
  assert.equal(phonemes.length, 44)
  for (const p of phonemes) {
    const info = M.MOUTH_BY_PHONEME[p.id]
    assert.ok(info, `${p.id}: tiene dibujo`)
    for (const k of [info.pose, info.poseEnd].filter(Boolean)) {
      const pose = M.MOUTH_POSES[k]
      assert.ok(pose, `${p.id}: pose ${k}`)
      assert.match(pose.viewBox, /^-?[\d.]+[ ,]+-?[\d.]+[ ,]+[\d.]+[ ,]+[\d.]+$/, `${k}: viewBox`)
      assert.ok(!/<text\b/.test(pose.body), `${k}: sin <text> (las etiquetas las pone el componente)`)
      for (const m of info.labels) assert.ok(pose.marks[m], `${p.id}: la pose ${k} tiene el punto de «${m}»`)
    }
    assert.ok(M.FRONT_SHAPES[info.front], `${p.id}: vista de frente ${info.front}`)
    assert.ok(info.labels.length <= 4 && info.labels.every((m) => MARKS.includes(m)), `${p.id}: etiquetas ${info.labels}`)
    if (typeof p.voiced === 'boolean') assert.equal(info.voiced, p.voiced, `${p.id}: voiced igual que phonemes.json`)
    if (info.poseEnd) assert.equal(p.kind, 'diphthong', `${p.id}: solo los diptongos tienen pose final`)
  }
  // Con los dibujos reales: cada ficha se pinta, sin «__U» sueltos y con todas sus url(#…) definidas.
  const { renderToString } = await import('react-dom/server')
  const { createElement } = await import('react')
  const { default: MouthDiagram } = await loadFresh('/src/components/MouthDiagram.tsx')
  for (const p of phonemes) {
    const html = renderToString(createElement(MouthDiagram, { phonemeId: p.id, data: M, ariaLabel: p.id }))
    assert.ok(html.includes('role="img"') && !html.includes('__U'), `${p.id}: se pinta`)
    const ids = idsIn(html)
    assert.equal(new Set(ids).size, ids.length, `${p.id}: ids sin repetir`)
    for (const [, ref] of html.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref), `${p.id}: url(#${ref}) existe`)
  }
  // Ningún id de <defs> sin «__U» (chocarían entre dibujos).
  for (const [k, pose] of Object.entries(M.MOUTH_POSES)) {
    for (const [, id] of pose.body.matchAll(/\sid="([^"]+)"/g)) assert.ok(id.endsWith('__U'), `${k}: id «${id}» termina en __U`)
  }
})
