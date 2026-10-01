import { IC, type IconName } from './icon-paths'

export type { IconName }

export function Icon({
  name,
  size = 18,
  stroke = 1.7,
  className,
  color = 'currentColor',
}: {
  name: IconName
  size?: number
  stroke?: number
  className?: string
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={IC[name]} />
    </svg>
  )
}
