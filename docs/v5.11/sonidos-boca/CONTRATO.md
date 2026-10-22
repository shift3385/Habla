# Boca en Sonidos · contrato entre el ilustrador y el desarrollador (2026-10-22)

Decisión del dueño: **propuesta B** de `maqueta/comparar-lengua.png` (lengua de dos capas: mucosa rosada encima y músculo
con fibras; raíz vertical; frenillo; suelo de la boca macizo), **zoom de la nariz a la laringe** y **solo las etiquetas
útiles** (lengua, dientes, labios; cuerdas vocales si el sonido es sonoro; velo si el aire sale por la nariz).
Imágenes **fijas** (sin animación ni vídeo). Director: Claude (sesión principal). Nadie hace commits salvo el director.

## Reparto de archivos (nadie toca los del otro)
| Quién | Archivos |
|---|---|
| **Ilustrador** | `scripts/mouth/` (generador, Python 3 sin dependencias, o Node sin dependencias) y el archivo generado `src/sounds/mouth.ts`; capturas de revisión en el scratchpad |
| **Desarrollador** | `src/components/MouthDiagram.tsx` (nuevo), `src/screens/SoundScreen.tsx`, `src/screens/AboutScreen.tsx` (crédito), `tests/mouth.test.mjs` (nuevo) |

## `src/sounds/mouth.ts` (GENERADO por `scripts/mouth/`, no se edita a mano)
```ts
export type MouthMark = 'tongue' | 'teeth' | 'lips' | 'folds' | 'velum'
export interface MouthPose {
  id: string                 // 'th-dh', 'p-b', 'iy'…
  viewBox: string            // mismo recorte en todas: de la nariz a la laringe (coordenadas de los cortes CC0)
  body: string               // SVG interior: anatomía + camino del aire. Sin <text> ni etiquetas. Los id de <defs>
                             // (gradientes, clipPath, marker) terminan en «__U»; el componente lo cambia por un id único.
  marks: Partial<Record<MouthMark, [number, number]>> // punto que señala cada etiqueta (coordenadas del viewBox)
  nasal: boolean             // el aire sale por la nariz (velo bajado: m, n, ŋ)
}
export interface MouthInfo {
  pose: string               // id de MOUTH_POSES
  poseEnd?: string           // diptongos (eɪ aɪ ɔɪ aʊ oʊ): pose de la vocal final; `pose` = vocal inicial
  front: string              // id de FRONT_SHAPES
  labels: MouthMark[]        // qué etiquetas mostrar, en orden de importancia (máx. 4)
  voiced: boolean            // copia de `voiced` de phonemes.json (las vocales y diptongos, true)
}
export const MOUTH_POSES: Record<string, MouthPose>
export const FRONT_SHAPES: Record<string, string>     // SVG interior, viewBox "0 0 120 120" (labios de frente)
export const MOUTH_BY_PHONEME: Record<string, MouthInfo> // las 44 fichas de phonemes.json, por su `id`
```
Poses laterales (27): tabla de `PROMPTS-gemini.md` §3 (+ `neutral`). Formas de frente (9): §4. Los pares sordo/sonoro
comparten pose (la vibración la pinta el componente encima). `s-cluster`, `ed` y `s-ending` usan poses existentes.

## El componente (`MouthDiagram`)
- Pinta `body` en línea (no `<img>`), cambia `__U` por `useId()`, y dibuja las etiquetas en español en una columna a la
  derecha con una línea fina hasta su `mark` (color del texto del tema, como en `maqueta/maqueta-boca-4.png`).
  Textos: Lengua · Dientes · Labios · «Cuerdas vocales: vibran» (sonoras) · «Velo bajado: aire por la nariz».
- Sonoras: ondas sobre las cuerdas vocales (fijas). Vista de frente en un círculo pequeño. Diptongos: inicio → final.
- `role="img"` y `aria-label` con los textos de `articulation` (`lipsEs`, `tongueEs`, `voiceEs`).
- Debe caber en 320×640 y en horizontal, sin scroll extra en la ficha más allá del que ya tiene; modo ligero: sin cambios
  (es estático). `mouth.ts` solo lo importan las pantallas de Sonidos (van en un chunk diferido).
