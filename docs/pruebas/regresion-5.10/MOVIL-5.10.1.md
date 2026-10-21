# 5.10.1 · Prueba en el teléfono (POCO X6 + soundcore Liberty 4 Pro)

Orquestador con el dueño, APK **debug** 5.10.1 (`com.shift.habla.debug`, `install -r`; el release no se toca hasta el final).
Herramientas: `arnes/cdp.mjs` + `helpers.js`, `arnes/spy.js` (llamadas AudioRoute), `arnes/voz-spy.js` (qué dice cada voz),
`arnes/oyente.sh` (pistas de audio reales, salida y dB), `arnes/cambios.sh`/`foco.sh` (foco de audio), `arnes/atras-pre.js` +
`precarga.mjs` (botón Atrás), `arnes/cpu.sh`. Resultados en `MOVIL.md` (sección «5.10.1»).

| # | Prueba | Cómo | Esperado | 🧑 |
|---|---|---|---|---|
| T1 | Instalar debug 5.10.1 y migración | `install -r`; Repaso abre | La tarjeta vieja «gets in in» aparece corregida («arrives … in»); datos intactos | |
| T2 | Micro con auriculares (REG-M-01) | 10 toques tras hablar el profe; log `[HABLA-MIC]` | Toque → grabando < 2,5 s (ideal ~1,5 s) | 🧑 voz |
| T3 | Calidad del profe por los auriculares | `oyente.sh` durante la voz del profe | Salida `BLUETOOTH_A2DP` (no SCO) mientras habla; SCO solo tras acabar | 🧑 oído (clic al cambiar) |
| T4 | Ruta preparada se suelta | `dumpsys audio`/`oyente.sh` | Modo normal al enviar, a ~20–25 s sin tocar, al minimizar, al salir de la clase | |
| T5 | Privacidad: minimizar con la ruta preparada / grabando | CDP + `appops` | Sin captura ni modo llamada en segundo plano | 🧑 minimizar |
| T6 | REV-D1-02: conectar auriculares con Habla minimizada | Sacar los soundcore de la funda con la app oculta | `dumpsys audio` sigue `NORMAL`; al abrir, selector o prueba | 🧑 funda |
| T7 | Prueba de sonido nueva | Auriculares «nuevos» (borrar `habla.soundChecked` en el debug) | Instrucción → escucha sola (vibración, «Te escucho…») → pasa en ≤ 6 s sin tocar; reiniciar app: no se repite | 🧑 voz |
| T8 | Prueba de sonido con Spotify sonando y sin hablar | | La música no cuenta como voz; «No te he oído» a los 8 s | 🧑 |
| T9 | Descartes visibles (REG-M-02) | Grabación muy corta, silencio, idea leída | Recuadro persistente con el motivo; «Enviar igualmente» si procede | 🧑 |
| T10 | P6/echoesIdea | Idea + palabras propias; idea exacta | La primera se corrige; la segunda avisa «¿Leíste la idea?» | 🧑 voz |
| T11 | Música en la explicación (REG-M-06/A1-03) | Spotify + «Escuchar la explicación», `foco.sh` + `oyente.sh` | Un solo `pause` y un solo `abandon`; Spotify pausado y reanudado una vez | 🧑 |
| T12 | La voz se para al cambiar de parte (REG-M-07) | Explicación sonando → Ejercicios / Pregúntale / Atrás | `voz-spy`: `stop` inmediato | |
| T13 | «5th» y voces (REG-M-10, A3-13/14) | `voz-spy` durante la explicación de preposiciones de tiempo | Tramo `en`: «May fifth»; nada de «th» en español | |
| T14 | Clase de Gramática: frase española con voz española (REG-A3-04) | Clase dirigida, `voz-spy` | Tramo «Tengo una reunión…» con `lang es-ES` | |
| T15 | Fonética: consejo en español, sin «ten:zero» | «Dilo tú» con una hora | Lista sin tokens raros; consejo en español | 🧑 voz |
| T16 | Letra del sistema y ajuste «Apariencia» | Ajustes → Grande / Muy grande; `font_scale` del sistema | Escala = sistema × ajuste con topes (1,3 vertical, 1,15 horizontal); nada cortado | |
| T17 | MascotPage de Terminar e Importar + Atrás | | Páginas con la mascota en español; Atrás las cierra | |
| T18 | Huella por credencial (REG-A2-03) | Ver clave de Gemini y luego la de Azure antes de 60 s | Vuelve a pedir la huella | 🧑 huella |
| T19 | Caché tras compartir (REG-A2-04) | Exportar → compartir → volver → 1 min | El archivo ya no está en la caché | |
| T20 | Seguridad | logcat durante una clase real; `run-as` en release | 0 claves; nombre de auriculares solo en debug | |
| T21 | CPU en reposo (release, como referencia) | `cpu.sh` en clase e Inicio | Comparar con el debug (28–52 %) | |
| T22 | Release final | `npm run apk` → `install -r` sobre la 5.10 | Arranca con los datos del dueño; no depurable; misma firma | |
