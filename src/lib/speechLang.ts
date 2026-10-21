// v5.10 (P4b, uso real 2026-10-19): las explicaciones de Gramática están en español pero llevan inglés dentro («Con he,
// she e it el verbo lleva -s: works, watches…», «I work from home»). Leídas enteras con la voz española, el inglés
// sonaba con fonética española, y el dueño pidió que lo inglés se pronuncie bien: para eso es el profe de inglés.
// Aquí se parte el texto en tramos por idioma; tts.ts lee cada tramo con su voz. Módulo puro (tests/speechLang.test.mjs,
// tests/d2-speechLang.test.mjs).
// 5.10.1 (REG-A3-13/14): integrada la propuesta de A3 (evidencia/A3/speechLang-propuesta.ts): más palabras inglesas,
// homógrafos a BOTH, metalengua y palabras sueltas españolas en ES_MARK, terminaciones españolas en las citas.
// 5.10.1 (REG-M-10): los números ya no parten el inglés: «on May 5th» → «on May fifth» en un solo tramo inglés.

export type LangSegment = { lang: 'es' | 'en'; text: string }

// Palabras inglesas que aparecen sin comillas en las explicaciones (sacadas de src/grammar/*.json). Se dejan fuera
// las que se escriben igual en español y suenan bien con la voz española (base, normal, simple, modal…).
// 5.10.1 (REG-A3-14): + and, although, despite, already, nobody, old, answer, refuse, needn't… (se leían en español:
// «María and her husband» cambiaba de voz en «and»).
// 5.11 (pausas, D4): + or, but, nor, with, from, into, there, here, these, those, also, only, very, some: palabras cortas
// inglesas que ninguna palabra española escribe igual («Con he, she or it el verbo…» leía «or» con la voz española).
// Las que sí coinciden con el español («a», «no», «son»…) siguen en BOTH y deciden por las vecinas.
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
  understand until up us use used usually verb wait wake wall want wanted was watched watches we week well went were
  wh- what when where whether which while who why will won't wondering wooden work worked works worry worse worst would
  write written wrote years yes yesterday yet you you'll you're your yours yourself yourselves
  and although though even despite spite already nobody old answer refuse continue husband wife needn't too hour
  or but nor with from into there here these those also only very some`.split(/\s+/),
)

// Se escriben igual en los dos idiomas: toman el idioma de las palabras de al lado («Con he, she e it» → inglés;
// «He ido» → español).
// 5.10.1 (REG-A3-14): + decide, plan, favor, real, uses (también son español: «el primero decide», «no uses «wish»») y
// bus, taxi, yoga (entre inglés, inglés: «at the bus stop» va en un tramo, no en tres).
const BOTH = new Set(['a', 'he', 'no', 'me', 'once', 'ten', 'come', 'red', 'son', 'decide', 'plan', 'favor', 'real', 'uses', 'bus', 'taxi', 'yoga'])
const PRONOUNS = new Set(['he', 'me'])

// Una cita «…» con alguna de estas palabras (o con tildes, ñ, ¿, ¡) es español: «saber», «a las siete», «llevaba +
// gerundio». Si no, la cita entera es inglés, aunque lleve palabras que no están en EN («Water boils at 100 °C»).
// 5.10.1 (REG-A3-13): + la metalengua de las fórmulas («If + presente simple, will + verbo») y palabras sueltas que se
// citan en los contrastes («cualquier», «me levanto», «no vi nada», «su», «cuyo»…).
const ES_MARK = new Set(
  `el la los las lo le les de del en que para por hasta hace desde antes como muy tarde se te con ellos ella ya voy si
  sí puede puedo debe ser estar haber hay saber tener hacer poder nacer fui jugaba tuviera llevaba gerundio participio
  infinitivo objeto sido enviado construido habla cansado verdad sea ayudo llamo mejor falta salir cocinando casa mesa
  lunes siete julio ido ha han estoy nadar entregarse mismo un una y o pero cuando
  verbo presente pasado sujeto nombre sustantivo adjetivo adverbio comparativo superlativo incontable contable persona frase
  soy cualquier poco pocos nada nadie vi vino quisiera aunque porque embargo hubiera levanto su cuyo e u`.split(/\s+/),
)

const SPANISH_CHARS = /[áéíóúñü¿¡]/i
const WORD = /[A-Za-zÁÉÍÓÚáéíóúÑñÜü'’-]+/g
// 5.10.1 (REG-M-10): palabras y números. Los ordinales («5th», «22nd») y las décadas («1990s») son una palabra inglesa;
// el resto de números («7:30», «2024», «100») se trocea entero (no se separa la hora en «7» + «:» + «30»).
const TOKEN = /(\d+(?:st|nd|rd|th|s)\b)|(\d+(?:[:.,]\d+)*)|([A-Za-zÁÉÍÓÚáéíóúÑñÜü'’-]+)/g

// Palabras inglesas que piden un número detrás: «at 10:00 o at 7:30» sigue siendo inglés aunque venga «o».
const NUM_LEAD = new Set(['at', 'in', 'on', 'by', 'the', 'of', 'to', 'from', 'until', 'since', 'before', 'after', 'about', 'around', 'for'])

const norm = (w: string) => w.toLowerCase().replace(/’/g, "'")

// 5.10.1 (REG-A3-13): terminaciones muy españolas («actualmente», «embarazada», «ingeniero», «quisiera») también
// marcan español una cita.
const ES_SUFFIX = /(mente|ción|ciones|iera|ieras|ada|adas|ado|ados|ero|eros|aba|ando|iendo)$/
const looksSpanish = (w: string) => ES_MARK.has(w) || (w.length > 4 && !EN.has(w) && ES_SUFFIX.test(w))

function quoteIsSpanish(q: string): boolean {
  if (SPANISH_CHARS.test(q)) return true
  return (q.match(WORD) ?? []).some((w) => looksSpanish(norm(w)))
}

const ORDINALS = `zeroth first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth thirteenth fourteenth
  fifteenth sixteenth seventeenth eighteenth nineteenth`.split(/\s+/)
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/**
 * 5.10.1 (REG-M-10): un ordinal en palabras («5» → «fifth», «21» → «twenty-first», «30» → «thirtieth»). Las voces lo
 * leen así sin dudar (algunas decían «five» + «th»). Más de 99 → null: se deja con cifras y lo lee la voz inglesa.
 */
export function ordinalWord(n: number): string | null {
  if (!Number.isInteger(n) || n < 0) return null
  if (n < 20) return ORDINALS[n]
  if (n < 100) {
    const tens = TENS[Math.floor(n / 10)]
    return n % 10 ? `${tens}-${ORDINALS[n % 10]}` : tens.replace(/y$/, 'ieth')
  }
  return null
}

/** «May 5th» → «May fifth» (dentro de un tramo inglés). */
const ordinalsToWords = (t: string) => t.replace(/\b(\d+)(st|nd|rd|th)\b/g, (m, d: string) => ordinalWord(Number(d)) ?? m)

type Tok = { text: string; lang: 'es' | 'en' | 'both' | 'num' | 'none'; quote?: boolean }

/** Trocea un texto (fuera de comillas, o una cita en español) en palabras con idioma y separadores sin idioma. */
function tokenize(text: string, out: Tok[]) {
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index), lang: 'none' })
    if (m[1]) out.push({ text: ordinalsToWords(m[1]), lang: 'en' })
    else if (m[2]) out.push({ text: m[2], lang: 'num' })
    else {
      const w = norm(m[0])
      out.push({ text: m[0], lang: SPANISH_CHARS.test(w) ? 'es' : EN.has(w) ? 'en' : BOTH.has(w) ? 'both' : 'es' })
    }
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), lang: 'none' })
}

/**
 * Parte un texto en español con inglés dentro en tramos `es`/`en`, listos para leer cada uno con su voz. Quita la
 * transcripción fonética (/kən/), que ninguna voz lee bien, y las comillas « ».
 */
export function splitByLanguage(text: string): LangSegment[] {
  return splitForReading(text).map(({ lang, text }) => ({ lang, text }))
}

/** Como splitByLanguage, pero cada tramo dice si empieza en una cita «…» (para la pausa de antes de un ejemplo). */
export function splitForReading(text: string): ReadSegment[] {
  // Solo /…/ con símbolos fonéticos: «he/she/it» o «do/does» no son fonética.
  const clean = text.replace(/\/[^/\s]*[əɪʊæʌɜɑɔθðŋʃʒːˈˌɚɝ][^/\s]*\//g, '').replace(/\(\s*\)/g, '')
  const toks: Tok[] = []
  let last = 0
  for (const m of clean.matchAll(/«([^»]*)»/g)) {
    tokenize(clean.slice(last, m.index), toks)
    const first = toks.length
    if (quoteIsSpanish(m[1])) tokenize(m[1], toks)
    else toks.push({ text: ordinalsToWords(m[1]), lang: 'en' })
    // 5.11 (pausas): se recuerda dónde empieza cada cita (un tramo que empieza en una cita es un ejemplo).
    if (toks[first]) toks[first].quote = true
    last = m.index! + m[0].length
  }
  tokenize(clean.slice(last), toks)

  // Las palabras de los dos idiomas toman el de la palabra anterior con idioma claro (o, si no hay, la siguiente).
  const words = toks.map((t, k) => ({ t, k })).filter(({ t }) => t.lang !== 'none')
  words.forEach(({ t, k }, i) => {
    if (t.lang !== 'both' && t.lang !== 'num') return
    const before = words.slice(0, i).reverse().find((w) => w.t.lang === 'es' || w.t.lang === 'en')?.t
    const prev = before?.lang
    const next = words.slice(i + 1).find((w) => w.t.lang === 'es' || w.t.lang === 'en')?.t.lang
    if (t.lang === 'num') {
      // 5.10.1 (REG-M-10): un número detrás de inglés es inglés («at 7:30, at noon», «in 2024», «(at 10)…»); si el
      // inglés no lo pide (no es «at», «in», «the»…) y sigue español sin pausa, es español («works 3 veces»). Detrás de
      // español, español («el 5 de mayo»).
      let gap = ''
      for (let j = k + 1; j < toks.length && toks[j].lang === 'none'; j++) gap += toks[j].text
      const pause = /[.,;:)!?]/.test(gap) || !next
      const asks = before && NUM_LEAD.has(norm(before.text))
      t.lang = prev === 'en' && (next === 'en' || pause || asks) ? 'en' : !prev && next === 'en' ? 'en' : 'es'
      return
    }
    const p = prev ?? next
    const n = next ?? prev
    // «Con he, she…»: un pronombre seguido de inglés es inglés aunque venga detrás de español. El resto («a», «no»)
    // solo si va entre inglés: «equivale a «can»» sigue siendo la «a» española.
    t.lang = PRONOUNS.has(norm(t.text)) ? (n === 'en' ? 'en' : 'es') : p === 'en' && n === 'en' ? 'en' : 'es'
  })

  // Une los tramos seguidos del mismo idioma; los separadores (espacios, comas) se quedan con el tramo en curso,
  // salvo la puntuación final, que ayuda a la voz a hacer la pausa.
  const segs: ReadSegment[] = []
  for (const t of toks) {
    const lang = t.lang === 'none' ? (segs.at(-1)?.lang ?? 'es') : (t.lang as 'es' | 'en')
    const cur = segs.at(-1)
    if (cur && cur.lang === lang) cur.text += t.text
    else segs.push(t.quote ? { lang, text: t.text, quoted: true } : { lang, text: t.text })
  }
  // «he/she/it» se lee «he, she, it» (no «slash») y «-s» como «s».
  const speakable = (t: string) => t.replace(/\s*\/\s*/g, ', ').replace(/(^|[\s(])-(?=\p{L})/gu, '$1').replace(/\s+/g, ' ')
  return segs.map((s) => ({ ...s, text: speakable(s.text).replace(/[¿¡(]+$/, '').trim() })).filter((s) => /[\p{L}\p{N}]/u.test(s.text))
}

// ---------------------------------------------------------------------------------------------------------------------
// 5.11 (pausas, dueño): al leer por tramos (explicaciones en español con inglés dentro, respuestas del profe con citas en
// español) los tramos iban de corrido: «…para horarios fijos, ejemplo: I work from home» sonaba sin respirar. Entre un
// tramo y el siguiente se espera según cómo acaba el anterior, y algo más antes de un ejemplo. Sin SSML: tts.ts espera
// entre llamadas a la voz (cancelable al instante con ⏸ o stop) y sin soltar el foco de audio (sigue siendo una lectura).

/** Un tramo para leer; `quoted`: empieza en una cita «…» (un ejemplo). */
export type ReadSegment = LangSegment & { quoted?: boolean }

/** 5.11 (pausas, dueño): espera entre tramos, en ms, según la puntuación con la que acaba el anterior. */
export const PAUSE_MS = {
  /** coma o punto y coma */
  comma: 200,
  /** dos puntos */
  colon: 400,
  /** punto, ¿?, ¡!, puntos suspensivos */
  stop: 500,
  /** antes de un ejemplo: de español a inglés, tras «ejemplo:», «por ejemplo», «como», o antes de una cita «…» */
  example: 600,
} as const

// Fin de tramo que anuncia un ejemplo: «… ejemplo:», «por ejemplo,», «como» (con o sin puntuación detrás).
const EXAMPLE_LEAD = /(?:^|\s)(?:por\s+)?(?:ejemplos?|como|p\.\s*ej\.?)[\s:,;.]*$/i

/** Milisegundos de pausa entre el tramo `prev` y el `next` (0 = seguido). Puro: tests/m4-pausas.test.mjs. */
export function pauseBetween(prev: ReadSegment | undefined, next: ReadSegment): number {
  if (!prev) return 0
  const end = prev.text.trimEnd().replace(/["'»”’)\]]+$/, '')
  const byMark = (m: string) => (/[.!?…]/.test(m) ? PAUSE_MS.stop : m === ':' ? PAUSE_MS.colon : /[,;]/.test(m) ? PAUSE_MS.comma : 0)
  // El tramo que sigue a una cita puede empezar por su puntuación («…casa», using…»): esa es la pausa, y no la de un
  // ejemplo (ya se dijo).
  const lead = next.text.trimStart().match(/^[,;:.!?…]/)?.[0]
  if (lead) return byMark(lead)
  const punct = byMark(end.slice(-1))
  // De español a inglés, pausa de ejemplo solo si el inglés es una frase acabada (punto, ¿?, ¡!) o el español la anuncia
  // con dos puntos (las citas y «ejemplo:», «por ejemplo», «como» ya cuentan arriba). Las palabras inglesas metidas en la
  // frase («Con he, she or it el verbo…», «termina en -s») van seguidas: con la regla de «3 palabras o más» sonaba
  // «Con · 614 ms · he, she or it» (decisión del orquestador y del dueño, 2026-10-21).
  const toEnglish = prev.lang === 'es' && next.lang === 'en' && (/[.!?]$/.test(next.text.trimEnd()) || end.endsWith(':'))
  const example = toEnglish || !!next.quoted || EXAMPLE_LEAD.test(end)
  return Math.max(punct, example ? PAUSE_MS.example : 0)
}
