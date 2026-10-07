# Habla v5.8 (build 33, commits `6874443` → `16e6240`) — Informe de auditoría QA

**Fecha:** 2026-10-05 / 2026-10-06 · **Equipo:** B0–B8 + orquestador · **Teléfono real:** sí, POCO 23122PCD1G, Android 16 (HyperOS), APK debuggable · **Llamadas reales a IA:** 6 de 10 autorizadas (B4: 1 Gemini; B6: 4 Gemini + 1 Azure Speech; B8: 0) · **Rol del informe:** Senior QA, auditoría de caja blanca y de caja negra.

---

## 1. Veredicto de salida

| Decisión | Veredicto |
|---|---|
| **Distribuir v5.8 a otras personas** (objetivo del BACKLOG: «que la app sirva para cualquier persona») | **NO-GO.** Hay 2 defectos CRÍTICOS de privacidad del micrófono reproducidos en el teléfono real (AUD-MIC-302 y AUD-MIC-301) y 1 ALTO (AUD-MIC-303). El APK que se distribuye es de depuración y las credenciales se pueden extraer por USB (AUD-SEG-001). |
| **Uso diario del dueño** | **GO condicional**, con las precauciones de §1.1. El camino feliz funciona de principio a fin con IA real: transcripción, corrección, voz del profe, fonética de Azure, consultas, guardado y retomar la clase. En segundo plano no hay consumo ni micro abierto (NC-14 se cumple). |
| **Siguiente entrega** | **v5.8.1** (parche «Micrófono seguro»): bloquea cualquier otra entrega hasta cerrar los P0 de §8. |

### 1.1 Precauciones para el dueño mientras no salga v5.8.1
1. No toques dos veces seguidas «Dictar por voz» ni el micro del test o del Repaso. Si ves el **punto verde** de Android fuera de una grabación, cierra Habla desde Recientes: solo `force-stop` libera el micro huérfano.
2. En el Debate, no vuelvas con «Atrás» del paso 2 al 1 mientras dictas.
3. No importes copias de seguridad que no hayas exportado tú: una copia mal formada puede borrar el progreso o dejar la app en negro.
4. Borra los APK antiguos de `apk/` (v3.0–v5.7) y no los instales: registraban las claves en logcat. Plantéate rotar la clave de Gemini si alguno se usó con un PC ajeno.

---

## 2. Resumen para el dueño (lenguaje llano)

- **🎙️ Micrófono, el área más grave.** Hay tres formas reproducidas en tu POCO de que Habla capte audio sin que lo pidas:
  - **Doble toque al dictar** (AUD-MIC-302): queda una grabación fantasma que capta en el Inicio de la app, sigue unos 6 s en segundo plano y vuelve a captar al regresar. Solo la mata forzar el cierre.
  - **Inicio justo al entrar en clase** (AUD-MIC-301): si pulsas Inicio en el medio segundo en que el micro se abre, al volver se reabre solo y queda fuera de control. Es poco probable, pero ocurre.
  - **Debate, «Atrás» durante el dictado** (AUD-MIC-303): sigue grabando sin nada visible y, si terminas el dictado, ese audio se envía a Gemini.
- **Veredicto sobre el micrófono.** Con un uso normal, «Mantener para hablar» graba solo mientras pulsas. Inicio, bloquear la pantalla (también grabando) y forzar el cierre cierran el micro en 1–2 s. Pero **el micro está abierto, con punto verde y en modo llamada, durante toda la clase aunque no hables** (AUD-MIC-305), y en el Repaso y el test entre tarjetas. Es una decisión de diseño que choca con NC-14.
- **🔑 Claves.** Ninguna clave sale del teléfono por la red ni por logcat (verificado con una llamada real). Tampoco hay claves en git, en `dist/` ni en los APK. El riesgo real es local: el APK es de depuración y **cualquier PC con la depuración USB autorizada lee las tres credenciales sin huella** (AUD-SEG-001). La huella solo protege la pantalla.
- **📤 Datos que salen.** Tu nombre, ocupación, motivos e intereses van a Google en **cada turno** y en el plan, y tu voz va a Google y, con la fonética, a Microsoft. **La app no lo dice en ningún sitio** y el tutorial afirma que todo «se guarda solo en este teléfono» (AUD-FLU-210).
- **🔋 Batería.** En segundo plano, 0 % de CPU y ningún *wakelock*, con y sin «ahorro de batería». En primer plano, **el fondo animado y la mascota mantienen 1,7–3 núcleos ocupados sin tocar nada** (AUD-RES-700). Es la causa probable de que se caliente.
- **💾 Datos del alumno.** Importar una copia no se valida: una copia vacía borra el progreso diciendo «Importado ✓», y una mal formada deja la app en negro para siempre (AUD-SEG-501 y AUD-RES-704). Una clave de Gemini nueva y errónea **pisa la buena antes de comprobarla** (AUD-FLU-209).
- **🧭 Flujos.** El re-test no tiene salida una vez empezado (AUD-FLU-202). Un re-test que falla al evaluarse deja un borrador huérfano con tus audios (AUD-FLU-204). El recordatorio falla en silencio si falta el permiso de notificaciones (AUD-FLU-900).

---

## 3. Alcance, entorno y limitaciones

| Elemento | Detalle |
|---|---|
| Código | Commit auditado `6874443`. Durante la fase 2, **otra sesión del dueño** hizo `16e6240` (Calibration.tsx y testDraft.ts: el test se retoma) e instaló un APK nuevo a las 22:13 (AUD-E2E-600). B3–B5 probaron el APK anterior; B6 en parte; B7, B8 y el orquestador, el nuevo. |
| Teléfono | POCO 23122PCD1G, Android 16, `com.shift.habla` v5.8 versionCode 33, **DEBUGGABLE**. Control por CDP (`adb input` bloqueado por Xiaomi). Todos los comandos con `-s 60d0718c`: había un segundo dispositivo, un Samsung SM-A115U, que no se tocó. |
| Configuración del teléfono | B3–B8: Habla con **«Ahorro de batería»** y notificaciones **denegadas**. Desde 2026-10-06 09:50: **«Sin restricciones»** y notificaciones concedidas (repetidas las pruebas sensibles a esto, §4). «Inicio automático» de Xiaomi sigue desactivado. «Accesibilidad con interruptores» activa: Habla volvió sola a primer plano 2 veces (AUD-RES-714). |
| Red | Red falsa en navegador y teléfono salvo las 6 llamadas reales (`llamadas-reales.md`). |
| Navegador | Vite `habla-dev`, orígenes aislados (`b6.`, `b7.`, `b8.localhost:5173`). |
| Datos del dueño | Sin pérdidas. Cambios por uso normal: la clase guardada tiene 2 respuestas más con voz sintética (B6), 2 errores nuevos, 1 nota de Azure, 1 consulta («healthier») y `savedAt` actualizado. Incidencia: B4 creó y borró en el acto una BD `habla-draft` vacía. B6 vació el almacenamiento del navegador en `localhost:5173`, que incluía datos de prueba de la otra sesión (no del teléfono). |
| Calidad de base | `tsc` OK · `oxlint` 0 errores y 6 avisos · `validate-bank` 450 ítems OK · `npm audit` de producción 0 · build OK (chunk único de 1,29 MB) · **0 tests automatizados**. |

---

## 4. Matriz de cobertura

| Área | Estático | Navegador | Teléfono | Sin cubrir (y por qué) |
|---|---|---|---|---|
| Micrófono y audio | ✅ B3, B1 | ✅ B3, B8 | ✅ B3, B8, ORQ: M1–M4b, M5, M6, M9–M12, X1, N2, segundo plano 10 min | Auriculares Bluetooth (M7, AUD-MIC-307, AUD-FUG-405): no había auriculares conectados. Test de nivel en el teléfono (M8/M8b): es obligatorio y con datos reales. |
| Fugas de información | ✅ B4: git, APK, dist, código | ✅ red falsa, 13 destinos | ✅ logcat con llamada real, almacenes, Documents | Copia en la nube (el Backup Manager está desactivado en el POCO). Lo que pasó con versiones anteriores a 5.8 (logcat ya rotado). |
| Seguridad Android/web | ✅ B5 | ✅ inyecciones, CSP, importaciones | ✅ intents, FileProvider, firma, CDP | Diálogo real de huella (no se puede pulsar sin inyectar toques). Si Gemini obedece la inyección de prompt (sin cupo de llamadas). |
| Flujos / E2E | ✅ B2 (8 flujos, 41 casos) | ✅ B6: 16 P1 + P2/P3 | ✅ B6: camino feliz con IA real | E2E-034 (huella), 006, 016, 019, 023, 025–032, 038. Onboarding, re-test e importar en el teléfono (destructivos: probados solo en navegador). |
| Resiliencia, rendimiento y batería | ✅ B1 | ✅ B7: red lenta o sin red, 50 turnos, 1 año de datos | ✅ B7: CPU por pantalla, arranque en frío, segundo plano; ORQ: segundo plano sin restricciones | Consumo en mAh (`batterystats --reset` denegado y el teléfono cargando). Pantalla apagada larga. Cambio de hora o zona horaria. Recordatorio a los 7 días. |
| Notificaciones | ✅ ORQ | — | ✅ aviso de prueba recibido con el teléfono bloqueado | Aviso diario real con la app cerrada horas e inicio automático desactivado. |
| Verificación independiente | — | ✅ B8 | ✅ B8 | 21 puntos más 3 escenarios nuevos: 17 reproducidos, 4 parciales, 0 descartados. |

---

## 5. Defectos por severidad y prioridad

**Prioridad:** **P0** = bloquea la siguiente entrega · **P1** = siguiente entrega · **P2** = próximas versiones · **P3** = cuando convenga.
**Repro:** cuántas veces se reprodujo. **T** = teléfono, **N** = navegador, **E** = estático.

### 5.1 CRÍTICA

| ID (consolida) | Título | Prio. | Estado | Repro | Dónde | Bots |
|---|---|---|---|---|---|---|
| **AUD-MIC-302** (+ARQ-100, H-B2-302) | Dos aperturas simultáneas del micro (doble toque) dejan un stream y un `MediaRecorder` huérfanos que captan en la app, siguen ~6 s en segundo plano y recapturan al volver | **P0** | CONFIRMADO | T 2/2 (B3, B8) + N | `recorder.ts:118-129`, `TopicAskPage.tsx:50-51`, `Calibration.tsx:495`, `ReviewScreen.tsx:117` | B1, B3, B8 (sube de ALTA) |
| **AUD-MIC-301** (+H-B2-301, H-B3-2) | `open()` no se puede cancelar: Inicio durante la apertura → `fallback()` reabre el micro sin pulsación, fuera de `recorders`; capta en segundo plano | **P0** | CONFIRMADO | T 2/4 (ventana ~0,5 s; AUD-MIC-800 la amplía) | `recorder.ts:118-174` | B1, B2, B3, B8 |

### 5.2 ALTA

| ID (consolida) | Título | Prio. | Estado | Repro | Dónde | Bots |
|---|---|---|---|---|---|---|
| **AUD-MIC-303** | Debate: «Atrás» del paso 2 al 1 deja grabando con punto verde (45 s) y ese audio se envía a Gemini al terminar | **P0** | CONFIRMADO | T 2/2 | `TopicAskPage.tsx:41,60-61,120` | B3, B8 |
| **AUD-MIC-305** (+FLU-213, E2E-010) | Micro abierto, con punto verde y en `MODE_IN_COMMUNICATION`, toda la clase en reposo, en la preparación (sin botón de salir, hasta ~2,5 min) y entre tarjetas del Repaso o tareas del test | **P1** | CONFIRMADO (diseño) | T: 3 min (B3), 85 s (B8) | `Conversation.tsx:311`, `ReviewScreen.tsx:63`, `Calibration.tsx:316` | B2, B3, B6, B8 |
| **AUD-SEG-001** (+FUG-404, ARQ-109, H-B5-1) | El APK distribuido es debuggable: por `run-as` o CDP se leen sin huella la clave de Gemini, las de Azure, el secreto del *service principal* y la clase guardada (prompt con el perfil e historial) | **P1** | CONFIRMADO | T (B8: solo longitudes) | `package.json` (`apk` = `assembleDebug`), `settings.ts`, `CapacitorStorage.xml` | B0, B4, B5, B8 |

### 5.3 MEDIA

| ID (consolida) | Título | Prio. | Estado | Probado | Bots |
|---|---|---|---|---|---|
| AUD-MIC-308 | El cierre en segundo plano depende solo de JS: con el hilo JS ocupado el micro sigue captando en segundo plano; lo nativo no lo corta | P0 | CONFIRMADO | T | B3, B8 |
| AUD-MIC-800 | En silencio el micro procesado da ceros exactos, `fallback()` tarda ~10–12 s, reabre el micro hasta 4 veces y fija para toda la sesión un micro **sin cancelación de eco**; amplía la ventana de MIC-301 | P0 | CONFIRMADO (×4) | T | B8, ORQ |
| AUD-MIC-304 | Segundo dedo en el botón de hablar: el primer `MediaRecorder` sigue grabando huérfano más de 24 s | P0 | CONFIRMADO | T | B3, B8 |
| AUD-FUG-401 (=SEG-500) | Resource ID de Azure sin validar: el token Bearer de ARM sale a un host arbitrario; cambiar tenant, client o resource no pide la huella. Hoy sin exposición (sin *service principal* configurado) | P1 | CONFIRMADO | N | B4, B5, B8 |
| AUD-SEG-501 (+ARQ-102) | Importar copia sin validar filas ni versión y sin copia previa: `tables:{}` borra el progreso con «Importado ✓»; acepta 52 MB | P1 | CONFIRMADO | N | B1, B5, B8 |
| AUD-RES-704 (+E2E-601, SEG-510) | Sin `catch` en el arranque ni `ErrorBoundary`: un perfil o una consulta con forma inesperada deja la app en negro o en blanco sin salida; errores internos en inglés | P1 | CONFIRMADO | N | B5, B6, B7, B8 |
| AUD-RES-700 (+RES-701, ARQ-110) | En primer plano y en reposo, 1,7–3 núcleos: el fondo con `blur` (~1 núcleo) y la mascota a 60–120 fps (~1 núcleo); fotogramas de 44–61 ms | P1 | CONFIRMADO | T | B1, B7, B8 (baja de ALTA) |
| AUD-FLU-209 | Una clave de Gemini nueva se guarda antes de comprobarla y pisa la buena | P1 | CONFIRMADO | N | B2, B6, B8 |
| AUD-FLU-210 (+FLU-211, E2E-002, FUG-406) | No se informa de que la voz, las transcripciones y el perfil salen a Google/Microsoft; los textos dicen «solo en este teléfono» y «clave protegida con patrón» | P1 | CONFIRMADO | N + T | B2, B4, B6 |
| AUD-FLU-202 | El re-test no tiene salida una vez empezado (25–30 min forzados) | P1 | CONFIRMADO | N | B2, B6, B8 |
| AUD-FLU-204 (+MIC-311, ARQ-115) | El borrador de un re-test que falló al evaluarse queda huérfano con los audios (3 × 93 KB) sin caducidad | P2 | CONFIRMADO | N | B1, B2, B3, B6 |
| AUD-FLU-200 (+E2E-041) | Importar desde la bienvenida salta el paso de la clave de Gemini | P2 | CONFIRMADO en parte | N | B2, B6 |
| AUD-FLU-900 (+FLU-217) | El recordatorio falla en silencio si falta el permiso (solo avisa en Ajustes → Meta diaria), no lo vuelve a pedir ni lleva a los ajustes; sin ayuda para Xiaomi; los avisos se acaban a los 7 días | P2 | CONFIRMADO por código; aviso de prueba OK con permiso | E + T | B2, ORQ |
| AUD-ARQ-106 | Sin `keystore.properties`, el build se firma con la clave de depuración genérica y se copia a `apk/`: no se instala encima y empuja a desinstalar (pérdida de datos) | P2 | CONFIRMADO (código) | E | B1 |
| AUD-ARQ-105 | El perfil se reescribe entero con copias antiguas: se pueden perder actualizaciones | P2 | HIPÓTESIS | E | B1 |
| AUD-MIC-307 | Modo auriculares: al volver a primer plano se reactiva el modo llamada en cualquier pantalla | P2 | HIPÓTESIS (sin auriculares) | E | B3 |

### 5.4 BAJA

| ID | Título | Prio. | Estado |
|---|---|---|---|
| AUD-FUG-402 | Los APK v3.0–v5.7 de `apk/` registraban en logcat los ajustes con las claves | **P1** (acción barata: borrarlos) | CONFIRMADO (configuración) |
| AUD-SEG-504 | El debug se firma con la clave de producción y el mismo `applicationId`; el release no se usa (R8 apagado) | P1 (va con SEG-001) | CONFIRMADO |
| AUD-ARQ-104 | `setRoute("headset")` deja el modo llamada si no hay auriculares; Android 16 lo corrige solo en ~5 s | P2 | PARCIAL (B8 baja de MEDIA) |
| AUD-FLU-207 (+H-B6-5) | El aviso de fonética agotada desmonta la clase; el Inicio no muestra «Clase en progreso» | P2 | CONFIRMADO en parte |
| AUD-FLU-219 (+ARQ-101) | Tras importar, la clase guardada se cruza con otra sesión | P2 | CONFIRMADO |
| AUD-RES-703 (=FLU-216) | Tras un error del plan, volver al Inicio relanza una cadena de 5 peticiones | P2 | CONFIRMADO (magnitud menor; B8 baja de MEDIA) |
| AUD-FUG-403 (=SEG-505) | Copias y resumen del test en claro en `Documents/Habla` y en caché sin borrar; `FileProvider external-path "."` | P2 | CONFIRMADO en parte |
| AUD-SEG-502 | Una confirmación con huella abre 60 s para las tres credenciales; Azure no avisa si el teléfono no tiene bloqueo | P2 | CONFIRMADO (lógica) |
| AUD-SEG-503 | Sin CSP (sin explotación hoy: las respuestas maliciosas se muestran como texto) | P3 | CONFIRMADO |
| AUD-SEG-509 | El texto del tema entra literal y sin delimitar en el prompt del profe | P3 | CONFIRMADO (entrada) |
| AUD-RES-705 / 706 | Las peticiones nunca se cancelan (se facturan y se tiran); con red lenta, 61 s en «Pensando…» sin cancelar | P2 | CONFIRMADO |
| AUD-FLU-203 | El test no guardaba borrador hasta el final | P3 | **Corregido en gran parte en `16e6240`** (RES-712) |
| AUD-FLU-206 | «Empezar nueva» dice que la clase «se perderá» y no es así | P3 | CONFIRMADO |
| AUD-E2E-602 / 603 / 604 | Horizontal: «¿Qué digo?» tapado · minutos y racha no cuentan la clase guardada · texto «Revísala en Ajustes» fuera de lugar | P3 | CONFIRMADO |
| AUD-FUG-405 | `HablaAudio` escribe en logcat el nombre del dispositivo Bluetooth | P3 | HIPÓTESIS |
| AUD-MIC-309 / 312 | Trozos tardíos mezclados entre grabaciones · grabaciones sin tope de duración (salvo con fonética) | P3 | HIPÓTESIS |
| AUD-FLU-201, 205, 208, 214, 218 | Atrás antes del Inicio · «Reintentar» sin efecto · avisos del test fuera de contexto · UI «grabando» al volver · «Tu audio está guardado» solo en memoria | P3 | HIPÓTESIS |
| AUD-ARQ-001, 002, 103, 107, 108, 111, 112, 113 · RES-711 | Deuda: avisos de lint, chunk de 1,29 MB, ciclos de importación, JSON de IA sin validar, navegación de 9 prioridades, pantallas «dios», guardado dentro de `setState`, **0 tests** | P2–P3 | CONFIRMADO |

### 5.5 INFO (observaciones)
AUD-SEG-002 (3 vulnerabilidades moderadas, solo en desarrollo) · AUD-MIC-310 (Azure recibe el WAV aunque Gemini no oiga voz; reenvíos de hasta 5 veces) · AUD-MIC-313 (permiso de audio pedido al entrar en clase; mensajes de error correctos) · AUD-FUG-406 (perfil a Gemini en cada turno) · AUD-FUG-407 (copia en la nube con IndexedDB y `localStorage`; desactivada en el POCO) · AUD-FUG-408 · AUD-SEG-506/507/508 · AUD-RES-708 (13 peticiones por clase de 10 turnos) · AUD-RES-714 y AUD-E2E-600 (proceso).

---

## 6. Detalle de los defectos P0 y ALTA

> El detalle completo, con pasos, evidencia y propuesta, está en cada `resultados/Bx/hallazgos.md`, y la contraprueba en `B8/verificacion.md`. Aquí, lo esencial para decidir.

### AUD-MIC-302 · Doble apertura del micro → stream huérfano · CRÍTICA · P0
- **Reproducir (T):** Tema libre → «Dictar por voz» → dos toques en <300 ms → cerrar la hoja → ir al Inicio de la app → Inicio de Android → volver.
- **Esperado:** un solo stream; al cerrar la hoja, micro cerrado.
- **Obtenido:** el stream #1 y su `MediaRecorder` siguen vivos en el Inicio de la app, captan ~6 s en segundo plano (`appops running`, `habla_top=0`) y vuelven a captar al regresar. Solo `force-stop` los libera.
- **Causa raíz:** `begin()`/`open()` no son reentrantes; el estado del botón cambia después del `await`; el stream no se registra antes de la espera.
- **Evidencia:** `B3/mic-timeline-M9c*.txt`, `B8/evidencia/m302-*.txt`.

### AUD-MIC-301 · Cierre durante la apertura → reapertura sin pulsación · CRÍTICA · P0
- **Reproducir (T):** entrar en clase → Inicio de Android a los ~0,45 s → volver → Inicio otra vez.
- **Obtenido:** al volver, `fallback()` reabre el micro (pista ya parada = ceros = «mudo») sin pulsación. Ese stream no entra en `recorders`, así que el segundo paso a segundo plano no lo cierra (capta ~5 s; luego Android lo silencia pero sigue asignado y recaptura al volver).
- **Probabilidad:** baja (ventana ~0,5 s), pero AUD-MIC-800 la amplía a ~10–12 s en una habitación en silencio.
- **Evidencia:** `B3/mic-timeline-M4b*.txt`, `B8/evidencia/m301-a-*`.

### AUD-MIC-303 · Debate: «Atrás» deja grabando · ALTA · P0
- **Obtenido:** 45 s grabados (42 fuera del dictado) con el punto verde en «¿Quién elige el tema?». Al terminar, 158 KB de audio a Gemini (red falsa). B8 vio además que la grabación puede **empezar después** de pulsar «Atrás» si la apertura tarda (AUD-MIC-800).
- **Causa raíz:** el paso 2→1 no desmonta ni llama a `close()` (`TopicAskPage.tsx:41,61`).

### AUD-MIC-305 · Micro abierto toda la clase · ALTA · P1 (diseño)
- **Obtenido:** punto verde, `appops running` y `MODE_IN_COMMUNICATION` durante 3 min de clase en reposo, sin auriculares. En el Repaso, 49 s abiertos tras «Parar». La preparación de la clase, de hasta ~2,5 min, no tiene botón de salir y el micro ya está abierto.
- **Decisión que pide al dueño:** abrir al pulsar (latencia de ~300–500 ms en el primer toque) o mantener abierto con cierre por inactividad (p. ej. 20 s) y un aviso explícito. Si se acepta con aviso, baja a MEDIA.

### AUD-SEG-001 · APK debuggable con credenciales en claro · ALTA · P1
- **Obtenido (T):** por CDP, sin huella, se obtiene `habla.settings` completo. B8 solo registró longitudes. `run-as` daría `CapacitorStorage.xml`. Ninguna otra app puede leerlas (sandbox): hace falta un PC con la depuración USB autorizada.
- **Raíz:** `npm run apk` = `assembleDebug`; el debug se firma con la clave de producción (SEG-504), así que cualquier APK de depuración sustituye al de uso diario.

---

## 7. Mapas

### 7.1 Mapa del micrófono (resultado en teléfono real)

| Escenario | Abre stream | Graba | Cierra | Android (indicador, appops, modo) | Resultado |
|---|---|---|---|---|---|
| Clase en reposo (M1) | al entrar, antes del saludo | nunca | al salir | punto verde, `running`, `MODE_IN_COMMUNICATION` | **NO OK** (MIC-305) |
| Turno normal (M2) | ya abierto | pulsar → soltar | — | — | OK |
| Inicio con la clase abierta (M4) | — | — | 1–2 s | `Inputs(0)`, `MODE_NORMAL`; no se reabre | OK |
| **Inicio durante la apertura (M4b)** | reabre solo al volver | — | no lo cierra el 2.º Inicio | `running` ~5 s en segundo plano | **NO OK – CRÍTICA** (MIC-301) |
| **Bloquear pantalla en reposo (M5)** | — | — | ~1,3 s | `MODE_NORMAL` a ~3,6 s; no se reabre | **OK** (ORQ + dueño) |
| **Bloquear pantalla grabando (M6)** | — | se detiene al bloquear | ~1 s | `MODE_NORMAL` a ~2,7 s; nada enviado; UI no queda «grabando» | **OK** (ORQ + dueño, sin restricciones) |
| Dictado normal (M9) | toque | toque → toque | al parar | punto verde mientras dicta | OK |
| **Debate, «Atrás» (M9b)** | toque | sigue 45 s | al salir | punto verde fuera del dictado | **NO OK – ALTA** (MIC-303) |
| **Doble toque al dictar (M9c)** | ×2 | huérfano | solo `force-stop` | recaptura al volver | **NO OK – CRÍTICA** (MIC-302) |
| Segundo dedo (X1) | — | huérfano >24 s | al ir a segundo plano | — | **NO OK – MEDIA** (MIC-304) |
| Hilo JS ocupado + Inicio (B8) | — | — | cuando el JS se libera | capta en segundo plano | **NO OK – MEDIA** (MIC-308) |
| Habitación en silencio al entrar (B8, ORQ) | 3–4 aperturas en 10–19 s | — | — | pasa a micro sin procesado ni AEC | **NO OK – MEDIA** (MIC-800) |
| Repaso tras grabar | 1.er toque | entre toques | al salir (49 s tras parar) | `running`, modo llamada | NO OK (diseño, MIC-305) |
| `force-stop` grabando (M11) | — | corta | +3 s | `Inputs(0)` | OK |
| Inicio, Palabras, Progreso, Ajustes (M12) | nunca | — | — | `Inputs(0)` | OK |
| Segundo plano 10–30 min con la clase abierta | — | — | cerrado | 0 % CPU, 0 *wakelocks*, `MODE_NORMAL` (con y sin ahorro de batería) | OK |
| Auriculares Bluetooth (M7) | — | — | — | — | **No probado** |
| Test de nivel en el teléfono (M8) | — | — | — | — | **No probado** (solo en navegador y código) |

### 7.2 Datos que salen del teléfono

| Destino | Qué datos | Cuándo | ¿Necesario? |
|---|---|---|---|
| Gemini – clase | **Nombre, ocupación, motivos, intereses**, niveles y debilidades en el prompt; historial completo; **audio de cada respuesta** | Cada turno | Audio e historial sí; perfil completo en cada turno, discutible (FUG-406) y **no informado** (FLU-210) |
| Gemini – informe, plan, tema, test, palabras, repaso, dictado, «¿Qué digo?» | Transcripciones, perfil (plan), respuestas y **audio** (test, repaso, dictado), palabra y contexto | Según la función | Sí; el tema con categoría «actual» activa Google Search |
| Gemini – lista de modelos | Solo la clave (en cabecera) | Guardar clave / Ajustes → Modelos | Sí |
| Azure STT | **WAV 16 kHz**; en la 2.ª pasada, la transcripción de Gemini en una cabecera | Cada respuesta con fonética | Sí si la fonética está activa; también se envía cuando Gemini dice que no hubo voz (MIC-310) |
| Azure STS, AD y Monitor | Clave de Azure; `client_id` y **`client_secret`**; token Bearer y Resource ID | Guardar o abrir Azure | Opcional; **el host de Monitor no se valida** (FUG-401) |
| Exportar / Compartir | Perfil, sesiones y transcripciones (sin claves ni audio) en claro en `Documents/Habla` y en caché | A petición | Sí; la caché no se borra (FUG-403) |
| Copia en la nube de Android | IndexedDB y `localStorage` (sin `CapacitorStorage.xml`) | Automática | Discutible; desactivada en el POCO (FUG-407) |
| logcat | v5.8: nada de la app (verificado con llamada real); `HablaAudio` con Bluetooth (sin probar). **≤v5.7: ajustes con claves** | Continuo | No (FUG-402, 405) |
| USB, `run-as` o CDP | **Todo**: claves, secreto y clase guardada | Con un PC autorizado | No (SEG-001) |

Todas las claves viajan en cabecera, siempre por HTTPS y nunca en la URL. La región de Azure no permite desviar el host.

---

## 8. Plan de corrección por versiones

### 8.1 Clasificación: ¿parche o versión nueva?

Criterio de versionado semántico (`MAYOR.MENOR.PARCHE`): **PARCHE** = solo corrige defectos sin cambiar lo que el usuario puede hacer · **MENOR** = funciones o comportamientos nuevos visibles que no rompen datos ni obligan a reinstalar · **MAYOR** = cambio de etapa o incompatible.

| Tipo de corrección de esta auditoría | Clasificación | Motivo |
|---|---|---|
| Micrófono que capta sin pedirlo (MIC-301/302/303/304/308/800) | **PARCHE** | La app ya promete «graba solo mientras mantienes pulsado»: es corregir un defecto, no añadir nada. |
| Claves y datos (FLU-209, FUG-401, SEG-501 rechazando copias inválidas, RES-704/E2E-601 sin pantallas en negro o en blanco, build release no debuggable, APK antiguos) | **PARCHE** | Son defectos de seguridad y robustez. El build release se firma con la misma clave y el mismo `applicationId`: se instala encima sin perder datos. |
| Consumo en primer plano (RES-700/701) | **PARCHE** | Es una optimización; el aspecto se conserva. |
| Textos erróneos (FLU-206, FLU-211, E2E-604) | **PARCHE** | Corrigen lo que dice la app. |
| Nuevo modelo de micro en clase (MIC-305), aviso de privacidad (FLU-210), salida del re-test (FLU-202), permisos de notificación guiados (FLU-900/217), resumen y copia previa al importar, limpieza de borradores (FLU-204) | **MENOR** | Cambian comportamientos o añaden pantallas y opciones nuevas, y piden decisiones de diseño. |
| Abrir la app a otras personas (objetivo del BACKLOG) | **MAYOR** | Cambio de etapa: de app personal a app para cualquiera. |

**Conclusión:** la auditoría se resuelve **sobre todo con parches de la 5.8** (5.8.1 y 5.8.2) y **una versión menor, la 5.9**, para lo que cambia el comportamiento. Nada justifica la **6.0**; queda reservada para distribuir la app a otras personas.

**Cómo se presentan al usuario:** la 5.8.1 y la 5.8.2 se publican como **«Actualización de parches de seguridad y corrección de la v5.8»**: sin funciones nuevas, solo arreglos, con su entrada propia en «Novedades». La 5.9 sí se anuncia como versión nueva.

**Técnicamente es viable:** `version.json` alimenta `versionName` y `versionCode` (`android/app/build.gradle:11-13`) y la app compara la versión solo por igualdad de texto (`notices.ts:19`, `NoticeGate.tsx:60`). «5.8.1» funciona sin cambiar código: basta con añadir su entrada en `RELEASES` (`changelog.ts`) y seguir subiendo `build` (34, 35…). El APK saldrá como `Habla-v5.8.1.apk`.

Convención del proyecto: un commit por fase y una NC por punto. Las NC siguen la numeración de cada entrega: `NC-v5.8.1-xx`, `NC-v5.8.2-xx`, `NC-v5.9-xx`.

### 8.2 v5.8.1 · PARCHE «Micrófono seguro» (P0, bloquea cualquier otra entrega)
1. **Recorder reentrante y cancelable** (MIC-302, MIC-301, ARQ-100): una sola apertura en curso por instancia (promesa compartida o token de generación), registrar el stream en `recorders` **antes** de cualquier `await`, comprobar tras `getUserMedia` si se pidió el cierre (y si es así, parar y salir), y que `fallback()` registre también sus streams.
2. **`start()` con guarda** (MIC-304): ignorar `pointerdown` si ya hay un `MediaRecorder` grabando, o un solo puntero activo (`pointerId`).
3. **Debate y dictado** (MIC-303): `close()` al volver de paso o al desmontar la hoja; no empezar a grabar si el paso cambió durante la apertura.
4. **Red de seguridad nativa** (MIC-308): en `MainActivity.onPause/onStop`, parar la captura del WebView (p. ej. denegar o revocar el `PermissionRequest` activo, o `webView.onPause()` más un aviso al JS), sin depender del hilo JS.
5. **`fallback()` en silencio** (MIC-800): no tomar los ceros exactos como micro mudo sin una segunda comprobación, limitar a 1 reintento y no perder la cancelación de eco para toda la sesión.
6. **Pruebas de regresión**: tests unitarios del Recorder con un `getUserMedia` simulado (ARQ-113) y reejecutar `B3/arnes`, `B8/arnes` y `ORQ/arnes` (M4b, M9b, M9c, X1, M5, M6, segundo plano) en el POCO.

### 8.3 v5.8.2 · PARCHE «Claves, datos y consumo» (P1)
1. **Build release** (SEG-001, SEG-504, ARQ-106): no debuggable, con R8, firmado con `habla.jks` para el uso diario; debug con `applicationIdSuffix ".debug"`; fallar el build si falta `keystore.properties`.
2. **Resource ID de Azure** (FUG-401): validar con una expresión regular (`^/subscriptions/[0-9a-f-]{36}/resourceGroups/…$`), usar `new URL` y comprobar el host; pedir la huella para cambiar tenant, client o resource.
3. **Copias y arranque** (SEG-501, RES-704, E2E-601, SEG-510): validar el esquema de la copia (tablas, tipos y versión) y **rechazar** la inválida sin tocar los datos; `ErrorBoundary` y `catch` en el arranque con un mensaje en español en lugar de la pantalla en negro o en blanco.
4. **Clave de Gemini** (FLU-209): comprobarla antes de guardarla y conservar la anterior si falla.
5. **Consumo en primer plano** (RES-700, RES-701): pausar las animaciones del fondo y de la mascota en reposo, reducir el `blur`, un solo bucle de la mascota y respetar `prefers-reduced-motion`. Objetivo: <10 % de CPU en reposo.
6. **Textos y menores** (FLU-206, FLU-211, E2E-604, RES-703).
7. **Fuera del código** (FUG-402): borrar los APK antiguos de `apk/` y valorar rotar la clave de Gemini.

### 8.4 v5.9 · MENOR «Transparencia y control» (P1–P2)
1. **Micro en clase** (MIC-305, FLU-213): elegir el modelo de apertura, al pulsar o abierto con cierre por inactividad y aviso (decisión del dueño); botón «Salir» en la preparación de la clase.
2. **Privacidad** (FLU-210): aviso claro en el tutorial y en Ajustes de qué sale a Google y Microsoft.
3. **Re-test y borradores** (FLU-202, FLU-204, MIC-311): salida del re-test con «guardar y salir»; limpieza del borrador huérfano y caducidad de los audios.
4. **Recordatorios** (FLU-900, FLU-217): pedir el permiso de notificaciones al arrancar si el recordatorio está activo, botón a los ajustes de notificación de Habla, aviso en el Inicio y ayuda para Xiaomi; reprogramar sin depender de abrir la app.
5. **Importar con garantías** (SEG-501, ampliación): resumen de lo que contiene la copia, confirmación y copia automática previa.
6. **Flujos** (FLU-200, FLU-207, FLU-219, E2E-602, E2E-603).

### 8.5 Backlog (P2–P3; parches 5.9.x o una menor posterior)
CSP `script-src 'self'` (SEG-503), delimitar el tema en el prompt (SEG-509), cancelar peticiones con `AbortController` (RES-705/706), gracia de huella por credencial (SEG-502), borrar la copia de la caché (FUG-403), dividir el chunk (ARQ-002), refactor de pantallas y navegación (ARQ-108/111) y suite de tests (ARQ-113).

### 8.6 v6.0 · MAYOR (fuera del alcance de esta auditoría)
Cuando Habla esté lista para otras personas: los P0–P1 cerrados, auriculares Bluetooth y test de nivel probados en el teléfono, aviso de privacidad, idioma nativo y acceso a la IA por persona (BACKLOG).

---

## 9. Riesgos residuales (después de v5.8.1)
- **Auriculares Bluetooth:** el modo llamada y SCO no se han probado (MIC-307, FUG-405). Probarlo con los soundcore antes de distribuir.
- **Test de nivel en el teléfono:** solo se probó en navegador y código. El patrón de doble apertura existe también ahí (MIC-302).
- **Recordatorio diario real:** con la app cerrada horas y el «Inicio automático» de Xiaomi desactivado, puede no llegar.
- **Batería en mAh:** no se pudo medir (permiso denegado y teléfono cargando). La CPU es un indicador, no una medida de consumo.
- **Inyección de prompt:** no se comprobó si Gemini la obedece.
- **Sin tests automatizados:** cualquier corrección del Recorder puede romper otra pantalla. Los arneses de la auditoría (`B3/arnes`, `B8/arnes`, `ORQ/arnes`) sirven como base de regresión manual.

---

## 10. Lo que está bien (verificado)
- **NC-14 en segundo plano:** con la clase abierta, 0 % de CPU, 0 *wakelocks*, micro cerrado y `MODE_NORMAL`, con y sin «Ahorro de batería» (B7 y ORQ N-04).
- **Bloqueo de pantalla:** cierra el micro en ≤1,3 s, en reposo o grabando; no se reabre ni envía nada (M5, M6).
- **D-02:** `CapacitorStorage.xml` excluido de la copia en la nube y del paso a otro teléfono; claves solo en cabecera y por HTTPS; ninguna clave en git, `dist/` ni los APK.
- **`loggingBehavior: 'none'`:** 0 coincidencias de clave, cabeceras o textos en 39 375 líneas de logcat con una llamada real.
- **Robustez:** importar un JSON roto o fallar a mitad revierte la transacción (los datos quedan intactos); `force-stop` con la clase abierta no la daña; retomar la clase conserva todo el historial; 50 turnos sin fuga de memoria; un año de datos va fluido; arranque en frío de 1,36 s.
- **Camino feliz con IA real:** transcripción literal, correcciones, TTS, nota de Azure guardada, «¿Qué digo?», consulta de palabras guardada; el profe no habla en segundo plano.
- **Superficie Android:** sin *deep links* ni tráfico en claro; FileProvider no exportado; las respuestas maliciosas de la IA se muestran como texto; 0 `innerHTML` y 0 `eval`.
- **Permisos de micro:** mensajes correctos para permiso denegado y micro ocupado.
- **Re-test en `16e6240`:** se retoma en la misma pregunta.

## 11. Descartados

| ID / hipótesis | Motivo |
|---|---|
| AUD-MIC-306 (`catch` de `open()` sin `close()`) | Las pistas ya estaban paradas; solo queda un residuo si falla `enumerateDevices` (BAJA). |
| AUD-FLU-215 (el profe habla en segundo plano) | Con una llamada real habla al volver, no en segundo plano. |
| AUD-RES-702 (consumo en segundo plano) | 0 % de CPU y 0 *wakelocks* (también sin restricciones). |
| AUD-FLU-212 (60 s sin red) | Corregido por RES-707: falla en ~12 s y dice «sin conexión». |
| H-B7-1 (importación a medias) · H-B2-502/503 (cambiar o revelar clave sin bloqueo) | La transacción revierte; todas las rutas piden el bloqueo; cancelar deja la clave oculta. |
| AUD-FUG-409 (región de Azure, netlog, `console.*`, git) | Controles correctos. |
| RES-709, 710, 713 | Sin fuga de memoria, rendimiento correcto y `force-stop` seguro. |

---

*Archivos: `resultados/B0…B8/` (hallazgos, evidencias y arneses), `resultados/ORQ/` (pruebas con el dueño), `B8/verificacion.md` (contraprueba), `B3/mapa-microfono.md`, `B4/mapa-datos.md`, `B2/flujos.md`, `B7/metricas.md`, `llamadas-reales.md`.*
