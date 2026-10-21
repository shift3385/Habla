import { getSystemFontScale } from './orientation'

// 5.10.1 (REG-M-05): tamaño de letra. Solo crece el texto (variable CSS --fs, ver index.css), nunca márgenes ni botones.
// Escala efectiva = tu elección (Ajustes → Apariencia) × la letra del sistema Android, con topes para que nada se rompa.

/** Las 4 opciones fijas (decisión del dueño): Pequeña · Normal · Grande · Muy grande. */
export const FONT_SCALES = [
  { value: 0.9, label: 'Pequeña' },
  { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Grande' },
  { value: 1.3, label: 'Muy grande' },
] as const

/** Suelo: por debajo, ilegible en 320 px. */
export const MIN_FONT_SCALE = 0.85
/** Tope en vertical (medido por A4 tras los arreglos de la 5.10.1). */
export const MAX_PORTRAIT = 1.3
/** Tope en horizontal: con 360 px de alto, más letra saca el micro de la clase de la pantalla (A4, captura 10). */
export const MAX_LANDSCAPE = 1.15
/**
 * 5.10.1 (REV-F-02): en vertical con poco alto (teléfonos de 320×640, donde viewport.ts además reduce con zoom 0,8) el
 * tope también es 1,15: con 1,3 la pantalla se llenaba demasiado. Por debajo de este alto (px reales de la ventana).
 */
export const SHORT_HEIGHT = 700

/** ¿Pantalla «justa» de alto (horizontal o vertical baja)? Ahí el tope es MAX_LANDSCAPE. */
export const isTightScreen = (w: number, h: number): boolean => w > h || h < SHORT_HEIGHT

/** Una opción válida (lo guardado de una versión rara, o nada, cuenta como Normal). */
export function normalizeFontScale(v: unknown): number {
  return FONT_SCALES.some((o) => o.value === v) ? (v as number) : 1
}

/**
 * La escala que se aplica: elección × letra del sistema, entre el suelo y el tope de la orientación. Redondeada a
 * centésimas para que «Normal» con la letra del sistema normal sea exactamente 1 (como antes).
 */
export function effectiveFontScale(appScale: number, systemScale: number, tight: boolean): number {
  const sys = Number.isFinite(systemScale) && systemScale > 0 ? systemScale : 1
  const raw = normalizeFontScale(appScale) * sys
  const max = tight ? MAX_LANDSCAPE : MAX_PORTRAIT
  return Math.round(Math.min(max, Math.max(MIN_FONT_SCALE, raw)) * 100) / 100
}

/** ¿Lo que pides se ha recortado por el tope? (para avisarlo en la vista previa). */
export function fontScaleCapped(appScale: number, systemScale: number, tight: boolean): boolean {
  const sys = Number.isFinite(systemScale) && systemScale > 0 ? systemScale : 1
  return normalizeFontScale(appScale) * sys > (tight ? MAX_LANDSCAPE : MAX_PORTRAIT) + 0.001
}

/**
 * La letra del sistema Android (Ajustes → Pantalla → Tamaño de fuente). MainActivity fija el textZoom del WebView a
 * 100 % y la app la lee con OrientationPlugin.getFontScale, para combinarla con su ajuste y sus topes. En el navegador
 * (vista previa) es 1. Si la cambias en Android, la actividad se recrea y la página se vuelve a cargar.
 */
let system = 1
let systemAsked = false
export const systemFontScale = () => system

/** innerWidth/innerHeight son los px reales de la ventana (el zoom de viewport.ts no los cambia). */
const isTight = () => typeof window !== 'undefined' && isTightScreen(window.innerWidth, window.innerHeight)

let current = 1
let listening = false

/**
 * Pone --fs en <html> y `data-fs` («l» desde 1,1 y «xl» desde 1,25) para los arreglos de CSS con letra grande. Se
 * vuelve a calcular al girar el teléfono (el tope cambia).
 */
export function applyFontScale(appScale: number): number {
  current = normalizeFontScale(appScale)
  const apply = () => {
    const k = effectiveFontScale(current, systemFontScale(), isTight())
    const html = document.documentElement
    html.style.setProperty('--fs', String(k))
    if (k >= 1.25) html.dataset.fs = 'xl'
    else if (k >= 1.1) html.dataset.fs = 'l'
    else delete html.dataset.fs
    return k
  }
  if (!systemAsked) {
    systemAsked = true
    getSystemFontScale().then((s) => {
      if (s === system) return
      system = s
      apply()
    })
  }
  if (!listening && typeof window !== 'undefined') {
    listening = true
    let t = 0
    const later = () => {
      clearTimeout(t)
      t = window.setTimeout(apply, 150)
    }
    window.addEventListener('resize', later)
    window.addEventListener('orientationchange', later)
  }
  return apply()
}
