import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Settings } from '../lib/settings'
import { weekCardData, weekCardFileName, weekCardText, type WeekCardInput } from '../lib/weekCard'
import { renderWeekCard, shareWeekCard } from '../lib/weekCardImage'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO, type ThemeVars } from '../ui/theme'

/**
 * 5.13 (P-17): vista previa de la tarjeta de la semana antes de compartirla (Progreso → «Compartir mi semana»). La
 * imagen se pinta una vez al abrir (weekCardImage.ts); «Compartir» abre el menú del teléfono (WhatsApp…). En horizontal,
 * la imagen a la izquierda y los botones a la derecha.
 */
export default function WeekCardSheet({
  settings,
  t,
  input,
  extraText,
  onClose,
}: {
  settings: Settings
  t: ThemeVars
  input: WeekCardInput
  /** 5.13 (Fase 3): con un reto compartido, el mensaje con tu código de progreso va debajo del texto de la tarjeta. */
  extraText?: string
  onClose: () => void
}) {
  const info = THEME_INFO[settings.theme] ?? THEME_INFO.marea
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const data = useRef(weekCardData({ ...input, mascotName: info.mascotName }))

  useEffect(() => {
    let alive = true
    renderWeekCard(data.current, { t, fancy: settings.effects.background, mascotSrc: `/mascots/mascot_${info.mascotName.toLowerCase()}.png` })
      .then((c) => {
        if (!alive) return
        canvas.current = c
        setUrl(c.toDataURL('image/png'))
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
    // Se pinta una vez al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const share = async () => {
    if (!canvas.current || busy) return
    setBusy(true)
    try {
      const text = weekCardText(data.current)
      await shareWeekCard(canvas.current, extraText ? `${text}\n\n${extraText}` : text, weekCardFileName())
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[45] flex flex-col items-center gap-3 overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-[calc(env(safe-area-inset-bottom)+16px)] [html[data-landscape]_&]:flex-row [html[data-landscape]_&]:justify-center [html[data-landscape]_&]:gap-5"
      style={{ background: 'var(--bg)', color: 'var(--tx)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Compartir mi semana"
      data-week-card
    >
      <div className="flex min-h-0 w-full max-w-sm flex-1 items-center justify-center [html[data-landscape]_&]:h-full [html[data-landscape]_&]:w-auto [html[data-landscape]_&]:max-w-none [html[data-landscape]_&]:flex-none">
        {url ? (
          <img
            src={url}
            alt="Tu tarjeta de la semana"
            className="max-h-full max-w-full rounded-[22px] object-contain shadow-lg [html[data-landscape]_&]:h-full [html[data-landscape]_&]:w-auto"
            data-week-card-img
          />
        ) : (
          <div className="txt-sub fs-14">{failed ? 'No he podido preparar la imagen.' : 'Preparando tu tarjeta…'}</div>
        )}
      </div>
      <div className="flex w-full max-w-sm flex-none flex-col gap-2.5 [html[data-landscape]_&]:max-w-[300px]">
        <div className="flex items-start gap-2.5">
          <Mascot element={info.mascot} mood="speaking" size={40} interactive={false} />
          <div className="tip-bubble min-w-0 flex-1 rounded-[18px] px-3 py-2 fs-13 leading-snug">
            Solo lleva tu nombre, tus minutos, tu racha, tu reto y tu último logro. Nada de tu nivel ni de tus errores.
          </div>
        </div>
        <button onClick={share} disabled={!url || busy} className="btn-acc flex h-[52px] items-center justify-center gap-2 rounded-full fs-16 disabled:opacity-60">
          <Icon name="upload" size={18} />
          {busy ? 'Abriendo…' : 'Compartir'}
        </button>
        <button onClick={onClose} className="glass h-12 rounded-full fs-15 font-semibold">
          Cerrar
        </button>
      </div>
    </div>,
    document.body,
  )
}
