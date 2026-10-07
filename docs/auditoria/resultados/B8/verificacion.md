# B8 · Verificación (fase 3, modo COMPLETO)

Verificador: B8 · Fecha: 2026-10-05/06 · Código leído: HEAD `16e6240` (los archivos citados de micro/red/seguridad no cambian respecto a `6874443`: el diff solo toca `Calibration.tsx`, `testDraft.ts`, `changelog.ts`).
Teléfono: POCO 23122PCD1G (`-s 60d0718c`), Habla v5.8 versionCode 33, `DEBUGGABLE`, `lastUpdateTime=2026-10-05 22:13:08` (APK nuevo, = `16e6240`) → `evidencia/dumpsys-package.txt`.
Método: cada hallazgo se relee en el código y se reproduce desde cero con arneses propios (`arnes/`, copias revisadas de B3 con `-s 60d0718c`). Muestreo independiente de Android (`audio_policy` Inputs con uid 10410, `appops RECORD_AUDIO`, modo de audio) cada ~0,85 s. Red falsa en todas las pruebas del teléfono (0 llamadas reales salvo que se indique).

Revisión del arnés de B3 (`B3/arnes/instr.js`, `sampler.sh`): la parte JS solo envuelve `getUserMedia`/`MediaRecorder` (no cambia el micro real) y la red falsa responde «no se oyó voz» a todo audio (no se guarda ningún turno). El muestreador lee Android directamente (no depende del JS), así que «habla_in»/«appops running» son prueba independiente. Defecto menor: no usaba `-s` (hoy hay un solo dispositivo; las copias de B8 lo fijan). Conclusión: mide lo que dice.

---

## AUD-MIC-301 · `open()` no cancelable (cierre a mitad de la apertura) — CRÍTICA

- **Veredicto:** CONFIRMADO (REPRODUCIDO 1 de 2 intentos, como B3). Severidad: se mantiene **CRÍTICA** por el criterio §6 (capta en segundo plano y vuelve a captar sin que se pida), con la nota de que la **probabilidad es baja** con el micro del teléfono.
- **Código (releído):** `recorder.ts:118-154` y `:157-174`. Al cerrarse durante `hasSignal`, la pista parada da ceros → `false` → `fallback()` abre otro `getUserMedia` (`:164`) y asigna `this.stream` **sin** `recorders.add(this)`; `releaseAllMics()` (`:71`) ya no lo alcanza. `Conversation.tsx:311-315` solo mira `gone()`.
- **Reproducción (arnes `m301.sh`, app recién arrancada, «Continuar mi clase», Inicio de Android a 0,45 s):** gUM #0 abre 0,5 s después del toque; `track stop #0` al ir a Inicio; al volver, sin tocar nada, `fallback` abre gUM #1 (pila `ta.fallback`). 2.º Inicio: #1 **no se cierra** (sin `track stop #1`); Android muestra la entrada de Habla asignada todo el tiempo en segundo plano y `appops RECORD_AUDIO (running)` de 23:58:09,8 a ~23:58:15 con `habla_top=0` (~5 s capturando en segundo plano) hasta que Android la silencia; al volver, `running` otra vez sin pulsar nada.
- **Intento 2 (Inicio a 1,2 s):** NO se reproduce: `hasSignal` ya había visto señal (micro real con ruido devuelve `true` en el primer búfer) y el cierre fue limpio.
- **Explicación inocente buscada:** ninguna capa la cubre (MainActivity solo hace `onPause/pauseTimers`; Android corta la captura de fondo a los ~5 s pero deja la entrada asignada). La ventana real es estrecha: desde el toque hasta que `hasSignal` ve la primera muestra (~0,4–0,8 s); en modo auriculares con BT mudo serían hasta 5 s (no probado: sin auriculares).
- **Evidencia:** `evidencia/m301-a-timeline.txt`, `evidencia/m301-a-js.txt` (reproducido); `evidencia/m301-b-*.txt` (no reproducido a 1,2 s).

## AUD-MIC-302 · Dos `begin()`/`open()` simultáneos dejan un stream huérfano — ALTA

- **Veredicto:** CONFIRMADO (REPRODUCIDO a la primera). **Severidad propuesta: CRÍTICA** (sube de ALTA): el huérfano capta audio con la app en su pantalla de Inicio, sin clase ni dictado y sin que nadie lo pida, indefinidamente (solo `force-stop` lo libera), y ~6 s en segundo plano. Cumple literalmente el criterio CRÍTICA de §6, y es **más probable** que AUD-MIC-301 (basta un doble toque impaciente).
- **Código (releído):** `recorder.ts:118-129` (`isOpen` falso mientras `getUserMedia` no resuelve, la 2.ª llamada sobrescribe `this.stream`); `TopicAskPage.tsx:45-56` (`setMic('recording')` después del `await`, el botón no se bloquea).
- **Reproducción (`arnes/m302.sh`):** Tema libre → `click` en «Dictar por voz» dos veces a 150 ms → gUM #0 y #1, rec #0 y #1. «Terminar» para solo #1 (`track stop #1`). Se cierra la hoja: mic #0 sigue `live`. Android: entrada de Habla asignada y `appops (running)` en el Inicio de la app (00:01:42–44), en segundo plano `running` 00:01:46–00:01:52 y luego silenciada con la entrada asignada; al volver, `running` de nuevo sin tocar nada (00:02:02→fin de muestreo).
- **Diferencia con B3:** aquí el `MediaRecorder` #0 pasó solo a `inactive` (~0,2 s tras parar #1; sin llamada a `stop()`), así que no siguió «grabando» en el JS; el stream sí siguió capturando para Android. La consecuencia de privacidad/batería no cambia; la parte «y graba» de B3 no se ha reproducido de forma estable.
- **Explicación inocente:** ninguna. No lo cubre `releaseAllMics()` (el stream #0 no está en ninguna referencia).
- **Evidencia:** `evidencia/m302-timeline.txt`, `evidencia/m302-js.txt`.

## AUD-ARQ-100 · `Recorder.open()` no es reentrante — ALTA

- **Veredicto:** DUPLICADO de AUD-MIC-302 (misma causa raíz y mismo código, `recorder.ts:118-129`), CONFIRMADO por la reproducción de arriba. Consolidar bajo AUD-MIC-302 (CRÍTICA propuesta).

## AUD-MIC-303 · Dictado del Debate: «Atrás» al paso 1 deja grabando — ALTA

- **Veredicto:** CONFIRMADO (REPRODUCIDO). Severidad: **se mantiene ALTA** (capta sin control visible en una pantalla donde el usuario cree haber salido del dictado; el envío a Gemini solo ocurre si el usuario vuelve al paso 2 y toca «terminar» y si `analyzeSpeech` detecta voz). Podría defenderse CRÍTICA por §6 («capta sin que lo pida»): el usuario sí pidió dictar, por eso ALTA.
- **Código (releído):** `TopicAskPage.tsx:120` (`onBack` del paso 2 = `setStep(0)`, sigue montado), `:41` (solo cierra al desmontar), `:51-52` (`setMic('recording')` tras el `await begin()`: si el usuario ya salió al paso 1, la grabación empieza igual).
- **Reproducción (`arnes/m303.sh`):** Debate → «Lo propongo yo» → «Dictar por voz» → «Atrás» (2,5 s después). Pantalla «¿Quién elige el tema del debate?» sin control de micro y con el **punto verde** (`evidencia/m303-paso1-grabando.png`); CDP: `rec #0 recording`, mic #3 `live`; Android: entrada de Habla asignada y `appops (running)` de 00:03:58 a 00:04:10. Al volver a «Lo propongo yo» el botón dice «Te escucho… toca para terminar»; al terminar se paró tras **15,5 s grabados** (casi todos en el paso 1). Sin envío a red en esta prueba: habitación en silencio → `analyzeSpeech` dijo «No te he oído» (B3 sí vio el envío de 158 KB al hablar; el camino de envío es `TopicAskPage.tsx:62-70`, releído).
- **Agravante nuevo:** aquí la grabación **empezó después** de pulsar «Atrás» (rec start 7,5 s después de volver al paso 1), porque la apertura tardó ~12 s (ver AUD-MIC-800). Es decir: el usuario puede salir del paso antes de que se vea «Te escucho» y aun así empieza a grabar.
- **Evidencia:** `evidencia/m303-timeline.txt`, `evidencia/m303-js.txt`, `evidencia/m303-paso1-grabando.png`.

## AUD-MIC-800 (NUEVO, B8) · En silencio, el micro con procesado da ceros exactos: `hasSignal` lo toma por «mudo» y la app cambia al micro **sin cancelación de eco** para toda la sesión, tras ~12 s de apertura

- **Severidad propuesta:** MEDIA · **Estado:** CONFIRMADO (teléfono, 1 vez, habitación en silencio a las 00:03) · **Área:** MIC
- **Dónde:** `src/lib/recorder.ts:75-97` (`hasSignal` exige alguna muestra `!== 0` en 2 s), `:140-142`, `:157-171` (`fallback` prueba cada micro del teléfono 2 s y acaba en `{echoCancellation:false, noiseSuppression:false, autoGainControl:false}`), `:166` (`chosen` es global del módulo: se usa en todas las aperturas siguientes hasta un `devicechange`).
- **Qué pasó:** «Dictar por voz» en silencio: gUM #0 (procesado) → 2 s sin muestras ≠ 0 → `fallback`: #1 y #2 (micros del teléfono con procesado) tampoco → #3 «por defecto sin procesado» (`AUDIO_INPUT_FLAG_NONE` en `audio_policy`) da señal → `chosen` = sin procesado. La grabación empezó **12,5 s** después del toque (`evidencia/m303-js.txt`: gUM req 17640 → rec start 30147).
- **Por qué importa:** (1) el resto de la sesión (clase incluida) graba sin cancelación de eco ni supresión de ruido: la voz del profe (TTS por el altavoz) y el ruido entran en las grabaciones; (2) 12 s sin respuesta al tocar el micro; (3) amplía mucho la ventana de AUD-MIC-301 (un cierre durante esos 12 s reabre el micro en `fallback`).
- **Propuesta:** tratar como «mudo» solo un stream sin pistas vivas o con `track.muted`; o umbral de silencio/energía en vez de igualdad a 0; no persistir `chosen` sin procesado fuera del modo `headset`.

## AUD-MIC-305 · Micro abierto (capturando) durante toda la clase en reposo — ALTA (diseño)

- **Veredicto:** CONFIRMADO (REPRODUCIDO). Severidad: **se mantiene ALTA** (encaja literalmente en §6 ALTA: «indicador verde encendido sin grabar durante periodos largos evitables»). Bajaría a MEDIA solo si el dueño lo acepta como diseño con aviso explícito.
- **Código (releído):** `Conversation.tsx:305-315` abre al montar (antes del saludo); no hay cierre por inactividad; solo cierran salir/terminar/segundo plano.
- **Reproducción (`arnes/m305.sh`):** «Continuar mi clase» sin tocar nada: Android marca la entrada de Habla asignada, `appops RECORD_AUDIO (running)` y `MODE_IN_COMMUNICATION` durante **85 s seguidos** (00:05:54 → 00:07:19, 97 muestras), con punto verde (`evidencia/m305-clase-60s.png`). Al ir a Inicio de Android se cerró en ~2 s (NC-14 funciona en el caso normal).
- **Explicación inocente:** es intencionado (latencia cero al pulsar), pero no está avisado al usuario y no tiene tope. Aun así no envía nada: el JS no graba hasta pulsar.
- **Nota:** en esta entrada también saltó `fallback()` por silencio (gUM #0 parado a los 2 s, gUM #1 abierto): segunda observación de AUD-MIC-800.
- **Evidencia:** `evidencia/m305-timeline.txt`, `evidencia/m305-js.txt`, `evidencia/m305-clase-60s.png`.

## AUD-MIC-304 · Segundo dedo durante una grabación: `MediaRecorder` huérfano — MEDIA

- **Veredicto:** CONFIRMADO (REPRODUCIDO). Severidad: **se mantiene MEDIA** (graba en memoria sin enviar mientras el stream de la clase siga abierto; se corta al ir a segundo plano; el gesto de dos dedos sobre el mismo botón es poco frecuente).
- **Código (releído):** `TalkButton.tsx:81-97` no comprueba `gesture.current.active`; `recorder.ts:186-197` sobrescribe `this.recorder` sin parar el anterior.
- **Reproducción:** `pointerdown` id 1 → 1,5 s → `pointerdown` id 2 → `pointerup` id 2 → `pointerup` id 1: rec #0 y #1; se para solo #1; **rec #0 siguió `recording` 24 s después** con la clase en reposo, hasta que el paso a segundo plano cerró la pista (`rec #0` → `inactive` al cerrar `track #1`).
- **Evidencia:** `evidencia/m305-js.txt` (bloque «X1»).

## N2 (escenario nuevo, B8) · Botón de hablar pulsado y botón Inicio de Android a mitad de la grabación

- **Resultado:** SIN DEFECTO (INFO). Al ir a segundo plano con el dedo puesto, `rec #2` se paró y la pista se cerró en el mismo instante (`rec stop #2`, `track stop #1`); Android: entrada liberada y `MODE_NORMAL` en ~2 s. Al volver: botón en «Mantener para hablar», nada enviado a la red (red falsa sin peticiones) y el `pointerup` tardío no hace nada. Evidencia: `evidencia/m305-js.txt` (bloque «N2»), `evidencia/m305-timeline.txt` 00:07:19–00:07:32.

## AUD-MIC-308 · El cierre en segundo plano depende solo de JavaScript — MEDIA (HIPÓTESIS)

- **Veredicto:** CONFIRMADO (sube de HIPÓTESIS a CONFIRMADO). Severidad: **se mantiene MEDIA**.
- **Código (releído):** `MainActivity.java:27-34` (`onStop` → `wv.onPause()` + `pauseTimers()`); `lifecycle.ts:28-55` (el único que para pistas es `releaseAllMics()` en JS).
- **Reproducción (`arnes/m308.sh`):** clase abierta con micro capturando; por CDP se ocupa el hilo JS 8 s (bucle síncrono) y 1 s después se pulsa Inicio. Android: con `habla_top=0`, la entrada de Habla siguió asignada y `appops (running)` de 00:09:17 a ~00:09:23; se liberó a las 00:09:25, **justo cuando terminó el bucle** (`track stop #3` a los 25 ms del fin del bucle). Es decir, `WebView.onPause()` no detiene la captura: nada nativo la corta; solo el JS cuando consigue ejecutarse (Android silencia por su cuenta a los ~5–6 s).
- **Confirmación independiente:** los huérfanos de AUD-MIC-301/302 siguen con la entrada asignada en segundo plano indefinidamente (`m301-a`, `m302`).
- **Límite de la prueba:** un bloqueo de 8 s es sintético; los bloqueos reales (p. ej. `toBase64` de un audio largo) son de décimas.
- **Extra:** tercera observación de AUD-MIC-800: al entrar en la clase, cadena `fallback` completa #0→#1→#2→#3 y se quedó con «por defecto sin procesado» (`AUDIO_INPUT_FLAG_NONE`, y el modo pasó de `IN_COMMUNICATION` a `NORMAL`).
- **Evidencia:** `evidencia/m308-timeline.txt`, `evidencia/m308-js.txt`.

## AUD-RES-700 · Fondo animado con `blur` ocupa ~1 núcleo — ALTA

- **Veredicto:** CONFIRMADO (REPRODUCIDO) con **severidad ajustada de ALTA a MEDIA**: §6 clasifica «consumo de batería anómalo» como MEDIA; ALTA exige micro/datos/flujo roto. Solo ocurre en primer plano (en segundo plano 0 %, AUD-RES-702). Es, eso sí, el arreglo de mejor relación coste/beneficio del informe.
- **Código (releído):** `src/ui/Background.tsx:13-15` (3 capas con `filter: blur(70–80px)` y `animation: hb-drift … infinite` en línea), montado en `App.tsx` y en cada `MascotPage`.
- **Reproducción independiente (`arnes/res700.sh`, CPU por `/proc/<pid>/stat` durante 20 s por modo; CSS pausado con `animation-play-state:paused!important`; mascota congelada sustituyendo `requestAnimationFrame`):**

  | Pantalla | base | solo manchas (rAF congelado) | solo mascota (CSS pausado) | todo parado |
  |---|---|---|---|---|
  | Inicio | app 165 % + render 57 % | 108 % + 8 % | 133 % + 40 % | 0 % + 2 % |
  | Clase reanudada en reposo (2 mascotas) | app 186 % | 63 % | 142 % | 0 % |

  Coincide con B7 (Inicio 172 % + 69 %). **Matiz de atribución:** los dos efectos no se suman; cualquiera de los dos por sí solo mantiene >1 núcleo, porque cada fotograma vuelve a componer las capas desenfocadas. Arreglar solo uno (fondo o mascota) **no** basta: deben corregirse juntos → propongo consolidar AUD-RES-700 + AUD-RES-701 (+ AUD-ARQ-110) en un único hallazgo «redibujado continuo en reposo» (MEDIA).
- **Evidencia:** `evidencia/res700-cpu-inicio.txt`, `evidencia/res700-cpu-clase.txt`. (En la clase el PID del renderer era antiguo y salió 0 %: solo vale la columna «app».)

## AUD-RES-701 / AUD-ARQ-110 · La mascota redibuja a 60–120 fps en reposo — MEDIA

- **Veredicto:** CONFIRMADO (REPRODUCIDO). **Se mantiene MEDIA**; consolidar con AUD-RES-700 (ver tabla arriba: solo la mascota, con el fondo pausado, = 133–142 % de la app). AUD-ARQ-110 (BAJA, estático) queda DUPLICADO de AUD-RES-701.
- **Código (releído):** `src/ui/Mascot.tsx` (`tick` se reprograma siempre con `requestAnimationFrame`).
- **Evidencia:** `evidencia/res700-cpu-*.txt`.

## AUD-SEG-001 · APK debuggable y credenciales en claro — ALTA

- **Veredicto:** CONFIRMADO (REPRODUCIDO). **Se mantiene ALTA.** No sube a CRÍTICA: ninguna otra app puede leerlas (sandbox) y hace falta un PC con la depuración USB ya autorizada en el teléfono; pero ese PC las obtiene en segundos **sin huella ni patrón** (bypass de la protección de la interfaz, criterio ALTA).
- **Comprobado:** `aapt2 dump badging apk/Habla-v5.8.apk` → `application-debuggable` (`evidencia/seg001-badging.txt`); teléfono `pkgFlags=[ DEBUGGABLE … ALLOW_BACKUP ]` (`evidencia/dumpsys-package.txt`); `package.json:11` sigue con `assembleDebug`. Por CDP, desde el PC y sin ningún diálogo en el teléfono, `Capacitor.Plugins.Preferences.get('habla.settings')` devuelve las claves: se registró **solo el resumen** (Gemini longitud 39, Azure longitud 84, secreto SP vacío) en `evidencia/seg001-cdp-resumen.txt`. No se usó `run-as`.
- **Explicación inocente:** app personal de un único usuario; el riesgo existe solo mientras la depuración USB esté activa y autorizada. Mitigación sencilla documentada por B0 (publicar `assembleRelease` con la misma firma).

## N3 (escenario nuevo, B8, fugas) · ¿Quedan claves o textos en logcat o en `localStorage` tras una sesión de pruebas con clase, dictado y Debate?

- **Resultado:** SIN DEFECTO (INFO; confirma AUD-FUG-409 y que `loggingBehavior:'none'` funciona con el APK de 22:13). `logcat -d` completo (225 178 líneas, 354 del proceso de Habla): 0 apariciones de `AIza`, `geminiKey`, `azureKey`, `habla.settings`, `generativelanguage`, `HABLA-NET`, `inlineData`, el nombre del alumno ni `HablaAudio` (sin auriculares BT, AUD-FUG-405 sigue sin poder probarse). `localStorage` del WebView: solo `habla.adviceCursor` y `habla.netlog` (16 KB) sin claves, `key=` sin enmascarar, `Bearer` ni clave de suscripción. Solo se guardaron recuentos.
- **Evidencia:** `evidencia/n3-logcat-recuento.txt`, `evidencia/n3-localstorage-recuento.txt`.

## AUD-ARQ-104 · `setRoute("headset")` deja el «modo llamada» si no hay auriculares — MEDIA (HIPÓTESIS)

- **Veredicto:** PARCIAL. El defecto de código existe, pero el efecto «persistente» **no se reproduce** en Android 16. **Severidad propuesta: BAJA** (baja de MEDIA).
- **Código (releído):** `AudioRoutePlugin.java:209` cambia a `MODE_IN_COMMUNICATION` antes de buscar dispositivo; `:216-218` y `:243-245` rechazan sin restaurar. Desde la interfaz solo se llega con auriculares detectados y preferencia «headset» (`AudioPicker.tsx:48-58`), p. ej. unos solo-A2DP.
- **Prueba (teléfono, sin auriculares; llamada directa al plugin por CDP, `evidencia/arq104-setroute.txt`):** `MODE_NORMAL` → `setRoute({route:'headset'})` → `reject: No hay auriculares con micrófono disponibles` → **`MODE_IN_COMMUNICATION`** a los 2 s (confirma el camino de error) → **`MODE_NORMAL` 5 s después sin intervención** (Android 16 devuelve el modo cuando la app no tiene audio activo). Con un micro abierto (clase) el modo ya es `IN_COMMUNICATION` por el WebView (AUD-MIC-305), así que el residuo práctico es mínimo.
- **No probado:** SDK < 31 (rama `startBluetoothSco`) y el caso con auriculares A2DP reales.

## AUD-ARQ-002 · Un único chunk de 1,29 MB con el banco — BAJA (muestra)

- **Veredicto:** CONFIRMADO (estático): `dist/assets/index-B_1wUOOv.js` = 1 290 228 B (el mismo nombre de chunk aparece en las pilas del WebView del POCO, así que es el que corre en el APK de 22:13); `bank.ts:105` usa `import.meta.glob(..., { eager: true })`; 0 `import()` dinámicos en `src/`. **Se mantiene BAJA** (incluso podría ser INFO): el arranque en frío medido por B7 es de 1,36 s (AUD-RES-710), sin coste de red.

## AUD-FLU-209 · Cambiar la clave de Gemini por una errónea borra la buena — MEDIA (HIPÓTESIS)

- **Veredicto:** CONFIRMADO (REPRODUCIDO en navegador; pasa de HIPÓTESIS a CONFIRMADO; B6 ya lo vio en E2E-033). **Se mantiene MEDIA** (la app queda sin IA hasta volver a pegar la clave buena; recuperable, pero exige tenerla a mano y el patrón).
- **Código (releído):** `SettingsScreen.tsx:692` `update({ geminiKey: k })` antes de `listModels(k)` (`:696`); el `catch` no restaura. `GeminiFix.tsx:50-62` guarda sin comprobar nunca.
- **Prueba:** clave ficticia A aceptada (models 200) → clave B con la red devolviendo 400 «API key not valid» → mensaje «La clave de Gemini no es válida» y la guardada es **B**. En web `confirmIdentity` deja pasar; en el teléfono pediría el patrón antes, lo que no cambia el resultado.
- **Evidencia:** `evidencia/nav-flu209.md`.

## AUD-FUG-401 / AUD-SEG-500 · Resource ID de Azure sin validar: el token Bearer va a otro host — MEDIA

- **Veredicto:** CONFIRMADO (REPRODUCIDO en navegador con envoltorio de `fetch` propio, independiente del de B4). AUD-SEG-500 = DUPLICADO de AUD-FUG-401. **Se mantiene MEDIA**: requiere tener el teléfono desbloqueado (o engañar al usuario para pegar el valor) y un *service principal* configurado; hoy el POCO no tiene secreto SP (`evidencia/seg001-cdp-resumen.txt`: «spSecret vacía»), así que el dueño no está expuesto. El token obtenido es de ARM con los permisos del SP (mínimo Monitoring Reader).
- **Código (releído):** `azureUsage.ts:76-77` concatena `https://management.azure.com${res}` y manda `Authorization: Bearer`; `AzureSettings.tsx:121-128` (`saveMonitor`) solo pide `confirmIdentity` si cambia el secreto, no el Resource ID/tenant/client.
- **Prueba:** Resource ID `@evil.example/x` → token pedido a `login.microsoftonline.com` y `GET evil.example/x/providers/microsoft.insights/metrics` con `Bearer`; la UI muestra «≈ 0 min de 5 h usadas» sin aviso.
- **No probado:** en el teléfono (va por `CapacitorHttp` nativo; `java.net.URL` también interpreta `@` como userinfo, así que se espera lo mismo) — no hay SP configurado y no se debe crear.
- **Evidencia:** `evidencia/nav-fug401.md`.

## AUD-E2E-601 · Sin `ErrorBoundary`: una consulta mal formada deja la app en blanco al abrir Palabras — BAJA (muestra)

- **Veredicto:** CONFIRMADO (REPRODUCIDO en navegador). Severidad: **propongo MEDIA** (sube de BAJA): §6 MEDIA = «error sin recuperación»; la pestaña tumba la app entera cada vez y el usuario no tiene salida salvo no tocar Palabras. Se origina igual que AUD-SEG-501 (importar sin validar); consolidar como «falta de validación al importar + ningún `ErrorBoundary`».
- **Código (releído):** `WordsScreen.tsx` usa `h.result.headword` sin comprobar; `grep ErrorBoundary src` = 0.
- **Evidencia:** `evidencia/nav-importar-plan.md` §E2E-601.

## AUD-SEG-501 / AUD-ARQ-102 · Importar sin validar: `tables:{}` borra todo — MEDIA

- **Veredicto:** CONFIRMADO (REPRODUCIDO). AUD-ARQ-102 = DUPLICADO. Severidad: el criterio CRÍTICA de §6 incluye «pérdida de datos del alumno», pero aquí hace falta que el propio usuario elija un archivo equivocado y acepte el `confirm()`. **Se mantiene MEDIA**, anotando que es pérdida de datos irreversible sin copia previa automática.
- **Código (releído):** `backup.ts:87-100`: solo valida `format` y `typeof tables`; por cada tabla `clear()` incondicional y `bulkPut` solo si hay filas.
- **Prueba:** `tables:{}` → «Importado: 0 sesiones y 0 errores ✓» y sesiones/turnos/consultas/tarjetas a 0; el perfil calibrado se sustituye por uno por defecto.
- **Evidencia:** `evidencia/nav-importar-plan.md` §SEG-501.

## AUD-RES-704 · Perfil con forma inesperada → pantalla negra en cada arranque — MEDIA

- **Veredicto:** CONFIRMADO (REPRODUCIDO; es el mismo fallo que la «pantalla negra» de AUD-SEG-501). **Se mantiene MEDIA** (error sin recuperación; datos intactos pero inaccesibles). Consolidar con AUD-SEG-501 (≈ ARQ-102) como ya prevé el orquestador.
- **Código (releído):** `App.tsx:112` lee `p.levels.overall`; el `Promise.all` del arranque no tiene `catch`; `App` devuelve `null` sin `settings`.
- **Evidencia:** `evidencia/nav-importar-plan.md` §RES-704.

## AUD-RES-703 / AUD-FLU-216 · Tras un error del plan, volver al Inicio relanza la cadena de reintentos — MEDIA

- **Veredicto:** CONFIRMADO, PARCIAL en la magnitud: con 3 vueltas al Inicio hubo **1** cadena nueva de 5 peticiones (no una por vuelta). **Severidad propuesta: BAJA** (baja de MEDIA; B2 ya la tenía como BAJA): solo pasa si no hay plan y Gemini falla (primeros días o cuota agotada), y el coste es cuota gratuita, no datos ni micro.
- **Código (releído):** `PlanCard.tsx` genera al montar sin recordar el error; `gemini.ts` `retryLoop` 3 + 2 intentos.
- **Evidencia:** `evidencia/nav-importar-plan.md` §RES-703.

## AUD-FLU-202 · El re-test no tiene salida una vez empezado — MEDIA (HIPÓTESIS)

- **Veredicto:** CONFIRMADO (REPRODUCIDO en navegador, con control positivo del evento «atrás»). **Se mantiene MEDIA** (error sin recuperación: 25–30 min forzados en un flujo que la propia app presenta como aplazable; la única salida es cerrar la app).
- **Código (releído):** `Calibration.tsx:298-304` (`retest = !!profile?.calibratedAt`; `registerBack(() => {})` sin distinguir re-test), `:703` (`onBack` solo entre páginas, nunca en la primera), `App.tsx:340-348` (sin `onCancel`).
- **Prueba:** página 1 del re-test solo con «Siguiente»; `backButton` emitido no hace nada; en un control (Ajustes → Modelos) el mismo evento sí navega atrás.
- **Evidencia:** `evidencia/nav-flu202.md`.

## AUD-FLU-203 · El test no guarda borrador hasta el final — MEDIA

- **Veredicto:** PARCIAL / **CORREGIDO en gran parte en `16e6240`** (el APK instalado en el POCO desde las 22:13). En el commit auditado `6874443` es cierto (no existe guardado intermedio; confirmado leyendo el código y por B6 E2E-021). En `16e6240`, `Calibration.tsx` guarda `TestProgress` en `habla-draft` en cada paso seguro (`grammar`, `review`, `speaking`, `section` de habla) y lo restaura al volver a entrar. **Residuo:** dentro de un bloque de lectura/escucha (`section` ≠ habla) no se guarda, así que se pierde el bloque en curso; y en el re-test solo se retoma si el alumno vuelve a pulsar «Hacer el re-test» (B6/B7, AUD-RES-712). **Severidad propuesta: BAJA** para el residuo en `16e6240`.
- **Prueba dinámica propia:** no repetida (la cubrieron B6 E2E-021 y B7 AUD-RES-712 con `16e6240`); verificado por lectura del diff `6874443..16e6240` (`testDraft.ts` +26, `Calibration.tsx` +59).

## AUD-FLU-219 · Tras importar, la clase guardada se cruza con otra sesión — BAJA (muestra)

- **Veredicto:** CONFIRMADO (REPRODUCIDO desde cero en navegador, mismo resultado que B6 H-B6-1). **Se mantiene BAJA** (mezcla de datos de una sesión, sin pérdida; requiere importar con una clase guardada cuyo `sessionId` exista en la copia, algo plausible al restaurar una copia propia antigua porque los IDs son autoincrementales).
- **Prueba:** la pantalla muestra los turnos de la copia, Gemini recibe el historial de la clase guardada y el turno nuevo cae en la sesión importada (`evidencia/nav-flu219.md`).
- **Causa (releída):** `importBackup` no toca `habla.savedClass` (Preferences), solo Dexie (AUD-ARQ-101).

---

## Resumen de B8

- **Verificados:** 21 puntos (7 CRÍTICA/ALTA + 14 de muestra) + 3 escenarios nuevos. Reproducidos 17; parciales 4 (AUD-ARQ-104, AUD-RES-703, AUD-FLU-203, y AUD-MIC-301 1/2 por ventana estrecha); ninguno descartado. Llamadas reales a IA: **0** de 2.
- **Cambios de severidad propuestos:** AUD-MIC-302 (+ARQ-100) ALTA→**CRÍTICA**; AUD-RES-700 ALTA→**MEDIA** (batería = MEDIA en §6; consolidar con RES-701/ARQ-110); AUD-E2E-601 BAJA→**MEDIA**; AUD-ARQ-104 MEDIA→**BAJA**; AUD-RES-703/FLU-216 MEDIA→**BAJA**; AUD-FLU-203 MEDIA→**BAJA** en `16e6240` (corregido casi del todo). AUD-MIC-308 y AUD-FLU-209/202 pasan de HIPÓTESIS a CONFIRMADO con su severidad.
- **Duplicados:** AUD-ARQ-100 = MIC-302; AUD-SEG-500 = FUG-401; AUD-ARQ-102 ≈ SEG-501 ≈ RES-704 (+E2E-601: misma raíz, importar sin validar + sin ErrorBoundary); AUD-ARQ-110 = RES-701.
- **Nuevo:** AUD-MIC-800 (MEDIA): en silencio el micro procesado da ceros, `fallback()` tarda ~10–12 s y fija para toda la sesión el micro **sin cancelación de eco**; además amplía la ventana de AUD-MIC-301. Visto 3 veces.
- **Pendiente:** punto 23 (bloqueo de pantalla M5/M6) preparado en `arnes/bloqueo-pantalla.md` + `arnes/bloqueo.sh`; requiere al dueño.
