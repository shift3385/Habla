import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Settings } from '../lib/settings'
import Background from '../ui/Background'
import type { ThemeVars } from '../ui/theme'
import SoundRoutes, { type SoundRoute } from './SoundRoutes'

/**
 * 5.11 (S-11): la ficha de un sonido a pantalla completa encima de la clase, el Repaso o «Dilo tú» («🔊 Practicar el sonido
 * /θ/ en Sonidos»), como GrammarSheet. Tiene su propia pila (ficha → relacionado…); Atrás en la primera pantalla la cierra
 * y sigues donde estabas (la clase de debajo no se desmonta: ni el turno ni la grabación se pierden). Encima de una clase
 * no hay lecciones ni micro propio: el micro es el de la clase.
 */
export default function SoundSheet({
  soundId,
  settings,
  t,
  update,
  onClose,
  registerBack,
}: {
  soundId: string
  settings: Settings
  t: ThemeVars
  update: (p: Partial<Settings>) => void
  onClose: () => void
  registerBack: (h: (() => void) | null) => void
}) {
  const [stack, setStack] = useState<SoundRoute[]>([{ kind: 'sound', id: soundId }])
  const pop = useCallback(() => (stack.length > 1 ? setStack((s) => s.slice(0, -1)) : onClose()), [stack.length, onClose])
  useEffect(() => {
    registerBack(pop)
    return () => registerBack(null)
  }, [pop, registerBack])
  const top = stack[stack.length - 1]
  return createPortal(
    <div className="fixed inset-0 z-[45]" style={{ color: 'var(--tx)' }}>
      <Background t={t} />
      <div className="tab-content no-scrollbar relative z-[2] mx-auto h-full max-w-xl overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+28px)]">
        <SoundRoutes route={top} settings={settings} update={update} push={(r) => setStack((s) => [...s, r])} pop={pop} inClass />
      </div>
    </div>,
    document.body,
  )
}
