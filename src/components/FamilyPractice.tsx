import { useEffect, useState } from 'react'
import type { FamilyMember } from '../lib/db'
import { findSituation, SITUATIONS } from '../lib/missions'
import { myPracticeScore } from '../lib/shareApply'
import { practiceMessage, scoreMessage } from '../lib/shareCode'
import { shareMessage } from '../lib/shareText'
import { Icon } from '../ui/icons'

// 5.13 (Fase 8): «Practicar lo mismo» en «Mi familia»: una Situación de la lista que os proponéis por código y la nota de
// cada uno. Solo Situaciones de la lista (nunca texto libre): nada de otra persona entra en un prompt.

const told = (r: Awaited<ReturnType<typeof shareMessage>>) =>
  r === 'copied' ? 'Mensaje copiado: pégalo en WhatsApp.' : r === 'failed' ? 'No he podido abrir Compartir.' : null

/** Lo de la práctica en la fila de una persona: su nota frente a la tuya, «Practicar» o «Mandar mi nota». */
export function PracticeRow({ m, name, onStart }: { m: FamilyMember; name: string; onStart?: (situationId: string) => void }) {
  const p = m.practice
  const s = p ? findSituation(p.situationId) : undefined
  const [mine, setMine] = useState<{ score: number; goals: number; total: number } | null | undefined>(undefined)
  const [note, setNote] = useState<string | null>(null)
  useEffect(() => {
    if (p) myPracticeScore(p.situationId).then(setMine, () => setMine(null))
  }, [p])
  if (!p || !s) return null
  const theirs = typeof p.score === 'number' ? `${m.name}: ${p.score} (${p.goals ?? 0}/${p.total ?? 3})` : `${m.name}: aún sin nota`
  const yours = mine ? `Tú: ${mine.score} (${mine.goals}/${mine.total})` : mine === null ? 'Tú: aún no la has hecho' : ''
  const sendScore = async () => {
    setNote(null)
    if (!mine) return
    if (!name.trim()) return setNote('Pon tu nombre en Ajustes → Mi perfil y datos: así saben de quién es.')
    setNote(told(await shareMessage(scoreMessage({ type: 'score', from: name, situation: p.situationId, ...mine }), 'Mandar mi nota')))
  }
  return (
    <div className="field flex flex-col gap-2 rounded-[16px] px-3 py-2.5" data-practice-row={p.situationId}>
      <div className="fs-13.5 leading-snug">
        <span aria-hidden>{s.emoji}</span> <b>{s.titleEs}</b>
        <span className="txt-sub block fs-12.5">
          {theirs}
          {yours && ` · ${yours}`}
        </span>
      </div>
      <div className="flex gap-2">
        {onStart && (
          <button onClick={() => onStart(p.situationId)} className="glass h-9 flex-1 rounded-full px-3 fs-13 font-semibold" data-practice-start>
            {mine ? 'Otra vez' : 'Practicar'}
          </button>
        )}
        {mine && (
          <button onClick={sendScore} className="btn-acc flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 fs-13" data-send-score>
            <Icon name="upload" size={14} />
            Mandar mi nota
          </button>
        )}
      </div>
      {note && <div className="txt-sub fs-12.5">{note}</div>}
    </div>
  )
}

/** «Proponer una práctica»: eliges una Situación de la lista y se manda como código. */
export function ProposePractice({ name }: { name: string }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const propose = async (situation: string) => {
    setNote(told(await shareMessage(practiceMessage({ type: 'practice', from: name.trim(), situation }), 'Proponer una práctica')))
  }
  return (
    <div className="glass flex flex-col gap-2.5 rounded-[22px] px-4 py-3" data-propose>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 text-left" aria-expanded={open}>
        <span aria-hidden className="text-2xl">
          🎭
        </span>
        <span className="min-w-0 flex-1">
          <span className="block fs-15 font-semibold">Proponer una práctica</span>
          <span className="txt-sub block fs-12.5">La misma Situación para los dos, y comparáis la nota</span>
        </span>
        <Icon name={open ? 'chevD' : 'chevR'} size={16} stroke={1.8} color="var(--sub)" />
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-2 [html[data-landscape]_&]:grid-cols-3">
          {SITUATIONS.map((x) => (
            <button key={x.id} onClick={() => propose(x.id)} className="field flex min-h-[46px] items-center gap-2 rounded-[18px] px-3 py-2 text-left fs-13 leading-tight" data-propose-item={x.id}>
              <span aria-hidden className="flex-none fs-17">
                {x.emoji}
              </span>
              <span className="min-w-0">{x.titleEs}</span>
            </button>
          ))}
        </div>
      )}
      {note && <div className="txt-sub text-center fs-13">{note}</div>}
    </div>
  )
}
