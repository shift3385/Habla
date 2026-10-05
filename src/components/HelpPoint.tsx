import type { ReactNode } from 'react'
import { Icon, type IconName } from '../ui/icons'

/** Una línea de explicación con icono (tutorial de bienvenida y avisos de la mascota). */
export default function HelpPoint({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="field txt-acc2 mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full">
        <Icon name={icon} size={15} />
      </span>
      <span className="min-w-0 flex-1 text-[14px] leading-snug">{children}</span>
    </li>
  )
}
