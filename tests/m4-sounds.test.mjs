// 5.11 · D4 «Sonidos: interfaz e integración»: correctores de los ejercicios (S-09/S-10), tabla fonémica (S-07), voz
// americana forzada y lenta (S-08), sonido suelto con caída a la palabra (S-08) y enlace a la hoja de Sonidos (S-11).
// Sin navegador: la lógica está en soundGame.ts / soundLink.ts / soundAudio.ts / tts.ts; la voz es un speechSynthesis falso.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import { closeServer, loadFresh } from './helpers/vite.mjs'

after(closeServer)

const json = (f) => JSON.parse(readFileSync(new URL(`../src/sounds/${f}`, import.meta.url), 'utf8'))

// ---- listen-choose ----

test('S-10 listen-choose: 8 rondas, la palabra que suena está entre las opciones y las opciones son las de su par', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  const pairs = [['ship', 'sheep'], ['sit', 'seat'], ['fill', 'feel']]
  const rounds = g.listenRounds(pairs, 8, 42)
  assert.equal(rounds.length, 8)
  for (const r of rounds) {
    assert.ok(r.options.includes(r.word), `${r.word} en ${r.options}`)
    assert.ok(pairs.some((p) => p.length === r.options.length && p.every((w) => r.options.includes(w))), 'opciones = un par entero')
  }
  // Con menos pares que rondas, en la segunda vuelta suena la OTRA palabra del par (se oyen las dos).
  for (let i = 0; i + 3 < 6; i++) assert.notEqual(rounds[i].word, rounds[i + 3].word)
  // Determinista con la misma semilla; otra semilla, otro orden.
  assert.deepEqual(g.listenRounds(pairs, 8, 42), rounds)
  assert.notDeepEqual(g.listenRounds(pairs, 8, 7), rounds)
})

test('S-10 listen-choose: tríos y grupos rotos (menos de 2) se manejan; sin pares, sin rondas', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  const r = g.listenRounds([['cat', 'cut', 'cot'], ['x']], 6, 3)
  assert.equal(r.length, 6)
  assert.ok(r.every((x) => x.options.length === 3))
  assert.equal(new Set(r.slice(0, 3).map((x) => x.word)).size + new Set(r.slice(3).map((x) => x.word)).size >= 2, true)
  assert.deepEqual(g.listenRounds([], 8, 1), [])
})

test('S-10 corrector de listen-choose: acierta sin mayúsculas ni espacios; falla con la otra', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  const round = { word: 'sheep', options: ['ship', 'sheep'] }
  assert.equal(g.checkListen(round, 'sheep'), true)
  assert.equal(g.checkListen(round, ' Sheep '), true)
  assert.equal(g.checkListen(round, 'ship'), false)
})

test('S-10 corrector de odd-one-out', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  const ex = { id: 'V1-3', type: 'odd-one-out', words: ['fish', 'this', 'sheep', 'milk'], answer: 2, whyEs: '' }
  assert.equal(g.checkOdd(ex, 2), true)
  for (const k of [0, 1, 3]) assert.equal(g.checkOdd(ex, k), false)
})

test('S-10 corrector de sort: cuenta las bien colocadas y dice cuáles no; sin colocar = mal', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  const ex = { id: 'V1-2', type: 'sort', columns: ['ih', 'iy'], words: [['big', 'ih'], ['green', 'iy'], ['sit', 'ih'], ['team', 'iy']] }
  assert.deepEqual(g.checkSort(ex, { big: 'ih', green: 'iy', sit: 'ih', team: 'iy' }), { correct: 4, total: 4, ok: true, wrong: [] })
  assert.deepEqual(g.checkSort(ex, { big: 'iy', green: 'iy', sit: 'ih' }), { correct: 2, total: 4, ok: false, wrong: ['big', 'team'] })
})

// ---- spell-listen (S-09) ----

test('S-09 corrector de spell-listen: mayúsculas, espacios, guiones y puntos no cuentan', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  for (const typed of ['GARCIA', 'garcia', 'G A R C I A', 'g-a-r-c-i-a', 'G.A.R.C.I.A.', ' Gar–cía '.replace('í', 'i'), 'g_a r-c.i a'])
    assert.equal(g.checkSpelling('GARCIA', typed), true, typed)
  for (const typed of ['GARSIA', 'GARCI', 'GARCIAA', '', '   ', '---']) assert.equal(g.checkSpelling('GARCIA', typed), false, `«${typed}»`)
  assert.equal(g.checkSpelling('', ''), false, 'nada no es un acierto')
})

test('S-09 deletreo: cada letra con su ttsText del abecedario (F0-5), sin signos', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  const alphabet = json('alphabet.json')
  assert.equal(alphabet.letters.length, 26)
  const out = g.spellOut('Bob-A', alphabet)
  assert.deepEqual(out, ['B', 'O', 'B', 'A'].map((l) => alphabet.letters.find((x) => x.letter === l).ttsText))
  assert.deepEqual(g.spellOut('ab', { letters: [] }), ['A.', 'B.'], 'sin tabla, «A.»: una «A» sola se puede leer /ə/')
  assert.equal(g.sayable('A', true, alphabet), alphabet.letters[0].ttsText)
  assert.equal(g.sayable('ship', false, alphabet), 'ship')
})

// ---- Fases, Dilo tú y nota de Azure ----

test('S-10 fases de la lección: Explícame primero, Cierre al final, sin repetir', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  for (const l of json('lessons.json').lessons) {
    const ph = g.lessonPhases(l)
    assert.equal(ph[0], 'explain')
    assert.equal(ph.at(-1), 'done')
    assert.equal(new Set(ph).size, ph.length, l.id)
  }
  assert.equal(g.phaseOf('listen-choose'), 'listen')
  assert.equal(g.phaseOf('odd-one-out'), 'sort')
  assert.equal(g.phaseOf('say-pair'), 'say')
  assert.equal(g.phaseOf('spell-listen'), 'spell')
})

test('S-10 Dilo tú: un intento por palabra, los pares juntos y la frase entera, con su fonema objetivo', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  const ph = [{ id: 'ih' }, { id: 'th' }]
  assert.deepEqual(
    g.sayItems({ id: 'x', type: 'say-word', target: 'ih', words: ['ship', 'sit'] }, ph).map((x) => [x.text, x.target?.id]),
    [['ship', 'ih'], ['sit', 'ih']],
  )
  assert.deepEqual(g.sayItems({ id: 'x', type: 'say-pair', pairs: [['ship', 'sheep']] }, ph, 'ih').map((x) => [x.text, x.target?.id]), [['ship, sheep', 'ih']])
  assert.deepEqual(g.sayItems({ id: 'x', type: 'say-sentence', en: 'I think so.', es: '', targets: ['th'] }, ph).map((x) => [x.text, x.target?.id]), [['I think so.', 'th']])
})

// ---- Tabla fonémica (S-07) ----

test('S-07 tabla: cada ficha con `chart` sale una sola vez, en su sitio; vocales 3×4, diptongos 1×5, consonantes 3×8', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  const { phonemes } = json('phonemes.json')
  const grid = g.chartGrid(phonemes)
  assert.deepEqual([grid.vowels.rows, grid.vowels.cols], [3, 4])
  // (Los diptongos pueden faltar mientras D3 completa el contenido: entonces el bloque no se dibuja.)
  if (phonemes.some((p) => p.chart?.block === 'diphthongs')) assert.deepEqual([grid.diphthongs.rows, grid.diphthongs.cols], [1, 5])
  assert.deepEqual([grid.consonants.rows, grid.consonants.cols], [3, 8])
  const placed = Object.values(grid).flatMap((b) => b.cells.flat(2).map((p) => p.id))
  const withChart = phonemes.filter((p) => p.chart).map((p) => p.id)
  assert.deepEqual([...placed].sort(), [...withChart].sort(), 'ni falta ni sobra ninguna')
  assert.equal(new Set(placed).size, placed.length, 'ninguna repetida')
  for (const p of phonemes.filter((x) => x.chart)) {
    const cell = grid[p.chart.block].cells[p.chart.row - 1][p.chart.col - 1]
    assert.ok(cell.some((x) => x.id === p.id), `${p.id} en fila ${p.chart.row}, columna ${p.chart.col}`)
  }
  assert.ok(phonemes.filter((p) => p.kind === 'feature').every((p) => !placed.includes(p.id)), 'los rasgos no salen en la tabla')
})

test('S-07 tabla: /ɝ/ y /ɚ/ comparten celda; si el contenido numera pares (1–4), el lado lo pone `voiced`', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  const v = (id, row, col) => ({ id, chart: { block: 'vowels', row, col } })
  const grid = g.chartGrid([v('er', 2, 3), v('axr', 2, 3)])
  assert.deepEqual(grid.vowels.cells[1][2].map((p) => p.id), ['er', 'axr'])
  const c = (id, col, voiced) => ({ id, voiced, chart: { block: 'consonants', row: 1, col } })
  const byPair = g.chartGrid([c('p', 1, false), c('b', 1, true), c('k', 4, false), c('g', 4, true)])
  assert.deepEqual(byPair.consonants.cells[0].map((x) => x.map((p) => p.id).join('')), ['p', 'b', '', '', '', '', 'k', 'g'])
})

test('S-07 tamaño en px REALES: con zoom 0,8 (320×640) las consonantes no caben a 36 px y van en 2 bloques; en 390 sí', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  // 390×844: bloque de 346 px CSS, zoom 1 → (346 − 24) / 8 = 40,2 px reales.
  const big = g.chartSizing(346, 1)
  assert.equal(big.compact, false)
  assert.ok(big.consReal >= 36)
  assert.deepEqual([big.vowelMinH, big.consMinH], [46, 40])
  // 320×640: viewport.ts maqueta a 400 px CSS con zoom 0,8 → 40 px CSS = 32 reales: compacto.
  const small = g.chartSizing(346, 0.8)
  assert.equal(small.compact, true)
  assert.ok(small.vowelMinH * 0.8 >= 44, 'vocal ≥ 44 px reales de alto')
  assert.ok(small.consMinH * 0.8 >= 36, 'consonante ≥ 36 px reales de alto')
  // En compacto (2 pares por fila) cada consonante mide (346 − 4 − 2·3) / 4 · 0,8 ≈ 67 px reales de ancho.
  assert.ok(((346 - 4 - 6) / 4) * 0.8 >= 36)
  // «ɝ ɚ» comparten celda: en 320 cada mitad mediría 33 px reales → una encima de otra; en 390, lado a lado.
  assert.equal(small.stackShared, true)
  assert.equal(big.stackShared, false)
  // Zoom raro o ancho 0: no revienta.
  assert.equal(g.chartSizing(0, NaN).compact, true)
})

// ---- Enlace a la hoja (S-11) ----

test('S-11 soundLink: openSound avisa a quien escucha (App abre la hoja) y deja de avisar al darse de baja', async () => {
  const l = await loadFresh('/src/lib/soundLink.ts')
  const got = []
  const off = l.onOpenSound((id) => got.push(id))
  l.openSound('th')
  off()
  l.openSound('ih')
  assert.deepEqual(got, ['th'])
})

// ---- Voz americana forzada (S-08) y sonido suelto (S-08) ----

let synth = null
// Las voces del teléfono: SIEMPRE el mismo array (el plugin web guarda la referencia la primera vez que no está vacío;
// vaciándolo o llenándolo en sitio, cada test ve las suyas sea cual sea el orden de los tests).
function fakeVoice() {
  if (synth) {
    synth.current = null
    synth.spoken = []
    synth.voices.length = 0
    return synth
  }
  synth = { current: null, spoken: [], voices: [] }
  globalThis.window = globalThis
  globalThis.addEventListener ??= () => {}
  globalThis.SpeechSynthesisUtterance = class {}
  globalThis.speechSynthesis = {
    getVoices: () => synth.voices,
    speak: (u) => {
      synth.current = u
      synth.spoken.push(u)
    },
    cancel: () => {
      synth.current = null
    },
  }
  synth.end = () => {
    const u = synth.current
    synth.current = null
    u?.onend?.()
  }
  return synth
}
const tick = () => new Promise((r) => setImmediate(r))
async function playThrough(p) {
  let done = false
  p.then(() => (done = true))
  for (let i = 0; i < 400 && !done; i++) {
    await tick()
    if (synth.current) synth.end()
  }
  await p
}

test('S-08: en Sonidos la voz es americana aunque el profe sea Leo (en-GB), y la lenta va a 0,6', async () => {
  const s = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  tts.setTeacherVoice('en-GB', 'male')
  tts.setVoicePrefs(1, null)
  await playThrough(tts.speakUS('think'))
  await playThrough(tts.speakUS('think', { slow: true }))
  assert.deepEqual(
    s.spoken.map((u) => [u.text, u.lang, u.rate]),
    [
      ['think', 'en-US', 1],
      ['think', 'en-US', tts.SLOW_RATE],
    ],
  )
  assert.equal(tts.SLOW_RATE, 0.6)
  assert.ok(s.spoken.every((u) => u.pitch === 1), 'sin el tono grave de Leo')
})

test('S-09: el deletreo es UNA lectura (una clave ⏸ de principio a fin), letra a letra con pausas', async () => {
  const s = fakeVoice()
  const tts = await loadFresh('/src/lib/tts.ts')
  const keys = []
  const p = tts.speakUS(['B.', 'O.', 'B.'], { key: 'spell:x', gapMs: 5 })
  let done = false
  p.then(() => (done = true))
  for (let i = 0; i < 400 && !done; i++) {
    await new Promise((r) => setTimeout(r, 1))
    keys.push(tts.speakingKey())
    if (s.current) s.end()
  }
  await p
  assert.deepEqual(s.spoken.map((u) => u.text), ['B.', 'O.', 'B.'])
  assert.ok(keys.slice(0, -1).every((k) => k === 'spell:x' || k === null))
  assert.ok(keys.filter((k) => k === 'spell:x').length >= 3, 'el ⏸ sigue durante las pausas')
  assert.equal(tts.speakingKey(), null, 'al acabar vuelve a ▶')
})

test('S-08: el sonido suelto suena con foco de audio «bajar la música» y lo suelta; si el archivo falla, dice la palabra lenta', async () => {
  const s = fakeVoice()
  let mode = 'ok'
  const played = []
  globalThis.Audio = class {
    constructor(src) {
      this.src = src
      played.push(src)
    }
    play() {
      if (mode === 'fail') {
        setImmediate(() => this.onerror?.())
        return Promise.resolve()
      }
      setImmediate(() => this.onended?.())
      return Promise.resolve()
    }
    pause() {}
  }
  const audio = await loadFresh('/src/lib/soundAudio.ts')
  const tts = audio // audioFocusState y speakingKey de la MISMA instancia que usa soundAudio
  await audio.toggleSound('sounds/th.ogg', 'think', 'sound:th')
  assert.deepEqual(played, ['sounds/th.ogg'])
  assert.equal(tts.audioFocusState().trace.includes('duck'), true, 'baja la música mientras suena')
  await new Promise((r) => setTimeout(r, 700)) // RELEASE_DELAY_MS
  assert.deepEqual(tts.audioFocusState().holders, [], 'y la suelta al acabar')
  assert.equal(tts.speakingKey(), null)
  mode = 'fail'
  await playThrough(audio.toggleSound('sounds/missing.ogg', 'think', 'sound:th'))
  assert.deepEqual(s.spoken.map((u) => [u.text, u.lang, u.rate]), [['think', 'en-US', 0.6]], 'cae a la palabra clave lenta')
  // Sin archivo: directamente la palabra lenta.
  s.spoken = []
  await playThrough(audio.toggleSound(undefined, 'ship', 'sound:ih'))
  assert.deepEqual(s.spoken.map((u) => u.text), ['ship'])
  delete globalThis.Audio
})


// ---- Recorrido de las fichas (S-08: «las 41 fichas abren sin error») ----

const unescape = (html) =>
  html
    .replace(/<!-- -->/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

test('S-08 recorrido: cada ficha de phonemes.json se pinta sin error, con su símbolo, su palabra clave y sus pares', async () => {
  // React de node_modules (el mismo que Vite deja fuera del grafo al cargar la pantalla).
  const { renderToString } = await import('react-dom/server')
  const { createElement } = await import('react')
  const { default: SoundScreen } = await loadFresh('/src/screens/SoundScreen.tsx')
  const { phonemes } = json('phonemes.json')
  const catalog = { phonemes, lessons: json('lessons.json').lessons, alphabet: json('alphabet.json') }
  const settings = { theme: 'lumi', mode: 'dark' }
  for (const p of phonemes) {
    for (const inClass of [false, true]) {
      // Texto tal cual: sin los <!-- --> que React mete entre trozos («/», símbolo, «/») ni entidades (won&#x27;t → won't).
      const html = unescape(renderToString(createElement(SoundScreen, { id: p.id, settings, catalog, inClass, onBack() {}, onOpenSound() {}, onOpenLesson() {} })))
      assert.ok(html.includes(`/${p.ipa}/`), `${p.id}: símbolo`)
      assert.ok(html.includes(p.keyword), `${p.id}: palabra clave`)
      for (const mp of p.minimalPairs ?? []) if (mp.pairs.length) assert.ok(html.includes(mp.pairs[0][0]), `${p.id}: par ${mp.pairs[0].join('/')}`)
      // Encima de una clase (hoja) no hay «Practicar» (el micro es el de la clase).
      if (inClass) assert.ok(!html.includes('Practicar ·'), `${p.id}: sin «Practicar» en la hoja`)
    }
  }
  const missing = renderToString(createElement(SoundScreen, { id: 'no-existe', settings, catalog, onBack() {}, onOpenSound() {} }))
  assert.ok(missing.includes('ya no existe'))
})

// ---- Revisión R, ronda 1 (REV-11-D4-02 y REV-11-D4-03) ----

test('REV-11-D4-03: con la voz en-GB de Leo elegida por el usuario, Sonidos usa OTRA voz, la en-US', async () => {
  // Independiente del orden: las voces se ponen en el array compartido y se quitan al acabar (finally, abajo).
  const s = fakeVoice()
  const uk = { name: 'Google UK English Male', lang: 'en-GB', voiceURI: 'uk-male' }
  const us = { name: 'Google US English', lang: 'en-US', voiceURI: 'us' }
  s.voices.push(uk, us)
  try {
    const tts = await loadFresh('/src/lib/tts.ts')
    tts.setTeacherVoice('en-GB', 'male')
    tts.setVoicePrefs(1, 0) // el usuario eligió la voz británica de Leo (índice 0)
    await playThrough(tts.speakUS('think'))
    assert.equal(s.spoken.length, 1)
    assert.equal(s.spoken[0].voice, us, 'la voz de la palabra es la americana, no la elegida para Leo')
    assert.equal(s.spoken[0].lang, 'en-US')
    // La explicación en español con inglés dentro: el inglés, también con la americana.
    s.spoken = []
    await playThrough(tts.toggleSpeakSpanishUS('Di think con la lengua entre los dientes.', 'k'))
    const en = s.spoken.filter((u) => u.lang !== 'es-ES')
    assert.ok(en.length >= 1 && en.every((u) => u.voice === us), 'los tramos en inglés con la voz americana')
    // Y el profe sigue con la suya fuera de Sonidos.
    s.spoken = []
    await playThrough(tts.speak('Hello', 1, 0))
    assert.equal(s.spoken[0].voice, uk, 'el resto de la app no cambia de voz')
  } finally {
    s.voices.length = 0
  }
})

test('REV-11-D4-02 (regla 9): Dilo tú de Sonidos solo abre el micro y la ruta con la parte abierta y en primer plano', () => {
  const src = readFileSync(new URL('../src/components/SoundSay.tsx', import.meta.url), 'utf8')
  // Ruta Bluetooth: retenida solo mientras el componente está montado (holdRoute devuelve cómo soltarla).
  assert.match(src, /useEffect\(\(\) => holdRoute\(\), \[\]\)/, 'holdRoute solo en un efecto de montaje que lo suelta al desmontar')
  assert.equal(src.match(/holdRoute\(/g).length, 1, 'ninguna otra llamada a holdRoute')
  // Billete ANTES de esperar nada: una apertura que coincide con el paso a segundo plano (releaseAllMics) se cancela.
  const toggle = src.slice(src.indexOf('const toggleRecord'), src.indexOf('useEffect(() => {\n    toggleRef.current'))
  assert.ok(toggle.indexOf('.ticket()') >= 0 && toggle.indexOf('.ticket()') < toggle.indexOf('await'), 'ticket() antes del primer await')
  assert.match(toggle, /recorder\.current\.begin\(ticket\)/)
  assert.match(toggle, /if \(!\(await recorder\.current\.begin\(ticket\)\)\)/, 'una apertura cancelada no pasa a «grabando»')
  // En segundo plano, grabando o abriendo: vuelve a «Toca para hablar» (lifecycle ya cerró el micro).
  const bg = src.slice(src.indexOf("if (step !== 'recording' && step !== 'opening') return"), src.indexOf('}, [step])', src.indexOf('whenBackground(')))
  assert.match(bg, /whenBackground\(/)
  assert.match(bg, /setStep\('ask'\)/)
  // Al salir (desmontar): micro cerrado, voz y audio parados.
  const unmount = src.slice(src.indexOf('const rec = recorder.current'), src.indexOf('}, [])', src.indexOf('const rec = recorder.current')))
  for (const k of ['rec.close()', 'stopSoundAudio()', 'stopSpeaking()']) assert.ok(unmount.includes(k), k)
  // Las demás piezas de Sonidos no tocan el micro ni la ruta.
  for (const f of ['components/SoundExercises.tsx', 'components/SoundsPanel.tsx', 'components/PhonemeChart.tsx', 'screens/SoundScreen.tsx', 'screens/AlphabetScreen.tsx', 'screens/SoundLessonScreen.tsx', 'lib/soundAudio.ts']) {
    const other = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')
    assert.ok(!/recorder|audioRoute|getUserMedia/.test(other), `${f} no abre el micro`)
  }
})

test('M-09 (REV-11-D1-05, integración D4): el Inicio empieza otra ronda de redacciones al montarse, antes de calcular los avisos', () => {
  const src = readFileSync(new URL('../src/screens/Home.tsx', import.meta.url), 'utf8')
  const call = src.indexOf('useState(() => newTipRound())')
  assert.ok(call > 0, 'newTipRound en un inicializador de estado (una vez por montaje, no en cada pintado)')
  assert.ok(call < src.indexOf('buildTips('), 'antes de calcular los avisos')
  assert.equal(src.match(/newTipRound\(/g).length, 1, 'solo ahí')
})

test('REV-11-D4-04: el panel de la tabla se vuelve a medir cuando crece lo de arriba (tarjeta del plan) y nunca baja de 160 px', async () => {
  const g = await loadFresh('/src/lib/soundGame.ts')
  // 390×844: fondo útil 732 (844 − 112 de la barra). Panel que empieza en 521 → 207; si la tarjeta crece 44 px → 163.
  assert.equal(g.panelHeight(732, 521), 207)
  assert.equal(g.panelHeight(732, 565), 163)
  assert.equal(g.panelHeight(732, 700), g.PANEL_MIN_HEIGHT, 'en horizontal (poco alto) el panel no baja de 160')
  const src = readFileSync(new URL('../src/components/SoundsPanel.tsx', import.meta.url), 'utf8')
  const fill = src.slice(src.indexOf('function FillPanel'))
  assert.match(fill, /firstElementChild/, 'observa el bloque entero del Inicio')
  assert.match(fill, /ro\.observe\(page\)/, 'con ResizeObserver: si crece, algo de arriba cambió')
  assert.match(fill, /addEventListener\('resize', measure\)/)
  assert.ok(!src.includes('<InfiniteList'), 'ya no usa InfiniteList (que no se enteraba)')
})

test('S-09/S-10 recorrido: cada ejercicio de las lecciones se pinta sin error (letras con su letra, columnas con su etiqueta)', async () => {
  const { renderToString } = await import('react-dom/server')
  const { createElement } = await import('react')
  const X = await loadFresh('/src/components/SoundExercises.tsx')
  const { default: SoundSay } = await loadFresh('/src/components/SoundSay.tsx')
  const { phonemes } = json('phonemes.json')
  const alphabet = json('alphabet.json')
  const { lessons } = json('lessons.json')
  const settings = { theme: 'lumi', mode: 'dark', azureKey: '', azureRegion: '', phoneticsOn: false }
  const common = { mascot: 'aqua', mascotName: 'Gota', onDone() {}, alphabet, seed: 7 }
  let n = 0
  for (const l of lessons)
    for (const ex of l.exercises) {
      const el =
        ex.type === 'listen-choose'
          ? createElement(X.ListenChoose, { ex, ...common })
          : ex.type === 'odd-one-out'
            ? createElement(X.OddOneOut, { ex, ...common })
            : ex.type === 'sort'
              ? createElement(X.Sort, { ex, phonemes, ...common })
              : ex.type === 'spell-listen'
                ? createElement(X.SpellListen, { ex, ...common })
                : createElement(SoundSay, { ex, phonemes, main: l.phonemes[0], settings, update() {}, ...common })
      const html = unescape(renderToString(el))
      n++
      if (ex.type === 'sort') {
        for (const [w] of ex.words) assert.ok(html.includes(w), `${ex.id}: ${w}`)
        ex.columns.forEach((c, i) => assert.ok(html.includes(ex.columnLabels?.[i] ?? `/${phonemes.find((p) => p.id === c).ipa}/`), `${ex.id}: columna ${c}`))
      }
      if (ex.type === 'odd-one-out') for (const w of ex.words) assert.ok(html.includes(w), `${ex.id}: ${w}`)
      if (ex.type === 'spell-listen') assert.ok(html.includes('Escucha el deletreo'), ex.id)
      if (ex.type === 'say-word') assert.ok(html.includes(ex.words[0]), ex.id)
    }
  assert.ok(n >= 60, `${n} ejercicios`)
})

test('Arranque: las pantallas de Sonidos no van en el chunk principal (React.lazy en Home y App)', () => {
  const home = readFileSync(new URL('../src/screens/Home.tsx', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  for (const [name, src] of [['Home', home], ['App', app]])
    assert.ok(!/^import (?!type)[^\n]*from '\.{1,2}\/components\/Sound/m.test(src), `${name}: ninguna importación estática de components/Sound*`)
  assert.match(home, /lazy\(\(\) => import\('\.\.\/components\/SoundsPanel'\)\)/)
  assert.match(home, /lazy\(\(\) => import\('\.\.\/components\/SoundRoutes'\)\)/)
  assert.match(app, /lazy\(\(\) => import\('\.\/components\/SoundSheet'\)\)/)
  assert.equal((home.match(/<Suspense fallback=\{soundsLoading\}>/g) ?? []).length, 2, 'panel y pila con el mismo aviso discreto')
})
