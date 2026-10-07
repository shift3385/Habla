# B3 · Mapa del micrófono — BORRADOR ESTÁTICO (fase 1)

Derivado solo de la lectura del código (commit `6874443`). Las columnas «indicador Android» y «veredicto» se rellenan en la fase 2 (`plan-dinamico.md`).
Estados: **Abierto** = `MediaStream` con pista `live`; **Grabando** = `MediaRecorder` en `recording`; **Enviado** = sale del teléfono.

## Aperturas y cierres en `src/lib/recorder.ts`

| Operación | Línea | Efecto |
|---|---|---|
| `open()` → `getUserMedia` | :125 | abre stream; `recorders.add` :129 |
| `hasSignal()` | :76-97 | `AudioContext` analiza 2 s (5 s en modo auriculares) en memoria; se cierra en :95 |
| `fallback()` → `getUserMedia` en bucle | :163-164 | para el anterior y abre otro por cada micro del teléfono + «sin procesado»; **no** hace `recorders.add` |
| `start()` → `new MediaRecorder` | :191-195 | empieza a grabar (24 kbps) |
| `begin()` | :200-215 | `open()`+`start()`; reintenta una vez con `close()`+`open()` |
| `stop()` | :218-241 | para el grabador; se resuelve con `onstop` o a los 2 s; **no cierra el stream** |
| `close()` | :243-253 | para grabador y pistas; `recorders.delete` |
| `releaseIfIdle()` | :114-116 | `close()` si no graba (al cambiar modo de micro :50 o en `devicechange` :63) |
| `releaseAllMics()` | :71-73 | `close()` de todo lo que esté en `recorders` (segundo plano) |

## Por pantalla

| Pantalla / escenario | Abre stream | Graba | Para de grabar | Cierra stream | Enviado | Riesgos (IDs) |
|---|---|---|---|---|---|---|
| **Clase** (`Conversation.tsx`) | Al montar, `rec.open()` :311 (antes del tema y del saludo, con la pantalla de preparación) | `pointerdown` en `TalkButton` → `onPress` → `begin()` :434 | `pointerup`/`pointercancel` → `onRelease` → `stop()` :448; deslizar ← → `onCancel` :481; auto a 60 s con fonética (`TalkButton.tsx:69-76`); modo bloqueado: toque en ➤ | Desmontaje :376; «atrás»/salir `leave` :408; «Terminar» `finish` :550; segundo plano `releaseAllMics`; salió mientras abría :315 | Gemini (`teacherTurn`, hasta 5 intentos) tras soltar y si `analyzeSpeech` ve voz; Azure (WAV 16 kHz ≤60 s) en paralelo si fonética activa; «Reenviar mi audio» manual | 301, 304, 305, 309, 310, 312 |
| Clase tras volver de segundo plano | No se reabre sola (salvo 301) | Siguiente pulsación reabre en `begin()` | idem | idem | idem | 301, 302 (multi-toque) |
| Clase, error de preparación | Abierto | — | — | Solo al salir | — | 305 |
| **Test de nivel – habla** (`Calibration.tsx`) | Primer toque en el micro → `begin()` :495 | idem | Segundo toque → `stop()` :508 | `finish()` :547 («Ver mi nivel»); desmontaje :316; error al procesar :531. **Sigue abierto entre tareas** | Gemini `assessSpeakingTask` justo tras cada grabación (:525) y `evaluateSpeaking` al final; audio en IndexedDB `habla-draft` hasta evaluar con éxito | 302, 305, 311, 312 |
| **Repaso** (`ReviewScreen.tsx`) | Primer toque → `begin()` :117 | idem | Segundo toque → `stop()` :128 | Solo al desmontar :63 (abierto entre tarjetas) | Gemini `evaluateDrill` :136 | 302, 305, 312 |
| **Dictado Tema libre / Debate** (`TopicAskPage.tsx`) | Toque → `new Recorder()` + `begin()` :50-51 | idem | Toque → `stop()` :60 | Justo después `close()` :61; desmontaje :41. **No** al volver del paso 2 al 1 | Gemini `dictate` (modelo rápido, hasta 5 intentos) | 302, 303, 312 |
| Segundo plano (cualquier pantalla) | — | — | `close()` para el grabador | `releaseAllMics()` (`lifecycle.ts:31`) vía `appStateChange`/`pause`/`visibilitychange`/`pagehide`; nativo suelta SCO/modo llamada (`AudioRoutePlugin.java:70`), no la captura | — | 301, 308 |
| Auriculares conectados/desconectados | `devicechange` → `releaseIfIdle` (cierra si no graba) | — | — | idem | — | 307 |
| Inicio, Ajustes, Progreso, Palabras, Acerca de | **Ninguna apertura en el código** (único `getUserMedia` es `recorder.ts`) | — | — | — | — | 307 (modo llamada sin micro) |
| TTS (`tts.ts`), `speech.ts`, `wav.ts` | No capturan (reproducción y decodificación en memoria) | — | — | — | — | — |

---

## Resultado dinámico (fase 2) · escenario → abierto → grabando → enviado → indicador Android → veredicto

Teléfono = POCO Android 16, APK v5.8 build 33, micro real, red falsa. «Abierto» medido por CDP (`track.readyState`) **y** por Android (`audio_policy` con uid 10410 + `appops RECORD_AUDIO running`). Horas del teléfono.

| Escenario | Abierto (desde → hasta) | Grabando | Enviado | Indicador / Android | Veredicto |
|---|---|---|---|---|---|
| M1 clase en reposo 3 min (tel) | entrar 20:47:45 → Inicio 20:50:48 (3 min) | nunca | nada | punto verde; `running`; `MODE_IN_COMMUNICATION` todo el rato | Diseño ALTA (AUD-MIC-305) |
| M2 un turno (tel) | ya abierto (reabierto al pulsar tras segundo plano) | `pointerdown` +0,5 s (reapertura) → `pointerup` +2 ms | tras soltar: Gemini 18 KB y Azure WAV ~98 KB en paralelo | — | OK; Azure recibe audio aunque Gemini no oiga voz (310) |
| M4 Inicio con clase abierta (tel) | se cierra en ≈1–2 s | — | — | `Inputs(0)`, `MODE_NORMAL`; al volver no se reabre | OK |
| **M4b Inicio durante la apertura (tel)** | #0 cerrado; **#1 abierto solo al volver** y sigue tras el 2.º Inicio | — | — | 2.º segundo plano: `running` ~5 s con la app oculta, luego silenciado pero asignado; al volver `running` sin pulsar | **CRÍTICA CONFIRMADA (301)** |
| M9 dictado normal (tel) | tocar → tocar | igual | Gemini (dictado) | punto verde mientras dicta | OK |
| **M9b Debate, atrás al paso 1 (tel)** | 20:36:50 → 20:37:35 | **45 s, 42 s fuera del dictado** | **158 KB a Gemini** (interceptado) al terminar | punto verde en «¿Quién elige el tema?» | **ALTA CONFIRMADA (303)** |
| **M9c doble toque en dictado (tel)** | #1 huérfano hasta `force-stop` | #1 grabando en el Inicio de la app | #2 (9 KB) | en segundo plano asignado/silenciado; al volver `running` | **ALTA CONFIRMADA (302)** |
| Repaso tras grabar (tel) | 1.er toque → salir (49 s tras parar) | entre toques | Gemini 9 KB | `running`, `MODE_IN_COMMUNICATION` | Diseño (305) |
| **X1 segundo dedo en clase (tel)** | toda la clase | **#1 huérfano grabando** tras soltar | solo #2 | — | **MEDIA CONFIRMADA (304)** |
| M11 `force-stop` grabando (tel) | → +3 s | → corte | — | `Inputs(0)`, `MODE_NORMAL` | OK |
| M12 Inicio/Palabras/Progreso/Ajustes (tel) | nunca | — | — | `Inputs(0)` | OK |
| M10 permiso denegado / micro ocupado (nav) | — | — | — | mensaje correcto, 1 / 2 intentos | OK |
| M5, M6, M7, M8/M8b, X2–X5 | no probados (acción física, ajustes del sistema, auriculares o test obligatorio con datos reales) | | | | pendiente |
