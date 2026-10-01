# Habla 🎙️

Tu profesor de inglés por voz con IA. App Android personal (no se publica en ninguna tienda).

- **Profe:** Google Gemini (por defecto `gemini-3.8-flash`; se puede cambiar en Ajustes). Recibe tu audio y, en una sola llamada, lo transcribe, te corrige y te responde.
- **Pausas y ritmo:** se calculan en el propio teléfono analizando el audio, sin coste.
- **Voz del profe:** el motor de texto a voz de Android (en-US)
- **Datos:** todo se guarda en el teléfono. Tu clave API solo vive en el teléfono y nunca va dentro del APK.

---

## 📦 Dónde está el APK

Después de compilar, el archivo está aquí:

```
D:\My Apps\HABLA\apk\Habla-v<versión>.apk
```

## 📲 Instalar en el teléfono (primera vez)

1. **Copia el APK al teléfono**. Elige cualquiera de estas opciones:
   - **Por cable USB:** conecta el teléfono y elige "Transferencia de archivos" en la notificación. En el Explorador de Windows, copia `Habla-v<versión>.apk` (por ejemplo `Habla-v3.0.apk`) a la carpeta `Download` del teléfono.
   - **Por Google Drive:** sube el APK a Drive desde el PC y descárgalo desde la app de Drive en el teléfono.
2. En el teléfono, abre **Archivos** (o "Mis archivos") → **Descargas** y toca el APK con la versión más alta (por ejemplo `Habla-v3.0.apk`).
3. Android dirá que no permite instalar apps de esta fuente. Toca **Ajustes** y activa **"Permitir de esta fuente"** para Archivos (o Drive). Vuelve atrás.
4. Toca **Instalar**. Si aparece Google Play Protect diciendo que la app es desconocida, toca **"Más detalles" → "Instalar de todos modos"**. Es normal: la app no viene de Play Store.
5. Abre **Habla**. Irás directo a **Ajustes**:
   - Pega tu `GEMINI_API_KEY` (empieza por `AIza`). Se crea en https://aistudio.google.com → *Get API key*.
   - Toca **Guardar y comprobar**. Debe salir ✅ junto con el modelo elegido.
6. La primera vez que pulses el botón de hablar, Android te pedirá permiso para el **micrófono**. Toca **"Mientras se usa la app"**.

## 🔄 Actualizar a una versión nueva (sin perder tus datos)

1. **Por seguridad**, antes de actualizar: en la app ve a **Ajustes → Mis datos → ⬆️ Exportar** y guarda el JSON en Drive o en el PC.
2. Copia el APK nuevo al teléfono igual que la primera vez.
3. Tócalo e instálalo **encima** de la app que ya tienes. **No desinstales antes.** Android dirá "¿Quieres instalar una actualización?" → **Instalar**.
4. Tu progreso y tu clave siguen ahí.

> **¿Por qué se conservan los datos?** Todos los APK se firman con la misma clave, la que está en `D:\My Apps\HABLA\keystore\`. Android solo deja actualizar encima si la firma coincide.
>
> ⚠️ **Haz una copia de la carpeta `keystore\`** en Drive o un USB. No está en git a propósito. Si la pierdes, el próximo APK tendrá otra firma y tendrás que desinstalar la app (se borrarán los datos) y restaurarlos con **Importar**.

## 💾 Copias de seguridad (exportar e importar)

- **Exportar:** *Ajustes → Mis datos → ⬆️ Exportar*. Guarda `habla-backup-AAAA-MM-DD.json` en `Documentos/Habla` (si Android lo permite) y abre "Compartir" para que lo mandes a Drive, a tu correo o al PC.
- **Importar:** *Ajustes → Mis datos → ⬇️ Importar* → elige el JSON. **Sustituye** todo el progreso actual por el del archivo.
- Las copias **no incluyen tu clave API**. Después de reinstalar tendrás que pegarla de nuevo.

Hazlo, por ejemplo, una vez por semana y siempre antes de cambiar de teléfono o reinstalar.

## 🗣️ Cómo usarla

### Bienvenida, profe y apariencia
- La primera vez verás una **bienvenida en 3 pasos**: el saludo, la elección de profe y tu nivel con la meta diaria. Puedes repetirla desde *Ajustes → Ver la bienvenida otra vez*.
- **Profes:**
  - **Emma**: acento americano; paciente, clara y muy positiva.
  - **Leo**: acento británico; directo, curioso y con humor.
  
  Cada profe tiene su orbe de colores, que late cuando habla, y su propia voz.
- **Temas visuales:** **Ember** (naranja y turquesa), **Lumi** (verde cristal) y **Aurora** (verde, naranja y ámbar), cada uno en modo **oscuro** o **claro**. Se cambian en *Ajustes → Apariencia*. El modo también se cambia con el icono de sol y luna del Inicio.

### Tu perfil (obligatorio)
- Antes del test, cada persona rellena **"Tu perfil"**: nombre, a qué se dedica (opcional), para qué quiere el inglés y qué temas le gustan.
- El profe te llama por tu nombre, adapta la **Entrevista de trabajo** y **Explicar a qué me dedico** a tu caso (si no trabajas, te pregunta por tu día a día), y "Sorpréndeme" elige más a menudo tus temas favoritos.
- Se puede cambiar en *Ajustes → Mi perfil*. El nivel no se puede cambiar ahí: solo se muestra.

### Test de nivel (obligatorio)
- Antes de usar la app, cada perfil hace un **test de nivel** de unos 12–15 minutos. Tiene 4 partes:
  - **Gramática y vocabulario:** 15 preguntas adaptativas, que suben o bajan de nivel según aciertas.
  - **Lectura:** 2 textos cortos.
  - **Audición:** 2 audios, cada uno se puede escuchar hasta 3 veces.
  - **Habla:** 3 respuestas por voz, que el profe evalúa.
- Antes de la lectura, la escucha y el habla aparece una **pantalla de instrucciones** con lo que hay que hacer. Recomienda **auriculares** para la escucha y **auriculares con micrófono** para el habla, porque mejoran mucho el reconocimiento de voz.
- Todas las preguntas tienen una opción **«No lo sé»**, con otro estilo: es mejor ser sincero que adivinar. Cuenta como no acertada, pero el profe recibe esos puntos como lagunas reconocidas y les da prioridad en el curso.
- El resultado (un nivel por habilidad, el nivel global y tus puntos débiles) adapta al profe: su vocabulario, la velocidad de la voz y lo que te hace practicar.
- **El nivel no se puede cambiar a mano.** El nivel de habla sube o baja con la práctica: como mucho un escalón por semana, según la nota media de tus últimas 5 sesiones. Cada 4 semanas se desbloquea un **re-test**, en *Ajustes → Mi nivel*.
- Si no hay clave de Gemini, la bienvenida la pide antes del test.

### Inicio
- **Racha** (icono de llama): días seguidos practicando.
- **Meta diaria**: los minutos que has hablado hoy (tu voz, no la duración de la clase). Cada tema la muestra a su manera: en Ember es un anillo; en Lumi, la tarjeta "Charla libre"; en Aurora, una barra junto al orbe.
- **Sorpréndeme** (icono de destello): un tema al azar, distinto de los últimos que usaste.
- **Tarea**: la tarea para mañana de tu última sesión. Tócala para leerla entera.
- **Temas / Prácticas**: un selector para cambiar entre las 12 categorías de temas y las 5 prácticas guiadas.
  - Los temas con punto de color (noticias, IA, tecnología, negocios y mercados, startups, ciencia, cine, deportes) **buscan en Google una noticia real y reciente**. El profe nunca repite un tema de tus últimas sesiones.
  - Las prácticas son: mis puntos débiles, entrevista técnica, explicar mi trabajo a un cliente, debate sobre un tema de actualidad y contar una historia.

### En la clase
1. Arriba ves la **tarjeta del tema**. Se pliega sola cuando respondes; tócala para volver a ver el resumen y el vocabulario. Toca las palabras para oírlas.
2. El botón de hablar funciona como en WhatsApp. Mientras grabas, las ondas se mueven y ves un cronómetro.
   - **Mantener y soltar:** habla con el dedo en el micrófono; al soltar se envía.
   - **Deslizar ↑ hasta el candado:** la grabación queda bloqueada, así que puedes soltar el dedo y hablar tranquilo. Toca **➤** para enviar, o la papelera para descartar.
   - **Deslizar ←:** cancela la grabación sin enviarla.
3. Debajo de tu frase aparecen tus métricas de ese turno: palabras por minuto, número de palabras y pausas de más de 1 s.
4. Si cometiste un error, la siguiente burbuja del profe muestra **una sola corrección**: tu frase tachada → la correcta, con una explicación corta.
5. El profe te responde por voz (1 a 3 frases) y siempre termina con una pregunta.

Otros controles:
- **¿Qué digo?**: 3 maneras de empezar tu respuesta, con traducción. Tócalas para oírlas.
- **ES**: traducción al español de lo que dijo el profe.
- **Barra de velocidad**: la velocidad de la voz del profe.
- **👂 Modo oído**: el texto del profe queda oculto hasta que lo tocas, para entrenar la comprensión auditiva.
- **🔊 Repetir**: vuelve a escuchar una frase del profe.
- **Terminar** (o el botón "atrás" de Android): cierra la clase y muestra tu informe. Si no llegaste a hablar, la sesión se descarta.

### Palabras (consultas en contexto)
- En la pestaña **Palabras**, escribe una palabra o expresión y, si puedes, **la frase donde la viste**. No es un traductor literal: te explica qué significa **en esa frase** y por qué.
- La respuesta incluye además la pronunciación (con audio), otros significados con ejemplos, el registro, las combinaciones típicas y un aviso si es un falso amigo.
- También funciona al revés: escribe una palabra en español y te dice cómo se diría en inglés en ese contexto.
- **En clase:** toca cualquier palabra de lo que dice el profe y la consulta se abre al momento, con la frase como contexto.
- Pulsa **Guardar** para quedarte con la palabra. Las guardadas aparecen en *Palabras → Guardadas* y en *Progreso → Palabras*.

### Informe y progreso
- Al terminar, el informe muestra:
  - Tu **nota de fluidez (0–100)**, que combina velocidad, largo de respuestas, pausas y precisión.
  - Tu nivel al hablar ese día.
  - Lo que hiciste bien y lo que debes mejorar.
  - La **tarea para mañana** y una **frase del día**.
- **Progreso**: tus minutos de hoy, las barras de la semana y tres pestañas:
  - **Errores**: tus correcciones agrupadas, con cuántas veces repetiste cada error. Toca una para ver la explicación.
  - **Palabras**: el vocabulario de tus temas y las frases del día. Toca una para oírla.
  - **Sesiones**: la gráfica de tu nota y el informe de cada clase.
- **Ajustes**: un panel con 6 secciones (Profe y voz, Apariencia, Meta diaria, Mi nivel, Gemini y Mis datos). Cada sección se abre en su propia pantalla, con botón atrás.
- Si la voz suena rara, en *Ajustes → Profe y voz* puedes elegir otra voz en inglés del teléfono. Si no hay ninguna, instala "Speech Services by Google" desde Play Store.

## 💸 Coste aproximado

- Gemini Flash: una sesión de 15 minutos suele costar unos pocos céntimos (el audio se cobra como tokens de entrada).
- La capa gratuita de Google AI Studio puede cubrir un uso personal moderado, con límites por minuto y por día. Si ves "límite de uso alcanzado", espera un minuto.

---

## 🛠️ Para desarrollo (en el PC)

Requisitos ya instalados: Node 24, JDK 21 y el Android SDK en `%LOCALAPPDATA%\Android\Sdk` (instalado por línea de comandos, sin Android Studio).

```bash
npm install
```
```bash
npm run dev
```
Abre la versión web en http://localhost:5173 para probar la interfaz. El micrófono y la voz funcionan en Chrome.

**Generar un APK nuevo:**
```bash
npm run apk
```
Esto compila la web, la sincroniza con Android (`cap sync`) y ejecuta `gradlew assembleDebug`. El APK se llama `Habla-v<versión>.apk` (la versión sale de `versionName`) y se copia a la carpeta `apk\` del proyecto, donde se van acumulando las versiones.

Antes de cada actualización, sube `version` y `build` en **`version.json`**, en la raíz. Es la única fuente de la versión: la usan el APK (`versionName`/`versionCode`) y la pantalla *Acerca de*. Añade también la entrada de la versión en `src/lib/changelog.ts`, que es lo que se ve en **Novedades**.

### Estructura

```
src/
  lib/
    gemini.ts      Gemini API (CapacitorHttp + JSON Schema) y lista de modelos
    speech.ts      análisis local del audio: si hubo voz, tiempo de habla, pausas ≥ 1 s
    teacher.ts     prompt del profe, esquema de corrección, ideas "¿Qué digo?"
    topics.ts      12 categorías de temas; noticias reales con Google Search
    fluency.ts     métricas de fluidez, nota 0–100 e informe final
    stats.ts       racha, minutos de hoy, tarea pendiente
    scenarios.ts   los 6 escenarios
    recorder.ts    MediaRecorder (webm/opus)
    tts.ts         voz nativa de Android
    db.ts          IndexedDB (Dexie): sesiones, turnos, errores, perfil
    backup.ts      exportar / importar JSON
    settings.ts    clave, modelo y preferencias (@capacitor/preferences)
  screens/         Home, Conversation, ProgressScreen, SettingsScreen
  components/      botón de hablar, informe, gráfica, corrección, anillo de nota
  ui/              sistema visual del rediseño: temas (theme.ts), iconos, orbe, ondas, fondo, selector
  screens/Onboarding.tsx  bienvenida en 3 pasos
android/           proyecto nativo (Capacitor 8, Android 36)
keystore/          firma del APK (fuera de git; haz copia)
```

### Hoja de ruta

- [x] **Fase 1:** ajustes, conversación por voz y exportar/importar
- [x] **Migración a Gemini** con reintentos automáticos y modelo de respaldo
- [x] **Fase 2:** métricas de fluidez, nota, informe y tarea para mañana; temas dinámicos con noticias reales; racha, meta diaria y pestaña Progreso
- [x] **Rediseño** (Claude Design): temas Ember / Lumi / Aurora en claro y oscuro, profes Emma y Leo, bienvenida, pantallas sin scroll
- [ ] **Fase 3:** cuaderno de errores con repetición espaciada (FSRS) y ejercicio oral de español a inglés
- [ ] **Fase 4:** plan de 12 semanas y lección del día (la racha y la gráfica ya están hechas)
- [ ] **Fase 5:** re-test cada 4 semanas (gramática, audición y habla) que actualiza tu nivel
