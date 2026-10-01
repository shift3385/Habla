import { useEffect, useState } from 'react'
import { db, type Profile } from '../lib/db'
import { getProfile, PURPOSES } from '../lib/profile'
import { TOPIC_CATEGORIES } from '../lib/topics'
import { Icon } from '../ui/icons'

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex h-9 items-center gap-1.5 rounded-[18px] px-3.5 text-[13.5px] ${on ? 'btn-acc' : 'glass'}`}>
      {on && <Icon name="check" size={14} stroke={2.2} />}
      {label}
    </button>
  )
}

/** Datos personales del perfil (nombre, a qué se dedica, para qué quiere el inglés, intereses). */
export default function ProfileForm({ submitLabel, onSaved }: { submitLabel: string; onSaved: (p: Profile) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const [purposes, setPurposes] = useState<string[]>([])
  const [interests, setInterests] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p)
      setName(p.name ?? '')
      setAbout(p.about ?? '')
      setPurposes(p.purposes ?? [])
      setInterests(p.interests ?? [])
    })
  }, [])

  // Actualización funcional: varios toques seguidos no se pisan entre sí.
  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>, id: string) =>
    set((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  const save = async () => {
    if (!profile || !name.trim()) return
    setSaving(true)
    const next: Profile = { ...profile, name: name.trim(), about: about.trim(), purposes, interests }
    await db.profile.put(next)
    setSaving(false)
    onSaved(next)
  }

  if (!profile) return null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 text-[15px] font-semibold">¿Cómo te llamas?</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="input" autoComplete="given-name" />
      </div>
      <div>
        <div className="mb-1.5 text-[15px] font-semibold">
          ¿A qué te dedicas? <span className="txt-sub text-[13px] font-normal">(opcional)</span>
        </div>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={2}
          placeholder="Ej.: enfermera, estudiante de derecho, jubilado, tengo una tienda…"
          className="input h-auto resize-none py-3 leading-snug"
        />
      </div>
      <div>
        <div className="mb-2 text-[15px] font-semibold">¿Para qué quieres el inglés?</div>
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((p) => (
            <Chip key={p.id} on={purposes.includes(p.id)} label={p.label} onClick={() => toggle(setPurposes, p.id)} />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-[15px] font-semibold">
          Temas que te gustan <span className="txt-sub text-[13px] font-normal">(el profe los elegirá más a menudo)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TOPIC_CATEGORIES.map((c) => (
            <Chip key={c.id} on={interests.includes(c.id)} label={c.title} onClick={() => toggle(setInterests, c.id)} />
          ))}
        </div>
      </div>
      <button onClick={save} disabled={!name.trim() || saving} className="btn-acc mt-1 h-[56px] rounded-full text-[16px]">
        {submitLabel}
      </button>
    </div>
  )
}
