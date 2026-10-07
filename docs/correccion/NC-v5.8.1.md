# Habla 5.8.1 «Micrófono seguro» — Respuesta a las no conformidades de la auditoría

Entrega: v5.8.1 (build 34) · Agente: `dev` · Fecha: 2026-10-06 · Base: `0a1d6f8` (v5.8 build 33).
Origen: `docs/auditoria/resultados/INFORME.md` §8.2 y los hallazgos de B1, B3 y B8.
Pruebas en PC: `npx tsc -b`, `npm run lint` (0 errores), `npm test` (pruebas del Recorder con micrófono simulado). **El teléfono no estaba disponible**: lo que solo se puede comprobar en el POCO está en «Para el teléfono» de cada NC y resumido al final.

## Resumen

| NC | Hallazgos | Qué se cambió | Dónde |
|---|---|---|---|
| NC-v5.8.1-01 (T1) | AUD-MIC-302, AUD-MIC-301, AUD-ARQ-100 (+MIC-306, MIC-309) | Recorder reentrante y cancelable: una sola apertura en curso, registro antes del primer `await`, cancelación por generación, `fallback()` registrado | `src/lib/recorder.ts`, `src/lib/lifecycle.ts`, `Conversation.tsx`, `Calibration.tsx`, `ReviewScreen.tsx` |
| NC-v5.8.1-02 (T2) | AUD-MIC-304 | El botón de hablar ignora un segundo dedo / toque con la grabación en marcha; solo el dedo que manda mueve y suelta; `start()` ignora un segundo arranque | `src/components/TalkButton.tsx`, `src/lib/recorder.ts` |
| NC-v5.8.1-03 (T3) | AUD-MIC-303 | Dictado de Tema libre/Debate: cambiar de paso, cerrar la hoja o desmontar anula el dictado (cierra el micro, cancela la apertura, no graba ni envía) | `src/components/TopicAskPage.tsx` |
| NC-v5.8.1-04 (T5) | AUD-MIC-800 | Silencio ≠ micro mudo sin segunda comprobación; 1 solo reintento; nunca se recuerda un micro sin cancelación de eco | `src/lib/recorder.ts` |
| NC-v5.8.1-05 (T4) | AUD-MIC-308 | Red de seguridad nativa: el WebView deniega el micro en segundo plano; `onStop` avisa directamente al JS | `MainActivity.java`, `HablaChromeClient.java` (nuevo), `lifecycle.ts` |
| NC-v5.8.1-06 (T6) | AUD-ARQ-113 | Primer runner de pruebas (`npm test`, sin dependencias nuevas) y 17 pruebas del Recorder con micrófono simulado | `package.json`, `tests/` |
| NC-v5.8.1-07 (T7) | — | Versión 5.8.1 (build 34), «Novedades» y documentación | `version.json`, `src/lib/changelog.ts`, `CLAUDE.md`, `docs/problemas-conocidos.md`, `docs/estado-actual.md` |

---

## NC-v5.8.1-01 (T1) · Recorder reentrante y cancelable

**Hallazgos:** AUD-MIC-302 (doble toque → stream huérfano), AUD-MIC-301 (cerrar durante la apertura → `fallback()` reabre fuera de `recorders`), AUD-ARQ-100 (`open()` no reentrante). De paso: AUD-MIC-306 (no cerrar en el `catch`) y AUD-MIC-309 (trozos compartidos entre grabaciones).

**Causa raíz:** `open()` no memorizaba la apertura en curso (dos llamadas → dos `getUserMedia`, la última pisaba `this.stream`), no se registraba en `recorders` hasta después del primer `await`, ningún paso comprobaba si se había pedido el cierre mientras esperaba, y `fallback()` asignaba streams nuevos sin registrarlos.

**Qué se cambió (`src/lib/recorder.ts`):**
- `open()` guarda la promesa en curso (`opening`) y la devuelve a las llamadas simultáneas; `begin()` hace lo mismo (`beginning`). Un doble toque, o pulsar el micro mientras la clase aún abre el suyo, comparten una única apertura y una única grabación.
- Contador de generación `gen`: `close()` lo sube (y anula `opening`/`beginning`). La apertura captura la generación al empezar y la comprueba **tras cada `await`** (`getUserMedia`, `afterOpen`, medición de señal, `enumerateDevices`, `getUserMedia` del reintento). Si cambió, para las pistas que acaba de recibir y devuelve `false` sin grabar.
- La grabadora entra en `recorders` **antes** del primer `await`: `releaseAllMics()` (segundo plano) también cancela aperturas a medias. El stream del reintento (`fallback`) queda asignado a la grabadora registrada (y se vuelve a añadir por claridad).
- `open()` y `begin()` devuelven `Promise<boolean>`: `false` = se canceló (cerraste la pantalla, segundo plano, cambiaste de paso) o ya se estaba grabando. Las pantallas no cambian a «grabando» con `false`.
- `begin()` no reintenta si la apertura se canceló (antes un cierre provocaba una reapertura en el `catch`).
- Si la apertura falla de verdad, `release()` suelta el stream (AUD-MIC-306) sin subir la generación.
- `releaseIfIdle()` (cambio de modo de audio, `devicechange`) no corta una apertura en curso: Android puede emitir `devicechange` justo al conceder el permiso.
- `start()` crea una lista de trozos propia por grabación (AUD-MIC-309) y se ignora si ya hay un `MediaRecorder` grabando (base de T2).
- Getters nuevos: `isOpening`, `isRecording`.

**Pantallas:**
- `Conversation.tsx` (`onPress`): si `begin()` devuelve `false`, no pasa a «grabando».
- `Calibration.tsx` (`toggleRecord`) y `ReviewScreen.tsx` (`toggleRecord`): idem; un doble toque comparte la apertura.
- `ReviewScreen.tsx` (`dontKnow`): «No lo sé» durante la apertura la cancela (antes, al abrir, `setStep('recording')` pisaba el resultado).
- La apertura inicial de la clase (`rec.open()`) ya devolvía el control y comprobaba `gone()`; ahora además una apertura cancelada no deja nada abierto.

**`src/lib/lifecycle.ts` — cambio de comportamiento a revisar:** el aviso `pause` de Capacitor (Activity.onPause) **ya no** cuenta como segundo plano. onPause llega también con el diálogo de permiso del micrófono de Android y al perder el foco en pantalla dividida, con la app a la vista; como cerrar ahora cancela la apertura en curso, cerrar ahí abortaría justo la apertura que pidió el permiso (en la primera instalación el primer toque no grabaría). El segundo plano real sigue cubierto por `appStateChange` (onStop), `visibilitychange` (MainActivity.onStop llama a `WebView.onPause()`), `pagehide` y la nueva puerta directa `window.__hablaBackground()` que llama MainActivity.onStop (T4).

**Cómo se probó (PC):**
- `npm test` → `tests/recorder.test.mjs` (micro simulado, ver T6): doble `begin()` simultáneo = 1 `getUserMedia`, 1 pista viva y 1 `MediaRecorder`; `begin()` durante la `open()` inicial comparte la apertura; `close()` con `getUserMedia` pendiente → `false`, 0 pistas vivas, 0 grabadores; `close()` durante la medición de señal → ninguna reapertura; `releaseAllMics()` cancela una apertura en curso; tras una cancelación la siguiente pulsación abre con normalidad; `close()` con el reintento pendiente → 0 pistas vivas; permiso denegado y micro ocupado sin nada abierto.
- `npx tsc -b` sin errores · `npm run lint` 0 errores (los avisos son los antiguos y los de los arneses de `docs/`).

**Para el teléfono (revisor móvil):** M9c (doble toque en el dictado → 1 solo stream; al cerrar la hoja, `Inputs(0)`), M4b (Inicio a ~0,45 s de entrar en clase → al volver no se reabre sin pulsar; el 2.º Inicio deja `Inputs(0)`), test de nivel y Repaso con doble toque, y **primera concesión del permiso de micrófono** (instalación limpia o permiso revocado: el primer toque debe grabar, el diálogo de permiso ya no cancela la apertura).

---

## NC-v5.8.1-02 (T2) · Segundo dedo en el botón de hablar

**Hallazgo:** AUD-MIC-304 (con el dedo puesto grabando, un segundo dedo creaba otro `MediaRecorder`; al soltar solo se paraba el segundo y el primero seguía grabando huérfano toda la clase).

**Qué se cambió:**
- `src/components/TalkButton.tsx`: el gesto guarda el `pointerId` del dedo que manda. Con la fase `recording` (sin bloqueo), un `pointerdown` nuevo se ignora (sea otro dedo o un toque justo después de soltar). `pointermove`, `pointerup` y `pointercancel` de otros dedos se ignoran, así que soltar el segundo dedo no envía ni cancela. Con la grabación bloqueada, un toque sigue enviando (como antes). Durante la apertura (fase aún no `recording`) un segundo toque llega al Recorder, que comparte la misma apertura y grabación (T1), así no hay forma de que el botón quede bloqueado si se perdiera un `pointerup`.
- `src/lib/recorder.ts`: `start()` devuelve `false` y no hace nada si ya hay un `MediaRecorder` grabando; `begin()` con la grabación en marcha devuelve `false` y Conversation no cambia de fase (red de seguridad para cualquier otra pantalla).

**Cómo se probó (PC):** `npm test` → «MIC-304: un segundo start() con una grabación en marcha se ignora» (1 solo `MediaRecorder`, un `begin()` extra devuelve `false`, tras parar se puede volver a grabar). `npx tsc -b` OK, lint 0 errores. La parte de punteros es de interfaz: la comprueba `rev` en el navegador con dos `pointerId` (escenario X1 del arnés).

**Para el teléfono:** X1 con dos dedos reales: `pointerdown` id 1 → `pointerdown` id 2 → soltar id 2 → soltar id 1: un solo `MediaRecorder`, se envía una vez (al soltar el dedo 1) y ningún grabador sigue `recording` después.

---

## NC-v5.8.1-03 (T3) · Debate y dictado: «Atrás» ya no deja grabando

**Hallazgo:** AUD-MIC-303 (Debate → «Lo propongo yo» → «Dictar por voz» → «Atrás»: seguía grabando en «¿Quién elige el tema?» con el punto verde, y al volver y tocar «terminar» se enviaba a Gemini todo lo grabado; B8 vio además que la grabación podía **empezar después** de pulsar «Atrás» si la apertura tardaba).

**Causa raíz:** el cierre del micro solo estaba ligado al desmontaje; el paso 2→1 es un cambio de estado interno, y `setMic('recording')` se hacía tras el `await begin()` sin comprobar si el usuario seguía en el paso.

**Qué se cambió (`src/components/TopicAskPage.tsx`):**
- Contador de «vuelta» del dictado (`run`). `abandon()` lo sube, llama a `recorder.close()` (que también cancela una apertura en curso, T1) y deja el botón en reposo.
- Se llama a `abandon()` al volver del paso 2 al 1 (`goStep(0)`), al cerrar la hoja con la flecha (`close`), al empezar la clase con el botón principal y al desmontar (atrás de Android, que cierra la hoja).
- `toggleMic` captura la vuelta al empezar y la comprueba tras cada `await`: tras `begin()` (si la apertura terminó después de salir, no pasa a «grabando»; `begin()` además devuelve `false` porque se canceló), tras `stop()`, tras `analyzeSpeech()`, tras `blobToBase64()` (**antes de llamar a `dictate`**: el audio de un dictado abandonado no sale del teléfono) y tras la respuesta de Gemini (no escribe el texto ni avisos de un dictado anulado).

**Cómo se probó (PC):** `npx tsc -b` OK, lint 0 errores (sin avisos nuevos), `npm test` 16/16 (la cancelación del Recorder que usa este arreglo: «close() mientras getUserMedia está pendiente», «releaseAllMics() cancela…»). El recorrido de la pantalla (M9b/m303: «Atrás» durante la apertura y durante la grabación, y comprobar que no hay petición de dictado) lo hace `rev` en el navegador con el arnés y la red simulada.

**Para el teléfono:** M9b / `m303.sh`: «Atrás» 2,5 s después de «Dictar por voz» (y también antes de que aparezca «Te escucho…») → en «¿Quién elige el tema?» sin punto verde, `Inputs(0)` en ~1 s; volver a «Lo propongo yo» → botón en «Dictar por voz»; ninguna petición de dictado en la red simulada.

---

## NC-v5.8.1-04 (T5) · `fallback()` en silencio

**Hallazgo:** AUD-MIC-800 (en una habitación en silencio el micro con procesado da ceros exactos; `hasSignal` lo tomaba por mudo, `fallback()` reabría hasta 4 veces en ~10–12 s y fijaba para toda la sesión el micro **sin cancelación de eco**; además ampliaba la ventana de AUD-MIC-301).

**Qué se cambió (`src/lib/recorder.ts`):**
- **Segunda comprobación** (`looksMuted`): tras 2 s (5 s en modo auriculares) de ceros exactos, solo se da el micro por mudo si la pista está silenciada por el sistema (`track.muted`) o terminada, si hay un micrófono Bluetooth en `enumerateDevices` o si no se pueden leer los nombres de los micros. Sin ninguno de esos motivos es silencio de verdad: se queda el micro por defecto **con procesado** y se marca como bueno (`defaultOk`), así las siguientes aperturas no vuelven a medir.
- **1 solo reintento**: el primer micro del teléfono (no Bluetooth) **con procesado** (conserva la cancelación de eco). Si no se identifica ninguno, el micro por defecto sin procesado, **solo para esa apertura**. No hay más intentos: de hasta 4 aperturas y ~12 s se pasa a como mucho 2 aperturas y ~4–5 s (7 s en modo auriculares).
- **Nada sin cancelación de eco para la sesión**: `chosen` solo guarda el micro del teléfono con procesado y solo si dio señal. El reintento sin procesado ni se mide ni se recuerda.
- La medición y el reintento se cortan en cuanto se cierra la grabadora (cancelación de T1), así que el silencio ya no amplía la ventana de AUD-MIC-301.

**Cómo se probó (PC):** `npm test` → cinco casos MIC-800: silencio sin Bluetooth (1 apertura, con procesado, la siguiente no mide); Bluetooth mudo (2 aperturas, la 2.ª al micro del teléfono con procesado, el stream del reintento lo cierra `releaseAllMics()`); reintento con señal recordado; reintento sin procesado no recordado (la siguiente apertura vuelve a pedir procesado); pista `muted` sin Bluetooth = mudo; modo auriculares (1 solo reintento). tsc OK, lint 0 errores.

**Para el teléfono:** repetir M9/m303 y la entrada en clase **en una habitación en silencio**: «Dictar por voz» debe empezar en ~2 s (no 12), con una sola apertura en `audio_policy` y `AUDIO_INPUT_FLAG` de micro con procesado (no `NONE`), y el modo `IN_COMMUNICATION` mantenido. Con los soundcore Liberty 4 Pro (modo auto y «Todo por los auriculares»): si el BT llega mudo, como mucho 2 aperturas y la grabación suena por el micro del teléfono. Caso límite a observar: en el POCO, ¿lista el WebView algún micro con «bt» en el nombre sin auriculares conectados? (si así fuera, el silencio volvería a provocar el reintento, pero solo uno y con procesado).

---

## NC-v5.8.1-05 (T4) · Red de seguridad nativa del micrófono

**Hallazgo:** AUD-MIC-308 (el cierre del micro en segundo plano dependía solo del JavaScript; con el hilo JS ocupado, B8 midió captura en segundo plano hasta que el JS volvió a ejecutarse; `WebView.onPause()` no la corta).

**Investigación (Capacitor 8, `node_modules/@capacitor/android/.../BridgeWebChromeClient.java`):** Capacitor concede el audio en `onPermissionRequest`: si el recurso es `AUDIO_CAPTURE` pide `RECORD_AUDIO`/`MODIFY_AUDIO_SETTINGS` con un `ActivityResultLauncher` y llama a `request.grant()`. `PermissionRequest` **no tiene revocación**: una vez concedido no hay API pública (ni en `WebView` ni en `androidx.webkit`) para cortar desde Java una captura ya abierta; `deny()` sobre una petición resuelta lanza `IllegalStateException`. Las alternativas que sí la cortarían son destructivas (recargar la página o matar el proceso de renderizado: se pierde la clase en curso) y se descartaron.

**Qué se cambió:**
- `android/.../HablaChromeClient.java` (nuevo): hereda de `BridgeWebChromeClient` (conserva permisos, selector de archivos, etc.) y, con la app en segundo plano (entre `onStop` y `onStart`), **deniega** cualquier petición nueva de micrófono sin depender del JS. Cubre el patrón de AUD-MIC-301: código JS congelado por `pauseTimers()` que se reanuda y vuelve a abrir el micro. No deniega peticiones pendientes (si el diálogo de permiso de Android sigue abierto, Capacitor llamaría después a `grant()` sobre una petición ya resuelta y la app fallaría).
- `MainActivity.java`: instala ese cliente en `onCreate` (antes de `onStart`, porque registra un `ActivityResultLauncher`); en `onStop` marca segundo plano y llama **directamente** a `window.__hablaBackground()` con `evaluateJavascript` antes de `WebView.onPause()` y `pauseTimers()`; en `onStart` lo desmarca. Se corrigió el comentario que afirmaba que «el JavaScript ya recibió el aviso de pausa».
- `src/lib/lifecycle.ts`: expone `window.__hablaBackground = goBackground` (idempotente: si ya llegó `appStateChange`, no repite). Ver también NC-01: `pause` (onPause) ya no cuenta como segundo plano.

**Límite honesto:** si el hilo JS está bloqueado, una captura **ya abierta** sigue hasta que el JS se libera (Android la silencia a los ~5 s por su cuenta). Lo que hacía que durase indefinidamente (streams huérfanos fuera de `recorders`, AUD-MIC-301/302) se elimina en T1; la parte nativa impide reaperturas en segundo plano.

**Cómo se probó (PC):** `gradlew.bat :app:compileDebugJavaWithJavac --offline -q` → OK (salida 0; `HablaChromeClient.class` generado). No se usó `assembleDebug` porque su tarea de copia sobrescribe `apk/Habla-v5.8.apk` (el APK entregado) con un build sin aprobar. tsc OK, lint 0 errores, `npm test` 17/17.

**Para el teléfono (solo se puede verificar allí):**
1. Arranque y primera clase normales (el cliente nuevo no rompe el diálogo de permiso: instalación limpia o permiso revocado → conceder → el primer toque graba).
2. m308 (hilo JS ocupado 8 s + Inicio): anotar cuánto sigue `appops running`; esperado igual o mejor que en v5.8 (≤ ~5–6 s) y **sin reapertura** al volver.
3. M4b/m301 (Inicio durante la apertura): en logcat `HablaMic` puede aparecer «Petición de micrófono con la app en segundo plano: denegada» si el JS intenta abrir oculto; al volver, el micro no se abre solo.
4. M4/N2: Inicio con la clase abierta y con el dedo en el botón → `Inputs(0)` en ≤2 s y la clase guardada (ahora el guardado llega por `appStateChange`/`__hablaBackground` en onStop, ya no por `pause`).
5. Exportar copia (hoja de compartir de Android) y huella: la app no debe perder la clase ni el micro al volver.

---

## NC-v5.8.1-06 (T6) · Pruebas automatizadas del Recorder

**Hallazgo:** AUD-ARQ-113 (0 pruebas; el arreglo de AUD-ARQ-100 no se podía comprobar aislado).

**Qué se cambió:**
- `package.json`: script `"test": "node --test \"tests/**/*.test.mjs\""` (runner de Node 24, sin Vitest/Jest ni dependencias nuevas).
- `tests/helpers/vite.mjs`: un servidor Vite en `middlewareMode` (`configFile: false`, sin plugins) que carga `src/` con `ssrLoadModule`; `loadFresh()` invalida el grafo para que cada prueba empiece con el estado del módulo limpio (`chosen`, `defaultOk`, `recorders`).
- `tests/helpers/mic-mocks.mjs`: `navigator.mediaDevices` (`getUserMedia` que se puede retener para cortar a mitad de la apertura, `enumerateDevices`), `MediaStream`/pistas con `readyState` y `muted`, `MediaRecorder`, `AudioContext`/analizador (señal o ceros por apertura) y un reloj rápido. Cuenta aperturas, pistas vivas, grabadores activos y mediciones en curso.
- `tests/recorder.test.mjs`: 17 pruebas — doble `begin()` = 1 stream; `begin()` durante la `open()` inicial; `close()` durante `getUserMedia`, durante la medición y durante el reintento = 0 pistas vivas; `releaseAllMics()` cancela aperturas; reapertura normal tras cancelar; segundo `start()`/`begin()` ignorado; 5 casos de MIC-800 + modo auriculares; permiso denegado; micro ocupado; trozos por grabación (MIC-309).

**Cómo se probó:** `npm test` → 17/17 en ~4 s. Prueba de mutación hecha: quitando la promesa compartida de `open()` (`if (this.opening) return this.opening`) falla «begin() mientras la apertura inicial de la clase (open) sigue en curso…» (16/17); restaurado → 17/17.

**Ajuste posterior (a petición del orquestador):** sin servidor WebSocket de HMR (`ws: false` en `tests/helpers/vite.mjs`) para ejecutar archivos de test en paralelo; antes, con un segundo archivo de tests, Vite avisaba «WebSocket server error: Port 24678 is already in use».

**Para el teléfono:** nada (las pruebas son de PC). Siguiente paso recomendado por B1: `levels`, `bank`, `placement`, `fluency`, `backup` con el mismo runner.

---

## NC-v5.8.1-07 (T7) · Entrega (sin APK ni commit)

**Qué se cambió:**
- `version.json`: `5.8.1`, build `34`, fecha `2026-10-06` (el APK saldrá como `Habla-v5.8.1.apk`; `notices.ts` compara por igualdad de texto, así que el aviso de Novedades salta solo).
- `src/lib/changelog.ts`: entrada `5.8.1` en `RELEASES` con el título «Actualización de parches de seguridad y corrección de la v5.8» y 6 correcciones en tono cercano (solo `fixed`; `NoticeGate` y `AboutScreen` ya aceptan entradas sin `added`/`improved`).
- `docs/problemas-conocidos.md`: los P0 del micro pasan a «Corregido en 5.8.1 (pendiente de prueba en el teléfono)»; nuevo resto de AUD-MIC-308; partes frágiles actualizadas (`recorder.ts`, aviso `pause`, `assembleDebug` pisa el APK); deuda de tests actualizada.
- `docs/estado-actual.md`: aviso de la 5.8.1 en preparación y pendientes actualizados.
- `CLAUDE.md`: versión, fila de Tests, comandos `npm test` y compilación de Java sin empaquetar, sección «Pruebas» y «Siguiente trabajo previsto».

**Cómo se probó:** `npx tsc -b` OK · `npm run lint` 0 errores · `npm test` 17/17 · `node scripts/validate-bank.mjs` OK · `npm run build` OK (solo el aviso conocido del chunk de 1,3 MB). **No se compiló el APK entregable ni se hizo commit** (lo aprueba el dueño).

**Para el teléfono:** tras instalar con `adb install -r`, la app debe mostrar el aviso de Novedades de la 5.8.1 una vez y «Acerca de» → «v5.8.1 · build 34 · instalada».

---

## Correcciones tras la revisión en PC (NC del revisor)

| NC | Qué se cambió | Archivos | Pruebas |
|---|---|---|---|
| REV-T1-1 (BAJA) | En `fallback()`, si el `getUserMedia` del micro del teléfono (`deviceId: exact`) falla, se prueba una vez el micro por defecto sin procesado (como en la v5.8), sin recordarlo para la sesión. Sigue siendo un solo reintento: como mucho una alternativa llega a abrirse, y su stream queda en `recorders`. Si también falla, `MicError` en español y nada abierto. | `src/lib/recorder.ts` | 2 tests nuevos en `tests/recorder.test.mjs` |
| REV-T2-1 (BAJA) | Las reglas de los dedos pasan a `src/components/talkGesture.ts` (puro, probable en Node): mientras haya un dedo activo, cualquier otro `pointerId` se ignora (también durante la apertura del micro, cuando la fase aún no es «grabando»). Para que el botón nunca quede bloqueado: el mismo dedo puede volver a pulsar, `lostpointercapture` suelta el gesto y al pasar a ocupado (procesar/pensar) se suelta. | `src/components/TalkButton.tsx`, `src/components/talkGesture.ts` (nuevo) | `tests/talkGesture.test.mjs` (4) |

`npm test` 26/26 (incluye 3 de U2 de la 5.8.2), tsc OK, lint 0 errores.

**Para el teléfono:** R8 del revisor (segundo dedo durante la apertura: el dedo 1 sigue mandando y envía al soltar) y, si se puede forzar, micro del teléfono que no abre con auriculares BT conectados.

## Resumen para el revisor móvil (solo verificable en el POCO)

1. M9c doble toque en el dictado; doble toque en el test y en el Repaso → un solo stream, `Inputs(0)` al cerrar.
2. M4b Inicio a ~0,45 s de entrar en clase → sin reapertura al volver; `Inputs(0)` tras el 2.º Inicio.
3. M9b/m303 «Atrás» en el Debate (antes y después de «Te escucho…») → sin punto verde, sin petición de dictado.
4. X1 segundo dedo → un solo `MediaRecorder`, ninguno `recording` tras soltar.
5. MIC-800 en habitación en silencio → apertura en ~2 s, 1 sola apertura, micro con procesado.
6. m308 hilo JS ocupado + Inicio → igual o mejor que v5.8, sin reapertura; logcat `HablaMic`.
7. Primer permiso de micrófono (instalación limpia o permiso revocado) → el primer toque graba.
8. M4/N2 y guardado de la clase al ir a segundo plano (ahora por onStop, no por onPause); hoja de compartir y huella sin efectos raros.
9. Con auriculares BT (si el dueño los conecta): modo auto y «Todo por los auriculares», como mucho 2 aperturas.
