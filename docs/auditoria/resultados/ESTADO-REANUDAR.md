# Estado de la auditoría — para reanudar (pausada el 2026-10-05 ~00:00)

## ESTADO: AUDITORÍA TERMINADA (2026-10-06 ~10:20) — informe en `INFORME.md`

## Hecho
- Fase 0: B0 línea base (commit auditado `6874443`, v5.8 build 33).
- Fase 1 (estática): B1, B2, B3, B4, B5.
- Fase 2 (dinámica, navegador + POCO): B3, B4, B5, B6, B7. Todos cerraron (Habla con force-stop, sin lock, sin forward, Vite parado).
- Llamadas reales a IA usadas: 6 de 10 (B4: 1, B6: 5). Quedan 4: B8 = 2 (+2 sin asignar). Ver `llamadas-reales.md`.

## Falta
1. **Fase 3 — B8 verificador** (`docs/auditoria/bots/B8-verificador.md`). **Decidido por el dueño: COMPLETO + prueba de bloqueo de pantalla.** B8 arrancó el 2026-10-05 ~23:55 y apunta su avance en `B8/progreso.md` (qué IDs están verificados y cuáles faltan): al reanudar, continuar desde ahí. Opciones que había:
   - Completo: todos los CRÍTICA/ALTA + muestra del resto (40–60 min).
   - Corto: AUD-MIC-301, 302, 303, 305 y AUD-FUG-401/SEG-500 (20–25 min).
   - Opcional: prueba de **bloqueo de pantalla durante la clase** (M5/M6 no probados) con ayuda del dueño (él bloquea cuando el bot lo pida; el bot muestrea `dumpsys audio`/`appops`).
2. **Fase 4 — Consolidación** (orquestador): deduplicar (ver `fase2-hipotesis.md`, sección duplicados; añadir SEG-501≈ARQ-102≈RES-704 por la pantalla negra; RES-703≈FLU-216; RES-701≈ARQ-110), severidad final, `resultados/INFORME.md` con `plantillas/informe-final.md`, resumen en el chat (5 más graves, qué se probó en teléfono, qué no).

## Cuidado al reanudar
- **Commit cambió durante la auditoría:** otra sesión del dueño hizo `16e6240` (Calibration.tsx, testDraft.ts) e instaló un APK nuevo (22:13, versionCode 33, DEBUGGABLE). B3–B5 probaron el APK anterior; B6 parcialmente; B7 el nuevo. Indicar en el informe contra qué se probó cada hallazgo. Si hay más commits/APK nuevos mañana, B8 debe registrarlo.
- **adb:** hay un segundo dispositivo (Samsung SM-A115U, forward tcp:9334 ajeno). Usar siempre `-s 60d0718c`.
- **Teléfono:** encendido, desbloqueado y con la pantalla activa durante las pruebas (CDP necesita la app en primer plano). «Accesibilidad con interruptores» activa en el POCO: Habla volvió sola a primer plano 2 veces (AUD-RES-714).
- Reglas de siempre: `REGLAS-COMUNES.md`. En la clase, «Reanudar la anterior», nunca «Empezar nueva». No crear/borrar bases de datos (`indexedDB.databases()`, nunca `indexedDB.open`). No borrar el almacenamiento de `localhost:5173` (usar un origen aislado tipo `b8.localhost:5173`).
- Arneses reutilizables: `B3/arnes/` (cdp.mjs, instr.js, sampler.sh, m4b.sh), `B4/arnes/net.js`, `B6/arnes/` (cdp6.mjs, tel6.js, WAV), `B7/arnes/`.

## Cómo reanudar
En una sesión nueva de Claude Code en `D:\My Apps\HABLA`:
`Lee docs/auditoria/ORQUESTADOR.md (reglas) y docs/auditoria/resultados/ESTADO-REANUDAR.md, y continúa la auditoría desde la fase 3 (B8 <completo|corto>) y luego la fase 4. Usa subagentes.`

## Formato del informe final (petición del dueño, 2026-10-06)
Redactar `INFORME.md` y el resumen del chat **como un Senior QA**: veredicto de salida (go / no-go) al principio, defectos por riesgo con severidad **y** prioridad, reproducibilidad y evidencia, matriz de cobertura y huecos, riesgos residuales y plan de corrección por versiones.
