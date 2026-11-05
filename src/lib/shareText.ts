// 5.13 (Fase 3): abre «Compartir» del teléfono con un mensaje de texto (los códigos de Habla van dentro). En el
// navegador (pruebas): Web Share si lo hay; si no, se copia al portapapeles.
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

export type ShareOutcome = 'shared' | 'copied' | 'failed'

export async function shareMessage(text: string, title: string): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ title, text, dialogTitle: title })
    } catch {
      // El usuario cerró el diálogo: no es un error.
    }
    return 'shared'
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch {
      // Cancelado o no permitido: se intenta copiar.
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
