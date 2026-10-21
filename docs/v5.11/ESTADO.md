# 5.11 «Motivación» + «Sonidos» — tablero

> Fuente de verdad del avance. Plan, criterios de aceptación y F0: `docs/v5.11/PLAN.md`.
> Si se corta la sesión: `Lee docs/v5.11/PLAN.md y docs/v5.11/ESTADO.md y continúa la orquestación de la 5.11 (desarrollo + revisión).`
> Rama: `v5.11` desde `main`, **solo cuando la 5.10.1 esté aprobada y en `main`**. Sin commits ni push hasta que el dueño apruebe.
> Estados: `pendiente` → `en desarrollo` → `para revisar` → `en revisión` → `NC` (vuelve a dev) / `aprobada`.

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
| S-01 contrato (Dexie v5, ajustes, tipos) | M-03, M-10, S-05 | pendiente |
| F0-1 / F0-1b audios Wikimedia | S-04 | pendiente |
| F0-4 Azure por fonema y NBest (+ fixtures) | M-11, S-06 | pendiente |
| F0-5 voz en-US con pares y letras | `ttsText` de S-02, S-09 | pendiente |
| Muestra de contenido (ih, iy, th, V1, C2a) aprobada | Resto de S-02 | pendiente |
| Preguntas al dueño (PLAN §10): 1 A11 · 2 audios sin americano · 3 nombre de la 5.11.x | F0-5 en el A11 · S-04 · plan siguiente | pendiente |

## Avance
| Id | Tarea | Dev | Estado | Ronda | Notas |
|---|---|---|---|---|---|
| S-00 | F0 · viabilidad en el POCO (F0-1…F0-6) | Orq. + dueño | pendiente | — | |
| S-01 | Contrato del día 0 (Dexie v5, ajustes, tipos, copias) | D3 | pendiente | — | |
| S-02 | Contenido: 41 fichas, abecedario, 12 lecciones | D3 | pendiente | — | |
| S-03 | Validador `validate-sounds.mjs` | D3 | pendiente | — | |
| S-04 | Sonidos sueltos de Wikimedia + créditos en «Acerca de» | D3 | pendiente | — | |
| S-05 | Motor `sounds.ts` (mapa Azure, progreso, dominado) | D3 | pendiente | — | |
| S-06 | `assessWord()` con NBest | D1 | pendiente | — | |
| S-07 | Pestaña «Sonidos» + tabla fonémica | D4 | pendiente | — | |
| S-08 | Ficha de sonido | D4 | pendiente | — | |
| S-09 | Abecedario | D4 | pendiente | — | |
| S-10 | Lecciones y ejercicios | D4 | pendiente | — | |
| S-11 | Enlace desde la fonética (línea D1 + hoja D4) | D1 + D4 | pendiente | — | |
| M-03 | Hitos con celebración + «Tus logros» | D2 | pendiente | — | |
| M-04 | Comodín de racha | D1 | pendiente | — | |
| M-06 | Variedad del profe (`turnStyle`) | D2 | pendiente | — | |
| M-07 | Informe contra ti mismo + «Hoy has sonado como…» | D2 | pendiente | — | |
| M-08 | Error del plan con la mascota y alternativa | D1 | pendiente | — | |
| M-09 | Variantes de avisos y consejos que se jubilan | D1 | pendiente | — | |
| M-10 | Repaso «Que decida Habla» + «Escucha y repite» | D2 | pendiente | — | |
| M-11 | «Te salió /s/ en vez de /θ/» en la clase | D1 | pendiente | — | |
| M-12 | Consejos /θ/ /ð/ para Latinoamérica + `SOUND_TIPS` desde JSON | D1 | pendiente | — | |
| I-1 | Montar `MilestoneGate` en el Inicio | D4 (pide D2) | pendiente | — | |
| I-3 | `onOpenSound` → `SoundSheet` en `App.tsx` | D4 | pendiente | — | |
| I-4 | `PlanCard.onAltTopic` desde `Home` | D4 (pide D1) | pendiente | — | |
| REG | Regresión final en el navegador (3 tamaños, 2 temas) | R | pendiente | — | |
| MOV | Prueba en el POCO (`MOVIL.md`) y aprobación del dueño | Orq. + dueño | pendiente | — | |

## Bitácora (lo último arriba)
- 2026-10-21 · orquestador: alcance de Motivación aprobado por el dueño reflejado (fuera P-01, P-02, P-05; M-03 pasa a D2).
- 2026-10-20 · planificador: `PLAN.md` y tablero creados. Nada empezado.
