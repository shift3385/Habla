import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Settings } from '../lib/settings'
import { applyCode, previewCode, type CodePreview } from '../lib/shareApply'
import { parseCode, type ShareCode } from '../lib/shareCode'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO } from '../ui/theme'

/**
 * 5.13 (Fase 3): «Pegar un código» (Progreso). Un solo sitio para pegar lo que te mandan por WhatsApp: la mascota explica
 * cada tipo; al revisar, dice qué va a pasar y solo con «Aceptar» se guarda. Un código dañado, de otra versión o que no
 * encaja se explica en español y no se toca nada. Todo se pinta como texto (React), nunca como HTML.
 */
export default function PasteCodeSheet({ settings, onClose, onApplied }: { settings: Settings; onClose: () => void; onApplied: () => void }) {
  const info = THEME_INFO[settings.theme] ?? THEME_INFO.marea
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [found, setFound] = useState<{ code: ShareCode; preview: CodePreview } | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const review = async (value = text) => {
    setError(null)
    const r = parseCode(value)
    if (!r.ok) return setError(r.error)
    setBusy(true)
    try {
      setFound({ code: r.code, preview: await previewCode(r.code) })
    } catch {
      setError('No he podido leer tus datos. Inténtalo otra vez; no se cambió nada.')
    } finally {
      setBusy(false)
    }
  }

  const paste = async () => {
    try {
      const v = await navigator.clipboard.readText()
      if (v) {
        setText(v)
        await review(v)
      }
    } catch {
      setError('No puedo leer el portapapeles. Mantén pulsado el recuadro y elige «Pegar».')
    }
  }

  const accept = async () => {
    if (!found || busy) return
    setBusy(true)
    try {
      setDone(await applyCode(found.code))
      onApplied()
    } catch {
      setError('No se pudo guardar. Inténtalo otra vez; no se cambió nada.')
      setFound(null)
    } finally {
      setBusy(false)
    }
  }

  const say = done ?? found?.preview.text
  return createPortal(
    <div
      className="fixed inset-0 z-[45] flex flex-col items-center overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-[calc(env(safe-area-inset-bottom)+16px)]"
      style={{ background: 'var(--bg)', color: 'var(--tx)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Pegar un código"
      data-paste-code
    >
      <div className="flex w-full max-w-md flex-col gap-3 [html[data-landscape]_&]:max-w-2xl">
        <div className="flex h-[54px] items-center gap-3">
          <button onClick={onClose} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
            <Icon name="back" size={20} stroke={1.8} />
          </button>
          <div className="truncate text-xl font-semibold tracking-[-.4px]">Pegar un código</div>
        </div>

        <div className="flex items-start gap-2.5">
          <Mascot element={info.mascot} mood={done ? 'happy' : 'speaking'} size={44} interactive={false} />
          <div className="tip-bubble min-w-0 flex-1 rounded-[18px] px-3.5 py-2.5 fs-13.5 leading-snug" data-paste-say>
            {found || done ? (
              <>
                {!done && <span className="block font-semibold">{found!.preview.title}</span>}
                {say}
              </>
            ) : (
              <>
                Si alguien te manda un código de Habla por WhatsApp, copia el mensaje entero y pégalo aquí. Puede ser:
                <span className="mt-1.5 block">
                  🎯 <b>un reto</b>: lo haces tú esta semana y se mide en tu teléfono;
                </span>
                <span className="block">
                  📊 <b>su progreso</b> en vuestro reto, para compararos;
                </span>
                <span className="block">
                  📖 <b>una palabra</b>: va a tus Palabras y a tu Repaso;
                </span>
                <span className="block">
                  👨‍👩‍👧 <b>su semana</b>: sale en Mi familia.
                </span>
                <span className="mt-1.5 block">Pegar un código no gasta tu clave.</span>
              </>
            )}
          </div>
        </div>

        {!found && !done && (
          <>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setError(null)
              }}
              placeholder="Pega aquí el mensaje con el código (HABLA:1:…)"
              rows={4}
              className="field w-full resize-none rounded-[18px] px-4 py-3 fs-14 leading-snug outline-none"
              aria-label="Código"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            {error && (
              <div className="rounded-[16px] px-3.5 py-2.5 fs-13.5 leading-snug" style={{ background: 'color-mix(in srgb, #e5484d 16%, transparent)' }} role="alert">
                {error}
              </div>
            )}
            <div className="flex gap-2.5">
              <button onClick={paste} className="glass h-12 flex-1 rounded-full fs-15 font-semibold">
                Pegar
              </button>
              <button onClick={() => review()} disabled={!text.trim() || busy} className="btn-acc h-12 flex-[1.4] rounded-full fs-15 disabled:opacity-60">
                Revisar el código
              </button>
            </div>
          </>
        )}

        {found && !done && (
          <div className="flex gap-2.5">
            <button
              onClick={() => {
                setFound(null)
                if (!found.preview.ok) setText('')
              }}
              className="glass h-12 flex-1 rounded-full fs-15 font-semibold"
            >
              {found.preview.ok ? 'Ahora no' : 'Pegar otro'}
            </button>
            {found.preview.ok && (
              <button onClick={accept} disabled={busy} className="btn-acc h-12 flex-[1.4] rounded-full fs-15 disabled:opacity-60">
                {found.preview.cta}
              </button>
            )}
          </div>
        )}

        {done && (
          <button onClick={onClose} className="btn-acc h-12 rounded-full fs-15" autoFocus>
            Hecho
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
