import { useEffect, useState } from 'react'
import MascotPage from '../components/MascotPage'
import { APP_VERSION, findRelease, RELEASES } from '../lib/changelog'
import type { Notice } from '../lib/notices'
import type { SavedClass } from '../lib/savedClass'
import type { Skill } from '../lib/db'
import SkillProgressCard from '../components/SkillProgressCard'
import HelpPoint from '../components/HelpPoint'
import type { Settings } from '../lib/settings'
import { loadProgress } from '../lib/testDraft'
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
  savedClass?: SavedClass | null
  onResumeClass?: () => void
  /** Niveles actuales (para enseñar el progreso con la tarjeta "Por habilidad"). */
  levels?: Record<Skill, string>
  onDone: () => void
}

/**
 * Antes del Inicio, la mascota cuenta lo que hay que saber, de uno en uno y a pantalla completa (como la
 * bienvenida): novedades de la versión, re-test disponible y otros compañeros. Así el Inicio no se llena de avisos.
 */
export default function NoticeGate({ settings, notices, homework, update, onRetest, onOpenThemes, onDone, savedClass, onResumeClass, levels }: Props) {
  const [i, setI] = useState(0)
  // v5.9: re-test pospuesto («Posponer»): la mascota lo dice y ofrece seguirlo.
  const [testPaused, setTestPaused] = useState(false)
  useEffect(() => {
    if (!notices.includes('retest')) return
    loadProgress().then((p) => setTestPaused(!!p?.pauseUsed))
  }, [notices])
  const element = THEME_INFO[settings.theme].mascot
  const notice = notices[i]
  const step = { i, n: notices.length }
  const next = () => (i + 1 < notices.length ? setI(i + 1) : onDone())
  const last = i + 1 >= notices.length

  if (notice === 'savedClass') {
    const when = savedClass ? new Date(savedClass.savedAt).toLocaleString('es', { weekday: 'long', hour: '2-digit', minute: '2-digit' }) : ''
    return (
      <MascotPage
        element={element}
        mood="happy"
        step={step}
        title="¡Hola de nuevo!"
        subtitle={
          savedClass
            ? `Dejamos una clase a medias: «${savedClass.title}» (${savedClass.turns} ${savedClass.turns === 1 ? 'respuesta' : 'respuestas'}, ${when}). ¿La seguimos donde quedó?`
            : 'Dejamos una clase a medias. ¿La seguimos donde quedó?'
        }
        primary={{ label: 'Continuar mi clase', onClick: () => onResumeClass?.() }}
        secondary={{ label: 'Ir al inicio', onClick: next }}
      />
    )
  }

  if (notice === 'news') {
    // Un parche (5.9.1) se busca dentro de su versión: antes no se encontraba y salían las novedades de la última.
    const found = findRelease(APP_VERSION)
    const r = found?.release ?? RELEASES[0]
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
        title={found?.parent ? `Parche de seguridad ${APP_VERSION}` : `Novedades de la v${APP_VERSION}`}
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

  if (notice === 'keysIntro') {
    const done = () => {
      update({ keysIntroSeen: true })
      next()
    }
    return (
      <MascotPage
        element={element}
        mood="happy"
        step={step}
        title="¿Para qué es tu clave?"
        subtitle="Cuando empezaste te pedí una clave de Gemini y no te conté bien para qué. Te lo explico en un momento."
        primary={{ label: last ? 'Entendido' : 'Siguiente', onClick: done }}
      >
        <ul className="glass flex flex-col gap-3 rounded-[26px] px-4 py-3.5 text-left">
          <HelpPoint icon="spark">
            Tu profe es una <b>inteligencia artificial</b>: Habla usa <b>Gemini</b>, de Google, para entenderte, corregirte y responderte.
          </HelpPoint>
          <HelpPoint icon="key">
            Tu <b>clave de Gemini</b> es tu pase personal para usarla. Es <b>gratis</b>, con un límite de uso al día.
          </HelpPoint>
          <HelpPoint icon="shield">
            Se guarda <b>solo en este teléfono</b> y no va en tus copias. Para verla o cambiarla te pido tu patrón, PIN o huella.
          </HelpPoint>
          <HelpPoint icon="ear">
            <b>Opcional:</b> con una clave de <b>Azure Speech</b> (5 h gratis al mes) también te corrijo la pronunciación sonido a sonido. Se activa en Ajustes → Modelos.
          </HelpPoint>
        </ul>
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

  if (notice === 'retest' || notice === 'recalibrate') {
    const recal = notice === 'recalibrate'
    return (
      <MascotPage
        element={element}
        mood="happy"
        step={step}
        title={recal ? 'Ya puedes repetir tu test' : testPaused ? 'Tu re-test está pospuesto' : '¡Te toca el re-test!'}
        subtitle={
          !recal && testPaused
            ? 'Lo pospusiste y está guardado. Sigue justo donde lo dejaste; esta vez ya no se puede volver a posponer.'
            : recal
              ? 'Tu primer test se hizo antes de calibrar las preguntas y no era justo. El nuevo test (unos 25 minutos) lo sustituye por completo: tu nivel será lo que saques en él.'
              : 'Han pasado 4 semanas desde tu último test. En unos 25 minutos verás cuánto has avanzado; tu nuevo nivel será 70 % el test y 30 % lo que propusieron tus clases.'
        }
        primary={{ label: recal ? 'Hacer el test ahora' : testPaused ? 'Seguir el re-test' : 'Hacer el re-test ahora', onClick: onRetest }}
        secondary={{
          // Sin aplazar días: mientras esté disponible, te lo recuerdo cada vez que entres.
          label: 'Más tarde (te lo recuerdo la próxima vez que entres)',
          onClick: next,
        }}
      >
        {levels ? (
          <SkillProgressCard levels={levels} title="Así estás ahora" />
        ) : null}
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
