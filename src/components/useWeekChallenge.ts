import { useEffect, useState } from 'react'
import { challengeHistory, ensureWeekChallenge, measureChallenge, type ChallengeStatus } from '../lib/challenge'
import type { WeeklyChallenge } from '../lib/db'
import { frequentStructures } from '../lib/plan'
import { getProfile } from '../lib/profile'
import { fastModels, type Settings } from '../lib/settings'

/** 5.13 (P-14): el reto de esta semana (lo crea si aún no existe) medido, y el historial. */
export function useWeekChallenge(settings: Settings) {
  const [status, setStatus] = useState<ChallengeStatus | null>(null)
  const [history, setHistory] = useState<WeeklyChallenge[]>([])
  useEffect(() => {
    let alive = true
    getProfile()
      .then((p) =>
        ensureWeekChallenge({
          apiKey: settings.geminiKey,
          models: fastModels(settings),
          dailyGoal: settings.dailyGoalMinutes,
          level: p.levels.speaking || p.levels.overall,
          frequent: frequentStructures,
        }),
      )
      .then((c) => measureChallenge(c))
      .then(async (st) => {
        const all = await challengeHistory()
        if (!alive) return
        setStatus(st)
        setHistory(all.filter((c) => c.id !== st.challenge.id))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { status, history }
}
