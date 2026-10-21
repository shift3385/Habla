import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Background from '../ui/Background'
import { Icon } from '../ui/icons'
import Mascot, { type MascotElement, type MascotMood } from '../ui/Mascot'
import type { ThemeVars } from '../ui/theme'

interface Action {
  label: string
  onClick: () => void
  disabled?: boolean
}

interface Props {
  element: MascotElement
  mood?: MascotMood
  /** Puntos de progreso (paso actual y total), como en la bienvenida. */
  step?: { i: number; n: number }
  title: string
  subtitle?: string
  children?: ReactNode
  /** Botón principal (sin él, la respuesta son las opciones del centro). */
  primary?: Action
  /** Acción secundaria (enlace bajo el botón principal), p. ej. "Ahora no". */
  secondary?: Action
  onBack?: () => void
  /** Pantalla completa por encima de todo (portal con fondo propio), p. ej. sobre el Inicio. */
  overlay?: { t: ThemeVars }
  onMascotTap?: () => void
}

/**
 * Página de la mascota: el mismo formato que la bienvenida (mascota arriba, pregunta grande, respuesta en el
 * centro y botones abajo). Se usa para novedades, avisos, Tema libre y Debate: la mascota te habla y respondes.
 */
export default function MascotPage({
  element,
  mood = 'idle',
  step,
  title,
  subtitle,
  children,
  primary,
  secondary,
  onBack,
  overlay,
  onMascotTap,
}: Props) {
  const page = (
    <div
      className="mp-page anim-up relative z-[2] mx-auto flex h-full w-full max-w-xl flex-col px-[18px] pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+24px)]"
      style={{ color: 'var(--tx)' }}
    >
      {/* En horizontal, la mascota va en su columna (mp-side) y el resto en la otra (mp-main); en vertical, igual que siempre. */}
      <div className="mp-side">
        <div className="flex flex-none justify-center">
          <Mascot element={element} mood={mood} size={150} onTap={onMascotTap} />
        </div>
        {step && step.n > 1 && (
          <div className="mt-1 flex justify-center gap-1.5">
            {Array.from({ length: step.n }, (_, i) => (
              <span
                key={i}
                className="h-[7px] rounded transition-all duration-300"
                style={{ width: i === step.i ? 24 : 7, background: i <= step.i ? 'var(--acc)' : 'var(--gb)' }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="mp-main">
        <div className="mt-[14px] text-center fs-28 leading-tight font-semibold tracking-[-.6px] text-balance">{title}</div>
        {subtitle && <div className="txt-sub mt-1.5 text-center fs-15 leading-snug text-pretty">{subtitle}</div>}
        <div className="no-scrollbar mt-5 min-h-0 flex-1 overflow-y-auto">{children}</div>
        {secondary && (
          <button
            onClick={secondary.onClick}
            disabled={secondary.disabled}
            className="txt-sub mt-2 min-h-10 py-1.5 fs-15 underline underline-offset-[3px]"
          >
            {secondary.label}
          </button>
        )}
        <div className="mt-3 flex gap-2.5">
          {onBack && (
            <button onClick={onBack} className="glass grid h-[58px] w-[58px] flex-none place-items-center rounded-full" aria-label="Atrás">
              <Icon name="back" size={20} stroke={1.8} />
            </button>
          )}
          {primary && (
            <button
              onClick={primary.onClick}
              disabled={primary.disabled}
              className="btn-acc h-[58px] flex-1 rounded-full fs-17 transition-opacity"
              style={{ opacity: primary.disabled ? 0.45 : 1 }}
            >
              {primary.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  if (!overlay) return page
  // Encima del Inicio y de la barra de pestañas.
  return createPortal(
    <div className="fixed inset-0 z-[50]">
      <Background t={overlay.t} />
      {page}
    </div>,
    document.body,
  )
}
