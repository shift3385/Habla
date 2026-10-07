# Habla 5.8.2 «Claves, datos y consumo» — Respuesta a las no conformidades de la auditoría

Entrega: v5.8.2 (build 35) · Agente: `dev` · Inicio: 2026-10-06 · Base: v5.8.1 (sin commit todavía, en revisión).
Origen: `docs/auditoria/resultados/INFORME.md` §8.3. Reglas del orquestador para no mezclar versiones: `version.json`, `changelog.ts`, `package.json` y los docs generales esperan a **U7** (cuando la 5.8.1 esté aprobada); no se tocan archivos de la 5.8.1 sin avisar.
**El teléfono no estaba disponible**: lo que solo se puede comprobar allí va en «Para el teléfono» de cada NC.

## Resumen

| NC | Hallazgos | Qué se cambió | Archivos tocados (lista exacta) |
|---|---|---|---|
| NC-v5.8.2-01 (U1) | AUD-SEG-001, AUD-SEG-504, AUD-ARQ-106 | Release no depurable, con R8 y firmado con `habla.jks`; debug como otra app (`.debug`) con la clave genérica; el release no se construye sin `keystore.properties`; la copia a `apk/` ya no pisa el entregable | `android/app/build.gradle`, `android/app/proguard-rules.pro`, `android/app/src/debug/res/values/strings.xml` (nuevo) |
| NC-v5.8.2-02 (U2) | AUD-FUG-401 | Resource ID, Tenant y Client ID validados; URL con `new URL` y host comprobado; validación antes de pedir el token; huella al cambiar tenant, cliente o recurso | `src/lib/azureUsage.ts`, `src/components/AzureSettings.tsx`, `tests/azureUsage.test.mjs` (nuevo) |
| NC-v5.8.2-03 (U3) | AUD-SEG-501, AUD-RES-704, AUD-E2E-601, AUD-SEG-510 | Copia comprobada entera antes de tocar nada (rechazo en español); importar en dos pasos con resumen; `ErrorBoundary` y pantalla de recuperación en el arranque; perfil reparado en memoria | `src/lib/backupCheck.ts` (nuevo), `src/lib/backup.ts`, `src/screens/SettingsScreen.tsx`, `src/App.tsx`, `src/main.tsx`, `src/components/Recovery.tsx` (nuevo), `src/lib/profile.ts`, `tests/backupCheck.test.mjs` (nuevo) |
| NC-v5.8.2-04 (U4) | AUD-FLU-209 | La clave de Gemini se comprueba con Google antes de guardarla (Ajustes y hoja de problemas); si falla, se conserva la anterior | `src/lib/geminiKey.ts` (nuevo), `src/screens/SettingsScreen.tsx`, `src/components/GeminiFix.tsx`, `tests/geminiKey.test.mjs` (nuevo) |

## Pendiente para U7 (anotado a petición del orquestador)
- `package.json`: el script `apk` debe pasar de `assembleDebug` a `assembleRelease --offline` (el entregable es el release).
- `CLAUDE.md` (tabla de comandos, «APK (forma fiable)» → `assembleRelease`; «Comprobar que el Java compila»), `docs/configuracion.md` y `docs/correccion/REVISOR-MOVIL.md` / arneses: la app de pruebas por CDP pasa a ser `com.shift.habla.debug`.
- `version.json` 5.8.2/35 y `RELEASES`.

---

## NC-v5.8.2-01 (U1) · Build release no depurable

**Hallazgos:** AUD-SEG-001 (el APK repartido era *debuggable*: por `run-as` o CDP se leían las claves sin huella), AUD-SEG-504 (el debug se firmaba con la clave de producción y el mismo `applicationId`; el release no se usaba y R8 estaba apagado), AUD-ARQ-106 (sin `keystore.properties` se firmaba con la clave genérica y se copiaba a `apk/` con el nombre de siempre).

**Qué se cambió:**
- `android/app/build.gradle`
  - **release:** `debuggable false`, `signingConfig signingConfigs.habla` (siempre, sin el `if` que dejaba el release sin firmar), `minifyEnabled true` (R8) con `proguard-android-optimize.txt`, `shrinkResources false`. Capacitor activa la depuración del WebView solo si la app es depurable (`CapConfig.java:245,286`), así que en el release **no hay CDP ni `run-as`**.
  - **debug:** `applicationIdSuffix ".debug"`, `versionNameSuffix "-debug"` y **sin** la firma de producción (usa `~/.android/debug.keystore`). Es otra app: no se instala encima de la de uso diario ni ve sus datos.
  - **Sin `keystore/keystore.properties`:** `packageRelease`, `validateSigningRelease`, `assembleRelease`, `bundleRelease` y `signReleaseBundle` fallan con un mensaje en español. Compilar el Java (release o debug) sigue funcionando en un clon limpio. La ruta se puede cambiar con `-PhablaKeystoreProps=<ruta>` **solo para probar** esta comprobación sin tocar `keystore/`.
  - **Copia a `apk/`:** la de cualquier variante al terminar `assemble…`, con nombre `Habla-v<versión>.apk` (release) o `Habla-v<versión>-debug.apk` (debug). Compilar el debug ya no pisa el APK entregado.
- `android/app/proguard-rules.pro`: reglas conservadoras para R8 (se conservan enteros `com.getcapacitor.**`, `com.capacitorjs.plugins.**`, `com.getcapacitor.community.**`, `io.ionic.**`, `com.shift.habla.**`, anotaciones y métodos `@JavascriptInterface`). Capacitor y sus plugins se cargan por reflexión y no se puede probar en el teléfono ahora; R8 sigue quitando lo no usado de AndroidX.
- `android/app/src/debug/res/values/strings.xml` (nuevo): la app de depuración se llama «Habla debug» en el lanzador.

**Cómo se probó (PC, sin copiar a `apk/`; `keystore/` sin tocar):**
- `gradlew.bat :app:compileReleaseJavaWithJavac :app:packageRelease :app:packageDebug --offline -q` → salida 0. `apk/` sin cambios (comparado el listado antes y después). APK generados solo en `android/app/build/outputs/apk/`.
- `aapt2 dump badging` y `apksigner verify --print-certs`:

| APK | paquete | versión | depurable | certificado SHA-256 |
|---|---|---|---|---|
| `build/outputs/apk/release/Habla-v5.8.1.apk` (2,1 MB) | `com.shift.habla` | 34 / 5.8.1 | **no** | `95626710…aa597` |
| `build/outputs/apk/debug/Habla-v5.8.1-debug.apk` (5,4 MB) | `com.shift.habla.debug` | 34 / 5.8.1-debug | sí | `7cfa0361…547bd` (clave genérica) |
| `apk/Habla-v5.8.apk` (el distribuido) | `com.shift.habla` | 33 / 5.8 | sí | `95626710…aa597` |

  El release tiene **el mismo certificado** que la 5.8 distribuida → se instala encima con `adb install -r` conservando los datos. (Versión 5.8.1 porque `version.json` se sube en U7.)
- R8: `build/outputs/mapping/release/mapping.txt` muestra `MainActivity`, `HablaChromeClient` y `com.getcapacitor.Bridge` sin renombrar.
- Sin keystore: `gradlew.bat :app:packageRelease --offline -q -PhablaKeystoreProps=../no-existe/keystore.properties` → falla con «Falta keystore/keystore.properties: el APK de Habla debe firmarse con habla.jks…»; con la misma ruta, `compileReleaseJavaWithJavac` y `compileDebugJavaWithJavac` → salida 0.

**Para el teléfono (revisor móvil) — importante:**
1. Instalar el **release** (`Habla-v5.8.2.apk` cuando se compile en U7) con `adb install -r` encima de la versión en uso: debe actualizar **sin desinstalar** y conservar perfil, clase guardada y claves.
2. Arranque completo con R8: Inicio, clase con voz (micro, TTS), fonética, notificaciones (recordatorio de prueba), exportar/importar copia (Filesystem/Share), huella (DeviceAuth), orientación forzada, auriculares (AudioRoute). Si algo falla solo en release, el plan B es `minifyEnabled false` (sigue siendo no depurable).
3. Comprobar que **no** hay CDP (`chrome://inspect` no lista el WebView de `com.shift.habla`) y que `adb shell run-as com.shift.habla` responde «package not debuggable».
4. **Los arneses de la auditoría (CDP, `run-as`) dejan de funcionar con la app de uso diario.** Para probar por CDP hay que instalar el debug (`Habla-v<versión>-debug.apk`), que es **otra app** («Habla debug», `com.shift.habla.debug`) con datos propios vacíos: hay que crear un perfil de prueba y meter una clave de prueba. Hay que actualizar `REVISOR-MOVIL.md` y los arneses con el paquete `.debug` (en U7).
5. Las dos apps pueden convivir; desinstalar «Habla debug» no afecta a «Habla».

---

## NC-v5.8.2-02 (U2) · Resource ID de Azure y huella para el acceso a Azure Monitor

**Hallazgo:** AUD-FUG-401 (el Resource ID se pegaba detrás de `https://management.azure.com`; con `@evil.example/x` el token Bearer de Azure Resource Manager salía a otro host; cambiar tenant, client o resource no pedía la huella).

**Qué se cambió:**
- `src/lib/azureUsage.ts`
  - `normalizeResourceId()`: quita espacios y barras finales y exige `^/subscriptions/<GUID>/resourceGroups/<grupo>/providers/Microsoft.CognitiveServices/accounts/<nombre>$` (grupo: letras, dígitos, `_ ( ) . -`, sin acabar en punto; cuenta: letras, dígitos y guiones). Sin `@`, `%`, `?`, `#`, `..` como grupo ni rutas extra.
  - `monitorProblem()`: Tenant = GUID o dominio (`contoso.onmicrosoft.com`), Client ID = GUID, Resource ID válido; devuelve un texto en español que dice dónde copiar el dato.
  - `metricsUrl()`: construye la URL con `new URL(ruta, 'https://management.azure.com')` y comprueba `https:`, `host === 'management.azure.com'` y sin usuario/contraseña; los parámetros van con `URLSearchParams`.
  - `monthUsage()`: valida **antes** de pedir el token (con datos malos el secreto ni siquiera sale del teléfono) y usa `metricsUrl()`.
- `src/components/AzureSettings.tsx` (`saveMonitor`): valida y muestra el error sin guardar; guarda el Resource ID normalizado; **pide el bloqueo** si cambia el secreto, el tenant, el cliente o el recurso ya guardados (antes solo el secreto). Dejarlo todo vacío quita el acceso (también pide el bloqueo si había datos).

**Cómo se probó (PC, red simulada, 0 llamadas reales):** `tests/azureUsage.test.mjs` con `fetch` falso que registra las peticiones: 11 Resource ID maliciosos o mal formados (`@evil.example/x`, `.evil.example/x`, `:443@…`, `//evil…`, `…@evil.example`, `..` como grupo, `/../..` al final, `?y=1`, `%2F..%2F`, URL completa, vacío) → rechazados y **0 peticiones**; uno correcto con espacios y barra final → 2 peticiones, solo a `login.microsoftonline.com` y `management.azure.com`, ruta y `Authorization: Bearer` correctos; Tenant/Client mal formados → rechazados sin peticiones. `npm test` 20/20, tsc OK, lint 0 errores.

**Para el teléfono:** Ajustes → Modelos → Azure → Acceso a Azure Monitor: con un Resource ID inválido sale el mensaje y no se guarda; cambiar el tenant, el Client ID o el Resource ID ya guardados pide patrón/PIN/huella. (En el POCO no hay *service principal*: con datos de prueba basta ver el mensaje y la huella; no hace falta llamada real.)

---

## NC-v5.8.2-03 (U3) · Copias validadas y arranque sin pantalla negra

**Hallazgos:** AUD-SEG-501 (`tables:{}` borraba todo con «Importado ✓»; un perfil con tipos raros dejaba la app en negro; 52 MB aceptados), AUD-RES-704 (sin `catch` en el arranque: negro para siempre), AUD-E2E-601 (sin `ErrorBoundary`: una consulta mal formada dejaba Palabras en blanco), AUD-SEG-510 (errores internos en inglés).

**Qué se cambió:**
- `src/lib/backupCheck.ts` (nuevo, puro): `checkBackup()` / `parseBackup()` comprueban formato, versión entera 1…actual, **las 6 tablas presentes como listas**, cada fila como objeto con los campos que la app lee sin comprobar y su tipo (sesiones, mensajes, errores, perfil, consultas, tarjetas), ids sin repetir, **exactamente un perfil** y el índice único de tarjetas (`source+sourceId`). Mensajes en español que terminan en «no se cambió nada» y dicen tabla, fila y campo.
- `src/lib/backup.ts`: `readBackup(file)` (límite 20 MB antes de leer, comprobación entera, recuentos) y `applyBackup()` (una transacción; si Dexie la rechaza, mensaje propio en español y no cambia nada). `importBackup()` = las dos.
- `src/screens/SettingsScreen.tsx` (`DataPage.doImport`): primero comprueba; luego pide confirmación con los recuentos de la copia («La copia tiene N sesiones y M errores…»); después sustituye.
- `src/App.tsx`: «Ya tengo mi perfil» (bienvenida) comprueba la copia **y que el perfil tenga nombre antes de sustituir** (antes lo miraba después de haber borrado). `catch` en la carga inicial y al terminar la bienvenida → `RecoveryScreen`.
- `src/components/Recovery.tsx` (nuevo): `ErrorBoundary` + `RecoveryScreen` («Algo no ha ido bien», tu progreso sigue en el teléfono, «Volver a intentar», «Exportar mis datos»), con estilos fijos porque puede salir antes del tema. `src/main.tsx` envuelve `<App />`.
- `src/lib/profile.ts`: `repairProfile()` completa en memoria `levels`, `about`, `weaknesses`, `goal`, `name`, `purposes`, `interests` si vienen con otro tipo; `getProfile()` la aplica (un perfil roto de antes ya no rompe el arranque).

**Cómo se probó (PC):** `tests/backupCheck.test.mjs`: copia con la forma real de `buildBackup()` aceptada; 16 copias dañadas de la auditoría y variantes (`tables:{}`, `tables:null`, sin versión, versión «9», falta `lookups`, `name` objeto, sin `levels`, sin perfil, consulta sin `result`, `collocations` objeto, `topic.title` objeto, `role` raro, fila no objeto, id repetido, tarjetas repetidas, otro formato) → rechazadas con «no se cambió nada» y sin textos internos; versión más nueva y JSON roto; `__proto__` sin contaminación; `repairProfile` con perfil roto. `npm test` 31/31, tsc OK, lint 0 errores, `npm run build` OK.

**Pendiente de comprobar en navegador (rev) y teléfono:** importar en Ajustes → Mis datos una copia buena (confirmación con recuentos) y una dañada (mensaje, datos intactos); desde la bienvenida, copia sin nombre → mensaje sin borrar nada; perfil con `levels` borrado en IndexedDB → pantalla de recuperación (no negra); consulta sin `result` → recuperación al abrir Palabras. **Importante para el revisor móvil:** exportar la copia real del dueño (POCO) y comprobar con `checkBackup` (o importándola en el navegador aislado) que **se acepta**: el esquema es nuevo y una copia real de versiones antiguas podría tener algún campo distinto.

---

## NC-v5.8.2-04 (U4) · Clave de Gemini: comprobar antes de guardar

**Hallazgo:** AUD-FLU-209 (Ajustes → Modelos guardaba la clave nueva y después la comprobaba: una mal copiada pisaba la buena; «Usar esta clave» de la hoja de problemas y de la pantalla de error del test no la comprobaba nunca).

**Qué se cambió:**
- `src/lib/geminiKey.ts` (nuevo): `verifyGeminiKey(clave, ajustes)` pide la lista de modelos (valida la clave sin gastar cuota) y devuelve lo que hay que guardar (clave limpia + modelo principal y de respaldo válidos para esa clave) o un error; nunca guarda nada por sí misma. La lógica de elegir modelos es la que había en Ajustes.
- `src/screens/SettingsScreen.tsx` (`GeminiPage.save`): la huella sigue pidiéndose antes; luego «Comprobando con Google…»; solo si Google acepta la clave se guarda (y se limpian las cuotas agotadas de la anterior). Si falla: el error y «No se cambió: sigues con tu clave anterior.».
- `src/components/GeminiFix.tsx` («Usar esta clave»): igual, con estado «Comprobando con Google…» y mensaje de error; antes guardaba sin comprobar.
- La bienvenida (`Onboarding.tsx`) ya comprobaba antes de guardar: sin cambios.

**Cómo se probó (PC, sin red):** `tests/geminiKey.test.mjs` con la lista de modelos simulada: clave rechazada y sin conexión → nada que guardar; clave aceptada (con espacios) → clave limpia y modelos; modelo elegido inexistente → elige uno disponible y un respaldo distinto; clave vacía → sin llamar a Google. `npm test` 36/36, tsc OK, lint 0 errores.

**Para el teléfono / navegador (con red simulada):** Ajustes → Modelos → pegar una clave falsa `AIza…` → huella → mensaje de error y la clase sigue funcionando con la clave anterior. Lo mismo desde la hoja de problemas de la mascota. Sin llamadas reales: basta la red falsa (`B4/arnes/net.js`) devolviendo 400 a `/models`.

## Correcciones tras la revisión en PC (NC del revisor)

| NC | Qué se cambió | Archivos |
|---|---|---|
| REV-U2-1 (BAJA) | Quitar el acceso a Azure Monitor (Tenant, Client y Resource vacíos) borra también el secreto guardado del *service principal*; pide el bloqueo si había datos; aviso «Acceso a Azure Monitor quitado (también el secreto)». | `src/components/AzureSettings.tsx` |
| REV-U1-1 (MEDIA) | Se cierra en U7 (script `apk` → `assembleRelease --offline`, recetas de `CLAUDE.md` y `docs/configuracion.md`; los arneses los adapta el revisor móvil). | — (U7) |
