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

export async function getProfile(): Promise<Profile> {
  const p = await db.profile.get('me')
  if (p) return p
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
