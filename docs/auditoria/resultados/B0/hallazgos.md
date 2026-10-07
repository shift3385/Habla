# Hallazgos de B0 (línea base)

### AUD-SEG-001 · El APK que se instala es de depuración (debuggable) y guarda las tres credenciales en claro

- **Severidad:** ALTA
- **Estado:** CONFIRMADO (flag debuggable en el APK y en el teléfono); la extracción de la clave **no se ejecutó a propósito** (regla 2)
- **Probado en:** estático + POCO Android 16 (APK v5.8 build 33)
- **Dónde:** `package.json:11` (`"apk": … gradlew.bat assembleDebug`), `android/app/build.gradle:37-39,53` (solo la variante `debug` se copia a `apk/`), `README.md:232-234`; secretos en `src/lib/settings.ts:11,38,47` (`geminiKey`, `azureKey`, `azureClientSecret`) guardados con `Preferences.set` en `src/lib/settings.ts:109` (→ `shared_prefs/CapacitorStorage.xml`).
- **Qué pasa:** el único APK que se genera y distribuye (`apk/Habla-v5.8.apk`) es `assembleDebug`: `android:debuggable=true`. Las claves de Gemini, Azure Speech y el secreto del service principal se guardan como JSON en claro en las preferencias de la app.
- **Por qué importa:** en un APK debuggable cualquiera con acceso USB y depuración activada (o una app de escritorio maliciosa en un PC al que se conecte) puede ejecutar `run-as com.shift.habla` y leer `CapacitorStorage.xml` e IndexedDB sin root, saltándose la confirmación con huella (`DeviceAuthPlugin`) que solo protege la interfaz. También expone el WebView a Chrome DevTools (CDP) para inyectar JavaScript. Las exclusiones de copia de seguridad (`backup_rules.xml`, `data_extraction_rules.xml`) no protegen de esto.
- **Cómo reproducir:**
  1. `aapt2 dump badging apk/Habla-v5.8.apk` → línea `application-debuggable`.
  2. `adb shell dumpsys package com.shift.habla` → `pkgFlags=[ DEBUGGABLE … ALLOW_BACKUP ]`.
  3. (No ejecutado) `adb shell run-as com.shift.habla ls shared_prefs` permitiría leer el archivo con las claves.
- **Esperado:** el APK para uso diario es `release` (no debuggable) firmado con el keystore del proyecto; secretos cifrados (Android Keystore / EncryptedSharedPreferences) o al menos no legibles vía `run-as`.
- **Obtenido:** `application-debuggable`; `DEBUGGABLE` en el teléfono; secretos en texto plano.
- **Evidencia:** `resultados/B0/dumpsys-package.txt:89,107`; `linea-base.md` §1 (badging); `src/lib/settings.ts:109`.
- **Causa raíz (si se conoce):** el script `npm run apk` y el bloque `applicationVariants` solo producen/copian la variante debug; la variante release existe en `build.gradle:40-44` pero no se usa.
- **Propuesta de corrección:** publicar `assembleRelease` (misma firma `habla`, así se puede actualizar encima sin perder datos) y mantener la debug solo para pruebas; valorar cifrar los secretos con Android Keystore. No se aplica en esta auditoría.
- **Relacionado con:** D-02 (exclusión de la clave en copias), comentario de `capacitor.config.ts:7` (los logs ya se desactivaron por el mismo motivo).

### AUD-SEG-002 · npm audit: 3 vulnerabilidades moderadas solo en herramientas de desarrollo

- **Severidad:** INFO
- **Estado:** CONFIRMADO
- **Probado en:** estático
- **Dónde:** `node_modules/uuid` (<11.1.1) ← `xcode` ← `@capacitor/cli` 8.5.2 (`package.json`, devDependencies)
- **Qué pasa:** `npm audit` informa GHSA-w5hq-g745-h8pq (uuid, falta de comprobación de límites con `buf` en v3/v5/v6). `npm audit --omit=dev` da 0.
- **Por qué importa:** ninguno para el usuario: la ruta solo se usa al generar proyectos iOS desde la CLI; `uuid` no aparece en `dist/assets/*.js` ni se importa en `src/`. La «solución» de npm (`audit fix --force`) bajaría `@capacitor/cli` a 8.4.3 (cambio rompedor).
- **Cómo reproducir:** `npm audit` y `npm audit --omit=dev` en la raíz.
- **Esperado / Obtenido:** 0 en producción / 0 en producción, 3 moderadas en dev.
- **Evidencia:** `resultados/B0/npm-audit-all.txt`, `npm-audit-all.json`, `npm-audit-prod.txt`.
- **Propuesta de corrección:** esperar a una versión de `@capacitor/cli` que actualice `xcode`; no forzar.
- **Relacionado con:** —

### AUD-ARQ-001 · oxlint: 6 avisos de hooks/pureza de React (0 errores)

- **Severidad:** BAJA
- **Estado:** CONFIRMADO (los avisos); su efecto en ejecución es HIPÓTESIS
- **Probado en:** estático
- **Dónde:** `src/screens/Conversation.tsx:217` (useCallback sin `startPronunciation`, `persist`); `src/components/PhoneticsAlert.tsx:8` y `src/screens/SettingsScreen.tsx:141` (`Date`/`Date.now` en render); `src/screens/Calibration.tsx:311` (×2, `runEval` antes de su declaración y fuera de deps) y `:317` (ref en limpieza).
- **Qué pasa:** dependencias de hooks incompletas y llamadas impuras durante el render.
- **Por qué importa:** el de `Conversation.tsx:217` es el único con riesgo real: un `useCallback` con cierres antiguos de `startPronunciation`/`persist` podría usar ajustes o estado de un render anterior (p. ej. tras cambiar la clave de Azure). Los de `Calibration.tsx` parecen falsos positivos (`runEval` se invoca dentro de un `.then`, y la ref ya se copia a `rec` en `:314`).
- **Cómo reproducir:** `npx oxlint` en la raíz.
- **Esperado:** 0 avisos. **Obtenido:** 6 avisos.
- **Evidencia:** `resultados/B0/oxlint.txt`.
- **Propuesta de corrección:** revisar `Conversation.tsx:217` (B2/B3); silenciar con comentario justificado los falsos positivos.
- **Relacionado con:** —

### AUD-ARQ-002 · Toda la app y el banco de 450 ítems van en un único chunk de 1,29 MB

- **Severidad:** BAJA
- **Estado:** CONFIRMADO
- **Probado en:** estático (`npm run build`)
- **Dónde:** `src/lib/bank.ts:105` (`import.meta.glob('../bank/**/*.json', { eager: true })`); ningún `import()` dinámico en `src/`.
- **Qué pasa:** Vite avisa «Some chunks are larger than 500 kB»: `dist/assets/index-*.js` = 1 288,73 kB (gzip 396,83 kB). Los 588 KB de JSON del banco se parsean al arrancar aunque solo se usan en el test de nivel.
- **Por qué importa:** tiempo de arranque y memoria en el WebView del teléfono (todo se evalúa en el primer render). No hay coste de red (los assets van dentro del APK).
- **Cómo reproducir:** `npm run build` → ver aviso y tamaños en `resultados/B0/build.txt`.
- **Esperado:** chunk principal < 500 kB; banco cargado bajo demanda. **Obtenido:** 1,29 MB en un chunk.
- **Evidencia:** `resultados/B0/build.txt`.
- **Propuesta de corrección:** `eager: false` para el banco y `React.lazy` en pantallas grandes (Calibración, Ajustes). Medir antes/después el arranque en el POCO.
- **Relacionado con:** B6 (rendimiento) si aplica.
