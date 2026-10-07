# B8 · Progreso de la verificación (fase 3, modo COMPLETO)

Inicio: 2026-10-05 ~23:58. Commit de trabajo: `16e6240` (HEAD; auditado `6874443`). APK: ver `evidencia/dumpsys-package.txt`.
Leyenda de veredicto: REPRODUCIDO / NO REPRODUCIDO / PARCIAL / DESCARTADO / DUPLICADO. Detalle de cada uno en `verificacion.md`.

## Estado del teléfono (actualizar al tocarlo)
- Lock `resultados/.telefono.lock`: no existe (borrado).
- Forward tcp:9333: quitado.
- Habla: force-stop 10:06 (-s 60d0718c). Clase guardada del dueño intacta (siempre «Continuar mi clase», red falsa sorda, ningún turno guardado).
- Vite (`habla-dev`): PARADO 10:06 (preview_stop).

## Lista de verificación

| # | ID | Sev. original | Estado | Veredicto | Sev. propuesta | Evidencia |
|---|---|---|---|---|---|---|
| 1 | AUD-MIC-301 | CRÍTICA | hecho 00:02 | REPRODUCIDO (1/2; ventana ~0,5 s) | CRÍTICA (se mantiene; probabilidad baja) | evidencia/m301-a-*.txt |
| 2 | AUD-ARQ-100 | ALTA | hecho 00:05 | DUPLICADO de MIC-302 (reproducido) | = MIC-302 | evidencia/m302-*.txt |
| 3 | AUD-MIC-302 | ALTA | hecho 00:05 | REPRODUCIDO (1/1) | CRÍTICA (sube de ALTA) | evidencia/m302-*.txt |
| 4 | AUD-MIC-303 | ALTA | hecho 00:08 | REPRODUCIDO (sin envío: silencio) | ALTA (se mantiene) | evidencia/m303-* |
| 5 | AUD-MIC-305 | ALTA | hecho 00:10 | REPRODUCIDO (85 s capturando en reposo) | ALTA (se mantiene) | evidencia/m305-* |
| 6 | AUD-SEG-001 | ALTA | hecho 00:17 | REPRODUCIDO (CDP devuelve claves sin huella; solo resumen) | ALTA (se mantiene) | evidencia/seg001-* |
| 7 | AUD-RES-700 | ALTA | hecho 00:15 | REPRODUCIDO | MEDIA (baja de ALTA: batería = MEDIA en §6) | evidencia/res700-cpu-*.txt |
| 8 | AUD-MIC-304 | MEDIA | hecho 00:10 | REPRODUCIDO | MEDIA (se mantiene) | evidencia/m305-js.txt X1 |
| 9 | AUD-MIC-308 | MEDIA (hip.) | hecho 00:12 | REPRODUCIDO (hilo JS ocupado → captura 6 s en 2.º plano) | MEDIA (se mantiene; HIPÓTESIS→CONFIRMADO) | evidencia/m308-* |
| 10 | AUD-FUG-401 / AUD-SEG-500 | MEDIA | hecho 09:31 | REPRODUCIDO (navegador; SEG-500 duplicado) | MEDIA (se mantiene) | evidencia/nav-fug401.md |
| 11 | AUD-SEG-501 / AUD-ARQ-102 | MEDIA | hecho 09:45 | REPRODUCIDO (ARQ-102 duplicado) | MEDIA (se mantiene) | evidencia/nav-importar-plan.md |
| 12 | AUD-ARQ-104 | MEDIA | hecho 00:22 | PARCIAL (código sí; Android 16 restaura MODE_NORMAL en ~5 s) | BAJA (baja de MEDIA) | evidencia/arq104-setroute.txt |
| 13 | AUD-FLU-209 | MEDIA | hecho 09:25 | REPRODUCIDO (navegador) | MEDIA (se mantiene) | evidencia/nav-flu209.md |
| 14 | AUD-FLU-202 | MEDIA | hecho 09:55 | REPRODUCIDO (navegador, con control) | MEDIA (se mantiene) | evidencia/nav-flu202.md |
| 15 | AUD-FLU-203 | MEDIA | hecho 09:55 | PARCIAL: cierto en 6874443, corregido casi del todo en 16e6240 | BAJA (residuo en 16e6240) | diff 6874443..16e6240 |
| 16 | AUD-RES-701 / AUD-ARQ-110 | MEDIA | hecho 00:15 | REPRODUCIDO (ARQ-110 duplicado) | MEDIA (se mantiene; consolidar con RES-700) | evidencia/res700-cpu-*.txt |
| 17 | AUD-RES-704 | MEDIA | hecho 09:45 | REPRODUCIDO | MEDIA (se mantiene; consolidar con SEG-501) | evidencia/nav-importar-plan.md |
| 18 | AUD-RES-703 / AUD-FLU-216 | MEDIA | hecho 09:45 | PARCIAL (1 cadena extra con 3 vueltas) | BAJA (baja de MEDIA) | evidencia/nav-importar-plan.md |
| 19 | AUD-FLU-219 | BAJA | hecho 10:05 | REPRODUCIDO (navegador) | BAJA (se mantiene) | evidencia/nav-flu219.md |
| 20 | AUD-E2E-601 | BAJA | hecho 09:45 | REPRODUCIDO (navegador) | MEDIA (sube de BAJA: error sin recuperación) | evidencia/nav-importar-plan.md |
| 21 | AUD-ARQ-002 | BAJA | hecho 00:24 | REPRODUCIDO (estático) | BAJA (se mantiene; impacto medido pequeño) | dist/assets + RES-710 |
| 22 | Escenarios nuevos de micro/fugas (≥3) | — | hecho 00:18 (teléfono) | MIC-800 nuevo (MEDIA); N2 y N3 sin defecto |  | verificacion.md |
| 23 | Bloqueo de pantalla durante la clase (M5/M6) | — | hecho 09:54 (orquestador + dueño) | M5 OK · M6 OK (micro cerrado ≤1,3 s; nada enviado) | — | evidencia/bloqueo-M5-*, bloqueo-M6-* |

## Reanudación 2026-10-06 09:12
- `git log -1` = `16e6240` (sin cambios). APK: versionCode 33, `lastUpdateTime=2026-10-05 22:13:08` (sin cambios). Sin forward, sin lock. Vite anterior parado (por la app); se vuelve a arrancar.
