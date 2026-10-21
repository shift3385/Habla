# Regresión 5.10 (build 40) — plan y checklist

> **Fuente de verdad del avance de esta regresión.** Si se corta la sesión: abre Claude Code en `D:\My Apps\HABLA` y escribe
> `Lee docs/pruebas/regresion-5.10/CHECKLIST.md y continúa la regresión por el primer punto que no esté «OK» o «NC».`
> Estados: `⬜ pendiente` · `🔄 en curso` · `✅ OK` · `❌ NC` (no conformidad, con id `REG-…`) · `⏭ omitido` (con motivo) · `🧑 necesita al dueño`.

Creado el 2026-10-20. Rama `v5.10-gramatica` (16 commits por delante de `main`). Teléfono: POCO X6 5G `60d0718c`
(release `com.shift.habla` 5.10/40 instalado el 2026-10-18; debug `com.shift.habla.debug` aún en 5.9). Auriculares:
soundcore Liberty 4 Pro (Bluetooth del teléfono apagado al empezar). El Galaxy A11 **no** está conectado.

## Reglas de la regresión
- Nada de commits ni push sin aprobación del dueño. Nada de claves reales en archivos, logs ni respuestas (CLAUDE.md, regla 2).
- **Solo el orquestador toca el teléfono** (un único dueño de `adb`/CDP para no pisarse). Los agentes trabajan en el PC.
- Ningún agente compila el APK **release** ni toca `keystore/`. El release lo compila el orquestador al final, si todo pasa.
- Cada agente escribe **solo** su informe `docs/pruebas/regresion-5.10/A<n>-*.md` y sus evidencias en `evidencia/A<n>/`;
  los arreglos de código los propone, y el orquestador decide (con el dueño) cuáles se aplican.
- Gasto de IA real: Gemini con la clave del dueño solo en las pruebas del teléfono; Azure como máximo **4 min** de audio (ampliado por el dueño el 2026-10-20).

## Reparto (5 agentes como máximo + orquestador)

| Agente | Rol | Alcance (puntos de la lista de pendientes) | Entregable |
|---|---|---|---|
| **A1** | Compilación y código | 1 (Java P2), 3 (revisión de código de `main..v5.10-gramatica`), 4, 14, 15, 16 (tests nuevos de `levels`/`bank`/`placement`/`fluency`) | `A1-codigo.md`, APK debug 5.10 |
| **A2** | Seguridad | 13, 18 y repaso de las reglas de claves: APK no depurable, claves fuera de logs/copias/`dist`, CSP, SEG-502/509, FUG-403, inyección de prompt con red simulada | `A2-seguridad.md` |
| **A3** | Contenido y pedagogía | 2 (G-V: los 90 temas de Gramática), prompts del profe y de la clase dirigida (P3/P3b), lógica de la fonética (`pronunciation.ts`, `phonetics.ts`) | `A3-contenido.md` |
| **A4** | Interfaz y navegación (navegador) | 6 (lo que se pueda en PC), 11 (MOV-2), regresión visual 390×844 · 320×640 · 780×360 (A11), Atrás, flujos de Gramática, clase, repaso y test con Gemini simulado | `A4-interfaz.md` + capturas |
| **A5** | Mercado, usabilidad y motivación | Estudio de mercado (Duolingo, Speak, ELSA, Praktika, Babbel, Cambly…), riesgo de aburrimiento/repetición, propuestas de interfaz y motivación | `A5-usabilidad.md` |
| **Orq.** | Orquestador + pruebas en el teléfono | 5, 7, 8, 9, 10, 12, CPU mínima, consolidación, limpieza, docs (17), release final | este archivo + `MOVIL.md` |

Orden: A1 primero (necesito su APK debug 5.10 para el teléfono) y A2, A3, A5 en paralelo. A4 empieza a la vez en el navegador.
Mientras tanto, el orquestador hace en el teléfono lo que no necesita el APK nuevo (release 5.10 ya instalado).

## Checklist

### 0 · Preparación y limpieza
| # | Tarea | Estado | Notas |
|---|---|---|---|
| 0.1 | Copia de los datos del POCO antes de nada (Exportar copia desde la app) | ✅ | El dueño la exportó a su Google Drive (2026-10-20) |
| 0.2 | Archivar evidencias antiguas en `docs/pruebas/historial/` (con `git mv`) y dejar los arneses como base en `docs/pruebas/arneses/` | ⬜ | Propuesta abajo; espera aprobación |
| 0.3 | APK antiguos de `apk/` (140 MB, fuera de git) | 🧑 | El dueño decidió comprimirlos a mano; no se tocan |

### 1 · PC: compilación y código (A1)
| # | Tarea | Estado | Notas |
|---|---|---|---|
| 1.1 | `npx tsc -b`, `npm run lint` (0 errores), `npm test`, `validate-bank`, `validate-grammar`, `npm run build` | ✅ | A1: todo exit 0. Lint 0 errores / 9 avisos (ninguno real); tests 80/80; banco 450; Gramática 90 temas·667 ej.; bundle 1,92 MB |
| 1.2 | Compilar el Java de P2 (`:app:compileDebugJavaWithJavac --offline`) | ✅ | A1: compila (28 s), solo el aviso «SDK XML 4» |
| 1.3 | APK debug 5.10 (`npm run apk:debug`) | ✅ | A1: `apk/Habla-v5.10-debug.apk` (20-10 21:33), `com.shift.habla.debug` vc 40 «5.10-debug», debuggable. `gradlew` lanzado a mano (ver A1-codigo.md) |
| 1.4 | Revisión de código de toda la 5.10 (correctitud, regresiones del Recorder, foco de audio, `speechLang`, P6 `echoesIdea`) | ❌ | A1: 0 críticas/altas; 4 MEDIA (REG-A1-01 micro tras cancelar, -02/-03 foco de audio, -04 echoesIdea) y 4 BAJA. Ver A1-codigo.md |
| 1.5 | Tests nuevos: `levels`, `bank`, `placement`, `fluency` (ARQ-113) | ✅ | A1: 4 archivos, 30 tests; `npm test` 110/110 |
| 1.6 | `AbortController` y deuda (bundle, pantallas grandes): diagnóstico y propuesta, sin refactor | ✅ | A1: diagnóstico en A1-codigo.md §1.6 (bundle 1,92 MB: 1,2 MB son JSON eager) |

### 2 · Seguridad (A2)
| # | Tarea | Estado | Notas |
|---|---|---|---|
| 2.1 | Claves: ninguna en git, `dist/`, copias, logs (`console.*`, netlog), `loggingBehavior: 'none'` | ✅ | 0 claves en git/árbol/`dist`/APK 5.9.x–5.10 (solo ficticias de 36–37 car.); copias y netlog sin claves; `console.*` no llega a logcat. `A2-seguridad.md` |
| 2.2 | Manifest y APK: no depurable en release, sin `cleartext`, FileProvider no exportado, `allowBackup` | ✅ | Release 5.10 no depurable, sin cleartext, FileProvider `exported=false`, backup excluye `CapacitorStorage.xml`; mismos permisos que la 5.9.1; foco de audio sin superficie. Falta `run-as`/logcat en el POCO (5.13) |
| 2.3 | CSP (SEG-503), tema delimitado en el prompt (SEG-509), gracia de huella (SEG-502), copia en caché (FUG-403) | ❌ | Los 4 siguen abiertos, riesgo bajo: REG-A2-01…04 con diff propuesto (CSP solo en build; probar en A11) |
| 2.4 | Inyección de prompt (tema, perfil, «Pregúntale») con Gemini simulado | ✅ | `tests/promptInjection.test.mjs` (6 pasan, 3 todo): ids validados, HTML como texto, clave fuera del prompt. Menores: REG-A2-05, 07 |
| 2.6 | Historial de git completo (todas las ramas, stashes, parches y evidencias) sin claves filtradas — petición del dueño | ✅ | 1397 blobs (todas las ramas, 0 stashes, 14 sueltos, parches, evidencias): 15 `AIza…` ficticias, 0 Azure/secret/Bearer. `evidencia/A2/escaneo-secretos.md` |
| 2.5 | Recordatorio al dueño: regenerar las claves expuestas el 2026-10-05 | 🧑 | Anotado al principio de `A2-seguridad.md` (Gemini, Azure Speech y, si existe, el secreto de Monitor) |

### 3 · Contenido y pedagogía (A3)
| # | Tarea | Estado | Notas |
|---|---|---|---|
| 3.1 | G-V: gramática correcta, explicaciones en español claras, niveles MCER bien puestos, trampas y ejercicios sin ambigüedad (90 temas) | ❌ | 90 temas / 667 ejercicios leídos enteros: calidad alta, 0 CRÍTICA. NC: REG-A3-01 (ALTA, `fullSentence` con la pista «(can, negativa)» en ▶ y Repaso, 94 ej.), REG-A3-02 (ALTA, tarjeta con respuesta en español), 06–09 MEDIA (órdenes/huecos con otra respuesta válida, its-time), 05/10–12/18 BAJA. Propuesta aplicable en `evidencia/A3/propuesta-contenido.json` (valida OK) |
| 3.2 | Prompt de la clase dirigida (P3/P3b) y del profe: corrige todo, no felicita respuestas con fallos | ❌ | Brief P3/P3b bien planteado. NC MEDIA: REG-A3-03 (no anula 3 reglas del prompt base), 04 (español de la tarea leído con voz inglesa), 15 (coherencia reply↔corrections fuera de Gramática), 16 («Dilo tú» puede dar «Correcto» con un fallo fuera de la estructura); 17 BAJA. Textos propuestos en `A3-contenido.md` §4 |
| 3.3 | Fonética: referencia correcta en clase/repaso/test, frase del coach, umbrales | ❌ | Referencias y umbrales OK (transcripción en clase/Repaso/«Dilo tú», libre en el test). NC MEDIA: REG-A3-19 (IPA sin consejo en español; s inicial, -ed, palabras de función), REG-A3-13/14 (`speechLang` parte mal 13 casos; propuesta probada en `evidencia/A3/speechLang-propuesta.ts`, 4/4 tests) |

### 4 · Interfaz y navegación en el navegador (A4)
| # | Tarea | Estado | Notas |
|---|---|---|---|
| 4.1 | Gramática en 390×844, 320×640 y 780×360: sin scroll en el Inicio, nada cortado, horizontal | ❌ | Todo OK en los 3 tamaños salvo REG-A4-05 (toques < 40 px), REG-A4-06 (texto del resultado) y REG-A4-08 (320×640 con clase guardada: 30 px de scroll). «Para ti» ya no es fila (⭐ en listas). `A4-interfaz.md` |
| 4.2 | Atrás (pantalla y Android simulado) en Gramática, hoja sobre la clase, «Pregúntale» | ❌ | Pila y hoja sobre la clase OK. REG-A4-01: «Pregúntale» pierde la respuesta al volver de un 📘; REG-A4-09: se pierde el scroll |
| 4.3 | Clase, repaso y test con Gemini simulado: sin regresiones de la 5.9.1 | ❌ | Clase, P6 (`echoesIdea`, voz cortada), varios 📘, informe, tarjeta de Gramática, test hasta habla, Ajustes, Novedades, Progreso y Palabras OK. REG-A4-02: «Abriendo el micro… espera» falta en Repaso, «Dilo tú» y test |
| 4.4 | MOV-2: diálogos `confirm()` → propuesta con `MascotPage` | ✅ | Confirmado nativo (App.tsx:540, SettingsScreen.tsx:849); diseño y diff en REG-A4-04 |
| 4.5 | Temas claro/oscuro, accesibilidad básica (tamaño de toque, contraste) | ❌ | Texto y `.tip-bubble` OK en los 8. REG-A4-03: verde/rojo de Gramática 2,1–2,7:1 en los 4 claros; REG-A4-07: `aria` de ▶/⏸ |

### 5 · Teléfono POCO con auriculares soundcore (orquestador + dueño)
| # | Tarea | Estado | Notas |
|---|---|---|---|
| 5.1 | Instalar el debug 5.10 con `install -r` (el release no se toca) | ✅ | Instalado; arranca con los datos de prueba (Liomar, A2), clave ficticia. Al abrir con los soundcore sale «¿Me oyes? Prueba de sonido» |
| 5.2 | **Retraso del micro (P7):** toque → «habla ya», 10 toques por modo (teléfono, auriculares), log `[HABLA-MIC]` | ❌ | REG-M-01: auriculares 2,7–3,6 s (5,8–6,6 tras reconectar); teléfono 0,52–0,57 s ✅. MOVIL 5.2* |
| 5.3 | **Conexión de los auriculares** a mitad de clase: la app los detecta y graba con su micro | ✅ | Reconexión detectada al instante, ruta < 1 s (MOVIL 5.5a) |
| 5.4 | **E3 · Desconexión** a mitad de clase y a mitad de grabación: vuelve al micro del teléfono, sin audio vacío | ⚠️ | Entre turnos ✅ (0,9 s). A mitad de grabación: aviso 55 s tarde, repetir (MOVIL 5.4*) |
| 5.5 | Reconexión, apagar el Bluetooth del teléfono, auriculares en la funda | ✅ | Funda y reconexión OK |
| 5.6 | P2 · música de otra app: baja al hablar el profe, se pausa al grabar, vuelve al terminar | ❌ | Grabar ✅ (pausa/vuelve). Profe ✅ baja. Explicación: baja poco y sube/baja por tramo (REG-M-06, A1-03) |
| 5.7 | P6 · tocar una idea de «¿Qué digo?» y grabar enseguida: no sale la idea | 🔄 | 2.ª grabación OK (no es la idea); 1.ª perdida sin aviso (REG-M-02). Falta qué vio el dueño |
| 5.8 | P3/P3b/P5 · clase de un tema de Gramática con errores a propósito: corrige todo, varios «📘» | ✅ | 3 errores corregidos, «Not quite», 4 📘; dos versiones OK |
| 5.9 | P4/P4b · ▶ de la explicación: voz española e inglesa por tramos | ❌ | Voces aceptables; «5th» → «five»+«th» (REG-M-10) |
| 5.10 | Gramática en el móvil: teclado, Atrás de Android, ejercicios → Repaso, «Dilo tú», «Pregúntale» | ❌ | Atrás ✅ (simulado), ejercicios→Repaso ✅, Dilo tú ✅; REG-M-07, REG-M-08, REG-A4-02 |
| 5.11 | Fonética real (Azure ≤ 4 min) en clase y «Dilo tú» | ✅ | Clase y Dilo tú con notas y sonidos; «ten:zero» (REG-M-09). ~2 min de Azure usados |
| 5.12 | R5 (MIC-308), R6 (silencio), R9 resto (repaso y dictado) | ✅ | Minimizar grabando: corte en ~2 s, nada enviado. R5/R6 no repetidos (sin cambios en esa zona) |
| 5.13 | Seguridad en el teléfono: logcat sin claves durante una clase real, `run-as` falla en el release | ✅ | 0 claves en logcat; run-as falla en release |
| 5.14 | CPU mínima (MOV-3): Inicio y clase en reposo, 2 × 30 s | ⚠️ | Debug: 28–52 % + 18–28 %; JS inactivo 86 %. Comparar con release |
| 5.15 | Migración: datos del dueño intactos tras la 5.10 (sesiones, errores, tarjetas) | 🧑 | Mirar Progreso en la app de uso diario |
| 5.16 | R24 · Galaxy A11 en horizontal | ⏭ | El A11 no está conectado |

### 6 · Cierre (orquestador)
| # | Tarea | Estado | Notas |
|---|---|---|---|
| 6.1 | Consolidar NC `REG-…` con severidad y prioridad, go/no-go | ✅ | INFORME.md: GO uso propio, NO-GO repartir hasta 5.10.1 |
| 6.2 | Arreglos aprobados por el dueño y regresión de lo arreglado | ⬜ | |
| 6.3 | Docs al día: `CLAUDE.md`, `estado-actual.md`, `problemas-conocidos.md`, `v5.10/ESTADO.md` | ⬜ | |
| 6.4 | APK release 5.10 (o 5.10.1 si hay arreglos) y aprobación del dueño | ⬜ | |

## Requisitos del dueño para los arreglos
- **REG-M-01 (micro lento con auriculares), 2026-10-20:** se puede mantener la ruta Bluetooth de la clase entre turnos, pero
  **solo mientras la app está en uso**: se libera al terminar o salir de la clase, al minimizar la app, al bloquear la pantalla
  y en segundo plano. Nunca micro abierto ni grabación fuera de uso («no quiero que me acusen de espiar»). La ruta abierta no
  puede implicar micro abierto: el micro sigue abriéndose solo al tocar.

- **REG-M-03 (propuesta del dueño, 2026-10-20) · prueba de sonido en un solo paso:** hoy «¿Me oyes?» suena por los
  auriculares y además pide tocar «Sí, te oigo / No te oigo»: dos pasos que repiten lo mismo. Propuesta: la voz dice «Si me
  oyes, repite esta frase» y la pantalla muestra una frase corta; el dueño la dice por el micro de los auriculares y la app
  da por buenas a la vez la salida (oíste la instrucción) y la entrada (el micro capta voz). Detalles a decidir en el diseño:
  comprobar la voz en local (señal + habla, sin coste) o con Gemini rápido; que la frase **no sea la misma** que suena, o
  que la diga solo la voz, para que el ruido o la música no cuenten como «sí»; botón pequeño «No te oigo» como salida;
  y si no se detecta voz en ~8 s, pasar al micro del teléfono como hoy.
  **Añadido por el dueño:** sin tocar nada para grabar: primero suena la instrucción y, **cuando termina** (evento de fin
  de la voz + ~300–400 ms para que el altavoz calle y no entre en el micro, como P6), la grabación empieza sola. Con aviso
  visible («Te escucho…» y vibración, como P7), duración máxima corta (~8 s), corte en cuanto se detecta la frase, y solo
  con la app en primer plano (requisito de privacidad de REG-M-01).
  **Orden en la primera instalación (dueño):** aunque los auriculares estén conectados desde antes, la prueba de sonido
  **no sale hasta terminar la bienvenida y guardar una clave de Gemini válida** (si la comprobación usa el modelo). Mientras
  no haya clave: sin prueba (o solo la versión local, sin Gemini); al acabar la configuración, se lanza la prueba si hay
  auriculares. Revisar en `App.tsx`/`AudioPicker.tsx` qué la dispara hoy y que no se cruce con `Onboarding`/`NoticeGate`.

- **REG-M-05 (crítica de un usuario, 2026-10-20) · tamaño de la letra configurable:** valores fijos, no un deslizador
  (p. ej. «Pequeña · Normal · Grande · Muy grande»), con vista previa, y que **ningún tamaño rompa la interfaz** en ninguna
  pantalla (Inicio sin scroll, clase, Gramática, test, horizontal 780×360 y 320×640). A5 no lo había detectado. Hoy no hay
  ajuste: `viewport.ts` solo escala toda la interfaz (`zoom`) en pantallas pequeñas, y hay ~327 tamaños en px fijos
  (`text-[NNpx]`) además de ~163 clases `text-xs…lg`. Evaluación en el navegador encargada a A4.

## No conformidades
| ID | Sev. | Prioridad | Qué | Estado |
|---|---|---|---|---|
| (todas) | — | — | Lista completa, ordenada por prioridad, en `INFORME.md` §2 (REG-M-01…10, REG-A1…A4, UX-…) | abiertas, pendientes de decisión del dueño |

## Bitácora (lo último arriba)
- 2026-10-20 · A4: REG-M-05 (tamaño de letra) evaluado en el navegador → sección «§ Tamaño de letra (REG-M-05)» de `A4-interfaz.md`. Medido: solo texto (decisión del dueño) frente a zoom, con 0,9/1/1,15/1,3 en 390, 360, 320 y 780×360. Solo texto aguanta 1,15 en vertical. 1,3 necesita adaptaciones (alturas fijas, `truncate`, segmentos). En horizontal 1,3 saca el micro de la clase de la pantalla (tope 1,15). El zoom rompe la regla del Inicio desde 1,15. **El WebView no fija `textZoom`**, así que hereda la letra del sistema: leer `font_scale` en el A11. Propuesta: 8 tokens × `--fs`, `setTextZoom(100)` + escala del sistema × ajuste de la app con tope, en Ajustes → Apariencia; unos 3–4 días. Capturas en `evidencia/A4/fuente/`.
- 2026-10-20 · A5: añadida a `A5-usabilidad.md` la sección «Pruebas de voz y audio en el mercado» (REG-M-03): 12 patrones con fuentes (Teams, Zoom, Meet, Discord, Telegram, Voice Match, Alexa, PTE, DET, apps de idiomas) y propuesta de un paso sin tocar (frase solo hablada, escucha automática tras 400/600 ms, VAD local, 8 s, «probado» por auriculares). Hallazgo: hoy `AudioPicker` puede lanzar la prueba encima de la bienvenida y el tutorial y cortar el test de nivel (`App.tsx:350-370`).
- 2026-10-20 · A4: `A4-interfaz.md` entregado. Interfaz **GO condicionado** (0 ALTA): antes del release, REG-A4-02 (P7 «Abriendo el micro… espera» solo en la clase; falta en Repaso, «Dilo tú» y test) y REG-A4-01 («Pregúntale» pierde la respuesta al volver de un 📘). 9 hallazgos REG-A4-01…09 (3 MEDIA, 6 BAJA) con diff; MOV-2 con diseño `MascotPage`. 39 capturas + arnés `evidencia/A4/arnes-a4.js` (Gemini simulado por esquema). Servidor `habla-dev` parado.
- 2026-10-20 · A3: `A3-contenido.md` entregado. Contenido **GO condicionado** (0 CRÍTICA): aplicar antes del release REG-A3-01 (`fullSentence`, 5 líneas) y REG-A3-02 (in-case-vs-if-8). 19 hallazgos REG-A3-01…19 (2 ALTA, 11 MEDIA, 6 BAJA); propuestas en `evidencia/A3/` (JSON de contenido validado, `fullSentence` y `speechLang` probados). Probar en el móvil lo de §6 del informe.
- 2026-10-20 · A2: seguridad **GO** para el uso actual. 2.1, 2.2, 2.4 y 2.6 OK (ninguna clave en git completo, `dist` ni APK; release no depurable; 5.10 sin permisos nuevos). 2.3 NC: SEG-503/509/502 y FUG-403 siguen abiertos (bajo). Nuevos menores REG-A2-05…07. Test `tests/promptInjection.test.mjs`. Comprobaciones de teléfono en `A2-seguridad.md`.
- 2026-10-20 · A1: terminado. Informe `A1-codigo.md`: GO condicionado; REG-A1-01…08 (4 MEDIA, 4 BAJA), 30 tests nuevos (110/110). En el teléfono, mirar especialmente 5.6 (¿la música sube y baja entre tramos de la explicación? REG-A1-03).
- 2026-10-20 · orquestador: debug 5.10 (vc 40) instalado en el POCO con `install -r`; release intacto (vc 40).
- 2026-10-20 · dueño: copia exportada a Google Drive; Azure ampliado a 4 min; pide revisar todo el historial de git por claves filtradas (2.6, reenviado a A2).
- 2026-10-20 · A5: `A5-usabilidad.md` entregado (mercado de 8 apps con fuentes, 12 hallazgos UX-01…12 —2 altos—, 13 riesgos de aburrimiento, SDT/Octalysis/Hook, 17 propuestas: 10 rápidas y 7 grandes). Destacan UX-01 consejo del «candado» obsoleto y UX-02 correcciones sin tope para A2.
- 2026-10-20 21:35 · A1: **APK debug listo** → `apk/Habla-v5.10-debug.apk` (com.shift.habla.debug, versionCode 40, versionName 5.10-debug, sha256 13b7c587…). 1.1 y 1.2 OK (Java de P2 compila). Ojo: el de las 23:50 del 18-10 se ha sobrescrito.
- 2026-10-20 · orquestador: plan y checklist creados. POCO conectado (batería 41 %, USB), release 5.10/40 instalado, debug en 5.9, Bluetooth apagado.
