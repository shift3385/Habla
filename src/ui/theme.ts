// Temas del rediseño V4 (Claude Design · HablaApp3 + Temas): Ember, Lumi, Marea y Nimbo, cada uno en oscuro y
// claro y con su mascota (el "compañero" que reemplaza a la burbuja). Los valores son los del diseño original y
// se aplican como variables CSS en la raíz de la app.

import type { MascotElement } from './Mascot'

export type ThemeKey = 'ember' | 'lumi' | 'marea' | 'nimbo'
export type Mode = 'dark' | 'light'
export type TeacherKey = 'emma' | 'leo'

export interface ThemeVars {
  bg: string
  b1: string // manchas de color del fondo
  b2: string
  b3: string
  g: string // cristal
  gb: string // borde del cristal
  tx: string
  sub: string
  field: string
  sh: string
  veil: string
  acc: string
  acc2: string
  ink: string // texto sobre el acento
  dot: string
  tab: string
  glow: string
  emma: [string, string] // colores del orbe de cada profe
  leo: [string, string]
}

type Base = Pick<ThemeVars, 'g' | 'gb' | 'sub' | 'field' | 'sh' | 'veil'> & Partial<Pick<ThemeVars, 'tx'>>

const D: Base = {
  g: 'rgba(255,255,255,.07)',
  gb: 'rgba(255,255,255,.14)',
  tx: '#ffffff',
  sub: 'rgba(255,255,255,.64)',
  field: 'rgba(255,255,255,.06)',
  sh: 'inset 0 1px 0 rgba(255,255,255,.12)',
  veil: 'linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.5))',
}
const L: Base = {
  g: 'rgba(255,255,255,.55)',
  gb: 'rgba(255,255,255,.95)',
  sub: '',
  field: 'rgba(255,255,255,.6)',
  sh: '0 8px 24px rgba(40,30,20,.06), inset 0 1px 0 #fff',
  veil: 'rgba(255,255,255,.2)',
}

export const THEMES: Record<ThemeKey, Record<Mode, ThemeVars>> = {
  ember: {
    dark: { ...D, bg: '#0a0605', b1: '#ff4d12', b2: '#0b6f7d', b3: '#6a1a06', acc: '#ff6a2b', acc2: '#5fd3df', ink: '#fff', dot: '#ff8a5c', tab: 'rgba(18,10,8,.55)', glow: 'rgba(255,106,43,.4)', emma: ['#ff6a2b', '#2fb3c2'], leo: ['#2fb3c2', '#ffb07a'] } as ThemeVars,
    light: { ...L, bg: '#f7efe8', b1: '#ffab7f', b2: '#9fdbe0', b3: '#ffd9c4', tx: '#1d1411', sub: 'rgba(29,20,17,.64)', acc: '#e04a14', acc2: '#0d7480', ink: '#fff', dot: '#e04a14', tab: 'rgba(255,255,255,.65)', glow: 'rgba(224,74,20,.3)', emma: ['#ff6a2b', '#2fb3c2'], leo: ['#2fb3c2', '#ff9a5c'] },
  },
  lumi: {
    dark: { ...D, bg: '#020c07', b1: '#0f6b45', b2: '#05301e', b3: '#1c8f5f', acc: '#1f9d66', acc2: '#7fe0b0', ink: '#fff', dot: '#5fe3a1', tab: 'rgba(4,20,12,.6)', glow: 'rgba(31,157,102,.4)', emma: ['#3fe0a0', '#0f6b45'], leo: ['#b6f5d8', '#1c8f5f'] } as ThemeVars,
    light: { ...L, bg: '#eef6f1', b1: '#9fe0c0', b2: '#d6f1e3', b3: '#6fcf9f', tx: '#0d1f16', sub: 'rgba(13,31,22,.62)', acc: '#147f4f', acc2: '#0f6b45', ink: '#fff', dot: '#147f4f', tab: 'rgba(255,255,255,.65)', glow: 'rgba(20,127,79,.28)', emma: ['#3fe0a0', '#0f6b45'], leo: ['#8be8c0', '#1c8f5f'] },
  },
  marea: {
    dark: { ...D, bg: '#061420', b1: '#1f6fb8', b2: '#14a39a', b3: '#123a5a', acc: '#7fd0ff', acc2: '#7fe8dc', ink: '#04202a', dot: '#7fd0ff', tab: 'rgba(6,20,32,.6)', glow: 'rgba(127,208,255,.35)', emma: ['#7fd0ff', '#14a39a'], leo: ['#7fe8dc', '#1f6fb8'] } as ThemeVars,
    light: { ...L, bg: '#eef7fb', b1: '#a8d4ff', b2: '#a6f0e2', b3: '#cfe6ff', tx: '#0d2530', sub: 'rgba(13,37,48,.64)', acc: '#1a7fc0', acc2: '#0d7f7a', ink: '#fff', dot: '#1a7fc0', tab: 'rgba(255,255,255,.7)', glow: 'rgba(26,127,192,.28)', emma: ['#7fd0ff', '#14a39a'], leo: ['#7fe8dc', '#1f6fb8'] },
  },
  nimbo: {
    dark: { ...D, bg: '#0b0a1f', b1: '#5a4be0', b2: '#a89cff', b3: '#241d5c', acc: '#b7a8ff', acc2: '#d8d0ff', ink: '#140f3a', dot: '#b7a8ff', tab: 'rgba(12,10,32,.6)', glow: 'rgba(183,168,255,.38)', emma: ['#b7a8ff', '#5a4be0'], leo: ['#d8d0ff', '#7c6cff'] } as ThemeVars,
    light: { ...L, bg: '#f4f2fb', b1: '#d9d2ff', b2: '#eae6ff', b3: '#cfc6ff', tx: '#1a1838', sub: 'rgba(26,24,56,.62)', acc: '#6a5ad6', acc2: '#5a4be0', ink: '#fff', dot: '#6a5ad6', tab: 'rgba(255,255,255,.7)', glow: 'rgba(106,90,214,.28)', emma: ['#b7a8ff', '#5a4be0'], leo: ['#d8d0ff', '#7c6cff'] },
  },
}

export const THEME_KEYS: ThemeKey[] = ['ember', 'lumi', 'marea', 'nimbo']

/** Cada tema trae su compañero (mascota) y un modo por defecto. */
export const THEME_INFO: Record<
  ThemeKey,
  { name: string; mascot: MascotElement; mascotName: string; kind: string; personality: string; secret: string; defaultMode: Mode }
> = {
  ember: { name: 'Ember', mascot: 'flame', mascotName: 'Chispa', kind: 'fuego', personality: 'Enérgica y valiente. Le encanta un buen reto.', secret: 'fuego azul', defaultMode: 'dark' },
  lumi: { name: 'Lumi', mascot: 'terra', mascotName: 'Musgo', kind: 'tierra', personality: 'Tranquilo y paciente. Nunca tiene prisa.', secret: 'florece', defaultMode: 'dark' },
  marea: { name: 'Marea', mascot: 'aqua', mascotName: 'Gota', kind: 'agua', personality: 'Curiosa y juguetona. Fluye con cualquier tema.', secret: 'arcoíris', defaultMode: 'light' },
  nimbo: { name: 'Nimbo', mascot: 'aero', mascotName: 'Brisa', kind: 'aire', personality: 'Ligera y soñadora. Siempre con la cabeza en las nubes.', secret: 'voltereta', defaultMode: 'dark' },
}

/** Temas que ya no existen (Aurora, de la v3) pasan a Marea. */
export function normalizeTheme(k: string): ThemeKey {
  return (THEME_KEYS as string[]).includes(k) ? (k as ThemeKey) : 'marea'
}

export function themeVars(theme: ThemeKey, mode: Mode): ThemeVars {
  return THEMES[normalizeTheme(theme)][mode] ?? THEMES.marea.light
}

/** Variables CSS para el contenedor raíz. */
/** Mezcla dos colores #rrggbb (k = peso del segundo). */
function mixHex(a: string, b: string, k: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return '#' + x.map((v, i) => Math.round(v * (1 - k) + y[i] * k).toString(16).padStart(2, '0')).join('')
}

export function cssVars(t: ThemeVars): Record<string, string> {
  const light = t.tx !== '#ffffff'
  // 5.11.x (modo ligero): el cristal sin desenfoque pasa a un color liso del mismo tono (fondo con un toque de la mancha
  // principal y el blanco del cristal), y el fondo sin manchas, a un degradado suave desde ese toque de color.
  const tint = mixHex(t.bg, t.b1, light ? 0.18 : 0.14)
  return {
    '--gs': mixHex(tint, '#ffffff', light ? 0.55 : 0.07),
    '--bgt': mixHex(t.bg, t.b1, light ? 0.45 : 0.3),
    // 5.10.1 (REG-A4-03): verde/rojo de «bien»/«mal» legibles en los temas claros (≥ 5:1 sobre el cristal; antes
    // #22c58b y #f87171 daban 2,1–2,7:1). En oscuro, los de siempre (6–8:1).
    '--ok': light ? '#0b7a53' : '#22c58b',
    '--bad': light ? '#b91c1c' : '#f87171',
    '--bg': t.bg,
    '--tx': t.tx,
    '--sub': t.sub,
    '--g': t.g,
    '--gb': t.gb,
    '--sh': t.sh,
    '--acc': t.acc,
    '--acc2': t.acc2,
    '--ink': t.ink,
    '--dot': t.dot,
    '--field': t.field,
    '--tab': t.tab,
    '--glow': t.glow,
  }
}

export interface TeacherInfo {
  key: TeacherKey
  name: string
  role: string
  desc: string
  lang: string // voz TTS
  gender: 'male' | 'female'
  persona: string // para el prompt
}

/**
 * El profe se llama como la mascota del tema (Gota, Chispa, Musgo, Brisa): decisión del dueño, 2026-10-07.
 * Emma y Leo (y las que vengan) son solo VOCES: acento y estilo de habla, no el nombre de quien te da la clase.
 */
export const teacherName = (theme: ThemeKey) => THEME_INFO[theme].mascotName

/** Personalidad para el prompt: nombre de la mascota + acento y estilo de la voz elegida. */
export const teacherPersona = (theme: ThemeKey, voice: TeacherKey) => `Your name is ${teacherName(theme)}. ${TEACHERS[voice].persona}`

export const TEACHERS: Record<TeacherKey, TeacherInfo> = {
  emma: {
    key: 'emma',
    name: 'Emma',
    role: 'Voz americana',
    desc: 'Acento americano. Paciente, clara y muy positiva.',
    lang: 'en-US',
    gender: 'female',
    persona:
      'You speak American English. You are patient, clear and very positive, and you celebrate every effort.',
  },
  leo: {
    key: 'leo',
    name: 'Leo',
    role: 'Voz británica',
    desc: 'Acento británico. Directo, curioso y con humor.',
    lang: 'en-GB',
    gender: 'male',
    persona:
      'You speak British English (British vocabulary and spelling, e.g. "flat", "holiday", "brilliant"). You are direct, curious and have a dry sense of humour.',
  },
}
