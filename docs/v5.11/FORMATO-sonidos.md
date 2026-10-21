# Formato del contenido de «Sonidos» (5.11)

> Copia viva de `docs/fonemas/DISENO-fonemas.md` §8 con lo que cambió al implementarlo (D3, S-01/S-03, 2026-10-21).
> Lo comprueba `node scripts/validate-sounds.mjs` (o `npm run validate:sounds`). Tipos TypeScript: `src/lib/sounds.ts`.
> Si cambia algo de aquí, se cambia también el validador y los tipos.

## 1 · Archivos

| Archivo | Qué lleva |
|---|---|
| `src/sounds/phonemes.json` | `{ "phonemes": [...] }`: 41 fichas (40 sonidos + /ɚ/) y los rasgos del MVP (`s-cluster`, `ed`, `s-ending`) con `kind: "feature"` |
| `src/sounds/alphabet.json` | `{ "families", "letters", "spellingPhrases", "symbols" }`: 26 letras en 7 familias |
| `src/sounds/lessons.json` | `{ "lessons": [...] }`: las lecciones de la ruta (12 en la 5.11) |
| `src/sounds/credits.json` | `{ "credits": [...] }`: un crédito por audio suelto de `public/sounds/` |
| `public/sounds/*.ogg` | audios sueltos de Wikimedia Commons (Vite los copia tal cual al APK) |
| `scripts/data/cmudict.dict` | **opcional, fuera de git y del APK**: CMU Pronouncing Dictionary para que el validador compruebe las transcripciones |

UTF-8, 2 espacios. Los JSON se cargan con `import()` perezoso (`loadSounds()`): van en chunks aparte y no entran en el
arranque. Límites: JSON ≤ 300 KB en total; cada audio ≤ 30 KB y todos ≤ 0,6 MB.

**Idioma.** Textos en español neutro latinoamericano con «tú» (mismas reglas que `docs/v5.10/FORMATO-contenido.md`).
Nunca «como la z de España» como pista única: España, si sale, va como dato añadido y después de lo que vale para
Latinoamérica (el validador lo marca). Palabras y frases en **inglés americano**.

**Lo que suena.** Todo lo que la app lee suelto con ▶ (palabra clave, ejemplos, grafías, pares, palabras de los
ejercicios) va **sin homógrafos** (*live, read, lead, close, use, does, minute, record*…: lista en el validador): la voz
del teléfono no sabe cuál de las dos lecturas usar. En frases completas sí se pueden usar (el contexto lo resuelve).

## 2 · Ficha (`phonemes.json`)

| Campo | Regla |
|---|---|
| `id` | ARPAbet en minúsculas (`ih`, `th`, `axr`…) o rasgo con guiones (`s-cluster`, `ed`, `s-ending`). Único. |
| `ipa` | Símbolo que se enseña (/iː/ y /uː/ con «ː»). En rasgos, una etiqueta corta («s+cons.», «-ed»). |
| `azure` | Símbolos IPA que puede devolver Azure en-US para el sonido (`["i"]`, `["ɡ","g"]`). `[]` en rasgos. Un símbolo lleva a una sola ficha (salvo `er`/`axr`, que pueden compartir). Se normaliza «ː» y `g`→`ɡ` antes de comparar. **A confirmar en F0-4.** |
| `kind` | `vowel` · `diphthong` · `consonant` · `feature`. |
| `chart` | `{ "block", "row", "col" }` (no en rasgos). Filas y columnas desde 1. Ver §2.1. Una celda por ficha (salvo `er`/`axr`, que comparten la celda «ɝ ɚ»). |
| `keyword` | Palabra clave frecuente, sin homógrafos. |
| `nameEs` | Nombre en español sencillo («i corta», «th sorda»). |
| `level` · `difficulty` · `priority` | `A1`–`B2` · `1`–`3` (1 = existe en español casi igual; 3 = no existe y cambia el significado) · `P1`–`P3` (DISENO §4). |
| `voiced` | `true`/`false` en consonantes; `null` en vocales, diptongos y rasgos. |
| `articulation` | `{ lips: spread\|neutral\|rounded, jaw: close\|mid\|open, place, lipsEs, tongueEs, voiceEs }`; los `…Es` ≤ 120 car. Son los 3 pictogramas de la ficha (labios, lengua, voz). |
| `tipShortEs` | Consejo de una línea, ≤ 90 car. Es el que sale en la nota de Azure (M-12: `SOUND_TIPS` se construye desde aquí con `loadSoundTips()`). |
| `explanationEs` | 1–3 párrafos de ≤ 300 car. que dice la mascota. |
| `spanishEs` · `mistakeEs` | Comparación con el español (pensando en varios países) y el error típico. |
| `spellings` | `[{ "pattern", "examples" }]`, de más a menos frecuente. |
| `examples` | `{ initial, medial, final }`: 2–4 palabras cada una; `[]` si el sonido no aparece en esa posición, y entonces `positionNoteEs` dice por qué. Al menos 4 en total. |
| `minimalPairs` | `[{ "with": "<id>", "pairs": [["ship","sheep"], …] }]`: la **primera** palabra lleva este sonido, la segunda el de `with`. ≥ 3 pares por contraste; sin repetir. Una ficha sin pares útiles (/ʒ/) deja la lista vacía. |
| `sentences` | 1–3 `{ en, es }` cortas con muchas apariciones del sonido. No pueden repetir frases del banco del test. |
| `ukNoteEs` | Opcional: diferencia con el británico. |
| `related` | Ids de otras fichas. |
| `audio` | Opcional: id del crédito en `credits.json` del **sonido suelto** (S-04). Sin él, la ficha no enseña «▶ sonido suelto», solo la palabra clave normal y lenta (decisión del dueño: /æ ɑ ɹ ɝ ɚ/ y diptongos, solo dentro de palabras). |
| `stretchEn` | Opcional: la palabra «estirada» para imitar sonidos continuos (*sssun*). Se **escribe**; no se le da a la voz. |

### 2.1 Tabla fonémica (`chart`)

```
vowels       col 1   col 2   col 3     col 4
  row 1      iː iy   ɪ ih    ʊ uh      uː uw
  row 2      ɛ eh    ə ax    ɝ ɚ er/axr ɔ ao
  row 3      æ ae    ʌ ah    ɑ aa      (+r: vocales con r, sin ficha propia)
diphthongs   row 1: eɪ ey · aɪ ay · ɔɪ oy · aʊ aw · oʊ ow   (col 1–5)
consonants   (pares sorda | sonora)
  row 1      p b · t d · tʃ dʒ · k ɡ                          (col 1–8)
  row 2      f v · θ ð · s z · ʃ ʒ
  row 3      m n · ŋ h · l ɹ · w j
```

## 3 · Abecedario (`alphabet.json`)

- `families`: `{ id, ipa, labelEs, letters }`. `id` es el id de la ficha del sonido de la vocal del nombre (`ey`, `iy`,
  `eh`, `ay`, `ow`, `uw`) o `ar` (R). Cada letra en una sola familia.
- `letters`: 26, `{ letter, ipa, family, soundsLikeEs, ttsText, trapEs?, confusedWith? }`. `soundsLikeEs` es una ayuda
  escrita al estilo español, no una transcripción. **`ttsText`** es lo que se le da a la voz para que diga el *nombre*
  de la letra: hoy «A.», «B.»… (una «A» sola se puede leer /ə/). **Pendiente de F0-5**: si una voz falla, se cambia aquí
  (p. ej. «ay») sin tocar código.
- `spellingPhrases` y `symbols` (@ at, . dot…): frases útiles para la lección A3.

## 4 · Lección (`lessons.json`)

| Campo | Regla |
|---|---|
| `id` | `S0`, `A1`, `V1`, `C2a`… (empieza por mayúscula). Único. |
| `order` | Posición en la **ruta completa** de DISENO §5.2 (C2a = 26): la 5.11.x añadirá lecciones sin renumerar. La interfaz ordena por `order` y cuenta «Ruta n/12». Único. |
| `unit` | 0–7. |
| `titleEs` · `level` · `minutes` | `minutes` 3–10. |
| `phonemes` | Ids de las fichas que trabaja; la primera es la principal (`lessonFor()` la usa para el enlace). `[]` en S0. |
| `introEs` | Lo que dice la mascota al empezar (≤ 300 car.). |
| `exercises` | Lista; ids `<lección>-<n>`. Tipos en §4.1. |
| `closingEs` | Opcional: lo que dice la mascota al terminar. |
| `classFocusEn` | Opcional: para la clase centrada en el sonido (fase 2). |

### 4.1 Ejercicios

| `type` | Campos | Reglas |
|---|---|---|
| `listen-choose` | `pairs` (pares o tríos), `rounds`, `hintEs?`, `letters?` | ≥ 2 pares; `rounds` 1–12. Cada ronda suena una palabra de un par y eliges cuál fue. Con `letters: true`, los elementos son letras A–Z y suena su `ttsText`. |
| `odd-one-out` | `words` (3–5), `answer` (índice), `whyEs`, `letters?` | ¿Cuál tiene otro sonido? |
| `sort` | `columns` (2–3 ids de fichas o rasgos), `columnLabels?`, `words` (4–6 `[palabra, columna]`), `letters?` | Por toques (sin arrastrar en 320 px). Ninguna columna vacía. `columnLabels` cuando el símbolo de la ficha no basta (/ɪd/ en `ed`). |
| `say-word` | `target`, `words` (3–6) | Con Azure, `assessWord()` puntúa `target`; sin Azure, «Escúchate». |
| `say-pair` | `pairs` | Dices las dos palabras de cada par. |
| `say-sentence` | `en`, `es`, `targets` | Frase corta. |
| `spell-listen` | `items` (≥ 3), `hintEs?` | La voz deletrea letra a letra (con pausas) y escribes. Mayúsculas, espacios y guiones no cuentan al corregir. |

## 5 · Créditos de audio (`credits.json`)

Un registro por archivo de `public/sounds/` (el validador exige que no sobre ni falte ninguno):

```json
{ "id": "th", "file": "th.ogg", "phoneme": "th", "title": "Voiceless dental fricative.ogg",
  "page": "https://commons.wikimedia.org/wiki/File:Voiceless_dental_fricative.ogg",
  "author": "…", "license": "CC BY-SA 3.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
  "modified": false }
```

- `title`: nombre del archivo original en Commons; `page`: su página (solo `commons.wikimedia.org/wiki/File:`).
- `license`: el texto exacto de la página (si hay varias a elegir, la que se usa); `licenseUrl`: el enlace a la licencia.
- `modified`: `true` si se recortó, se normalizó el volumen o se recodificó, y entonces `modifiedEs` dice qué (CC BY-SA
  lo permite, con la misma licencia). Se enseña en «Acerca de» → Créditos → Audios de los sonidos.

## 6 · Progreso (tabla `sounds` de Dexie, `SoundProgress` en `db.ts`)

Una fila por sonido (clave = id de la ficha) y una por lección (clave = `lesson:<id>`, `kind: "lesson"`). Estado
`new → seen → practiced → mastered` (nunca baja). **Dominado** (`masteryOf`, umbrales en `MASTERY`): ≥ 85 % en «Escucha»
en 2 días distintos (≥ 6 rondas cada día) y, con Azure, nota del sonido ≥ 80 en ≥ 80 % de las palabras (4 de 5, ≥ 5
palabras) en 2 días; sin Azure basta «Escucha» y se marca `earOnly` («solo de oído»). El umbral de Azure se ajusta tras F0-4.
