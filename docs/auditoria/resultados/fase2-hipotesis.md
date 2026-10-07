# Fase 2 — Hipótesis asignadas por bot (orquestador)

Fuentes: `B1/hallazgos.md` (sección «Hipótesis para fase dinámica»), `B2/hallazgos.md` (ídem) y `B2/casos-e2e.md`, más los `plan-dinamico.md` de B3, B4 y B5.

| Bot | Debe comprobar |
|---|---|
| B3 micro | Su plan (M4b, M8b, M9b, M4, M1, M12, M7, resto; X1–X5) · AUD-MIC-301..313 · B1: H-B3-1..6 (+ ARQ-100, ARQ-104) · B2: H-B2-301..307 (+ FLU-213, FLU-214, FLU-215) |
| B4 fugas | Su plan P-B4-01..10 · AUD-FUG-401..408 · B1: H-B4-1..4 · B2: H-B2-401..405 · MIC-311 (audio en `habla-draft`) |
| B5 seguridad | Su plan P-01..P-11 · AUD-SEG-500..509 · B1: H-B5-1..3 (+ ARQ-102, ARQ-109) · B2: H-B2-501..504 (+ FLU-209, FLU-211) |
| B6 e2e | `B2/casos-e2e.md` (P1 primero: 001, 002, 004, 010–015, 020–022, 033, 034, 040) · B1: H-B6-1..5 · FLU-200, 202, 203, 204, 205, 206, 207, 212, 216, 219 |
| B7 resiliencia | B1: H-B7-1..5 (+ ARQ-110) · B2: H-B2-701..706 · FLU-212, FLU-217 · ARQ-104 (modo audio) |

Duplicados ya detectados (se unificarán en el informe): AUD-SEG-500 = AUD-FUG-401 · AUD-MIC-301/302 ≈ AUD-ARQ-100 ≈ H-B2-301 · AUD-SEG-501 ≈ AUD-ARQ-102 · AUD-SEG-505 ≈ AUD-FUG-403 · AUD-MIC-311 ≈ AUD-ARQ-115 · AUD-MIC-305 ≈ AUD-FLU-213.

Nota de B1: en dev (Vite) StrictMode monta todo dos veces; para el micrófono, el resultado que vale es el del APK en el teléfono.
