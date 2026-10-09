# 5.10 «Gramática» — Formato del contenido (contrato entre autores y desarrollo)

Un archivo JSON por sección: `src/grammar/<seccion>.json`, en UTF-8, con 2 espacios de sangría. Lo comprueba
`node scripts/validate-grammar.mjs`. Explicaciones **en español** (registro «tú», cercano, como la app); ejemplos y
ejercicios **en inglés** con traducción. Público: **hispanohablantes** de A1 a C1.

## Sección

```json
{
  "id": "tenses",
  "order": 1,
  "titleEn": "Verb Tenses",
  "titleEs": "Tiempos verbales",
  "icon": "clock",
  "descriptionEs": "Cuándo pasa algo: presente, pasado y futuro, y cómo se combinan.",
  "topics": [ /* temas, de más básico a más avanzado */ ]
}
```

## Tema

```json
{
  "id": "present-perfect-continuous",
  "name": "Present Perfect Continuous",
  "nameEs": "Presente perfecto continuo",
  "level": "B1",
  "summaryEs": "Algo que empezó en el pasado y sigue (o acaba de parar), mirando la duración.",
  "keywords": ["have been + -ing", "for", "since", "llevo", "desde hace"],
  "categories": ["tense"],
  "explanationEs": ["Párrafo corto 1…", "Párrafo corto 2…"],
  "forms": {
    "affirmative": { "pattern": "Sujeto + have/has been + verbo-ing", "examples": [{ "en": "I've been working here for two years.", "es": "Llevo dos años trabajando aquí." }] },
    "negative":    { "pattern": "Sujeto + haven't/hasn't been + verbo-ing", "examples": [{ "en": "…", "es": "…" }] },
    "question":    { "pattern": "Have/Has + sujeto + been + verbo-ing?", "examples": [{ "en": "…", "es": "…" }] }
  },
  "examples": [{ "en": "…", "es": "…", "noteEs": "opcional: por qué este caso" }],
  "commonMistakes": [{ "wrong": "I am working here since 2020.", "right": "I have been working here since 2020.", "whyEs": "En español usamos presente («trabajo aquí desde…»); en inglés, presente perfecto." }],
  "related": ["present-perfect", "present-continuous"],
  "exercises": [
    { "id": "present-perfect-continuous-1", "type": "choice", "prompt": "She ____ for the bus for twenty minutes.", "options": ["has been waiting", "is waiting", "waits", "was waited"], "answer": 0, "whyEs": "Duración hasta ahora con «for»: presente perfecto continuo.", "trapsEs": ["", "Presente continuo: no expresa «llevar … tiempo».", "Presente simple: hábito, no duración hasta ahora.", "No existe: mezcla pasado y pasiva."] },
    { "id": "present-perfect-continuous-2", "type": "gap", "prompt": "How long ____ you ____ (learn) English?", "answers": ["have / been learning"], "whyEs": "…" },
    { "id": "present-perfect-continuous-3", "type": "order", "words": ["been", "I've", "all", "studying", "morning"], "answer": "I've been studying all morning", "whyEs": "…" }
  ],
  "speaking": [
    { "promptEs": "Cuéntale a tu profe cuánto tiempo llevas haciendo algo que todavía haces.", "modelEn": "I've been learning English for six months.", "checkEs": "Usa have/has been + -ing con for o since." }
  ],
  "classFocusEn": "Practise present perfect continuous for duration up to now (for/since, How long…?). Gently correct 'I am working here since…'."
}
```

### Reglas
- **`name`**: nombre técnico en inglés con el que un profesor titula la clase («Second Conditional», «Modal Verbs of Deduction», «Countable and Uncountable Nouns»). **`nameEs`**: su nombre en español.
- **`id`**: kebab-case en inglés, **único en todo el catálogo**. Ids de ejercicio: `<id-del-tema>-<n>`.
- **`level`**: `A1` · `A2` · `B1` · `B2` · `C1` · `C2`.
- **`categories`** (para «Para ti», categorías de error del profe): `article` · `uncountable` · `auxiliary` · `false_friend` · `tense` · `preposition` · `word_order` · `vocabulary` · `grammar` · `other`.
- **`explanationEs`**: 2–4 párrafos cortos (≤ 350 caracteres cada uno): cuándo se usa y qué lo distingue de lo parecido. Sin jerga innecesaria.
- **`forms`**: siempre afirmativa, negativa y pregunta (con 1–2 ejemplos cada una). Si un tema no tiene sentido en alguna forma (p. ej. falsos amigos), usa `null` en esa forma.
- **`examples`**: 4–6, frases naturales y útiles en la vida real (trabajo, viajes, rutina, tecnología). Nada de frases artificiales.
- **`commonMistakes`**: 2–4 errores **típicos de hispanohablantes**, con el porqué comparando con el español.
- **`related`**: ids de otros temas del catálogo (aunque estén en otra sección).
- **`exercises`**: 6–8 por tema, mezclando `choice` (4 opciones, `answer` = índice, `trapsEs` con una explicación por opción y `""` en la correcta), `gap` (`answers` = respuestas válidas; con dos huecos, separadas por ` / `) y `order` (`words` desordenadas, `answer` = frase sin punto final). Dificultad acorde al nivel. **Una sola respuesta correcta sin ambigüedad.**
- **`speaking`**: 2–3 retos para decir en voz alta, con una respuesta modelo y qué se comprueba.
- **`classFocusEn`**: 1–2 frases en inglés para el profe cuando se practica el tema en una clase.
- **Prohibido reutilizar** frases o ítems del banco del test de nivel (`src/bank/**`): el validador compara los enunciados.
- **Corrección ante todo:** inglés estándar actual (norteamericano por defecto; si el británico difiere, menciónalo). Nada de reglas inventadas ni excepciones dudosas.

## Iconos disponibles
`news ai gadget chart rocket planet globe film food ball money what target laptop hand scale book keyboard mic bars sliders sun moon key data back chevR chevD arrowUR arrowR check spark flame speaker speakerWave pause ear bulb eye upload download trash send lock flag notebook pencil cards cap soundwave bubble heart shield help wrench bolt bug star info headphones palette`.
Si una sección necesita otro icono (p. ej. `clock`), el desarrollador lo añade a `src/ui/icon-paths.ts`.

## Reparto (ids de sección · orden · autor)

| Autor | Archivo | Sección | Temas |
|---|---|---|---|
| A | `tenses.json` (1) | Verb Tenses · Tiempos verbales | 17 (diseño §2.1) |
| A | `negatives-questions.json` (2) | Negatives and Questions · Negaciones y preguntas | 10 (§2.2) |
| B | `modals.json` (3) | Modal Verbs · Verbos modales | 12 (§2.3) |
| B | `verbs.json` (4) | Non-Modal Verbs · Verbos no modales | 9 (§2.4) |
| B | `wishes-advice.json` (5) | Should, Could, Would and Wish · Debería, podría, tendría, desearía | 8 (§2.5) |
| C | `conditionals.json` (6) | Conditionals · Condicionales («Si… entonces…») | 8 (§2.6) |
| C | `passive.json` (7) | The Passive Voice · Voz pasiva | 3 (§2.7) |
| C | `reported-speech.json` (8) | Reported Speech · Estilo indirecto | 3 (§2.8) |
| C | `articles-quantifiers.json` (9) | Articles and Quantifiers · Artículos y cantidades | 5 (§2.9) |
| D | `prepositions.json` (10) | Prepositions · Preposiciones | 5 (§2.10) |
| D | `word-order-linkers.json` (11) | Word Order and Linkers · Orden y conectores | 7 (§2.11) |
| D | `false-friends-pronouns.json` (12) | False Friends and Pronouns · Falsos amigos y pronombres | 3 (§2.12) |
