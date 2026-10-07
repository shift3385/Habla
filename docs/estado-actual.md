# Estado actual (2026-10-07, v5.9 build 36 en preparación)

> **v5.8.1 «Micrófono seguro» + v5.8.2 «Claves, datos y consumo»:** código hecho y probado en PC (tipos, lint, `npm test`), ya en `main` (commit `e5d9c1a` y el de cierre de la 5.8.2), **sin APK y sin probar en el teléfono**. Se entregarán juntas, con la 5.9, como 5.9 (build 36). Detalle de la 5.9 en `docs/correccion/NC-v5.9.md`. Seguimiento en `docs/correccion/ESTADO.md` y detalle en `docs/correccion/NC-v5.8.1.md` y `NC-v5.8.2.md`. Lo de abajo describe la v5.8 distribuida.

Último commit funcional: `16e6240` (el test se retoma donde quedó y el paso de Habla tiene scroll en horizontal). APK distribuido: `apk/Habla-v5.8.apk`, instalado en el POCO del dueño y repartido a sus amistades. En el Galaxy A11 de la madre hay una compilación de la 5.8 de unos minutos antes de ese commit: solo le faltan dos líneas de texto en Novedades, por lo demás es igual.

Hay una **auditoría QA completa de la v5.8** en `docs/auditoria/resultados/INFORME.md`, con veredicto **NO-GO para distribuir a desconocidos** (defectos del micrófono) y **GO condicional para el uso del dueño**. Es la referencia de lo que falta.

## ✅ Completo

**Base y fases de la hoja de ruta**
- Fase 1: ajustes, conversación por voz, exportar e importar.
- Fase 2: métricas de fluidez, nota 0–100, informe, tarea para mañana, temas con noticias reales (Google Search), racha, meta diaria y Progreso.
- Fase 3 (v4.7): cuaderno de errores con repaso espaciado FSRS y ejercicio oral evaluado.
- Fase 4 (v5.0): plan de 12 semanas, lección del día y recordatorio diario.
- Fase 5 (v5.0): re-test cada 4 semanas con comparación antes → después y plan que se adapta.

**Por versión**
- **Diseño** (v3.0 → 5.1): 4 temas con mascota animada, profes Emma (en-US) y Leo (en-GB), modo claro y oscuro.
- **Multiusuario básico** (v4.5): perfil obligatorio (nombre, ocupación, motivos, 3 temas), prompts personalizados, prácticas generales.
- **Consultas de palabras en contexto** (v4.2), con historial y guardadas.
- **Auriculares** (v5.3): selector de audio y micrófono Bluetooth real.
- **Tus 3 temas, Tema libre, Más temas y Debate con tema propio** (v5.4).
- **Avisos de la mascota antes del Inicio** (v5.5).
- **Test de nivel con banco offline** de 450 ítems y política 70/30 (v5.6); recalibración; borrador del test terminado y pantalla `EvalFail` (reintentar, otro modelo, otra clave); hoja global de problemas de Gemini.
- **v5.7 (16 NC + 2 dudas, ver `docs/NC-v5.7.md`):**
  - batería en segundo plano, clase guardada y retomable, confirmación al salir;
  - todas las correcciones por respuesta, respuestas por raíz de palabra, dictado del tema;
  - resúmenes por parte del test, duración del audio y diálogos por persona;
  - escalado en pantallas pequeñas y horizontal, sección «Mi nivel», fórmula como fracción, créditos;
  - clave fuera de las copias de Android.
- **Rebuilds de la v5.7 (`docs/NC-v5.7-ajustes.md`):** Ajustes rediseñado (resumen de nivel con la mascota, tarjetas con lo elegido, «Mi perfil y datos»), «Nuevo test disponible el…», mini resumen y resumen guardable de cada test, **huella/PIN para ver o cambiar claves**, **orientación forzada**.
- **v5.8:**
  - Fonética con Azure en paralelo a Gemini: notas, palabras y fonemas, coach, evaluación contra la transcripción de Gemini, cifras en palabras.
  - Ajustes → Modelos con el bloque de Azure: clave, región, plan, interruptor, consumo vía Azure Monitor y alerta de F0 agotado.
  - Límite de 60 s con cuenta atrás, ayuda flotante en las 4 notas de pronunciación y tarjeta del tema plegada con brillo.
  - Globos de la mascota en el Inicio (avisos y consejos, tiempos pausados, configurables).
  - Recordatorio con la mascota, alarma exacta y botón de prueba.
  - `InfiniteList` en Progreso (Errores, Palabras, Sesiones) y Palabras (Historial, Guardadas).
  - Tutorial de la mascota en la primera instalación y aviso «¿Para qué es tu clave?».
  - Logs de Capacitor desactivados.
  - Test de nivel retomable a medias y scroll del paso de Habla en horizontal.

## 🟡 Parcial o sin verificar del todo

- **Fonética con voz humana real:** se verificó con la llamada real a Azure desde el teléfono y con voz sintética A2 (Zira). Con voz sintética, algunas notas bajas («work», «park») pueden deberse a la propia voz. Falta una prueba larga del dueño con su voz.
- **Recordatorio diario:** el aviso de prueba (5 s) llegó con el teléfono bloqueado, según la auditoría. No se ha verificado el aviso diario real tras horas con la app cerrada ni tras reiniciar el teléfono. En Xiaomi o POCO hace falta activar el «Inicio automático» de Habla.
- **Auriculares Bluetooth:** no se probaron en la auditoría (no había auriculares conectados).
- **Test de nivel retomable:** probado con el progreso real de la madre (vista previa y A11). El guardado automático en gramática y resúmenes se vio funcionar en la vista previa, pero no se ha hecho un test completo de punta a punta tras el cambio.
- **Evaluación del habla del test con Gemini real:** probada en uso real por la madre y el dueño, pero no en un entorno de pruebas controlado.
- **Voz masculina de Leo:** depende de las voces instaladas en el teléfono; en el POCO del dueño Leo sonaba femenino (BACKLOG 4.3).
- **Consumo de Azure Monitor:** probado con respuestas simuladas; no consta una prueba con un service principal real.

## ⏳ Pendiente (por orden previsto)

1. **v5.8.1 «Micrófono seguro» (P0):** aprobada en PC (ver `docs/correccion/NC-v5.8.1.md`): recorder reentrante y cancelable, guarda del segundo dedo, dictado que se cancela al volver, red nativa en `onStop`, `fallback()` con 1 reintento y sin perder la cancelación de eco, primeros tests (`npm test`). Falta: prueba en el POCO (arneses B3/B8/ORQ).
2. **v5.8.2 «Claves, datos y consumo» (P1):** hecha en código (ver `docs/correccion/NC-v5.8.2.md`): APK *release* no depurable; Resource ID de Azure validado y huella al cambiarlo; copias validadas e `ErrorBoundary` en el arranque; clave de Gemini comprobada antes de guardarla; animaciones en reposo a ~12–19 dibujos/s (antes 60–120); textos; el plan no se relanza solo tras un error. Falta: revisión en PC de U5–U7, prueba en el POCO (sobre todo el release con R8 instalado encima de la 5.8), APK y que **el dueño borre los APK antiguos de `apk/`** (FUG-402).
3. **v5.9 «Transparencia y control» + notas del dueño:** hecha en código y probada en el navegador (ver `docs/correccion/NC-v5.9.md`):
   - micro «toca para hablar, toca para enviar», máx. 60 s, abierto solo mientras grabas (MIC-305);
   - pausa única en test y re-test; «Terminar» la clase a medias desde el Inicio;
   - repaso: tú eliges cuándo vuelve, «Ya me la sé» (archivar y recuperar), cuenta para la meta;
   - fonética de Azure en clase, repaso y test (informativa), con interruptor y aviso;
   - privacidad, recordatorios guiados, copia previa al importar, flujos FLU-200/207/219 y E2E-602.
   Falta: prueba en el POCO (R17–R24 de `REVISOR-MOVIL.md`) y APK.
4. **Backlog técnico:** CSP, `AbortController` en las peticiones, dividir el bundle de 1,3 MB, refactor de pantallas grandes (Calibration, Conversation, Settings), **ampliar los tests** (desde la 5.8.1 hay runner; hoy cubren Recorder, toques del micro, copias, clave, Azure Monitor y avisos de la mascota).
5. **Ideas aprobadas o a debatir sin implementar** (ver `BACKLOG.md`):
   - voz del profe más humana (TTS en la nube con emociones);
   - shadowing de pronunciación;
   - situaciones a medida;
   - dictado y comprensión;
   - otros idiomas;
   - idioma nativo distinto del español;
   - **multi-proveedor de IA** (Claude, OpenAI, DeepSeek): requiere separar el «oído» del «profe», ver `decisiones.md`;
   - acceso a la IA sin clave propia (backend o suscripción);
   - Play Store;
   - política de privacidad.
6. **v6.0:** abrir la app a otras personas (reservada).
