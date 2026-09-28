# Habla 🎙️

Tu profesor de inglés por voz con IA. App Android personal (no se publica en ninguna tienda).

- **Profe:** Claude (`claude-sonnet-5`)
- **Tu voz → texto:** OpenAI Whisper (`whisper-1`, con tiempos por palabra)
- **Voz del profe:** el motor de texto a voz de Android (en-US)
- **Datos:** todo se guarda en el teléfono. Tus claves API solo viven en el teléfono y nunca van dentro del APK.

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
   - Pega tu `ANTHROPIC_API_KEY` (empieza por `sk-ant-`).
   - Pega tu `OPENAI_API_KEY` (empieza por `sk-`).
   - Toca **Guardar y comprobar**. Debe salir ✅.
6. La primera vez que pulses el botón de hablar, Android te pedirá permiso para el **micrófono**. Toca **"Mientras se usa la app"**.

## 🔄 Actualizar a una versión nueva (sin perder tus datos)

1. **Por seguridad**, antes de actualizar: en la app ve a **Ajustes → Mis datos → ⬆️ Exportar** y guarda el JSON en Drive o en el PC.
2. Copia el APK nuevo al teléfono igual que la primera vez.
3. Tócalo e instálalo **encima** de la app que ya tienes. **No desinstales antes.** Android dirá "¿Quieres instalar una actualización?" → **Instalar**.
4. Tu progreso y tus claves siguen ahí.

> **¿Por qué se conservan los datos?** Todos los APK se firman con la misma clave, la que está en `D:\My Apps\HABLA\keystore\`. Android solo deja actualizar encima si la firma coincide.
>
> ⚠️ **Haz una copia de la carpeta `keystore\`** en Drive o un USB. No está en git a propósito. Si la pierdes, el próximo APK tendrá otra firma y tendrás que desinstalar la app (se borrarán los datos) y restaurarlos con **Importar**.

## 💾 Copias de seguridad (exportar e importar)

- **Exportar:** *Ajustes → Mis datos → ⬆️ Exportar*. Guarda `habla-backup-AAAA-MM-DD.json` en `Documentos/Habla` (si Android lo permite) y abre "Compartir" para que lo mandes a Drive, a tu correo o al PC.
- **Importar:** *Ajustes → Mis datos → ⬇️ Importar* → elige el JSON. **Sustituye** todo el progreso actual por el del archivo.
- Las copias **no incluyen tus claves API**. Después de reinstalar tendrás que pegarlas de nuevo.

Hazlo, por ejemplo, una vez por semana y siempre antes de cambiar de teléfono o reinstalar.

## 🗣️ Cómo usarla

1. En **Hablar**, elige un escenario: charla libre, mis puntos débiles, entrevista técnica, explicar mi trabajo a un cliente, debate o contar una historia.
2. El profe te saluda y te hace una pregunta.
3. **Mantén presionado** el botón naranja mientras hablas y **suéltalo** al terminar.
4. Verás lo que dijiste y, si hubo un error, **una sola corrección**: tu frase tachada en rojo y la correcta resaltada en verde, con una explicación corta.
5. El profe te responde por voz (1 a 3 frases) y siempre termina con una pregunta.

Otros controles:
- **🐢 / 🐇**: velocidad de la voz del profe.
- **👂 Modo oído**: el texto del profe queda oculto hasta que lo tocas, para entrenar la comprensión auditiva.
- **🔊 Repetir**: vuelve a escuchar una frase del profe.
- Si la voz suena rara, en *Ajustes → Voz* puedes elegir otra voz en inglés del teléfono. Si no hay ninguna, instala "Speech Services by Google" desde Play Store.

## 💸 Coste aproximado

- Whisper: unos 0,006 US$ por minuto de audio.
- Claude Sonnet 5: una sesión de 15 minutos suele costar unos pocos céntimos.

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
    claude.ts      Claude API (CapacitorHttp + JSON Schema)
    whisper.ts     Whisper (multipart nativo con CapacitorHttp)
    teacher.ts     prompt del profe, esquema de corrección
    scenarios.ts   los 6 escenarios
    recorder.ts    MediaRecorder (webm/opus)
    tts.ts         voz nativa de Android
    db.ts          IndexedDB (Dexie): sesiones, turnos, errores, perfil
    backup.ts      exportar / importar JSON
    settings.ts    claves y preferencias (@capacitor/preferences)
  screens/         Home, Conversation, SettingsScreen
android/           proyecto nativo (Capacitor 8, Android 36)
keystore/          firma del APK (fuera de git; haz copia)
```

### Hoja de ruta

- [x] **Fase 1:** ajustes, conversación por voz y exportar/importar
- [ ] **Fase 2:** métricas de fluidez (palabras por minuto, pausas, largo de respuesta), nota y tarea para mañana
- [ ] **Fase 3:** cuaderno de errores con repetición espaciada (FSRS) y ejercicio oral de español a inglés
- [ ] **Fase 4:** plan de 12 semanas, lección del día, racha y gráfica de progreso
- [ ] **Fase 5:** re-test cada 4 semanas (gramática, audición y habla) que actualiza tu nivel
