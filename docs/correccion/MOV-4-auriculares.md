# MOV-4 · Micrófono de auriculares Bluetooth — compendio y solución aplicada

**Fecha:** 2026-10-08 · **Versión:** 5.9 (build 36) · **Teléfono:** POCO (`60d0718c`, HyperOS, Android 16) · **Auriculares:** soundcore Liberty 4 Pro (HFP/A2DP)

## 1. El problema (tal como se vio en la revisión móvil, M7)
Con «Todo por los auriculares», al entrar en clase el micro tardaba ~14 s en abrirse y cada toque ~9 s en empezar a grabar. Al final se grababa con el micro del teléfono («Speakerphone») tras dar el de los auriculares por «mudo». Además, el plugin escribía `setCommunicationDevice(...) = true · ahora: 23122PCD1G tipo 1`, como si la ruta no se quedara en el Bluetooth.

## 2. Qué hacen las grandes empresas (búsqueda en internet)
| Fuente | Qué hace | Qué tomamos |
|---|---|---|
| **Google · WebRTC** (`AppRTCBluetoothManager`, demo oficial de Android) | Máquina de estados `HEADSET_AVAILABLE → SCO_CONNECTING → SCO_CONNECTED`. Como el sistema no garantiza el aviso, pone un **temporizador de 4 s** y **2 intentos** como máximo; si falla, vuelve al micro del teléfono. | Esperar con límite (2 × 2 s) y dos intentos; nunca esperar sin fin. |
| **Twilio · AudioSwitch** (librería de audio de sus SDK de voz y vídeo) | Prioridad Bluetooth → cable → auricular del teléfono → altavoz. **Si el Bluetooth no conecta, revierte solo** al dispositivo anterior y avisa a la app con un *listener* de errores. | Si el micro de los auriculares falla, cambiar solos a una ruta que funcione y decírselo al usuario. |
| **Google · Chromium** (el motor del WebView de Habla) | En `getUserMedia` pone el «modo comunicación» y elige su dispositivo: cable > USB > Bluetooth > altavoz. **Al cerrar el micro devuelve el modo normal.** | Confirmado en el POCO: el WebView ya elige los auriculares por sí solo; la ruta del plugin sobra para el micro, y cada toque abre y cierra el enlace Bluetooth. |
| **Android** (`setCommunicationDevice`, rediseño SCO de AOSP) | `setCommunicationDevice` es **asíncrono**: la ruta se aplica después. El modo de llamada usa SCO (8/16 kHz). | El «falló» del plugin era un falso negativo: hay que esperar a que la ruta sea efectiva. |
| Proyecto abierto de llamadas (wz-phone, mismo síntoma) | Tras `setCommunicationDevice` espera ~500 ms porque la política de audio tarda en aplicar la ruta; si se abre antes, graba del micro anterior. | Lo mismo: esperar la ruta antes de medir. |

Fuentes: [Twilio AudioSwitch](https://github.com/twilio/audioswitch) · [AppRTCBluetoothManager (WebRTC)](https://codereview.webrtc.org/2501983002/patch/260001/270005) · [Chromium: modo comunicación con micro Bluetooth](https://chromium.googlesource.com/chromium/src/+/78d0de138346e6edfc8c33bdd22c45b3eec4f3d0) · [Chromium `CommunicationDeviceSelector`](https://chromium.googlesource.com/chromium/src/+/main/media/base/android/java/src/org/chromium/media/CommunicationDeviceSelector.java) · [Android: SCO gestionado por el audio](https://source.android.com/docs/core/audio/sco-audio-mgmt?hl=es) · [wz-phone PRD Bluetooth](https://git.manko.yoga/manawenuz/wz-phone/src/branch/main/docs/PRD-bluetooth-audio.md)

## 3. Lo que medimos en el teléfono (pensamiento crítico: medir antes de arreglar)
Evidencia en `evidencia-movil/MOV4-*`, scripts en `arnes-movil/mov4-*.js`.

| Medida | Resultado |
|---|---|
| Ruta a los auriculares tras `setRoute` | efectiva en **~0,3 s** (el «falló» era un falso negativo) |
| Enlace de audio Bluetooth (eSCO, logcat `HeadsetStateMachine`) | **AudioOn en 150 ms**: la latencia NO es el problema |
| Micro de los auriculares en el WebView, con el dueño contando en voz alta | picos ≤ 0,004 (voz normal: 0,1–0,5) → silencio |
| Micro de los auriculares **en nativo** (AudioRecord VOICE_COMMUNICATION, como una app de llamadas) | Android **no entrega ni una muestra** (0 de 19 392 en 1,2 s) |
| Micro del teléfono en nativo y en el WebView (control) | entrega todo (18 240 de 19 472) y se oye la voz |

**Conclusión:** el micro de estos auriculares no da audio a este teléfono ni siquiera fuera de Habla (fallo de los auriculares o del teléfono, no del WebView). Habla no lo puede reparar. Lo que sí estaba mal en Habla:
1. Detectaba el fallo **midiendo volumen** (5 s esperando voz). Los auriculares con cancelación de ruido mandan **ceros exactos** cuando no hablas, así que esa medida no distingue «no hablas» de «micro muerto», y además es lenta.
2. En modo auriculares **repetía esa medida en cada toque** aunque ya hubiera elegido el micro del teléfono (`chosen`): ~9 s por toque.
3. El plugin comprobaba la ruta **antes** de que Android la aplicara.

## 4. Propuesta del dueño
> «Una animación que impida hacer cualquier otra cosa excepto salir de la clase mientras que se conecten los audífonos a la app.»

**Valoración:** acertada en la experiencia (como el estado «Connecting…» de las apps de llamadas: no dejar hablar a un micro que aún no está listo). Le faltaban dos cosas que hacen las grandes: **un límite de tiempo** (si los auriculares nunca dan audio, la pantalla no puede durar para siempre) y **qué pasa si fallan** (Twilio revierte solo a una ruta que funciona).

## 5. Solución elegida y aplicada (compendio)
1. **Pantalla de la mascota «Conectando tus auriculares…»** (la propuesta del dueño): al entrar en clase con «Todo por los auriculares», solo deja «Salir de la clase». Dura lo que tarda la comprobación (medido: 2,7 s con auriculares muertos; algo menos con unos que funcionan).
2. **Ruta confirmada, con límite** (Google WebRTC): `setRoute` espera a que Android aplique el dispositivo (2 intentos × 2 s) y devuelve el tiempo real (`ms`).
3. **Comprobación por muestras, no por volumen** (mejora propia sobre lo investigado): `checkMic` lee 1,2 s del micro Bluetooth en nativo y **cuenta muestras**. Vivo (aunque sea silencio) ≥ 1/3 de lo esperado; muerto = nada. Sin guardar audio.
4. **Si fallan, ruta que funciona y aviso** (Twilio AudioSwitch): la mascota dice «Tus auriculares no me envían tu voz»; Habla pasa a «escucho por los auriculares, hablo al teléfono» (sin modo llamada: el profe suena con calidad normal) con «Hablar al teléfono» / «Salir de la clase». Se vuelve a comprobar al reconectarlos o al volver a abrir Habla.
5. **Si funcionan, se confía en ellos**: ya no se mide la voz al abrir (adiós a los 5 s y al falso «mudo»).
6. **Arreglo del bucle de 9 s**: en modo auriculares, con un micro ya elegido no se vuelve a medir.

**Resultado en el POCO con los soundcore:** pantalla «Conectando…» a los 0,15 s → aviso a los 2,9 s → al tocar el micro, **graba en 0,3 s** (antes ~9 s) con `MODE_NORMAL`. Captura: `evidencia-movil/MOV4-aviso-sin-micro.png`.

**Descartado:** grabar en nativo en lugar del WebView (lo sugieren algunos foros). Aquí no ayudaría, porque el micro tampoco da audio en nativo, y supondría reescribir la grabación entera.

## 6. Pendiente (pruebas del dueño)
- [ ] **Auriculares por cable:** no deben ver la pantalla de comprobación más que un instante (no son Bluetooth: `ok` directo) y grabar con su micro.
- [ ] **Auriculares Bluetooth de otra marca** (con micro que funcione): deben pasar la comprobación (`entregan audio`), grabar con su micro al momento y no ver el aviso. Es la prueba que valida el criterio «vivo = entrega muestras».
- [ ] Opcional: con los soundcore, hacer una llamada normal para saber si su micro funciona con este teléfono fuera de Habla.
