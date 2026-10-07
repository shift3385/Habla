# Corrección de la auditoría v5.8 — estado para reanudar

> **Si se corta la sesión** (límite de consumo, cierre): abre Claude Code en `D:\My Apps\HABLA` y escribe
> `Lee docs/correccion/ESTADO.md y continúa la orquestación de la corrección (desarrollo + revisión).`
> Este archivo es la ÚNICA fuente de verdad del avance. Los agentes lo actualizan al terminar cada tarea.

## Decisiones del dueño (2026-10-06)
- Alcance: **v5.8.1 «Micrófono seguro» (P0) + v5.8.2 «Claves, datos y consumo» (P1)** del `docs/auditoria/resultados/INFORME.md` §8.2 y §8.3. La 5.9 queda fuera (MIC-305 sin decidir).
- **Nada de commits ni push** hasta que el dueño apruebe cada commit en el chat. Al aprobar el revisor una versión, se guarda un parche (`docs/correccion/vX.patch`) y se propone el mensaje de commit.
- Teléfono **no disponible** ahora: revisión en PC (código, tipos, lint, tests, navegador Vite, compilación). La prueba en el POCO la hará luego el **revisor móvil** (`docs/correccion/REVISOR-MOVIL.md`).
- Guardar el avance continuamente (este archivo + NC + revisiones) para no perder nada.

## Roles
| Agente | Archivo que escribe | Qué hace |
|---|---|---|
| Orquestador (sesión principal) | este archivo (tabla de avance) | Reparte tareas, pasa NC del revisor al desarrollador, decide cuándo una versión está lista |
| `dev` — desarrollo | `src/`, `android/`, `tests/`, `NC-v5.8.1.md`, `NC-v5.8.2.md` | Implementa cada tarea y corrige las NC del revisor |
| `rev` — revisión en PC | `REVISION-v5.8.1.md`, `REVISION-v5.8.2.md` | Revisa cada tarea (código, tsc, lint, tests, navegador), abre NC `REV-…` |
| `movil` — revisión en teléfono (pendiente) | `REVISION-MOVIL.md` | Regresión en el POCO con los arneses de la auditoría |

## Tareas y avance
Estados: `pendiente` → `en desarrollo` → `para revisar` → `en revisión` → `NC abiertas` / `aprobada`.

### v5.8.1 · «Micrófono seguro» (build 34)
| ID | Tarea (INFORME §8.2) | Hallazgos | Estado | Notas |
|---|---|---|---|---|
| T1 | Recorder reentrante y cancelable; `fallback()` registra sus streams | MIC-302, MIC-301, ARQ-100 | aprobada | rev: APROBADA; REV-T1-1 cerrada (regresión OK). NC-v5.8.1-01. `recorder.ts` (también lleva la lógica de T5 y el `start()` de T2), `lifecycle.ts` (`pause` ya no es segundo plano), Conversation/Calibration/ReviewScreen |
| T2 | `start()` con guarda de puntero (segundo dedo) | MIC-304 | aprobada | rev: APROBADA; REV-T2-1 cerrada (regresión OK). NC-v5.8.1-02. `TalkButton.tsx` (pointerId) + `start()` de `recorder.ts` |
| T3 | Debate y dictado: `close()` al cambiar de paso o desmontar; no grabar si cambió el paso | MIC-303 | aprobada | rev: APROBADA. NC-v5.8.1-03. `TopicAskPage.tsx` (`abandon()`, vuelta `run`) |
| T4 | Red de seguridad nativa en `MainActivity.onPause/onStop` | MIC-308 | aprobada | rev: APROBADA con riesgo residual BAJA aceptado (captura ya abierta con JS bloqueado → móvil R5). NC-v5.8.1-05. `MainActivity.java`, `HablaChromeClient.java` (nuevo), `lifecycle.ts`. Compila con `:app:compileDebugJavaWithJavac --offline` (no `assembleDebug`: pisa `apk/Habla-v5.8.apk`) |
| T5 | `fallback()` en silencio: segunda comprobación, 1 reintento, no perder AEC | MIC-800 | aprobada | rev: APROBADA. NC-v5.8.1-04. `recorder.ts` (`looksMuted`, `fallback` con 1 reintento) |
| T6 | Tests del Recorder (`getUserMedia` simulado) + runner `npm test` sin dependencias nuevas | ARQ-113 | aprobada | rev: APROBADA (fallan con el recorder de v5.8). NC-v5.8.1-06. `package.json` (`test`), `tests/helpers/*.mjs`, `tests/recorder.test.mjs` (17 pruebas) |
| T7 | Entrega: `version.json` 5.8.1/34, `RELEASES` en `changelog.ts`, docs | — | aprobada | rev: APROBADA. NC-v5.8.1-07. `version.json`, `changelog.ts`, `CLAUDE.md`, `problemas-conocidos.md`, `estado-actual.md`. Sin APK ni commit |

### v5.8.2 · «Claves, datos y consumo» (build 35)
| ID | Tarea (INFORME §8.3) | Hallazgos | Estado | Notas |
|---|---|---|---|---|
| U1 | Build release no debuggable firmado con `habla.jks`; debug con `.debug`; fallar sin `keystore.properties` | SEG-001, SEG-504, ARQ-106 | aprobada | rev: APROBADA; NC MEDIA REV-U1-1 (recetas `npm run apk`/CLAUDE.md/arneses aún con `assembleDebug` → cerrar en U7). NC-v5.8.2-01. `build.gradle`, `proguard-rules.pro`, `src/debug/res/values/strings.xml`. Verificado con `packageRelease` (no copia a `apk/`): no depurable, mismo certificado que la 5.8. Script `apk` → U7 |
| U2 | Validar Resource ID de Azure y host; huella para tenant/client/resource | FUG-401 | aprobada | rev: APROBADA (fuzz de 23 Resource ID: ninguno sale de management.azure.com); REV-U2-1 cerrada (regresión OK). NC-v5.8.2-02. `azureUsage.ts`, `AzureSettings.tsx`, `tests/azureUsage.test.mjs` |
| U3 | Validar copia al importar (rechazar sin tocar datos); `ErrorBoundary` + `catch` en el arranque | SEG-501, RES-704, E2E-601, SEG-510 | para revisar | REV-U3-1 corregida (2026-10-07: `lookups`/`cards` opcionales, 0–1 perfil, tests 38/38) → **regresión de rev**. Antes: NC REV-U3-1 (MEDIA): rechaza copias legítimas de la v1–v4.6 (sin `lookups`/`cards`). El resto (rechazos, ErrorBoundary, arranque) OK. NC-v5.8.2-03. `backupCheck.ts` (nuevo), `backup.ts`, `SettingsScreen.tsx`, `App.tsx`, `main.tsx`, `Recovery.tsx` (nuevo), `profile.ts`, `tests/backupCheck.test.mjs` |
| U4 | Clave de Gemini: comprobar antes de guardar | FLU-209 | aprobada | rev: APROBADA; NC BAJA REV-U4-1 corregida (2026-10-07, `keyCheckError`) → regresión de rev. NC-v5.8.2-04. `geminiKey.ts` (nuevo), `SettingsScreen.tsx`, `GeminiFix.tsx`, `tests/geminiKey.test.mjs` |
| U5 | Consumo en primer plano (<10 % CPU en reposo) | RES-700, RES-701 | para revisar | NC-v5.8.2-05. `Background.tsx`, `Mascot.tsx`, `index.css`. Chromium, 30 s en reposo: 12,3 / 12,4 / 16,9 / 19,4 dibujos/s (flame/aqua/terra/aero; v5.8: 60–120). La CPU real (<10 %) solo se mide en el POCO |
| U6 | Textos y menores | FLU-206, FLU-211, E2E-604, RES-703 | para revisar | NC-v5.8.2-06. `App.tsx`, `Onboarding.tsx`, `NoticeGate.tsx`, `gemini.ts` (`keyCheckError`), `PlanCard.tsx`. RES-703 en Chromium: 0 peticiones al volver al Inicio tras el error (antes 10) |
| U7 | Entrega: 5.8.2/35, `RELEASES`, docs; anotar FUG-402 (borrar APK antiguos: lo hace el dueño) | FUG-402 | para revisar | NC-v5.8.2-07. REV-U1-1 cerrada aquí (`npm run apk` = release `--offline`, `apk:debug`). Sin APK (entorno sin Android SDK) |

## Tablero en vivo
https://claude.ai/artifact/Xx1iRSCeYq6cSJteBT5qBn — lo actualiza el orquestador con `ArtifactData` (colecciones `tareas` y `bitacora`, docs `e###`).
Estados del tablero: `pendiente` → `en_desarrollo` → `desarrollada` (✓ dev) → `en_revision` → `aprobada` (✓ revisada) o `nc` (volver a corregir, `round`+1) → `en_correccion` → `corregida` → `en_regresion` → `aprobada` / `nc`. Campo `movil`: `pendiente` / `en_prueba` / `aprobada` / `nc`. `ncs`: [{id, sev, title, status: abierta|corregida|cerrada}].
Este archivo sigue siendo la fuente de verdad; si el tablero y este archivo discrepan, manda este.

## Flujo de orquestación
1. `dev` cierra una tarea → avisa «T<n> para revisar» → el orquestador envía «Revisa T<n>» a `rev`.
2. `rev` responde APROBADA o NC (`REV-…`) → el orquestador pasa las NC a `dev`, que las corrige antes de seguir.
3. Versión con todas las filas `aprobada` → orquestador guarda `docs/correccion/v5.8.x.patch` (`git diff`), propone el mensaje de commit y **espera la aprobación del dueño**.
4. Al tener teléfono: lanzar `movil` (`REVISOR-MOVIL.md`); sus NC (`MOV-…`) van a `dev`, y `movil` repite la regresión.
5. Si se corta la sesión: los agentes se pierden, pero este archivo + `NC-*.md` + `REVISION-*.md` permiten relanzarlos con el mismo prompt (dev: tareas no aprobadas; rev: tareas en `para revisar`).

## ⏸ PAUSA (2026-10-06, petición del dueño para ahorrar consumo)
**Cómo reanudar:** en Claude Code en `D:\My Apps\HABLA`: `Lee docs/correccion/ESTADO.md y continúa la orquestación de la corrección (desarrollo + revisión).` Relanzar `dev` y `rev` con `PROMPTS.md` (los agentes anteriores no sobreviven a la sesión). Tablero: https://claude.ai/artifact/Xx1iRSCeYq6cSJteBT5qBn
**Situación al pausar:**
- **v5.8.1: APROBADA en PC** (T1–T7, REV-T1-1/T2-1 cerradas). Parche `docs/correccion/v5.8.1.patch` (20 archivos; lista en `REVISION-v5.8.1.md` §7). **Pendiente del dueño:** (1) aprobar el commit propuesto (mensaje en la conversación; resumen: «v5.8.1: micrófono seguro…») y si incluye `docs/auditoria/` y `docs/correccion/`; (2) aceptar MIC-308 como riesgo residual BAJA (T4, recomendación de rev). Después: prueba en el POCO con `REVISOR-MOVIL.md`.
- **v5.8.2:** U1 aprobada (REV-U1-1 MEDIA se resuelve en U7: `npm run apk`/recetas → release). U2 aprobada (REV-U2-1 cerrada). U3 con **REV-U3-1 MEDIA abierta** (copias v1–v4.6 sin `lookups`/`cards` deben aceptarse). U4 con **REV-U4-1 BAJA abierta** (texto del 429 al comprobar la clave). U5 (CPU en primer plano) en desarrollo por `dev` al pausar. U6, U7 pendientes.
- **Orden al reanudar:** dev → REV-U3-1, REV-U4-1, U5, U6, U7 (REV-U1-1 dentro). rev → regresión de REV-U3-1 y REV-U4-1, luego U5–U7. Mirar la línea de dev más abajo por si dejó algo a medias.
- Aviso de rev: no cargar datos de Azure ficticios en `rev.localhost` antes de inyectar la red falsa (`startupCheck` pide token al arrancar).

## ▶ REANUDADO (2026-10-07, sesión en la nube de Claude Code, Linux sin Android SDK ni teléfono)
- Contexto: el dueño hizo el commit `e5d9c1a` («Commit manual de test de auditoria») con todo el árbol: 5.8.1 + la 5.8.2 a medias + `docs/auditoria/` y `docs/correccion/`. Las reglas de «nada de commits» quedan superadas por ese commit; los siguientes los aprueba el dueño igual.
- Hecho por una sola sesión (dev, **sin agente rev independiente**): REV-U3-1 (tests ejecutados), REV-U4-1, U5, U6, U7. tsc OK, lint 0 errores, `npm test` 38/38, banco OK, `npm run build` OK.
- **Falta:** (1) revisión de rev (regresión de REV-U1-1/U3-1/U4-1 y U5–U7); (2) en el PC del dueño: `npm run apk` y `npm run apk:debug`, comprobar firma y `versionCode 35`; (3) revisor móvil (`REVISOR-MOVIL.md`), sobre todo R11 (release encima de la 5.8) y la CPU en reposo; (4) FUG-402: el dueño borra los APK antiguos de `apk/`; (5) la decisión pendiente sobre MIC-308 (riesgo residual BAJA).

## Bitácora (lo último arriba)
- 2026-10-07 — dev (sesión en la nube): pruebas en la app real con Chromium (evidencia en `evidencia-rev/v582-navegador/`) y revisión de código del PR: 8 hallazgos corregidos, entre ellos uno grave en `PlanCard` («Reintentar» podía sustituir un plan bueno). `npm test` 38/38. Sigue faltando la revisión de rev y el teléfono.
- 2026-10-07 — dev (sesión en la nube): REV-U3-1 verificada (`npm test` 37/37 con el ajuste pendiente); REV-U4-1 y E2E-604 con `keyCheckError`; U5 terminada (umbrales de Brisa/Musgo, «reducir movimiento» en CSS; medida en Chromium); U6 (FLU-206, FLU-211, RES-703 con prueba en Chromium); U7 (5.8.2/35, RELEASES, `npm run apk` release, docs). Todo en `para revisar`. `npm test` 38/38.
- 2026-10-06 — dev: PAUSA del dueño. REV-U3-1: código hecho (`backupCheck.ts`: `lookups`/`cards` opcionales, 0–1 perfil) y tests añadidos en `tests/backupCheck.test.mjs` (último ajuste del caso «falta la tabla de sesiones» SIN volver a ejecutar `npm test`); falta ejecutar tests, rellenar «Corregido» en REVISION-v5.8.2.md y NC-v5.8.2.md. REV-U4-1: sin empezar (mensaje propio para 429 en `geminiKey.ts`).
- 2026-10-06 — dev: U5 a medias: `src/ui/Background.tsx` (fondo estático) y `src/ui/Mascot.tsx` (planificador único, ~15 fps en reposo, partículas por tiempo) compilan (tsc OK, lint 0); medido en navegador oculto con rAF simulado: flame 8,7 · aqua 9,7 · terra 19 · aero 31 fotogramas/s en reposo (aero y terra siguen «moviéndose»: revisar umbral/lift). Falta: ajustar aero/terra, `prefers-reduced-motion` del CSS, NC-v5.8.2-05 y fila U5. U6 y U7 sin empezar.
- 2026-10-06 — rev: REV-U2-1 cerrada. U3 → NC REV-U3-1 (MEDIA). U4 aprobada (REV-U4-1 BAJA). `npm test` 36/36.
- 2026-10-06 22:05 — Orquestador: **v5.8.1 APROBADA en PC** (regresión OK, REV-T1-1/T2-1 cerradas). Parche `docs/correccion/v5.8.1.patch` (20 archivos, lista en REVISION-v5.8.1.md §7). Propuesto el commit al dueño; pendiente su aprobación y su decisión sobre MIC-308 residual (T4).
- 2026-10-06 — rev: regresión de la 5.8.1 OK. REV-T1-1 y REV-T2-1 cerradas y verificadas (navegador + `npm test` 26/26); MIC-301/302/303/304/800 siguen pasando. Lista de archivos de la 5.8.1 actualizada (talkGesture).
- 2026-10-06 — dev: U4 para revisar (clave de Gemini comprobada antes de guardar en Ajustes y en la hoja de problemas). `npm test` 36/36.
- 2026-10-06 — dev: REV-U2-1 corregida (`AzureSettings.tsx`: vaciar el acceso borra el secreto). REV-U1-1 anotada para U7.
- 2026-10-06 — dev: U3 para revisar (copias validadas antes de tocar datos, importar en dos pasos, ErrorBoundary + recuperación en el arranque, perfil reparado). `npm test` 31/31.
- 2026-10-06 — rev: creado `REVISION-v5.8.2.md`. U1 aprobada (mismo certificado SHA-256 que la 5.8, release no depurable, R8 conserva los plugins; NC MEDIA REV-U1-1 para U7). U2 aprobada (NC BAJA REV-U2-1).
- 2026-10-06 — dev: REV-T1-1 y REV-T2-1 corregidas (`recorder.ts` fallback con opción sin procesado si falla el micro del teléfono; `talkGesture.ts` + `TalkButton.tsx`). `npm test` 26/26. Anotado en `REVISION-v5.8.1.md` y `NC-v5.8.1.md`.
- 2026-10-06 20:30 — Orquestador: rev aprobó T3–T7; T1 (REV-T1-1 BAJA) y T2 (REV-T2-1 BAJA) devueltas a dev para corregir antes del commit, luego regresión de rev. T4: rev recomienda aceptar MIC-308 como residual BAJA → decisión del dueño pendiente.
- 2026-10-06 — rev: v5.8.1 revisada en PC: T1–T7 aprobadas; NC BAJA REV-T1-1 y REV-T2-1 (no bloquean). **GO en PC**; prioritarios en el teléfono: R1 (cierre en segundo plano sin el aviso `pause`: bloqueo, recientes) y R2 (primer permiso de micro). Lista de archivos de la 5.8.1 (sin los de la 5.8.2) en `REVISION-v5.8.1.md` §7.
- 2026-10-06 — dev: U2 para revisar (Resource ID/Tenant/Client validados, URL con host comprobado, huella al cambiar el acceso). `npm test` 20/20. Ajuste de T6: `ws: false` en `tests/helpers/vite.mjs`.
- 2026-10-06 — dev: U1 para revisar (release no depurable + R8 + habla.jks; debug = `com.shift.habla.debug`; falla sin keystore.properties). `apk/` intacto; `keystore/` sin tocar.
- 2026-10-06 19:15 — Orquestador: corte por límite de uso (dev en U1, rev revisando T1). Reanudados ambos donde estaban. Nota: package.json `apk` → release se hará en U7; build.gradle/proguard/src/debug son de U1 (5.8.2).
- 2026-10-06 — dev: T7 para revisar (5.8.1/34, RELEASES, docs). T1–T7 en `para revisar`. tsc OK, lint 0 errores, `npm test` 17/17, banco OK, `npm run build` OK.
- 2026-10-06 — dev: T6 para revisar (`npm test` = node:test + Vite ssrLoadModule; 17/17; prueba de mutación de la apertura compartida detectada).
- 2026-10-06 — dev: T4 para revisar (deniega micro nuevo en segundo plano; onStop llama a `window.__hablaBackground()`; no hay API para cortar una captura ya abierta). Java compila (offline).
- 2026-10-06 — dev: T5 para revisar (silencio sin Bluetooth no es mudo; 1 reintento con procesado; nada sin AEC para la sesión). `npm test` 17/17, tsc OK, lint 0 errores.
- 2026-10-06 — dev: T3 para revisar (TopicAskPage: Atrás/cerrar/desmontar anulan el dictado; no graba ni envía a Gemini si se abandonó). tsc OK, lint 0 errores, `npm test` 16/16.
- 2026-10-06 — dev: T2 para revisar (TalkButton con `pointerId`; segundo dedo/toque ignorado durante la grabación). tsc OK, lint 0 errores, `npm test` 16/16.
- 2026-10-06 — dev: T1 para revisar (Recorder reentrante/cancelable, `begin()`/`open()` devuelven boolean; `pause` de Capacitor ya no cierra micros). `npm test` 16/16, tsc OK, lint 0 errores.
- 2026-10-06 — rev: fase A lista. `REVISION-v5.8.1.md` (tabla, NC, lista de comprobación T1–T7, «Para el revisor móvil»); arnés `arnes-rev/rev-mic.js` + `arnes-rev/RECETA.md` (origen `rev.localhost:5173`, 0 peticiones reales); línea base MIC-302 FALLA en v5.8 (`evidencia-rev/base-v5.8-MIC-302.txt`); MIC-303 sin línea base (dev cambió `recorder.ts` durante la prueba).
- 2026-10-06 — Orquestador: lanzados `dev` (T1–T7) y `rev` (fase A: preparación y arnés de navegador). Prompt de `movil` listo en `REVISOR-MOVIL.md`.
- 2026-10-06 — Creado el plan de corrección y los roles.
