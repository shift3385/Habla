# Habla 5.10 «Gramática» — desarrollo y comprobaciones

Versión: 5.10 (build 38, pendiente de la entrega). Diseño aprobado: `docs/v5.10/DISENO-gramatica.md`; contrato del
contenido: `docs/v5.10/FORMATO-contenido.md`; avance: `docs/v5.10/ESTADO.md`. Sin commit hasta que el dueño lo apruebe.

## Resumen

| # | Qué | Tipo | Archivos |
|---|---|---|---|
| D1.1 | Validador del contenido de Gramática | Nuevo | `scripts/validate-grammar.mjs`, `CLAUDE.md` (comprobaciones) |
| D1.2 | Catálogo, buscador, comprobación de ejercicios, «Para ti» por nivel | Nuevo | `src/lib/grammar.ts`, `tests/grammar.test.mjs`, `tests/fixtures/grammar/*.json` (muestra, no se carga en la app) |
| D1.3 | Progreso (Dexie v4 `grammar`), copias de seguridad, tarjetas del Repaso `source: 'grammar'` | Nuevo | `src/lib/db.ts`, `src/lib/grammarProgress.ts`, `src/lib/srs.ts`, `src/lib/backupCheck.ts`, `tests/backupCheck.test.mjs`, `src/screens/ReviewScreen.tsx` |
| D1.4 | Pestaña «Gramática» del Inicio, sección, tema (Explícame + Ejercicios), presentación de la mascota | Nuevo | `src/screens/Home.tsx`, `src/components/GrammarPanel.tsx`, `src/components/GrammarTopicRow.tsx`, `src/components/GrammarExercises.tsx`, `src/screens/GrammarSectionScreen.tsx`, `src/screens/GrammarTopicScreen.tsx`, `src/lib/settings.ts` (`grammarIntroSeen`), `src/ui/icon-paths.ts` (`clock`, `search`, `close`) |

## D1.1 · Validador (`node scripts/validate-grammar.mjs [archivo|carpeta]`)

Sin argumentos valida `src/grammar/*.json`; sale con código 1 si hay errores. **Errores:** JSON inválido; campos
obligatorios y tipos; id de sección = nombre del archivo; `order` entero y único; niveles A1–C2; categorías válidas; ids
de tema kebab-case y únicos en todo el catálogo; ids de ejercicio `<tema>-<n>` únicos; 6–8 ejercicios, 4–6 ejemplos,
2–4 errores típicos, 2–3 retos de habla, 2–4 párrafos; `forms` con las tres formas (o `null`) y 1–2 ejemplos;
`choice` con 4 opciones distintas, `answer` en rango y `trapsEs` de la misma longitud con `""` solo en la correcta;
`gap` con hueco y tantas partes (« / ») como huecos; `order` con `answer` = exactamente las palabras de `words` y sin
punto final; colisión del id numérico de tarjeta; frases que **coinciden con el banco del test**.
**Avisos:** `related` hacia un id que no existe (sección aún sin escribir), icono inexistente, párrafo > 350 caracteres,
`words` ya ordenadas, frase que contiene (o está dentro de) un enunciado del banco.

Comparación con el banco (mejorada a petición del autor B): se quitan las pistas entre paréntesis, mayúsculas,
apóstrofos curvos y puntuación; un hueco `____` vale 1–4 palabras en los dos sentidos («Have you ever ____ sushi?» =
«Have you ever eaten sushi?»). Se comparan enunciados, ejemplos, `forms.*.examples`, frases de `order`, `modelEn` y la
frase correcta de los errores típicos. Igualdad → error; una dentro de otra → aviso (frases del banco de < 3 palabras o
< 12 caracteres no cuentan). Índice por palabras: el catálogo entero se valida en ~0,5 s.

**Estado del contenido (2026-10-09, 5 archivos, 56 temas, 403 ejercicios): 3 errores para los autores**
- `tenses.json › present-perfect › forms.question[0]` «Have you ever eaten sushi?» ≈ banco «Have you ever ____ sushi?»
- `tenses.json › present-perfect › commonMistakes[0]` «I have lived here since 2015.» ≈ banco «I ___ here since 2015.»
- `verbs.json › make-vs-do › examples[1]` «We need to make a decision before Friday.» ≈ banco «We need to ____ a decision before Friday.»

Además (para el revisor de contenido): en `past-simple` las 3 preguntas de elegir tienen la respuesta en la opción 0;
la app no baraja las opciones, así que conviene repartir la posición de la correcta.

## D1.2 · Catálogo (`src/lib/grammar.ts`, módulo puro)

- Tipos del FORMATO; carga con `import.meta.glob('../grammar/*.json', { eager: true })`, secciones ordenadas por
  `order`; índices `topicById`, `sectionById`, `sectionOfTopic`; `findTopic`, `findSection`, `sectionOf`, `allTopicIds`
  (lista para D3), `setCatalog` (solo pruebas).
- `searchTopics(q)`: sin tildes ni mayúsculas; cada palabra debe aparecer en el nombre (inglés o español), las
  palabras clave o el resumen; puntúa nombre (100 si empieza la palabra, 70 si la contiene) > palabras clave (40/30) >
  resumen (10), +50 si la búsqueda entera está seguida en el nombre; a igualdad, orden del catálogo.
- Ejercicios: `checkExercise` (choice por índice; gap por hueco, insensible a mayúsculas, apóstrofos y punto final, con
  respuestas alternativas; order por orden exacto), `fullSentence` (frase completa: huecos rellenos sin las pistas
  «(learn)», «?» en las de `order` que empiezan como pregunta) y `cardPrompt`.
- **Id numérico de la tarjeta** (`exerciseCardId`): FNV-1a de 32 bits del id del ejercicio. Es estable (no depende del
  orden de archivos o temas: añadir contenido no cambia ninguna tarjeta ya creada), cabe en el índice único
  `[source+sourceId]` con `sourceId` numérico, y es la misma función en el validador, que comprueba que no hay colisiones
  en el catálogo (las pruebas comprueban que las dos coinciden).
- **Criterio de «dominado»** (`isMasteryRound`): una ronda = todos los ejercicios del tema una vez; cuenta el primer
  intento. Dominado = **≥ 80 % en la última ronda completa** (6 ej. → 5; 7 → 6; 8 → 7). Una ronda peor lo quita (vuelve a
  «visto»): el estado dice cómo estás ahora. Estados: nuevo (nunca abierto) · visto · dominado.
- **«Para ti» (D1)** `forYouTopics(nivel, progreso)`: temas de tu nivel de gramática del perfil y del siguiente, no
  dominados; primero los de tu nivel y los empezados. D3 añadirá tus errores de clase y la lección del plan.

## D1.3 · Progreso, copias y Repaso

- **Dexie v4** (`db.ts`): tabla nueva `grammar: 'id, lastAt'` (clave = id del tema; `seenAt`, `lastAt`, `correct`,
  `attempts`, `rounds`, `lastRound {correct,total,at}`, `mastered`, `masteredAt`). Migración **solo aditiva**: las
  tablas anteriores no cambian. `TABLES` la incluye, así que entra en «Exportar» y en la importación (todo o nada).
- `grammarProgress.ts`: `markTopicSeen`, `recordAnswer` (acumula y, si fallas, crea la tarjeta), `finishRound`
  (decide dominado), `loadGrammarProgress`.
- **Tarjetas** (`srs.ts`, `addGrammarCard`): `source: 'grammar'`, `sourceId = exerciseCardId`, `promptEs` = el
  enunciado en inglés (o las palabras desordenadas), `answerEn` = la frase completa, `hintEs` = «tema: por qué».
  Idempotente: fallar otra vez el mismo ejercicio no la duplica; si la archivaste con «Ya me la sé», sigue archivada.
  `evaluateDrill` explica a Gemini que en estas tarjetas se ve un ejercicio en inglés y hay que decir la frase completa.
  El Repaso las rotula «ejercicio de Gramática» y «Di la frase completa en inglés».
- **Copias** (`backupCheck.ts`): `grammar` es tabla **opcional** (las copias de la 5.9 y anteriores se aceptan y la
  importan vacía); si viene, se comprueba cada fila (id de texto, números, `mastered` booleano, `lastRound`). Las tarjetas
  aceptan `source: 'grammar'`. `BACKUP_VERSION` sigue en 1: una copia de la 5.10 con tarjetas de Gramática la rechaza una
  5.9 («dañado, no se cambió nada»); no se pierde nada y basta con actualizar.

## D1.4 · Pantallas

- **Inicio → pestaña «Gramática»** (tercera del `Segmented`, con el nº de secciones): buscador, fila «⭐ Para ti» (una
  línea con scroll horizontal propio) e `InfiniteList` de secciones (icono, título en español, título en inglés, nº de
  temas y «n ✓» dominados). Con texto en el buscador la lista pasa a ser de temas (con su sección).
- **Sección**: cabecera con icono y descripción; `InfiniteList` de temas: `name` (título), `nameEs`, nivel, estado,
  ⭐ si es para ti y ▶/⏸ del primer ejemplo (`SpeakIcon` + `toggleSpeak`, pieza común de la 5.9.1).
- **Tema**: «Explícame» (globo de la mascota con resumen y explicación, «Cómo se forma» +/−/? con ejemplos ▶/⏸,
  «Ejemplos» con traducción y nota, «Errores típicos» tachado → correcto ▶/⏸ + porqué, «Relacionado» navegable) y
  «Ejercicios» (elegir, completar con un campo por hueco, ordenar tocando palabras). Al fallar, la mascota explica la
  opción elegida (`trapsEs`) y la regla (`whyEs`), con ▶/⏸ de la frase correcta; la explicación se desplaza a la vista
  sin quedar bajo la barra. Al terminar: aciertos, dominado o cuánto falta, cuántos ejercicios fueron al Repaso, «Otra
  ronda» y «Ver la explicación». «Dilo tú», «Pregúntale a <mascota>» y «Practicar en una clase» **no se muestran** aún (D2/D3).
- **Navegación**: pila de pantallas en el Inicio (sección → tema → relacionado…); el botón Atrás de la pantalla y el de
  Android (`registerBack`) vuelven a la anterior; con la presentación abierta, Atrás vuelve a «Temas».
- **La mascota explica la primera vez** (MascotPage a pantalla completa, ajuste `grammarIntroSeen`): «¡Vamos!» o
  «Ahora no» (vuelve a Temas y se volverá a explicar).

## Cómo se probó

- `npx tsc -b` OK · `npm run lint` **0 errores** (8 avisos antiguos de `src/`, ninguno en archivos nuevos) ·
  `npm test` **59/59** (nuevas: 14 en `tests/grammar.test.mjs`, 1 en `tests/backupCheck.test.mjs`) ·
  `node scripts/validate-bank.mjs` OK · `node scripts/validate-grammar.mjs tests/fixtures/grammar` OK (2 avisos de
  `related`) · sobre el contenido real: 3 errores de reutilización del banco (arriba).
- Navegador (Vite `habla-dev`, origen aislado `gram.localhost:5173`, datos ficticios sembrados con
  `B7/arnes/seed7.js` con 2 sesiones, clave ficticia, sin llamadas a Gemini ni Azure), con el contenido real de los
  autores (de 3 a 5 secciones mientras se probaba). Capturas en `docs/v5.10/evidencia-D1/`:
  - 390×844: presentación de la mascota (01), pestaña con «Para ti» y secciones **sin scroll de página**
    (`scrollHeight` = `clientHeight` = 844) (02), buscador «deberia» → Should and Ought To / Past Modals (03),
    sección Tiempos verbales (04), tema Past Simple: explicación, formas, ejemplos, errores típicos y relacionados
    (05–07), ejercicios: elegir fallado con la trampa explicada (08), hueco fallado (09), ordenar (10), resultado 6/8
    «necesitas 7 de 8» (11), segunda ronda 8/8 → «¡Tema dominado!»; la sección muestra «Dominado» y el Inicio «1 ✓».
  - Repaso: las 2 tarjetas de Gramática aparecen con «ejercicio de Gramática», «Di la frase completa en inglés», pista y
    respuesta con ▶ (12). En IndexedDB: `grammar['past-simple']` = 14/16, 2 rondas, `lastRound` 8/8, dominado; tarjetas
    `sourceId` 1704479436 y 1738034674.
  - 320×640 (13, 14): con la lección del plan y el repaso en el Inicio, el panel queda en su mínimo y la página
    desplaza 814 px, igual que las pestañas Temas (800) y Prácticas (814) ya hoy: no es un cambio de la 5.10. Sin
    scroll horizontal. Ejercicio con la explicación desplazada a la vista sobre la barra.
  - 780×360 (15): horizontal con la barra lateral; ejercicios legibles, sin scroll horizontal.
  - Migración: una base `habla-migtest` creada con el esquema v3 (tarjeta + perfil) se abre con el v4 sin perder datos,
    acepta filas de `grammar` y el índice único rechaza una tarjeta de Gramática repetida (`ConstraintError`).
  - Copia: `buildBackup()` incluye `grammar` y las tarjetas de Gramática, sin claves; `parseBackup` la acepta (quitando
    2 errores con `turnId` vacío que fabrica el arnés `seed7.js` con 4 turnos por sesión: fallo del arnés, no de la app).

## Qué queda para el teléfono (revisor móvil)

- Pestaña Gramática en el POCO y en el Galaxy A11 horizontal: segmento de 3 (que «Gramática N» quepa), buscador con el
  teclado abierto (el panel se reajusta), «Para ti» con scroll horizontal táctil.
- ▶/⏸ de ejemplos y errores típicos con la voz del teléfono; tocar otro ▶ corta el anterior.
- Ejercicios de completar con el teclado de Android (autocorrección desactivada; mayúsculas y apóstrofo «’»).
- Botón Atrás de Android: tema → sección → Gramática; con la presentación abierta vuelve a Temas.
- Repaso: decir la frase completa de una tarjeta de Gramática y que Gemini la evalúe bien (`evaluateDrill` con el
  texto nuevo para `source: 'grammar'`).
- Actualizar desde la 5.9 con `adb install -r`: Dexie pasa a v4 sin perder datos; exportar e importar una copia.

## Preparado para D2/D3

- `allTopicIds()` (lista de ids para el esquema del profe), `findTopic`/`sectionOf`, `topic.classFocusEn` y
  `topic.speaking` tipados; `forYouTopics` como punto de entrada de «Para ti» (añadir errores y plan);
  `GrammarTopicScreen` tiene el `Segmented` de partes listo para añadir «Dilo tú» y los botones de «Pregúntale a
  <mascota>» y «Practicar en una clase»; `searchTopics` para el buscador de «Pregúntale».

---

## D2 · «Dilo tú» y «Pregúntale a <mascota>» (2026-10-09, sesión en la nube)

**Qué hay** (detalle de archivos en `docs/v5.10/ESTADO.md`, «Punto exacto de D2/D3»):
- **Punto 0 · barajar opciones:** `shuffleChoice(ex, seed)` (mulberry32, semilla = id del ejercicio + ronda). En el JSON la correcta solía ir primero.
- **«Dilo tú»** (pestaña del tema, oculta dentro de una clase): `GrammarSpeak.tsx` con el patrón del Repaso 5.9.1 (toca para hablar, 60 s, `isEmptyRecording`, fonética con la transcripción como referencia, suma a la meta). Evalúa `evaluateSpeaking` (`grammarAi.ts`) y guarda `spoken`/`spokenOk` (`grammarProgress.ts`, copias).
- **«Pregúntale»**: `GrammarAskScreen.tsx` + `askMascot` (modelo rápido, lista id + nombre del catálogo; solo se enseñan ids que existen). Se abre desde el tema y desde el buscador, con la búsqueda precargada.

**Arreglo encontrado al probar:** `GrammarAskScreen` marcaba `alive = false` al desmontar y nunca lo volvía a poner a `true`. En desarrollo (StrictMode desmonta y vuelve a montar) la respuesta no se pintaba nunca («está pensando…» para siempre). Ahora se marca al montar.

## D3 · Clase y profe

- El profe devuelve **`grammar_topic`** en cada corrección (lista compacta de ids en el prompt; se guarda solo si `validTopicId`). Llega a `mistakes` y a las copias.
- **«📘 Ver en Gramática: <tema>»** en cada corrección (`CorrectionView.tsx`: clase e informe a la vez), que abre la **hoja de Gramática encima** de lo que haya (`grammarLink.ts` + `GrammarSheet.tsx`, con `inClass`: sin «Dilo tú» ni «Practicar en una clase»).
- **Informe:** tarjeta **«Para repasar en Gramática»** con los temas de las correcciones (`ReportView.tsx`, `topicsOfCorrections`).
- **Clase centrada en un tema** («Practicar en una clase»): escenario oculto `grammar`, `grammarBrief(topic)` en el prompt, tarjeta «Gramática · nivel», se guarda en la sesión y en la clase a medias.
- **Plan:** chip «📘 tema» en la lección de hoy (`topicForLesson`: objetivo → foco de la semana → título; empate = sin enlace).
- **«Para ti» con señales:** errores con tema exacto (+3), categoría de respaldo (+0,5, hasta 2), tema del plan (+5), tu nivel (+1) y el siguiente (+0,5); sin los dominados.

## Cómo se probó D2/D3
- `npx tsc -b` OK · `npm run lint` 0 errores · `npm test` **65/65** (6 nuevas en `tests/grammar.test.mjs`: barajar, plan, ids válidos, brief, informe y «Para ti» con señales; `tests/backupCheck.test.mjs`: `spoken`/`spokenOk` y `grammarTopic` en correcciones, errores y sesiones, más dos casos dañados) · `node scripts/validate-grammar.mjs`: **12 secciones, 90 temas, 667 ejercicios, 0 errores, 0 avisos**.
- **Navegador** (Chromium headless + Vite, 390×844, 320×640 y 780×360). Gemini simulado que responde según el esquema de cada petición (`responseJsonSchema`) y guarda el prompt enviado; 0 llamadas reales. Capturas en `docs/v5.10/evidencia-D2D3/`.

| Caso | Resultado (igual en los 3 tamaños) |
|---|---|
| Buscador «debería» → «Pregúntale a Gota» | La pregunta llega precargada; respuesta en español con ejemplo ▶; el tema sugerido real sale como «📘 …» y el id inventado (`tema-inventado-xyz`) **no** sale |
| Tema «Presente perfecto» → «Dilo tú» | Reto 1 de 3; grabar y enviar → «¡Correcto!», el comentario y la forma modelo; los segundos suman a la meta (`habla.practiceSeconds`) |
| «Practicar en una clase» | Tarjeta «GRAMÁTICA · B1 Present Perfect»; el prompt del profe lleva el brief («Grammar-focused speaking lesson») y la lista de ids |
| Corrección con `grammar_topic: past-simple` | «📘 Ver en Gramática: Pasado simple…» → la hoja se abre encima de la clase (sin «Dilo tú» ni «Practicar»); Atrás → la clase sigue |
| Terminar | Informe con «Para repasar en Gramática 📘 Pasado simple…»; en la base de datos, `mistakes.grammarTopic = past-simple` y `sessions.grammarTopic = present-perfect` |
| Plan con «present perfect» en el objetivo de hoy | Chip «📘 Presente perfecto…» junto a Empezar → abre el tema; «Para ti» pone ese tema primero |

**Para el teléfono:** la voz real del profe (en Chromium headless no hay motor de voz), el micro real en «Dilo tú», Atrás de Android con la hoja abierta encima de la clase, y la fonética real en «Dilo tú» (con permiso del dueño, gasta F0).

---

## Punto 3 · Sinónimos y antónimos (2026-10-09, dev)

**Qué:** cada consulta de palabra trae ahora **sinónimos** y **antónimos** (0–6 cada uno, en inglés y del mismo sentido que en el contexto; vacío si no hay antónimo natural). En la tarjeta salen dos secciones, «Sinónimos» y «Antónimos», con chips. Cada chip tiene dos zonas: el **texto** abre la consulta de esa palabra y el **▶/⏸** la lee con la voz común (`toggleSpeak` + `SpeakIcon`).

**Navegación sin modal sobre modal:** la consulta del sinónimo se abre **dentro de la misma hoja o vista** y se apila (palabra original → sinónimo → antónimo de ese…). Arriba sale «‹ palabra anterior» y «Sinónimo/Antónimo de X». El **Atrás de Android** quita un paso; solo con la palabra original arriba cierra la hoja (clase) o vuelve a la lista (Palabras). Al apilar o volver, la vista sube al principio. Mientras carga se ve «Buscando qué significa…» en la misma vista; si falla, el error pasa por `friendlyError` y hay un botón «Reintentar». Cada consulta así se guarda en el Historial como cualquier otra y se puede «Guardar» (la marca se conserva al volver por la pila).

**Dónde:**
- `src/lib/lookup.ts`: `synonyms`/`antonyms` en el esquema JSON y en el prompt. Nuevo parámetro `relation`: cuando se toca un chip, el prompt dice «lo tocó como sinónimo/antónimo de X (que allí significaba …)» y se envía **el contexto de la palabra original** (se hereda por toda la cadena).
- `src/lib/db.ts`: `LookupResult.synonyms?` y `antonyms?` **opcionales** (las consultas guardadas antes no los tienen y se ven igual, sin secciones vacías).
- `src/lib/lookupStack.ts` (nuevo, lógica pura): pila (`rootEntry`, `pushRelated`, `popEntry`, `canPop`, `backLabel`, `patchEntry`) y `relatedWords` (limpia: sin vacíos, sin repetidos, sin la propia palabra, máx. 6).
- `src/components/useLookupStack.ts` (nuevo): hook que lanza la consulta del elemento de arriba (una sola vez aunque StrictMode repita el efecto; una respuesta tardía de un elemento ya quitado no pisa nada).
- `src/components/LookupStack.tsx` (nuevo): «‹ atrás», carga, error con Reintentar y la tarjeta. Lo usan las dos entradas.
- `src/components/LookupCard.tsx`: secciones «Sinónimos»/«Antónimos» (`RelatedWords`), props `onRelated` y `onSavedChange`.
- `src/components/LookupSheet.tsx` (clase) usa la pila; `backRef` para el Atrás de Android. `src/screens/Conversation.tsx`: el Atrás con la hoja abierta llama primero a `lookupBack.current()` y solo si no había a dónde volver cierra la hoja.
- `src/screens/WordsScreen.tsx`: la consulta abierta (historial o guardadas) es `WordView` con la misma pila; Atrás quita un paso y, al final, vuelve a la lista (que se recarga con las consultas nuevas). La flecha de la cabecera vuelve a la lista directamente.
- `src/lib/backupCheck.ts`: `synonyms`/`antonyms` como `opt(strArr)`: se aceptan copias con y sin ellos.

**Cómo se probó:**
- `npx tsc -b` OK · `npm run lint` 0 errores · `npm test` **74/74** (nuevo `tests/lookupStack.test.mjs`: palabra → sinónimo → antónimo → atrás → atrás, contexto heredado, raíz por hacer, casos que no apilan, respuesta tardía, `relatedWords` con `undefined`/repetidos/máx. 6; `tests/backupCheck.test.mjs`: consultas con y sin los campos se aceptan, y con un tipo erróneo se rechazan) · `node scripts/validate-bank.mjs` OK · `node scripts/validate-grammar.mjs` 0 errores, 0 avisos.
- **Navegador:** Chrome headless por CDP contra Vite (`preview_start habla-dev`), origen aislado `lex.localhost:5173`, perfil «Lex» y clave falsa; Gemini simulado que devuelve `synonyms`/`antonyms` (big → large/huge/…; large → …; small → …) y guarda el prompt; voz simulada (3 s) para ver ▶/⏸. **0 llamadas reales.** Arneses en `docs/v5.10/evidencia-510b/arnes-sinonimos-*.{js,mjs}`; capturas `sin-*.png` en la misma carpeta.

| Caso | Resultado (390×844, 780×360 y 320×640) |
|---|---|
| Palabras → «big» con frase | Secciones Sinónimos (6, sin «Big» repetido) y Antónimos; sin «‹» en la original; sin scroll horizontal |
| Chip «large» → chip «small» | Carga en la misma vista; «‹ big · Sinónimo de big», luego «‹ large · Antónimo de large» |
| ▶ de «tiny» y otra vez | `speakingKey = tiny` y el icono pasa a ⏸; al tocar otra vez, se para (▶) |
| «‹ large», Atrás de Android, Atrás | small → large → big → lista; big, large y small están en el Historial |
| Consulta antigua (sin campos) | Se ve completa, sin «Sinónimos» ni «Antónimos» |
| Prompt enviado | El esquema lleva los dos campos; large lleva «a synonym of "big"» y small «an antonym of "large"», ambos con el contexto «It was a big house.» |
| Clase (390×844): tocar «big» en el profe | Hoja; large → small dentro de **una sola hoja**; Atrás de Android: small → large → big → cierra la hoja y la clase sigue |
| Clase: error de red | Mensaje en la hoja + «Reintentar», que carga la consulta |

**Para el teléfono:** la voz real del ▶ de los chips (en headless la voz es simulada), el Atrás físico de Android con la hoja abierta en la clase y en Palabras (en el navegador se lanzó el evento `backButton` del plugin App), el tacto de los chips en el Galaxy A11 (320×640, horizontal forzado) y una consulta real a Gemini para ver la calidad de los sinónimos/antónimos (con permiso del dueño).

---

## Puntos 4 y 5 · Repaso (2026-10-09)

### Punto 5 · Micro igual que en la clase
- **Qué cambia:** el Repaso (`src/screens/ReviewScreen.tsx`) ya no tiene su botón propio con `Wave` y «N s de 60»: usa el **mismo `TalkButton`** que la clase (`talkGesture.ts`): «Toca para hablar / Toca para enviar», anillo de 60 s en cuenta atrás (naranja los últimos 10 s, rojo los últimos 5, con el tiempo en el texto), barras que siguen la voz real (`level={() => recorder.current.level()}`), **papelera** para descartar («Grabación descartada», suelta el micro y no llama a Gemini) y **envío automático a los 60 s** (lo hace el propio TalkButton; se quitó el `toggleRef` del Repaso para no enviar dos veces).
- **Pasos → fases:** `ask` → `idle`, `recording` → `recording`, `checking` → `thinking` (constante `PHASE`).
- **Se conserva todo:** `begin()`/`finish()` (AUD-MIC-302/305), `MIN_SEND_MS`, `isEmptyRecording` + `distrustMic`, `addPracticeSeconds`, fonética con la transcripción como referencia (`giveReference`), «No lo sé» (cancela la apertura del micro), cierre en segundo plano (`whenBackground`), «Ya me la sé», tarjetas de Gramática. El toque doble y el envío automático no envían dos veces: guarda `sending` como en la clase.

### Punto 4 · Evaluación al terminar
- **Lógica** en `src/lib/reviewSummary.ts` (sin Gemini, todo en el teléfono) y vista en `src/components/ReviewSummaryView.tsx`, con `MascotPage` (mascota del tema, dos columnas en horizontal), `ScoreRing`, y `Stat`/`Card` **exportadas de `ReportView.tsx`** (no se copian estilos; `Card` acepta cualquier icono).
- **Precisión 0–100** = `round(100 × puntos / intentos)` con **Correcto = 1, Casi = 0,5, Aún no = 0, No lo sé = 0** (`OUTCOME_POINTS`; la fórmula se ve bajo el anillo). Cuenta cada intento: con «No me salió» una frase vuelve y cuenta otra vez.
- **Se muestra:** título y feedback de la mascota, anillo de precisión, Correcto / Casi / Aún no / No lo sé, frases, tiempo hablado en el repaso (los mismos segundos que suman a la meta), media de pronunciación de Azure («—, sin fonética» si no hubo; la nota que llega tarde también cuenta) y **«Las que más te costaron»** (máx. 5, agrupadas por tarjeta, primero «No lo sé», luego «Aún no», «Casi»; «×2» si falló dos veces) con ▶/⏸ (`toggleSpeak` + `SpeakIcon`) de la respuesta correcta. Botón «Volver».
- **Feedback:** banda por precisión (≥ 90 «¡Repaso redondo!», ≥ 70 «¡Buen repaso!», ≥ 40 «Vas por buen camino», < 40 «Hoy costó, y eso también cuenta»; la mascota sonríe en las dos primeras y «habla» en las otras) + **un solo consejo** según lo que falló (≥ 1/3 «No lo sé» → intenta decir algo; muchos «Casi» → palabras pequeñas; Gramática → repasa el tema; si no, escucha las difíciles) + pronunciación (≥ 85 elogio, < 60 consejo) + frases que quedaron (si saliste a mitad).
- **«¡Todo repasado!»** (sin frases) queda igual.
- **Salir a mitad con ≥ 1 frase hecha → se muestra el resumen** (flecha y Atrás de Android, vía `leave`). Por qué: las notas FSRS de esas frases ya están guardadas y es justo cuando más sirve ver qué costó; sale «Repaso a medias · N frases repasadas» y el feedback dice cuántas quedan («volverán en el próximo repaso»). Se cierra el micro si estaba grabando y se para la voz. Desde el resumen, «Volver» o Atrás salen del todo. Sin ninguna frase hecha, se sale directamente como antes.

### Cómo se probó
- `npx tsc -b` OK · `npm run lint` 0 errores (sin avisos nuevos) · `npm test` **74/74** (5 nuevas en `tests/reviewSummary.test.mjs`: fórmula, recuento y media de pronunciación, «las que más costaron», feedback por banda y por fallo, salida a mitad) · `validate-bank` OK · `validate-grammar` 0 errores, 0 avisos.
- **Navegador** (rep.localhost, `seed7.js` con `__seedN = 1` + `docs/v5.10/evidencia-510b/arnes-repaso.js`: micro falso de oscilador con registro de aperturas, Gemini y Azure simulados con veredictos y notas variados, 4 tarjetas: 3 de correcciones y 1 de Gramática). Capturas en `docs/v5.10/evidencia-510b/` (`01`–`17`).

| Caso | Resultado |
|---|---|
| 390×844: grabar, dejar correr | Anillo, papelera y barras (02); **envío automático a los 60,4 s** y micro cerrado (03) |
| Gramática, últimos segundos | Anillo naranja y «Toca para enviar · 0:06» en naranja (05); 320×640 rojo «0:01» (09, reloj adelantado con `performance.now`) |
| Papelera | «Grabación descartada», micro cerrado, 0 llamadas nuevas a Gemini (06) |
| 390×844 completo (Correcto, Casi, Aún no→«No me salió» vuelve, Correcto, No lo sé) | 5 frases, precisión **50**, 2/1/1/1, pronunciación 80 (media de 4), «I'm interested in music · No lo sé ×2» primero (07, 08) |
| 320×640 salir a mitad grabando (Aún no, No lo sé) | Micro cerrado; «Repaso a medias · 2 frases», precisión 0, «Te quedaron 2 frases…»; sin scroll horizontal (10, 11) |
| 780×360 (Casi, Correcto + «Ya me la sé», 2 × No lo sé) | Tarjeta y grabación en horizontal (12–14); resumen en dos columnas: precisión 38, «Tu pronunciación fue muy clara (93 de media)» (15, 16) |

**Para el teléfono:** micro real (las barras con la voz, auriculares Bluetooth), Atrás de Android a mitad de repaso (debe mostrar el resumen y, otra vez Atrás, salir), ▶/⏸ en «Las que más te costaron» con la voz del sistema (en el navegador `speechSynthesis` arrancó, pero el icono no se pudo capturar), horizontal del Galaxy A11 (en 780×360 el micro y «No lo sé» quedan bajo la tarjeta y se llega desplazando, como antes del cambio).
