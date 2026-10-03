import { useState } from 'react'
import MascotPage from '../components/MascotPage'
import { APP_VERSION, RELEASES } from '../lib/changelog'
import { todayKey, type Notice } from '../lib/notices'
import type { Settings } from '../lib/settings'
import { Icon, type IconName } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO, THEME_KEYS } from '../ui/theme'

interface Props {
  settings: Settings
  notices: Notice[]
  homework?: { text: string; date: number } | null
  update: (p: Partial<Settings>) => void
  onRetest: () => void
  onOpenThemes: () => void
  onDone: () => void
}

/**
 * Antes del Inicio, la mascota cuenta lo que hay que saber, de uno en uno y a pantalla completa (como la
 * bienvenida): novedades de la versión, re-test disponible y otros compañeros. Así el Inicio no se llena de avisos.
 */
export default function NoticeGate({ settings, notices, homework, update, onRetest, onOpenThemes, onDone }: Props) {
  const [i, setI] = useState(0)
  const element = THEME_INFO[settings.theme].mascot
  const notice = notices[i]
  const step = { i, n: notices.length }
  const next = () => (i + 1 < notices.length ? setI(i + 1) : onDone())
  const last = i + 1 >= notices.length

  if (notice === 'news') {
    const r = RELEASES.find((x) => x.v === APP_VERSION) ?? RELEASES[0]
    const items: [IconName, string][] = [
      ...(r.added ?? []).map((x) => ['spark', x] as [IconName, string]),
      ...(r.improved ?? []).map((x) => ['bolt', x] as [IconName, string]),
      ...(r.fixed ?? []).map((x) => ['wrench', x] as [IconName, string]),
    ]
    return (
      <MascotPage
        element={element}
        mood="happy"
        step={step}
        title={`Novedades de la v${APP_VERSION}`}
        subtitle={r.title}
        primary={{
          label: last ? 'Entrar' : 'Siguiente',
          onClick: () => {
            update({ lastSeenVersion: APP_VERSION })
            next()
          },
        }}
      >
        <div className="glass flex flex-col gap-2.5 rounded-[26px] px-4 py-3.5">
          {items.map(([icon, text], k) => (
            <div key={k} className="flex items-start gap-2.5">
              <span className="txt-acc2 mt-0.5 flex-none">
                <Icon name={icon} size={15} />
              </span>
              <span className="text-[14px] leading-snug">{text}</span>
            </div>
          ))}
        </div>
      </MascotPage>
    )
  }

  if (notice === 'homework' && homework) {
    return (
      <MascotPage
        element={element}
        mood="happy"
        step={step}
        title="Tu tarea de hoy"
        subtitle="La dejó tu profe al final de tu última clase. Son 5–10 minutos."
        primary={{
          label: last ? 'Entrar' : 'Siguiente',
          onClick: () => {
            update({ homeworkSeen: homework.date })
            next()
          },
        }}
      >
        <div className="glass flex items-start gap-3 rounded-[26px] px-4 py-4">
          <span className="txt-acc2 mt-0.5 flex-none">
            <Icon name="flag" size={17} />
          </span>
          <span className="text-[16px] leading-snug">{homework.text}</span>
        </div>
      </MascotPage>
    )
  }

  if (notice === 'retest') {
    return (
      <MascotPage
        element={element}
        mood="happy"
        step={step}
        title="¡Te toca el re-test!"
        subtitle="Han pasado 4 semanas desde tu último test. En unos 12 minutos verás cuánto has avanzado, y tu plan se adaptará a tu nuevo nivel."
        primary={{ label: 'Hacer el re-test ahora', onClick: onRetest }}
        secondary={{
          label: 'Más tarde (te lo recuerdo mañana)',
          onClick: () => {
            update({ retestSnoozed: todayKey() })
            next()
          },
        }}
      >
        <div className="flex justify-center gap-2.5">
          {(['Gramática', 'Lectura', 'Audición', 'Habla'] as const).map((x) => (
            <span key={x} className="glass rounded-[16px] px-3 py-2 text-[13px]">
              {x}
            </span>
          ))}
        </div>
      </MascotPage>
    )
  }

  if (notice === 'companions') {
    const others = THEME_KEYS.filter((k) => k !== settings.theme)
    const names = others.map((k) => THEME_INFO[k].mascotName)
    return (
      <MascotPage
        element={element}
        mood="happy"
        step={step}
        title={`${names.slice(0, -1).join(', ')} y ${names[names.length - 1]} quieren conocerte`}
        subtitle="¡Llevas 3 días seguidos! Ya puedes probar otro compañero, con su tema y su personalidad."
        primary={{
          label: 'Conocerlos',
          onClick: () => {
            update({ mascotNudgeSeen: true })
            onOpenThemes()
          },
        }}
        secondary={{
          label: 'Ahora no',
          onClick: () => {
            update({ mascotNudgeSeen: true })
            next()
          },
        }}
      >
        <div className="flex justify-center">
          {others.map((k) => (
            <div key={k} className="flex flex-col items-center">
              <Mascot element={THEME_INFO[k].mascot} mood="happy" size={92} interactive={false} />
              <span className="text-[13px] font-semibold">{THEME_INFO[k].mascotName}</span>
            </div>
          ))}
        </div>
      </MascotPage>
    )
  }

  return null
}
