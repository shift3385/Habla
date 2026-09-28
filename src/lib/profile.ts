import { db, type Profile } from './db'

export const SEED_PROFILE: Profile = {
  id: 'me',
  levels: {
    overall: 'B1',
    grammar: 'B1',
    reading: 'B2',
    listening: 'B1',
    speaking: 'A2',
  },
  about:
    'Native Spanish speaker. Software engineer who builds AI agents and advises "gestorías" (Spanish administrative agencies) on legal paperwork and procedures.',
  weaknesses: [
    'Avoids speaking and gives very short answers.',
    'Articles and uncountable nouns (software, advice, paperwork, information, feedback).',
    'Drops auxiliary verbs: "I attending" → "I\'m attending"; "are write" → "are written" (passive).',
    'False friends: "actually" (= en realidad) vs "currently" (= actualmente); "assesory" → "advise"/"advisory".',
  ],
  goal: 'Reach B2 in 12 weeks and, above all, speak fluently.',
  startedAt: Date.now(),
}

export async function getProfile(): Promise<Profile> {
  const p = await db.profile.get('me')
  if (p) return p
  const seed = { ...SEED_PROFILE, startedAt: Date.now() }
  await db.profile.put(seed)
  return seed
}
