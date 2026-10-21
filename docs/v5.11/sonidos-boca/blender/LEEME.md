# Blender en la nube (sin instalar nada en el PC)

Comprobado el 2026-10-21 en Claude Cloud: Blender 5.2.2 como módulo de Python (`pip install bpy==5.2.2` en un venv,
Python 3.13) renderiza con Cycles en CPU y exporta **vídeo MP4 H.264** (el que reproduce Android).

- Modelo: Z-Anatomy (`github.com/Z-Anatomy/The-blend`, `Z-Anatomy.zip` → `Startup.blend`), CC BY-SA 4.0. Lengua (343
  vértices), paladar blando, úvula, 32 dientes, mandíbula, laringe, tráquea, vértebras C1–C7 y la piel por regiones.
- Ejes: X izquierda-derecha (línea media x = 0), la cara mira a −Y, Z arriba. Cámara en +X → la cara mira a la izquierda.
- Trampas del archivo: hay que reactivar las colecciones (exclude/holdout), **desactivar Freestyle, el compositor y el
  editor de vídeo** (si no, sale la imagen vacía) y poner `frame_step = 1`. Las piezas cuelgan de grupos: para animarlas
  se cambia su `matrix_world` y se ponen claves, no se re-emparentan.
- Velocidad (4 núcleos, sin GPU): ~4 s por fotograma a 320×400 y 8 muestras.
- `proto1.py`: escena (piel semitransparente + anatomía) y una imagen fija. `video-test.py`: 12 fotogramas abriendo la
  mandíbula → MP4. Las rutas apuntan al scratchpad de la sesión: ajustarlas al reutilizarlos.

## Avance (2026-10-21)
- `proto3.py` (prototipo 1): corte sagital, relleno de carne con el perfil, vías respiratorias, materiales de resina.
- `proto4.py` (prototipo 2): cabeza cerrada por fuera (piel de las regiones del atlas, pelo pintado, oreja) y una ventana
  solo sobre la zona del habla (petición del dueño: que no impresione). El exterior del atlas parece un maniquí.
- `proto5.py` (prototipo 3): exterior = escaneo de **Lee Perry-Smith** (Infinite-Realities, CC BY 3.0; `LeePerrySmith.glb`
  y texturas de `github.com/mrdoob/three.js/tree/dev/examples/models/gltf/LeePerrySmith`), encajado por la nariz y lo alto de
  la cabeza. **Pendiente:** conectar `Map-COL.jpg` (sale gris) y decidir el pelo. El dueño pidió no gastar en vano:
  máximo 2 renders por paso y su visto bueno antes de seguir.
