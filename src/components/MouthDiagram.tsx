import { useId, type CSSProperties, type ReactNode } from 'react'

/*
 * 5.11 (boca): los tipos de src/sounds/mouth.ts (generado por scripts/mouth/, ver docs/v5.11/sonidos-boca/CONTRATO.md).
 * Se repiten aquí, con la misma forma, para que este componente no importe mouth.ts: los dibujos pesan y solo deben
 * cargarse en el chunk diferido de Sonidos. La pantalla que lo usa le pasa el módulo entero en `data`.
 */
export type MouthMark = 'tongue' | 'teeth' | 'lips' | 'folds' | 'velum'
export interface MouthPose {
  id: string
  viewBox: string
  body: string
  marks: Partial<Record<MouthMark, [number, number]>>
  nasal: boolean
}
export interface MouthInfo {
  pose: string
  poseEnd?: string
  front: string
  labels: MouthMark[]
  voiced: boolean
}
export interface MouthData {
  MOUTH_POSES: Record<string, MouthPose>
  FRONT_SHAPES: Record<string, string>
  MOUTH_BY_PHONEME: Record<string, MouthInfo>
}

// 5.11 (boca): solo las etiquetas útiles, en español (decisión del dueño, propuesta B). «\n» parte la línea.
const LABEL_ES: Record<MouthMark, string> = {
  tongue: 'Lengua',
  teeth: 'Dientes',
  lips: 'Labios',
  folds: 'Cuerdas vocales:\nvibran',
  velum: 'Velo bajado:\naire por la nariz',
}

/** Cambia el sufijo «__U» de los id de <defs> por uno único: dos dibujos en la misma página no se pisan los gradientes. */
const scope = (svg: string, suffix: string) => svg.replaceAll('__U', `_${suffix}`)

/**
 * 5.11 (boca): corte de perfil de la boca (de la nariz a la laringe) con las etiquetas en una columna a la derecha y una
 * línea fina hasta lo que señalan, la vista de frente en un círculo y, en los diptongos, la posición de inicio → final.
 * Es una imagen fija (nada se anima): en el modo ligero no cambia nada. Si el fonema no tiene dibujo, no pinta nada.
 * `children` va al lado del círculo de frente (los textos de labios, lengua y voz de la ficha).
 */
export default function MouthDiagram({
  phonemeId,
  data,
  ariaLabel,
  children,
}: {
  phonemeId: string
  data: MouthData
  /** Texto para lectores de pantalla (lipsEs, tongueEs, voiceEs de `articulation`). */
  ariaLabel: string
  children?: ReactNode
}) {
  // useId da «:r1:» o ««r1»»: solo se dejan letras y números (los id con «:» rompen url(#…) en algunos WebView).
  const uid = 'm' + useId().replace(/[^A-Za-z0-9]/g, '')
  const info = data.MOUTH_BY_PHONEME[phonemeId]
  const pose = info && data.MOUTH_POSES[info.pose]
  if (!info || !pose) return null
  const end = info.poseEnd ? data.MOUTH_POSES[info.poseEnd] : undefined
  const front = data.FRONT_SHAPES[info.front]

  return (
    <div className="glass flex flex-col gap-2 rounded-[22px] p-2 landscape:flex-row landscape:items-center">
      <div role="img" aria-label={ariaLabel} className="flex min-w-0 items-center gap-1 landscape:flex-[1.5]">
        {end ? (
          <>
            <Section pose={pose} info={info} suffix={`${uid}a`} caption="Empieza" compact />
            <span className="txt-acc2 flex-none fs-18 font-semibold" aria-hidden>
              →
            </span>
            <Section pose={end} info={info} suffix={`${uid}b`} caption="Termina" compact />
          </>
        ) : (
          <Section pose={pose} info={info} suffix={`${uid}a`} />
        )}
      </div>
      {(front || children) && (
        <div className="flex min-w-0 items-center gap-2.5 px-1 pb-1 landscape:flex-1 landscape:flex-col landscape:items-stretch">
          {front && (
            <div className="flex flex-none flex-col items-center gap-0.5 landscape:flex-row landscape:gap-2">
              <div className="h-[76px] w-[76px] overflow-hidden rounded-full" style={{ border: '2px solid var(--acc)' }} aria-hidden>
                <svg viewBox="0 0 120 120" width="100%" height="100%" style={{ display: 'block' }} dangerouslySetInnerHTML={{ __html: scope(front, `${uid}f`) }} />
              </div>
              <span className="txt-sub fs-10.5 font-semibold tracking-[.8px] uppercase">De frente</span>
            </div>
          )}
          {children && <div className="min-w-0 flex-1">{children}</div>}
        </div>
      )}
    </div>
  )
}

/** Un corte de perfil con su columna de etiquetas. */
function Section({ pose, info, suffix, caption, compact }: { pose: MouthPose; info: MouthInfo; suffix: string; caption?: string; compact?: boolean }) {
  const [x, y, w, h] = pose.viewBox.split(/[\s,]+/).map(Number)
  // La columna de etiquetas ocupa ~30 % del ancho (más en los diptongos, que van de dos en dos y son más estrechos).
  const colFrac = compact ? 0.4 : 0.3
  const col = (w * colFrac) / (1 - colFrac)
  const W = w + col
  const s = w / 118 // escala de los adornos: el recorte de los cortes CC0 mide ~118 de ancho
  const labels = info.labels
    .filter((m) => pose.marks[m])
    .map((m) => ({ m, text: compact && m === 'folds' ? 'Cuerdas:\nvibran' : m === 'folds' && !info.voiced ? 'Cuerdas vocales' : LABEL_ES[m], at: pose.marks[m]! }))
  const placed = layout(labels, y, h, compact)
  const folds = info.voiced ? pose.marks.folds : undefined
  const labelX = x + w + col * 0.06

  return (
    // En horizontal, como mucho ~240 px de alto: con 360 px de pantalla el dibujo cabe entero sin desplazar.
    <div className="mx-auto w-full min-w-0 flex-1 landscape:max-w-(--mw)" style={{ '--mw': `${Math.round((240 * W) / h)}px` } as CSSProperties}>
      {caption && <div className="txt-sub mb-0.5 text-center fs-11 font-semibold tracking-[.8px] uppercase">{caption}</div>}
      <div className="relative w-full" style={{ aspectRatio: `${W} / ${h}` }}>
        <svg viewBox={`${x} ${y} ${W} ${h}`} width="100%" height="100%" style={{ display: 'block', position: 'absolute', inset: 0 }} aria-hidden>
          <g dangerouslySetInnerHTML={{ __html: scope(pose.body, suffix) }} />
          {folds && (
            // Sonora: ondas fijas junto a las cuerdas vocales (la vibración no se anima: imagen fija).
            <g data-mouth="waves" fill="none" stroke="#2f7fd0" strokeWidth={0.9 * s} strokeLinecap="round">
              {[-5, 4].map((dy) => (
                <path key={dy} d={`M${folds[0] + 6 * s} ${folds[1] + dy * s} q${2 * s} ${-2 * s} ${4 * s} 0 t${4 * s} 0`} />
              ))}
            </g>
          )}
          {placed.map(({ m, at, ly }) => (
            <g key={m} data-mouth={`lead-${m}`} style={{ stroke: 'var(--tx)', fill: 'var(--tx)' }}>
              <line x1={at[0]} y1={at[1]} x2={labelX - col * 0.03} y2={ly} strokeWidth={0.45 * s} opacity={0.75} />
              <circle cx={at[0]} cy={at[1]} r={1 * s} stroke="none" />
            </g>
          ))}
        </svg>
        {placed.map(({ m, text, ly }) => (
          <span
            key={m}
            data-mouth={`label-${m}`}
            className={`absolute leading-[1.1] font-bold whitespace-pre-line ${compact ? 'fs-10.5' : 'fs-12.5'}`}
            style={{ left: `${((labelX - x) / W) * 100}%`, right: 0, top: `${((ly - y) / h) * 100}%`, transform: 'translateY(-50%)', color: 'var(--tx)' }}
            aria-hidden
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Coloca las etiquetas a la altura de su punto, pero sin solaparse: se ordenan de arriba abajo y se separan lo justo
 * (las de dos líneas, más), sin salirse del dibujo por arriba ni por abajo.
 */
function layout<T extends { text: string; at: [number, number] }>(labels: T[], y: number, h: number, compact?: boolean) {
  const lineH = h * (compact ? 0.13 : 0.085)
  // Líneas que ocupará el texto: cada trozo partido con «\n» y, si es largo, lo que la columna lo parta (~12 letras).
  const lines = (t: string) => t.split('\n').reduce((n, part) => n + Math.ceil(part.length / (compact ? 8 : 12)), 0)
  const half = (t: string) => ((lines(t) * lineH) / 2) * 1.05
  const out = [...labels].sort((a, b) => a.at[1] - b.at[1]).map((l) => ({ ...l, ly: l.at[1] }))
  for (let i = 0; i < out.length; i++) {
    const min = i ? out[i - 1].ly + half(out[i - 1].text) + half(out[i].text) : y + half(out[i].text)
    out[i].ly = Math.max(out[i].ly, min)
  }
  for (let i = out.length - 1; i >= 0; i--) {
    const max = i < out.length - 1 ? out[i + 1].ly - half(out[i + 1].text) - half(out[i].text) : y + h - half(out[i].text)
    out[i].ly = Math.min(out[i].ly, max)
  }
  return out
}
