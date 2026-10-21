# Regresión 5.10 (build 40) · A1 — Compilación y código

Agente A1 · 2026-10-20 · rama `v5.10-gramatica` (`cd5803a`, 16 commits sobre `main`) · Windows, sin teléfono.
Evidencias: `docs/pruebas/regresion-5.10/evidencia/A1/` (salida completa de cada orden).

## Resumen — GO condicionado

**GO para las pruebas en el teléfono** con el APK debug ya generado. Compila todo (TypeScript, web, Java de P2), lint sin
errores, 110/110 tests (80 de antes + 30 nuevos), banco y Gramática válidos.

**No hay ningún defecto CRÍTICO ni ALTO.** Hay 4 de severidad MEDIA que conviene arreglar antes del release (o al menos
decidir con el dueño): una carrera del micro que se abre después de cancelarse (REG-A1-01), el foco de audio que hace
subir y bajar la música en cada tramo de la explicación (REG-A1-03), falsos positivos de `echoesIdea` (REG-A1-04) y el
foco de un solo dueño que se pierde si suena algo mientras grabas (REG-A1-02). Ninguno pierde datos.

Revisado y **correcto** (se descarta como defecto): todos los `await` de la apertura del Recorder comprueban la
cancelación (también la nueva espera del evento `start`); el foco del micro se suelta en `release()` (fallo, `close()`,
`finish()`, segundo plano, desmontaje); el de la voz al acabar, al fallar, al parar y al interrumpir; la lectura por
tramos se corta bien a mitad (`mixedRun`); la migración Dexie v4 solo añade la tabla `grammar`; las copias antiguas
siguen entrando (tabla y campos nuevos opcionales); la hoja de Gramática tiene prioridad en el Atrás de Android y su pila
vuelve tema → relacionado → «Pregúntale» → cierra.

## 1.1–1.3 · Resultados de las órdenes

| # | Orden | Resultado | Tiempo | Evidencia |
|---|---|---|---|---|
| 1 | `npx tsc -b` | ✅ exit 0, sin errores | 32 s | `01-tsc.txt` |
| 2 | `npm run lint` | ✅ exit 0 · **0 errores**, 9 avisos (ver nota) | 2 s | `02-lint.txt` |
| 3 | `npm test` (antes de los nuevos) | ✅ 80/80 | 8 s | `03-test.txt` |
| 4 | `node scripts/validate-bank.mjs` | ✅ 450 ítems en 22 archivos, «el banco cumple las reglas» | 0,1 s | `04-validate-bank.txt` |
| 5 | `node scripts/validate-grammar.mjs` | ✅ 12 archivos · 12 secciones · 90 temas · 667 ejercicios · 0 avisos | 0,7 s | `05-validate-grammar.txt` |
| 6 | `npm run build` | ✅ (aviso de tamaño: `index-*.js` 1 924,9 kB, 588,6 kB gzip) | 13 s | `06-build.txt` |
| 7 | `gradlew :app:compileDebugJavaWithJavac --offline -q` | ✅ **el Java de P2 compila** (solo el aviso inofensivo «SDK XML version 4») | 29 s | `07-java.txt` |
| 8 | `npm run apk:debug` | ⚠️ web + `cap sync` OK; el paso de Gradle falla: `"gradlew.bat" no se reconoce` (REG-A1-08, entorno) | — | `08-apk-debug.txt` |
| 9 | `cd android; .\gradlew.bat assembleDebug --offline -q` (tras el `cap sync` de 8) | ✅ `apk/Habla-v5.10-debug.apk`, 5 679 613 B, 20-10 21:33 | ~2 min | `09-assembleDebug.txt` |
| 10 | `aapt dump badging` (build-tools 36.1.0) | ✅ `package: com.shift.habla.debug` · `versionCode='40'` · `versionName='5.10-debug'` · `application-label:'Habla debug'` · `application-debuggable` · minSdk 24 / target 36 · sha256 `13b7c587…b8b20284` | — | `10-aapt-badging.txt` |
| 11 | `npm test` con los tests nuevos | ✅ **110/110** | 7 s | `11-test-con-nuevos.txt` |

Notas:
- Lint: CLAUDE.md habla de «~6 avisos antiguos»; hoy son 9. Los nuevos respecto a esa cifra son `ReviewScreen.tsx:235`
  (`record` usado en `leave` antes de su declaración: inofensivo, `leave` solo se ejecuta tras el render),
  `PhoneticsAlert.tsx:8` y `SettingsScreen.tsx:154` (`Date.now()` en el render). Ninguno es un fallo real.
- El APK debug anterior con el mismo nombre (18-10 23:50) se ha sobrescrito; los de build 38/39 siguen en `apk/`.
  No se ha tocado `keystore/` ni se ha compilado el release.

## 1.4 · Hallazgos de la revisión de código (`git diff main...v5.10-gramatica`)

| ID | Sev. | Prio. | Qué |
|---|---|---|---|
| REG-A1-01 | MEDIA | P2 | El micro se abre aunque la clase se haya cerrado o la app haya ido a segundo plano durante la espera previa (400 ms de P6 + `stopSpeaking`) |
| REG-A1-02 | MEDIA | P3 | Foco de audio de un solo dueño: un ▶ mientras grabas cambia «pausa» por «bajar» y al acabar suelta el foco: la música vuelve entera y entra en el micro |
| REG-A1-03 | MEDIA | P2 | Lectura por tramos (P4b): el foco se suelta y se vuelve a pedir en cada tramo → la música sube y baja decenas de veces |
| REG-A1-04 | MEDIA | P2 | `echoesIdea` rechaza respuestas reales: la idea + 1–2 palabras tuyas cuenta como «leíste la idea» |
| REG-A1-05 | BAJA | P3 | La explicación de Gramática sigue sonando al salir del tema o cerrar la hoja, sin ningún ⏸ a la vista |
| REG-A1-06 | BAJA | P3 | Con el profe Leo, los tramos en español se leen con el tono bajado (pitch 0,8) |
| REG-A1-07 | BAJA | P4 | Una copia de la 5.10 con tarjetas de Gramática en una app 5.8/5.9 dice «archivo dañado» en vez de «versión más nueva» |
| REG-A1-08 | BAJA | P4 | `npm run apk` / `apk:debug` fallan si `NoDefaultCurrentDirectoryInExePath` está activo (así lo pone Claude Code) |

### REG-A1-01 · El micro se abre tras cancelarse durante la espera previa · MEDIA · P2
- **Dónde:** `src/screens/Conversation.tsx:496-504` (`await stopSpeaking()` + `setTimeout(400)` antes de `begin()`);
  `src/lib/recorder.ts:376-377` (`doBegin` toma `this.gen` al empezar, no al tocar) y `:110-112` (`releaseAllMics` solo
  cierra las grabadoras que ya están en `recorders`).
- **Escenario:** el profe está hablando; tocas el micro (fase `opening`) y, antes de 400 ms, (a) pulsas Inicio o cambias
  de app, o (b) pulsas «Terminar». En (a) `goBackground()` → `releaseAllMics()` no ve esta grabadora (aún no está en
  `recorders`) y el `whenBackground` de MOV-1 solo existe en fase `recording`; en (b) `finish()` → `recorder.close()` sube
  `gen`, pero `begin()` aún no ha empezado. Al terminar la espera, `begin()` toma la generación nueva, abre el micro, graba
  y pide el foco «pause»: **la música del usuario se pausa con Habla en segundo plano** y el micro queda abierto (punto
  verde, batería, NC-14) hasta volver; en (b) la grabación sigue con el informe en pantalla (sin botón para pararla) hasta
  salir. La ventana existía ya en la 5.9 (solo el `await stopSpeaking()`, milisegundos); la 5.10 la alarga a ≥ 400 ms.
  Misma forma, con ventana corta, en `GrammarSpeak.tsx:88-94`, `ReviewScreen.tsx:133-136` y `Calibration.tsx:577-580`.
- **Arreglo propuesto** (genérico, en el Recorder: un «billete» tomado al tocar):
  ```diff
  // src/lib/recorder.ts
  +// Sube con cada releaseAllMics(): un begin() pedido antes (p. ej. durante la espera de P6) ya no abre nada.
  +let epoch = 0
   export function releaseAllMics() {
  +  epoch++
     ;[...recorders].forEach((r) => r.close())
   }
  …
  +  /** Toma el billete al tocar, ANTES de cualquier await: un close() o un segundo plano entretanto cancela el begin(). */
  +  ticket(): { gen: number; epoch: number } {
  +    return { gen: this.gen, epoch }
  +  }
  -  begin(): Promise<boolean> {
  +  begin(t = this.ticket()): Promise<boolean> {
  +    if (t.gen !== this.gen || t.epoch !== epoch) return Promise.resolve(false)
       if (this.beginning) return this.beginning
  ```
  ```diff
  // src/screens/Conversation.tsx (onPress) — igual en GrammarSpeak, ReviewScreen y Calibration
     starting.current = (async () => {
  +    const ticket = recorder.current.ticket()
       const wasSpeaking = speakingKey() !== null
       await stopSpeaking()
       if (wasSpeaking) await new Promise((r) => setTimeout(r, 400))
       try {
  -      if (!(await recorder.current.begin())) {
  +      if (!(await recorder.current.begin(ticket))) {
  ```
  Test sugerido en `tests/recorder.test.mjs`: `const t = rec.ticket(); releaseAllMics(); assert.equal(await rec.begin(t), false)`
  y lo mismo con `rec.close()`.

### REG-A1-02 · Foco de audio de un solo dueño · MEDIA · P3
- **Dónde:** `src/lib/audioFocus.ts:15-30` (`owner` único; `takeAudioFocus` lo sobrescribe), `src/lib/tts.ts:149`.
- **Escenario:** grabando (foco `mic` = música en pausa) tocas el ▶ de una corrección (`CorrectionView.tsx:26`,
  `toggleSpeak`, no se desactiva al grabar) o de una palabra de la fonética. `takeAudioFocus('tts')` pasa el dueño a `tts`
  y el nativo cambia «pause» por «duck»: la música **vuelve a sonar** (baja) mientras grabas; al acabar la frase,
  `releaseAudioFocus('tts')` abandona el foco y la música sube del todo, con el micro aún grabando: entra en la grabación,
  justo lo que P2 quería evitar. Al final `releaseAudioFocus('mic')` no hace nada (el dueño ya no es `mic`).
- **Arreglo propuesto:** llevar la cuenta de quién lo tiene y pedir siempre el más fuerte:
  ```diff
  -let owner: 'tts' | 'mic' | null = null
  +const holders = new Set<'tts' | 'mic'>()
  +let current: Kind | null = null
  +function apply() {
  +  const want: Kind | null = holders.has('mic') ? 'pause' : holders.size ? 'duck' : null
  +  if (want === current || !native()) return void (current = want)
  +  current = want
  +  if (want) Native.requestFocus({ kind: want }).catch(() => {})
  +  else Native.abandonFocus().catch(() => {})
  +}
  -export function takeAudioFocus(who) { owner = who; … }
  +export function takeAudioFocus(who: 'tts' | 'mic') { holders.add(who); apply() }
  -export function releaseAudioFocus(who) { if (owner !== who) return; owner = null; … }
  +export function releaseAudioFocus(who: 'tts' | 'mic') { holders.delete(who); apply() }
  ```
  (Opcional: desactivar los ▶ de la clase mientras `phase === 'recording'`, que además evita que la voz entre en el micro.)

### REG-A1-03 · La música «bombea» en la lectura por tramos · MEDIA · P2
- **Dónde:** `src/lib/tts.ts:149-176` (cada `speak()` pide el foco y lo suelta en `finish`), `:213-221` (`speakSpanish`
  llama a `speak()` por tramo).
- **Escenario:** con Spotify sonando, ▶ en la explicación del presente simple (22 tramos según `PLAN-uso-real.md`): al
  acabar cada tramo se abandona el foco (la música sube a su volumen) y en el siguiente, tras `TextToSpeech.stop()` y la
  búsqueda de voz, se vuelve a pedir (baja): ~22 subidas y bajadas en un minuto. Lo mismo, en menor medida, cuando el
  profe y otra frase suenan seguidas. No se ha podido oír en el PC: **comprobarlo en 5.6 del CHECKLIST**.
- **Arreglo propuesto:** soltar el foco con un pequeño retraso que cancela una nueva petición del mismo dueño:
  ```diff
  // src/lib/audioFocus.ts (sobre la versión de REG-A1-02)
  +let releaseTimer: ReturnType<typeof setTimeout> | null = null
   export function takeAudioFocus(who) {
  +  if (releaseTimer) clearTimeout(releaseTimer), (releaseTimer = null)
     holders.add(who); apply()
   }
  -export function releaseAudioFocus(who) { holders.delete(who); apply() }
  +/** La voz suelta el foco 600 ms después: entre dos tramos (o dos frases) la música no llega a subir. */
  +export function releaseAudioFocus(who: 'tts' | 'mic') {
  +  holders.delete(who)
  +  if (who === 'mic') return apply()
  +  releaseTimer = setTimeout(() => ((releaseTimer = null), apply()), 600)
  +}
  ```
  (`stopSpeaking()` puede seguir soltándolo al instante si se quiere, con un `releaseAudioFocusNow`.)

### REG-A1-04 · `echoesIdea`: falsos positivos · MEDIA · P2
- **Dónde:** `src/lib/teacher.ts:120-131` (`said.startsWith(idea) && w.length - iw.length <= 2`), uso en
  `src/screens/Conversation.tsx:274-278`.
- **Escenario:** el alumno (A2 hablando) hace justo lo que pide «¿Qué digo?»: lee el comienzo y lo termina corto.
  «My favourite moment was when we **ate pizza**» (+2) o «I think the best part of my weekend was **the party**» (+2) se
  rechazan con «Te entendí justo la idea… vuelve a grabar», no se corrige ni se guarda, y si repite lo mismo vuelve a
  pasar. El propio test lo fija: `'…weekend was the'` (+1) → true. Además se paga dos veces: la llamada a Gemini ya se hizo
  y `runPhonetics` (Azure) se lanzó en paralelo (`Conversation.tsx:249`) y su resultado se tira.
  La voz del teléfono leyendo la idea produce la idea **exacta** (el TTS lee el texto tal cual), así que la holgura de 2
  palabras no aporta casi nada contra el fallo real de P6.
- **Arreglo propuesto:** solo la idea exacta, o con muletillas como mucho:
  ```diff
  +const FILLER = new Set(['um', 'uh', 'er', 'erm', 'eh', 'ah', 'hmm', 'so', 'and', 'yeah'])
  -    return said.startsWith(idea) && w.length - iw.length <= 2
  +    // La voz del teléfono lee la idea tal cual: solo cuenta si lo que sobra son muletillas («…was, um»).
  +    return said.startsWith(idea) && w.slice(iw.length).every((x) => FILLER.has(x))
  ```
  Y en el test cambiar `'…weekend was the'` a `false` y añadir `'…weekend was um'` → `true`. (Mejora aparte: no lanzar
  Azure hasta pasar el filtro, o cancelar `pron` si se descarta.)

### REG-A1-05 · La explicación sigue sonando al salir del tema · BAJA · P3
- **Dónde:** `src/screens/GrammarTopicScreen.tsx:148` (`toggleSpeakSpanish(…, 'explain:<id>')`); la pantalla no para la
  voz al desmontarse.
- **Escenario:** ▶ en «Explícame» (1–2 min de lectura) y Atrás: la lectura sigue en la sección, en la pestaña Gramática o,
  desde la hoja, encima de la clase, y ya no hay ningún ⏸ con esa clave en pantalla. Solo se para con otro ▶, el micro o
  el segundo plano.
- **Arreglo propuesto:**
  ```diff
  +  // La explicación es larga: al salir del tema deja de sonar (no queda ningún ⏸ para pararla).
  +  useEffect(() => () => { if (speakingKey() === `explain:${id}`) stopSpeaking() }, [id])
  ```

### REG-A1-06 · Español con el tono bajado si el profe es Leo · BAJA · P3
- **Dónde:** `src/lib/tts.ts:139-146`: con `lang` (tramo en español) `auto` es `null` y `voiceIndex` se pone a `null`,
  así que `pitch = voiceGender === 'male' ? 0.8 : 1` se aplica a la voz española del sistema.
- **Escenario:** profe Leo + ▶ en una explicación: los tramos en español suenan más graves de lo normal (una voz femenina
  española a 0,8 suena rara); el arreglo del tono era para «no hay voz inglesa masculina».
- **Arreglo propuesto:** `const pitch = !lang && voiceIndex === null && !auto && voiceGender === 'male' ? 0.8 : 1`.

### REG-A1-07 · Copia de la 5.10 en una app anterior: mensaje engañoso · BAJA · P4
- **Dónde:** `src/lib/backupCheck.ts:8` (`BACKUP_VERSION = 1` sin cambiar) y `:148` (`source` ahora admite `'grammar'`).
- **Escenario:** el dueño exporta en la 5.10 con algún ejercicio de Gramática fallado (tarjeta `source: 'grammar'`) y la
  importa un teléfono con la 5.8 (madre, amistades): la 5.8 responde «archivo dañado… (tarjetas de repaso, fila N: el
  campo «source»…)» en vez de «La copia es de una versión más nueva de Habla. Actualiza la app». No se pierde nada (no
  importa nada), pero asusta. Las copias antiguas en la 5.10: ✅ aceptadas.
- **Arreglo propuesto:** subir `BACKUP_VERSION` a 2 al exportar (y seguir aceptando 1 y 2). Efecto: las apps 5.8/5.9
  rechazarán *cualquier* copia de la 5.10 con el mensaje correcto; decidirlo con el dueño.

### REG-A1-08 · `npm run apk(:debug)` y `NoDefaultCurrentDirectoryInExePath` · BAJA · P4
- **Dónde:** `package.json:12-13` (`cd android && gradlew.bat …`).
- **Escenario:** la sesión de Claude Code tiene `NoDefaultCurrentDirectoryInExePath=1`; con eso, `cmd` no busca
  ejecutables en la carpeta actual y `gradlew.bat` «no se reconoce» (evidencia `08-apk-debug.txt`). En la consola del
  dueño funciona. Lo resolví lanzando `.\gradlew.bat` a mano tras el `cap sync`.
- **Arreglo propuesto:** `"apk:debug": "npm run build && cap sync android && cd android && .\\gradlew.bat assembleDebug --offline"`
  (y lo mismo en `apk`).

### Puntos revisados sin defecto
- **Recorder (problemas-conocidos §4):** `doOpen` comprueba `cancelled()` tras `getUserMedia`, `afterOpen`, `hasSignal`,
  `looksMuted` y `fallback`; `fallback` tras `phoneMics` y cada `getUserMedia`; `doBegin` tras `open()` y tras
  `await this.flowing` (las dos ramas, también la de reintento). La espera del evento `start` está acotada (600 ms) y
  durante ella `releaseIfIdle()` no cierra (el estado ya es `recording`). `takeAudioFocus('mic')` va después de
  `rec.start()`; si `start()` lanza, no se pidió foco. ✅
- **Foco al cerrar / segundo plano / errores:** `release()` (llamado por `close()`, `finish()`, el fallo de apertura y
  `releaseAllMics()`) suelta el de `mic`; `speak()` lo suelta al acabar, al fallar (`catch`) y al interrumpirse
  (`finishCurrent`); `stopSpeaking()` siempre; `lifecycle.goBackground()` y `interruptForSoundTest()` llaman a los dos.
  Java: `requestFocus` suelta el anterior antes de pedir; `abandonFocus` nunca rechaza; API < 26 con el oyente clásico. ✅
  (Al morir el proceso Android devuelve el foco solo.)
- **`speechLang` / tramos:** parar a mitad (`stopSpeaking` sube `mixedRun` antes de `interruptCurrent`, el bucle sale);
  otro ▶ o un `speak()` normal también lo cortan; un ▶ de la misma clave durante la búsqueda de voz para (no duplica). ✅
- **Fase `opening` del TalkButton:** `busy` → `disabled` y `tapAction` ignora; la papelera y el teclado solo salen en
  `recording`/no `recording` como antes; «Repetir» está desactivado fuera de `idle`/`speaking`. ✅ (Ver REG-A1-01 para la
  cancelación.)
- **grammarTopics / copias:** `grammarFields` valida ids contra el catálogo, quita repetidos, máx. 3 y rellena
  `grammarTopic` por compatibilidad; las copias aceptan `grammarTopic(s)` en correcciones, errores y sesiones, la tabla
  `grammar` es opcional y `synonyms`/`antonyms` opcionales. ✅
- **Dexie v4:** `db.version(4).stores({ grammar: 'id, lastAt' })` solo añade; Dexie conserva las tablas de v1–v3. ✅
- **GrammarSheet / Atrás:** `sheetBack` va antes que `backHandler`; la pila de la hoja hace `pop` y cierra en la primera
  pantalla; el `useEffect` re-registra `pop` al cambiar la pila y lo borra al desmontarse. ✅

## 1.5 · Tests añadidos (AUD-ARQ-113)

Sin dependencias nuevas, con `tests/helpers/vite.mjs` (`loadFresh`). 30 tests nuevos; `npm test` 110/110.

| Archivo | Tests | Qué cubre |
|---|---|---|
| `tests/levels.test.mjs` | 7 | `levelIdx`/`levelAt` (B1+, desconocido = B1, recortes), nivel general (media, ,5 hacia abajo, tope destreza + 2), re-test 70/30 con los dos ,5 exactos posibles (A1/C2 → A2, C2/A1 → B2), trayectoria, 28 días y `needsRecalibration`, velocidad por nivel |
| `tests/bank.test.mjs` | 8 | 450 ítems con ids únicos y filtros, `pickItems` (no repite vistos, excluidos, menos usado, temas a evitar, nunca más de lo que hay), `recordUse`, `normalizeAnswer` (contracciones), `stem` (raíces y números), `checkShort` (artículos, raíz, errata solo en audición), `scriptSeconds` |
| `tests/placement.test.mjs` | 8 | Escalera de 20 (15 + 5, ordenada, sin repetir), `checkGrammar`, `grammarLevel` (A1 por defecto, B1, C2, C1/C2 exigen hueco), fin anticipado, inicio de lectura/audición y salto de bloque, `checkQuestion`, `blocksLevel` + confianza + `listeningConfidence`, tarea 3 sencilla y `medianLevel` |
| `tests/fluency.test.mjs` | 7 | `countWords` (muletillas), `turnMetrics` (umbrales de velocidad, escrito, `audioSeconds`), `sessionMetrics` (null, clase buena = 98/B2+, errores y pausas bajan, `correction` antigua cuenta, solo escrito), `scoreLevel` |

No han destapado ningún fallo en esos módulos (el único rojo inicial fue un error mío en la cuenta esperada de
`countWords`).

## 1.6 · Diagnóstico de deuda (sin refactor)

**Peticiones sin `AbortController` (AUD-RES-705/706, siguen igual).** `gemini.ts` acepta `signal` y lo comprueba entre
intentos (`retryLoop`, `sleep`), pero `post()` (`CapacitorHttp.post`, `readTimeout: 90 000`) y `get()` no pueden
cancelarse: al salir de una clase o vencer el plazo de 60 s, la respuesta llega igual (facturada) y se tira; «Reenviar»
puede pagar la misma pregunta dos veces. `pronunciation.ts` (Azure, `readTimeout 45 000`) y `azureUsage.ts` (sin plazo)
igual. CapacitorHttp 8 no ofrece cancelación. Propuesta, de menos a más trabajo: (1) plazo por intento más corto (25 s)
y mensaje «tarda demasiado» distinto de «sin conexión»; (2) botón «Cancelar» durante «Pensando…» que aborta el `signal`
(la petición nativa sigue, pero la interfaz se libera); (3) no reenviar mientras la anterior siga viva (un `inFlight` por
turno); (4) para cancelar de verdad, un método propio en un plugin Java con OkHttp/`HttpURLConnection.disconnect()`.

**Bundle.** Un único `index-*.js` de 1 924,9 kB (588,6 kB gzip). Lo pesado es contenido, no código: `src/grammar/*.json`
677 kB y `src/bank/**/*.json` 552 kB en bruto, ambos con `import.meta.glob(..., { eager: true })`
(`grammar.ts:112`, `bank.ts:105`). En un APK local no hay descarga, pero el Galaxy A11 paga el parseo al arrancar.
Opciones: (a) `eager: false` en el banco y cargarlo al abrir el test (solo lo usa Calibration/placement) → −~0,5 MB del
arranque; (b) Gramática: un índice pequeño generado (id, nombre, nivel, sección; lo que usan `topicIdsForPrompt`,
`findTopic` y el buscador) y el contenido de cada sección con `import()` al abrirla; (c) `React.lazy` para
`Calibration`, `SettingsScreen`, `ProgressScreen` y `WelcomeScreen`; (d) como mínimo, subir `build.chunkSizeWarningLimit`
para que el aviso no tape otros. Medir antes y después el arranque en frío en el A11.

**Pantallas grandes.** `Calibration.tsx` 1 582 líneas (44 `useState`/`useRef`/`useEffect`, 5 avisos de lint por
funciones usadas antes de declararse) y `Conversation.tsx` 1 173 (64 hooks; `askTeacher` mezcla red, Dexie, fonética y
estado de la interfaz). Riesgo: cada arreglo del micro o del foco se repite a mano en 4 pantallas (ver REG-A1-01). Corte
propuesto cuando toque: un hook `useTalk(recorder)` común (toque → billete → espera de la voz → `begin` → `finish` →
`analyzeSpeech`/`isEmptyRecording`/`distrustMic`) para Conversation, ReviewScreen, GrammarSpeak y Calibration; en
Calibration, separar cada sección del test (gramática, lectura, audición, habla) en su componente con el borrador
(`testDraft`) como estado común; en Conversation, sacar `askTeacher` a `lib/` como función pura que devuelve el turno.
