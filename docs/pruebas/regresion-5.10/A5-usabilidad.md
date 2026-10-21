# A5 · Mercado, usabilidad y motivación — Regresión 5.10 (build 40)

> Agente A5 · 2026-10-20 · rama `v5.10-gramatica` · solo análisis (sin cambios en `src/`, sin teléfono).
> Base: README, CLAUDE.md, BACKLOG, `docs/estado-actual.md`, `docs/decisiones.md`, código (`src/lib/*`, `src/screens/Home.tsx`,
> `NoticeGate.tsx`, `ReportView.tsx`, `src/grammar/*.json`) y capturas reales (`docs/v5.10/evidencia-D1/`, `evidencia-D2D3/`,
> `evidencia-510b/`, `docs/correccion/evidencia-movil/R19-inicio.png`). Búsquedas web del 2026-10-20 (fuentes al final).

## 0 · Veredicto

**Habla ya hace lo más difícil mejor que casi toda la competencia** (conversación por voz con corrección exhaustiva + repaso
espaciado oral + test MCER + plan + fonética por fonema), y sin suscripción. **Su punto débil no es el aprendizaje, es el
«volver mañana»:** la única recompensa es un número de racha, el feedback está pensado para un B1-B2 analítico (el dueño) y no
para una A2 no técnica (su madre), y varias piezas tienen un formato fijo que se agota en 2–3 semanas (ejercicios de Gramática,
consejos de la mascota, estructura de la clase, informe).

| Área | Estado | Riesgo |
|---|---|---|
| Eficacia pedagógica (voz, corrección, FSRS) | Muy buena, por encima de Speak/Duolingo en profundidad | Bajo |
| Usabilidad para el dueño | Buena | Bajo |
| Usabilidad para la madre (A2, no técnica, horizontal) | Aceptable, con sobrecarga de información | **Medio** |
| Motivación a medio plazo (semanas 3–12) | Débil: pocas recompensas, poca variedad de formato, sin hitos | **Alto** |
| Textos obsoletos / incoherentes | 3 casos detectados | Medio (rápidos de arreglar) |

Hallazgos de usabilidad: **12** (0 críticos, 2 altos, 7 medios, 3 bajos). Propuestas: **10 rápidas** (cabe en una 5.11) y **7 grandes**.

---

## 5.1 · Estudio de mercado

### 5.1.1 Tabla comparativa general

| App | Propuesta de valor | Práctica oral | Feedback de pronunciación | Precio (orientativo, 2026) |
|---|---|---|---|---|
| **Duolingo** (Super / **Max**) | Curso gamificado de todo, «5 min al día» | Ejercicios cortos de repetir; en Max: **Video Call** con Lily (avatar, tiempo real, **recuerda lo que hablasteis**) y **Roleplay** con personajes y análisis al final | Reconocimiento indulgente; sin fonemas | Max ≈ 29,99 $/mes o ≈ 168 $/año; «Explain My Answer» pasó a gratis en 2026 [1][2][3] |
| **Speak** | Hablar desde el día 1 con un tutor IA (equipo respaldado por OpenAI) | Frases nativas → práctica → conversación; **roleplays con 3 tareas**, Free Talk con roles y escenario a elegir, drills de repetición | Reconocimiento preciso pero «demasiado indulgente» (acepta errores con nota perfecta) | Premium / Premium Plus; Plus añade lecciones a medida a partir de tus errores; precio poco claro [4][5] |
| **ELSA Speak** | Pronunciación: nota por sonido al instante | Frases y diálogos para repetir; poca conversación libre | **Su fuerte**: nota por palabra/sonido; críticas: insiste en un sonido y no en el resto de la palabra | ≈ 90 $/año tras 7 días gratis; quejas de cobros y reembolsos [6] |
| **Praktika** | Tutores avatar IA con personalidad y acentos | Conversación con avatar que adapta el ritmo | Básico | ≈ 40–50 $/año en App Store EE. UU.; quejas: tutores difíciles para principiantes, «no espera a que contestes», cobros [7] |
| **Babbel** (+ **Babbel Speak**) | Curso estructurado por lingüistas | Babbel Speak: escenarios de la vida real (café, hotel) guiados por IA, gratis en muestra | Limitado frente a apps de conversación | ≈ 10 $/mes básico; precios cambiantes [8] |
| **Cambly** | Profes humanos nativos bajo demanda | Clase con persona real | El del profe (variable) | 40–150 $/mes; calidad de tutor irregular, renovaciones automáticas [9] |
| **Busuu** | Curso + **comunidad** que corrige | Ejercicios hablados corregidos por nativos; IA Conversations en Premium Plus | Comunitario, a veces erróneo | ≈ 14 $/mes u 83 $/año [10] |
| **Loora** | Tutor IA de inglés conversacional, escenarios de trabajo | Conversación + escenarios (charla, negocios) | Pronunciación, gramática y reformulación en tiempo real | 14,99–19,99 $/mes; 59,99–149,99 $/año [11] |
| **Habla** | Profe IA de voz **personal**, con test MCER, plan de 12 semanas, repaso oral y fonética real | Conversación libre, temas con noticias reales, 5 prácticas, lección del plan, clase de Gramática, «Dilo tú» | Azure por **fonema** (opcional) + corrección de **todos** los errores gramaticales | Coste de la clave del usuario (Gemini con capa gratuita; Azure F0 5 h/mes gratis) |

### 5.1.2 Mecánicas de motivación y retención

| Mecánica | Duolingo | Speak | ELSA | Praktika | Babbel | Busuu | Loora | **Habla** |
|---|---|---|---|---|---|---|---|---|
| Racha diaria | ✅ (núcleo) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (solo número) |
| Protector de racha / reparación | ✅ (freeze, hasta 2; reparación con gemas) [12] | — | — | — | — | — | — | ❌ |
| XP / ligas / clasificación | ✅ | — | parcial | — | — | — | — | ❌ (y no aplica: uso personal) |
| Misiones diarias / semanales | ✅ (Quests, Friends Quests) [12] | parcial | ✅ | — | — | — | — | Parcial: «misión» de la lección del plan |
| Social (amigos, retos compartidos) | ✅ (Friend Streak) | — | — | — | — | ✅ comunidad | — | ❌ |
| Personajes con personalidad | ✅ (Lily, Lin, Eddy…) | — | — | ✅ avatares | — | — | parcial | ✅ 4 mascotas animadas + secreto |
| **Memoria entre sesiones** | ✅ (Lily recuerda) [3] | parcial | — | ✅ | — | — | ✅ | ❌ **prohibido en el prompt** (`teacher.ts:175`) |
| Narrativa / progreso en mapa | ✅ (ruta) | ✅ (curso) | ✅ | — | ✅ | ✅ | — | Parcial: plan de 12 semanas (lista) |
| Recompensa variable | ✅ (cofres, gemas) | — | — | — | — | — | — | Parcial: noticias reales, «Sorpréndeme», secreto de la mascota |
| Notificaciones | ✅ agresivas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 1/día con la mascota, sin repetir si ya practicaste |
| Celebración de hitos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (solo `SoundTest` celebra) |
| Medición de progreso real | Débil (XP ≠ nivel) | Débil | Nota de pronunciación | Débil | Test por unidad | Certificados | Débil | **Fuerte**: test MCER 70/30, fluidez, fonética |

### 5.1.3 Qué critican los usuarios (y qué enseña a Habla)

| Crítica recurrente | Dónde | Lección para Habla |
|---|---|---|
| **Gamificación vacía / presión**: la racha se vuelve una obligación; ansiedad por ligas; ciclos de enganche y abandono total | Duolingo [13][14][15] | No copiar ligas ni XP. Racha **amable** (comodín) y recompensas ligadas a **logros de aprendizaje**, no al tiempo en la app |
| Monetizar la frustración (vidas/energía que se gastan, pagar por reparar la racha) | Duolingo (energía 2025, gemas) [12][16] | Habla no cobra: puede ofrecer gratis lo que otros venden (comodín, repetir) |
| **Repetitividad** en niveles altos; poca variedad de lecciones | Speak [5] | Riesgo directo de Habla (ver 5.3): misma estructura de clase cada día |
| Reconocimiento **indulgente** que da falsa confianza | Speak, Duolingo [5][2] | Ventaja de Habla (corrige todo + Azure); cuidar que no pase al otro extremo con una A2 |
| Feedback superficial, sin explicar patrones | Speak [5] | Ventaja de Habla (explicación por error + enlace a Gramática) |
| Insiste en un sonido y no en la palabra | ELSA [6] | Habla da «palabras a cuidar» por fonema: bien; falta práctica guiada de ese sonido (shadowing) |
| El tutor IA no espera a que contestes / difícil para principiantes | Praktika [7] | Habla es «toca para hablar, toca para enviar»: bien resuelto |
| Correcciones de la comunidad erróneas | Busuu [10] | No aplica |
| Cobros, renovaciones, reembolsos | ELSA, Praktika, Cambly [6][7][9] | Habla no tiene; su barrera es la **clave propia** (ya mitigada con el tutorial) |
| Hablar con una IA nunca sustituye a una persona | Duolingo Max [2] | Relación: la mascota/profe debe sentirse **alguien que te conoce** (memoria), no un examen |

**Posicionamiento:** Habla está en el cuadrante «mucha profundidad, poca gamificación», justo el opuesto de Duolingo. La
investigación con apps de idiomas basada en SDT apunta a que lo que sostiene la motivación es sobre todo **competencia y
relación** (Duolingo, 247 estudiantes) o **autonomía y relación** (app IA, 76 estudiantes) [17]: en ambos casos la **relación**
pesa, y es la necesidad que Habla cubre peor.

---

## 5.2 · Evaluación de usabilidad

### 5.2.1 Perfiles

| | Dueño | Madre |
|---|---|---|
| Nivel | B1 (habla A2) | A2 o menos |
| Perfil técnico | Ingeniero; tolera métricas y ajustes | No técnica; pantalla dañada, horizontal forzado, Galaxy A11 (320×640 escalado) |
| Motivación | Instrumental (trabajo), analítica: le gustan los números | Probablemente social/afectiva: necesita sentir que avanza y que «lo hace bien» |
| Riesgo | Aburrirse de la estructura repetida | Sentirse abrumada por correcciones y cifras, y no saber qué tocar |

### 5.2.2 Heurísticas de Nielsen — resumen

| # | Heurística | Valoración | Comentario |
|---|---|---|---|
| H1 | Visibilidad del estado | ✅ Buena | Anillo de 60 s, barras de voz, «Abriendo el micro… espera», «Clase en progreso» |
| H2 | Lenguaje del usuario | 🟡 | Español cercano, pero métricas técnicas (ppm, «palabras/resp.», «meta B2») y Ajustes con Azure Monitor/service principal |
| H3 | Control y libertad | ✅ | Papelera, Terminar, Posponer, Atrás coherente, «Ya me la sé» |
| H4 | Consistencia | 🟡 | Meta de velocidad con 3 cifras distintas; consejo del candado obsoleto (UX-01, UX-04) |
| H5 | Prevención de errores | ✅ | Confirmación al salir, pausa única del test explicada, comprobación de la clave |
| H6 | Reconocer mejor que recordar | ✅ | Inicio sin scroll, globos con botón de acción |
| H7 | Flexibilidad | ✅ | Teclado, modo oído, velocidad, ES, «¿Qué digo?» |
| H8 | Diseño minimalista | 🟡 | Informe con 6 cifras + 4 bloques; corrección de todos los errores a la vez |
| H9 | Recuperarse de errores | 🟡 | Hoja de problemas de Gemini muy buena; pero un error del plan sale en crudo en el Inicio (UX-05) |
| H10 | Ayuda | ✅ | Mascota que explica, `HelpPoint`, tutorial |

### 5.2.3 Hallazgos (UX-nn)

Severidad: **Alta** (afecta al aprendizaje o hace abandonar), **Media** (confunde o frustra), **Baja** (pulido). Prioridad P1–P3.

| ID | Sev. | Prio. | Perfil | Hallazgo | Evidencia | Propuesta |
|---|---|---|---|---|---|---|
| **UX-01** | Media | **P1** | Ambos | **Consejo obsoleto de la mascota**: «Desliza el micrófono hacia arriba hasta el candado y podrás hablar sin mantener el dedo. Hacia la izquierda, cancelas.» Desde la 5.9 el micro es «toca para hablar, toca para enviar» y no hay candado ni deslizamiento. La mascota enseña un gesto que no existe. | `src/lib/mascotTips.ts:92` (`a-lock`); `src/components/talkGesture.ts:3-5` | Cambiar por «Toca el micro para hablar y otra vez para enviar. La papelera descarta la grabación.» Añadir un test que impida textos con «mantén»/«candado» |
| **UX-02** | **Alta** | **P1** | Madre (y dueño A2 al hablar) | **Correcciones sin tope por nivel**: el prompt exige listar «EVERY real error» de cada respuesta; con una A2 que dice 3 frases puede haber 4–6 tachados a la vez en cada turno. Es la causa típica de ansiedad y de abandono en principiantes. Ya estaba en el BACKLOG §1 «adaptar al nivel la cantidad de correcciones» (pendiente). | `src/lib/teacher.ts:195`; `BACKLOG.md` §1 | Mantener el dato completo (decisión P3b del dueño), pero **mostrar** primero 1–2 (las del objetivo/ más graves) y plegar «Ver otras N» en A1–A2. Ver P-02 (señala el conflicto con P3b) |
| **UX-03** | **Alta** | P2 | Madre | **Informe calibrado para B2**: velocidad con «meta B2: 110+», «palabras/resp. meta: 30+»; la nota de fluidez tiene suelo 45 ppm y objetivo 125 ppm. Una A2 sale casi siempre con cifras «en rojo» respecto a la meta; ninguna comparación con su propia evolución. | `src/components/ReportView.tsx:39-40`; `src/lib/fluency.ts:32-33,54-60` | Comparar **consigo misma** («+8 ppm que tu media») y metas por nivel (A2: 60–80 ppm, 10–15 palabras). Ver P-07 |
| **UX-04** | Media | P2 | Ambos | **Tres metas de velocidad distintas**: consejo «la meta ronda las 120» (`mascotTips.ts:88`), informe «meta B2: 110+» (`ReportView.tsx:39`), nota calculada con objetivo 125 (`fluency.ts:33`). | citados | Una única constante por nivel, usada en consejo, informe y nota |
| **UX-05** | Media | P2 | Madre | **Error técnico en crudo en el Inicio**: «Gemini no devolvió el plan completo. Inténtalo de nuevo.» en rojo, ocupando la tarjeta de la lección, sin la mascota. Contradice la decisión «la mascota explica las cosas». | `docs/correccion/evidencia-movil/R19-inicio.png`; `src/components/PlanCard.tsx` | Mensaje de la mascota («Hoy no he podido preparar tu lección; mientras, ¿charlamos de…?») con un tema alternativo en un toque |
| **UX-06** | Media | P2 | Ambos | **La «Tarea para mañana» no se puede hacer en la app**: Gemini propone p. ej. «Graba 1 minuto contando…», se muestra en el informe y en un aviso a pantalla completa (`NoticeGate`), pero no hay botón para hacerla ni se marca como hecha. Es una promesa sin cierre (efecto Zeigarnik desaprovechado). | `src/lib/fluency.ts:138`; `src/screens/NoticeGate.tsx:136-159` (solo «Siguiente/Entrar») | Botón «Hacerla ahora» que abre una clase corta con la tarea como brief; marca ✓ y cuenta para la meta. P-05 |
| **UX-07** | Media | P2 | Madre / amistades | **Barrera de entrada larga**: tutorial + clave + perfil + 3 temas + test (README dice «12–15 minutos», `NoticeGate` dice «unos 25 minutos») antes de la primera conversación. | `README.md` «Test de nivel»; `src/screens/NoticeGate.tsx:172-174` | Unificar la duración real; ofrecer **una charla de 2 minutos con la mascota antes del test** (gancho emocional antes del esfuerzo) — choca con «test obligatorio antes de usar la app», ver P-15 |
| **UX-08** | Media | P3 | Madre | **Repaso: decisión de intervalo en cada tarjeta** (4 botones «10 min / 9 días / 13 días / 22 días» + «Ya me la sé»), obligatoria para pasar. Para el dueño es autonomía; para la madre, carga cognitiva repetida 10 veces por sesión. | `docs/v5.10/evidencia-510b/04-390-aun-no.jpg`; README «Repaso espaciado» | Ajuste «Que decida Habla» (aplica la sugerencia y pasa sola tras 3 s, se puede cambiar) |
| **UX-09** | Media | P3 | Ambos | **«Nivel al hablar hoy: B1+»** en el informe sale de la nota de fluidez (`scoreLevel`), no del nivel MCER. Puede confundir con la política de niveles (solo el re-test cambia el nivel) y crear falsas expectativas o decepción. | `docs/v5.10/evidencia-D2D3/g-informe-390x844.png`; `src/lib/fluency.ts:78-84`; `docs/decisiones.md` «Política de niveles» | Renombrar a «Hoy has sonado como un B1+» con nota «(tu nivel oficial lo fija el test)» o quitarlo para A1–A2 |
| **UX-10** | Baja | P3 | Madre | **320×640**: en la pestaña Gramática la lista queda casi entera tapada por la barra inferior; el título «Gota te espera» parte en dos líneas. (A4 lo cubre en detalle.) | `docs/v5.10/evidencia-D1/13-inicio-gramatica-320x640.jpg` | Ver A4 |
| **UX-11** | Baja | P3 | Ambos | **Hueco vacío** en el Inicio (pestaña Temas, 390×844): ~25 % de la pantalla sin uso, mientras otras cosas (racha, progreso semanal) no se ven. | `R19-inicio.png` | Usarlo para el progreso visible (P-03/P-11) sin romper «sin scroll» |
| **UX-12** | Baja | P3 | — | README desfasado: «Si el globo lleva una flecha, tócalo» (desde la 5.8 es un botón con texto). | `README.md` §Inicio; `docs/decisiones.md` «Globos» | Corregir texto |

---

## 5.3 · Riesgo de aburrimiento y motivación

### 5.3.1 Mapa de riesgos de repetición

Probabilidad = cuánto antes se nota; impacto = cuánto empuja a dejar la app.

| # | Pieza | Qué se repite | Evidencia | Cuándo se nota | Prob. | Impacto |
|---|---|---|---|---|---|---|
| R-01 | **Estructura de cada turno del profe** | Siempre 1–3 frases y **siempre** una pregunta abierta al final → sensación de interrogatorio | `teacher.ts:185,188` («ALWAYS end your reply with exactly one open question») | 1.ª semana | Alta | Alto |
| R-02 | **Sin memoria del alumno** | Cada clase empieza «de cero»; el profe no recuerda que ayer hablaste de tu nieta o de tu viaje | `teacher.ts:175` («Do NOT mention previous lessons. Each lesson is a fresh conversation») | 2.ª semana | Alta | **Muy alto** (relación) |
| R-03 | **Ejercicios de Gramática fijos** | 6–8 ejercicios por tema (667 en 90 temas), siempre los mismos; solo se barajan las opciones | `src/grammar/*.json` (medido: mín. 6, máx. 8); `GrammarExercises.tsx:139` (`shuffleChoice`) | 2.ª ronda del mismo tema | Alta | Medio |
| R-04 | **Formato del repaso** | Siempre «frase en español → dila en inglés» (o hueco de Gramática), 4 botones de intervalo | `src/lib/srs.ts:188-197` | 2.ª semana | Alta | Medio |
| R-05 | **Arco del plan** | Cada una de las 12 semanas sigue igual: descubrir → practicar ×2 → role-play → reto libre; las 5 «kinds» son solo 5 | `src/lib/plan.ts:282-283` (reglas), `:17` (`LessonKind`) | Semana 3–4 | Media | Medio |
| R-06 | **Consejos de la mascota** | 16 consejos fijos en rueda (`rotate`); a 1 globo cada 40–75 s se agotan en ~3–4 visitas largas al Inicio | `mascotTips.ts:84-101,113-118` | 1.ª–2.ª semana | Alta | Bajo (se pueden apagar) |
| R-07 | **Avisos diarios** | Mismas plantillas cada día: «Aún no has hablado hoy. ¿Hacemos tus 5 minutos?», «Un poco cada día…» | `mascotTips.ts:44-55` | 1.ª semana | Alta | Bajo-medio |
| R-08 | **Informe final** | Mismo layout: nota, 6 cifras, cómo te fue, lo que hiciste bien, para mejorar, tarea; sin comparación con días anteriores | `ReportView.tsx`, captura `g-informe-390x844.png` | 2.ª semana | Alta | Medio |
| R-09 | **Prácticas guiadas** | 5 fijas (puntos débiles, entrevista, a qué me dedico, debate, historia); la entrevista y «a qué me dedico» se agotan para quien no trabaja (madre) | `src/lib/scenarios.ts` | 3.ª semana | Media | Medio |
| R-10 | **Recompensas** | La única es el número de la racha; no hay hitos, ni celebración, ni colección | `grep` sin resultados de logros/medallas; `stats.ts:86-90` | Semana 2–3 | Alta | **Alto** |
| R-11 | **Racha sin red** | Un día malo la pone a 0; sin comodín. Romper una racha larga es un momento clásico de abandono [12][13] | `stats.ts:83-90` | Primera vez que se rompe | Media | Alto |
| R-12 | **Correcciones abrumadoras (A2)** | Muchos tachados por turno (ver UX-02) | `teacher.ts:195` | 1.ª clase de la madre | Alta | Alto |
| R-13 | **Temas** | 12 categorías; las 6 sin noticia real (comida, viajes, dinero, ¿y si…?) se repiten antes | `topics.ts:16-29` | Mes 1 | Baja | Bajo (la noticia real es un buen antídoto) |

**Lo que ya protege bien contra el aburrimiento:** noticias reales con Google Search (novedad de verdad), «Sorpréndeme» que evita
los últimos temas, el profe con instrucción de «abrir un ángulo nuevo cada pocos intercambios» (`teacher.ts:164`), el plan que
se genera por semanas según tus errores, los secretos de las mascotas y el debate con postura contraria.

### 5.3.2 Self-Determination Theory (autonomía, competencia, relación)

| Necesidad | Lo que Habla ya da | Lo que falta |
|---|---|---|
| **Autonomía** | Elegir tema, tema libre, prácticas, adelantar semanas, elegir el intervalo del repaso, teclado, modo oído | Elegir **cómo** es la clase (corta/larga, reto/charla), elegir el objetivo de la semana entre 2–3, decidir cuántas correcciones ver |
| **Competencia** | Test MCER, re-test antes→después, nota de fluidez, fonética por fonema, «Lo que hiciste bien» | Progreso **visible y frecuente** (no solo cada 4 semanas): «hace 3 semanas decías 40 ppm, hoy 62»; hitos; metas a su nivel (UX-03); menos tachados (UX-02); dominio por tema de Gramática visible en el Inicio |
| **Relación** | Mascota con nombre, personalidad, animaciones, secreto; profe cálido | **Memoria** (R-02); que la mascota reaccione a tu vida («¿Qué tal salió la entrevista?»); compartir logros con la familia (la madre y el hijo usan la misma app) |

### 5.3.3 Octalysis (8 impulsores)

| Impulsor | Habla | Comentario |
|---|---|---|
| 1. Significado épico | 🟡 | «Para qué quieres el inglés» está en el perfil, pero no vuelve como relato («vas camino de tu entrevista en inglés») |
| 2. Desarrollo y logro | 🟡 | Test y plan existen; faltan hitos intermedios y celebración |
| 3. Creatividad y feedback | ✅ | Conversación libre, tema libre, debate: el alumno crea frases propias, feedback inmediato |
| 4. Propiedad y posesión | 🟡 | Palabras guardadas, tarjetas, «Ya las sé»; nada que la mascota «gane» |
| 5. Influencia social | ❌ | Nada (aceptable sin backend, pero hay salida local: compartir una tarjeta) |
| 6. Escasez e impaciencia | 🟡 | Re-test cada 4 semanas, lecciones por semana |
| 7. Imprevisibilidad y curiosidad | ✅/🟡 | Noticias reales, Sorpréndeme, secreto de la mascota; el resto es predecible |
| 8. Pérdida y evitación | 🟡 | Racha sin comodín (solo «palo»); bien que no haya vidas/energía |

Habla se apoya en los impulsores «de sombrero blanco» (3, 2) y apenas usa los «negros» (6, 8): **eso es sano** y la diferencia
de Duolingo; lo que falta es **2 (logro visible)**, **1 (relato)** y **5/relación**.

### 5.3.4 Modelo Hook (disparador → acción → recompensa variable → inversión)

| Fase | Habla hoy | Hueco |
|---|---|---|
| Disparador externo | Recordatorio diario con la mascota y la lección del día (bien hecho) | El texto del aviso es fijo; podría llevar un gancho variable («Hoy hay noticia de tu equipo…») |
| Disparador interno | «Quiero hablar inglés para…» | No se refuerza |
| Acción | Un toque a «Empezar» o al tema: bajo esfuerzo ✅ | En la madre, el test inicial largo antes de la primera acción (UX-07) |
| Recompensa variable | Noticias reales; la respuesta del profe | Sin recompensas «de la tribu» (relación) ni «del yo» (hitos) |
| Inversión | Palabras guardadas, tarjetas de repaso, perfil | La inversión no se ve: el alumno no ve «su colección» crecer en el Inicio |

---

## 5.4 · Propuestas priorizadas

Criterios: sin backend, uso personal, clave propia (cada llamada cuesta cuota), internet lento, Android/Capacitor sin plugins
nativos nuevos. **Impacto** y **esfuerzo**: A/M/B. «⚠️ decisión» = choca con `docs/decisiones.md` o con una decisión del dueño.

### Rápidas (caben en una 5.11, sin llamadas extra a Gemini salvo donde se indica)

| ID | Propuesta | Ataca | Impacto | Esfuerzo | Notas / encaje |
|---|---|---|---|---|---|
| **P-01** | Corregir el consejo del candado y el texto de la flecha del README; test que recorra `buildAdvice` buscando «mantén», «candado», «desliza» | UX-01, UX-12 | M | **B** | Inmediato |
| **P-02** | **Correcciones por nivel en la UI**: en A1–A2, mostrar 1–2 correcciones (la del objetivo de la lección/tema primero, luego la más grave) y plegar «Ver otras N». Todas siguen guardándose y van al repaso | UX-02, R-12 | **A** | B-M | ⚠️ decisión P3b («corrige todos los errores»): no se cambia el prompt, solo la presentación; consultar al dueño |
| **P-03** | **Hitos con celebración de la mascota** (local, sin IA): racha 3/7/14/30; 10/50/100 frases del repaso; primer tema de Gramática dominado; 1.ª clase de más de 5 min; primera semana del plan completa. Mascota en `mood="happy"` + frase propia de su personalidad; registro en Progreso → «Tus logros» | R-10, SDT competencia | **A** | B-M | Recompensa ligada a aprendizaje, no a tiempo. Cuidar CPU/batería (animación corta) |
| **P-04** | **Comodín de racha gratis**: 1 día de descanso por semana que no rompe la racha (automático, la mascota lo cuenta: «Ayer descansaste; tu racha sigue a salvo») | R-11 | **A** | **B** | Duolingo midió más actividad diaria al permitir 2 freezes [12]; aquí sin gemas |
| **P-05** | **Tarea accionable**: botón «Hacerla ahora» en el aviso y en el informe → clase corta (escenario oculto como `plan`/`grammar`) con la tarea como brief; ✓ hecha | UX-06 | M-A | B-M | Reutiliza el patrón de escenarios ocultos |
| **P-06** | **Variedad en el turno del profe**: cambiar «ALWAYS end with a question» por una mezcla (≈70 % pregunta; el resto reacción + mini-reto: «dime 3 razones», «cuéntamelo como si fuera un chisme», «corrige mi frase»). Coste: 0 llamadas extra | R-01 | M-A | **B** | Solo prompt (`teacher.ts:188`); A3 debería revisarlo |
| **P-07** | **Informe «contra ti mismo»**: cada cifra con flecha frente a tu media de las últimas 5 clases y metas por nivel; quitar «meta B2» para A1–A2; unificar la meta de velocidad | UX-03, UX-04, UX-09, R-08 | **A** | B | Datos ya en Dexie (`sessions`) |
| **P-08** | **Errores en el Inicio con la mascota**: `PlanCard` con `MascotSays` y una alternativa en un toque («mientras, charlemos de tu tema favorito») | UX-05 | M | B | Coherente con la decisión «la mascota explica» |
| **P-09** | **Consejos y avisos con variantes**: 3–4 redacciones por aviso (`goal`, `streak`) elegidas al azar, y consejos «de temporada» que se jubilan tras verse 2 veces | R-06, R-07 | B-M | **B** | Sin IA |
| **P-10** | **Repaso «que decida Habla»** (ajuste) + pase automático tras 3 s; y **variedad de formato** gratuita: una de cada 4 tarjetas en modo «escucha y repite» (TTS del inglés → el alumno lo repite; misma evaluación) | UX-08, R-04 | M | M | El modo «escucha y repite» es el embrión del shadowing (BACKLOG B) |

### Grandes (1 versión menor propia o más)

| ID | Propuesta | Ataca | Impacto | Esfuerzo | Notas / encaje |
|---|---|---|---|---|---|
| **P-11** | **Memoria ligera del alumno**: al terminar cada clase, el informe (que ya se pide a Gemini) devuelve 1–3 «hechos personales» breves (p. ej. «tiene un nieto que se llama…», «el viernes tiene una entrevista»), guardados en local y editables/borrables en Ajustes. El profe recibe los 5 últimos y puede preguntar por uno al empezar | R-02, SDT relación | **Muy A** | M | ⚠️ decisión del prompt `teacher.ts:175` («no mencionar lecciones anteriores», para que no se cuelen temas). Propuesta: solo **hechos de vida**, nunca frases ni temas; privacidad: se quedan en el teléfono y entran en la copia (sin claves). Es lo que Duolingo vende con Lily [3] |
| **P-12** | **Roleplays con misión y desenlace** («situaciones a medida», BACKLOG C): el alumno describe una situación real o elige una de una lista (médico, farmacia, aeropuerto, llamar a un fontanero, reunión); el profe fija 3 objetivos visibles que se tachan al cumplirse y cierra con «¡Lo conseguiste!». Para la madre: situaciones de viaje/familia en lugar de entrevista | R-09, R-05 | A | M | Patrón de Speak [5]; un único brief + esquema con `goals_met`. Encaja: BACKLOG C ya aprobada a debatir |
| **P-13** | **Narrativa de la mascota en el plan**: el plan de 12 semanas como **viaje** (un mapa con 12 paradas temáticas); la mascota «gana» algo visible por hitos de aprendizaje (accesorio, color, nueva animación, un dato de su secreto). Nada se compra | Octalysis 1, 2, 4 | A | M-A | Reutiliza `Mascot.tsx` (SVG). Cuidar el rendimiento de animaciones (decisión 5.7/5.8.2) |
| **P-14** | **Retos semanales personales** generados de tus errores frecuentes (`frequentStructures` ya existe): «Esta semana: cuenta 3 historias en pasado con menos de 2 pausas» con barra de progreso medida localmente | R-05, SDT competencia/autonomía | A | M | Una llamada a Gemini por semana (ya se hace al preparar la semana) |
| **P-15** | **Primera conversación antes del test** (2 min con la mascota, sin corrección) para la gente nueva | UX-07 | M | M | ⚠️ decisión «test obligatorio antes de usar la app» y «el primer test fija el nivel»: no se cambia el nivel; consultar al dueño |
| **P-16** | **Shadowing + fonemas** (BACKLOG B y 4.5): practicar las «palabras a cuidar» con modelo TTS y Azure; sección de fonemas enlazada | R-04, ELSA | A | A | Consume minutos de Azure F0; ya anotado para después de la 5.10 |
| **P-17** | **Relación familiar sin backend**: «Tarjeta de la semana» (imagen con la mascota, racha, minutos, logro) para compartir por WhatsApp con `@capacitor/share` (ya instalado); y **reto entre dos** por código (cada uno introduce el código del otro y la app compara solo lo que el otro le envía en la tarjeta) | Octalysis 5, SDT relación | M | M | Sin servidor ni cuentas; sin datos sensibles en la tarjeta |

### Mejoras de interfaz concretas (complementan lo anterior)

1. **Inicio**: aprovechar el hueco inferior (UX-11) con una línea de progreso semanal (7 puntos de la semana, color del tema) y el próximo hito («3 días para tu racha de 7»).
2. **Modo sencillo para la madre** (ajuste «Inicio simple»): un botón grande «Mi clase de hoy» que decide por ella (lección del plan → repaso → charla), y oculta Prácticas/Gramática hasta que lo pida. Encaja con «sin scroll» y con horizontal.
3. **Correcciones**: color por tipo (gramática/vocabulario/orden) y ▶ para oír la correcta ya existe; añadir «Repítela» (decirla en voz alta) en un toque.
4. **Ajustes**: agrupar Azure Monitor/Resource ID bajo «Avanzado» plegado (H2).
5. **Plan**: mostrar la misión de la lección también al terminar («Misión cumplida ✓ / casi») — hoy la misión solo se enseña al principio.

### Matriz impacto × esfuerzo

| | Esfuerzo bajo | Esfuerzo medio | Esfuerzo alto |
|---|---|---|---|
| **Impacto alto** | P-02, P-04, P-06, P-07 | P-03, P-11, P-12, P-14 | P-13, P-16 |
| **Impacto medio** | P-01, P-08, P-09 | P-05, P-10, P-15, P-17 | — |

**Orden recomendado:** 5.11 «Motivación» = P-01 + P-07 + P-04 + P-02 (tras consultar) + P-06 + P-08 + P-03 → 5.12 = P-11 + P-05 +
P-12 → después P-14, P-13, P-16, P-17.

---

## Fuentes

1. Nibble — «Is Duolingo Max Worth It? A Real Look at the AI Upgrade in 2026»: https://nibble-app.com/blog/is-duolingo-max-worth-it
2. StoryLearning — Duolingo Max review: https://storylearning.com/duolingo-max-review · Copycat Café — Duolingo Max Review: https://copycatcafe.com/blog/duolingo-max · Duoplanet newsletter: https://newsletter.duoplanet.com/posts/another-new-feature-for-duolingo-max
3. Duolingo Blog — Duolingo Max (Video Call, Roleplay): https://blog.duolingo.com/duolingo-max
4. Capterra — Speak: https://www.capterra.com/p/10018279/Speak/ · Tool Directory — Speak: https://tooldirectory.ai/tools/speak
5. LanguaTalk — «Speak App Review: Is It Worth It In 2026?» (sitio de un competidor): https://languatalk.com/blog/speak-app-review/
6. Capterra — ELSA Speak reviews: https://www.capterra.com/p/240698/ELSA-Speak/reviews?page=2 · G2: https://g2.com/products/elsa-speak/reviews?page=10 · GetApp: https://www.getapp.com/emerging-technology-software/a/elsa-speak/ · Headway: https://makeheadway.com/blog/elsa-speak-review/
7. App Store — Praktika: https://apps.apple.com/us/app/-/id1624701477 · Trustpilot — Praktika: https://ie.trustpilot.com/review/praktika.ai?page=6 · Tool Directory: https://tooldirectory.ai/tools/praktika
8. TestPrepInsight — Is Babbel worth it: https://testprepinsight.com/resources/is-babbel-worth-it/ · Tooliverse — Babbel: https://tooliverse.ai/tools/babbel · Copycat Café — Babbel: https://copycatcafe.com/babbel
9. Leonardo English — Cambly review: https://www.leonardoenglish.com/blog/cambly-review · Trustpilot — Cambly: https://ca.trustpilot.com/review/cambly.com · EduReviewer: https://edureviewer.com/tutoring/cambly-review/
10. LearnEnglish.life — Busuu 2026: https://www.learnenglish.life/reviews/busuu/ · FluentU — Busuu review: https://www.fluentu.com/blog/busuu-review/ · Capterra — Busuu: https://www.capterra.com/p/210762/Busuu/reviews/
11. App Store — Loora: https://apps.apple.com/us/app/loora-learn-english-with-ai/id1552708303 · Loora: https://www.loora.com/ · Times of Israel: https://www.timesofisrael.com/master-english-fluency-israeli-startup-nabs-9-25m-funding-for-virtual-ai-tutor/
12. Duolingo Blog — How the streak builds habit: https://blog.duolingo.com/how-duolingo-streak-builds-habit · Android Authority — Revive broken streak event: https://androidauthority.com/duolingo-revive-broken-streak-event-3673004/ · Duolingo Wiki — Streak freeze: https://duolingo.fandom.com/wiki/Shop/Streak_freeze
13. «When Gamification Spoils Your Learning: A Qualitative Case Study of Gamification Misuse in a Language-Learning App» (arXiv 2203.16175): https://arxiv.org/pdf/2203.16175
14. Desirability Lab — Duolingo streak mechanic: https://desirabilitylab.com/backfill/backfill-2024-205-duolingo-streak-mechanic
15. Android Authority — Duolingo XP boost UX trap: https://androidauthority.com/duolingo-xp-boost-ux-trap-3674572
16. Android Authority — Quitting Duolingo (energy system): https://androidauthority.com/quitting-duolingo-energy-system-3599842
17. SDT y apps: IATED 2024 (app IA, Taiwán): https://library.iated.org/view/CHEN2024ENH · IATED 2026: https://library.iated.org/view/CHEN2026ENG · IJAL — Smartphone apps as a motivating tool: https://ejournal.upi.edu/index.php/IJAL/article/view/46544 · Alamer & Al Khateeb 2021: https://selfdeterminationtheory.org/wp-content/uploads/2021/04/2021_AlamerAlKhateeb_EffectofWhatsApp.pdf

> Nota de fiabilidad: muchos precios proceden de terceros o de fichas de App Store EE. UU. y cambian a menudo; varias reseñas
> son de sitios con interés comercial (LanguaTalk, PracticeMe, Headway). Se usan como indicio, no como dato verificado.

---

## § Pruebas de voz y audio en el mercado (REG-M-03)

> Encargo añadido el 2026-10-20 (orquestador, a petición del dueño), con tres requisitos que se añadieron por el camino:
> (1) la prueba en **un solo paso**; (2) **sin tocar para grabar**: suena la instrucción y la escucha empieza sola tras un
> pequeño retraso; (3) en la **primera instalación** no debe salir antes de la bienvenida y de guardar una clave de Gemini
> válida (si la verificación usa el modelo). Solo análisis: no se ha tocado `src/`.

### A · Cómo funciona hoy en Habla (código 5.10)

| Pieza | Qué hace | Archivo |
|---|---|---|
| Montaje | `AudioPicker` se monta como **capa superpuesta en todas las pantallas**: bienvenida (`splash`), `Onboarding`, `ProfileSetup`, `FavoritesSetup`, `Calibration` (test de nivel), `NoticeGate` y el resto | `src/App.tsx:301-302, 350-370, 373-388, 393, 434` |
| Disparo | Al montarse llama a `audioState()` y, si hay auriculares, aplica la ruta guardada y lanza la prueba, o abre el selector si son nuevos. **No mira** `settings.onboarded` ni si hay clave | `src/components/AudioPicker.tsx:70-103` (sin referencias a `onboarded`/`geminiKey`) |
| Memoria de «ya probado» | `testedFor` es una variable **de módulo**: se pierde al cerrar la app y al desconectar. La prueba vuelve **en cada arranque** con los auriculares puestos | `AudioPicker.tsx:14, 76, 84, 150` |
| Paso 1 «¿Me oyes?» | Suena `Hi! I'm <mascota>. Can you hear me?` a los 400 ms; título «¿Me oyes?», subtítulo «Prueba de sonido · <auriculares>. Te hablo por tus auriculares.»; botones **«Sí, te oigo» / «No te oigo»** y ▶/⏸ | `src/components/SoundTest.tsx:59-70, 136-157` |
| Paso 2 «Ahora habla tú» | **Sí prueba el micro**: `getUserMedia` (en modo auriculares re-fija el SCO) y nivel RMS por fotograma; pasa con **≥ 500 ms por encima de 0,18**; se rinde a los **12 s**. Pide «Hello, <mascota>!» pero **no comprueba qué se dice** | `SoundTest.tsx:38-41, 73-118, 174-190` |
| Fallo del micro | En auriculares ofrece **«Hablar al micro del teléfono»** (modo `split`); permiso denegado → pantalla propia | `SoundTest.tsx:192-224` |
| Comprobación en cada grabación | `hasSignal` (muestras ≠ 0; 5 s de margen con auriculares, 2 s sin ellos) y `looksMuted` antes de pasar a otro micro | `src/lib/recorder.ts:117-162, 245-262` |
| Ruta | En modo auriculares: `MODE_IN_COMMUNICATION` + `setCommunicationDevice` (SCO). La voz del profe y el micro ya van por el mismo enlace HFP | `android/app/src/main/java/com/shift/habla/AudioRoutePlugin.java:161-245` |

**Dos matices sobre la premisa del encargo:**
1. La prueba actual **sí comprueba el micro** (paso 2), pero en **dos pasos con un toque intermedio**, y el paso 1 («Sí, te oigo»)
   es una autodeclaración que no se verifica.
2. **En la primera instalación con los auriculares conectados, el selector y la prueba salen encima de la bienvenida**, antes
   del tutorial y de la clave (`App.tsx:350-360` monta `picker` sobre `WelcomeScreen`). También pueden salir durante
   `NoticeGate` y **cortar el test de nivel** (`interruptForSoundTest`, `AudioPicker.tsx:66`) si se conectan unos auriculares en
   mitad de una tarea. Hoy la prueba no usa Gemini, así que la clave no es imprescindible, pero el orden confunde a quien
   estrena la app (la madre vería «¿Me oyes?» antes de saber qué es Habla).

### B · Tabla comparativa del mercado

**S** = salida (altavoz/auriculares), **E** = entrada (micro). «Escucha propia» = el usuario se oye a sí mismo grabado.

| Producto / patrón | Valida | Cómo | Reconocimiento de voz | Pasos / tiempo | ¿Escucha sola tras la instrucción? | Bluetooth y fallo | Accesibilidad |
|---|---|---|---|---|---|---|---|
| **Zoom**: Ajustes → Audio («Test Speaker», «Test Mic») y zoom.us/test | S y E por separado | S: tono + «¿lo oyes?»; E: grabas unos segundos y se te reproduce; barra de nivel verde | No (nivel + escucha propia) | 2 pruebas, ~15–30 s, varios toques | No | Desplegable para elegir otro dispositivo | Visual + audio [A1][A2] |
| **Google Meet**: «Check your audio and video» | S y E juntas | Clip privado de ~6 s que se te reproduce; medidor; avisa si el audio es demasiado bajo; muestra la cancelación de ruido | No | 1 clip + reproducción, ~15 s | Al pulsar | Se elige el micro y el altavoz antes | Medidor visual [A3] |
| **Microsoft Teams**: «Make a test call» | **S y E en un flujo** | Un bot habla; **tras un tono graba tu mensaje solo**, te lo reproduce y da un resumen de calidad; la grabación se borra al momento | No (escucha propia + red) | ~30 s, 0 toques durante la prueba | **Sí** (tono → graba) | Al final: cerrar o ir a dispositivos | Mucho audio, poco visual [A4] |
| **Discord**: «Let's Check» y sensibilidad | E | Medidor y retorno; umbral de voz **automático** o manual («por encima del ruido y por debajo de tu voz más baja») | No | Manual | No | Elegir dispositivo; push-to-talk con ruido | Visual [A5] |
| **Telegram**: «raise to speak» | E (uso) | Al acercar el teléfono a la oreja **graba tras una señal** (sensores) | No | 0 toques | **Sí** (señal → graba) | — | Experimental [A6] |
| **WhatsApp** (notas de voz) | E (uso) | Mantén o bloquea para grabar; vista previa antes de enviar | No | — | No | — | Revisión antes de enviar (conocimiento general, sin fuente) |
| **Google Assistant**: Voice Match | E (+ huella vocal) | El usuario **repite frases mostradas** («Hey Google, remind me to buy flowers»…) y el asistente escucha tras cada una | **Sí** | 4 frases, < 1 min | **Sí** | — | Frase en pantalla [A7][A8] |
| **Alexa** | E (uso) | Anillo: azul direccional = escuchando; azul alterno = pensando; tono opcional | Sí | — | Tras la palabra de activación | — | Luz + sonido; la luz solo sirve si se mira [A9] |
| **Pearson PTE**: Repeat Sentence / Read Aloud | E (examen) | En Repeat Sentence el audio suena y **la grabación empieza sola al acabar**; en Read Aloud un **tono** marca el inicio y lo dicho antes no cuenta; «Recording» → «Completed»; según una guía, **3 s de silencio paran la grabación** | No en la comprobación | Automático | **Sí** | — | Etiqueta + barra [A10][A11] |
| **Duolingo English Test** | S, E (y cámara, red) | «Tech check» al empezar y comprobación del sistema previa | No documentado | Antes del examen | — | — | — [A12][A13] |
| **Duolingo (app)**, ELSA, Speak, Praktika, Babbel, Busuu, Cambly | E implícita | Sin prueba dedicada documentada: el primer ejercicio hace de prueba. Duolingo tiene «No puedo hablar ahora»; las guías de soporte de apps de idiomas dicen **quitar el Bluetooth y usar el micro del teléfono** cuando falla | Sí (en el ejercicio) | 0 | Varía | «Prueba sin auriculares» | Salida sin voz [A14][A15][A16] |

### C · Patrones que conviene copiar

1. **Salida y entrada en el mismo gesto** (Teams): instrucción hablada → señal → graba sola → resultado. Es el único caso que no
   pide tocar durante la prueba, que es justo lo que pide el dueño.
2. **La escucha empieza al terminar el audio, nunca encima** (PTE, Teams): lo dicho antes de la señal no cuenta.
3. **Señal de «te escucho» en varios canales**: tono (Teams, PTE, Telegram), luz (Alexa), etiqueta (PTE). En Habla: **anillo del
   micro + mascota en modo escucha + vibración corta**, sin tono (un tono entra en el micro y se confunde con el profe).
4. **Corte por silencio** (VAD): PTE corta tras ~3 s (fuente secundaria); Android permite fijar el «silencio que da la entrada por
   completa» [A17]. Para dos palabras bastan **0,8–1 s**.
5. **Umbral relativo al ruido** (Discord): medir el fondo y exigir voz por encima, no un umbral fijo como el 0,18 actual.
6. **Salida de emergencia siempre visible** («No puedo hablar ahora», «No te oigo») y **plan B Bluetooth → micro del teléfono**
   (Habla ya lo tiene; lo recomiendan también las guías de soporte [A16]).
7. **Repetir la prueba solo si cambia algo**: Teams, Zoom y Meet la dejan a demanda; nadie la pide en cada arranque.
8. **Privacidad visible**: la grabación de prueba no se guarda (Meet, Teams) y Android 12+ muestra el punto verde con el micro
   abierto [A18].

### D · Propuesta para Habla: «Prueba de un paso», sin tocar

**Flujo** (auriculares nuevos, ruta cambiada, fallo previo o desde Ajustes):

| # | Qué pasa | Pantalla (mascota) | Tiempo |
|---|---|---|---|
| 0 | Se aplica la ruta (SCO en modo auriculares) y **se abre el micro ya, sin grabar**, para que el enlace del micro Bluetooth esté activo cuando toque escuchar (en el POCO tarda 1–3 s en activarse, `recorder.ts:248`) | «Prueba de sonido · soundcore Liberty 4 Pro», mascota quieta | en paralelo con 1 |
| 1 | La mascota dice la instrucción **solo por voz**: «Si me oyes, dime: *blue sky*.» (frase corta al azar de una lista de 6–8: *blue sky*, *good morning*, *green apple*, *happy day*…) | **«¿Me oyes?»** / «Escucha lo que te digo y repítelo en voz alta.» (la frase **no** se muestra) · mascota hablando | ~2,5 s |
| 2 | Fin de la voz (evento de fin del TTS) + **retraso de 400 ms** (altavoz del teléfono) o **600 ms** (Bluetooth) para que calle el altavoz y se vacíe el búfer. Durante el retraso se **mide el ruido de fondo** | Sin cambios | 0,4–0,6 s |
| 3 | **Empieza a escuchar sola**: vibración corta (`@capacitor/haptics`, ya instalado), anillo encendido con cuenta atrás de 8 s, mascota en `listening`, texto grande «Te escucho…» y barras de voz | **«Te escucho…»** | — |
| 4 | **VAD local**: pasa con ≥ 400 ms de voz por encima de *ruido + margen* seguidos de **800 ms de silencio** (o al llegar a 2,5 s de voz). Duración plausible para dos palabras: 0,4–3 s | **«¡Te oigo perfecto!»** / «Seguimos.» | ~1,5–2,5 s |
| 5 | (Opcional, ver la tabla de abajo) comprobar **qué** dijo con Gemini, en segundo plano | — | 0 s para el usuario |
| — | **Sin voz en 8 s** | **«No te he oído»** · «Probar otra vez» · **«Hablar al micro del teléfono»** (en auriculares, como hoy) | — |
| — | **«No te oigo»** como botón secundario pequeño, visible desde el paso 1 | **«¿No me oyes?»** / «Sube el volumen y comprueba que tus auriculares estén puestos y encendidos.» · «Probar otra vez» · «Elegir otra opción de audio» | — |
| — | Dos fallos seguidos | Botón «Ver la frase» → «Di: *blue sky*» (ya no valida la salida; la app lo anota) | — |

**Tiempo objetivo: ≤ 6 s y 0 toques** en el caso feliz (hoy: ~7–10 s y 1 toque, más 1,4 s de celebración).

**Detalles de la auto-escucha** (requisito del dueño):
- **Retraso tras la instrucción:** 400 ms con el altavoz del teléfono y 600 ms con Bluetooth, a afinar midiendo en el POCO
  (log `[HABLA-MIC]`). La latencia de A2DP es ~100–200 ms mayor que la de SCO [A19]; en modo auriculares Habla ya usa SCO para todo.
  Con el altavoz del teléfono, además del retraso, se mantiene `echoCancellation` (la frase del profe ya terminó).
- **Aviso «te escucho»:** vibración corta + anillo + «Te escucho…» + mascota escuchando. Sin pitido.
- **Tiempo máximo:** 8 s de ventana (lo que el dueño propuso en REG-M-03).
- **Fin de voz:** 800 ms de silencio tras ≥ 400 ms de voz, o 2,5 s de voz, lo que llegue antes.
- **Privacidad:** el micro solo se abre con la app **en primer plano y la prueba a la vista**. Si la app pasa a segundo plano, se
  cancela y se cierra el micro (`lifecycle.ts` / `interruptForSoundTest`). El audio no se guarda. Android muestra el punto verde [A18].

**Comprobación local o con IA**

| Opción | Qué valida | Coste | Latencia | Internet | Veredicto |
|---|---|---|---|---|---|
| **Local**: VAD por nivel con ruido de referencia | Entrada sí; salida **por correlación** (habla justo después de la instrucción y con la duración de dos palabras) | 0 | inmediata | No | **Por defecto** (y la única **sin clave**) |
| Gemini Flash-Lite con el clip: «¿dijo *blue sky*?» | Salida y entrada de verdad | 1 llamada pequeña | 1–3 s (más con internet lento) | Sí | **Opcional y en segundo plano**, solo con clave válida: si el VAD pasa se sigue ya; si Gemini dice que no coincide, la mascota lo comenta luego sin bloquear |
| Azure con referencia `blue sky` | Ambas + pronunciación | Segundos de la cuota F0 | 1–2 s | Sí | No: no todos tienen Azure y gasta cuota |
| Reconocedor de Android (`SpeechRecognizer`, plugin Java propio) | Ambas, sin coste | 0 | < 1 s | A veces | Descartado por ahora: compite por el micro con el SCO y obliga a otro plugin nativo (va contra «evitar plugins nativos nuevos» de `docs/decisiones.md`) |

**Primera instalación: orden y alternativa sin clave** (requisito del dueño)
- Hoy la prueba **puede salir encima de la bienvenida y del tutorial** (ver A). Propuesta: `AudioPicker` no lanza ni el selector
  ni la prueba mientras `splash` o `!settings.onboarded`. Basta un `ready` que pase `App.tsx`; mientras tanto solo **aplica** la
  ruta guardada, sin preguntar.
- **Orden de la primera vez:** bienvenida → tutorial de la mascota → clave de Gemini guardada y **comprobada** → (auriculares
  conectados) **selector + prueba de un paso** → perfil → 3 temas → test de nivel. Así la prueba llega justo antes del primer
  uso real del audio (la audición y el habla del test), y la madre ya sabe quién es su mascota.
- **Sin clave** (o con la clave sin comprobar): la prueba usa **solo la comprobación local**, que no necesita Gemini. La
  verificación con Gemini solo se activa cuando hay clave válida. Si se quiere que la prueba vaya **siempre** después de la clave,
  la variante local funciona igual: no hay ninguna dependencia de red.
- **Durante el test de nivel:** si se conectan auriculares a mitad de una tarea, no cortar. Aplicar la ruta y pasar la prueba en
  el siguiente punto seguro (resumen de la parte), igual que el borrador `progress` guarda en puntos seguros (`docs/decisiones.md`,
  «Borradores del test»).
- **`NoticeGate`:** la prueba va antes de los avisos o después, no en medio. Recomendado: **antes**, porque algunos avisos llevan a
  una clase (clase a medias).

**Cuándo repetir la prueba**
- Guardar `testedAt` y la ruta probada **por auriculares** junto a `audioPrefs` (Preferences), en lugar de la variable de módulo
  `testedFor` (`AudioPicker.tsx:14`).
- **Repetir solo si:** son auriculares nuevos; cambió la ruta elegida (auriculares, «escucho por los auriculares, hablo al
  teléfono», teléfono); la última prueba falló; o en uso real `hasSignal`/`looksMuted` detectó un micro mudo con esos auriculares.
  Y siempre a demanda desde Ajustes.
- **No** en cada arranque ni al volver del segundo plano.

**Ventajas e inconvenientes frente a la propuesta literal del dueño**

| Aspecto | Dueño (REG-M-03): la voz dice «si me oyes, repite esta frase» y **la pantalla muestra la frase** | Variante recomendada: frase **solo hablada**, auto-escucha, VAD local |
|---|---|---|
| Toques | 0 (con la auto-escucha) | 0 |
| ¿Valida la salida? | **No del todo**: quien no oye nada lee la frase y la dice; la prueba pasa con los auriculares apagados | Sí por correlación (y de verdad con Gemini): solo se sabe qué decir si se ha oído |
| ¿Valida la entrada? | Sí, si se mide voz | Sí, con umbral sobre el ruido medido |
| Ruido y música | Un ruido puede contar como «sí» si solo se mide nivel | Umbral sobre el ruido + duración plausible; la música de otras apps ya se pausa (P2 de la 5.10) |
| Accesibilidad (madre, poca audición) | Mejor: tiene el texto delante | Peor en el primer intento; se mitiga con «Ver la frase» tras dos fallos y «No te oigo» siempre visible |
| Eco del altavoz (sin auriculares) | Riesgo de que la voz del profe dispare el VAD | Retraso tras el fin del TTS + cancelación de eco |
| Coste y red | 0 en local | 0 en local; Gemini opcional |

**Recomendación:** adoptar la idea del dueño (un paso, sin tocar, la escucha empieza sola tras la instrucción) con cuatro ajustes:
1. **La frase solo se oye**, para validar de verdad la salida.
2. **El micro se abre mientras suena la instrucción**, para absorber el retraso del Bluetooth.
3. **«Probado» se guarda por auriculares**, para no repetir la prueba en cada arranque.
4. **No sale antes de la bienvenida y la clave**, y funciona en local sin clave.

### Fuentes de esta sección

- A1. Boise State LTS, Testing Device Audio (Zoom): https://boisestate.atlassian.net/wiki/spaces/LTS/pages/42172469/Testing+Device+Audio · Support.com, Zoom audio settings: https://www.techsolutions.support.com/how-to/how-to-test-out-zoom-audio-settings-13161
- A2. meetergo, Zoom test: https://meetergo.com/en/magazine/zoom-test · Plaud, Zoom test meeting: https://www.plaud.ai/blogs/articles/zoom-test-meeting
- A3. Laxis, Google Meet test call (2026): https://www.laxis.com/blog/google-meet-test-call/ · Manhattan TDX, Check audio and video before joining Meet: https://manhattan.teamdynamix.com/TDClient/1932/Portal/KB/ArticleDet?ID=127497
- A4. Microsoft Support, Make a test call: https://support.microsoft.com/en-us/office/make-a-test-call-6c131ac4-8998-4cb1-9076-1801741d0e59 · USNH, Teams test call: https://td.usnh.edu/TDClient/60/Portal/KB/ArticleDet?ID=4854
- A5. How-To Geek, Microphone in Discord: https://www.howtogeek.com/663414/how-to-configure-your-microphone-and-headset-in-discord/ · Windows Report, Discord input sensitivity: https://windowsreport.com/discord-automatically-determine-input-sensitivity/
- A6. Telegram, Voice 2.0 (raise to speak): https://telegram.org/blog/voice-2-secret-3 · VentureBeat: https://venturebeat.com/mobile/telegram-just-made-it-easier-to-send-and-receive-secure-voice-messages
- A7. 9to5Google, Voice Match with full phrases: https://9to5google.com/2020/04/23/hey-google-voice-match/
- A8. Android Central, Voice Match: https://www.androidcentral.com/how-set-google-assistant-voice-match
- A9. Amazon, Echo light ring guidelines: https://developer.amazon.com/alexa/branding/echo-guidelines/identity-guidelines/light-ring
- A10. Pearson, PTE Read Aloud: https://pearsonpte.com/the-test/format/english-speaking-writing/read-aloud/ · Speaking & Writing: https://www.pearsonpte.com/pte-academic/test-format/speaking-writing
- A11. PTE Academic Tutorial (terceros, «3 s de silencio»): https://ztcprep.com/2023/library/PTE/PTE_Academic_Tutorial/PTE_Academic_Tutorial_(www.ztcprep.com).pdf
- A12. Duolingo English Test, Handbook (tech check): https://englishtest-static.duolingo.com/media/resources/GPN%20The%20DET%20Handbook.pdf
- A13. Mastersportal, DET setup requirements: https://www.mastersportal.com/articles/3509/duolingo-english-test-setup-requirements.html
- A14. Brave Community, Duolingo microphone not working («Can't speak now»): https://community.brave.com/t/duolingo-microphone-not-working/118532
- A15. Duolingo Wiki (ajustes de ejercicios orales): https://duolingo.fandom.com/wiki/File:Traffic-sign.jpg
- A16. Jumpspeak Help, Speech recognition mic issues (Bluetooth → micro del teléfono): https://jumpspeak.helpscoutdocs.com/article/21-im-having-speech-recognition-mic-issues-how-can-i-resolve-this
- A17. Android Developers, RecognizerIntent: https://developer.android.com/reference/android/speech/RecognizerIntent
- A18. AOSP, Privacy indicators: https://source.android.com/devices/tech/config/privacy-indicators
- A19. Unity Vivox, Bluetooth profile comparison: https://docs.unity.com/vivox-core/developer-guide/android/bluetooth-profile-comparison

> No se encontró documentación pública de una prueba de micro dedicada en ELSA, Speak, Praktika, Babbel, Busuu ni Cambly; la fila
> describe lo observable. Los retrasos de 400/600 ms, los 800 ms de silencio y la ventana de 8 s son **propuestas de diseño que hay
> que medir en el POCO**, no cifras de una fuente.
