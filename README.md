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
D:\My Apps\HABLA\android\app\build\outputs\apk\debug\app-debug.apk
```

## 📲 Instalar en el teléfono (primera vez)

1. **Copia el APK al teléfono**. Elige cualquiera de estas opciones:
   - **Por cable USB:** conecta el teléfono y elige "Transferencia de archivos" en la notificación. En el Explorador de Windows, copia `app-debug.apk` a la carpeta `Download` del teléfono.
   - **Por Google Drive:** sube el APK a Drive desde el PC y descárgalo desde la app de Drive en el teléfono.
2. En el teléfono, abre **Archivos** (o "Mis archivos") → **Descargas** y toca `app-debug.apk`.
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

### Inicio
- **🔥 Racha**: días seguidos practicando.
- **Anillo de meta diaria**: minutos que has hablado hoy (tu voz, no la duración de la clase). La meta se cambia en Ajustes.
- **📅 Tu tarea**: la tarea para mañana de tu última sesión.
- **🎲 Sorpréndeme**: un tema al azar, distinto de los últimos que usaste.
- **Elige un tema**: 12 categorías. Las que tienen un punto rojo (noticias, IA, tecnología, negocios y mercados, startups, ciencia, cine, deportes) **buscan en Google una noticia real y reciente**. El profe nunca repite un tema de tus últimas sesiones.
- **Prácticas guiadas**: mis puntos débiles, entrevista técnica, explicar mi trabajo a un cliente, debate sobre un tema de actualidad y contar una historia.

### En la clase
1. Arriba ves la **tarjeta del tema**: tócala para leer el resumen. Toca las palabras de vocabulario para oírlas.
2. **Mantén presionado** el botón naranja mientras hablas y **suéltalo** al terminar. Verás la onda de tu voz y un cronómetro.
3. Debajo de tu frase aparecen tus métricas de ese turno: ⚡ palabras por minuto, 📝 palabras y ⏸ pausas de más de 1 s.
4. Si cometiste un error verás **una sola corrección**: tu frase tachada en rojo y la correcta resaltada en verde, con una explicación corta.
5. El profe te responde por voz (1 a 3 frases) y siempre termina con una pregunta.

Otros controles:
- **💡 ¿Qué digo?**: 3 maneras de empezar tu respuesta, con traducción. Tócalas para oírlas.
- **🌐 ES**: traducción al español de lo que dijo el profe.
- **🐢 / 🐇**: velocidad de la voz del profe.
- **👂 Modo oído**: el texto del profe queda oculto hasta que lo tocas, para entrenar la comprensión auditiva.
- **🔊 Repetir**: vuelve a escuchar una frase del profe.
- **Terminar** (o el botón "atrás" de Android): cierra la clase y muestra tu informe. Si no llegaste a hablar, la sesión se descarta.

### Informe y progreso
- Al terminar, el informe muestra:
  - Tu **nota de fluidez (0–100)**, que combina velocidad, largo de respuestas, pausas y precisión.
  - Tu nivel al hablar ese día.
  - Lo que hiciste bien y lo que debes mejorar.
  - La **tarea para mañana** y una **frase del día**.
- **📈 Progreso**: total de sesiones, minutos y palabras; gráfica de tu nota; comparación "antes → ahora". Toca cualquier sesión para volver a ver su informe.
- Si la voz suena rara, en *Ajustes → Voz* puedes elegir otra voz en inglés del teléfono. Si no hay ninguna, instala "Speech Services by Google" desde Play Store.

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
Esto compila la web, la sincroniza con Android (`cap sync`) y ejecuta `gradlew assembleDebug`. El resultado sale en `android\app\build\outputs\apk\debug\app-debug.apk`.

Antes de cada actualización, sube `versionCode` y `versionName` en `android/app/build.gradle`.

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
  components/      botón de hablar, onda en vivo, avatar, informe, gráfica, tarjeta del tema
android/           proyecto nativo (Capacitor 8, Android 36)
keystore/          firma del APK (fuera de git; haz copia)
```

### Hoja de ruta

- [x] **Fase 1:** ajustes, conversación por voz y exportar/importar
- [x] **Migración a Gemini** con reintentos automáticos y modelo de respaldo
- [x] **Fase 2:** métricas de fluidez, nota, informe y tarea para mañana; temas dinámicos con noticias reales; racha, meta diaria y pestaña Progreso
- [ ] **Fase 3:** cuaderno de errores con repetición espaciada (FSRS) y ejercicio oral de español a inglés
- [ ] **Fase 4:** plan de 12 semanas y lección del día (la racha y la gráfica ya están hechas)
- [ ] **Fase 5:** re-test cada 4 semanas (gramática, audición y habla) que actualiza tu nivel
