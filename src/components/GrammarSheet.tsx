import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Settings } from '../lib/settings'
import Background from '../ui/Background'
import type { ThemeVars } from '../ui/theme'
import GrammarRoutes, { type GramRoute } from './GrammarRoutes'

/**
 * v5.10 (D3): Gramática a pantalla completa encima de la clase o del informe («📘 Ver en Gramática»). Tiene su propia pila
 * (tema → relacionado → «Pregúntale»…); Atrás en la primera pantalla la cierra y vuelves a donde estabas. Dentro de una
 * clase no se ofrecen «Dilo tú» ni «Practicar en una clase» (el micro y la clase son los de la clase abierta).
 */
export default function GrammarSheet({
  topicId,
  settings,
  t,
  update,
  level,
  onClose,
  registerBack,
}: {
  topicId: string
  settings: Settings
  t: ThemeVars
  update: (p: Partial<Settings>) => void
  level: string
  onClose: () => void
  /** El botón Atrás de Android pasa primero por la hoja. */
  registerBack: (h: (() => void) | null) => void
}) {
  const [stack, setStack] = useState<GramRoute[]>([{ kind: 'topic', id: topicId }])
  const pop = useCallback(() => (stack.length > 1 ? setStack((s) => s.slice(0, -1)) : onClose()), [stack.length, onClose])
  useEffect(() => {
    registerBack(pop)
    return () => registerBack(null)
  }, [pop, registerBack])
  const top = stack[stack.length - 1]
  return createPortal(
    <div className="fixed inset-0 z-[45]" style={{ color: 'var(--tx)' }}>
      <Background t={t} />
      {/* `tab-content`: las pantallas de Gramática se desplazan y vuelven arriba dentro de este contenedor. */}
      <div className="tab-content no-scrollbar relative z-[2] mx-auto h-full max-w-xl overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+28px)]">
        <GrammarRoutes route={top} settings={settings} update={update} level={level} push={(r) => setStack((s) => [...s, r])} pop={pop} inClass />
      </div>
    </div>,
    document.body,
  )
}
