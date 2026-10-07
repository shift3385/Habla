# B5 · Plan de pruebas dinámicas (fase 2)

Reglas: `../REGLAS-COMUNES.md`. **Nunca** claves reales en estas pruebas: en el navegador, clave ficticia `AIzaTEST-NO-REAL-0000000000000000000` y secretos/IDs de Azure inventados, siempre con **red falsa** activa. En el teléfono, solo lectura de la configuración y del comportamiento de la interfaz; no se cambian claves reales ni se lee `CapacitorStorage.xml`. **0 llamadas reales** a Gemini/Azure (B5 no tiene cupo). Teléfono solo con `.telefono.lock`.

Arneses en `resultados/B5/arnes/`; evidencias en `resultados/B5/evidencia/`.

## A · Navegador (`preview_start name:"habla-dev"`, 360×780)

Antes de cada prueba: inyectar la **red falsa** de `entorno.md` ampliada para registrar `{url, host, método, cabeceras (valores de Authorization/Ocp-Apim/x-goog enmascarados a 4 caracteres), tamaño}` en `window.__net` y responder:
- `login.microsoftonline.com/*/token` → `{"access_token":"TOKEN-FALSO-B5"}`.
- cualquier otro host → `200 {}`.
Datos de prueba en `localStorage`/IndexedDB del navegador (nunca los del teléfono).

| ID | Hallazgo | Pasos | Criterio |
|---|---|---|---|
| P-01 | AUD-SEG-500 | Ajustes → Modelos → Azure → Acceso a Azure Monitor. Guardar Tenant/Client ficticios, *secret* `SECRETO-FALSO`, Resource ID válido inventado. Luego cambiar solo el Resource ID a `@mock-b5.invalid/x` y «Guardar acceso». Repetir con `.mock-b5.invalid/x`. | **Confirmado** si `window.__net` registra `GET` a host `mock-b5.invalid` / `management.azure.com.mock-b5.invalid` con `Authorization: Bearer TOKE…`. Anotar si pidió confirmación (en web `confirmIdentity` deja pasar: el paso de «sin bloqueo» se verifica en P-05 en el teléfono **solo mirando** si sale el diálogo, sin guardar). |
| P-02 | AUD-SEG-500 (control) | Región de Azure `mock-b5.invalid`, `x/#`, `a@b` → «Guardar y comprobar». | Host siempre `*.api.cognitive.microsoft.com` o URL inválida (no sale petición). |
| P-03 | AUD-SEG-503/509 | Red falsa de Gemini devolviendo respuestas maliciosas en cada pantalla que pinta IA (conversación, corrección, informe, tema del día, consulta de palabra, plan): textos con `<img src=x onerror=window.__xss=1>`, `<script>`, `javascript:alert(1)`, `[link](javascript:…)`, 200 kB de texto, JSON con campos extra/`__proto__`, tipos cambiados (número donde va texto, objeto donde va array), `groundingChunks` con `uri: "javascript:…"`. | `window.__xss` sigue `undefined`; ningún `<a>` con `javascript:`; la pantalla no se rompe (si se rompe → hallazgo de robustez, AUD-SEG-5xx). Captura de cada caso. |
| P-04 | AUD-SEG-501 | Con datos de prueba (2 sesiones), Ajustes → Datos → Importar: (a) `{"format":"habla-backup","version":1,"tables":{}}`; (b) `tables:null`; (c) `version:"9"`; (d) sin `version`; (e) `sessions:[{"id":1,"topic":{"x":1}}]`; (f) fila con `"__proto__":{"polluted":1}`; (g) archivo de 50 MB válido; (h) desde la bienvenida, copia sin perfil. | (a) **Confirmado** si quedan 0 sesiones. (b) error y datos intactos. (c) rechazo esperado. (d) anotar. (e) abrir Progreso/Historial: ¿falla al pintar? (f) `({}).polluted` sigue `undefined`. (g) tiempo y memoria, ¿se cuelga? (h) ¿los datos se sustituyeron antes del error? |
| P-05w | AUD-SEG-502 | En web no aplica (`confirmIdentity` siempre deja pasar): solo verificar que el campo vacío no contiene la clave (`document.querySelectorAll('input[type=password]')` → `value.length`, sin imprimir el valor). | Longitud 0 hasta pulsar el ojo; 0 otra vez tras ocultar. |
| P-06 | AUD-SEG-503 | Medir qué haría una CSP: en DevTools, `document.querySelectorAll('script:not([src]),[style]')` y orígenes de `performance.getEntriesByType('resource')`. | Lista de orígenes = solo `localhost` → la CSP propuesta no rompe nada (base para la corrección). |

## B · Teléfono (con turno, solo lectura; APK instalado v5.8 build 33, no instalar nada)

| ID | Hallazgo | Pasos | Criterio |
|---|---|---|---|
| P-07 | Superficie | `adb shell dumpsys package com.shift.habla` (actividades, `exported`, proveedores, permisos). `adb shell am start -n com.shift.habla/.MainActivity -a android.intent.action.VIEW -d "habla://x?<script>"` y con `-d "https://localhost/#/settings"`, `--es extra "<img>"`. | La app abre en Inicio sin efectos; no navega a la URL. `am start` contra `androidx.core.content.FileProvider` / `content query --uri content://com.shift.habla.fileprovider/my_images/` → denegado (no exportado). |
| P-05 | AUD-SEG-502 | En Ajustes → Gemini, pulsar el ojo, confirmar con huella **el dueño**, volver a ocultar. En < 60 s ir a Azure y pulsar el ojo de la clave de Speech. Repetir esperando 61 s. Repetir: confirmar, mandar la app a segundo plano 10 s, volver. | Anotar si pide el diálogo (CDP: `document.body.innerText` + captura con `screencap`). No leer ni copiar el valor: comprobar solo `input.value.length` por CDP. |
| P-08 | AUD-SEG-504 | `apksigner verify --print-certs apk/Habla-v5.8.apk` (solo huella SHA-256 del certificado) y comparar con la de `dumpsys package` (`signatures`). No compilar release. | Misma firma → confirma que un debug sustituye al de uso diario. |
| P-09 | AUD-SEG-505 | Tras exportar **el dueño** (si lo hace para otra prueba), `adb shell ls -l /sdcard/Documents/Habla/` (solo nombres y tamaños) y `adb shell run-as`… **no** (prohibido). La caché se deduce de `Filesystem.readdir({directory:'CACHE'})` por CDP (solo nombres). | Confirmado si quedan copias en ambos sitios. |
| P-10 | Puente/CDP | Por CDP: `Object.keys(Capacitor.Plugins)` y `typeof Capacitor.Plugins.Preferences.get` (sin llamarlo). | Lista de plugins accesibles desde JS: documenta el alcance de una XSS (AUD-SEG-503). |
| P-11 | AUD-SEG-500 (teléfono) | Solo observar: Ajustes → Azure → Acceso a Azure Monitor abierto; ¿los campos Tenant/Client/Resource ID muestran los valores guardados? (`input.value.length` por CDP, sin imprimir). **No** cambiar nada. | Confirma que se pueden editar sin bloqueo (la petición desviada ya se probó en P-01, en web). |

## Orden y tiempo

1. Navegador: P-01, P-02, P-04, P-03, P-05w, P-06 (≈ 1 h).
2. Teléfono (turno ≈ 20 min): P-07, P-08, P-10, P-11, P-05 (con el dueño para la huella), P-09 si hubo exportación.
3. Actualizar estados en `hallazgos.md` (HIPÓTESIS → CONFIRMADO/DESCARTADO) y completar `superficie.md`.
