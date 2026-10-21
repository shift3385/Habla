# 5.11 «Motivación» + «Sonidos» — Plan

> Planificador · 2026-10-20 · **solo plan** (no se ha tocado `src/`, `tests/` ni `android/`). Tablero: `docs/v5.11/ESTADO.md`.
> Fuentes: `CLAUDE.md`, `docs/decisiones.md`, `BACKLOG.md` §5, `docs/pruebas/regresion-5.10/A5-usabilidad.md` (§5.4),
> `docs/pruebas/regresion-5.10/CORRECCION.md` (cómo se organizó la 5.10.1), `docs/fonemas/DISENO-fonemas.md` (§10.3:
> decisiones del dueño) y `docs/fonemas/inventario-fonemas.md`.
> Si se corta la sesión: `Lee docs/v5.11/PLAN.md y docs/v5.11/ESTADO.md y continúa la orquestación de la 5.11`.

## 0 · Resumen

| | |
|---|---|
| **Versión** | 5.11 (MINOR: funciones visibles). Build = siguiente al de la 5.10.1 |
| **Rama** | `v5.11` desde `main` **cuando la 5.10.1 esté aprobada y en `main`** (hoy está sin commitear en `v5.10.1-correcciones`: no se empieza código antes) |
| **Objetivo 1 · Motivación** | Que se vuelva mañana: logros visibles, racha con red, clase menos repetitiva, informe contra uno mismo, repaso más variado, errores explicados por la mascota |
| **Objetivo 2 · Sonidos** | Cuarta pestaña «Sonidos» («Sonidos del inglés»): tabla fonémica, 41 fichas, abecedario, 12 lecciones de la ruta, sonidos sueltos de Wikimedia Commons con atribución, nota de Azure por fonema y «te salió /s/ en vez de /θ/» |
| **Equipo** | 4 desarrolladores (D1–D4) con **archivos exclusivos** + 1 revisor (R) + orquestador. Sin código nativo nuevo |
| **Estimación** | F0 1–2 jornadas · desarrollo en paralelo 7–8 · regresión y móvil 2–3 → **10–12 jornadas** de calendario |
| **Fuera** | P-01 (hecha en la 5.10.1), P-02 (rechazada: se muestran todas las correcciones), P-05 (no aprobada), grandes de A5 (P-11, P-12, P-13, P-14, P-17 → 5.12+), ruta completa de Sonidos → 5.11.x |
| **Alcance aprobado** | Por el dueño el 2026-10-20 (vía orquestador): P-03, P-04, P-06, P-07, P-08, P-09, P-10 + Sonidos + `NBestPhonemeCount` + consejo de /θ/ para Latinoamérica |

---

## 1 · Restricciones que manda respetar el plan

1. **UX-02 cerrada por el dueño (2026-10-20): se muestran todas las correcciones, siempre** (vale P3b). La P-02 de A5 queda
   **rechazada**: nada de la 5.11 toca `CorrectionView` ni el «EVERY real error» del prompt.
2. **Política de niveles** (CLAUDE.md regla 6, `docs/decisiones.md`): nada de la 5.11 cambia el nivel. Hitos, informe,
   «Hoy has sonado como…» y Sonidos solo **muestran**; solo el re-test cambia el nivel (70/30).
3. **La mascota explica** (decisión de interfaz): errores, celebraciones, primera vez en Sonidos → `MascotSays`/`MascotPage`.
4. **Inicio sin scroll**, todo en horizontal y en 320×640 (A11 de la madre). Listas largas en `InfiniteList` o scroll del panel.
5. **Sin plugins nativos nuevos, sin dependencias nuevas** (internet lento). La 5.11 no toca `android/`.
6. **Coste:** ninguna llamada extra a Gemini por defecto. Azure solo donde ya se usa o al decir una palabra en Sonidos.
7. **Batería** (5.7): animaciones de celebración cortas (≤ 2 s) y paradas en segundo plano (`lifecycle.ts`).
8. **Datos:** la migración de Dexie solo **añade** tablas; copias antiguas se siguen aceptando. Claves nunca en copias ni logs.
9. **Español neutro latinoamericano** en todo texto nuevo (decisión REG-A3-18): nada de «como la z de España» como pista única.
10. **Licencias:** audios de Wikimedia Commons con autor, licencia y enlace por archivo en «Acerca de»; siguen bajo su licencia.

---

## 2 · Alcance

### 2.1 Dentro de la 5.11

**Motivación** (alcance aprobado por el dueño: 7 de las 10 rápidas de A5 §5.4 + 2 mejoras de fonética). Los ids M-01, M-02 y
M-05 se dejan **sin usar** para que coincidan con P-01, P-02 y P-05, que quedan fuera:

| Id | Origen | Qué | Ojo |
|---|---|---|---|
| ~~M-01~~ | P-01 | — | **Excluida:** hecha en la 5.10.1 (UX-01 `a-mic`, test `d4-ui`) |
| ~~M-02~~ | P-02 | — | **Excluida:** rechazada por UX-02 («mostrar todas las correcciones») |
| M-03 | P-03 | Hitos con celebración de la mascota y «Tus logros» en Progreso | Sin IA; animación corta |
| M-04 | P-04 | Comodín de racha: 1 día de descanso por semana que no la rompe | Gratis, automático |
| ~~M-05~~ | P-05 | — | **Excluida:** no está en el alcance aprobado |
| M-06 | P-06 (R-01) | Variedad en el turno del profe: ~70 % pregunta, ~30 % reacción + mini-reto | 0 llamadas extra |
| M-07 | P-07 (UX-03/04/09) | Informe «contra ti mismo» (flecha frente a tu media de 5 clases) y «Hoy has sonado como…» | Metas por nivel y meta única ya hechas en la 5.10.1 |
| M-08 | P-08 (UX-05) | Error del plan en el Inicio dicho por la mascota, con alternativa en un toque | — |
| M-09 | P-09 (R-06/07) | Avisos con 3–4 variantes y consejos que se jubilan tras verse 2 veces | Sin IA |
| M-10 | P-10 (UX-08, R-04) | Repaso: ajuste «Que decida Habla» (pasa solo a los 3 s) y 1 de cada 4 tarjetas «Escucha y repite» | Ajuste apagado por defecto (autonomía del dueño) |
| M-11 | DISENO §1.3 / §6.2 | Pedir a Azure `NBestPhonemeCount` en la clase y decir «te salió /s/ en vez de /θ/ (*sink*)» | Misma petición, mismo coste |
| M-12 | DISENO §1.1–1.2 | Consejo de /θ/ válido para Latinoamérica, /ð/ «la d suave de *nada*», y `SOUND_TIPS` generado desde `tipShortEs` del JSON | Una sola fuente de texto |

**Sonidos — MVP (F1 del diseño + sonidos sueltos, decisión §10.3):**

| Id | Qué |
|---|---|
| S-00 | **F0 · viabilidad en el POCO** (§7): audios Wikimedia en el WebView, peso del APK, tabla en 320×640 / 780×360, Azure por fonema y NBest, voz en-US con pares y letras |
| S-01 | Contrato de datos del día 0: Dexie v5 (`sounds`, `milestones`), tipos, ajustes nuevos, copias |
| S-02 | Contenido: `phonemes.json` (41 fichas + rasgos `s-cluster`, `ed`, `s-ending`), `alphabet.json` (26 letras, 7 familias, `ttsText`), `lessons.json` (12 lecciones) |
| S-03 | Validador `scripts/validate-sounds.mjs` (+ CMUdict opcional fuera del APK y de git) |
| S-04 | Sonidos sueltos de Wikimedia Commons: archivos elegidos en F0, `credits.json`, atribución en «Acerca de» |
| S-05 | `sounds.ts`: carga perezosa, mapa símbolo de Azure → ficha/lección, progreso y regla de «dominado» |
| S-06 | `assessWord()`: una evaluación con referencia, `NBestPhonemeCount: 5`, silencio de 300 ms, política F0/S0 |
| S-07 | Pestaña «Sonidos» en el Inicio + intro de la mascota + **tabla fonémica** (vertical, horizontal, 320 px) |
| S-08 | Ficha de sonido (§7.2 del diseño): sonido suelto ▶, palabra clave normal/lenta, gesto, ejemplos, grafías, pares, nota UK |
| S-09 | Abecedario: 26 letras por familias, ▶ por letra, lecciones A1–A3 con `spell-listen` |
| S-10 | Lecciones: pila de pantallas, 5 fases, ejercicios `listen-choose`, `odd-one-out`, `sort`, `spell-listen`, `say-word`, `say-pair`, «Escúchate» sin Azure, cierre con estado y minutos |
| S-11 | Enlace «🔊 Practicar el sonido /θ/ en Sonidos» desde `PronunciationView` (clase, Repaso, «Dilo tú») con hoja encima |

Las **12 lecciones del MVP** (DISENO §10.1 F1): S0, A1, A2, A3, V1, C1, E1, V3a, V3b, E4, E3, C2a.

### 2.2 Fuera de la 5.11

| Qué | Dónde va | Por qué |
|---|---|---|
| P-01 restos del candado | Hecha | 5.10.1 (UX-01). La línea de la flecha del README (UX-12) la corrige el orquestador al actualizar docs |
| P-02 ocultar/plegar correcciones por nivel | **No se hace** | Rechazada por el dueño (UX-02) |
| P-05 tarea accionable («Hacerla ahora») | Sin fecha | No aprobada para la 5.11 |
| P-11 memoria del alumno, P-12 roleplays con misión, P-14 retos semanales, P-13 narrativa de la mascota, P-17 tarjeta para compartir | **5.12+** (decisión del dueño) | Grandes; P-11 choca con `teacher.ts` «fresh conversation» y pide decisión |
| P-15 charla antes del test, P-16 shadowing | Backlog | P-15 choca con «test obligatorio»; P-16 en parte la cubre Sonidos |
| «Modo sencillo» del Inicio, Azure Monitor en «Avanzado», línea de progreso semanal (UX-11) | Backlog | Mejoras de interfaz no pedidas para esta versión |
| **Sonidos F2**: 21 lecciones + 4 repasos, «Para ti», enlace en el informe, calentamiento en el plan, tarjetas de sonidos en el Repaso, clase centrada en un sonido (`classFocusEn`), diagramas SVG, `stress-tap`, `twister`, `spell-say`, ▶ en-GB para comparar | **5.11.x** (ver pregunta 3) | Reutilizan los componentes del MVP: casi todo es contenido |
| **Sonidos F3**: modo «aproximado» con Gemini, prosodia, otras fuentes de audio | Más adelante | Pendiente de F0 y de decisión |

---

## 3 · Tareas y criterios de aceptación

Formato: cada criterio es **medible** (test, número o captura). «Nav» = navegador (`habla-dev`), «Tel» = POCO con «Habla debug».
Todo bloque cumple además lo común: `npx tsc -b`, `npm run lint` (0 errores), `npm test` en verde, validadores en verde,
un test nuevo por cada arreglo de lógica, estilo del proyecto y comentarios `// 5.11 (M-04): …`.

### 3.1 Motivación

(M-01, M-02 y M-05: excluidas, ver §2.1.)

**M-03 · Hitos con celebración** (D2, 1,5 d)
- `milestones.ts` **deriva** los hitos del estado de Dexie (sin enganches en otras pantallas): racha 3/7/14/30; 10/50/100
  tarjetas repasadas; primer tema de Gramática dominado; primer sonido dominado (tabla `sounds`); primera clase > 5 min;
  primera semana del plan completa. Guarda los conseguidos en `milestones` (id, at). Idempotente.
- `MilestoneGate`: al volver al Inicio, si hay hitos nuevos, la mascota en `happy` dice una frase propia de su personalidad
  (4 mascotas × ≥ 1 frase por hito); animación ≤ 2 s; uno por vez; «Seguir» lo cierra.
- Progreso → «Tus logros»: lista con fecha; los no conseguidos en gris con «Te faltan N».
- **Aceptación:** test `m2-milestones` (datos sembrados: cada hito salta una sola vez, nunca dos veces tras recargar; una
  copia restaurada no vuelve a celebrar los ya guardados); Nav: celebración en 390×844, 320×640 y 780×360 sin tapar la
  barra inferior; Tel: con la app en segundo plano no hay animación (CPU en reposo igual que sin la función, `dumpsys`).

**M-04 · Comodín de racha** (D1, 0,75 d)
- Regla: **un día sin práctica por semana natural (lunes–domingo) no rompe la racha**; ese día no suma. Dos días sin
  práctica en la misma semana, o dos seguidos, la rompen. Hoy sin practicar se trata como hasta ahora.
- `Dashboard` añade `restDay?: string` (día usado esta semana). Globo de la mascota: «Ayer descansaste; tu racha sigue a salvo».
- **Aceptación:** test `m1-streak` con fechas fijas (≥ 8 casos: descanso lunes, domingo, cambio de semana, dos descansos
  en semanas distintas, dos en la misma, dos seguidos a caballo entre semanas, hoy sin practicar, sin historial); la racha
  sin descansos da exactamente lo mismo que la 5.10.1 (test de regresión).

**M-06 · Variedad del profe** (D2, 0,75 d)
- Decisión **en el código**, no al azar del modelo: `turnStyle(turnIndex, seed)` → `question` | `react-challenge`.
  Primer turno siempre pregunta; nunca dos `react-challenge` seguidos; ~30 % de retos (dime 3 razones, cuéntamelo como un
  chisme, corrige mi frase…; lista de ≥ 6). El prompt recibe la instrucción del turno.
- No cambia el test de nivel, «Dilo tú» ni la clase de Gramática (sus prompts quedan idénticos).
- **Aceptación:** test `m2-turnstyle` (1000 turnos: 65–75 % pregunta, 0 retos seguidos); test de prompts: test/«Dilo tú»/
  Gramática sin diferencias; Tel con clave real: 10 turnos → ≥ 2 sin pregunta final y ≥ 6 con pregunta (transcripción en evidencia).

**M-07 · Informe contra ti mismo** (D2, 0,75 d)
- Cada cifra (ppm, pausas/min, palabras/resp., nota) con flecha ▲▼ y «+8 frente a tu media» (últimas 5 clases terminadas
  con métricas); con menos de 2 clases previas: «Esta es tu primera referencia».
- UX-09: «Nivel al hablar hoy: B1+» → «Hoy has sonado como un B1+» + «(tu nivel lo fija el test)»; oculto si A1–A2.
- **Aceptación:** test `m2-report` (media con 0, 1, 2, 5 y 8 clases; clases escritas no cuentan para ppm); Nav: informe
  en 320×640 sin scroll horizontal; ninguna cadena «meta B2» con perfil A2 (grep en el render).

**M-08 · Error del plan con la mascota** (D1, 0,5 d)
- `PlanCard` en error: `MascotSays` «Hoy no he podido preparar tu lección; mientras, ¿charlamos de *<tema>*?» + botón del tema
  (favorito o «Sorpréndeme») + «Reintentar». Sin texto técnico en rojo.
- **Aceptación:** Nav con red simulada (fallo de Gemini en el plan): capturas 390×844, 320×640, 780×360; el Inicio sigue sin
  scroll; el botón abre la clase del tema en 1 toque.

**M-09 · Avisos y consejos con variantes** (D1, 0,5 d)
- 3–4 redacciones para `goal`, `streak` y `review`, sin repetir la última mostrada; consejos «de temporada» con contador en
  `localStorage` (`habla.adviceSeen`, con try/catch) que se jubilan tras verse 2 veces; los permanentes siguen en rueda.
- **Aceptación:** test `m1-tips` (≥ 3 variantes distintas en 10 llamadas; nunca la misma dos veces seguidas; jubilado tras 2;
  ningún texto con /mant[eé]n|candado|desliza/i, para que no vuelva el consejo de la 5.10.1).

**M-10 · Repaso que decide Habla + «Escucha y repite»** (D2, 1 d)
- Ajuste «Que decida Habla» (apagado por defecto): con veredicto, aplica la nota sugerida y pasa sola a los 3 s con cuenta
  atrás visible; un toque la cancela y deja elegir. Con veredicto `unknown` no pasa sola.
- 1 de cada 4 tarjetas en modo «Escucha y repite»: suena el inglés (TTS) y el alumno lo repite; misma evaluación y FSRS.
- **Aceptación:** test `m2-review` (posición 4, 8, 12… en modo escucha; nunca en tarjetas de Gramática con hueco; el auto-pase
  aplica exactamente `suggestedGrade`); Nav: cuenta atrás visible y cancelable en 320×640.

**M-11 · «Te salió /s/ en vez de /θ/»** (D1, 0,75 d; necesita F0-4)
- Petición de la clase con `NBestPhonemeCount: 5`; se lee `NBestPhonemes` por fonema; si el más probable dicho ≠ esperado
  (normalizando `i/iː`, `u/uː`, `g/ɡ`, `ɝ/ɚ`), el chip dice «/θ/ 45 · te salió /s/».
- **Aceptación:** tests con **respuestas reales capturadas en F0** (sin audio ni claves) en `tests/fixtures/`; sin el campo
  NBest la vista queda igual que hoy; segundos de audio enviados a Azure iguales que en la 5.10.1 (medido en el log).

**M-12 · Consejos válidos para Latinoamérica, una sola fuente** (D1, 0,25 d + 0,25 d tras S-02)
- /θ/: «punta de la lengua entre los dientes y sopla, sin voz: think»; /ð/: «como la d suave de "nada", con la lengua entre
  los dientes: this».
- Cuando exista `phonemes.json`, `SOUND_TIPS` se construye desde `tipShortEs` (casos especiales s + consonante y -ed se mantienen).
- **Aceptación:** test: 0 consejos que mencionen «España» sin alternativa; cada fonema de `SOUND_TIPS` sale del JSON (test
  que compara ambos).

### 3.2 Sonidos

**S-00 · F0** (orquestador + dueño + D1/D4 de apoyo, 1–2 d) → ver §7. Salida: `docs/v5.11/F0-resultados.md`.

**S-01 · Contrato del día 0** (D3, 0,5 d; **lo primero de todo**)
- `db.version(5).stores({ sounds: 'id, lastAt', milestones: 'id, at' })`; `TABLES` con las dos; tipos `SoundProgress`
  y `Milestone`.
- `Settings`/`DEFAULTS`: `soundsIntroSeen: false`, `reviewAutoGrade: false`.
- Copias: las dos tablas **opcionales** al importar; `BACKUP_MAX_VERSION` sube solo si el formato cambia (y se documenta).
- **Aceptación:** test `m3-migration` (base v4 con datos → v5 sin pérdida; copia v2 de la 5.10.1 se importa; copia nueva sin
  claves); los demás desarrolladores pueden importar los tipos ese mismo día.

**S-02 · Contenido** (D3, 2,5 d)
- Primero **muestra**: fichas `ih`, `iy`, `th` y lecciones V1 y C2a (las del DISENO §8.3) → aprobación de R (contenido) y del
  orquestador; después el resto.
- 41 fichas (40 + /ɚ/) desde `inventario-fonemas.md`, rasgos del MVP (`s-cluster`, `ed`, `s-ending`), 26 letras con `ttsText`
  (resultado de F0-5), 12 lecciones. Inglés americano; español neutro latinoamericano con «tú»; `ukNoteEs` donde ayuda.
- Formato en `docs/v5.11/FORMATO-sonidos.md` (copia viva del DISENO §8 con lo que cambie F0).
- **Aceptación:** `validate-sounds` 0 errores; con CMUdict 0 errores y avisos revisados a mano (lista en el informe);
  0 homógrafos en lo que suena; tamaño total ≤ 300 KB; R revisa 100 % de los pares mínimos.

**S-03 · Validador** (D3, 0,5 d)
- `scripts/validate-sounds.mjs` según DISENO §8.4 + abecedario (26 letras, una familia cada una) + cada audio citado existe y
  está en `credits.json` + cada id de `credits.json` existe + tamaño por audio ≤ 30 KB y total ≤ 0,6 MB.
- `npm run` script nuevo; `scripts/data/cmudict.dict` en `.gitignore` (nunca en el APK).
- **Aceptación:** 6 contenidos rotos a propósito (par igual, homógrafo, id repetido, audio sin crédito, símbolo Azure duplicado,
  lección con fonema inexistente) → 6 errores con su mensaje (test `m3-validate`).

**S-04 · Sonidos sueltos de Wikimedia** (D3, 1 d; necesita F0-1)
- Solo los archivos que F0 marcó «aceptable» (lista con autor, licencia y URL). Se guardan en `public/sounds/` (los copia
  Vite al APK). Si se normaliza el volumen, se anota «modificado» en el crédito (CC BY-SA lo permite con la misma licencia).
- `credits.json` y «Acerca de» → «Créditos de audio»: autor, licencia (con enlace) y archivo original, uno por sonido.
- Sonido sin grabación aceptable → la ficha no muestra «▶ sonido suelto», solo la palabra clave lenta (y el validador lo admite).
- **Aceptación:** 100 % de los audios con crédito; Δ del APK release ≤ 0,7 MB frente a la 5.10.1 (medido); Nav: «Acerca de»
  legible en 320×640.

**S-05 · Motor de Sonidos** (D3, 1 d)
- `sounds.ts`: `import()` perezoso de los JSON (no entran en el arranque); `phonemeByAzure(symbol)` (con los casos de
  `soundTipEs`: s + consonante → `E1`, -ed → `E4`); `lessonFor(id)`; progreso en `sounds` (visto, aciertos de escucha por día,
  mejor nota Azure, días practicados, dominado, último uso); estado nuevo → visto → practicado → dominado; suma minutos con
  `addPracticeSeconds`.
- **Dominado** = ≥ 85 % en «Escucha» **y** (con Azure) nota del fonema ≥ 80 en 4 de 5 palabras, en **dos días distintos**;
  sin Azure: «Escucha» ≥ 85 % en dos días, marcado «solo de oído». Umbral de Azure ajustable tras F0-4.
- **Aceptación:** test `m3-sounds` (mapa Azure → ficha único salvo /ɝ ɚ/; dominado con 1 día = no; 2 días = sí; sin Azure
  marcado; idempotente); `npm run build`: el chunk principal crece ≤ 15 KB gzip y los JSON van en un chunk aparte.

**S-06 · `assessWord()`** (D1, 1 d; necesita F0-4)
- En `pronunciation.ts`: **una** evaluación con referencia (palabra o frase), `EnableMiscue: false`, `NBestPhonemeCount: 5`;
  300 ms de silencio delante y detrás (`wav.ts`); pasa por la política F0/S0 y cuota agotada de `phonetics.ts`.
- Devuelve `{ accuracy, target?: { phoneme, accuracy, heard? }, phonemes[] }`.
- **Aceptación:** tests con las respuestas de F0; con cuota agotada no llama y devuelve «sin nota» (test); Tel: 5 palabras
  dichas ≤ 15 s de audio facturado (log `[HABLA-NET]` en Diagnóstico).

**S-07 · Pestaña y tabla fonémica** (D4, 1,5 d)
- Cuarto segmento «Sonidos» en el Inicio; **números de los segmentos ocultos por debajo de 360 px**; intro de la mascota la
  primera vez (`MascotPage`, `soundsIntroSeen`).
- Panel: «Sigue la ruta: n. … ›», «Ruta n/12», «Abecedario» y la tabla (vocales 4×4, diptongos, consonantes en pares
  sorda|sonora). Borde por estado; tocar abre la ficha.
- **Aceptación (Nav y Tel):** 390×844, 320×640 y 780×360: Inicio sin scroll (la tabla hace scroll **dentro** del panel si hace
  falta), 0 scroll horizontal, 4 segmentos sin cortar texto en 320 px, celdas ≥ 36×36 px (consonantes) y ≥ 44 px de alto
  (vocales), horizontal sin scroll con vocales y consonantes lado a lado; claro y oscuro de los 4 temas.

**S-08 · Ficha de sonido** (D4, 1,5 d)
- Cabecera `/θ/ think ▶ 🐢▶` (lenta = `rate` 0,6) + **▶ sonido suelto** si hay audio; explicación de la mascota (▶ con
  `toggleSpeakSpanish`); 3 pictogramas (labios, lengua, voz); español y error típico; ejemplos por posición ▶; grafías;
  pares ▶▶; nota británica; «Practicar».
- **Voz siempre en-US** en Sonidos aunque el profe sea Leo (`tts.ts` con voz forzada).
- **Aceptación:** Nav: 41 fichas abren sin error (test de recorrido que monta cada una); Tel: el audio suelto suena en
  ≤ 300 ms tras tocar, por altavoz y por auriculares Bluetooth, y pausa la música de otra app (foco de audio); con Leo de
  profe, la palabra clave suena con voz americana.

**S-09 · Abecedario** (D4, 0,75 d)
- 26 letras en 7 familias por sonido, ▶ por letra con `ttsText`; lecciones A1–A3 con `spell-listen` (la voz deletrea, el
  alumno escribe; pausas entre letras).
- **Aceptación:** Tel: las 26 letras se oyen como su nombre (lista de F0-5 marcada por el dueño, 26/26); test del corrector de
  `spell-listen` (mayúsculas, espacios y guiones no cuentan).

**S-10 · Lecciones y ejercicios** (D4, 2 d)
- Pila de pantallas (patrón `GrammarRoutes`): ruta → lección; fases Explícame → Escucha (8 rondas) → Clasifica → Dilo tú →
  Cierre. Ejercicios por toques (sin arrastrar en 320 px).
- `say-word`/`say-pair` con `assessWord`; sin Azure, **«Escúchate»** (grabas, se alterna tu versión y la del modelo A-B-A-B,
  te autoevalúas). El micro sigue las reglas de la 5.10.1 (toca para hablar, ruta Bluetooth solo en primer plano).
- **Aceptación:** test de los correctores (`listen-choose`, `odd-one-out`, `sort`); Nav: las 12 lecciones se completan de
  principio a fin con TTS del navegador y Azure simulado (con nota y sin Azure); Tel: una lección real (V1) con Azure y otra
  sin Azure; los minutos aparecen en la meta del día; el estado de la celda cambia en la tabla.

**S-11 · Enlace desde la fonética** (D1 + D4, 0,5 d)
- D1: en `PronunciationView`, una línea «🔊 Practicar el sonido /θ/ en Sonidos» para el sonido más flojo **con ficha**
  (uno solo); llama a `openSound(id)`.
- D4: `soundLink.ts` (mismo patrón que `grammarLink.ts`) y `SoundSheet` montada en `App.tsx`: la ficha se abre encima de la
  clase, el Repaso o «Dilo tú» y al cerrarla se sigue donde estabas.
- **Aceptación:** test del mapa (s + consonante → E1, -ed → E4, omisión → sin enlace); Nav: abrir y cerrar la hoja desde una
  clase simulada no pierde el turno ni la grabación; 320×640: la tarjeta de fonética no crece más de una línea.

---

## 4 · Reparto (máx. 4 desarrolladores + 1 revisor) con archivos exclusivos

Reglas de la 5.10.1 (CORRECCION.md) sin cambios: **cada uno solo toca sus archivos**; si necesita otro, lo pide en su informe;
nada de `stash`/`checkout`/`reset`; nadie compila APK, ni toca `keystore/`, `version.json`, `changelog.ts`, `android/` ni el
teléfono (salvo lo que el orquestador encargue para F0).

| Dev | Bloque | Tareas | Archivos existentes (exclusivos) | Archivos nuevos que crea |
|---|---|---|---|---|
| **D1** | Hábito y fonética | M-04, M-08, M-09, M-11, M-12, S-06, S-11 (línea) | `src/lib/stats.ts`, `src/lib/mascotTips.ts`, `src/lib/reminders.ts`, `src/components/PlanCard.tsx`, `src/lib/pronunciation.ts`, `src/lib/phonetics.ts`, `src/lib/wav.ts`, `src/components/PronunciationView.tsx`, `tests/mascotTips.test.mjs`, `tests/d4-phonetics.test.mjs` | `tests/m1-*.test.mjs`, `tests/fixtures/azure-*.json` (de F0) |
| **D2** | Logros y clase | M-03, M-06, M-07, M-10 | `src/screens/ProgressScreen.tsx`, `src/lib/teacher.ts`, `src/lib/fluency.ts`, `src/components/ReportView.tsx`, `src/screens/Conversation.tsx` (solo si M-06 necesita pasar el nº de turno), `src/screens/ReviewScreen.tsx`, `src/lib/srs.ts` (solo si «Escucha y repite» lo exige), `src/screens/SettingsScreen.tsx`, `tests/teacher.test.mjs`, `tests/fluency.test.mjs`, `tests/d4-prompts.test.mjs`, `tests/promptInjection.test.mjs`, `tests/reviewSummary.test.mjs` | `src/lib/milestones.ts`, `src/components/MilestoneGate.tsx`, `src/lib/turnStyle.ts`, `tests/m2-*.test.mjs` |
| **D3** | Sonidos: contenido y datos | S-01, S-02, S-03, S-04, S-05 | `src/lib/db.ts`, `src/lib/settings.ts`, `src/lib/backup.ts`, `src/lib/backupCheck.ts`, `src/screens/AboutScreen.tsx`, `package.json` (solo `scripts`), `.gitignore`, `tests/backupCheck.test.mjs` | `src/sounds/phonemes.json`, `src/sounds/alphabet.json`, `src/sounds/lessons.json`, `src/sounds/credits.json`, `public/sounds/*.ogg`, `src/lib/sounds.ts`, `scripts/validate-sounds.mjs`, `scripts/data/` (fuera de git), `docs/v5.11/FORMATO-sonidos.md`, `tests/m3-*.test.mjs` |
| **D4** | Sonidos: interfaz e integración | S-07, S-08, S-09, S-10, S-11 (hoja), integraciones I-1, I-3, I-4 | `src/App.tsx`, `src/screens/Home.tsx`, `src/index.css`, `src/lib/tts.ts` (voz en-US forzada y `rate`), `src/ui/theme.ts` (si hace falta un color) | `src/components/SoundsPanel.tsx`, `src/components/PhonemeChart.tsx`, `src/components/SoundRoutes.tsx`, `src/components/SoundSheet.tsx`, `src/components/SoundExercises.tsx`, `src/components/SoundSay.tsx`, `src/screens/SoundScreen.tsx`, `src/screens/SoundLessonScreen.tsx`, `src/screens/AlphabetScreen.tsx`, `src/lib/soundLink.ts`, `src/lib/soundAudio.ts`, `tests/m4-*.test.mjs` |
| **R** | Revisor | Revisa cada bloque: código, tests (mutantes), navegador en 3 tamaños y 2 temas, contenido de fonética, Java solo si alguien lo tocara (no debería) | — | `docs/v5.11/REVISION.md`, `docs/v5.11/evidencia/R/` |
| **Orq.** | Orquestador | F0 con el dueño, tablero, APK debug para el teléfono, Novedades, versión, docs finales | `version.json`, `src/lib/changelog.ts`, `CLAUDE.md`, `docs/estado-actual.md`, `docs/decisiones.md`, `BACKLOG.md` | `docs/v5.11/F0-resultados.md`, `docs/v5.11/MOVIL.md` |

Archivos que se **importan sin editar** (de nadie en esta versión): `recorder.ts`, `audioRoute.ts`, `audioFocus.ts`,
`lifecycle.ts`, `TalkButton.tsx`, `MascotPage.tsx`, `MascotBubble.tsx`, `Mascot.tsx`, `InfiniteList.tsx`, `GrammarExercises.tsx`,
`grammarLink.ts`, `gemini.ts`, `scenarios.ts`, `notices.ts`, `NoticeGate.tsx` y **`CorrectionView.tsx`** (UX-02: no se toca). Si alguien necesita cambiarlos, lo pide; el orquestador asigna el cambio a un solo dev.

**Integraciones que hace D4 a petición** (para no compartir `App.tsx`/`Home.tsx`; la interfaz se fija ahora):
- **I-1** (D2 → D4): montar `<MilestoneGate settings onDone />` cuando la pantalla es el Inicio.
- ~~I-2~~ (era la tarea accionable, P-05: excluida).
- **I-3** (D4): `onOpenSound` → `SoundSheet` (como `onOpenGrammarTopic` → `GrammarSheet`).
- **I-4** (D1 → D4): `PlanCard` recibe `onAltTopic(topic)`; `Home` le pasa el arranque de clase del tema. Si D1 añade campos a
  `buildAdvice`/`loadDashboard`, deben ser **opcionales** (Home no se rompe hasta la integración).

---

## 5 · Dependencias y orden

```
Día 0 ─ S-00 F0 (orq. + dueño, teléfono)  ║  S-01 contrato (D3, ½ día)  ║  D1: M-04, M-09, M-08  ║  D2: M-06, M-07
        │                                 ║          │                  ║  D4: S-07 con datos de muestra (ih, iy, th)
        ▼                                 ║          ▼
F0-1 audios ──────────────► S-04 (D3)     ║  S-02 muestra → aprobación R → S-02 completo (D3) → S-05 (D3)
F0-4 Azure ───────────────► M-11, S-06 (D1)          │                                   │
F0-5 voz/letras ──────────► S-02 ttsText, S-09 (D4)  ▼                                   ▼
                                           D2: M-03 (tabla milestones) → M-10 (reviewAutoGrade)
                                           D4: S-08 → S-09 → S-10 (usa S-05 y S-06)
                                           D1: M-12b (SOUND_TIPS desde JSON) y S-11 línea  ◄── S-02, soundLink (D4)
                                                                   ▼
                                           D4: I-1, I-3, I-4 + S-11 hoja  →  R: regresión final (Nav)  →  orq.: APK debug → Tel
```

- **Bloqueantes duros:** S-01 antes de M-03, M-10 y S-05; F0-4 antes de M-11 y S-06; F0-1 antes de S-04; la muestra de
  S-02 aprobada antes del resto del contenido.
- **Sin bloqueo:** M-04, M-06, M-07, M-08, M-09 y S-07 (con datos de muestra) empiezan el día 0.
- **Rondas** como en la 5.10.1: `pendiente → en desarrollo → para revisar → en revisión → NC/aprobada`; R revisa en cuanto un
  bloque pasa a «para revisar»; la regresión visual completa va al final, cuando las integraciones de D4 estén hechas.

---

## 6 · Qué se prueba dónde

| Navegador (`habla-dev`, red simulada como en la 5.10.1) | Teléfono (POCO, «Habla debug», CDP; A11 solo si el dueño lo autoriza) |
|---|---|
| Todos los tests (`npm test`), `validate-sounds`, `validate-grammar`, `validate-bank`, `tsc`, lint | **F0 completa** (§7) |
| Diseño en 390×844, 320×640 y 780×360, claro/oscuro, 4 temas: Inicio con 4 pestañas, tabla, ficha, lección, abecedario, celebración, «Tus logros», informe con flechas, error del plan, cuenta atrás del Repaso, «Acerca de» | Voz en-US real (pares, letras, palabra lenta) y en-US forzada con Leo de profe |
| Flujos con datos sembrados en Dexie: racha con descansos (fechas falsas), hitos, media de 5 clases, auto-pase del Repaso, «Escucha y repite» | Audios `.ogg` en el WebView: latencia, altavoz, auriculares Bluetooth, foco de audio (música de otra app) |
| Gemini y Azure **simulados** (respuestas fijas, incluidas las capturadas en F0) | Azure real: `assessWord`, NBest y «te salió /x/», segundos facturados, cuota agotada simulada |
| Recorrido de las 41 fichas y las 12 lecciones | M-06 con clave real: 10 turnos (≥ 2 sin pregunta, ≥ 6 con pregunta) |
| `npm run build`: tamaño del chunk principal y del chunk de Sonidos | Peso del APK release (Δ ≤ 0,7 MB), arranque en frío (no más lento que la 5.10.1 ± 10 %), CPU en reposo en el Inicio con y sin celebración |
| | Táctil real: celdas de la tabla en 320 px de ancho lógico (A11) y horizontal forzado; recordatorio diario con texto variado |

Lista de pruebas en el teléfono: `docs/v5.11/MOVIL.md` (la escribe el orquestador al final, estilo `REVISOR-MOVIL.md`).

---

## 7 · F0 de Sonidos (viabilidad en el POCO)

**Cuándo y cómo:** en cuanto la 5.10.1 esté instalada como «Habla debug» en el POCO. Casi todo se hace **por CDP sin tocar
`src/`** (se evalúa JS en el WebView de la app: `new Audio(url)`, la REST de Azure con la clave que el dueño ya metió, sin
imprimirla). Solo F0-2 necesita un APK de prueba, en una rama aparte (`v5.11-f0`), que compila el orquestador.
Sin datos de usuarios: «Habla debug» es otra app. El A11 de la madre, solo si el dueño lo pide y con copia previa.

| # | Qué se verifica | Cómo | Criterio de «sí» | Si sale «no» |
|---|---|---|---|---|
| **F0-1** | **Audios de Wikimedia en el WebView** | 10 archivos representativos (`.ogg` Vorbis y, si los hay, `.oga`/`.wav`) desde URL y desde `public/` en el APK de F0-2; `new Audio()` y `<audio>`; altavoz, Bluetooth (fuera de clase y con la ruta de la 5.10.1), con música de otra app sonando | Suenan 10/10; inicio ≤ 300 ms desde el toque; no rompen la ruta SCO ni el foco de audio; volumen parecido al TTS (diferencia ≤ 6 dB, o se normaliza) | Recodificar a otro formato que sí suene (p. ej. Opus en `.webm`), anotado como «modificado» en el crédito |
| **F0-1b** | **Qué grabaciones valen** para el americano | El dueño escucha los ~40 candidatos (lista con autor/licencia/URL que prepara el orquestador) y marca aceptable / no | Se espera que fallen /æ ɑ ɹ ɝ ɚ/ y diptongos (DISENO §6.3 B) | Esos sonidos quedan sin «sonido suelto» en la 5.11 (pregunta 2) |
| **F0-2** | **Peso del APK** | APK release de la rama F0 con los audios aceptados + JSON de muestra, frente al de la 5.10.1 | Δ ≤ 0,7 MB (previsto ~0,5 MB) | Recortar bitrate/duración (≤ 1 s por sonido) |
| **F0-3** | **Tabla fonémica en pantallas pequeñas** | Maqueta HTML estática con las medidas del DISENO §7.2 (fuera de `src/`, en `docs/v5.11/f0/`), abierta en el WebView por CDP y en el navegador a 320×640, 390×844 y 780×360 | 0 scroll horizontal; celdas ≥ 36 px; 4 segmentos sin números legibles en 320 px; horizontal sin scroll; el dueño acierta a tocar 10/10 celdas pedidas | Consonantes en 2 bloques plegables (oclusivas/fricativas · resto) |
| **F0-4** | **Azure por fonema y NBest** | El dueño graba 20 palabras **bien** y **mal a propósito** (*think→sink*, *very→berry*, *ship→sheep*, *cat→cut*, *Spain→Espain*, *worked→work-ed*…); evaluación con referencia y `NBestPhonemeCount: 5`; también 3 turnos de clase normales (sin referencia → con referencia) con NBest | La nota del fonema objetivo baja ≥ 20 puntos en ≥ 14/20; «te salió /x/» acierta en ≥ 12/20; NBest llega también en el flujo de la clase; se anota el juego real de símbolos (`ɚ/ɝ`, `ɡ/g`, `i/iː`) y los segundos facturados | Si NBest no acierta: M-11 se queda en la nota sin «te salió»; si la nota no baja: Sonidos usa «Escúchate» como principal y la nota como «orientativa» |
| **F0-5** | **Voz en-US con pares y letras** | La voz del teléfono lee los ~80 pares del MVP y las 26 letras (sueltas, «A.», «ay»…) | ≥ 95 % de pares y 26/26 letras bien según el dueño | Tabla `ttsText` por letra; los pares que fallen se cambian en el contenido |
| F0-6 *(opcional)* | Gemini con elección forzada («¿dijo *ship* o *sheep*?») sobre las grabaciones de F0-4 | 1 petición con las 20 | Solo se mide (≥ 80 % = candidata para F3) | Nada: no entra en la 5.11 |

**Salida de F0:** `docs/v5.11/F0-resultados.md` con «sí/no» por punto, la lista final de audios con su crédito, los umbrales
(nota del fonema, «te salió»), el juego de símbolos real y la tabla `ttsText`; y las respuestas de Azure (JSON, sin audio ni
claves) en `tests/fixtures/` para M-11 y S-06.

---

## 8 · Riesgos

| Riesgo | Sev. | Mitigación |
|---|---|---|
| La 5.10.1 se alarga y la 5.11 empieza sobre un árbol a medias | Alta | No se crea `v5.11` hasta que la 5.10.1 esté en `main`; F0 por CDP no toca `src/` y puede ir antes |
| **Errores de fonética en el contenido** (par que no es par, ejemplo con otro sonido) | Alta | Muestra aprobada antes del resto, validador + CMUdict, R revisa el 100 % de los pares |
| Wikimedia no tiene grabaciones americanas para /æ ɑ ɹ ɝ ɚ/ y diptongos | Media | F0-1b decide archivo a archivo; sin audio, palabra clave lenta (pregunta 2) |
| Azure generoso con palabras sueltas o NBest poco fiable | Media | F0-4 fija umbrales; texto «nota orientativa»; «Escúchate» siempre disponible |
| La madre y las amistades no tienen Azure: Sonidos «a medias» | Media | Escucha, Clasifica, Abecedario y «Escúchate» funcionan sin nada; «dominado solo de oído» visible |
| Choques en `App.tsx`/`Home.tsx` | Media | Dueño único (D4) + integraciones I-1, I-3, I-4 con interfaz fijada; campos nuevos opcionales |
| M-06 hace al profe menos natural o se cuela en el test | Media | Estilo decidido en código; prompts del test/«Dilo tú»/Gramática con test de igualdad; prueba de 10 turnos real |
| Celebraciones que gastan batería o molestan | Baja | ≤ 2 s, una por vez, paradas en segundo plano; se pueden apagar con los avisos de la mascota |
| Comodín malinterpretado («¿por qué no subió mi racha?») | Baja | La mascota lo dice al día siguiente; test de fechas |
| Licencia CC BY-SA mal atribuida | Baja | `credits.json` obligatorio por validador; pantalla de créditos revisada por R |
| Tamaño del bundle y arranque | Baja | JSON de Sonidos con `import()` perezoso; medir chunk y arranque en frío |

---

## 9 · Estimación (jornadas de trabajo con agentes, como Gramática)

| Bloque | Trabajo | Jornadas |
|---|---|---|
| F0 | Orquestador + dueño (teléfono) | 1–2 |
| D1 | M-04 0,75 · M-08 0,5 · M-09 0,5 · M-11 0,75 · M-12 0,5 · S-06 1 · S-11 0,25 | ≈ 4,25 (+ espera de F0-4) |
| D2 | M-03 1,5 · M-06 0,75 · M-07 0,75 · M-10 1 | ≈ 4 (+ margen de NC) |
| D3 | S-01 0,5 · S-02 2,5 · S-03 0,5 · S-04 1 · S-05 1 | ≈ 5,5 |
| D4 | S-07 1,5 · S-08 1,5 · S-09 0,75 · S-10 2 · S-11 0,25 · I-1, I-3, I-4 0,5 | ≈ 6,5 |
| R | Rondas en paralelo + regresión final en el navegador | 2 al final |
| Orq. | APK debug, `MOVIL.md`, prueba en el POCO con el dueño, Novedades, release | 1 |

**Calendario:** F0 (1–2) → desarrollo en paralelo (7–8, marcado por D4 y el contenido de D3) → regresión + teléfono (2–3) = **10–12 jornadas**.
La 5.11.x (F2 de Sonidos) se estima en 6–8 jornadas aparte.

---

## 10 · Decisiones del dueño (2026-10-21)

1. **A11:** no está disponible. Las medidas de pantalla se hacen en el **navegador con emulación de dispositivos** (tamaño,
   densidad y agente de usuario): Galaxy A11 vertical y horizontal (~360×780 y ~806×387 con la franja rota), POCO X6, 320×640,
   un Pixel y una tablet pequeña, como **matriz de dispositivos** reutilizable por el revisor. Límite: la emulación no
   reproduce el WebView antiguo del A11, sus voces reales ni su CPU; eso queda marcado como «pendiente en el A11 real».
2. **Sonidos sin audio americano en Wikimedia** (/æ ɑ ɹ ɝ ɚ/, diptongos): **solo dentro de palabras** (palabra clave lenta
   con la voz del teléfono); el resto, sueltos de Wikimedia.
3. **Ruta completa de Sonidos:** **5.11.x por excepción** (completa la sección nacida en la 5.11); «Juntos» sigue en la 5.12.

### Preguntas que se hicieron

1. **A11 de tu madre en F0:** ¿autorizas medir en su teléfono las voces (pares y letras) y la tabla en su pantalla real, con
   copia previa de su estado y sin instalar nada sobre su app? Sin él, F0-3/F0-5 valen solo para el POCO. *(Bloquea F0-5 para
   el A11.)*
2. **Sonidos sueltos que Wikimedia no tiene en americano** (/æ ɑ ɹ ɝ ɚ/ y diptongos, previsiblemente): ¿se quedan en la 5.11
   **sin** «▶ sonido suelto» (solo la palabra clave lenta) o quieres otra fuente para ellos (grabar a una persona, Gemini TTS)?
   *(Por defecto: sin audio. Bloquea S-04.)*
3. **Nombre de la versión siguiente de Sonidos:** la ruta completa (21 lecciones + repasos, «Para ti», Repaso) son funciones
   visibles; por la convención del 2026-10-06 sería MINOR (5.12) y empujaría «Juntos» a la 5.13. ¿La llamamos 5.11.1/5.11.2
   como excepción «solo contenido» o pasa a ser la 5.12? *(No bloquea la 5.11; bloquea la planificación siguiente.)*
