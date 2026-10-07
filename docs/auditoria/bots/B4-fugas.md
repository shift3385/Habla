# B4 · Fugas de información (CRÍTICO)

**Pregunta que debes responder con pruebas:** ¿Puede salir del control del usuario una clave, un secreto, audio, una transcripción o un dato personal por un camino no deseado?

Activos a proteger: clave de Gemini, clave y región de Azure, `azureClientSecret`/`azureTenantId`/`azureClientId` del *service principal*, audio de voz, transcripciones y correcciones (`turns`, `mistakes`), perfil (nombre, ocupación, motivos, nivel), consultas de palabras.

## Fase 1 — estático

1. **Almacenamiento de secretos.** `settings.ts` guarda todo en Capacitor Preferences → `shared_prefs/CapacitorStorage.xml` **en claro**. Evalúa: exclusión en `backup_rules.xml` y `data_extraction_rules.xml` (¿cubre todas las rutas y dominios?), `allowBackup="true"`, acceso con `run-as` en APK de depuración, rooteo. ¿Debería usarse el Keystore de Android / EncryptedSharedPreferences?
2. **Logs.** Todos los `console.*` (`grep`), `[HABLA-NET]`, `[HABLA-MIC]`, `Log.i("HablaAudio", …)`. ¿Algún log incluye cabeceras, cuerpos, prompts con datos personales, transcripciones o nombres de dispositivos? `loggingBehavior: 'none'` ¿cubre también los errores de plugins y el `WebChromeClient`?
3. **Netlog y caches en `localStorage`** (`gemini.ts` ~l.460–495, cuota, `azureUsage.ts` CACHE_KEY): qué campos guarda cada entrada (¿prompt del sistema?, ¿transcripción?, ¿clave?), cuánto dura, si se exporta en Diagnóstico o se comparte.
4. **Pantallas de diagnóstico y errores.** ¿Algún mensaje de error muestra la URL completa, la clave, la respuesta cruda? ¿Se puede copiar al portapapeles?
5. **Red.** Para cada destino (Gemini `generativelanguage.googleapis.com`, Azure STT `*.stt.speech.microsoft.com`, Azure STS `issueToken`, Azure AD `login.microsoftonline.com`, Azure Monitor `management.azure.com`, Google Search *grounding*): qué datos se envían, si la clave va en cabecera (no en URL), HTTPS siempre, si se envía más de lo necesario (perfil completo en el prompt del sistema, historial entero). `region` del usuario en el host: ¿se valida (inyección de host `evil.com#`)?
6. **Copias y compartir.** `backup.ts`: el JSON contiene transcripciones y perfil; se escribe en `Documents/Habla` (almacenamiento compartido, legible por otras apps con permiso de archivos) y en `Cache` para `Share`; ¿se borra la copia de la caché? `file_paths.xml` declara `external-path path="."` (todo el almacenamiento externo) en el FileProvider: comprueba qué URIs se pueden generar. Importación: ¿se valida el formato?
7. **APK y repositorio.** Busca secretos en `dist/`, en el APK (`apk/*.apk`: descomprimir y `grep` de `AIza`, `Ocp-Apim`, `client_secret`), en `git log -p` (todo el historial: `AIza[0-9A-Za-z_-]{35}`, `keystore.properties`, contraseñas de firma), en `docs/` y capturas de `docs/evidencia-*` (¿se ve alguna clave?). Comprueba que `keystore/` y `.env*` nunca se subieron.
8. **WebView.** `setWebContentsDebuggingEnabled` en release, contenido remoto cargado, `postMessage`, `window` globals con secretos (p. ej. ajustes en un estado global accesible).

## Fase 2 — dinámico

1. Navegador con red falsa: registra **todas** las peticiones de un recorrido completo (tutorial → clave → test → clase → palabras → informe) y compara con lo que el usuario espera enviar.
2. Teléfono (APK de depuración, con bloqueo): `adb logcat -d` completo durante una clase y al guardar claves; busca la clave (por sus 4 primeros caracteres que te dirá el dueño o detectando el patrón `AIza`), cabeceras `x-goog-api-key`, `Ocp-Apim`, transcripciones.
3. `adb shell run-as com.shift.habla ls -R` y `cat shared_prefs/CapacitorStorage.xml | ` resumen enmascarado (no copies valores). `adb backup` / `bmgr` para verificar que la exclusión funciona (sin restaurar nada).
4. Exportar una copia: revisa su contenido (campos, sin claves), dónde queda, y si queda en `cache/` tras compartir.
5. Diagnóstico: qué muestra y si lleva datos sensibles.

## Salida

- `resultados/B4/mapa-datos.md`: tabla destino → datos → cuándo → necesario sí/no → protección.
- `resultados/B4/hallazgos.md` (`AUD-FUG-*`). Recuerda: nunca copies un secreto, ni siquiera en la evidencia.
