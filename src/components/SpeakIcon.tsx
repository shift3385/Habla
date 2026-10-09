import { useSpeaking } from '../lib/speaking'
import { Icon, type IconName } from '../ui/icons'

/**
 * v5.9: icono de un botón de reproducir. Muestra ▶ (`speaker`/`speakerWave`) y cambia a ⏸ mientras suena la frase con
 * esa clave (por defecto, la frase). El botón que lo contiene llama a `toggleSpeak` (tocar otra vez para).
 * Es un componente propio para poder usarlo dentro de listas (el hook no se puede llamar en un .map).
 */
export default function SpeakIcon({
  speakKey,
  name = 'speaker',
  size = 16,
  stroke,
  className,
  color,
}: {
  speakKey: string
  name?: IconName
  size?: number
  stroke?: number
  className?: string
  color?: string
}) {
  const on = useSpeaking(speakKey)
  return <Icon name={on ? 'pause' : name} size={size} stroke={on ? Math.max(stroke ?? 1.7, 2.2) : stroke} className={className} color={color} />
}
