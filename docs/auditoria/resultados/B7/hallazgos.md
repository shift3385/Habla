# B7 · Resiliencia, rendimiento y batería · hallazgos

> Fase 2 (dinámica). Rango de IDs 700–799. Métricas con método y números: `metricas.md`. Evidencias: `evidencia/`. Arneses: `arnes/` (`cdp7.mjs`, `cpu7.sh`, `fondo7.sh`, `anim7.js`, `modo7.js`, `seed7.js`, `tiempos7.js`, `turnos7.js`, `red7.js`; reutiliza `B6/arnes/tel6.js` y `B6/arnes/b6nav.js`).
>
> **Contra qué se probó.**
> - **Teléfono:** POCO 23122PCD1G, Android 16, APK **v5.8 versionCode 33, `lastUpdateTime` 2026-10-05 22:13:08, DEBUGGABLE** (`evidencia/00-apk.txt`). Es el APK que instaló la otra sesión del dueño (commit 16e6240 o cercano; no se puede saber con certeza qué commit lleva). Red del teléfono siempre bloqueada por `tel6.js` (0 llamadas reales), micrófono sintético.
> - **Navegador:** vista previa `habla-dev` sobre el árbol de trabajo en **16e6240**, origen aislado `http://b7.localhost:5173`, 360×780, red falsa (`b6nav.js`), datos sembrados ficticios. No se tocó `localhost:5173`.
> - Llamadas reales a IA: **0**.
>
> **Limitaciones** (ver AUD-RES-714): el teléfono estuvo todo el tiempo **cargando por AC con «Permanecer activo» (`mStayOn=true`)**, así que la pantalla no se apaga sola, `adb input` está bloqueado y `dumpsys batterystats --reset` fue **denegado** (`WRITE_SECURE_SETTINGS`): la batería se midió por CPU real (`/proc/<pid>/stat` de la app **y** del proceso renderer del WebView), fotogramas (`gfxinfo`), wakelocks y modo de audio, no por mAh.

---

### AUD-RES-700 · El fondo animado (3 manchas con `blur(70–80px)` en bucle infinito) mantiene ~1 núcleo de CPU/GPU ocupado en todas las pantallas

- **Severidad:** ALTA
- **Estado:** CONFIRMADO (reproducido)
- **Probado en:** POCO Android 16 (APK v5.8 build 33, 22:13)
- **Dónde:** `src/ui/Background.tsx:13-15` (3 `div` de 360–420 px con `filter: blur(70px|80px)`, `willChange: transform` y `animation: hb-drift 14s|18s|22s infinite`), `src/index.css:45-53` (`@keyframes hb-drift`: traslación + escala); montado siempre en `src/App.tsx:596` y otra vez en cada `MascotPage` superpuesta (`src/components/MascotPage.tsx:109`).
- **Qué pasa:** la animación cambia `transform` + `scale` de capas enormes desenfocadas; el compositor del WebView (hilos `RenderThread`, `Chrome_InProcGpu`, `VizWebView` del proceso de la app) tiene que redibujarlas en cada fotograma de la pantalla (60–120 Hz) sin que el usuario haga nada. No se respeta `prefers-reduced-motion` (las reglas de `index.css:244` y `:456` no cubren `hb-drift`, que va en estilo en línea) ni el ahorro de batería.
- **Por qué importa:** batería y calor durante todo el tiempo que la app está en primer plano (clase, Inicio, informe, Ajustes). Es la mitad del gasto de la app en reposo (ver AUD-RES-701 para la otra mitad).
- **Cómo reproducir:**
  1. Abrir Habla en el POCO y dejarla quieta en el Inicio.
  2. `adb -s 60d0718c shell sh -s <pid_app> <pid_renderer> 30 30 < arnes/cpu7.sh`.
  3. Con CDP, pausar solo las animaciones CSS infinitas y congelar `requestAnimationFrame` (`arnes/modo7.js`, modos `base/css/raf/ambos`) y repetir 30 s en cada modo.
- **Esperado:** en reposo, CPU cercana a 0 (una pantalla estática no necesita fotogramas).
- **Obtenido:** pantalla de bienvenida en reposo: app **136–204 %** + renderer **47–87 %** (100 % = un núcleo). Con la mascota congelada y las manchas animándose: app **105 %**, renderer 10 %, 3 514 fotogramas/30 s. Con las dos cosas paradas: **0 % y 0 fotogramas**. Inicio real (23:25): app 172 % + renderer 69 %, 2 580 fotogramas/30 s con mediana de **61 ms por fotograma** (tirones). Clase reanudada en reposo: app 191 % + renderer 100 %, mediana 44 ms. Diálogo «¡Hola de nuevo!» (MascotPage encima del fondo): app 200 % + renderer 115 %.
- **Evidencia:** `evidencia/01-cpu-atribucion-inicio.txt`, `evidencia/01b-cpu-inicio-notas.txt` (incl. `top -H` por hilo), `evidencia/02-cpu-clase.txt`, `evidencia/06-cpu-pantallas.txt`.
- **Causa raíz (si se conoce):** animación CSS continua sobre capas grandes con `filter: blur()`; el desenfoque se recalcula en GPU al cambiar la escala.
- **Propuesta de corrección:** fondo estático (o pre-desenfocado como imagen/gradiente radial) y, si se quiere movimiento, animarlo pocos segundos al cambiar de pantalla; respetar `prefers-reduced-motion`; no volver a montar `Background` en las `MascotPage` superpuestas.
- **Relacionado con:** NC-14, AUD-RES-701, AUD-ARQ-110.

### AUD-RES-701 · La mascota redibuja a 60–120 fps en reposo: ~1 núcleo más y tirones; con dos montadas, doble bucle (confirma AUD-ARQ-110 / H-B7-3)

- **Severidad:** MEDIA (sube de BAJA: medido)
- **Estado:** CONFIRMADO (reproducido)
- **Probado en:** POCO Android 16 (APK v5.8 build 33, 22:13)
- **Dónde:** `src/ui/Mascot.tsx:143-147` (`requestAnimationFrame` al montar), `:456-460` (`tick` se reprograma siempre, antes de comprobar nada).
- **Qué pasa:** cada `Mascot` montada mantiene su bucle aunque esté quieta. En la clase se midieron **99 llamadas a rAF/s con 49,5 fps efectivos** (2 bucles); en el Inicio, 1 bucle que cae a 43 fps por la carga. El bucle se detiene en segundo plano (`MainActivity.onStop` → `WebView.onPause/pauseTimers`, comprobado: renderer ~0 % tras el primer minuto, AUD-RES-702), pero **no** cuando la mascota está tapada por un diálogo o fuera de la vista.
- **Por qué importa:** batería y calor en primer plano; los fotogramas lentos (mediana 44–61 ms con la pantalla a 120 Hz) hacen que la app se sienta pesada en un teléfono de gama media.
- **Cómo reproducir:** como AUD-RES-700, modo `raf` de `arnes/modo7.js` (congela solo `requestAnimationFrame`).
- **Esperado:** el bucle se duerme cuando no hay movimiento ni interacción.
- **Obtenido:** congelar solo la mascota baja el renderer de 47 % a **10 %** y la app de 136 % a 105 %; `anim7.js` cuenta 60 rAF/s en la bienvenida, 99/s en la clase.
- **Evidencia:** `evidencia/01-cpu-atribucion-inicio.txt`, `evidencia/01b-cpu-inicio-notas.txt`, `evidencia/06-cpu-pantallas.txt`.
- **Causa raíz (si se conoce):** el `tick` no tiene estado de reposo ni comprobación de visibilidad (`IntersectionObserver`/`document.hidden`).
- **Propuesta de corrección:** parar el bucle tras N fotogramas sin cambios y reanudarlo con `pointer`, cambio de `mood` o temporizador de parpadeo (p. ej. `setTimeout` de 3–5 s); no reprogramar si `!r.body?.isConnected`; respetar `prefers-reduced-motion`.
- **Relacionado con:** AUD-ARQ-110, H-B7-3, NC-14, AUD-RES-700.

### AUD-RES-702 · (DESCARTADO) Segundo plano con clase abierta: sin CPU, sin wakelocks, sin modo llamada, micro cerrado (NC-14)

- **Severidad:** INFO
- **Estado:** DESCARTADO (no hay defecto) · con la limitación de medir cargando y con la pantalla encendida
- **Probado en:** POCO Android 16 (APK v5.8 build 33, 22:13)
- **Dónde:** `android/app/src/main/java/com/shift/habla/MainActivity.java` (`onStop` → `wv.onPause(); wv.pauseTimers()`), `src/lib/lifecycle.ts:53`.
- **Qué pasa:** con una clase reanudada y la app enviada al fondo (`am start … category.HOME`), la CPU de la app es ~0 % y la del renderer cae a ~0–1 % tras el primer minuto (en el primer minuto el renderer gasta ~10 s de CPU, 16 %, dos veces de dos). `dumpsys power`: 0 wakelocks de Habla. `dumpsys audio`: la línea muestreada `mode (internal)` resultó ser el **modo de timbre** (ringer), no el modo de audio (corrección a posteriori): el modo de llamada (`MODE_IN_COMMUNICATION`) NO quedó medido en segundo plano. El micro (sintético) se cerró al pasar a segundo plano y la voz recibió `stop`.
- **Cómo reproducir:** `arnes/fondo7.sh` (muestras cada 60 s: CPU de app y renderer, wakelocks, modo de audio).
- **Esperado / Obtenido:** consumo nulo en segundo plano / ~0 % (ver tabla en `metricas.md`).
- **Evidencia:** `evidencia/03-fondo-clase-30min.txt` (5 min), `evidencia/04-fondo-clase-tramo2.txt` (5 min, se interrumpe cuando la app vuelve sola a primer plano, ver AUD-RES-714), `evidencia/08-fondo-clase-30min-b.txt` (tramo completo, ver `metricas.md`).
- **No probado:** con auriculares Bluetooth (no hay ninguno emparejado/conectado que yo pueda usar; ver AUD-ARQ-104 abajo) y con la pantalla apagada (no se puede apagar sin `input` ni cambiar ajustes).
- **Relacionado con:** NC-14, AUD-MIC-308, AUD-E2E-012.

### AUD-RES-703 · Tras un error del plan, cada vuelta al Inicio relanza la cadena entera de reintentos (5 peticiones) sin que el usuario lo pida (confirma H-B2-705 / AUD-FLU-216)

- **Severidad:** MEDIA
- **Estado:** CONFIRMADO (reproducido)
- **Probado en:** navegador 360×780 (16e6240), red falsa
- **Dónde:** `src/components/PlanCard.tsx:62-70` (generación al montar), `src/lib/gemini.ts:284-337` (`retryLoop`: 3 + 2 intentos).
- **Qué pasa:** con el perfil sin plan y Gemini devolviendo 503, la primera visita al Inicio hace 5 peticiones y muestra «Google está saturado…» + la hoja de la mascota. Luego, 5 idas Palabras ↔ Hablar en 19 s provocaron **10 peticiones más** (2 cadenas nuevas), sin pulsar «Reintentar».
- **Por qué importa:** cuota de la clave gratuita (con 429 cada cadena quema peticiones de los dos modelos) y avisos repetidos.
- **Cómo reproducir:**
  1. Origen aislado, perfil sin `plan`, regla `{ re: /generateContent/, status: 503 }` en `b6nav.js`.
  2. Entrar al Inicio, cerrar la hoja, alternar las pestañas Palabras/Hablar 5 veces.
- **Esperado:** tras un error, regenerar solo con «Reintentar» (o con espera creciente).
- **Obtenido:** 15 peticiones de plan en ~2 min.
- **Evidencia:** `evidencia/10-navegador-red-coste-memoria.md` (§ Plan con 503).
- **Propuesta de corrección:** recordar el error (en memoria o con hora) y no relanzar al montar hasta que el usuario pulse «Reintentar» o pase un tiempo.
- **Relacionado con:** AUD-FLU-216, H-B2-705.

### AUD-RES-704 · Un perfil con forma inesperada deja la app en negro para siempre al arrancar (sin `catch` en el arranque) (confirma H-B2-704)

- **Severidad:** MEDIA
- **Estado:** CONFIRMADO (reproducido)
- **Probado en:** navegador 360×780 (16e6240)
- **Dónde:** `src/App.tsx:134` (`Promise.all([...]).then(...)` sin `catch`), `:112-128` (`refreshProfile` lee `p.levels.overall` sin comprobar), `:261` (`if (!settings || …) return null`).
- **Qué pasa:** si cualquiera de las cargas iniciales lanza (aquí `profile.levels` ausente), `settings` nunca se fija y `App` devuelve `null`: pantalla negra, sin mensaje ni salida, en cada arranque. La única salida es borrar datos.
- **Por qué importa:** una copia importada con un perfil incompleto (la importación no valida filas: AUD-SEG-501 / AUD-ARQ-102) o un fallo de IndexedDB al abrir dejan la app inutilizable y el usuario pierde acceso a su progreso (aunque los datos sigan ahí).
- **Cómo reproducir:** en el origen aislado, `delete profile.levels` en la tabla `profile` → recargar.
- **Esperado:** pantalla de error con «Reintentar» / «Exportar copia» / «Restaurar».
- **Obtenido:** `#root` vacío; consola `TypeError: Cannot read properties of undefined (reading 'overall') at App.tsx:112` (rechazo no capturado del `Promise.all`). Perfil restaurado después.
- **Evidencia:** `evidencia/10-navegador-red-coste-memoria.md` (§ Arranque).
- **Propuesta de corrección:** `catch` en el arranque con pantalla de recuperación, valores por defecto para `levels`, y validar el perfil al importar.
- **Relacionado con:** AUD-E2E-601 (sin `ErrorBoundary`), AUD-SEG-501, AUD-ARQ-102, H-B2-704.

### AUD-RES-705 · Las peticiones a Gemini nunca se cancelan: al salir de la clase o al vencer el plazo, la respuesta llega igual (facturada) y se tira (confirma H-B7-2, 1.ª parte)

- **Severidad:** BAJA
- **Estado:** CONFIRMADO (reproducido)
- **Probado en:** navegador 360×780 (16e6240), red falsa
- **Dónde:** `src/lib/gemini.ts:340-350` (`withTimeout` solo deja de esperar), `:330` («Una petición ya enviada no se puede recuperar»), `:508-514` (`CapacitorHttp.post` con `readTimeout: 90000`, sin `AbortSignal`).
- **Qué pasa:** (a) «Salir y guardar la clase» a los 5 s de un turno cuya respuesta tarda 15 s: la petición sigue y termina **200 a los 15 s** con la clase ya cerrada; se descarta (sin voz). (b) Respuesta a los 70 s: la app se rinde a los 61 s y la respuesta **200 llega a los 70 s** y se descarta; si el alumno pulsa «Reenviar mi audio», la misma pregunta se paga dos veces.
- **Por qué importa:** coste/cuota con red lenta (cada turno sube además el audio otra vez).
- **Evidencia:** `evidencia/10-navegador-red-coste-memoria.md` (§ Red mala).
- **Propuesta de corrección:** `AbortController` en el `fetch` web y cerrar/abortar la conexión nativa (o al menos no reenviar mientras la anterior siga viva).
- **Relacionado con:** AUD-ARQ-107, AUD-FLU-212, AUD-MIC-310.

### AUD-RES-706 · Con red lenta el turno se queda 61 s en «Tu profe está pensando…» sin botón de cancelar y acaba diciendo «sin conexión»

- **Severidad:** BAJA
- **Estado:** CONFIRMADO (reproducido)
- **Probado en:** navegador 360×780 (16e6240), red falsa (respuesta a 70 s)
- **Dónde:** `src/lib/gemini.ts:300-337` (plazo 60 s; un intento que no responde consume todo el plazo), `src/screens/Conversation.tsx:290-294` (mensaje con `err.status || 'sin conexión'`; el plazo vencido llega con estado 0).
- **Qué pasa:** 1 sola petición; 61 s de espera; durante la espera solo existen «Salir y guardar la clase» y «Terminar» (no hay «Cancelar este turno»). El mensaje final dice «(sin conexión)», igual que cuando no hay red, aunque había red y era lentitud.
- **Por qué importa:** un minuto bloqueado por turno con mala cobertura; diagnóstico confuso.
- **Evidencia:** `evidencia/10-navegador-red-coste-memoria.md` (§ Red mala, fila «red lenta»).
- **Propuesta de corrección:** botón «Cancelar» durante «Pensando…», plazo por intento más corto (p. ej. 25 s) y mensaje distinto para «tarda demasiado».
- **Relacionado con:** AUD-FLU-212, AUD-FLU-213.

### AUD-RES-707 · (CORRIGE AUD-FLU-212) Sin red, el turno de clase falla en ~12 s tras 5 intentos con el audio y sí dice «sin conexión»

- **Severidad:** INFO
- **Estado:** CONFIRMADO en parte / DESCARTADO en parte
- **Probado en:** navegador 360×780 (16e6240), red falsa (`TypeError: Failed to fetch` y 503)
- **Dónde:** `src/lib/gemini.ts:284-337`.
- **Qué pasa:** con 503 persistente y sin red se observan **5 peticiones** (principal a 0 / 1,8 / 5,2 s; respaldo a 5,6 / 11,9 s), **todas con el audio** (23 kB cada una): 12–13 s, no ~60 s. En la clase, sin red, el texto es «Gemini sigue sin responder tras varios intentos (sin conexión). Tu audio está guardado»; con 503, la hoja «Gemini está saturado o va lento» (correcto). Sigue siendo cierto que se reintenta 5 veces sin red y que cada intento resube el audio (AUD-MIC-310). El caso del test de nivel y del plan sin red no se midió.
- **Evidencia:** `evidencia/10-navegador-red-coste-memoria.md` (§ Red mala).
- **Propuesta de corrección:** con fallo de transporte (estado 0 sin respuesta), no reintentar más de una vez.
- **Relacionado con:** AUD-FLU-212, H-B2-403, H-B2-703, AUD-MIC-310.

### AUD-RES-708 · (INFO) Coste de API por clase: 13 peticiones por clase de 10 turnos; sin llamadas duplicadas en el camino normal

- **Severidad:** INFO
- **Estado:** CONFIRMADO
- **Probado en:** navegador 360×780 (16e6240), red falsa
- **Qué pasa:** empezar (tema libre) = 2 (tema + saludo); reanudar la clase guardada = 0; cada turno hablado = 1 (`generateContent` con audio); «¿Qué digo?» = 1 (2.ª pulsación en el mismo turno: 0, caché); terminar → informe = 1. Total **13** para 10 turnos (+10 a Azure con fonética, AUD-MIC-310). El cuerpo crece con el historial (16 → 23 kB del turno 1 al 50). No se vieron dobles montajes ni efectos repetidos. Los únicos excesos medidos están en los caminos de error (AUD-RES-703, -705, -707).
- **Evidencia:** `evidencia/10-navegador-red-coste-memoria.md` (§ Coste por clase).

### AUD-RES-709 · (INFO) Clase de 50 turnos: sin fuga de memoria; DOM lineal; `AudioContext` cerrados

- **Severidad:** INFO
- **Estado:** DESCARTADO (no hay fuga)
- **Probado en:** navegador 360×780 (16e6240), micro y red falsos
- **Qué pasa:** heap JS 28–57 MB oscilando sin tendencia (39,5 MB en el turno 12, 35,5 MB en el 50); nodos DOM 651 → 1 829 (~31 por turno, lista sin virtualizar pero lineal); `AudioContext` 48 creados / 48 cerrados; 0 `createObjectURL`. El micro queda abierto toda la clase (ya registrado: AUD-MIC-305).
- **Evidencia:** `evidencia/10-navegador-red-coste-memoria.md` (§ Memoria).
- **No medido:** memoria nativa del WebView en el POCO en una clase larga (habría exigido 50 turnos en la clase real del dueño).

### AUD-RES-710 · (INFO) Un año de datos y arranque en frío: tiempos bajos; la copia pesa ~4,5 MB por año (descarta H-B7-5)

- **Severidad:** INFO
- **Estado:** DESCARTADO (sin defecto)
- **Probado en:** navegador (1 año sembrado: 365 sesiones, 7 300 turnos, 1 095 errores, 300 consultas, 500 tarjetas) y POCO (arranque en frío con los datos reales del dueño)
- **Qué pasa:** en el PC, `loadDashboard` 10–15 ms, `errorSummary` 12–14 ms, `wordsCollected` 13–14 ms, `dueSummary` 7–8 ms, `syncCards` 29 ms, copia (`buildBackup` + `stringify`) 127–130 ms y **4 491 kB**. Todas leen tablas enteras (`toArray()`), lineal con los años de uso: en el POCO serán varias veces más lentas, pero lejos de ser un problema en 1–2 años. Arranque en frío en el POCO (`am start -W`): **TotalTime 1 359 ms**, `DOMContentLoaded` 802 ms, primer pintado con contenido 1 120 ms; la bienvenida «Habla.» dura hasta ~3–4,5 s por diseño. El bundle único (AUD-ARQ-002) no se nota.
- **Evidencia:** `evidencia/05-arranque-frio.txt`, `evidencia/10-navegador-red-coste-memoria.md` (§ Tiempos).
- **Relacionado con:** H-B7-5, AUD-ARQ-002.

### AUD-RES-711 · (BAJA) En desarrollo cada cambio de ajuste escribe `habla.settings` dos veces (confirma H-B7-4 / AUD-ARQ-112)

- **Severidad:** BAJA
- **Estado:** CONFIRMADO (solo en `npm run dev`)
- **Probado en:** navegador 360×780 (16e6240)
- **Dónde:** `src/App.tsx:188-195` (guardar dentro del actualizador de `setState`), `src/main.tsx:14` (`StrictMode`).
- **Obtenido:** al cambiar claro/oscuro, 2 `setItem('CapacitorStorage.habla.settings')` idénticos en el mismo milisegundo. En el APK (sin doble invocación de StrictMode) se espera 1; el error de escritura sigue sin gestionarse.
- **Relacionado con:** AUD-ARQ-112, H-B7-4.

### AUD-RES-712 · (INFO) Con 16e6240 el re-test interrumpido se retoma en la misma pregunta, pero la invitación no avisa de que hay uno a medias (H-B2-701)

- **Severidad:** INFO
- **Estado:** CONFIRMADO en navegador (16e6240); no probado en el teléfono (el test es destructivo)
- **Probado en:** navegador 360×780 (16e6240)
- **Qué pasa:** re-test empezado, 4 preguntas de gramática respondidas (`habla-draft/progress` con `step: grammar`, 4 respuestas) → recarga (equivale a que Android mate la app) → la app muestra la invitación genérica «¡Te toca el re-test! … En unos 25 minutos…» y, al pulsar «Hacer el re-test ahora», **sigue en la pregunta 5 de 20**. Corrige la parte de pérdida de AUD-FLU-203 / H-B2-701. Pega: la invitación no dice «lo dejaste en la pregunta 5» y «Más tarde» deja el progreso guardado sin caducidad (AUD-ARQ-115).
- **Relacionado con:** AUD-FLU-203, AUD-FLU-202, H-B2-701, AUD-ARQ-115.

### AUD-RES-713 · (INFO) `am force-stop` con una clase abierta: la clase sigue íntegra y se puede reanudar

- **Severidad:** INFO
- **Estado:** DESCARTADO (no hay defecto) para «clase en reposo»
- **Probado en:** POCO Android 16 (APK v5.8 build 33, 22:13)
- **Qué pasa:** a las 23:22 la app estaba en la clase reanudada (13 respuestas); `am force-stop` + arranque en frío → «Lo dejaste aquí…» y «Clase en progreso: AI Supercomputer…»; se reanudó sin pérdida. No se probó matar la app **en mitad** del guardado (exige sincronizar con un turno real) ni durante una importación o el final del test (destructivos con los datos del dueño).
- **Evidencia:** `evidencia/05-arranque-frio.txt`, `evidencia/06-cpu-pantallas.txt`.

### AUD-RES-714 · (INFO, proceso) Interferencias durante la prueba: la app volvió sola a primer plano; Accesibilidad con interruptores activa; `batterystats --reset` denegado

- **Severidad:** INFO
- **Estado:** CONFIRMADO
- **Probado en:** POCO Android 16
- **Qué pasa:** (1) Con Habla en segundo plano desde las 23:00 (enviada con `am start … HOME`), entre las 23:09 y las 23:10 pasó otra vez a primer plano (`topResumedActivity = com.shift.habla`) sin que este bot hiciera nada; la CPU volvió a 131 % + 62 %. Paré el muestreo y lo anoté. No hubo instalación (`lastUpdateTime` sigue en 22:13:08). Está activo el servicio **«Accesibilidad con interruptores»** (`com.google.android.accessibility.switchaccess`, con un `SCREEN_BRIGHT_WAKE_LOCK`), que puede abrir apps; puede ser del dueño o de otra sesión. (2) `dumpsys batterystats --reset` → `Permission denial … WRITE_SECURE_SETTINGS` (Xiaomi). (3) El teléfono está en AC con `mStayOn=true`: la pantalla no se apaga y batterystats no acumula descarga.
- **Evidencia:** `evidencia/04-fondo-clase-tramo2.txt` (minuto 5), `evidencia/00-apk.txt`.
- **Relacionado con:** AUD-E2E-600.

---

## Hipótesis asignadas: estado

| ID | Resultado |
|---|---|
| H-B7-1 | Descartada por B5 (no repetida). |
| H-B7-2 | 1.ª parte **confirmada** → AUD-RES-705. 2.ª parte (`azureUsage` sin plazo deja colgado `startupCheck`): **HIPÓTESIS, BAJA**: `src/lib/azureUsage.ts:36` llama a `CapacitorHttp.request` sin `connectTimeout`/`readTimeout`; pero `startupCheck` se lanza sin `await` en `App.tsx:215` y solo decide si activar la fonética, así que no bloquea la interfaz. No probado (exigía recargar el WebView con un parche persistente y el service principal del dueño). |
| H-B7-3 / AUD-ARQ-110 | **Confirmada** y medida → AUD-RES-701 (+ causa adicional AUD-RES-700). |
| H-B7-4 | Confirmada en desarrollo → AUD-RES-711. |
| H-B7-5 | Descartada → AUD-RES-710. |
| H-B2-701 | Resuelta en 16e6240 (navegador) → AUD-RES-712. |
| H-B2-702 | Cubierta por B6 (E2E-015 / AUD-FLU-215, con llamada real); no repetida. |
| H-B2-703 / AUD-FLU-212 | Corregida → AUD-RES-707 (12 s, no 60 s; texto correcto en clase). Red lenta → AUD-RES-706. |
| H-B2-704 | **Confirmada** → AUD-RES-704. |
| H-B2-705 / AUD-FLU-216 | **Confirmada** → AUD-RES-703. |
| H-B2-706 | No probada (prioridad baja; requiere ralentizar IndexedDB en el arranque). |
| AUD-FLU-217 | No medible en la sesión (7 días). En el POCO `dumpsys alarm` no tiene **ninguna** alarma de Habla: con `POST_NOTIFICATIONS` denegado `syncReminders` no programa nada (`evidencia/07-alarmas-audio.txt`), coherente con la 2.ª parte del hallazgo. |
| AUD-ARQ-104 (modo de audio) | **No probada**: no hay auriculares BT solo-A2DP disponibles y no puedo emparejar ni desconectar BT sin tocar ajustes del sistema. Ojo: la columna `mode (internal)` de `fondo7.sh` es el modo de timbre, no el de audio; el modo de audio no quedó medido. |
| Reloj (§8 del guion) | No probado dinámicamente (cambiar hora/zona del sistema está prohibido). Lectura: la racha usa la fecha local (`stats.ts:12-30`), el re-test `calibratedAt + 28 días` (`levels.ts:92-95`): con la hora hacia atrás solo se retrasa; un cambio de zona puede mover una clase de día y cortar la racha el día del viaje. |

## Cambios en datos del dueño (teléfono)

Ninguno intencionado. La clase guardada se **reanudó** dos veces (`savedAt` puede haber cambiado) y se envió al fondo; `am force-stop` dos veces (23:22 y al final). Sin llamadas reales, sin turnos nuevos, sin tocar Ajustes, sin bases nuevas (solo `indexedDB.databases()`).

> **Adenda 23:47 (cierre).** Tramo C (`evidencia/08`): 15 min en segundo plano con app 0 % y renderer ~0 % tras el primer minuto, 0 wakelocks; en el minuto 16 (~23:42) Habla volvió **otra vez sola** a primer plano (170–185 % + 83–96 %) — segunda interferencia ajena (AUD-RES-714). La columna `mode (internal)` de `fondo7.sh` era el modo de timbre (cambió a VIBRATE de 23:32 a 23:41, ajeno a la app), no el modo de audio. Cierre: muestreo detenido por orden del coordinador, `am force-stop`, forward 9333 quitado, lock borrado, Vite (`habla-dev` abierto por B7) parado; no quedan procesos `sh` míos en el POCO (el PID 27885 ya no existe).
