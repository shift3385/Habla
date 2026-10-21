# Rendimiento y efectos visuales: evaluación y propuesta de «Modo ligero»

**Fecha:** 2026-10-21 · **Rama:** `v5.11` → terminado e implementado en `claude/peaceful-fermi-ua55yq` (5.11 build 43) · **Autor:** agente de rendimiento web móvil y diseño de interfaz
**Encargo del dueño:** una opción en Ajustes para no discriminar teléfonos poco modernos (p. ej. el Samsung Galaxy A11
de su madre): apagar transparencias, animaciones, iluminaciones y otros efectos que cuestan rendimiento, sin que la app
deje de funcionar perfectamente. Además, decidir si «Apariencia» se está haciendo larga y necesita un submenú.

Evidencias en [`evidencia/`](evidencia/): arnés de medida (`perf.html`, `medir.mjs`, `resumen.mjs`), datos crudos
(`medidas/medidas.json`, `medidas/medidas-sin-gpu.json`, `medidas/apariencia-longitud.json`), capturas
(`medidas/*.jpg`) y el cálculo de contraste (`contraste.mjs`).

---

## 0. Resumen para el dueño

<!--RESUMEN-->

---

## 1. Inventario de efectos que cuestan rendimiento

Cómo leer la columna «Coste»: en un WebView de Android lo caro **no es el JavaScript** (MOVIL.md 5.14: 86 % inactivo
con la clase abierta), sino **pintar y componer**: cada vez que algo cambia, el navegador vuelve a pintar esa zona y,
si encima o debajo hay un desenfoque, vuelve a desenfocarla. Un efecto **quieto** se pinta una vez y casi no cuesta;
un efecto que **cambia en cada fotograma** (o que se mueve al desplazar) cuesta en cada fotograma.

### 1.1 Desenfoques y transparencias

| # | Efecto | Dónde (archivo:línea) | Uso | Coste |
|---|---|---|---|---|
| D1 | **Cristal `.glass`**: fondo semitransparente `var(--g)` + `backdrop-filter: blur(22px)` + borde + sombra `var(--sh)` | `src/index.css:298-305`; valores en `src/ui/theme.ts:35-51` (oscuro `rgba(255,255,255,.07)`, claro `.55`) | **215 usos en 49 archivos** (Calibration 21, Conversation 13, AboutScreen 13, Settings 12, Progress 11, Home 11…). En el Inicio hay **12 capas con desenfoque** a la vez | **Alto al desplazar y al animar**: cada tarjeta re-desenfoca lo que tiene detrás en cada fotograma en que algo se mueve debajo o ella se mueve. En reposo, bajo si nada cambia detrás |
| D2 | **Barra de pestañas**: `blur(28px)` + fondo `var(--tab)` semitransparente + sombra `0 12px 40px` + transición de `grid-template-columns .35s` | `src/App.tsx:776-801` | Siempre visible fuera de la clase | Alto: está fija sobre el contenido que se desplaza → se re-desenfoca en **cada fotograma de desplazamiento**. La transición de columnas recalcula el diseño en cada fotograma (no es `transform`) |
| D3 | `color-mix()` en `.tip-bubble` | `src/index.css:535-548` | Globos de la mascota, notas de pronunciación | Despreciable (se calcula una vez). No hace falta apagarlo |
| D4 | Velos oscuros semitransparentes | `MilestoneGate.tsx:90` (`.35`), `AudioPicker.tsx:255` (`.45`) | Diálogos | Despreciable (mezcla alfa sin desenfoque) |

> **Transparencia ≠ desenfoque.** Un color semitransparente (alfa) es barato: la GPU lo mezcla gratis. Lo caro es el
> `backdrop-filter: blur()`. Por eso la propuesta apaga el **desenfoque** y sustituye el cristal por un color sólido
> equivalente; la «transparencia» en sí no hace falta quitarla.

### 1.2 Fondo del tema

| # | Efecto | Dónde | Uso | Coste |
|---|---|---|---|---|
| F1 | 3 manchas de 360–420 px con `filter: blur(70–80px)` + velo (degradado en oscuro) + `transition: background .4s` | `src/ui/Background.tsx:9-20`, velo en `theme.ts:42/50` | Siempre, a pantalla completa | Quietas desde la 5.8.2 (AUD-RES-700): se pintan una vez. Coste **de memoria y de la primera pintura** (capas enormes), y de nuevo cada vez que algo invalida la capa (cambio de tema, giro, cambio de tamaño). **Debajo de todos los cristales**: es lo que el desenfoque D1/D2 vuelve a leer |
| F2 | **Fondos duplicados**: cada página a pantalla completa monta otro `Background` | `MascotPage.tsx:109`, `GrammarSheet.tsx:40`, `SoundSheet.tsx:38` | Avisos, hojas de Gramática y Sonidos | Con una hoja abierta hay **2 juegos de manchas desenfocadas** a la vez |
| F3 | Muestras de tema con 2 `radial-gradient` | `SettingsScreen.tsx:362-367` | Apariencia | Despreciable (degradado sin desenfoque) |

### 1.3 Brillos y sombras de color

| # | Efecto | Dónde | Coste |
|---|---|---|---|
| B1 | `.btn-acc`: `box-shadow: 0 8px 22px var(--glow)` | `index.css:306-313` (todos los botones principales y la pestaña activa) | Medio: sombra difusa grande; se repinta cuando el botón cambia o se mueve |
| B2 | `.card-glow` (tarjeta del tema en la clase): capa `::after` con `box-shadow 0 0 26px` que titila 4 veces | `index.css:497-533`, usado en `Conversation.tsx:929` | Corregido en MOV-3 (antes ~87–107 % de un núcleo); ahora 10 s de animación de opacidad sobre una tarjeta con desenfoque y luego fijo |
| B3 | Botón del micro: `radial-gradient` + `box-shadow 0 0 0 6px var(--g), 0 14px 40px var(--glow)`; grabando `0 0 40px` (o `0 0 0 14px …, 0 0 60px` en test/Gramática/Sonidos) y `transition: all .25s` | `TalkButton.tsx:186-192`, `Calibration.tsx:1128-1134`, `GrammarSpeak.tsx:238-244`, `SoundSay.tsx:292-298`, `TopicAskPage.tsx:192` | Medio: `transition: all` anima la sombra (no se compone en la GPU: repinta 15 fotogramas) |
| B4 | Sombras de brillo sueltas en línea | `App.tsx:785, 797`, `Segmented.tsx:24`, `Home.tsx:154, 491`, `AllTopicsView.tsx:80`, `ReportView.tsx:135`, `Conversation.tsx:831, 1015`, `ProgressScreen.tsx:145`, `MilestoneGate.tsx:99` | Bajo-medio cada una; suman en pantallas con muchas |
| B5 | `filter: drop-shadow(0 4px 12px var(--glow))` en el anillo de la nota + `transition stroke-dashoffset 1.2s` | `ScoreRing.tsx:34` | Medio durante 1,2 s: el filtro se recalcula en cada fotograma de la animación |
| B6 | Sombra del cristal en claro: `--sh: 0 8px 24px rgba(40,30,20,.06), inset…` | `theme.ts:49` | Bajo; ya va con D1 |
| — | **No son decorativas** (no se apagan): sombras interiores de estado (acierto/fallo, celda elegida) | `GrammarExercises.tsx:176`, `SoundExercises.tsx:117, 168`, `PhonemeChart.tsx:32`, `AlphabetScreen.tsx:22`, `PlanScreen.tsx:115` | Marcan respuesta correcta/incorrecta: hay que conservarlas (o pasarlas a borde) |

### 1.4 Mascota animada (`src/ui/Mascot.tsx`)

| # | Pieza | Dónde | Coste |
|---|---|---|---|
| M1 | SVG de ~60 nodos con 3 `radialGradient`, `clipPath`, halo de r = 100 con degradado y 28 partículas en reserva | `Mascot.tsx:1030-1105` | Cada fotograma cambia atributos de decenas de nodos → **repinta todo el recuadro** de la mascota (y lo que lo cubre o lo rodea con desenfoque) |
| M2 | Planificador único: ritmo completo si hay movimiento; **8 fps** en reposo (`IDLE_MS = 125`), **2 fps** tras 10 s (`REST_AFTER_MS`, `REST_MS`), 4 fps con «reducir movimiento», nada si no se ve (IntersectionObserver, `HIDDEN_MS`) | `Mascot.tsx:124-157, 511-529` | Bien resuelto en MOV-3. Medido entonces en el POCO: 8 fps ≈ 40 % de un núcleo; descanso mucho menos |
| M3 | **Se despierta con cualquier dedo en la pantalla**: `pointermove` en `window` (para seguir el dedo con los ojos) pone la mascota a ritmo completo 1,5 s | `Mascot.tsx:186, 219-226, 534` | **Hallazgo**: al desplazar una lista (Inicio, Ajustes, Repaso) la mascota pasa a 60–120 fps justo cuando el teléfono más trabaja. En el A11 se suma al re-desenfoque de D1/D2 |
| M4 | **Ánimo `speaking` = ritmo completo todo el rato** | `Mascot.tsx:534` | Mientras el profe habla (frases de 5–20 s) la mascota va a 60–120 fps |
| M5 | Partículas de ambiente (chispas, gotas, hojas, nubes) y del toque/secreto | `Mascot.tsx:238-500, 700-860` | Solo con movimiento; el toque lanza 8–22 partículas |
| M6 | **Varias mascotas a la vez**: Apariencia monta **6** (5 animadas: vista previa de letra + 4 temas; 1 en el panel de Ajustes) | `SettingsScreen.tsx:396, 445-449`, `SettingsScreen.tsx:191` | Comparten planificador, pero se pintan 5–6 recuadros |

### 1.5 Animaciones y transiciones CSS

| # | Efecto | Dónde | Coste |
|---|---|---|---|
| A1 | `anim-up` (subir y aparecer 0,45 s) y `anim-in` (entrar de lado 0,35 s) | `index.css:332-337`; **65 + 30 usos** (Conversation 9, About 9, Welcome 8, Progress 6…) | Corto y compuesto (opacidad + transform): barato en sí, pero cada entrada de pantalla anima a la vez varias tarjetas **con desenfoque** → re-desenfoque en cada fotograma |
| A2 | Bucles infinitos decorativos: `anim-bob` (globo «¡Tócame!»), `bw-bob` (bienvenida), `hb-spin 40s` (anillo de la preparación), `ld-breathe` | `index.css:339-341`, `WelcomeScreen.tsx:221`, `PrepareScreen.tsx:75` | Siempre que se ven: un bucle infinito impide que la pantalla quede quieta |
| A3 | Animaciones que **animan `filter: blur()`** (lo más caro que hay): `ld-item` (preparación) y `bw-letter` (bienvenida); `bw-reveal` escala un círculo ×70 a pantalla completa | `index.css:137-158, 215-248`, `WelcomeScreen.tsx:181, 196` | Alto mientras duran (1–3 s) |
| A4 | Transiciones de diseño (no compuestas): pestañas `grid-template-columns .35s`, selector `left .45s`, barras `width .5s`, `transition: all .25s` | `App.tsx:782`, `Segmented.tsx:25`, varias `transition-[width]`, `TalkButton.tsx:192` | Recalculan el diseño en cada fotograma de la transición |
| A5 | Celebración de hitos: WAAPI de 1,2 s (escala y opacidad) + mascota `happy` | `MilestoneGate.tsx:52-73` | Bajo y corto; ya respeta «reducir movimiento» |
| A6 | Indicadores de trabajo: puntos «escribiendo» (`hb-dot`), `animate-pulse` de carga, ondas `hb-wave` cuando habla el profe | `Conversation.tsx:1125`, `PlanCard.tsx:123`, `LookupStack.tsx:46`, `ReportView.tsx:103`, `ui/Wave.tsx:27` | Bajo (opacidad o `scaleY`), pero son bucles. **Funcionales**: no se quitan, se simplifican |
| A7 | Ya existe `prefers-reduced-motion` | `index.css:267-295, 528-533`, `Mascot.tsx:139`, `MilestoneGate.tsx:12` | Base sobre la que construir |

### 1.6 Micro, anillo y temporizadores (funcionales)

| # | Efecto | Dónde | Nota |
|---|---|---|---|
| R1 | Medidor de voz: 10 barras, rAF limitado a 20 lecturas/s, `scaleY` | `TalkButton.tsx:53-90` | Barato (transform). Funcional: se queda, a 10 lecturas/s en ligero |
| R2 | Anillo de 60 s (SVG, `stroke-dashoffset` con transición .25 s) | `TalkButton.tsx:156-175` | Funcional. En ligero, sin transición (salta cada 250 ms) |
| R3 | Contador de segundos con `setInterval(250)` → re-render de React | `Conversation.tsx:206`, `Calibration.tsx:350`, `ReviewScreen.tsx:127`, `GrammarSpeak.tsx:67`, `SoundSay.tsx:94` | Solo mientras grabas. Podría bajar a 500 ms en ligero |
| R4 | Preparación: `setInterval` 700 ms y 2,4 s | `PrepareScreen.tsx:57-58` | Corto |

### 1.7 Desplazamiento suave y vibraciones

| # | Efecto | Dónde | Coste |
|---|---|---|---|
| S1 | `scrollIntoView/scrollTo({ behavior: 'smooth' })` | `Conversation.tsx:200` (al final del chat en cada mensaje), `GrammarExercises.tsx:11`, `GrammarSpeak.tsx:26`, `SoundExercises.tsx:26`, `WelcomeScreen.tsx:123` | Medio: ~300–500 ms de desplazamiento animado con todos los cristales re-desenfocándose |
| V1 | Vibraciones (`Haptics.impact`) | `TalkButton.tsx:36-37` (Heavy, 3 sitios), `Conversation.tsx:74-75` (525 Medium, 544 Light «ya puedes hablar», 568 Light), `SoundTest.tsx:147` | **Sin coste de rendimiento** apreciable. Es una preferencia (y una ayuda: P7 avisa de que ya puedes hablar) |

---

## 2. Medidas

<!--MEDIDAS-->

---

## 3. Propuesta de grupos

Cinco grupos, cada uno con su interruptor, y un **preajuste «Modo ligero»** que los apaga todos. Se agrupan por lo
que el usuario ve (no por técnica) y se ordenan de más a menos ahorro según §2:

| Grupo (Ajustes) | Qué apaga (§1) | Qué queda | Funcional, no se toca |
|---|---|---|---|
| **Cristal desenfocado** | D1, D2 (`backdrop-filter` en todas partes) | Tarjetas y barra de pestañas de **color liso** del mismo tono (`--gs`: fondo + un toque de la mancha principal + el blanco del cristal) | — |
| **Mascota en movimiento** | M1–M6 | **Imagen fija** en su pose de reposo (decisión del dueño, 2026-10-21): sin vaivén, sin seguir el dedo (M3), sin moverse al hablar el profe (M4), sin partículas ni reacción animada al tocarla. Se redibuja solo si cambia el ánimo, el tema o el tamaño | **Los consejos y avisos de los globos siguen saliendo igual** (petición del dueño); tocarla sigue pasando al siguiente globo |
| **Animaciones** | A1–A4, B2, B5 (la transición), S1 | Todo aparece al instante: animaciones y transiciones a 1 ms (no `none`: terminan en su estado final y los avisos de fin siguen llegando). Desplazamiento por código sin suavizar | Anillo de 60 s, medidor de voz (R1–R3), indicadores de «pensando» (se quedan quietos pero visibles) |
| **Fondo de colores** | F1, F2 | Degradado suave del tema (`--bgt` → `--bg`), sin capas enormes desenfocadas | — |
| **Brillos y sombras** | B1, B3, B4, B6, B2 (la capa) | Botones y tarjetas sin resplandor (`--glow: transparent`, `--sh: none`) | Sombras interiores de acierto/fallo y celda elegida (no usan esas variables) |

**Vibraciones (V1):** no cuestan rendimiento; no entran en el modo ligero. Si el dueño quiere, irían en otra opción.

**Contraste:** el cristal liso usa el mismo tono medio que el cristal actual, sin la mancha de color detrás: el
contraste del texto se mantiene o mejora (`evidencia/contraste.mjs`).

**¿Activarlo solo?** No: cambiaría el aspecto sin avisar. Se **recomienda** en teléfonos modestos
(`navigator.deviceMemory` ≤ 3 GB o ≤ 4 núcleos; el A11 tiene 2–3 GB) con un globo en Apariencia y en Rendimiento.

---

## 4. Implementación propuesta

Hecho en la 5.11 (build 43), commit `268deca`:

- `src/lib/effects.ts` (nuevo, sin React): tipos, `normalizeEffects` (lo que falte, encendido), `effectsPreset`,
  `looksModest`, `applyEffects` (clases `fx-no-blur`, `fx-no-bg`, `fx-no-glow`, `fx-no-motion` en `<html>`) y
  `scrollBehavior()`. Tests en `tests/effects.test.mjs`.
- `settings.ts`: ajuste `effects` (todo encendido por defecto; la carga lo normaliza, así llega solo a instalaciones
  antiguas). No viaja en las copias (los ajustes nunca viajan).
- `index.css`: reglas al final, **fuera de las capas** de Tailwind y con `!important` donde hay que ganar a las
  variables que `App.tsx` pone en línea en `<html>` (`--g`, `--tab`, `--glow`, `--sh`).
- `theme.ts` (`cssVars`): `--gs` (cristal liso) y `--bgt` (arranque del degradado) calculados por tema y modo.
- `Background.tsx`: clases `bg-root`/`bg-blob` para cambiar las manchas por el degradado.
- `Mascot.tsx`: `setMascotStill(on)`. Quieta = un solo dibujo de la pose de reposo (`fresh()`), `nextAt = Infinity`,
  sin escuchar `pointermove`; el planificador no programa nada si todas están quietas.
- `App.tsx`: aplica los efectos y la mascota quieta al cargar y al cambiar el ajuste.
- Desplazamientos por código (`Conversation`, `GrammarExercises`, `GrammarSpeak`, `SoundExercises`, `WelcomeScreen`):
  `behavior: scrollBehavior()`.

**Comprobado en el navegador** (360×780, 320×640, 780×360): clases aplicadas, cristal sin desenfoque y con color
liso, **la mascota del Inicio cambia 1.163 veces en 4 s con todo y 0 en modo ligero**, el globo de consejos sale
igual en los dos modos, sin desbordamiento horizontal, Atrás de Rendimiento vuelve a Apariencia.
`npm test`: 361 ✔, 0 ✖, 1 `todo` (SEG-509).

---

## 5. Menú «Apariencia»

Apariencia tenía, seguidos: tamaño de letra con vista previa, 4 temas con su mascota animada, modo, orientación y
globos (unas 4–5 pantallas en 320×640, con **6 mascotas** animándose a la vez: es la pantalla más cara de la app, §2).
Con el modo ligero dentro, pasa a **menú con secciones**, cada una con lo elegido a la vista:

| Sección | Contenido | Resumen en el menú |
|---|---|---|
| Tema y mascota | 4 temas + modo claro/oscuro | «Gota · Marea · claro» |
| Tamaño de letra | La tarjeta de la 5.10.1 con vista previa | «Normal» |
| Rendimiento | Modo ligero + 5 grupos a medida | «Completo» · «Modo ligero» · «A medida: n de 5 apagados» |
| Pantalla y globos | Orientación + globos de la mascota | «Automática · globos encendidos» |

Atrás (botón y Android) vuelve de la sección al menú y del menú al panel de Ajustes. De paso, las 6 mascotas solo se
montan al entrar en «Tema y mascota» (y la de la letra, en su sección).

---

## 6. Esfuerzo y versión

- **Hecho:** estudio, implementación y prueba en el navegador en la **5.11 build 43** (aún sin entregar: la 5.11 no
  ha salido, así que entra en ella; Novedades actualizadas). Esfuerzo real: una sesión.
- **Pendiente (con el resto de pruebas en el teléfono, `docs/pruebas/PENDIENTES.md`):** medirlo en el POCO y, si el
  dueño lo permite, en el A11 (CPU en reposo del Inicio y de Apariencia con `cpu.sh`, fluidez al desplazar), y que la
  madre del dueño lo use un día.
- **Ideas para después:** vibraciones como opción aparte; recomendar el modo ligero también con un aviso de la mascota
  la primera vez en un teléfono modesto.
