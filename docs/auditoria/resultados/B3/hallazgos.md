# B3 · Micrófono y audio — Hallazgos (fase 1 estática + fase 2 dinámica)

Fecha: 2026-10-05 · Autor: B3 · Commit auditado `6874443` (v5.8 build 33). Fase 2: navegador (Vite dev 360×780, micro falso y red falsa) y POCO 23122PCD1G Android 16 con el APK v5.8 build 33 instalado (micro real, red falsa por CDP, muestreo independiente de `audio_policy`/`appops` cada ~0,9 s). **0 llamadas reales a Gemini/Azure.**
Estados actualizados tras la fase 2. Evidencia en `evidencia/` y `mic-timeline-*.txt`; arneses en `arnes/` (`instr.js`, `cdp.mjs`, `sampler.sh`, `m4b.sh`, `m1.sh`). Mapa completo: `mapa-microfono.md`.

Archivos revisados: `src/lib/recorder.ts`, `lifecycle.ts`, `audioRoute.ts`, `speech.ts`, `wav.ts`, `tts.ts`, `dictation.ts`, `testDraft.ts`, `gemini.ts` (`withRetry`), `src/components/TalkButton.tsx`, `TopicAskPage.tsx`, `AudioPicker.tsx`, `src/screens/Conversation.tsx`, `Calibration.tsx`, `ReviewScreen.tsx`, `Home.tsx` (montaje del dictado), `android/.../MainActivity.java`, `AudioRoutePlugin.java`, `AndroidManifest.xml`.

## Resumen

| ID | Severidad | Título |
|---|---|---|
| AUD-MIC-301 | **CRÍTICA** · CONFIRMADO (teléfono) | `open()` no se puede cancelar: un `close()`/`releaseAllMics()` a mitad de la apertura no impide que reabra el micro, y el stream reabierto queda fuera de `recorders` (segundo plano ya no lo cierra) |
| AUD-MIC-302 | ALTA · CONFIRMADO (teléfono) | Doble toque / dos `begin()` simultáneos: el primer stream queda huérfano, inalcanzable por `close()` y por `releaseAllMics()` |
| AUD-MIC-303 | ALTA · CONFIRMADO (teléfono) | Dictado del Debate: «atrás» del paso 2 al 1 deja grabando sin control visible; ese audio se envía luego a Gemini |
| AUD-MIC-304 | MEDIA · CONFIRMADO (teléfono) | Segundo dedo durante una grabación en clase: nuevo `MediaRecorder` y el anterior sigue grabando huérfano toda la clase |
| AUD-MIC-305 | ALTA (diseño) · CONFIRMADO (teléfono) | Micrófono abierto (y capturando para Android, en modo comunicación) durante toda la clase y en repaso tras la 1.ª grabación, sin cierre por inactividad |
| AUD-MIC-306 | BAJA | Hipótesis de B0 (`open()` no cierra en el `catch`): parcialmente DESCARTADA; solo queda abierto si falla `enumerateDevices` |
| AUD-MIC-307 | MEDIA · HIPÓTESIS (requiere auriculares) | Modo «auriculares»: al volver a primer plano se reactiva el modo llamada (SCO/comunicación) en cualquier pantalla, sin clase ni micro |
| AUD-MIC-308 | MEDIA · HIPÓTESIS (parcial) | El cierre del micro en segundo plano depende solo de JavaScript; lo nativo suelta la ruta pero no la captura del WebView |
| AUD-MIC-309 | BAJA | Datos tardíos de una grabación anterior se mezclan en la siguiente (`this.chunks` compartido) |
| AUD-MIC-310 | INFO · CONFIRMADO en parte (teléfono) | El mismo audio confirmado se reenvía automáticamente hasta 5 veces (y a otro modelo); Azure se llama en paralelo aunque Gemini no oiga voz |
| AUD-MIC-311 | BAJA | Audios del test guardados en IndexedDB `habla-draft` sin caducidad hasta que la evaluación tiene éxito (y `allowBackup=true`) |
| AUD-MIC-312 | BAJA | Grabaciones sin límite de duración (salvo con fonética activa) |
| AUD-MIC-313 | INFO · CONFIRMADO en parte (navegador) | Permisos: cuándo se piden `RECORD_AUDIO` / `BLUETOOTH_CONNECT` / `MODIFY_AUDIO_SETTINGS`; mensajes de error |

---

### AUD-MIC-301 · `open()` no es cancelable: un cierre a mitad de la apertura reabre el micro y lo deja fuera de `recorders`
- **Severidad:** CRÍTICA
- **Severidad:** CRÍTICA (propuesta; baja a ALTA si la prueba dinámica muestra que nunca llega a grabar en segundo plano)
- **Estado:** CONFIRMADO (reproducido en el teléfono real; depende del momento: 1 de 2 intentos con Inicio a 0,45 s, no con 0,9 s)
- **Probado en:** navegador 360×780 (dev, micro falso) · POCO Android 16 (APK v5.8 build 33)
- **Dónde:** `src/lib/recorder.ts:118-154` (`open`), `:157-174` (`fallback`), `:76-97` (`hasSignal`), `:243-253` (`close`), `:71-73` (`releaseAllMics`); `src/screens/Conversation.tsx:311-315`; `android/.../MainActivity.java:27-34` (`pauseTimers`)
- **Qué pasa:** `open()` tiene varios `await` (getUserMedia `:125`, `afterOpen` `:130`, `hasSignal` 2–5 s `:134/:141`, `fallback` `:137/:142`). Si durante ellos se llama a `close()` (p. ej. `releaseAllMics()` al ir a segundo plano), `close()` para las pistas y hace `recorders.delete(this)`, pero `open()` sigue: (a) si estaba en `getUserMedia`, al resolver asigna `this.stream` y vuelve a hacer `recorders.add` → micro abierto tras el cierre; (b) si estaba en `hasSignal`, la pista ya parada da ceros → `hasSignal` devuelve `false` → `fallback()` abre **otro** `getUserMedia` (`:164`) con los micros del teléfono, asigna `this.stream` y **no** vuelve a añadirse a `recorders`. Ese stream ya no lo cierra ningún `releaseAllMics()` posterior, solo un `close()` explícito de la pantalla. Además guarda en `chosen` un micro equivocado para toda la sesión.
- **Por qué importa:** micro abierto (indicador verde) sin que el usuario lo pida y, en el caso (b), inmune al cierre de segundo plano de NC-14: si el usuario pulsa Inicio después, el micro queda abierto toda la noche (batería, privacidad). Si además pulsa grabar y luego sale, el `MediaRecorder` sigue grabando en segundo plano.
- **Cómo reproducir (propuesto):**
  1. Primera clase tras abrir la app (o tras conectar/desconectar auriculares, para que `defaultOk=false`).
  2. Entrar en la clase y pulsar Inicio en menos de ~2 s (mientras corre `hasSignal`).
  3. En Android, `pauseTimers()` congela el bucle de `hasSignal`; al volver a la app el bucle termina con `false` y `fallback()` reabre el micro sin pulsación. En navegador (sin `pauseTimers`) ocurre estando oculto.
  4. Volver a pulsar Inicio: comprobar con `dumpsys audio`/`appops` si el micro sigue abierto en segundo plano.
- **Esperado:** cerrar durante la apertura cancela la apertura; ningún stream vivo fuera de `recorders`.
- **Obtenido (por código):** se abre un stream nuevo tras el cierre; con `fallback()` no se registra en `recorders`.
- **Evidencia:** `evidencia/tel-M4b-301.txt`, `mic-timeline-M4b-3.txt` (y M4b-2 sin reproducción), `evidencia/nav-M4b-301-apertura-y-segundo-plano.txt`. En el teléfono: Inicio durante la apertura → al volver, `fallback()` abrió un 2.º `getUserMedia` sin pulsación (20:45:33, `appops running`); tras un 2.º Inicio, Habla siguió con la entrada de audio asignada y **capturando ~5 s con la app en segundo plano** (20:45:41–46 `habla_top=0 … (running)`), después Android la silenció pero el stream siguió asignado y volvió a capturar al volver (20:45:53) sin pulsar nada. En el navegador además: con ese stream huérfano, una grabación iniciada y la app oculta siguió grabando 16 s y se envió (red falsa).
- **Causa raíz:** `open()` no tiene token de generación/cancelación y `fallback()` asigna `this.stream` sin `recorders.add(this)`. `Conversation.tsx:315` solo comprueba `gone()` (desmontaje), no el segundo plano.
- **Propuesta de corrección:** contador de generación en `Recorder` que `close()` incrementa; tras cada `await` de `open()`/`fallback()`, si cambió, parar el stream recién obtenido y salir. `recorders.add(this)` cada vez que se asigna `this.stream`. No abrir mientras `document.hidden`.
- **Relacionado con:** NC-14, AUD-MIC-302, AUD-MIC-308.

### AUD-MIC-302 · Dos `begin()`/`open()` simultáneos dejan un stream huérfano inalcanzable

- **Severidad:** ALTA
- **Estado:** CONFIRMADO (dictado de Tema libre, teléfono y navegador). Test de nivel y Repaso: mismo patrón de código, no reproducido (el test es obligatorio y no se puede salir en el teléfono del dueño)
- **Probado en:** navegador 360×780 · POCO Android 16 (APK v5.8 build 33)
- **Dónde:** `src/lib/recorder.ts:118-129` (`isOpen` es `false` mientras `getUserMedia` no resuelve; la segunda llamada sobrescribe `this.stream`), `:186-197` (`start` sobrescribe `this.recorder`); `src/screens/Calibration.tsx:490-504` (`recState` pasa a `'recording'` solo después del `await begin()`; el botón `:964-966` no se deshabilita); `src/screens/ReviewScreen.tsx:112-124` (igual con `step`; botón `:250-252`); `src/components/TopicAskPage.tsx:45-56` (igual con `mic`; botón `:137-139`); `src/components/TalkButton.tsx:81-97` (sin guarda de `gesture.active` para un segundo puntero)
- **Qué pasa:** el estado de la UI que impide un segundo toque se actualiza después del `await`. Un segundo toque durante la apertura (que en la primera apertura dura ≥2 s por `hasSignal`) lanza otro `begin()`: ambas llamadas pasan `isOpen=false`, cada una hace `getUserMedia` y la última asigna `this.stream`; el primer stream ya no lo referencia nadie (`close()` solo para `this.stream`; `recorders` es un `Set` con la misma instancia). También se crean dos `MediaRecorder` y el primero queda grabando. En Repaso, «No lo sé» sigue visible durante la apertura y, al resolver `begin()`, `setStep('recording')` pisa el resultado.
- **Por qué importa:** micro abierto hasta que muera el proceso, también en segundo plano (no lo cierra NC-14). Un toque impaciente es muy probable precisamente porque la primera apertura tarda.
- **Cómo reproducir (propuesto):** test de nivel, tarea de habla 1: doble toque rápido en el micro. Contar aperturas sin cierre en `__mic` tras salir del test; en teléfono, `dumpsys audio` tras pulsar Inicio.
- **Esperado:** un único stream; el segundo toque se ignora o espera.
- **Obtenido (por código):** dos `getUserMedia`, uno sin cerrar nunca.
- **Evidencia:** `evidencia/tel-M9b-M9c.txt` (M9c), `mic-timeline-M9c.txt`, `evidencia/tel-M9c-inicio-micro-huerfano.png`, `evidencia/tel-M9c-vuelta-huerfano-capturando.png`, `evidencia/nav-M9c-doble-toque-dictado.txt`. Doble toque a 150 ms → 2 `getUserMedia` y 2 `MediaRecorder`; tras «terminar» y cerrar la hoja, el n.º 1 siguió abierto y **grabando** en el Inicio de la app; con Android en Inicio la entrada siguió asignada (silenciada); al volver, `appops running` otra vez sin tocar nada. Solo `force-stop` lo liberó.
- **Causa raíz:** `open()` no es idempotente frente a llamadas concurrentes (no memoriza la promesa en curso) y las pantallas no bloquean el botón durante la apertura.
- **Propuesta de corrección:** guardar la promesa en curso (`this.opening ??= ...`) y devolverla a llamadas concurrentes; estado `'opening'` en la UI que deshabilite el botón.
- **Relacionado con:** AUD-MIC-301, AUD-MIC-304.

### AUD-MIC-303 · Dictado del Debate: volver al paso 1 deja grabando sin control visible y ese audio se envía a Gemini

- **Severidad:** ALTA
- **Estado:** CONFIRMADO
- **Probado en:** navegador 360×780 · POCO Android 16 (APK v5.8 build 33)
- **Dónde:** `src/components/TopicAskPage.tsx:120` (`onBack` del paso 2 = `setStep(0)`, el componente sigue montado), `:80-108` (paso 1 sin botón de micro ni indicador), `:41` (solo cierra al desmontar), `:58-71` (al tocar «terminar» se envía todo lo grabado a `dictate`)
- **Qué pasa:** en Debate → «Lo propongo yo» → tocar «Dictar por voz» → flecha atrás de la página: se vuelve a «¿Quién elige el tema?» con `mic === 'recording'` y el `MediaRecorder` grabando, sin indicación en pantalla salvo el indicador del sistema. Si el usuario vuelve al paso 2 y toca el botón (que dice «Te escucho… toca para terminar»), se transcribe con Gemini todo lo grabado mientras estaba en el otro paso. Si elige «Que elija el profe», se desmonta y se cierra (sin envío). El «atrás» de Android cierra la hoja entera (`Home.tsx:81`) y sí cierra.
- **Por qué importa:** captura de audio cuando el usuario cree que ha salido del dictado; ese audio (conversación ambiente) puede acabar en Gemini.
- **Cómo reproducir (propuesto):** pasos de arriba; esperar 20 s en el paso 1 hablando; volver al paso 2 y tocar terminar; observar `__rec` y la petición de red (mock).
- **Esperado:** al salir del paso 2 se descarta y se cierra la grabación.
- **Obtenido:** la grabación continúa. Teléfono: 45,4 s grabados (≈42 s en el paso 1, con el punto verde y `appops running`) y, al tocar «terminar», petición a Gemini con 158 KB de audio (interceptada por la red falsa). Navegador: 17 s, 70 KB.
- **Evidencia:** `evidencia/tel-M9b-M9c.txt`, `mic-timeline-M9b.txt`, `evidencia/tel-M9b-paso1-grabando.png`, `evidencia/nav-M9b-dictado-debate.txt`.
- **Causa raíz:** cerrar el micro está ligado al desmontaje, no al cambio de paso interno.
- **Propuesta de corrección:** en `onBack` del paso 2 (y en cualquier cambio de `step`) llamar a `recorder.close()` y poner `mic='idle'`; o efecto que cierre cuando `step !== 1`.
- **Relacionado con:** NC-05.

### AUD-MIC-304 · Segundo dedo durante una grabación en clase: el `MediaRecorder` anterior queda grabando huérfano

- **Severidad:** MEDIA
- **Estado:** CONFIRMADO
- **Probado en:** navegador 360×780 · POCO Android 16 (APK v5.8 build 33)
- **Dónde:** `src/components/TalkButton.tsx:81-97` (en fase `recording` no bloqueada, `busy` es `false` y no se comprueba `gesture.current.active`), `src/screens/Conversation.tsx:426-443`, `src/lib/recorder.ts:186-197`
- **Qué pasa:** mientras mantienes pulsado, un segundo puntero sobre el botón llama otra vez a `onPress` → `begin()` → `open()` sale al instante (ya abierto) → `start()` crea un `MediaRecorder` nuevo y sobrescribe `this.recorder` sin parar el anterior. El anterior sigue en `recording` sobre el stream que se mantiene abierto toda la clase; `close()` ya no lo alcanza (solo para `this.recorder`). Deja de grabar solo cuando se paran las pistas (salir o segundo plano).
- **Por qué importa:** grabación activa (no enviada) durante el resto de la clase; memoria creciente; el primer tramo de la respuesta se pierde.
- **Cómo reproducir (propuesto):** en navegador con puntero táctil emulado o en el teléfono con dos dedos; contar `__rec` con `start` sin `stop`.
- **Esperado:** ignorar el segundo puntero.
- **Obtenido:** teléfono: `pointerdown` id 1 y id 2 (por CDP) → `MediaRecorder` #1 y #2; al soltar solo se para y envía el #2; el #1 sigue `recording` 14 s después con la clase en reposo. Navegador: igual, hasta salir de la clase.
- **Evidencia:** `evidencia/tel-M1-M2-M4-M11-M12-X1-Repaso.txt` (X1), `mic-timeline-M2-X1.txt`, `evidencia/nav-X1-304-segundo-dedo.txt`.
- **Propuesta de corrección:** en `start()`, si `this.recorder` está activo, pararlo o lanzar; en `TalkButton`, ignorar `pointerdown` si `gesture.current.active`.
- **Relacionado con:** AUD-MIC-302.

### AUD-MIC-305 · Micrófono abierto sin grabar durante toda la clase, y en test/repaso tras la primera grabación (decisión de diseño)

- **Severidad:** ALTA (decisión de diseño; MEDIA si se decide aceptarlo con aviso explícito)
- **Estado:** CONFIRMADO (clase y repaso en el teléfono; test de nivel no probado)
- **Probado en:** POCO Android 16 (APK v5.8 build 33)
- **Dónde:** `src/screens/Conversation.tsx:305-315` (abre al montar, antes del tema y del saludo, mientras se ve la pantalla de preparación), `:373-379`, `:406-408`, `:545-550` (cierres); `src/screens/Calibration.tsx:495` (abre en la 1.ª grabación) → `:547` (`finish`) o desmontaje `:316`; `src/screens/ReviewScreen.tsx:117` → solo al desmontar `:63`
- **Qué pasa:** en clase el stream se abre al entrar y sigue abierto mientras el profe piensa, habla (TTS), en errores de preparación (`setPrep('error')` no cierra) y en pausas largas, hasta salir, terminar o pasar a segundo plano. En el test queda abierto entre tareas y durante la evaluación previa; en Repaso, entre tarjetas hasta salir. No hay cierre por inactividad.
- **Por qué importa:** indicador verde de Android permanente en clase (el usuario puede pensar que se le escucha), consumo de batería (NC-14 en primer plano), y en modo auriculares mantiene el modo llamada/SCO (peor calidad de audio del profe).
- **Obtenido (teléfono):** clase en reposo 3 min: entrada de Habla en `audio_policy`, `appops RECORD_AUDIO (running)` y **`MODE_IN_COMMUNICATION` todo el rato** (el WebView pone el teléfono en modo comunicación por el procesado de voz, aun sin auriculares), con punto verde. Repaso: tras «Parar», micro abierto y capturando 49 s en la tarjeta hasta salir. Para Android esto no es «abierto sin grabar»: la app está capturando (aunque el JavaScript no guarde nada).
- **Evidencia:** `mic-timeline-M1-M4.txt`, `evidencia/tel-M1-clase-90s.png`, `mic-timeline-Repaso.txt`, `evidencia/tel-M1-M2-M4-M11-M12-X1-Repaso.txt`.
- **Esperado / alternativas:** abrir en `pointerdown` con un pequeño pre-búfer (o aceptar ~150–300 ms de latencia con `defaultOk` ya medido), o cerrar tras N s (p. ej. 30–60 s) sin grabar y reabrir al pulsar; cerrar al mostrar el error de preparación. En test/repaso, cerrar tras cada grabación como ya hace el dictado (`TopicAskPage.tsx:61`).
- **Relacionado con:** NC-14, AUD-MIC-307.

### AUD-MIC-306 · Hipótesis de B0: `open()` no llama a `close()` en el `catch`

- **Severidad:** BAJA
- **Estado:** DESCARTADO en lo principal; residuo como HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/lib/recorder.ts:144-153`, `:157-164`
- **Análisis:** si `getUserMedia` de `fallback()` (`:164`) lanza, las pistas del stream anterior ya se pararon en `:163`, así que no queda micro abierto (solo un objeto muerto en `recorders`, inofensivo). `afterOpen` y `hasSignal` no lanzan (`.catch` y `try/catch`). Los llamadores cubren el resto: `begin()` hace `close()` en su `catch` (`:206`); el arranque de la clase no reabre. **Residuo:** si lanza `phoneMics()`/`enumerateDevices()` (`:159`, antes de `:163`), el stream inicial queda vivo; en clase ese stream se usaría igualmente (el `isOpen` es cierto), en `begin()` se cierra. Riesgo bajo.
- **Propuesta de corrección:** `this.close()` en el `catch` de `open()` antes de relanzar.
- **Relacionado con:** B0 `linea-base.md` §6.

### AUD-MIC-307 · Modo auriculares: al volver a primer plano se reactiva el modo llamada en cualquier pantalla

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS (no probado: requiere que el dueño conecte los soundcore Liberty 4 Pro; la preferencia guardada para ellos es «headset»)
- **Probado en:** estático
- **Dónde:** `src/components/AudioPicker.tsx:75-80` (al volver: `audioState().then(check)`), `:58-59` y `:32-46` (`apply('headset')` → `applyAudioMode('headset')`), `src/lib/audioRoute.ts:67-72`, `android/.../AudioRoutePlugin.java:209-224` (`MODE_IN_COMMUNICATION` + `setCommunicationDevice`)
- **Qué pasa:** con auriculares conectados y preferencia «Todo por los auriculares», cada vuelta a primer plano (y el arranque de la app) pone Android en modo comunicación con el auricular como dispositivo de comunicación, aunque el usuario esté en Inicio o Ajustes y no haya micro abierto. Se mantiene hasta ir a segundo plano. (Además `onMicOpened` lo vuelve a aplicar en cada apertura, que es lo previsto).
- **Por qué importa:** perfil de llamada/SCO activo sin necesidad: audio de baja calidad, batería, y puede interferir con otras apps de audio en pantalla dividida.
- **Propuesta de corrección:** aplicar la ruta `headset` solo al abrir el micro (ya existe `onMicOpened`) y soltarla al cerrar el último micro.
- **Relacionado con:** NC-14, AUD-MIC-305, escenario M7.

### AUD-MIC-308 · El cierre en segundo plano depende solo de JavaScript

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS (parcial: en las pruebas normales M4/M11 el cierre ocurrió en ≈1–2 s; el fallo depende de AUD-MIC-301/302, donde sí se vio captura en segundo plano)
- **Probado en:** POCO Android 16 (APK v5.8 build 33), indirecto
- **Dónde:** `src/lib/lifecycle.ts:48-55`; `android/.../MainActivity.java:20-34` (el comentario afirma que «el JavaScript ya recibió el aviso de pausa»); `AudioRoutePlugin.java:69-86`
- **Qué pasa:** la parte nativa suelta modo llamada/SCO en `onStop`, pero nada nativo detiene la captura de `getUserMedia` del WebView. `pause`/`appStateChange` se entregan al WebView de forma asíncrona y `onStop` hace `pauseTimers()` poco después; si el evento no llega a ejecutarse (WebView ocupado, hilo JS bloqueado en `toBase64`/decodificación, `visibilitychange` no disparado), el micro sigue abierto. Combinado con AUD-MIC-301, un stream fuera de `recorders` nunca se cierra.
- **Por qué importa:** NC-14 (batería) y privacidad, sin red de seguridad nativa.
- **Propuesta de corrección:** red de seguridad nativa (p. ej. `WebView.onPause()` ya se llama; verificar si Chromium para la captura con él; si no, un `evaluateJavascript("releaseAllMics()")` explícito en `onPause`), y verificación en M4/M11.
- **Relacionado con:** NC-14, AUD-MIC-301.

### AUD-MIC-309 · Datos tardíos de la grabación anterior se mezclan en la siguiente

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/lib/recorder.ts:189-194` (`ondataavailable` empuja a `this.chunks`, no a un array propio del grabador), `:225-240` (`stop` se resuelve a los 2 s aunque no haya llegado `onstop`), `:243-245` (`close` para el grabador sin esperar)
- **Qué pasa:** si `dataavailable` del grabador anterior llega después de que `start()` reinicie `this.chunks`, ese trozo se añade al principio de la grabación nueva (WebM con dos cabeceras → audio corrupto o con fragmento ajeno, que se enviaría a Gemini/Azure).
- **Propuesta de corrección:** capturar un array local en `start()` (`const chunks = []; this.chunks = chunks; rec.ondataavailable = e => chunks.push(...)`).

### AUD-MIC-310 · Reenvíos automáticos del mismo audio (Gemini) y doble envío a Azure

- **Severidad:** INFO
- **Estado:** CONFIRMADO en parte: en el teléfono (red falsa) Azure recibió el WAV (~98 KB) en paralelo a Gemini aunque la respuesta de Gemini fuera «no te he entendido». Los reintentos (hasta 5) no se midieron (X3 pendiente).
- **Probado en:** POCO Android 16 (APK v5.8 build 33), red falsa · `evidencia/tel-M1-M2-M4-M11-M12-X1-Repaso.txt` (M2)
- **Dónde:** `src/lib/gemini.ts:284-316` (`retryLoop`: hasta 3 intentos con el modelo principal + 2 con el de respaldo), usado por `teacherTurn`, `dictate` (`dictation.ts:14`), `evaluateDrill`, `assessSpeakingTask`; `src/screens/Conversation.tsx:171-182, 214-217` (Azure en paralelo, antes de saber si Gemini oyó voz), `:500-503` («Reenviar mi audio» vuelve a llamar a `startPronunciation`)
- **Qué pasa:** el audio que el usuario confirmó al soltar se puede enviar hasta 5 veces sin aviso, a dos modelos de Gemini distintos; Azure recibe el audio aunque Gemini luego diga «no te he entendido», y otra vez en cada «Reenviar». No se encontró ningún envío de audio no confirmado (todo envío sigue a un `stop` iniciado por el usuario o al auto-envío de 60 s con fonética).
- **Por qué importa:** coste/cuota (F0 de Azure: 5 h/mes) y transparencia; no es captura no consentida.

### AUD-MIC-311 · Audios del test guardados sin caducidad en IndexedDB

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/lib/testDraft.ts:22-50` (BD `habla-draft`, clave `calibration`), `src/screens/Calibration.tsx:546-565` (guarda `speech` con el `base64` de hasta 3 respuestas), `:571` (`clearDraft` solo si la evaluación tiene éxito)
- **Qué pasa:** el audio de las respuestas habladas del test queda en IndexedDB desde «Ver mi nivel» hasta que una evaluación tiene éxito; sin caducidad. No va en la exportación de la app (`backup.ts` no lo toca), pero con `allowBackup=true` (B0) podría entrar en la copia automática de Android. No se encontró audio persistido en ningún otro sitio: `savedClass` guarda texto, `pending.current` (clase) solo vive en memoria, `speech.ts`/`wav.ts` solo decodifican en memoria, `hasSignal` analiza 2–5 s en memoria sin guardar nada.
- **Propuesta de corrección:** caducidad (p. ej. 7 días) o borrar los audios del borrador tras guardar las evaluaciones parciales.
- **Relacionado con:** AUD-SEG-001.

### AUD-MIC-312 · Grabaciones sin límite de duración

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/components/TalkButton.tsx:62-77` (límite solo si `maxSeconds`, que Conversation pasa solo con fonética activa, `Conversation.tsx:996`), modo bloqueado `:83-87, 105-109`; `Calibration.tsx:490-535`; `ReviewScreen.tsx:112-149`; `TopicAskPage.tsx:45-78`
- **Qué pasa:** con el modo bloqueado (deslizar ↑) en clase sin fonética, o con los botones de tocar-para-empezar del test, repaso y dictado, la grabación sigue hasta que el usuario toca o la app pasa a segundo plano.
- **Propuesta de corrección:** tope de seguridad (p. ej. 2–3 min) con aviso.

### AUD-MIC-313 · Permisos de audio

- **Severidad:** INFO
- **Estado:** CONFIRMADO en parte (navegador): `NotAllowedError` → 1 intento y mensaje de permiso correcto; `NotReadableError` → 2 intentos y mensaje «cierra otras apps». El momento del diálogo de permiso de Android no se probó (el permiso ya estaba concedido y revocarlo cambia ajustes del sistema).
- **Probado en:** navegador 360×780 · `evidencia/nav-M10-permisos.txt`
- **Dónde:** `android/app/src/main/AndroidManifest.xml:44,47,49,51`; `AudioRoutePlugin.java:37-40, 179-196`; `src/lib/audioRoute.ts:67-69`; `Conversation.tsx:311`
- **Qué pasa:** `RECORD_AUDIO` lo pide el WebView (Capacitor) en el primer `getUserMedia`; en clase eso ocurre **al entrar**, antes de que el usuario pulse el micro (consecuencia de AUD-MIC-305); en test/repaso/dictado, al pulsar. `BLUETOOTH_CONNECT` solo al elegir «Todo por los auriculares» (o al volver con esa preferencia guardada). `MODIFY_AUDIO_SETTINGS` es de instalación. `BLUETOOTH` limitado a SDK ≤30. No se pide nada antes de hacer falta salvo el caso de la clase. Nota: `useRef(new Recorder())` crea un objeto por render (`Conversation.tsx:109`, `Calibration.tsx:291`, `ReviewScreen.tsx:53`) pero el constructor no abre nada: inofensivo.

---

## Fase 2 · Hipótesis de B1/B2 (fila B3 de `fase2-hipotesis.md`)

| Hipótesis | Veredicto | Dónde |
|---|---|---|
| H-B3-1 / AUD-ARQ-100 (dos `open()` solapados) | CONFIRMADO en teléfono (dictado) | AUD-MIC-302 |
| H-B3-2 / H-B2-301 (segundo plano durante `getUserMedia`/`hasSignal`) | CONFIRMADO en teléfono (en `hasSignal`; reapertura al volver y captura ~5 s en segundo plano tras el 2.º Inicio) | AUD-MIC-301 |
| H-B3-3 (cerrar el dictado/repaso durante la apertura) | No reproducido aparte: el desmontaje de la hoja sí cierra el stream registrado; el caso que falla es el doble toque (302) | AUD-MIC-302 |
| H-B3-4 / AUD-ARQ-104 (`MODE_IN_COMMUNICATION` sin dispositivo) | No probado (sin auriculares). Observado aparte: el propio WebView pone `MODE_IN_COMMUNICATION` mientras el micro está abierto, sin auriculares | AUD-MIC-305 |
| H-B3-5 (test: segundo plano grabando) | No probado en teléfono (test obligatorio, riesgo para el perfil real) | — |
| H-B3-6 (StrictMode en dev) | Los resultados de 301/302/303/304 coinciden en navegador y APK; se da por bueno el del APK | — |
| H-B2-302 / AUD-FLU-213 (micro abierto toda la clase) | CONFIRMADO (3 min, `running`, punto verde) | AUD-MIC-305 |
| H-B2-303 (repaso abierto tras grabar) | CONFIRMADO (49 s hasta salir) | AUD-MIC-305 |
| H-B2-304 (test abierto entre tareas) | No probado (test obligatorio) | AUD-MIC-305 |
| H-B2-305 (sin límite de duración) | No medido (5 min); el código no tiene tope | AUD-MIC-312 |
| H-B2-306 (UI «grabando» al volver) | No probado | — |
| H-B2-307 (giro durante grabación) | No probado (requiere girar el teléfono o cambiar ajustes del sistema) | — |

Comprobaciones dinámicas sin defecto: M2 (graba solo entre pulsar y soltar), M4 (Inicio con la clase abierta: cerrado en ≈1–2 s y no se reabre solo), M11 (`force-stop` grabando: audio de Android limpio en ≈3 s), M12 (Inicio, Palabras, Progreso, Ajustes: ninguna apertura), M10 en navegador (mensajes de permiso/ocupado correctos).
No probados: M5, M6, M7 (y AUD-MIC-307), M8/M8b, X2, X3 (contar reintentos), X4, X5.
Efecto lateral en datos del dueño: ninguno creado ni borrado; la clase guardada se volvió a guardar con el mismo contenido y `savedAt` nuevo al pulsar Inicio con ella abierta.
