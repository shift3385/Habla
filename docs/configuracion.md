# Configuración

> **Nunca** escribas aquí ni en el código valores reales de claves, contraseñas o secretos. Este documento solo lista **nombres y propósito**.

## 1. Variables de entorno

**La app no usa variables de entorno ni archivos `.env`** (están en `.gitignore` por si acaso). No hay claves en el código ni en el APK: cada usuario mete las suyas en la app y se guardan en el teléfono (ver §2).

Variables necesarias **solo para compilar** en el PC Windows del dueño:

| Variable | Propósito | Valor habitual en este PC (rutas, no secretos) |
|---|---|---|
| `JAVA_HOME` | JDK para Gradle | `C:\Program Files\Java\jdk-21` (Oracle 21) |
| `ANDROID_HOME` | Android SDK (instalado por línea de comandos, sin Android Studio) | `%LOCALAPPDATA%\Android\Sdk` |
| `Path` | Debe incluir Node 24 (`C:\Program Files\nodejs`) y el `bin` del JDK. El PATH de la sesión de Claude puede estar desactualizado: fíjalo en cada orden | — |
| `ANDROID_SERIAL` | Opcional: dispositivo de destino de `adb` cuando hay varios conectados | `60d0718c` (POCO del dueño) o `R95N90B6ANM` (Galaxy A11 de su madre) |

## 2. Credenciales del usuario (dentro de la app)

Se introducen en la app y se guardan en **Preferences**, clave `habla.settings`, junto al resto de ajustes. Para verlas o cambiarlas cuando ya existen se pide el **patrón, PIN o huella** del teléfono. **No entran en las copias de seguridad** (ni en el JSON exportado ni en las copias automáticas de Android).

| Campo en `Settings` | Obligatorio | Propósito | Dónde se consigue |
|---|---|---|---|
| `geminiKey` | **Sí** | Clave de la API de Gemini: el profe, las correcciones, el test y todo lo de IA | Google AI Studio → «Create API key» (empieza por `AIza`). Gratis con límites diarios |
| `azureKey` | No | Clave 1 o 2 de un recurso **Speech** de Azure, para la fonética | Portal de Azure → recurso Speech → Claves y punto de conexión |
| `azureRegion` | Con `azureKey` | Región del recurso (p. ej. `eastus`) | Mismo sitio |
| `azureTenantId`, `azureClientId`, `azureClientSecret` | No | **Service principal** con rol *Monitoring Reader* sobre el recurso, para leer las horas usadas del plan gratis | Microsoft Entra ID → Registros de aplicaciones |
| `azureResourceId` | Con el service principal | Resource ID del recurso Speech (`/subscriptions/…/providers/Microsoft.CognitiveServices/accounts/…`) | Propiedades del recurso |

Otros ajustes relacionados con la IA (sin secretos): `geminiModel` (principal; por defecto `gemini-3.8-flash`), `geminiFallbackModel` y `geminiFastModel` (por defecto `gemini-3.5-flash-lite`), `modelList`, `azurePlan` (`F0` | `S0batch` | `S0payg`, solo refleja el plan del recurso), `phoneticsOn`, `phoneticsUserOff`, `f0ExhaustedMonth`, `phoneticsAlertMonth`.

## 3. Firma del APK

`keystore/` está **fuera de git** y debe tener copia de seguridad aparte (Drive o USB). Contiene:

- `keystore/habla.jks`: el almacén de claves de firma. **Nunca se regenera.**
- `keystore/keystore.properties`, con las propiedades `storeFile`, `storePassword`, `keyAlias` y `keyPassword`, que lee `android/app/build.gradle`.

Desde la 5.8.2 (AUD-ARQ-106), si `keystore.properties` no existe **el release no se compila** (`packageRelease`/`assembleRelease` fallan con un mensaje en español); compilar el Java o el debug sigue funcionando. El debug ya no usa la firma del proyecto: es otra app (`com.shift.habla.debug`) firmada con la clave genérica de Android (`~/.android/debug.keystore`).

## 4. Otros archivos de configuración

| Archivo | Para qué |
|---|---|
| `version.json` | `version` (versionName), `build` (versionCode, entero que siempre sube) y `date`. Única fuente de la versión |
| `capacitor.config.ts` | `appId` `com.shift.habla`, `webDir` `dist`, **`loggingBehavior: 'none'`** (no lo cambies: evita que las claves salgan en logcat) |
| `android/variables.gradle` | Versiones de SDK y `kotlin_version = '2.2.20'` (la que está en caché para compilar `--offline`) |
| `android/app/src/main/AndroidManifest.xml` | Permisos: `INTERNET`, `RECORD_AUDIO`, `USE_BIOMETRIC`, `MODIFY_AUDIO_SETTINGS`, `BLUETOOTH_CONNECT` (y `BLUETOOTH` hasta API 30), `USE_EXACT_ALARM`. `local-notifications` añade `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED` y `WAKE_LOCK` |
| `android/app/src/main/res/xml/backup_rules.xml`, `data_extraction_rules.xml` | Excluyen las Preferences (claves) de las copias automáticas de Android |
| `.claude/launch.json` | Servidor de desarrollo `habla-dev` (Vite en el puerto 5173) para `preview_start` |
| `.oxlintrc.json` | Reglas del lint |

## 5. Almacenamiento en el dispositivo (claves de datos)

| Almacén | Clave o tabla | Contenido |
|---|---|---|
| Preferences | `habla.settings` | Todos los ajustes, **incluidas las credenciales** |
| Preferences | `habla.savedClass` | Clase a medias |
| IndexedDB `habla` | `sessions`, `turns`, `mistakes`, `profile`, `lookups`, `cards` | Datos del alumno (Dexie, esquema v3) |
| IndexedDB `habla-draft` | `calibration`, `progress` | Test terminado sin evaluar y test a medias |
| localStorage | `habla.quota`, `habla.netlog`, `habla.azureUsage`, `habla.adviceCursor` | Cachés y diagnóstico |

En el navegador (desarrollo), Preferences se guarda en `localStorage` como `CapacitorStorage.habla.settings`.

## 6. Depurar en el teléfono real (USB)

- **Teléfonos:**
  - POCO 23122PCD1G (Android 16, HyperOS), serie `60d0718c`: el del dueño.
  - Samsung Galaxy A11 SM-A115U, serie `R95N90B6ANM`: el de su madre, con la pantalla dañada y horizontal forzado. **No lo toques sin que el dueño lo pida** y haz copia antes de instalar.
- **`adb`:** `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`. Con varios conectados usa siempre `-s <serie>` o `ANDROID_SERIAL`.
- **Xiaomi bloquea `adb shell input`.** Se maneja la app por **Chrome DevTools Protocol**:
  1. Busca `webview_devtools_remote_<pid>` en `/proc/net/unix`.
  2. Ejecuta `adb forward tcp:<puerto> localabstract:<socket>`. Usa un puerto distinto por teléfono, p. ej. 9333 y 9334.
  3. Abre `http://127.0.0.1:<puerto>/json` y conéctate al websocket de la página.
  4. Usa `Runtime.evaluate` para pulsar botones por texto o leer `document.body.innerText`.

  Solo los APK **debug** tienen la depuración del WebView activada. Desde la 5.8.2 el debug es otra app (`com.shift.habla.debug`, «Habla debug», con datos propios vacíos): para depurar hay que instalarla, crear un perfil de prueba y meter una clave de prueba. La app de uso diario (release) no admite CDP ni `run-as`.
- **Capturas fieles:** `adb exec-out screencap -p > captura.png`. La captura por CDP aplasta el texto.
- **Pantalla apagada:** el WebView se pausa y las evaluaciones por CDP se cuelgan. Despiértala con `adb shell input keyevent KEYCODE_WAKEUP` (en el Samsung sí funciona).
- **Hablar sin persona:** genera un WAV en inglés en el PC con PowerShell `System.Speech` (voz «Microsoft Zira Desktop», 16 kHz mono, SSML con `<break time="1200ms"/>` para pausas y faltas escritas «como suenan» para simular errores). Inyéctalo en base64 y sustituye `window.MediaRecorder` por uno que grabe un `AudioBuffer`. Reproducir la voz por el altavoz del teléfono no sirve: la cancelación de eco la elimina. Para mantener pulsado el micro, envía `pointerdown` y `pointerup` a `button[aria-label="Mantener para hablar"]`.
- **Simular errores de Azure:** parchea `Capacitor.nativePromise` para el plugin `CapacitorHttp`. Parchear `Capacitor.Plugins.CapacitorHttp.request` no llega a las llamadas de la app.
- **Comprobar que Azure se usa:** en IndexedDB `habla`, tabla `turns`, campo `pronunciation` (vacío = ese turno no tuvo fonética).
- **Diagnóstico de Gemini:** *Ajustes → Modelos → Diagnóstico*. Ya no sale en logcat.
- **Notificaciones en Xiaomi o POCO:** activar el «Inicio automático» de Habla, o el aviso puede perderse al reiniciar el teléfono.

## 7. Vista previa en el navegador

`npm run dev` (o `preview_start` con `habla-dev`). El almacenamiento suele empezar vacío. Para llegar a las pantallas internas:

1. Crea un perfil de prueba: «Soy nuevo» → nombre → mascota → ocupación → 3 temas → bienvenida.
2. Para pasar el paso de la clave **sin usar una clave real**, sustituye `window.fetch` para que las peticiones a `generativelanguage…/models` devuelvan una lista falsa de modelos, y escribe una clave inventada.
3. Para probar pantallas que llaman a Gemini o a Azure, simula sus respuestas igual, con `fetch` falso.

El micrófono está bloqueado en el panel del navegador de Claude Code: simula `getUserMedia` con un oscilador.
