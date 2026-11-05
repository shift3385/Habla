# 5.13 · Plan: «Retos en familia» — reto semanal (P-14), tarjeta de la semana (P-17) y códigos para compartir («Juntos» sin servidor)

**Fecha:** 2026-11-05 · **Decisión del dueño:** aprobada la propuesta «Retos en familia» con un presupuesto de unos 58 USD.
Fuentes: `docs/v5.12/BACKLOG-resumen.md` §1 (P-14, P-17) y §2 («Juntos», forma 1: **sin servidor**), `BACKLOG.md` §5.1 y
`docs/pruebas/regresion-5.10/A5-usabilidad.md` §P-14 y §P-17. Siguen **aparcados**: pruebas en el teléfono
(`docs/pruebas/PENDIENTES.md`), «Juntos» con servidor o en tiempo real (6.0), teléfonos cerca por Wi-Fi/Bluetooth, roleplay en
pareja, notas de voz entre dos, P-13, P-15 y P-16.

> **Para empezar en la sesión nueva:** «Lee `docs/v5.13/PLAN.md` y `CLAUDE.md` y desarrolla la 5.13 por fases; apunta el avance
> en la tabla de este archivo y haz commit y push al terminar cada fase.»
> Base de código: la rama `claude/eloquent-newton-2cniyr` (5.12 build 44, lo más reciente; `main` sigue en la 5.9.1).
> Trabaja en la rama que indique la sesión, partiendo de esa.

## Decisiones del dueño
- **Sin servidor ni cuentas:** lo que se comparte viaja como **imagen** (tarjeta) o como **código de texto** que se manda por
  WhatsApp con `@capacitor/share` (ya instalado) y se **pega** en la otra app. Ni archivos que se abran con Habla ni enlaces
  (obligarían a tocar el `AndroidManifest` y el código nativo).
- **Cada persona usa su clave:** importar un código no llama a la IA.
- **Presupuesto ajustado (~58 USD):** ver «Reglas para gastar poco» al final.
- Política de niveles intacta (CLAUDE.md regla 6): nada de esto cambia el nivel.
- Para retarse, **las dos personas necesitan la 5.13** (la madre y las amistades siguen en la 5.8).

## Fases (en este orden; una fase = un commit con su test)
| Fase | Qué | Estado |
|---|---|---|
| 1 | **P-14 reto semanal** sacado de tus errores, con barra de progreso medida en el teléfono | ✅ hecha (2026-11-05): `src/lib/challenge.ts` (4 tipos cerrados, cifra recortada a su rango, progreso puro medido en el teléfono, respaldo local sin IA, una llamada al modelo rápido por semana con `frequentStructures()`, semanas pasadas cerradas con su resultado), tabla Dexie `challenges` (`db.version(7)`, solo aditiva; migración v6→v7 con datos comprobada en el navegador), copia versión 5 solo con retos (`NEW_IN_513`); globo de la mascota «Reto de la semana: 3 de 4 respuestas» que abre el detalle; tarjeta y detalle con historial en Progreso; «¡Reto cumplido!» después de los logros (`HomeGates`), una sola vez. Test `tests/p14-challenge.test.mjs`; navegador `docs/v5.13/evidencia/arnes-p14.mjs` (capturas en `evidencia/P14/`) |
| 2 | **P-17 tarjeta de la semana** (imagen para WhatsApp) | ✅ hecha (2026-11-05): `src/lib/weekCard.ts` (puro: decide qué entra — nombre, minutos, racha, días, reto y último logro — y nada de nivel, errores, memoria ni claves; texto que acompaña y nombre del archivo), `src/lib/weekCardImage.ts` (canvas 1080×1350 con la mascota del tema copiada a `public/mascots/`, sin manchas en modo ligero; Compartir como archivo con `@capacitor/share` y limpieza de la caché, `SHARE_CACHE_FILE` ampliado a `habla-semana-*.png`), vista previa `WeekCardSheet` (vertical, 320×640 y horizontal) desde «Compartir mi semana» en Progreso. Test `tests/p17-weekcard.test.mjs`; navegador `evidencia/arnes-p17.mjs` (tamaño de la imagen y todos los textos pintados en el canvas, sin datos sensibles; capturas en `evidencia/P17/`) |
| 3 | **Códigos para compartir:** reto entre dos y palabras compartidas | ✅ hecha (2026-11-05): `src/lib/shareCode.ts` (puro: `HABLA:1:<base64url(JSON)>`, tipos `challenge`/`progress`/`word`, tope de 2 KB, validación estricta — versión, tipo, solo campos conocidos, `__proto__` sin efecto, textos en una línea sin marcas ni caracteres invisibles, cifras en rango —, mensajes para WhatsApp), `src/lib/shareApply.ts` (vista previa de qué va a pasar y aplicar: reto → «Reto con Ana» de tu semana medido con tus datos; progreso → comparación solo si es el mismo reto y la misma semana; palabra → Palabras «compartida por Ana» + Repaso, sin duplicar), `src/lib/shareText.ts`; «Retar a alguien» y «Mandar mi progreso» en el detalle del reto, «Compartir» en una palabra guardada, hoja «Pegar un código» con la mascota en Progreso; con reto compartido, el texto de la tarjeta de la semana lleva tu código de progreso. Arreglado de paso: `ensureWeekChallenge` devolvía el reto antiguo tras cambiarlo. Test `tests/codes-513.test.mjs`; navegador con dos teléfonos `evidencia/arnes-codes.mjs` (capturas en `evidencia/CODES/`) |
| 4 | Entrega 5.13 (build 45): `version.json`, Novedades en `changelog.ts`, README/CLAUDE.md, capturas | ✅ hecha (2026-11-05): `version.json` 5.13 / build 45, entrada 5.13 en `RELEASES`, README (reto de la semana, Compartir mi semana, retos en familia y palabras compartidas, copias), CLAUDE.md (versión, esquema v7, estructura y siguiente trabajo), `docs/pruebas/PENDIENTES.md` (WhatsApp de verdad entre dos teléfonos con la 5.13); capturas de Novedades en `evidencia/entrega/` (`arnes-entrega.mjs`) y regresión de los arneses de la 5.13 y la 5.12 con la versión nueva. `npx tsc -b`, lint (0 errores), `npm test` (402, 0 fallos), validadores y `npm run build` en verde. **Sin APK** (se compila en el PC del dueño) |
| 5 | **Mensaje en inglés revisado por tu profe** (sirve con cualquiera, aunque no tenga Habla) | ✅ hecha (2026-11-05): `src/lib/messageReview.ts` (una llamada al modelo rápido; mensaje delimitado y con tope de 600; corregido con tus palabras, versión más natural solo si es distinta, hasta 3 notas; en español → al inglés), hoja `MessageSheet` con dictado (el micro se suelta al cerrar o en segundo plano) desde «Escribir en inglés» en Progreso; se manda por WhatsApp con lo que escribiste tú si quieres; nada se guarda. Test `tests/message-513.test.mjs`; navegador `evidencia/arnes-mensaje.mjs` (capturas en `evidencia/MENSAJE/`) |
| 6 | **Aviso del reto a mitad de semana** (notificación local) | pendiente |
| 7 | **Tablero «Mi familia»** (código `week` con minutos, racha y reto de cada uno) | pendiente |
| 8 | **Practicar lo mismo** (una Situación compartida y comparar la nota) | pendiente |
| 9 | Entrega ampliada: Novedades, README, CLAUDE.md, pendientes del teléfono | pendiente |

### Fase 1 · P-14 Reto semanal
- **Qué ve el alumno:** cada semana (lunes–domingo, `weekKey` de `src/lib/stats.ts`) un reto con título y meta en español
  («Esta semana: 8 respuestas largas sin fallar el pasado») y una barra «4 de 8». Al cumplirlo, «¡Reto cumplido!» con la mascota
  (patrón `MascotPage`, como los logros de `MilestoneGate`) y queda en Progreso.
- **Se mide en el teléfono, sin IA.** Tipos cerrados (la IA solo elige tipo, objetivo y cifra; la app recorta la cifra a un
  rango razonable):
  - `minutes`: minutos hablando en la semana (`weekMinutes`).
  - `classes`: clases terminadas con ≥ 3 respuestas (opcional: de una práctica concreta, p. ej. `mission` o `story`).
  - `clean`: respuestas habladas de ≥ 10 palabras **sin errores de una categoría** (`MistakeCategory` de `db.ts`; las
    correcciones del turno están en `turnCorrections`).
  - `review`: frases repasadas en el Repaso (tarjetas con `fsrs.last_review` en la semana).
- **Generación:** una llamada al **modelo rápido** la primera vez que se abre el Inicio en la semana, con
  `frequentStructures()` (hoy privada en `src/lib/plan.ts`: exportarla) y el nivel. Esquema JSON (`title_es`, `goal_es`, `kind`,
  `target`, `category`). Si falla o no hay clave: **reto de respaldo local** (el tipo `clean` con tu categoría de error más
  frecuente, o `minutes` con tu meta diaria × 5 si aún no tienes errores).
- **Dónde se ve (sin scroll en el Inicio):** un globo nuevo de la mascota (`mascotTips.ts`: «Reto de la semana: 4 de 8», acción
  que abre el detalle) y una tarjeta en **Progreso** con la barra y el historial de retos.
- **Datos:** nueva tabla Dexie `challenges` (clave = `weekKey`), `db.version(7)` **solo aditiva** como la v6 de la 5.12; viaja en
  la copia como tabla opcional (`backupCheck.ts`: `OPTIONAL_TABLES`, `NEW_IN_513`, versión 5 de la copia solo si hay retos).
- Tests: tipos y recorte de la cifra, progreso de cada tipo con datos de ejemplo (funciones puras), reto de respaldo sin IA,
  semana nueva = reto nuevo, migración v6→v7 (esquema) y copia con y sin la tabla.

### Fase 2 · P-17 Tarjeta de la semana
- Botón **«Compartir mi semana»** en Progreso: genera una **imagen PNG** (canvas, ~1080×1350) con la mascota del tema
  (`android/app/src/main/res/drawable-nodpi/mascot_*.png`: copiarlas a `public/` si hace falta), el nombre, la racha, los minutos de
  la semana, el reto y su barra, y el último logro. Se comparte como archivo con `@capacitor/share` (patrón de `backup.ts`: caché
  y limpieza con `cleanShareCache`).
- **Nada sensible:** ni nivel por habilidades, ni errores, ni lo que recuerda el profe, ni claves. Solo nombre (si lo tiene),
  números de la semana y el reto.
- Vista previa antes de compartir; funciona en horizontal y en 320×640; respeta el modo ligero (sin efectos caros al dibujar).
- Tests: datos de la tarjeta (función pura que decide qué entra y qué no), y en el navegador la imagen generada (tamaño y que no
  incluye datos sensibles).

### Fase 3 · Códigos para compartir: reto entre dos y palabras
- **Formato** (`src/lib/shareCode.ts`): texto `HABLA:1:<base64url(JSON)>`, con tipo `challenge` | `progress` | `word`, versión,
  tope de tamaño (~2 KB) y **validación estricta como `backupCheck.ts`** (el código viene de otra persona: es dato no fiable).
  Textos de una línea, con tope y pintados por React (sin `innerHTML`); **nunca entran en un prompt**.
- **Reto entre dos:** «Retar a alguien» en el detalle del reto → código con el reto de tu semana y tu nombre. La otra persona
  lo pega («Pegar un código», en Progreso) y ese reto queda como **«Reto con Ana»** para su semana, medido en su teléfono. Para
  compararse, cada uno manda su **código de progreso** («Ana: 6 de 8 · Tú: 4 de 8»), que también puede ir en el texto de la
  tarjeta de la Fase 2. Sin servidor: solo se compara lo que el otro te envía.
- **Palabras compartidas:** en Palabras, «Compartir» en una palabra guardada → código con la palabra, traducción, significado y
  ejemplo (`LookupResult` de `db.ts`). Al pegarlo, se guarda como consulta `saved: true` con el contexto «compartida por Ana» y
  `syncCards()` (`src/lib/srs.ts`) le crea su tarjeta de Repaso. Una palabra repetida no se duplica.
- **Pegar un código:** un solo sitio para pegar (hoja con la mascota que explica qué es y qué hace cada tipo); código dañado,
  de otra versión o de otro tipo → mensaje claro en español y no se toca nada.
- Tests: ida y vuelta de cada tipo, códigos dañados o enormes rechazados, campos de más ignorados, `__proto__` sin efecto,
  palabra repetida, reto con otra persona medido con sus datos.

### Fase 4 · Entrega 5.13 (build 45)
- `version.json`, entrada 5.13 en `RELEASES` (`changelog.ts`), README (manual: reto, tarjeta, códigos), CLAUDE.md (versión y
  siguiente trabajo), `docs/pruebas/PENDIENTES.md` (lo que falta en el teléfono: compartir por WhatsApp de verdad entre dos
  teléfonos) y capturas de lo nuevo.


## Ampliación de la 5.13 (2026-11-05, decisión del dueño: «las 4 y mantenlo dentro de la 5.13»)
Presupuesto que quedaba: unos 42 USD. Sigue siendo la 5.13 / build 45 (aún sin APK). Todo sin servidor; mismas reglas.
- **Fase 5 · Mensaje revisado:** en Progreso, «Escribir en inglés»: escribes o dictas un mensaje (si lo escribes en español,
  te lo paso al inglés); el profe lo corrige con una llamada al modelo rápido (corregido con tus palabras, una versión más
  natural y hasta 3 notas en español) y lo mandas por WhatsApp, con lo que escribiste tú si quieres. Nada se guarda.
- **Fase 6 · Aviso del reto:** si el reto no está cumplido, una notificación el jueves (o el sábado si ya pasó) a la hora del
  recordatorio: «Te faltan 3 para tu reto». Interruptor en Ajustes → Meta diaria, activado por defecto; no pide permisos.
- **Fase 7 · Mi familia:** código `week` (nombre, semana, minutos, racha, días y reto). En Progreso, «Mi familia»: tu fila y
  la de cada persona con lo último que te mandó; «Mandar mi semana»; borrar a alguien. Tabla `family` dentro de la v7 (la
  5.13 aún no se ha publicado). Sin nombre en el código no se guarda.
- **Fase 8 · Practicar lo mismo:** código `practice` (una Situación de la lista, nunca texto libre: no entra nada ajeno en un
  prompt) y código `score` (tu nota y objetivos en esa Situación). «Proponer una práctica» en Mi familia; al pegarla,
  «Practicar ahora»; en la fila de esa persona, su nota frente a la tuya y «Mandar mi nota».

## Reglas para la sesión nueva
- Todo lo de `CLAUDE.md` (español, estilo, claves solo en Preferences, nunca keystore, no reactivar logs de Capacitor).
- Antes de cada commit: `npx tsc -b`, `npm run lint` (0 errores), `npm test`, `node scripts/validate-grammar.mjs`,
  `node scripts/validate-bank.mjs`, `node scripts/validate-sounds.mjs`, y prueba en el navegador con el arnés de la 5.12
  (`docs/v5.12/evidencia/arnes.html` + `comun.mjs`: IA falsa que responde según el esquema; ver `arnes-p12.mjs` de ejemplo).
- **Reglas para gastar poco (~58 USD):** una sola revisión por fase; capturas solo de lo nuevo (390×844 y 320×640; horizontal
  solo si la pantalla es nueva); no regenerar capturas de fases anteriores; leer los archivos por partes (grep + rango), no
  enteros; sin APK ni pruebas en el teléfono. Si el presupuesto se acaba, **la Fase 3 se puede partir**: primero palabras
  compartidas (más barata), después el reto entre dos.
- **Arnés:** no escribir archivos dentro del repo mientras corre (Vite vigila la carpeta y recarga la página): la salida va al
  scratchpad y se copia al final (nota de `docs/v5.12/PLAN.md`).
- Sin APK: no hay Android SDK en la nube (se compila en el PC del dueño cuando él quiera).
