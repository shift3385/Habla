import { costEstimate, PLANS } from '../lib/phonetics'
import type { Settings } from '../lib/settings'
import { THEME_INFO, type ThemeVars } from '../ui/theme'
import MascotPage from './MascotPage'

/** La mascota avisa: el plan F0 de Azure se agotó este mes. Informa del plan activo y de lo que costaría uno de pago. */
export default function PhoneticsAlert({ settings, t, onClose, onOpenModels }: { settings: Settings; t: ThemeVars; onClose: () => void; onOpenModels: () => void }) {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toLocaleDateString('es', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  return (
    <MascotPage
      overlay={{ t }}
      element={THEME_INFO[settings.theme].mascot}
      mood="thinking"
      title="Se acabó la fonética gratis de este mes"
      subtitle={`Tu recurso de Azure está en el plan F0 y ya usó sus 5 h de audio. Sigo corrigiéndote con Gemini; la fonética vuelve el ${next}.`}
      primary={{ label: 'Entendido', onClick: onClose }}
      secondary={{ label: 'Ver Ajustes → Modelos', onClick: onOpenModels }}
    >
      <div className="glass rounded-[20px] p-4 fs-14">
        <div className="font-semibold">¿No quieres esperar?</div>
        <div className="txt-sub mt-0.5 fs-12.5 leading-snug">Cambia tu recurso a un plan de pago en el portal de Azure, márcalo en Modelos y activa la fonética:</div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {PLANS.filter((p) => p.perHour).map((p) => (
            <li key={p.key} className="flex items-baseline justify-between gap-2">
              <b>{p.title}</b>
              <span className="txt-sub text-right fs-12.5">
                {p.price.replace('por hora de audio', '/h')} · {costEstimate(p.key)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </MascotPage>
  )
}
