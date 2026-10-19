# 5.10 · Observaciones de uso real del dueño (2026-10-19) — plan y avance

> **Para continuar en otra sesión:** rama `claude/peaceful-fermi-ua55yq` (= `v5.10-gramatica` + lo de aquí).
> Escribe: `Lee docs/v5.10/PLAN-uso-real.md y continúa por el primer punto que no esté «hecho».`
> Cada punto se sube en su propio commit. Comprobar siempre: `npx tsc -b`, `npm run lint` (0 errores), `npm test`,
> `node scripts/validate-grammar.mjs`.

| # | Punto del dueño | Plan | Estado |
|---|---|---|---|
| P1 | Sección de **fonemas del inglés** (referencia: reel de Instagram `DenIef3B8mf`) | No ahora: anotado en `BACKLOG.md` §4.5 | anotado |
| P6 | **GRAVE.** Tras «¿Qué digo?», al grabar, la transcripción sale igual a una de las ideas y no lo que dijo | Ver «P6 · diagnóstico». Arreglo defensivo en `Conversation.tsx` + instrucción en `teacher.ts` + prueba | **hecho** (sin probar en el teléfono) |
| P3 | Clase de Gramática («Practicar en una clase») demasiado libre: debe centrarse en la regla, explicar, pedir «¿cómo dirías…?», «¿qué falta?», completar | Reescribir `grammarBrief()` (`src/lib/grammar.ts`) como guion de clase dirigida + test | **hecho** (probar una clase real) |
| P5 | Una corrección puede tocar **varios temas** (p. ej. «in my breakfast» → «for breakfast»: preposiciones de tiempo y for/since/during/ago); solo enlazaba uno | Esquema del profe `grammar_topics` (lista, máx. 3) y `Correction.grammarTopics`; compatibilidad con `grammarTopic`; `CorrectionView` y el informe muestran todos; copias | **hecho** (probar con una clase real) |
| P4 | Las burbujas de explicación de Gramática no tienen ▶ | Botón ▶/⏸ en las burbujas de «Explícame»; el texto es español → `speak` con voz española (`lang` es-ES) | **hecho** (oír en el POCO que la voz española existe) |
| P2 | Bajar el volumen de la música de otras apps al reproducir audio o al grabar | Foco de audio de Android: `requestAudioFocus` (TRANSIENT_MAY_DUCK al hablar el profe; TRANSIENT al grabar) en `AudioRoutePlugin.java` + puente `audioRoute.ts`. **Java: solo se puede compilar y probar en el PC** | pendiente |

## P6 · diagnóstico (2026-10-19)
- El texto de las ideas **no** viaja en la petición del profe (`teacherTurn` manda historial + audio + `AUDIO_INSTRUCTION`), y las ideas se ocultan al empezar a grabar (`onPress` → `setIdeas(null)`).
- Hipótesis, de más a menos probable:
  1. **La voz del teléfono leyendo la idea entra en la grabación**: tocar una idea la lee con TTS (`speak`); si el motor de voz de Android tarda en arrancar y el micro se abre a la vez, la voz de la idea suena por el altavoz mientras grabas. Gemini transcribe esa voz (clara) en vez de la tuya → transcripción idéntica a la idea.
  2. **Alucinación** con audio pobre (p. ej. auriculares desconectados, E3 de la 5.9.1): con la misma pregunta del profe, Gemini «inventa» una respuesta típica, parecida a una idea.
- Arreglo previsto: (a) al tocar el micro, cortar cualquier lectura y **no abrir el micro hasta que el TTS haya parado** (y no leer ideas mientras se graba o se abre el micro); (b) si la transcripción coincide casi palabra por palabra con una idea mostrada, avisar «¿Leíste la idea? Si no, repite» en vez de corregir como si lo hubieras dicho; (c) reforzar `AUDIO_INSTRUCTION`: transcribir solo la voz del alumno, ignorar voces sintéticas o de fondo.
- Pregunta pendiente al dueño (no bloquea): ¿tocaste la idea para oírla justo antes de grabar? ¿llevabas auriculares?

## Bitácora (lo último arriba)
- 2026-10-19 · P4 hecho: `speak(…, lang)` y `toggleSpeakSpanish()` en `tts.ts`; botón ▶/⏸ arriba a la derecha de la burbuja de «Explícame» (`GrammarTopicScreen.tsx`) que lee resumen + explicación en español. Visto en Chromium. Si el teléfono no tiene voz española instalada, Android usa la que tenga.
- 2026-10-19 · P5 hecho: esquema del profe `grammar_topics` (1–3, el más relevante primero; el prompt pone el ejemplo «in my breakfast»); `grammarFields()` valida y guarda `grammarTopics` + `grammarTopic` (compatibilidad); `topicIdsOf()`; `CorrectionView` enseña un «📘» por tema; informe y «Para ti» cuentan todos; copias aceptan `grammarTopics`. 67/67.
- 2026-10-19 · P3 hecho: `grammarBrief()` = clase dirigida (anula el estilo «charla con un amigo»): recuerda la regla, rota tareas (¿cómo dirías…?, completa, ¿es correcta?, negativa/pregunta, y al final preguntas personales), explica el porqué de cada fallo con la regla. Incluye resumen, ejemplos y errores típicos del tema.
- 2026-10-19 · P6 hecho: (a) `onPress` espera 400 ms tras parar la voz si sonaba algo; (b) `echoesIdea()` (`teacher.ts`): si la transcripción es solo una idea mostrada, no se corrige ni se guarda y se pide grabar otra vez; (c) `AUDIO_INSTRUCTION` pide ignorar voces sintéticas. `tests/teacher.test.mjs` (66/66). Falta comprobarlo en el POCO (tocar una idea y grabar en seguida).
- 2026-10-19 · Plan escrito. P1 anotado en `BACKLOG.md`.
