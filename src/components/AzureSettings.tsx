import { useEffect, useState } from 'react'
import { fmtHours, F0_SECONDS, hasMonitor, monthUsage, type Usage } from '../lib/azureUsage'
import { confirmIdentity } from '../lib/deviceAuth'
import { costEstimate, hasAzure, monitorCreds, monthKey, PLANS } from '../lib/phonetics'
import { AzureError, checkAzureKey } from '../lib/pronunciation'
import type { Settings } from '../lib/settings'
import { Icon } from '../ui/icons'

type Status = { kind: 'ok' | 'error' | 'info'; text: string } | null

function Line({ s }: { s: Status }) {
  if (!s) return null
  const color = s.kind === 'error' ? '#f87171' : s.kind === 'ok' ? 'var(--acc)' : 'var(--sub)'
  return <div className="mt-2 text-[13px] leading-snug" style={{ color }}>{s.text}</div>
}

/** Campo secreto: vacío, con "termina en …XXXX"; el ojo muestra lo guardado tras confirmar con el bloqueo. */
function Secret({ label, saved, value, onChange, what }: { label: string; saved: string; value: string; onChange: (v: string) => void; what: string }) {
  const [show, setShow] = useState(false)
  const toggle = async () => {
    if (show) {
      setShow(false)
      if (value === saved) onChange('')
      return
    }
    if (!value && saved) {
      const r = await confirmIdentity(`Para ver ${what}`)
      if (!r.ok) return
      onChange(saved)
    }
    setShow(true)
  }
  return (
    <label className="mt-2.5 block">
      <span className="txt-sub text-xs tracking-[.6px]">{label}</span>
      <span className="relative mt-1 block">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={saved ? `Guardada · termina en …${saved.slice(-4)}` : 'Pégala aquí'}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="input pr-[52px]"
        />
        <button type="button" onClick={toggle} className="txt-sub absolute top-1.5 right-1.5 grid h-[38px] w-[38px] place-items-center rounded-full" aria-label={`Mostrar u ocultar ${what}`}>
          <Icon name="eye" size={18} />
        </button>
      </span>
    </label>
  )
}

function Plain({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="mt-2.5 block">
      <span className="txt-sub text-xs tracking-[.6px]">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" autoCapitalize="none" spellCheck={false} className="input mt-1" />
    </label>
  )
}

/**
 * Ajustes → Modelos → "Azure Speech (fonética)": corrector fonético opcional. Clave y región; interruptor; plan del
 * recurso (solo lo refleja: se cambia en el portal de Azure); consumo del mes con Azure Monitor (service principal).
 */
export default function AzureSettings({ settings, update }: { settings: Settings; update: (p: Partial<Settings>) => void }) {
  const [key, setKey] = useState('')
  const [region, setRegion] = useState(settings.azureRegion)
  const [status, setStatus] = useState<Status>(null)
  const [checking, setChecking] = useState(false)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [usageStatus, setUsageStatus] = useState<Status>(null)
  const [monOpen, setMonOpen] = useState(false)
  const [mon, setMon] = useState({ tenantId: settings.azureTenantId, clientId: settings.azureClientId, clientSecret: '', resourceId: settings.azureResourceId })
  const [monStatus, setMonStatus] = useState<Status>(null)

  const configured = hasAzure(settings)
  const exhausted = settings.azurePlan === 'F0' && settings.f0ExhaustedMonth === monthKey()
  const monitorReady = hasMonitor(monitorCreds(settings))

  const loadUsage = async (force = false) => {
    if (!hasMonitor(monitorCreds(settings))) return
    setUsageStatus({ kind: 'info', text: 'Consultando el consumo en Azure Monitor…' })
    try {
      setUsage(await monthUsage(monitorCreds(settings), force))
      setUsageStatus(null)
    } catch (e) {
      setUsageStatus({ kind: 'error', text: (e as Error).message })
    }
  }
  useEffect(() => {
    loadUsage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.azureResourceId, settings.azureClientId, settings.azureTenantId, settings.azureClientSecret])

  const saveKey = async () => {
    const k = key.trim() || settings.azureKey
    const r = region.trim().toLowerCase().replace(/\s+/g, '')
    if (!k || !r) return setStatus({ kind: 'error', text: 'Escribe la clave (Clave 1) y la región de tu recurso de Speech.' })
    if (settings.azureKey && k !== settings.azureKey) {
      const ok = await confirmIdentity('Para cambiar tu clave de Azure Speech')
      if (!ok.ok) return setStatus({ kind: 'error', text: 'No se confirmó tu identidad: la clave no se cambió.' })
    }
    setChecking(true)
    setStatus({ kind: 'info', text: 'Comprobando con Azure…' })
    try {
      await checkAzureKey(k, r)
      // Con clave válida la fonética se enciende ya (salvo que la apagaras tú o el F0 esté agotado este mes).
      const f0Out = settings.azurePlan === 'F0' && settings.f0ExhaustedMonth === monthKey()
      update({ azureKey: k, azureRegion: r, ...(!settings.phoneticsUserOff && !f0Out ? { phoneticsOn: true } : {}) })
      setKey('')
      setStatus({ kind: 'ok', text: 'Clave y región válidas ✓' })
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof AzureError ? e.message : 'No se pudo comprobar la clave.' })
    } finally {
      setChecking(false)
    }
  }

  const saveMonitor = async () => {
    const secret = mon.clientSecret.trim() || settings.azureClientSecret
    if (settings.azureClientSecret && secret !== settings.azureClientSecret) {
      const ok = await confirmIdentity('Para cambiar el secreto de Azure')
      if (!ok.ok) return setMonStatus({ kind: 'error', text: 'No se confirmó tu identidad: no se cambió.' })
    }
    update({ azureTenantId: mon.tenantId.trim(), azureClientId: mon.clientId.trim(), azureClientSecret: secret, azureResourceId: mon.resourceId.trim() })
    setMon((m) => ({ ...m, clientSecret: '' }))
    setMonStatus({ kind: 'ok', text: 'Guardado. Consultando el consumo…' })
  }

  const toggle = () => {
    if (settings.phoneticsOn) return update({ phoneticsOn: false, phoneticsUserOff: true })
    update({ phoneticsOn: true, phoneticsUserOff: false })
  }

  const plan = PLANS.find((p) => p.key === settings.azurePlan)!
  const switchDisabled = !configured || exhausted

  return (
    <div className="glass rounded-[24px] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[16px] font-semibold">
          <Icon name="ear" size={18} /> Azure Speech (fonética)
        </div>
        <span className="rounded-full px-2.5 py-0.5 text-[11.5px]" style={{ border: '1px solid var(--gb)' }}>
          {!configured ? 'Sin configurar' : exhausted ? 'F0 agotado' : settings.phoneticsOn ? 'Activo' : 'Apagado'}
        </span>
      </div>
      <div className="txt-sub mt-1 text-[12.5px] leading-snug">
        Opcional. Evalúa tu pronunciación (sonido a sonido) mientras Gemini corrige el contenido; el coach te lo cuenta todo junto. Con fonética, cada respuesta dura como máximo 60 s.
      </div>

      {/* Interruptor */}
      <button
        onClick={toggle}
        disabled={switchDisabled}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-[18px] px-3.5 py-3 text-left disabled:opacity-50"
        style={{ background: 'var(--field)' }}
        aria-pressed={settings.phoneticsOn}
      >
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">Usar corrector fonético</span>
          <span className="txt-sub block text-[12px] leading-snug">
            {!configured
              ? 'Añade la clave y la región de Azure para poder activarlo.'
              : exhausted
                ? 'Se acabaron las 5 h gratis de este mes: vuelve el día 1 (o cambia tu recurso a S0 en Azure y marca el plan).'
                : `Plan ${plan.title}: ${costEstimate(settings.azurePlan)}.`}
          </span>
        </span>
        <span className="relative h-7 w-12 flex-none rounded-full transition-colors" style={{ background: settings.phoneticsOn && !switchDisabled ? 'var(--acc)' : 'var(--gb)' }}>
          <span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: settings.phoneticsOn && !switchDisabled ? 24 : 4 }} />
        </span>
      </button>

      {/* Clave y región */}
      <Secret label="CLAVE DE SPEECH (CLAVE 1)" saved={settings.azureKey} value={key} onChange={setKey} what="tu clave de Azure Speech" />
      <Plain label="REGIÓN" value={region} onChange={setRegion} placeholder="eastus" />
      <button onClick={saveKey} disabled={checking} className="btn-acc mt-2.5 h-[48px] w-full rounded-[24px] text-[15px]">
        {checking ? 'Comprobando…' : 'Guardar y comprobar'}
      </button>
      <Line s={status} />

      {/* Plan del recurso */}
      <div className="txt-sub mt-4 text-sm">Plan de tu recurso en Azure</div>
      <div className="mt-2 flex flex-col gap-1.5">
        {PLANS.map((p) => {
          const sel = settings.azurePlan === p.key
          return (
            <button
              key={p.key}
              onClick={() => update({ azurePlan: p.key })}
              className={`flex items-center gap-3 rounded-[16px] px-3.5 py-2.5 text-left ${sel ? 'btn-acc' : 'field'}`}
              aria-pressed={sel}
            >
              <span className="grid h-5 w-5 flex-none place-items-center rounded-full" style={{ border: '2px solid currentColor' }}>
                {sel && <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'currentColor' }} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">{p.title}</span>
                <span className={`block text-[12px] ${sel ? 'opacity-85' : 'txt-sub'}`}>
                  {p.price}
                  {p.perHour ? ` · ${costEstimate(p.key)}` : ''}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="txt-sub mt-1.5 text-[11.5px] leading-snug">
        Marca el plan que tiene tu recurso. La app no lo cambia: pasar a S0 se hace en el portal de Azure. Al agotarse el F0, Azure no cobra ni cambia de plan; deja de procesar hasta el mes siguiente.
      </div>

      {/* Consumo del mes */}
      <div className="mt-4 rounded-[18px] px-3.5 py-3" style={{ background: 'var(--field)' }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-semibold">Consumo de este mes</span>
          {monitorReady && (
            <button onClick={() => loadUsage(true)} className="txt-acc2 text-[12.5px]">
              Actualizar
            </button>
          )}
        </div>
        {usage ? (
          <>
            <div className="mt-1 text-[14px]">
              ≈ <b>{fmtHours(usage.usedSeconds)}</b> de 5 h usadas
              {settings.azurePlan === 'F0' && <> · quedan <b>{fmtHours(usage.remainingSeconds)}</b></>}
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded" style={{ background: 'var(--gb)' }}>
              <div className="h-full rounded" style={{ width: `${Math.min(100, (usage.usedSeconds / F0_SECONDS) * 100)}%`, background: usage.remainingSeconds ? 'var(--acc)' : '#f59e0b' }} />
            </div>
            <div className="txt-sub mt-1 text-[11.5px]">
              Dato aproximado de Azure Monitor (puede ir unos minutos por detrás) · {new Date(usage.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        ) : (
          <div className="txt-sub mt-1 text-[12.5px] leading-snug">
            {monitorReady ? 'Sin dato todavía.' : 'Para ver las horas usadas (de todas las apps o personas que usan esta clave), añade el acceso a Azure Monitor aquí abajo.'}
          </div>
        )}
        <Line s={usageStatus} />
      </div>

      {/* Acceso a Azure Monitor (service principal) */}
      <button onClick={() => setMonOpen((o) => !o)} className="mt-3 flex w-full items-center justify-between text-left text-[14px] font-semibold">
        Acceso a Azure Monitor (opcional)
        <span className="transition-transform" style={{ transform: monOpen ? 'rotate(180deg)' : 'none' }}>
          <Icon name="chevD" size={15} stroke={2} />
        </span>
      </button>
      {monOpen && (
        <div className="anim-up">
          <div className="txt-sub mt-1 text-[12px] leading-snug">
            La clave de Speech no sirve para leer el consumo. Crea un registro de aplicación (service principal) en Microsoft Entra ID y dale el rol <b>Monitoring Reader</b> sobre el recurso de Speech.
          </div>
          <Plain label="TENANT ID" value={mon.tenantId} onChange={(v) => setMon((m) => ({ ...m, tenantId: v }))} placeholder="00000000-0000-…" />
          <Plain label="CLIENT ID" value={mon.clientId} onChange={(v) => setMon((m) => ({ ...m, clientId: v }))} placeholder="00000000-0000-…" />
          <Secret label="CLIENT SECRET" saved={settings.azureClientSecret} value={mon.clientSecret} onChange={(v) => setMon((m) => ({ ...m, clientSecret: v }))} what="el secreto de Azure" />
          <Plain label="RESOURCE ID DEL RECURSO DE SPEECH" value={mon.resourceId} onChange={(v) => setMon((m) => ({ ...m, resourceId: v }))} placeholder="/subscriptions/…/providers/Microsoft.CognitiveServices/accounts/…" />
          <button onClick={saveMonitor} className="glass mt-2.5 h-[44px] w-full rounded-[22px] text-[14px]">
            Guardar acceso
          </button>
          <Line s={monStatus} />
          <div className="txt-sub mt-2 text-[11.5px] leading-snug">
            ¿Compartes la clave con otras personas? Mejor un pequeño servidor intermedio que guarde la clave y el service principal: las demás apps lo llaman y nadie ve la clave real.
          </div>
        </div>
      )}
    </div>
  )
}
