// v5.10 (P4b, uso real 2026-10-19): las explicaciones de Gramática están en español pero llevan inglés dentro («Con he,
// she e it el verbo lleva -s: works, watches…», «I work from home»). Leídas enteras con la voz española, el inglés
// sonaba con fonética española, y el dueño pidió que lo inglés se pronuncie bien: para eso es el profe de inglés.
// Aquí se parte el texto en tramos por idioma; tts.ts lee cada tramo con su voz. Módulo puro (tests/speechLang.test.mjs).

export type LangSegment = { lang: 'es' | 'en'; text: string }

// Palabras inglesas que aparecen sin comillas en las explicaciones (sacadas de src/grammar/*.json). Se dejan fuera
// las que se escriben igual en español y suenan bien con la voz española (base, normal, simple, modal, taxi, bus…).
const EN = new Set(
  `'d 'll 'm 're 's 've -d -ed -er -es -est -ied -ier -iest -ing -s -y about actually advice afford after ago agree
  airport always am an any any- anybody anyone anything anywhere are aren't as asked assist at ate attend avoid back bad
  baggage be beautiful because been before begin believe belong best better big bigger bike birthday bookstore bought
  box business buy by cake call came can can't cannot car carpet carry cheap cheaper cheapest christmas cinema coffee cold
  consider constipated could cost currently damage day days decision depend did didn't discuss dishes do doctor's does
  doesn't doing don't done door down dream dressed during easier easiest easy eat eaten effort embarrassed enjoy enter
  equipment eventually ever every exercise exit expect expensive fabric factory far farther farthest favour feel figure
  find finish floor folder for found friday friends furniture further furthest gave get getting give given go goes going
  gone good got gotten had hardly has hate have haven't her hers herself him himself his home homework hope hours how
  however i i'd i'll i'm i've if in information interesting is isn't it it'll it's italian its itself july just keep kid
  kitchen knew know known last laundry learn leather leave left let's library lie like list listen live lived long look
  love luggage lying made make making many marry may mean meeting midnight mind mine miss mistake moment monday mondays
  money month more morning most much must mustn't my myself need needed never new news next nice night noise noon not
  nothing now nowadays nowhere oak of off offer often on one our ours ourselves out own party pay phone phrasal pick plane
  played possibly practice practise prefer pregnant promise put question rarely realize relax remember research rest
  right room round run running said saw say school second see seem seen sensible sensitive set shall she she'd shoes
  should shouldn't shower since sit sitting small smoke smoking so somebody someone something sometimes soon square stand
  start stop stopped street studied study success suggest summer sure table take taken tell than that the their theirs
  them themselves then they think this thought time tired to today told tomorrow took train true turn twice two
  understand until up us use used uses usually verb wait wake wall want wanted was watched watches we week well went were
  wh- what when where whether which while who why will won't wondering wooden work worked works worry worse worst would
  write written wrote years yes yesterday yet you you'll you're your yours yourself yourselves`.split(/\s+/),
)

// Se escriben igual en los dos idiomas: toman el idioma de las palabras de al lado («Con he, she e it» → inglés;
// «He ido» → español).
const BOTH = new Set(['a', 'he', 'no', 'me', 'once', 'ten', 'come', 'red', 'son'])
const PRONOUNS = new Set(['he', 'me'])

// Una cita «…» con alguna de estas palabras (o con tildes, ñ, ¿, ¡) es español: «saber», «a las siete», «llevaba +
// gerundio». Si no, la cita entera es inglés, aunque lleve palabras que no están en EN («Water boils at 100 °C»).
const ES_MARK = new Set(
  `el la los las lo le les de del en que para por hasta hace desde antes como muy tarde se te con ellos ella ya voy si
  sí puede puedo debe ser estar haber hay saber tener hacer poder nacer fui jugaba tuviera llevaba gerundio participio
  infinitivo objeto sido enviado construido habla cansado verdad sea ayudo llamo mejor falta salir cocinando casa mesa
  lunes siete julio ido ha han estoy nadar entregarse mismo un una y o pero cuando`.split(/\s+/),
)

const SPANISH_CHARS = /[áéíóúñü¿¡]/i
const WORD = /[A-Za-zÁÉÍÓÚáéíóúÑñÜü'’-]+/g

const norm = (w: string) => w.toLowerCase().replace(/’/g, "'")

function quoteIsSpanish(q: string): boolean {
  if (SPANISH_CHARS.test(q)) return true
  return (q.match(WORD) ?? []).some((w) => ES_MARK.has(norm(w)))
}

type Tok = { text: string; lang: 'es' | 'en' | 'both' | 'none' }

/** Trocea un texto (fuera de comillas, o una cita en español) en palabras con idioma y separadores sin idioma. */
function tokenize(text: string, out: Tok[]) {
  let last = 0
  for (const m of text.matchAll(WORD)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index), lang: 'none' })
    const w = norm(m[0])
    out.push({ text: m[0], lang: SPANISH_CHARS.test(w) ? 'es' : EN.has(w) ? 'en' : BOTH.has(w) ? 'both' : 'es' })
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), lang: 'none' })
}

/**
 * Parte un texto en español con inglés dentro en tramos `es`/`en`, listos para leer cada uno con su voz. Quita la
 * transcripción fonética (/kən/), que ninguna voz lee bien, y las comillas « ».
 */
export function splitByLanguage(text: string): LangSegment[] {
  // Solo /…/ con símbolos fonéticos: «he/she/it» o «do/does» no son fonética.
  const clean = text.replace(/\/[^/\s]*[əɪʊæʌɜɑɔθðŋʃʒːˈˌɚɝ][^/\s]*\//g, '').replace(/\(\s*\)/g, '')
  const toks: Tok[] = []
  let last = 0
  for (const m of clean.matchAll(/«([^»]*)»/g)) {
    tokenize(clean.slice(last, m.index), toks)
    if (quoteIsSpanish(m[1])) tokenize(m[1], toks)
    else toks.push({ text: m[1], lang: 'en' })
    last = m.index! + m[0].length
  }
  tokenize(clean.slice(last), toks)

  // Las palabras de los dos idiomas toman el de la palabra anterior con idioma claro (o, si no hay, la siguiente).
  const words = toks.filter((t) => t.lang !== 'none')
  words.forEach((t, i) => {
    if (t.lang !== 'both') return
    const prev = words.slice(0, i).reverse().find((w) => w.lang === 'es' || w.lang === 'en')
    const next = words.slice(i + 1).find((w) => w.lang === 'es' || w.lang === 'en')
    const p = prev?.lang ?? next?.lang
    const n = next?.lang ?? prev?.lang
    // «Con he, she…»: un pronombre seguido de inglés es inglés aunque venga detrás de español. El resto («a», «no»)
    // solo si va entre inglés: «equivale a «can»» sigue siendo la «a» española.
    t.lang = PRONOUNS.has(norm(t.text)) ? (n === 'en' ? 'en' : 'es') : p === 'en' && n === 'en' ? 'en' : 'es'
  })

  // Une los tramos seguidos del mismo idioma; los separadores (espacios, comas) se quedan con el tramo en curso,
  // salvo la puntuación final, que ayuda a la voz a hacer la pausa.
  const segs: LangSegment[] = []
  for (const t of toks) {
    const lang = t.lang === 'none' ? (segs.at(-1)?.lang ?? 'es') : (t.lang as 'es' | 'en')
    const cur = segs.at(-1)
    if (cur && cur.lang === lang) cur.text += t.text
    else segs.push({ lang, text: t.text })
  }
  // «he/she/it» se lee «he, she, it» (no «slash») y «-s» como «s».
  const speakable = (t: string) => t.replace(/\s*\/\s*/g, ', ').replace(/(^|[\s(])-(?=\p{L})/gu, '$1').replace(/\s+/g, ' ')
  return segs.map((s) => ({ ...s, text: speakable(s.text).replace(/[¿¡(]+$/, '').trim() })).filter((s) => /[\p{L}\p{N}]/u.test(s.text))
}
