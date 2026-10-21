# 5.10.1 · Revisión independiente (R)

Rama `v5.10.1-correcciones`. Revisor R: no edita `src/`, `android/` ni tests; evidencias en `evidencia/R/`.
Severidad: ALTA / MEDIA / BAJA. Cada bloque: veredicto, comprobación por NC, pruebas, NC de revisión (`REV-Dn-nn`).

## D2 · Voz y foco de audio (ronda 1) — 2026-10-20

**Veredicto: NC (2 × BAJA, sin fallo de fondo).** Las 9 NC del bloque están arregladas en su causa y los tests las
cubren; quedan dos detalles pequeños (posición del ⏸ flotante y un hueco de test) que D2 puede cerrar en la ronda 2
que ya tiene abierta. Con eso, aprobable sin repetir la revisión completa (basta mirar los dos puntos en la regresión
final).

Alcance: `git diff` de `src/lib/audioFocus.ts`, `src/lib/tts.ts`, `src/lib/speechLang.ts`,
`src/screens/GrammarTopicScreen.tsx` y `tests/d2-audioFocus.test.mjs`, `tests/d2-speechLang.test.mjs` tal como estaban
al empezar la revisión (ronda 1). Nota: durante la revisión D2 ya estaba editando la ronda 2 (Vite registraba cambios en
`GrammarTopicScreen.tsx`, `GrammarRoutes.tsx`, `GrammarSheet.tsx`); lo nuevo de la ronda 2 no está revisado aquí.

### Comprobación por NC

| NC | ¿Arregla la causa? | Notas del revisor |
|---|---|---|
| REG-M-06 (la música apenas baja) | ✅ | `focusOwnerFor()` (> ~12 s → `read` → `pause` = GAIN_TRANSIENT). La explicación por tramos siempre pide `read` (`tts.ts` `speakSpanish`: `segs.length > 1 ? 'read'`). Respuestas del profe > ~180 caracteres también pausan: D2 ya lo deja para que lo confirme el dueño (de acuerdo) |
| REG-A1-03 (bombeo por tramos) | ✅ | Un foco por **lectura** (`holdFocus`/`dropFocus`) y suelta retrasada 600 ms. Medido: explicación entera = `['pause']` y `['pause','abandon']` 600 ms después (test y navegador) |
| REG-A1-02 (un solo dueño) | ✅ | Conjunto `mic | read | tts`, se pide el más fuerte y solo se llama al nativo si cambia. `recorder.ts` (D1) sigue usando `takeAudioFocus('mic')`/`releaseAudioFocus('mic')` sin cambios: API compatible; el micro suelta al instante |
| REG-M-07 / REG-A1-05 (sigue sonando) | ✅ | `stopSpeakingIf(explainKey)` en `setPart`, en `leave()` (Atrás, Relacionado, Pregúntale, Practicar) y en el desmontaje; solo para su clave (no corta al profe de debajo de la hoja). La clave ⏸ ya no parpadea entre tramos |
| REG-M-10 («five» + «th») | ✅ | `TOKEN` trata `\d+(st|nd|rd|th|s)` como palabra inglesa y `ordinalWord()` → «fifth». Horas y años toman el idioma de al lado (`NUM_LEAD`) |
| REG-A3-13 / REG-A3-14 | ✅ | Propuesta de A3 integrada (EN, BOTH, ES_MARK, `ES_SUFFIX`); 13 casos del catálogo en el test. Quedan, como dijo A3, «color (red)» y «(sensible = sensitive)» |
| REG-A1-06 (tono 0,8 con Leo) | ✅ | `pitch` solo sin `lang`. En el navegador todos los tramos `es-ES` salen con `pitch 1` |

### El foco siempre se suelta (análisis de caminos)

| Camino | Resultado |
|---|---|
| Fin normal de `speak` / `speakSpanish` | `finally → endRead → dropFocus` (600 ms) ✅ |
| Error del motor de voz en un tramo | `utter` rechaza → `finally` suelta; ▶ vuelve. Prueba extra X3: `['pause','abandon']`, clave `null` ✅ |
| ⏸ / `stopSpeaking()` | `dropFocus()` antes del `await` ✅ (X5: parar mientras se busca la voz → no se pide foco) |
| Otra lectura corta a la anterior | La nueva hereda el foco; si cambia de clase, se coge la nueva y se suelta la vieja en el acto. X1 (explicación → ▶ corto): `pause, duck, abandon`; X2 (▶ → explicación): `duck, pause, abandon`; X6 (dos explicaciones): `pause, abandon` ✅ |
| Segundo plano | `document.hidden` → suelta al instante; oyente propio de `visibilitychange` vacía los temporizadores (MainActivity congela los timers) ✅ |
| Desmontaje de la pantalla | efecto con `stopSpeakingIf` ✅ (en StrictMode el montaje doble no para nada: aún no suena) |
| `releaseAllAudioFocus()` | Deja `heldFocus` de `tts.ts` apuntando a un dueño que ya no está: el `dropFocus` posterior no hace nada (inocuo) |
| Lectura colgada | No hay: `utter` vuelve al acabar, al interrumpirse (`finishCurrent`) o si el turno ya no es el activo |

### Pruebas ejecutadas

- `node --test tests/d2-*.test.mjs tests/speechLang.test.mjs tests/speaking.test.mjs tests/recorder.test.mjs`:
  **51/51** ✅ → `evidencia/R/D2-01-tests.txt`.
- `npx tsc -b` ✅ · `npm run lint`: 0 errores (avisos antiguos de `Calibration.tsx`) · oxlint de los 4 archivos de D2: limpio.
  (El error de `teacher.ts:315` de D4 ya no estaba al revisar.)
- **Mutación** (copia de seguridad, mutar, test, restaurar y `cmp` = idéntico; los tres archivos restaurados) →
  `evidencia/R/D2-02-mutacion.txt`. 8 de 9 mutantes mueren:
  M1 micro no manda (muere) · M2 sin retraso (muere, 4 tests) · M3 sin `hidden()` (muere) · M4 tono 0,8 en español
  (muere) · M5 explicación con `tts` (muere) · M6 `stopSpeakingIf` siempre para (muere) · M7 sin ordinales en palabras
  (muere, 3 tests) · M9 sin `ES_SUFFIX` (muere) · **M8 quitar la suelta del foco viejo al cambiar de clase en
  `holdFocus` → sobrevive** (ver REV-D2-02).
- Pruebas extra del revisor (no van al repo; `evidencia/R/D2-03-extra.txt`): X1–X6 de la tabla anterior, 6/6 ✅.
- **Navegador** (`habla-dev`, origen aislado `rev.localhost:5173`, red falsa de `arnes-rev`, arnés propio
  `evidencia/R/d2-nav.js`). En la web no hay nativo: en vez de espiar `Capacitor.nativePromise` se espía
  `speechSynthesis.speak` (idioma, tono, texto) y se lee `audioFocusState().trace` de la **misma instancia** del módulo
  que usa la app (lo que se pediría a Android). Resultado en «Preposiciones de tiempo», 390×844:
  - ▶ de la explicación: traza `['pause']` y `holders ['read']` durante toda la lectura (≥ 9 tramos), voces
    `en-US|1|At`, `es-ES|1|para la hora,`, `en-US|1|on`, `es-ES|1|para el día y la fecha,`… ✅
  - Al bajar, aparece «⏸ Parar la explicación» (`evidencia/R/D2-04-flotante-390x844-inicio.jpg`) — ver REV-D2-01.
  - **Sin terminar en el navegador** (queda para la regresión final): 780×360, 320×640, la hoja 📘, parar al cambiar
    de parte/salir y «May fifth» oído en la web. Motivos: el panel del navegador estaba oculto (Chrome no pinta ni avisa
    al `IntersectionObserver`) y Vite recargaba la página cada pocos segundos por la ronda 2 de D1–D4. Esos caminos sí
    están cubiertos por código y tests (`stopSpeakingIf`, `d2-audioFocus` REG-M-07, `d2-speechLang` REG-M-10).

### NC de la revisión

| ID | Sev. | Dónde | Escenario | Arreglo sugerido |
|---|---|---|---|---|
| REV-D2-01 | BAJA | `src/screens/GrammarTopicScreen.tsx` (efecto del `IntersectionObserver`: `setFloatBottom(Math.max(16, pad - 20))` y `style={{ bottom: floatBottom }}`) | El `sticky` ya se coloca dentro del `padding-bottom` de `.tab-content`, y además se le suma ese padding: el ⏸ queda **204 px** por encima del borde en 390×844 (medido: `bottom 640` con `innerHeight 844` = 112 de padding + 92), unos 120 px por encima de la barra de pestañas, tapando el contenido (en la captura, la fórmula de «Pregunta»). En la hoja (padding 28) el efecto es pequeño | `bottom` fijo pequeño (8–16 px) sin leer el padding, o `position: fixed` con el cálculo actual. Mirarlo en 390×844, 780×360 y 320×640, Inicio y hoja |
| REV-D2-02 | BAJA | `tests/d2-audioFocus.test.mjs` / `src/lib/tts.ts` `holdFocus` | Ningún test cubre el cambio de clase de foco entre lecturas (explicación → ▶ corto y al revés): si se borra `releaseAudioFocus(heldFocus, true)` los 9 tests siguen pasando, y el resultado real sería la música **en pausa para siempre** tras una explicación cortada por un ▶ | Añadir un test: `toggleSpeakSpanish(explicación)` → a mitad `toggleSpeak('Hello there.')` → al acabar + 700 ms, `kind === null` y traza `['pause','duck','abandon']` (es la X1 del revisor) |

Observaciones (sin NC):
- Estilo: doble línea en blanco en `src/lib/tts.ts` antes de `// En Android, si una frase se interrumpe…` (≈ l. 116).
  CRLF coherente en los 4 archivos; comentarios citan los id.
- Teléfono (para `MOVIL`): el foco `pause` usa en Java `USAGE_VOICE_COMMUNICATION` (archivo de D1); con la lectura larga
  comprobar que Spotify vuelve solo al acabar y que no cambia el modo de audio. Y confirmar con el dueño que una respuesta
  larga del profe pause la música (NC 1, punto 4 de `dev/D2.md`).

## D1 · Micro y grabación (ronda 1, revisión parcial) — 2026-10-20

**Estado: en revisión — veredicto aplazado a la ronda 2.** Al revisar, `src/lib/audioRoute.ts` ya llevaba la ronda 2
(«ruta preparada al acabar el profe», `IDLE_MS` 20 s, `routeOnSpeech`, `releaseAfterMic`) y D1 seguía editando
(`tests/d1-mic.test.mjs` cambió entre dos lecturas). Lo de abajo vale para el código tal como estaba a las ~23:25; el
navegador con micro simulado (`B3/arnes/instr.js`) y los 8 avisos de descarte en pantalla quedan para cuando D1 pase la
ronda 2 a «para revisar».

### Lo comprobado
- **Java** (`AudioRoutePlugin.java` de D1 y `MainActivity.java` de D4): `:app:compileDebugJavaWithJavac --offline -q`
  → **exit 0** (solo la nota antigua de API obsoleta) → `evidencia/R/D1-03-java.txt`. REG-A2-06: el nombre del
  dispositivo solo entra en el `Log.i` con `FLAG_DEBUGGABLE` ✅. El atajo «ya es el dispositivo de comunicación →
  responder al instante» compara `getId()` ✅.
- **Tests**: `d1-mic`, `recorder`, `talkGesture`, `emptyRecording` → **48/48** ✅ (`evidencia/R/D1-02-tests.txt`).
- **Billete** `ticket()`/`begin(ticket)` en las 4 pantallas: `Conversation.tsx:519/528`, `ReviewScreen.tsx:144/149`,
  `GrammarSpeak.tsx:96/104`, `Calibration.tsx:581/586` ✅ (tomado antes de la espera).
- **Descartes (REG-M-02)** en la clase: los 8 motivos pasan por `discard()` (`Conversation.tsx:287, 293, 481, 532, 564,
  585, 598`) y el recuadro solo se quita al tocar el micro o «Enviar igualmente» (`:514, :606`) ✅. Detalle: el recuadro
  se oculta si a la vez hay un `error` (`:1158 dropped && !error`): aceptable, el error ya dice algo.
- **Calibration** (`testDraft`): el efecto nuevo es `useEffect(() => (speakingStep ? holdRoute() : undefined),
  [speakingStep])`; no toca borrador ni progreso; tsc y lint (0 errores) lo aceptan. Retomar el test: pendiente de verlo
  en el navegador.
- **Privacidad (REG-M-01)**: la retención no llama a `getUserMedia` (solo `getDevices`/`setRoute`); se suelta en
  `holdRoute()` → desapuntar la última pantalla, `suspendRoute()` (lifecycle: minimizar, bloquear, `pagehide`,
  `__hablaBackground`), `releaseAfterMic()` (enviar/descartar), `IDLE_MS` sin tocar, al empezar una voz y
  `setHeadsetWanted(false)`; además el nativo la suelta en `handleOnStop` ✅. Con una excepción frágil (REV-D1-01).

### NC de la revisión (provisionales)

| ID | Sev. | Dónde | Escenario | Arreglo sugerido |
|---|---|---|---|---|
| REV-D1-01 | BAJA | `src/lib/audioRoute.ts` `warm()` (tras `await applyAudioMode('headset')`: `if (!shouldHold() …) drop()`) | Si sales de la clase (o pasa a segundo plano) **mientras `warm()` espera** antes de llamar a `setRoute('headset')`, `drop()` del desapuntado pone `routed = false` y manda `phone`; luego llega `setRoute('headset')` y el `drop()` final no hace nada porque `routed` ya es `false`: **la ruta (modo llamada) queda puesta en el Inicio**. Reproducido con el plugin simulado (orden real de efectos): `getDevices > requestBluetooth > setRoute:phone > setRoute:headset → final AURICULARES`, en «salir» y en «segundo plano» (`evidencia/R/D1-01-carrera-ruta.txt`). Hoy la ventana es casi nula porque `AudioPicker` llama a `bluetoothGranted()` antes de `setHeadsetWanted(true)` (permiso en caché, sin espera real), y en segundo plano lo cubre `handleOnStop`; pero cualquier `await` nuevo en `applyAudioMode` la reabre | En `warm()`, tras la espera: `if (!shouldHold() …) drop(true)` (forzar), o una generación que `drop()` incremente y que `warm()` compruebe antes de llamar a `setRoute('headset')`. Añadir el test (el del revisor sirve) |

Pendiente para la ronda 2 (orquestador): con la ruta preparada, comprobar con el simulado y en el teléfono que se suelta
a los ~20 s sin tocar, al enviar, en segundo plano y al salir; fase «Abriendo el micro…» en Repaso, «Dilo tú» y test;
avisos de descarte en pantalla (390×844, 780×360, 320×640).

## D3 · Contenido de Gramática (rondas 1 y 2) — 2026-10-20

**Veredicto: APROBADA (código y contenido).** Pendiente solo de ver en el navegador, en la regresión final, un «Ordena»
con la colocación alternativa y los colores/alturas de la ronda 2 (Vite recargaba sin parar por la ronda 2 del resto).

| Comprobación | Resultado |
|---|---|
| `node scripts/validate-grammar.mjs` | ✅ 12 archivos · 90 temas · **667 ejercicios** · 0 avisos (incluye el comparador con el banco: sin coincidencias) |
| `node scripts/validate-bank.mjs` | ✅ el banco cumple las reglas |
| `tests/grammar.test.mjs` | ✅ 27/27 |
| `fullSentence()` en los 667 (script del revisor, `evidencia/R/D3-01-frases.txt`) | ✅ ninguna con `____`, paréntesis, «», → ni «I 'll». Las 7 «sospechosas» son nombres con tilde (Díaz, Cancún, Bogotá, café, Tomás, Ramón) y la cita «awkward» de `wh-questions-3`: correctas. Sin colisiones de `exerciseCardId` |
| in-case-vs-if-8 | ✅ ahora es inglés: «…buy some snacks now ____ the kids get hungry» (in case / if / unless / in case of), tarjeta «…now in case the kids get hungry.» |
| prepositions-of-time-6 | ✅ «Her train arrives in the afternoon, around four.» (adiós «gets in in») |
| passive-perfect-modals-3 | ✅ «This form must be filled in with a black pen.» |
| `alsoAccepted` | ✅ `orderMatch()` + `checkExercise`, `GrammarExercises.tsx:136` enseña tu colocación; el validador exige mismas palabras, distinta de `answer` y sin punto; las 19 alternativas son permutaciones exactas de `words` (comprobado aparte) |
| `src/lib/srs.ts` (`syncCards` + `grammarCardPatch`) | ✅ solo `source === 'grammar'`; busca por `exerciseCardId(ex.id)` (hash del id, estable aunque se reordene el catálogo); el parche solo lleva `promptEs/answerEn/hintEs` (**no toca el estado FSRS**); ejercicio que ya no existe → `null` (no toca nada); idempotente (test `grammar.test.mjs:378`: aplicar dos veces → `null`). Escribe con `update` por id y `catch`: un fallo no rompe la sincronización |
| Cambios de contenido (`evidencia/R/D3-02-diff-contenido.txt`, HEAD vs ahora) | 125 cambios en campos en español (65 con léxico neutro; muestra de 11 revisada: carro, celular, computadora/«se traba», manejar, tomar, departamento, lentes, «se descompusiera»: significado intacto). **48 en campos ingleses**, todos explicados por NC: pistas añadidas a enunciados (REG-A3-0x: «(some o any)», «(do o does)», «(will, ofrecimiento)»), in-case-vs-if-8, contracciones `'s`/`'d` reformuladas, «(be born)», «arrives», «with a black pen», y el paso a inglés americano de REG-A3-12 (vacation, in line, canceled, traveled, practice, apartment). Ningún cambio de inglés por el español neutro ✅ |

Sin NC de revisión.

## D2 · Ronda 2 — 2026-10-20

**Veredicto: APROBADA.**
- REV-D2-01 ✅ `GrammarTopicScreen.tsx:301` `bottom: 8` fijo (sin leer el padding). La posición en pantalla queda para la
  regresión visual final (el navegador volvió a recargarse a mitad del arranque por la fase 2).
- REV-D2-02 ✅ test nuevo «REV-D2-02: un ▶ corto que corta la explicación…». Mutación repetida (quitar
  `releaseAudioFocus(heldFocus, true)` de `holdFocus`): **ahora muere** (1 fallo); archivo restaurado y comprobado con `cmp`.
- `node --test tests/d2-*.test.mjs tests/speechLang.test.mjs tests/speaking.test.mjs` → 34/34 ✅.
- Lo nuevo de la ronda 2 (`speakSegments`, toques ≥ 40 px, `aria-pressed`, scroll de `GrammarRoutes`, colores): revisado
  por código; lo visual (`aria-pressed`, altura al volver) va a la regresión final.

## D4 · Prompts, fonética e interfaz (ronda 1, ronda 2 y fase 2 parte 1) — 2026-10-20

**Veredicto: NC (1 × BAJA).** Lo demás, correcto por código y tests. La parte visual (diálogos de la mascota, colores
`--ok`/`--bad`, 320×640, `:focus-visible`) va a la regresión visual final, después de la migración de la letra (fase 2).

| Punto | Resultado |
|---|---|
| Tests `d4-*`, `backupCheck`, `teacher`, `promptInjection`, `mascotTips`, `fluency` | ✅ 52/52 + 1 `todo` (SEG-509, abierto a propósito) → `evidencia/R/D4-02-tests.txt` |
| Java `MainActivity` (textZoom con tope 1,15) | ✅ compila (con el de D1, `evidencia/R/D1-03-java.txt`) |
| `GRAMMAR_OVERRIDES` (`grammar.ts:468-474`, en `grammarBrief`) | ✅ anula la pregunta abierta y el «pide más detalles», permite UNA frase de explicación, todo el español entre « » y el inglés entre "…", frases cortas, bajar la dificultad tras 2 fallos. Coherente con «Always end with the next task» |
| `REPLY_AGREES` (`teacher.ts:150`, en «# Correcting» del prompt base) | ✅ en todas las clases; `has_error` huérfano quitado |
| `replySegments` (`teacher.ts:321`) | ✅ « » → `es`, resto → `en`, sin comillas; la puntuación suelta va con el tramo anterior (`«Ayer no fui al trabajo»?` → `es: "Ayer no fui al trabajo?"`: inocuo). Lo usa D1 con `speakSegments` (D2) |
| `spellNumbers` (`pronunciation.ts:208`) | ✅ «10:00» → «ten o'clock», «7:30 pm» → «seven thirty p.m.», «9:05 a.m.» → «nine oh five a.m.», «5th» → «fifth», «21st» → «twenty-first», «1,500» → «one thousand five hundred», «3.5» → «three point five», «50%» → «fifty percent» (`evidencia/R/D4-01-logica.txt`). Años («2024» → «two thousand twenty-four») igual que en la 5.10, no es regresión |
| `confirm()` → `MascotPage` | ✅ no queda ningún `confirm(` en `src/` (salvo `Native.confirm` de deviceAuth). `App.tsx:271`: Atrás de Android cierra «¿Terminar la clase?» antes que nada; `doFinishSavedClass` pasa `grammarTopic` (`:563`). Ajustes → importar: `pending` + `setDialogBack` (Atrás cierra la pregunta), «No, me quedo» no toca nada |
| Versión de copias | ✅ `backup.ts` exporta `backupVersionFor(tables)` (1 sin Gramática, 2 con tarjetas `grammar` o progreso); `backupCheck` acepta hasta `BACKUP_MAX_VERSION = 2`; tabla desconocida o `source` nuevo → «más nueva». El test `d4-ui` vuelve a leer una copia v2 ✅ |
| REG-A2-03 (`deviceAuth.ts`) | ✅ gracia por credencial (`Map`); `insecure` o fallo no la abren |
| REG-A2-04 (caché) | ✅ patrón `^habla-(backup|test)-…` (coincide con `habla-backup-AAAA-MM-DD.json` y `habla-test-….txt`; no toca `habla-antes-de-importar-*`); borrado a los 60 s y al arrancar. Dos exportaciones el mismo día comparten nombre: el temporizador de la primera puede borrar la segunda a los 60 s (cuando la app destino ya la leyó): aceptable |

| ID | Sev. | Dónde | Escenario | Arreglo sugerido |
|---|---|---|---|---|
| REV-D4-01 | BAJA | `src/lib/teacher.ts` `EDGE_FILLERS` / `coreWords()` / `echoesIdea()` | Las muletillas de los extremos se quitan **también de la idea**, y `well`, `like`, `okay`, `so`, `and` son palabras de contenido al final de una frase. Idea «I don't sleep well» + el alumno dice «I don't sleep» → `echoesIdea = true`: se descarta como «idea leída» una respuesta que **no** es la idea (comprobado). Raro, pero vuelve al fallo de fondo de REG-A1-04 (rechazar una respuesta real) | Quitar las muletillas de los extremos solo de la transcripción y comparar con la idea **entera** (sin titubeos `um/uh…`): `coreWords(transcript) === fold(idea) sin HESITATIONS`. Test: «I don't sleep» con la idea «I don't sleep well» → `false`; «I don't sleep well, yeah» → `true` |

## D1 · Ronda 2 — 2026-10-20

**Veredicto: APROBADA (código, tests y Java).** Lo visual (fase «Abriendo el micro…», recuadros de descarte, 3 tamaños) y
el arnés de micro en el navegador quedan para la regresión final, cuando acabe la fase 2.
- **REV-D1-01 ✅** `audioRoute.ts` `routeGen` (sube en cada `drop()`); `warm()` y `ensureHeadsetRoute()` sueltan a la fuerza
  si cambió. Mi prueba de carrera ahora termina en **teléfono** en «salir» y «segundo plano»
  (`… > setRoute:headset > setRoute:phone`). Mutación: quitar la comprobación de `ensureHeadsetRoute()` → muere el test
  «REV-D1-01»; la de `warm()` sobrevive porque `!shouldHold()` ya cubre salir/segundo plano (defensa redundante, OK).
  Archivo restaurado (`cmp`).
- **Ruta preparada (decisión del dueño):** tests de la ronda 2 cubren todos los caminos que pidió el orquestador: suelta
  sola a los ~20 s sin tocar (`d1-mic:201`), al enviar (`:211`), en segundo plano (`:243`), al salir (`:276`, `:298`),
  suelta antes de que hable el profe (`:184`, `:312`) y nunca abre el micro para prepararla.
- `d1-mic` 25/25 + `recorder`, `talkGesture`, `emptyRecording` + mi prueba: **51/51** → `evidencia/R/D1-04-ronda2-tests.txt`.
- Java: sin cambios en la ronda 2; compilado en la ronda 1 ✅.
- Teléfono (MOVIL): A2DP mientras habla el profe, `MODE_IN_COMMUNICATION` sin punto verde al acabar, «grabando» < 2,5 s,
  `NORMAL` tras enviar / 25 s / minimizar. Ojo al «clic» A2DP↔HFP que el propio D1 anota como riesgo.

## D1 · Fase 2 · REG-M-03 prueba de sonido en un paso (lógica) — 2026-10-20

**Veredicto: NC (1 × MEDIA).** La prueba en sí está bien hecha y la privacidad dentro de la prueba se cumple; falla el
caso de unos auriculares que se conectan **con Habla en segundo plano**. Lo visual, en la regresión final (tras la letra).

| Punto | Resultado |
|---|---|
| Tests `d1-soundcheck` (11) + `d1-mic` (25) | ✅ 36/36 → `evidencia/R/D1-05-fase2-tests.txt` |
| (a) Micro abierto durante la instrucción | ✅ Solo en modo `headset`, dentro del efecto de `step === 'run'` (la prueba a la vista), tras fijar la ruta y 300 ms. Nada lo analiza: el `AnalyserNode` se conecta después de la voz y la espera; no hay `MediaRecorder`, ni red, ni Gemini (`SoundTest.tsx:117-138`). Se cierra siempre con `cleanup()` (pistas paradas, `AudioContext` cerrado, foco `mic` soltado): al pasar (`:156`), sin voz (`:162`), error (`:170`), «No te oigo» (cambia `step` → limpieza del efecto), Atrás o cambio de opción (desmontaje, `:175-179`) y segundo plano (`whenBackground`, `:94-100`). Si `getUserMedia` resuelve tarde, `openMic` ve `!alive` y para las pistas (`:104-107`) ✅ |
| (b) `habla.soundChecked` | ✅ `{ [nombre]: { mode, ok, at } }` (`soundCheck.ts:117-158`); JSON roto → `{}`; no va en las copias (Preferences no se exporta) |
| Orden | ✅ `App.tsx`: `ready = !splash && settings.onboarded` (onboarded solo con la clave guardada); en la rama del test de nivel `ready={false}`. Con `ready` falso `check()` solo aplica lo elegido (`AudioPicker.tsx:117`) y al ponerse a `true` se vuelve a mirar (`:140-142`) |
| Cuándo se repite | ✅ auriculares nuevos, otro modo, último intento fallido u `onMicDistrusted` (grabación vacía en uso real) |
| Foco y ruta | ✅ `takeAudioFocus('mic')` solo al escuchar; `soundTestRoute(false)` al desmontar → `settleRoute()` |

| ID | Sev. | Dónde | Escenario | Arreglo sugerido |
|---|---|---|---|---|
| REV-D1-02 | MEDIA | `src/components/AudioPicker.tsx` `check()` (llamado desde `onAudioDevicesChanged`, `:159`, también con la app oculta) → `startTest()` → `SoundTest` → `audioRoute.ts:229` `soundTestRoute(true, true)` | Habla minimizada (Spotify sonando), conectas unos auriculares que tocan probar (nuevos con modo ya elegido, otro modo o último fallo): `check()` llama a `interruptForSoundTest()` y monta la prueba; su efecto llama **en segundo plano** a `soundTestRoute(true)` → `setRoute('headset')` = `MODE_IN_COMMUNICATION` + dispositivo de comunicación con la app oculta. `suspendRoute()` y el `handleOnStop` nativo ya pasaron, así que **nadie lo suelta hasta volver a la app**: va contra el requisito del dueño (REG-M-01: nunca en segundo plano) y puede afectar al audio de la otra app. (El resto del efecto se congela en el `setTimeout` de 300 ms porque `pauseTimers` para los temporizadores: el micro no llega a abrirse hasta volver, ya con la prueba a la vista.) Visto por código; confirmar en el teléfono | En `check()`, si la app está en segundo plano (`document.hidden` o un `isBackground()` de lifecycle) no preguntar ni empezar la prueba: ya se vuelve a mirar al volver (`appStateChange` activo → `check`). Y como defensa, `soundTestRoute(true)` no fija nada si `!foreground` (`audioRoute.ts`). Test: con `foreground = false`, `soundTestRoute(true, true)` no llama a `setRoute('headset')` |

Observaciones (sin NC):
- `soundTestRoute(true)` no usa `routeGen`: la misma carrera de REV-D1-01 (salir mientras espera `setRoute('headset')`)
  la cubre `soundTestRoute(false)` → `settleRoute()` → `drop(true)` al desmontar, pero si se desmonta **antes** de que
  vuelva el `setRoute` tardío quedaría puesta. Ventana pequeña; mismo arreglo de una línea que en `warm()`.
- Umbral del detector sin medir con el micro SCO de los soundcore (lo dice D1): medirlo en `MOVIL`.

### D1 · Fase 2 · REV-D1-02 corregida — 2026-10-20

**Veredicto: APROBADA (lógica).** Tres defensas: `AudioPicker.tsx:125` `check()` no pregunta ni monta la prueba con la
app oculta (al volver, `appStateChange` → `check()`); `audioRoute.ts:235` `soundTestRoute(true)` no fija nada si
`!foreground`, y `:240` con `routeGen` suelta a la fuerza un `setRoute('headset')` tardío; `SoundTest.tsx:103/114/120` no
habla ni abre el micro con la app oculta. Tests `d1-soundcheck` + `d1-mic`: **39/39**.
Mutación (5 mutantes, todos **mueren**; archivos restaurados y comprobados con `cmp`) → `evidencia/R/D1-06-rev-d1-02.txt`:
quitar la guarda de `check()` (2 tests), las dos formas de quitar la de `soundTestRoute`, quitar la comprobación tras el
`setRoute` tardío y quitar la de `openMic`. La observación de `routeGen` en `soundTestRoute` queda resuelta.
Teléfono (MOVIL): Habla minimizada + auriculares no probados → `dumpsys audio` en `NORMAL`; al abrir, selector o prueba.

## D4 · REV-D4-01 y fase 2 «letra» — 2026-10-21

**Veredicto: APROBADA.**
- **REV-D4-01 ✅** `echoesIdea` compara con la idea **entera** y solo recorta muletillas de lo dicho, de 0 a n por cada
  extremo. «I don't sleep» con la idea «I don't sleep well» → `false`; «um … was, yeah» → `true`; «…was the party» →
  `false` (repetido con el script del revisor, `evidencia/R/D4-01-logica.txt`).
- **Letra (REG-M-05):** `fontScale.ts` (4 opciones, `elección × sistema`, suelo 0,85, tope 1,3 en vertical y 1,15 en
  horizontal, recalcula al girar), `--fs` + `@utility fs-*` + `--text-*` escalados, 0 `text-[NNpx]` en `src/` (test
  `d4-letra`, 7/7), `AudioPicker`/`SoundTest` migrados, Ajustes «Apariencia» con 4 `role="radio"` y vista previa.
  Java: `OrientationPlugin.getFontScale()` (`@PluginMethod`, `Configuration.fontScale`) y `MainActivity` `setTextZoom(100)`
  en `onCreate`/`onStart` → compila (`F-07-java.txt`).

## Regresión final 5.10.1 — 2026-10-21

Árbol congelado (nadie edita), rama `v5.10.1-correcciones`, sin commits. Navegador: `habla-dev`, origen aislado
`rev.localhost:5173`, IA y micro simulados (`arnes-rev/rev-mic.js` + `evidencia/R/final.js`: respuestas de Gemini a
medida, espía de `speechSynthesis` y de la traza de foco). **Ninguna petición real a Google/Azure**
(`read_network_requests` con `googleapis`: vacío). El panel del navegador estaba oculto: sin capturas válidas (Chrome no
pinta ni anima); todo se midió por DOM y, donde hacía falta, se forzaron el `IntersectionObserver` y el evento `resize`.

### Comprobaciones automáticas (evidencia `evidencia/R/F-01…F-07`)
| Orden | Resultado |
|---|---|
| `npx tsc -b` | ✅ exit 0 |
| `npm run lint` | ✅ 0 errores (avisos antiguos) |
| `npm test` | ✅ **224 tests · 223 bien · 0 fallos · 1 `todo`** (SEG-509, abierto a propósito) |
| `node scripts/validate-bank.mjs` | ✅ |
| `node scripts/validate-grammar.mjs` | ✅ 90 temas · 667 ejercicios · 0 avisos |
| `npm run build` | ✅ Avisos: CSS `index.css` `.relative.z-[2]` sin escapar (la regla se descarta en el build; **ya estaba en la 5.10**) y tamaño de chunk (el de siempre) |
| Java `:app:compileDebugJavaWithJavac --offline -q` | ✅ exit 0 (`MainActivity`, `OrientationPlugin`, `AudioRoutePlugin`) |

### Navegador
| Área | Qué se comprobó | Resultado |
|---|---|---|
| Inicio, letra Normal | 390×844 y 320×640: Temas, Prácticas y Gramática **sin scroll**; nada fuera de pantalla | ✅ |
| Inicio, Muy grande | 390×844: Temas 0, Gramática 0, **Prácticas 26 px** · 320×640: **227 / 323 / 283 px** (con Grande: 0 / 5 / 0) | ⚠️ REV-F-01, REV-F-02 |
| Inicio, horizontal 780×360 | Desplaza 205–301 px **también con Normal** (es el diseño en horizontal, igual que antes); con Muy grande se queda en 1,15 (+8 px) | ✅ sin cambio |
| Letra en horizontal | Muy grande → `--fs 1.15`, `data-fs="l"`; al volver a vertical, 1,3 | ✅ |
| Clase | «Abriendo el micro… espera» con apertura lenta (1,5 s); papelera → recuadro «Grabación descartada…» que **sigue a los 4 s**; grabación muda → «La grabación llegó vacía…» sin enviar nada; envío normal (17 KB); informe con «meta B1: 95+» | ✅ |
| Clase de Gramática | Respuesta con « » → tramos `en-US` y `es-ES` (velocidad 0,76, tono 1); 2 correcciones, cada una con su 📘 | ✅ |
| «Terminar» la clase guardada | `MascotPage` «¿Terminar la clase?»: «No, la sigo otro día» la cierra sin terminar; «Sí, terminar y evaluar» → informe | ✅ (el Atrás de Android no se puede simular en la web) |
| Hoja 📘 en clase | ▶ explicación → foco `pause`; ⏸ flotante abajo; «Ejercicios» la para; cerrar la hoja la para y suelta el foco (`pause, abandon`) | ✅ |
| Gramática en el Inicio | ⏸ flotante justo encima de la barra en 390×844 (≈ 20 px sobre «Hablar»), 320×640 (Muy grande) y 780×360 (Grande); Atrás y «Ejercicios» paran la voz y sueltan el foco | ✅ |
| «Pregúntale» | Respuesta → abrir el tema → Atrás: la respuesta sigue y **0 llamadas** nuevas | ✅ |
| «Ordena» con colocación alternativa | `present-simple-7` ordenado «On Sundays my dad never works» → **¡Correcto!** y se enseña esa frase | ✅ |
| Colores en claro | `--ok #0b7a53`, `--bad #b91c1c` | ✅ |
| Atrás conserva la altura (REG-A4-09) | En `npm run dev` **vuelve arriba**: el registro de `scrollTo` muestra `1920` (restauración) y después `0` del tema, por el doble efecto de `StrictMode` (solo en desarrollo). En la release el efecto corre una vez y debería funcionar | ⚠️ REV-F-03 |
| Repaso | Tarjetas de la 5.10 sembradas con el texto viejo («gets in in…», in-case-vs-if-8 en español): `syncCards` las rehace, **conserva FSRS** (reps 3, stability 7,5, `due`), la segunda pasada no escribe nada y la huérfana queda intacta. En el Repaso sale la frase nueva; «Abriendo el micro…»; envío y valoración | ✅ |
| «Dilo tú» | «Abriendo el micro… espera»; Atrás grabando → micro cerrado y nada enviado | ✅ |
| Test de nivel | **No recorrido** hasta la tarea de habla (en la web no se puede acortar sin tocar código); cubierto por el test de fuente de `d1-mic` (fase `opening`, billete) | ⏭️ teléfono |
| Prueba de sonido (`habla:sound-test`) | Voz `es-ES` «Si me oyes, dime:» + frase `en-US`; con voz simulada → «¡Te oigo perfecto!»; sin voz → «No te he oído» a los 8 s; 2 fallos → «Ver la frase» («Di: «warm coffee»»); minimizar escuchando → micro cerrado, nada abierto en segundo plano | ✅ |
| Ajustes «Apariencia» | 4 tamaños (`role="radio"`), vista previa (profe, «Empezar», «Repaso de hoy»), cambio en vivo `--fs 1 → 1.3 → 1` | ✅ |
| Importar copia | `buildBackup()` → **versión 2** (hay tarjetas de Gramática); se acepta; `MascotPage` «¿Cambiar tu progreso…?»: «No, me quedo» no cambia nada; «Sí, usar la copia» importa (4 tarjetas, 2 sesiones) | ✅ |
| Novedades | Se abre y pinta la 5.10. **Falta la entrada 5.10.1 y subir `version.json`** (lo hace el orquestador al cerrar la entrega) | ⏭️ orquestador |

### NC de la regresión final
| ID | Sev. | Dónde | Escenario | Arreglo sugerido |
|---|---|---|---|---|
| REV-F-01 | BAJA | Inicio › Prácticas (`Home.tsx`) | 390×844 con «Muy grande», «Repaso de hoy» y el plan completado: la pestaña Prácticas desplaza 26 px (D4 midió sin la tarjeta del Repaso) | Con `data-fs="xl"`, compactar la tarjeta del plan completado o «Repaso de hoy» |
| REV-F-02 | BAJA | `src/lib/fontScale.ts` (`MAX_PORTRAIT`) | 320×640 en vertical (pantalla pequeña tipo A11) con «Muy grande»: el Inicio desplaza 227–323 px; con «Grande», 0–5 px. Regla del proyecto: «sin scroll en el Inicio» | Tope por alto: en vertical con alto ≤ ~700 px, 1,15 (como en horizontal), avisado en la vista previa como ya se hace en horizontal |
| REV-F-03 | BAJA | `src/components/GrammarRoutes.tsx` (efecto de restauración) | El efecto borra la altura guardada en su primera ejecución; con `StrictMode` (desarrollo) el tema vuelve a subir y ya no se restaura. En la release debería ir bien, pero es frágil y no se puede probar en `habla-dev` | Borrar la altura en la limpieza del efecto (o tras un `requestAnimationFrame`), no en el cuerpo |

Observaciones (sin NC): si Gemini pone inglés entre « », se lee con voz española (el prompt lo prohíbe; vigilarlo en
uso real) · la regla CSS `.relative.z-[2]` sin escapar viene de la 5.10.

### Veredicto por bloque
| Bloque | Veredicto | Nota |
|---|---|---|
| D1 · Micro y grabación (+ prueba de sonido) | **GO** | Ruta Bluetooth, punto verde y tiempos solo se ven en el teléfono |
| D2 · Voz y foco de audio | **GO** | REV-F-03 (BAJA) a confirmar en la release |
| D3 · Contenido de Gramática | **GO** | — |
| D4 · Prompts, fonética, interfaz y letra | **GO con 2 BAJA** | REV-F-01 y REV-F-02 solo con «Muy grande»; no bloquean |
| **5.10.1 en conjunto** | **GO para el APK debug y la prueba en el teléfono** | Antes de la release: `version.json` + Novedades 5.10.1 (orquestador) y decidir REV-F-01/02/03 |

### Solo se puede ver en el teléfono (POCO con los soundcore; el A11 solo si el dueño lo permite)
1. REG-M-01: «grabando» < 2,5 s con la ruta preparada; A2DP mientras habla el profe y `MODE_IN_COMMUNICATION` sin punto
   verde al acabar; vuelta a `NORMAL` tras enviar, a los ~20 s sin tocar, al minimizar, al bloquear y al salir; posible
   «clic» A2DP↔HFP.
2. REV-D1-02: Habla minimizada + auriculares sin probar → `dumpsys audio` en `NORMAL`; al abrir, selector o prueba.
3. Prueba de sonido real: umbral del detector con el micro SCO, tiempo total ≤ 6 s, Spotify en pausa y sin contar como voz.
4. Foco con Spotify: explicación = 1 `requestFocus pause` + 1 `abandonFocus`; ▶ corto baja la música; ▶ mientras grabas
   no la devuelve; el foco `pause` (`USAGE_VOICE_COMMUNICATION`) no cambia el modo de audio.
5. «May fifth» y los tramos es/en con las voces reales; tono normal en español con Leo.
6. Letra del sistema: `getFontScale` frente a `--fs` (POCO 0,86; A11 con 1,3); clase en horizontal en el A11.
7. Atrás de Android: cierra «¿Terminar la clase?» y la pregunta de importar; REV-F-03 (altura al volver) en la release.
8. Caché tras Compartir (REG-A2-04), gracia por credencial (REG-A2-03), logcat del release sin nombre de auriculares (REG-A2-06).
9. Test de nivel hasta la tarea de habla: «Abriendo el micro…» y borrador/retomar intactos.

### Retoques REV-F-01/02/03 y Novedades 5.10.1 — 2026-10-21

**Veredicto: APROBADOS.** `tsc` ✅; `d4-letra` + `d2-*`: 35/35 ✅. Navegador (`rev.localhost`, IA simulada):
| Punto | Resultado |
|---|---|
| REV-F-02 · `fontScale.ts` `SHORT_HEIGHT = 700`, `isTightScreen` (horizontal o alto < 700 → tope 1,15) | ✅ 320×640 con «Muy grande» → `--fs 1.15`, `data-fs="l"`; Inicio: Temas 0, Gramática 0, Prácticas **5 px** (antes 227 / 283 / 323) |
| REV-F-01 · `Home.tsx` (`home-title`) y `PlanCard.tsx` | ✅ 390×844 con «Muy grande»: Temas 0, Gramática 0, Prácticas **3 px** (antes 26) |
| REV-F-03 · `GrammarRoutes.tsx` (restaurar con `setTimeout(0)` y limpieza; la altura no se borra, se sobrescribe en el siguiente `go()`) | ✅ en `npm run dev` (StrictMode): tema → bajar a «Relacionado» (3000 px) → abrir uno → Atrás → **3000 px**; un segundo Atrás vuelve a la sección. Una altura vieja no puede reaparecer: la ruta solo vuelve arriba tras un `go()` que la reescribe |
| `version.json` | ✅ `5.10.1` · build 41 · 2026-10-21; Ajustes → «Versión 5.10.1» |
| Aviso de versión nueva | ✅ con `lastSeenVersion = 5.10`, al abrir: «Parche de seguridad 5.10.1 · Actualización de parches de seguridad y corrección de la v5.10» y su lista; «Entrar» guarda `lastSeenVersion = 5.10.1` |
| Novedades | ✅ la 5.10 dice «instalada (5.10.1) · 1 parche» y debajo el desplegable «5.10.1 · Parche de seguridad 5.10.1 · 21 oct 2026» (parche dentro de la 5.10, no versión suelta) |

Residuo menor (sin NC): con «Muy grande» la pestaña Prácticas aún desplaza 3–5 px; no tapa nada (el contenido cabe
menos de una línea). Si se quiere 0 exacto, recortar un poco más la descripción de Prácticas con `data-fs`.
**Regresión final: GO se mantiene, ya sin NC abiertas.**
