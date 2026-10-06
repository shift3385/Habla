# Decisiones técnicas

Registro de las decisiones que **no se deducen leyendo el código**: por qué se hizo así, qué se descartó y qué cuidados implica. Ordenadas por tema, con la versión en que se tomaron cuando se conoce.

## Plataforma y distribución

- **App web + Capacitor en lugar de Android nativo.** El dueño no quería instalar Android Studio, y una base web permite probar casi todo en el navegador (`npm run dev`). Las piezas que el WebView no puede hacer se resuelven con plugins Java propios y pequeños (audio Bluetooth, huella o PIN, orientación).
- **APK de depuración distribuido a mano** (sin Play Store). Para una persona y su entorno basta. *Contrapartida:* el APK es depurable y un PC con la depuración USB autorizada puede leer sus datos (ver `problemas-conocidos.md`). Publicar en Play Store o compilar en *release* queda para cuando la app se abra a más gente (6.0).
- **Firma fija (`keystore/habla.jks`).** Todos los APK se firman igual para que se puedan instalar encima sin perder datos. Nunca se regenera.
- **`version.json` como única fuente de versión.** La leen Gradle y la pantalla Acerca de, para evitar desajustes. El APK se llama `Habla-v<versión>.apk` y se copia a `apk/` porque el dueño los guarda por versión.
- **Compilación de Gradle con `--offline`.** El internet del PC es muy lento (0,1–0,3 MB/s) y Gradle se colgaba descargando. `android/variables.gradle` fija `kotlin_version = '2.2.20'`, que ya está en caché. *Implicación:* evitar plugins nativos nuevos que obliguen a descargar dependencias; por eso los enlaces externos usan `<a href>` (Capacitor los abre fuera) en lugar de instalar `@capacitor/browser`.

## IA

- **Solo Gemini como cerebro del profe** (desde el 2026-09-28). Al principio se usaba Claude + Whisper; se migró porque el dueño solo tenía clave de Gemini. Gemini acepta **audio en línea**, así que **una sola llamada** transcribe, corrige y responde: menos latencia y menos coste.
- **Las pausas y el tiempo de habla se calculan en el teléfono** (`speech.ts`): es gratis y no depende del modelo.
- **Clave propia de cada usuario** en lugar de un backend. No hay servidor que mantener ni pagar. *Contrapartida:* para alguien no técnico es una barrera. Se mitigó en la 5.8 con el **tutorial de la mascota**, que explica qué es la clave y cómo conseguirla gratis, y con un aviso único para quien ya la había puesto sin explicación.
- **Modelo de respaldo y memoria de cuota.** Si un modelo da 429 o 503, se pasa al de respaldo al instante y no se vuelve a probar hasta que Google renueve la cuota (`habla.quota`). Además, la **hoja de problemas** (5.6) hace que la mascota proponga otro modelo u otra clave. Se creó tras un fallo de saturación en el teléfono de la madre del dueño a mitad del test.
- **Lista de modelos dinámica**, mezclada con modelos conocidos y con la opción de escribir el nombre exacto. Los nombres de modelo cambian a menudo; nunca se depende de una lista fija.
- **Multi-proveedor (Claude, OpenAI, DeepSeek…): propuesto, no implementado.** El obstáculo es el audio: Claude y DeepSeek no aceptan audio de entrada, así que habría que separar el «oído» (transcripción: Gemini, Azure STT o el reconocedor de Android) del «profe» (cualquier modelo de texto). Las noticias con Google Search son exclusivas de Gemini. Orden propuesto: tutorial (ya hecho) → separar oído y profe → Claude/OpenAI → DeepSeek.

## Test de nivel (v5.6)

- **Banco de ítems offline** (`src/bank/`, 450 ítems, el «~25 %» aprobado de los ~1800 del estudio del dueño) en lugar de generar preguntas con Gemini. Así el test es reproducible, gratis y no depende de la red. Gemini **solo evalúa el habla**, con rúbrica de 4 criterios, temperatura 0 y mediana. El banco debe pasar `scripts/validate-bank.mjs`.
- **Política de niveles del dueño (no negociable):**
  - el primer test fija el nivel y nunca se presenta como una transición desde el B1 de partida;
  - **las lecciones solo proponen** (trayectoria);
  - **solo el re-test** (cada 4 semanas) cambia el nivel: **70 % test + 30 % trayectoria** por habilidad;
  - el nivel no se puede editar a mano.
- **Recalibración (5.6):** si el último test es de antes del banco, se puede repetir ya y el nuevo sustituye al anterior. La mascota lo recuerda en cada apertura, sin opción de «mañana».
- **Borradores del test:**
  - **5.6 — test terminado sin evaluar:** `calibration` en `habla-draft`. Así un fallo de Gemini no obliga a repetir el test.
  - **5.8 — test a medias:** `progress`, guardado en cada punto seguro: cada respuesta de gramática, cada resumen y cada tarea de habla. Al abrir se retoma. Nació porque la madre del dueño se quedó atascada en horizontal en la tarea 2 de 3 y su progreso solo estaba en memoria; se rescató leyendo el estado de React por CDP.
  - Se usa **IndexedDB sin Dexie**, aparte del esquema principal, para no tocar las migraciones de Dexie.
  - **No se guarda a mitad de un texto o audio de lectura o escucha:** el punto de retomar es el último resumen. Restaurar el ítem en curso exigía mucho más estado.

## Fonética con Azure (v5.8)

- **Azure Pronunciation Assessment en paralelo a Gemini.** Gemini entiende lo que quisiste decir aunque lo pronuncies mal, así que casi nunca corrige la pronunciación. Azure puntúa por palabra y por fonema.
- **REST de audio corto en lugar del SDK.** No hay SDK fácil para el WebView; la REST funciona con CapacitorHttp (`dataType: 'file'` con base64, Android lo decodifica). *Límite:* **60 s por audio**. Por eso, con la fonética activa, la grabación tiene un tope de 60 s con cuenta atrás (naranja en los últimos 10 s) y envío automático. Grabar 3 minutos no es posible con esta API.
- **El WebView solo graba WebM/Opus** (`MediaRecorder`). Azure REST no lo acepta, así que se convierte en el teléfono a WAV PCM 16 kHz mono (`AudioContext.decodeAudioData` → `OfflineAudioContext`). Tarda ~35–50 ms; no merece la pena otra vía.
- **Evaluar sin referencia y, si no coincide, con la transcripción de Gemini como referencia** (decidido tras pruebas con voz A2 simulada). Sin referencia, Azure puntúa lo que *cree* oír: «jesterday» salía como «just stared» (y aconsejaba cuidar «stared»), y «jears» como «jeers» bien dicha. Con la referencia de Gemini, lo que el alumno quería decir, los errores salen donde tocan. Las **cifras de la referencia se pasan a palabras** («20» → «twenty»): Azure alineaba mal «20».
- **Escala de la frase del coach:** ≥ 90 «muy buena», ≥ 80 «buena», ≥ 60 «se te entiende, pero hay sonidos por pulir». La escala anterior (≥ 70 «buena») era demasiado amable con un A2 con errores claros.
- **Plan F0 (gratis, 5 h al mes) como referencia.** Al arrancar se comprueba: si quedan horas, la fonética se activa sola, salvo que el usuario la haya apagado (`phoneticsUserOff`). Si Azure responde «cuota excedida» (1007, o 403/429 con «quota»), se apaga hasta el mes siguiente (UTC), se sigue con Gemini y la mascota avisa **una vez al mes** con las tarifas de pago. Un 429 sin «quota» es solo «demasiadas peticiones» y se reintenta. El selector de plan **solo refleja** el plan del recurso: la app no lo cambia.
- **Consumo vía Azure Monitor con service principal** (opcional): es la única forma de leer las horas usadas desde la app. El dato es aproximado y se guarda en caché 10 minutos.
- **Al guardar la clave de Azure, la fonética se enciende al momento.** Antes solo se activaba al reabrir la app, y la primera clase del dueño fue solo con Gemini sin que nada lo indicara (descubierto en el teléfono: 0 de 12 turnos con nota).

## Seguridad de las claves

- **Ver o cambiar una clave pide el patrón, PIN o huella del teléfono** (`DeviceAuthPlugin`), con 60 s de gracia. Se eligió reutilizar el bloqueo del sistema en lugar de un PIN propio. Si el teléfono no tiene bloqueo, se deja pasar.
- **Las claves no van en las copias:** ni en el JSON exportado ni en las copias automáticas de Android.
- **`loggingBehavior: 'none'` (5.8):** en builds de depuración, el puente de Capacitor imprimía en logcat el resultado de cada plugin, incluido el JSON de ajustes con las claves y las cabeceras HTTP. Se descubrió al depurar Azure. Se desactivó y se recomendó al dueño regenerar sus claves. *Efecto secundario:* las líneas de diagnóstico `[HABLA-NET]` ya no llegan a logcat (siguen en Ajustes → Modelos → Diagnóstico).

## Interfaz y experiencia

- **Diseño de Claude Design** (v3.0, rediseño V4 en 5.1): 4 temas (ember, lumi, marea, nimbo) con una **mascota animada** cada uno (Chispa, Musgo, Gota, Brisa) que sustituye a la antigua burbuja. El tema `aurora` se retiró y `normalizeTheme` lo convierte en `marea`. Las pantallas nuevas deben seguir ese lenguaje visual.
- **La mascota explica las cosas** (petición explícita del dueño): pantallas antes del test y del re-test, resultados, avisos antes del Inicio (`NoticeGate`), globos del Inicio, tutorial de la bienvenida, alerta de Azure.
- **Avisos antes del Inicio, a pantalla completa y de uno en uno** (`NoticeGate`), para que el Inicio no se llene de tarjetas.
- **Inicio sin scroll**: todo cabe en la pantalla. Las listas largas (Progreso, Palabras) van en `InfiniteList`: un panel del alto visible con carga de 20 en 20.
- **Globos de la mascota en el Inicio (5.8):**
  - avisos (clase a medias, lección, meta, repaso, racha, test desde 7 días antes) y consejos de uso, intercalados; los consejos siguen por donde se quedaron (`habla.adviceCursor`);
  - **tiempos pedidos por el dueño:** el primer globo a los 5–9 s, cada uno se queda 9–20 s según lo que se tarda en leerlo (nunca más de 30), y entre uno y otro pasan 40–75 s. Un primer intento con 1,5 s / 9 s / 8 s se consideró que bombardeaba;
  - la acción va **dentro del globo como botón con texto** («Seguir la clase»…). Una flecha a la derecha del globo quedaba junto al botón «Sorpréndeme» y confundía;
  - los globos flotan encima de la tarjeta de la mascota, sin ocupar espacio. Si no caben junto a Sorpréndeme (Ember, Lumi), usan todo el ancho y lo tapan mientras se ven;
  - avisos y consejos se activan por separado en Ajustes → Tema y mascota.
- **Burbujas de ayuda teñidas con el tema** (`.tip-bubble`, `color-mix`) en vez de negras. Las burbujas **se ocultan, no se desmontan** (el dueño lo pidió para no crear y destruir componentes).
- **Orientación forzada y escalado** (5.7): para el Galaxy A11 de la madre (pantalla rota) y pantallas de 320×640. En horizontal, las pestañas pasan a una barra lateral.
- **Recordatorio diario como 7 avisos sueltos** (ids 10–16) en vez de uno repetido: el plugin no repite a hora fija combinando `at` y `every`, y así el texto lleva la lección del día y se salta el día ya hecho. Desde la 5.8 lleva la imagen de la mascota (`res/drawable-nodpi/mascot_*.png`, generados del SVG de cada mascota) y el icono `ic_stat_habla`, y usa **`USE_EXACT_ALARM`**: en Android 14+, `SCHEDULE_EXACT_ALARM` viene denegado y el plugin abría la pantalla «Alarmas y recordatorios» en cada reprogramación.
- **Batería (5.7):** en segundo plano se paran el micrófono, la voz y las animaciones (`lifecycle.ts`). Verificado con `dumpsys`.

## Proceso de trabajo con el dueño

- **Se trabaja por versiones con un commit por entrega**, y se recompila la misma versión cuando el dueño lo pide («rebuild» de la 5.7, varias compilaciones de la 5.8). Desde el 2026-10-06 se sigue el versionado semántico (5.8.1, 5.8.2, 5.9).
- **Probar antes de compilar y dar evidencias:** el dueño pide pruebas en local y en su teléfono antes de cada entrega, y capturas y medidas cuando se afirma algo.
- **Los informes de QA** se escriben como un *Senior QA*: veredicto primero, defectos por severidad y prioridad, cobertura y plan de corrección.
