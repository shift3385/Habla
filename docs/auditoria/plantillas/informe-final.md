# Plantilla del informe final (`resultados/INFORME.md`)

```markdown
# Habla v<versión> (build <n>, commit <hash>) — Informe de auditoría

Fecha: AAAA-MM-DD · Bots: B0–B8 · Teléfono real: sí/no (modelo, Android) · Llamadas reales a IA: n (autorizadas por el dueño)

## Resumen para el dueño
- 5–8 viñetas: lo más grave primero, en lenguaje llano.
- Veredicto sobre el micrófono: ¿se capta audio alguna vez sin que pulses el botón? ¿cuándo está abierto sin grabar?
- Veredicto sobre fugas: ¿puede salir una clave o una transcripción del teléfono por algún camino no deseado?

## Cobertura
| Área | Estático | Navegador | Teléfono | Sin cubrir (y por qué) |
|---|---|---|---|---|

## Hallazgos por severidad
| ID | Sev. | Título | Estado | Dónde | Bot |
|---|---|---|---|---|---|

## Detalle
(Bloques de la plantilla de hallazgo, ordenados por severidad; solo CONFIRMADO e HIPÓTESIS.)

## Mapa del micrófono
Tabla: pantalla/escenario → cuándo se abre el stream → cuándo graba MediaRecorder → cuándo se cierra → indicador de Android → resultado (OK / NO OK).

## Mapa de datos que salen del teléfono
Tabla: destino (Gemini, Azure STT, Azure AD/Monitor, Compartir, Documentos/Habla) → qué datos (audio, transcripción, nombre, ocupación, clave en cabecera…) → cuándo → ¿necesario?

## Lo que está bien
Medidas existentes que se verificaron y funcionan (p. ej. NC-14, D-02, loggingBehavior 'none').

## Descartados
ID → motivo (no reproducible, comportamiento esperado, duplicado de…).

## Próximos pasos
Lista priorizada de correcciones, agrupadas para entregarlas por versiones (convención del proyecto: un commit por fase y una NC por punto).
```
