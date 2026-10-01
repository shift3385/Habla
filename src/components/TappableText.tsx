/** Texto en el que cada palabra se puede tocar para consultarla (con la frase como contexto). */
export default function TappableText({ text, onWord }: { text: string; onWord: (word: string, start: number) => void }) {
  const parts: { t: string; start: number; word: boolean }[] = []
  const re = /[A-Za-zÀ-ÿ'’-]+/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index), start: last, word: false })
    parts.push({ t: m[0], start: m.index, word: true })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ t: text.slice(last), start: last, word: false })

  return (
    <>
      {parts.map((p, i) =>
        p.word ? (
          <span
            key={i}
            role="button"
            onClick={() => onWord(p.t.replace(/[’']$/, ''), p.start)}
            className="cursor-pointer rounded-[4px] active:bg-[var(--gb)]"
          >
            {p.t}
          </span>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </>
  )
}
