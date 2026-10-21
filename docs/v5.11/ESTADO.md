# 5.11 «Motivación» + «Sonidos» — tablero

> Fuente de verdad del avance. Plan, criterios de aceptación y F0: `docs/v5.11/PLAN.md`.
> Si se corta la sesión: `Lee docs/v5.11/PLAN.md y docs/v5.11/ESTADO.md y continúa la orquestación de la 5.11 (desarrollo + revisión).`
> Rama: `v5.11`, creada el 2026-10-21 desde la 5.10.1 commiteada (`307ecd7`, rama `v5.10.1-correcciones`) a petición del dueño; la release y la fusión de la 5.10.1 en `main` siguen pendientes. Sin commits ni push hasta que el dueño apruebe.
> Estados: `pendiente` → `en desarrollo` → `para revisar` → `en revisión` → `NC` (vuelve a dev) / `aprobada`.

## ⏸ PAUSA (2026-10-21, ~11:30, a petición del dueño por el límite de uso) — estado exacto
- **Git:** commits locales `c52bb69` y `307ecd7` (rama `v5.10.1-correcciones`) y `d7af553` (rama `v5.11`, actual). **NADA está
  en GitHub todavía**: el `git push` de las dos ramas falló («the remote end hung up», internet lento, ~20 MB nuevos) y el
  reintento se detuvo. Para reanudar, desde el PC: `git push -u origin v5.10.1-correcciones` y luego `git push -u origin v5.11`
  (ya está `http.postBuffer` = 500 MB en la config local; si vuelve a cortarse, reintentar o subir por partes). `main` intacta.
  Sin ramas en GitHub, una sesión de Claude Cloud **no** verá este trabajo.
- **Estudio del modo ligero (aprobado por el dueño):** el agente se detuvo a medias (medidas en marcha). Hay borrador en
  `docs/v5.11/rendimiento/EVALUACION.md` y evidencias en `docs/v5.11/rendimiento/evidencia/` (`medir.mjs`, `medidas.json`,
  `resumen.mjs`). Retomar: completar las medidas y la propuesta (grupos, preajuste «Modo ligero», menú «Apariencia» con
  submenús) y luego desarrollarlo (5.11.x).
- **Teléfono:** «Habla debug» tiene la 5.11 de antes de las pausas; el APK debug más reciente (con pausas y retoques) está en
  `apk/Habla-v5.11-debug.apk`, sin instalar (el teléfono se desconectó). Instalar con `adb -s 60d0718c install -r`.
- Todos los agentes de desarrollo y el revisor están parados; la 5.11 está aprobada en PC (0 NC).

## ▶ CÓMO CONTINUAR (2026-10-21, límite de uso de 5 h casi agotado) — para una sesión en Claude Cloud o en el PC
- **Estado:** desarrollo de la 5.11 **terminado y aprobado en PC** (regresión final GO, 0 NC abiertas; `npm test` 357/358 + 1 `todo`).
  Commit local en la rama `v5.11` (2026-10-21). APK debug 5.11 (build 42) compilado en `apk/` (fuera de git); el teléfono
  tenía instalado el de antes de las pausas (se desconectó al instalar el último).
- **En Claude Cloud se puede hacer** (no hay teléfono ni Android SDK): revisar código y documentación, pasar `npm test`/`tsc`/lint/
  validadores, ajustes de contenido, la observación de «teach / er» con letra Muy grande (celda /ɝ ɚ/), y preparar
  `docs/v5.11/MOVIL.md`. **Requisito:** que las ramas estén en GitHub (`git push origin v5.10.1-correcciones v5.11`, con permiso del dueño).
- **Solo en el PC con el POCO** (con el dueño): F0-1/F0-1b (escuchar las 24 grabaciones), F0-4 (20 palabras con Azure:
  `docs/pruebas/regresion-5.10/arnes/f0-azure.js`), F0-5 (letras y pares con la voz en-US), pausas al leer (Present Simple y
  clase de Gramática), micro real en Sonidos y Repaso (regla 9), M-06 con Gemini real, CPU de la celebración, recordatorio
  diario. Lista completa en `REVISION.md` «Regresión final 5.11». Después: APK release, aprobación y fusión.
- **Pendientes del dueño:** confirmar su cambio del Present Simple (`src/grammar/tenses.json`) para llevarlo también a
  `v5.10.1-correcciones`; release 5.10.1 sobre su app diaria y fusión de la 5.10.1 en `main`; modo ligero aprobado
  (estudio en `docs/v5.11/rendimiento/EVALUACION.md` cuando el agente lo entregue → desarrollo en 5.11.x); animación de la boca
  en Sonidos para más adelante (`BACKLOG.md` §5.0).

## Reglas
- **Cada desarrollador solo toca SUS archivos** (PLAN §4). Si necesita uno de otro, lo pide al orquestador en su informe.
  `App.tsx` y `Home.tsx` son de D4: las demás piezas se enganchan por las integraciones I-1, I-3 e I-4.
- Mismo árbol para todos: nada de `git stash`, `checkout`, `reset` ni formatear archivos ajenos.
- Ningún agente compila el APK ni toca `keystore/`, `version.json`, `changelog.ts`, `android/` ni el teléfono (salvo encargo de F0).
- No se tocan: `CorrectionView.tsx` y el «EVERY real error» del prompt (UX-02: todas las correcciones, siempre).
- Antes de «para revisar»: `npx tsc -b`, `npm run lint` (0 errores), `npm test`, `node scripts/validate-grammar.mjs`,
  `node scripts/validate-bank.mjs` y, si tocó Sonidos, `node scripts/validate-sounds.mjs`. Un test nuevo por arreglo de lógica.
- Estilo del proyecto (CLAUDE.md), comentarios en español citando el id (`// 5.11 (M-04): …`). Textos en español neutro
  latinoamericano con «tú».
- Política de niveles intacta: nada de la 5.11 cambia el nivel.

## Alcance aprobado (dueño, 2026-10-20)
Motivación: P-03 (M-03), P-04 (M-04), P-06 (M-06), P-07 (M-07), P-08 (M-08), P-09 (M-09), P-10 (M-10) + NBestPhonemeCount (M-11)
+ consejo de /θ/ para Latinoamérica (M-12). Sonidos: MVP (S-00…S-11).
**Excluidas:** P-01 (hecha en la 5.10.1), P-02 (rechazada: mostrar todas las correcciones), P-05 (no aprobada).
**5.12+:** P-11, P-12, P-13, P-14, P-17. **5.11.x:** ruta completa de Sonidos (F2).

## Reparto
| Dev | Bloque | Tareas | Archivos (propiedad exclusiva) — detalle en PLAN §4 |
|---|---|---|---|
| **D1** | Hábito y fonética | M-04, M-08, M-09, M-11, M-12, S-06, S-11 (línea) | `stats.ts`, `mascotTips.ts`, `reminders.ts`, `PlanCard.tsx`, `pronunciation.ts`, `phonetics.ts`, `wav.ts`, `PronunciationView.tsx`, `tests/mascotTips`, `tests/d4-phonetics`, nuevos `tests/m1-*`, `tests/fixtures/azure-*` |
| **D2** | Logros y clase | M-03, M-06, M-07, M-10 | `ProgressScreen.tsx`, `teacher.ts`, `fluency.ts`, `ReportView.tsx`, `Conversation.tsx` (solo nº de turno), `ReviewScreen.tsx`, `srs.ts` (si hace falta), `SettingsScreen.tsx`, tests de prompts/fluidez; nuevos `milestones.ts`, `MilestoneGate.tsx`, `turnStyle.ts`, `tests/m2-*` |
| **D3** | Sonidos: contenido y datos | S-01, S-02, S-03, S-04, S-05 | `db.ts`, `settings.ts`, `backup.ts`, `backupCheck.ts`, `AboutScreen.tsx`, `package.json` (scripts), `.gitignore`; nuevos `src/sounds/*.json`, `public/sounds/*`, `sounds.ts`, `validate-sounds.mjs`, `scripts/data/`, `FORMATO-sonidos.md`, `tests/m3-*` |
| **D4** | Sonidos: interfaz e integración | S-07, S-08, S-09, S-10, S-11 (hoja), I-1, I-3, I-4 | `App.tsx`, `Home.tsx`, `index.css`, `tts.ts`, `theme.ts`; nuevos `Sound*.tsx`, `PhonemeChart.tsx`, `AlphabetScreen.tsx`, `soundLink.ts`, `soundAudio.ts`, `tests/m4-*` |
| **R** | Revisor | Todas, por bloque + regresión final | Escribe solo `docs/v5.11/REVISION.md` y `docs/v5.11/evidencia/R/` |
| **Orq.** | Orquestador | S-00 (F0) con el dueño, APK debug, `MOVIL.md`, Novedades y versión | `version.json`, `changelog.ts`, `CLAUDE.md`, docs; `docs/v5.11/F0-resultados.md` |

## Bloqueos
| Bloqueo | Desbloquea | Estado |
|---|---|---|
| 5.10.1 aprobada y en `main` → crear rama `v5.11` | Todo el código | pendiente |
| S-01 contrato (Dexie v5, ajustes, tipos) | M-03, M-10, S-05 | **hecho** (D3, 2026-10-21) |
| F0-1 / F0-1b audios Wikimedia | S-04 | pendiente |
| F0-4 Azure por fonema y NBest (+ fixtures) | M-11, S-06 | pendiente |
| F0-5 voz en-US con pares y letras | `ttsText` de S-02, S-09 | pendiente |
| Muestra de contenido (ih, iy, th, V1, C2a) aprobada | Resto de S-02 | **aprobada por R** con 2 cambios (REV-11-D3-01/02) |
| Preguntas al dueño (PLAN §10): 1 A11 · 2 audios sin americano · 3 nombre de la 5.11.x | F0-5 en el A11 · S-04 · plan siguiente | pendiente |

## Avance
| Id | Tarea | Dev | Estado | Ronda | Notas |
|---|---|---|---|---|---|
| S-00 | F0 · viabilidad en el POCO (F0-1…F0-6) | Orq. + dueño | pendiente | — | |
| S-01 | Contrato del día 0 (Dexie v5, ajustes, tipos, copias) | D3 | aprobada | 1 | R: migración solo aditiva, ajustes con valores por defecto, copias opcionales; m3 21/21 |
| S-02 | Contenido: 41 fichas, abecedario, 12 lecciones | D3 | aprobada | 2 | R: 430 pares comprobados con CMUdict, 0 malos; REV-11-D3-01…04 cerradas. `ttsText` de las letras sigue pendiente de F0-5 |
| S-03 | Validador `validate-sounds.mjs` | D3 | aprobada | 1 | R: OK con CMUdict (2 avisos revisados); coincide con la comprobación independiente de R |
| S-04 | Sonidos sueltos de Wikimedia + créditos en «Acerca de» | D3 | para revisar | 1 | 24 audios enlazados a sus fichas. R: créditos correctos (5/24 en Commons). Falta F0-1/F0-1b del dueño |
| S-05 | Motor `sounds.ts` (mapa Azure, progreso, dominado) | D3 | aprobada (código) | 1 | R: JSON en chunks propios. Chunk principal de la 5.11: +27,7 KB gzip frente a la 5.10.1 (por el código de UI, no por los datos): **decide el orquestador** (¿`React.lazy` de las pantallas de Sonidos?) |
| S-06 | `assessWord()` con NBest | D1 | aprobada (código) | 1 | R: código y política F0/S0 OK; aceptación final con fixtures reales de F0-4 y Tel (≤ 15 s / 5 palabras). `REVISION.md` § D1 parcial |
| S-07 | Pestaña «Sonidos» + tabla fonémica | D4 | aprobada | 4 | R: retoques verificados: celda /ɝ ɚ/ sin cortar en 390×844 (con Muy grande, «teach/er» en dos líneas: observación); Inicio 0 px en las 4 pestañas con Normal y Muy grande |
| S-08 | Ficha de sonido | D4 | aprobada (código) | 2 | R: REV-11-D4-03 cerrada; recorrido de fichas con `renderToString`. Tel pendiente (audio suelto ≤ 300 ms, Bluetooth, voz en-US con Leo) |
| S-09 | Abecedario | D4 | para revisar | 2 | Con el contenido real: letras (`letters`), `spell-listen` con `hintEs`, Clasifica de 3 columnas debajo de la palabra; A1–A3 hasta el cierre en Nav. Tel: 26 letras (F0-5) |
| S-10 | Lecciones y ejercicios | D4 | para revisar | 2 | Las 12 lecciones reales hasta el cierre en Nav (12/12 `completedAt`); 60 ejercicios pintados en test. Micro real solo en Tel |
| S-11 | Enlace desde la fonética (línea D1 + hoja D4) | D1 + D4 | aprobada | 2 | R: línea solo con `pausable` (no en el test de nivel); Nav: hoja encima de una clase simulada, al cerrarla la clase sigue igual (sin desmontar, 0 peticiones). Grabación en curso: Tel |
| M-03 | Hitos con celebración + «Tus logros» | D2 | aprobada (código) | 3 | R: REV-11-D2-06 cerrada (la marca `_since` no viaja ni sube la versión; probado contra el `backupCheck` real de la 5.10.1). Tel CPU pendiente |
| M-04 | Comodín de racha | D1 | aprobada | 2 | R: REV-11-D1-02/03 cerradas (M04 muere, `restInfo` probada) |
| M-06 | Variedad del profe (`turnStyle`) | D2 | aprobada (código) | 2 | R: REV-11-D2-03 cerrada. Tel con clave real pendiente |
| M-07 | Informe contra ti mismo + «Hoy has sonado como…» | D2 | aprobada | 2 | R: REV-11-D2-05 cerrada («/min») |
| M-08 | Error del plan con la mascota y alternativa | D1 | aprobada | 2 | R: REV-11-D1-04 cerrada (40 px, medido por D1) |
| M-09 | Variantes de avisos y consejos que se jubilan | D1 | aprobada | 2 | R: REV-11-D1-01 y D1-05 cerradas. Tel: recordatorio variado día a día |
| M-10 | Repaso «Que decida Habla» + «Escucha y repite» | D2 | aprobada (código) | 2 | R: REV-11-D2-04 cerrada. Nav de la cuenta atrás → regresión final |
| M-11 | «Te salió /s/ en vez de /θ/» en la clase | D1 | aprobada (código) | 1 | R: misma petición y mismo audio que la 5.10.1; sin NBest igual que hoy. Pendiente F0-4 (umbrales, fixtures reales, acotar la reserva del 400) y Tel |
| M-12 | Consejos /θ/ /ð/ para Latinoamérica + `SOUND_TIPS` desde JSON | D1 | aprobada | 2b | R: tabla del código borrada; `SOUND_TIPS` = `tips.json` (una sola fuente) |
| I-1 | Montar `MilestoneGate` en el Inicio | D4 (pide D2) | aprobada | 1 | R: probada en la revisión de D2 (3 tamaños, después de `NoticeGate`) |
| I-3 | `onOpenSound` → `SoundSheet` en `App.tsx` | D4 | aprobada | 1 | R: `openSound('th')` abre la hoja, ← la cierra, el Inicio sigue. Encima de una clase: regresión final con la línea de D1 |
| I-4 | `PlanCard.onAltTopic` desde `Home` | D4 (pide D1) | para revisar | 2 | Ronda 1 aprobada por R. Ronda 2: `newTipRound()` al montar el Inicio (M-09 / REV-11-D1-05), con test en m4-sounds |
| PAU | Pausas naturales al leer (petición del dueño): 200/400/500 ms por puntuación, 600 antes de un ejemplo, ejemplos al 85 % | D4 | aprobada | 2 | R: REV-11-PAU-01 cerrada (P5 muere); test de Leo independiente del orden (P9 muere). npm test 358: 357 ✔, 0 ✖ |
| REG | Regresión final en el navegador (3 tamaños, 2 temas) | R | aprobada | — | **GO** para APK debug y Tel: 350 tests ×3 en verde, Inicio 0 px en vertical (Normal y Muy grande), 12/12 lecciones, 44/44 fichas, Repaso con cuenta atrás, migración real v4→v5; arranque +14,7 KB gzip. Pausas de voz (PAU): bloque aparte |
| MOV | Prueba en el POCO (`MOVIL.md`) y aprobación del dueño | Orq. + dueño | pendiente | — | |

## Bitácora (lo último arriba)
- 2026-10-21 · R: **retoques de la regresión final verificados** → S-07 y PAU **aprobadas**. REV-11-PAU-01 cerrada; celda /ɝ ɚ/ sin «…» (con Muy grande, «teach/er» en dos líneas: observación). Inicio 0 px en 390×844 con Normal y Muy grande. `npm test` 358: 357 ✔, 0 ✖, 1 `todo`.
- 2026-10-21 · D4: retoques de la regresión final → para revisar: REV-11-PAU-01 (test ⏸ en el hueco del deletreo), celda /ɝ ɚ/ sin cortar «teacher», test de la voz con Leo independiente del orden. tsc OK, lint 0 errores, npm test 3 veces: 357 + 1 todo, 0 fallos.
- 2026-10-21 · R: **PAU (pausas al leer) → GO** con REV-11-PAU-01 (BAJA, test del ⏸ en el hueco del deletreo). `d2-audioFocus` sigue probando lo mismo (9/9 mutantes de la 5.10.1 mueren). `npm test` 357: 356 ✔, 0 ✖, 1 `todo`.
- 2026-10-21 · D4: PAU ronda 3 → para revisar. «Con · 0 ms · he, she or it»; «ejemplo: · 612 ms · I work from home». npm test 356 + 1 todo, 0 fallos. Listo para compilar.
- 2026-10-21 · D4: PAU ronda 2 → para revisar: «or», but, nor, with, from, into, there, here, these, those, also, only, very, some a la voz inglesa; «Con he, she or it el verbo…» ya va bien partido. Ojo: «he, she or it» (4 palabras) recibe ahora la pausa de ejemplo tras «Con» (regla ≥ 3 palabras); anotado para el dueño. npm test 356 + 1 todo.
- 2026-10-21 · R: **regresión final → GO** (todos los bloques). Chunk principal explicado: Dexie y `db.ts` pasan a un chunk `db-*.js` importado y precargado al arrancar (no se cayó nada); arranque 596,6 → 611,3 KB gzip (+14,7). Intermitente de «S-08 recorrido» no reproducido en 3 pasadas. Observaciones: «40 sonidos» en Novedades, *teacher* cortado en la celda /ɝ ɚ/. Lista de Tel en `REVISION.md` § Regresión final.
- 2026-10-21 · D4: **pausas al leer** → para revisar (fila PAU). 600 ms antes de «I work from home» tras «ejemplo:»; las palabras inglesas sueltas dentro de una frase, seguidas (decisión al medir, anotada en el informe). ⏸ en una pausa corta al instante. npm test 355 + 1 todo, 0 fallos.
- 2026-10-21 · D4: **ronda 4** → para revisar S-09, S-10 y la carga diferida. Contenido real: 44 fichas abiertas y 12 lecciones hasta el cierre (Nav, 320×640). Test «recorrido» arreglado (apóstrofo escapado) + recorrido de los 60 ejercicios. Sonidos con React.lazy: chunk principal 583,0 KB gzip (5.10.1: 599,7). npm test 348 + 1 todo, 0 fallos; validate-sounds OK. Informe: docs/v5.11/dev/D4.md.
- 2026-10-21 · R: **D3 ronda 2 APROBADA** (REV-11-D3-03 build/kid, REV-11-D3-04 «tierra, bien o pie»). S-02 aprobada. Espero a D4 (S-09, `React.lazy`, test del apóstrofo) para la regresión final.
- 2026-10-21 · D3: **ronda 2 para revisar** → REV-11-D3-03 (*busy* fuera de «Clasifica»: S0-3 *build*, V1-2 *kid*) y REV-11-D3-04 (ficha /j/: «tierra», «bien», «pie» en vez de «hielo»). `validate-sounds` con CMUdict 0 errores; `m3-*` 22/22. Informe `docs/v5.11/dev/D3.md` § Ronda 2.
- 2026-10-21 · R: **D3 ronda 1 → NC (2 BAJA)**: 430 pares mínimos comprobados con CMUdict por R, 0 malos; textos y notas UK muy buenos; REV-11-D3-03 (*busy* en «Clasifica») y REV-11-D3-04 (*hielo* para /j/). S-03 aprobada, S-05 aprobada en código; tamaño del chunk principal (+27,7 KB gzip por la UI de la 5.11) a decidir por el orquestador. **D1 ronda 2b APROBADA** (M-12 cerrada). Intermitente de `m4` «S-08 recorrido»: en la regresión final.
- 2026-10-21 · D1: **M-12b para revisar (ronda 2b)** → con las fichas completas, `SOUND_TIPS` sale solo de `tips.json` (tabla del código borrada); `d4-phonetics` comprueba que «needed» no lleve el consejo de -ed. 348/349 tests (1 `todo`). `dev/D1.md` § Ronda 2b.
- 2026-10-21 · D3: **ronda 1 para revisar** → S-02 completo (41 fichas + rasgos `s-cluster`/`ed`/`s-ending`, abecedario, 12 lecciones; A1–A3 listas para S-09), S-03, S-04 y S-05. REV-11-D3-01/02 y las observaciones de R aplicadas. CMUdict descargado (con permiso, de cmusphinx/cmudict) en `scripts/data/` (fuera de git): `validate-sounds` 0 errores, 2 avisos revisados. tsc y lint limpios; `npm test` 345/348 + 1 `todo`: los 2 fallos son de tests ajenos que destapa el contenido completo → **D1** `d4-phonetics:53` (`needed`+/d/ ya tiene consejo de /d/) y **D4** `m4-sounds` «S-08 recorrido» (`renderToString` escapa el apóstrofo de *won't*). Informe `docs/v5.11/dev/D3.md`.
- 2026-10-21 · R: **muestra S-02 aprobada con 2 cambios** → D3 puede escribir las 41 fichas. REV-11-D3-01 (MEDIA): en `dh`, bathe/bath y breathe/breath no son pares mínimos (cambia la vocal); REV-11-D3-02 (BAJA): «la segunda d de nada». 81 pares revisados, resto correctos. S-01 aprobada. S-04: créditos y licencias OK (5/24 comprobados en Commons); espera F0-1b del dueño.
- 2026-10-21 · R: **REV-11-D4-04 cerrada** (`FillPanel`): con Sonidos abierto y la tarjeta del plan creciendo, el Inicio se reajusta solo a 0 px de scroll en 390×844 y 320×640 (secuencia real, capturas `R4-01/02`). S-07 aprobada.
- 2026-10-21 · D4: REV-11-D4-04 → para revisar (FillPanel con ResizeObserver sobre el bloque del Inicio; medida 390×844: +44 px arriba → Inicio 0 px). Ojo: con el panel del navegador oculto los ResizeObserver no se disparan (medir con la pestaña al frente o con captura). npm test 346 + 1 todo, 0 fallos.
- 2026-10-21 · R: **D2 ronda 3 → APROBADA** (REV-11-D2-06): copia 5.11 sin logros = versión 1 y la 5.10.1 real (307ecd7) la acepta; con logros = versión 3, «versión más nueva». 3/3 mutantes mueren; `npm test` 346 ✔ / 0 ✖. REV-11-D4-04 sigue en curso.
- 2026-10-21 · D2: **ronda 3** → M-03 para revisar con REV-11-D2-06 corregida en `backupCheck.ts` (`exportTables`/`backupVersionFor`, permiso del orquestador). `npm test` 345/346 + 1 `todo`. Informe `docs/v5.11/dev/D2.md` § Ronda 3.
- 2026-10-21 · R: **rondas 2** → D1 **APROBADA** (M-04, M-08, M-09, M-12 y la línea de S-11; hoja sobre una clase simulada sin perder el turno). D2: D2-01…05 cerradas, **REV-11-D2-06 (MEDIA)** nueva (marca `_since` → toda copia versión 3). D4: D4-01…03 cerradas, **REV-11-D4-04 (MEDIA)** nueva (Inicio con scroll en Sonidos si crece la tarjeta del plan). `npm test` 340 ✔ / 0 ✖. Detalle en `REVISION.md` § Rondas 2.
- 2026-10-21 · D4: newTipRound() al montar el Inicio (M-09 / REV-11-D1-05) → para revisar. Test en m4-sounds; npm test 342 + 1 todo, 0 fallos. Sigo esperando A1–A3 de D3 para S-09.
- 2026-10-21 · D1: **ronda 2 para revisar** → NC REV-11-D1-01…05 cerradas; M-12b (`SOUND_TIPS` desde `tips.json`) y la línea de S-11 hechas. 341/342 tests (1 `todo` SEG-509). Informe `docs/v5.11/dev/D1.md` § Ronda 2.
- 2026-10-21 · D2: **ronda 2** → para revisar M-03, M-06, M-07 y M-10 con las 5 NC de R corregidas (REV-11-D2-01 MEDIA + 4 BAJA). tsc y lint limpios, `npm test` 339/340 + 1 `todo`. Informe `docs/v5.11/dev/D2.md` § Ronda 2.
- 2026-10-21 · D4: **ronda 2** → para revisar. REV-11-D4-01 (tabla en px reales: compacto con 2 bloques plegables cuando no caben 36 px; 320×640: consonantes 67×36, vocales 53×44 px reales), REV-11-D4-02 (test de la regla 9 en SoundSay), REV-11-D4-03 (test de la voz en-US con Leo, mutante muerto), recorrido de las fichas con react-dom/server (línea aprobada en speaking.ts). m4-sounds 19/19. Evidencia en docs/v5.11/evidencia/D4/. S-09 sigue esperando A1–A3 (D3).
- 2026-10-21 · D3 → D1 (M-12b, S-11): `src/sounds/tips.json` = `{ byAzure: {símbolo: tipShortEs}, byId: {id: tipShortEs} }` (incluye `s-cluster`, `ed`, `s-ending` cuando estén), unos pocos KB: se puede importar estático en `pronunciation.ts` sin meter las fichas en el arranque. Lo genera `node scripts/validate-sounds.mjs --write-tips` y el validador falla si no está al día. Para S-11: `phonemeByAzure(phonemes, symbol, word, omission)` y `lessonFor(lessons, id)` en `src/lib/sounds.ts` (con `loadSounds()`), mismos casos especiales que `soundTipEs`.
- 2026-10-21 · R: **D4 ronda 1 revisada → NC (1 MEDIA + 2 BAJA)**. Regla 9 bien en `SoundSay`; I-1, I-3 e I-4 aprobadas. REV-11-D4-01 (celdas 32 px reales en 320×640, ya corregidas en la ronda 2 en curso), REV-11-D4-02 (test de la regla 9 en `SoundSay`), REV-11-D4-03 (test de voz en-US con Leo). m4 17/17; 8/10 mutantes mueren. Detalle en `REVISION.md` § D4.
- 2026-10-21 · R: **D2 ronda 1 revisada → NC (1 MEDIA + 4 BAJA)**. REV-11-D2-01 (MEDIA): `isBackfill` silencia el primer hito de un alumno nuevo pasados 2 días (reproducido). Resto: huecos de test (D2-02/03/04) y unidad de las pausas (D2-05). Política de niveles intacta; Nav de M-03 (3 tamaños) y M-07 (320×640) OK. 21/25 mutantes mueren. Detalle en `REVISION.md` § D2.
- 2026-10-21 · D4: **entrega ronda 1** → para revisar S-07, S-08, S-10, hoja de S-11, I-1, I-3, I-4; S-09 a falta de las lecciones A1–A3 (D3). tsc OK, lint 0 errores, `npm test` 326 + 1 todo (nuevo `m4-sounds`, 15). Nuevo archivo no previsto: `lib/soundGame.ts` (lógica pura). Informe `docs/v5.11/dev/D4.md`.
- 2026-10-21 · D3: **S-04 audios descargados** (con permiso del dueño, solo Wikimedia Commons): 24 sonidos sueltos en `public/sounds/` (486 KB, todos ≤ 30 KB, sin modificar, sha1 = el de Commons; los 24 se decodifican en Chromium), créditos en `src/sounds/credits.json` y página «Acerca de → Créditos → Audios de los sonidos». Sin audio (solo dentro de palabras): /æ ɑ ɹ ɝ ɚ/, diptongos, /ʌ/ (la grabación es la [ʌ] cardinal, no la de *cup*) y las oclusivas /p b t d k ɡ/ (no se pueden alargar y no cabían en 0,6 MB). Falta F0-1b (el dueño los escucha) y F0-1 (WebView del POCO). Migración v4 → v5 con datos comprobada en el navegador.
- 2026-10-21 · R: **D1 parcial revisada → NC (5 × BAJA)**. Aprobadas en código M-11, S-06 y M-12a (aceptación final con F0-4/Tel); NC en M-04 (REV-11-D1-02/03, huecos de test), M-08 (REV-11-D1-04, toque de «¿Por qué?») y M-09 (REV-11-D1-01 recordatorio, REV-11-D1-05 texto del globo). 50/50 tests de D1; 21/25 mutantes mueren; Nav de M-08 en 3 tamaños con I-4. El único ✖ de `npm test` es `m3-sounds` (D3, en curso). Detalle en `REVISION.md` § D1 · parcial.
- 2026-10-21 · D3: **muestra S-02 para revisar** → `src/sounds/phonemes.json` (principales `ih`, `iy`, `th`; además `eh`, `t`, `f`, `dh`, `s`, que citan sus pares) y `src/sounds/lessons.json` (V1 y C2a); abecedario completo en `alphabet.json`. `node scripts/validate-sounds.mjs --muestra` OK (las referencias a fichas aún sin escribir salen como avisos). Espero la aprobación de R antes de escribir el resto de las 41 fichas.
- 2026-10-21 · D3: **contrato S-01 listo** → Dexie v5 (`sounds: 'id, lastAt'`, `milestones: 'id, at'`, tipos `SoundProgress`/`Milestone`/`SoundState` en `db.ts`), ajustes `soundsIntroSeen` y `reviewAutoGrade` (false), copias con las dos tablas opcionales (`BACKUP_MAX_VERSION` 3: la copia es 3 solo si lleva Sonidos o logros; vacías no se exportan, así la 5.10.1 sigue leyendo las copias sin ellas), tipos y motor en `src/lib/sounds.ts`, formato en `docs/v5.11/FORMATO-sonidos.md`, `scripts/validate-sounds.mjs` (`npm run validate:sounds`). Tests `m3-migration`, `m3-sounds`, `m3-validate`.
- 2026-10-21 · D4: árbol compilando otra vez (`tsc -b` OK; la UI de Sonidos usa ya `src/lib/sounds.ts` de D3, sin `soundData`). Integraciones **I-1** (MilestoneGate en el Inicio, App.tsx) e **I-4** (PlanCard `favorites`/`onAltTopic`, `restedYesterday`, `noteTipShown`) hechas; I-3 (`onOpenSound` → `SoundSheet`) hecha. S-07…S-11 en desarrollo.
- 2026-10-21 · D2: **entrega ronda 1** → para revisar M-03, M-06, M-07 y M-10 (usa el contrato S-01 ya presente en `db.ts`/`settings.ts`). Pide I-1 a D4: `<MilestoneGate settings onDone />` en el Inicio. Informe `docs/v5.11/dev/D2.md`.
- 2026-10-21 · D1: **entrega parcial** (ronda 1) → para revisar M-04, M-08, M-09, M-11, S-06 y M-12a; S-11 (línea) y M-12b esperan a D3/D4; M-11/S-06 afinan umbrales con F0-4. Pide I-4 a D4. Informe `docs/v5.11/dev/D1.md`.
- 2026-10-21 · orquestador: alcance de Motivación aprobado por el dueño reflejado (fuera P-01, P-02, P-05; M-03 pasa a D2).
- 2026-10-20 · planificador: `PLAN.md` y tablero creados. Nada empezado.
