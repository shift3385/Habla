# B2 · Flujos (solo lectura)

**Misión:** inventariar todos los recorridos del usuario y sus ramas (éxito, error, cancelación, interrupción) leyendo el código, y entregar a B6 la lista de casos E2E.

## Flujos a mapear

1. Primera instalación: tutorial de la mascota → clave de Gemini (y Azure opcional) → perfil → test de nivel → Inicio.
2. Usuario que actualiza: `NoticeGate` (novedades, aviso «¿Para qué es tu clave?», tarea pendiente, re-test).
3. Clase de conversación (`Conversation.tsx`): arranque, saludo, turno (mantener → soltar → Gemini → corrección → voz), «¿Qué digo?», consulta de palabras, Azure en paralelo, guardar y reanudar clase (`savedClass.ts`), salir a mitad, informe final.
4. Test de nivel y re-test (`Calibration.tsx`, `testDraft.ts`): gramática adaptativa, lectura, audición (máx. 3 reproducciones), habla (3 tareas), borrador si se sale, reglas 70/30 y «las lecciones solo proponen» (ver memoria del proyecto en `placement.ts`/`levels.ts`).
5. Repaso SRS (`ReviewScreen.tsx`), Palabras (`WordsScreen.tsx`), Tema libre/Debate con dictado (`TopicAskPage.tsx`).
6. Plan de 12 semanas y lección del día (`plan.ts`, `PlanScreen.tsx`), recordatorios (`reminders.ts`).
7. Ajustes: claves con confirmación de bloqueo (`deviceAuth.ts`, gracia 60 s), modelos, diagnóstico, audio/auriculares, tema/orientación, exportar/importar.
8. Errores de IA: sin clave, clave inválida, 429/503, sin red, respuesta vacía (`GeminiTroubleSheet`, `GeminiFix`).

## Para cada flujo entrega

- Diagrama de estados (Mermaid) con las transiciones y la pantalla/archivo de cada estado.
- Tabla de ramas: disparador → qué hace el código → estado final → ¿se libera el micro? ¿se guarda el progreso? ¿qué datos salen del teléfono?
- Puntos donde el usuario puede quedar atascado (sin botón de salida, *spinner* infinito, estado inconsistente al volver de segundo plano o al girar).

## Salida

- `resultados/B2/flujos.md` (diagramas y tablas).
- `resultados/B2/casos-e2e.md`: lista numerada `E2E-NNN` con precondición, pasos, resultado esperado y prioridad (P1 = flujo principal o privacidad). B6 la ejecuta.
- `resultados/B2/hallazgos.md` (`AUD-FLU-*`).
