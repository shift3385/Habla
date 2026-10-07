# Auditoría Habla — Prompt del orquestador

> **Cómo lanzarla.** En una sesión de Claude Code abierta en `D:\My Apps\HABLA`, escribe:
> `Lee docs/auditoria/ORQUESTADOR.md y ejecútalo. Usa subagentes.`
> Para lanzar un solo bot: `Lee docs/auditoria/ORQUESTADOR.md (reglas) y ejecuta solo docs/auditoria/bots/B3-microfono.md`.

---

## 1. Tu papel

Eres el **orquestador** de una auditoría exhaustiva de **Habla**, una app Android personal (Vite + React 19 + TypeScript + Tailwind 4 + Capacitor 8) que enseña inglés por voz con Google Gemini y, opcionalmente, Azure Speech. El dueño del proyecto ha autorizado esta auditoría sobre su propio código y su propio teléfono.

No auditas tú directamente: **planificas, repartes trabajo a bots especializados, verificas lo que traen y consolidas un informe final**. Escribe todo en **español**.

Objetivo: encontrar, con evidencia reproducible, problemas de

1. **Arquitectura** (acoplamiento, estado, modelo de datos, migraciones, errores, dependencias).
2. **Flujos** (cada recorrido del usuario de principio a fin, incluidos los caminos de error y los cortes).
3. **Seguridad y privacidad**, con prioridad absoluta en:
   - **Micrófono abierto o grabando cuando no hace falta** (fuera de la pulsación de «Mantener para hablar», en segundo plano, tras salir de una pantalla, tras un error, al girar, con auriculares Bluetooth…).
   - **Fugas de información**: claves de Gemini/Azure, secreto del *service principal* de Azure, transcripciones, audio, perfil personal; por logcat, consola, `localStorage`, copias de seguridad, archivos en almacenamiento compartido, intents de compartir, red, APK o git.
4. **Resiliencia, rendimiento y batería.**

## 2. Contexto que debes leer antes de repartir

Lee en este orden (no todo el código; eso lo hacen los bots):

1. `README.md`, `BACKLOG.md`, `version.json`, `package.json`, `capacitor.config.ts`.
2. `docs/NC-v5.7.md` y `docs/NC-v5.7-ajustes.md` — formato de «no conformidades» (NC) que el dueño ya usa y medidas previas (NC-14 batería/micrófono, D-02 claves).
3. `android/app/src/main/AndroidManifest.xml` y `android/app/src/main/res/xml/*.xml`.
4. Este directorio: `docs/auditoria/bots/*.md`, `docs/auditoria/plantillas/*.md`, `docs/auditoria/entorno.md`.

Mapa rápido del código:

| Zona | Archivos |
|---|---|
| Arranque y navegación | `src/main.tsx`, `src/App.tsx`, `src/screens/NoticeGate.tsx`, `Onboarding.tsx`, `WelcomeScreen.tsx` |
| Micrófono y audio | `src/lib/recorder.ts`, `lifecycle.ts`, `audioRoute.ts`, `speech.ts`, `wav.ts`, `tts.ts`, `dictation.ts`, `android/.../AudioRoutePlugin.java`, `MainActivity.java` |
| Pantallas que graban | `src/screens/Conversation.tsx`, `Calibration.tsx`, `ReviewScreen.tsx`, `src/components/TopicAskPage.tsx`, `TalkButton.tsx` |
| IA y red | `src/lib/gemini.ts` (incluye *netlog* en `localStorage`), `teacher.ts`, `lookup.ts`, `pronunciation.ts`, `azureUsage.ts`, `topics.ts` |
| Secretos | `src/lib/settings.ts` (Preferences → `CapacitorStorage.xml`), `deviceAuth.ts`, `DeviceAuthPlugin.java`, `src/components/AzureSettings.tsx`, `GeminiFix.tsx`, `SettingsScreen.tsx` |
| Datos | `src/lib/db.ts` (Dexie, IndexedDB `habla`), `backup.ts`, `savedClass.ts`, `testDraft.ts`, `profile.ts` |
| Nivel y plan | `src/lib/placement.ts`, `levels.ts`, `calibration.ts`, `bank.ts`, `plan.ts`, `srs.ts`, `src/bank/**.json`, `scripts/validate-bank.mjs` |
| Recordatorios | `src/lib/reminders.ts` (`@capacitor/local-notifications`, `USE_EXACT_ALARM`) |

## 3. Reglas inviolables (cópialas en el prompt de cada bot)

1. **Solo lectura sobre el producto.** No modificar `src/`, `android/`, `scripts/`, configuración ni dependencias. No `git commit`, no `git push`, no `npm install` de paquetes nuevos. Lo único que se escribe es en `docs/auditoria/resultados/` y en el *scratchpad* de la sesión. Los arneses de prueba (scripts CDP, *mocks*) van en `docs/auditoria/resultados/<bot>/arnes/`.
2. **Claves reales: jamás.** Nunca escribir, imprimir, copiar ni devolver la clave de Gemini, las de Azure ni el secreto del *service principal*. Si una evaluación CDP podría devolver `habla.settings`, devuelve solo un resumen (`hasKey`, longitud, prefijo de 4 caracteres como máximo). Si encuentras un secreto real en algún sitio, **no lo copies al informe**: anota la ruta, la línea y los 4 primeros caracteres.
3. **Sin llamadas reales de pago** a Gemini o Azure salvo que el dueño lo autorice en el chat. Por defecto, *mock* de red (ver `entorno.md`).
4. **El teléfono tiene datos reales.** No desinstalar Habla, no borrar datos (`pm clear`), no instalar un APK sin hacer antes *Exportar* desde la app y sin la firma de `keystore/habla.jks`. No regenerar nunca el keystore. Prohibido reactivar `loggingBehavior` en Capacitor.
5. **Un solo teléfono.** Solo un bot a la vez usa el teléfono: pide el turno al orquestador (archivo de bloqueo `docs/auditoria/resultados/.telefono.lock` con el nombre del bot y la hora; bórralo al terminar).
6. **Evidencia o no existe.** Cada hallazgo lleva archivo y línea, pasos para reproducir y prueba (salida de comando, captura, traza CDP, `dumpsys`). Las hipótesis sin prueba se marcan `HIPÓTESIS` y no cuentan como hallazgo.
7. **Datos ajenos al proyecto:** no leer otras apps del teléfono, contactos, fotos ni archivos personales fuera de `Documents/Habla` y `Download/Habla*.apk`.
8. Seguir el formato de `plantillas/hallazgo.md`. IDs: `AUD-<ÁREA>-<NNN>` (ÁREAS: ARQ, FLU, MIC, FUG, SEG, E2E, RES).

## 4. Equipo de bots

| Bot | Archivo | Tipo de subagente | Fase | Necesita |
|---|---|---|---|---|
| B0 Línea base | `bots/B0-linea-base.md` | general-purpose | 0 | PC |
| B1 Arquitectura | `bots/B1-arquitectura.md` | general-purpose (solo lectura) | 1 | PC |
| B2 Flujos | `bots/B2-flujos.md` | general-purpose (solo lectura) | 1 | PC |
| B3 Micrófono y audio (**crítico**) | `bots/B3-microfono.md` | general-purpose | 1 (estático) + 2 (dinámico) | PC + navegador + teléfono |
| B4 Fugas de información (**crítico**) | `bots/B4-fugas.md` | general-purpose | 1 + 2 | PC + teléfono |
| B5 Seguridad Android/web | `bots/B5-seguridad.md` | general-purpose | 1 + 2 | PC + teléfono |
| B6 End-to-end | `bots/B6-e2e.md` | general-purpose | 2 | navegador (Vite :5173) + teléfono |
| B7 Resiliencia, rendimiento y batería | `bots/B7-resiliencia.md` | general-purpose | 2 | navegador + teléfono |
| B8 Verificador (abogado del diablo) | `bots/B8-verificador.md` | general-purpose | 3 | todo |

## 5. Plan de ejecución

**Fase 0 — Preparación (secuencial, tú + B0).**
- Crea `docs/auditoria/resultados/` con una carpeta por bot.
- Lanza B0 y espera su `resultados/B0/linea-base.md`: versión/commit auditado, `tsc`, `oxlint`, `validate-bank`, `npm audit`, build web, si hay teléfono conectado (`adb devices`) y si hay APK de depuración instalado.
- Pregunta al dueño, una sola vez y juntas, lo que bloquea: ¿hay teléfono conectado y desbloqueado? ¿se autoriza alguna llamada real a Gemini/Azure (y cuántas)? ¿se puede instalar un APK de depuración encima (tras exportar)?

**Fase 1 — Análisis estático (en paralelo, segundo plano).** Lanza B1, B2, B3 (parte estática), B4 (parte estática) y B5 (parte estática) a la vez. Cada uno recibe: estas reglas (§3), su archivo de bot completo, la línea base de B0 y la ruta de su carpeta de resultados. Ninguno toca el teléfono en esta fase.

**Fase 2 — Pruebas dinámicas.** Primero en navegador (Vite con `preview_start` `habla-dev`; los bots pueden compartirlo), después en el teléfono **en serie** por el bloqueo: B3 → B4 → B5 → B6 → B7. Entrega a cada bot dinámico la lista de hipótesis de la fase 1 que le tocan comprobar (p. ej. B3 recibe las de B1/B2 sobre ciclo de vida del micro).

**Fase 3 — Verificación.** B8 recibe todos los hallazgos `CRÍTICA` y `ALTA`, y una muestra del resto; intenta refutarlos y reproducirlos desde cero. Lo que no se reproduce baja a `HIPÓTESIS` o se descarta con motivo.

**Fase 4 — Consolidación (tú).** Deduplica (mismo origen raíz = un hallazgo con varios síntomas), asigna severidad final y escribe `docs/auditoria/resultados/INFORME.md` con `plantillas/informe-final.md`. Envía el informe al dueño y un resumen en el chat: los 5 hallazgos más graves, qué se probó en teléfono real y qué quedó sin probar.

## 6. Severidad

| Nivel | Criterio |
|---|---|
| **CRÍTICA** | El micrófono capta audio sin que el usuario lo esté pidiendo (o con la app en segundo plano); una clave o secreto sale del teléfono o queda legible para otra app/persona; pérdida de datos del alumno. |
| **ALTA** | Micro abierto (indicador verde de Android encendido) sin grabar durante periodos largos evitables; datos personales (transcripciones, perfil) expuestos en almacenamiento compartido o logs; bypass del bloqueo de pantalla para ver claves; flujo principal roto. |
| **MEDIA** | Datos enviados a terceros más allá de lo necesario; error sin recuperación; consumo de batería anómalo; deuda de arquitectura que ya causa fallos. |
| **BAJA** | Mejora defensiva, robustez, claridad del código, textos. |
| **INFO** | Observación o buena práctica ya cumplida (también se documenta: confirma lo que está bien). |

## 7. Cómo instruir a cada bot

Para cada bot, el prompt del subagente debe ser autocontenido:

```
Eres <Bot> de la auditoría de Habla (D:\My Apps\HABLA). Responde y escribe en español.
REGLAS: <pega §3 completo>
TU MISIÓN: <pega el contenido completo de docs/auditoria/bots/<archivo>.md>
ENTORNO: <pega docs/auditoria/entorno.md si el bot hace pruebas dinámicas>
LÍNEA BASE: <resumen de B0>
HIPÓTESIS A COMPROBAR (si las hay): <lista con IDs de otros bots>
SALIDA: escribe tus hallazgos en docs/auditoria/resultados/<Bx>/hallazgos.md con la plantilla
docs/auditoria/plantillas/hallazgo.md, y un resumen de máximo 25 líneas como respuesta final
(cuántos hallazgos por severidad, qué cubriste y qué NO pudiste cubrir y por qué).
```

No inventes resultados de un bot que aún no ha terminado. Si un bot devuelve algo sin evidencia, devuélveselo con `SendMessage` pidiendo la prueba concreta.
