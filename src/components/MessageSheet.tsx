import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { dictate } from '../lib/dictation'
import { friendlyError } from '../lib/errors'
import { isAborted } from '../lib/gemini'
import { whenBackground } from '../lib/lifecycle'
import { MESSAGE_MAX, messageToSend, reviewMessage, type MessageReview } from '../lib/messageReview'
import { distrustMic, MicError, Recorder } from '../lib/recorder'
import { fastModels, type Settings } from '../lib/settings'
import { shareMessage } from '../lib/shareText'
import { analyzeSpeech, blobToBase64, isEmptyRecording } from '../lib/speech'
import { Icon } from '../ui/icons'
import Mascot from '../ui/Mascot'
import { THEME_INFO } from '../ui/theme'

/**
 * 5.13 (Fase 5): «Escribir en inglés». Escribes o dictas un mensaje, el profe lo corrige (modelo rápido) y lo mandas por
 * WhatsApp: la versión corregida o la más natural y, si quieres, con lo que escribiste tú. Nada se guarda.
 */
export default function MessageSheet({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const info = THEME_INFO[settings.theme] ?? THEME_INFO.marea
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<MessageReview | null>(null)
  const [pick, setPick] = useState<'corrected' | 'natural'>('corrected')
  const [withMine, setWithMine] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [mic, setMic] = useState<'idle' | 'recording' | 'writing'>('idle')
  const recorder = useRef<Recorder | null>(null)
  const run = useRef(0)
  const hasKey = settings.geminiKey.trim().length > 0

  // Al cerrar o al pasar a segundo plano, el micro se suelta (batería, y nada se graba sin que lo veas).
  useEffect(() => {
    const stop = () => {
      run.current++
      recorder.current?.close()
      recorder.current = null
      setMic('idle')
    }
    const off = whenBackground(stop)
    return () => {
      off()
      stop()
    }
  }, [])

  const toggleMic = async () => {
    if (mic === 'writing') return
    setError(null)
    const mine = run.current
    const alive = () => run.current === mine
    if (mic === 'idle') {
      try {
        recorder.current ??= new Recorder()
        if (!(await recorder.current.begin()) || !alive()) return
        setMic('recording')
      } catch (e) {
        if (alive()) setError(e instanceof MicError ? e.message : 'No se pudo abrir el micrófono.')
      }
      return
    }
    setMic('writing')
    try {
      const rec = recorder.current!
      const { blob, seconds } = await rec.stop()
      rec.close()
      recorder.current = null
      if (!alive()) return
      const analysis = await analyzeSpeech(blob)
      if (!alive()) return
      const empty = isEmptyRecording(blob, analysis)
      if (empty) distrustMic()
      if (seconds < 0.7 || empty || (analysis && !analysis.hasSpeech)) return setError('No te he oído. Toca el micrófono y dilo otra vez.')
      const base64 = await blobToBase64(blob)
      if (!alive()) return
      const said = await dictate(settings.geminiKey, fastModels(settings), { base64, mimeType: blob.type.split(';')[0] || 'audio/webm' })
      if (!alive()) return
      if (said) setText((t) => `${t ? `${t.trimEnd()} ` : ''}${said}`.slice(0, MESSAGE_MAX))
      else setError('No te he entendido. Prueba otra vez, un poco más cerca.')
    } catch (e) {
      if (alive() && !isAborted(e)) setError(friendlyError(e))
    } finally {
      if (alive()) setMic('idle')
    }
  }

  const check = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await reviewMessage(settings.geminiKey, fastModels(settings), text)
      setReview(r)
      setPick('corrected')
      setWithMine(false)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const chosen = review ? (pick === 'natural' && review.natural ? review.natural : review.corrected) : ''
  const send = async () => {
    setNote(null)
    const r = await shareMessage(messageToSend(chosen, text, withMine), 'Mandar mi mensaje')
    if (r === 'copied') setNote('Mensaje copiado: pégalo en WhatsApp.')
    else if (r === 'failed') setNote('No he podido abrir Compartir.')
  }

  const option = (key: 'corrected' | 'natural', title: string, body: string) => (
    <button
      onClick={() => setPick(key)}
      className={`flex flex-col gap-1 rounded-[20px] px-4 py-3 text-left ${pick === key ? 'glass' : 'field'}`}
      style={pick === key ? { outline: '2px solid var(--acc)' } : undefined}
      aria-pressed={pick === key}
      data-pick={key}
    >
      <span className="txt-sub fs-12.5 font-semibold">{title}</span>
      <span className="fs-15 leading-snug whitespace-pre-wrap">{body}</span>
    </button>
  )

  return createPortal(
    <div
      className="fixed inset-0 z-[45] flex flex-col items-center overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-[calc(env(safe-area-inset-bottom)+16px)]"
      style={{ background: 'var(--bg)', color: 'var(--tx)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Escribir en inglés"
      data-message-sheet
    >
      <div className="flex w-full max-w-md flex-col gap-3 [html[data-landscape]_&]:max-w-2xl">
        <div className="flex h-[54px] items-center gap-3">
          <button onClick={onClose} className="glass grid h-11 w-11 flex-none place-items-center rounded-full" aria-label="Atrás">
            <Icon name="back" size={20} stroke={1.8} />
          </button>
          <div className="truncate text-xl font-semibold tracking-[-.4px]">Escribir en inglés</div>
        </div>

        <div className="flex items-start gap-2.5">
          <Mascot element={info.mascot} mood={review ? 'happy' : 'speaking'} size={44} interactive={false} />
          <div className="tip-bubble min-w-0 flex-1 rounded-[18px] px-3.5 py-2.5 fs-13.5 leading-snug" data-message-say>
            {!review
              ? 'Escribe o dicta un mensaje para alguien (no hace falta que tenga Habla). Te lo corrijo antes de mandarlo. Si lo escribes en español, te lo paso al inglés.'
              : review.wasSpanish
                ? 'Lo escribiste en español: aquí lo tienes en inglés. Léelo en voz alta antes de mandarlo.'
                : review.same
                  ? '¡Está perfecto! No he tenido que cambiar nada.'
                  : 'Te lo he corregido. Elige la versión que quieras mandar.'}
          </div>
        </div>

        {!review && (
          <>
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value.slice(0, MESSAGE_MAX))
                  setError(null)
                }}
                placeholder="Hi Ana! Yesterday I go to the beach with my sister…"
                rows={5}
                className="field w-full resize-none rounded-[18px] px-4 py-3 pr-14 fs-15 leading-snug outline-none"
                aria-label="Tu mensaje"
              />
              <button
                onClick={toggleMic}
                disabled={!hasKey || mic === 'writing'}
                className={`absolute right-2.5 bottom-3 grid h-10 w-10 place-items-center rounded-full ${mic === 'recording' ? 'btn-acc' : 'glass'} disabled:opacity-50`}
                aria-label={mic === 'recording' ? 'Terminar el dictado' : 'Dictar'}
              >
                <Icon name={mic === 'recording' ? 'send' : 'mic'} size={18} />
              </button>
            </div>
            <div className="txt-sub -mt-1.5 px-1 text-right fs-12">
              {mic === 'recording' ? 'Te escucho… toca otra vez para terminar' : mic === 'writing' ? 'Escribiendo lo que dijiste…' : `${text.length}/${MESSAGE_MAX}`}
            </div>
            {error && (
              <div className="rounded-[16px] px-3.5 py-2.5 fs-13.5 leading-snug" style={{ background: 'color-mix(in srgb, #e5484d 16%, transparent)' }} role="alert">
                {error}
              </div>
            )}
            {!hasKey && <div className="txt-sub fs-13">Para corregir mensajes hace falta tu clave de Gemini (Ajustes → Modelos).</div>}
            <button onClick={check} disabled={!text.trim() || busy || !hasKey || mic !== 'idle'} className="btn-acc h-12 rounded-full fs-15 disabled:opacity-60">
              {busy ? 'Corrigiendo…' : 'Corregir mi mensaje'}
            </button>
          </>
        )}

        {review && (
          <>
            {option('corrected', review.wasSpanish ? 'En inglés' : review.same ? 'Tu mensaje' : 'Corregido (con tus palabras)', review.corrected)}
            {review.natural && option('natural', 'Más natural', review.natural)}
            {review.notes.length > 0 && (
              <ul className="glass flex flex-col gap-1.5 rounded-[20px] px-4 py-3 fs-13.5 leading-snug" data-message-notes>
                {review.notes.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            )}
            {!review.same && (
              <button onClick={() => setWithMine((v) => !v)} className="flex items-center gap-2.5 px-1 text-left fs-14" aria-pressed={withMine}>
                <span className={`grid h-6 w-6 flex-none place-items-center rounded-md ${withMine ? 'btn-acc' : 'field'}`}>{withMine && <Icon name="check" size={14} />}</span>
                Añadir también lo que escribí yo
              </button>
            )}
            <button onClick={send} className="btn-acc flex h-12 items-center justify-center gap-2 rounded-full fs-15" data-send-message>
              <Icon name="upload" size={17} />
              Mandar
            </button>
            {note && <div className="txt-sub text-center fs-13">{note}</div>}
            <button onClick={() => setReview(null)} className="txt-acc2 h-10 fs-14 font-semibold">
              Cambiar el mensaje
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
