# Hallazgos del orquestador (rango 900–999)

### AUD-FLU-900 · Recordatorio sin permiso de notificaciones: falla en silencio y sin camino de vuelta

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS (estático; en el POCO el permiso `POST_NOTIFICATIONS` está denegado según B0 y no hay alarmas de Habla según B7 — falta comprobar si `reminderOn` está activo y que el Inicio no avisa)
- **Probado en:** estático (commit `16e6240`)
- **Dónde:** `src/lib/reminders.ts:22-31` (`askNotificationPermission`), `src/lib/reminders.ts:84-85` (`syncReminders` sale sin aviso), `src/screens/SettingsScreen.tsx:442-458, 504-508`, `src/App.tsx:251`
- **Qué pasa:** el permiso solo se pide al activar el interruptor en Ajustes → Meta. Al arrancar, `syncReminders` comprueba el permiso y, si no está concedido, vuelve sin programar nada ni avisar. El aviso rojo solo existe dentro de Ajustes → Meta. Si Android ya lo denegó (`display: 'denied'`), no se puede volver a pedir y la app solo muestra una ruta escrita a mano («Ajustes → Apps → Habla → Notificaciones»), que no coincide con la de HyperOS («Aplicaciones → Administrar aplicaciones»). No hay botón que abra los ajustes de la app ni ninguna guía sobre las restricciones de Xiaomi (ahorro de batería, inicio automático), que pueden cancelar alarmas.
- **Por qué importa:** el usuario cree tener el recordatorio activo y no le llega nunca; no hay señal en el Inicio ni en la mascota.
- **Cómo reproducir:**
  1. Activar «Recordatorio diario» y conceder el permiso.
  2. Quitar el permiso de notificaciones desde Ajustes de Android.
  3. Abrir Habla y quedarse en el Inicio; esperar a la hora del aviso.
- **Esperado:** aviso visible (Inicio o mascota) de que el recordatorio no puede llegar, con un botón que abra los ajustes de notificación de Habla.
- **Obtenido (por código):** ninguna señal fuera de Ajustes → Meta; ninguna alarma programada (`dumpsys alarm` sin entradas de Habla, B7).
- **Evidencia:** `B0/dumpsys-package.txt` (POST_NOTIFICATIONS denegado), `B7/evidencia/07-alarmas-audio.txt` (sin alarmas de Habla).
- **Causa raíz:** el estado del permiso solo se consulta en la página de Ajustes; `syncReminders` lo trata como «no pasa nada».
- **Propuesta de corrección (petición del dueño: «si no los tiene, que los pida al teléfono»):**
  1. Al arrancar, si `reminderOn` y el permiso no está concedido, **pedirlo** con `requestPermissions()` (aparece el diálogo de Android) en un momento con contexto, con una explicación previa de la mascota.
  2. Si Android ya no muestra el diálogo (denegado dos veces → `denied`), **llevar al usuario a la pantalla de notificaciones de Habla** con un botón (intent `ACTION_APP_NOTIFICATION_SETTINGS` mediante un plugin nativo pequeño) y volver a comprobarlo al regresar a la app.
  3. Aviso visible en el Inicio o en la mascota mientras el recordatorio esté activo y sin permiso.
  4. En Xiaomi, una línea de ayuda sobre ahorro de batería («Sin restricciones») e inicio automático.
- **Relacionado con:** AUD-FLU-217 (los avisos se acaban a los 7 días si no se abre la app), AUD-SEG-507 (`USE_EXACT_ALARM`).

## Pruebas del orquestador con el dueño (2026-10-06)

- **N-01 · Aviso de prueba del recordatorio** (09:49): tras conceder POST_NOTIFICATIONS y pasar Habla a «Ahorro de batería: sin restricciones», el dueño activó «Recordatorio diario» en Ajustes → Meta diaria, pulsó «Probar el aviso» y bloqueó el teléfono → **la notificación de la mascota llegó**. OK. (Inicio automático de Xiaomi seguía «ignore» en appops a las 09:5x; el aviso llegó igualmente porque era a 5 s con la app recién usada. El aviso diario real, con la app cerrada horas, sigue sin probar.)
- **Cambio de configuración del teléfono durante la auditoría:** B3–B8 probaron con Habla en «Ahorro de batería» (restringida en segundo plano); desde hoy ~09:50 está «sin restricciones», notificaciones concedidas y recordatorio activado.
- **N-02 · M5 bloqueo de pantalla con la clase en reposo** (09:36, con «Ahorro de batería»): micro cerrado ~1,3 s tras el bloqueo (`habla_in` 1→0, appops `no`), MODE_NORMAL a los ~3,6 s; al desbloquear no se reabre; red: nada. **OK**. Evidencia: `B8/evidencia/bloqueo-M5-*.txt`.
- **N-03 · M6 bloqueo de pantalla grabando** (09:52, «sin restricciones»): botón pulsado por CDP; al bloquear (09:52:08) `rec stop` + `track stop`, micro cerrado en ~1 s, MODE_NORMAL a los ~2,7 s; al desbloquear no se reabre, UI no queda «grabando», `net` vacío (no se envió nada). **OK**. Evidencia: `B8/evidencia/bloqueo-M6-*.txt`. Arnés por fases: `B8/arnes/fase-a.sh`, `espera-bloqueo.sh`, `fase-c.sh`.
- M5 no se repite con «sin restricciones»: M6 (caso más exigente) ya pasa en ese modo y el cierre lo hace la app por `visibilitychange`, no el ahorro de batería.
- **N-04 · Segundo plano 10 min con «sin restricciones»** (09:55–10:05): clase reanudada → Inicio de Android. App 124 ticks en 10 min (≈0,2 % de un núcleo), renderer 197 ticks (casi todo en el min 1) → 0 %/min desde el min 3; **0 wakelocks**, micro cerrado (`habla_in=0`, appops `no`) y **MODE_NORMAL** todo el tramo (esta vez sí el modo de audio, no el de timbre); Habla no volvió sola a primer plano. **OK**: el resultado de B7 (AUD-RES-702 descartado) vale también sin restricciones. Evidencia: `ORQ/evidencia/fondo-sin-restricciones.txt`, arnés `ORQ/arnes/fondo-orq.sh`.
- **N-05 · AUD-MIC-800 reproducido de nuevo** al abrir esa clase (habitación en silencio): 3 aperturas de `getUserMedia` en ~19 s (#0 → stop → #1 → stop → #2 en vivo) antes de quedar fijo. Evidencia: `ORQ/evidencia/fondo-js-inicio.txt`.
