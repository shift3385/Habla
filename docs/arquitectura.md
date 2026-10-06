# Arquitectura de Habla

## Visión general

Habla es una **app web (React) empaquetada como APK con Capacitor**. No hay servidor propio: todo el estado vive en el teléfono y la app habla directamente con servicios externos usando las claves del propio usuario.

```
┌────────────────────────── Teléfono Android ──────────────────────────┐
│  WebView (React 19 + Tailwind)                                        │
│   screens/ ── components/ ── lib/ (lógica) ── ui/ (temas, mascota)    │
│        │                │                                             │
│        │   Capacitor bridge (CapacitorHttp, Preferences, TTS,        │
│        │   LocalNotifications, Filesystem, Share, App, Haptics)       │
│        │   + plugins Java propios: AudioRoute, DeviceAuth, Orientation│
│  Datos: IndexedDB `habla` (Dexie) · IndexedDB `habla-draft`           │
│         Preferences `habla.settings` / `habla.savedClass`            │
│         localStorage (cachés pequeñas)                                │
└───────────────┬──────────────────────────────┬────────────────────────┘
                │ HTTPS (CapacitorHttp, nativo) │
     Google Gemini REST              Azure Speech REST (opcional)
     (+ Google Search grounding)     Azure Monitor + Entra ID (opcional)
```

Las peticiones HTTP salen por **CapacitorHttp** (código nativo), no por `fetch` del WebView. Así se evitan los problemas de CORS. En el navegador (desarrollo) se usa `fetch`.

## Capas

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Orquestación | `src/App.tsx` | Arranque (splash → bienvenida o Inicio), pestañas (Hablar, Palabras, Progreso, Ajustes), avisos globales: `NoticeGate` (avisos de la mascota antes del Inicio), `GeminiTroubleSheet` (Gemini falla → otro modelo u otra clave), `PhoneticsAlert` (F0 de Azure agotado), selector de audio con auriculares, comprobación de la fonética al arrancar, sincronización de recordatorios |
| Pantallas | `src/screens/` | Una por archivo. Las grandes: `Conversation` (la clase), `Calibration` (test de nivel), `SettingsScreen` (panel de ajustes con subpáginas), `Home` |
| Componentes | `src/components/` | Piezas reutilizables con poca lógica propia |
| Lógica | `src/lib/` | Sin JSX. Llamadas a IA, reglas del test, métricas, almacenamiento, política de la fonética… |
| Sistema visual | `src/ui/` | `theme.ts` (4 temas: ember, lumi, marea, nimbo × claro/oscuro, como variables CSS; profes Emma y Leo; datos de cada mascota), `Mascot.tsx` (mascota SVG animada con física de «slime» y secretos) |
| Nativo | `android/app/src/main/java/com/shift/habla/` | Lo que el WebView no puede hacer solo |

## Flujo principal: un turno de la clase

1. **Grabación.** `TalkButton` (mantener o bloquear con candado) → `recorder.ts` (`MediaRecorder`, webm/opus). Con la fonética activa hay un **límite de 60 s** con cuenta atrás y envío automático.
2. **Análisis local** (`speech.ts`): decodifica el audio, calcula el tiempo de habla real y las pausas de más de 1 s. No cuesta nada.
3. **Dos llamadas en paralelo:**
   - **Gemini** (`teacher.ts` → `gemini.ts`): **una sola llamada** con el audio en línea (base64) y el historial. Devuelve JSON con esquema: `heard_speech`, `transcript`, `corrections[]` (original, corregida, explicación en español, categoría, frase en español), `reply` y `reply_es`.
   - **Azure** (`pronunciation.ts`), si `phoneticsActive(settings)`: convierte el webm a **WAV 16 kHz mono** en el teléfono (`wav.ts`, ~50 ms) y lo manda a Pronunciation Assessment **sin texto de referencia**. Cuando llega la transcripción de Gemini, si las palabras no coinciden (`sameWords`), **vuelve a evaluar usando esa transcripción como referencia**, con las cifras pasadas a palabras (`spellNumbers`).
4. **Guardado:** el turno del alumno va a `db.turns` (con `corrections`, métricas y, cuando llega, `pronunciation`); cada corrección va a `db.mistakes` (cuaderno de errores → tarjetas FSRS).
5. **Respuesta:** el profe habla con el TTS nativo (`tts.ts`, voz en-US o en-GB según el profe). En la burbuja del profe se ven las correcciones y la pronunciación (`CorrectionView`, `PronunciationView`).
6. **Fin de clase:** `fluency.ts` calcula las métricas y la nota 0–100 y pide a Gemini el informe (también recibe la pronunciación de cada turno). Al salir a medias, la clase se guarda (`savedClass.ts`) y se puede continuar.

Si Gemini falla (cuota 429, saturado 503, clave o modelo mal), `gemini.ts` reintenta y pasa al **modelo de respaldo**; los modelos sin cuota se recuerdan (`habla.quota`) hasta que Google la renueva. `geminiTrouble.ts` decide si la mascota debe ofrecer otro modelo u otra clave. Si Azure falla, la clase sigue solo con Gemini y se muestra «Sin nota de pronunciación: <motivo>».

## Otros flujos

- **Bienvenida (primera instalación):** `WelcomeScreen` → `ProfileSetup` (nombre, mascota y tema, ocupación, motivos, 3 temas) → `Onboarding` (hola, cómo funciona, **clave de Gemini explicada por la mascota**, Azure opcional, profe, meta diaria) → test de nivel.
- **Test de nivel** (`Calibration.tsx`): gramática adaptativa (hasta 20 ítems), 2 textos de lectura, 2 audios de escucha (TTS, máx. 3 escuchas) y 3 tareas de habla. Las preguntas salen del **banco offline** `src/bank/` (450 ítems); Gemini solo evalúa el habla (rúbrica de 4 criterios, temperatura 0, mediana). Persistencia:
  - **A medias:** se guarda en cada punto seguro en IndexedDB `habla-draft`, clave `progress`, y al abrir se retoma.
  - **Terminado sin evaluar:** clave `calibration`; si la evaluación falla (`EvalFail`), se reintenta sin repetir el test.
- **Plan de 12 semanas** (`plan.ts`): se genera tras el test; las lecciones de cada semana se generan al empezarla. Semanas 4, 8 y 12: re-test.
- **Repaso** (`ReviewScreen`, `srs.ts`): tarjetas FSRS de errores y palabras guardadas; el alumno dice la frase en inglés y Gemini la evalúa.
- **Palabras** (`lookup.ts`): explicación de una palabra en su frase (inglés ↔ español).
- **Temas con noticias reales** (`topics.ts`): Gemini con la herramienta **Google Search** para buscar una noticia reciente.
- **Avisos antes del Inicio** (`notices.ts` + `NoticeGate`): clase a medias, novedades de la versión, «¿Para qué es tu clave?» (una vez), tarea, re-test disponible, compañeros.
- **Globos de la mascota en el Inicio** (`mascotTips.ts` + `MascotBubble`): avisos de hoy y consejos de uso, intercalados, con tiempos sin agobiar.
- **Notificaciones locales** (`reminders.ts`): 7 avisos sueltos (ids 10–16), reprogramados al abrir la app o al cambiar algo, con alarma exacta (`USE_EXACT_ALARM`), icono propio y la imagen de la mascota elegida.

## Almacenamiento

| Dónde | Qué |
|---|---|
| IndexedDB `habla` (Dexie, `db.ts`, esquema v3) | `sessions`, `turns`, `mistakes`, `profile` (id `me`: niveles, tests, plan, trayectoria, uso del banco), `lookups`, `cards` (FSRS) |
| IndexedDB `habla-draft` (sin Dexie, `testDraft.ts`) | `calibration` (test terminado pendiente de evaluar) y `progress` (test a medias) |
| Preferences (`SharedPreferences` en Android; en la web, `localStorage` con prefijo `CapacitorStorage.`) | `habla.settings` (ajustes y **claves**), `habla.savedClass` |
| localStorage | `habla.quota` (modelos sin cuota), `habla.netlog` (diagnóstico de llamadas), `habla.azureUsage` (caché de 10 min del consumo de Azure), `habla.adviceCursor` (por qué consejo va la mascota) |
| Exportar/Importar (`backup.ts`) | JSON con las tablas de Dexie. **No incluye las claves.** Las Preferences están excluidas de las copias automáticas de Android (`backup_rules.xml`, `data_extraction_rules.xml`) |

## Integraciones externas

| Servicio | Para qué | Autenticación | Notas |
|---|---|---|---|
| **Google Gemini** (`generativelanguage.googleapis.com/v1beta`) | Turnos de la clase (audio → JSON), ideas «¿Qué digo?», tema del día, informe, consultas de palabras, evaluación del habla del test, repaso, plan | Clave del usuario (`geminiKey`, empieza por `AIza`) | Modelo principal por defecto `gemini-3.8-flash`; modelo rápido y de respaldo `gemini-3.5-flash-lite`. La lista se pide a `/models` y se mezcla con modelos conocidos. Google Search grounding para noticias |
| **Azure Speech — Pronunciation Assessment** (`https://{región}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`) | Nota de pronunciación, fluidez, completitud, prosodia, palabras y fonemas | Cabecera `Ocp-Apim-Subscription-Key` + cabecera `Pronunciation-Assessment` (JSON en base64) | Solo audio corto: **máx. 60 s**. WAV PCM 16 kHz mono |
| **Azure — comprobar clave** (`https://{región}.api.cognitive.microsoft.com/sts/v1.0/issueToken`) | Validar clave y región al guardarlas (no gasta audio) | Misma clave | |
| **Azure Monitor** (`management.azure.com…/metrics`, métrica `AudioSecondsTranscribed`) + **Entra ID** (`login.microsoftonline.com/{tenant}/oauth2/v2.0/token`) | Horas usadas del plan gratis F0 (5 h al mes) | Service principal (tenant, client id, secret) con rol *Monitoring Reader* | Opcional. Dato aproximado (Azure lo publica con retraso) |
| **Google AI Studio** / **portal de Azure** | Enlaces de la bienvenida para crear las claves | — | Los enlaces `<a href>` externos los abre Capacitor en el navegador del sistema |

## Plugins nativos propios

- **AudioRoutePlugin:** elige por dónde se escucha y se habla con auriculares. Para usar el micrófono Bluetooth hace falta `BLUETOOTH_CONNECT` y `AudioManager.setCommunicationDevice(bt_sco)`, **reaplicado justo después de `getUserMedia`** (el WebView elige su propio dispositivo y lo pisa). Sin esto, el micro BT graba ceros exactos.
- **DeviceAuthPlugin:** confirma la identidad con el bloqueo del teléfono antes de ver o cambiar una clave. En Android 11+ usa `BiometricPrompt` (huella o credencial); en versiones anteriores, el intent de Keyguard. Hay un periodo de gracia de 60 s.
- **OrientationPlugin:** fija la orientación (automática, vertical, horizontal, horizontal al revés) sin depender del sensor. Se creó para la madre del dueño, que tiene una franja de la pantalla rota.

## Versión y compilación

`version.json` → `android/app/build.gradle` (versionName / versionCode) y `changelog.ts` (pantalla Acerca de y Novedades). Gradle firma con `keystore/habla.jks` si existe `keystore/keystore.properties`, renombra el APK a `Habla-v<versión>.apk` y lo copia a `apk/`. El APK que se distribuye es **debug** (depurable), firmado con la clave del proyecto.
