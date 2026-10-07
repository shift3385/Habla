# B6 · End-to-end · hallazgos y resultados por caso

> Estado: COMPLETO (fase 2). Commit auditado `6874443` (v5.8 build 33). Rango de IDs 600–699.
> Evidencias: `evidencia/nav-onboarding-test-import.md`, `evidencia/nav-clase-plan-retest.md`, `evidencia/tel-recorrido.md` (+ capturas `tel-0*.png`, `tel-estado-final.json`).
> Arneses reutilizables: `arnes/b6nav.js` (navegador: micro falso + red falsa con reglas), `arnes/backup-prueba.js` (copia ficticia + `feedFile()`), `arnes/cdp6.mjs` + `arnes/tel6.js` + `arnes/estado6.js` (teléfono: bloqueo de toda petición salvo las habilitadas una a una, micro sintético con `turno1.wav`/`turno2.wav`, resumen sin valores).
> Llamadas reales: **5 de 6** (4 Gemini + 1 Azure Speech), anotadas en `../llamadas-reales.md` (B6-1…B6-5).

**Lea primero AUD-E2E-600:** durante esta fase alguien trabajó en paralelo sobre el mismo repositorio, el mismo navegador y el mismo POCO. Afecta a cómo leer los casos del test de nivel.

## 1. Resultados por caso E2E (`B2/casos-e2e.md`)

Entorno: **N** = navegador `habla-dev` 360×780 con red falsa (`localhost` hasta 22:08; después origen aislado `b6.localhost`); **T** = POCO, APK debuggable (ver AUD-E2E-600).

| Caso | P | Entorno | Resultado | Detalle / hallazgo |
|---|---|---|---|---|
| E2E-001 | P1 | N | **OK** | Bienvenida → perfil → tutorial (clave ficticia) → test completo → Inicio con plan; `onboarded`, `lastSeenVersion=5.8`, `keysIntroSeen`; sin `NoticeGate`; `habla-draft` vacío. |
| E2E-002 | P1 | N | **FALLO** (confirma AUD-FLU-210, AUD-FLU-211) | El tutorial dice «se guardan solo en este teléfono» y «protegida con tu patrón, PIN o huella»; no dice que la voz, el perfil y la conversación van a Google (ni a Microsoft con Azure). |
| E2E-003 | P2 | N | OK (texto mejorable) | Clave inválida y sin red: error, «Continuar» deshabilitado, nada guardado. Texto «Revísala en Ajustes» dentro del tutorial → AUD-E2E-604. |
| E2E-004 | P1 | N | **FALLO parcial** (confirma AUD-FLU-200) | Ver H-FLU-200 abajo. |
| E2E-005 | P3 | — | no probado | Cubierto por B5 (AUD-SEG-501/510). |
| E2E-006 | P3 | — | no probado | Requiere el botón atrás nativo antes del Inicio; `adb input` bloqueado (INJECT_EVENTS) y no se reabre el tutorial en el teléfono del dueño. |
| E2E-007 | P2 | N | OK | Visto en la importación: «Novedades v5.8» → «¿Para qué es tu clave?» → Inicio; no vuelven al reabrir. |
| E2E-008 | P2 | N | OK | «Más tarde» en el re-test: el aviso vuelve en cada arranque. |
| E2E-009 | P3 | — | no probado | Prioridad baja. |
| E2E-010 | P1 | N | **FALLO** (confirma AUD-FLU-213 = AUD-MIC-305) | 20 s por petición: 0 botones en «Preparando tu clase» y micro abierto desde el s. 2; atrás → Inicio, micro cerrado, sin sesión vacía. |
| E2E-011 | P1 | T + N | **OK** | T: turno real (B6-1/2) con transcripción literal, 2 correcciones, nota de Azure guardada en `turns[].pronunciation`, TTS. «Terminar → informe» solo en N (cerrar la clase real del dueño no estaba permitido): informe, sesión cerrada, `habla.savedClass` vacío, micro cerrado. |
| E2E-012 | P1 | T | **OK** | Clase en reposo → «Inicio» de Android → volver: micro cerrado en segundo plano, UI no queda «grabando». (Bloqueo de pantalla no inyectable.) |
| E2E-013 | P1 | N (+T reanudar) | **FALLO** (confirma AUD-FLU-206) | Retomar: OK con historial (también en T). «Empezar nueva» dice «se perderá» y la sesión queda cerrada y contada en Progreso. |
| E2E-014 | P1 | T | **OK** | `am kill` en segundo plano → «¡Hola de nuevo! … (13 respuestas…)» → «Continuar mi clase» con todo el historial. |
| E2E-015 | P1 | T (llamada real B6-3) | **OK** → AUD-FLU-215 DESCARTADO (clase) | La respuesta llegó con la app oculta; el profe NO habló en segundo plano; habló al volver. |
| E2E-016 | P2 | — | no probado | (AUD-FLU-218) sin tiempo; prioridad P2. |
| E2E-017 | P2 | N | **FALLO parcial** (AUD-FLU-207 / H-B6-5) | Ver tabla de hipótesis. |
| E2E-018 | P2 | T (B6-4, B6-5) | OK | «¿Qué digo?» real: 3 ideas; tocar una idea → TTS. Tocar «healthier» → consulta real en contexto, guardada en `lookups`; «Cerrar» la cierra. Atrás nativo no inyectable (por código cierra la hoja). |
| E2E-019 | P3 | — | no probado | — |
| E2E-020 | P1 | N | **OK** | 3 escuchas con confirmación antes de la 3.ª; respuesta tardía = «No sé · la respondiste después de cerrar la nota»; resumen por parte. |
| E2E-021 | P1 | N | Commit auditado: **FALLO por lectura** (AUD-FLU-203 en pie). Árbol de trabajo/commit `16e6240`: OK | Con el código nuevo (sin commit durante la prueba): primer test retoma en la revisión de la parte; re-test retoma solo si se vuelve a entrar (ver AUD-E2E-600). |
| E2E-022 | P1 | N | **FALLO** (confirma AUD-FLU-202) | Re-test: solo «Siguiente» (y «Atrás» entre páginas); atrás de Android no hace nada; sin pestañas. |
| E2E-023 | P2 | — | no probado | — |
| E2E-024 | P2 | N | **FALLO** (confirma AUD-FLU-204) | Tras «No pude evaluar» y cerrar: Inicio normal y «¡Te toca el re-test!»; el borrador (3 audios × 93 KB) sigue; «Hacer el nuevo test» evalúa el viejo sin avisar. |
| E2E-025/026 | P2 | — | no probado | Cubiertos en parte por B3 (AUD-MIC-313). |
| E2E-027 | P2 | N | OK (parcial) | Re-test A1 con trayectoria B1 → nivel A2 (70/30). |
| E2E-028…032 | P2/P3 | — | no probados | — |
| E2E-033 | P1 | N | **FALLO** (confirma AUD-FLU-209) | La clave mala sustituye a la buena antes de comprobarla. |
| E2E-034 | P1 | — | **no probado** | En web `DeviceAuth` deja pasar siempre; en el teléfono el diálogo del sistema no se puede cancelar sin inyectar toques y revelar claves está prohibido. Lógica de gracia ya cubierta por B5 (AUD-SEG-502). |
| E2E-035 | P2 | — | no probado | Exportar/importar en el teléfono prohibido. Importar en N: ver H-B6-1. |
| E2E-036 | P3 | N | **FALLO** (confirma AUD-FLU-216) | 5 peticiones por cada visita al Inicio tras un error (15 con 3 visitas). En T no aplica (hay plan guardado). |
| E2E-037 | P3 | N | **FALLO** → AUD-E2E-602 | 780×360: «¿Qué digo?» tapado por la tarjeta del tema. |
| E2E-038 | P3 | — | no probado | Notificaciones no concedidas en el POCO (`POST_NOTIFICATIONS: granted=false`). |
| E2E-039 | P3 | N | **FALLO** (confirma AUD-FLU-219 / H-B6-1) | Clase cruzada tras importar. |
| E2E-040 | P1 | N | **FALLO parcial** (AUD-FLU-212) | Ver tabla de hipótesis. Modo avión en T no probado (es un ajuste del sistema). |
| E2E-041 | P2 | N | FALLO (AUD-FLU-200) | Sin clave, tocar un tema → Ajustes (portada, no Modelos); Inicio dice «pega tu clave… en Ajustes». |

Resumen P1 (16 casos): OK 6 (001, 011, 012, 014, 015, 020) · FALLO 7 (002, 004, 010, 013, 022, 033, 040) · 021 depende de la versión (FALLO por lectura en `6874443`, OK en `16e6240`) · no probado 1 (034).

## 2. Hipótesis y hallazgos asignados a B6

| ID | Estado tras B6 | Prueba |
|---|---|---|
| H-B6-1 (AUD-ARQ-101) · AUD-FLU-219 | **CONFIRMADO** (N) | Clase guardada `sessionId 7005` + importar copia con sesión 7005 abierta: «Continuar» pinta los turnos de la copia y envía a Gemini el historial y el `systemInstruction` de la clase vieja; el turno nuevo cae en la sesión importada. `nav-clase-plan-retest.md` |
| H-B6-2 (AUD-ARQ-102) | CONFIRMADO por B5 (AUD-SEG-501); B6 añade AUD-E2E-601 | Fila de `lookups` sin `result` → app en blanco al abrir Palabras. |
| H-B6-3 (AUD-ARQ-105) | no probado | Carrera de `adaptPlanAfterTest`; requiere retrasos finos. Sigue HIPÓTESIS. |
| H-B6-4 (AUD-ARQ-107) | CONFIRMADO por B5 (AUD-SEG-510) | No repetido. |
| H-B6-5 (AUD-ARQ-108) | **CONFIRMADO** (N) | «Ver Ajustes → Modelos» desde el aviso de fonética agotada desmonta la clase: `savedClass` existe pero el Inicio no muestra «Clase en progreso» hasta reiniciar la app. |
| AUD-FLU-200 | **CONFIRMADO en parte** (N) | Importar desde la bienvenida no guarda `onboarded`; si el alumno pasa el `NoticeGate`, `update()` lo guarda de rebote. Si cierra la app antes, reabre en «Soy nuevo / Ya tengo mi perfil» con el perfil calibrado ya en IndexedDB. Además el aviso le dice «Cuando empezaste te pedí una clave de Gemini…» (`NoticeGate.tsx:106`) a quien nunca la puso, y el Inicio queda sin clave. |
| AUD-FLU-202 | **CONFIRMADO** (N) | E2E-022. |
| AUD-FLU-203 | Commit `6874443`: CONFIRMADO por lectura (no existe guardado intermedio). Commit `16e6240` (posterior): primer test retoma en la última revisión; re-test solo si el alumno vuelve a pulsar «Hacer el re-test»; se pierde el bloque en curso. | E2E-021. |
| AUD-FLU-204 | **CONFIRMADO** (N) | E2E-024. Extra (solo dev, StrictMode): el borrador se evaluó dos veces y se guardaron dos resultados; `runEval` (`Calibration.tsx:618`) no tiene guardia de reentrada. En el APK no aplica. |
| AUD-FLU-205 | no probado | Requiere forzar el fallo de IndexedDB de `habla-draft`. |
| AUD-FLU-206 | **CONFIRMADO** (N) | E2E-013. |
| AUD-FLU-207 | **CONFIRMADO en parte** (N) | La clase no se pierde (ya estaba guardada tras la respuesta) pero desaparece del Inicio hasta reiniciar (= H-B6-5). Propuesta: bajar a BAJA y unificar con H-B6-5. |
| AUD-FLU-212 | **CONFIRMADO en parte** (N) | Fallo de red inmediato: 5 envíos del mismo audio (18 KB) en 10,7 s; la burbuja dice «(sin conexión)», pero la hoja dice «Gemini está saturado o va lento» y propone otro modelo u otra clave. La duración de ~60 s con red real colgada no se midió. |
| AUD-FLU-215 | **DESCARTADO para la clase** (T, llamada real) | La voz del profe espera a que vuelvas. Test y Repaso no probados. |
| AUD-FLU-216 | **CONFIRMADO** (N) | E2E-036. En el POCO hoy no aplica (hay plan guardado; 0 peticiones de plan en todo el recorrido). |
| AUD-FLU-219 | **CONFIRMADO** (N) | = H-B6-1. |

## 3. Hallazgos nuevos

### AUD-E2E-600 · Sesión de desarrollo en paralelo durante la auditoría: cambió el código, el APK del POCO y el almacenamiento del navegador

- **Severidad:** INFO (proceso de auditoría)
- **Estado:** CONFIRMADO
- **Probado en:** PC (git, Vite) + navegador + POCO
- **Dónde:** `src/screens/Calibration.tsx`, `src/lib/testDraft.ts` (modificados 21:49, luego commit `16e6240` «el test de nivel se retoma donde quedó…»); `apk/Habla-v5.8.apk` 22:02:39; POCO `lastUpdateTime` 18:33:29 → **22:13:08** (`versionCode` 33 igual).
- **Qué pasa:** mientras B6 probaba, otra sesión (sin lock del teléfono) editó y compiló la app, la instaló en el POCO y usó el mismo origen `http://localhost:5173` del navegador del panel, cuyo almacenamiento es compartido: aparecieron en mi perfil de prueba datos que no escribí (ocupación «Jubilado/a», intereses distintos, progreso de test con audio webm) y Vite recargó la página varias veces (`hmr update /src/screens/Calibration.tsx`, `page reload android/app/src/main/assets/public/index.html`).
- **Por qué importa:** los resultados del test de nivel en el navegador corresponden al código nuevo, no al commit auditado; el APK del POCO ya no es el build 33 original (aunque el diff no toca los flujos que probé en el teléfono); y las pruebas en `localhost` no estaban aisladas.
- **Cómo reproducir:** `git log --oneline -1` → `16e6240`; `adb -s 60d0718c shell dumpsys package com.shift.habla | grep lastUpdateTime`; `preview_logs` de Vite.
- **Esperado:** código, APK y navegador congelados durante la fase dinámica (o lock compartido también para el navegador).
- **Obtenido:** cambios a mitad de prueba. Mitigación aplicada: desde las 22:08 trabajé en el origen aislado `http://b6.localhost:5173`.
- **Evidencia:** `evidencia/nav-onboarding-test-import.md` (sección «Incidencia de entorno»), `evidencia/tel-recorrido.md` («Estado del APK»).
- **Propuesta de corrección:** para B7/B8: anotar el commit y el `lastUpdateTime` al empezar; usar un origen propio (`<bot>.localhost:5173`) en el navegador; re-verificar AUD-FLU-203 contra `16e6240`.
- **Relacionado con:** AUD-FLU-203.

### AUD-E2E-601 · Sin `ErrorBoundary`: una consulta guardada con forma inesperada deja toda la app en blanco al abrir Palabras

- **Severidad:** BAJA
- **Estado:** CONFIRMADO
- **Probado en:** navegador 360×780 (datos ficticios)
- **Dónde:** `src/screens/WordsScreen.tsx:142` (`h.result.headword` sin comprobar), `src/components/InfiniteList.tsx` (render de cada fila), `src/main.tsx` (sin límite de errores; `grep ErrorBoundary src/` = 0); origen de la fila: `src/lib/backup.ts:87-100` (importa filas sin validar).
- **Qué pasa:** una fila de `lookups` sin `result` (copia antigua, editada o de otra versión) hace que al tocar la pestaña Palabras React lance `TypeError: Cannot read properties of undefined (reading 'headword')` y desmonte el árbol entero: pantalla en blanco, sin barra de pestañas. Al recargar la app arranca, pero Palabras vuelve a tumbarla cada vez.
- **Por qué importa:** un único dato raro inutiliza la app sin mensaje ni salida para el usuario; es el mismo patrón que la pantalla negra de B5 con un perfil mal formado, ahora en una pestaña.
- **Cómo reproducir:**
  1. Importar una copia con `"lookups":[{"id":1,"query":"x","createdAt":1}]` (sin `result`).
  2. Tocar Palabras.
- **Esperado:** la fila se ignora o se muestra «consulta dañada»; como mínimo, un `ErrorBoundary` por pantalla con «Algo falló en esta pantalla · Volver al Inicio».
- **Obtenido:** app en blanco.
- **Evidencia:** `evidencia/nav-clase-plan-retest.md` (H-B6-2/H-B6-4), consola del navegador.
- **Propuesta de corrección:** `ErrorBoundary` alrededor de cada pestaña y de la clase; validar filas al importar (AUD-SEG-501) y filtrar en `WordsScreen` las que no tengan `result`.
- **Relacionado con:** AUD-SEG-501, AUD-SEG-510, AUD-ARQ-102, H-B6-2.

### AUD-E2E-602 · En horizontal (780×360) el botón «¿Qué digo?» queda debajo de la tarjeta del tema y no se puede tocar

- **Severidad:** BAJA
- **Estado:** CONFIRMADO (navegador; no probado en el POCO)
- **Probado en:** navegador 780×360 (tamaño del Galaxy A11 en horizontal)
- **Dónde:** `src/screens/Conversation.tsx:985-992` (botón), `src/index.css:339-400` (reglas `html[data-landscape] .cv-*`).
- **Qué pasa:** en la clase en horizontal, el botón «¿Qué digo?» se pinta en (565, 184) 118×22 px, pero `document.elementFromPoint` en su centro devuelve el texto de la tarjeta del tema («Toca para ver el objetivo de esta conversación»): la tarjeta lo tapa.
- **Por qué importa:** quien usa la orientación horizontal fija (opción de Tema y mascota para teléfonos que no giran) pierde la ayuda «¿Qué digo?».
- **Cómo reproducir:** 1. Ventana 780×360. 2. Abrir una clase. 3. Intentar pulsar «¿Qué digo?».
- **Esperado:** botón visible y pulsable.
- **Obtenido:** tapado por la tarjeta del tema.
- **Evidencia:** captura del panel en `evidencia/nav-clase-plan-retest.md` (descrita) y la medición `elementFromPoint`.
- **Propuesta de corrección:** reservar en la columna derecha el alto de la tarjeta o mover «¿Qué digo?» junto al botón de hablar en horizontal.
- **Relacionado con:** E2E-037, NC-12.

### AUD-E2E-603 · Los minutos de hoy y la racha no cuentan lo hablado en la clase guardada hasta que se cierra

- **Severidad:** BAJA
- **Estado:** CONFIRMADO
- **Probado en:** POCO (APK debuggable, ver AUD-E2E-600) + estático
- **Dónde:** `src/lib/stats.ts:34-36` (`secondsToday` suma solo `done`, sesiones con `metrics`, que se calculan al cerrar), mismo criterio para `days`/racha.
- **Qué pasa:** tras 2 respuestas habladas hoy (17 s de voz) en la clase retomada, Inicio y Progreso siguen en «0 / 15 min hoy · Semana: 0 min». La clase guardada (NC-16) puede durar días; mientras no se termine, no suma.
- **Por qué importa:** la meta diaria y la racha son la motivación principal; el alumno que habla en una clase larga y la deja guardada ve «0 min» y puede perder la racha.
- **Cómo reproducir:** 1. Retomar una clase guardada. 2. Responder por voz. 3. «Salir y guardar la clase». 4. Mirar «0/15 min hoy».
- **Esperado:** contar los segundos de voz de los turnos de hoy (tabla `turns`), estén o no cerradas las sesiones.
- **Obtenido:** 0 min.
- **Evidencia:** `evidencia/tel-recorrido.md` (fila Progreso), `evidencia/tel-05-progreso.png`.
- **Propuesta de corrección:** calcular `minutesToday` y los días de práctica desde `turns` (`createdAt`, `speechSeconds`) en lugar de desde `sessions.metrics`.
- **Relacionado con:** AUD-FLU-206 (al «Empezar nueva» sí se cierra y cuenta).

### AUD-E2E-604 · El error de clave dice «Revísala en Ajustes» también dentro del tutorial y dentro de Ajustes

- **Severidad:** BAJA (texto)
- **Estado:** CONFIRMADO
- **Probado en:** navegador 360×780 (red falsa, 400 `API_KEY_INVALID`)
- **Dónde:** `src/lib/gemini.ts:552` (`describeError`: «La clave de Gemini no es válida. Revísala en Ajustes.»), usado tal cual por el paso de la clave del tutorial (`src/screens/Onboarding.tsx`) y por Ajustes → Modelos.
- **Qué pasa:** en el tutorial (donde aún no hay Ajustes) y en la propia pantalla de Ajustes el aviso manda a «Ajustes».
- **Por qué importa:** confunde justo en el paso más delicado para un usuario nuevo (conseguir y pegar la clave).
- **Cómo reproducir:** tutorial → pegar una clave mala → «Comprobar clave».
- **Esperado:** «Esa clave no es válida: cópiala otra vez desde Google AI Studio (empieza por AIza…)».
- **Obtenido:** «…Revísala en Ajustes.»
- **Evidencia:** `evidencia/nav-onboarding-test-import.md` (E2E-003), `evidencia/nav-clase-plan-retest.md` (E2E-033).
- **Propuesta de corrección:** que `describeError` devuelva el motivo y cada pantalla añada la acción adecuada.
- **Relacionado con:** E2E-003, AUD-FLU-209.

## 4. Lo que no se cubrió y por qué

- **E2E-034** (ojo/diálogo de bloqueo): en web `DeviceAuth` siempre deja pasar; en el POCO no se pueden pulsar diálogos del sistema (`INJECT_EVENTS`) y revelar claves está prohibido. Cubierto en lógica por B5 (AUD-SEG-502).
- **Modo avión real** (E2E-040 en T): cambiarlo es un ajuste del sistema; solo red falsa en N.
- **Atrás nativo de Android en el POCO** (E2E-006, cierre de la hoja de consulta): `adb shell input keyevent 4` → `SecurityException INJECT_EVENTS`. En N se simuló con `App.notifyListeners('backButton')`.
- **«Terminar» la clase real, exportar/importar, re-test y onboarding en el POCO**: prohibidos por el orquestador; hechos en N con datos ficticios.
- H-B6-3, AUD-FLU-205, E2E-016/019/023/025/026/028–032/038: sin tiempo o requieren condiciones que no se pueden crear sin tocar datos reales.

## 5. Estado final

- Teléfono: `am force-stop com.shift.habla`, `adb forward --remove tcp:9333` (la lista de forwards quedó vacía; el `tcp:9334` del Samsung ya no estaba), lock borrado. Datos del dueño modificados solo por uso normal: +2 respuestas y +2 réplicas en la clase guardada (voz sintética), +2 errores, +1 nota de Azure, +1 consulta («healthier»), +4 entradas de `habla.netlog`. Nada borrado; claves, perfil y plan intactos.
- Navegador: `localhost:5173` y `b6.localhost:5173` sin `localStorage` ni IndexedDB (borré también los datos ficticios previos de otros bots y los de la otra sesión). Vite parado.
