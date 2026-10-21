# Imágenes de la boca para Sonidos: cómo generarlas con Gemini

**Fecha:** 2026-10-21 · **Decisión del dueño:** el estilo es el de una **maqueta anatómica de clase** (corte lateral de la
cabeza pintado, con volumen, y una vista de frente realista). Lo dibujado con código (SVG) se quedaba corto: lengua como
mancha, columna rígida, demasiadas flechas. Las imágenes las genera el dueño con **Gemini**; Claude escribe los prompts,
**revisa cada imagen contra el corte anatómico real** de ese sonido y monta la ficha (sin texto dentro de la imagen).

> Referencias anatómicas: `referencias/*.png` (cortes de Richard Wright y Dan McCloy, Universidad de Washington,
> repositorio `drammock/phonetics-teaching-assets`, licencia **CC0**: dominio público). Están en espejo: la cara mira a la
> **izquierda**, como la foto de la maqueta. Se adjuntan a Gemini para que no se invente dónde va la lengua.

---

## 1. Reglas para todas las imágenes

1. **Una sola cabeza base** y luego **editarla**: genera primero la imagen neutra (§2) y, para cada sonido, súbela a Gemini
   y pide **solo** el cambio de lengua, labios, mandíbula o velo (§3). Así todas son la misma cabeza, con la misma luz.
2. **Adjunta siempre** la referencia anatómica de ese sonido (`referencias/<archivo>.png`) junto con la imagen base.
3. **Sin texto, sin flechas, sin etiquetas** dentro de la imagen (la app pone lo necesario y en español).
4. **Mismo encuadre siempre:** cabeza de perfil mirando a la **izquierda**, de la coronilla a la base del cuello, centrada.
5. **Fondo liso** gris muy claro (#F2F2F2), sin aula ni pósteres (la app la coloca sobre la tarjeta del tema).
6. **Formato:** vertical 4:5, lo más grande que dé Gemini (al menos 1024 × 1280). La app la convierte a WebP.
7. Si Gemini añade una **marca de agua visible**, dímelo antes de seguir: puede que haya que generarlas desde Google AI
   Studio o recortarla (no lo he podido comprobar desde aquí).
8. Guarda cada imagen con el **nombre del archivo** de la tabla (§3, §4) y pásamelas por tandas: las reviso antes de seguir.

Tamaño estimado en la app: ~28 laterales + 9 de frente en WebP a ~50–90 KB → **2–3 MB** en total (estimación).

---

## 2. Imagen base (lateral, neutra)

Archivo: `lat-base.png` · Adjunta: `referencias/neutral.png` y, si quieres, tu foto de la maqueta como estilo.

```text
Photorealistic anatomical teaching model of a human head, mid-sagittal cross-section, profile view facing LEFT,
painted resin like a classroom anatomy model, soft studio lighting, plain very light grey background (#F2F2F2),
no stand, no text, no labels, no arrows. Full head from the crown to the base of the neck, centred, vertical 4:5.
Show clearly and realistically: brain with natural gyri, skull, frontal and sphenoid sinuses, nasal cavity with
turbinates, hard palate (bone), soft palate with uvula, upper and lower incisors, lips, a realistic muscular tongue
(smooth top surface, natural shape, not a blob), mandible, hyoid bone, epiglottis, larynx with vocal folds, trachea
with cartilage rings, oesophagus, and the cervical spine with its NATURAL forward curve (lordosis), vertebrae and
discs, spinal cord. Neutral resting position: mouth softly closed, tongue relaxed on the floor of the mouth, tongue
tip behind the lower front teeth, soft palate raised. Follow the attached diagram for the exact position of the
tongue, palate and lips. Warm natural tissue colours: skin, pink mucosa, red muscle, ivory bone.
```

---

## 3. Edición por sonido (lateral)

Para cada fila: abre una conversación nueva en Gemini, sube **`lat-base.png` + la referencia** de la fila y pega:

```text
Edit the first image. Keep EVERYTHING identical (same head, framing, lighting, colours, background, brain, spine,
teeth) and change ONLY the articulators to match the attached diagram: <POSE>.
No text, no labels, no arrows.
```

Sustituye `<POSE>` por el texto de la tabla. Los pares que solo cambian la voz **comparten imagen** (la vibración la
pinta la app). Los diptongos (eɪ aɪ ɔɪ aʊ oʊ) **usan las imágenes de sus dos vocales**.

| Archivo | Sonidos | Referencia | `<POSE>` |
|---|---|---|---|
| `lat-p-b.png` | /p/ /b/ | `p-b.png` | lips pressed firmly together, tongue relaxed on the floor of the mouth, soft palate raised |
| `lat-m.png` | /m/ | `m.png` | lips closed, tongue relaxed, soft palate LOWERED so air can go through the nose |
| `lat-t-d.png` | /t/ /d/ | `t-d.png` | tongue tip pressed on the alveolar ridge just behind the upper front teeth (not on the teeth), sides sealed, lips slightly apart, soft palate raised |
| `lat-n.png` | /n/ | `n.png` | same tongue as /t/ (tip on the alveolar ridge) but soft palate LOWERED, air to the nose |
| `lat-l.png` | /l/ | `t-d.png` | tongue tip on the alveolar ridge with the sides of the tongue lowered; back of the tongue slightly raised (dark L) |
| `lat-k-g.png` | /k/ /ɡ/ | `k-g.png` | back of the tongue pressed against the soft palate, tongue tip low behind the lower teeth, soft palate raised |
| `lat-ng.png` | /ŋ/ | `ng.png` | back of the tongue against the soft palate, soft palate LOWERED, air to the nose |
| `lat-f-v.png` | /f/ /v/ | `f-v.png` | lower lip lightly touching the edge of the upper front teeth, tongue relaxed, soft palate raised |
| `lat-th-dh.png` | /θ/ /ð/ | `th-dh.png` | flat tongue tip visibly sticking out a little BETWEEN the upper and lower front teeth, lips slightly apart, soft palate raised |
| `lat-s-z.png` | /s/ /z/ | `s-z.png` | tongue tip very close to (not touching) the alveolar ridge with a narrow groove, teeth almost closed, soft palate raised |
| `lat-sh-zh.png` | /ʃ/ /ʒ/ | `sh-zh.png` | tongue blade raised towards the area just behind the alveolar ridge, a bit further back than for S, not touching; lips pushed forward and slightly rounded |
| `lat-ch-jh.png` | /tʃ/ /dʒ/ | `sh-zh.png` | tongue blade PRESSED against the area just behind the alveolar ridge (full closure), lips pushed forward and slightly rounded |
| `lat-r.png` | /ɹ/ /ɝ/ /ɚ/ | `r-retrofleja.png` | American R: tongue tip curled slightly up and back, NOT touching the roof of the mouth, tongue body bunched, lips slightly rounded |
| `lat-w.png` | /w/ | `uw.png` | lips very rounded and pushed forward, back of the tongue raised towards the soft palate without touching |
| `lat-y.png` | /j/ | `iy.png` | front of the tongue raised close to the hard palate without touching, lips spread |
| `lat-h.png` | /h/ | `neutral.png` | mouth open, tongue low and relaxed, nothing touching: air comes freely from the throat |
| `lat-iy.png` | /iː/ | `iy.png` | tongue high and forward, tense, close to the hard palate; lips spread like a smile; jaw almost closed |
| `lat-ih.png` | /ɪ/ | `ih.png` | tongue a little lower and further back than for EE, relaxed; lips relaxed; jaw almost closed |
| `lat-eh.png` | /ɛ/ | `eh.png` | tongue forward at mid height; lips relaxed; jaw half open |
| `lat-ae.png` | /æ/ | `ae.png` | tongue low and forward; jaw wide open; lips slightly spread |
| `lat-aa.png` | /ɑ/ | `aa.png` | tongue low and back; jaw wide open; lips relaxed, not rounded |
| `lat-ao.png` | /ɔ/ | `aa.png` | tongue low and back; jaw open; lips slightly rounded |
| `lat-uh.png` | /ʊ/ | `uh.png` | back of the tongue raised but lower than for OO, relaxed; lips loosely rounded; jaw almost closed |
| `lat-uw.png` | /uː/ | `uw.png` | back of the tongue high; lips very rounded and pushed forward; jaw almost closed |
| `lat-ah.png` | /ʌ/ | `eh.png` | tongue in the centre of the mouth, relaxed, mid-low; jaw half open; lips relaxed |
| `lat-ax.png` | /ə/ | `neutral.png` | everything relaxed in the centre: tongue mid, jaw slightly open, lips neutral |

(26 ediciones + la base = 27 imágenes laterales.)

---

## 4. Vista de frente

Base `fr-base.png` (adjunta tu foto de la maqueta de frente como estilo):

```text
Photorealistic close-up of the lower half of a human face seen from the FRONT, like a realistic anatomy teaching
model: from just below the eyes to the chin, centred, natural skin with soft studio lighting, plain very light grey
background (#F2F2F2), no text, no labels, no arrows, vertical 4:5. Mouth softly closed, relaxed lips.
```

Ediciones (sube `fr-base.png` y pega: *«Edit the image. Keep the face, skin, lighting and framing identical and change
ONLY the mouth: `<BOCA>`. No text, no labels.»*):

| Archivo | Para | `<BOCA>` |
|---|---|---|
| `fr-closed.png` | p b m | lips pressed together |
| `fr-fv.png` | f v | upper front teeth resting lightly on the lower lip |
| `fr-th.png` | θ ð | lips slightly apart, the flat tip of the tongue visible between the upper and lower front teeth |
| `fr-spread.png` | iː j eɪ (final) | lips spread like a smile, teeth almost together and visible |
| `fr-neutral.png` | ɪ ɛ ʌ ə t d n l s z k g ŋ | lips relaxed and slightly open, a little of the upper teeth visible |
| `fr-open.png` | æ ɑ aɪ h | mouth wide open, tongue low inside |
| `fr-round-open.png` | ɔ oʊ | lips rounded in an O shape, mouth half open |
| `fr-round-close.png` | uː ʊ w ɹ | lips very rounded and pushed forward, small opening (like a kiss) |
| `fr-sh.png` | ʃ ʒ tʃ dʒ | lips pushed forward and slightly rounded, teeth almost together and visible |

---

## 5. Cómo seguimos

1. **Prueba primero 3:** `lat-base.png`, `lat-th-dh.png` y `lat-r.png` (y `fr-base.png` + `fr-th.png`). Pásamelas.
2. Las reviso contra la referencia (posición de la lengua, labios, velo) y, si hace falta, afino los prompts.
3. Con el visto bueno, el resto por tandas. Yo monto la maqueta de la ficha con tus imágenes (sin implementar en la app
   hasta que lo apruebes).

**En la app (cuando toque):** al pulsar «Escuchar y ver», fundido de 0,4 s de la imagen base a la del sonido; encima,
solo lo que la imagen no puede decir: vibración de las cuerdas vocales (sonoras) y, si acaso, el aire. En **modo ligero**,
la imagen del sonido directamente, sin fundido.
