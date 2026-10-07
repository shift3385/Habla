# B7 · Métricas (método y números)

Teléfono: POCO 23122PCD1G, Android 16, APK v5.8 build 33 (`lastUpdateTime` 2026-10-05 22:13:08, DEBUGGABLE), cargando por AC, `mStayOn=true`, pantalla a 60/120 Hz según momento.
Navegador: `habla-dev` en 16e6240, origen `http://b7.localhost:5173`, 360×780, datos y red falsos.

## 1. CPU en primer plano y en reposo (teléfono)

Método: `arnes/cpu7.sh` lee `utime+stime` de `/proc/<pid>/stat` del proceso de la app y del **renderer** del WebView (proceso aislado `u0_i92xx` ligado al uid 10410; se identifica con `dumpsys activity processes | grep 'uid=10410 ISOLATED'`). 100 % = un núcleo durante todo el intervalo. Fotogramas: `dumpsys gfxinfo com.shift.habla` (reset antes). Animaciones: `arnes/anim7.js` por CDP.

| Pantalla (en reposo, sin tocar) | App % | Renderer % | Fotogramas / 30 s | Mediana fotograma | rAF/s | Anim. CSS infinitas |
|---|---|---|---|---|---|---|
| Bienvenida «Welcome back» (22:53, 60 s) | 204 | 87 | ~5 300 | 25 ms | 60 | 3 (`hb-drift`) |
| Bienvenida, 2.ª medida (22:55) | 136 | 47 | 3 640 | — | 60 | 3 |
| Bienvenida tras arranque en frío (23:23) | 206 | (pid erróneo) | — | — | 80 | 3 |
| Diálogo «¡Hola de nuevo!» (MascotPage) | 200 | 115 | — | — | 105 | 3 |
| Inicio real (23:25) | 172 | 69 | 2 580 | 61 ms | 43 | 3 |
| Clase reanudada (22:59) | 191 | 100 | 3 174 | 44 ms | 99 (2 bucles) | 4 (+`card-glow`) |

Atribución en la bienvenida (`arnes/modo7.js`, 30 s por modo, todo restaurado al final):

| Modo | App % | Renderer % | Fotogramas |
|---|---|---|---|
| base | 136 | 47 | 3 640 |
| CSS infinitas pausadas | 134 | 42 | 3 618 |
| `requestAnimationFrame` congelado (mascota) | 105 | 10 | 3 514 |
| ambos | **0** | **0** | **0** |

## 2. Segundo plano con una clase abierta (NC-14)

Método: clase reanudada → `am start -a MAIN -c HOME` → `arnes/fondo7.sh` cada 60 s (CPU por minuto de app y renderer, nº de wakelocks de Habla en `dumpsys power`, `mode (internal)` de `dumpsys audio`). `batterystats --reset` denegado; pantalla encendida (no se puede apagar).

| Tramo | Duración | App %/min | Renderer %/min | Wakelocks | Modo (ojo: es el de TIMBRE, no el de audio) |
|---|---|---|---|---|---|
| A (23:00–23:05, `evidencia/03`) | 5 min | 0 | 16 → 1 → 0 | 0 | NORMAL |
| B (23:05–23:10, `evidencia/04`) | 4 min + 1 | 0 | 0 | 0 | NORMAL — en el min 5 la app vuelve sola a primer plano (131 % / 62 %) |
| C (23:26–23:45, `evidencia/08`) | 15 min + 4 | 0 | 16 → 1 → 0 | 0 | (timbre) — en el min 16 (~23:42) la app vuelve OTRA VEZ sola a primer plano: 170–185 % / 83–96 %. Corté a las 23:46 por orden del coordinador |

## 3. Arranque en frío (teléfono, datos reales del dueño)

`am force-stop` + `am start -W`: TotalTime **1 359 ms** (COLD). En el WebView: `DOMContentLoaded` 802 ms, `first-paint` 828 ms, `first-contentful-paint` 1 120 ms; bienvenida «Habla.» hasta ~3–4,5 s; luego «Welcome back». (`evidencia/05-arranque-frio.txt`)

## 4. Datos: 1 año sembrado (navegador, PC)

365 sesiones · 7 300 turnos · 1 095 errores · 300 consultas · 500 tarjetas (`arnes/seed7.js`, 0,8 s en sembrar).

| Función | ms |
|---|---|
| loadDashboard | 10–15 |
| getProfile / weekMinutes | 0–1 |
| errorSummary | 12–14 |
| wordsCollected | 13–14 |
| dueSummary | 7–8 |
| syncCards | 29 |
| buildBackup + stringify | 127–130 |
| Tamaño JSON de la copia | 4 491 kB |

## 5. Coste de API por clase (navegador, red falsa)

| Acción | Peticiones |
|---|---|
| Empezar tema libre | 2 (tema + saludo) |
| Reanudar clase guardada | 0 |
| Turno hablado | 1 (con audio; 16 → 23 kB del turno 1 al 50) |
| «¿Qué digo?» | 1 (repetir en el mismo turno: 0) |
| Terminar → informe | 1 |
| **Clase de 10 turnos** | **13** (+10 a Azure con fonética) |
| Plan con 503: 1.ª visita + 5 vueltas al Inicio | 15 |

## 6. Red mala (un turno hablado)

| Escenario | Peticiones (con audio) | Hasta salir de «Pensando…» | Mensaje |
|---|---|---|---|
| 503 persistente | 5 (5) a 0 / 1,8 / 5,2 / 5,6 / 11,9 s | 13 s | hoja «Gemini está saturado o va lento» |
| Sin red | 5 (5), mismo patrón | 12 s | «… (sin conexión). Tu audio está guardado» |
| Respuesta a 70 s | 1 (1) | 61 s | «… (sin conexión)»; la 200 llega a 70 s y se descarta |
| Salir durante «Pensando…» (respuesta a 15 s) | 1 (1) | — | la petición termina 200 con la clase cerrada; descartada, sin voz |

## 7. Memoria (navegador, clase de 50 turnos)

Heap 28–57 MB sin tendencia; DOM 651 → 1 829 nodos (~31/turno); `AudioContext` 48/48 cerrados; 0 blobs.
