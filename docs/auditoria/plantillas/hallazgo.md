# Plantilla de hallazgo

Copia un bloque por hallazgo en `docs/auditoria/resultados/<Bx>/hallazgos.md`.

```markdown
### AUD-<ÁREA>-<NNN> · <Título corto en una línea>

- **Severidad:** CRÍTICA | ALTA | MEDIA | BAJA | INFO
- **Estado:** CONFIRMADO (reproducido) | HIPÓTESIS (sin prueba dinámica) | DESCARTADO
- **Probado en:** estático | navegador 360×780 | POCO Android 16 (APK vX.Y build N) | otro
- **Dónde:** `ruta/archivo.ts:línea` (y otros)
- **Qué pasa:** 1–3 frases. El defecto, no la solución.
- **Por qué importa:** impacto concreto para el usuario (privacidad, batería, datos, coste de API…).
- **Cómo reproducir:**
  1. …
  2. …
- **Esperado:** …
- **Obtenido:** …
- **Evidencia:** ruta a captura / log / traza en `resultados/<Bx>/evidencia/` (los secretos, enmascarados).
- **Causa raíz (si se conoce):** …
- **Propuesta de corrección:** 1–3 frases; no se aplica en esta auditoría.
- **Relacionado con:** otros IDs, NC previas (p. ej. NC-14, D-02).
```

Reglas: un hallazgo = una causa raíz. Nunca pegues claves, tokens ni el JSON de Ajustes; como mucho los 4 primeros caracteres.
