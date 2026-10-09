# Habla 5.9.1 — Parche de seguridad y corrección de la v5.9

Entrega: v5.9.1 (build 37). Fecha: 2026-10-08. Origen: errores que vio el dueño usando la 5.9 en el POCO.
Sin commit hasta que el dueño lo apruebe.

## Resumen

| # | Qué | Tipo | Archivos |
|---|---|---|---|
| E1 | Repaso: «Gemini error 400 · Request contains an invalid argument» en todas las frases tras desconectar los auriculares Bluetooth (se mandaba una grabación sin audio) | Error | `src/lib/speech.ts` (`isEmptyRecording`), `src/lib/recorder.ts` (`distrustMic`), `src/screens/ReviewScreen.tsx`, `src/screens/Conversation.tsx`, `src/screens/Calibration.tsx`, `src/components/TopicAskPage.tsx`, `tests/emptyRecording.test.mjs` (nuevo) |
| E2 | Repaso: la fonética de Azure se medía contra la respuesta de la tarjeta y no contra lo que dijiste («the», «talks» marcados en «speaks about loyalty») | Error | `src/screens/ReviewScreen.tsx` |
| E3 | Al desconectar los auriculares no se volvía al micro del teléfono | Error | **PENDIENTE** (decisión del dueño, 2026-10-08): se aplaza la prueba con los auriculares; E1 evita el síntoma |
| M1–M2 | Oír cada corrección y ▶/⏸ en toda la app (salvo el test de nivel) | Mejora | Sección del desarrollador más abajo |

## E1 · Audio vacío enviado a Gemini (error 400)

**Qué pasaba.** El 2026-10-08 (22:22–22:25) todas las llamadas del Repaso fallaron con 400 en <1 s y con los dos modelos;
la clase, las palabras y el informe iban bien. El Diagnóstico mostraba **2 KB** por petición del Repaso (las de la clase,
37–170 KB): la petición llevaba el texto de la tarea pero **no audio**. Causa: el dueño había desconectado los auriculares
Bluetooth y la app siguió grabando de ellos; cada grabación salía con solo la cabecera WebM (unos cientos de bytes).

- `blob.size === 0` (comprobación de la clase, el test y el dictado) no la detectaba: no son 0 bytes.
- `analyzeSpeech` devuelve `null` cuando no puede decodificar y, por diseño, `null` no bloquea el envío.
- El Repaso ni siquiera comprobaba `blob.size`.

**Qué se cambió.**
- `isEmptyRecording(blob, analysis)` en `speech.ts`: vacía si pesa 0 bytes, o si no se pudo decodificar y pesa <1 KB
  (una grabación real de voz pesa ~3 KB/s con Opus a 24 kbps). Se usa en la clase, el repaso, el test y el dictado.
- Grabación vacía → «No te he oído» y **no se envía nada**; además `distrustMic()` (`recorder.ts`) olvida el micro elegido
  y la confianza en el de por defecto (`trustDefaultMic`, MOV-4), así que la siguiente apertura vuelve a medir la señal y
  busca uno que funcione en vez de repetir el micro muerto. En el test cuenta como fallo del micro (`micFailures`).

**Cómo se probó.**
- Navegador (Chromium, `rev.localhost:5173`, micro de oscilador y red falsa): la grabadora da ~7,9 KB por 2,5 s y la
  petición del Repaso lleva el audio (11,7 KB, parte `audio/webm` de 10 316 caracteres): el fallo solo aparece en el teléfono.
- `tests/emptyRecording.test.mjs`: casos de `isEmptyRecording` (0 bytes, cabecera de 300 B sin decodificar, audio real) y
  `distrustMic` (con la confianza puesta no se mide; tras `distrustMic` la apertura busca otro micro con señal).
- `npx tsc -b` OK · `npm run lint` 0 errores · `npm test` 41/41.

**Para el teléfono.** Con los auriculares: conectar → modo «Auriculares» → desconectar → grabar en el Repaso: debe salir
«No te he oído» (o grabar ya con el micro del teléfono), nunca el error 400.

## E2 · Fonética del Repaso contra la frase equivocada

**Qué pasaba.** Captura del dueño (2026-10-08 10:44): tarjeta «habla de la fidelidad», respuesta de referencia «talks about
the loyalty». Dijo «speaks about loyalty» y Gemini lo dio por **correcto**, pero Azure dio 62/100 y «Cuida «the» (te la
comiste), «talks» (el sonido /t/)»: palabras que nunca dijo. El Repaso pasaba a Azure como referencia `card.answerEn`
(`ReviewScreen.tsx`, v5.9 §5) y Azure evaluaba el audio contra esa frase. La clase ya lo hacía bien: usa la transcripción
de Gemini (lo que dijiste).

**Qué se cambió.** El Repaso usa como referencia la **transcripción de Gemini** (`DrillResult.transcript`), igual que la
clase: se lanza Azure en paralelo con una promesa de referencia que se resuelve con la transcripción cuando llega la
evaluación. Si Gemini falla o no se oyó nada, la referencia queda vacía y Azure da su nota sin referencia (lo que entendió
él), sin inventar omisiones. El test de nivel no cambia (ya iba sin referencia).

**Para el teléfono (R21, gasta segundos del F0 de Azure: pedir permiso al dueño).** Decir una variante válida de la
respuesta de la tarjeta: la nota y las «palabras a cuidar» deben referirse a lo que dijiste.

## E3 · Volver al micro del teléfono al desconectar los auriculares — pendiente
La app ya lo intenta (`AudioPicker.tsx`: sin auriculares → `apply('none')` → `setMicMode('auto')` y ruta «teléfono»), pero
en el caso del dueño no ocurrió. Se reproducirá en el POCO con la app «Habla debug» y los auriculares del dueño para ver
qué no llega (aviso `devicesChanged`, estado de Android que sigue listando el dispositivo, ruta SCO…). E1 ya evita el
síntoma (no se envía audio vacío y se vuelve a medir el micro).

## Mejoras 1 y 2: oír cada corrección y ▶/⏸ en toda la app

Pedidas por el dueño (2026-10-08). Autor: dev. Sin commit.

**Qué se cambió.**
- **Estado común «qué está sonando»** (`src/lib/speaking.ts`, nuevo, sin el plugin nativo para poder probarlo): una clave
  (por defecto, la frase) + suscriptores + hook `useSpeaking(key)` (`useSyncExternalStore`). `beginSpeaking()` usa turnos:
  el final tardío de una frase interrumpida no devuelve a ▶ la que la sustituyó.
- **`src/lib/tts.ts`**: `speak(text, rate, voice, key = text)` marca la clave al empezar y la limpia al terminar, fallar o
  ser interrumpida (se apoya en `finishCurrent`, porque en Android el plugin no resuelve una frase cortada);
  `stopSpeaking()` la limpia siempre. Nuevo `toggleSpeak(text, rate?, voice?, key?)`: si esa clave suena, para; si no, lee.
  Además, si te paran (u otra frase empieza) mientras se busca la voz, la frase ya no se lanza: antes podía sonar con el
  botón ya en ▶ y dejar una promesa colgada.
- **Velocidad y voz en `tts.ts` (`setVoicePrefs`)**, fijadas desde `App.tsx` en el mismo efecto que `setTeacherVoice`.
  Por qué así y no por props: `CorrectionView` lo usan la clase y el informe (y el informe también Progreso), y habría
  que pasar `ttsRate`/`voiceIndex` por tres niveles; la voz del profe ya vivía así en `tts.ts`. Los demás botones siguen
  pasando sus ajustes explícitamente.
- **Icono `pause`** (`src/ui/icon-paths.ts`, dos barras con el mismo trazo) y **`src/components/SpeakIcon.tsx`**: icono
  ▶ (`speaker`/`speakerWave`) que pasa a ⏸ mientras suena su clave; sirve dentro de listas (el hook no va en un `.map`).
- **Mejora 1** — `CorrectionView.tsx`: botón ▶ de 32×32 pegado a la frase corregida (`inline-flex` con la frase, para que
  el `flex-wrap` no lo deje suelto), con `stopPropagation` y la voz del profe.
- **Mejora 2** — ▶/⏸ con `toggleSpeak` + `SpeakIcon` en: `LookupCard` (palabra y ejemplo), `ReportView` (frase del día),
  `PlanScreen` (frase de la lección), `ProgressScreen` (Palabras), `ReviewScreen` (respuesta de la tarjeta; solo el botón,
  no se tocó `toggleRecord`), `Conversation` (chips del tema en sus dos formas y «Repetir» de cada mensaje del profe: como
  la clave es la frase, cuando el profe lee un mensaje solo, su «Repetir» también muestra ⏸ y tocarlo lo para),
  `PronunciationView` (palabras a cuidar, con la prop opcional `pausable` que pasan la clase y el repaso),
  `SoundTest` («Repetir» → «hablando… · parar») y `SettingsScreen` («Probar voz» → «hablando… · parar»). En las dos
  últimas el estado «hablando» (y la mascota) sale ya del estado común, no de un `useState` propio.
- **Test de nivel sin cambios** (decisión del dueño: allí no se puede pausar ningún audio): `Calibration.tsx` no se tocó
  para esto; su audición, «Escuchar otra vez» y las palabras de `PronunciationView` (sin `pausable`) siguen como antes.
- Sin cambios en lo que se lee ni en cuándo se lee solo. Los botones sin icono (ideas de respuesta, colocaciones de la
  consulta, elegir profe en la bienvenida) siguen igual.

**Cómo se probó.**
- `tests/speaking.test.mjs` (nuevo, 3 pruebas): turnos de `speaking.ts`; `toggleSpeak` con un `speechSynthesis` falso que,
  como Android, no avisa al interrumpir: ▶→⏸, otro botón para el anterior (y su promesa se resuelve), volver a tocar para,
  al terminar solo vuelve a ▶, `speak`/`stopSpeaking` de otra parte mueven el estado; parar durante la preparación no lanza
  la frase.
- `npx tsc -b` OK · `npm run lint` 0 errores (solo avisos antiguos) · `npm test` 44/44.
- Navegador (`play.localhost:5173`, voz simulada, sin claves ni red): dos `CorrectionView` reales + dos chips con
  `SpeakIcon` montados sobre la app. Tocar la 1.ª corrección → ⏸ y se lee esa frase; tocar la 2.ª → la 1.ª vuelve a ▶ y la
  2.ª pasa a ⏸; tocarla otra vez → para (▶); chip → ⏸, fin de la frase → ▶; `stopSpeaking()` externo → todo ▶. El clic del
  contenedor no se dispara (0). En 360×780 la frase larga se parte y el botón queda a su lado; en 780×360 todo en una
  línea; en 320×640 sin desbordar (`scrollWidth` 320).

**Para el teléfono.** En la clase: tocar ▶ de una corrección (suena con la voz y velocidad elegidas), tocar otro ▶ mientras
suena, tocar ⏸; «Repetir» del profe muestra ⏸ mientras lee solo y se puede parar; al irse a segundo plano los iconos vuelven
a ▶. Comprobar en el motor de Google TTS que una frase interrumpida no deja ningún icono en ⏸. En el test de nivel, que nada
se pueda pausar.

## M3 · Novedades: parches dentro de su versión (petición del dueño, 2026-10-06 y 2026-10-08)

**Qué.** Cada versión lleva su lista de parches (`Release.patches`): la 5.9.1 cuelga de la 5.9 y la 5.8.1 y 5.8.2 de la
5.8 (antes eran versiones sueltas). En Acerca de → Novedades, al abrir una versión se ve lo que trajo y debajo
«Parches de seguridad y corrección», con un desplegable independiente por parche («Parche de seguridad 5.9.1»). La
cabecera dice «N parches» e «instalada (5.9.1)»; al entrar se abren solas la versión instalada y su parche. Al
actualizar a un parche, la mascota dice «Parche de seguridad 5.9.1» con lo que trae (antes no encontraba «5.9.1» en
la lista y mostraba las novedades de la última versión). Los parches siempre van bajo su versión X.Y.

**Dónde.** `src/lib/changelog.ts` (`patches`, `findRelease`, `latestEntry`), `src/screens/AboutScreen.tsx`
(`ReleaseGroups`, `Chevron`, estado `openPatches`), `src/screens/NoticeGate.tsx`.

**Cómo se probó.** Navegador (`rev.localhost:5173`, 390×844, datos ficticios): aviso de la mascota «Parche de seguridad
5.9.1»; Acerca de → «v5.9.1 · Build 37»; Novedades → 5.9 abierta «7 oct 2026 · instalada (5.9.1) · 1 parche» con el
5.9.1 abierto e «instalado»; 5.8 «2 parches» con 5.8.1 y 5.8.2 cerrados. `tsc` OK, lint 0 errores, `npm test` 44/44.
