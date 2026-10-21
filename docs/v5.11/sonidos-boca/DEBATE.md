# Cómo mostrar la boca en Sonidos: debate de opciones

**Fecha:** 2026-10-21 · **Rama:** `v5.11` (solo documento: sin cambios en `src/`, sin dependencias nuevas, sin commits)
**Encargo del dueño:** debatir, todavía sin programar, cómo representar visualmente la articulación de cada sonido
(lengua, labios, dientes, mandíbula, paladar, cuerdas vocales, aire por la nariz o por la boca) para practicarlo.
Parte de `BACKLOG.md` §5.0 y de `docs/fonemas/DISENO-fonemas.md` §7.4 (8 perfiles por lugar de articulación + vista de
frente), y tiene que encajar con el futuro «modo ligero» (`docs/v5.11/rendimiento/EVALUACION.md`).

> **Cómo leer las cifras.** Lo marcado con **(verificado)** sale de una fuente citada. Lo marcado con **(estimación)** es
> un cálculo mío, sin medir: hay que confirmarlo con el arnés de `docs/v5.11/rendimiento/evidencia/` o en el A11.
> En esta sesión las páginas web solo se pudieron consultar **a través del buscador** (la descarga directa de Commons,
> Seeing Speech y GitHub estaba bloqueada), así que las licencias hay que **confirmarlas en la página del archivo** antes
> de usar nada.

---

## 0. Resumen para el dueño

- **Recomendación: una «maqueta» propia en SVG, paramétrica y animada con nuestro propio código** (opción B de la tabla):
  un corte lateral de la cabeza con 6–7 piezas móviles (labios, mandíbula, punta y cuerpo de la lengua, velo del paladar,
  cuerdas vocales) y una vista de frente de los labios. Cada sonido es **una pose en el JSON** (números), no un dibujo:
  la animación va de «reposo» a la pose en ~0,6 s, enseña la vibración o el aire y se para.
- **Por qué:** pesa casi nada (**~1–3 KB por pose, ~60–120 KB en total** (estimación) frente a 4–10 MB de vídeos),
  **0 dependencias**, funciona sin internet, se tiñe con el tema en claro y oscuro, y en **modo ligero** se queda en la
  imagen final quieta (cero coste). Rive y Lottie añaden un motor de 200–500 KB y otra herramienta (Rive exige pago para
  exportar desde octubre de 2025); un vídeo por sonido pesa mucho y no se adapta al tema.
- **Base gratis y legal:** hay **cortes sagitales CC0** (dominio público) de Wright y McCloy (Universidad de Washington)
  en Wikimedia Commons para casi todos los sonidos, incluidos /θ/, /ð/, /ŋ/: sirven de **plantilla anatómica** para
  calcar la maqueta sin problemas de licencia.
- **Vídeos reales de resonancia (MRI):** los de Seeing Speech son CC BY-NC-ND (no se pueden recortar ni adaptar) y con
  hablantes escoceses; los de la base de USC parecen de libre uso, pero son difíciles de leer para un estudiante. Los
  dejaría como **extra opcional** de una fase posterior, no como base.
- **Empezar pequeño:** MVP con los **8 contrastes que más le cuestan a un hispanohablante** (θ/ð, v/b, s/z, ʃ/tʃ, ɹ,
  h, ŋ, ɪ/iː) y, si gusta en el POCO y en el A11, extender a los 41.

---

## 1. Qué hay que representar en cada sonido

### 1.1 Rasgos mínimos útiles (y cómo dibujarlos)

Para un hispanohablante no hace falta precisión de laboratorio: hace falta **ver la diferencia con el sonido español que
ya sabe hacer**. Los rasgos que de verdad cambian algo son:

| Rasgo | Valores | Cómo se ve en la maqueta | Campo actual en `phonemes.json` |
|---|---|---|---|
| Forma de los labios | estirados · neutros · redondos (+ adelantados en /ʃ ʒ tʃ dʒ ɹ w/) | Vista de frente y perfil del labio | `articulation.lips` |
| Apertura de la mandíbula | cerrada · media · abierta | Giro de la mandíbula inferior (perfil y frente) | `articulation.jaw` |
| Dónde toca o se acerca la lengua | labios, labio-dientes, entre dientes, encías, detrás de las encías, paladar, velo, garganta | Punto de contacto resaltado con `var(--acc)` | `articulation.place` (12 valores hoy) |
| Qué parte de la lengua | punta · lámina · cuerpo · raíz | Curva de la lengua con 2 puntos de control (punta y cuerpo) | Falta: se puede deducir de `place` o añadir `tongue` |
| Modo | oclusiva (cierra y suelta) · fricativa (deja un hueco y sopla) · africada (cierra y luego sopla) · nasal · aproximante | **Línea de tiempo** de la animación: cierre → suelta, o hueco fijo con aire | Falta: añadir `manner` |
| Sonoridad | sorda · sonora | Cuerdas vocales con **onda** (sonora) o **rectas** (sorda) + icono de «vibra / no vibra» | `voiced` |
| Salida del aire | por la boca · por la nariz (velo bajado) | Velo del paladar subido o bajado y flechitas o puntos por la boca o la nariz | Falta: se deduce de `manner = nasal` |
| Soplo (aspiración) | /p t k/ al inicio de sílaba tónica | Un «puf» de aire al soltar | Falta (es un rasgo de `feature`) |
| Duración y tensión (vocales) | larga y tensa · corta y relajada | Barra de duración y lengua algo más alta y adelantada en la tensa | `voiceEs` lo dice en texto |

Con esos 9 rasgos se describen los 41 sonidos. La convención de la **onda en la glotis para «sonoro»** es la misma que
usan los cortes CC0 de Wright y McCloy (§3), así que no la inventamos nosotros.

### 1.2 Los sonidos difíciles y qué vista sirve para cada uno

| Sonido(s) | Lo que suele hacer un hispanohablante | Qué tiene que enseñar el dibujo | Vista que sirve |
|---|---|---|---|
| /θ/ *think* · /ð/ *this* | /t/, /d/, /s/ o /f/ | **Punta de la lengua entre los dientes**, aire que sale por encima de la lengua; /ð/ con onda | **Las dos**: de frente se ve la lengua asomando (es lo más fácil de imitar en el espejo); de lado, el hueco y el aire |
| /v/ *very* · /b/ *berry* | /b/ para las dos | /v/: **dientes de arriba sobre el labio de abajo** y aire continuo con vibración; /b/: labios cerrados y «suelta» | **Frente** (clave) + lado para el aire continuo frente al golpe |
| /s/ *sue* · /z/ *zoo* | /s/ para las dos | Misma posición; la única diferencia es la **onda en las cuerdas vocales** (y que /z/ zumba) | **Lado** con las cuerdas vocales; la posición no cambia, así que la animación solo «enciende» la vibración |
| /ʃ/ *shoe* · /tʃ/ *chew* | /tʃ/ para las dos (o /s/) | Mismo sitio (detrás de las encías) y **labios adelantados**; /tʃ/ **primero toca y luego sopla**, /ʃ/ solo sopla | **Lado con línea de tiempo** (cierre → soplo) + frente para los labios redondos |
| /ʒ/ *vision* · /dʒ/ *job* | /j/ o /tʃ/ | Igual que el par anterior, con onda | Igual que /ʃ tʃ/ |
| /ɹ/ *red* | vibrante /r/ o «tap» /ɾ/ | **La punta no toca nada** (curvada atrás o lengua «amontonada»), labios un poco redondos | **Lado** (imprescindible); el contraste es «tocar» (español) frente a «no tocar» |
| /h/ *hat* | jota española (fricción en el velo) | **Nada se cierra**: boca abierta, solo aire desde la garganta | **Lado**: que se vea el velo libre y el aire limpio |
| /ŋ/ *sing* | /n/ + /g/ («sing-g») | **Parte de atrás de la lengua contra el velo**, velo bajado, aire **por la nariz**, y **sin soltar /g/** | **Lado** con flecha por la nariz |
| /iː/ *sheep* · /ɪ/ *ship* | /i/ española para las dos | /iː/: labios estirados, lengua alta y tensa, **larga**; /ɪ/: lengua un poco más baja y atrás, relajada, **corta** | **Lado** (altura de lengua, diferencia pequeña) + **barra de duración**; el frente apenas cambia |
| /æ/ *cat* · /ʌ/ *cup* · /ɑ/ *hot* | /a/ española para las tres | /æ/: mandíbula muy abierta, lengua adelante y baja, labios estirados; /ʌ/: media y central, relajada; /ɑ/: muy abierta y atrás | **Frente** (apertura y forma de labios) + lado (adelante/atrás de la lengua). Encaja con la carta de vocales de `PhonemeChart.tsx` |
| /ə/ schwa · /ɚ/ | vocal llena según la letra | **Todo relajado y en el centro**, muy corta | **Frente** neutro + lado con lengua en reposo (es la pose «reposo» casi tal cual) |
| /w/ · /j/ | /gu/, /ʝ/ | /w/: labios muy redondos y lengua atrás; /j/: lengua alta sin tocar | Frente (/w/), lado (/j/) |
| /l/ final (oscura) | /l/ clara | Punta en las encías **y** cuerpo de la lengua levantado atrás | Lado |
| /p t k/ aspiradas | sin soplo | «Puf» de aire al soltar | Lado (o frente con un papelito que se mueve, como en clase) |
| Diptongos /eɪ aɪ ɔɪ aʊ oʊ/ | — | **Dos poses seguidas** (de una vocal a otra) | Frente y lado con dos fotogramas clave |

**Conclusión de esta sección:** casi todas las vocales y /v f θ ð w ʃ/ se entienden mejor **de frente** (lo que el
estudiante puede comprobar en un espejo o con la cámara), y casi todas las consonantes internas (/ɹ ŋ h k g s z/)
**solo** se entienden **de lado**. Por eso la propuesta usa **las dos vistas**: lado siempre, frente cuando aporta.

---

## 2. Tabla comparativa de opciones

Escala: ●●● bueno · ●● regular · ● malo. «Peso» = lo que añade al APK para los 41 sonidos.

| # | Opción | Calidad didáctica | Peso (41 sonidos) | Rendimiento en gama baja (A11) | Licencia | Esfuerzo inicial | Mantenimiento | Sin internet | Modo ligero |
|---|---|---|---|---|---|---|---|---|---|
| A | **SVG fijos** (8 perfiles + 9 frentes, plan de §7.4) | ●● (enseña el sitio, no el movimiento ni la africada) | ~20–40 KB (estimación; §7.4 calcula 1–2 KB por perfil) | ●●● (se pinta una vez) | Propia | Bajo (~15–25 h de dibujo, estimación) | ●●● | Sí | Es ya la versión ligera |
| B | **Maqueta SVG paramétrica animada con código propio** (recomendada) | ●●● (movimiento, aire, vibración, línea de tiempo para /tʃ/ y diptongos; se tiñe con el tema) | **~60–120 KB** (estimación: ~10 KB de dibujo base + 1–3 KB por pose + ~5–10 KB de código) | ●●● si se respeta: ~10 trazos, sin `filter`/`blur`, animación de 1–2 s y quieta después, pausa si no se ve (el planificador de `Mascot.tsx` ya lo hace) | Propia; base anatómica CC0 (§3) | Medio-alto (~40–80 h, estimación: 15–25 h dibujo base, 10–20 h motor, 15–30 h poses y revisión) | ●●● (cambiar un sonido = cambiar números en JSON) | Sí | Pose final quieta, sin aire ni onda animados (icono «vibra») |
| C | Igual que B, pero con **librería de morphing** (flubber o polymorph) | ●●● | B + **~18 KB gz** (flubber 0.4, MIT) o **~6 KB** (polymorph-js) (verificado, §3) | ●●● | MIT | Algo menos que B si las formas no comparten estructura | ●● (dependencia más) | Sí | Igual que B |
| D | **Lottie** (After Effects + plugin o editor de LottieFiles) | ●●● si lo anima alguien que sabe | Motor: el de dotLottie es un WASM de **~500 KB** comprimido que por defecto **se descarga de un CDN** (verificado; habría que empaquetarlo); `lottie-web` oficial: sin cifra oficial encontrada. Animaciones: ~10–40 KB c/u (estimación) → ~0,9–2 MB | ●● (el renderizador SVG de lottie-web cambia muchos nodos por fotograma; el de dotLottie pinta en canvas por CPU) | Motor MIT; animaciones propias | Alto: hace falta animador y herramienta; 41 animaciones | ●● (cada cambio pasa por la herramienta) | Solo si empaquetas el WASM | Mostrar un fotograma fijo |
| E | **Rive** (editor + `@rive-app/canvas-lite`) | ●●● (máquinas de estado: tocar labio, lengua…) | Motor **222 KB brotli / 707 KB sin comprimir** (canvas-lite; verificado, tabla de enero de 2026) + `.riv` pequeño (un solo archivo para todos) | ●● (WASM + canvas; sin datos de WebView de gama baja: no encontrado) | Motor MIT; **exportar `.riv` exige plan de pago desde el 2025-10-20** (Cadet, ~9 USD/mes anual); lo exportado sigue funcionando sin plan | Alto (aprender Rive) | ● (dependes del editor de pago para cada cambio) | Sí | Fotograma fijo |
| F | **Vídeo animado** (dibujo animado renderizado, 3–5 s por sonido) | ●●● si está bien hecho | ~80–250 KB por sonido a 320×320 en H.264 (estimación) → **~3–10 MB** (el APK crecería varias veces lo que pesan hoy todos los audios: 540 KB) | ●● (el decodificador H.264/HEVC por hardware del Snapdragon 450 del A11 lo aguanta, verificado; **VP9 no confirmado**: usar MP4 H.264) | Depende de quién lo haga | Alto (alguien tiene que animar igual que en D) | ● (un cambio = re-renderizar) | Sí | Póster (primer o último fotograma como imagen) |
| G | **Vídeo real de MRI o ultrasonido** con licencia libre | ●● para curiosos, ● para principiantes (imagen gris, granulada, hay que aprender a leerla) | Recortes de 3 s: ~100–300 KB c/u (estimación) | ●● (vídeo por hardware) | USC 75 hablantes: «public domain» en el artículo, CC BY 4.0 en figshare (no confirmado del todo); Ruthven 2023: CC BY 4.0; **Seeing Speech: CC BY-NC-ND 4.0** (no permite recortar ni adaptar) | Medio (buscar, recortar, rotular cada sonido en inglés americano) | ●● | Sí | Póster |
| H | **Vídeo o foto de una persona real** de frente (p. ej. el dueño) | ●●● para labios y /θ ð v f/; no enseña lo de dentro | Fotos ~10–20 KB (estimación); vídeos como F | ●●● (foto) / ●● (vídeo) | Propia (ojo: es la cara de alguien en un APK que circula) | Bajo-medio (grabar 41 tomas con buena luz) | ●● | Sí | Foto fija |
| I | **Sprites** (secuencia PNG/WebP) | ●● | ~30–100 KB por sonido (estimación) | ●●● (cambiar una imagen es barato) | Propia | Alto (hay que dibujar todos los fotogramas) | ● | Sí | Último fotograma |
| J | **3D con three.js** (cabeza con lengua) | ●●● en teoría, rotable | Motor **~150 KB gz** en r138 (2022; hoy algo más) + modelo 0,5–3 MB (estimación) | ● (WebGL en el A11 con el fondo desenfocado encima: lo más caro posible) | MIT; modelos con licencia aparte | Muy alto (modelar y riguear lengua) | ● | Sí | Imagen renderizada |
| K | **Librerías de visemas / «talking head»** (Oculus 15 visemas, `lipsync-engine`, TalkingHead) | ● para enseñar: son para doblaje (mueven labios y mandíbula, **no la lengua**; juntan /θ ð/ en «TH», /s z/ en «SS») | 15 formas de boca SVG: pocas KB | ●●● | MIT en las citadas (no verificado una a una) | Bajo | ●● | Sí | — |
| L | **Simulador tipo Pink Trombone** (tracto vocal que suena) | ●● como juguete para explorar; no reproduce sonidos ingleses exactos | ~20–50 KB de JS (estimación) | ●● (audio en tiempo real) | «MIT-ish» según terceros (no verificado) | Medio | ●● | Sí | Desactivado |

**Notas a la tabla**
- B y C son la misma idea; C solo compensa si las formas no tienen el mismo número de puntos. Si **dibujamos todas las
  poses a partir de un mismo trazado** (mismos comandos `M C C C…`, cambian solo los números), la interpolación son
  ~30 líneas propias y no hace falta librería. Por eso recomiendo B.
- K tiene un uso secundario bonito: que **la boca de la mascota** se mueva con 5–6 visemas cuando habla. Pero eso es
  decoración (y en modo ligero se apaga), no enseña a pronunciar.
- Coste de rendimiento: según `EVALUACION.md` §1, lo caro en el WebView es **pintar y componer**, no el JavaScript.
  Una maqueta de ~10 trazos sin filtros que se mueve 1–2 s y **se queda quieta** cuesta mucho menos que la mascota a
  8 fps en reposo (≈ 40 % de un núcleo medido en el POCO). La regla para B: dibujarla sobre **fondo sólido** (no sobre
  `.glass` con `backdrop-filter`), sin `filter`, sin `drop-shadow`, y animar con `transform` donde se pueda (mandíbula y
  labios giran o se desplazan; solo la lengua necesita cambiar el `d` del trazo).

---

## 3. Recursos existentes con licencia y si se pueden usar

| Recurso | Qué es | Licencia (según lo encontrado) | ¿Se puede usar en Habla? |
|---|---|---|---|
| **Cortes sagitales «IPA x Sagittal Section.svg»** de Richard Wright y Dan McCloy (U. de Washington, 2011), subidos a Commons en 2024 desde el repositorio `drammock/phonetics-teaching-assets` (2023-06-13). Ej.: [/θ/](https://commons.wikimedia.org/wiki/File:IPA_%CE%B8_Sagittal_Section.svg), [/ð/](https://commons.wikimedia.org/wiki/File:IPA_%C3%B0_Sagittal_Section.svg), [/ŋ/](https://commons.wikimedia.org/wiki/File:IPA_%C5%8B_Sagittal_Section.svg), [/m/](https://commons.wikimedia.org/wiki/File:IPA_m_Sagittal_Section.svg), [/n/](https://commons.wikimedia.org/wiki/File:IPA_n_Sagittal_Section.svg), [/t/](https://commons.wikimedia.org/wiki/File:IPA_t_Sagittal_Section.svg), [/g/](https://commons.wikimedia.org/wiki/File:IPA_g_Sagittal_Section.svg), [/i/](https://commons.wikimedia.org/wiki/File:IPA_i_Sagittal_Section.svg), [/a/](https://commons.wikimedia.org/wiki/File:IPA_a_Sagittal_Section.svg). Categoría: [Phonetics](https://commons.wikimedia.org/wiki/Category:Phonetics) | Corte lateral fijo por sonido, 654×925, **~15 KB** cada uno; onda en la glotis = sonoro | **CC0** (dominio público) según las fichas de Commons | **Sí, sin condiciones** (ni siquiera atribución, aunque la daremos en «Acerca de»). Ideal como **plantilla anatómica** para calcar la maqueta B. Pendiente: confirmar que existen /ɹ/, /ʃ/, /ʒ/, /ɪ/, /æ/, /ʌ/ (la lista que vi por el buscador estaba cortada) y mirar si el estilo es de un dibujo base común (eso facilitaría la interpolación) |
| [Places of articulation.svg](https://commons.wikimedia.org/wiki/File:Places_of_articulation.svg) (Ishwar / Rohieb, etiquetas de Catford 1977) | Corte con los lugares numerados, 32 KB | GFDL y CC BY-SA 2.5 (según una copia antigua; no confirmado en Commons) | Sí con atribución y **compartir igual** (el derivado iría con CC BY-SA). Mejor usar los CC0 |
| [Seeing Speech](https://www.seeingspeech.ac.uk/) (U. de Glasgow y otras 5 universidades escocesas; modelos Janet Beck y John Esling) | Vídeos de ultrasonido, MRI y **animaciones 2D del corte sagital**, por la carta del AFI | **CC BY-NC-ND 4.0** según el aviso del sitio (visto por el buscador); la parte STAR añade que no se puede usar para IA ni transformación automática sin permiso escrito | **No tal cual**: NC encaja (Habla es gratis), pero **ND prohíbe recortar, rotular o recodificar**, y los sonidos son cardinales del AFI con hablantes escoceses/canadienses, no inglés americano. Solo como **enlace externo** («verlo en Seeing Speech») o pidiendo permiso a Jane Stuart-Smith / Eleanor Lawson ([contacto](https://seeingspeech.ac.uk/contact-us)) |
| [Sounds of Speech](https://now.uiowa.edu/node/31361) (U. de Iowa, app Android/iOS) | Animaciones y vídeos de cada sonido del inglés americano: justo lo que queremos | **Copyright de la Universidad de Iowa** (Research Foundation); un agregador dice CC BY-NC, sin fiabilidad | **No**, salvo permiso escrito de la UIRF. Sirve de **referencia de calidad** («así de claro tiene que quedar») |
| [USC 75-Speaker Speech MRI Database](https://sail.usc.edu/span/75speakers/) (Lim et al., 2021, [artículo](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8292336/)) | MRI en tiempo real del corte sagital con audio, 75 hablantes de inglés americano | El artículo lo llama «public domain»; el registro de figshare figura como CC BY 4.0 (no lo pude abrir) | **Probablemente sí** con atribución. Habría que buscar en los vídeos las palabras con cada sonido y recortar 3 s: trabajo de horas por sonido. Para una fase «Ver de verdad» |
| [Ruthven et al. 2023](https://www.nature.com/articles/s41597-023-02766-z) ([Zenodo](https://zenodo.org/records/10046815)) | MRI de 5 voluntarios con la lengua y el velo segmentados | **CC BY 4.0** | Sí con atribución; las segmentaciones podrían servir para comprobar que nuestra maqueta es realista. Pocos hablantes y no sé su acento (no verificado) |
| [English Liquid Consonants Ultrasound Database](https://reshare.ukdataservice.ac.uk/854794/) (2016–2019) | Ultrasonido de lengua y labios para /l/ y /ɹ/ | No confirmada | Pendiente; interesante solo para /ɹ/ y /l/ oscura |
| [Interactive Sagittal Section](https://uturn.calvin.edu/content/resource_abstract/5580) (Daniel Currie Hall) | Página donde cambias sonoridad, nariz, labios y lengua de un dibujo | No encontrada | **No** copiar; es **la prueba de concepto de la opción B** (un corte con piezas que se combinan) |
| [DYNARTmo / SpeechArticulationTrainer](https://arxiv.org/abs/2507.20343) (Kröger, 2025) | App web de investigación con corte sagital animado por sílabas | No encontrada (los artículos traen código Python suplementario) | No; referencia de cómo se anima de una pose a otra |
| Visemas de [Meta (Oculus) Lipsync](https://developers.meta.com/horizon/documentation/unreal/audio-ovrlipsync/) (15: sil, PP, FF, TH, DD, kk, CH, SS, nn, RR, aa, E, ih, oh, ou); [lipsync-engine](https://github.com/Amoner/lipsync-engine) (SVG, sin dependencias); [TalkingHead](https://github.com/met4citizen/TalkingHead) (3D) | Formas de boca para sincronizar labios | Lista de visemas: documentación pública; librerías MIT según sus repos (no verificado) | La lista es útil como **vocabulario de formas de labios** para la vista de frente; las librerías no enseñan lengua |
| [flubber](https://cdnjs.com/libraries/flubber/0.2.4) · [polymorph-js](https://npmjs.com/package/polymorph-js) | Interpolar trazos SVG | MIT; ~18 KB gz / ~6 KB | Sí, pero probablemente innecesarias (§2, notas) |
| Rive ([tamaños](https://rive.app/docs/runtimes/runtime-sizes.md), [plan de pago para exportar](https://rive.app/blog/rive-s-new-9-mo-plan)) · Lottie ([cómo funciona el reproductor](https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/core-concepts)) | Motores de animación | Motores MIT; Rive: exportar exige pago | Técnicamente sí; no compensa frente a B (§2) |
| Pink Trombone (Neil Thapen, 2017; [ficha](https://imaginary.org/node/1520)) | Tracto vocal que suena | No confirmada | Solo como inspiración; no para enseñar sonidos concretos |
| Canales de vídeo (Rachel's English, BBC Learning English) | Vídeos de pronunciación con la boca | Sin licencia de reutilización encontrada | **No** se pueden copiar; como mucho, enlazar |

---

## 4. Recomendación por fases y preguntas abiertas

### 4.1 Fases

**Fase 0 — Decidir y prototipar (≈ 6–10 h, estimación).**
Un prototipo HTML suelto (en `docs/v5.11/sonidos-boca/`, fuera de la app) con el corte lateral base calcado del CC0 y 3
poses: reposo, /θ/ y /ɹ/. Medirlo con el arnés de rendimiento en el POCO y, si el dueño lo permite, en el A11.
Criterio para seguir: que se entienda **sin leer el texto** y que no se note en el A11.

**Fase 1 — MVP: 8 contrastes difíciles (≈ 25–40 h, estimación).**
- Motor propio: dibujo base + interpolación de poses + onda de las cuerdas vocales + aire (3–5 puntitos que avanzan) +
  velo (nariz). Animación: reposo → pose (~0,6 s) → mantener con aire o vibración (~1 s) → quieto. Botón «Otra vez».
- Poses de /θ ð v b s z ʃ tʃ ɹ h ŋ iː ɪ/ y, de frente, las 3 formas de labios × 3 aperturas.
- Datos: ampliar `articulation` con `manner`, `tongue` (punta/cuerpo) y, si hace falta, `pose` (números) en
  `phonemes.json`, documentado en `FORMATO-sonidos.md` y comprobado por `validate-sounds.mjs`.
- Modo ligero y «reducir movimiento»: **pose final quieta**, cuerdas vocales con icono en vez de onda animada, aire con
  flecha fija. La versión quieta también es la que se usa para las capturas y la que se pinta si la ficha no se ve.
- Accesibilidad: la maqueta lleva `role="img"` y un `aria-label` hecho con los textos que ya existen (`lipsEs`,
  `tongueEs`, `voiceEs`); sonoro/sordo nunca solo por color (onda + palabra «vibra»); contraste con los colores del tema
  en claro y oscuro; tamaño legible en 320×640 y en horizontal (al lado del texto, no encima).
- Sincronizar con el audio de la ficha: al tocar ▶ suena el `.ogg` y la maqueta va a la pose a la vez.

**Fase 2 — Los 41 sonidos (≈ 20–35 h, estimación).**
Resto de consonantes y vocales, diptongos con dos poses, /tʃ dʒ/ y /p t k/ con línea de tiempo (cierre → suelta → puf),
/l/ oscura. En la carta (`PhonemeChart.tsx`) se podría mostrar una miniatura quieta.

**Fase 3 — Opcional: «Verlo de verdad».**
Si se confirma la licencia de USC, recortes de MRI de 3 s para 5–8 sonidos estrella (/ɹ/, /θ/, /ŋ/, /l/ oscura) como
vídeo MP4 H.264 con póster, solo al tocar (nunca en reproducción automática ni en modo ligero). O una foto o vídeo del
dueño de frente para /θ ð v f/. Alternativa sin peso: enlace a Seeing Speech.

### 4.2 Preguntas abiertas para el dueño

1. **Estilo:** ¿corte lateral «de libro» (líneas limpias, colores del tema) o algo más simpático en la línea de la
   mascota (por ejemplo, que el perfil sea de la mascota)? Lo segundo gusta más, pero puede ser menos exacto.
2. **¿Quién dibuja el dibujo base?** Puedo calcarlo del CC0 y simplificarlo yo en SVG, o lo hace una persona (o Claude
   Design, como la mascota) y yo lo convierto en piezas móviles. ¿Cuánto rigor anatómico quieres?
3. **Alcance del MVP:** ¿te valen los 8 contrastes de §4.1 o prefieres empezar por otros (por ejemplo, las vocales
   /æ ʌ ɑ/)?
4. **Vista de frente:** ¿dibujada (labios esquemáticos) o **fotos reales** de una boca (la tuya u otra persona)? Las fotos
   enseñan mejor /θ v/, pero es una cara dentro de un APK que reparte.
5. **¿Vídeo real de MRI en una fase posterior,** aunque pese 1–2 MB más y haya que revisar la licencia con calma? ¿O
   solo un enlace externo?
6. **Modo ligero:** ¿la maqueta animada se apaga en ligero (pose quieta, como propongo) o la quieres siempre animada
   porque es didáctica, no decorativa? (`EVALUACION.md` distingue efectos «funcionales» de «decorativos».)
7. **¿Para cuándo?** El backlog dice «versión posterior a la 5.11». ¿Prototipo (fase 0) ya en la 5.11 como documento y
   la fase 1 en la 5.12, o todo en la 5.12?
8. **¿Animación ligada a Azure?** Más adelante, cuando Azure marque un sonido como mal dicho, la nota podría abrir la
   maqueta de ese sonido directamente. ¿Te interesa?

---

## 5. Fuentes consultadas (2026-10-21, vía buscador)

- Cortes sagitales CC0 de Wright y McCloy en Commons: https://commons.wikimedia.org/wiki/File:IPA_a_Sagittal_Section.svg ·
  https://commons.wikimedia.org/wiki/File:IPA_%CE%B8_Sagittal_Section.svg · https://commons.wikimedia.org/wiki/Category:Phonetics ·
  https://commons.wikimedia.org/wiki/Category:Sagittal_sections
- Places of articulation.svg: https://commons.wikimedia.org/wiki/File:Places_of_articulation.svg (licencia vista en una copia:
  https://www.classicistranieri.com/pl/articles/p/l/a/Grafika%7EPlaces_of_articulation.svg_a7aa.html)
- Seeing Speech: https://www.seeingspeech.ac.uk/ · https://seeingspeech.ac.uk/about-the-project · https://www.seeingspeech.ac.uk/speechstar/ ·
  https://eresearch.qmu.ac.uk/handle/20.500.12289/3910
- Sounds of Speech (Iowa): https://now.uiowa.edu/node/31361 · https://libguides.southernct.edu/openaccessexhibit/comdisorders
- USC 75 hablantes: https://sail.usc.edu/span/75speakers/ · https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8292336/ ·
  https://figshare.com/articles/dataset/A_multispeaker_dataset_of_raw_and_reconstructed_speech_production_real-time_MRI_video_and_3D_volumetric_images/13725546
- Ruthven et al. 2023: https://www.nature.com/articles/s41597-023-02766-z · https://zenodo.org/records/10046815
- Ultrasonido de líquidas: https://reshare.ukdataservice.ac.uk/854794/
- Interactive Sagittal Section: https://uturn.calvin.edu/content/resource_abstract/5580 · https://iyus.hwulmuhwqun.ca/InteractiveSagittal
- DYNARTmo: https://arxiv.org/abs/2507.20343 · https://arxiv.org/abs/2511.08372
- Rive: https://rive.app/docs/runtimes/runtime-sizes.md (actualizado en enero de 2026) · https://rive.app/docs/runtimes/web/canvas-vs-webgl.md ·
  https://rive.app/blog/rive-s-new-9-mo-plan · https://rive.app/docs/editor/exporting/exporting-for-runtime.md
- Lottie / dotLottie: https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/core-concepts · https://github.com/LottieFiles/dotlottie-web
- flubber y polymorph: https://cdnjs.com/libraries/flubber/0.2.4 · https://npmjs.com/package/flubber · https://npmjs.com/package/polymorph-js
- three.js (tamaño de r138): https://minime.stephan-brumme.com/threejs/138
- Visemas de Meta: https://developers.meta.com/horizon/documentation/unreal/audio-ovrlipsync/ ·
  https://developer.oculus.com/documentation/unity/audio-ovrlipsync-viseme-reference
- Librerías de labios: https://github.com/Amoner/lipsync-engine · https://github.com/met4citizen/TalkingHead · https://github.com/OpenFaceFX/OpenFaceFX
- Pink Trombone: https://imaginary.org/node/1520
- Snapdragon 450 (decodificación de vídeo): https://www.anandtech.com/show/11586 · https://www.notebookcheck.net/Qualcomm-Snapdragon-450-SoC-Benchmarks-und-Specs.299440.0.html
- Reproducción automática silenciada en Chrome para Android: https://developer.chrome.com/blog/autoplay-2/

**No verificado (pendiente):** lista completa de cortes CC0 (si existen /ɹ ʃ ʒ ɪ æ ʌ/); licencia exacta en figshare de
USC; licencia de Pink Trombone y de las librerías de visemas; tamaño actual de `lottie-web` y de three.js; soporte de VP9
por hardware en el A11; rendimiento real de Rive y Lottie en un WebView de gama baja. Todas las horas y los tamaños de
vídeo y de poses son estimaciones mías.
