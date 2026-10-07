# B8 · Punto 23 — Prueba de bloqueo de pantalla durante la clase (M5/M6)

**Estado:** pendiente — requiere al dueño. Preparado el 2026-10-06. No ejecutar sin el dueño delante del teléfono.

## Qué se quiere saber
Si al **bloquear la pantalla** (botón de encendido) con una clase abierta el micrófono se cierra igual que al pulsar Inicio (NC-14), o si sigue capturando (con la pantalla apagada `visibilitychange`/`pause` podrían llegar tarde o no llegar; `MainActivity.onStop` sí debería dispararse).
- **M5:** clase reanudada en reposo (micro abierto por diseño, AUD-MIC-305) → bloquear 60 s → desbloquear.
- **M6:** clase reanudada con el botón de hablar pulsado (grabando) → bloquear 60 s → desbloquear. ¿Se descarta la grabación? ¿Se envía algo al volver? (red falsa «sorda»: nunca sale nada ni se guarda ningún turno).

## Requisitos
- POCO conectado por USB (`adb -s 60d0718c`), desbloqueado, Habla cerrada. Sin `resultados/.telefono.lock`.
- La clase guardada del dueño se **reanuda** («Continuar mi clase»); nunca «Empezar nueva». Red falsa activa (`inject8.sh`): 0 llamadas reales.
- Unos 3 min por escenario.

## Procedimiento exacto (desde Git Bash en `docs/auditoria/resultados/B8`)
1. `sh arnes/bloqueo.sh M5 evidencia`
   - s 0–10: el script abre Habla y entra en la clase (no tocar nada).
   - **~s 25: aparece «>>> DUEÑO: PULSA AHORA EL BOTÓN DE ENCENDIDO»** → el dueño pulsa una vez el botón de encendido (pantalla apagada y bloqueada). No tocar más.
   - **~s 85: aparece «>>> DUEÑO: DESBLOQUEA AHORA»** → el dueño desbloquea con huella/patrón y deja Habla delante (no tocar dentro de la app).
   - ~s 110: termina solo (force-stop, quita el forward y el lock).
2. Esperar 1 min y repetir con `sh arnes/bloqueo.sh M6 evidencia` (mismas señales; aquí el script mantiene pulsado el botón de hablar por CDP antes de pedir el bloqueo).

## Qué mirar después
- `evidencia/bloqueo-M5-timeline.txt` / `bloqueo-M6-timeline.txt`: desde la primera línea con `mWakefulness=Asleep` (o `Dozing`), `habla_in` debe pasar a 0 y `appops=no` en ≤ 2 s, y `Actual mode = MODE_NORMAL`. Si `habla_in=1` o `appops=running` siguen >5 s con la pantalla apagada → hallazgo nuevo (CRÍTICA por §6).
- `evidencia/bloqueo-M*-js.txt`: `track stop` con `hidden=true` al bloquear; en M6, `rec stop` al bloquear y **ninguna** entrada en `net` al desbloquear; la UI no debe quedarse «grabando».
- Al desbloquear (pantalla de bloqueo visible pero app detrás) Habla no debe reabrir el micro hasta que el usuario pulse.
