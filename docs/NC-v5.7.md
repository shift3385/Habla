# Habla 5.7 — Respuesta a las no conformidades

APK: `apk/Habla-v5.7.apk` (build 32). Evidencia visual: `docs/evidencia-v5.7/`.
Pruebas: tipos (tsc), banco (`node scripts/validate-bank.mjs`), 40 reglas del test y 20 casos de validación por raíz, y recorridos en navegador a 360×780 (Galaxy A11), 320×640 y 780×360 (horizontal). **Pendiente en dispositivo real:** medir la batería con `dumpsys` y el botón atrás nativo (no había teléfono conectado).

## Funcionalidad

| NC | Qué se cambió | Dónde |
|---|---|---|
| NC-01 | Al final de **cada parte** del test (gramática, cada texto, cada audio) hay un resumen con la pregunta, tu respuesta y la correcta marcada, en el mismo formato que audición. | `screens/Calibration.tsx` (paso `review`, `ReviewCard`) |
| NC-02 | La audición muestra «dura unos 1 min 20 s», calculado con las palabras del guion y la velocidad a la que lo lee el teléfono. No se muestra tiempo restante del test. | `Calibration.tsx` (`audioSeconds`, `fmtDuration`) |
| NC-03 | El profe devuelve **todas** las correcciones de cada respuesta (lista, en orden), cada una con su explicación; todas van al cuaderno de errores. Las clases antiguas siguen mostrando la suya. La nota de precisión no cambia de escala. | `lib/teacher.ts` (esquema `corrections`), `lib/db.ts` (`turnCorrections`), `lib/fluency.ts`, `Conversation.tsx`, `ProgressScreen.tsx` |
| NC-04 | Validación flexible: misma respuesta con o sin artículo y **misma raíz** (reversibility = reversible, exposure = exposed, consistent = consistency). Los números no se recortan (eight ≠ eighty). Sin Gemini en tiempo real, como pide el marco del test. | `lib/bank.ts` (`stem`, `checkShort`) |
| NC-05 | Tema libre y Debate: botón «Dictar por voz»; Gemini (modelo rápido) transcribe en español o inglés y el texto queda editable. | `components/TopicAskPage.tsx`, `lib/dictation.ts` |

## Interfaz y textos

| NC | Qué se cambió | Dónde |
|---|---|---|
| NC-06 | Diálogos: en la revisión de audición, «Ver lo que se dijo» lista una línea por persona con su nombre; en clase, si el profe escribe «A: … B: …», se ve una línea por interlocutor. | `Calibration.tsx` (`Transcript`), `lib/dialogue.ts`, `Conversation.tsx` |
| NC-07 | La interfaz se diseñó para ~390×800. En pantallas menores se **escala todo en proporción** (`zoom`): el A11 (360×780) se ve igual que el Poco X6, sin solapes. Además, arreglos puntuales (cabecera del Inicio, fila «Clase en progreso», «Tus tests»). | `lib/viewport.ts`, `screens/Home.tsx`, `SettingsScreen.tsx` |
| NC-08 | Palabras: palabra, traducción y frase en líneas propias (2 líneas máx.), sin salirse; la tarjeta de resultado parte palabras largas. | `screens/WordsScreen.tsx`, `components/LookupCard.tsx` |
| NC-09 | La fórmula se dibuja como en una hoja: numerador, raya (ancho del numerador) y denominador, con «=» centrado en la raya y el resultado; con los números reales del alumno y la explicación en lista. | `components/Fraction.tsx`, `Calibration.tsx` |
| NC-10 | `SkillProgressCard` («Por habilidad»): una pieza única usada en Mi nivel, en los avisos de la mascota (re-test, repetir test), en las páginas previas al re-test y en el resultado. Las barras representan el **nivel A1–C2** (A1 = 1/6 … C2 = 6/6). | `components/SkillProgressCard.tsx` |
| NC-11 | Ajustes: «Mi perfil» (solo preferencias) y «Mi nivel» (nivel, por habilidad, propuesta de las clases, cambios, tests y re-test) separados. | `SettingsScreen.tsx` |
| NC-12 | Horizontal: páginas de la mascota en dos columnas (mascota | contenido); clase con el chat a la izquierda y los controles a la derecha; bienvenida y preparación en lienzo alto desplazable; resto en columna centrada. Girar no reinicia la pantalla (`configChanges`). | `lib/viewport.ts`, `index.css`, `components/MascotPage.tsx` |
| NC-13 | Créditos: sección «Tecnología con la que está hecha» (Claude Code, Capacitor 8, React 19, TypeScript, Tailwind 4, Vite 8, Gradle, IndexedDB, TTS del sistema, banco propio). | `screens/AboutScreen.tsx` |

## Rendimiento y comportamiento

### NC-14 Batería (crítica): causa raíz y medidas

**Causa raíz.** El micrófono de la clase se abría al empezar y se mantenía abierto toda la sesión (para no cortar la primera palabra). Si la app quedaba en segundo plano con una clase abierta, el `MediaStream` seguía capturando audio toda la noche: el sistema de audio no se dormía y la CPU tampoco. Además, el «modo llamada» / Bluetooth SCO del plugin de audio solo se soltaba si el JavaScript llegaba a ejecutarse, y la animación de la mascota (un fotograma tras otro) y los temporizadores del WebView no se pausaban explícitamente.

**Medidas:**
1. `lib/lifecycle.ts`: al pasar a segundo plano (pausa, `visibilitychange`, `pagehide`) se cierran **todos** los micrófonos (`releaseAllMics`), se calla la voz y se avisa a las pantallas (la clase se guarda).
2. `AudioRoutePlugin.handleOnStop` (nativo): suelta el dispositivo de comunicación, el SCO y vuelve a `MODE_NORMAL` aunque el JS no se ejecute.
3. `MainActivity.onStop`: `webView.onPause()` + `pauseTimers()` (para animaciones y temporizadores); `onStart` los reanuda.
4. No hay servicios en segundo plano, wakelocks ni sondeos; los recordatorios son alarmas del sistema (no despiertan la app).

### NC-15 / NC-16 Clase guardada y cierre

- Atrás (Android) o la flecha de la cabecera durante una clase: la mascota dice «Te espero aquí» y la clase **queda guardada**. «Terminar» sigue cerrándola con su informe. Durante una clase la barra de pestañas no se muestra (la clase es a pantalla completa); estas son sus salidas equivalentes.
- Se guarda tras cada intervención del profe y al minimizar o cerrar la app. Una sola entrada (`habla.savedClass`) que se sobrescribe; mensajes y correcciones en la base de datos.
- En Hablar aparece «Clase en progreso · Continuar». Al abrir la app con una clase guardada, la mascota ofrece **[Continuar mi clase]** o **[Ir al inicio]** (la clase se conserva). Sin clase guardada, entra directo.
- Empezar otra clase con una guardada: «Tienes una clase en progreso… ¿Continuar?» con **[Reanudar la anterior]** / **[Empezar nueva]** (la anterior se cierra y cuenta en tu progreso).
- Atrás en el Inicio: la mascota pregunta «¿Ya te vas?» y, si hay clase guardada, lo recuerda.

Código: `lib/savedClass.ts`, `Conversation.tsx` (`persist`, `leave`, `resume`), `App.tsx`, `NoticeGate.tsx`, `Home.tsx`.

## Dudas

### D-01 ¿El texto a voz gasta tokens?

**No.** La voz del profe, la audición del test y «Repetir» usan el motor de texto a voz del propio teléfono (`@capacitor-community/text-to-speech` → `TextToSpeech` de Android). Gemini no interviene y no se gastan tokens; como mucho, las voces «network» de Google pueden usar datos de internet.

Se gastan tokens solo al llamar a Gemini: cada turno de clase (tu audio + la respuesta del profe con su traducción, en una sola llamada), el tema del día, «¿Qué digo?», el informe final, consultas de Palabras, el plan, el repaso hablado, el dictado y la corrección del habla del test. Reproducir el audio del profe no gasta nada.

### D-02 Seguridad de la API key

| # | Hallazgo | Riesgo | Estado / recomendación |
|---|---|---|---|
| 1 | La clave **no está en la APK** (la escribe el usuario). Búsqueda de patrones `AIza…` en `dist/` y `android/`: nada. | — | Correcto. |
| 2 | Se envía por **HTTPS** en la cabecera `x-goog-api-key`, nunca en la URL. Sin tráfico en claro; Android 7+ no confía en certificados de usuario, lo que dificulta interceptarla. | Bajo | Correcto. |
| 3 | Logs (`[HABLA-NET]`, Diagnóstico): guardan modelo, tamaño, tiempo y tokens; **no la clave**. | — | Correcto. |
| 4 | Copias de progreso exportadas: excluyen la clave. | — | Correcto. |
| 5 | Almacenamiento: Preferences → `SharedPreferences` (`CapacitorStorage.xml`) en texto plano, en la carpeta privada de la app. Legible con root. | Medio | Recomendado: cifrarla con Android Keystore (EncryptedSharedPreferences). |
| 6 | `allowBackup="true"`: la copia automática de Android incluía ese fichero (clave en Google Drive / al pasar a otro teléfono). | Medio | **Corregido en 5.7**: `backup_rules.xml` y `data_extraction_rules.xml` lo excluyen. |
| 7 | La APK es *debug*: es depurable (`run-as`, depuración del WebView). Con el teléfono desbloqueado y la depuración USB activa, alguien con un cable podría leer la clave. | Alto (si se dan esas condiciones) | Distribuir una compilación *release* (no depurable, WebView sin depuración) y desactivar la depuración USB cuando no se use. |
| 8 | Ofuscación (`minifyEnabled false`). | Bajo | No afecta a la clave (no está en el código). Activar R8 en *release*. |
| 9 | Una clave robada se puede usar desde cualquier sitio. | Medio | En Google Cloud Console: restringir la clave a «Generative Language API» y poner presupuesto/alertas. A largo plazo, un servidor intermedio que guarde la clave. |

## Pendientes y respuestas a los adjuntos

- Las barras de NC-10 representan el **nivel A1–C2**, no un porcentaje de avance.
- Fórmula real (NC-09): Nivel = (G + L + A + H) / 4, con A1 = 1 … C2 = 6; un ,5 se redondea hacia abajo; tope = destreza más baja + 2.
- En dispositivo: confirmar con `adb shell dumpsys audio` que, con la app en segundo plano, no queda ninguna grabación activa y el modo es NORMAL; probar atrás en el Inicio y el giro con una clase abierta.
