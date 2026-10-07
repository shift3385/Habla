# Mapa de datos que salen del teléfono

Fuente: código del commit `6874443` + fase 2 (2026-10-05). **Verificado** con red falsa en el navegador (`evidencia/nav-red-falsa.md`): D1, D3, D6, D8 («¿Qué digo?»), D9, D10 (dos pasadas), D12, D13 (incluido el desvío de AUD-FUG-401). **Verificado en el POCO** con 1 llamada real: D8 por `CapacitorHttp` nativo (clave solo en cabecera, nada en logcat). Sin verificar en ejecución: D2, D4 (búsqueda de Google), D5, D7, D11 (solo la URL). En ninguna petición observada la clave apareció en la URL; todas por HTTPS.

Tamaños observados en un turno de clase: Gemini 23 KB (audio webm 12 KB + historial de 4 mensajes + prompt con perfil); Azure 2 × 126 KB (WAV 16 kHz), la 2.ª con la transcripción de Gemini en la cabecera `Pronunciation-Assessment`.

## Por la red

| # | Destino | Qué datos | Cuándo | ¿Necesario? | Protección / notas |
|---|---|---|---|---|---|
| D1 | Gemini `generativelanguage.googleapis.com/v1beta/models/{m}:generateContent` — **clase** (`teacher.ts:184-205`) | Prompt de sistema con **nombre, ocupación (texto libre), motivos, intereses, niveles, debilidades** (`profile.ts:45-55`, `teacher.ts:129-136`); historial completo de la clase en texto; **audio de cada respuesta** (base64) | Cada turno de clase | Audio e historial: sí. Nombre/ocupación: no imprescindible | `x-goog-api-key` en cabecera. AUD-FUG-406 |
| D2 | Gemini — **informe de clase** (`Conversation.tsx:534`) | Todas las transcripciones y correcciones de la sesión, métricas, tema | Al terminar la clase | Sí | Cabecera |
| D3 | Gemini — **plan de 12 semanas** (`plan.ts:140,209,303`) | Perfil completo (`describeStudent`), niveles, resultados del test | Crear plan / preparar semana / adaptar tras re-test | Parcial | Cabecera |
| D4 | Gemini — **tema del día** (`topics.ts:135-173`) | Niveles, títulos de los 15 últimos temas, o el tema libre que escribió el alumno | Al empezar clase | Sí | Con categoría «actual»: `tools: googleSearch` (Google hace búsquedas con lo que decida el modelo) |
| D5 | Gemini — **test de nivel** (`calibration.ts:79-87,158-182`) | Respuestas y **audio** de las tareas habladas | Durante/al final del test | Sí | Cabecera |
| D6 | Gemini — **palabras** (`lookup.ts:94`) | Palabra consultada + frase de contexto, nivel | Cada consulta | Sí | Cabecera |
| D7 | Gemini — **repaso** (`srs.ts:155-156`) | **Audio** de la respuesta + frase esperada | Cada tarjeta respondida hablando | Sí | Cabecera |
| D8 | Gemini — **dictado / «¿qué digo?»** (`dictation.ts:16-21`, `teacher.ts:258`) | **Audio** (dictado del tema libre); último mensaje del profe y tema | A petición | Sí | Cabecera |
| D9 | Gemini `GET /v1beta/models?pageSize=1000` (`gemini.ts:374-380`) | Solo la clave | Al guardar/validar la clave, Ajustes → Modelos | Sí | Cabecera |
| D10 | Azure STT `https://{region}.stt.speech.microsoft.com/…/v1` (`pronunciation.ts:142-171`) | **Audio WAV 16 kHz** de la respuesta; en la 2.ª pasada, la **transcripción de Gemini** como `ReferenceText` (cabecera `Pronunciation-Assessment`) | Cada respuesta hablada en clase con fonética activa (1–2 peticiones) | Sí (si fonética activada) | `Ocp-Apim-Subscription-Key` en cabecera; región codificada |
| D11 | Azure STS `https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken` (`pronunciation.ts:213-233`) | Solo la clave | Al guardar la clave de Azure | Sí | Cabecera |
| D12 | Azure AD `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` (`azureUsage.ts:43-53`) | `client_id`, **`client_secret`** en el cuerpo | Al abrir Ajustes de Azure / guardar acceso (caché 10 min) | Sí (opcional) | Host fijo, tenant codificado |
| D13 | Azure Monitor `https://management.azure.com{resourceId}/providers/microsoft.insights/metrics` (`azureUsage.ts:73-78`) | **Token Bearer** ARM, Resource ID (ID de suscripción) | Tras D12 | Sí (opcional) | **Host NO validado** → AUD-FUG-401 |
| — | Enlaces `aistudio.google.com/apikey`, `portal.azure.com` (`Onboarding.tsx:15-16`) | Nada (navegación del sistema) | Al tocar | — | — |

TTS: local (`@capacitor-community/text-to-speech`). Código nativo Java: sin red.

## Fuera de la red (otros caminos de salida)

| # | Camino | Qué datos | Cuándo | ¿Necesario? | Protección / notas |
|---|---|---|---|---|---|
| S1 | Exportar copia (`backup.ts`) → `Documentos/Habla/*.json` + `cache/` + Compartir | Perfil, sesiones, transcripciones, correcciones, consultas, tarjetas (sin claves; verificado en la copia del 2026-10-01 del POCO: 0 claves, 0 audio) | A petición | Sí | En claro, `-rw-rw---- media_rw`; copia de caché no se borra según el código (no vista en el POCO) → AUD-FUG-403 |
| S2 | Resumen del test (`testSummary.ts:128-153`) | Niveles, respuestas del test | A petición | Sí | Igual que S1 |
| S3 | Compartir Diagnóstico (`SettingsScreen.tsx:888-895`) | Fecha, tarea, modelo, estado, tiempo, KB, error ≤120 | A petición | Sí | Sin claves ni textos del alumno |
| S4 | Copia automática Android (Google Drive / paso a otro teléfono) | IndexedDB + `localStorage` (netlog, cuotas, `habla.azureUsage` con Resource ID) | Automática | Discutible | Excluido `CapacitorStorage.xml` (claves, clase guardada). En el POCO el Backup Manager está desactivado → hoy no sale nada → AUD-FUG-407 |
| S5 | logcat | v5.8: nada de la app en una clase con llamada real (verificado); solo `HablaAudio` con auriculares BT (no probado). ≤ v5.7: puente de Capacitor con ajustes y cabeceras | Continuo | No | AUD-FUG-402, AUD-FUG-405 |
| S6 | `run-as` / CDP (APK debuggable) | Todo `CapacitorStorage.xml` (claves, clase guardada) e IndexedDB | Con USB + depuración | No | AUD-SEG-001, AUD-FUG-404 |
