import { useState } from 'react'
import { confirmIdentity } from '../lib/deviceAuth'
import { clearExhausted, mergeModels } from '../lib/gemini'
import { verifyGeminiKey } from '../lib/geminiKey'
import type { Settings } from '../lib/settings'

/**
 * Arreglos rápidos cuando Gemini falla: elegir otro modelo o pegar otra clave (p. ej. una de pago).
 * Se usa en el aviso global de la mascota y en la pantalla de error de la evaluación del test.
 */
export default function GeminiFix({ settings, update }: { settings: Settings; update: (p: Partial<Settings>) => void }) {
  const [key, setKey] = useState('')
  const [keySaved, setKeySaved] = useState(false)
  const [denied, setDenied] = useState(false)
  // AUD-FLU-209: la clave se comprueba con Google antes de sustituir a la anterior.
  const [checking, setChecking] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const models = mergeModels(settings.modelList).filter((m) => !/pro/.test(m) || m === settings.geminiModel)
  return (
    <div className="flex flex-col gap-3">
      <div className="glass rounded-[20px] p-4">
        <div className="text-[15px] font-semibold">Probar con otro modelo</div>
        <div className="txt-sub mt-0.5 text-[12.5px] leading-snug">Si uno está saturado, va lento o se quedó sin cuota, otro suele responder.</div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {models.map((m) => (
            <button
              key={m}
              onClick={() => update({ geminiModel: m })}
              className={`rounded-full px-3 py-1.5 text-[13px] ${m === settings.geminiModel ? 'btn-acc' : 'glass'}`}
            >
              {m.replace('gemini-', '')}
            </button>
          ))}
        </div>
      </div>
      <div className="glass rounded-[20px] p-4">
        <div className="text-[15px] font-semibold">Usar otra clave de Gemini</div>
        <div className="txt-sub mt-0.5 text-[12.5px] leading-snug">Por ejemplo, una de pago, que no se satura. Se guarda solo en este teléfono; para cambiarla te pediremos el patrón, PIN o huella.</div>
        <input
          type="password"
          value={key}
          onChange={(e) => {
            setKey(e.target.value)
            setKeySaved(false)
          }}
          placeholder="Pega aquí la clave nueva"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="glass mt-2.5 h-[46px] w-full rounded-[16px] px-4 text-[15px] outline-none"
          style={{ color: 'var(--tx)' }}
        />
        <button
          onClick={async () => {
            // Cambiar una clave que ya existe exige confirmar con el bloqueo del teléfono (D-02).
            if (settings.geminiKey && key.trim() !== settings.geminiKey) {
              const r = await confirmIdentity('Para cambiar tu clave de Gemini')
              if (!r.ok) return setDenied(true)
            }
            setDenied(false)
            setKeyError(null)
            setChecking(true)
            const r = await verifyGeminiKey(key, settings).finally(() => setChecking(false))
            if (!r.ok) return setKeyError(`${r.error} No se cambió: sigues con tu clave anterior.`)
            update(r.patch)
            clearExhausted() // las cuotas agotadas eran de la clave anterior
            setKey('')
            setKeySaved(true)
          }}
          disabled={key.trim().length < 20 || checking}
          className="glass mt-2 h-10 w-full rounded-full text-[14px] disabled:opacity-45"
        >
          {checking ? 'Comprobando con Google…' : keySaved ? 'Clave cambiada ✓' : 'Usar esta clave'}
        </button>
        {denied && <div className="txt-sub mt-1.5 text-center text-[12.5px]">No se confirmó tu identidad: la clave no se cambió.</div>}
        {keyError && <div className="mt-1.5 text-center text-[12.5px]" style={{ color: '#f87171' }}>{keyError}</div>}
      </div>
    </div>
  )
}
