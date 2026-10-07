# B3 · Plan de pruebas dinámicas (fase 2)

Para ejecutar **en serie** cuando el orquestador lo autorice. Reglas: `REGLAS-COMUNES.md` (lock `.telefono.lock`, sin instalar APK, sin `pm clear`, sin claves en salidas, **0 llamadas reales**: B3 no tiene cupo → red de Gemini/Azure siempre con mock o sin clave/avión cuando el escenario llegue a enviar).

## 0. Instrumentación

**Navegador** (`preview_start name:"habla-dev"`, 360×780): inyectar antes de entrar en la pantalla el envoltorio de `entorno.md` (`window.__mic`, `window.__rec` con micro falso de oscilador). Añadir:
- registrar también `MediaRecorder` creados y su `state` final (`window.__rec[i].obj = this`), para detectar grabadores huérfanos (`state==='recording'` sin `stop`);
- `setInterval` que vuelque cada 1 s `__mic.filter(m=>!m.close).length` y `__rec.filter(r=>r.obj.state==='recording').length` a `window.__tl` (línea de tiempo);
- mock de red: interceptar `fetch` y `CapacitorHttp` hacia `generativelanguage`/`stt.speech` devolviendo respuestas fijas, y contar envíos (`window.__net`).
- `Recorder` interno: tras cada escenario, `__mic` abiertos sin cerrar = fuga.

**Teléfono** (CDP sobre WebView debuggable, ver memoria `phone-debugging`): mismo envoltorio inyectado por CDP **antes** de entrar en la pantalla (sin fake: micro real o el audio falso de la memoria). En paralelo, muestreo independiente de Android cada 1 s a `mic-timeline-<esc>.txt`:
```
adb shell dumpsys audio | grep -iE "recording|RecordActivityMonitor|session|mode|communication|sco"   # clientes de captura y modo
adb shell cmd appops get com.shift.habla RECORD_AUDIO                                                  # running / last access
adb shell dumpsys media.audio_policy | grep -iA3 "AudioRecord\|Input"                                  # opcional
```
Captura de pantalla del indicador verde en los momentos clave (`adb exec-out screencap -p`). `adb logcat -s HablaAudio chromium:I | grep HABLA-` para `[HABLA-MIC]`.

## 1. Escenarios mínimos (del encargo) con qué verificar

| # | Escenario | Dónde | Qué mirar / criterio de veredicto |
|---|---|---|---|
| M1 | Entrar en clase, no hablar 3 min | nav + tel | Apertura en t≈0 (antes del saludo); 0 `__rec`; `appops` running todo el rato; indicador verde → confirma/cuantifica AUD-MIC-305 |
| M2 | Un turno pulsar/soltar | nav + tel | `__rec.start` ≥ `pointerdown`, `stop` ≤ `pointerup`+2 s; un solo envío (mock) tras soltar; sin envío si se cancela deslizando ← |
| M3 | Salir: «atrás» del sistema, botón de la app, a mitad de respuesta de Gemini (mock con retardo 10 s) | nav + tel | Stream cerrado < 1 s; nada de voz después; no envío tras salir |
| M4 | Inicio / cambiar de app / apagar pantalla / bloquear con clase abierta; volver | tel (+nav con `visibilitychange`) | `appops` deja de estar running < 1 s; al volver **no** se reabre sin pulsar |
| **M4b** | **AUD-MIC-301**: 1.ª clase tras arrancar la app (o tras `devicechange`), pulsar Inicio a los 0,5–1,5 s de entrar (durante `hasSignal`), volver a los 10 s, luego Inicio de nuevo | tel + nav (ocultar pestaña) | ¿aparece una 2.ª apertura (`fallback`) sin pulsación? ¿queda micro running tras el 2.º Inicio? Si sí → CONFIRMADO CRÍTICA. Repetir 5 veces variando el momento |
| M5 | Llamada/notificación/alarma; si no, simular `pause` por CDP (`document.dispatchEvent(new Event('visibilitychange'))` con `hidden` forzado) | tel | Mismo criterio que M4 |
| M6 | Girar el teléfono en clase y en test (forzada y automática) | tel | ¿Recreación de la actividad? `__mic` cerrados/reabiertos, sin huérfanos |
| M7 | BT soundcore Liberty 4 Pro y cable, conectar/desconectar a mitad (idle y grabando); modos headset/split/phone | tel | `devicechange`→`releaseIfIdle`; streams huérfanos; `dumpsys audio` modo `MODE_IN_COMMUNICATION`/SCO tras salir de clase y **en Inicio tras volver de segundo plano** (AUD-MIC-307) |
| M8 | Test de nivel: tareas de habla, salir a mitad, volver al borrador | nav + tel | Stream abierto entre tareas (AUD-MIC-305); cerrado al desmontar; IndexedDB `habla-draft` solo tras «Ver mi nivel» (tamaño, sin volcar audio) |
| **M8b** | **AUD-MIC-302**: doble toque rápido en el micro de la tarea 1 (dos `click` por CDP con 100 ms) | nav + tel | Nº de `getUserMedia` y de `close`; tras salir del test y pulsar Inicio, ¿micro running? |
| M9 | Repaso y dictado de Tema libre/Debate: cerrar la hoja con el micro abierto | nav + tel | Cierre al desmontar |
| **M9b** | **AUD-MIC-303**: Debate → «Lo propongo yo» → dictar → flecha atrás de la página → esperar 20 s → volver y terminar (mock) | nav + tel | `__rec` sigue `recording` en el paso 1; duración del audio enviado ≈ todo el intervalo → CONFIRMADO |
| **M9c** | Doble toque en Repaso y en Dictado; «No lo sé» durante la apertura | nav | Huérfanos; estado de la UI |
| M10 | Permiso denegado y luego concedido; micro ocupado por la grabadora del sistema | tel (revocar con `pm revoke`/`appops set` **solo** RECORD_AUDIO de Habla y restaurar al final) + nav (`getUserMedia` que lanza `NotAllowedError`/`NotReadableError`) | Mensaje correcto, sin streams parciales; cuándo aparece el diálogo de permiso (al entrar en clase, AUD-MIC-313) |
| M11 | `am force-stop com.shift.habla` grabando y reabrir | tel | `dumpsys audio` limpio (sin cliente de captura, modo NORMAL) |
| M12 | Inicio, Ajustes, Progreso, Palabras, Acerca de 1 min cada una | nav + tel | `__mic` vacío; `appops` sin acceso; modo audio NORMAL (salvo AUD-MIC-307) |

## 2. Escenarios extra de esta fase estática

| # | Hallazgo | Prueba |
|---|---|---|
| X1 | AUD-MIC-304 | Clase, mantener pulsado y apoyar un 2.º dedo (tel) o 2.º `pointerdown` con otro `pointerId` por CDP (`Input.dispatchTouchEvent` con dos puntos); contar `__rec` en `recording` tras soltar |
| X2 | AUD-MIC-309 | Nav: envolver `MediaRecorder.stop` para retrasar `dataavailable` 3 s; grabar dos turnos seguidos; comprobar si el 2.º blob contiene dos cabeceras EBML (`1A45DFA3`) |
| X3 | AUD-MIC-310 | Mock que devuelva 503 a Gemini: contar envíos del mismo audio (esperado ≤5) y a qué modelos; con fonética activa (mock Azure), contar envíos a Azure en turno con «no te he entendido» y en «Reenviar» |
| X4 | AUD-MIC-312 | Modo bloqueado sin fonética: dejar 3 min; ver que no hay tope |
| X5 | AUD-MIC-308 | Tel: con clase abierta, bloquear el hilo JS (bucle de 3 s por CDP) y pulsar Inicio en ese momento; ¿se cierra el micro? ¿qué hace `WebView.onPause()`? |

## 3. Salidas esperadas

`mapa-microfono.md` completo (indicador y veredicto por fila), `mic-timeline-M*.txt`, `evidencia/` con capturas del indicador y volcados `__mic`/`__rec`/`__tl`, y actualización de estado (CONFIRMADO/DESCARTADO) en `hallazgos.md`. Orden sugerido por riesgo: M4b, M8b, M9b, M4, M1, M12, M7, M3, M2, X1, M10, M11, M5, M6, M8, M9, X2–X5.
