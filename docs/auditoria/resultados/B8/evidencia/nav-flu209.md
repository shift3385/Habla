# B8 · AUD-FLU-209 en navegador (b8.localhost:5173, red falsa B6, claves ficticias A/B)
Ajustes → Modelos. Se registra solo qué clave ficticia hay guardada (A/B), nunca el valor.
1. Clave A + «Guardar y comprobar» → `GET models` 200 → guardada A.
2. Regla de red: `models` → 400 `API key not valid`. Clave B + «Guardar y comprobar» → `GET models` 400 → la pantalla muestra «La clave de Gemini no es válida. Revísala en Ajustes.» y **la clave guardada es B** (`CapacitorStorage.habla.settings`): la A (buena) se perdió.
Red: models 200, models 200, models 400.
