# Habla 🎙️

Tu profesor de inglés por voz con IA. App Android personal (no se publica en ninguna tienda).

- **Profe:** Google Gemini (por defecto `gemini-3.8-flash`; se puede cambiar en Ajustes). Recibe tu audio y, en una sola llamada, lo transcribe, te corrige y te responde.
- **Pausas y ritmo:** se calculan en el propio teléfono analizando el audio, sin coste.
- **Voz del profe:** el motor de texto a voz de Android (en-US)
- **Fonética (opcional):** Azure Speech *Pronunciation Assessment* evalúa tu pronunciación en paralelo con Gemini, con tu propia clave de Azure. Sin ella, todo funciona solo con Gemini.
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
   - En **Ajustes → Modelos**, pega tu `GEMINI_API_KEY` (empieza por `AIza`). Se crea en https://aistudio.google.com → *Get API key*.
   - Toca **Guardar y comprobar**. Debe salir ✅ junto con el modelo elegido.
   - **Modelo rápido**: el que se usa para «¿Qué digo?», el tema del día, el informe y las consultas de palabras (por defecto un Flash-Lite, que responde en 1–2 s).
   - Si un modelo se queda **sin cuota** (error 429), la app pasa al de respaldo al instante y no vuelve a probarlo hasta que Google renueva la cuota. Lo ves en **Ajustes → Modelos → Diagnóstico**.
   - Puedes elegir **cualquier modelo** como principal y como respaldo. La lista mezcla lo que devuelve Google con los modelos conocidos (por si Google no responde); **Actualizar lista de modelos** la vuelve a pedir y **Otro modelo** permite escribir el nombre exacto de uno nuevo.
6. **Proteger la clave:** para ver o cambiar una clave ya guardada (la de Gemini o las de Azure), la app pide el **patrón, PIN o huella** del teléfono. Tras confirmarlo tienes 60 s sin que te lo vuelva a pedir.
7. La primera vez que pulses el botón de hablar, Android te pedirá permiso para el **micrófono**. Toca **"Mientras se usa la app"**.

## 🔄 Actualizar a una versión nueva (sin perder tus datos)

1. **Por seguridad**, antes de actualizar: en la app ve a **Ajustes → Mi perfil y datos → ⬆️ Exportar** y guarda el JSON en Drive o en el PC.
2. Copia el APK nuevo al teléfono igual que la primera vez.
3. Tócalo e instálalo **encima** de la app que ya tienes. **No desinstales antes.** Android dirá "¿Quieres instalar una actualización?" → **Instalar**.
4. Tu progreso y tu clave siguen ahí.

> **¿Por qué se conservan los datos?** Todos los APK se firman con la misma clave, la que está en `D:\My Apps\HABLA\keystore\`. Android solo deja actualizar encima si la firma coincide.
>
> ⚠️ **Haz una copia de la carpeta `keystore\`** en Drive o un USB. No está en git a propósito. Si la pierdes, el próximo APK tendrá otra firma y tendrás que desinstalar la app (se borrarán los datos) y restaurarlos con **Importar**.

## 💾 Copias de seguridad (exportar e importar)

- **Exportar:** *Ajustes → Mi perfil y datos → ⬆️ Exportar*. Guarda `habla-backup-AAAA-MM-DD.json` en `Documentos/Habla` (si Android lo permite) y abre "Compartir" para que lo mandes a Drive, a tu correo o al PC.
- **Importar:** *Ajustes → Mi perfil y datos → ⬇️ Importar* → elige el JSON. **Sustituye** todo el progreso actual por el del archivo.
- Las copias **no incluyen tus claves** (ni la de Gemini ni las de Azure). Tampoco entran en las copias automáticas de Android. Después de reinstalar tendrás que pegarlas de nuevo.

Hazlo, por ejemplo, una vez por semana y siempre antes de cambiar de teléfono o reinstalar.

## 🗣️ Cómo usarla

### Bienvenida, profe y apariencia
- La primera vez verás una **bienvenida en 3 pasos**: el saludo, la elección de profe y tu nivel con la meta diaria. Puedes repetirla desde *Ajustes → Ver la bienvenida otra vez*.
- **Profes:**
  - **Emma**: acento americano; paciente, clara y muy positiva.
  - **Leo**: acento británico; directo, curioso y con humor.
  
  Cada profe tiene su propia voz. Te acompaña la **mascota** de tu tema (ver abajo).
- **Tema y mascota (tu compañero):** cada tema trae su mascota animada, que sustituye a la antigua burbuja. Se elige en la bienvenida, justo después del nombre, y se cambia en *Ajustes → Tema y mascota*:
  - **Chispa** · tema **Ember** (fuego, naranja y turquesa)
  - **Musgo** · tema **Lumi** (tierra, verde)
  - **Gota** · tema **Marea** (agua, cielo y mar; claro por defecto)
  - **Brisa** · tema **Nimbo** (aire, violeta)

  La mascota escucha mientras grabas, piensa mientras el profe responde y habla con su voz. También te **avisa antes del Inicio** de lo importante: un test disponible, una clase a medias, un problema con Gemini o el fin de la fonética gratis del mes.
- **Orientación de la pantalla** (*Ajustes → Tema y mascota*): **Automática**, **Vertical**, **Horizontal** u **Horizontal al revés**. La fija se mantiene aunque el teléfono no gire; en horizontal, las pestañas pasan a una barra lateral. Tócala, estírala como un *slime* o (Brisa) agítala en círculos: cada una reacciona a su manera. **Cinco toques seguidos** desvelan su secreto. Cada tema tiene modo oscuro y claro; el modo también se cambia con el icono de sol y luna del Inicio.

### Tu perfil (obligatorio)
- Antes del test, cada persona rellena **"Tu perfil"**: nombre, a qué se dedica (opcional), para qué quiere el inglés y qué temas le gustan.
- El profe te llama por tu nombre, adapta la **Entrevista de trabajo** y **Explicar a qué me dedico** a tu caso (si no trabajas, te pregunta por tu día a día), y "Sorpréndeme" elige más a menudo tus temas favoritos.
- Se puede cambiar en *Ajustes → Mi perfil*. El nivel no se puede cambiar ahí: solo se muestra.

### Test de nivel (obligatorio)
- Antes de usar la app, cada perfil hace un **test de nivel** de unos 12–15 minutos. Las preguntas salen de un **banco propio de 450 ítems** (A1–C2) que va dentro de la app, sin conexión. Tiene 4 partes:
  - **Gramática y vocabulario:** 15 preguntas adaptativas, que suben o bajan de nivel según aciertas.
  - **Lectura:** 2 textos cortos.
  - **Audición:** 2 audios, cada uno se puede escuchar hasta 3 veces.
  - **Habla:** 3 respuestas por voz, que el profe evalúa.
- Antes de la lectura, la escucha y el habla aparece una **pantalla de instrucciones** con lo que hay que hacer. Recomienda **auriculares** para la escucha y **auriculares con micrófono** para el habla, porque mejoran mucho el reconocimiento de voz.
- Todas las preguntas tienen una opción **«No lo sé»**, con otro estilo: es mejor ser sincero que adivinar. Cuenta como no acertada, pero el profe recibe esos puntos como lagunas reconocidas y les da prioridad en el curso.
- Al final de cada parte ves un **resumen** con tus respuestas y las correctas. En la audición se muestra la duración del audio y, al revisar, la transcripción por personas.
- Si Gemini falla durante el test, **nada se pierde**: el test queda guardado y la mascota te propone reintentar, **cambiar de modelo** o **cambiar de clave**.
- El resultado (un nivel por habilidad, el nivel global y tus puntos débiles) adapta al profe: su vocabulario, la velocidad de la voz y lo que te hace practicar.
- **El nivel no se puede cambiar a mano.** Las lecciones solo **proponen** un cambio; el nivel lo fija el **re-test**, que pesa un **70 % el test y un 30 % tu trayectoria** en las clases. *Ajustes → Mi nivel* muestra la fórmula con tus números, «Nuevo test disponible el …» y un botón para **revalidar el nivel** cuando toca.
- Si tu último test era de antes del banco de ítems, puedes **repetirlo ya**; el nuevo sustituye al anterior y la mascota te lo recuerda cada vez que abres la app.
- *Ajustes → Mi nivel → Tus tests*: un mini resumen de cada test; tócalo para ver el **resumen completo** y guardarlo.
- Si no hay clave de Gemini, la bienvenida la pide antes del test.

### Inicio
- **Racha** (icono de llama): días seguidos practicando.
- **Meta diaria**: los minutos que has hablado hoy (tu voz, no la duración de la clase). Cada tema la muestra a su manera: en Ember, junto a la mascota; en Lumi, la tarjeta "Charla libre"; en Marea y Nimbo, una barra junto a la mascota.
- **Tu mascota te habla:** de vez en cuando sale un globo junto a ella con algo útil: tu clase a medias, la lección de hoy, cuánto te falta para la meta, las frases del repaso, tu racha, cuándo puedes repetir el test y que los temas con puntito traen noticias reales. Si el globo lleva una flecha, tócalo y lo hace (sigue la clase, abre el repaso o empieza la lección). Toca a la mascota para que te cuente lo siguiente.
- **Sorpréndeme** (icono de destello): un tema al azar, distinto de los últimos que usaste.
- **Tarea**: la tarea para mañana de tu última sesión. Tócala para leerla entera.
- **Temas / Prácticas**: un selector entre tus temas y las 5 prácticas guiadas. Todo cabe en la pantalla, sin scroll.
  - **Tus 3 temas**: se eligen al crear el perfil (exactamente 3) y se cambian en *Más temas → Cambiar mis 3 temas* o en *Ajustes → Mi perfil*. Si vienes de una versión anterior con otro número de temas, la app te pide elegir tus 3 al abrirla.
  - **Tema libre**: escribes de qué quieres hablar y el profe prepara la clase sobre eso.
  - **Más temas**: las 12 categorías para hablar hoy de cualquiera (tus 3 llevan una estrella).
  - Los temas con puntito de color (noticias, IA, tecnología, negocios y mercados, startups, ciencia, cine, deportes) **buscan en Google una noticia real y reciente**. El profe nunca repite un tema de tus últimas sesiones.
  - Las prácticas son: mis puntos débiles, entrevista de trabajo, explicar a qué me dedico, debate y contar una historia. En el **debate** eliges si el tema lo pone el profe o lo propones tú; el profe defiende la postura contraria.

### En la clase
1. Arriba ves la **tarjeta del tema**. Empieza **plegada y brillando** hasta que la abres por primera vez; tócala para ver el objetivo, el resumen y el vocabulario. Las frases largas de la lección van cada una en su caja (inglés y español). Toca las palabras para oírlas.
2. El botón de hablar funciona como en WhatsApp. Mientras grabas, las ondas se mueven y ves un cronómetro.
   - **Mantener y soltar:** habla con el dedo en el micrófono; al soltar se envía.
   - **Deslizar ↑ hasta el candado:** la grabación queda bloqueada, así que puedes soltar el dedo y hablar tranquilo. Toca **➤** para enviar, o la papelera para descartar.
   - **Deslizar ←:** cancela la grabación sin enviarla.
   - **⌨️ Teclado** (a la derecha del micrófono): cambia a escribir tu respuesta. El icono del micrófono te devuelve a hablar. Las respuestas escritas también se corrigen, pero no cuentan para la velocidad ni las pausas, ni para tu nivel al hablar.
3. Debajo de tu frase aparecen tus métricas de ese turno: palabras por minuto, número de palabras y pausas de más de 1 s.
4. Si cometiste errores, debajo de tu frase aparecen **todas las correcciones**: tu frase tachada → la correcta, con una explicación corta. Con la **fonética** activa, ahí mismo ves también tu **nota de pronunciación** (ver abajo).
5. El profe te responde por voz (1 a 3 frases) y siempre termina con una pregunta.

Otros controles:
- **¿Qué digo?**: 3 maneras de empezar tu respuesta, con traducción. Tócalas para oírlas.
- **ES**: traducción al español de lo que dijo el profe.
- **Barra de velocidad**: la velocidad de la voz del profe.
- **👂 Modo oído**: el texto del profe queda oculto hasta que lo tocas, para entrenar la comprensión auditiva.
- **🔊 Repetir**: vuelve a escuchar una frase del profe.
- **Salir a medias:** la clase **queda guardada** y la mascota se despide; al volver (o al abrir la app) te ofrece **continuarla** donde quedó o empezar una nueva. Antes de cerrar la app, la mascota te pregunta.
- **Batería:** en segundo plano la app se queda quieta: micrófono, voz y animaciones apagados.
- **Terminar** (o el botón "atrás" de Android): cierra la clase y muestra tu informe. Si no llegaste a hablar, la sesión se descarta. Al salir se cancela lo que el profe estuviera preparando: no hay más reintentos ni respuesta ni voz (una petición que ya salió hacia Google puede contarse igualmente, pero no se reintenta).

### 🔤 Corrector fonético (Azure Speech, opcional)
Gemini corrige **qué** dices; Azure Speech mide **cómo** lo pronuncias. Las dos llamadas salen a la vez y el resultado se une en un solo bloque:
- **Nota de pronunciación (0–100)** y cuatro notas: **Precisión**, **Fluidez**, **Completa** (si te comiste palabras) y **Entonación**.
- Una frase del coach en español y las **palabras a cuidar**, con el sonido que falló (por ejemplo «think» → /θ/). Tócalas para oírlas.
- El informe final también tiene en cuenta tu pronunciación.
- Si Azure falla o tarda, **sigues con Gemini** como siempre.

**Configurarlo** (*Ajustes → Modelos → Azure Speech (fonética)*):
1. En el [portal de Azure](https://portal.azure.com) crea un recurso **Speech** (el plan **F0** es gratis: 5 h de audio al mes).
2. Copia su **Clave 1** y su **región** (por ejemplo `eastus`) y pégalas en la app → **Guardar y comprobar**. Se guardan igual que la clave de Gemini, protegidas con tu patrón, PIN o huella.
3. Marca el **plan** que tiene tu recurso: F0 (gratis), S0 Batch (≈ $0.18/h) o S0 Pago por uso (≈ $1.30/h). La app **no cambia el plan**: eso se hace en el portal de Azure.
4. Activa **Usar corrector fonético**. Con el plan F0, al abrir la app se activa sola mientras queden horas.

**Límite de 60 s:** el servicio de Azure solo evalúa audios de hasta 60 s. Con la fonética activa, el botón de hablar muestra **«quedan m:ss»** (en naranja los últimos 10 s) y envía solo al llegar al límite. La grabación se convierte en el teléfono a WAV 16 kHz (unos milisegundos).

**Plan gratis agotado:** si Azure responde *cuota excedida*, la fonética se apaga hasta el mes siguiente (1 del mes, UTC), sigues con Gemini y la mascota te avisa una vez con lo que costaría un plan de pago. Un simple «demasiadas peticiones» solo se reintenta.

**Consumo del mes (opcional):** para ver «≈ X de 5 h usadas», abre *Acceso a Azure Monitor* e introduce un **service principal** (Tenant ID, Client ID, Client Secret) con el rol *Monitoring Reader* sobre el recurso y su **Resource ID** (`/subscriptions/…/providers/Microsoft.CognitiveServices/accounts/…`). La app lee la métrica `AudioSecondsTranscribed` del mes. Es aproximada (Azure la actualiza con retraso) y se guarda 10 minutos.

### Con auriculares
Al conectar unos auriculares (o al abrir Habla con ellos puestos) aparece un selector: **¿por dónde quieres escuchar al profe y hablar?**
- **Todo por los auriculares**: escuchas y hablas por los auriculares. Con auriculares Bluetooth, Android pide el permiso de **Dispositivos cercanos** (es lo que permite usar su micrófono).
- **Escucho por los auriculares, hablo al teléfono**: la voz del profe suena con mejor calidad; habla cerca del teléfono.
- **Todo por el teléfono**: altavoz y micrófono del teléfono.

Se recuerda para cada par de auriculares y se cambia en *Ajustes → Profe y voz → Audio con auriculares*. Al salir de la app, el audio del teléfono vuelve a la normalidad.

### Palabras (consultas en contexto)
- En la pestaña **Palabras**, escribe una palabra o expresión y, si puedes, **la frase donde la viste**. No es un traductor literal: te explica qué significa **en esa frase** y por qué.
- La respuesta incluye además la pronunciación (con audio), otros significados con ejemplos, el registro, las combinaciones típicas y un aviso si es un falso amigo.
- También funciona al revés: escribe una palabra en español y te dice cómo se diría en inglés en ese contexto.
- **En clase:** toca cualquier palabra de lo que dice el profe y la consulta se abre al momento, con la frase como contexto.
- Pulsa **Guardar** para quedarte con la palabra. Las guardadas aparecen en *Palabras → Guardadas* y en *Progreso → Palabras*.

### Repaso espaciado (cuaderno de errores)
- Cada corrección del profe y cada palabra que guardas se convierten en una **tarjeta de repaso**. Las correcciones repetidas cuentan como una sola.
- En el Inicio aparece **"Repaso de hoy"** cuando tienes frases pendientes. También puedes entrar desde *Progreso → Errores → Repasar*.
- **Cómo funciona:**
  1. Ves la frase en **español** y la **dices en inglés**. Toca el micrófono para empezar y otra vez para terminar.
  2. El profe te escucha y te dice si está **correcto**, **casi** o **aún no**, con una explicación. Acepta otras formas correctas de decirlo.
  3. Oyes la respuesta correcta y eliges cuándo volver a verla: **Otra vez / Difícil / Bien / Fácil**. La nota sugerida viene marcada y cada botón muestra el intervalo.
- El algoritmo **FSRS** programa cada frase justo antes de que la olvides. Como máximo hay 10 frases nuevas por sesión; las de **Otra vez** vuelven al final de la misma sesión.

### Tu plan de 12 semanas
Después del test de nivel, Habla crea un **plan de 12 semanas** a tu medida (tu nivel, tus puntos débiles, para qué quieres el inglés y tus temas favoritos):
- Cada semana tiene **un objetivo** (una estructura o una habilidad, por ejemplo contar experiencias con el *present perfect*) y un tema de la vida real. Al abrirla ves qué podrás hacer al terminarla.
- Cada semana tiene **5 lecciones** que suben de dificultad: descubrir, practicar en situaciones, *role-play* y un reto libre. Cada lección trae una situación, 3 frases útiles (tócalas para oírlas) y una **misión** concreta.
- Las lecciones de cada semana se preparan cuando esa semana empieza, así se adaptan a cómo vas.
- **Lección de hoy** en el Inicio: la siguiente sin hacer. Cuenta como hecha cuando respondes al menos 3 veces. Puedes adelantar la semana siguiente o repetir cualquier lección desde **Mi plan**.
- **Recordatorio diario** (Ajustes → Meta diaria): **tu mascota** te avisa (con su nombre y su imagen) a la hora que elijas, con la lección que toca; si ya la hiciste ese día, no avisa. **Probar el aviso** manda uno de prueba en 5 s. Si Android quitó el permiso de notificaciones, la app te lo dice. En Xiaomi/POCO, activa también *Inicio automático* para Habla, para que el aviso sobreviva a un reinicio.

### Re-test cada 4 semanas
- Las semanas 4, 8 y 12 son de **repaso** y terminan con el **re-test** de nivel.
- Cuando toca, aparece un aviso en el Inicio (y una notificación si activaste el recordatorio).
- El resultado compara **antes → después** en cada habilidad, y tu plan se **adapta**: las semanas que faltan se rehacen con tu nuevo nivel y tus nuevos puntos débiles.
- El historial de tus tests está en *Ajustes → Mi perfil*.

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
- **Ajustes**: arriba, tu mascota resume tu nivel (tócala para ver el detalle). Debajo, un panel de secciones (Profe y voz, Tema y mascota, Meta diaria, Mi nivel, Mi perfil y datos, Modelos…). Cada tarjeta muestra lo que tienes elegido y se abre en su propia pantalla, con botón atrás.
- Si la voz suena rara, en *Ajustes → Profe y voz* puedes elegir otra voz en inglés del teléfono. Si no hay ninguna, instala "Speech Services by Google" desde Play Store.

## 🩺 Diagnóstico

**Ajustes → Modelos → Diagnóstico** muestra las últimas llamadas a Gemini: qué se pidió, con qué modelo, si salió bien (o *Sin cuota* / *Saturado*) y cuánto tardó. También los modelos sin cuota en este momento, con un botón para volver a probarlos. **Compartir** envía la lista por WhatsApp o correo para revisar el teléfono de otra persona sin conectarlo al PC.

Si Gemini está **saturado, lento, sin cuota** o la clave o el modelo fallan, la mascota aparece con una hoja que te propone **otro modelo** u **otra clave** en el momento.

## 💸 Coste aproximado

- Gemini Flash: una sesión de 15 minutos suele costar unos pocos céntimos (el audio se cobra como tokens de entrada).
- Azure Speech (opcional): el plan F0 es gratis hasta 5 h de audio al mes; en S0, cada 10 minutos de audio cuestan ≈ $0.03 (Batch) o ≈ $0.22 (pago por uso).
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
    wav.ts         webm → WAV 16 kHz mono (para Azure), máx. 60 s
    pronunciation.ts  Azure Pronunciation Assessment (REST) y frase del coach
    phonetics.ts   política de la fonética: planes, cuota F0, aviso de la mascota
    azureUsage.ts  consumo del mes vía Azure Monitor (service principal)
    placement.ts   test de nivel con el banco de 450 ítems
    deviceAuth.ts  patrón / PIN / huella para ver o cambiar claves
    tts.ts         voz nativa de Android
    db.ts          IndexedDB (Dexie): sesiones, turnos, errores, perfil
    backup.ts      exportar / importar JSON
    settings.ts    clave, modelo y preferencias (@capacitor/preferences)
  screens/         Home, Conversation, ProgressScreen, SettingsScreen
  components/      botón de hablar, informe, gráfica, corrección, anillo de nota
  ui/              sistema visual: temas (theme.ts), mascotas (Mascot.tsx), iconos, ondas, fondo, selector
  screens/Onboarding.tsx  bienvenida en 3 pasos
android/           proyecto nativo (Capacitor 8, Android 36)
keystore/          firma del APK (fuera de git; haz copia)
```

### Hoja de ruta

- [x] **Fase 1:** ajustes, conversación por voz y exportar/importar
- [x] **Migración a Gemini** con reintentos automáticos y modelo de respaldo
- [x] **Fase 2:** métricas de fluidez, nota, informe y tarea para mañana; temas dinámicos con noticias reales; racha, meta diaria y pestaña Progreso
- [x] **Rediseño** (Claude Design): temas Ember / Lumi / Aurora en claro y oscuro, profes Emma y Leo, bienvenida, pantallas sin scroll
- [x] **Rediseño V4:** cuatro temas con mascota (Chispa, Musgo, Gota y Brisa) y paso "Elige a tu compañero" (v5.1)
- [x] **Fase 3:** cuaderno de errores con repetición espaciada (FSRS) y ejercicio oral de español a inglés (v4.7)
- [x] **Fase 4:** plan de 12 semanas, lección del día y recordatorio diario (v5.0)
- [x] **Fase 5:** re-test cada 4 semanas con comparación antes → después y plan que se adapta (v5.0)
- [x] **Auriculares** con selector de audio y micrófono Bluetooth (v5.3); tus 3 temas, Tema libre y debate (v5.4); avisos de la mascota (v5.5)
- [x] **Banco de 450 ítems** para el test, nivel 70 % test + 30 % trayectoria, y hoja de problemas de Gemini (v5.6)
- [x] **No conformidades v5.7:** batería, clase guardada, todas las correcciones, Ajustes rediseñado, claves con patrón/huella y orientación fija
- [x] **Corrector fonético con Azure Speech** y límite de 60 s con cuenta atrás (v5.8)
