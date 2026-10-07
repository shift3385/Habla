# Revisión en PC · v5.8.2 «Claves, datos y consumo» (build 35)

Revisor: `rev` · Inicio: 2026-10-06 · Base: HEAD `0a1d6f8` más la v5.8.1 (sin commit) en el mismo árbol.
Alcance: tareas U1–U7 de `docs/correccion/ESTADO.md` (INFORME §8.3). Solo lectura sobre el producto. Evidencias en `docs/correccion/evidencia-rev/U*-*.txt`.
Regla nueva (orquestador): **nunca `assembleDebug`/`assembleRelease`**, porque copian a `apk/`. Para comprobar se usan `:app:compile…JavaWithJavac` y `:app:packageRelease`/`:app:packageDebug --offline`.

## 1. Tabla por tarea

| Tarea | Hallazgos | Estado | Veredicto | NC abiertas | Evidencia |
|---|---|---|---|---|---|
| U1 · Release no depurable, debug `.debug`, fallar sin `keystore.properties` | SEG-001, SEG-504, ARQ-106 | revisada | **APROBADA** | REV-U1-1 (MEDIA, a cerrar en U7) | `U1-package.txt`, `U1-firma-badging.txt`, `U1-sin-keystore.txt` |
| U2 · Resource ID de Azure, host y huella | FUG-401 | revisada | **APROBADA** | — (REV-U2-1 cerrada, verificada) | `U2-fuzz.txt`, `T6-npm-test.txt` (3 pruebas de `azureUsage`) |
| U3 · Copias y arranque | SEG-501, RES-704, E2E-601, SEG-510 | revisada | **APROBADA** (2026-10-07, regresión en navegador) | — (REV-U3-1 cerrada) | `U3-validador.txt`, `U3U4-test.txt` |
| U4 · Clave de Gemini | FLU-209 | revisada | **APROBADA** | — (REV-U4-1 cerrada, 429 comprobado en navegador) | navegador (ver §3 U4), `U3U4-test.txt` |
| U5 · Consumo en primer plano | RES-700, RES-701 | revisada (sesión en la nube) | **APROBADA en PC** (CPU real: móvil R12) | — | NC-v5.8.2-05 (medida en Chromium) |
| U6 · Textos y menores | FLU-206, FLU-211, E2E-604, RES-703 | revisada (sesión en la nube) | **APROBADA** | — | NC-v5.8.2-06 |
| U7 · Entrega 5.8.2/35 | FUG-402 | revisada (sesión en la nube) | **APROBADA** (REV-U1-1 cerrada) | — | NC-v5.8.2-07 |

## 2. No conformidades (NC)

| ID | Sev. | Tarea | Archivo:línea | Pasos | Esperado | Obtenido | Evidencia | Corregido |
|---|---|---|---|---|---|---|---|---|
| REV-U1-1 | MEDIA | U1 (cerrar en U7) | `package.json` (script `apk`), `CLAUDE.md` («APK (forma fiable)»), `docs/configuracion.md`, `REVISOR-MOVIL.md` | Seguir la receta documentada: `npm run apk` o `… gradlew.bat assembleDebug --offline -q` | La receta del entregable genera el **release** firmado (`assembleRelease` → `apk/Habla-v<versión>.apk`) | Todas las recetas siguen usando `assembleDebug`, que ahora genera **otra app** (`com.shift.habla.debug`, depurable, clave genérica) como `apk/Habla-v<versión>-debug.apk`. Riesgo: repartir el debug o que el revisor móvil instale el paquete equivocado. Los arneses CDP de B3/B8 apuntan a `com.shift.habla`, que ya no es inspeccionable | lectura de código | Corregido en U7 (2026-10-07, dev): `npm run apk` → `assembleRelease --offline`, `npm run apk:debug` nuevo; `CLAUDE.md`, `README.md`, `docs/configuracion.md`, `docs/problemas-conocidos.md` y `REVISOR-MOVIL.md` al día. Arneses: los adapta el revisor móvil. **Pendiente de regresión.** |
| REV-U2-1 | BAJA | U2 | `src/components/AzureSettings.tsx` (`saveMonitor`: `secret = mon.clientSecret.trim() \|\| settings.azureClientSecret`) | Vaciar Tenant, Client y Resource y guardar | Quitar el acceso a Monitor borra también el secreto guardado | El secreto del *service principal* sigue en Preferences. No sale a ningún sitio, porque `hasMonitor` es falso, pero se guarda sin uso | lectura de código || Corregido en `src/components/AzureSettings.tsx` (`saveMonitor`): si se vacían Tenant, Client y Resource, el secreto guardado pasa a `''` (pide el bloqueo si había datos, igual que cualquier cambio) y el aviso dice «Acceso a Azure Monitor quitado (también el secreto)». tsc OK, lint 0. Comprobable en navegador: tras vaciar y guardar, `habla.settings` con `azureClientSecret` vacío (resumir solo `hasSecret`/longitud). |
| REV-U3-1 | MEDIA | U3 | `src/lib/backupCheck.ts` (`checkBackup`: `if (!Array.isArray(rows)) return fail('falta la tabla de …')`) | Importar una copia **legítima** exportada por la v1–v4.6: `TABLES` era `['sessions','turns','mistakes','profile']` hasta la v4.1 (`02bed2c`) y añadió `lookups` en la v4.2 (`9e1ff7b`) y `cards` en la v4.7 (`280413b`) | Se acepta: las tablas que no existían en esa versión cuentan como vacías, igual que con el importador de la v5.8 | **Rechazada**: «El archivo de copia está dañado o no es de Habla… (falta la tabla de consultas de palabras / tarjetas de repaso)». No se pierden datos (falla de forma segura), pero una copia válida antigua ya no se puede restaurar. Arreglo sugerido: `lookups` y `cards` opcionales (ausente → `[]`); `sessions`, `turns`, `mistakes` y `profile` siguen siendo obligatorias. Añadir los dos casos a `tests/backupCheck.test.mjs` | `evidencia-rev/U3-validador.txt` | Corregido (dev): `lookups`/`cards` opcionales (ausentes → `[]`); perfil 0–1 (sin perfil, la app crea uno neutro; la bienvenida sigue exigiendo nombre). Test de v4.1, v4.6 y sin perfil; `npm test` 38/38 (2026-10-07). **Pendiente de regresión.** |
| REV-U4-1 | BAJA | U4 | `src/lib/geminiKey.ts` (usa el mensaje de `listModels`/`describeError`) | Ajustes → Gemini → pegar una clave nueva con Google respondiendo 429 (o 503, o sin red) | No guardar (correcto) y decir que **no se pudo comprobar** la clave, que puede ser buena y que lo intente en un momento | No se guarda y se conserva la anterior (bien), pero con 429 el texto dice «Tu clave de Gemini se quedó sin cuota en los modelos elegidos. Prueba otro modelo en Ajustes → Gemini…», que no aplica a la comprobación y lleva a cambiar el modelo. Con 503 y sin red el texto es correcto | navegador (red falsa) | Corregido (dev, 2026-10-07): `listModels` usa `keyCheckError()`: 429 → «Google no deja comprobar la clave ahora mismo… Puede que sea buena: inténtalo de nuevo en un minuto» (sin hablar de modelos). Test en `tests/geminiKey.test.mjs`. **Pendiente de regresión.** |

## 3. Detalle de la revisión

### U1
- **Firma** (`apksigner verify --print-certs`): el release `android/app/build/outputs/apk/release/Habla-v5.8.1.apk` tiene `CN=Habla, O=Personal, C=ES`, SHA-256 `95626710…708aa597`. Es **idéntico** al de `apk/Habla-v5.8.apk`, el distribuido. El debug va con `CN=Android Debug` (`7cfa0361…`).
- **Manifiesto** (`aapt2 dump badging`): el release es `com.shift.habla` 34 / 5.8.1, **sin `application-debuggable`**. La 5.8 distribuida sí lo era. El debug es `com.shift.habla.debug` / `5.8.1-debug`, depurable, con la etiqueta «Habla debug». `versionName` y `versionCode` salen de `version.json`, y en U7 subirán a 5.8.2/35.
- **R8**: en `mapping.txt` se conservan sin renombrar los 7 plugins de `capacitor.plugins.json` (TTS, App, Filesystem, Haptics, LocalNotifications, Preferences, Share), los 3 plugins propios (`AudioRoutePlugin`, `DeviceAuthPlugin`, `OrientationPlugin`), `MainActivity`, `HablaChromeClient`, `@CapacitorPlugin` y `@PluginMethod`. Capacitor trae además sus propias reglas *consumer*. El `FileProvider` usa `${applicationId}.fileprovider`, así que las dos apps pueden convivir sin conflicto de *authority*.
- **Sin `keystore.properties`** (`-PhablaKeystoreProps=../no-existe/…`): `packageRelease` falla con el mensaje en español «Falta keystore/keystore.properties…», y `compileReleaseJavaWithJavac`/`compileDebugJavaWithJavac` dan salida 0.
- **Sin tocar** `apk/` ni `keystore/`: comparé el listado (nombre, tamaño y fecha) antes y después de `packageRelease`/`packageDebug`.
- `assembleRelease`/`assembleDebug` siguen copiando a `apk/`, que es lo esperado para el entregable. El debug ya no pisa el release porque lleva el sufijo `-debug`.

### U2
- La URL se construye con `new URL(…, 'https://management.azure.com')` y se comprueba el host (`https:`, sin usuario ni contraseña). Validar antes de pedir el token hace que el secreto no salga si los datos están mal.
- Fuzz (`U2-fuzz.txt`, 23 Resource ID). Se **rechazan** todos los que llevan `@`, `//`, `\\`, `https://otro`, `..`, `%2F`, espacios internos, salto de línea, `?`, `#`, `∕` (U+2215), `İ`, o un proveedor distinto de `Microsoft.CognitiveServices`. Se **aceptan** los legítimos, también en mayúsculas o minúsculas, con barra final o con espacios en los extremos. Ninguno aceptado sale de `management.azure.com` (`rg.evil.com` es un nombre de grupo válido y se queda en la ruta).
- El tenant se acepta como GUID o como dominio con punto. Se rechazan `evil.com/x`, `a@b.com`, `..`, `x.com#`, y el valor va siempre con `encodeURIComponent` hacia `login.microsoftonline.com`.
- Pedir la huella al cambiar tenant, cliente o recurso (y el secreto, como antes) es correcto por código. En el navegador `confirmIdentity` deja pasar siempre, así que la petición de huella real se comprueba en el móvil.
- Tests de dev: 3 de `tests/azureUsage.test.mjs` dentro de `npm test` 20/20, con `fetch` simulado y 0 llamadas reales.

### Regresión de REV-U2-1 · CERRADA
- Navegador (`rev.localhost`, datos de Azure ficticios). Un Resource ID malicioso (`@evil.com/…`) se rechaza con el mensaje en español y no se guarda nada (el secreto sigue con longitud 16). Al vaciar Tenant, Client y Resource, Preferences queda con `azureClientSecret` de longitud 0 (tenant, client y resource también a 0) y se muestra «Acceso a Azure Monitor quitado (también el secreto)». La clave de Azure no se toca.
- Por código, el bloqueo solo se pide si había datos (`changed`). Con todo vacío no se pide.
- Atención (proceso, no producto): al recargar con datos de Azure ficticios, `startupCheck` puede pedir el token **antes** de que se inyecte la red falsa del arnés. Puede que saliera una petición a `login.microsoftonline.com` con un tenant y un secreto ficticios (Microsoft la rechaza, sin coste y sin datos reales); no lo puedo confirmar porque el registro de red del navegador ya había descartado las peticiones antiguas. Ya quité los datos de Azure del origen `rev.localhost` y la receta del arnés dice que no se siembren antes de recargar.

### U3
- **Validador** (`U3-validador.txt`, `checkBackup` cargado con Vite):
  - **Acepta**: una copia rica (todas las tablas, turnos con `pronunciation` de Azure, `corrections[]`, FSRS con `last_review: null`, perfil calibrado con plan, `bankUsage` y `trajectory`); la estructura real del teléfono (B4: `goal` sin valor, `lookups` vacía); campos y tablas de más; y la copia que exporta la propia app en `rev.localhost` (6 tablas).
  - **Rechaza**, con mensaje en español y «no se cambió nada»: `tables:{}`, tablas vacías sin perfil, `text` numérico, `levels` como texto, versión 2 («actualiza la app»), `id` repetido, `id` texto, tarjetas con el mismo `source+sourceId`, JSON roto y archivos de más de 20 MB (52 MB → «demasiado grande… máx. 20 MB»). Tras cada rechazo el número de sesiones no cambia.
  - **Rechaza también copias legítimas antiguas** (v1–v4.6, sin `lookups`/`cards`): **REV-U3-1**.
- **Importar** (Ajustes y bienvenida): primero `readBackup` (lo valida todo), después la confirmación con el resumen («La copia tiene N sesiones y M errores… ¿Continuar?») y por último `applyBackup` en una sola transacción, con el error de Dexie traducido. La bienvenida comprueba que haya un perfil con nombre **antes** de tocar nada.
- **Arranque y ErrorBoundary** (navegador):
  - Un perfil con `levels: 'B1'`, `weaknesses: 'x'` e `interests: 7` arranca bien gracias a `repairProfile`: la app pide de nuevo los 3 temas y no se queda en negro.
  - Una consulta con `result: null` hace que «Palabras» muestre la pantalla «Algo no ha ido bien» en español, con «Volver a intentar» y «Exportar mis datos». No ofrece borrar datos. «Volver a intentar» recarga y lleva al Inicio.
  - `bootError` cubre el fallo de la carga inicial.
- Observación (no es NC): un perfil con `name` que no es texto se trata como no personalizado y lleva a la bienvenida. Es un caso artificial (el validador ya no deja importarlo).

### U4
- `verifyGeminiKey` comprueba con `listModels` (no gasta cuota) **antes** de guardar, en Ajustes y en la hoja de problemas (`GeminiFix`). La bienvenida ya lo hacía.
- Navegador, red falsa. Con 400, 403, 429, 503 o sin red: **se conserva la anterior** y aparece «… No se cambió: sigues con tu clave anterior.». Con 200 se guarda la nueva y se eligen los modelos. La clave no aparece en `habla.netlog`.
- **Decisión sobre 429, 5xx o sin red:** no guardar es lo prudente (nunca se pisa una clave buena con una sin comprobar) y el usuario reintenta. El texto de 429 confunde (REV-U4-1).
- `npm test` 36/36 (5 de `geminiKey`), `tsc` 0, lint 0 errores.

## 4. Para el revisor móvil
| # | Escenario | Qué comprobar |
|---|---|---|
| **U1-a** | `adb -s <serie> install -r` del **release** (U7) encima de la 5.8 en uso | Actualiza sin desinstalar; se conservan perfil, clase guardada, claves y racha |
| **U1-b** | Recorrido completo con R8: Inicio, clase con voz (micro y TTS), fonética, recordatorio de prueba, exportar e importar copia (Filesystem/Share), huella, orientación forzada, auriculares | Nada falla solo en el release. Plan B si algo falla: `minifyEnabled false` |
| **U1-c** | Seguridad | `chrome://inspect` no lista el WebView de `com.shift.habla`; `adb shell run-as com.shift.habla` → «package not debuggable» |
| U1-d | Arneses CDP | Hay que usar el debug `com.shift.habla.debug` («Habla debug», datos propios vacíos). Actualizar los arneses B3/B8 con el paquete nuevo (REV-U1-1) |
| U2-a | Ajustes → Modelos → Azure → cambiar Tenant, Client o Resource, o vaciarlos | Pide patrón/PIN/huella. Si se cancela, no se cambia nada; al vaciar, el secreto desaparece |
| U3-a | Importar en el teléfono la copia real `Documents/Habla/habla-backup-2026-10-02.json` (en el debug `.debug`, para no tocar los datos reales) | Se acepta y muestra el resumen; tras confirmar, los datos aparecen |
| U4-a | Cambiar la clave de Gemini con el modo avión activado | Se conserva la clave anterior con el mensaje de «sin conexión» |

## 5. Bitácora de la revisión
- 2026-10-06 — rev: regresión de REV-U2-1 OK (cerrada). U3 con NC (REV-U3-1 MEDIA: rechaza copias legítimas de la v1–v4.6). U4 APROBADA (REV-U4-1 BAJA: texto de 429).
- 2026-10-06 — rev: U1 APROBADA (NC MEDIA REV-U1-1, para cerrar en U7) y U2 APROBADA (NC BAJA REV-U2-1).
