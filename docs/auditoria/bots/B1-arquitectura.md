# B1 · Arquitectura (solo lectura)

**Misión:** describir la arquitectura real (no la deseada) y señalar los puntos donde el diseño provoca o facilitará fallos.

## Qué revisar

1. **Capas y dependencias.** Dibuja (Mermaid) el grafo `screens → components → lib → plugins nativos`. Busca ciclos de importación, `lib/` que dependa de UI, pantallas gigantes (`Calibration.tsx` ~1400 líneas, `Conversation.tsx` ~1000, `SettingsScreen.tsx` ~970): ¿qué responsabilidades mezclan?
2. **Estado y navegación.** Cómo navega `App.tsx` (¿máquina de estados propia, sin router?). Estado global vs local, `useRef` con recursos (Recorder), efectos con limpieza incompleta, condiciones de carrera al desmontar (`gone()`, `started.current`), doble montaje en StrictMode.
3. **Modelo de datos.** `src/lib/db.ts`: tablas, índices, migraciones Dexie v1→v3; ¿qué pasa al importar una copia antigua o de una versión futura (`backup.ts`, `VERSION`)? ¿Hay datos que viven fuera de IndexedDB (Preferences, `localStorage`: *netlog*, cuota, caché de Azure, `habla.adviceCursor`) y que la copia no recoge o que deberían borrarse?
4. **Recursos de sistema.** Propiedad y ciclo de vida de: `MediaStream`, `MediaRecorder`, `AudioContext` (`speech.ts`, `wav.ts`, `recorder.ts hasSignal`), TTS, listeners de Capacitor (`addListener` sin `remove`), temporizadores. Señala cada recurso sin dueño claro.
5. **Capa de IA.** `gemini.ts`: reintentos, *fallback* de modelo, cuota 429 persistida, timeouts, `AbortSignal`, validación del JSON devuelto contra el esquema. ¿Qué pasa si Gemini devuelve JSON válido pero con campos inesperados o texto malicioso?
6. **Plugins nativos.** `AudioRoutePlugin`, `DeviceAuthPlugin`, `OrientationPlugin`, `MainActivity`: hilos, estados que quedan si el JS muere, `handleOnStop`, compatibilidad con SDK < 31.
7. **Configuración de build.** `android/app/build.gradle` (`minifyEnabled false`, firma de debug con el keystore de release, copia del APK), `variables.gradle`, `capacitor.config.ts`.
8. **Deuda y pruebas.** No hay tests automatizados: propone qué módulos puros (`placement`, `levels`, `bank.checkShort`, `srs`, `fluency`, `plan`) merecen tests primero.

## Salida

- `resultados/B1/arquitectura.md`: diagrama, tabla de módulos (responsabilidad, tamaño, dependencias, riesgos) y tabla de recursos de sistema (quién abre, quién cierra, en qué caminos puede quedar abierto).
- `resultados/B1/hallazgos.md` (`AUD-ARQ-*`). Las sospechas sobre micro o fugas se anotan como `HIPÓTESIS` y se pasan a B3/B4 a través del orquestador.
