import { useEffect, useState } from 'react'
import type { StudentFact } from '../lib/db'
import { deleteAllFacts, deleteFact, editFact, FACT_MAX, listFacts, MAX_FACTS, PROMPT_FACTS } from '../lib/memory'
import type { Settings } from '../lib/settings'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import Switch from '../ui/Switch'
import { THEME_INFO, teacherName } from '../ui/theme'

/**
 * 5.12 (P-11) Ajustes → «Lo que recuerda tu profe»: la mascota explica qué se guarda; interruptor para apagarlo; la
 * lista (cambiar o borrar cada dato) y «Borrar todo». Todo en este teléfono (tabla `facts`, memory.ts).
 */
export default function MemorySettings({ settings, update }: { settings: Settings; update: (p: Partial<Settings>) => void }) {
  const info = THEME_INFO[settings.theme]
  const name = teacherName(settings.theme)
  const [facts, setFacts] = useState<StudentFact[] | null>(null)
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [askAll, setAskAll] = useState(false)
  const reload = () =>
    listFacts()
      .then(setFacts)
      .catch(() => setFacts([]))
  useEffect(() => {
    reload()
  }, [])

  const save = async () => {
    if (!editing) return
    const ok = await editFact(editing.id, editing.text)
    if (!ok) {
      setHint('Eso parece de salud, dinero, política o religión: prefiero no guardarlo. Cámbialo o bórralo.')
      return
    }
    setHint(null)
    setEditing(null)
    reload()
  }

  return (
    <>
      <div className="flex items-start gap-2.5">
        <Mascot element={info.mascot} mood="speaking" size={44} interactive={false} />
        <div className="tip-bubble min-w-0 flex-1 rounded-[18px] px-3.5 py-2.5 fs-13.5 leading-snug">
          Al terminar cada clase apunto hasta 3 cosas de tu vida que me cuentes («El viernes tienes una entrevista»), para
          preguntarte por una al empezar la siguiente. Nunca apunto nada de salud, dinero, política ni religión. Se guarda solo en
          este teléfono (y en tus copias), y aquí lo puedes cambiar o borrar cuando quieras.
        </div>
      </div>

      <div className="glass rounded-[28px] p-[18px]">
        <button onClick={() => update({ teacherMemory: !settings.teacherMemory })} className="flex w-full items-center justify-between gap-3 text-left fs-15">
          <span>
            Que {name} recuerde
            <span className="txt-sub block text-xs">
              {settings.teacherMemory
                ? `Usa los ${PROMPT_FACTS} más recientes en cada clase; guarda como mucho ${MAX_FACTS}.`
                : 'Apagado: no apunta nada nuevo y no usa lo guardado (no se borra).'}
            </span>
          </span>
          <Switch on={settings.teacherMemory} />
        </button>
      </div>

      <div className="glass rounded-[28px] p-[18px]">
        <div className="flex items-center justify-between gap-2">
          <div className="fs-15 font-semibold">{facts?.length ? `Lo que recuerdo (${facts.length})` : 'Lo que recuerdo'}</div>
        </div>
        {facts === null ? (
          <div className="txt-sub mt-2 text-sm">Cargando…</div>
        ) : facts.length === 0 ? (
          <div className="txt-sub mt-2 text-sm leading-snug">Aún no recuerdo nada. Al terminar tu próxima clase te enseño en el informe lo que apunte.</div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {facts.map((f) =>
              editing?.id === f.id ? (
                <li key={f.id} className="field flex flex-col gap-2 rounded-[20px] p-2.5">
                  <textarea
                    value={editing?.text ?? ''}
                    onChange={(e) => setEditing({ id: f.id!, text: e.target.value })}
                    rows={2}
                    maxLength={FACT_MAX}
                    autoFocus
                    aria-label="Cambiar lo que recuerda tu profe"
                    className="input min-h-[52px] w-full resize-none rounded-[16px] px-3 py-2 fs-15 leading-snug"
                  />
                  {hint && <div className="fs-12.5 leading-snug" style={{ color: 'var(--bad)' }}>{hint}</div>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(null)
                        setHint(null)
                      }}
                      className="glass h-10 flex-1 rounded-[20px] fs-14"
                    >
                      Cancelar
                    </button>
                    <button onClick={save} className="btn-acc h-10 flex-1 rounded-[20px] fs-14 font-semibold">
                      Guardar
                    </button>
                  </div>
                </li>
              ) : (
                <li key={f.id} className="field flex items-center gap-2 rounded-[20px] py-2 pr-1.5 pl-3.5">
                  <span className="min-w-0 flex-1 fs-14.5 leading-snug break-words">
                    {f.text}
                    <span className="txt-sub block fs-11.5">{new Date(f.updatedAt ?? f.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
                  </span>
                  <button
                    onClick={() => {
                      setHint(null)
                      setEditing({ id: f.id!, text: f.text })
                    }}
                    className="glass grid h-10 w-10 flex-none place-items-center rounded-full"
                    aria-label={`Cambiar: ${f.text}`}
                  >
                    <Icon name="pencil" size={16} />
                  </button>
                  <button
                    onClick={() => deleteFact(f.id!).then(reload)}
                    className="glass grid h-10 w-10 flex-none place-items-center rounded-full"
                    aria-label={`Borrar: ${f.text}`}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
        {!!facts?.length &&
          (askAll ? (
            <div className="mt-3 flex flex-col gap-2">
              <div className="text-center fs-13.5 leading-snug">¿Borro todo lo que recuerdo de ti? No se puede deshacer.</div>
              <div className="flex gap-2">
                <button onClick={() => setAskAll(false)} className="glass h-11 flex-1 rounded-[22px] fs-14">
                  No, déjalo
                </button>
                <button
                  onClick={() =>
                    deleteAllFacts().then(() => {
                      setAskAll(false)
                      reload()
                    })
                  }
                  className="h-11 flex-1 rounded-[22px] fs-14 font-semibold"
                  style={{ background: 'var(--bad)', color: '#fff' }}
                >
                  Sí, borrar todo
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAskAll(true)} className="txt-sub mt-3 flex h-10 w-full items-center justify-center gap-1.5 fs-14 underline underline-offset-[3px]">
              <Icon name="trash" size={14} />
              Borrar todo
            </button>
          ))}
      </div>
    </>
  )
}
