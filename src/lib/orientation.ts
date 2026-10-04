import { Capacitor, registerPlugin } from '@capacitor/core'

// Orientación forzada (Ajustes → Tema y mascota). Plugin nativo propio: android/.../OrientationPlugin.java.

export type OrientationMode = 'auto' | 'portrait' | 'landscape' | 'reverseLandscape'

export const ORIENTATIONS: { key: OrientationMode; title: string; desc: string }[] = [
  { key: 'auto', title: 'Automática', desc: 'Gira con el teléfono' },
  { key: 'portrait', title: 'Vertical', desc: 'Siempre de pie' },
  { key: 'landscape', title: 'Horizontal', desc: 'Siempre acostada, aunque el teléfono no gire' },
  { key: 'reverseLandscape', title: 'Horizontal al revés', desc: 'Acostada hacia el otro lado' },
]

const Native = registerPlugin<{ set(o: { mode: OrientationMode }): Promise<void> }>('Orientation')

export async function applyOrientation(mode: OrientationMode): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return
  await Native.set({ mode }).catch(() => {})
}
