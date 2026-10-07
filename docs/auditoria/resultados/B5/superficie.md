# B5 · Superficie de entrada de la app (estático, fase 1)

| # | Entrada | Origen | Validación actual | Riesgo | Hallazgo |
|---|---|---|---|---|---|
| E1 | `MainActivity` (intents) | Otras apps / `adb am start` | Solo `MAIN/LAUNCHER`; no se escucha `appUrlOpen` | Bajo | — (P-07) |
| E2 | `FileProvider` `${applicationId}.fileprovider` | Apps que reciben un `Share` | No exportado; `grantUriPermissions`; rutas `external-path "."` y `cache-path "."` | Bajo | AUD-SEG-506 |
| E3 | Respuestas de Gemini (JSON y texto) | Red (Google) | `safeParse`/`extractJson`; se pinta como texto React; fuentes solo como título | Bajo (sin sumideros HTML) | AUD-SEG-503, 509 |
| E4 | Texto web vía *grounding* | Google Search | Ninguna (entra en el tema y en el *prompt*) | Bajo | AUD-SEG-509 |
| E5 | Respuestas de Azure Speech | Red (Microsoft) | `parseAssessment` con tipos defensivos (`n()`) | Bajo | — |
| E6 | Respuestas de Entra ID / Azure Monitor | Red | `sumMetric` defensivo | Bajo | — |
| E7 | Archivo de copia (Importar, Ajustes y Bienvenida) | Usuario (archivo) | Solo cabecera `format`/`version`; `clear()` por tabla | Medio (pérdida de datos) | AUD-SEG-501 |
| E8 | Clave Gemini (Ajustes, `GeminiFix`, Onboarding) | Usuario | Cambiar exige bloqueo; se comprueba con `listModels` | Bajo | AUD-SEG-502 |
| E9 | Clave y región Azure Speech | Usuario | Cambiar clave exige bloqueo; región `encodeURIComponent` + sufijo fijo | Bajo | AUD-SEG-502 |
| E10 | Tenant/Client/**Resource ID** Azure Monitor | Usuario | Tenant codificado; **Resource ID sin validar** en la autoridad de la URL; sin bloqueo | **Medio** | AUD-SEG-500 |
| E11 | Modelo de Gemini (lista o a mano) | Usuario / lista de Google | Regex `^[a-z0-9][a-z0-9.-]*$` en el manual; va en la ruta tras host fijo | Bajo | — |
| E12 | `Preferences` `habla.settings` | Almacenamiento propio | `loadSettings` copia claves conocidas sin comprobar tipos | Bajo (solo escribe la app; con debug, ver SEG-001) | AUD-SEG-001 |
| E13 | Puente Capacitor (JS → nativo) | Cualquier JS en `https://localhost` | Sin CSP | Bajo hoy / alto si hubiera XSS | AUD-SEG-503 |
| E14 | WebView por CDP y `run-as` | USB con depuración | APK debuggable | Alto | AUD-SEG-001 |
| E15 | Notificaciones locales (recordatorio) | Propia app | Texto propio | Bajo | AUD-SEG-507 |
