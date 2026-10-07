# B7 · Navegador (vista previa `habla-dev`, origen aislado `http://b7.localhost:5173`, 360×780) · commit de trabajo 16e6240

Datos: SEMBRADOS por `arnes/seed7.js` (365 sesiones, 7300 turnos, 1095 errores, 300 consultas, 500 tarjetas; clave ficticia).
Red: falsa (`B6/arnes/b6nav.js`), ninguna llamada real. Micro: falso (oscilador).

## Tiempos de datos (1 año) · `arnes/tiempos7.js` (PC, Chrome; en el POCO serán varias veces mayores)
| función | ms (mín–máx de 3) |
|---|---|
| loadDashboard (arranque) | 10–15 |
| getProfile | 0–1 |
| weekMinutes | 0–1 |
| errorSummary (Progreso) | 12–14 |
| wordsCollected (Palabras) | 13–14 |
| dueSummary | 7–8 |
| syncCards | 29 |
| buildBackup + JSON.stringify | 127–130 |
JSON de la copia con 1 año: **4 491 kB**. Heap tras sembrar: 49 MB.

## Coste por clase (tema libre «Mi trabajo», sin fonética)
- Empezar: 2 peticiones (tema + saludo). Reanudar la clase guardada: 0.
- Cada turno hablado: 1 `generateContent` con el audio (16→23 kB por petición: el historial completo viaja en cada turno).
- «¿Qué digo?»: 1 (la 2.ª pulsación en el mismo turno usa caché: 0).
- Terminar → informe: 1.
- Total clase de 10 turnos: **13** (+10 a Azure si la fonética está activa, ver AUD-MIC-310).

## Memoria · clase de 50 turnos (`arnes/turnos7.js`)
- Heap JS: oscila 28–57 MB sin tendencia (12 turnos: 39,5 MB; 50 turnos: 35,5 MB). Sin fuga apreciable.
- Nodos DOM: 651 (12 turnos) → 1 829 (50 turnos): ~31 nodos por turno, lista sin virtualizar (lineal, aceptable).
- AudioContext: 48 creados / 48 cerrados. Blobs (`createObjectURL`): 0.
- Micrófono (falso): 1 apertura durante toda la clase, sin cierre (= AUD-MIC-305).

## Red mala (un turno hablado, `arnes/red7.js`)
| escenario | peticiones | audio en cada una | tiempo hasta salir de «Pensando…» | mensaje |
|---|---|---|---|---|
| 503 persistente | 5 (3 principal a 0/1,8/5,2 s + 2 respaldo a 5,6/11,9 s) | sí, 23 kB ×5 | 13 s | hoja «Gemini está saturado o va lento» con cambio de modelo/clave |
| sin red (TypeError) | 5 (mismo patrón) | sí ×5 | 12 s | «Gemini sigue sin responder tras varios intentos (sin conexión). Tu audio está guardado» |
| red lenta (respuesta a los 70 s) | 1 | sí | **61 s** | el mismo «(sin conexión)»; la respuesta 200 llega a los 70 s y se descarta |
| salir con «Salir y guardar» a los 5 s (respuesta a 15 s) | 1 | sí | — | la petición sigue y termina 200 a los 15 s con la clase cerrada; se descarta, sin voz |
Durante la espera solo hay «Salir y guardar la clase» y «Terminar»: no hay «Cancelar» del turno.

## Plan con 503 (H-B2-705)
Perfil sembrado sin plan + 503 en todo `generateContent`: 1.ª visita al Inicio = 5 peticiones (cadena de reintentos) y error «Google está saturado…» + hoja de la mascota. Después, 5 idas Palabras↔Hablar en 19 s → **10 peticiones más** (2 cadenas nuevas de 5). Total 15 peticiones del plan en ~2 min sin que el usuario pulse «Reintentar».

## Arranque con datos de forma inesperada (H-B2-704)
`profile.levels` borrado en la base sembrada → recarga → pantalla negra permanente, `#root` vacío; consola: `TypeError: Cannot read properties of undefined (reading 'overall') at App.tsx:112` dentro de `Promise.all`. Restaurado después.
