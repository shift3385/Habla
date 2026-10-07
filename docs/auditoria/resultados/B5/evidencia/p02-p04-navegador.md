# B5 · Evidencia navegador (Vite `habla-dev`, 360×780, red falsa `arnes/net5.js`; datos ficticios «Auditor»)

Fecha 2026-10-05. Clave Gemini en el navegador = la ficticia `AIzaTEST-NO-REAL-…` (comprobado por igualdad, sin imprimirla). 0 peticiones reales: toda petición fuera de `localhost:5173` la responde `net5.js`.

## P-02 · Región de Azure (control de AUD-SEG-500)

Ajustes → Modelos → Azure Speech, clave ficticia `AZUR…(35)`, «Guardar y comprobar» con cada región:

| Región escrita | Host al que iría la petición |
|---|---|
| `mock-b5.invalid` | `mock-b5.invalid.api.cognitive.microsoft.com` |
| `x/#` | URL inválida (no saldría; `fetch` real lanzaría error) |
| `a@b` | URL inválida |
| `evil.example:443/` | URL inválida |
| `eastus%2Fevil` | URL inválida |

→ la región **no** permite desviar la clave a otro dominio. Nota lateral: la región se guarda sin validar (p. ej. `x/#`) y con la red falsa (que responde 200 a todo) la app la dio por buena.

## P-04 / H-B5-3 / H-B6-2 / H-B7-1 · Importar copias manipuladas

Estado de partida (restaurado antes de cada caso con la copia propia del navegador): `sessions 3, turns 9, mistakes 0, profile 1, lookups 1, cards 0`. Llamando a `importBackup` (mismo módulo que la app, vía Vite):

| Caso | Resultado | Tablas después |
|---|---|---|
| a `{"format":"habla-backup","version":1,"tables":{}}` | **éxito** `{sessions:0, mistakes:0}` | **todo a 0** |
| b `tables:null` | error `Cannot read properties of null (reading 'sessions')` (texto técnico al usuario) | intactas (rollback) |
| c `version:"9"` | rechazado («versión más nueva») | intactas |
| d sin `version` | **éxito** | **todo a 0** |
| e (H-B5-3) `tables:{profile:[{id:"me"}]}` | éxito | solo `profile 1`; resto a 0 |
| f fila con `"__proto__"` | éxito; `({}).polluted` = `undefined` (sin contaminación de prototipos) | sessions 1, resto 0 |
| g (H-B6-2) copia propia sin `cards` ni `lookups` | **éxito** «3 sesiones» | `lookups` **1 → 0** sin aviso |
| h `version:2` | rechazado | intactas |
| i JSON roto | «El archivo no es un JSON válido.» | intactas |
| H-B7-1: `cards` con dos filas que violan el índice único `[source+sourceId]` (última tabla) | error Dexie en inglés `cards.bulkPut(): 1 of 2 operations failed… ConstraintError…` | **intactas** (la transacción revierte todo: H-B7-1 descartada como defecto) |
| 52 MB (50 000 `lookups` de 1 kB) | **aceptado**, 3,1 s en el PC, heap 196 MB | lookups 50 000 |

Por la interfaz (Ajustes → Mi perfil y datos → Importar, `confirm()` aceptado): archivo `vacia.json` = caso a → mensaje **«Importado: 0 sesiones y 0 errores ✓»**; sesiones, turnos y consultas a 0 (el perfil se reescribe desde la memoria de la app).

### Arranque roto por una copia con tipos incorrectos (H-B5-3)

Copia propia con `profile:[{id:"me", name:{a:1}, level:42}]` → importada sin error → recargar la app: **pantalla negra**, `#root` vacío. Consola:

```
Uncaught (in promise) TypeError: p.name?.trim is not a function
    at isPersonalized (src/lib/profile.ts:72:19)
    at src/App.tsx:105:19
```

La app no arranca y no ofrece ninguna salida (en el teléfono: solo «Borrar datos» de Android, que se lleva también las claves). Con sesiones de tipos incorrectos (`scenario:{…}`, `startedAt:"nope"`) la app arranca y Progreso se pinta.

Al terminar se restauró la copia original del navegador (`sessions 3, turns 9, profile 1, lookups 1`).
