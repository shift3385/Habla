# Receta del arnés de navegador de `rev` (v5.8.1 «Micrófono seguro»)

Entrada para `javascript_tool` (navegador integrado). Arnés: `docs/correccion/arnes-rev/rev-mic.js`. Todo se hace en el **origen aislado** `http://rev.localhost:5173` (el arnés se niega a instalarse en otro). Nunca se borra el almacenamiento de `localhost:5173`. Red falsa: ninguna petición sale a Gemini/Azure; la clave es ficticia.

## 0. Preparación (una vez por origen)
1. `preview_start` con `name: "habla-dev"` → `navigate` a `http://rev.localhost:5173/` → `resize_window` 360×780.
2. Inyectar y preparar datos ficticios, luego recargar:
   ```js
   (0, eval)(await (await fetch('/docs/correccion/arnes-rev/rev-mic.js')).text()); await __rev.setup(); await __rev.seedProfile(); location.reload()
   ```
   `seedProfile()` crea un perfil calibrado con un plan vacío: así `PlanCard` no pide «Crear plan» a Gemini **antes** de que la red falsa esté inyectada. Si `version.json` cambia (5.8.1), repetir `__rev.setup()` para no ver «Novedades».
3. Tras **cada** carga: `window.__REVCFG = {...}; (0, eval)(await (await fetch('/docs/correccion/arnes-rev/rev-mic.js')).text())` y pasar la puerta «Continuar donde lo dejé» (`__rev.click('Continuar donde lo dejé')`, 3 s). La primera vez pide elegir 3 temas (`Comida`, `Deportes`, `Viajes y culturas` → `Guardar mis temas`).
4. Comprobar que no salió nada real: `read_network_requests` con `urlPattern: "googleapis"` → vacío.
5. Atención: si `dev` guarda un archivo de `src/`, Vite recarga la página y el arnés se pierde (el script se corta). Repetir el paso 3.

Lectura del resultado: `__rev.check()` → `opened` (n.º de `getUserMedia`), `live` (pistas vivas), `recording` (grabadores en `recording`), `liveWhileHidden`, `openedWhileHidden`, `recStartedWhileHidden`, `audioSent`. Evidencia: `JSON.stringify(__rev.summary())` (eventos `ev` y línea de tiempo `tl`).

## 1. Criterio general de aprobación
- Tras cerrar la pantalla o pasar a segundo plano: `live=[]` y `recording=[]`.
- `openedWhileHidden=[]` y `recStartedWhileHidden=0` (nada se abre ni graba con la app oculta).
- Una pulsación = **una** apertura como mucho y **un** `MediaRecorder`.
- Solo sale audio (`audioSent`) tras un «terminar»/soltar del usuario.

## 2. MIC-302 · Doble toque en «Dictar por voz»
`__REVCFG = { gumDelay: 1500 }` (simula la apertura lenta del teléfono).
```js
__rev.reset()
__rev.click('Tema libre'); await __rev.wait(800)
await __rev.tap('Dictar por voz', 2, 150); await __rev.wait(2500)
const a = __rev.check()                       // esperado: opened=1, recording=[un id]
__rev.click('Terminar de dictar'); await __rev.wait(2500)
__rev.click('[aria-label="Atrás"]'); await __rev.wait(800)
const b = __rev.check()                       // esperado: live=[], recording=[]
__rev.hide(true, { pagehide: true }); await __rev.wait(800)
const c = __rev.check(); __rev.hide(false)    // esperado: liveWhileHidden=[]
;[a, b, c]
```
Variantes: `tap(…, 3, 80)`; en el Debate (paso 2); en el Repaso y el test (ver §7). Línea base v5.8: FALLA (`evidencia-rev/base-v5.8-MIC-302.txt`).

## 3. MIC-301 · Cierre durante la apertura (segundo plano)
Recargar la página antes de cada variante (en v5.8, `defaultOk` es global del módulo: tras una medición buena no se vuelve a medir). Entrar en clase con un tema del Inicio (p. ej. `__rev.click('Comida')`).
- **A · durante `getUserMedia`:** `__REVCFG = { gumDelay: 1500 }`; `click('Comida')` → `wait(500)` → `hide(true)` → `wait(2500)` → `check()` (esperado: `live=[]`, el stream tardío parado) → `hide(false)` → `wait(3000)` → `check()` (esperado: ninguna apertura nueva sin pulsar) → `hide(true)` → `check()` (`liveWhileHidden=[]`).
- **B · durante `hasSignal`:** `__REVCFG = { silentFirst: 1 }` (la 1.ª apertura da ceros: `hasSignal` mide 2 s); `click('Comida')` → `wait(500)` → `hide(true)` → `wait(3000)` → `check()` (esperado: `openedWhileHidden=[]`, en v5.8 `fallback()` abría el #1 oculto) → `hide(false)` → `wait(3000)` → `hide(true)` → `check()` (`liveWhileHidden=[]`).
- **C · durante `fallback()`:** `__REVCFG = { silentFirst: 2, fakeDevices: true }`; `hide(true)` a los 2,5 s (ya dentro de `fallback`) → mismas comprobaciones.
- **D · `releaseAllMics()` directo:** sin ocultar, `const { releaseAllMics } = await import('/src/lib/recorder.ts')` y llamarlo a los 500 ms de entrar: mismo resultado esperado (cancelación, no reapertura).
- Después, con la app «delante», mantener «Mantener para hablar» (§5) y ocultar a mitad: `recording=[]` al instante y nada enviado.

## 4. MIC-303 · Debate: «Atrás» del paso 2 al 1
```js
__rev.reset()
__rev.click('Prácticas'); await __rev.wait(600)
__rev.click('Debate'); await __rev.wait(800)
__rev.click('Lo propongo yo'); await __rev.wait(600)
__rev.click('Dictar por voz'); await __rev.wait(2200)            // grabando
__rev.click('[aria-label="Atrás"]'); await __rev.wait(5000)      // paso 1: «¿Quién elige el tema del debate?»
const a = __rev.check()                                          // esperado: live=[], recording=[]
__rev.click('Lo propongo yo'); await __rev.wait(600)
const label = __rev.find('[aria-label="Dictar por voz"]') ? 'Dictar por voz' : 'OTRO (¿sigue «Te escucho»?)'
;[a, label, __rev.check().audioSent]                             // esperado: botón en «Dictar por voz», audioSent=[]
```
- **Variante «durante la apertura»** (agravante B8): `__REVCFG = { gumDelay: 3000 }`; «Atrás» a los 500 ms del toque → esperado: ningún `rec start` y `live=[]` cuando resuelva la apertura.
- **Variante desmontaje:** «Atrás» dos veces (cierra la hoja) durante la apertura → `live=[]`.
- **Variante «Que elija el profe»** con el dictado grabando no aplica (el paso 1 no tiene micro) — tras el arreglo, al llegar al paso 1 ya está cerrado.

## 5. MIC-304 · Segundo puntero en «Mantener para hablar»
Entrar en clase (`click('Comida')`), esperar a que el profe salude (fase `idle`, unos segundos con la red falsa).
```js
__rev.reset()
const B = '[aria-label="Mantener para hablar"]'
__rev.ptr(B, 'pointerdown', 1); await __rev.wait(1500)
__rev.ptr(B, 'pointerdown', 2); await __rev.wait(300)
__rev.ptr(B, 'pointerup', 2); await __rev.wait(500)
const mid = __rev.check()                // esperado: recording con UN solo id (el del dedo 1); el pointerup del 2 no envía
__rev.ptr(B, 'pointerup', 1); await __rev.wait(3000)
const end = __rev.check()                // esperado: recording=[], rec creados = 1, audioSent con 1 elemento
;[mid, end, __rev.rec.length]
```
Nota: tras `pointerup` el botón puede tener otro `aria-label` (p. ej. 'Enviar' con bloqueo); si `ptr` devuelve «NO ENCONTRADO», buscar por `button[aria-label]`. Regresiones a probar: deslizar ↑ (bloqueo, `pointermove` con `clientY` −90) y ← (cancelar, `clientX` −120).

## 6. MIC-800 · Ceros exactos (habitación en silencio)
Recargar antes (estado de módulo limpio).
- **Silencio total:** `__REVCFG = { silentAll: true, fakeDevices: true }` → entrar en clase → `wait(15000)` → contar `__rev.mic.length` y mirar `__rev.mic.map(m => m.c)`. Esperado (T5): ≤2 aperturas; la última conserva `echoCancellation: true`; nada de `{"echoCancellation":false,…}` salvo en modo `split`.
- **Silencio solo al principio:** `__REVCFG = { silentFirst: 1, fakeDevices: true }` → esperado: 1 reintento como mucho y la siguiente grabación (pulsar el botón) con AEC.
- **Siguiente sesión:** salir y entrar en otra clase → las restricciones de la nueva apertura no deben ser RAW (en v5.8 `chosen` quedaba fijado).
- **Tiempo hasta grabar:** en el dictado con `silentAll`, de `tap` a `rec start` (en v5.8 ~6–12 s según n.º de micros).

## 7. Regresión en otras pantallas que graban
- **Repaso:** necesita tarjetas. Sembrar con el módulo de la app (`await import('/src/lib/srs.ts')`) o desde una clase con correcciones (red falsa). Doble toque en el micro y «No lo sé» durante la apertura (`gumDelay` 1500).
- **Test de nivel:** `seedProfile()` sin `calibratedAt` lleva al test; la tarea de habla está al final (≈gramática+lectura+escucha). Si no es viable llegar, revisión por código y queda para el revisor móvil.
- **Pantallas sin micro** (Inicio, Palabras, Progreso, Ajustes): navegar por ellas → `opened` no cambia.
- **Permisos:** `__rev.cfg.gumError = 'NotAllowedError'` → mensaje de permiso, 1 intento; `'NotReadableError'` → mensaje «cierra otras apps», 2 intentos (M10).

## 8. Avisos de proceso (aprendidos en la revisión)
- **No siembres datos de Azure (clave, tenant, secreto) antes de recargar**: `startupCheck` consulta Azure Monitor al arrancar, **antes** de que se inyecte la red falsa. Siembra solo después de inyectar y bórralos antes de la siguiente recarga.
- Errores simulados de la IA: `__rev.cfg.aiStatus = 400|403|429|503` o `__rev.cfg.aiOffline = true` (vuelve a 0/false al terminar).
- Micros falsos con auriculares BT: `fakeDevices: 'bt'` (el silencio solo cuenta como «mudo» si hay un micro BT o la pista está `muted`).
- En `npm run dev` la app va con StrictMode: la limpieza simulada de `Conversation` cancela la apertura inicial del micro (solo en desarrollo).
