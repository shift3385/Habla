# 5.10 «Gramática» — estado (fuente de verdad del avance)

> Si se corta la sesión: abre Claude Code en `D:\My Apps\HABLA` y escribe
> `Lee docs/v5.10/ESTADO.md y continúa la 5.10 (Gramática).`

Diseño aprobado: `DISENO-gramatica.md` · Formato del contenido: `FORMATO-contenido.md` · Reglas: `docs/correccion/REGLAS.md`.
Sin commit ni push hasta que el dueño lo apruebe.

| ID | Tarea | Agente | Estado | Notas |
|---|---|---|---|---|
| G-A | Contenido: tenses, negatives-questions (27 temas) | autor A | hecho | 27 temas, 199 ejercicios; validate-grammar OK, sin coincidencias con src/bank |
| G-B | Contenido: modals, verbs, wishes-advice (29) | autor B | hecho | 29 temas, 204 ejercicios; validate-grammar OK, sin coincidencias con src/bank |
| G-C | Contenido: conditionals, passive, reported-speech, articles-quantifiers (19) | autor C | hecho | 19/19 temas, 144 ejercicios (conditionals 8·60, passive 3·23, reported-speech 3·22, articles-quantifiers 5·39); validate-grammar OK; no falta ningún tema |
| G-D | Contenido: prepositions, word-order-linkers, false-friends-pronouns (15) | autor D | hecho | 15/15 temas, 120 ejercicios. prepositions: prepositions-of-time, prepositions-of-place, for-since-during-ago, by-until, verb-prepositions. word-order-linkers: basic-word-order, adverbs-of-frequency, comparatives-superlatives, order-of-adjectives, as-as-the-more, relative-clauses, linking-words. false-friends-pronouns: subject-object-possessive-pronouns, reflexive-pronouns, common-false-friends. Falta: nada; validate OK en sus 3 archivos, 0 coincidencias con src/bank |
| G-V | Revisión experta del contenido | revisor de contenido | pendiente | tras cada autor |
| D1 | Validador, catálogo, pestaña, sección, tema, buscador, progreso (Dexie + copias), ejercicios → Repaso | dev | para revisar | Hecho y probado en navegador (390×844, 320×640, 780×360); detalle en `docs/correccion/NC-v5.10.md`, capturas en `docs/v5.10/evidencia-D1/`. tsc OK, lint 0 errores, `npm test` 59/59. **El validador encuentra 3 frases del banco reutilizadas en tenses/verbs (ver NC-v5.10 §D1.1)** |
| D2 | «Dilo tú» (Gemini + fonética + meta diaria) y «Pregúntale a <mascota>» (+ punto 0: barajar opciones) | dev | a medias (PAUSA) | Código escrito y compila; **sin probar en navegador ni tests propios**. Ver «Punto exacto de D2/D3» |
| D3 | Clase y profe: `grammarTopic` en correcciones, clase centrada en un tema, plan e informe; «Para ti» | dev | a medias (PAUSA) | Hecho: esquema del profe, clase centrada, enlace del plan, «Para ti» con señales, hoja de Gramática en App. Falta: CorrectionView, ReportView, tests, navegador. Ver «Punto exacto de D2/D3» |
| R | Revisión en PC (código, navegador, red falsa) | rev | pendiente | |
| E | Entrega: 5.10/38, Novedades, docs, APK | orquestador | pendiente | |

## Punto exacto de D2/D3 (pausa del 2026-10-09)

Estado del código: `npx tsc -b` sin errores · `npm test` 59/59 · lint 0 errores (el aviso de `Conversation.tsx:298` ya existía).
`validate-grammar`: 4 errores de reutilización del banco en `passive.json` y `reported-speech.json` (autor C, en curso; no los toca dev).

**Hecho (escrito y compila, sin probar en navegador):**
- Punto 0 · barajar: `shuffleChoice(ex, seed)` en `src/lib/grammar.ts` (mulberry32 con semilla = id del ejercicio + ronda);
  `GrammarExercises.tsx` guarda `seed` por ronda (cambia en «Otra ronda") y usa `choice.options/answer/trapsEs`.
  Las tarjetas del Repaso no muestran opciones (solo enunciado): nada que barajar ahí.
- D2 «Dilo tú»: `src/components/GrammarSpeak.tsx` (patrón ReviewScreen 5.9.1: `begin/finish`, `isEmptyRecording` +
  `distrustMic`, 60 s, `addPracticeSeconds`, `runPhonetics` con referencia = transcripción, `PhoneticsToggle`, «Otro reto»);
  evaluación `evaluateSpeaking` en `src/lib/grammarAi.ts`; progreso `recordSpeaking` en `grammarProgress.ts`
  (campos `spoken`/`spokenOk` en `GrammarProgress`, `db.ts`, y opcionales en `backupCheck.ts`). Pestaña «Dilo tú» en
  `GrammarTopicScreen.tsx` (oculta si `inClass`).
- D2 «Pregúntale»: `src/screens/GrammarAskScreen.tsx` + `askMascot` (`grammarAi.ts`, `fastModels`, lista id+nombre del
  catálogo, ids validados con `validTopicId`). Se abre desde el tema (botón bajo «Hacer los ejercicios») y desde el
  buscador (`GrammarPanel`, botón «Pregúntale a <mascota> · «consulta»»). Navegación por pila: `src/components/GrammarRoutes.tsx`
  (rutas `section` / `topic` / `ask`), usada por `Home.tsx` y por la hoja.
- D3 corrección → tema: `teacher.ts` (campo `grammar_topic` obligatorio en el esquema, lista compacta de ids en el prompt
  con `topicIdsForPrompt`, se guarda solo si `validTopicId`); `Correction.grammarTopic` en `db.ts` (llega a `mistakes`);
  `backupCheck.ts` acepta `grammarTopic` en correcciones, errores y sesiones.
- D3 clase centrada: escenario oculto `grammar` (`scenarios.ts`), `grammarBrief(topic)` (`grammar.ts`), prop
  `grammarTopic` en `Conversation.tsx` (brief, título, tarjeta «Gramática · nivel», sesión y clase guardada), `SavedClass.grammarTopic`,
  `App.tsx` (`startGrammar`, `Lesson.grammarTopic`, reanudar), botón «Practicar en una clase» en el tema (`onStartGrammar` de Home).
- D3 plan: `topicForText` / `topicForLesson` (`grammar.ts`; frase más larga, empate = sin enlace); chip «📘 tema» en
  `PlanCard.tsx` (misma fila que Empezar) → abre el tema en Gramática.
- D3 «Para ti»: `forYouTopics(level, progress, limit, signals)` (error con tema exacto +3, categoría +0,5 hasta 2, plan +5,
  nivel +1 / siguiente +0,5; sin dominados) y `loadForYouSignals()` (`grammarProgress.ts`: errores de 60 días + tema del plan),
  usados en `GrammarPanel` y `GrammarSectionScreen`.
- Hoja global: `src/lib/grammarLink.ts` (`openGrammarTopic(id)`) + `src/components/GrammarSheet.tsx` (portal con pila
  propia, `inClass`), montada en `App.tsx` (`gramSheet`, Atrás de Android pasa primero por `sheetBack`).

**A medias / falta, en este orden:**
1. `src/components/CorrectionView.tsx`: si `c.grammarTopic` y `findTopic` existe, mostrar «📘 Ver en Gramática: <name>»
   (botón con `e.stopPropagation()` y `openGrammarTopic(id)`). Cubre la clase y el informe a la vez.
2. `src/components/ReportView.tsx`: tarjeta «Para repasar en Gramática» con `topicsOfCorrections(p.corrections)`
   (`grammar.ts`, ya escrita) → chips que llaman a `openGrammarTopic`.
3. Tests en `tests/grammar.test.mjs`: `shuffleChoice` (estable con la misma semilla, la correcta sigue siendo la misma
   opción, cambia con otra semilla, reparte posiciones), `topicForText`/`topicForLesson` (coincide, empate → nada),
   `forYouTopics` con señales, `validTopicId`, `grammarBrief`, `topicsOfCorrections`; en `tests/backupCheck.test.mjs`,
   corrección con `grammarTopic` y `grammar` con `spoken`.
4. Navegador (`preview_start habla-dev`, `gram.localhost:5173`, 390×844 / 780×360 / 320×640) con red falsa: interceptar
   `fetch` a `generativelanguage.googleapis.com` y responder según el esquema pedido (`generationConfig.responseJsonSchema`):
   «Dilo tú» (transcript/verdict/feedback_es; micro falso como `docs/auditoria/resultados/B3/arnes/instr.js`), «Pregúntale»
   (answer_es/examples/topics, incluido un id inventado que no debe salir) y una clase «Practicar en una clase» cuyas
   correcciones traigan `grammar_topic` (comprobar el prompt del sistema con la lista de ids y el brief, el enlace «📘»
   en la corrección y el informe, la hoja encima de la clase y Atrás). Comprobar también el chip del plan y «Para ti».
5. Documentar en `docs/correccion/NC-v5.10.md` (secciones D2 y D3) y pasar D2/D3 a «para revisar».

## Bitácora (lo último arriba)
- 2026-10-09 · autor C: escritos `conditionals.json` (8 temas, afirmativa/negativa/pregunta en cada uno), `passive.json` (3), `reported-speech.json` (3) y `articles-quantifiers.json` (5): 144 ejercicios; `validate-grammar` 0 errores; retocadas 4 frases que el validador cruzaba con el banco del test.
- 2026-10-09 · dev: PAUSA en D2/D3 (orden del orquestador). Código compila, tests 59/59; pendiente CorrectionView, ReportView, tests nuevos y prueba en navegador (ver «Punto exacto de D2/D3»).
- 2026-10-09 · autor D: escritos `prepositions.json` (5 temas, 40 ejercicios), `word-order-linkers.json` (7, 56) y `false-friends-pronouns.json` (3, 24); `validate-grammar` sin errores en esos archivos y 0 coincidencias con `src/bank` (script propio con ejemplos, errores, frases ordenadas y modelos). Los 4 errores actuales del validador son de `passive.json` y `reported-speech.json` (autor C). Ids `adverbs-of-frequency`, `for-since-during-ago`, `by-until` y `verb-prepositions` ya existen.
- 2026-10-09 · dev: D1 terminado → para revisar. Pestaña Gramática, sección, tema (Explícame + Ejercicios), presentación de la mascota, tarjetas al Repaso; validador mejorado (banco: pistas entre paréntesis, huecos y subcadenas; ejemplos, order, modelEn y errores típicos). Contenido actual: 3 errores de reutilización del banco para los autores.
- 2026-10-09 · autor A: escritos `tenses.json` (17 temas, 125 ejercicios) y `negatives-questions.json` (10 temas, 74 ejercicios); `validate-grammar` sin errores y 0 coincidencias con `src/bank` (comprobadas también ejemplos, errores y modelos). `related` externos aún sin escribir: adverbs-of-frequency, for-since-during-ago, by-until (autor D), first-conditional, reported-statements, reported-questions, some-any (autor C).
- 2026-10-09 · autor B: escritos `modals.json` (12 temas), `verbs.json` (9) y `wishes-advice.json` (8): 204 ejercicios; `validate-grammar` sin errores (avisos solo por `related` a secciones aún sin escribir: second/third-conditional, contractions, short-answers, some-any, countable-uncountable-nouns, verb-prepositions).
- 2026-10-09 · dev: D1.3 progreso: Dexie v4 tabla `grammar` (solo aditiva), `src/lib/grammarProgress.ts`, `addGrammarCard` en srs.ts, tabla opcional en `backupCheck.ts` (+ prueba), ajuste `grammarIntroSeen`, Repaso con etiqueta «ejercicio de Gramática».
- 2026-10-09 · dev: D1.2 catálogo `src/lib/grammar.ts` (glob de `src/grammar/*.json`, índices, `searchTopics`, comprobación de ejercicios, id numérico de tarjeta FNV-1a, criterio de dominado, «Para ti» por nivel) con 12 pruebas.
- 2026-10-09 · dev: D1.1 `scripts/validate-grammar.mjs` listo (errores con código 1, avisos para `related` e iconos; compara con los `prompt` del banco). Icono `clock` añadido.
- 2026-10-09 · orquestador: diseño aprobado; lanzados autor A, autor B y dev (D1).

## ▶ CÓMO CONTINUAR (2026-10-09, pausa por límite de uso) — rama `v5.10-gramatica`
- Contenido: A, B y D **hechos**. C (conditionals, passive, reported-speech, articles-quantifiers) se detuvo al pausar: comprobar con `node scripts/validate-grammar.mjs` qué temas existen y completar los que falten según `DISENO-gramatica.md` §2.6–2.9 (corregir las frases que coincidan con el banco del test).
- Código: D1 hecho; D2/D3 escritos y compilando, **sin probar** (ver «Punto exacto de D2/D3»). Falta por orden: «📘 Ver en Gramática» en `CorrectionView`, tarjeta en `ReportView`, tests, navegador (390×844, 780×360, 320×640, red falsa), `NC-v5.10.md`.
- Después: revisor experto del contenido (dudas anotadas por los autores en la Bitácora y en este archivo), revisión en PC (`rev`), entrega 5.10/build 38 (version.json, entrada 5.10 en `changelog.ts`, docs) y APK en el PC del dueño.
- Prompt: `Lee docs/v5.10/ESTADO.md y continúa la 5.10 (Gramática) en la rama v5.10-gramatica.`
