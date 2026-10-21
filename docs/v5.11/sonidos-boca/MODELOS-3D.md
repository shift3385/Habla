# Boca en 3D con Blender: modelos disponibles

**Fecha:** 2026-10-21 · **Decisión del dueño:** hacer las imágenes/animaciones de Sonidos con **Blender** y modelos 3D
gratuitos, en el estilo de *Tools for Clear Speech* (Baruch College): cara realista de perfil, semitransparente, con el
interior de la boca a la vista. La **vista de frente** sale del **mismo modelo** con otra cámara (el dueño no se graba).
Las posiciones de cada sonido: tabla de `PROMPTS-gemini.md` §3–§4 y cortes CC0 de `referencias/`.

> Licencias según las fuentes consultadas por el buscador (2026-10-21); **confírmalas en la página de cada modelo** al
> descargarlo. «CC BY-SA» = se puede modificar y usar citando la fuente, y lo que salga se comparte con la misma licencia
> (en Habla: crédito en «Acerca de → Créditos», como los audios de Wikimedia).

## Recomendado (gratis)

| Para | Modelo | Qué trae | Licencia | Dónde |
|---|---|---|---|---|
| **Cara y cabeza por fuera** | **MPFB 2** (MakeHuman dentro de Blender 4.2+) | Personas realistas que eliges tú (cara, edad, piel): así **no es la misma mujer que Baruch**. Rig automático y apartado de «lip sync» | Plugin GPLv3; los recursos y **los modelos exportados, CC0** (sin condiciones) | [MPFB 2](https://www.cgchannel.com/2025/03/check-out-open-source-blender-character-generation-plugin-mpfb-2) · [FAQ de licencia](https://static.makehumancommunity.org/oldsite/faq/can_i_sell_models_created_with_makehuman.html) |
| **Interior: lengua, dientes, paladar, velo, laringe, tráquea, vértebras** | **Z-Anatomy** (atlas anatómico libre para Blender) | Todo el cuerpo con nombres anatómicos; se usa solo la cabeza y el cuello | **CC BY-SA 4.0** (deriva de BodyParts3D). Un usuario de un foro dice que el proyecto parece inactivo: los archivos siguen en GitHub | [GitHub](https://github.com/Z-Anatomy/Models-of-human-anatomy) · [archivo .blend](https://github.com/Z-Anatomy/The-blend) |

## Alternativas

| Modelo | Para qué | Licencia | Nota |
|---|---|---|---|
| **«Syndey – Oral Cavity»** (AnatomyTOOL, en Sketchfab) | Solo la boca: cavidad, dientes, lengua, faringe. Más ligero que Z-Anatomy | CC BY-SA (deriva de BodyParts3D) | [AnatomyTOOL](https://anatomytool.org/node/60463). No sé si viene cortado por la mitad |
| **VocalTractLab** (Peter Birkholz) | Modelo 3D del tracto vocal **con la forma de la lengua de cada sonido** (23 parámetros): ideal como **referencia exacta** de posiciones | Gratuito (registro por correo); no sé si deja exportar las mallas | [Manual 2.4](https://vocaltractlab.de/download-vocaltractlab/VTL2.4-manual.pdf) · [VTL 3D](https://www.vocaltractlab.de/download-vocaltractlab/user_guide_vtl3d.pdf) |
| **Modelos de pago** (CGTrader: corte de cabeza, lengua) | Si los gratuitos no convencen; ya vienen cortados y pintados | De pago, «royalty free» | [Corte de cabeza](https://www.cgtrader.com/3d-print-models/science/biology/3d-model-of-head-section) · [Lengua](https://www.cgtrader.com/3d-print-models/science/biology/3d-model-of-tongue-anatomy) |
| «Pharynx and floor of mouth» (U. de Dundee, Sketchfab) | Faringe y suelo de la boca | **CC BY-NC-SA** (no comercial) | [Sketchfab](https://sketchfab.com/3d-models/pharynx-and-floor-of-mouth-b262c70bf9bd49c2a5428581b754f24b). Evitar: el «NC» chocaría si la app se abre a más gente (6.0) |

## Plan

1. **Prototipo de /θ/:** instalar Blender (≥ 4.2), MPFB 2 y Z-Anatomy; montar cara + interior; cara semitransparente en
   la mejilla; una cámara de perfil y otra de frente; render de reposo y de /θ/. Revisión de Claude contra
   `referencias/th-dh.png`.
2. Si gusta: las 27 posiciones con *shape keys* (Claude escribe el script de Python para Blender que las crea y renderiza
   todo con nombre de archivo) y las 9 de frente.
3. En la app: vídeo corto (~2 s) o dos fotogramas con fundido; vibración y aire encima; en modo ligero, la imagen fija.
