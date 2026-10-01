import ProfileForm from '../components/ProfileForm'
import type { Profile } from '../lib/db'

/** Paso "Tu perfil": obligatorio una vez para cada perfil, antes del test de nivel. */
export default function ProfileSetup({ onDone }: { onDone: (p: Profile) => void }) {
  return (
    <div className="no-scrollbar relative z-[2] h-full overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+28px)]">
      <div className="anim-up">
        <div className="txt-acc2 text-xs tracking-[1.2px] uppercase">Tu perfil</div>
        <h1 className="mt-1 text-[30px] leading-tight font-semibold tracking-[-.7px]">Cuéntanos un poco de ti</h1>
        <p className="txt-sub mt-2 mb-5 text-[15px] leading-snug">
          Tu profe lo usará para hablarte de lo que te interesa y preparar prácticas a tu medida.
        </p>
        <ProfileForm submitLabel="Continuar" onSaved={onDone} />
      </div>
    </div>
  )
}
