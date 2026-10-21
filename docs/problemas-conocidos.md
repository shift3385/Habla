# Problemas conocidos, deuda técnica y partes frágiles

La lista oficial y priorizada de defectos de la v5.8 está en **`docs/auditoria/resultados/INFORME.md`** (§5, §6 y §8), con identificadores `AUD-…`, evidencias y plan de corrección. Aquí va un resumen de lo más importante y, sobre todo, **lo que no está en la auditoría**: conocimiento de las sesiones de desarrollo.

## 1. Defectos abiertos (a 2026-10-21, v5.10.1)

La regresión de la 5.10 (`docs/pruebas/regresion-5.10/INFORME.md`) y la corrección de la 5.10.1 (`CORRECCION.md`, `REVISION-5.10.1.md`) cerraron los P1 de esa regresión. Ya **corregidos** (no volver a listarlos): todo el bloque de la auditoría 5.8 de micrófono (5.8.1), APK depurable (5.8.2), importar sin validar, clave errónea, CPU en reposo (en parte, MOV-3), micro abierto toda la clase (5.9), privacidad sin aviso, re-test sin salida, recordatorio sin permiso, E3 de la 5.9.1 (auriculares), micro lento con auriculares (REG-M-01) y grabaciones perdidas sin aviso (REG-M-02).

| Prioridad | Problema | Dónde |
|---|---|---|
| Medio | **Micro ya abierto con el hilo JS bloqueado** (resto de AUD-MIC-308): Android no permite cortar desde Java una captura que el WebView ya abrió; el dueño decidió estudiarlo más adelante | `MainActivity.java`, `lifecycle.ts` |
| Bajo | **REG-N-01:** la prueba de sonido nueva puede salir encima del aviso «Dejamos una clase a medias» y, si el primer intento no oye voz, cambiar sin avisar el modo de los auriculares a «micro del teléfono» (en corrección al cerrar la 5.10.1) | `AudioPicker.tsx`, `SoundTest.tsx`, `App.tsx` |
| Bajo | **CPU en reposo** con una clase larga abierta: 28–52 % (debug) + renderer; el JS está inactivo, cuesta pintar la mascota. Medir en la release antes de abrir NC | `ui/Mascot.tsx` |
| Bajo | **Seguridad (backlog):** sin CSP (SEG-503), tema y noticia sin delimitar en el prompt (SEG-509, test `todo`), `file_paths.xml` con `external-path` (se dejó a propósito) | `index.html`, `teacher.ts`, `res/xml` |
| Bajo | **Regla CSS inválida desde la 5.7:** `html[data-landscape] .shell … > .relative.z-[2]` (corchetes sin escapar) nunca se ha aplicado; corregirla cambiaría el horizontal: hacerlo con pruebas en la 5.11 | `index.css:393` |
| Bajo | Con letra «Muy grande», la pestaña Prácticas del Inicio desplaza 3–5 px a 390×844 | `Home.tsx` |

## 2. Seguridad e incidentes de las claves

- **Hasta la 5.7 (y en compilaciones intermedias de la 5.8), las claves salían en logcat.** El puente de Capacitor imprimía los resultados de los plugins, incluido el JSON de ajustes. Se corrigió con `loggingBehavior: 'none'`. Durante la depuración del 2026-10-05, las claves del dueño llegaron a aparecer en la salida de una sesión de Claude: **se le recomendó regenerar las claves de Gemini y Azure**. No consta si lo hizo. Los APK antiguos de `apk/` siguen teniendo el fallo y **no deben instalarse**.
- **`confirmIdentity` deja pasar si el teléfono no tiene bloqueo de pantalla**, y en el navegador siempre deja pasar. Los 60 s de gracia valen para cualquier credencial, no para una concreta (AUD-SEG-502).
- **Nunca devuelvas por CDP el JSON de `habla.settings`** (contiene las claves). Resúmelo.

## 3. Fonética (Azure): limitaciones conocidas

- **Doble llamada a Azure:** cuando lo que entendió Azure no coincide con la transcripción de Gemini, se evalúa dos veces. Eso duplica el tiempo y gasta el doble de las 5 h gratis de F0 en esos turnos. Es intencionado (sin ello las notas eran engañosas), pero hay que tenerlo en cuenta con el consumo.
- **Inserciones falsas en las pausas:** con texto de referencia, Azure a veces marca palabras «insertadas» en los silencios (`the`, `is`). Rebajan «Completa», pero no salen en la frase del coach.
- **Palabras mal dichas que suenan a otra palabra válida** pueden escaparse (p. ej. «bery» por «very» sacó 94 con voz sintética).
- **Límite de 60 s:** solo se aplica con la fonética activa; sin ella no hay tope. Si se graba más con la fonética activa, `toWav16k` recorta a 60 s.
- **El comportamiento sin referencia de la REST de audio corto** se verificó en el teléfono real con la clave del dueño (devuelve notas). Si Azure cambia, `assessPronunciation` vuelve a evaluar con la referencia.

## 4. Partes frágiles del código

- **`recorder.ts`**: fue el origen de los P0 de la 5.8. Desde la 5.8.1, `open()`/`begin()` comparten la apertura en curso, devuelven `false` si se cancelaron y `close()` sube una generación que cada `await` comprueba. Cualquier `await` nuevo dentro de la apertura **debe** comprobar `cancelled()` al volver y no tocar `this.stream` si cambió. Ejecuta `npm test` tras tocarlo.
- **`lifecycle.ts` y el aviso `pause`:** desde la 5.8.1 el `pause` de Capacitor (Activity.onPause) no cierra micros (llega con el diálogo de permiso y cancelaría la apertura). El segundo plano real es `appStateChange`, `visibilitychange`, `pagehide` y `window.__hablaBackground()` desde `MainActivity.onStop`.
- **`assembleRelease` y `assembleDebug` copian el APK a `apk/`.** Desde la 5.8.2 el debug lleva el sufijo `-debug` y ya no pisa el release, pero compilar el release para probar sí sustituye el `Habla-v<versión>.apk` de esa versión. Para comprobar que el Java compila usa `:app:compileDebugJavaWithJavac --offline`; para empaquetar sin copiar, `:app:packageRelease --offline`.
- **Minutos del repaso (5.9) en `localStorage`** (`habla.practiceSeconds`, últimos 60 días): no van en las copias de seguridad y se ponen a cero al importar una. Si se reinstala, la racha solo de días de repaso se pierde.
- **Clase en horizontal muy estrecha (640×320):** el micro queda pegado a la tarjeta del tema (se puede tocar por el centro). En 780×360 (Galaxy A11) todo cabe.
- **Fonética del test (5.9):** sin texto de referencia (habla libre) y recortada a 60 s por tarea; solo informativa.
- **R8 en el release (5.8.2):** Capacitor y sus plugins se cargan por reflexión. `proguard-rules.pro` conserva enteros sus paquetes y los plugins propios; si un plugin falla solo en el release, el plan B es `minifyEnabled false` (sigue sin ser depurable).
- **`Calibration.tsx` (~1300 líneas)** y **`Conversation.tsx`** son enormes, con mucho estado en `useState` y `useRef`. En `Conversation`, el `useCallback` de `askTeacher` tiene dependencias que faltan (`startPronunciation`, `persist`): funciona porque esas funciones leen refs (`settingsRef`), pero un cambio que dependa del estado capturado puede romperse en silencio.
- **Retomar el test (`testDraft.ts`, clave `progress`):** solo se retoma en gramática, resúmenes y habla. Si la app se cierra a mitad de un texto de lectura o de un audio de escucha, se vuelve al último resumen y ese ítem se repite. `restore()` reconstruye la lista de preguntas vistas a partir de los datos guardados; si cambias cómo se llena `used.current`, revisa también `restore()`.
- **Rescate de estado por CDP:** para rescatar el test de la madre se leyeron los hooks de React por su **posición** en la lista (índices 7, 8, 10, 11, 23, 24, 31…). Cualquier cambio en el orden de los `useState` y `useRef` de `Calibration.tsx` invalida esos índices. Es una técnica de emergencia, no una API.
- **`InfiniteList`** calcula su alto con el contenedor `.tab-content` (su relleno inferior) y vuelve a medir con `ResizeObserver` y `animationend`. Si cambias la clase o el relleno del contenedor de pestañas, el panel se descuadra.
- **`MascotBubble`** calcula su posición al mostrarse (junto a la mascota y sin tapar «Sorpréndeme» si hay ≥ 222 px). Si se gira el teléfono con el globo visible, no se recoloca hasta el siguiente globo.
- **`useMemo` de los consejos en `Home.tsx`** tiene `eslint-disable` en sus dependencias. Si añades datos a `buildTips`, añádelos a la lista a mano.
- **Imágenes de la mascota en la notificación** (`android/app/src/main/res/drawable-nodpi/mascot_*.png`): son capturas fijas del SVG en reposo, a 256 px. Si cambia el diseño de una mascota hay que regenerarlas: renderizar el SVG de *Ajustes → Tema y mascota* en un `canvas` y guardarlo como PNG.
- **Enlaces externos** (`OutLink` en `Onboarding.tsx`): dependen de que Capacitor abra en el navegador del sistema las URL ajenas. Si cambia ese comportamiento, los botones dejarían de abrir AI Studio y el portal de Azure.
- **`color-mix()`** en `.tip-bubble` requiere un WebView moderno. Hay *fallback* con `@supports`.

## 5. Deuda técnica

- **Pocos tests automatizados.** Desde la 5.8.1 hay runner (`npm test`: `node:test` + Vite `ssrLoadModule`, en `tests/`) con 17 pruebas del Recorder y micro simulado. Faltan `levels`, `bank`, `placement`, `fluency` y `backup` (AUD-ARQ-113).
- **Bundle único de ~1,3 MB** (el aviso de Vite «chunk larger than 500 kB» es esperado).
- **Prettier no configurado.** Si se ejecuta sin opciones reformatea con comillas dobles y punto y coma. Usa `--no-semi --single-quote --print-width 150 --trailing-comma all`.
- **Finales de línea mezclados (CRLF y LF).**
- **Avisos de lint antiguos (~6):** `Calibration.tsx` (lectura antes de declarar `runEval`, `restore` y `resumable`, y ref en la limpieza de un efecto), `Conversation.tsx` (dependencias de `useCallback`) y `SettingsScreen.tsx` (`Date.now` en el render).
- **`versionCode` 33 repetido** en varias compilaciones de la 5.8. Android lo permite con `install -r`, pero dos APK distintos de la «5.8» no se distinguen por el número. A partir de ahora, cada entrega sube `build`.
- **Peticiones sin `AbortController`** en varias pantallas: una respuesta tardía puede llegar con la pantalla ya cerrada (AUD-RES-705/706).

## 6. Datos y entorno

- **La clase guardada del dueño** («AI Supercomputer Accelerates…») tiene **varias respuestas de prueba con voz sintética**: «I think about three things every morning before work.» y frases A2 («Yesterday I go to the park…»). Son datos de pruebas, no código. Se le sugirió empezar una clase nueva.
- **`docs/prueba-fonetica-A2.png`** está sin añadir a git (captura de la prueba de fonética A2). Se dejó así a propósito: decide el dueño.
- **La vista previa del navegador (`localhost:5173`) suele empezar con el almacenamiento vacío** entre sesiones, y otras sesiones lo han vaciado. Para probar pantallas internas hay que crear el perfil de prueba otra vez (ver `configuracion.md`).
- **Xiaomi y POCO** bloquean `adb shell input`. El teléfono se maneja por CDP.
