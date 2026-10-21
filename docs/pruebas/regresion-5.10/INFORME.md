# Habla 5.10 (build 40) · Informe de la regresión del 2026-10-20

**Para:** el dueño · **Rama:** `v5.10-gramatica` (16 commits por delante de `main`, sin fusionar) · **Teléfono:** POCO X6 5G
con soundcore Liberty 4 Pro · **Método:** 5 agentes en el PC (código, seguridad, contenido, interfaz, mercado) y pruebas en
el teléfono del orquestador con el dueño (APK debug 5.10 por CDP, Gemini y Azure reales). Detalle: `A1-codigo.md` …
`A5-usabilidad.md`, `MOVIL.md`, `CHECKLIST.md`.

## 1. Veredicto

| Para… | Decisión | Por qué |
|---|---|---|
| Uso diario del dueño (release 5.10 ya instalada) | **GO** | Nada pierde datos ni expone claves; lo grave molesta, no rompe |
| **Repartir a la madre y amistades** | **NO-GO hasta una 5.10.1** | 4 fallos ALTA: el micro con auriculares tarda 3–6,6 s (lo que Novedades da por arreglado), grabaciones que se pierden sin aviso, 94 ejercicios que enseñan una frase con la pista pegada y una tarjeta del Repaso en español |

Lo que está bien y verificado: seguridad (0 claves en todo el historial de git, en `dist/`, APK ni logcat; release no
depurable), privacidad (al minimizar grabando, el micro se corta en ~2 s y no se envía nada), foco de audio al grabar
(la música se pausa y vuelve), desconexión y reconexión de los auriculares entre turnos, micro del teléfono en ~0,55 s,
clase dirigida de Gramática (corrige todo, no felicita con fallos, varios 📘), botón Atrás en todas las rutas, fonética
real, 110/110 tests, lint 0 errores, Java de P2 compilado por primera vez, contenido sin ninguna regla falsa.

## 2. No conformidades por prioridad

Severidad: ALTA / MEDIA / BAJA. Prioridad: P1 = antes de repartir · P2 = en la 5.10.1 si cabe · P3–P4 = backlog.

### P1 · antes de repartir (5.10.1)
| ID | Sev. | Qué | Evidencia |
|---|---|---|---|
| REG-M-01 | ALTA | Micro con auriculares: toque → «habla ya» **2,7–3,6 s** y **5,8–6,6 s** tras reconectar (objetivo < 2,5 s). Con la ruta Bluetooth ya puesta baja a 1,5–1,7 s. Arreglo: mantener la ruta durante la clase **solo con la app en uso** (requisito del dueño) y no volver a medir la señal tras reconectar unos auriculares ya probados | MOVIL 5.2b/h/i |
| REG-M-02 | ALTA | **Grabaciones que se pierden sin aviso** (3 casos): se graba, se suelta el foco y no hay llamada a Gemini ni turno; otra vez Gemini responde y no queda turno. El dueño no vio ningún mensaje | MOVIL 5.2g, 5.7 |
| REG-A3-01 | ALTA | `fullSentence()`: 94 ejercicios muestran, leen y guardan en el Repaso la frase con la pista pegada («…(could, negativa)») | A3 §3.1 |
| REG-A3-02 | ALTA | `in-case-vs-if-8` crea una tarjeta «Di la frase en inglés» con respuesta en español | A3 |
| REG-A4-02 | MEDIA | «Abriendo el micro… espera» solo en la clase: falta en Repaso, «Dilo tú» y test (Novedades lo promete) | A4, MOVIL 5.10f |
| REG-M-07 / A1-05 | MEDIA | La explicación sigue sonando al pasar a Ejercicios, abrir «Pregúntale», empezar clase o salir del tema | MOVIL 5.10b |
| REG-M-06 / A1-03 | MEDIA | Durante la explicación la música apenas baja y sube/baja en cada tramo (15 veces en 45 s). Arreglo: pausar la música en lecturas largas | MOVIL 5.6d, 5.9a |
| REG-M-10 | MEDIA | «on May 5th» se lee «five» (voz inglesa) + «th» (voz española) | MOVIL 5.9c |
| REG-M-08 | MEDIA | `prepositions-of-time-6` «gets in ____ the afternoon» → «gets in in»: confuso para A1 | MOVIL 5.10c |
| REG-A1-04 | MEDIA | `echoesIdea` rechaza respuestas reales (idea + 1–2 palabras propias) | A1 |
| REG-A1-01 | MEDIA | El micro se abre aunque hayas salido durante la espera previa (400 ms) | A1 |

### P2 · 5.10.1 si cabe, si no la 5.11
| ID | Sev. | Qué |
|---|---|---|
| REG-A3-06/07/08 | MEDIA | 19 ejercicios dan por mala una respuesta válida; uno de elegir con dos opciones válidas |
| REG-A3-09 | MEDIA | Traducción con el sentido cambiado («Ya era hora» → «Ya va siendo hora») |
| REG-A3-13/14 | MEDIA | `speechLang` lee en inglés «actualmente», «embarazada»… y en español «already», «nobody»… (propuesta lista) |
| REG-A3-03/04/15/16 | MEDIA | Prompts: la clase dirigida no anula 3 reglas del profe; la frase española de la tarea se lee con voz inglesa; fuera de Gramática el profe puede felicitar con fallos; «Dilo tú» puede dar «Correcto» con un fallo |
| REG-A3-19 | MEDIA | Fonética: el sonido que falla sale en IPA sin consejo en español; palabras «a/the/of» ocupan la lista |
| REG-A4-01 | MEDIA | «Pregúntale» pierde la respuesta al abrir un 📘 y volver |
| REG-A4-03 | MEDIA | Verde/rojo de Gramática con contraste 2,1–2,7:1 en temas claros |
| REG-A1-02 | MEDIA | Un ▶ mientras grabas devuelve la música y entra en el micro |
| REG-M-05 | MEDIA | **Letra:** el WebView ya hereda la letra del sistema sin tope (comprobado en el POCO); con letra grande en horizontal el micro se sale de la pantalla. Primero `setTextZoom` con tope; luego el ajuste «Pequeña/Normal/Grande» escalando solo el texto (A4 §REG-M-05, ~3–4 días) |
| UX-01 | MEDIA | La mascota aún explica el gesto del «candado», que no existe desde la 5.9 |
| UX-02 | ALTA (A5) | Muchas correcciones a la vez para un A2 (choca con P3b: decidir; propuesta `important` + plegar las menores) |
| UX-03/04 | MEDIA | Informe con metas de B2 y tres cifras distintas de velocidad |

### P3–P4 · backlog
REG-M-09 «ten:zero» en la fonética · REG-M-03 prueba de sonido en un paso (propuesta del dueño, diseño en A5 §Pruebas de voz)
· MOV-2/REG-A4-04 `confirm()` nativos · REG-A4-05…09 menores · REG-A1-06/07/08 · REG-A2-01…07 (CSP, prompt sin
delimitar, gracia de huella, caché, «Pregúntale» con tipos raros, nombre de auriculares en logcat) · aviso de fonética
repetido al reanudar · «Remember:at» sin espacio · CPU en reposo en el debug (28–52 % + renderer 18–28 %; el JS está
inactivo, cuesta pintar la mascota: comparar con la release antes de abrir NC).

## 3. Propuestas de producto (no son fallos)
- **A5 · Motivación (5.11):** 10 rápidas (comodín de racha, informe frente a ti mismo, hitos, correcciones según nivel,
  variedad del profe…) y 7 grandes (memoria ligera del alumno, roleplays con misión, plan como viaje con la mascota…).
- **REG-M-03 · prueba de sonido:** «Si me oyes, dime: *blue sky*» sin tocar, grabación automática tras la voz, comprobación
  local, salida «No te oigo», solo tras la bienvenida y la clave, y solo con auriculares nuevos.
- **Tamaño de letra** (REG-M-05) y **contenido**: 27 cambios listos en `evidencia/A3/propuesta-contenido.json`.

## 4. Pendiente
- 5.15 · Comprobar en la app de uso diario (release, no inspeccionable) que Progreso muestra tus sesiones y errores.
- 5.4b · Repetir «guardar los auriculares a mitad de grabación» marcando los tiempos (el aviso llegó 55 s tarde).
- 5.7 · Qué se vio en la 1.ª grabación tras pedir ideas (¿aviso de `echoesIdea`?).
- R24 / A11: letra del sistema (`font_scale`) y horizontal en el Galaxy de la madre.
- Decisiones del dueño: qué entra en la 5.10.1, UX-02 frente a P3b, «coger» (REG-A3-18), archivar evidencias antiguas.
