import { useEffect, useState } from 'react'
import { loadSounds, type SoundCatalog } from '../lib/sounds'

// 5.11 (S-07…S-10): en su propio archivo para que SoundRoutes.tsx solo exporte componentes (Fast Refresh).

/** Datos de Sonidos (carga perezosa y compartida: la primera pantalla los pide, las demás los reciben al instante). */
let cached: SoundCatalog | null = null
export function useSoundData(initial?: SoundCatalog): SoundCatalog | null {
  // Ya cargados: se pintan al instante (sin un «Cargando…» de un fotograma en cada pantalla de la pila). `initial`: tests.
  const [d, setD] = useState<SoundCatalog | null>(initial ?? cached)
  useEffect(() => {
    let live = true
    loadSounds()
      .then((x) => {
        cached = x
        if (live) setD(x)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])
  return d
}
