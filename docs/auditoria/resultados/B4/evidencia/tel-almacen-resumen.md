# POCO · resumen del almacenamiento de Habla por CDP (sin valores)

2026-10-05 ~21:15 · APK v5.8 build 33 · arnés `B4/arnes/resumen-almacen.js` (devuelve solo nombres, tamaños y booleanos).

- `indexedDB.databases()`: `habla` (v30). **`habla-draft`: no había borrador** (ver nota).
- `localStorage`: `habla.adviceCursor` (2 B), `habla.netlog` (15 255 B). No hay `habla.azureUsage` (no hay acceso a Azure Monitor configurado) ni `habla.quota`.
- Ajustes (`habla.settings`, 36 campos): clave de Gemini presente, longitud 39, empieza por `AIza`; clave de Azure presente (longitud 84); región puesta; fonética activa; **sin** secreto, tenant ni Resource ID del *service principal*.
- `habla.savedClass`: campos `sessionId, scenarioId, categoryId, topic, system, history, mascot, title, turns, savedAt`; `system` = 5 816 caracteres y **contiene el nombre/ocupación del perfil** (comprobado con un booleano dentro de la página); `history` = 24 mensajes.
- `habla.netlog`: 81 entradas; campos `at, what, model, thinking, kb, status, ms, tokens`; `what` **no** contiene nombre ni ocupación (booleano `false`); ningún `error` con `AIza` ni con datos del perfil. Prefijos de `what`: «You are an expert CEFR», «You are an expert Engl», «You pick conversation », «Your name is Leo. You », «You help English learn», «You are an expert, enc», «You are a precise, enc», «You are an expert bili», «You are an accurate sp» (todos textos fijos de la app).

Nota (incidencia del arnés, corregida): la primera versión del script hacía `indexedDB.open('habla-draft')` sin comprobar si existía, lo que **creó una BD vacía v1 sin almacenes** (habría impedido a `testDraft.ts` crear su almacén `kv` y guardar el borrador del próximo test). Se comprobó que estaba vacía y se borró con `indexedDB.deleteDatabase` en el acto; `databases()` volvió a mostrar solo `habla`. El arnés ya solo abre la BD si figura en `indexedDB.databases()`. Como estaba vacía, antes de la sonda **no existía** ningún borrador con audio.
