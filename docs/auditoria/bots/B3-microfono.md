# B3 · Micrófono y audio (CRÍTICO)

**Pregunta que debes responder con pruebas:** ¿Habla capta audio, o mantiene el micrófono abierto, en algún momento en que el usuario no lo está pidiendo?

Distingue siempre tres estados:
- **Abierto**: hay un `MediaStream` con pista `live` (Android enciende el indicador verde y el sistema puede estar capturando).
- **Grabando**: además un `MediaRecorder` en `recording` acumula datos.
- **Enviado**: el audio sale del teléfono (Gemini, Azure).

## Diseño actual (punto de partida, compruébalo)

- `src/lib/recorder.ts`: el stream **se abre al empezar la sesión y se mantiene abierto** (para no cortar la primera palabra); `hasSignal()` analiza el audio con un `AudioContext` durante 2–5 s al abrir; `fallback()` abre streams alternativos en bucle; `releaseAllMics()` cierra todo.
- `src/lib/lifecycle.ts`: al pasar a segundo plano (`appStateChange`, `pause`, `visibilitychange`, `pagehide`) cierra los micros y calla la voz (NC-14).
- `AudioRoutePlugin.java` / `MainActivity.java`: sueltan modo llamada/SCO en `onStop`; `pauseTimers()`.
- Pantallas que graban: `Conversation.tsx` (abre en el arranque, ~l.311), `Calibration.tsx`, `ReviewScreen.tsx`, `TopicAskPage.tsx` (dictado).

## Fase 1 — estático

1. Lista cada apertura (`getUserMedia`, `open`, `begin`) y cada cierre con archivo:línea. Para cada apertura, todos los caminos que la cierran: desmontaje del componente, error, salida a mitad, cambio de pantalla interna, fin de sesión, segundo plano.
2. Busca caminos sin cierre: excepción entre `getUserMedia` y `recorders.add(this)`; `fallback()` que lanza a mitad del bucle con un stream ya abierto; `begin()` que reintenta; `stop()` resuelto por el *timeout* de 2 s con el `MediaRecorder` aún vivo; `Recorder` creado en `useRef(new Recorder())` en cada render; pantallas que no llaman a `close()` al desmontar; vuelta de segundo plano que reabre el micro sin que el usuario pulse.
3. `hasSignal()`/`speech.ts`/`wav.ts`: ¿se analiza o guarda audio fuera de la pulsación? ¿Se almacena audio en IndexedDB, `localStorage`, caché o archivos (`savedClass`, `testDraft`, reintento `retryHasAudio`)? ¿Cuánto tiempo vive ese audio?
4. Envío: ¿qué audio va a Gemini y a Azure, cuándo, y si alguna vez se envía audio que el usuario no confirmó (reintentos automáticos, dictado, *fallback* de modelo que reenvía el audio a otro modelo)?
5. Permisos: `RECORD_AUDIO`, `BLUETOOTH_CONNECT`, `MODIFY_AUDIO_SETTINGS`; cuándo se piden y si se piden antes de hacer falta.

## Fase 2 — dinámico

Instrumenta con el envoltorio de `entorno.md` (navegador y, por CDP, teléfono) **y** observa Android de forma independiente con `dumpsys audio` / `appops` muestreados cada segundo. Escenarios mínimos (cada uno con línea de tiempo y veredicto):

| # | Escenario |
|---|---|
| M1 | Entrar en clase y no hablar durante 3 min. ¿Indicador verde todo el rato? ¿`appops` running? |
| M2 | Hablar un turno (pulsar/soltar): ¿grabación solo entre `pointerdown` y `pointerup`? |
| M3 | Salir de la clase con «atrás» del sistema, con el botón de la app y a mitad de una respuesta de Gemini. |
| M4 | Botón Inicio, cambiar de app, apagar pantalla, bloquear con clase abierta: ¿se cierra antes de 1 s? Volver: ¿se reabre solo? |
| M5 | Llamada entrante / notificación con sonido / alarma durante la clase (si no se puede provocar, simula `pause`). |
| M6 | Girar el teléfono durante clase y durante test (orientación forzada y automática). |
| M7 | Conectar y desconectar auriculares Bluetooth (soundcore Liberty 4 Pro) y con cable a mitad: `devicechange`, `fallback`, modo `headset/split/phone`. ¿Quedan streams huérfanos? ¿El modo llamada queda activo tras salir? |
| M8 | Test de nivel: tareas de habla, salir a mitad, volver al borrador. |
| M9 | Repaso y dictado de Tema libre/Debate: cerrar la hoja con el micro abierto. |
| M10 | Error de permiso (denegar y luego conceder), micro ocupado por otra app (grabadora del sistema). |
| M11 | Matar la app (`am force-stop`) durante la grabación y reabrir: ¿estado de audio de Android limpio? |
| M12 | Pantallas sin micrófono (Inicio, Ajustes, Progreso, Palabras): verificar que **nunca** aparece una apertura. |

## Salida

- `resultados/B3/mapa-microfono.md`: tabla escenario → abierto (desde/hasta) → grabando (desde/hasta) → enviado → indicador Android → veredicto.
- `resultados/B3/mic-timeline-*.txt`, capturas del indicador, trazas `__mic`/`__rec`.
- `resultados/B3/hallazgos.md` (`AUD-MIC-*`). Cualquier captura sin pulsación = CRÍTICA. «Abierto sin grabar» durante toda la clase: evalúalo como decisión de diseño (ALTA o MEDIA según duración y si el usuario lo sabe) y propone alternativas (abrir en `pointerdown` con pre-búfer, cerrar tras N s de inactividad).
