# 5.11 · Revisión independiente (R)

Rama `v5.11` (sin commits). Revisor R: no edita `src/`, `android/` ni tests; evidencias en `evidencia/R/`.
Severidad: ALTA / MEDIA / BAJA. Cada bloque: veredicto, comprobación por tarea, pruebas y NC de revisión (`REV-11-Dn-nn`).
Mutantes: siempre en una **copia** del árbol (`scratchpad/mut`, con `node_modules` enlazado); cada archivo se restaura y
se compara con `cmp` contra el del árbol compartido (que nunca se toca).

## D1 · parcial (ronda 1) — 2026-10-21

**Veredicto: NC (5 × BAJA, sin fallo de fondo).** M-04, M-08, M-09, M-11, M-12a y S-06 cumplen sus criterios hasta donde
se pueden comprobar sin F0-4; la 5.10.1 no se rompe (tests previos en verde, la clase manda el mismo audio y las mismas
peticiones). Quedan dos detalles de comportamiento pequeños (recordatorio que no rota para quien abre la app a diario,
texto del globo que puede cambiar a la vista), un toque pequeño en «¿Por qué?» y dos huecos de test que dejan vivir
mutantes. Ninguno bloquea a D4 ni la integración; se pueden cerrar en la ronda 2 de D1 (con M-12b y S-11) y mirarlos en
la regresión final sin repetir la revisión completa.

Alcance: `git diff` de `stats.ts`, `mascotTips.ts`, `reminders.ts`, `PlanCard.tsx`, `pronunciation.ts`, `phonetics.ts`,
`wav.ts`, `PronunciationView.tsx`, `tests/d4-phonetics.test.mjs` y los nuevos `tests/m1-*.test.mjs` y
`tests/fixtures/azure-doc-*.json`, tal como estaban al empezar. I-4 ya está montada por D4 en `Home.tsx`
(`favorites`/`onAltTopic`, `restedYesterday`, `noteTipShown`): se probó con ella.

### Comprobación por tarea

| Tarea | Criterio del plan | Resultado | Notas del revisor |
|---|---|---|---|
| M-04 | Regla lunes–domingo; dos en la semana o dos seguidos rompen; hoy sin practicar como antes | ✅ | `computeStreak` (`stats.ts:37-57`) correcta en los caminos analizados (abajo). El comodín exige práctica el día anterior: no inventa racha |
| M-04 | `Dashboard.restDay?` + globo «Ayer descansaste; tu racha sigue a salvo» | ✅ | `restDay`/`restedYesterday` opcionales; 3 variantes `rested`, una explica la regla y otra avisa de que dos seguidos la rompen. Navegador: practicado 17-18-19, ayer (20) sin práctica → racha **3**, `restDay '2026-10-20'`, `restedYesterday true`, la llama del Inicio marca 3 |
| M-04 | `m1-streak` ≥ 8 casos + regresión idéntica a la 5.10.1 | ✅ / ⚠️ | 12 casos; regresión con 300 historiales (la función `legacy` es copia literal de la 5.10.1). Pero no fija el **lunes** como inicio de semana (REV-11-D1-02) ni el cálculo de `restDay`/`restedYesterday` (REV-11-D1-03) |
| M-08 | Mascota + «Hoy no he podido preparar tu lección; mientras, ¿charlamos de *tema*?» + tema + «Reintentar»; sin rojo | ✅ | `Mascot` (44 px, `thinking`) + `.tip-bubble` (equivale a `MascotSays`). El motivo, en gris tras «¿Por qué?». Color del texto `rgb(13,37,48)` (no `--bad`) |
| M-08 | Nav: 390×844, 320×640, 780×360; Inicio sin scroll; tema en 1 toque | ✅ | Capturas `D1-04/05/06`. Vertical: 0 px de scroll (también con «¿Por qué?» abierto en 320×640). Horizontal: 202 px, el desplazamiento de siempre en horizontal (5.10.1: 205–301 px). Nada fuera de pantalla. Un toque en «✈️ Viajes y culturas» → «Preparando tu clase…» del tema. Volver al Inicio: el error sigue y **0 peticiones nuevas** (AUD-RES-703 intacto). Ver REV-11-D1-04 |
| M-09 | 3–4 redacciones de `goal`/`streak`/`review`, sin repetir la última | ✅ / ⚠️ | `pickVariant` evita las dos últimas; `localStorage` con try/catch. Ver REV-11-D1-05 (se elige en cada recálculo, no al mostrarse) |
| M-09 | Consejos de temporada jubilados tras 2 vistas (`habla.adviceSeen`); permanentes en rueda | ✅ | 12 de temporada, 6 permanentes. `noteTipShown` ya llamado en `Home.onTipShown` (I-4) |
| M-09 | Ningún texto con `/mant[eé]n|candado|desliza/i` | ✅ | Test sobre variantes, consejos, avisos y recordatorios (> 40 textos) |
| M-09 | Recordatorio con texto variado (Tel) | ⚠️ | REV-11-D1-01 |
| M-11 | `NBestPhonemeCount: 5`, lectura de `NBestPhonemes`, normalización, «/θ/ 45 · te salió /s/» | ✅ (código) | REST plano y SDK anidado; `normPhoneme` (ː, ɡ, ɚ); `heardInstead` con umbrales provisionales `{70, 40, 15}`. Chip y `aria-label` en español |
| M-11 | Sin NBest, la vista igual que hoy | ✅ | Sin `nbest` no hay `heard`: el chip pinta `/θ/` como en la 5.10.1 y la frase del coach es idéntica (test) |
| M-11 | Segundos enviados iguales que en la 5.10.1 | ✅ (código) | `toWav16k` sin `padMs` da los mismos `seconds` y bytes (test con `AudioContext` simulado); la clase hace las mismas 1–2 peticiones con el mismo audio. Medida en el log: Tel |
| M-11 | Tests con respuestas **reales** de F0 | ⏭️ F0-4 | Hoy, `azure-doc-*` (formato de la documentación). El test que recorre `azure-f0-*.json` ya está listo |
| M-12a | /θ/ y /ð/ con pistas latinoamericanas; 0 «España» | ✅ | Textos exactos del plan; `d4-phonetics` actualizado sin perder lo que probaba |
| S-06 | Una petición con referencia, `EnableMiscue: false`, NBest 5, 300 ms delante y detrás | ✅ | `assessWord` + `WORD_CONFIG` (también sin prosodia: bien, son palabras sueltas); `padSamples` y `seconds` con el relleno incluido (lo que factura Azure) |
| S-06 | Política F0/S0 y cuota agotada; sin nota con cuota agotada | ✅ | `runWordPhonetics` → `null` sin llamar (apagada, sin Azure, F0 agotado, palabra vacía); S0 con mes «agotado» sí evalúa; 403 de cuota → parche `phoneticsOn:false` + aviso a la mascota. `runPhonetics` comparte `azureFailure` sin cambiar nada |
| S-06 | Devuelve `{ accuracy, target?: { phoneme, accuracy, heard? }, phonemes[] }` | ✅ | `WordScore`. Peor aparición del sonido objetivo |
| S-06 | Tel: 5 palabras ≤ 15 s en el log de Diagnóstico | ⏭️ Tel | Por consola `[HABLA-NET] azure 200 1.4s ref nbest` (Diagnóstico de Azure fuera de la 5.11: decisión del orquestador) |

### Racha: caminos analizados (`computeStreak`)

| Caso | Resultado |
|---|---|
| Sin historial / solo hoy | 0 / 1, sin comodín ✅ |
| Hoy sin practicar, ayer sí | Cuenta desde ayer (como la 5.10.1) ✅ |
| Hoy sin practicar, ayer descanso, anteayer sí | Racha a salvo; mañana sin practicar → 0 (dos seguidos) ✅ |
| Hueco de 1 día con práctica antes | Comodín si la semana (lunes–domingo) no lo usó ✅ |
| Dom + lun sin práctica (cruzan semana) | El lunes ve que el domingo tampoco → se rompe ✅ |
| Dos huecos en la misma semana | Se rompe en el más antiguo ✅ |
| Cambio de mes / de hora (DST) | `new Date(y, m, d - n)` y `setDate` en hora local: sin saltos ✅ |
| Hueco antes de toda práctica | No se cuenta (exige práctica el día anterior) ✅ |

### Pruebas ejecutadas

- `npx tsc -b` ✅ exit 0 (`evidencia/R/D1-01-tsc.txt`) · `npm run lint` 0 errores (avisos antiguos) · `oxlint` de los 8 archivos
  de D1: limpio. Finales de línea CRLF conservados en todos.
- `npm test` (`evidencia/R/D1-02-tests.txt`): **306 tests, 304 ✔, 1 ✖, 1 `todo`** (SEG-509). El ✖ es
  `m3-sounds.test.mjs` «Progreso: withListen/withAzure…», de **D3** (trabajo en curso, no de D1). Los de D1 más los que
  tocan su código (`m1-*`, `d4-phonetics`, `mascotTips`): **50/50** ✅.
- **Mutación** (`evidencia/R/D1-03-mutacion.txt`, 25 mutantes, todos restaurados = idénticos): **21 mueren**.
  Sobreviven: **M04** semana de domingo a sábado (REV-11-D1-02) · **M06** `restedYesterday: false` en `loadDashboard`
  (REV-11-D1-03) · M13 quitar la normalización al comparar el más probable con el esperado (casi equivalente: el margen
  con la propia puntuación ya lo cubre; sin acción) · M16 quitar el `sort` de `parseNBest` (los fixtures ya vienen
  ordenados, como los da Azure; el nombre del test promete más de lo que prueba: un fixture desordenado lo cerraría, sin NC).
- **Navegador** (`habla-dev`, origen aislado `r11.localhost:5173`, arnés propio `evidencia/R/r11-nav.js`: Gemini y Azure
  falsos con 503, perfil B1 sin plan y 3 favoritos). **Ninguna petición real a Google** (`read_network_requests`
  `googleapis`: vacío). El panel estaba oculto: medidas por DOM; las capturas sí salieron.
  - M-08 en 390×844 / 320×640 / 780×360 → `D1-04-m08-390x844.jpg`, `D1-05-m08-320x640.jpg`, `D1-06-m08-780x360.jpg`.
    Antes de la tarjeta sale la hoja de problemas de Gemini de siempre («Gemini está saturado…»); «Ahora no» la cierra.
  - M-04 con práctica sembrada (`habla.practiceSeconds`): ver la tabla. El globo «Ayer descansaste…» no llegó a verse:
    con el panel oculto la rueda de globos no avanzó en 40 s (cubierto por `m1-tips`).
- Vite arranca con el árbol actual (el `soundData` que faltaba a D1 ya no rompe).

### NC de la revisión

| ID | Sev. | Dónde | Escenario | Arreglo sugerido |
|---|---|---|---|---|
| REV-11-D1-01 | BAJA | `reminders.ts:68-71` y `:119` (`dailyBody(i, …)`) | El texto rota por la **posición** del aviso desde la última reprogramación, y `syncReminders` reprograma cada vez que se abre la app. Quien abre Habla a diario recibe siempre el aviso `i = 0`: «Hoy toca: …» si hay lección, y si no (sin plan, plan terminado, sin clave) **siempre** «Unos minutos hablando cada día…», como en la 5.10.1. El criterio Tel «recordatorio diario con texto variado» falla justo con el usuario habitual | Elegir el texto por la **fecha** del aviso (p. ej. `dayNumber(at) % DAILY_BODIES.length`) y dejar la lección solo en el primero. Test: dos reprogramaciones en días seguidos dan textos distintos para el primer aviso sin lección |
| REV-11-D1-02 | BAJA | `tests/m1-streak.test.mjs` | Ningún caso distingue «lunes–domingo» de «domingo–sábado»: el mutante M04 (`weekKey` con la semana empezando en domingo) pasa los 12 tests | Caso: descanso el **domingo 18** y el **martes 20** → la racha sigue (semanas 12–18 y 19–25). Con semana de domingo ambos caerían en la misma y se rompería |
| REV-11-D1-03 | BAJA | `stats.ts:126-131` y `:142-143` | `restDay` (comodín de **esta** semana) y `restedYesterday` se calculan dentro de `loadDashboard` (Dexie) y ningún test los cubre (mutante M06 vive). Comprobado a mano en el navegador | Extraer `restInfo(restDays, today)` pura y probarla: ayer descanso; descanso de la semana pasada → `restDay` vacío y `restedYesterday` falso; lunes con descanso el domingo anterior |
| REV-11-D1-04 | BAJA | `PlanCard.tsx:145` | «¿Por qué?» mide **17 px** de alto (13 px en 320×640, con la escala). Diana pequeña para el Galaxy A11 con la pantalla dañada | Zona de toque ≥ 28–32 px sin mover el texto (p. ej. `py-2 -my-2` o `inline-block min-h-…`) |
| REV-11-D1-05 | BAJA | `mascotTips.ts:107-110` (`variant` en `buildTips`) + `Home.tsx:205-224` | La redacción se sortea en **cada** recálculo del `useMemo` de Home (≈ 17 dependencias; `dash`, `favs` y `plan` llegan asíncronos, el plan se crea unos segundos después). `MascotBubble` pinta `tips[idx]` en vivo: un globo ya abierto puede cambiar de texto delante del usuario, y cada recálculo «gasta» variantes no vistas en `habla.tipVariants` | Sortear una vez por apertura del Inicio (p. ej. memo de las elecciones por grupo en un `useRef`/semilla que `buildTips` reciba) o registrar la variante en `noteTipShown`. Test: dos `buildTips` seguidos con la misma semilla dan el mismo texto |

### Observaciones (sin NC)

- **Reserva del 400 (M-11):** cualquier 400 `other` (no solo uno causado por `NBestPhonemeCount`) apaga NBest para toda la
  sesión y repite la petición una vez. Aceptable como red de seguridad hasta F0-4; cuando F0-4 dé el cuerpo real de un
  400, conviene acotarlo (p. ej. `/NBest/i.test(body)`) para no perder M-11 por un audio raro.
- `HEARD_RULES` y la lista de símbolos son **provisionales** hasta F0-4 (lo dice el código y el informe). M-11 y S-06 se
  aprueban en código; su aceptación final (fixtures `azure-f0-*`, ≥ 12/20 «te salió», segundos medidos) queda para F0-4 y Tel.
- Algunas líneas nuevas pasan de 150 caracteres (hasta 182, en JSX con plantillas): igual que otras del proyecto, sin NC.
- Textos revisados: español neutro con «tú» («Ya hablaste», «¿Charlamos un rato?», «soltar la lengua»). «No he podido
  preparar…» es la redacción del propio plan.

## D2 · Logros y clase (ronda 1) — 2026-10-21

**Veredicto: NC (1 × MEDIA, 4 × BAJA).** M-06, M-07 y M-10 cumplen sus criterios en código y tests, y la política de
niveles queda intacta («Hoy has sonado como…» solo se pinta; los hitos no tocan el nivel). M-03 funciona en el
navegador (celebra, uno por vez, nunca dos veces, no tapa la barra), pero la regla que evita la avalancha al actualizar
**silencia también el primer hito de un alumno nuevo** si llega pasados 2 días de su primera actividad (REV-11-D2-01):
hay que arreglarlo antes de aprobar M-03. El resto son huecos de test y un texto ambiguo.

Alcance: `git diff` de `teacher.ts`, `fluency.ts`, `srs.ts`, `ReportView.tsx`, `Conversation.tsx`, `ProgressScreen.tsx`,
`ReviewScreen.tsx`, `SettingsScreen.tsx` y los nuevos `turnStyle.ts`, `milestones.ts`, `MilestoneGate.tsx`,
`tests/m2-*.test.mjs`. La línea extra de `Conversation.tsx` (`session={session}`) está aceptada por el orquestador.
I-1 (`MilestoneGate` en `App.tsx`) ya montada por D4: se probó con ella.

### Comprobación por tarea

| Tarea | Criterio | Resultado | Notas del revisor |
|---|---|---|---|
| M-06 | Decisión en código, 1.º turno pregunta, nunca dos retos seguidos, ~30 %, ≥ 6 retos | ✅ | `planTurns` determinista (turno + id de sesión); tras un reto siempre pregunta; p = 3/7 → 30 % estacionario; 8 retos, nunca el mismo dos veces seguidas |
| M-06 | Sin tocar `buildSystemPrompt`; test, «Dilo tú» y Gramática idénticos | ✅ | La nota va al final del `system` **solo en esa petición** (no entra en el historial ni en la clase guardada); con `''` la petición es la de la 5.10.1 (test). En Gramática, `turnNoteFor` da siempre `''`. `d4-prompts`, `teacher`, `promptInjection`: verdes (SEG-509 sigue `todo`) |
| M-06 | Tel: 10 turnos con clave real | ⏭️ Tel | — |
| M-07 | Media de las 5 últimas terminadas; < 2 → «primera referencia»; escritas fuera de ppm/pausas | ✅ | `baselineFrom` (antes de esta, sin la propia ni posteriores). Navegador 320×640 con 3 clases previas sembradas: «▲ +12», «▲ +15», «▲ +4» y pausas «▼ −1» en verde; cifras comprobadas a mano (medias 63 / 85 / 10 / 2,5). Sin scroll horizontal (`D2-07-m07-informe-320x640.jpg`) |
| M-07 | UX-09 «Hoy has sonado como un B1+» + «(tu nivel lo fija el test)», oculto en A1–A2 | ✅ | Solo texto; no escribe nada en el perfil. «meta B1: 95+» con perfil B1 (no hay «meta B2» fija) |
| M-03 | Deriva de Dexie, idempotente, `milestones (id, at)` | ✅ | `addIfMissing` con `add` que falla si existe. Navegador: «3 días seguidos» (racha con el comodín de M-04) celebrado una vez; tras recargar no vuelve; el siguiente («Tu primera clase de más de 5 minutos») sale **después** del aviso de tarea (`NoticeGate`) y solo uno |
| M-03 | Sin avalancha al actualizar; copia restaurada no re-celebra | ✅ / ❌ | Copia con la tabla: OK (test). Backfill silencioso: OK para quien ya usaba la app… pero ver **REV-11-D2-01** |
| M-03 | Mascota `happy` con frase propia (4 × 11), animación ≤ 2 s, sin tapar la barra | ✅ | 1,2 s, una vez, no arranca con `document.hidden`. Navegador: capa hasta 748 px con la barra en 767 (390×844), 563/578 (320×640); en horizontal la capa acaba en 694 y el carril empieza en 713 (`D2-04/05/06`). Sin scroll interno. La hoja de problemas de Gemini (z 50) puede salir encima de la celebración (z 40); al cerrarla, la celebración sigue: aceptable |
| M-03 | «Tus logros» con fecha y «Te faltan N» | ✅ | Tarjeta en Progreso «2 de 11 · el último: …», lista en `InfiniteList`, Atrás registrado |
| M-03 | Tel: sin animación en segundo plano (CPU) | ⏭️ Tel | — |
| M-10 | «Que decida Habla» apagado por defecto; aplica `suggestedGrade`; `unknown` no pasa sola; un toque cancela; segundo plano cancela | ✅ (código) | `autoGrade` + cuenta atrás con `whenBackground(stop)` y `onPointerDownCapture`. Espera a que la mascota explique la primera vez (`helpPending`) |
| M-10 | 1 de cada 4 en «Escucha y repite», nunca en Gramática; misma evaluación y FSRS | ✅ | `reviewMode`; una sola llamada a `evaluateDrill`. La voz suena 450 ms después de la tarjeta; no abre el micro |
| M-10 | Nav: cuenta atrás visible y cancelable en 320×640 | ⏭️ regresión | No recorrido (necesita micro y evaluación simulados en el Repaso); queda para la regresión final |

### Pruebas ejecutadas

- `npx tsc -b` ✅ · `npm run lint` 0 errores · `node --test tests/m2-*.test.mjs` + `d4-prompts`, `teacher`, `fluency`,
  `promptInjection`: **37 ✔, 0 ✖, 1 `todo`** (SEG-509).
- **Mutación** (`evidencia/R/D2-02-mutacion.txt`, 25 mutantes válidos, todos restaurados = idénticos): **21 mueren**.
  Sobreviven N06 (Conversation no pasa la nota del turno → REV-11-D2-03), N18 (contar filas de lección como sonidos
  dominados) y N19 (clase de 5 min sin exigir ≥ 3 respuestas) → REV-11-D2-02, y N24 (auto-pase durante la explicación de
  la mascota) → REV-11-D2-04.
- **Prueba del revisor** (`evidencia/R/D2-03-backfill-alumno-nuevo.txt`, en la copia): alumno nuevo que empezó hace 2 días
  y 1 hora y hoy cumple «3 días seguidos» → `isBackfill = true`; el hito se guarda **ya celebrado** y la mascota no dice nada.
- **Navegador** (`r11.localhost:5173`, arnés `r11-nav.js`, Gemini falso con 503; ninguna petición real): M-03 en los 3
  tamaños y M-07 en 320×640 (ver tabla). Con el panel oculto la animación queda congelada a los 200 ms (opacidad a medias):
  las capturas se tomaron tras `animation.finish()`.

### NC de la revisión

| ID | Sev. | Dónde | Escenario | Arreglo sugerido |
|---|---|---|---|---|
| REV-11-D2-01 | MEDIA | `milestones.ts:180-182` (`isBackfill`) y `:230` | «Primera mirada con historial antiguo» = tabla vacía y actividad de hace > 2 días. Un alumno **nuevo** de la 5.11 que no consigue ningún hito en sus 2 primeros días (clases cortas, solo repaso…) cumple esa condición cuando llega el primero: «3 días seguidos» se guarda celebrado y **nunca se celebra** (reproducido). Le pasa justo a quien más lo necesita (p. ej. alguien que empieza con clases cortas) | Decidir el backfill **una sola vez**: marca persistente (`habla.milestonesSince` o en Preferences) puesta en la primera sincronización; es backfill solo si la tabla está vacía **y** la actividad es anterior a esa marca. Una copia sin la tabla trae actividad anterior a la marca → silencioso, como ahora. Test: alumno nuevo a los 3 días → se celebra; usuario de la 5.10.1 → silencioso |
| REV-11-D2-02 | BAJA | `milestones.ts:210` y `:219` (`loadMilestoneState`) | El cálculo del estado desde Dexie no tiene test (N18 y N19 viven): contar lecciones de Sonidos como «sonido dominado» o una clase de 5 min con 1 respuesta pasaría | Separar `stateFrom({ dash, cards, grammar, sounds, sessions, plan })` pura y probarla |
| REV-11-D2-03 | BAJA | `Conversation.tsx:276-283` | Nada comprueba que la clase **pase** la nota a `teacherTurn` (N06: con `''` todos los tests pasan y M-06 no haría nada) | Test de fuente como el de `m2-review` (`turnNoteFor(` y `note,` en la llamada) o `askTeacher` con Gemini simulado |
| REV-11-D2-04 | BAJA | `ReviewScreen.tsx:148` y `:160` | Que la cuenta atrás espere a la explicación de la mascota de la primera vez (`helpPending`) no está probado (N24 vive): sin ello, la primera tarjeta podría pasar sola mientras el alumno lee la ayuda | Añadir la condición al test de fuente de `m2-review` o extraer la decisión a una función pura |
| REV-11-D2-05 | BAJA | `ReportView.tsx:88` | En la tarjeta «2 · pausas > 1 s · 1,5/min» la flecha dice «▼ −1 frente a tu media», pero compara **pausas por minuto**: se lee como «una pausa menos» | Unidad en el texto: «▼ −1/min frente a tu media» |

### Observaciones (sin NC)

- Cada vuelta al Inicio y cada apertura de Progreso, `syncMilestones` lee enteras `cards`, `sessions`, `grammar` y `sounds`
  y recalcula `loadDashboard`: con los datos de hoy es poco; conviene medir la vuelta al Inicio en el A11 (Tel).
- «Escucha y repite» evalúa con el prompt «They saw this Spanish sentence»: el veredicto vale (la referencia es la misma);
  de acuerdo con D2 en dejarlo así salvo que el Tel muestre veredictos raros.
- Textos en español neutro con «tú»; 44 frases de mascota revisadas por muestreo, sin regionalismos de España.

## D4 · Sonidos: interfaz e integración (ronda 1) — 2026-10-21

**Veredicto: NC (1 × MEDIA, 2 × BAJA), con la ronda 2 ya en marcha.** La privacidad del micro (regla 9) está bien
resuelta en «Dilo tú» de Sonidos y las integraciones I-1, I-3 e I-4 funcionan (probadas en las revisiones de D1 y D2).
La NC MEDIA es la que ya decidió el orquestador (celdas < 36 px reales en 320×640); en el árbol actual (ronda 2 a medias)
ya medí 36 px reales, pero se cierra al revisar la ronda 2. Quedan dos huecos de test. Mucho de S-08/S-09/S-10 depende
del contenido de D3 (8 fichas reales, 2 lecciones): se verá en la ronda 2 y en la regresión final.

Alcance: `SoundsPanel`, `PhonemeChart`, `SoundRoutes`, `SoundSheet`, `SoundExercises`, `SoundSay`, `SoundScreen`,
`SoundLessonScreen`, `AlphabetScreen`, `soundLink.ts`, `soundAudio.ts`, `soundGame.ts`, diffs de `App.tsx`, `Home.tsx`,
`index.css`, `tts.ts`, y `tests/m4-sounds.test.mjs`. Ojo: D4 ya estaba editando la ronda 2 durante la revisión
(`PhonemeChart.tsx` a las 09:45, bloques «Oclusivas y fricativas / Nasales y las demás», `m4` con 17 tests en vez de 15).
El cambio de una línea en `speaking.ts` (instantánea de servidor de `useSyncExternalStore`) está aprobado por el
orquestador y no cambia nada en la app.

### Comprobación

| Tarea | Criterio | Resultado | Notas del revisor |
|---|---|---|---|
| Regla 9 | Micro y ruta solo con la parte abierta y en primer plano | ✅ | `SoundSay`: `holdRoute()` en un efecto de montaje (solo existe en la fase «Dilo tú»); apertura con `ticket()` (una apertura a medias se invalida con `close()` o con `releaseAllMics()` del segundo plano, `lifecycle.ts`); `whenBackground` vuelve a «Toca para hablar»; al desmontar, `close()` + para voz y audio. Mismo patrón que `GrammarSpeak` de la 5.10.1. «Escúchate» reproduce tu grabación solo en el teléfono (blob local). `recorder.ts` y `audioRoute.ts` no se tocan. Ver REV-11-D4-02 |
| S-06 en Sonidos | `runWordPhonetics` y «sin nota → Escúchate» | ✅ | Con fonética activa, «/θ/ 45 · Casi…» + «Te salió /s/ en vez de /θ/» + «nota orientativa»; sin Azure o sin nota, Escúchate (A-B-A-B, tocar otra vez lo para) y autoevaluación. Envío automático a los 10 s (no se factura silencio) |
| S-07 | 4.º segmento, intro, panel, tabla con scroll **dentro** | ✅ | Navegador 320×640 (Marea, claro): Inicio 800/800 (sin scroll), panel 158/645 con scroll propio, 0 scroll horizontal, «Sigue la ruta: 1. Ship o sheep…», «Ruta 0/2», «Abecedario» (`D4-01-sonidos-320x640.jpg`) |
| S-07 | Celdas ≥ 36×36 (consonantes) y ≥ 44 de alto (vocales) | ❌ ronda 1 / ✅ árbol actual | Ronda 1 (medida de D4): 32×32 px reales en 320×640 → REV-11-D4-01. Árbol actual: consonantes 67×36, vocales 67×44 px reales (modo compacto) |
| S-07 | Números de los segmentos ocultos < 360 px | ⚠️ | D4 los oculta por debajo de **420 px** («Gramática 12» se salía en 390). Razonable; que lo apruebe el orquestador (cambia el criterio del plan) |
| S-08 | Ficha completa; voz en-US aunque el profe sea Leo | ✅ (código) | Hoja `/θ/ think` en 320×640 sin errores: ▶, 🐢, «Sonido suelto», globo con ▶, labios/lengua/voz, «Para quien habla español» (Latinoamérica primero y España entre paréntesis: cumple M-12), ejemplos ▶. `speakUS`/`utterUS` no tocan la voz del profe (`readSegments` con `us = false` por defecto). Ver REV-11-D4-03 |
| S-08 | Test de recorrido de las 41 fichas | ⏭️ ronda 2 | Hoy solo en el navegador (con 33 de relleno); el test con `react-dom/server` llega con el cambio de `speaking.ts` |
| S-09 | Corrector de `spell-listen` | ✅ | Mayúsculas, espacios, guiones (U+2010–2015), puntos y comas no cuentan; cadena vacía nunca acierta. Lecciones A1–A3: esperan a D3 |
| S-10 | Correctores `listen-choose`, `odd-one-out`, `sort`; fases | ✅ | Probados (mutantes P01–P06 mueren). Las 12 lecciones de principio a fin: esperan a D3 (hoy V1 y C2a) |
| S-11 / I-3 | `openSound` → hoja encima; Atrás la cierra; sin «Practicar» encima de una clase | ✅ | `openSound('th')` desde el Inicio: hoja z-45, sin «Practicar»; ← la cierra y el Inicio sigue igual. Encima de una clase simulada: con la línea de D1 (regresión final) |
| I-1, I-4 | Montajes en `App.tsx` / `Home.tsx` | ✅ | Ver D1 (M-04, M-08, M-09) y D2 (M-03) |

### Pruebas ejecutadas

- `npx tsc -b` ✅ · `npm run lint` 0 errores (aviso nuevo `only-export-components` en `SoundRoutes.tsx` por exportar
  `useSoundData`: no bloquea; mejor moverlo a `lib/`) · `node --test tests/m4-sounds.test.mjs`: **17/17** ✅.
- **Mutación** (`evidencia/R/D4-02-mutacion.txt`, en la copia, restaurados = idénticos): **8 de 10 mueren**. Sobreviven
  P07 (`SPELL_GAP_MS = 0`, sin NC: es un número de diseño) y **P09** (aceptar cualquier voz `en-*` como americana) →
  REV-11-D4-03.
- **Navegador** (`r11.localhost:5173`, arnés `r11-nav.js`; ninguna petición real): pestaña Sonidos y hoja en 320×640
  (arriba). 390×844 y 780×360, los 4 temas y claro/oscuro: con la ronda 2 y en la regresión final (D4 ya midió 390×844 y
  780×360 en su informe). Nota: otro agente usaba el mismo panel del navegador (`d3.localhost`): R trabajó siempre con su
  `tabId` propio.

### NC de la revisión

| ID | Sev. | Dónde | Escenario | Arreglo sugerido |
|---|---|---|---|---|
| REV-11-D4-01 | MEDIA | `PhonemeChart.tsx` (ronda 1) | 320×640 (zoom 0,8): consonantes de 39×40 px CSS = **32×32 px reales**, por debajo de los 36 del criterio (decisión del orquestador: px reales). Es el teléfono de la madre (Galaxy A11) | En curso en la ronda 2 (consonantes en 2 bloques plegables). En el árbol actual ya mido 67×36 / 67×44 px reales: se cierra al revisar la ronda 2 con la tabla completa (41 fichas) |
| REV-11-D4-02 | BAJA | `tests/m4-sounds.test.mjs` | `SoundSay` es un consumidor nuevo del micro y nada fija que siga la regla 9 (ruta solo montado, `ticket()`, `whenBackground`, `close()` al desmontar). Un cambio futuro podría dejar la ruta Bluetooth o el micro abiertos sin que falle ningún test | Test de fuente como los de `d1-mic` para `GrammarSpeak`: `holdRoute()` solo en efecto de montaje, `recorder.current.begin(ticket)`, `whenBackground(` con `step === 'recording'`, `rec.close()` en el desmontaje |
| REV-11-D4-03 | BAJA | `tests/m4-sounds.test.mjs:194` y `tts.ts` (`isUS`) | El test «voz americana aunque el profe sea Leo» pasa también si se acepta una voz `en-GB` como americana (P09): no fija el criterio principal de S-08 | Caso con `prefVoice` = la voz en-GB de Leo elegida por el usuario → `utterUS` debe usar otra en-US (o `lang: 'en-US'` sin voz) |

### Observaciones (sin NC)

- En 320×640 con la tarjeta de error del plan visible, el panel de la tabla se queda en 158 px de alto (unas 2 filas):
  cumple «scroll dentro», pero con 41 fichas habrá que ver en la regresión si se usa bien (Tel en el A11).
- La hoja de un sonido tiene durante la animación de entrada `scrollWidth` 408 sobre 400 (8 px); al terminar, 400. Sin efecto.

## Rondas 2 de D4, D2 y D1 — 2026-10-21

Comprobaciones comunes (árbol de ese momento): `npx tsc -b` ✅ (`evidencia/R/R2-02-tsc.txt`) · `npm run lint` 0 errores ·
`npm test` **341 tests, 340 ✔, 0 ✖, 1 `todo`** (SEG-509) (`evidencia/R/R2-03-tests.txt`). Mutantes que vivían en la
ronda 1, rehechos en la copia (`evidencia/R/R2-01-mutacion-rondas2.txt`, `R2-05-mutacion-d1.txt`): **ahora mueren todos**
(N06, N18, N19, N24, P09, M04, M06→`restInfo`), más los nuevos de la regla 9 (P11 sin `rec.close()`, P12 sin
`whenBackground`), `dailyBody` por fecha (Q01), las fichas mandan sobre el código en `SOUND_TIPS` (Q02) y la ronda de
variantes (`newTipRound`). Único superviviente: N26 (la marca `_since` en `isBackfill`), equivalente.

### D4 · ronda 2 → **NC (1 × MEDIA nueva)**

| NC | ¿Cerrada? | Comprobación de R |
|---|---|---|
| REV-11-D4-01 | ✅ | `chartSizing` con el zoom real. Navegador (`evidencia/R/R2-04-sonidos-medidas.txt`), px reales: 320×640 compacto, consonante ≥ 67,1 × 36, vocal ≥ 66,7 × 44 · 360×780 (zoom 0,923) compacto, 75,2 × 36,9 / 74,7 × 44,3 · 390×844 completa, 39 × 40 / 81 × 46 · 780×360 completa, 41,6 × 40 / 68,3 × 46. 0 scroll horizontal en todos |
| REV-11-D4-02 | ✅ | Test de fuente de la regla 9 en `m4-sounds`; P11 y P12 mueren |
| REV-11-D4-03 | ✅ | Test con la voz en-GB de Leo elegida: la palabra suena con la en-US; P09 muere |
| Recorrido de fichas | ✅ | `renderToString` de cada ficha de `phonemes.json` (normal y en la hoja, sin «Practicar»). Cambio de `speaking.ts` aprobado por el orquestador |

| ID | Sev. | Dónde | Escenario | Arreglo sugerido |
|---|---|---|---|---|
| REV-11-D4-04 | MEDIA | `SoundsPanel.tsx:81` (`InfiniteList` de un elemento) | **El Inicio desplaza** si la pestaña Sonidos está abierta y lo de arriba crece: 390×844, la tarjeta del plan pasa de «Creando tu plan…» a la del error (o a la lección) → Inicio **888/844** (44 px de scroll); el panel se queda en 270 px. Solo se arregla con un `resize` (girar) o cambiando de pestaña. Tras girar varias veces con el mismo cambio: 939/844. La misma secuencia en **Gramática** queda en 844/844: es propio de Sonidos. Rompe «sin scroll en el Inicio» (CLAUDE.md) y pasa cada vez que el plan prepara la semana con Sonidos abierto | Que el panel vuelva a medirse cuando cambia lo de arriba: el padre del `InfiniteList` debe ser el contenedor flexible que encoge (como en `GrammarPanel`), o un `ResizeObserver` sobre la tarjeta del plan / el bloque superior del Inicio. Test o medida: tarjeta corta → larga con Sonidos abierto → Inicio 0 px |

### D2 · ronda 2 → **NC (1 × MEDIA nueva)**

| NC | ¿Cerrada? | Comprobación de R |
|---|---|---|
| REV-11-D2-01 | ✅ en lo pedido | Marca `_since` en la tabla `milestones` (celebrada, `real()` la excluye de hitos, «Tus logros» y `nextToCelebrate`; `backupCheck` la acepta). Los 3 casos tienen test: alumno nuevo celebra al 3.er día; quien viene de la 5.10.1 y la copia antigua restaurada, en silencio. Pero ver REV-11-D2-06 |
| REV-11-D2-02 | ✅ | `stateFrom` pura con test (N18, N19 mueren) |
| REV-11-D2-03 | ✅ | Test de fuente de la nota en `askTeacher` (N06 muere) |
| REV-11-D2-04 | ✅ | `autoGrade(…, waitingHelp)` (N24c muere) |
| REV-11-D2-05 | ✅ | `trend(…, { unit: '/min' })`: «▼ −0,5/min frente a tu media» |

| ID | Sev. | Dónde | Escenario | Arreglo sugerido |
|---|---|---|---|---|
| REV-11-D2-06 | MEDIA | `milestones.ts:192` (marca `_since`) + `backupCheck.ts` (`exportTables`, `backupVersionFor`) | La marca se escribe en la primera sincronización, así que la tabla `milestones` **nunca está vacía** en la 5.11. `exportTables` la exporta y `backupVersionFor` da **3** a todas las copias, aunque no haya ningún logro ni Sonidos. Reproducido (`evidencia/R/D2-08-since-copia-v3.txt`): filas `["_since"]` → versión 3. Rompe la garantía de S-01 («sin Sonidos ni logros, la copia la sigue leyendo la 5.10.1»): una copia de la 5.11 ya no se puede importar en un teléfono con la 5.8/5.10.1 (la madre y las amistades) | Que la marca no cuente como contenido: `exportTables`/`backupVersionFor` ignoran las filas `_since` (si solo está la marca, no se exporta la tabla; al restaurar una copia sin ella, el backfill silencioso es justo lo correcto), o guardar la marca fuera de la tabla (Preferences). Test en `backupCheck`/`m3-migration`: perfil 5.11 sin logros → copia versión ≤ 2. Coordinar D2 + D3 |

### D1 · ronda 2 → **APROBADA**

| NC / tarea | ¿Cerrada? | Comprobación de R |
|---|---|---|
| REV-11-D1-01 | ✅ | `dailyBody(at, first, lesson)` por número de día local; Q01 muere |
| REV-11-D1-02 / 03 | ✅ | Caso dom 18 + mar 20 (M04 muere); `restInfo` pura con 7 casos |
| REV-11-D1-04 | ✅ (medido por D1) | Toque de «¿Por qué?» de 40 px sin cambiar el alto del globo (captura de D1 en `evidencia/D1/`); R no lo volvió a medir |
| REV-11-D1-05 | ✅ | Variante por ronda, estable entre recálculos; la «última mostrada» se apunta en `noteTipShown`; `newTipRound` (D4 la llamará al montar el Inicio, decisión del orquestador) |
| M-12b | ✅ | `SOUND_TIPS` = fichas (`src/sounds/tips.json`, generado por el validador de D3) y el código solo para símbolos sin ficha; Q02 muere. /θ/ y /ð/ de las fichas: textos latinoamericanos |
| S-11 (línea) | ✅ | Solo con `pausable` (clase, Repaso, «Dilo tú» de Gramática); el test de nivel (`Calibration.tsx:1163`) no la tiene. **Navegador**: clase simulada (Gemini falso con respuesta válida) → `openSound('th')` abre la hoja encima, sin «Practicar» ni micro; ← la cierra; la clase **no se desmonta** (marca en el DOM intacta), mismo texto y **0 peticiones nuevas**. La grabación en curso no se pudo probar (el panel no tiene micro): Tel |

## D2 · ronda 3 (REV-11-D2-06) — 2026-10-21 → **APROBADA**

- Arreglo en `backupCheck.ts` (permiso del orquestador): `contentRows` quita la marca `_since` de `milestones`;
  `exportTables` no la escribe y `backupVersionFor` no la cuenta. Test `tests/m2-backup-since.test.mjs`.
- **Contra la 5.10.1 real** (`git show 307ecd7:src/lib/backupCheck.ts` en la copia del scratchpad; copias hechas con el
  código actual, `evidencia/R/R3-01-copia-contra-5101.txt`):
  - solo la marca → versión 1, sin tabla `milestones` → la 5.10.1 dice **OK**;
  - marca + Gramática → versión 2 → **OK**;
  - marca + un logro real → versión 3 → «La copia es de una versión más nueva de Habla…» (correcto: no «dañada»).
- Mutantes: quitar el filtro de `contentRows` (R01), contar la marca en `backupVersionFor` (R02) o exportarla (R03) →
  **mueren los 3**. `npm test`: 347 tests, 346 ✔, 0 ✖, 1 `todo`.
- Al restaurar una copia con logros (sin la marca), la tabla no está vacía → no es «backfill» y la marca se pone en la
  siguiente sincronización: lo nuevo se celebra, lo de la copia no. Correcto.
- M-03 queda aprobada en código; pendiente Tel (CPU en segundo plano). REV-11-D4-04 de D4 sigue en curso (sin revisar).

## D4 · REV-11-D4-04 corregida — 2026-10-21 → **cerrada**

- Arreglo: `FillPanel` en `SoundsPanel.tsx` con `ResizeObserver` sobre el bloque del Inicio y `panelHeight()` pura en
  `soundGame.ts` (con test en `m4-sounds`).
- Navegador, secuencia **real** (Gemini falso 503, 0 peticiones reales; `evidencia/R/R4-03-d4-04-medidas.txt`,
  capturas `R4-01-sonidos-390x844-error.jpg`, `R4-02-sonidos-320x640-error.jpg`): con la pestaña Sonidos abierta,
  «Creando tu plan…» → error. **390×844**: en el primer fotograma tras el cambio el Inicio mide 888/844, y en cuanto se
  pinta (captura) se reajusta solo a **844/844** (panel 270 → 198); «Reintentar» (tarjeta más corta) → el panel vuelve a
  crecer (222). **320×640**: 800/800 en todo momento. Antes del arreglo no se corregía sin un `resize` o cambio de pestaña.
- El caso «Creando → lección» no se pudo provocar con la red simulada (no hay respuesta de plan válida); es el mismo
  mecanismo (cambio de alto de la tarjeta) y queda para la regresión final con un plan sembrado.
- S-07 queda aprobada en código y Nav; Tel: celdas táctiles en el A11.

## D3 · muestra S-02 + S-01 + S-04 — 2026-10-21 → **muestra APROBADA con 2 cambios** (D3 puede escribir las 41 fichas)

Revisado: `src/sounds/phonemes.json` (8 fichas: `iy`, `ih`, `th` principales + `eh`, `t`, `f`, `dh`, `s`),
`lessons.json` (V1, C2a), `alphabet.json`, `credits.json` + `public/sounds/` (24 audios), `db.ts`/`settings.ts` (S-01).
`node scripts/validate-sounds.mjs --muestra`: OK, 8 fichas · 2 lecciones · 11 ejercicios · 26 letras · 24 audios (486 KB) ·
JSON 36 KB, 40 avisos (fichas aún sin escribir). **Sin `scripts/data/cmudict.dict`**: no se comprobaron transcripciones.

### Pares mínimos (100 % revisados: 81 pares)
Correctos todos salvo **2 de los 3 de `dh` ↔ `th`** (REV-11-D3-01). Revisados uno a uno en inglés americano:
/iː–ɪ/ 8 ✓ · /ɪ–ɛ/ 6 ✓ (pin/pen: distinto en el americano general; en el sur de EE. UU. se funden, la voz del TTS los
distingue) · /ɛ–æ/ 6 ✓ · /ɛ–eɪ/ 6 ✓ · /t–θ/ 6 ✓ · /t–d/ 5 ✓ · /f–v/ 6 ✓ · /f–θ/ 3 ✓ · /θ–s/ 6 ✓ (path/pass con /æ/ ✓) ·
/ð–d/ 6 ✓ · /s–z/ 7 ✓ · /s–ʃ/ 5 ✓ · /s–θ/ 4 ✓. Lecciones: los 16 pares de «Escucha», «Clasifica» (math/mat ✓) y
«¿Cuál es la intrusa?» (sheep) ✓.

### Contenido
- Articulación, comparación con el español y errores típicos: claros, en español neutro con «tú». /θ/ dice primero
  «En Latinoamérica no existe» y España solo entre paréntesis (cumple M-12). /ð/ = «d» suave de «nada/dedo/cada» ✓.
- Ejemplos por posición, grafías y frases: correctos (`ih` y `eh` sin final, con su nota ✓; flap de la t americana bien
  explicado; nota británica útil en `t`, `th`, `eh`).
- `tipShortEs`: cortos, útiles y ya alimentan `SOUND_TIPS` de D1 (M-12b).
- Abecedario: 26 letras en 7 familias, trampas buenas (E/I, G/J, H «eich», Y «uai», Z «zed» en el Reino Unido).
  `ttsText` provisional hasta F0-5.

### S-04 · audios y créditos
- 24 archivos, todos ≤ 30 KB, sin modificar (D3: sha1 = Commons). Comprobado **en Commons** 5 de 24 (`th`, `iy`, `ch`,
  `jh` y el autor de `eh`): autor y licencia coinciden con `credits.json` (Peter Isotalo y Denelson83: GFDL + CC BY-SA 3.0,
  se usa la CC BY-SA 3.0; `jh` de Octane: dominio público, `PD-self`). Licencias compatibles con repartir el APK.
  «Acerca de → Créditos → Audios de los sonidos» enseña autor, licencia con enlace y archivo de cada uno: cumple la
  atribución de CC BY-SA.
- Ojo (sin NC, lo sabe D3): son grabaciones **de la tabla IPA** (vocales cardinales, un locutor canadiense y otro sueco),
  no de un hablante americano diciendo palabras. Para las consonantes vale; para las vocales, que decida el dueño en
  **F0-1b** (y F0-1 en el WebView del POCO) antes de dar S-04 por aceptada.

### S-01 · contrato
- Dexie v5 **solo añade** `sounds` y `milestones` (sin `upgrade`, no toca tablas existentes); `soundsIntroSeen` y
  `reviewAutoGrade` en `DEFAULTS` (llegan solos a instalaciones viejas). Copias: tablas opcionales, versión 3 solo con
  contenido (y, desde REV-11-D2-06, la marca `_since` no cuenta; probado contra la 5.10.1 real). `m3-*`: 21/21 ✅.
  **S-01 aprobada.**

### NC
| ID | Sev. | Dónde | Escenario | Arreglo |
|---|---|---|---|---|
| REV-11-D3-01 | MEDIA | `phonemes.json`, ficha `dh`, `minimalPairs` con `th` | **bathe/bath** (/beɪð/–/bæθ/) y **breathe/breath** (/bɹið/–/bɹɛθ/) **no son pares mínimos**: cambia también la vocal. Solo teethe/teeth (/tið/–/tiθ/) lo es, y *teethe* es rara para un A2 | Quitar los dos. Con un solo par, mejor quitar el grupo `th` de `dh` (el contraste /θ/–/ð/ se trabaja con «Clasifica»), o añadir pares de verdad (thigh/thy; ether/either con /iː/). Y pasar el validador **con CMUdict** antes de entregar las 41: lo habría detectado |
| REV-11-D3-02 | BAJA | `phonemes.json`, `dh.explanationEs[0]` | «di «nada» despacio y fíjate en la **segunda** d»: «nada» tiene una sola d | «…y fíjate en la d, suave, casi sin tocar» (o usar «dedo», que sí tiene dos) |

Observaciones (sin NC): `Z` dice «zi» y un latinoamericano lee la z como «s» (= C «si»); la trampa lo aclara («con
zumbido»), pero se puede poner `soundsLikeEs: «zi» (con zumbido)`. `classFocusEn` usa «Practise» (británico): solo va
al prompt, da igual. «Sam sees the sun.» mezcla /s/ y /z/ (*sees*): vale como frase, pero para /s/ hay otras más limpias.

## D3 · ronda 1 completa (S-02, S-03, S-04, S-05) — 2026-10-21 → **NC (2 × BAJA)**, sin fallo de fondo

Revisado: 41 fichas + rasgos `s-cluster`, `ed`, `s-ending` (`phonemes.json`, 89 KB), abecedario completo, las 12 lecciones,
`credits.json`, `sounds.ts` (carga perezosa) y el validador con CMUdict.

### Pares mínimos y ejercicios (100 %, comprobación independiente de la de D3)
Script propio de R con CMUdict (`scratchpad/pares.mjs`, salida en `evidencia/R/D3-01-pares-cmudict.txt`), sin mirar el
validador de D3:
- **430 pares** (fichas + «Escucha» de las lecciones). Todos difieren en **un solo sonido** salvo los 24 previstos:
  collect/correct (CMUdict escribe la r de *correct* como `ER0`; par válido, revisado a mano), los pares de **letras**
  de A2/A3 y los de E1/E3/E4 (*state/estate*, *cat/cats*, *work/worked*: no son mínimos a propósito, se oye si sobra o falta
  algo).
- **Segunda pasada:** en todos los pares de las fichas, el sonido que cambia es **exactamente** el de la ficha y el del
  grupo (`with`): **0 fallos**.
- «Clasifica» e «¿Cuál es la intrusa?»: las 9 intrusas son correctas; en «Clasifica», todo en su columna salvo
  **busy** (REV-11-D3-03).
- REV-11-D3-01 y REV-11-D3-02 de la muestra: **cerradas** (`dh` sin el grupo con `th`; «fíjate en la d»; Z «zi» (con
  zumbido); «Practice»; frase de /s/ nueva).

### Textos (las 44 fichas y las 12 lecciones leídas enteras)
- Articulación, comparación con el español y errores típicos: muy buenos, concretos y en español neutro con «tú». Usan
  variantes de Latinoamérica con cuidado (ch suave de Chile/Panamá/norte de México, n velar del Caribe, «y» porteña para
  /ʒ/ y /ʃ/, j suave del Caribe para /h/). España solo aparece en /θ/, entre paréntesis y después de la pista
  latinoamericana; `tips.json` no la nombra (0). 0 regionalismos de España (búsqueda de *vosotros, coger, móvil,
  ordenador, vale, coche…*).
- Notas británicas correctas (BATH con /ɑː/, LOT /ɒ/, r no rótica, yod en *new*, *garage*, l, t clara). Los 3 rasgos no
  llevan nota (la vista la oculta si falta): bien.
- Lecciones: intros, pistas (`hintEs`/`whyEs`) y cierres claros; A1–A3 deletreando nombres hispanos (Garcia, Ramirez…) es
  un acierto. V3b explica bien *want/won’t*.

### Validador, motor y tamaño
- `validate-sounds` con CMUdict: OK, 2 avisos (collect/correct), 44 fichas · 12 lecciones · 60 ejercicios · 26 letras ·
  24 audios (486 KB) · JSON 121 KB (`evidencia/R/D3-02-validate-sounds.txt`). `cmudict.dict` fuera de git
  (`git check-ignore` ✅). `m3-*`: 22/22.
- **Carga perezosa ✅** (`vite build` a una carpeta del scratchpad): `phonemes` 18,1 KB gzip, `lessons` 5,2, `alphabet` 1,4 y
  `credits` 1,1 van en **chunks propios**; en el principal solo entra `tips.json` (≈ 2 KB, para la nota de la clase).
- **Tamaño del chunk principal (criterio de S-05: crece ≤ 15 KB gzip):** compilé también la 5.10.1 (`git archive 307ecd7`
  en el scratchpad): **599,7 → 627,4 KB gzip, +27,7 KB**. Los datos de Sonidos no son la causa (están fuera); crece por
  **todo el código nuevo de la 5.11**, que entra entero en el chunk principal (pantallas de Sonidos de D4, logros,
  informe, avisos…). Si el criterio se lee como «toda la 5.11», no se cumple; si se lee como «los datos de Sonidos»
  (como está escrito en S-05), sí. **Decide el orquestador**; la salida barata es `React.lazy` para las pantallas de Sonidos
  (`SoundScreen`, `SoundLessonScreen`, `AlphabetScreen`, `SoundSheet`), que no hacen falta al arrancar.
- Migración v4 → v5: solo añade tablas (sin `upgrade`); `m3-migration` y la prueba en el navegador de D3 (7 tablas con
  datos conservadas). Sin cambios desde la aprobación de S-01.

### S-04
Sin cambios desde la muestra: créditos correctos (5/24 comprobados en Commons). Descartes razonados (vocales americanas
sin grabación válida, /ʌ/ cardinal, oclusivas). **Falta F0-1/F0-1b** con el dueño.

### NC
| ID | Sev. | Dónde | Escenario | Arreglo |
|---|---|---|---|---|
| REV-11-D3-03 | BAJA | `lessons.json`, «Clasifica» de **V1-2** y **S0-3** | *busy* va en la columna de /ɪ/, pero también tiene /i/ al final (/ˈbɪzi/): un alumno que oye bien puede ponerla en la de /iː/ y se le marca mal | Cambiarla por una palabra solo con /ɪ/ (*fish*, *milk*, *kid*, *gym* ya está en S0-3). En «Dilo tú» de V1 puede quedarse (allí no se clasifica) |
| REV-11-D3-04 | BAJA | `phonemes.json`, ficha `y`, `spanishEs` | «Es la «i» de **«hielo»** o «tierra»»: en casi toda Latinoamérica *hielo* se dice con «y» consonante (/ˈʝelo/), justo lo que la ficha pide no hacer | Usar solo ejemplos con «i» semivocal: «tierra», «bien», «pie», «viejo» |

Observación: en `d`, «al final, el español la pierde («Madrí»)»: vale, pero un ejemplo más latinoamericano sería «usté»
(*usted*) o «verdá».

## D1 · ronda 2b — 2026-10-21 → **APROBADA**
- `pronunciation.ts`: borrada la tabla de consejos de la 5.10.1; `SOUND_TIPS` = `tips.json › byAzure` (una sola fuente,
  M-12b completo), con la búsqueda normalizada y los 3 casos especiales. `tips.json` no nombra España (0).
- `m1-phonetics` (M-12b reescrito) + `d4-phonetics` (*needed* no lleva el consejo de la -ed) + `m4-sounds`: **46/46** ✅.
- Queda para la regresión final: el fallo **intermitente** de `m4-sounds` «S-08 recorrido» que vio D1 una vez (orden de
  tests, carga perezosa de los JSON, tiempos): se repetirá `npm test` varias veces seguidas.

## D3 · ronda 2 — 2026-10-21 → **APROBADA** (REV-11-D3-03 y -04 cerradas)
- S0-3: *busy* → **build** (/bɪld/); V1-2: *busy* → **kid** (/kɪd/). Repetida la comprobación propia con CMUdict
  (`scratchpad/pares.mjs`): 430 pares, los mismos 24 previstos, 0 cambios fuera de la ficha, y «Clasifica» ya sin
  palabras con los dos sonidos.
- Ficha /j/: «Es la «i» de «tierra», «bien» o «pie», no la «y» fuerte de «yo»» (sin *hielo* en ningún JSON).
- `validate-sounds`: OK, 2 avisos (collect/correct). S-02 aprobada; S-04 sigue esperando F0-1/F0-1b del dueño.

## Regresión final 5.11 — 2026-10-21

**Veredicto: GO para el APK debug y la prueba en el teléfono.** Todos los bloques son GO en lo que se puede ver fuera
del POCO. No hay NC nuevas, solo 2 observaciones. Lo que queda depende del teléfono y del dueño (F0-1/F0-1b, F0-4,
F0-5, Tel). Ojo: la tarea nueva de D4 (pausas entre tramos de voz, `tts.ts`/`speechLang.ts`) **no entra en esta
regresión**; se revisa como bloque aparte cuando la entregue.

Árbol: rama `v5.11`, sin commits, versión 5.11 (build 42). El árbol **no estaba congelado**: el orquestador cambió
`changelog.ts`/`version.json` y D4 empezó la tarea de las pausas. Por eso el navegador se hizo sobre `habla-dev` y, para
los recorridos largos, sobre el **build compilado** servido aparte (sin recargas de Vite).

### Comprobaciones automáticas (`evidencia/R/F-01…F-06`)
| Orden | Resultado |
|---|---|
| `npx tsc -b` | ✅ exit 0 |
| `npm run lint` | ✅ 0 errores (avisos antiguos de `Calibration.tsx`) |
| `npm test` × 3 seguidas | ✅ **350 tests · 349 ✔ · 0 ✖ · 1 `todo`** (SEG-509) las tres veces. «S-08 recorrido» verde las 3 (0,70–0,77 s) |
| `validate-bank` / `validate-grammar` / `validate-sounds` (con CMUdict) | ✅ / ✅ 90 temas, 0 avisos / ✅ 44 fichas, 12 lecciones, 60 ejercicios, 2 avisos ya revisados |
| `vite build` (a una carpeta del scratchpad) | ✅ |

**El fallo intermitente de «S-08 recorrido»** que vio D1 una vez no se reproduce en 3 pasadas completas. Coincidió con
el momento en que el contenido de D3 trajo *won’t* (`renderToString` escribe `won&#x27;t`, y D4 ya desescapa el HTML)
y con D3/D4 editando a la vez. Queda una dependencia de orden **documentada** en `m4-sounds`: el test REV-11-D4-03 tiene
que ir el último porque el plugin web de voz guarda la primera lista de voces. Hoy no falla, pero un test añadido detrás
podría romperlo. Observación, sin NC.

### Tamaño y composición del chunk principal (`evidencia/R/F-06-composicion-chunk.txt`)
Comparé los módulos del `index-*.js` en los dos builds (5.10.1 con `git archive 307ecd7`, y 5.11) usando sus mapas de fuentes:
- **No falta nada.** Los únicos módulos que ya no están en el principal son **Dexie** (93,9 KB de fuente) y
  `src/lib/db.ts`. Pasan a un chunk compartido nuevo, `db-*.js` (31,4 KB gzip), que aparece porque las pantallas
  diferidas de Sonidos también usan la base. El principal lo importa **estáticamente** e `index.html` lo **precarga**
  (`modulepreload`): se carga al arrancar, no en diferido. Esos son los ~28–31 KB que D4 no sabía explicar.
- En diferido (solo al abrir Sonidos) van `SoundsPanel`, `SoundRoutes`, `SoundSheet`, `soundGame` y los JSON
  (`phonemes`, `lessons`, `alphabet`, `credits`). Nada más del arranque se carga en diferido (los `web-*` son los
  plugins web de Capacitor, como antes).
- **Lo que se baja al arrancar** (gzip medido con `gzip -c`): 5.10.1 **596,6 KB** → 5.11 **611,3 KB** (579,9 + 31,4),
  es decir **+14,7 KB**. Cumple el «≤ 15 KB» de S-05, por poco. Las cifras de Vite (583,0 frente a 599,7) no cuentan el
  chunk `db`.

### Navegador (`evidencia/R/F-07-navegador.txt`, captura `F-10-creando-leccion-sonidos-390x844.jpg`)
Gemini y Azure simulados (`r11-nav.js`), micro falso en el Repaso; 0 peticiones reales.

| Área | Qué se comprobó | Resultado |
|---|---|---|
| Inicio, 4 pestañas | 390×844, 320×640 y 360×780 (A11 en vertical): **0 px** de scroll en las 4 pestañas con letra Normal **y Muy grande**. 780×360 y 806×387: desplaza como en la 5.10.1 (186–319 px). 0 segmentos cortados, 0 scroll horizontal | ✅ (REV-F-01/02 de la 5.10.1, con Muy grande, ya no se dan) |
| Temas y modo | La interfaz nueva solo usa las variables del tema: los únicos colores fijos son el brillo del micro y el velo de la celebración, a propósito. Vistos Marea claro, Lumi oscuro y Ember claro/oscuro | ✅ (el contraste fino, en Tel) |
| «Creando → lección» con Sonidos abierto (REV-11-D4-04) | Plan sembrado por la red falsa: 844/844 antes y después | ✅ |
| Sonidos | 44/44 fichas abren en la hoja sin error. **12/12 lecciones de principio a fin** («Dilo tú» saltado, sin micro): «12 de 12», y en Dexie 12 lecciones completadas y 10 sonidos «practicado». Abecedario: 26 letras, 7 familias, trampas. Hoja encima de una clase y ← sin perder el turno (ronda 2) | ✅ |
| Repaso (M-10) | 320×640: cuenta atrás «3 · Paso a la siguiente con la marcada · toca para elegir tú» visible; pasa sola; un toque la cancela; micro cerrado tras enviar; la 4.ª tarjeta sale en «Escucha y repite» | ✅ |
| Logros (M-03) | Celebración en 3 tamaños (revisión de D2). Al actualizar desde la 5.10.1, los hitos ya conseguidos se guardan sin celebrar (0 celebraciones al entrar). «Tus logros · 2 de 11» | ✅ |
| Informe (M-07) | Flechas frente a tu media. Con perfil A2, sin «Hoy has sonado como» ni «meta B2» | ✅ |
| Error del plan (M-08/I-4), globos (M-09), comodín (M-04) | Revisados con D1 (3 tamaños, tema en 1 toque, racha con ayer de descanso); variantes con test | ✅ |
| Acerca de | Créditos → Audios de los sonidos: 24 audios con autor, licencia y 48 enlaces | ✅ |
| Migración v4 → v5 | Base real de la 5.10.1 (build 307ecd7, perfil A2 con 5 clases, 1 error, 1 tema dominado) abierta con la 5.11 en el mismo origen: Dexie 40 → 50, las 7 tablas con sus filas, 2 tablas nuevas vacías | ✅ |
| Copias | Tests (`m3-migration`, `backupCheck`, `m2-backup-since`) y prueba contra el `backupCheck` real de la 5.10.1 (ronda 3 de D2). No exporté un archivo desde la interfaz (sería una descarga) | ✅ |
| Novedades 5.11 | Entrada de `changelog.ts`: versión MINOR, español neutro | ✅ con observación |

Observaciones (sin NC):
- Novedades dice «los **40** sonidos del inglés americano», pero hay 41 fichas (40 + /ɚ/). Como redondeo vale; «los
  sonidos del inglés americano» o «41» evita la duda. Y «Muchos se oyen también sueltos» depende de F0-1b: si el dueño
  quita audios, revisar la frase.
- En la celda compartida /ɝ ɚ/ de la tabla, a 390 px la palabra *teacher* sale cortada («teac…»).

### Veredicto por bloque
| Bloque | Veredicto |
|---|---|
| D1 · hábito y fonética (M-04, M-08, M-09, M-11, M-12, S-06, línea de S-11) | **GO** (M-11/S-06: umbrales con F0-4) |
| D2 · logros y clase (M-03, M-06, M-07, M-10) | **GO** |
| D3 · contenido y datos (S-01…S-05) | **GO** (S-04: falta F0-1/F0-1b; `ttsText`: F0-5) |
| D4 · interfaz e integración (S-07…S-11, I-1, I-3, I-4) | **GO** |
| Novedades / versión (orquestador) | **GO** (observación del «40») |
| Pausas entre tramos de voz (D4, nueva) | **GO** (ver «PAU» abajo; 1 × BAJA de test) |

### Solo se puede ver en el teléfono (POCO con «Habla debug»; el A11 solo si el dueño lo autoriza)
1. **F0-1/F0-1b:** los 24 `.ogg` en el WebView (≤ 300 ms, altavoz y Bluetooth, foco de audio con música), y que el
   dueño decida qué vocales valen (son grabaciones de la tabla IPA, no de un americano).
2. **F0-4:** Azure real: «te salió /x/» (≥ 12/20), umbrales `HEARD_RULES`, segundos facturados por palabra (≤ 15 s en 5)
   y que la clase manda los mismos segundos que la 5.10.1 (`[HABLA-NET] azure …` por CDP).
3. **F0-5:** las 26 letras y los pares con la voz en-US del teléfono, también con Leo de profe.
4. Micro real en «Dilo tú» de Sonidos y en el Repaso: Escúchate A-B-A-B, ruta Bluetooth solo con la parte abierta, y todo
   suelto al minimizar o bloquear (regla 9).
5. M-06 con clave real: 10 turnos (≥ 2 sin pregunta, ≥ 6 con pregunta).
6. M-03: CPU en reposo con la celebración y con la app en segundo plano (`dumpsys`).
7. Recordatorio diario con un texto distinto cada día (M-09).
8. A11 (si se autoriza): tocar celdas de la tabla en 320 px lógicos y en horizontal forzado; con la tarjeta del plan
   visible, el panel de la tabla queda en ~2 filas; contraste de los 4 temas en pantalla real.
9. Peso del APK release (Δ ≤ 0,7 MB con los 486 KB de audio) y arranque en frío (no más lento que la 5.10.1 ± 10 %).
10. La hoja de un sonido abierta encima de una clase **grabando** (en el navegador no hay micro) y el botón Atrás de Android.

### PAU · pausas naturales al leer (D4, petición del dueño) — incluida en la regresión → **GO** (1 × BAJA)
Revisado: `speechLang.ts` (`PAUSE_MS`, `pauseBetween`, `splitForReading`, palabras cortas inglesas como *or, but,
with…*), `tts.ts` (`pauseIn` cancelable, `readSegments`, `EN_IN_ES_RATE` 0,85, huecos del deletreo),
`tests/m4-pausas.test.mjs` y el cambio en `tests/d2-audioFocus.test.mjs`.
- **El test de la 5.10.1 sigue probando lo mismo:** D4 solo cambió cómo avanzan 3 bucles (temporizador de 1 ms y 4000
  vueltas en vez de 200 `setImmediate`); las comprobaciones son las mismas. Los **9 mutantes de la revisión de la 5.10.1**
  (`audioFocus.ts`, `tts.ts`, `speechLang.ts`) **mueren todos**, también M8, que en la 5.10.1 sobrevivía
  (`evidencia/R/PAU-01-mutacion.txt`, copia al día, base 38/38 en verde).
- Pausas: mueren P1 (la pausa no se corta al parar), P2 (sin pausas), P3 (ejemplos a 0,9) y P4 (sin la pausa de ejemplo).
  Una pausa no suelta el foco ni la clave ⏸ (una sola lectura) y ⏸/`stopSpeaking` la cortan al instante (test).
- Comprobaciones con el «or» ya terminado: `tsc` ✅ · lint 0 errores · `npm test` **357 tests · 356 ✔ · 0 ✖ · 1 `todo`**
  (`evidencia/R/PAU-02-tests.txt`).
- El ritmo real (si las pausas suenan naturales con la voz del teléfono) solo lo puede juzgar el dueño en el POCO:
  explicación del Present Simple y una respuesta del profe en la clase de Gramática.

| ID | Sev. | Dónde | Escenario | Arreglo |
|---|---|---|---|---|
| REV-11-PAU-01 (**cerrada**, ver «Retoques») | BAJA | `tts.ts:385` (`speakUS`, huecos del deletreo con `gapMs`) + `m4-pausas` | Nada prueba que ⏸ corte también **durante el hueco entre letras** del deletreo: con un `setTimeout` normal en vez de `pauseIn` (mutante P5) todos los tests pasan, y la lectura seguiría esperando ese hueco después de parar | Un caso en `m4-pausas`: `speakUS(['G.','A.','R.'], { gapMs: 450 })`, ⏸ en el hueco → termina en < 100 ms y no suena la letra siguiente |

### Retoques de la regresión final (D4) — 2026-10-21 → **cerrados**
- **REV-11-PAU-01:** test nuevo del ⏸ en el hueco del deletreo; el mutante P5 (hueco con `setTimeout` normal) ahora **muere** (`evidencia/R/R5-01-retoques.txt`).
- **Test de Leo independiente del orden:** las voces se ponen y se quitan en un `finally`; el mutante P9 (aceptar cualquier `en-*`) sigue muriendo. `npm test`: **358 tests · 357 ✔ · 0 ✖ · 1 `todo`**.
- **Celda /ɝ ɚ/:** 390×844 con letra Normal, *bird* y *teacher* enteros (celdas de 40×46 px, sin cortar; `R5-02`). Con **Muy grande** (40×53 px), *teacher* ya no sale con «…», pero se parte en dos líneas: «teach / er» (`R5-03`). Se lee, pero partir la palabra sin guion es raro: observación sin NC (salida fácil: letra un punto menor solo en esa celda, o `hyphens: auto` con `lang="en"`).
- Inicio en 390×844: **0 px** de scroll en las 4 pestañas con Normal y con Muy grande (con lección y «Repaso de hoy» visibles).
- **S-07 y PAU: aprobadas.**
