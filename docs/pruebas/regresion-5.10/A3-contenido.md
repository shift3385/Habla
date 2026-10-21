# A3 · Contenido y pedagogía — regresión 5.10 (build 40)

Agente A3 («Contenido y pedagogía»), 2026-10-20. Rama `v5.10-gramatica`. Sin commits, sin teléfono, sin llamadas a APIs
reales. No se ha tocado `src/`: todas las correcciones van como propuesta (este informe y `evidencia/A3/`).

## 1. Resumen

**Calidad global del contenido: alta.** Se revisaron los **90 temas y los 667 ejercicios** de los 12 archivos de
`src/grammar/` (no una muestra: un script volcó cada tema entero —explicación, formas, ejemplos, errores típicos,
ejercicios con opciones, trampas y porqués, retos de habla y `classFocusEn`— y se leyó todo). El inglés es correcto y
natural, las reglas en español son claras y en tono «tú», los errores típicos son de verdad los de un hispanohablante y
los niveles MCER son plausibles. **No hay ninguna regla falsa (0 CRÍTICA).** `node scripts/validate-grammar.mjs`:
12 archivos · 90 temas · 667 ejercicios · OK (0 avisos).

Lo que sí falla está casi todo **en cómo la app usa el contenido**, no en el contenido:

1. **REG-A3-01 (ALTA)** — la «frase completa» que se enseña con ▶ tras cada ejercicio, que lee la voz inglesa y que se
   guarda como respuesta de la tarjeta del Repaso arrastra la pista del enunciado: *«Sorry, I can't come to the meeting
   tomorrow. (can, negativa)»*, *««Deberías dormir más.» → You should sleep more.»*, *«I 'll get it»*. **94 de 667
   ejercicios** (91 con el código y 3 con el contenido). Arreglo de 5 líneas en `fullSentence()` (propuesta probada: quedan 0 casos salvo los de REG-A3-02/05).
2. **REG-A3-02 (ALTA)** — `in-case-vs-if-8` crea una tarjeta del Repaso «Di la frase completa en inglés» cuya respuesta
   es **«Ahora, por precaución»** (español).
3. **REG-A3-03 (MEDIA)** — el prompt de la clase dirigida choca con reglas del prompt base que no anula de forma
   explícita (pregunta abierta al final, «no expliques la corrección», empujar respuestas cortas) y su tarea estrella
   («¿cómo dirías…?» con una frase española) se lee con la **voz inglesa**.
4. **REG-A3-13/14 (MEDIA)** — `speechLang` lee en inglés palabras españolas citadas («actualmente», «embarazada»,
   «me levanto», «no vi nada», «If + presente simple, will + verbo») y en español palabras inglesas («already»,
   «although», «despite», «nobody», «old», «refuse»). Propuesta probada en `evidencia/A3/speechLang-propuesta.ts`
   (los 4 tests actuales siguen pasando).

**Go/no-go del contenido: GO condicionado.** El catálogo se puede entregar tal cual sin enseñar nada falso. Condición
recomendada antes del release: aplicar REG-A3-01 (código, trivial) y REG-A3-02 (un ejercicio). El resto (MEDIA/BAJA)
puede ir en la misma entrega si el dueño lo aprueba, o en la 5.10.1.

| Severidad | Nº | IDs |
|---|---|---|
| CRÍTICA | 0 | — |
| ALTA | 2 | REG-A3-01, REG-A3-02 |
| MEDIA | 11 | REG-A3-03, 04, 06, 07, 08, 09, 13, 14, 15, 16, 19 |
| BAJA | 6 | REG-A3-05, 10, 11, 12, 17, 18 |

Evidencias y propuestas aplicables (en `docs/pruebas/regresion-5.10/evidencia/A3/`):

| Archivo | Qué es |
|---|---|
| `propuesta-contenido.json` | 27 cambios de contenido con el valor **actual** (para aplicar solo si no ha cambiado) + 15 órdenes alternativas (`alsoAccepted`). Aplicados en una copia del catálogo: `validate-grammar` → **90 temas · 667 ejercicios · OK (0 avisos)** |
| `fullSentence-propuesta.mjs` | `fullSentence()` corregida; ejecutable: `node docs/pruebas/regresion-5.10/evidencia/A3/fullSentence-propuesta.mjs` lista lo que queda sospechoso (4, todos cubiertos por la propuesta de contenido) |
| `speechLang-propuesta.ts` | `splitByLanguage()` mejorada (cambios marcados «A3»); pasa los 4 tests de `tests/speechLang.test.mjs` |

## 2. Cómo se revisó (3.1)

- Volcado completo de cada archivo a texto (un tema por bloque, ejercicios con la opción correcta marcada) y lectura
  de los 90 temas: inglés (gramática, ortografía, puntuación, naturalidad, US/UK), regla en español (corrección,
  claridad para A2/B1, calcos, tono), nivel MCER, ejemplos y traducciones, errores típicos, ejercicios (una sola
  respuesta en *choice*, alternativas en *gap*, otros órdenes válidos en *order*), `trapsEs`/`whyEs`, retos de habla.
- Comprobaciones automáticas (scripts en el scratchpad): huecos con contracciones/forma larga, opciones que empiezan por
  apóstrofo, *choice* sin hueco o con enunciado-pregunta, respuestas en español, órdenes con complemento de tiempo o
  cláusula *if* movible, palabras de *order* = palabras de la respuesta, ortografía US/UK, y `fullSentence()` y
  `splitByLanguage()` aplicadas a todo el catálogo.
- Lo que está bien y conviene no tocar: las trampas explican cada distractor; los «porqués» comparan con el español;
  los niveles siguen una progresión lógica (A1 → C1); los temas difíciles (mixtos, *in case*, *had better*, pasiva con
  modales) están muy bien resueltos; los retos de habla piden contenido personal y comprueban la estructura.

## 3. Hallazgos

| ID | Sev. | Dónde (archivo › tema › campo) | Texto actual | Propuesta | Motivo |
|---|---|---|---|---|---|
| REG-A3-01 | ALTA | `src/lib/grammar.ts` › `fullSentence()` (lo usan `GrammarExercises.tsx:138` —▶ tras responder— y `grammarProgress.ts:42` —`answerEn` de la tarjeta—) | Solo quita la pista «(…)» pegada al hueco. Resultado en 94 ejercicios: «I couldn't sleep last night because of the noise. **(could, negativa)**», «This one must be hers. **(de ella)**», «**«Yo compraría esa casa.» →** I would buy that house.», «**«I'm hungry.» →** Pablo said he was hungry.», «Don't worry, **I 'll** get it.», «**Which verb has an extra syllable /ɪd/ in the past?** wanted» | Ver §3.1: quitar la pista final, el prefijo «…» →, unir «I 'll», y en enunciados-pregunta («… means: ____») devolver solo la opción | La voz inglesa lee español y metalenguaje («can, negativa»); la tarjeta del Repaso enseña como «respuesta correcta» una frase con la pista y se la pasa a Gemini como referencia |
| REG-A3-02 | ALTA | `conditionals.json` › in-case-vs-if › `exercises[in-case-vs-if-8]` | Enunciado «… ¿Cuándo compras los snacks?», opciones en español; si fallas, tarjeta del Repaso con respuesta «Ahora, por precaución» bajo «Di la frase completa en inglés» | Sustituir por un *choice* con hueco en inglés: «We're going on a long drive, so I'll buy some snacks now ____ the kids get hungry.» [in case · if · unless · in case of] (texto completo en `propuesta-contenido.json`) | La tarjeta pide decir en inglés una frase española: imposible de acertar y Gemini lo juzga contra «Ahora, por precaución» |
| REG-A3-03 | MEDIA | `src/lib/grammar.ts` › `grammarBrief()` frente a `teacher.ts` › `buildSystemPrompt()` | El brief dice «OVERRIDES the chatting style», pero no anula explícitamente: «ALWAYS end your reply with exactly one open question that invites a long answer», «If the answer is very short (under about 10 words), ask a follow-up…», «Do NOT explain the correction inside "reply"» (el brief pide justo eso: «explain WHY with the rule») | Añadir al brief un bloque «Rules replaced in this lesson» (texto en §4.1) | Con reglas contradictorias Gemini alterna: unas veces explica, otras no; pide «más detalles» a una traducción de 6 palabras; vuelve a la charla libre (la queja del P3) |
| REG-A3-04 | MEDIA | `grammarBrief()` tareas (a) «How would you say in English: «…»?» y «you may add a few Spanish words»; `Conversation.tsx` `say()` usa `speak()` (voz inglesa) | La frase española de la tarea se lee con la voz inglesa | Pedir a Gemini que ponga **todo el español entre « »** y leer la respuesta del profe en la clase de Gramática con `splitByLanguage` (que ya trata «…» con marcas españolas como español), o no leer en voz las citas españolas | La tarea más útil de la clase dirigida es la que peor suena; un A2 de *listening* no entiende español con fonética inglesa |
| REG-A3-05 | BAJA | `negatives-questions.json` › contractions › `exercises[contractions-2, contractions-3]` | «In «She's finished her homework», 's means ____.» [has · is · was · does]; con REG-A3-01 la frase queda «In «She's…», 's means has.» | ««She's finished her homework.» → She ____ finished her homework.» [has · is · was · does] y ««I'd already eaten.» → I ____ already eaten.» [had · would · did · could] | Así la frase completa (▶ y Repaso) es una oración inglesa real |
| REG-A3-06 | MEDIA | 15 ejercicios *order* (lista en `propuesta-contenido.json` › `ordenesAlternativas`): present-simple-7, present-continuous-6, present-perfect-continuous-7, future-will-6, future-going-to-6, present-continuous-for-future-6, future-perfect-6, can-cant-7, causative-have-something-done-3, phrasal-verbs-3, first-conditional-5, second-conditional-5, if-i-were-you-3, mixed-conditionals-5, unless-as-long-as-provided-that-6 | Solo vale una colocación: «My dad never works on Sundays» (no «On Sundays my dad never works»), «Turn it off please» (no «Please turn it off»), «You'll be late if you don't hurry» (no «If you don't hurry you'll be late») | Campo opcional `alsoAccepted: string[]` en `OrderExercise`, aceptado en `checkExercise()` y comprobado por el validador (mismas palabras); valores propuestos en el JSON | Marca como error una frase correcta y natural; la mayúscula de la primera palabra lo mitiga (por eso MEDIA y no ALTA), pero `normAnswer` la ignora y el «porqué» no dice que la otra también vale |
| REG-A3-07 | MEDIA | *gap* sin pista con otra respuesta válida: some-any-2, zero-conditional-7, will-shall-offers-6, must-vs-have-to-6 | «We don't have ____ bread.» (vale «much»); «____ the app work if I'm offline?» (vale «Will»); «B: ____ make you a sandwich.» (valen «Let me», «I can»); «Drivers ____ stop at a red light.» (vale «need to», «have got to») | Pistas «(some o any)», «(do o does)», «(will, ofrecimiento)»; añadir «need to», «have got to», «'ve got to» a must-vs-have-to-6 | Respuesta correcta marcada como fallo (y crea tarjeta del Repaso) |
| REG-A3-08 | MEDIA | `tenses.json` › past-continuous › `exercises[past-continuous-5]` | «She broke her arm while she ____.» [was skiing · skied · …]: «while she skied» también es gramatical (la trampa lo admite: «lo natural es el continuo») | «She ____ down the slope when she fell and broke her arm.» [was skiing · skied · is skiing · was ski] | Dos opciones válidas |
| REG-A3-09 | MEDIA | `wishes-advice.json` › its-time › `examples[2].es` | «It's about time you called your mother.» = «Ya **era** hora de que llamaras a tu madre.» | «Ya va siendo hora de que llames a tu madre.» | «Ya era hora» en español se dice cuando **por fin** pasa; el inglés dice que aún no ha llamado y debería: enseña el sentido contrario |
| REG-A3-10 | BAJA | Explicaciones mejorables (texto exacto en el JSON): present-perfect `commonMistakes[1].whyEs`; subject-and-object-questions `explanationEs[3]`; verbs-change-meaning `explanationEs[1]`; if-i-were-you-6 `trapsEs[3]`; passive-present-past-7 pista «(bear)»; regular-irregular-verbs `commonMistakes[2]` | «En España se dice «la he visto hoy», pero con … yesterday …» (mezcla hoy/ayer); «el verbo va con -s en presente o en pasado» (se lee como «-s en pasado»); «(…; casi siempre «I'll never forget…»)» suelto; «Al revés: tú no te imaginas que el otro es tú»; pista «(bear)» (un A2 lee «oso»); «I have gone there twice» como corrección de una experiencia | Ver `propuesta-contenido.json` (REG-A3-10) | Claridad para A2/B1; «have been there» es la forma de experiencia |
| REG-A3-11 | BAJA | Naturalidad y tono: short-answers `explanationEs[0]` («suena seco contestar solo Yes»); adverbs-of-frequency `commonMistakes[3]` («no «per»»); wish-past-simple pregunta («¿Alguna vez desearías vivir…?»); causative `examples[1].es` («Se hizo el vestido con una diseñadora»); there-is `explanationEs[0]` («two bank branches») | — | Textos en el JSON | Exageraciones o calcos leves |
| REG-A3-12 | BAJA | Inglés estándar: el catálogo dice «norteamericano por defecto», pero mezcla *cancelled*, *travelled*, *flat*, *queue*, *practise* (en frases que se leen o se dicen) | — | *canceled*, *traveled*, *apartment*, *in line*, *practice* (7 cambios en el JSON). En `classFocusEn` (solo lo lee Gemini) da igual | Coherencia; el validador podría avisar de una lista corta de grafías británicas |
| REG-A3-13 | MEDIA | `src/lib/speechLang.ts` › citas «…» españolas sin palabra de `ES_MARK` → se leen **en inglés** | «actualmente», «embarazada» (justo en Falsos amigos), «Soy ingeniero», «cualquier», «pocos / poco», «me levanto», «no vi nada», «no vino nadie», «hubiera», «quisiera», «aunque», «sin embargo», «porque», «su», «cuyo», y la metalengua dentro de fórmulas: «If + **presente simple**, will + **verbo**», «as much + **incontable** + as», «told + **persona**» | `ES_MARK` + metalengua (verbo, presente, pasado, sujeto, nombre, sustantivo, adjetivo, adverbio, comparativo, incontable, persona, frase…) + esas palabras; y terminaciones españolas (-mente, -ción, -iera, -ada, -ado, -ero, -aba, -ando, -iendo) como marca. Ver `speechLang-propuesta.ts` | Se oye español con fonética inglesa precisamente en el contraste que se enseña |
| REG-A3-14 | MEDIA | `speechLang.ts` › `EN` incompleto y homógrafos | Se leen **en español**: «already», «although», «despite», «nobody», «old», «answer», «refuse», «needn't», «and» (rompe «María and her husband»), «bus» (parte «at the · bus · stop» en 3 tramos); y en inglés el español «no **uses** «wish»» | Añadir esas palabras a `EN`; pasar a `BOTH` *decide, plan, favor, real, uses, bus, taxi, yoga* | Cambios de voz en mitad de una expresión y palabras clave mal pronunciadas |
| REG-A3-15 | MEDIA | `teacher.ts` › prompt base («# Correcting») | La regla «Never call an answer correct/perfect… if it has any error» solo está en el brief de Gramática; en una clase normal el profe puede decir «Great!» con 3 correcciones en pantalla | Añadir al prompt base la coherencia `corrections` ↔ `reply` (texto en §4.2) | La queja del P3b («Spot on!» a una frase con fallos) puede repetirse fuera de Gramática |
| REG-A3-16 | MEDIA | `grammarAi.ts` › `evaluateSpeaking()` | «"correct" if … correct, natural English AND uses the target structure correctly; "almost" if the structure is used but with one small error» | Precisar que **cualquier** error (también fuera de la estructura) impide «correct» y debe nombrarse en `feedback_es` (texto en §4.3) | Coherencia con P3b: «Dilo tú» no debe dar «¡Correcto!» con un fallo de artículo o de -s |
| REG-A3-17 | BAJA | `teacher.ts` › «If the audio has no intelligible speech … set **has_error** to false» | El esquema no tiene `has_error` | Quitar «set has_error to false,» | Instrucción huérfana (ruido para el modelo) |
| REG-A3-19 | MEDIA | `src/lib/pronunciation.ts` › `pronunciationLine()` / `weakWords()`; `PronunciationView.tsx` | «Cuida «think» (el sonido /θ/)», chip «/ɪ/»; las palabras flojas suelen ser *a, the, of* | Consejo en español por fonema típico del hispanohablante, casos *s* inicial y *-ed*, y bajar la prioridad de las palabras de función (ver §5.2) | Un A2 no lee IPA: la nota dice qué falla pero no cómo arreglarlo |
| REG-A3-18 | BAJA | Español de España en todo el catálogo (coger ×13, vosotros, móvil, piso, ordenador) con ciudades de América (Bogotá, Lima, Monterrey) | — | Decisión del dueño (🧑): si las amistades son de América, «coger» → «tomar» | En varios países «coger» es vulgar |

### 3.1 Propuesta de código para REG-A3-01 (`src/lib/grammar.ts`)

Probada sobre los 667 ejercicios con `evidencia/A3/fullSentence-propuesta.mjs` (cambia 91 frases; quedan 4: REG-A3-02 y
REG-A3-05, que se arreglan en el contenido, y «What does «awkward» mean?», que está bien). Habría que añadir 3–4 casos
a `tests/grammar.test.mjs` (pista final, prefijo «…» →, «I'll», «… means: ____»).

```ts
  if (!gapCount(ex.prompt)) return ex.type === 'choice' ? ex.options[ex.answer] : ex.prompt
  // Enunciado-pregunta («… means: ____», «Which sentence…? ____»): la frase es la opción correcta.
  if (ex.type === 'choice' && /[:?]\s*_{3,}\s*$/.test(ex.prompt)) return ex.options[ex.answer]
  const fill = parts.length === 1 && gapCount(ex.prompt) > 1 ? parts[0].split(' / ') : parts
  let k = 0
  return ex.prompt
    .replace(/^«[^»]*»\s*→\s*/, '') // «Deberías dormir más.» → … / «I'm hungry.» → …
    .replace(/^[^→«]*[.?!]\s*→\s*/, '') // «If you don't practice, you won't improve. → …»
    .replace(/_{3,}(\s*\([^)]*\))?/g, () => fill[Math.min(k++, fill.length - 1)] ?? '')
    .replace(/\s*\([^)]*\)\s*$/, '') // pista al final: «(can, negativa)», «(de ella)»
    .replace(/(\w)\s+'(ll|d|m|re|ve|s)\b/g, "$1'$2") // opción «'ll» → «I'll»
    .replace(/\s+([.,!?])/g, '$1')
  // …resto igual
```

Comprobado que en el catálogo **todos** los paréntesis que no siguen a un hueco están al final del enunciado, así que
quitar el último «(…)» no borra inglés.

### 3.2 Propuesta de código para REG-A3-06 (`alsoAccepted`)

```ts
export interface OrderExercise extends ExerciseBase {
  type: 'order'
  words: string[]
  answer: string
  alsoAccepted?: string[] // otras colocaciones correctas (mismas palabras)
}
// checkExercise, rama order:
const said = normAnswer(value.join(' ')).replace(/,/g, '')
return [ex.answer, ...(ex.alsoAccepted ?? [])].some((a) => normAnswer(a).replace(/,/g, '') === said)
```

`validate-grammar.mjs` debería comprobar que cada `alsoAccepted` usa exactamente las mismas palabras que `words`
(el script de la propuesta ya lo comprueba) y `FORMATO-contenido.md` documentar el campo. Alternativa sin código:
reescribir esos 15 ejercicios para que solo admitan un orden (p. ej. quitar el complemento de tiempo).

## 4. Prompts (3.2)

**Qué está bien.** P3/P3b funcionan sobre el papel: el brief es una clase dirigida de verdad (recordatorio de la regla,
tareas que rotan —traducir, completar, ¿es correcta?, transformar, pregunta personal—, explicación del porqué, subir la
dificultad tras acertar), exige todas las correcciones con las del tema primero sin cambiar el hilo, y prohíbe felicitar
una respuesta con fallos (con el ejemplo real «Maybe can I swim or I can swim»). `evaluateDrill` y `evaluateSpeaking`
aceptan otras formulaciones válidas (no castigan no decir el modelo) y dan feedback corto en español. `askMascot` pide
comparar con el español y valida los ids. El prompt base transcribe literalmente, corrige todo error real y prohíbe
«corregir» lo correcto: es lo que pidió el dueño (NC-03).

**Riesgos pedagógicos.** (1) Reglas en conflicto entre el base y el brief (REG-A3-03). (2) La frase española de la
tarea (a) se oye con voz inglesa (REG-A3-04). (3) Abrumar a un A2: el prompt lista *todos* los errores sin marcar
cuál importa (coincide con UX-02 de A5); P3b exige mantener la lista completa, así que la solución es **marcar** la
importancia y que la interfaz pliegue el resto en A1–A2, no recortar. (4) Nada pide **andamiaje** si falla dos veces
seguidas (simplificar la tarea) ni un **cierre** con lo aprendido. (5) El nivel del alumno entra en el prompt base,
pero el brief no pide frases de traducción cortas y cotidianas.

### 4.1 `grammarBrief()` — texto propuesto (añadir antes de «Keep each reply short…»)

```text
Rules replaced in this lesson (they override the general instructions above):
- Do NOT end with an open question that invites a long answer: end with the NEXT TASK, which may need only a short answer.
- Do NOT ask for more details when a task answer is short: a short correct answer is a complete answer.
- You MAY explain the correction inside "reply", in ONE short sentence about THIS rule (the other errors stay only in "corrections").
- Put every Spanish word or sentence inside « » (e.g. How would you say in English: «Ayer no fui al trabajo»?), never Spanish without them, so the app reads it with a Spanish voice.
Difficulty and variety:
- Spanish sentences for translation: short (max ~10 words), everyday, with the student's speaking level vocabulary; never reuse an example sentence you already gave.
- If the student fails the same point twice in a row, make the next task easier (give the first words, or two options to choose from, or a model to repeat), then go back up.
- After about 8 tasks, or if the student wants to stop, give a 1-sentence summary of what they did well and the one thing to remember, then one last task.
```

Y en el código, leer la respuesta del profe con `splitByLanguage` **solo** en la clase de Gramática (por defecto
inglés; los tramos «…» con marcas españolas, en español), o como mínimo no leer en voz las citas españolas.
`tests/grammar.test.mjs` comprueba frases del brief: habría que ampliarlo con estas.

### 4.2 `buildSystemPrompt()` (`teacher.ts`) — texto propuesto

En «# Correcting», al final:

```text
- "reply" must agree with "corrections": if "corrections" is not empty, never call the answer correct, perfect, great English or spot on; react to the content and, if you praise, praise the idea, not the grammar.
- Mark how much each error matters in "important": true for errors that change the meaning, break a basic structure for the student's level or repeat a known weakness; false for small slips. Keep listing every error.
```

Con un campo nuevo `important: boolean` en el esquema de `corrections` (la interfaz puede enseñar primero los
importantes y plegar «Ver otras N» en A1–A2: así se cumple P3b y UX-02 a la vez). Además, en «# How you speak»:
«Clear, natural spoken English adapted to the student's **listening** level (${profile.levels.listening})» (la respuesta
se oye, no se lee). Y quitar «set has_error to false,» (REG-A3-17).

### 4.3 `evaluateSpeaking()` y `evaluateDrill()` — texto propuesto

`evaluateSpeaking` (sustituye la línea de «verdict»):

```text
- "verdict": "correct" only if the whole answer is correct, natural English AND uses the target structure correctly; "almost" if the structure is right but there is one small error anywhere in the sentence (article, -s, preposition, word order…), or the answer is incomplete; "wrong" if the structure is missing or wrong, or there is no real answer.
- "feedback_es": 1–2 short, encouraging sentences in Spanish. Name EVERY error you found (the target structure first) and give the corrected sentence in English. Never say it is correct if you mention an error.
```

`evaluateDrill` (`srs.ts`): para tarjetas de Gramática, «Reference English answer» hoy puede llevar la pista
«(can, negativa)» (REG-A3-01); con la propuesta de §3.1 queda limpia. Añadir la misma frase final de coherencia:
«If the verdict is not "correct", feedback_es must say what to change; if it is "correct", do not invent corrections.»

### 4.4 `askMascot()` — mejoras menores

Añadir: «If US and UK English differ, say so in one short sentence», «If the question assumes something wrong, correct
it kindly first» y «Examples at the student's level (${level})». Sin cambios de esquema.

## 5. Fonética (3.3)

### 5.1 Texto de referencia (correcto)

| Dónde | Referencia de Azure | Valoración |
|---|---|---|
| Clase (`Conversation.tsx:248-258`) | Transcripción de Gemini (lo que dijiste) o el texto tecleado | ✅ Criterio E2: puntúa lo que quisiste decir; con `assessPronunciation` primero libre y, si Azure entendió otras palabras, con referencia (detecta «jesterday» → «yesterday») |
| Repaso (`ReviewScreen.tsx:192-216`) | Transcripción de Gemini (no la respuesta de la tarjeta) | ✅ Evita el falso «te la comiste» de la 5.9 |
| «Dilo tú» (`GrammarSpeak.tsx:116-131`) | Transcripción de Gemini | ✅ Igual que el Repaso; si Gemini falla, Azure puntúa sin referencia |
| Test de nivel (`Calibration.tsx:616`) | `''` (habla libre) | ✅ Informativa, no cuenta en el test; aceptable |

Consecuencia a saber: con referencia = transcripción, «Completa» casi siempre sale ~100 (mide si Azure oyó lo que
Gemini oyó, no si dijiste la frase objetivo). El texto de ayuda («Cuánto de lo que querías decir se llegó a oír») es
honesto; se podría ocultar la nota cuando `scripted` es falso y la referencia vino de Gemini (BAJA, sin ID).

### 5.2 Frase del coach y palabras a cuidar (REG-A3-19, MEDIA)

Umbrales (≥ 90 muy buena · ≥ 80 buena · ≥ 60 «se te entiende» · < 60 «necesita práctica»; palabra floja si
`Mispronunciation`/`Omission` o precisión < 70; fonema si < 70) son razonables para un A2–B1 con Azure (las notas
habituales de un hispanohablante están entre 60 y 85). Lo que falta es **pedagogía**:

1. **El fonema sale en IPA crudo** («Cuida «think» (el sonido /θ/)», chip «/ɪ/»): un A2 no lee IPA. Propuesta: una
   tabla corta de consejos en español para los fonemas que más fallan a un hispanohablante, usada en
   `pronunciationLine()` y como `title` del chip:

   | Fonema (IPA de Azure) | Consejo |
   |---|---|
   | ɪ | «i» corta y relajada, casi «e»: *ship*, no *sheep* |
   | iː | «i» larga y tensa: *sheep* |
   | v | dientes de arriba sobre el labio de abajo; no es «b» (*very*, no *berry*) |
   | θ / ð | lengua entre los dientes: la «z» de España (*think*) / una «d» muy suave (*this*) |
   | ʃ / tʃ | «sh» como para pedir silencio (*she*) / «ch» (*cheese*) |
   | z | «s» con zumbido, haciendo vibrar la garganta (*is*, *zoo*) |
   | ə | vocal débil y neutra, casi no suena (*about*, *the*) |
   | æ / ʌ | entre «a» y «e», boca abierta (*cat*) / «a» corta y relajada (*cup*) |
   | h | «j» muy suave, solo aire (*house*) |
   | dʒ / j | «y» fuerte, como «ll» rioplatense (*job*) / «i» suave (*yes*) |
   | ɹ / ɝ | «r» sin vibrar, la lengua no toca nada (*red*, *bird*) |
   | ŋ | «n» de *-ing* al fondo de la boca, sin «g» final fuerte |

2. **Casos típicos que se pueden detectar con lo que ya da Azure:** palabra que empieza por *s* + consonante (*sp, st,
   sk, sm, sn, sl, sw*) con /s/ floja → «no digas «es-»: empieza directamente con la s (*Spain*, no *Espain*)»;
   verbo en *-ed* con /t/ o /d/ final flojo → «la -ed suena /t/ o /d/, sin sílaba de más (*worked* = una sílaba)»;
   consonante final omitida (*Omission* o fonema final < 50) → «no te comas el final (*last*, *friends*)».
3. **Palabras de función primero:** `weakWords` ordena por precisión y suele sacar *a, the, of, to, and* (las vocales
   débiles puntúan bajo y no son prioritarias). Propuesta: penalizar estas 10–15 palabras salvo `Omission`, y preferir
   palabras de contenido.
4. Tono: «Tu pronunciación necesita práctica.» → «Vamos a pulir unos sonidos.» (más alentador; BAJA).

Esbozo (`pronunciation.ts`, nuevo):

```ts
const TIP_ES: Record<string, string> = { 'ɪ': '«i» corta y relajada, casi «e»: ship, no sheep', 'v': 'dientes sobre el labio de abajo; no es «b»', /* … tabla de arriba */ }
const FUNCTION_WORDS = new Set(['a', 'an', 'the', 'of', 'to', 'and', 'or', 'in', 'on', 'at', 'for', 'is', 'are', 'it', 'i'])
export function soundTipEs(word: string, phoneme?: string): string | undefined {
  const w = word.toLowerCase()
  if (phoneme === 's' && /^s[ptkmnlw]/.test(w)) return 'no digas «es-»: empieza directamente con la s'
  if ((phoneme === 't' || phoneme === 'd') && /ed$/.test(w)) return 'la -ed suena /t/ o /d/, sin sílaba de más'
  return phoneme ? TIP_ES[phoneme] : undefined
}
```

### 5.3 `speechLang` (REG-A3-13, REG-A3-14)

Se aplicó `splitByLanguage` a la explicación de los 90 temas (resumen + párrafos, lo que lee el ▶ de «Explícame») y
se cruzaron los tramos con el vocabulario inglés y español del propio catálogo. Casos mal partidos (antes → con la
propuesta), todos comprobados ejecutando las dos versiones:

| Texto del catálogo | Ahora | Con `speechLang-propuesta.ts` |
|---|---|---|
| «Actually» no es «actualmente», «embarrassed» no es «embarazada» | «actualmente», «embarazada» en voz inglesa | en español |
| «Soy ingeniero» = «I'm an engineer» | «Soy ingeniero» en inglés | «Soy ingeniero» en español |
| Estructura: «If + presente simple, will + verbo» | todo en inglés | «presente simple» y «verbo» en español |
| Y por qué «me levanto» no lleva «myself» | «me levanto» en inglés | en español |
| En español decimos «no vi nada» o «no vino nadie» | en inglés | en español |
| «cualquier», «pocos / poco», «hubiera», «quisiera», «su», «cuyo», «aunque», «sin embargo», «porque» | en inglés | en español |
| Although, however, despite… | «Although» y «despite» en español | en inglés |
| Just = acabo de; already = ya | «already» en español | en inglés |
| …nobody, no one / not … anybody | «nobody, no» en español, «one» en inglés | todo en inglés |
| edad (old, new) | «old» en español | en inglés |
| Con «to»: want, need, decide, hope, plan, promise, agree, refuse | 7 cambios de voz; «refuse» en español | un solo tramo inglés |
| at the bus stop / María and her husband | 3 tramos / «and» y «husband» en español | un tramo inglés / «and her husband» en inglés |
| no uses «wish» | «uses» en inglés | en español |

Quedan dos casos difíciles sin arreglar (aceptables): «color (red)» se lee en español porque *red* está entre español,
y «sensible» dentro de «(sensible = sensitive)» es español leído en inglés. `tests/speechLang.test.mjs` (4 tests) pasa
con la propuesta; se recomienda añadirle estos 13 casos como pruebas. Nota: el ▶ de «Explícame» es el único uso de
`splitByLanguage`; ver REG-A3-04 para usarlo también en la respuesta del profe de la clase de Gramática.

## 6. Qué probar en el teléfono (para el orquestador, 5.8/5.9/5.11)

- 5.8: clase de un tema con la tarea «¿cómo dirías…?»: ¿cómo suena la frase española? (REG-A3-04). ¿Acaba con una tarea
  o con una pregunta abierta? ¿Pide «más detalles» a una respuesta corta? (REG-A3-03).
- 5.9: ▶ de «Explícame» en Falsos amigos («actualmente», «embarazada») y en Condicionales («If + presente simple»).
- 5.10: fallar `can-cant-2` y mirar la frase con ▶ y la tarjeta del Repaso (REG-A3-01).
- 5.11: «Dilo tú» con un error fuera de la estructura (p. ej. sin -s): no debería salir «¡Correcto!» (REG-A3-16).

## 7. Resumen (10 líneas)

1. Revisados los 90 temas y 667 ejercicios completos: contenido de calidad alta, 0 reglas falsas; validador OK.
2. GO condicionado del contenido: aplicar antes del release REG-A3-01 y REG-A3-02 (ALTA).
3. REG-A3-01: `fullSentence()` enseña, lee y guarda en el Repaso la pista «(can, negativa)» y prefijos en español (94 ejercicios); arreglo de 5 líneas probado.
4. REG-A3-02: `in-case-vs-if-8` crea una tarjeta «en inglés» con respuesta en español.
5. 15 *order* con otra colocación válida y 4 *gap* con otra respuesta válida (MEDIA): `alsoAccepted` + pistas.
6. Contenido: 1 traducción que invierte el sentido (its-time), 1 *choice* con dos válidas, explicaciones y US/UK menores.
7. Prompts: el brief P3/P3b es bueno pero no anula 3 reglas del base; la frase española de la tarea se oye con voz inglesa.
8. Proponer `important` en las correcciones (cumple P3b y UX-02) y coherencia `reply`↔`corrections` también fuera de Gramática.
9. Fonética: referencias correctas en clase/Repaso/«Dilo tú»/test; faltan consejos en español para /ɪ/, /v/, /θ/, /ʃ/, schwa, -ed, s inicial.
10. `speechLang`: 13 casos mal partidos corregidos en `speechLang-propuesta.ts` (los tests actuales pasan). Todo en `evidencia/A3/`.
