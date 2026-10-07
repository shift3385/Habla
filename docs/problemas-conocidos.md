# Problemas conocidos, deuda técnica y partes frágiles

La lista oficial y priorizada de defectos de la v5.8 está en **`docs/auditoria/resultados/INFORME.md`** (§5, §6 y §8), con identificadores `AUD-…`, evidencias y plan de corrección. Aquí va un resumen de lo más importante y, sobre todo, **lo que no está en la auditoría**: conocimiento de las sesiones de desarrollo.

## 1. Defectos abiertos (resumen de la auditoría)

| Prioridad | Problema | Dónde |
|---|---|---|
| ~~P0~~ **Corregido en 5.8.1 (pendiente de prueba en el teléfono)** | Micrófono huérfano por doble toque (AUD-MIC-302), `open()` no cancelable (AUD-MIC-301), Debate grabando tras «Atrás» (AUD-MIC-303), segundo dedo (AUD-MIC-304), `fallback()` en silencio sin cancelación de eco (AUD-MIC-800), red nativa (AUD-MIC-308). Detalle en `docs/correccion/NC-v5.8.1.md` | `recorder.ts`, `TopicAskPage.tsx`, `TalkButton.tsx`, `MainActivity.java`, `HablaChromeClient.java` |
| Medio | **Micro ya abierto con el hilo JS bloqueado:** Android no tiene API para cortar desde Java una captura que el WebView ya abrió; la red nativa de la 5.8.1 solo deniega aperturas nuevas en segundo plano. Si el JS está bloqueado, la captura sigue hasta que se libera (Android la silencia a los ~5 s) (resto de AUD-MIC-308) | `MainActivity.java`, `lifecycle.ts` |
| **Alto** | **APK depurable:** cualquier PC con la depuración USB autorizada lee las claves (Gemini, Azure, secreto de Monitor) sin huella. La huella solo protege la pantalla (AUD-SEG-001) | build *debug* |
| Medio | **Micro abierto toda la clase** (punto verde, modo llamada) aunque no se hable (AUD-MIC-305). Es una decisión de diseño pendiente para la 5.9 | `Conversation.tsx` |
| Medio | **Importar no valida:** una copia vacía borra el progreso diciendo «Importado ✓»; una mal formada deja la app en negro (AUD-SEG-501, AUD-RES-704) | `backup.ts`, arranque en `App.tsx` |
| Medio | **Clave de Gemini nueva y errónea** pisa la buena antes de comprobarla en Ajustes (AUD-FLU-209). En la bienvenida sí se comprueba antes | `SettingsScreen.tsx` |
| Medio | **CPU en primer plano:** el fondo animado y la mascota ocupan 1,7–3 núcleos sin tocar nada; el teléfono se calienta (AUD-RES-700) | `ui/Background.tsx`, `ui/Mascot.tsx` |
| Medio | **Privacidad sin aviso:** nombre, ocupación, motivos e intereses van a Google en cada turno; la voz va a Google y, con la fonética, a Microsoft. El tutorial dice que el progreso se guarda solo en el teléfono, que es cierto para los datos guardados pero no para lo enviado (AUD-FLU-210) | textos de la bienvenida y Ajustes |
| Medio | **El re-test no tiene salida** una vez empezado, y un re-test que falla al evaluarse deja un borrador con los audios (AUD-FLU-202, AUD-FLU-204) | `Calibration.tsx` |
| Bajo | **Recordatorio sin permiso:** falla en silencio si falta el permiso de notificaciones. Desde la 5.8, Meta diaria avisa, pero solo si entras ahí (AUD-FLU-900) | `reminders.ts` |

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
- **`gradlew assembleDebug` copia el APK a `apk/`** con el nombre de la versión: compilar para probar pisa el APK entregado de esa versión. Para comprobar que el Java compila usa `:app:compileDebugJavaWithJavac --offline`.
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
