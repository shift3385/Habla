# B6 · POCO 23122PCD1G (Android 16) · recorrido P1 no destructivo con 5 llamadas reales

Arnés: `../arnes/cdp6.mjs` (CDP, `-s 60d0718c`, puerto 9333) + `../arnes/tel6.js` (bloquea TODA petición a Gemini/Azure
salvo las habilitadas una a una; micro sintético que NO abre el micro real y reproduce `turno1.wav` / `turno2.wav`,
voz Zira 16 kHz) + `../arnes/estado6.js` (resumen sin valores). Lock `.telefono.lock` «B6 2026-10-05 22:35» → borrado 22:47.
Datos personales del dueño (nombre, textos de sus clases) no se copian aquí.

## Estado del APK (importante)

- A las 22:03 el POCO tenía `lastUpdateTime=2026-10-05 18:33:29` (build 33 auditado). Al terminar (22:46): **`lastUpdateTime=2026-10-05 22:13:08`**, `versionCode=33`. Alguien instaló encima otro APK a las 22:13 (el `apk/Habla-v5.8.apk` recompilado a las 22:02 con el cambio del test de nivel, hoy commit `16e6240`). No fui yo (regla: no instalar).
- Cuando abrí la app (22:36) ya estaba en marcha desde ~22:14 y la clase guardada tenía `savedAt` 22:14 (antes de que yo cogiera el lock).
- El diff de `16e6240` solo toca `Calibration.tsx` y `testDraft.ts`: los flujos que probé (clase, ideas, consulta, Palabras, Repaso, Progreso, Ajustes, Plan) no cambian.

## Resultados

| Paso | Resultado |
|---|---|
| Inicio | «Clase en progreso · …», «LECCIÓN DE HOY · SEMANA 1 DE 12» (hay plan guardado: no se pidió plan; 0 peticiones). `tel-01-inicio.png` |
| «Continuar» (reanudar) | Pantalla «Preparando tu clase · Buscando vocabulario» ~2 s y la clase vuelve con sus 11 respuestas y notas de pronunciación. 0 peticiones. |
| **B6-1/B6-2** turno real 1 (WAV 9,4 s, pulsado 10,5 s) | Gemini 3.8-flash 200 en 5,6 s · Azure STT 200 en 5,0 s (en paralelo). Transcripción literal correcta («…Yesterday I cook… they really enjoys it.»), 2 correcciones («Yesterday I cook → …cooked», «they really enjoys it → …enjoyed it»), `turns[].pronunciation` {accuracy 93, fluency, completeness, prosody, words}, `audioSeconds 10,4`, `speechSeconds 8,3`; TTS `speak` (148 car.). `turns` 50 → 52. `tel-02-turno-real.png` |
| **B6-3** turno real 2 + «Inicio» de Android en «Pensando…» (E2E-015) | Gemini 200 en 3,6 s con la app ya oculta (`doneHidden:true`). **Ningún `TextToSpeech.speak` en segundo plano**; el micro se cerró al ocultarse (`stop` a +0 s). Al volver (35 s después): `speak` (135 car.) con la app visible. Azure bloqueado por el arnés (500) → «Sin nota de pronunciación: Azure no pudo evaluar la pronunciación.» sin tocar ajustes. → AUD-FLU-215 DESCARTADO para la clase en el APK. |
| **B6-4** «¿Qué digo?» (E2E-018) | gemini-3.5-flash-lite 200 en 2,2 s, 3 ideas EN/ES; no se leen solas; tocar una idea → `speak` (63 car.). |
| **B6-5** tocar «healthier» en la réplica del profe | flash-lite 200 en 2,0 s; hoja con significado en contexto, ejemplo, otros significados, colocaciones; `lookups` 1 → 2 (`query healthier`, `headword healthy`, `saved:false`). «Cerrar» la cierra. Atrás de Android: no se puede inyectar (INJECT_EVENTS); por código `Conversation.tsx:577` cierra la hoja. |
| E2E-012/015 segundo plano | `am start …HOME`: micro cerrado al ocultarse; al volver la UI no queda «grabando». |
| **E2E-014** matar en segundo plano | `HOME` → `am kill com.shift.habla` (pid desaparece) → abrir → «Welcome back» → «¡Hola de nuevo! Dejamos una clase a medias: «…» (13 respuestas, lunes, 22:42). ¿La seguimos?» → «Continuar mi clase» → 13 respuestas, la última es la del WAV 2. **OK**. `tel-04-hola-de-nuevo.png` |
| «Salir y guardar la clase» | Inicio con «Clase en progreso»; micro cerrado. |
| Palabras | Historial 2 (incluye la consulta nueva), Guardadas 0. 0 peticiones. |
| Progreso | Errores 36 (incluye las 2 correcciones de mis turnos), Sesiones 3, **«Hoy 0 / 15 min · Semana: 0 min»** pese a 2 respuestas habladas hoy en la clase en curso → AUD-E2E-605. `tel-05-progreso.png` |
| Repaso | «1 de 14 · ¿Cómo se dice en inglés?…»; el micro NO se abre al entrar (solo al tocar «Responder»). Salí con «Salir del repaso» sin calificar. |
| Ajustes / Nivel | Nivel A2, «Nuevo test el 31 oct». Sin revelar claves. |
| Ajustes → Modelos | Al abrirlo la app pide sola `models?pageSize=1000` (bloqueado por el arnés → 503; los modelos elegidos no cambiaron). Los campos de clave tienen `value.length 0` (no están en el DOM). |
| Mi plan | Semana 1 de 12, 0 de 60 lecciones, «Adaptado a tu último re-test el 3 oct.». 0 peticiones. |

`habla.netlog`: 82 → 86 entradas (las 4 de Gemini reales). Peticiones bloqueadas por el arnés: 1 (lista de modelos).
Final: `am force-stop`, `adb forward --remove tcp:9333`, lock borrado. `../evidencia/tel-estado-final.json` (sin valores).

## Cambios en los datos del dueño

- Clase guardada (sesión 10): +2 respuestas (voz sintética: comida/pasta, tacos) y +2 réplicas → 13 respuestas; +2 errores en `mistakes` («Yesterday I cook», «they really enjoys it»); 1 nota de Azure.
- `lookups`: +1 («healthier», no guardada).
- `habla.netlog`: +4 entradas. Nada borrado; ni claves, ni perfil, ni plan tocados.

## Nota del arnés

Con el micro sintético, al reanudar la clase la app abrió y cerró `getUserMedia` cada ~2 s (4 veces) hasta el primer turno. No se ve con el micro real (B3 no lo registra): probablemente reacción de la app a una pista clonada sin datos; no se reporta como hallazgo.
