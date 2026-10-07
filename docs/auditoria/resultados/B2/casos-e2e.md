# B2 → B6 · Casos end-to-end

Commit `6874443` (v5.8 build 33). P1 = flujo principal o privacidad; P2 = rama de error importante; P3 = robustez/textos.
Reglas: llamadas reales solo dentro del cupo de B6 (6); el resto con mock de red (`entorno.md`). En el teléfono no borrar datos: los casos de «instalación limpia» se hacen en el navegador (Vite `habla-dev`, 360×780) con almacenamiento vacío.
En cada caso con micro, anotar el indicador verde / `dumpsys media.audio_policy` (B3).

| ID | Prio | Precondición | Pasos | Resultado esperado | Hallazgo |
|---|---|---|---|---|---|
| E2E-001 | P1 | Navegador, almacenamiento vacío; mock Gemini OK | Bienvenida → «Soy nuevo» → nombre, compañero, profesión, 3 favoritos → tutorial 6 pasos (clave mock) → test completo (mock) → Inicio | Inicio con nivel, plan creado; `lastSeenVersion=5.8`, `keysIntroSeen=true`; sin `NoticeGate` | — |
| E2E-002 | P1 | Igual que 001 | Leer todos los textos del tutorial y del aviso de claves | ¿Se informa de que el audio sale a Google/Microsoft? (hoy no) | AUD-FLU-210 |
| E2E-003 | P2 | Tutorial paso 3 | Clave inválida → «Comprobar»; luego sin red | Mensaje de error; «Continuar» deshabilitado; nada guardado | — |
| E2E-004 | P1 | Almacenamiento vacío; un `habla-backup-*.json` de prueba con perfil calibrado | «Ya tengo mi perfil» → elegir el archivo → tocar un tema → recargar la app | Hoy: Inicio sin clave, el tema manda a Ajustes; al recargar vuelve el tutorial | AUD-FLU-200 |
| E2E-005 | P3 | Almacenamiento vacío | Importar un JSON que no es copia / copia sin nombre | Mensaje claro; anotar si las tablas se sustituyeron antes del error | — |
| E2E-006 | P3 | Teléfono, tutorial (vía «Ver la bienvenida otra vez») | Pulsar atrás 1 vez en el tutorial → terminar → Inicio | Atrás debería retroceder; hoy aparece «¿Ya te vas?» al llegar | AUD-FLU-201 |
| E2E-007 | P2 | Usuario con `lastSeenVersion` antigua y `keysIntroSeen=false` (navegador) | Abrir la app | `NoticeGate`: Novedades → «¿Para qué es tu clave?» → Inicio; al reabrir no vuelven | — |
| E2E-008 | P2 | Re-test disponible | Abrir → «Más tarde» → cerrar y abrir | El aviso vuelve en cada arranque | — |
| E2E-009 | P3 | Racha ≥ 3, `mascotNudgeSeen=false` | Abrir → «Conocerlos» | Ajustes → Tema y mascota; no vuelve a salir | — |
| E2E-010 | P1 | Teléfono; red lenta (mock con retraso 20 s) | Inicio → tema → observar «Preparando la clase» 60 s; luego atrás de Android | Debe haber salida visible; micro no debería estar abierto; atrás vuelve al Inicio sin sesión vacía | AUD-FLU-213 |
| E2E-011 | P1 | Clase nueva (llamadas reales: 2 de B6) | 2 turnos hablados → «Terminar» | Informe; sesión cerrada; `habla.savedClass` vacío; micro cerrado al entrar en el informe | — |
| E2E-012 | P1 | Clase en reposo | Deslizar arriba (bloquear) → pulsar inicio de Android → volver → tocar enviar | Micro cerrado en segundo plano; al volver la UI no debería seguir «grabando» | AUD-FLU-214 |
| E2E-013 | P1 | Clase con 1 respuesta | Atrás → «Te espero aquí» → Inicio → «Continuar» → seguir; luego empezar otra clase → leer diálogo → «Empezar nueva» | Clase retomada con historial; la anterior aparece en Progreso (texto dice «se perderá») | AUD-FLU-206 |
| E2E-014 | P1 | Clase con 1 respuesta | Quitar la app de recientes / `am kill` en segundo plano → abrir | `NoticeGate` «¡Hola de nuevo!» → «Continuar mi clase» | — |
| E2E-015 | P1 | Clase; mock con retraso 8 s | Hablar → soltar → en «Pensando…» pulsar inicio; esperar 15 s con pantalla apagada | No debe sonar la voz del profe en segundo plano; micro cerrado | AUD-FLU-215 |
| E2E-016 | P2 | Clase; mock 503 en `generateContent` | Hablar → error «Reenviar mi audio» → atrás → Continuar | ¿Sigue el reenvío? (hoy no) | AUD-FLU-218 |
| E2E-017 | P2 | Fonética activa; mock Azure cuota agotada | Hablar un turno → en el aviso «Ver Ajustes → Modelos» | La clase debería guardarse con despedida; hoy desaparece | AUD-FLU-207 |
| E2E-018 | P2 | Clase en reposo | «¿Qué digo?» (mock) → tocar una idea; tocar una palabra del profe → consulta → atrás | Ideas leídas por TTS; la hoja se cierra con atrás sin salir de la clase | — |
| E2E-019 | P3 | Clase | Modo texto: escribir y enviar; girar el teléfono durante «Pensando…» | Turno «escrita»; girar no reinicia ni duplica la petición | — |
| E2E-020 | P1 | Primer test (navegador) con mock | Recorrer el test completo; en audición escuchar 3 veces (confirmar la 3.ª) y responder después | Nota cerrada tras la 3.ª; respuestas tardías «No sé»; resumen por parte | — |
| E2E-021 | P1 | Teléfono, re-test (o navegador primer test) | Tras gramática y lectura 1, matar la app → abrir | Hoy se pierde todo (re-test → Inicio) | AUD-FLU-203 |
| E2E-022 | P1 | Re-test disponible | Ajustes → revalidar → en la 1.ª explicación pulsar atrás y buscar salida | Debería poder salir; hoy no | AUD-FLU-202 |
| E2E-023 | P2 | Test, audio 1 | Escuchar → a mitad pulsar inicio → volver | No debe seguir sonando; anotar si la escucha contó | AUD-FLU-215 |
| E2E-024 | P2 | Re-test completo; mock 503 en la evaluación | «No pude evaluar» → cerrar → abrir → Ajustes → re-test | Hoy: Inicio normal y luego evaluación del borrador viejo | AUD-FLU-204 |
| E2E-025 | P2 | Test, tarea de habla | Grabar → inicio → volver → hablar 20 s → parar | UI «grabando» falsa; aviso «necesito oírte» | AUD-FLU-214 |
| E2E-026 | P2 | Test, tarea de habla, permiso de micro denegado (navegador) | Tocar grabar 1 vez | Mensaje de permiso + «Saltar esta pregunta» | — |
| E2E-027 | P2 | Re-test terminado con plan | Ver resultado → Inicio | Nivel = 70 % test + 30 % trayectoria; plan rehecho para semanas no empezadas | — |
| E2E-028 | P2 | Perfil con test anterior al banco calibrado (`needsRecalibration`) | Hacer el test | Explicación «Repitamos tu test»; el nivel sustituye sin ponderar | — |
| E2E-029 | P3 | 5 clases con nivel distinto | Ver «Mi nivel» | Las clases solo proponen trayectoria; el nivel no cambia hasta el re-test | — |
| E2E-030 | P2 | Test; mock 429 en la evaluación del habla | Reintentar con otro modelo en `GeminiFix` hasta OK → Inicio | No debería aparecer la hoja de problemas antigua | AUD-FLU-208 |
| E2E-031 | P2 | Repaso con ≥ 1 tarjeta; mock con retraso 8 s | Grabar → parar → en «comprobando» flecha atrás | No debe oírse la respuesta en el Inicio; micro cerrado | AUD-FLU-215 |
| E2E-032 | P2 | Debate | «Lo propongo yo» → dictar (mock) → editar → «Empezar el debate» | Texto dictado editable; clase de debate con tu tema | — |
| E2E-033 | P1 | Clave válida guardada | Ajustes → Gemini → pegar clave falsa → Guardar → patrón | Debería conservar la buena; hoy queda la mala | AUD-FLU-209 |
| E2E-034 | P1 | Clave guardada | Ojo → cancelar el diálogo; ojo → confirmar; antes de 60 s, ojo de Azure/secreto | Cancelar = oculta; anotar si Azure se muestra sin pedir patrón | H-B2-501 |
| E2E-035 | P2 | Ajustes → Mi perfil y datos | Exportar → cancelar Compartir; importar la misma copia | Archivo en Documentos/Habla; datos idénticos; clase guardada descartada | AUD-FLU-219 |
| E2E-036 | P3 | Sin plan; mock 503 en `createPlan` | Inicio → Palabras → Inicio ×3; abrir «Mi plan» durante «Preparando…» | Contar llamadas en Diagnóstico | AUD-FLU-216 |
| E2E-037 | P3 | Ajustes → Tema y mascota | Orientación Horizontal → cerrar y abrir; clase en horizontal | Se mantiene; carril de pestañas a la derecha | — |
| E2E-038 | P3 | Permiso de notificaciones concedido | Activar recordatorio → «probar aviso» | Aviso en 5 s; 7 alarmas programadas (`dumpsys alarm`) | AUD-FLU-217 |
| E2E-039 | P3 | Clase guardada | Importar una copia → abrir la app | No debe ofrecer continuar una clase cruzada | AUD-FLU-219 |
| E2E-040 | P1 | Modo avión | Turno de clase hablado; Repaso; consulta de Palabras | Mensaje «sin conexión» rápido (hoy ~60 s y «saturado») | AUD-FLU-212 |
| E2E-041 | P2 | Sin clave (navegador) | Inicio → tema; Inicio → «Continuar clase» / lección del plan | Explicación de que falta la clave (hoy: Ajustes portada / fallo en preparación) | AUD-FLU-200 |
