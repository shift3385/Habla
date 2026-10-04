import type { Trouble } from '../lib/geminiTrouble'
import type { Settings } from '../lib/settings'
import { THEME_INFO, type ThemeVars } from '../ui/theme'
import GeminiFix from './GeminiFix'
import MascotPage from './MascotPage'

const TITLES: Record<Trouble['kind'], { title: string; hint: string }> = {
  slow: {
    title: 'Gemini está saturado o va lento',
    hint: 'Pasa a veces con las claves gratuitas. Prueba otro modelo o una clave de pago y vuelve a intentarlo.',
  },
  quota: {
    title: 'Tu clave se quedó sin cuota',
    hint: 'Con otro modelo suele haber saldo; con una clave de pago no te pasará.',
  },
  key: {
    title: 'Hay un problema con tu clave',
    hint: 'Google no acepta esta clave. Pega otra para seguir.',
  },
  model: {
    title: 'Ese modelo no está disponible',
    hint: 'Elige otro modelo de la lista.',
  },
}

/** La mascota avisa de un problema con Gemini (en cualquier pantalla) y propone otro modelo u otra clave. */
export default function GeminiTroubleSheet({
  trouble,
  settings,
  t,
  update,
  onClose,
  onLater,
}: {
  trouble: Trouble
  settings: Settings
  t: ThemeVars
  update: (p: Partial<Settings>) => void
  onClose: () => void
  onLater: () => void
}) {
  const info = TITLES[trouble.kind]
  return (
    <MascotPage
      overlay={{ t }}
      element={THEME_INFO[settings.theme].mascot}
      mood="thinking"
      title={info.title}
      subtitle={info.hint}
      primary={{ label: 'Listo', onClick: onClose }}
      secondary={{ label: 'Ahora no', onClick: onLater }}
    >
      <GeminiFix settings={settings} update={update} />
    </MascotPage>
  )
}
