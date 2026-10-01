// Temas del rediseño (Claude Design · HablaApp2): Ember, Lumi y Aurora, cada uno en oscuro y claro.
// Los valores son los del diseño original; se aplican como variables CSS en la raíz de la app.

export type ThemeKey = 'ember' | 'lumi' | 'aurora'
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
  aurora: {
    dark: { ...D, bg: '#04090c', b1: '#0f7a66', b2: '#ff5a1f', b3: '#123a52', acc: '#ffb14a', acc2: '#6fe0cb', ink: '#1a0f04', dot: '#ffb14a', tab: 'rgba(6,14,18,.6)', glow: 'rgba(255,177,74,.35)', emma: ['#ffb14a', '#2fd0b0'], leo: ['#2fd0b0', '#ff6a2b'] } as ThemeVars,
    light: { ...L, bg: '#f2f4ef', b1: '#a8e6d8', b2: '#ffc9a3', b3: '#c4dcef', tx: '#10181b', sub: 'rgba(16,24,27,.62)', acc: '#b8560a', acc2: '#0b7565', ink: '#fff', dot: '#b8560a', tab: 'rgba(255,255,255,.65)', glow: 'rgba(184,86,10,.28)', emma: ['#ffb14a', '#2fd0b0'], leo: ['#2fd0b0', '#ff6a2b'] },
  },
}

export const THEME_INFO: Record<ThemeKey, { name: string; desc: string }> = {
  ember: { name: 'Ember', desc: 'Naranja y turquesa' },
  lumi: { name: 'Lumi', desc: 'Verde cristal' },
  aurora: { name: 'Aurora', desc: 'Verde, naranja y ámbar' },
}

export function themeVars(theme: ThemeKey, mode: Mode): ThemeVars {
  return (THEMES[theme] ?? THEMES.ember)[mode] ?? THEMES.ember.dark
}

/** Variables CSS para el contenedor raíz. */
export function cssVars(t: ThemeVars): Record<string, string> {
  return {
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

export const TEACHERS: Record<TeacherKey, TeacherInfo> = {
  emma: {
    key: 'emma',
    name: 'Emma',
    role: 'Profesora',
    desc: 'Acento americano. Paciente, clara y muy positiva.',
    lang: 'en-US',
    gender: 'female',
    persona:
      'Your name is Emma. You speak American English. You are patient, clear and very positive, and you celebrate every effort.',
  },
  leo: {
    key: 'leo',
    name: 'Leo',
    role: 'Profesor',
    desc: 'Acento británico. Directo, curioso y con humor.',
    lang: 'en-GB',
    gender: 'male',
    persona:
      'Your name is Leo. You speak British English (British vocabulary and spelling, e.g. "flat", "holiday", "brilliant"). You are direct, curious and have a dry sense of humour.',
  },
}
