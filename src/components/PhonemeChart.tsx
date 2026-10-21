import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { stateOf, type Phoneme, type SoundProgress, type SoundState } from '../lib/sounds'
import { chartGrid, chartSizing, STATE_STYLE } from '../lib/soundGame'
import { Icon } from '../ui/icons'

// 5.11 (S-07): tabla fonémica estilo Underhill (DISENO §7.2). Vocales por posición en la boca (delante → atrás, cerrada →
// abierta), diptongos en una fila y consonantes en pares sorda | sonora. El borde dice el estado del sonido (nuevo ·
// visto · practicado · dominado). En horizontal (index.css, .ph-chart) vocales y consonantes van lado a lado.
// Medidas (S-07, en px REALES, decisión del orquestador): vocal ≥ 44 px de alto; consonante ≥ 36 × 36 px; nunca scroll
// horizontal. Con zoom < 1 (viewport.ts) los altos crecen en px CSS; si 8 consonantes por fila no llegan a 36 px reales
// de ancho (320×640), van en 2 bloques plegables de 2 pares por fila (F0-3). Ver soundGame.ts › chartSizing.

interface CellProps {
  progress: Record<string, SoundProgress>
  onOpen: (id: string) => void
  minH: number
}

function Cell({ list, progress, onOpen, big, minH, stack }: CellProps & { list: Phoneme[]; big: boolean; stack?: boolean }) {
  if (!list.length) return <span aria-hidden className="ph-cell-empty" style={{ minHeight: minH }} />
  return (
    <span className={`flex min-w-0 gap-px ${stack && list.length > 1 ? 'flex-col' : ''}`}>
      {list.map((p) => {
        const half = list.length > 1 && !stack
        const st = stateOf(progress[p.id])
        const s = STATE_STYLE[st]
        return (
          <button
            key={p.id}
            onClick={() => onOpen(p.id)}
            data-sound={p.id}
            className={`ph-cell field relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-[12px] px-0.5 leading-none ${big ? 'ph-vowel' : 'ph-cons'}`}
            style={{ minHeight: minH, borderColor: s.color, boxShadow: st === 'new' ? undefined : `inset 0 0 0 ${s.width - 1}px ${s.color}` }}
            aria-label={`/${p.ipa}/ ${p.keyword}, ${p.nameEs}. ${s.label}`}
          >
            <span className={`${big ? 'fs-18' : 'fs-16'} font-semibold`}>{p.ipa}</span>
            {big && (
              // Celda compartida «ɝ ɚ» lado a lado: la mitad es estrecha y «teacher» salía «teac…» (regresión final): la
              // palabra va algo más pequeña y puede pasar a 2 líneas, en vez de cortarse.
              <span className={`ph-word txt-sub mt-0.5 max-w-full ${half ? 'line-clamp-2 fs-9.5 leading-[1.05] break-all' : 'truncate fs-11'}`}>{p.keyword}</span>
            )}
            {st === 'mastered' && (
              <span className="absolute top-0.5 right-1 fs-9 font-bold" style={{ color: 'var(--ok)' }} aria-hidden>
                ✓
              </span>
            )}
          </button>
        )
      })}
    </span>
  )
}

function Title({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="mb-1 flex items-baseline justify-between gap-2 px-0.5">
      <span className="txt-acc2 fs-11 font-semibold tracking-[1.2px] uppercase">{children}</span>
      {hint && <span className="txt-sub truncate fs-10.5">{hint}</span>}
    </div>
  )
}

/** Consonantes en pares sorda | sonora, `perRow` pares por fila. */
function ConsGrid({ rows, pairs, perRow, ...c }: CellProps & { rows: Phoneme[][][]; pairs: number; perRow: number }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}>
      {rows.flatMap((row, r) =>
        Array.from({ length: pairs }, (_, k) => (
          <span key={`${r}:${k}`} className="grid min-w-0 grid-cols-2 gap-px rounded-[13px] p-px" style={{ background: 'var(--gb)' }}>
            <Cell list={row[k * 2] ?? []} big={false} {...c} />
            <Cell list={row[k * 2 + 1] ?? []} big={false} {...c} />
          </span>
        )),
      )}
    </div>
  )
}

/** Bloque plegable de consonantes (modo compacto). */
function Fold({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div>
      <button onClick={onToggle} aria-expanded={open} className="txt-sub flex min-h-10 w-full items-center gap-1.5 px-0.5 text-left fs-12.5 font-semibold">
        <Icon name={open ? 'chevD' : 'chevR'} size={14} />
        {title}
      </button>
      {open && children}
    </div>
  )
}

export default function PhonemeChart({ phonemes, progress, onOpen }: { phonemes: Phoneme[]; progress: Record<string, SoundProgress>; onOpen: (id: string) => void }) {
  const g = useMemo(() => chartGrid(phonemes), [phonemes])
  const vowels = g.vowels
  const diph = g.diphthongs
  const cons = g.consonants
  const pairs = Math.ceil(cons.cols / 2)
  // Ancho del bloque de consonantes (px CSS) y zoom de viewport.ts: deciden los altos mínimos y el modo compacto.
  const consBox = useRef<HTMLElement>(null)
  const vowelBox = useRef<HTMLElement>(null)
  const [box, setBox] = useState<{ w: number; vw: number; z: number }>({ w: 360, vw: 360, z: 1 })
  useEffect(() => {
    const el = consBox.current
    if (!el) return
    const measure = () => {
      const z = parseFloat(document.documentElement.style.zoom || '1') || 1
      const w = el.clientWidth
      const vw = vowelBox.current?.clientWidth ?? w
      setBox((b) => (b.w === w && b.vw === vw && b.z === z ? b : { w, vw, z }))
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    if (vowelBox.current) ro?.observe(vowelBox.current)
    // viewport.ts cambia el zoom con un retraso tras girar o redimensionar: se vuelve a medir entonces.
    const later = () => setTimeout(measure, 200)
    window.addEventListener('resize', later)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', later)
    }
  }, [])
  const size = chartSizing(box.w, box.z, box.vw)
  const [open, setOpen] = useState<[boolean, boolean]>([true, true])
  const common = { progress, onOpen }
  return (
    <div className="ph-chart flex flex-col gap-2.5" data-compact={size.compact || undefined}>
      <div className="ph-col flex min-w-0 flex-col gap-2.5">
        {vowels.rows > 0 && (
          <section ref={vowelBox}>
            <Title hint="delante → atrás">Vocales</Title>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${vowels.cols}, minmax(0, 1fr))` }}>
              {vowels.cells.flatMap((row, r) => row.map((list, c) => <Cell key={`${r}:${c}`} list={list} big minH={size.vowelMinH} stack={size.stackShared} {...common} />))}
            </div>
          </section>
        )}
        {diph.rows > 0 && (
          <section>
            <Title>Diptongos</Title>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${diph.cols}, minmax(0, 1fr))` }}>
              {diph.cells.flatMap((row, r) => row.map((list, c) => <Cell key={`${r}:${c}`} list={list} big minH={size.vowelMinH} {...common} />))}
            </div>
          </section>
        )}
      </div>
      {cons.rows > 0 && (
        <section ref={consBox} className="ph-col min-w-0">
          <Title hint="sorda | sonora">Consonantes</Title>
          {size.compact ? (
            // F0-3: 2 bloques plegables de 2 pares por fila (oclusivas y fricativas · nasales y las demás).
            <div className="flex flex-col gap-1">
              <Fold title="Oclusivas y fricativas" open={open[0]} onToggle={() => setOpen(([a, b]) => [!a, b])}>
                <ConsGrid rows={cons.cells.slice(0, 2)} pairs={pairs} perRow={2} minH={size.consMinH} {...common} />
              </Fold>
              <Fold title="Nasales y las demás" open={open[1]} onToggle={() => setOpen(([a, b]) => [a, !b])}>
                <ConsGrid rows={cons.cells.slice(2)} pairs={pairs} perRow={2} minH={size.consMinH} {...common} />
              </Fold>
            </div>
          ) : (
            <ConsGrid rows={cons.cells} pairs={pairs} perRow={pairs} minH={size.consMinH} {...common} />
          )}
        </section>
      )}
      <div className="ph-legend txt-sub flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 fs-11">
        {(['seen', 'practiced', 'mastered'] as SoundState[]).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ border: `2px solid ${STATE_STYLE[k].color}` }} />
            {STATE_STYLE[k].label}
          </span>
        ))}
      </div>
    </div>
  )
}
