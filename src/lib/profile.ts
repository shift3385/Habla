import { db, type Profile } from './db'

// Perfil neutro: los datos personales los rellena cada persona en la bienvenida ("Tu perfil")
// y los niveles y debilidades salen del test de calibración.
export const SEED_PROFILE: Profile = {
  id: 'me',
  levels: {
    overall: 'B1',
    grammar: 'B1',
    reading: 'B1',
    listening: 'B1',
    speaking: 'B1',
  },
  about: '',
  weaknesses: [],
  goal: '',
  startedAt: Date.now(),
}

/**
 * AUD-RES-704: un perfil con forma inesperada (importado de una copia vieja o tocada) ya no rompe el arranque:
 * los campos que la app lee sin comprobar se completan con los valores neutros. Solo en memoria: no se reescribe.
 */
export function repairProfile(p: Profile): Profile {
  const text = (v: unknown, d: string) => (typeof v === 'string' ? v : d)
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined)
  const lv = (p.levels ?? {}) as Partial<Profile['levels']>
  const levels = {
    overall: text(lv.overall, SEED_PROFILE.levels.overall),
    grammar: text(lv.grammar, SEED_PROFILE.levels.grammar),
    reading: text(lv.reading, SEED_PROFILE.levels.reading),
    listening: text(lv.listening, SEED_PROFILE.levels.listening),
    speaking: text(lv.speaking, SEED_PROFILE.levels.speaking),
  }
  return {
    ...p,
    levels,
    about: text(p.about, ''),
    weaknesses: list(p.weaknesses) ?? [],
    goal: text(p.goal, ''),
    name: typeof p.name === 'string' ? p.name : undefined,
    purposes: list(p.purposes),
    interests: list(p.interests),
  }
}

export async function getProfile(): Promise<Profile> {
  const p = await db.profile.get('me')
  if (p) return repairProfile(p)
  const seed = { ...SEED_PROFILE, startedAt: Date.now() }
  await db.profile.put(seed)
  return seed
}

/** Motivos para aprender inglés (chips de la bienvenida). */
export const PURPOSES: { id: string; label: string; en: string }[] = [
  { id: 'work', label: 'Trabajo', en: 'work and career' },
  { id: 'travel', label: 'Viajar', en: 'travelling' },
  { id: 'study', label: 'Estudios', en: 'studies and exams' },
  { id: 'social', label: 'Conversar con gente', en: 'talking with people from other countries' },
  { id: 'media', label: 'Series, música y libros', en: 'understanding series, music and books' },
  { id: 'move', label: 'Vivir en otro país', en: 'moving to another country' },
  { id: 'family', label: 'Familia o amigos', en: 'family or friends who speak English' },
  { id: 'self', label: 'Crecimiento personal', en: 'personal growth and keeping the mind active' },
]

export function isPersonalized(p: Profile): boolean {
  return !!p.name?.trim()
}

/** Datos personales que el profe usa (en inglés para el prompt). */
export function describeStudent(p: Profile): string {
  const lines = [
    p.name ? `Name: ${p.name} (address the student by this name now and then).` : '',
    p.about ? `What they do: ${p.about}` : 'What they do: unknown (ask naturally if relevant).',
    p.purposes?.length
      ? `Why they are learning English: ${p.purposes.map((id) => PURPOSES.find((x) => x.id === id)?.en ?? id).join(', ')}.`
      : '',
    p.interests?.length ? `Interests: ${p.interests.join(', ')}.` : '',
  ]
  return lines.filter(Boolean).join('\n- ')
}
