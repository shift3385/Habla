# Habla — guía para Claude Code

Habla es una **app Android personal de práctica de inglés por voz**. El usuario habla, una IA (Google Gemini) transcribe, corrige y responde como un profe, y la app mide la fluidez, guarda los errores para repasarlos y sigue un plan de 12 semanas con test de nivel. Opcionalmente, **Azure Speech** puntúa la pronunciación sonido a sonido.

- **Dueño:** un ingeniero de software hispanohablante (nivel B1, habla A2) que aprende inglés. **Responde siempre en español.**
- **Usuarios reales:** el dueño (teléfono POCO), su madre (Samsung Galaxy A11 con la pantalla dañada; usa horizontal forzado) y algunas amistades. Se distribuye **copiando el APK a mano**: no está en ninguna tienda.
- **Alcance actual:** cada persona usa **su propia clave** de Gemini (y opcionalmente de Azure), que se guarda solo en su teléfono. No hay backend ni cuentas.
- **Versión actual:** 5.8 (build 33). Repo privado: `https://github.com/shift3385/Habla`.

## Stack

| Pieza | Versión / detalle |
|---|---|
| UI | React 19 + TypeScript ~6.0 + Tailwind CSS 4 (plugin `@tailwindcss/vite`), fuente Outfit (`@fontsource/outfit`) |
| Build web | Vite 8 (`vite.config.ts` mínimo) |
| App nativa | Capacitor 8 (Android 36, minSdk 24). Plugins: `app`, `preferences`, `filesystem`, `share`, `haptics`, `local-notifications`, `@capacitor-community/text-to-speech`, y **3 plugins Java propios** (ver abajo) |
| Datos locales | Dexie 4 (IndexedDB `habla`), IndexedDB `habla-draft` sin Dexie (borradores del test), `@capacitor/preferences` (ajustes y clase guardada), `localStorage` (cachés pequeñas) |
| Repaso espaciado | `ts-fsrs` 5 |
| IA | Google Gemini (REST `generativelanguage.googleapis.com`) con la clave del usuario; Azure Speech REST (opcional); Azure Monitor (opcional) |
| Lint | `oxlint` (`.oxlintrc.json`). **No hay Prettier configurado** (ver Convenciones) |
| Tests | **No hay tests automatizados en el repo** (ver «Pruebas») |

## Estructura

```
src/
  App.tsx            orquesta pantallas, pestañas, avisos globales (NoticeGate, hoja de problemas de Gemini, alerta de fonética)
  main.tsx, index.css   entrada y estilos globales (temas por variables CSS, .tip-bubble, .card-glow, landscape)
  bank/              banco de ítems del test de nivel (JSON por habilidad: grammar, reading, listening, speaking) — 450 ítems
  lib/               lógica sin UI (un archivo por responsabilidad)
    gemini.ts          llamadas a Gemini (CapacitorHttp + JSON Schema), reintentos, modelos de respaldo, cuota (habla.quota), registro de red (habla.netlog)
    geminiTrouble.ts   clasifica fallos de Gemini para la hoja de la mascota (otro modelo / otra clave)
    teacher.ts         prompt del profe y esquema de respuesta (transcripción + correcciones + respuesta)
    speech.ts          análisis local del audio (habla real, pausas ≥ 1 s) — sin coste
    recorder.ts        MediaRecorder (webm/opus) ⚠️ ver docs/problemas-conocidos.md
    wav.ts             webm → WAV 16 kHz mono (para Azure), máx. 60 s
    pronunciation.ts   Azure Pronunciation Assessment (REST), frase del coach, palabras a cuidar
    phonetics.ts       política de la fonética: planes F0/S0, cuota agotada, estado de la tarjeta Modelos
    azureUsage.ts      consumo del mes vía Azure Monitor (service principal, opcional)
    fluency.ts         métricas de fluidez, nota 0–100, informe final
    placement.ts, calibration.ts, levels.ts, bank.ts   test de nivel (reglas, evaluación del habla, niveles, banco)
    testDraft.ts       borradores del test: terminado sin evaluar (`calibration`) y a medias (`progress`)
    testSummary.ts     mini resumen y resumen completo de cada test
    plan.ts            plan de 12 semanas y lección del día
    srs.ts             tarjetas de repaso (FSRS)
    lookup.ts          consultas de palabras en contexto
    topics.ts, scenarios.ts   temas (con noticias reales vía Google Search) y prácticas guiadas
    mascotTips.ts      avisos y consejos de los globos de la mascota del Inicio
    notices.ts         avisos a pantalla completa antes del Inicio (NoticeGate)
    reminders.ts       notificaciones locales (recordatorio diario y re-test)
    savedClass.ts      clase a medias guardada al salir
    settings.ts        ajustes en Preferences (clave `habla.settings`) con valores por defecto
    deviceAuth.ts, orientation.ts, audioRoute.ts   puentes a los plugins Java
    lifecycle.ts       segundo plano: para micro, voz y animaciones (batería)
    viewport.ts        escala de la interfaz en pantallas pequeñas
    backup.ts          exportar/importar JSON (sin claves)
    changelog.ts       versión (lee version.json) y Novedades de cada versión
    db.ts              esquema Dexie y tipos (Session, Turn, Mistake, Profile, Lookup, SrsCard)
  screens/           una pantalla por archivo (Home, Conversation, Calibration, SettingsScreen, ProgressScreen, WordsScreen, Onboarding, NoticeGate, …)
  components/        piezas reutilizables (TalkButton, PronunciationView, MascotBubble, InfiniteList, MascotPage, AzureSettings, …)
  ui/                sistema visual: theme.ts (4 temas × claro/oscuro, profes, mascotas), Mascot.tsx (mascota animada SVG), iconos
android/             proyecto nativo. Plugins propios en app/src/main/java/com/shift/habla/:
                       AudioRoutePlugin (micro de auriculares Bluetooth), DeviceAuthPlugin (patrón/PIN/huella), OrientationPlugin (orientación forzada)
                     res/drawable/ic_stat_habla.xml (icono de notificación) y res/drawable-nodpi/mascot_*.png (imagen de la mascota en el aviso)
scripts/validate-bank.mjs   valida el banco del test
version.json         ÚNICA fuente de la versión (versionName/versionCode del APK y pantalla Acerca de)
keystore/            firma del APK — FUERA de git (ver Reglas)
apk/                 APK generados (Habla-v<versión>.apk) — fuera de git
docs/                documentación (ver abajo), NC de versiones e informes de auditoría
BACKLOG.md           ideas y pendientes históricos (anotado el 2026-10-01)
```

## Comandos

El entorno es **Windows** sin Android Studio (SDK por línea de comandos). El PATH de la sesión puede estar desactualizado: fija las variables en cada orden de PowerShell.

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21'; $env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"; $env:Path="C:\Program Files\nodejs;C:\Program Files\Java\jdk-21\bin;$env:Path"
```

| Tarea | Comando |
|---|---|
| Instalar dependencias | `npm install` (internet lento: evita añadir dependencias nativas nuevas) |
| Web en desarrollo | `npm run dev` → http://localhost:5173 (en Claude Code: `preview_start` con el nombre `habla-dev` de `.claude/launch.json`) |
| Tipos | `npx tsc -b` |
| Lint | `npm run lint` (debe quedar con **0 errores**; hay ~6 avisos antiguos en Calibration/Conversation/Settings) |
| Validar el banco del test | `node scripts/validate-bank.mjs` |
| Compilar la web | `npm run build` |
| APK (forma fiable) | `npm run build; npx cap sync android; cd android; .\gradlew.bat assembleDebug --offline -q; cd ..` → `apk\Habla-v<versión>.apk` |
| Instalar en un teléfono | `adb -s <serie> install -r apk\Habla-v<versión>.apk` (`-r` conserva los datos) |

`npm run apk` existe pero no usa `--offline`; con internet lento Gradle se cuelga. El aviso «SDK XML version 4» de Gradle es inofensivo.

### Pruebas

- No hay suite automatizada en el repo. Durante el desarrollo se usaron **scripts de prueba temporales** con este patrón: un `.mjs` que crea un servidor Vite en `middlewareMode` y carga el módulo con `server.ssrLoadModule('/src/lib/xxx.ts')` para probar funciones puras (`placement`, `pronunciation`, `phonetics`, `azureUsage`, `mascotTips`…). Se copiaban a la raíz como `.tmp-*.mjs`, se ejecutaban y se borraban. Esos scripts **ya no existen**: si hacen falta, recréalos (o, mejor, añade un runner de tests de verdad).
- Pruebas manuales en el **teléfono real** por USB: ver `docs/configuracion.md` (CDP, audio falso, varios dispositivos).
- Antes de compilar una entrega: `npx tsc -b`, `npm run lint`, `node scripts/validate-bank.mjs` y prueba local de lo cambiado.

## Convenciones

- **Idioma:** textos de la app, comentarios y mensajes de commit **en español** (registro «tú», tono cercano). Los nombres de código en inglés (`buildTips`, `phoneticsActive`…).
- **Estilo:** sin punto y coma, comillas simples, 2 espacios, líneas hasta ~150 caracteres, *trailing commas*. Si usas Prettier, **pásale estas opciones** (`--no-semi --single-quote --print-width 150 --trailing-comma all`): sin ellas reformatea todo el archivo.
- **Finales de línea:** muchos archivos son **CRLF**. Al editar con scripts, normaliza `\r\n` y respeta el formato original. Git avisa de «LF will be replaced by CRLF»; es normal.
- **Comentarios:** densidad moderada, explican el *porqué* (a menudo citando la NC o la decisión). Imita el estilo de cada archivo.
- **Ajustes nuevos:** se añaden a `Settings` y a `DEFAULTS` en `settings.ts` (la carga mezcla los valores por defecto, así que los ajustes nuevos llegan solos a instalaciones antiguas).
- **Datos sensibles** (claves de Gemini y Azure, secreto de Azure Monitor): solo en Preferences, nunca en copias de seguridad ni en logs. Para ver o cambiar una clave ya guardada se llama a `confirmIdentity()` (deviceAuth).
- **Pantallas explicativas con la mascota** del tema (`MascotPage`, `MascotSays`, globos): el dueño quiere que la mascota explique las cosas. Las burbujas de ayuda usan la clase `.tip-bubble` (se tiñen con el color del tema).
- **Diseño:** sin scroll en el Inicio; listas largas dentro de `InfiniteList`; todo debe funcionar en **horizontal** y en pantallas pequeñas (320×640, Galaxy A11).
- **Versiones:** cada entrega sube `version` y `build` en `version.json` y añade su entrada en `RELEASES` de `changelog.ts` (es lo que ve el usuario en «Novedades»). Semántica acordada el 2026-10-06: correcciones → PATCH (5.8.1), funciones visibles → MINOR (5.9), 6.0 reservada para abrir la app a otras personas.
- **Commits:** uno por entrega o cambio coherente, en español, terminando con la línea de coautoría que indique el sistema. Push a `main`.

## Reglas importantes

1. **Nunca regeneres ni sustituyas `keystore/habla.jks`** (ni `keystore/keystore.properties`). Si la firma cambia, los usuarios no pueden actualizar sin desinstalar y **pierden sus datos**.
2. **Nunca escribas, pegues ni registres las claves reales** del usuario (Gemini, Azure). Las mete él en el teléfono. No devuelvas el JSON de ajustes en una evaluación CDP: resúmelo (`hasKey`, longitud).
3. **No vuelvas a activar los logs del puente de Capacitor** (`loggingBehavior: 'none'` en `capacitor.config.ts`): en builds de depuración imprimían en logcat los ajustes con las claves.
4. **Prueba antes de compilar** y solo compila un entregable cuando lo cambiado pase las revisiones. El dueño es muy exigente y quiere evidencias (capturas, medidas).
5. **No pierdas datos de los usuarios:** instala siempre con `adb install -r`. Antes de cualquier cosa arriesgada en un teléfono ajeno (p. ej. el de su madre), haz copia del estado.
6. **Política de niveles:** las lecciones solo **proponen**; solo el re-test cambia el nivel (70 % test + 30 % trayectoria). El primer test fija el nivel. Ver `docs/decisiones.md`.
7. **Siguiente trabajo previsto:** v5.8.1 «Micrófono seguro» (P0 de la auditoría). Lee `docs/auditoria/resultados/INFORME.md` §8 antes de empezar.
8. **Con varios teléfonos conectados**, usa siempre `adb -s <serie>` o `ANDROID_SERIAL`. No toques el teléfono de otra persona sin que el dueño lo pida.

## Documentación relacionada

- [docs/arquitectura.md](docs/arquitectura.md) — arquitectura, flujo de datos, integraciones externas
- [docs/decisiones.md](docs/decisiones.md) — decisiones técnicas, alternativas descartadas y por qué
- [docs/estado-actual.md](docs/estado-actual.md) — qué está hecho, a medias y pendiente
- [docs/problemas-conocidos.md](docs/problemas-conocidos.md) — bugs, deuda técnica y partes frágiles
- [docs/configuracion.md](docs/configuracion.md) — claves, ajustes, almacenamiento, entorno de compilación y depuración en el teléfono
- [docs/auditoria/](docs/auditoria/) — auditoría QA de la v5.8 (orquestador, bots B0–B8, plantillas). Informe final: [docs/auditoria/resultados/INFORME.md](docs/auditoria/resultados/INFORME.md)
- [docs/NC-v5.7.md](docs/NC-v5.7.md) y [docs/NC-v5.7-ajustes.md](docs/NC-v5.7-ajustes.md) — no conformidades de la v5.7 y cómo se resolvieron; capturas en `docs/evidencia-v5.7/`
- [README.md](README.md) — manual de usuario (instalar, actualizar, usar cada función) e historial de fases
- [BACKLOG.md](BACKLOG.md) — ideas y pendientes históricos
