# B6 · Navegador (vista previa `habla-dev`, 360×780) · onboarding, test de nivel, importar desde la bienvenida

Arnés: `../arnes/b6nav.js` (micro falso + red falsa con reglas) y `../arnes/backup-prueba.js` (copia ficticia).
Fecha: 2026-10-05 21:50–22:15 (hora local).

## Incidencia de entorno (importante para leer los resultados)

- A las 21:49 alguien modificó **sin commit** `src/screens/Calibration.tsx` y `src/lib/testDraft.ts` (nuevo `TestProgress`/`saveProgress`: guardar el test a medias) y a las 22:02 recompiló (`android/app/src/main/assets/public/index.html`, `apk/Habla-v5.8.apk` 22:02:39). Vite (`preview_logs`): `hmr update /src/index.css, /src/screens/Calibration.tsx` y `page reload android/app/src/main/assets/public/index.html`.
- Otra sesión estaba usando el **mismo origen** `http://localhost:5173` (mismo almacenamiento del navegador del panel): durante mi test aparecieron datos que no escribí (progreso del test en «Habla · tarea 2» con audio webm; perfil con `about: "Jubilado/a"` e intereses `news/food/sports`, cuando yo elegí «Tecnología» y Viajes/Comida/Deportes, ver captura del selector 3/3).
- Desde las 22:08 trabajé en el origen aislado `http://b6.localhost:5173` (almacenamiento propio). El APK del POCO **no** cambió (`lastUpdateTime=2026-10-05 18:33:29`, build 33).
- Consecuencia: lo probado en el navegador sobre el test de nivel corre el código del ÁRBOL DE TRABAJO, no el del commit auditado `6874443`.

## E2E-001 (P1) · Primera instalación completa (origen localhost, red falsa)

Bienvenida → «Soy nuevo» → nombre → compañero (Gota) → ocupación → 3 favoritos → tutorial (Así funciona → clave → Azure → profe → meta) → test → Inicio.
- Clave ficticia `AIza…` (36) comprobada contra `models?pageSize=1000` falso → «Clave válida ✓».
- Ajustes guardados SOLO al validar la clave (antes `localStorage` vacío).
- Final: Inicio con «LECCIÓN DE HOY · SEMANA 1 DE 12», `onboarded=true`, `lastSeenVersion=5.8`, `keysIntroSeen=true`, sin `NoticeGate`; `habla-draft` vacío (`getAllKeys()` = []). **OK**.
- Micro durante el test: 1 apertura (`gUM` #0) que dura las 3 tareas de habla y se cierra al terminar (coincide con AUD-MIC-305).

## E2E-002 (P1) · Textos del tutorial (privacidad)

Literal relevante:
- «Habla se conecta a una IA de Google: Gemini. Hablas en inglés como en un audio de WhatsApp. Gemini entiende lo que dijiste…» 
- «Tu progreso, tus errores y tus palabras se guardan **solo en este teléfono**.»
- Clave: «se guarda solo en este teléfono, **protegida con tu patrón, PIN o huella**».
- Azure: «puedo usar Azure Speech de Microsoft, con su propia clave… Su clave también se guarda solo aquí».
Ninguna pantalla dice que **la grabación de voz** se envía a Google (ni a Microsoft si se activa Azure), ni que el perfil (nombre, ocupación, intereses) y el historial de la clase viajan en cada turno. → confirma AUD-FLU-210 (y el texto de AUD-FLU-211).

## E2E-003 (P2) · Clave inválida / sin red en el tutorial

- 400 `API_KEY_INVALID` → «La clave de Gemini no es válida. **Revísala en Ajustes.**» (en el tutorial no hay Ajustes: texto fuera de contexto); «Comprueba tu clave para seguir» deshabilitado; `localStorage` vacío. 
- `TypeError: Failed to fetch` → «Sin conexión con Gemini. Revisa tu internet.» en 0,5 s; deshabilitado; nada guardado. **OK** (con la nota del texto).

## E2E-020 (P1) · Audición: 3 escuchas y respuesta tardía

- 1.ª/2.ª escucha → «Te queda 1 escucha con nota». Al pulsar la 3.ª: aviso «Última escucha con nota. Al terminar, las preguntas sin responder contarán como «No sé»…» y hay que pulsar otra vez (confirmación).
- Tras la 3.ª: «Nota cerrada · puedes seguir escuchando para practicar». Respondí la pregunta 4 después → revisión: «No sé · la respondiste después de cerrar la nota». Pregunta 1 (respondida antes) cuenta. **OK**.

## E2E-021 (P1) · Matar la app a mitad del primer test (AUD-FLU-203)

- Con el código del árbol de trabajo (cambio sin commit de las 21:49): tras gramática (17) y lectura 1, `habla-draft/kv/progress` = `{k:"review",kind:"reading",n:0}`; recargar → «Welcome back» → «Continuar donde lo dejé» → vuelve exactamente a la revisión de la lectura 1 («Seguimos donde lo dejaste»). Se pierde solo el bloque en curso (lectura/audición no guardan a mitad de texto).
- En el commit auditado `6874443` NO existe `saveProgress` (`git diff` muestra que todo es nuevo): allí el hallazgo AUD-FLU-203 sigue en pie por lectura. → ver AUD-E2E-600.

## E2E-004 (P1) · «Ya tengo mi perfil» (importar desde la bienvenida) · AUD-FLU-200

Origen `b6.localhost`, almacenamiento vacío, copia ficticia (perfil calibrado «Copia B6», 1 sesión abierta, 2 turnos, 1 consulta, 1 tarjeta).
1. Importar → `localStorage` sigue VACÍO (el `onboarded=true` solo está en memoria) → aparece `NoticeGate`: «Novedades de la v5.8» → «¿Para qué es tu clave? **Cuando empezaste te pedí una clave de Gemini**…» (este usuario nunca la puso).
2. Al pasar el aviso, `update()` guarda los ajustes enteros y con ellos `onboarded=true` (por casualidad): `hasKey=false`, `keysIntroSeen=true`, `lastSeenVersion=5.8`.
3. Inicio: «Antes de empezar, pega tu clave de Gemini en Ajustes.»; no se muestra la tarjeta del plan importado. Tocar «Comida» → Ajustes (portada, no Modelos). 0 peticiones.
4. Recargar tras el paso 2 → «Welcome back, Copia» (no vuelve el tutorial).
5. **Variante:** importar y recargar ANTES de pasar el aviso → `localStorage` vacío, IndexedDB con el perfil «Copia B6» calibrado y 2 turnos, pero la app muestra «WELCOME TO Habla · Soy nuevo / Ya tengo mi perfil»: trata como nuevo a un usuario con datos. → AUD-FLU-200 CONFIRMADO en esta variante.
