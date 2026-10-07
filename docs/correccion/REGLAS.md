# Reglas para los agentes de corrección (dev, rev, movil)

Lee primero `CLAUDE.md` (convenciones del proyecto) y `docs/correccion/ESTADO.md`. Escribe todo en **español**.

## Comunes
1. **Claves reales: jamás.** No escribir, imprimir ni devolver claves de Gemini/Azure ni el secreto del service principal. En CDP, solo resúmenes (`hasKey`, longitud).
2. **Sin llamadas reales de pago** a Gemini/Azure: red simulada (ver `docs/auditoria/entorno.md` y `docs/auditoria/resultados/B4/arnes/net.js`).
3. **No commits, no push, no `git stash`, no `git checkout -- …`, no `git reset`.** El dueño aprueba cada commit.
4. **No tocar `keystore/`** (nunca regenerar `habla.jks` ni `keystore.properties`). No reactivar `loggingBehavior` en Capacitor.
5. **Sin dependencias nuevas** (internet lento). Para tests: `node:test` + Vite `ssrLoadModule` (ya instalado), no Vitest/Jest.
6. **Entorno Windows.** PATH desactualizado: en PowerShell fija
   `$env:JAVA_HOME='C:\Program Files\Java\jdk-21'; $env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"; $env:Path="C:\Program Files\nodejs;C:\Program Files\Java\jdk-21\bin;$env:Path"`.
   Gradle siempre con `--offline`. Vite nunca con Bash: `preview_start` con `name: "habla-dev"`; usa un origen aislado (`rev.localhost:5173`) para no borrar datos de `localhost:5173`.
7. **Guarda el avance a menudo**: al terminar cada tarea actualiza su fila en `docs/correccion/ESTADO.md` y añade una línea a la Bitácora (fecha, agente, qué). Si te cortan, lo escrito es lo único que sobrevive.
8. Estilo del código: sin punto y coma, comillas simples, 2 espacios, ~150 columnas, trailing commas, **respeta CRLF** donde lo haya. Comentarios en español que explican el porqué citando el ID (p. ej. `// AUD-MIC-302: …`).
9. El teléfono **no está disponible** para `dev` ni `rev`. No uses `adb`.

## dev (desarrollo)
- Trabaja tarea a tarea (T1…T7, U1…U7). Al acabar una: `npx tsc -b`, `npm run lint` (0 errores), `npm test` (cuando exista) y deja la fila en `para revisar`.
- Documenta cada tarea en `docs/correccion/NC-v5.8.1.md` / `NC-v5.8.2.md` (formato de `docs/NC-v5.7.md`: NC, qué se cambió, dónde, cómo se probó, qué queda para el teléfono).
- Las NC del revisor (`REV-…`) se corrigen con prioridad sobre tareas nuevas; responde en la propia tabla de la revisión («Corregido en …»).

## rev (revisión en PC)
- **Solo lectura sobre el producto**: no edites `src/`, `android/`, `tests/` ni config. Puedes crear arneses en `docs/correccion/arnes-rev/` y en el scratchpad.
- Por cada tarea: lee el diff (`git diff -- <archivos>`), contrástalo con el hallazgo original (`docs/auditoria/resultados/Bx/hallazgos.md`, `B8/verificacion.md`) y con los pasos de reproducción; ejecuta `npx tsc -b`, `npm run lint`, `npm test`, `node scripts/validate-bank.mjs`, `npm run build`; si toca Java/Gradle, compila con `gradlew.bat :app:compileDebugJavaWithJavac --offline -q` (NO `assembleDebug`: su copia sobrescribe `apk/Habla-v<versión>.apk`); prueba en navegador lo que sea observable (doble toque, Atrás en el Debate, segundo dedo…) con `getUserMedia` instrumentado (ver `docs/auditoria/resultados/B3/arnes/instr.js`).
- Veredicto por tarea: **APROBADA** o **NC** (`REV-<tarea>-<n>` con severidad, archivo:línea, pasos, esperado/obtenido, evidencia). Busca también regresiones en otras pantallas que usan el Recorder (Conversation, Calibration, ReviewScreen, TopicAskPage).
- Anota lo que solo se puede comprobar en el teléfono en la sección «Para el revisor móvil» de tu archivo de revisión.
