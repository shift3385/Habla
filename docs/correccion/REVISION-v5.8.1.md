# Revisión en PC · v5.8.1 «Micrófono seguro» (build 34)

Revisor: `rev` (agente de revisión en PC) · Inicio: 2026-10-06 · Base: HEAD `0a1d6f8` (v5.8 build 33).
Alcance: tareas T1–T7 de `docs/correccion/ESTADO.md` (INFORME §8.2). Solo lectura sobre el producto.
Herramientas: `git diff`, `npx tsc -b`, `npm run lint`, `npm test`, `node scripts/validate-bank.mjs`, `npm run build`, Gradle `--offline` (si se toca Java), navegador (`habla-dev` en el origen aislado `http://rev.localhost:5173`) con el arnés `docs/correccion/arnes-rev/rev-mic.js` y la receta `arnes-rev/RECETA.md`. Evidencias en `docs/correccion/evidencia-rev/`.

## 1. Tabla por tarea

| Tarea | Hallazgos | Estado | Veredicto | NC abiertas | Evidencia |
|---|---|---|---|---|---|
| T1 · Recorder reentrante y cancelable | MIC-302, MIC-301, ARQ-100 | revisada | **APROBADA** | — (REV-T1-1 cerrada, verificada) | `evidencia-rev/T1-T3-nav-MIC-302-303.txt`, `T1-T2-T5-nav.txt`, `base-v5.8-MIC-302.txt`, `v581-*.txt` |
| T2 · Guarda del segundo dedo | MIC-304 | revisada | **APROBADA** | — (REV-T2-1 cerrada, verificada) | `T1-T2-T5-nav.txt` |
| T3 · Dictado: cancelar al cambiar de paso o cerrar | MIC-303 | revisada | **APROBADA** | — | `T1-T3-nav-MIC-302-303.txt` |
| T4 · Red de seguridad nativa | MIC-308 | revisada | **APROBADA con riesgo residual aceptado** (mitigación parcial, ver §2.1) | — (residual MIC-308 BAJA → móvil R5) | `T4-compileJava.txt` |
| T5 · `fallback()` en silencio | MIC-800 | revisada | **APROBADA** | — | `T1-T2-T5-nav.txt`, `v581-test.txt` |
| T6 · Tests del Recorder + `npm test` | ARQ-113 | revisada | **APROBADA** | — | `T6-npm-test.txt` (20/20; 17 de la 5.8.1), `T6-tests-contra-v5.8.txt` |
| T7 · Entrega 5.8.1/34 | — | revisada | **APROBADA** | — | navegador: «Novedades de la v5.8.1» con la versión leída de `version.json` |

## 2. No conformidades (NC)

Formato: `REV-T<n>-<k>`. La columna «Corregido» la rellena `dev`.

| ID | Sev. | Tarea | Archivo:línea | Pasos | Esperado | Obtenido | Evidencia | Corregido |
|---|---|---|---|---|---|---|---|---|
| REV-T1-1 | BAJA | T1 (T5) | `src/lib/recorder.ts:253-255` (`fallback`) | Micro por defecto mudo → `fallback()` abre el micro del teléfono con `deviceId: {exact}` y ese `getUserMedia` falla (p. ej. `OverconstrainedError`/`NotReadableError`) | Usar el siguiente recurso (por defecto sin procesado, una vez) o seguir con el stream mudo | El error sube como «No se pudo abrir el micrófono»; el reintento de `begin()` repite exactamente el mismo camino y vuelve a fallar. En v5.8 se probaba la siguiente opción. Probabilidad baja (el `deviceId` sale de `enumerateDevices` justo antes). No bloquea | lectura de código || Corregido en `src/lib/recorder.ts` (`fallback`): si el micro del teléfono falla al abrirse, se prueba una vez el por defecto sin procesado (no se recuerda); como mucho una alternativa llega a abrirse y queda en `recorders`. Tests: «REV-T1-1: …se prueba el por defecto sin procesado» y «…si fallan también las alternativas» (`tests/recorder.test.mjs`). |
| REV-T2-1 | BAJA | T2 | `src/components/TalkButton.tsx` (`onPointerDown`, guarda `if (recording && …)`) | Clase: dedo 1 `pointerdown` → **durante la apertura** (fase aún no `recording`) dedo 2 `pointerdown` → dedo 2 `pointerup` → dedo 1 `pointerup` | El dedo 1 sigue mandando; el dedo 2 se ignora | El dedo 2 se queda con el gesto (`gesture.id = 2`) y su `pointerup` para la grabación a 0 s («Mantén el botón presionado…»); el `pointerup` del dedo 1 se ignora. **Sin huérfano y sin envío** (lo de privacidad está bien). Ventana: la apertura (≈0,5 s al volver de segundo plano, ≈2 s si se mide la señal). Arreglo sugerido: ignorar otro `pointerId` siempre que `gesture.current.active` (y limpiar el gesto en `pointercancel`/cambio de fase para no bloquear el botón) | `evidencia-rev/T1-T2-T5-nav.txt` (MIC-304) || Corregido: reglas de los dedos extraídas a `src/components/talkGesture.ts` (nuevo); cualquier otro `pointerId` se ignora mientras haya un dedo activo (también durante la apertura); el gesto se suelta en `lostpointercapture` y al pasar a ocupado para no bloquear el botón. `src/components/TalkButton.tsx`. Tests: `tests/talkGesture.test.mjs` (4). |

**Verificación de las correcciones (regresión, `evidencia-rev/reg581-nav.txt`, `reg581-test.txt`):**
- **REV-T1-1 · CERRADA.** Si el micro del teléfono falla, se hace un intento sin procesado que **no se recuerda**: la siguiente apertura vuelve a usar AEC, abre como mucho una alternativa y queda en `recorders`. Frente a MIC-800 es aceptable, porque perder AEC en una sola grabación y solo con fallo de apertura del micro del teléfono es raro y no se queda fijado para la sesión. Lo cubren 2 tests nuevos.
- **REV-T2-1 · CERRADA.** Con un segundo dedo durante la apertura y el primero sostenido hay un solo grabador y un solo envío, y los `pointerdown`/`pointerup` del dedo 2 se ignoran. Con un solo dedo y `pointercancel` se envía y el botón vuelve a «Mantener para hablar». Hay además 4 tests de `talkGesture`. **Para el móvil:** se suelta en `lostpointercapture`; comprobar que mantener pulsado 10 s con el dedo real no corta la grabación antes de tiempo (R8).

### 2.1 Opinión sobre T4 (MIC-308) para el dueño
- **¿Es cierto que no hay forma de cortar desde Java una captura ya concedida?** En lo práctico, sí. `PermissionRequest` no tiene `revoke` (solo `grant`/`deny` de una petición pendiente); `WebView.onPause()` no corta la captura (B8 `m308`); ocultar o pausar el WebView tampoco; `AudioManager` no puede parar la grabación de otro cliente. Lo único que la cortaría seguro es destruir la página (`WebViewRenderProcess.terminate()` en API 29+, o `loadUrl`/`destroy`), que pierde la clase en curso y no se puede usar como rutina.
- **Lo que aporta la mitigación:** (1) `HablaChromeClient` deniega en nativo **cualquier apertura nueva** tras `onStop`: cierra el camino de MIC-301 aunque fallara la cancelación en JS (defensa en profundidad real, sin depender del JS). (2) `evaluateJavascript("__hablaBackground()")` adelanta el aviso al JS, pero **también necesita el hilo JS**: en el escenario exacto de MIC-308 (hilo ocupado) no corta antes.
- **Riesgo residual real:** una captura **ya abierta** sigue mientras el hilo JS esté ocupado al pasar a segundo plano. Con T1 ya no hay streams huérfanos (lo que hacía la captura indefinida en la auditoría), los bloqueos reales duran décimas de segundo y Android (≥ 9) silencia la captura en segundo plano a los ~5 s. **Severidad residual: BAJA.**
- **Mi opinión:** la mitigación es suficiente para **cerrar el P0 de la 5.8.1**. MIC-308 queda como residual BAJA documentado (`docs/problemas-conocidos.md` ya lo dice sin prometer de más) y como caso **R5 prioritario** del revisor móvil.
- Compila (`:app:compileDebugJavaWithJavac --offline -q`, exit 0, `apk/` sin tocar). Sustituir el `WebChromeClient` conserva lo de Capacitor (hereda `BridgeWebChromeClient`; los lanzadores de resultados se registran en `onCreate`, antes de `STARTED`).

### 2.2 Punto de riesgo: `pause` de Capacitor ya no cierra los micros (lifecycle.ts)
- En Capacitor 8, `appStateChange(isActive=false)` se dispara en `BridgeActivity.onStop` (cuando `activityDepth` llega a 0), no en `onPause` (`node_modules/@capacitor/android/.../BridgeActivity.java:110-120`). `MainActivity.onStop` llama además a `window.__hablaBackground()` y a `wv.onPause()` (página oculta → `visibilitychange`). **El cierre en segundo plano sigue cubierto por tres caminos**, todos en `onStop`; llega algo más tarde que antes (de `onPause` a `onStop`, normalmente <0,5 s).
- Casos con solo `onPause` (diálogo de permiso, cortina de notificaciones, foco perdido en pantalla dividida): la app sigue a la vista y el micro no se cierra, que es lo que se busca (no abortar la apertura del permiso).
- No reabre MIC-301: tras la cancelación no hay ningún camino que reabra sin pulsar (comprobado en navegador, variantes A y B) y en nativo `HablaChromeClient` deniega aperturas tras `onStop`.
- **Sin cerrar en PC:** si **bloquear la pantalla** (M5/M6) y la **vista de apps recientes** llegan a `onStop` en el POCO y en el Galaxy A11 → caso **R1 prioritario** del revisor móvil.

### 2.3 Observaciones (no son NC)
- **Desarrollo con StrictMode:** el desmontaje simulado de `Conversation` llama a `close()`, que ahora cancela la apertura inicial: en `npm run dev` la clase entra sin micro abierto y el primer toque lo abre (≈latencia de apertura). En el APK no hay StrictMode. Ojo al probar MIC-305/X1 en el navegador.
- **MIC-800 y nombres de micros:** `looksMuted()` trata como «mudo» una lista de micros **sin nombres**. Si el WebView del teléfono no da nombres, en silencio habrá 1 reintento por apertura (≤2 aperturas, sin perder AEC). Comprobar en el POCO (R6).
- El árbol de trabajo contiene cambios de la **v5.8.2** (`android/app/build.gradle`, `proguard-rules.pro`, `android/app/src/debug/`, `src/components/AzureSettings.tsx`, `src/lib/azureUsage.ts`, `tests/azureUsage.test.mjs`): **no** entran en el parche de la 5.8.1 (ver §7).

## 3. Antes y después (navegador)

| Escenario | v5.8 | v5.8.1 (árbol de dev) |
|---|---|---|
| MIC-302 doble toque en el dictado | FALLA: 2 aperturas, #0 vivo tras cerrar y en segundo plano | PASA: 1 apertura, 1 grabador, `live=[]` al cerrar y en segundo plano |
| MIC-303 «Atrás» 2→1 grabando / durante la apertura / cerrar la hoja durante la apertura | (B3/B8: FALLA) | PASA las 3 variantes: micro cerrado, ningún `rec start` tardío, 0 bytes enviados |
| MIC-301 segundo plano durante `getUserMedia` / durante `hasSignal` | (B3: FALLA, reabre oculto) | PASA: el stream tardío se para en 1 ms; sin `fallback` ni reapertura al volver |
| MIC-304 segundo dedo | (B3/B8: FALLA, huérfano >24 s) | PASA en privacidad (1 grabador, nada huérfano); REV-T2-1 de usabilidad |
| MIC-800 silencio | (B8: 4 aperturas, ~12 s, sin AEC) | PASA: 1 apertura con AEC en 2,6 s; con BT mudo, 2 aperturas con AEC en 3,2 s |

### 3.1 Línea base sobre v5.8 (antes de los cambios de dev)

| Escenario | Resultado en v5.8 | Evidencia |
|---|---|---|
| MIC-302 · doble toque en «Dictar por voz» (Tema libre), `gumDelay` 1,5 s | **FALLA**: 2 `getUserMedia` y 2 `MediaRecorder`; tras «Terminar», cerrar la hoja y segundo plano simulado, el stream #0 sigue `live` (`liveWhileHidden=[0]`). Reproduce el hallazgo. | `evidencia-rev/base-v5.8-MIC-302.txt` |
| MIC-303 · «Atrás» del paso 2 al 1 en el Debate | **No medido en v5.8**: `dev` modificó `src/lib/recorder.ts` durante la prueba (Vite recargó la página). Se contrastará con el código de HEAD en la fase B (la causa raíz está en `TopicAskPage.tsx:120`, sin tocar entonces). Reproducción previa: B3 `evidencia/nav-M9b-dictado-debate.txt` (17 s, 70 KB), B8 `m303-*`. | — |

## 4. Lista de comprobación por tarea

Derivada de las causas raíz (B3 `hallazgos.md`, B1 ARQ-100/113, B8 `verificacion.md`) y de los pasos de reproducción. Líneas de v5.8 (HEAD).

### T1 · Recorder reentrante y cancelable (MIC-302, MIC-301, ARQ-100)
Causa raíz: `open()` (`recorder.ts:118-154`) sin estado «abriendo» ni token; `isOpen` falso durante `getUserMedia`; `recorders.add` después del `await` (`:129`); `close()` no cancela aperturas en vuelo; `fallback()` (`:157-174`) asigna `this.stream` sin `recorders.add`; las pantallas cambian su estado después del `await begin()`.
- [ ] **Reentrada:** dos `open()`/`begin()` concurrentes en la misma instancia → **una sola** llamada a `getUserMedia` (promesa compartida o equivalente) y **un solo** `MediaRecorder`. El segundo `begin()` no crea otro grabador sobre el mismo stream (si el diseño devuelve la misma promesa a `begin()`, comprobar que `start()` no se ejecuta dos veces).
- [ ] **Cancelación:** `close()` (y `releaseAllMics()`) durante cada `await` de `open()` — `getUserMedia`, `afterOpen`, `hasSignal`, `phoneMics`/`enumerateDevices` y cada `getUserMedia` de `fallback()` — → el stream que llegue tarde se **para** y no se asigna; `open()` sale sin dejar nada vivo y sin reabrir. Comprobar que el «salir» de `open()` cancelado no lanza un error que las pantallas muestren como «No se pudo abrir el micrófono» al usuario (o, si lanza, que las pantallas lo ignoren).
- [ ] **Registro:** cada asignación de `this.stream` (incluida la de `fallback()`) queda en `recorders` → `releaseAllMics()` la alcanza. Revisar que no quede un estado en que `this.stream` viva fuera de `recorders`.
- [ ] **`begin()` reintento** (`:200-215`): el `close()+open()` del reintento no deja vivo el stream del primer intento ni abre dos.
- [ ] **Segundo plano:** no abrir (o cerrar al instante) si `document.hidden` / app en segundo plano (propuesta B3). Si no se implementa, que la cancelación por generación lo cubra (MIC-301 caso a: cierre durante `getUserMedia`).
- [ ] **`catch` de `open()`** (MIC-306 residual): si falla `enumerateDevices`, no queda el stream inicial vivo.
- [ ] **Pantallas**: `TopicAskPage.tsx:45-56`, `Calibration.tsx:540-553`, `ReviewScreen.tsx:112-124`, `Conversation.tsx:426-442` y apertura inicial `:308-315` — con el Recorder reentrante, un doble toque no debe dejar la UI en un estado incoherente (p. ej. `setMic('recording')` dos veces, o el segundo toque interpretado como «terminar» con 0 s → mensaje «No te he oído» espurio). Idealmente estado «abriendo» que deshabilite el botón. Repaso: «No lo sé» durante la apertura no debe quedar pisado por `setStep('recording')`.
- [ ] **No regresiones:** `stop()` sigue sin colgarse (2 s); `releaseIfIdle()`/`setMicMode()`/`devicechange` siguen funcionando; `isOpen` sigue reabriendo un stream muerto; los mensajes de `MicError` (permiso / ocupado) siguen igual (M10).
- Navegador (RECETA §2 y §3): doble toque con `gumDelay` 1500 → `opened=1`, `live=[]` tras terminar y cerrar; cierre durante la apertura (variantes A, B, C) → ningún `gUM` con `hidden=true`, `live=[]` tras el 2.º segundo plano.

### T2 · Guarda del segundo puntero (MIC-304)
Causa raíz: `TalkButton.tsx:81-97` no comprueba `gesture.current.active` ni el `pointerId`; `recorder.ts:186-197` `start()` sobrescribe `this.recorder` sin parar el anterior.
- [ ] `pointerdown` con otro `pointerId` mientras hay un gesto activo → ignorado (sin `onPress`).
- [ ] `pointerup`/`pointercancel` del segundo puntero → ignorado (no envía ni corta la grabación del primero). El `pointerup` del primero envía **una vez**.
- [ ] `start()` con un grabador activo → lo para o lanza (defensa en profundidad para Calibration/Review/TopicAsk, que no usan TalkButton).
- [ ] Sin regresión en: bloqueo deslizando ↑ (toque en ➤ envía), cancelar deslizando ←, auto-envío a 60 s con fonética, `pointercancel` al salir del botón, interrumpir al profe hablando.
- Navegador (RECETA §5): `pointerdown` id 1 → 1,5 s → `pointerdown` id 2 → `pointerup` id 2 → `pointerup` id 1 → `rec` creados = 1, `recording=[]` 3 s después, 1 petición con audio.

### T3 · Debate y dictado (MIC-303)
Causa raíz: `TopicAskPage.tsx:120` (`onBack` del paso 2 = `setStep(0)`, sigue montado), `:41` (solo cierra al desmontar), `:51-52` (`setMic('recording')` tras el `await`: si ya se salió del paso, graba igual — agravante de B8).
- [ ] «Atrás» del paso 2 al 1 con el dictado grabando → `close()`, `mic='idle'`, `live=[]`, `recording=[]`, nada enviado.
- [ ] «Atrás» **durante la apertura** (antes de «Te escucho») → al resolver la apertura no se empieza a grabar y el stream se cierra.
- [ ] Desmontar la hoja (Atrás de Android, `onClose`, «Que elija el profe») durante la apertura → nada vivo (`useEffect` de limpieza + cancelación de T1).
- [ ] Volver al paso 2 tras el arreglo: botón en «Dictar por voz» (no «Te escucho…») y el texto ya escrito se conserva.
- [ ] Tema libre (sin paso 1): «Atrás» = `onClose` → desmonta y cierra.
- [ ] Dictado normal (M9) sigue funcionando: tocar → hablar → tocar → texto (red falsa: 1 petición con audio).
- Navegador (RECETA §4).

### T4 · Red de seguridad nativa (MIC-308)
Causa raíz: `MainActivity.java:27-34` solo hace `wv.onPause()` + `pauseTimers()` en `onStop`; B8 demostró que `WebView.onPause()` no corta la captura de `getUserMedia` (`m308`).
- [ ] Revisar qué mecanismo usa (`evaluateJavascript("releaseAllMics()")`, denegar/revocar el `PermissionRequest`, aviso al JS…) y si **de verdad** corta la captura con el hilo JS ocupado (si depende del JS, no es red de seguridad: anotarlo).
- [ ] `onPause` vs `onStop`: no congelar la app con un diálogo del sistema (motivo del comentario original); no cerrar el micro con un simple diálogo de permisos si eso rompe la primera apertura (el diálogo de `RECORD_AUDIO` pausa la actividad).
- [ ] Compila: `npx cap sync android` + `gradlew.bat assembleDebug --offline -q`. Sin cambios en `keystore/`, `loggingBehavior` intacto.
- [ ] Al volver (`onStart`/`onResume`) no se reabre nada solo.
- Solo teléfono: m308 (hilo JS ocupado 8 s + Inicio) → la entrada de Habla se libera sin esperar al JS. Va a §5.

### T5 · `fallback()` en silencio (MIC-800)
Causa raíz: `hasSignal()` (`recorder.ts:76-97`) toma «ninguna muestra ≠ 0 en 2 s» como mudo; `fallback()` prueba todos los micros (2 s cada uno) y acaba en RAW; `chosen` (`:55`, global) fija RAW (sin AEC) para toda la sesión.
- [ ] Ceros exactos no bastan para declarar el micro mudo: segunda comprobación (p. ej. `track.muted`, nueva medida, o solo en modo `headset`).
- [ ] Como mucho **1 reintento** (≤2 aperturas en total al entrar en silencio) y tiempo hasta grabar acotado (≪12 s).
- [ ] No se fija RAW/sin AEC para toda la sesión fuera de `headset`/`split`; si se elige otro micro, que conserve `echoCancellation`.
- [ ] El caso real que motivó `fallback()` (auriculares BT con canal mudo, comentario `:9-15`) sigue cubierto en modo `headset` (no romperlo).
- [ ] La ventana de MIC-301 se reduce y, con T1, un cierre durante el reintento no deja nada vivo.
- Navegador (RECETA §6): `silentAll` + `fakeDevices` → contar `gUM`, restricciones de la última apertura y de la siguiente grabación.

### T6 · Tests del Recorder + `npm test` (ARQ-113)
- [ ] `npm test` existe, usa `node:test` + Vite `ssrLoadModule` (sin dependencias nuevas; `package.json` solo cambia `scripts`). Funciona en Windows.
- [ ] El `getUserMedia` simulado permite retardo y control de la resolución (promesas manuales), `MediaRecorder` simulado con estados, `AudioContext` simulado para `hasSignal` (ceros / señal).
- [ ] Casos mínimos: (1) dos `begin()` concurrentes → 1 `getUserMedia`, 1 grabador; (2) `close()` durante `getUserMedia` → stream tardío parado, nada en `recorders`; (3) `close()` durante `hasSignal` → `fallback()` no reabre; (4) `fallback()` registra su stream y `releaseAllMics()` lo cierra; (5) `start()` con grabador activo; (6) silencio → ≤1 reintento y AEC conservado.
- [ ] **Los tests fallan con el `recorder.ts` de v5.8** (se comprobará cargando `git show HEAD:src/lib/recorder.ts` en el scratchpad y ejecutando los mismos tests contra él). Un test que pasa con v5.8 no prueba la causa raíz.
- [ ] Los tests no dependen del tiempo real de forma frágil (sin `sleep` de 2 s reales; temporizadores controlados o `ms` inyectable).

### T7 · Entrega
- [ ] `version.json` = `5.8.1` / `34`; `RELEASES` en `changelog.ts` con entrada 5.8.1 en español («Actualización de parches de seguridad y corrección de la v5.8», sin prometer funciones nuevas), visible en «Novedades» y en Acerca de.
- [ ] El aviso de novedades salta una vez (comparación por igualdad, `notices.ts:19`).
- [ ] `docs/` actualizados (`estado-actual.md`, `problemas-conocidos.md`, `NC-v5.8.1.md`), CLAUDE.md (versión, «Pruebas» con `npm test`).
- [ ] Puertas: `tsc -b`, lint 0 errores, `npm test`, `validate-bank`, `npm run build`, `assembleDebug --offline` → `apk/Habla-v5.8.1.apk` (si dev lo genera; nunca tocar `keystore/`).

### Regresión transversal (todas las pantallas que graban)
- [ ] Conversation: entrar, turno normal (M2), salir, terminar, segundo plano con la clase abierta (M4: se cierra y no se reabre solo).
- [ ] Calibration: tarea de habla (doble toque, `finish()`), `close()` en error.
- [ ] ReviewScreen: grabar, «No lo sé» durante la apertura.
- [ ] TopicAskPage: Tema libre y Debate.
- [ ] Inicio/Palabras/Progreso/Ajustes: ninguna apertura (M12).

## 5. Para el revisor móvil

**Prioritarios (no se pueden cerrar en PC):**

| # | Escenario | Qué comprobar | Arnés |
|---|---|---|---|
| **R1** | Segundo plano sin el aviso `pause` (§2.2): Inicio con la clase abierta (M4), **bloquear la pantalla** en reposo y grabando (M5/M6), **vista de apps recientes**, llamada entrante | La entrada de Habla se libera (`Inputs(0)`, `MODE_NORMAL`) en ≈1–2 s, como en la v5.8; nada se reabre al volver | `B3/arnes`, `B8/arnes/bloqueo.sh` |
| **R2** | Primera concesión del permiso de micrófono (permiso revocado, pedir al dueño) | El diálogo de Android (`onPause`) **no** cancela la apertura: el primer toque graba | manual |
| R3 | M4b / MIC-301: Inicio a 0,45 s de entrar en clase; volver; 2.º Inicio | Ninguna apertura sin pulsar; `appops` no `running` en segundo plano | `B8/arnes/m301.sh` |
| R4 | M9c / MIC-302 doble toque en el dictado; también en el test y en el Repaso | Una sola entrada; `Inputs(0)` al cerrar | `m302.sh` |
| **R5** | MIC-308: hilo JS ocupado 8 s + Inicio | Esperado (mitigación parcial): la captura ya abierta sigue hasta que el JS se libera o Android la silencia (~5 s); **ninguna apertura nueva** en segundo plano (logcat `HablaMic` «denegada» si se intenta) | `m308.sh` |
| R6 | MIC-800: habitación en silencio al entrar en clase y al dictar | ≤2 aperturas, grabación en ≲3 s, sigue con AEC; anotar si `enumerateDevices` da nombres en el WebView (§2.3) | `m305.sh` / `m303.sh` |
| R7 | M9b / MIC-303: «Atrás» grabando y durante la apertura | Sin punto verde en el paso 1; 0 bytes a la red | `m303.sh` |
| R8 | X1 / MIC-304 dos dedos (CDP) — también con el segundo dedo durante la apertura (REV-T2-1) | Un solo `MediaRecorder` | bloque X1 de `m305.sh` |
| R9 | Regresión: M2 turno normal, M11 `force-stop`, M12 pantallas sin micro, selector de archivos/permiso tras sustituir el `WebChromeClient` | Igual que en la v5.8 | `B3/arnes` |
| R10 | Auriculares BT (M7) con el `fallback` nuevo de un solo reintento | Elige el micro del teléfono si el BT llega mudo | soundcore del dueño |

## 6. Veredicto de la v5.8.1 (revisión en PC)

**GO en PC** (pendiente del revisor móvil). Las 7 tareas están APROBADAS y las NC REV-T1-1 y REV-T2-1 están cerradas y verificadas en la regresión. Puertas sobre el árbol actual: `tsc -b` 0 errores · lint 0 errores (solo los avisos antiguos de Calibration) · `npm test` 26/26 en la regresión (los de `azureUsage`/`backupCheck` son de la 5.8.2), sin procesos Vite colgados ni aviso del puerto · `validate-bank` OK · `npm run build` OK · Java compila (`compileDebugJavaWithJavac --offline`, `apk/` intacto). Los tests fallan con el `recorder.ts` de v5.8 (11–13 de 15). Antes de generar el APK hay que pasar los casos R1 y R2 en el teléfono.

### 7. Archivos que forman la v5.8.1
- `src/lib/recorder.ts`, `src/lib/lifecycle.ts`, `src/lib/changelog.ts`
- `src/components/TalkButton.tsx`, `src/components/talkGesture.ts` (nuevo), `src/components/TopicAskPage.tsx`
- `src/screens/Conversation.tsx`, `src/screens/Calibration.tsx`, `src/screens/ReviewScreen.tsx`
- `android/app/src/main/java/com/shift/habla/MainActivity.java`, `android/app/src/main/java/com/shift/habla/HablaChromeClient.java` (nuevo)
- `package.json` (solo el script `test`), `version.json` (5.8.1 / 34)
- `tests/helpers/vite.mjs`, `tests/helpers/mic-mocks.mjs`, `tests/recorder.test.mjs`, `tests/talkGesture.test.mjs` (nuevos)
- `CLAUDE.md`, `docs/estado-actual.md`, `docs/problemas-conocidos.md`, `docs/correccion/` (NC-v5.8.1.md, REVISION-v5.8.1.md, ESTADO.md, REGLAS.md, REVISOR-MOVIL.md, arnes-rev/, evidencia-rev/)

**No entran (son de la v5.8.2):** `android/app/build.gradle`, `android/app/proguard-rules.pro`, `android/app/src/debug/`, `src/components/AzureSettings.tsx`, `src/lib/azureUsage.ts`, `tests/azureUsage.test.mjs`, `src/lib/backup.ts`, `src/lib/backupCheck.ts`, `src/screens/SettingsScreen.tsx`, `src/App.tsx`, `src/main.tsx`, `src/components/Recovery.tsx`, `src/lib/profile.ts`, `tests/backupCheck.test.mjs`. Atención: `CLAUDE.md`, `docs/*` y `NC-*` pueden acabar mezclando texto de las dos versiones si se editan más. Revisa el `git diff` de esos archivos antes de guardar el parche.

## 8. Bitácora de la revisión
- 2026-10-06 — rev: regresión de la 5.8.1 OK. REV-T1-1 y REV-T2-1 cerradas; MIC-301/302/303/304/800 siguen pasando; `npm test` 26/26. §7 incluye `talkGesture.ts` y su test.
- 2026-10-06 — rev: fase B de la v5.8.1. T1–T7 APROBADAS (T4 con riesgo residual BAJA aceptado). NC BAJA: REV-T1-1, REV-T2-1. GO en PC; R1/R2 prioritarios en el teléfono.
- 2026-10-06 — rev: fase A lista. Arnés `arnes-rev/rev-mic.js` + `RECETA.md`; línea base MIC-302 FALLA en v5.8; MIC-303 sin línea base (dev cambió `recorder.ts` durante la prueba).
