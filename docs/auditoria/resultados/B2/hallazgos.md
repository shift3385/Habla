# B2 · Flujos — Hallazgos (fase 1, estática)

Autor: B2 · Fecha: 2026-10-05 · Commit auditado `6874443` (v5.8 build 33) · Solo lectura de código; sin teléfono ni navegador.
Todo lo de este archivo es **HIPÓTESIS** según la regla 6 (no hay prueba dinámica); la evidencia es la lectura del código con archivo:línea. La severidad es la que tendría si se confirma.

Mapas de flujo: `flujos.md`. Casos para B6: `casos-e2e.md`.

---

### AUD-FLU-200 · Importar copia desde la bienvenida salta la clave de Gemini y no guarda «onboarded»

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS (sin prueba dinámica)
- **Probado en:** estático
- **Dónde:** `src/App.tsx:180-186` (`importFromWelcome`), `src/screens/WelcomeScreen.tsx:265-277`, `src/App.tsx:188-195` (`update`), `src/App.tsx:312-318`
- **Qué pasa:** al importar una copia desde «Ya tengo mi perfil», `importFromWelcome` pone `onboarded: true` con `setSettings` directo, **sin `saveSettings`** (a diferencia de `update`). En esa sesión se salta `Onboarding` entero (paso de la clave de Gemini incluido) y se entra al Inicio sin clave (la copia no la trae, `backup.ts:6-7`). Al reiniciar, `onboarded` vuelve a ser `false` y aparece la bienvenida/tutorial de nuevo.
- **Por qué importa:** es el camino de quien cambia de teléfono: en la primera sesión cada tema/práctica del Inicio manda a la portada de Ajustes sin explicación (`Home.tsx:132-133`, `keysReady` falso), el plan no se crea (`PlanCard.tsx:62,79`) y «Continuar clase»/lecciones del plan no comprueban la clave (`App.tsx:446-458`), así que fallan en la preparación; en el siguiente arranque el comportamiento cambia.
- **Cómo reproducir:**
  1. Instalación limpia (o datos de navegador vacíos en Vite).
  2. Bienvenida → «Ya tengo mi perfil (importar copia)» → elegir un `habla-backup-*.json` con perfil calibrado.
  3. Entrar en una clase. Cerrar la app y volver a abrirla.
- **Esperado:** tras importar, pasar por el paso de la clave (o pedirla) y que el estado quede persistido.
- **Obtenido (previsto por el código):** Inicio sin clave; la clase falla en la preparación; en el siguiente arranque vuelve a salir el tutorial.
- **Evidencia:** `App.tsx:184` `setSettings((s) => (s ? { ...s, onboarded: true } : s))` frente a `App.tsx:192` `saveSettings(next)`.
- **Causa raíz (si se conoce):** se usa `setSettings` en lugar de `update`, y el flujo de importación asume que ya hay clave.
- **Propuesta de corrección:** usar `update({ onboarded: … })` solo si ya hay clave; si no, mandar al paso de la clave del `Onboarding` tras importar.
- **Relacionado con:** E2E-004.

### AUD-FLU-201 · El botón atrás de Android antes del Inicio arma un «¿Ya te vas?» invisible y no retrocede pasos

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/App.tsx:229-235` (listener `backButton`), `src/App.tsx:297-395` (ramas splash/Onboarding/ProfileSetup/FavoritesSetup/NoticeGate sin `dialogs`), `src/App.tsx:491-505`, `src/screens/Onboarding.tsx:58` (no recibe `registerBack`)
- **Qué pasa:** en la bienvenida, el tutorial, el perfil, los favoritos y `NoticeGate` no hay `backHandler` y `tab === 'home'`, así que cada pulsación de atrás hace `setAskExit((open) => !open)`. El diálogo solo se pinta en la rama final (Inicio), de modo que la pulsación no hace nada visible y, con un número impar de pulsaciones, «¿Ya te vas?» aparece de golpe al llegar al Inicio. Atrás tampoco retrocede un paso en `Onboarding` (solo lo hace la flecha de la cabecera).
- **Por qué importa:** confuso para usuarios no técnicos (BACKLOG 4.4): atrás «no funciona» y luego aparece una pregunta de salir sin motivo.
- **Cómo reproducir:**
  1. Instalación limpia; en el tutorial (paso 3, clave) pulsar atrás 1 vez.
  2. Completar hasta llegar al Inicio.
- **Esperado:** atrás retrocede un paso del tutorial (o no hace nada) y no deja estado pendiente.
- **Obtenido (previsto):** sin efecto visible; al llegar al Inicio aparece «¿Ya te vas?».
- **Evidencia:** `App.tsx:234` `else setAskExit((open) => !open)`; `dialogs` solo en `App.tsx:578`.
- **Causa raíz:** el manejador global no conoce las pantallas previas al Inicio.
- **Propuesta de corrección:** registrar manejadores en esas pantallas (o ignorar atrás si `splash`/`!onboarded`/`gate.length`) y reiniciar `askExit` al salir de ellas.
- **Relacionado con:** NC-15, E2E-006.

### AUD-FLU-202 · El re-test, una vez empezado, no tiene salida (ni atrás ni botón)

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/screens/Calibration.tsx:300-304` (`registerBack(() => {})`), `src/screens/Calibration.tsx:637-657` (páginas `explain` sin «Ahora no»), `src/App.tsx:337-366` (sin `onCancel`), `src/screens/SettingsScreen.tsx` (`onRetest`), `src/screens/NoticeGate.tsx:166`
- **Qué pasa:** el re-test es opcional («Más tarde» en `NoticeGate`), pero en cuanto se toca «Hacer el re-test ahora» (o el botón de Ajustes) el botón atrás queda anulado y ninguna pantalla del test ofrece cancelar. La única salida es matar la app; al volver, `retest` es `false` y se pierde todo lo respondido (ver AUD-FLU-203).
- **Por qué importa:** 25–30 min obligatorios por un toque, sin poder ni siquiera volver desde la primera página de explicación; la pestaña inferior tampoco está.
- **Cómo reproducir:**
  1. Perfil con re-test disponible. Ajustes → «¡Toca aquí para revalidar tu nivel!».
  2. En la primera página («Vamos a…»/re-test) pulsar atrás de Android; buscar un botón de salir.
- **Esperado:** poder salir del re-test (al menos antes de empezar, idealmente con borrador) volviendo al Inicio.
- **Obtenido (previsto):** atrás no hace nada; no hay botón de salida.
- **Evidencia:** comentario del propio código «El test es obligatorio: el botón atrás de Android no lo cierra» aplicado también al re-test (`retest = !!profile?.calibratedAt`, `:298`).
- **Causa raíz:** la regla de «test obligatorio» del primer test se aplica igual al re-test.
- **Propuesta de corrección:** en re-test, `onBack`/«Ahora no» en las páginas de explicación y un «Salir del test» que vuelva al Inicio.
- **Relacionado con:** AUD-FLU-203, E2E-022.

### AUD-FLU-203 · El test de nivel no guarda borrador hasta el final: salir o que Android cierre la app pierde hasta 30 min

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/screens/Calibration.tsx:264-294` (todo el progreso en `useState`/`useRef`), `:546-565` (`finish`, único `saveDraft`), `src/lib/testDraft.ts:5-7`; no hay `whenBackground` en `Calibration.tsx`
- **Qué pasa:** gramática, lectura, audición y grabaciones del habla viven solo en memoria. `saveDraft` solo se llama en `finish()`, al terminar la última tarea. Si el sistema mata el WebView en segundo plano (llamada, cámara, poca RAM) o el usuario cierra la app, el test arranca de cero; en un re-test, ni siquiera vuelve a abrirse (vuelve al Inicio).
- **Por qué importa:** pérdida de trabajo del alumno (25–30 min) y del cupo de escuchas de audición; contradice el «borrador si se sale» esperado en la misión y el texto de `EvalFail` que habla de que nada se pierde.
- **Cómo reproducir:**
  1. Empezar el test, contestar la gramática y el primer texto.
  2. Forzar el cierre (`am kill`/quitar de recientes) y abrir de nuevo.
- **Esperado:** retomar donde se quedó (o al menos por la parte).
- **Obtenido (previsto):** test desde la primera explicación (primer test) o Inicio sin test (re-test).
- **Evidencia:** `grep saveDraft` → solo `Calibration.tsx:560,563`.
- **Causa raíz:** el borrador se diseñó para fallos de evaluación, no para cortes durante el test.
- **Propuesta de corrección:** guardar el borrador al cerrar cada parte (tras cada `review`) y en `whenBackground`, y retomarlo al montar.
- **Relacionado con:** AUD-FLU-202, AUD-FLU-204, E2E-021.

### AUD-FLU-204 · Borrador de un re-test que falló al evaluarse queda huérfano

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/App.tsx:337` (`if (!calibrated || retest)`), `src/screens/Calibration.tsx:306-313`, `:1099-1112` (`EvalFail`)
- **Qué pasa:** si la evaluación de un **re-test** falla (sin red, 429, clave…) y el usuario cierra la app, al volver `calibrated` es `true` y `retest` `false`: `Calibration` no se monta y el borrador no se evalúa. Solo se usará cuando el usuario vuelva a pulsar «re-test», y entonces se evalúa de inmediato (sin explicación) con respuestas quizá de semanas antes, mientras el aviso de re-test sigue saliendo en cada arranque.
- **Por qué importa:** el mensaje «Tus respuestas y tus audios están guardados: no se pierden aunque cierres la app» (`Calibration.tsx:1106`) es engañoso para el re-test; el alumno cree perdido el test y puede repetirlo para descubrir que se evalúa el viejo. Los audios del habla quedan guardados en IndexedDB `habla-draft` indefinidamente.
- **Cómo reproducir:**
  1. Re-test completo con la red cortada en el último paso (o mock 503).
  2. En «No pude evaluar tu test», cerrar la app y reabrir.
  3. Ajustes → hacer el re-test.
- **Esperado:** al reabrir, la app retoma la evaluación pendiente (o avisa).
- **Obtenido (previsto):** Inicio normal; al pulsar re-test se evalúa el borrador antiguo.
- **Evidencia:** lectura de `App.tsx:337` y `Calibration.tsx:311`.
- **Causa raíz:** la decisión de montar `Calibration` no consulta `loadDraft()`.
- **Propuesta de corrección:** en el arranque, si hay borrador, montar `Calibration` (o un aviso en `NoticeGate`); fechar el borrador y avisar si es viejo.
- **Relacionado con:** AUD-FLU-203, E2E-024. Para B4: audios del habla en `habla-draft`.

### AUD-FLU-205 · «Reintentar» la evaluación no hace nada si el borrador no se pudo guardar; el test queda atascado

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/screens/Calibration.tsx:560,563` (`saveDraft(...).catch(() => {})`), `:579-582` (`retryEval`)
- **Qué pasa:** los errores de `saveDraft` se tragan; si el borrador no llegó a escribirse (IndexedDB llena o cerrada), `retryEval` lee `undefined` y no hace nada. Con atrás anulado (`:302`), la pantalla de error queda sin salida útil.
- **Por qué importa:** usuario atascado tras 30 min de test, sin mensaje.
- **Cómo reproducir:** 1. Simular fallo de `indexedDB.open('habla-draft')` en navegador (arnés). 2. Terminar el test con Gemini mockeado en 503. 3. Pulsar «Reintentar».
- **Esperado:** reintenta con el borrador en memoria o informa del problema.
- **Obtenido (previsto):** el botón no reacciona.
- **Evidencia:** lectura de código.
- **Causa raíz:** `retryEval` depende solo del borrador persistido.
- **Propuesta de corrección:** conservar el `TestDraft` en un `ref` y usarlo si `loadDraft()` falla.
- **Relacionado con:** AUD-FLU-203.

### AUD-FLU-206 · «Empezar nueva» dice que la clase guardada «se perderá», pero el código la cierra y la cuenta

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/App.tsx:470` frente a `src/lib/savedClass.ts:103-115` y `docs/NC-v5.7.md` (NC-15/16)
- **Qué pasa:** el texto de la mascota dice «Si empiezas una nueva, se perderá», mientras `discardSavedClass` cierra la sesión con sus métricas («cuenta en tu progreso») o la borra si no tiene métricas. El NC-v5.7 documenta lo segundo.
- **Por qué importa:** el usuario decide con información incorrecta (puede renunciar a una clase nueva por miedo a perder la anterior).
- **Cómo reproducir:** con una clase guardada, Inicio → empezar otra clase → leer el diálogo; después ver Progreso.
- **Esperado:** texto coherente con NC-16 («la anterior se cierra y cuenta en tu progreso»).
- **Obtenido:** «se perderá».
- **Evidencia:** `App.tsx:470`.
- **Propuesta de corrección:** alinear el texto con el comportamiento.
- **Relacionado con:** NC-15, NC-16, E2E-013.

### AUD-FLU-207 · El aviso de fonética agotada puede cortar una clase en curso sin guardarla ni avisar

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/screens/Conversation.tsx:174-178` (`reportPhoneticsQuota` durante un turno), `src/App.tsx:268-280` (`onOpenModels` → `setLesson(null)`), `src/components/PhoneticsAlert.tsx:18`
- **Qué pasa:** si Azure devuelve cuota agotada en mitad de una clase, `PhoneticsAlert` se superpone a la clase. Su botón «Ver Ajustes → Modelos» hace `setLesson(null)`: desmonta `Conversation` sin pasar por `leave()` (no hay despedida, no se llama a `deleteSessionIfEmpty`, y el `abort` del desmontaje descarta la respuesta del profe en curso y el audio pendiente de reenviar).
- **Por qué importa:** pérdida del último turno y salida abrupta; sesiones vacías en la base de datos si ocurre al principio.
- **Cómo reproducir:**
  1. Fonética activa con un mock de Azure que devuelva 403/cuota (`AzureError kind 'quota'`).
  2. Hablar un turno en clase; en el aviso, tocar «Ver Ajustes → Modelos».
- **Esperado:** la clase se guarda como en «atrás» (mascota «Te espero aquí») o el aviso no ofrece salir de la clase.
- **Obtenido (previsto):** la clase desaparece; Ajustes → Gemini.
- **Evidencia:** `App.tsx:275` `setLesson(null)`.
- **Causa raíz:** un aviso global navega sin pasar por la salida de la pantalla activa.
- **Propuesta de corrección:** durante una clase, llamar al `backHandler` registrado (que es `leave`) antes de navegar, o diferir el aviso al final de la clase.
- **Relacionado con:** E2E-017.

### AUD-FLU-208 · Los avisos de Gemini durante el test de nivel no se muestran y salen después, fuera de contexto

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/App.tsx:88-96` (`onGeminiTrouble` siempre activo), `src/App.tsx:339` (en el test solo `overlay={audioPicker}`), `src/lib/geminiTrouble.ts:29-31`
- **Qué pasa:** durante el test (y la evaluación del habla, que sí llama a Gemini) los problemas se guardan en `trouble` pero `GeminiTroubleSheet` no se pinta. Al acabar el test, la hoja aparece en el Inicio con un problema antiguo (p. ej. «saturado» de hace 10 minutos). `setTrouble((cur) => cur ?? tr)` además conserva el primero, no el último.
- **Por qué importa:** aviso confuso; la ayuda que sí está en el test (`GeminiFix` en `EvalFail`) no se ve afectada.
- **Cómo reproducir:** mock 429 en la evaluación del habla, reintentar con otro modelo hasta que funcione, terminar el test → Inicio.
- **Esperado:** el aviso caduca o no se acumula mientras no se puede mostrar.
- **Obtenido (previsto):** hoja de «Gemini va lento/sin cuota» al llegar al Inicio.
- **Evidencia:** lectura de código.
- **Propuesta de corrección:** no registrar `trouble` mientras el test está montado, o limpiarlo en `onDone`.
- **Relacionado con:** E2E-030.

### AUD-FLU-209 · Cambiar la clave de Gemini por una errónea borra la buena antes de comprobarla

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/screens/SettingsScreen.tsx:684-711` (`GeminiPage.save`: `update({ geminiKey: k })` en `:692`, comprobación después en `:696`), `src/components/GeminiFix.tsx:50-62` («Usar esta clave», sin comprobar nunca). En cambio `Onboarding.tsx:69-84` y `AzureSettings.tsx:98-118` comprueban antes de guardar.
- **Qué pasa:** al pegar una clave distinta, se guarda en Preferences y después se llama a `listModels`. Si la clave está mal copiada (o es de otro proyecto sin la API), la anterior ya se perdió: el usuario queda sin IA y tiene que volver a buscar su clave buena. En `GeminiFix` (pantalla de error del test y hoja de problemas) ni siquiera se comprueba.
- **Por qué importa:** convierte un error de pegado en una avería total de la app (flujo principal roto) para un usuario no técnico; además el cambio exige patrón/PIN, así que deshacerlo es costoso.
- **Cómo reproducir:**
  1. Con una clave válida, Ajustes → Gemini → pegar una clave falsa con formato `AIza…` → Guardar → confirmar patrón.
  2. Ver el error «La clave de Gemini no es válida» y salir.
  3. Empezar una clase.
- **Esperado:** la clave nueva solo sustituye a la anterior si Google la acepta (como en el tutorial y en Azure).
- **Obtenido (previsto):** la clave mala queda guardada; la clase falla.
- **Evidencia:** orden de llamadas en `SettingsScreen.tsx:692` → `:696`.
- **Causa raíz (si se conoce):** guardar primero y validar después.
- **Propuesta de corrección:** validar con `listModels(k)` y guardar solo si responde 200 (o conservar la anterior para «deshacer»).
- **Relacionado con:** NC-25, D-02, E2E-033, E2E-034.

### AUD-FLU-210 · No hay aviso ni consentimiento de que la voz, las transcripciones y el perfil salen a Google (y a Microsoft)

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS (revisión de textos)
- **Probado en:** estático
- **Dónde:** `src/screens/Onboarding.tsx:145-162` («Tu progreso, tus errores y tus palabras se guardan solo en este teléfono»), `:218-245` (Azure), `src/screens/NoticeGate.tsx:95-125`; envíos reales: `src/lib/teacher.ts` (audio de cada turno + perfil en el prompt), `src/lib/calibration.ts` (audios del habla), `src/lib/dictation.ts`, `src/lib/srs.ts` (`evaluateDrill`), `src/lib/pronunciation.ts:152` (WAV a Azure); `BACKLOG.md` «Puntos a debatir» 3 (pendiente).
- **Qué pasa:** el tutorial explica que «Gemini entiende lo que dijiste», pero no dice que **se sube la grabación de tu voz** a Google en cada turno, en el test, el repaso y el dictado, ni que el prompt lleva nombre, profesión, motivos e intereses; con Azure, que el audio va también a Microsoft. El único texto de privacidad destaca lo que se queda en el teléfono. No hay paso de aceptación.
- **Por qué importa:** la app ya la usan otras personas (BACKLOG 4.4); datos de voz y perfil a terceros sin información explícita. El propio BACKLOG lo marca como pendiente.
- **Cómo reproducir:** recorrer el tutorial completo y el aviso «¿Para qué es tu clave?» buscando una mención a la voz enviada.
- **Esperado:** una frase clara («tu voz se envía a Google para…», «con Azure, también a Microsoft») y, si se abre a otros usuarios, consentimiento.
- **Obtenido:** no aparece.
- **Evidencia:** textos citados con su línea.
- **Propuesta de corrección:** añadir el punto en «Así funciona Habla» y en el paso de Azure; enlazar las condiciones de Google AI Studio/Azure.
- **Relacionado con:** BACKLOG «Privacidad», B4 (inventario de red R2/R3), E2E-002.

### AUD-FLU-211 · Los textos dicen que la clave está «protegida con tu patrón, PIN o huella», pero solo lo está la pantalla

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/screens/Onboarding.tsx:170-171`, `:232`; `src/screens/NoticeGate.tsx:116-118`; almacenamiento `src/lib/settings.ts` (Preferences → `CapacitorStorage.xml` en claro, D-02 #5); gracia global `src/lib/deviceAuth.ts:14-25`
- **Qué pasa:** el bloqueo del teléfono solo se pide para **ver** o **cambiar** la clave en la interfaz; la clave se guarda en texto plano y el APK es depurable (AUD-SEG-001). Si el teléfono no tiene bloqueo, se deja pasar.
- **Por qué importa:** promesa de seguridad mayor que la real; el usuario puede confiar en ella.
- **Cómo reproducir:** leer los textos citados y compararlos con `settings.ts`/D-02.
- **Esperado:** «solo se muestra o se cambia tras tu patrón/PIN» (o cifrarla con Keystore, como recomienda D-02).
- **Obtenido:** «protegida con tu patrón, PIN o huella».
- **Evidencia:** líneas citadas.
- **Propuesta de corrección:** ajustar el texto o cumplirlo (EncryptedSharedPreferences).
- **Relacionado con:** D-02, NC-25, AUD-SEG-001, B5.

### AUD-FLU-212 · Sin conexión, la app reintenta hasta ~60 s, resube el audio y lo presenta como «Google saturado»

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/lib/gemini.ts:526-529` (sin red → `ApiError(…, 0)`, transitorio), `:271-337` (`withRetry`: 3 + 2 intentos, deadline 60 s; `withTimeout` no cancela la petición en vuelo), `src/lib/geminiTrouble.ts:25` (0 → `slow`), `src/lib/errors.ts:2-6` (`transient` → «Google está saturado»), `src/screens/Calibration.tsx:576`, `src/screens/Conversation.tsx:290-294`
- **Qué pasa:** sin red, cada intento falla al momento pero se reintenta con esperas (1,5 s, 3 s…) y con el modelo de respaldo; cada intento vuelve a subir el audio en base64. Al final, el test y el plan dicen «Google está saturado ahora mismo» y la hoja de la mascota propone cambiar de modelo, cuando el problema es la red. Con red lenta, `withTimeout` abandona la espera pero la petición sigue viva y el siguiente intento abre otra (llamadas duplicadas facturables).
- **Por qué importa:** diagnóstico erróneo (el usuario cambia de modelo o de clave sin motivo), espera larga en «Pensando…» y datos/coste por resubidas.
- **Cómo reproducir:** modo avión → turno de clase hablado; medir el tiempo hasta el error y leer el mensaje; con un proxy, contar peticiones (B4/B7).
- **Esperado:** detectar «sin conexión» al primer fallo de transporte y decirlo; no reintentar sin red.
- **Obtenido (previsto):** ~60 s de espera, mensaje de saturación, hoja «Gemini va lento».
- **Evidencia:** lectura de código.
- **Propuesta de corrección:** tratar el fallo de transporte aparte (o comprobar `@capacitor/network`) y separar el mensaje.
- **Relacionado con:** E2E-040, E2E-041, B7.

### AUD-FLU-213 · Preparar la clase puede tardar ~2,5 min sin botón de salir visible y con el micro ya abierto

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/screens/Conversation.tsx:305-311` (`rec.open()` antes de nada), `:343-368` (tema con búsqueda, `topics.ts:172` 25 s; saludo, deadline 60 s), `:632-646` y `src/components/PrepareScreen.tsx:154-163` (botones solo en estado `error`)
- **Qué pasa:** al entrar en una clase se abre el micrófono y se muestra «Preparando la clase» mientras se generan el tema (búsqueda en Google) y el saludo. En estado `loading` la pantalla no tiene botón de volver; solo se sale con el atrás de Android (que sí llama a `leave`). Con red lenta pueden ser 25 s + 60 s + 60 s, todo con el indicador verde del micrófono encendido sin grabar.
- **Por qué importa:** con navegación por gestos o sin conocer el atrás, el usuario espera atrapado; micrófono abierto sin necesidad (ALTA según §6 si B3 mide un periodo largo).
- **Cómo reproducir:** red lenta (mock con retraso) → Inicio → un tema → observar la pantalla de preparación y el indicador de micro.
- **Esperado:** botón «Volver» también durante la carga; abrir el micro al terminar la preparación.
- **Obtenido (previsto):** sin botón; micro abierto desde el primer instante.
- **Evidencia:** lectura de código.
- **Propuesta de corrección:** pasar `onBack={leave}` también en `loading` y retrasar `rec.open()` hasta `setPrep(null)`.
- **Relacionado con:** NC-14, B3, E2E-010.

### AUD-FLU-214 · Varias pantallas siguen «grabando» en la interfaz al volver de segundo plano, con el micro ya cerrado

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/lib/lifecycle.ts:28-40` (`releaseAllMics`), `src/lib/recorder.ts:243-253` (`close` deja `recorder = null`), `:218-223` (`stop` sin grabador → `seconds: 0`); estados de UI: `Calibration.tsx:289,322-326` (`recState`), `ReviewScreen.tsx:47,73-77` (`step`), `TopicAskPage.tsx:38` (`mic`), `Conversation.tsx:72,148-152` + `TalkButton.tsx:81-115` (`locked`). Ninguna de estas pantallas se suscribe a `whenBackground` para su estado (la clase solo para `persist`).
- **Qué pasa:** al ir a segundo plano el micro se cierra (bien, NC-14), pero la pantalla no se entera: al volver sigue diciendo «Te escucha…»/«12 s · toca para terminar» con el cronómetro corriendo. Lo que diga el usuario no se graba; al parar, `stop()` devuelve 0 s y sale «Necesito oírte un poco más»/«Mantén el botón…». En la clase con grabación bloqueada (deslizar arriba) se pierde la respuesta entera.
- **Por qué importa:** estado inconsistente: el alumno habla al vacío (también en la tarea del habla del test) y recibe un mensaje que lo culpa.
- **Cómo reproducir:** test → tarea de habla → grabar → botón de inicio de Android → volver → hablar 20 s → parar.
- **Esperado:** al volver, la pantalla pasa a reposo y explica que la grabación se cortó.
- **Obtenido (previsto):** cronómetro en marcha y luego aviso de que no se oyó.
- **Evidencia:** lectura de código.
- **Propuesta de corrección:** emitir un evento «micro liberado» (o `whenBackground` en cada pantalla) para reiniciar su estado.
- **Relacionado con:** NC-14, B3, E2E-012, E2E-025.

### AUD-FLU-215 · Una respuesta que llega con la app en segundo plano o fuera de la pantalla puede hacer hablar al profe

- **Severidad:** MEDIA
- **Estado:** HIPÓTESIS (depende de si el WebView ejecuta callbacks del puente con `pauseTimers`)
- **Probado en:** estático
- **Dónde:** `src/screens/Conversation.tsx:268-278` (tras `teacherTurn` → `say(res.reply)`; `gone()` solo mira el abort de salir), `src/lib/lifecycle.ts:32` (solo calla la voz en el instante de pasar a segundo plano), `src/screens/Calibration.tsx:401-409` (`playScript` sigue con la línea siguiente cuando `stopSpeaking` resuelve la actual), `src/screens/ReviewScreen.tsx:136-144` (tras `evaluateDrill` → `speak`, sin comprobar si sigue montada), `android/.../MainActivity.java` (`onStop` → `pauseTimers`)
- **Qué pasa:** la voz se calla una vez, al pasar a segundo plano; nada impide que después una promesa pendiente llame a `speak`. En clase, si minimizas en «Pensando…», la respuesta llega (CapacitorHttp es nativo) y se habla. En la audición del test, el bucle empieza la línea siguiente y esa escucha ya contó como una de las 3 con nota. En el repaso, tras salir con la flecha se dice la respuesta en el Inicio.
- **Por qué importa:** audio con la pantalla apagada o en otra app, una escucha puntuada perdida, batería (NC-14).
- **Cómo reproducir:** clase → hablar → soltar → en «Pensando…» pulsar inicio; esperar. Test → audio 1 → escuchar → inicio. Repaso → grabar → en «comprobando» pulsar la flecha atrás.
- **Esperado:** silencio en segundo plano y fuera de la pantalla; la escucha interrumpida no cuenta.
- **Obtenido (previsto):** posible voz en segundo plano; escucha gastada.
- **Evidencia:** lectura de código.
- **Propuesta de corrección:** en `say`/`playScript`, comprobar un flag de `lifecycle` antes de cada `speak`; invalidar `playToken` en `whenBackground`; en `ReviewScreen`, un `AbortController` como en la clase.
- **Relacionado con:** NC-14, B3/B7, E2E-015, E2E-023, E2E-031.

### AUD-FLU-216 · El plan se regenera solo en cada visita al Inicio tras un error, y Plan/Inicio pueden pedir la misma semana a la vez

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/components/PlanCard.tsx:62-70` (auto `create`/`prepareWeek` en cada montaje si `!error`), `src/screens/PlanScreen.tsx:48-56` (auto `ensureWeekLessons`), `src/App.tsx:356-359` (`adaptPlanAfterTest` en paralelo tras el re-test)
- **Qué pasa:** el error de `PlanCard` vive en su estado local; cada vuelta al Inicio (tras una clase, al cambiar de pestaña) lo remonta y relanza la generación (deadline 90 s, hasta 5 intentos). Si se abre «Mi plan» mientras `PlanCard` genera, `PlanScreen` lanza otra `ensureWeekLessons` de la misma semana; tras un re-test, `adaptPlanAfterTest` también reescribe el plan. Gana la última escritura.
- **Por qué importa:** llamadas a Gemini no pedidas (cuota) y plan sobrescrito por una respuesta más antigua.
- **Cómo reproducir:** mock 503 para `createPlan` → Inicio → Palabras → Inicio (contar en `habla.netlog`). Abrir «Mi plan» durante «Preparando las lecciones…».
- **Esperado:** un único trabajo de plan en curso; reintento manual tras un error.
- **Obtenido (previsto):** varias generaciones.
- **Evidencia:** lectura de código.
- **Propuesta de corrección:** mover el estado «generando/error» del plan a un módulo compartido con una sola promesa en curso.
- **Relacionado con:** E2E-036.

### AUD-FLU-217 · Los recordatorios diarios se acaban a los 7 días si no se abre la app

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/lib/reminders.ts:7-11,84-112` (7 avisos sueltos que solo se reprograman al abrir la app)
- **Qué pasa:** se programan 7 notificaciones; si el alumno no abre Habla en una semana, deja de recibir el recordatorio justo cuando más falta hace. Además `syncReminders` no hace nada sin permiso (`:85`) y en este teléfono `POST_NOTIFICATIONS` está denegado (línea base §3): el ajuste puede verse «activado» sin avisos reales (Ajustes sí lo detecta en `SettingsScreen.tsx:446`).
- **Por qué importa:** la función de no romper la racha (BACKLOG D) se apaga sola sin avisar.
- **Cómo reproducir:** activar el recordatorio, no abrir la app 8 días (o adelantar el reloj); ver `dumpsys alarm`/notificaciones.
- **Esperado:** avisos indefinidos (o un último aviso explícito).
- **Obtenido (previsto):** silencio desde el día 8.
- **Evidencia:** lectura de código.
- **Propuesta de corrección:** añadir un aviso de reserva repetitivo, o explicar el límite.
- **Relacionado con:** línea base §3, E2E-038.

### AUD-FLU-218 · La clase retomada no conserva el audio pendiente de reenviar, pese a decir «Tu audio está guardado»

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/screens/Conversation.tsx:290-297` (mensaje), `:113,471` (`pending` solo en `useRef`), `src/lib/savedClass.ts:65-78` (no guarda el audio), `Conversation.tsx:382-400` (`persist`)
- **Qué pasa:** tras un fallo transitorio, la clase dice «Tu audio está guardado: no hace falta repetirlo» y ofrece «Reenviar mi audio». Ese audio solo vive en memoria: si el usuario sale con atrás (la clase se guarda) o Android cierra la app, al retomar ya no está y no se avisa.
- **Por qué importa:** expectativa falsa; hay que repetir una respuesta que se creía guardada.
- **Cómo reproducir:** mock 503 en `generateContent` → hablar → ver el error → atrás → Continuar clase.
- **Esperado:** «Reenviar» sigue disponible, o el texto dice «mientras no salgas de la clase».
- **Obtenido (previsto):** sin reenviar; nada lo indica.
- **Evidencia:** lectura de código.
- **Propuesta de corrección:** ajustar el texto (preferible por privacidad) o guardar el audio pendiente con la clase.
- **Relacionado con:** NC-16, E2E-016.

### AUD-FLU-219 · Tras importar una copia, la clase guardada (y el borrador del test) pueden cruzarse con otra sesión

- **Severidad:** BAJA
- **Estado:** HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/lib/savedClass.ts:82-93` (solo valida que exista una sesión con ese `sessionId` y sin `endedAt`), `src/lib/backup.ts:80-100` (importar sustituye las tablas pero no toca `habla.savedClass` ni `habla-draft`), `src/screens/SettingsScreen.tsx:824`, `src/App.tsx:180-186`
- **Qué pasa:** `habla.savedClass` guarda el `sessionId` numérico y el historial. Tras importar una copia, puede existir una sesión **distinta** con el mismo id sin terminar; se ofrecería «Continuar mi clase» mezclando el prompt y el historial guardados con los turnos importados (`Conversation.tsx:329`).
- **Por qué importa:** datos de clase mezclados; informe y métricas incoherentes.
- **Cómo reproducir:** dejar una clase guardada (id N); importar una copia donde la sesión N exista sin `endedAt`; reabrir la app.
- **Esperado:** importar descarta la clase guardada y el borrador del test.
- **Obtenido (previsto):** se ofrece continuarla con datos cruzados.
- **Evidencia:** lectura de código.
- **Propuesta de corrección:** `clearSavedClass()` y `clearDraft()` dentro de `importBackup`.
- **Relacionado con:** AUD-FLU-200, E2E-039.

### AUD-FLU-220 · (INFO) Lo que está bien en los flujos

- **Severidad:** INFO
- **Estado:** HIPÓTESIS (lectura de código; confirmar en E2E)
- **Probado en:** estático
- **Dónde:** varios
- **Qué pasa:** se confirma por código: (1) salir de la clase con atrás o con la flecha guarda la clase y borra las sesiones vacías (`Conversation.tsx:406-421`); (2) «Terminar» borra la clase guardada y cierra la sesión con informe (`:545-572`); (3) cada salida de pantalla que graba cierra su `Recorder` en la limpieza (`Conversation.tsx:373-379`, `Calibration.tsx:314-319`, `ReviewScreen.tsx:61-65`, `TopicAskPage.tsx:41`); (4) la clase se aborta al desmontar (`AbortController`, `:122-127`), sin reintentos ni voz posteriores **por salir**; (5) el tutorial comprueba la clave antes de guardarla (`Onboarding.tsx:69-84`); (6) la evaluación del test guarda borrador antes de llamar a Gemini (`Calibration.tsx:546-565`); (7) `TalkButton` envía solo al llegar al máximo con Azure (`TalkButton.tsx:62-77`); (8) la audición respeta el máximo de 3 escuchas con nota y confirma la 3.ª (`Calibration.tsx:417-433`).
- **Por qué importa:** delimita lo que no hace falta rehacer.
- **Relacionado con:** NC-14, NC-15, NC-16, NC-01.

---

## Hipótesis para fase dinámica

Cada hipótesis va a un bot concreto, con la prueba que la confirmaría o refutaría. Las que ya son hallazgos llevan su ID.

### Para B3 (micrófono)

| ID | Hipótesis | Dónde | Prueba que la confirmaría |
|---|---|---|---|
| H-B2-301 | Si la app pasa a segundo plano **mientras** `Recorder.open()` espera a `getUserMedia`, `releaseAllMics()` no ve ese grabador (aún no está en `recorders`); al resolverse, el stream queda abierto con la app en segundo plano. Igual en `fallback()` (bucle de `getUserMedia`). | `recorder.ts:118-130,157-171`, `lifecycle.ts:28-31` | Entrar en una clase y pulsar inicio en < 1 s (o con auriculares BT, durante los 5 s de `hasSignal`); `dumpsys media.audio_policy` a los 5 y 30 s: no debe haber grabación de Habla. Repetir en el test (tocar grabar e ir a inicio). |
| H-B2-302 | El micro de la clase está abierto (indicador verde) desde que se entra, durante la preparación (hasta ~2,5 min), la voz del profe y «Pensando…», y solo se cierra al salir/terminar. | `Conversation.tsx:311,376,408,550` · AUD-FLU-213 | Cronometrar el indicador verde y `dumpsys audio_policy` en una clase de 3 turnos sin hablar; anotar el tiempo con micro abierto sin grabar. |
| H-B2-303 | En el repaso, tras la primera grabación el micro **no** se cierra al parar: sigue abierto en «comprobando» y «resultado» hasta salir del repaso. | `ReviewScreen.tsx:117,128` (solo `close` en la limpieza `:63`) | Repaso → grabar 1 frase → parar → esperar en el resultado 60 s; comprobar indicador/`dumpsys`. |
| H-B2-304 | En el test, el micro queda abierto entre las tareas de habla (incluido «Un momento…» de hasta 25 s) y solo se cierra en `finish()`. | `Calibration.tsx:495,508,547` | Tarea 1 → grabar → parar → quedarse 60 s en la tarea 1 sin tocar nada; comprobar indicador. |
| H-B2-305 | Las grabaciones por toque (test, repaso, dictado, y la bloqueada de la clase sin Azure) no tienen límite de duración: si el usuario se olvida, graba indefinidamente con la app delante. | `Calibration.tsx:490-505`, `ReviewScreen.tsx:112-125`, `TopicAskPage.tsx:45-56`, `TalkButton.tsx:62-77` (límite solo con Azure) | Empezar a grabar y no tocar nada 5 min con la pantalla encendida; ver tamaño del audio enviado y que el micro sigue grabando. |
| H-B2-306 | Estado de UI «grabando» al volver de segundo plano con el micro cerrado. | AUD-FLU-214 | Pasos del hallazgo en test, repaso, dictado y clase bloqueada. |
| H-B2-307 | Al girar el teléfono en mitad de una grabación no se reinicia la pantalla (`configChanges`) y la grabación sigue; con orientación forzada (`OrientationPlugin`) tampoco se pierde. | `docs/NC-v5.7.md` NC-12, NC-26 | Grabar en clase/test y girar; comprobar que el audio llega entero y el micro no queda duplicado (`dumpsys`). |

### Para B4 (fugas)

| ID | Hipótesis | Dónde | Prueba que la confirmaría |
|---|---|---|---|
| H-B2-401 | Tras un re-test cuya evaluación falló, los audios del habla (base64) quedan indefinidamente en IndexedDB `habla-draft` (AUD-FLU-204). | `testDraft.ts`, `Calibration.tsx:546-565` | Vía CDP: `indexedDB.open('habla-draft')` → tamaño del valor `calibration` (no volcar su contenido) tras forzar el fallo y volver al Inicio. |
| H-B2-402 | Exportar copia deja un JSON con transcripciones y perfil en `Documents/Habla` (almacenamiento compartido) y otro en `cache/` sin borrar. | `backup.ts:44-71` | `adb shell ls -l /sdcard/Documents/Habla` (solo nombres y tamaños; sin `run-as`, prohibido por la regla 4). El archivo de `cache/` solo se puede inferir por código. |
| H-B2-403 | Sin red o con red lenta, cada turno hablado sube el audio hasta 5 veces (y con `withTimeout`, en paralelo). | `gemini.ts:271-337` · AUD-FLU-212 | Proxy/mock: contar POST `generateContent` y bytes por un turno con 503 y con retraso de 70 s. |
| H-B2-404 | La entrada `what` del *netlog* (50 primeros caracteres de la instrucción de sistema) no contiene el nombre ni datos del perfil. | `gemini.ts:500-506`, `teacher.ts` (`buildSystemPrompt`) | CDP: leer `habla.netlog` y comprobar solo el campo `what` de las entradas de clase. |
| H-B2-405 | «Guardar el resumen» del test escribe en `Documents/Habla` y abre Compartir con el resumen (nivel, respuestas). | `docs/NC-v5.7-ajustes.md` NC-23, `SettingsScreen.tsx` | Listar `Documents/Habla` tras guardarlo (solo nombres). |

### Para B5 (seguridad)

| ID | Hipótesis | Dónde | Prueba que la confirmaría |
|---|---|---|---|
| H-B2-501 | La gracia de 60 s de `confirmIdentity` es global: confirmar para ver la clave de Gemini permite ver la de Azure y el secreto del *service principal* sin volver a pedir el patrón (y al revés). | `deviceAuth.ts:14-25`, `AzureSettings.tsx:19-31` | Confirmar el ojo de Gemini y, en < 60 s, tocar el ojo de Azure/secreto: ¿pide patrón? |
| H-B2-502 | Rutas para cambiar la clave sin patrón: `GeminiFix` en la hoja de problemas y en el error del test; «Ver la bienvenida otra vez» (`onboarded: false`) no debería mostrar ni permitir cambiar la clave. | `GeminiFix.tsx:50-62`, `SettingsScreen.tsx:89`, `Onboarding.tsx:61` | Recorrer cada ruta y comprobar que siempre se pide el bloqueo al cambiar una clave existente. |
| H-B2-503 | Cancelar o fallar el diálogo del sistema deja la clave oculta (no hay paso por error del plugin). | `deviceAuth.ts:27-33` | Cancelar el diálogo; atrás durante el diálogo; teléfono sin bloqueo (`insecure`). |
| H-B2-504 | Textos de protección de la clave más fuertes que la realidad (AUD-FLU-211). | — | Revisión documental con D-02. |

### Para B6 (end-to-end)

Lista completa en `casos-e2e.md` (E2E-001…E2E-041). Prioridad P1: E2E-001, 002, 003, 004, 010, 011, 012, 013, 014, 015, 020, 021, 022, 024, 030, 033, 040. Hallazgos a confirmar: AUD-FLU-200, 201, 202, 206, 207, 209, 213, 218.

### Para B7 (resiliencia, rendimiento, batería)

| ID | Hipótesis | Dónde | Prueba que la confirmaría |
|---|---|---|---|
| H-B2-701 | Matar la app en mitad del test pierde todo (AUD-FLU-203) y, en re-test, vuelve al Inicio. | `Calibration.tsx` | `am kill com.…habla` con la app en segundo plano tras la gramática; reabrir. |
| H-B2-702 | Voz del profe o del audio del test en segundo plano tras una respuesta tardía (AUD-FLU-215). | `Conversation.tsx:268-278`, `Calibration.tsx:401-409` | Mock con retraso de 8 s; pulsar inicio en «Pensando…»; `dumpsys audio` (players activos) y escuchar. |
| H-B2-703 | Sin red: ~60 s hasta el error y mensaje de saturación (AUD-FLU-212). | `gemini.ts` | Modo avión; cronometrar turno, test (evaluación) y plan. |
| H-B2-704 | Si `loadSettings`, `getProfile`, `loadDashboard` o `getSavedClass` fallan al arrancar, `Promise.all` sin `catch` deja la app en blanco para siempre (`return null`). | `App.tsx:131-153,261` | En navegador, forzar un fallo de Dexie (p. ej. bloquear IndexedDB o versión superior abierta en otra pestaña) y abrir la app. |
| H-B2-705 | Generaciones repetidas del plan tras un error (AUD-FLU-216). | `PlanCard.tsx:62-70` | Mock 503 en `createPlan`; navegar Inicio↔Palabras 5 veces; contar entradas en `habla.netlog`. |
| H-B2-706 | `endSplash` usa `streak`/`homework` del cierre: si la bienvenida termina antes de que cargue el panel, el aviso de tarea o de compañeros no sale. Poco probable (la bienvenida dura ≥ 3 s), pero en teléfonos lentos sí. | `App.tsx:160-177` | Ralentizar IndexedDB (CPU ×6 en CDP) y ver si `NoticeGate` muestra «Tu tarea de hoy». |
