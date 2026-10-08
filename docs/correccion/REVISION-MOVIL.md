# Revisión en el teléfono (POCO 60d0718c) — v5.9 build 36 (incluye 5.8.1 y 5.8.2)

Sesión del PC, 2026-10-07. Revisor: sesión principal (sin subagente `movil`). Evidencias en `docs/correccion/evidencia-movil/`; arneses adaptados al paquete de pruebas en `docs/correccion/arnes-movil/` (copias de `docs/auditoria/resultados/B3`, `B8` y `ORQ`, con `com.shift.habla.debug` y uid 10366; los originales no se tocan). Nuevos: `models-fake.js`, `onboard.js`, `test-hasta-habla.js`, `test-final.js`, `r2.sh`, `r9.js`, `r10b.sh`, `r18.js`, y `tapTalk()` en `helpers.js` (el botón de hablar de la 5.9 responde a `pointerdown`/`pointerup`, no a `click()`).

## Decisiones del dueño (2026-10-07)
- Copia hecha antes de instalar: `Documents/Habla/habla-backup-2026-10-08.json` (276 KB, 20:33). Copia también en el scratchpad de la sesión.
- Azure real: **autorizado como máximo 2 minutos de audio** (R21).
- **MIC-308:** no se acepta ni se cierra. Se mantiene la información tal cual y no se modifica nada que la afecte; el dueño la estudiará más adelante.
- **APK antiguos de `apk/`:** no se borran; el dueño los comprimirá y guardará a mano.
- **Cambios pedidos durante la revisión** (hechos en código, ver «Cambios»): texto de la duración del audio del test y «Pausar» → «Posponer» con confirmación de la mascota.

## Preparación
- `apk/Habla-v5.9.apk` (release, `com.shift.habla` 36/5.9, no depurable, certificado SHA-256 `95626710…`, igual que la 5.8) y `apk/Habla-v5.9-debug.apk` (`com.shift.habla.debug` 36/5.9-debug, depurable, firma debug).
- El debug se instaló a mano desde el teléfono: `adb install` de un paquete **nuevo** falla en HyperOS con `INSTALL_FAILED_USER_RESTRICTED` sin «Instalar vía USB» en Opciones de desarrollador (las actualizaciones `install -r` de un paquete existente sí funcionan).
- Bienvenida del debug con la clave ficticia `AIzaTEST-NO-REAL-0000000000000000000` y red falsa; test de nivel completo con «No lo sé» y micro simulado → Inicio (nivel A1; el plan falla con la red falsa: esperado).
- **Incidencia de entorno:** el POCO se desconectó del USB **4 veces** (también con otro cable y otro puerto); `adb` se cuelga al perderlo.

## Resultados

| Caso | Estado | Evidencia | Notas |
|---|---|---|---|
| R11 · release encima (SEG-001/504) | **APROBADO** | `R11-*` | `install -r` sobre la 5.8: versionCode 36, sin `DEBUGGABLE`, `run-as` → «package not debuggable». Arranca con los datos («Welcome back, Liomar», racha 5, A2, última lección). Antes (5.8): 7 sesiones, 75 turnos, 70 errores, 64 tarjetas, 2 consultas, claves presentes. El recuento en la 5.9 ya no se lee por CDP: comprobarlo a mano en Progreso |
| R16 · primer toque con el permiso del micro | **APROBADO** | `R16-*` | Test, tarea 1: «Grabar» → diálogo de Android → concedido (`USER_SET`) → grabando a los 4 s. Al parar: 0 pistas vivas, 0 capturas en `audio_policy`, `appops` sin `running` |
| R10a · doble toque en el micro del test (MIC-302) | **APROBADO** | `R10a-*` | 1 apertura, 1 grabador; al parar todo cerrado; Android: captura solo ~4 s y vuelta a `MODE_NORMAL` |
| R10b · Inicio durante la apertura en el test (MIC-301) | **APROBADO tras MOV-1** | `R10b-1…3-*` (antes), `R10b-fix1…3-*` (después) | El micro se cierra en ≤ 2 s en segundo plano y no se reabre. Antes del arreglo la tarea seguía mostrando «99 s · toca para terminar» sin grabar (**MOV-1**); después: «Se cortó la grabación al salir de Habla…» y botón «Grabar» (3/3 rondas) |
| R18 · Posponer el test (v5.9, con el cambio pedido) | **APROBADO** | `R18-*` | «⏸ Posponer» → la mascota pregunta (solo una vez) → «No, sigo y lo termino ahora» vuelve con el botón disponible; «Sí, posponer» → «Test pospuesto», `pauseUsed: true`. Cerrar la app y volver: sigue en la tarea, «Seguimos donde lo dejaste», sin botón Posponer. El aviso del Inicio del **re-test** pospuesto («Tu re-test está pospuesto») no se pudo ver: el debug tiene un primer test, no un re-test |
| R1 · doble toque al dictar (MIC-302) | **APROBADO** | `R1-*` | 1 stream; cerrado al terminar; 0 capturas en segundo plano; sin recaptura al volver |
| R3 · Debate, «Atrás» durante el dictado (MIC-303) | **APROBADO** | `R3-*` | Micro cerrado < 1 s tras «Atrás»; 0 bytes de audio en la red (solo la lista de modelos, 2 KB) |
| R2 · Inicio durante la apertura en clase (MIC-301, 5.9) | **APROBADO** | `R2-1…3-*` | `tapTalk()` + Inicio a 0,45 s: cierre en ≤ 2,2 s, sin captura después, sin reapertura, `MODE_NORMAL`; la clase muestra el aviso de MOV-1 |
| R4 · segundo dedo (MIC-304) | **APROBADO** | `R4-js.txt` | 1 apertura, 1 grabador, nada huérfano. Por diseño de la 5.9 (`talkGesture.ts`), un toque de otro dedo pasados 600 ms es «enviar» |
| R9 · camino feliz (clase) | **APROBADO (parcial)** | `R9-*` | 3 respuestas con audio (29–131 KB), respuesta del profe y métricas; tras cada envío, 0 micros y `MODE_NORMAL`. «¿Qué digo?» no verificable con la red falsa (no genera ideas). Repaso y dictado normal: pendientes |
| R19 · Terminar desde el Inicio | **APROBADO** | `R19-js.txt`, `R19-inicio.png`, `R19-informe.png` | Inicio: «Clase en progreso · Music» con Terminar/Continuar y «1/5 min hoy». Terminar → confirmación (diálogo nativo, ver MOV-2; el dueño pulsó OK) → «Tu informe · 41 fluidez · 18 palabras/min · 1 min 1 s hablando»; 0 micros (página y Android) |
| R23 · copia previa al importar | **APROBADO** | `R23-aviso.png`, `R23-js.txt` | Importada en el debug la copia del dueño de las 20:33 (sin claves): confirmación «La copia tiene 7 sesiones y 70 errores…» (el dueño pulsó OK) → «Importado: 7 sesiones y 70 errores ✓ · Lo que tenías antes quedó en Documentos/Habla/habla-antes-de-importar-20261008013322538.json» (11,7 KB). Tras importar: 7 sesiones, 75 turnos, 70 errores, 64 tarjetas, 2 consultas: **iguales que la 5.8 del dueño** (confirma también R11) |
| R20 · Repaso a tu medida | **APROBADO** | `R20-*` | 13 frases. Respuesta con micro → micro suelto (0 vivos); la mascota explica una vez «Tú decides cuándo vuelve»; botones «1 min · No me salió / 6 min · Me costó / 11 días · Bien / 14 días · Fácil» y «Ya me la sé». 6 min → siguiente; «Ya me la sé» → archivada (Inicio 13 → 11). Palabras → «Ya las sé (1)» → «Repasar otra vez» → vuelve (Inicio 12). Segundos del repaso guardados (`habla.practiceSeconds` 4,9 s hoy) |
| R13 · copias inválidas (SEG-501/RES-704) | **APROBADO** | `R13-*` | Mal formada → «no es un JSON válido; no se cambió nada»; vacía (formato real, sin tablas) → «El archivo de copia está dañado o no es de Habla; no se cambió nada. (falta la tabla de sesiones)»; versión más nueva → «La copia es de una versión más nueva de Habla…». Datos intactos en los tres casos; sin pantalla negra |
| R8 · 10 min en segundo plano (NC-14) | **APROBADO** | `R8-fondo-sin-clase-4min.txt`, `R8-fondo-clase.txt` | 4 + 6 min: 0 % CPU (≤ 24 ticks/min), 0 wakelocks, 0 capturas, `appops` sin running, `MODE_NORMAL`. La app se quedó en un aviso («Tu tarea de hoy»), no en clase; en la 5.9 la clase no abre el micro en reposo, así que la medida es equivalente |
| R14 · clave errónea (FLU-209) | **APROBADO** | `R14-*` | Red falsa con 400 API_KEY_INVALID para la clave «MALA»: «Esa clave no es válida… No se cambió: sigues con tu clave anterior.»; la guardada sigue siendo la ficticia |
| R22 · recordatorio sin permiso | **APROBADO** | `R22-*` | Permiso de notificaciones denegado (`USER_FIXED`, Android ya no pregunta) con el recordatorio activo: el primer globo de la mascota es «Tu recordatorio diario está activado, pero Android no me deja avisarte» + «Ver cómo arreglarlo» → Meta diaria con la explicación (incluida la ruta de Xiaomi/POCO). Nota: mientras se ve «¡Tócame!» no salen globos (diseño) |
| R7 · pantalla apagada grabando (M6) | **APROBADO** | `R7-*`, `R7b-*`, `R7c-*` | Grabando en clase → botón de encendido (22:21:18) → micro cerrado ~1,3 s después, `MODE_NORMAL`, nada enviado; al desbloquear, sin reapertura y aviso de MOV-1. (Primer intento: la grabación llegó a 60 s y se envió sola antes de bloquear: confirma el envío automático) |
| R17 · dedo real (release) | **APROBADO** | `R17-R21-timeline.txt`, `R21-pantalla.png` | Release, clase «Sorpréndeme»: el micro de Android solo abierto 2 veces cortas (≈6 s y ≈3 s) mientras grababa; el resto del tiempo cerrado y `MODE_NORMAL`. Envío a los 60 s comprobado en R7 |
| R21 · fonética real (Azure, autorizado ≤ 2 min) | **APROBADO** | `R21-pantalla.png` | Release con la clave real del dueño: «I'm not sure.» → Pronunciación 93/100 (Precisión 97, Fluidez 100, Completa 100, Entonación 89), interruptor de fonética en la clase. Gasto: unos segundos de audio |
| R12 · CPU en reposo (RES-700) | **NC → MOV-3, casi en objetivo** | `R12-*` | Release en clase en reposo: **145 % + 37 % del renderer** (objetivo < 10 %). Causas medidas en el debug: brillo de la tarjeta del tema (~87–107 %) y mascota en reposo (~40–63 %). Tras el arreglo: brillo 0 %, clase sin la 2.ª mascota, mascota a 8 fps y modo descanso a 2 fps; bienvenida en reposo 9–10 %. Release final (2026-10-08 09:5x), bienvenida en reposo: 34 % → 22 % (dos ventanas de 30 s; la mascota entra en descanso) y `top` 13 % app + 3 % renderer (antes 145 % + 37 %). Falta medir clase e Inicio del release a mano (no es inspeccionable) |
| M7 / MIC-307 · auriculares Bluetooth | **NC → MOV-4** | `M7-*` | Lo pedido (sin modo llamada fuera de la clase) se cumple: al salir de la clase, `MODE_NORMAL`. Pero el micro de los auriculares no funciona (ver MOV-4) |
| R5, R6, R15, R24 | pendiente | — | R24 solo si el dueño lo pide |

## NC abiertas por el revisor móvil

### MOV-1 · MEDIA · La pantalla sigue «grabando» después de que el micro se cerrara al salir de la app — CORREGIDA (pendiente de commit)
- **Pasos:** test (también clase, Repaso y dictado): tocar el micro y pasar a segundo plano (Inicio de Android) → volver.
- **Esperado:** micro cerrado y la pantalla lista para grabar otra vez.
- **Obtenido (5.9 build 36 original):** el micro sí se cerraba (Android: ≤ 2 s), pero la tarea mostraba «99 s · toca para terminar» y el contador seguía; al tocar «Parar» se descartaba lo grabado («Necesito oírte un poco más»). Alguien podía hablar un minuto para nada.
- **Arreglo:** `whenBackground()` en `Calibration.tsx`, `Conversation.tsx`, `ReviewScreen.tsx` y `TopicAskPage.tsx`: si estaba grabando, vuelve a «listo» y avisa «Se cortó la grabación al salir de Habla. Toca el micro y vuelve a grabar.» (dictado: «Se cortó el dictado…»). Verificado en el teléfono en el test (R10b) y en la clase (R2).

### MOV-2 · BAJA · Diálogos nativos en inglés y sin la mascota — ABIERTA (propuesta, decide el dueño)
- **Dónde:** «Terminar» la clase desde el Inicio (`App.tsx`, `confirm()`) e «Importar» (`SettingsScreen.tsx`, `confirm()`).
- **Obtenido:** diálogo del sistema con botones «CANCEL / OK» (en inglés en el POCO) y sin la mascota; además bloquea la automatización por CDP.
- **Propuesta:** sustituirlos por una `MascotPage` de confirmación, como «¿Posponer el test?».

### MOV-3 · ALTA · CPU en reposo muy por encima del objetivo (RES-700) — CORREGIDA EN PARTE (pendiente de la medida final)
- **Obtenido:** release en clase en reposo, 145 % de un núcleo (app) + 37 % (renderer). Con el brillo y la mascota parados: 1 %.
- **Arreglo:** (1) el brillo de la tarjeta del tema es una capa aparte que solo cambia de opacidad, titila 4 veces y se queda fijo (antes `box-shadow` infinito sobre un elemento con `backdrop-filter`); (2) la clase tiene una sola mascota (petición del dueño); (3) mascota en reposo a 8 fps y, tras 10 s sin nada, modo descanso a 2 fps (`Mascot.tsx`: `IDLE_MS`, `REST_AFTER_MS`, `REST_MS`).

### MOV-4 · ALTA · Con «Todo por los auriculares», el micro Bluetooth graba silencio y la clase tarda ~9 s en grabar — CORREGIDA (falta probar cable y otra marca BT)
- **Pasos:** auriculares soundcore Liberty 4 Pro conectados (A2DP), Ajustes → Profe y voz → Audio con auriculares → «Todo por los auriculares» (permiso Dispositivos cercanos concedido) → entrar en clase → tocar para hablar.
- **Obtenido:** al entrar en clase, la apertura de cortesía del micro (pedir permiso y elegirlo) dura ~14 s: el micro BT da silencio, `looksMuted` espera ~6 s y `fallback()` abre el del teléfono («Speakerphone»). Al tocar para hablar: ~9 s hasta `rec start`, y graba con el micro del teléfono; un segundo toque en esos segundos no envía (aún no graba). `HablaAudio`: `setCommunicationDevice(soundcore…) = true · ahora: 23122PCD1G tipo 1` (la ruta no se queda en el BT).
- **Esperado:** grabar con el micro de los auriculares al momento; la apertura de cortesía cerrada en < 1 s.
- **Propuesta del dueño:** mientras se conectan los auriculares, una pantalla de la mascota («Conectando tus auriculares…») que solo deje salir de la clase. Más el arreglo de fondo de la ruta SCO (`AudioRoutePlugin`).
- **Diagnóstico y solución (2026-10-08):** ver [MOV-4-auriculares.md](MOV-4-auriculares.md). El micro de los soundcore no entrega audio a este teléfono ni en nativo (0 muestras); Habla lo detecta ahora en ~2,7 s con la pantalla «Conectando tus auriculares…», avisa y pasa a hablar al teléfono; grabar tarda 0,3 s (antes ~9 s).

### MOV-5 · MEDIA · La racha se rompe si ese día solo hubo una clase a medias — CORREGIDA
- **Obtenido:** release, 2026-10-08: «0 días» tras hablar el 7 en una clase que quedó a medias (R21). `loadDashboard` solo contaba días con clases terminadas o minutos de repaso, aunque la 5.9 ya suma a los minutos de hoy lo hablado en una clase a medias (AUD-E2E-603).
- **Arreglo:** `stats.ts`: también cuentan los días con respuestas habladas (`turns`, últimos 60 días).

## Cambios hechos durante la revisión (pendientes de commit)
- **MOV-1** (arriba).
- **Test, audición:** «Audio 1 de 2 · 2 voces · dura unos 1 min 20 s» → «… · duración 1 min 20 s» (petición del dueño).
- **Test: «Pausar» → «Posponer»** (petición del dueño): botón «⏸ Posponer»; al tocarlo, la mascota pregunta «¿Posponer el test?» avisando de que solo se puede posponer una vez, con «No, sigo y lo termino ahora» / «Sí, posponer»; «Test pospuesto» / «Re-test pospuesto»; Inicio: «Tu re-test está pospuesto». Novedades (5.9) y README actualizados.
- **El profe se llama como la mascota** (petición del dueño): `teacherName()`/`teacherPersona()` en `theme.ts`; Inicio («Gota te espera»), clase, bienvenida («Elige la voz de Gota»), test, Repaso, Ajustes y el prompt de Gemini («Your name is Gota»). Emma y Leo pasan a ser voces («Voz americana», «Voz británica»).
- **Clase:** una sola mascota (arriba, 64 px); junto al micro, barras en reposo y, al grabar, **medidor del volumen real** (`Recorder.level()`, `VoiceMeter`); **anillo de cuenta atrás** alrededor del micro (acento → naranja ≤ 10 s → rojo ≤ 5 s); texto «Toca para hablar» / «Toca para enviar» (y los segundos en los últimos 10).
- **MOV-3** (brillo de la tarjeta y modo descanso de la mascota) y **MOV-5** (racha).
- Anillo: se vacía en el sentido de las agujas del reloj (`strokeDashoffset` negativo); medidor de voz con **10 barras** en forma de onda (petición del dueño); barras en reposo también de 10.
- Novedades de la 5.9 y README actualizados con todo lo anterior.
- Comprobado tras los cambios: `tsc` OK, `npm test` 39/39, lint sin avisos nuevos. **Release recompilado (21:42)** con estos cambios: `com.shift.habla` 36/5.9, no depurable, mismo certificado (`95626710…`); contiene «Posponer», «¿Posponer el test?», el aviso de MOV-1 y «duración». Aún sin instalar en el POCO (el instalado es el de las 20:29).
