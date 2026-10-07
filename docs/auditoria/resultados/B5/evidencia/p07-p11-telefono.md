# B5 · Evidencia teléfono (POCO 60d0718c, Android 16, Habla v5.8 build 33 debuggable)

Todos los comandos con `adb -s 60d0718c` (había además un Samsung SM-A115U conectado: no se tocó; su `forward tcp:9334` no es de B5 y se dejó). Lock `.telefono.lock` creado y borrado. Sin instalar nada, sin `run-as`, sin crear/borrar bases de datos, sin abrir la clase (se usó «Ir al inicio»), sin imprimir datos personales ni valores de claves. Al terminar: `am force-stop com.shift.habla` y `forward --remove tcp:9333`.

## P-07 · Superficie Android

- `dumpsys-package.txt` y `manifest-fusionado.txt` (aapt2 sobre `apk/Habla-v5.8.apk`):
  - Exportados: `MainActivity` (solo `MAIN/LAUNCHER`) y `androidx.profileinstaller.ProfileInstallReceiver` (protegido con `android.permission.DUMP`, estándar de AndroidX).
  - No exportados: `FileProvider` (`com.shift.habla.fileprovider`), `LocalNotificationsAssetProvider`, `InitializationProvider`, `LocalNotificationRestoreReceiver`, `TimedNotificationPublisher`, `NotificationDismissReceiver`.
  - `android:debuggable=true` (ya en AUD-SEG-001); sin `usesCleartextTraffic` ni `networkSecurityConfig`.
- Intents (`p07-intents.txt`): `am start -n …/.MainActivity -a VIEW` con `-d javascript:window.__b5i=1` + extra `<img onerror>`, con `https://evil.example/#/settings` y con `https://localhost/index.html?b5=1#settings` → «intent delivered to currently running top-most instance»; por CDP, `location.href` sigue `https://localhost/`, `window.__b5i` sin definir, misma pantalla. **Sin efecto.**
- `content query` a `content://com.shift.habla.fileprovider/…` y a `…localnotifications.fileprovider/…` desde `shell` → `SecurityException: … not exported`. **Correcto.**

## P-08 · Firma (`p08-firma.txt`)

`apksigner verify --print-certs apk/Habla-v5.8.apk` → `CN=Habla, O=Personal, C=ES` (no «Android Debug»). El APK es `assembleDebug` y `debuggable`, firmado con la clave de producción; el teléfono lo tiene instalado encima del histórico sin desinstalar (`firstInstallTime` 2026-09-28, B0). **AUD-SEG-504 confirmado.**

## P-10 / H-B5-1 · Puente nativo y clave en el árbol de React (CDP, solo recuentos)

`arnes/fibras.js` (salida en `h-b5-1-fibras-inicio.json`):

| Pantalla | Fibras | Componentes con `settings.geminiKey`/`apiKey` en props | Longitud de la clave |
|---|---|---|---|
| Bienvenida | 137 | 1 | 39 |
| Inicio | 275 | 3 (nombres minificados `Zd`, `mu`, `ql`) | 39 |

Plugins accesibles desde cualquier JS de la página: `App, AudioRoute, DeviceAuth, Orientation, TextToSpeech, SystemBars, LocalNotifications, Haptics, CapacitorCookies, WebView, Filesystem, Preferences, Share, CapacitorHttp`. Con CDP (APK debuggable) la clave es legible sin huella tanto desde React como desde `Preferences`: **H-B5-1 confirmada** (es la consecuencia de AUD-SEG-001; no se leyó el valor).

## P-11 · Campos de Azure en el teléfono (`p11-campos-azure-poco.json`)

Ajustes → Modelos → Acceso a Azure Monitor (abierto, sin cambiar nada): campos de clave Gemini y Azure con `value.length = 0` (correcto); Tenant, Client, Secret y Resource ID vacíos → en este teléfono **no hay service principal configurado**, así que AUD-SEG-500/AUD-FUG-401 no tiene exposición hoy aquí.

## P-05 · Gracia con la huella real

**No probada** en el teléfono por decisión del dueño (no se pide la huella). Lógica probada con mock: `p05-gracia-node.json` y `p03-p06-navegador.md`.

## P-09 · Copias en `Documents/Habla`

No repetido: ya confirmado por B4 (AUD-FUG-403).
