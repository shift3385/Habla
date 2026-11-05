# 5.12 · Plan: roleplays con misión (P-12), «Hacerla ahora» (P-05) y memoria del alumno (P-11)

**Fecha:** 2026-11-05 · **Decisión del dueño:** hacer estas tres propuestas (de `docs/pruebas/regresion-5.10/A5-usabilidad.md`
§P-05, P-11, P-12) en una **sesión nueva**, para gastar menos. Lo demás queda **aparcado por decisión del dueño**: pruebas en el
teléfono (`docs/pruebas/PENDIENTES.md`), tareas abiertas de la 5.11, dibujo de la boca en Sonidos y preguntas de
`docs/v5.11/PLAN.md` §10. No se tocan.

> **Para empezar en la sesión nueva:** «Lee `docs/v5.12/PLAN.md` y `CLAUDE.md` y desarrolla la 5.12 por fases; apunta el avance
> en la tabla de este archivo y haz commit y push al terminar cada fase.»
> Base de código: la rama `claude/peaceful-fermi-ua55yq` (5.11 build 43, lo más reciente; `main` sigue en la 5.9.1).
> Trabaja en la rama que indique la sesión, partiendo de esa.

## Decisiones del dueño
- **P-11: sí, el profe recuerda** datos personales de una clase a otra (no desactivado por defecto). Solo en el teléfono, visibles,
  editables y borrables en Ajustes. Esto **cambia la regla actual** de `src/lib/teacher.ts` (línea con «Do NOT mention previous
  lessons. Each lesson is a fresh conversation»): solo se permite usar esos datos guardados, nada más de clases anteriores.
- Política de niveles intacta (CLAUDE.md regla 6): nada de esto cambia el nivel.

## Fases (en este orden; una fase = un commit con su test)
| Fase | Qué | Estado |
|---|---|---|
| 1 | **P-05 «Hacerla ahora»** | ✅ hecha (2026-11-05): `src/lib/homework.ts`, escenario oculto `homework`, botón en el informe (clase y Progreso), en el aviso a pantalla completa y en el globo de la mascota; con 2+ respuestas la tarea queda «✓ Hecha». Test `tests/p05-homework.test.mjs`; navegador `docs/v5.12/evidencia/arnes-p05.mjs` (capturas en `evidencia/P05/`) |
| 2 | **P-12 roleplays con misión** | ✅ hecha (2026-11-05): `src/lib/missions.ts` (10 situaciones con misión de respaldo sin IA, preparación con el modelo rápido, brief, tachado), práctica «Situaciones» (elegir o «Describir la mía», con dictado), `goals_met` en el esquema del profe solo en misiones, objetivos tachados en la tarjeta (en horizontal, una línea), «¡Lo conseguiste!» e informe «¡Misión cumplida!»; se guarda al salir y al continuar. Prácticas en cuadrícula de 6 (tarjetas de 86 px: el Inicio sigue sin desplazar en vertical, `evidencia/P12/medidas-practicas.txt`). Test `tests/p12-missions.test.mjs`; navegador `evidencia/arnes-p12.mjs` |
| 3 | **P-11 memoria del alumno** | ✅ hecha (2026-11-05): `src/lib/memory.ts` (limpieza, filtro de lo sensible además del prompt, máx. 20, los 5 últimos al profe), tabla Dexie `facts` (`db.version(6)`, solo aditiva; migración v5→v6 con datos comprobada en el navegador), `facts_es` en el informe solo con la memoria activada y fuera de las misiones, tarjeta «Tu profe se acordará de…» en el informe, regla de `teacher.ts` abierta solo para esos datos (sin datos, el prompt es idéntico), Ajustes → «Lo que recuerda tu profe» (explicación de la mascota, interruptor `teacherMemory` activado por defecto, cambiar, borrar uno, borrar todo), copias versión 4 con la tabla (opcional al importar). Test `tests/p11-memory.test.mjs`; navegador `evidencia/arnes-p11.mjs` |
| 4 | Entrega 5.12 (build 44): `version.json`, Novedades en `changelog.ts`, README/CLAUDE.md, capturas | ✅ hecha (2026-11-05): `version.json` 5.12 / build 44, entrada 5.12 en `RELEASES`, README (Situaciones, Hacerla ahora, Lo que recuerda tu profe, copias), CLAUDE.md (versión y siguiente trabajo), `docs/pruebas/PENDIENTES.md`; capturas de Novedades en `evidencia/entrega/` y regresión de los tres arneses con la 5.12 (todo bien). `npx tsc -b`, lint (0 errores), `npm test` (384, 0 fallos), validadores y `npm run build` en verde. **Sin APK** (se compila en el PC del dueño) |

### Fase 1 · P-05 «Hacerla ahora» (barata)
- Hoy el informe de la clase trae una tarea (`report.homeworkEs`: `src/lib/fluency.ts`, `src/components/ReportView.tsx`) y el
  Inicio muestra la última (`src/lib/stats.ts` → `lastHomework`; aviso de la mascota en `src/lib/mascotTips.ts`).
- Añadir el botón **«Hacerla ahora»** en el informe y en el aviso: abre una **clase corta** con un escenario oculto (patrón de
  `src/lib/scenarios.ts`: `hidden: true`, como `plan` y `grammar`) cuyo brief es la tarea. Al terminar esa clase, la tarea queda
  marcada **✓ hecha** (y el aviso deja de proponerla).
- Test: el brief incluye la tarea; la tarea hecha no se vuelve a proponer.

### Fase 2 · P-12 roleplays con misión
- Nueva práctica guiada **«Situaciones»**: eliges una de una lista (médico, farmacia, aeropuerto, hotel, restaurante, llamar a
  un fontanero, entrevista, reunión; y para familia/viajes: preguntar una dirección, comprar en una tienda) **o describes la tuya**
  en una frase (en español).
- Gemini (modelo rápido) prepara la misión: título, contexto, **3 objetivos** cortos y su papel (el profe hace de médico,
  recepcionista…). Los objetivos se ven en la clase y **se tachan** cuando el profe detecta que los cumpliste (campo nuevo en la
  respuesta del profe, `teacher.ts`, con esquema JSON). Al cumplir los tres: «¡Lo conseguiste!» con la mascota y cierre.
- Encaja con `src/lib/scenarios.ts` / `src/screens/Conversation.tsx`; las correcciones siguen igual (todas, «EVERY real error»).
- Diseño: sin scroll en el Inicio; la lista dentro de `InfiniteList` si hace falta; 320×640 y horizontal; modo ligero.
- Tests: esquema de la misión, tachado de objetivos, la misión propia del alumno entra en el brief.

### Fase 3 · P-11 memoria del alumno
- Al terminar la clase, el informe (que ya se pide a Gemini en `fluency.ts`) devuelve **0–3 «datos personales»** breves en
  español («El viernes tiene una entrevista de trabajo», «Su nieta se llama Ana»). Nada sensible (salud, dinero, política,
  religión): el prompt lo prohíbe.
- Se guardan en local (**Dexie**: nueva tabla, `db.version(6)`, migración solo aditiva como la v5 de la 5.11), con fecha; máx.
  ~20 (los más antiguos salen).
- **Ajustes → nueva sección «Lo que recuerda tu profe»**: lista, editar, borrar uno, borrar todos. Explicación con la mascota.
- El profe recibe los **5 más recientes** en el system prompt y **puede** preguntar por uno al empezar («¿Qué tal fue la
  entrevista?»), sin forzarlo. Cambiar la regla de `teacher.ts` citada arriba solo para esto.
- **Copias de seguridad:** la tabla viaja en la copia (es dato del alumno, no una clave) y `backupCheck.ts` la acepta como
  opcional (copias antiguas sin ella siguen valiendo; patrón de `grammar`/`sounds` en `BACKUP_TABLES`/`OPTIONAL_TABLES`).
- Tests: extracción y límite de datos, prompt con los 5 últimos, borrar, migración v5→v6, copia con y sin la tabla.

## Reglas para la sesión nueva
- Todo lo de `CLAUDE.md` (español, estilo, CRLF, claves solo en Preferences, nunca keystore, no reactivar logs de Capacitor).
- Antes de cada commit: `npx tsc -b`, `npm run lint` (0 errores), `npm test`, `node scripts/validate-grammar.mjs`,
  `node scripts/validate-bank.mjs`, `node scripts/validate-sounds.mjs`, y prueba en el navegador (Playwright; arnés con red de IA
  falsa: hay ejemplos en `docs/v5.11/rendimiento/evidencia/perf.html` y `medir-pw.mjs`).
- **Gastar poco:** nada de pruebas en el teléfono (aparcadas), capturas solo de lo cambiado, una revisión por fase.
- Sin APK: no hay Android SDK en la nube (se compila en el PC del dueño cuando él quiera).

## Pendiente en el teléfono (aparcado por el dueño; también en `docs/pruebas/PENDIENTES.md`)
Todo se probó en el navegador (Playwright) con una IA falsa que responde según el esquema de cada llamada
(`docs/v5.12/evidencia/arnes.html`, `comun.mjs` y `arnes-p05.mjs`, `arnes-p12.mjs`, `arnes-p11.mjs`; capturas en `P05/`, `P12/`, `P11/`).
Falta, cuando el dueño retome las pruebas:
1. Compilar en el PC el APK debug y el release de la 5.12 (build 44) e instalarlos con `adb -s <serie> install -r` (copia de los datos antes).
2. **Migración real:** abrir la 5.12 sobre los datos de la 5.11 del POCO (Dexie v5 → v6). En el navegador se comprobó con una base v5 con datos (`evidencia/db-v5.ts`).
3. **Situaciones** con Gemini real y voz: que la misión tenga sentido para el nivel, que `goals_met` tache cuando toca (ni antes ni nunca) y que el profe no salga del papel.
4. **Hacerla ahora** con una tarea real del informe: que el profe la plantee bien en inglés sencillo y que con 2 respuestas quede «✓ Hecha».
5. **Memoria:** que el informe real apunte datos útiles y nada sensible, y que el profe pregunte por uno al empezar sin forzarlo ni repetirlo.

## Notas de la implementación
- **Inicio · Prácticas:** con 6 prácticas, dos filas anchas hacían desplazar 33 px en 320×640. Quedan las 6 en una cuadrícula de 2 con
  tarjetas de 86 px y «Mis puntos débiles» y «Situaciones» destacadas (icono en el color del tema). Medidas en `evidencia/P12/medidas-practicas.txt`.
- **Situaciones en horizontal:** la lista de 3 objetivos tapaba el micro; en horizontal se resume en una línea (✓ y el siguiente objetivo).
- **Sin mini-retos en las misiones:** la nota del turno de la 5.11 (M-06) no se manda en una misión (rompería la escena).
  `tests/m2-turnstyle.test.mjs` se actualizó a la forma nueva de la llamada.
- **Memoria:** además del prompt, `memory.ts` filtra salud, dinero, política, religión y sexualidad (mejor perder un dato inocente que
  guardar uno sensible); no se usa ni se apunta en las misiones (el alumno hace un papel); interruptor `teacherMemory` activado por defecto.
  Sin datos guardados, el prompt del profe es idéntico al de la 5.11.
- **Copias:** versión 4 solo si hay datos en `facts` (la 5.11 dice «versión más nueva» y no toca nada); sin ellos, la copia es la de antes.
- **Arnés:** no escribir archivos dentro del repo mientras corre (Vite vigila la carpeta y recarga la página): la salida va al scratchpad.

