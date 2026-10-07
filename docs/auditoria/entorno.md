# Entorno de pruebas (compartido por los bots dinámicos)

## PC (Windows 11)

- Node 24: `C:\Program Files\nodejs\node.exe`. JDK 21: `C:\Program Files\Java\jdk-21`. Android SDK solo CLI en `%LOCALAPPDATA%\Android\Sdk`. El `PATH` de la sesión puede estar desactualizado: fija `JAVA_HOME`, `ANDROID_HOME` y rutas absolutas.
- adb: `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`.
- Internet lento (0,1–0,3 MB/s). Builds largos en segundo plano. Gradle: `gradlew assembleDebug --offline` funciona.
- Comprobaciones: `npx tsc -b`, `npx oxlint`, `node scripts/validate-bank.mjs`, `npm audit --omit=dev`, `npm run build`.

## Navegador (vista previa web)

- Servidor: `preview_start` con `name: "habla-dev"` (Vite en `http://localhost:5173`, ver `.claude/launch.json`). Nunca lanzar Vite con Bash.
- En web, `Capacitor.getPlatform()` es `web`: no hay plugins nativos (AudioRoute, DeviceAuth deja pasar), Preferences usa `localStorage`.
- **Micrófono falso** en el navegador: antes de entrar en una pantalla que graba, inyecta con `javascript_tool` un envoltorio de `navigator.mediaDevices.getUserMedia` que devuelva el `MediaStream` de un `OscillatorNode`/`AudioBuffer` y **registre cada apertura y cierre**:

```js
window.__mic = []; const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
navigator.mediaDevices.getUserMedia = async (c) => {
  const ctx = new AudioContext(); const osc = ctx.createOscillator(); const dst = ctx.createMediaStreamDestination();
  osc.connect(dst); osc.start(); const s = dst.stream;
  const id = window.__mic.length; window.__mic.push({ id, open: performance.now(), c: JSON.stringify(c), stack: new Error().stack.split('\n').slice(2,6).join(' | ') });
  s.getTracks().forEach(t => { const stop = t.stop.bind(t); t.stop = () => { window.__mic[id].close = performance.now(); stop(); }; });
  return s;
};
// También MediaRecorder: registrar start/stop
const MR = window.MediaRecorder; window.__rec = [];
window.MediaRecorder = class extends MR { start(...a){ window.__rec.push({start: performance.now()}); return super.start(...a) } stop(){ const r = window.__rec.at(-1); if (r) r.stop = performance.now(); return super.stop() } };
```

  Una pista sin `close` al final de un escenario = micrófono que se quedó abierto.
- **Red falsa** en el navegador: envuelve `window.fetch` para responder a `generativelanguage.googleapis.com` y `*.microsoft.com` con JSON de ejemplo y **guardar cada petición** (URL, cabeceras con la clave enmascarada, tamaño del cuerpo, si lleva audio). Así se comprueba qué datos salen sin gastar cuota.
- Clave de prueba en web: usa un valor ficticio con forma de clave (`AIzaTEST-NO-REAL-0000000000000000000`) solo con la red falsa activa.

## Teléfono (POCO 23122PCD1G, Android 16, paquete `com.shift.habla`)

- Primera conexión: el dueño acepta el aviso de depuración USB. Comprueba con `adb devices`.
- **`adb shell input` está bloqueado** (Xiaomi, INJECT_EVENTS). Se maneja la app por **Chrome DevTools Protocol**:
  1. `adb shell cat /proc/net/unix | grep webview_devtools_remote` → `webview_devtools_remote_<pid>`.
  2. `adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>`.
  3. `http://localhost:9333/json` → `webSocketDebuggerUrl` de la página; `Runtime.evaluate` para pulsar botones por texto y leer `document.body.innerText`. Script de ayuda en Node (módulo `ws` o `WebSocket` nativo de Node 24), guardado en `resultados/<bot>/arnes/`.
- Solo los APK de **depuración** permiten CDP. Comprueba cuál está instalado: `adb shell dumpsys package com.shift.habla | findstr /i "versionName flags"`.
- `am start -n com.shift.habla/.MainActivity` y `am force-stop com.shift.habla` funcionan.
- Capturas fieles: `adb exec-out screencap -p > captura.png` (la de CDP aplasta el texto).
- **Hablar sin humano:** genera WAV en inglés en el PC con PowerShell `System.Speech` (voz «Microsoft Zira Desktop», 16 kHz mono), pásalo en base64 por CDP y sustituye `window.MediaRecorder` para que grabe un `AudioBufferSourceNode` en lugar del micro. Reproducir TTS por el altavoz del teléfono no sirve (la cancelación de eco lo borra).
- Botón de hablar: `PointerEvent` `pointerdown`/`pointerup` sobre `button[aria-label="Mantener para hablar"]`.
- Logcat: desde v5.8 `loggingBehavior: 'none'`, así que `[HABLA-NET]` ya no sale; el registro de red está en Ajustes → Diagnóstico y en `localStorage` (clave del *netlog* en `src/lib/gemini.ts`). Etiqueta nativa de audio: `HablaAudio`.
- Simular errores de red/Azure: parchear `Capacitor.nativePromise` para el plugin `CapacitorHttp` (parchear `Capacitor.Plugins.CapacitorHttp.request` no llega a las llamadas de la app).
- Datos: IndexedDB `habla` (tablas `sessions`, `turns`, `mistakes`, `profile`, `lookups`, `cards`). `turns[].pronunciation` = resultado de Azure.

### Observar el micrófono desde Android (prueba independiente del JavaScript)

| Qué | Comando |
|---|---|
| Grabaciones activas por app | `adb shell dumpsys audio` → sección «RecordActivityMonitor» / «recording configurations» |
| Clientes de captura de AudioFlinger | `adb shell dumpsys media.audio_flinger` (sección «Input thread») |
| Uso del permiso | `adb shell cmd appops get com.shift.habla RECORD_AUDIO` (hora del último acceso, `running`) |
| Indicador de privacidad | `adb exec-out screencap -p` (punto verde arriba a la derecha) |
| Modo de audio y SCO | `adb shell dumpsys audio` → `mode`, `communication device`, `SCO` |
| Batería | `adb shell dumpsys batterystats --reset` antes; `adb shell dumpsys batterystats com.shift.habla` después; `dumpsys power` (wakelocks) |

Haz un **muestreo cada 1 s** de `dumpsys audio` durante cada escenario y guarda la línea de tiempo en `resultados/<bot>/mic-timeline-<escenario>.txt`.
