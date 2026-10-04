import { Capacitor, registerPlugin } from '@capacitor/core'

// Confirmación con el bloqueo del teléfono (patrón, PIN, contraseña o huella) antes de ver o cambiar la clave de
// Gemini (D-02). Plugin nativo propio: android/.../DeviceAuthPlugin.java.

interface DeviceAuthPlugin {
  isSecure(): Promise<{ secure: boolean }>
  confirm(o: { title: string; subtitle: string }): Promise<{ ok: boolean; insecure?: boolean; error?: string }>
}

const Native = registerPlugin<DeviceAuthPlugin>('DeviceAuth')

// Tras confirmar, no se vuelve a pedir durante un momento (p. ej. ver la clave y luego guardarla).
const GRACE_MS = 60_000
let confirmedAt = 0

export interface AuthResult {
  ok: boolean
  /** El teléfono no tiene bloqueo de pantalla: se deja pasar, pero conviene ponerlo. */
  insecure?: boolean
}

/** Pide el patrón/PIN/huella del teléfono. En el navegador (vista previa) no hay bloqueo: deja pasar. */
export async function confirmIdentity(subtitle: string): Promise<AuthResult> {
  if (Date.now() - confirmedAt < GRACE_MS) return { ok: true }
  if (Capacitor.getPlatform() !== 'android') return { ok: true, insecure: true }
  try {
    const r = await Native.confirm({ title: 'Confirma que eres tú', subtitle })
    if (r.ok) confirmedAt = Date.now()
    return { ok: r.ok, insecure: r.insecure }
  } catch {
    return { ok: false }
  }
}

export const INSECURE_HINT = 'Tu teléfono no tiene bloqueo de pantalla: cualquiera podría ver tu clave. Pon un patrón o PIN en los ajustes de Android.'
