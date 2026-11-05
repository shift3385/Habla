// 5.13 (P-17): dibuja la tarjeta de la semana en un canvas (1080×1350) y la comparte como imagen con @capacitor/share
// (patrón de backup.ts: archivo en la caché, Compartir, y se borra a los 60 s o al siguiente arranque). Qué entra en la
// tarjeta lo decide weekCard.ts (puro); aquí solo se pinta. Con el modo ligero (sin «Fondo de colores») el fondo es un
// degradado simple, sin manchas ni sombras.
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { forgetSharedFile } from './backup'
import { CARD_H, CARD_W, type WeekCardData } from './weekCard'
import type { ThemeVars } from '../ui/theme'

const FONT = 'Outfit, system-ui, sans-serif'
const DAYS = 'LMXJVSD'

export interface CardStyle {
  t: ThemeVars
  /** Manchas de color del fondo (efecto «Fondo de colores» encendido). */
  fancy: boolean
  /** Imagen de la mascota del tema (public/mascots/mascot_<nombre>.png). */
  mascotSrc?: string
}

const isDark = (t: ThemeVars) => /^#fff(fff)?$/i.test(t.tx)

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Corta el texto en líneas que caben en `max` px (como mucho `lines`; la última con «…»). */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, lines: number): string[] {
  const out: string[] = []
  let cur = ''
  for (const w of text.split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w
    if (ctx.measureText(next).width <= max || !cur) cur = next
    else {
      out.push(cur)
      cur = w
    }
  }
  if (cur) out.push(cur)
  if (out.length <= lines) return out
  const kept = out.slice(0, lines)
  let last = kept[lines - 1]
  while (last && ctx.measureText(`${last}…`).width > max) last = last.slice(0, -1)
  kept[lines - 1] = `${last.trimEnd()}…`
  return kept
}

/**
 * La imagen de la mascota (la del aviso de Android) trae un halo tenue que llega a los bordes y se vería como un
 * recuadro: se difumina hacia fuera con una máscara radial.
 */
function softEdges(img: HTMLImageElement, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')!
  x.drawImage(img, 0, 0, size, size)
  x.globalCompositeOperation = 'destination-in'
  const g = x.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2)
  g.addColorStop(0, '#000')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g
  x.fillRect(0, 0, size, size)
  return c
}

/** Pinta la tarjeta y devuelve el canvas (no se añade a la página). */
export async function renderWeekCard(d: WeekCardData, s: CardStyle): Promise<HTMLCanvasElement> {
  // La fuente de la app (Outfit) ya va en el APK; se espera a que esté lista para que el canvas no use otra.
  await Promise.all(['400', '600', '700'].map((w) => document.fonts?.load(`${w} 48px Outfit`).catch(() => null)))
  const mascot = s.mascotSrc ? await loadImage(s.mascotSrc) : null
  const c = document.createElement('canvas')
  c.width = CARD_W
  c.height = CARD_H
  const ctx = c.getContext('2d')!
  const { t } = s
  const dark = isDark(t)
  const tx = t.tx
  const sub = t.sub || (dark ? 'rgba(255,255,255,.66)' : 'rgba(0,0,0,.6)')
  const panel = dark ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.66)'
  const track = dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.08)'

  // Fondo.
  ctx.fillStyle = t.bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  if (s.fancy) {
    const blob = (x: number, y: number, r: number, color: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      ctx.globalAlpha = a
      g.addColorStop(0, color)
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, CARD_W, CARD_H)
      ctx.globalAlpha = 1
    }
    blob(120, 160, 640, t.b1, dark ? 0.55 : 0.8)
    blob(1000, 1250, 720, t.b2, dark ? 0.45 : 0.75)
    blob(950, 520, 420, t.b3, dark ? 0.35 : 0.6)
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, CARD_H)
    g.addColorStop(0, t.b1)
    g.addColorStop(1, t.bg)
    ctx.globalAlpha = dark ? 0.35 : 0.5
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CARD_W, CARD_H)
    ctx.globalAlpha = 1
  }

  const X = 72
  const W = CARD_W - 2 * X
  ctx.textBaseline = 'alphabetic'

  // Cabecera: semana, nombre y la mascota.
  ctx.fillStyle = sub
  ctx.font = `500 34px ${FONT}`
  ctx.fillText(d.weekLabel ? `Mi semana · ${d.weekLabel}` : 'Mi semana', X, 128)
  ctx.fillStyle = tx
  ctx.font = `700 92px ${FONT}`
  const title = wrap(ctx, d.name || 'Mi inglés', 640, 1)[0]
  ctx.fillText(title, X, 236)
  ctx.fillStyle = sub
  ctx.font = `400 38px ${FONT}`
  ctx.fillText(`hablando inglés con ${d.mascotName}`, X, 296)
  if (mascot) ctx.drawImage(softEdges(mascot, 270), CARD_W - X - 270, 60)

  // Tres cifras.
  const stats: [string, string][] = [
    [String(d.minutes), d.minutes === 1 ? 'minuto' : 'minutos'],
    [String(d.streak), d.streak === 1 ? 'día de racha' : 'días de racha'],
    [`${d.days}/7`, 'días hablando'],
  ]
  const gap = 24
  const bw = (W - 2 * gap) / 3
  stats.forEach(([n, label], k) => {
    const x = X + k * (bw + gap)
    ctx.fillStyle = panel
    roundRect(ctx, x, 344, bw, 186, 36)
    ctx.fill()
    ctx.fillStyle = t.acc
    ctx.font = `700 80px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(n, x + bw / 2, 444)
    ctx.fillStyle = sub
    ctx.font = `500 32px ${FONT}`
    ctx.fillText(label, x + bw / 2, 496)
    ctx.textAlign = 'left'
  })

  // Minutos de cada día.
  ctx.fillStyle = panel
  roundRect(ctx, X, 556, W, 290, 40)
  ctx.fill()
  const max = Math.max(1, ...d.week)
  const colW = (W - 80) / 7
  d.week.forEach((m, k) => {
    const cx = X + 40 + colW * k + colW / 2
    const h = m > 0 ? Math.max(16, (m / max) * 180) : 16
    ctx.fillStyle = m > 0 ? t.acc : track
    roundRect(ctx, cx - 26, 778 - h, 52, h, 14)
    ctx.fill()
    ctx.fillStyle = sub
    ctx.font = `500 30px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(DAYS[k], cx, 822)
    ctx.textAlign = 'left'
  })

  // El reto.
  let y = 872
  if (d.challenge) {
    const ch = d.challenge
    ctx.fillStyle = panel
    roundRect(ctx, X, y, W, 214, 40)
    ctx.fill()
    ctx.fillStyle = sub
    ctx.font = `600 30px ${FONT}`
    ctx.fillText(ch.done ? 'RETO DE LA SEMANA · ¡CUMPLIDO!' : 'RETO DE LA SEMANA', X + 40, y + 56)
    ctx.fillStyle = tx
    ctx.font = `600 46px ${FONT}`
    ctx.fillText(wrap(ctx, ch.title, W - 80, 1)[0], X + 40, y + 112)
    const p = ch.done ? ch.target : ch.progress
    const label = ch.done ? `${ch.target} de ${ch.target} ${ch.unit}`.trim() : `${p} de ${ch.target} ${ch.unit}`.trim()
    ctx.font = `600 34px ${FONT}`
    const lw = ctx.measureText(label).width
    const barW = W - 80 - lw - 30
    ctx.fillStyle = track
    roundRect(ctx, X + 40, y + 150, barW, 26, 13)
    ctx.fill()
    ctx.fillStyle = t.acc
    roundRect(ctx, X + 40, y + 150, Math.max(26, (barW * p) / Math.max(1, ch.target)), 26, 13)
    ctx.fill()
    ctx.fillStyle = tx
    ctx.fillText(label, X + 40 + barW + 30, y + 175)
    y += 240
  }

  // El último logro.
  if (d.milestone) {
    ctx.fillStyle = sub
    ctx.font = `500 34px ${FONT}`
    ctx.fillText('Último logro', X, y + 40)
    ctx.fillStyle = tx
    ctx.font = `600 40px ${FONT}`
    ctx.fillText(wrap(ctx, d.milestone.title, W, 1)[0], X, y + 90)
  }

  // Pie.
  ctx.fillStyle = sub
  ctx.font = `500 30px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('Habla · practico inglés hablando cada día', CARD_W / 2, CARD_H - 44)
  ctx.textAlign = 'left'
  return c
}

/**
 * Comparte la imagen. En el teléfono: archivo en la caché + Compartir (WhatsApp, Telegram…), y se borra luego. En el
 * navegador (pruebas): Web Share si lo hay; si no, se descarga.
 */
export async function shareWeekCard(canvas: HTMLCanvasElement, text: string, fileName: string): Promise<void> {
  const dataUrl = canvas.toDataURL('image/png')
  if (!Capacitor.isNativePlatform()) {
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], fileName, { type: 'image/png' })
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text }).catch(() => {})
      return
    }
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = fileName
    a.click()
    return
  }
  const cached = await Filesystem.writeFile({ path: fileName, data: dataUrl.slice(dataUrl.indexOf(',') + 1), directory: Directory.Cache })
  try {
    await Share.share({ title: 'Mi semana en Habla', text, files: [cached.uri], dialogTitle: 'Compartir mi semana' })
  } catch {
    // El usuario cerró el diálogo de compartir: no es un error.
  } finally {
    forgetSharedFile(fileName)
  }
}
