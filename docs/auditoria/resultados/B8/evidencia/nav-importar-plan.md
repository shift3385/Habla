# B8 · Navegador (b8.localhost:5173, commit 16e6240, red falsa B6, datos ficticios «Copia B6»)

## AUD-E2E-601 — fila de `lookups` sin `result`
Ajustes → Mi perfil y datos → Importar (con `confirm()` aceptado) una copia igual a la actual salvo `lookups:[{id:1,query:'x',createdAt:1}]` → «Importado: 1 sesiones y 0 errores ✓». Pestaña Palabras → `#root` vacío (innerHTML 0), pantalla en blanco sin pestañas. Consola: `TypeError: Cannot read properties of undefined (reading 'headword') at render (WordsScreen.tsx:232)` ← `InfiniteList.tsx:65`.

## AUD-SEG-501 / AUD-ARQ-102 — `tables:{}`
Antes: sessions 1, turns 2, lookups 1, cards 1, profile 1. Importar `{"format":"habla-backup","version":1,"tables":{}}` → «Importado: 0 sesiones y 0 errores ✓». Después: sessions 0, turns 0, lookups 0, cards 0 (profile 1 = perfil por defecto recreado al leerlo; `backup.ts:96` lo borra). Reimportar la copia de prueba lo restauró (1/2/1/1).

## AUD-RES-704 — perfil sin `levels`
Importar la copia con `delete profile.levels` → «Importado ✓». Recargar: `#root` vacío tras 8 s, fondo negro `rgb(10,6,5)`. Consola: `Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'overall') at App.tsx:112` (en `Promise.all`). Perfil restaurado después con Dexie desde la consola (origen aislado).

## AUD-RES-703 / AUD-FLU-216 — plan tras error
Perfil sin `plan`, regla `generateContent → 503`. «Continuar donde lo dejé» → 5 peticiones (t=17,1–27,9 s), tarjeta «Google está saturado… Reintentar» + hoja «Gemini está saturado o va lento». Se cierra la hoja y se alterna Palabras ↔ Hablar 3 veces (sin pulsar «Reintentar») → **5 peticiones más** (t=66,9–77,7 s): una cadena nueva completa (no una por visita; B7 vio 2 cadenas con 5 visitas).
