// 5.13 (Fase 3): qué hace cada código al pegarlo (Progreso → «Pegar un código»). Primero `previewCode` dice qué va a
// pasar (y si se puede); con «Aceptar», `applyCode` lo guarda. Nunca llama a la IA. El código ya viene comprobado por
// shareCode.ts › parseCode.
import { boundsOfKey, currentChallenge } from './challenge'
import { db } from './db'
import { challengeFromCode, lookupFromCode, sameChallenge, sharedContext, whoOf, type ShareCode } from './shareCode'
import { syncCards } from './srs'
import { weekKey } from './stats'

export interface CodePreview {
  /** Se puede aplicar (si no, `text` explica por qué y solo hay «Cerrar»). */
  ok: boolean
  /** Qué es y qué va a pasar, en español. */
  title: string
  text: string
  /** Texto del botón de aceptar. */
  cta?: string
}

const sameWord = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export async function previewCode(c: ShareCode, now = new Date()): Promise<CodePreview> {
  const who = whoOf(c.from)
  if (c.type === 'word') {
    const all = await db.lookups.toArray()
    const have = all.find((l) => sameWord(l.result.headword, c.headword))
    if (have?.saved) return { ok: false, title: `«${c.headword}»`, text: `Ya tienes «${have.result.headword}» guardada en tus Palabras: no la añado otra vez.` }
    return {
      ok: true,
      title: `${who} te pasa una palabra`,
      text: `«${c.headword}» = ${c.translation}.${c.meaningEs ? ` ${c.meaningEs}` : ''} Se guardará en tus Palabras y entrará en tu Repaso.`,
      cta: 'Guardar en mis palabras',
    }
  }
  if (c.type === 'week') {
    const when = c.week === weekKey(now) ? 'esta semana' : 'una semana anterior'
    const reto = c.challenge ? (c.challenge.done ? `, reto «${c.challenge.title}» cumplido` : `, reto «${c.challenge.title}»: ${c.challenge.progress} de ${c.challenge.target}`) : ''
    return {
      ok: true,
      title: `La semana de ${c.from}`,
      text: `${c.from} (${when}): ${c.minutes} min, racha de ${c.streak} ${c.streak === 1 ? 'día' : 'días'}${reto}. Lo verás en Mi familia.`,
      cta: 'Guardar en Mi familia',
    }
  }
  const cur = await currentChallenge(now)
  if (c.type === 'challenge') {
    if (cur && sameChallenge(cur, c) && (cur.fromName ?? '') === c.from) {
      return { ok: false, title: `«${c.title}»`, text: 'Ya es tu reto de esta semana.' }
    }
    if (cur?.doneAt) {
      return {
        ok: false,
        title: `${who} te reta`,
        text: `Ya cumpliste tu reto de esta semana («${cur.titleEs}»). Guarda el mensaje y pégalo el lunes: será tu reto de la semana que viene.`,
      }
    }
    return {
      ok: true,
      title: `${who} te reta`,
      text: `«${c.title}»: ${c.goal} Será tu reto de esta semana${cur ? ` (en lugar de «${cur.titleEs}»)` : ''} y se medirá en tu teléfono, con lo que tú hables.`,
      cta: 'Aceptar el reto',
    }
  }
  // Progreso de la otra persona.
  if (!cur || !sameChallenge(cur, c)) {
    return {
      ok: false,
      title: `Progreso de ${who}`,
      text: `${who} va ${c.progress} de ${c.target} en «${c.title}», pero tu reto de esta semana es otro. Para compararos, haced el mismo reto: pídele que te rete.`,
    }
  }
  if (c.week !== cur.id) {
    return { ok: false, title: `Progreso de ${who}`, text: 'Ese progreso es de otra semana. Pídele que te mande el de esta.' }
  }
  return {
    ok: true,
    title: `Progreso de ${who}`,
    text: `${who} va ${c.progress} de ${c.target} en «${c.title}». Lo verás junto al tuyo en el reto de la semana.`,
    cta: 'Guardar para compararnos',
  }
}

/** Aplica el código. Devuelve el mensaje de «hecho». */
export async function applyCode(c: ShareCode, now = new Date()): Promise<string> {
  const who = whoOf(c.from)
  if (c.type === 'word') {
    const all = await db.lookups.toArray()
    const have = all.find((l) => sameWord(l.result.headword, c.headword))
    if (have?.saved) return `Ya tenías «${have.result.headword}» en tus Palabras.`
    // Si ya la habías consultado (sin guardar), se guarda la tuya: no se duplica.
    if (have?.id) await db.lookups.update(have.id, { saved: true })
    else await db.lookups.add({ query: c.headword, context: sharedContext(c.from), result: lookupFromCode(c), saved: true, createdAt: now.getTime() })
    await syncCards().catch(() => 0)
    return `«${c.headword}» ya está en tus Palabras y en tu Repaso.`
  }
  if (c.type === 'week') {
    const id = memberId(c.from)
    const prev = await db.family.get(id)
    const week = { id: c.week, minutes: c.minutes, streak: c.streak, days: c.days, ...(c.challenge ? { challenge: c.challenge } : {}) }
    // Un código más antiguo que el que ya tienes no lo pisa.
    if (prev?.week && boundsOfKey(prev.week.id).start > boundsOfKey(c.week).start) return `Ya tenías una semana más reciente de ${c.from}.`
    await db.family.put({ ...(prev ?? {}), id, name: c.from, at: now.getTime(), week })
    return `Guardado: ${c.from} ya está en Mi familia.`
  }
  if (c.type === 'challenge') {
    const id = weekKey(now)
    await db.challenges.put(challengeFromCode(c, id, now.getTime()))
    return `¡Reto aceptado! Esta semana: «${c.title}», con ${who}.`
  }
  const cur = await currentChallenge(now)
  if (!cur) return 'No hay reto esta semana.'
  await db.challenges.update(cur.id, { rival: { name: who, progress: c.progress, target: c.target, at: now.getTime() } })
  return `Guardado: ${who} va ${c.progress} de ${c.target}.`
}

/** 5.13 (Fase 7): clave de una persona en «Mi familia» (su nombre, sin mayúsculas ni espacios de más). */
export const memberId = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')
