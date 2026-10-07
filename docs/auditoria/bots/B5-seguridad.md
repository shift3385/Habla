# B5 · Seguridad de la app (Android + web)

**Misión:** revisar la superficie de ataque de la app y de su cadena de suministro, más allá de las fugas (B4) y del micrófono (B3).

## Qué revisar

1. **Manifiesto.** Componentes exportados (`MainActivity` con `singleTask`), intents que acepta, `FileProvider` (`grantUriPermissions`, `external-path "."`), `USE_EXACT_ALARM` (¿justificado?), permisos peligrosos y cuándo se piden, `usesCleartextTraffic`, `networkSecurityConfig`.
2. **Bloqueo de claves (`deviceAuth.ts`, `DeviceAuthPlugin.java`).** Teléfono sin bloqueo → deja pasar con aviso; navegador → deja pasar; ventana de gracia de 60 s global. ¿Hay caminos para ver o cambiar una clave sin pasar por `confirmIdentity` (Diagnóstico, exportar, campo de texto que ya muestra la clave, `GeminiFix`, `AzureSettings`)? ¿Se puede leer la clave del DOM con el campo oculto?
3. **Inyección desde la IA.** Gemini devuelve texto que se pinta en la UI y se lee por TTS. Busca `innerHTML`, `dangerouslySetInnerHTML`, `href` dinámicos, `window.open`, URLs construidas con respuestas de la IA. Prueba con respuestas *mock* maliciosas (HTML, `javascript:`, textos enormes, JSON con campos extra). Inyección de *prompt* desde el usuario o desde temas con Google Search *grounding*: ¿puede un texto de la web hacer que el profe pida datos o cambie el comportamiento?
4. **Importar copia.** JSON malicioso: tablas desconocidas, `__proto__`, tipos incorrectos, 50 MB, versión futura. ¿Se valida antes de borrar los datos actuales? ¿Se puede perder todo con un archivo corrupto?
5. **WebView/CSP.** `index.html` no tiene Content-Security-Policy: evalúa el riesgo en Capacitor (origen `https://localhost`), recursos externos cargados, `@fontsource` local.
6. **Dependencias.** Resultado de `npm audit` (de B0): ¿la ruta vulnerable se ejecuta en la app? Versiones de Capacitor/plugins, `ts-fsrs`, `dexie`.
7. **Build y firma.** El APK de depuración se firma con el keystore de release (`build.gradle`): consecuencias. `minifyEnabled false`. `debuggable` del APK que usa el dueño a diario. Gestión de `keystore/keystore.properties`.
8. **Azure service principal.** `azureUsage.ts` hace *client credentials* con `scope management.azure.com/.default`: ¿qué permisos necesita realmente? Recomienda rol mínimo (lector de métricas de un solo recurso).

## Fase 2 (teléfono, con turno)

- `adb shell dumpsys package com.shift.habla` (exportados, permisos), intentos de lanzar actividades/URIs desde `adb shell am start` con datos raros.
- Probar el bloqueo de claves: ver la clave, esperar 61 s, volver; con el teléfono sin bloqueo **no** (no cambies la seguridad del teléfono: solo análisis de código para ese caso).

## Salida

`resultados/B5/hallazgos.md` (`AUD-SEG-*`) y `resultados/B5/superficie.md` (tabla de entradas a la app: origen, validación, riesgo).
