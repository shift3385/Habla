# Maqueta de la ficha de sonido (SVG, sin implementar en la app)

Decisión del dueño (2026-10-22): seguir con **ilustración SVG** (no Blender ni vídeo). Solo se señala lo importante del
sonido: dientes, lengua, labios y, si el sonido es sonoro, las cuerdas vocales. Zoom a la boca.

- `build3.py` genera `maqueta2.html` (ficha en el teléfono, /θ/ claro y /ð/ oscuro) y `anat-grande.html`.
  Usa `anat.json` (contornos de los cortes CC0 de Wright y McCloy, sacados con `parse.py` de
  `github.com/drammock/phonetics-teaching-assets`, carpeta `midsaggital_articulations`).
- `maqueta-boca-3.png`: solo etiquetas útiles. `maqueta-boca-4.png`: lengua redibujada (plana, unida al suelo de la boca, punta afinada, fibras en abanico).
- Para verla: `python3 build3.py` y abrir `maqueta2.html` en el navegador.
- `comparar-lengua.png`: propuesta A (lengua de maqueta, una capa) frente a B (dos capas: mucosa rosada encima y músculo con fibras; raíz vertical; frenillo). `build3.py` genera las dos (`variant`).
