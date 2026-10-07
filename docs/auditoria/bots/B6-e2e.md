# B6 · Pruebas end-to-end

**Misión:** ejecutar de verdad los recorridos del usuario y demostrar con capturas que funcionan, o cómo fallan.

## Entrada

- `resultados/B2/casos-e2e.md` (casos `E2E-NNN` con prioridad). Si aún no existe, empieza por la lista mínima de abajo.
- `entorno.md` (micro falso, red falsa, CDP, voz con System.Speech).

## Cómo

1. **Navegador** (`preview_start` `habla-dev`), con red falsa de Gemini/Azure y micro falso instrumentado. Tamaños: 390×800, 360×780 (Galaxy A11), 320×640 y 780×360 horizontal; tema claro y oscuro. Para empezar de cero sin tocar los datos del dueño usa el navegador de vista previa (su almacenamiento es independiente del teléfono).
2. **Teléfono** (con turno), solo los casos P1 y los que dependen de lo nativo (auriculares, bloqueo, notificaciones, segundo plano, voz TTS). Antes de nada, pide al dueño que exporte una copia. No borres datos: crea las condiciones con la propia app.
3. Si un caso requiere Gemini real (calidad de corrección, nota de habla), márcalo `REQUIERE-IA-REAL` y ejecútalo solo si el dueño autorizó un número de llamadas.

## Lista mínima (si B2 no ha terminado)

| ID | Caso | P |
|---|---|---|
| E2E-001 | Primera instalación completa hasta el Inicio (tutorial, clave falsa con red falsa, perfil, test) | P1 |
| E2E-002 | Clase: 3 turnos con voz sintética, «¿Qué digo?», tocar palabra → consulta, terminar → informe | P1 |
| E2E-003 | Clase guardada: salir a mitad, volver, reanudar con el historial intacto | P1 |
| E2E-004 | Test de nivel: borrador al salir, reanudar, resultado con reglas 70/30 en el re-test | P1 |
| E2E-005 | Exportar → importar la misma copia → mismos datos (conteos por tabla) | P1 |
| E2E-006 | Errores de IA: sin clave, 401, 429 (cambio a respaldo), 503, sin red, JSON roto | P1 |
| E2E-007 | Repaso SRS con tarjetas vencidas | P2 |
| E2E-008 | Palabras: inglés→español, español→inglés, guardar, historial con *scroll* infinito | P2 |
| E2E-009 | Recordatorio diario: activar, cambiar hora, notificación (teléfono) | P2 |
| E2E-010 | Ajustes: ver/cambiar clave con bloqueo, gracia 60 s, Azure activado/desactivado | P1 |
| E2E-011 | Tema y mascota, orientación forzada, rotación en cada pantalla principal | P3 |
| E2E-012 | Botón «atrás» de Android en cada pantalla (no debe cerrar la app ni perder datos sin avisar) | P2 |

En cada caso comprueba también, con la instrumentación, que el micrófono solo se abre donde B3 dice que debe abrirse.

## Salida

- `resultados/B6/ejecucion.md`: tabla caso → entorno → resultado (PASA / FALLA / BLOQUEADO) → evidencia.
- `resultados/B6/evidencia/` capturas (`adb exec-out screencap -p` en el teléfono).
- `resultados/B6/arnes/`: scripts reutilizables (cliente CDP, inyección de micro y red, generador de WAV) para que la próxima auditoría los relance.
- `resultados/B6/hallazgos.md` (`AUD-E2E-*`).
