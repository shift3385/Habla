# Pruebas pendientes (todas las versiones abiertas)

> **Decisión del dueño (2026-10-21):** por ahora **no se hace ninguna de estas pruebas**. Quedan aquí como pendientes,
> en un solo sitio, para retomarlas cuando él lo diga. Mientras tanto se trabaja en el **modo ligero** de la 5.11
> (`docs/v5.11/rendimiento/EVALUACION.md`) y en el **debate de la boca/lengua en Sonidos** (`docs/v5.11/sonidos-boca/DEBATE.md`).
> Cada fila apunta a la lista detallada; no se duplican aquí los pasos.

Casi todas necesitan el **POCO X6 del dueño** (y algunas sus auriculares soundcore Liberty 4 Pro, su voz o su clave real).
Desde una sesión en la nube solo se puede revisar código y documentación.

## 5.11 «Motivación» + «Sonidos» (rama `v5.11`, build 42) — aprobada en PC, falta el teléfono
Lista completa: `docs/v5.11/REVISION.md` § «Regresión final 5.11» y `docs/v5.11/ESTADO.md` (filas S-00 y MOV).

| Prueba | Qué falta | Necesita |
|---|---|---|
| Instalar el APK debug | `apk/Habla-v5.11-debug.apk` (con pausas y retoques) **sin instalar**: `adb -s 60d0718c install -r` | PC + POCO |
| F0-1 / F0-1b | Escuchar los 24 audios de Wikimedia (`public/sounds/`) en el WebView del POCO | Dueño (oído) |
| F0-4 | 20 palabras con Azure (`docs/pruebas/regresion-5.10/arnes/f0-azure.js`): umbrales de M-11/S-06 y fixtures reales | Dueño (voz) + clave de Azure |
| F0-5 | Letras y pares mínimos con la voz en-US (y con Leo); `ttsText` de las letras | Dueño (oído) |
| PAU | Pausas al leer: explicación del Present Simple y clase de Gramática | Dueño (oído) |
| Micro real | Sonidos («Dilo tú») y Repaso (regla 9) | Dueño (voz) |
| M-06 | Variedad del profe con Gemini real | Clave real |
| M-03 | CPU de la celebración de logros | `cpu.sh` |
| M-09 | Recordatorio diario variado día a día | Varios días |
| S-08 / S-11 | Audio suelto ≤ 300 ms, Bluetooth, hoja de Sonidos abierta durante una grabación | Auriculares |
| Release | APK release, aprobación del dueño y fusión | Dueño |

## 5.10.1 (rama `v5.10.1-correcciones`, build 41) — sin release ni fusión en `main`
Lista completa: `docs/pruebas/regresion-5.10/MOVIL-5.10.1.md` (T1–T22) y `MOVIL.md`.
Además: **confirmar el cambio del dueño en el Present Simple** (`src/grammar/tenses.json`) para llevarlo a la 5.10.1;
release 5.10.1 sobre la app diaria (`install -r` sobre la 5.10) y **fusión en `main`**.

## 5.10 · observaciones de uso real (P2–P7, P3b, P4b) — entregadas en las builds 39–40
Detalle: `docs/v5.10/PLAN-uso-real.md`. Varias ya están cubiertas por T9–T14 de la 5.10.1.

| Punto | Qué falta comprobar en el POCO |
|---|---|
| P7 | `adb logcat \| findstr HABLA-MIC`: cuánto tarda el micro; «Abriendo el micro… espera», vibración, no se pierden palabras (= T2) |
| P6 | Idea con ⏸ mientras suena; grabar después no envía la idea (= T10) |
| P3b | Clase de Gramática con errores a propósito: los corrige todos y no dice «Spot on» si hay fallos |
| P4b | Explicación del Present Simple: español pausado, inglés con voz inglesa (= T13/T14) |
| P2 | Música de otra app: baja cuando habla el profe y se pausa al grabar (= T11) |
| P5 | Una corrección con dos «📘» |

## 5.9.1 — abierta
- **E3:** al desconectar los auriculares Bluetooth la app no vuelve al micro del teléfono. Reproducirlo en el POCO con
  «Habla debug» y los auriculares del dueño (`docs/correccion/NC-v5.9.1.md` §E3). Puede que la 5.10.1 lo haya
  cambiado (T2–T6): comprobarlo junto con esas pruebas.

## Preguntas abiertas al dueño (no son pruebas, pero bloquean partes de la 5.11)
De `docs/v5.11/PLAN.md` §10: (1) el Galaxy A11 de la madre para F0-5, (2) qué hacer con los sonidos sin audio americano,
(3) nombre de la 5.11.x.
