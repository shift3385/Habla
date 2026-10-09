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
