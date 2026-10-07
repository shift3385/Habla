# Habla 5.9 «Transparencia y control» — Qué se hizo y cómo se probó

Entrega: v5.9 (build 36), que incluye la 5.8.1 y la 5.8.2 (no se compilaron por separado). Fecha: 2026-10-07.
Origen: `docs/auditoria/resultados/INFORME.md` §8.4 y las notas del dueño (2026-10-07).
Hecho en una sesión de Claude Code en la nube (Linux, **sin Android SDK ni teléfono**): todo está probado en PC y en
Chromium con la app real (Vite), datos ficticios y red simulada (0 llamadas reales a Google o Azure). Falta el teléfono
(`REVISOR-MOVIL.md`, R17–R24) y compilar el APK.

## Decisiones del dueño (2026-10-07)
- Todo en una sola versión, la 5.9.
- Micro en clase (MIC-305): **toca una vez para abrir el micro y otra para cerrar y enviar, máximo 60 s**.
- «Ya me la sé»: la frase se **archiva y se puede recuperar**.
- Fonética de Azure en el test: **solo informativa** (no entra en el nivel).
- Pausa del test: **una sola vez por test** (también el re-test).

## Resumen

| # | Qué | Hallazgos / nota | Archivos |
|---|---|---|---|
| 1 | Micro «toca para hablar, toca para enviar», máx. 60 s; el micro solo está abierto mientras grabas (clase, repaso y test); «Salir» en la preparación | AUD-MIC-305, AUD-FLU-213 | `src/lib/recorder.ts` (`finish()`), `src/components/talkGesture.ts` (reescrito: `tapAction`), `src/components/TalkButton.tsx` (reescrito), `src/components/PrepareScreen.tsx` (`onCancel`), `src/screens/Conversation.tsx`, `src/screens/ReviewScreen.tsx`, `src/screens/Calibration.tsx`, `tests/talkGesture.test.mjs` |
| 2 | «Pausar y seguir luego» una vez por test (test y re-test); la mascota avisa del re-test en pausa; restos de re-tests abandonados >30 días se borran | AUD-FLU-202, AUD-FLU-204, AUD-MIC-311; nota del dueño | `src/lib/testDraft.ts` (`pauseUsed`, `expireRetestLeftovers`), `src/screens/Calibration.tsx`, `src/screens/NoticeGate.tsx`, `src/App.tsx` |
| 3 | «Terminar» la clase a medias desde el Inicio, con su informe; los minutos de hoy se cuentan por la hora de cada respuesta (clase a medias incluida) | AUD-E2E-603; nota del dueño | `src/screens/Home.tsx`, `src/App.tsx` (`finishNow`), `src/screens/Conversation.tsx`, `src/lib/stats.ts` |
| 4 | Repaso: botones «cuándo vuelve» (intervalo grande + «No me salió / Me costó / Bien / Fácil»), obligatorio para seguir, explicación de la mascota la primera vez; «Ya me la sé» (archiva) y Palabras → Ya las sé → «Repasar otra vez»; lo hablado cuenta para la meta y la racha; en horizontal la tarjeta se desplaza | notas del dueño | `src/screens/ReviewScreen.tsx`, `src/lib/srs.ts` (`archiveCard`, `unarchiveCard`, `archivedCards`), `src/lib/db.ts` (`archivedAt`), `src/lib/backupCheck.ts`, `src/screens/WordsScreen.tsx`, `src/lib/stats.ts` (`addPracticeSeconds`), `src/lib/settings.ts` (`reviewHelpSeen`) |
| 5 | Fonética de Azure en clase (y prácticas y temas, que usan la clase), repaso (referencia: la respuesta correcta) y test (informativa); interruptor en cada pantalla; aviso de la mascota al entrar a clase | notas del dueño | `src/lib/phonetics.ts` (`runPhonetics`), `src/components/PhoneticsToggle.tsx` (nuevo), `src/screens/Conversation.tsx`, `src/screens/ReviewScreen.tsx`, `src/screens/Calibration.tsx`, `src/index.css` |
| 6 | Privacidad (qué sale a Google y Microsoft); recordatorios (permiso al arrancar, aviso de la mascota, ruta de Xiaomi/POCO, 30 días); importar con copia automática previa y limpieza de clase guardada y borradores; importar desde la bienvenida sin saltar la clave; el aviso de fonética agotada no saca de la clase; horizontal: micro y «¿Qué digo?» siempre tocables | AUD-FLU-210, AUD-FLU-900, AUD-FLU-217, INFORME §8.4.5, AUD-FLU-219, AUD-FLU-200, AUD-FLU-207, AUD-E2E-602 | `src/screens/Onboarding.tsx`, `src/screens/SettingsScreen.tsx`, `src/lib/reminders.ts`, `src/lib/mascotTips.ts`, `src/screens/Home.tsx`, `src/lib/backup.ts`, `src/App.tsx`, `src/index.css`, `tests/mascotTips.test.mjs` (nuevo) |
| 7 | Entrega: 5.9/36, Novedades, README, CLAUDE.md, docs | — | `version.json`, `src/lib/changelog.ts`, `README.md`, `CLAUDE.md`, `docs/estado-actual.md`, `docs/problemas-conocidos.md`, `docs/correccion/REVISOR-MOVIL.md` |

**Fuera de alcance (a propósito):** el dictado del tema del Debate y de Tema libre (`TopicAskPage`) no lleva fonética: es para escribir el tema, no para hablar con el profe. Ya cerraba el micro al terminar.

## Cómo se probó (PC)
- `npx tsc -b` OK · `npm run lint` 0 errores · `npm test` **39/39** · `node scripts/validate-bank.mjs` OK · `npm run build` OK.
- **Navegador** (Chromium headless + Vite, origen aislado `rev.localhost`, arnés `docs/correccion/arnes-rev/rev-mic.js` con micro falso y red falsa; Azure simulado con una respuesta válida de Pronunciation Assessment). Capturas en `evidencia-rev/v59-navegador/`.

| Caso | Resultado |
|---|---|
| Clase: entrar sin tocar | 1 apertura para el permiso y **0 pistas vivas** después |
| Toque → grabando → toque | 1 pista viva y 1 grabador mientras graba; al enviar, **0 vivas**, audio enviado |
| Doble toque rápido | 1 apertura y 1 grabación (el rebote no envía) |
| Papelera | grabación descartada, 0 vivas, nada enviado |
| 60 s | «quedan 0:08» a los 52 s; a los 60 s se envía solo y se suelta el micro |
| Segundo plano grabando | 0 vivas, nada abierto oculto |
| Test: pausar en la pregunta 3 y recargar | sigue en la pregunta 3, `pauseUsed: true`, sin botón Pausar |
| Clase a medias (2 respuestas de 60 s) | «2/5 min hoy» antes de cerrarla; «Terminar» → confirmación → informe, **0 micros abiertos**, sesión cerrada con métricas e informe |
| Repaso | micro suelto tras enviar; explicación de la mascota; botones «1 min / 6 min / 10 min / 9 días»; «Ya me la sé» archiva; Palabras → Ya las sé → «Repasar otra vez» la devuelve (archivadas 0, pendientes 3); segundos del repaso guardados |
| Fonética | aviso de la mascota al entrar; el interruptor cambia `phoneticsOn`/`phoneticsUserOff`; nota de Azure en la clase y en el repaso |
| Horizontal 780×360 y 640×320 | micro, «¿Qué digo?» y teclado se pueden tocar (`elementFromPoint`); botones del repaso a la vista (antes quedaban fuera) |
| Importar copia v4.1 | confirmación con «1 sesión y 1 error» (singular), clase guardada anterior borrada (FLU-219), privacidad visible |

- **Revisión de código** (`/code-review` sobre los commits de la 5.9): 10 hallazgos, todos corregidos en `9a43bcb` (clase guardada tras importar desde Ajustes, sello único de la copia previa, doble envío, scroll de las ideas, nota tardía de Azure, aviso de fonética en clase, minutos por hora de respuesta, contador del repaso al importar, permiso una vez por sesión, aviso de recordatorios que se vuelve a comprobar). Repetidas las pruebas de navegador tras el arreglo: todo igual.

## Para el teléfono (revisor móvil)
Ver `REVISOR-MOVIL.md` R17–R24. Lo más importante:
1. **R17** · el micro (punto verde, `dumpsys audio`) solo abierto mientras se graba, en la clase, el repaso y el test; un toque empieza y otro envía; a los 60 s se envía solo.
2. **R18** · pausa del re-test y vuelta.
3. **R21** · fonética real con el F0 (pide permiso al dueño: gasta segundos de su cuota).
4. **R22** · recordatorio con el permiso denegado en HyperOS.
5. **R23** · la copia previa aparece en `Documentos/Habla` al importar (en `.debug`).
