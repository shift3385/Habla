# Resumen del backlog y decisiones (2026-11-05)

Fuentes: `BACKLOG.md` §4–§5 y propuestas de `docs/pruebas/regresion-5.10/A5-usabilidad.md` (P-xx).
**En curso:** P-05, P-12 y P-11 → plan en `docs/v5.12/PLAN.md` (sesión nueva).
**Aparcado por el dueño (2026-11-05):** pruebas en el teléfono (`docs/pruebas/PENDIENTES.md`), tareas abiertas de la 5.11
(S-00, S-04, S-09, S-10, I-4, MOV en `docs/v5.11/ESTADO.md`), dibujo de la boca en Sonidos (primera versión subida, no
convence: `docs/v5.11/sonidos-boca/`) y preguntas de `docs/v5.11/PLAN.md` §10.

## 1. Propuestas grandes (orden recomendado: 5.12 = P-11 + P-05 + P-12 → luego P-14, P-13, P-16, P-17)
| # | Qué es | Impacto | Esfuerzo | Ojo / estado |
|---|---|---|---|---|
| P-11 | Memoria del alumno: 1–3 datos personales por clase, editables y borrables en Ajustes; el profe pregunta por uno al empezar | Muy alto | Medio | **Aprobado: el profe recuerda (activado).** En el plan 5.12 |
| P-05 | «Hacerla ahora»: la tarea del informe abre una clase corta para practicarla | Medio-alto | Bajo-medio | **En el plan 5.12** |
| P-12 | Roleplays con misión: situación real o de una lista, 3 objetivos que se tachan, «¡Lo conseguiste!» | Alto | Medio | **En el plan 5.12** (idea C del backlog) |
| P-14 | Retos semanales sacados de tus errores frecuentes, con barra de progreso | Alto | Medio | Una llamada a Gemini por semana |
| P-13 | El plan de 12 semanas como viaje (mapa con paradas; la mascota gana cosas) | Alto | Medio-alto | Cuidar el rendimiento (modo ligero) |
| P-16 | Shadowing y fonemas con la voz modelo y la nota de Azure | Alto | Alto | Gasta minutos de Azure; se cruza con Sonidos (aparcado) |
| P-17 | Tarjeta de la semana para WhatsApp y reto entre dos por código, sin servidor | Medio | Medio | Encaja con «Juntos» |
| P-15 | Primera charla de 2 min antes del test para la gente nueva | Medio | Medio | Toca la regla «el test va primero»: decide el dueño |

## 2. «Juntos»: practicar con otras personas que usan Habla (BACKLOG §5.1)
Ideas: compartir palabras; notas de voz en inglés entre dos (el profe corrige antes de enviar); retos y racha en familia;
roleplays en pareja. Formas, de menos a más infraestructura: (1) **sin servidor** (archivo o enlace por WhatsApp que se importa;
recomendada), (2) teléfonos cerca por Wi-Fi/Bluetooth, (3) en la nube con cuentas (probablemente 6.0).
Antes de diseñar: qué se comparte, si hace falta tiempo real y quién paga la IA de cada persona.

## 3. Mejoras de fondo aparcadas
- **Voz del profe más humana** (BACKLOG §4.2): voz en la nube con emoción; preferida la de Gemini (misma clave). Arreglaría
  también que **Leo suene con voz de mujer** en el POCO (§4.3).
- **Varios proveedores de IA** (§5.2): aparcado, se queda Gemini. Alternativa barata: elegir un Gemini más capaz para el profe.
- **Usuarios no técnicos** (§4.4): textos más claros, ayuda en la primera clase, mejores mensajes de error.
- **Ideas sueltas** (BACKLOG §3): E dictado y comprensión auditiva (esfuerzo bajo), F otros idiomas (alto), B shadowing (= P-16).

## 4. Antes de abrir la app a otras personas (6.0)
Acceso a la IA (clave propia, servidor propio o pago), publicación (Play Store), privacidad (política y consentimiento) y
datos (solo en el teléfono o sincronizados).
