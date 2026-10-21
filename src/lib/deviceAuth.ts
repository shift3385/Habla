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
/**
 * 5.10.1 (REG-A2-03, SEG-502): la gracia vale solo para la MISMA credencial. Antes había un único momento común: ver la
 * clave de Gemini abría durante 60 s ver y cambiar la de Azure y el secreto de Monitor.
 */
export type AuthScope = 'gemini' | 'azure' | 'monitor'
const confirmedAt = new Map<AuthScope, number>()

/** ¿Sigue abierta la gracia de esa credencial? */
export function inGrace(scope: AuthScope, now = Date.now()): boolean {
  return now - (confirmedAt.get(scope) ?? -Infinity) < GRACE_MS
}

/**
 * Apunta una confirmación. Sin bloqueo de pantalla (`insecure`) se deja pasar cada vez, pero no abre la gracia: no hubo
 * ninguna confirmación de verdad.
 */
export function rememberConfirmed(scope: AuthScope, r: { ok: boolean; insecure?: boolean }, now = Date.now()) {
  if (r.ok && !r.insecure) confirmedAt.set(scope, now)
}

export interface AuthResult {
  ok: boolean
  /** El teléfono no tiene bloqueo de pantalla: se deja pasar, pero conviene ponerlo. */
  insecure?: boolean
}

/** Pide el patrón/PIN/huella del teléfono. En el navegador (vista previa) no hay bloqueo: deja pasar. */
export async function confirmIdentity(subtitle: string, scope: AuthScope = 'gemini'): Promise<AuthResult> {
  if (inGrace(scope)) return { ok: true }
  if (Capacitor.getPlatform() !== 'android') return { ok: true, insecure: true }
  try {
    const r = await Native.confirm({ title: 'Confirma que eres tú', subtitle })
    rememberConfirmed(scope, r)
    return { ok: r.ok, insecure: r.insecure }
  } catch {
    return { ok: false }
  }
}

export const INSECURE_HINT = 'Tu teléfono no tiene bloqueo de pantalla: cualquiera podría ver tu clave. Pon un patrón o PIN en los ajustes de Android.'
