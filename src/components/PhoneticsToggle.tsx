import { hasAzure, monthKey, phoneticsActive } from '../lib/phonetics'
import type { Settings } from '../lib/settings'
import { Icon } from '../ui/icons'

/**
 * v5.9 (nota del dueño): interruptor de la fonética de Azure en todo lo que graba (clase, prácticas, temas, repaso y
 * test). Solo aparece si hay clave de Azure. Cambia el mismo ajuste que Ajustes → Modelos (por defecto, lo que haya
 * ahí); apagarlo a mano cuenta como «la apagaste tú» y no se vuelve a encender sola.
 */
export default function PhoneticsToggle({
  settings,
  update,
  compact,
}: {
  settings: Settings
  update: (p: Partial<Settings>) => void
  /** Solo el icono (botón redondo): en la fila de la clase no cabe el texto en horizontal. */
  compact?: boolean
}) {
  if (!hasAzure(settings)) return null
  const exhausted = settings.azurePlan === 'F0' && settings.f0ExhaustedMonth === monthKey()
  const on = phoneticsActive(settings)
  return (
    <button
      type="button"
      disabled={exhausted}
      onClick={() => update(on ? { phoneticsOn: false, phoneticsUserOff: true } : { phoneticsOn: true, phoneticsUserOff: false })}
      className={`flex h-[34px] flex-none items-center justify-center gap-1.5 rounded-[17px] text-[13px] disabled:opacity-50 ${compact ? 'w-[34px]' : 'px-3'} ${on ? 'btn-acc' : 'glass'}`}
      aria-pressed={on}
      aria-label={exhausted ? 'Fonética agotada este mes' : on ? 'Fonética activada: tocar para apagarla' : 'Fonética apagada: tocar para activarla'}
    >
      <Icon name="soundwave" size={15} stroke={1.8} />
      {!compact && (exhausted ? 'Agotada' : 'Fonética')}
    </button>
  )
}
