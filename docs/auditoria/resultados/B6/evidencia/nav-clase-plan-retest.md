# B6 · Navegador (origen aislado `http://b6.localhost:5173`, 360×780, red falsa) · clase, plan, claves, importar, re-test

Arnés: `../arnes/b6nav.js` (reglas `__b6.rules`), `../arnes/backup-prueba.js`. Botón atrás de Android simulado con
`Capacitor.Plugins.App.notifyListeners('backButton', {})`. Clave ficticia `AIzaTEST-NO-REAL-…0000` (buena) / `…1111` (mala).

## E2E-033 (P1) · AUD-FLU-209 · cambiar la clave por una errónea

1. Clave buena guardada y comprobada («Clave válida ✓ · modelo gemini-3.8-flash»).
2. Escribir la mala en el mismo campo → «Guardar y comprobar» con la red falsa respondiendo 400 `API_KEY_INVALID`.
3. Resultado: «La clave de Gemini no es válida. Revísala en Ajustes.» y en `habla.settings` queda **la mala** (`len 36`, termina en `1111`). La buena se perdió. → **CONFIRMADO**.
Nota: el `<input type=password>` conserva la clave completa en el DOM (`value.length=36`) aunque el placeholder diga «termina en …0000» (ya descrito en AUD-ARQ-109).

## E2E-036 · AUD-FLU-216 · plan que falla y se regenera en cada visita al Inicio

Perfil sin plan, regla 503 para las peticiones con «12-week».
- Al entrar: 5 peticiones (3.8-flash ×3, 3.5-flash-lite ×2) en ~11 s → «Google está saturado ahora mismo…» + hoja «Gemini está saturado o va lento».
- Palabras → Hablar: **otras 5**. Progreso → Hablar → Ajustes → Hablar (en 3 s): **otras 5** (la 2.ª visita se une a la generación en curso por `once()`).
- Total 15 peticiones con 3 visitas. Con Gemini real, cada visita al Inicio tras un error = hasta 5 llamadas de cuota. → **CONFIRMADO**.

## E2E-010 (P1) · preparar la clase con red lenta (20 s por petición) · AUD-FLU-213

- «Comida» → «Preparando tu clase · Eligiendo el tema / Ajustando a tu nivel / Preparando la conversación»: **0 botones** durante 15 s y el **micro abierto** (`getUserMedia` #0 `live`) desde el segundo 2. (= AUD-MIC-305/AUD-FLU-213).
- Atrás (simulado) → Inicio, micro cerrado, sin sesión vacía en `sessions`, sin voz en el Inicio. → atrás **OK**.
- Peticiones: la del tema («You pick conversation topics…») y la del saludo («Your name is Emma…») salieron y terminaron (200) aunque la clase se cerró; por la latencia entre mis llamadas no puedo afirmar si el saludo salió antes o después del atrás (por código, `Conversation.tsx:356` corta con `gone()` antes de `askTeacher`). Queda como petición en vuelo que no se cancela (H-B7-2 de B7), sin hallazgo nuevo.

## E2E-013 (P1) · clase guardada, retomar y «Empezar nueva» · AUD-FLU-206

1. «Comida», 1 respuesta hablada (micro falso) → atrás → «Te espero aquí… la encontrarás en Hablar → Continuar clase».
2. Inicio: «Clase en progreso · Music · Continuar» → retomada con el historial intacto (saludo, respuesta, réplica).
3. Atrás → «Deportes» → diálogo: «Tienes una clase en progreso · «Music» quedó a medias. **Si empiezas una nueva, se perderá.** ¿Continuar?».
4. «Empezar nueva» → la sesión 7003 queda `endedAt` con `metrics.turns=1` y Progreso muestra «Sesiones 1 · 0,1 min». → el texto miente: **CONFIRMADO** AUD-FLU-206.

## E2E-039 · H-B6-1 · AUD-FLU-219 · importar una copia con una clase guardada

1. Clase guardada `sessionId 7005` («Music», historial de 4 mensajes).
2. Ajustes → Mi perfil y datos → importar una copia cuya sesión `7005` está abierta y tiene otros turnos («Hi from the backup? (turn A)», «I am the backup student (turn B)»). `confirm`: «Esto SUSTITUYE todo tu progreso actual…» → «Importado: 1 sesiones y 0 errores ✓». `habla.savedClass` intacto.
3. Inicio sigue mostrando «Clase en progreso · Music». «Continuar» → la pantalla pinta **los turnos de la copia** (turn A / turn B) con la cabecera «VIAJES Y CULTURAS · Music».
4. Siguiente respuesta: el cuerpo enviado a Gemini lleva el historial de la **clase vieja** («Great! What kind of music…», «I like to talk about music.») y el `systemInstruction` de Music; el turno nuevo se guarda en la sesión 7005 de la copia. → **CONFIRMADO** (clase cruzada).

## H-B6-2 / H-B6-4 · filas de forma inesperada

- Una fila de `lookups` sin `result` en la copia: al abrir **Palabras** la app entera queda en blanco (`TypeError: Cannot read properties of undefined (reading 'headword')` en `WordsScreen.tsx` ← `InfiniteList.tsx`); no hay `ErrorBoundary` en `src/`. Al recargar arranca, pero Palabras vuelve a tumbarla. → AUD-E2E-603 (complementa AUD-SEG-501/510 de B5).
- Copia sin `cards` / tabla no-array → ya CONFIRMADO por B5 (AUD-SEG-501): no se repite.

## E2E-017 · H-B6-5 · AUD-FLU-207 · fonética agotada durante una clase

Azure ficticio (F0, `phoneticsOn`), regla 403 «Quota exceeded…» en `stt.speech.microsoft.com`.
1. Clase «Comida», 1 respuesta → Gemini OK; Azure 403 → bajo la respuesta «Sin nota de pronunciación: Se acabaron las horas gratis de Azure este mes.» y la hoja «Se acabó la fonética gratis de este mes…» con «Ver Ajustes → Modelos».
2. «Ver Ajustes → Modelos» → la clase se desmonta sin despedida; `sessions[7006]` sigue abierta y `habla.savedClass` existe (1 respuesta), **pero el Inicio no muestra «Clase en progreso»** (el estado no se recarga).
3. Recargar → «¡Hola de nuevo! Dejamos una clase a medias: «Music» (1 respuesta…)» → se recupera.
→ H-B6-5 **CONFIRMADO**; AUD-FLU-207 CONFIRMADO en parte: la clase no se pierde (ya estaba guardada tras la respuesta), solo desaparece del Inicio hasta reiniciar.

## E2E-040 · AUD-FLU-212 · sin red en un turno de clase (fallo inmediato de red)

`TypeError: Failed to fetch` en cada petición:
- 5 envíos del mismo audio (18 KB cada uno) en 10,7 s: 3.8-flash a +0,1 s, +1,7 s, +4,7 s; 3.5-flash-lite a +4,8 s y +10,8 s.
- Mensaje en la burbuja: «Gemini sigue sin responder tras varios intentos (sin conexión). Tu audio está guardado…» + «Reenviar mi audio»; **a la vez** la hoja «Gemini está saturado o va lento · Probar con otro modelo / Usar otra clave». → CONFIRMADO en parte: el texto en línea sí dice «sin conexión», la hoja lo presenta como saturación y propone cambiar de modelo/clave; el audio se resube 5 veces. (En el teléfono no se probó modo avión: cambiarlo es un ajuste del sistema.)

## E2E-022 (P1) · AUD-FLU-202 · re-test sin salida

Perfil con `calibratedAt` de hace 40 días → «¡Te toca el re-test!» → «Hacer el re-test ahora».
- Página 1 («¡Toca tu re-test!»): solo «Siguiente». Atrás de Android: no hace nada. Página 2: «Atrás | Siguiente» (atrás entre páginas, no salida). Sin barra de pestañas. → **CONFIRMADO**.
- Texto: «Han pasado 4 semanas desde tu último test (26 de agosto)» con 40 días reales (texto fijo).

## E2E-021 (re-test) · AUD-FLU-203

Re-test, pregunta 6 de gramática → recargar → «¡Hola de nuevo!» → «¡Te toca el re-test!» (no vuelve solo al re-test). «Hacer el re-test ahora» → retoma en «Pregunta 6 de 20». Con el código del árbol de trabajo (sin commit) el re-test se recupera si el alumno vuelve a entrar; con «Más tarde» el progreso queda guardado sin aviso. En el commit auditado no existe ese guardado.

## E2E-024 · AUD-FLU-204 · re-test que falla al evaluarse

Re-test completo (3 respuestas de 23 s, micro falso) con 503 en todo `generateContent`:
1. «No pude evaluar tu test · Google está saturado… **Tus respuestas y tus audios están guardados: no se pierden aunque cierres la app.**» + Reintentar.
2. Recargar (cerrar la app) → «¡Hola de nuevo!» → «¡Te toca el re-test! … En unos 25 minutos…» → Inicio normal. `habla-draft/kv/calibration` sigue ahí con 3 audios de 93 KB en base64.
3. Ajustes → Nivel → «Hacer el nuevo test de nivel» → **sin explicación** salta directamente a «Gota: tu nivel tras el re-test» (evaluó el borrador viejo). → **CONFIRMADO**.
4. Extra (solo en dev): el borrador se evaluó **dos veces** (2 peticiones de evaluación; `profile.tests` con dos resultados del mismo instante: A2 y luego A1, el segundo ponderando sobre el primero). Es el doble montaje de StrictMode, no ocurre en el APK, pero muestra que `runEval` no tiene guardia de reentrada.
