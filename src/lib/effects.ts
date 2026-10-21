// 5.11.x · Modo ligero (docs/v5.11/rendimiento/EVALUACION.md): efectos visuales que se pueden apagar para que la app
// vaya fluida en teléfonos modestos (p. ej. el Galaxy A11 de la madre del dueño) sin dejar de funcionar igual.
// Lo caro en el WebView no es el JavaScript sino pintar y componer: el desenfoque del cristal, las manchas del fondo,
// los brillos, las animaciones y la mascota moviéndose. Cada grupo se apaga con una clase en <html> (index.css) y la
// mascota con `setMascotStill` (ui/Mascot.tsx). Módulo sin React ni Capacitor: se prueba en tests/effects.test.mjs.

export type EffectKey = 'blur' | 'background' | 'glow' | 'motion' | 'mascot'
/** true = el efecto está encendido (como siempre). */
export type Effects = Record<EffectKey, boolean>

export const EFFECT_KEYS: EffectKey[] = ['blur', 'background', 'glow', 'motion', 'mascot']
export const ALL_EFFECTS: Effects = { blur: true, background: true, glow: true, motion: true, mascot: true }
export const LIGHT_EFFECTS: Effects = { blur: false, background: false, glow: false, motion: false, mascot: false }

/** Textos de Ajustes → Apariencia → Rendimiento. Ordenados de más a menos ahorro (medido en EVALUACION.md §2). */
export const EFFECT_INFO: Record<EffectKey, { title: string; desc: string }> = {
  blur: { title: 'Cristal desenfocado', desc: 'Las tarjetas transparentes que difuminan lo de detrás. Apagado: tarjetas de color liso.' },
  mascot: { title: 'Mascota en movimiento', desc: 'Que se balancee, te siga con los ojos y suelte chispas. Apagada: una imagen fija; sus consejos y el toque siguen igual.' },
  motion: { title: 'Animaciones', desc: 'Entradas de pantalla, desplazamientos suaves y adornos que se mueven. Apagadas: todo aparece al instante.' },
  background: { title: 'Fondo de colores', desc: 'Las manchas de color difuminadas del fondo. Apagado: un degradado suave del tema.' },
  glow: { title: 'Brillos y sombras', desc: 'El resplandor de los botones y las sombras de las tarjetas.' },
}

/** Ajuste guardado → los cinco grupos (lo que falte, encendido: así llegan solos a instalaciones antiguas). */
export function normalizeEffects(x: unknown): Effects {
  const o = (x && typeof x === 'object' ? x : {}) as Partial<Record<EffectKey, unknown>>
  return Object.fromEntries(EFFECT_KEYS.map((k) => [k, o[k] !== false])) as Effects
}

/** 'full' (todo encendido), 'light' (todo apagado) o 'custom' (a medida). */
export function effectsPreset(e: Effects): 'full' | 'light' | 'custom' {
  const on = EFFECT_KEYS.filter((k) => e[k]).length
  return on === EFFECT_KEYS.length ? 'full' : on === 0 ? 'light' : 'custom'
}

/**
 * ¿Parece un teléfono modesto? Solo para RECOMENDAR el modo ligero (nunca se activa solo: cambiaría el aspecto sin
 * avisar). `deviceMemory` (GB, redondeado; Chrome/WebView) ≤ 3 o ≤ 4 núcleos. El Galaxy A11 tiene 2–3 GB.
 */
export function looksModest(nav: { deviceMemory?: number; hardwareConcurrency?: number } = globalThis.navigator ?? {}): boolean {
  const mem = nav.deviceMemory
  const cores = nav.hardwareConcurrency
  return (typeof mem === 'number' && mem > 0 && mem <= 3) || (typeof cores === 'number' && cores > 0 && cores <= 4)
}

let smooth = true

/** Comportamiento del desplazamiento por código: suave solo con las animaciones encendidas. */
export function scrollBehavior(): ScrollBehavior {
  return smooth ? 'smooth' : 'auto'
}

/** Clases de <html> que apagan cada grupo (index.css). */
export const EFFECT_CLASS: Record<Exclude<EffectKey, 'mascot'>, string> = {
  blur: 'fx-no-blur',
  background: 'fx-no-bg',
  glow: 'fx-no-glow',
  motion: 'fx-no-motion',
}

/** Aplica los efectos a toda la app (clases en <html> y desplazamiento suave). La mascota, aparte (App.tsx). */
export function applyEffects(e: Effects, root: { classList: { toggle(c: string, on: boolean): void } } = document.documentElement) {
  for (const [k, cls] of Object.entries(EFFECT_CLASS) as [Exclude<EffectKey, 'mascot'>, string][]) root.classList.toggle(cls, !e[k])
  smooth = e.motion
}
