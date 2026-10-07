# B0 · Línea base

**Misión:** dejar constancia exacta de qué se audita y en qué estado arranca, para que los demás bots no repitan trabajo ni discutan versiones.

## Tareas

1. `git rev-parse HEAD`, `git status --short`, contenido de `version.json`, último APK en `apk/`.
2. Ejecuta y guarda la salida (resumen + archivo completo en `resultados/B0/`):
   - `npx tsc -b`
   - `npx oxlint`
   - `node scripts/validate-bank.mjs`
   - `npm audit --omit=dev` y `npm audit` (anota paquetes, severidad y si la ruta vulnerable se usa en la app)
   - `npm run build` (tamaño de `dist/`, avisos)
   - `npm ls --depth=0`
3. Teléfono: `adb devices`; si hay uno, `dumpsys package com.shift.habla` (versionName, versionCode, `DEBUGGABLE` sí/no, permisos concedidos). No instales nada.
4. Inventario: número de archivos y líneas por carpeta (`src/lib`, `src/screens`, `src/components`, `android/.../java`), las 10 funciones/archivos más largos.
5. Lista de todas las llamadas de red (`grep` de `fetch(`, `CapacitorHttp`, `https://`) y de todos los puntos que abren el micro (`getUserMedia`, `new Recorder`, `.open()`, `.begin()`) con archivo:línea. Esto lo usan B3 y B4.

## Salida

`resultados/B0/linea-base.md` con: commit, versión, resultado de cada comprobación (OK / n errores), estado del teléfono, inventario de red y de micrófono. Los fallos de `tsc`/`oxlint`/`audit` se anotan también como hallazgos `AUD-ARQ-*` o `AUD-SEG-*` según corresponda.
