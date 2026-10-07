# B0 · Línea base de la auditoría de Habla

Fecha: 2026-10-05 · Autor: B0 · Solo lectura (no se tocó `src/`, `android/`, `scripts/` ni dependencias).

## 1. Qué se audita

| Dato | Valor |
|---|---|
| Commit | `68744431ba1b6268cf5c9d20b9e312986ff08a64` (rama `main`) — «v5.8: tutorial de la mascota en la primera instalación…» |
| `git status --short` | solo `?? docs/auditoria/` y `?? docs/prueba-fonetica-A2.png` (árbol del producto limpio) |
| `version.json` | `{"version":"5.8","build":33,"date":"2026-10-05"}` |
| Último APK en `apk/` | `apk/Habla-v5.8.apk`, 6 253 362 B, 2026-10-05 18:33, sha256 `93f12b54f458563f…` |
| APK v5.8 (aapt2 badging) | `versionCode=33`, `versionName=5.8`, min 24 / target 36, **`application-debuggable`**, `allowBackup=true` |
| Node | v24.11.0 (`C:\Program Files\nodejs`) |

Salida completa: `git-version.txt`.

## 2. Comprobaciones

| Comprobación | Resultado | Archivo |
|---|---|---|
| `npx tsc -b` | **OK** (0 errores, exit 0, ~9 s) | `tsc.txt` |
| `npx oxlint` | **OK con 6 avisos, 0 errores** (exit 0): 3 `react-hooks(exhaustive-deps)`, 2 `react(purity)`, 1 `react(immutability)` → AUD-ARQ-001 | `oxlint.txt` |
| `node scripts/validate-bank.mjs` | **OK**: 450 ítems en 22 archivos; «el banco cumple las reglas»; clave A/B/C/D 162/182/161/147 | `validate-bank.txt` |
| `npm audit --omit=dev` | **OK: 0 vulnerabilidades** | `npm-audit-prod.txt` |
| `npm audit` (todo) | **3 moderadas**, solo dev: `uuid <11.1.1` (GHSA-w5hq-g745-h8pq) ← `xcode` ← `@capacitor/cli` 8.5.x. No llega a la app (no hay `uuid` en `dist/assets/*.js` ni import en `src/`) → AUD-SEG-002 (INFO) | `npm-audit-all.txt`, `npm-audit-all.json` |
| `npm run build` | **OK** (exit 0; `tsc -b && vite build`, ~0,7 s de Vite). `dist/` = 1,7 MB, 31 archivos. **Aviso**: chunk > 500 kB (`index-*.js` 1 288,73 kB, gzip 396,83 kB) → AUD-ARQ-002. No modificó archivos versionados (`git status` idéntico antes/después; `dist/` no está en git) | `build.txt`, `git-status-antes-build.txt` |
| `npm ls --depth=0` | OK, 24 paquetes, sin `UNMET`/`invalid`. Instalados por encima del rango pedido: react 19.3.0, oxlint 1.86.0, typescript 6.0.3, vite 8.3.1 | `npm-ls.txt` |

### Avisos de oxlint (detalle)

- `src/screens/Conversation.tsx:217` exhaustive-deps (`startPronunciation`, `persist`)
- `src/components/PhoneticsAlert.tsx:8` purity (`Date` en render)
- `src/screens/SettingsScreen.tsx:141` purity (`Date.now` en render)
- `src/screens/Calibration.tsx:311` immutability + exhaustive-deps (`runEval` usado antes de declararse; se llama dentro de un `.then` del efecto, así que en ejecución ya existe: probable falso positivo)
- `src/screens/Calibration.tsx:317` exhaustive-deps (ref `.current` en limpieza; en realidad se copia a `rec` en la línea 314)

## 3. Teléfono

Bloqueo `.telefono.lock` creado («B0 hh:mm») y borrado al terminar. Solo `adb devices` y `dumpsys package`.

| Dato | Valor |
|---|---|
| `adb devices -l` | `60d0718c device product:garnetp_global model:23122PCD1G` (conectado y autorizado) |
| Android | 16 |
| `versionName` / `versionCode` | **5.8 / 33** (coincide con `version.json` y `apk/Habla-v5.8.apk`) |
| `lastUpdateTime` / `firstInstallTime` | 2026-10-05 18:33:29 / 2026-09-28 19:35:48 |
| `pkgFlags` | **`[ DEBUGGABLE HAS_CODE ALLOW_CLEAR_USER_DATA ALLOW_BACKUP ]`** → DEBUGGABLE = **sí** (CDP disponible para B3/B4) |
| Firma | `signatures:[31db53d1]` (v2) |
| Permisos runtime (usuario 0) | `RECORD_AUDIO` concedido · `BLUETOOTH_CONNECT` concedido · `POST_NOTIFICATIONS` **no concedido** |
| Permisos de instalación | INTERNET, MODIFY_AUDIO_SETTINGS, RECEIVE_BOOT_COMPLETED, USE_EXACT_ALARM, VIBRATE, USE_BIOMETRIC, WAKE_LOCK (todos concedidos). Pedidos además: SCHEDULE_EXACT_ALARM (fusionado desde un plugin; no está en `AndroidManifest.xml` propio) |

Nota para otros bots: con `POST_NOTIFICATIONS` denegado, el recordatorio diario (v5.8) no se mostrará en este teléfono aunque se programe (`src/lib/reminders.ts:26,62`).

Salida completa: `dumpsys-package.txt`, `adb-devices.txt`.

## 4. Inventario de tamaño

| Carpeta | Archivos | Líneas |
|---|---|---|
| `src/lib` | 40 | 5 672 |
| `src/screens` | 14 | 6 289 |
| `src/components` | 27 | 2 672 |
| `src/ui` | 8 | 1 365 |
| `src/bank` (JSON) | 22 | 922 (588 KB) |
| `src/` total (ts/tsx/css/json) | 114 | 17 134 (sin contar JSON del banco en líneas) |
| `android/app/src/main/java` | 4 (`MainActivity`, `AudioRoutePlugin`, `DeviceAuthPlugin`, `OrientationPlugin`) | 424 |

**10 archivos más largos:** `Calibration.tsx` 1433 · `Conversation.tsx` 1044 · `ui/Mascot.tsx` 1012 · `SettingsScreen.tsx` 972 · `App.tsx` 643 · `lib/gemini.ts` 593 · `WelcomeScreen.tsx` 562 · `Home.tsx` 461 · `lib/plan.ts` 399 · `Onboarding.tsx` 314.

**10 funciones más largas** (arnés `arnes/funciones-largas.mjs`, AST de TypeScript; salida en `funciones-largas.txt`):

| Líneas | Dónde |
|---|---|
| 976 | `src/screens/Conversation.tsx:69` `Conversation` |
| 775 | `src/screens/Calibration.tsx:249` `Calibration` |
| 538 | `src/App.tsx:54` `App` |
| 515 | `src/screens/WelcomeScreen.tsx:48` `WelcomeScreen` |
| 390 | `src/screens/Home.tsx:46` `Home` |
| 378 | `src/ui/Mascot.tsx:456` (componente anónimo) |
| 264 | `src/screens/AboutScreen.tsx:36` `AboutScreen` |
| 257 | `src/screens/Onboarding.tsx:58` `Onboarding` |
| 239 | `src/screens/ReviewScreen.tsx:42` `ReviewScreen` |
| 227 | `src/screens/ProgressScreen.tsx:28` `ProgressScreen` |

El banco entero se importa con `import.meta.glob(..., { eager: true })` en `src/lib/bank.ts:105`, y no hay ningún `import()` dinámico en `src/`: todo va en un único chunk (AUD-ARQ-002).

## 5. Inventario de red (para B4)

Ninguna llamada de red en el código Java nativo. TTS (`@capacitor-community/text-to-speech`) es local.

| # | Destino | Dónde | Cómo | Credencial |
|---|---|---|---|---|
| R1 | `GET https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000` | `src/lib/gemini.ts:374-380` `listModels` | `CapacitorHttp.get` | cabecera `x-goog-api-key` (no va en la URL) |
| R2 | `POST …/v1beta/models/{model}:generateContent` | `src/lib/gemini.ts:127` (`askGeminiMeta`) → `post` `:497-515` | `CapacitorHttp.post`, connect 15 s / read 90 s | cabecera `x-goog-api-key`. Cada llamada se registra en `localStorage['habla.netlog']` (máx. 120) y `console.info('[HABLA-NET]…')` (`:486-495`) con las 50 primeras letras de la instrucción de sistema, tamaño, tokens y error (sin clave) |
| R3 | `POST https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed` | `src/lib/pronunciation.ts:152` (`assessOnce`) → `postBinary` `:76-83` | nativo: `CapacitorHttp.request` con `dataType:'file'` (`:79`); web: `fetch` (`:83`) | clave Azure en cabecera; **sube audio WAV** |
| R4 | `POST https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken` | `src/lib/pronunciation.ts:213-223` `checkAzureKey` | nativo `CapacitorHttp.request` (`:219`); web `fetch` (`:223`) | cabecera `Ocp-Apim-Subscription-Key` |
| R5 | `POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` | `src/lib/azureUsage.ts:43-48` `token` → `request` `:34-39` | nativo `CapacitorHttp.request` (`:36`); web `fetch` (`:39`) | `client_id` + `client_secret` del service principal en el cuerpo |
| R6 | `GET https://management.azure.com{resourceId}/providers/microsoft.insights/metrics?…AudioSecondsTranscribed…` | `src/lib/azureUsage.ts:64-77` `monthUsage` | idem `request` | token Bearer de R5 |
| — | Enlaces (no peticiones): `https://aistudio.google.com/apikey`, `https://portal.azure.com` | `src/screens/Onboarding.tsx:15-16` | — | — |

Salida del grep: `red-grep.txt`.

## 6. Inventario de micrófono (para B3)

Todo pasa por la clase `Recorder` de `src/lib/recorder.ts`.

**Aperturas (`getUserMedia`)**
- `src/lib/recorder.ts:125` — `Recorder.open()` (abre con `PROCESSING`, `RAW` o el micro elegido); añade a `recorders` (`:129`).
- `src/lib/recorder.ts:164` — `Recorder.fallback()` (bucle sobre micros del teléfono; para el anterior en `:163`).
- `src/lib/recorder.ts:191` — `new MediaRecorder` en `start()`.
- `src/lib/recorder.ts:79` — `AudioContext` de medición en `hasSignal` (se cierra en `:95`).

**Puntos de uso**
| Pantalla | Crea | Abre / graba | Para | Cierra |
|---|---|---|---|---|
| Conversación | `src/screens/Conversation.tsx:109` | `rec.open()` `:311` (al entrar, micro se mantiene abierto); `begin()` `:434` | `stop()` `:448`, `:481` (descarta) | `close()` `:315` (salió mientras abría), `:376`, `:408`, `:550` |
| Test de nivel (Calibración) | `src/screens/Calibration.tsx:291` | `begin()` `:495` | `stop()` `:508` | `close()` `:316` (limpieza del efecto), `:531`, `:547` |
| Repaso | `src/screens/ReviewScreen.tsx:53` | `begin()` `:117` | `stop()` `:128` | `close()` `:63` (limpieza) |
| Preguntar tema | `src/components/TopicAskPage.tsx:50` | `begin()` `:51` | — | `close()` `:41` (desmontar), `:61` |

**Liberación global y rutas de audio**
- `src/lib/lifecycle.ts:31` `releaseAllMics()` en `goBackground`, enganchado a `appStateChange` en `:51`.
- `src/lib/recorder.ts:50,63` `releaseIfIdle()` al cambiar modo de micro o en `devicechange`.
- `src/components/AudioPicker.tsx:37-45,75-77` `applyAudioMode` / `onMicOpened` (modo auriculares), y `applyAudioMode('none')` al ir a segundo plano.
- Nativo: `android/.../AudioRoutePlugin.java:220` `setCommunicationDevice`, `:227` `startBluetoothSco` (etiqueta de log `HablaAudio`).
- `src/lib/wav.ts:46,50` y `src/lib/speech.ts:14` crean `AudioContext` / `OfflineAudioContext` (decodificar/reproducir, no capturan micro).

Observación estática (HIPÓTESIS para B3, no verificada): en `Recorder.open()` si `getUserMedia` (`:125`) funciona pero luego falla `hasSignal`/`fallback` (p. ej. `getUserMedia` de `:164` lanza), el `catch` (`:144-152`) convierte el error en `MicError` sin llamar a `close()`, de modo que el stream puede quedar en `recorders` con pistas abiertas hasta el siguiente `close()`/segundo plano.

Salida del grep: `micro-grep.txt`.

## 7. Hallazgos de B0

Ver `hallazgos.md`: AUD-SEG-001 (APK distribuido debuggable con secretos en claro), AUD-SEG-002 (npm audit dev, INFO), AUD-ARQ-001 (avisos de oxlint), AUD-ARQ-002 (bundle único de 1,29 MB).
