# PROYECTO HABLA (APK Android): No Conformidades — Pantalla de Ajustes (v5.7, rebuild)

## Rol

Actúa como desarrollador senior Android/UX y QA. Resuelve cada NC sobre la versión 5.7 **sin cambiar el número de versión** (nuevo rebuild que incluye todo lo ya entregado en la 5.7 más estos cambios). Entrega el resumen por NC y evidencia visual.

## Contexto de dispositivos

- Referencia: Poco X6. Pantalla pequeña: Galaxy A11 (360×780 px CSS).

---

## 1. No conformidades

### NC-17 | Duplicidad: "Cambiar" (tarjeta superior) y "Profe y voz"
- **Actual:** el botón **Cambiar** de la tarjeta del profe y la opción **Profe y voz** abren la misma pantalla.
- **Esperado:** un solo acceso a "Profe y voz". La tarjeta superior deja de llevar a esa pantalla (ver NC-18).

### NC-18 | Resumen de nivel en la tarjeta superior
- **Esperado:** la tarjeta superior de Ajustes muestra un **resumen llamativo del nivel**, contado por la mascota seleccionada: nivel general en grande, las cuatro habilidades (misma representación que "Por habilidad", `SkillProgressCard`) y el estado del re-test.
- Todo debe caber cómodo en pantalla. Al tocar la tarjeta se abre **Mi nivel** con el detalle; la opción "Mi nivel" de la rejilla se retira (queda en la tarjeta).

### NC-19 | Opciones con lo que está seleccionado
- **Esperado:** cada opción muestra **en grande lo elegido actualmente** (p. ej. "Emma · 0.95×", "Gota · Marea", "5 min al día", el nombre del alumno, el modelo de Gemini, la versión) y en pequeño el nombre de la sección.
- Toda la pantalla de Ajustes debe verse **sin scroll** (también en el Galaxy A11).

### NC-20 | Exportar/importar datos dentro de Mi perfil
- **Esperado:** "Mis datos" (exportar e importar) pasa a estar dentro de **Mi perfil**, para liberar espacio en el panel principal.

### NC-21 | La mascota invita a ver el detalle del nivel
- **Esperado:** en la tarjeta de resumen de Ajustes, la mascota invita explícitamente a tocarla para ver los detalles del nivel.

### NC-22 | Revalidar el nivel desde la tarjeta
- **Esperado:** la tarjeta indica cuándo se puede volver a hacer el test; cuando ya se puede, dice "toca aquí para revalidar tu nivel" y al tocarlo abre el test.

### NC-23 | "Tus tests de nivel" sin redundancia y con resumen guardable
- **Actual:** cada test repite los niveles por habilidad, que ya se ven arriba en "Por habilidad".
- **Esperado:** en su lugar, un **mini resumen de cómo fue el examen**. Cada test es tocable y abre el **resumen final** del examen, con la opción de **guardarlo**, para verlo cuando se desee.

### NC-24 | Texto del botón del próximo test
- **Actual:** "Re-test disponible el 1 de noviembre".
- **Esperado:** "**Nuevo test disponible el** 1 de noviembre" (misma fecha, mismo formato).

### NC-25 | Confirmación con el bloqueo del teléfono para la clave
- **Esperado:** para **ver** o **cambiar** la clave de Gemini se pide como confirmación secundaria el patrón (o PIN/huella) del teléfono.

### NC-26 | Orientación forzada
- **Actual:** en algunos teléfonos la app no gira a horizontal (sensor o versión de Android). Una raya en el borde izquierdo de la pantalla tapa las primeras letras de cada frase.
- **Esperado:** una opción en Ajustes (en **Tema y mascota**) que fuerce la orientación de la app de vertical a horizontal, aunque el teléfono no gire.

**Verificación:** capturas del panel de Ajustes en 360×780 sin scroll, y navegación a Mi nivel, Mi perfil (con Mis datos), Profe y voz y el resumen de un test.

---

## 2. Respuesta

APK: `apk/Habla-v5.7.apk` (misma versión 5.7, build 32, nuevo rebuild con todo lo anterior). Código en `src/screens/SettingsScreen.tsx`.

| NC | Qué se hizo |
|---|---|
| NC-17 | La tarjeta superior ya no abre "Profe y voz": la única entrada es la opción **Profe y voz** de la rejilla. Se mantuvo esa opción (y no "Cambiar") porque la tarjeta superior pasa a ser el resumen de nivel; así no queda ningún acceso repetido y el profe y la voz siguen a un toque. |
| NC-18 | Tarjeta superior = **resumen de nivel**: la mascota ("Gota: tu nivel es") con el nivel general en grande, la etiqueta del re-test ("Re-test en 28 días" o "¡Re-test disponible!" resaltado), "Ver mi nivel ›" y las cuatro barras de `SkillProgressCard`. Tocarla abre **Mi nivel** (detalle, propuesta de las clases, cambios, tests y botón de re-test). La opción "Mi nivel" de la rejilla se retiró. |
| NC-19 | Rejilla de 6 opciones de 2 columnas; cada una muestra en grande lo seleccionado y en pequeño la sección: **Emma · 0.95×** (Profe y voz), **Gota · Marea** (Tema y mascota), **5 min al día** (Meta diaria), **Liomar** (Mi perfil y datos), **Gemini 3.8-flash** (Gemini), **Versión 5.7** (Acerca de Habla). Para que todo quepa: "Acerca de" pasa a la rejilla, **Diagnóstico** se mueve dentro de **Gemini** (es la velocidad de Gemini) y "Ver la bienvenida otra vez" dentro de **Mi perfil**. Resultado en 360×780: contenido 845 px de 845 px útiles → **sin scroll**. |
| NC-20 | **Mi perfil y datos**: el formulario del perfil, debajo "Mis datos" (exportar/importar copia) y "Ver la bienvenida otra vez". La opción "Mis datos" se retiró del panel. |

| NC-21 | Debajo de las barras, la mascota dice "**Gota: toca aquí y te cuento los detalles de tu nivel ›**" (con el nombre de la mascota elegida). Toda la tarjeta lleva a Mi nivel. |
| NC-22 | Antes de la fecha, la etiqueta dice "**Nuevo test el 30 oct**". Cuando ya toca, se convierte en un botón resaltado "**¡Toca aquí para revalidar tu nivel!**" que abre el test directamente (sin pasar por Mi nivel). |
| NC-23 | Cada test de "Tus tests de nivel" muestra la fecha, el nivel y un **mini resumen**: "Gramática 14/20 · Lectura 9/12 · Audición 9/12 · Habla B1", más "Ver el resumen completo y guardarlo". Al tocarlo se abre el **resumen final**: la fórmula como fracción, cómo te fue en cada texto y audio (aciertos), tu habla por criterio con su justificación, lo que haces bien, qué trabajar y cada pregunta con tu respuesta y la correcta (plegado por partes). Botón **Guardar el resumen**: lo guarda como texto en Documentos/Habla y abre Compartir (Drive, WhatsApp, correo…). El resumen se guarda **automáticamente con cada test** desde esta versión; los tests anteriores muestran lo que se guardó entonces y lo indican. |
| NC-24 | El botón dice "**Nuevo test disponible el 30 de octubre**" (y, cuando ya toca, "Hacer el nuevo test de nivel"). |

| NC-25 | Plugin nativo propio `DeviceAuthPlugin`: Android 11+ abre el diálogo del sistema (BiometricPrompt) con huella **o** patrón/PIN/contraseña; Android 7–10, la pantalla de confirmación de credencial del sistema. Se pide al tocar el ojo para **ver** la clave y al **guardar una clave distinta** (en Gemini y en el aviso/la pantalla de error con otra clave). El campo de la clave ya **no viene relleno**: muestra «Clave guardada · termina en …XXXX» y solo se carga tras confirmar. Comprobar la clave actual no lo pide. Tras confirmar no se vuelve a pedir durante 1 minuto. Si el teléfono no tiene bloqueo, deja pasar y avisa de que conviene ponerlo. La primera vez que se escribe la clave (bienvenida) no se pide, porque no hay ninguna que proteger. Comprobado en el Poco X6: al tocar el ojo se abre el diálogo de seguridad del sistema (Android no permite capturarlo). |

| NC-26 | **Tema y mascota → Orientación de la pantalla**: Automática (gira con el teléfono), Vertical, **Horizontal** y **Horizontal al revés**. Las horizontales fijan la pantalla sin depender del sensor (plugin nativo `OrientationPlugin`). Con las dos direcciones, la raya del borde izquierdo pasa a quedar arriba o abajo, a elección, y deja de tapar el principio de las frases. Se guarda y se aplica al abrir la app. Mejoras para usarla siempre en horizontal: las pestañas pasan a un **carril vertical a la derecha** (el contenido usa toda la altura) y la bienvenida baja sola hasta «Continuar». Comprobado en el Poco X6 con `dumpsys`: Horizontal → `LANDSCAPE` (pantalla girada 90°), al revés → `REVERSE_LANDSCAPE` (270°), Automática → `UNSPECIFIED` (vertical); la opción se mantiene tras cerrar y abrir la app (`21-poco-horizontal-forzada.png`). |

**Evidencia:** `docs/evidencia-v5.7/17-a11-ajustes-resumen-nivel.jpg` (panel sin scroll en 360×780, con la invitación de la mascota y "Nuevo test el 30 oct"), `18-a11-mi-nivel-detalle.jpg`, `19-a11-mis-tests-mini-resumen.jpg` (tests con mini resumen y el nuevo texto del botón) y `20-a11-resumen-completo-test.jpg` (resumen completo). Comprobado en vista previa: Mi perfil contiene Mis datos y la bienvenida, Gemini contiene Diagnóstico y la tarjeta superior abre Mi nivel.

**Instalado y comprobado en el teléfono real (Poco X6)** — además, verificación de la NC-14 (batería) en el dispositivo:

| Momento | Grabaciones de Habla (`dumpsys media.audio_policy`) | Modo de audio (`dumpsys audio`) | Wakelocks de Habla |
|---|---|---|---|
| App delante, micrófono abierto (dictado) | 1 activa (`VOICE_COMMUNICATION`) | `MODE_IN_COMMUNICATION` | `AudioIn` |
| 5 s en segundo plano | ninguna | `MODE_NORMAL` | — |
| 30 s en segundo plano | ninguna | `MODE_NORMAL` | ninguno retenido |
