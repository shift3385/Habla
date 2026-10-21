import { Capacitor, registerPlugin } from '@capacitor/core'

// Orientación forzada (Ajustes → Apariencia). Plugin nativo propio: android/.../OrientationPlugin.java.

export type OrientationMode = 'auto' | 'portrait' | 'landscape' | 'reverseLandscape'

export const ORIENTATIONS: { key: OrientationMode; title: string; desc: string }[] = [
  { key: 'auto', title: 'Automática', desc: 'Gira con el teléfono' },
  { key: 'portrait', title: 'Vertical', desc: 'Siempre de pie' },
  { key: 'landscape', title: 'Horizontal', desc: 'Siempre acostada, aunque el teléfono no gire' },
  { key: 'reverseLandscape', title: 'Horizontal al revés', desc: 'Acostada hacia el otro lado' },
]

const Native = registerPlugin<{ set(o: { mode: OrientationMode }): Promise<void>; getFontScale(): Promise<{ scale: number }> }>('Orientation')

export async function applyOrientation(mode: OrientationMode): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return
  await Native.set({ mode }).catch(() => {})
}

/** 5.10.1 (REG-M-05): la letra del sistema Android (1 = normal). En el navegador, o si falla, 1. */
export async function getSystemFontScale(): Promise<number> {
  if (Capacitor.getPlatform() !== 'android') return 1
  try {
    const { scale } = await Native.getFontScale()
    return typeof scale === 'number' && Number.isFinite(scale) && scale > 0 ? scale : 1
  } catch {
    return 1
  }
}
