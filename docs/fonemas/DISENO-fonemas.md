# Habla · «Sonidos» — Diseño de la sección de fonemas y abecedario

Fecha: 2026-10-20. Estado: **PROPUESTA para que el dueño la apruebe** (nada implementado). Origen: `BACKLOG.md` §4.5
(idea del dueño, inspirada en un reel de Instagram). Contenido de base: `docs/fonemas/inventario-fonemas.md`.

## 0. Resumen

- **Qué es:** una sección nueva, **«Sonidos»** (título largo: «Sonidos del inglés»), para aprender el **abecedario**
  (nombres de las letras y deletrear) y los **40 sonidos del inglés americano**: cómo se hace cada uno, en qué palabras
  sale, cómo se escribe, en qué se parece al español y con qué se confunde. Se practica **escuchando** (elegir entre
  pares mínimos), **clasificando** y **diciéndolo** (con Azure, si hay clave).
- **Dónde:** cuarta pestaña del Inicio, junto a Temas · Prácticas · Gramática (§7.1).
- **Cómo se organiza:** una **tabla fonémica** táctil (estilo Adrian Underhill, adaptada al móvil) para consultar, y
  una **ruta de 33 clases cortas** (5–10 min) ordenadas por lo que más le cuesta a un hispanohablante, empezando por
  el abecedario (§5).
- **Conexión con lo que ya hay:** la nota de Azure («Cuida «think» (lengua entre los dientes…)») enlaza a la lección
  de ese sonido, como el «📘 Ver en Gramática» de las correcciones (§5.4).
- **Contenido fijo en JSON** dentro de la app (sin red, sin coste), como Gramática. Gemini no hace falta para la
  sección; Azure solo para puntuar lo que dices.
- **Limitación honesta:** la voz del teléfono pronuncia **palabras**, no sonidos sueltos. El MVP enseña cada sonido
  dentro de palabras (que es como lo hacen BBC y Rachel's English en la práctica) y deja los audios de sonidos
  aislados como opción posterior, con su coste (§6.3).
- **Versión propuesta:** función visible → MINOR. MVP en la **5.13 «Sonidos»** (tras 5.11 «Motivación» y 5.12
  «Juntos»), o en la 5.12 si el dueño prefiere adelantarla, porque no tiene decisiones abiertas de arquitectura (§10).

---

## 1. Qué hay ya en la app (y qué hay que corregir)

| Pieza | Estado | Qué aporta a «Sonidos» |
|---|---|---|
| `pronunciation.ts` (Azure REST, en-US, `Granularity: 'Phoneme'`, `PhonemeAlphabet: 'IPA'`) | 5.8 → 5.10.1 | Nota por palabra y por **fonema en IPA**. `weakWords()` ya escoge el fonema más flojo y `soundTipEs()` da un consejo en español (22 sonidos en `SOUND_TIPS`, más s + consonante y -ed). |
| `PronunciationView.tsx` | 5.10.1 | Chips de «palabras a cuidar» con ▶ y `/fonema/`. Es donde irá el enlace «🔊 Ver en Sonidos». |
| `tts.ts` | 5.10.1 | `toggleSpeak()` (▶/⏸ por clave), voz del profe (Emma en-US / Leo en-GB), `toggleSpeakSpanish()` que lee el español con voz española **y las palabras inglesas con voz inglesa**: perfecto para que la mascota explique «pon la lengua como en *think*». |
| Gramática (5.10) | hecha | Modelo de todo: JSON por sección + validador, pila de pantallas, ejercicios `choice/gap/order`, «Dilo tú», progreso en Dexie, tarjetas al Repaso, enlace desde la corrección. |
| `Turn.pronunciation` en Dexie | 5.8 | Cada turno con Azure guarda el `PronResult`: se puede saber **qué sonidos te fallan más** sin gastar nada (§5.5). |

**Tres cosas a corregir de paso** (encontradas al leer el código):

1. **El consejo de /θ/ dice «como la "z" de España».** La app usa español neutro latinoamericano (decisión de la
   5.10.1) y para un latinoamericano esa pista no sirve. Mejor: «la punta de la lengua entre los dientes y sopla, sin
   voz». Lo mismo con /ð/: la pista buena para todos es «la d suave de "nada"».
2. **Dos fuentes de texto para el mismo sonido.** `SOUND_TIPS` (en el código) y las fichas de «Sonidos» (en JSON)
   dirían lo mismo con palabras distintas. Propuesta: `SOUND_TIPS` se genera desde el campo `tipShortEs` del JSON.
3. **Azure puede decir qué sonido hiciste en lugar del correcto** (`NBestPhonemeCount`, «spoken phoneme», solo en-US)
   y hoy no se pide. Con eso la app puede decir «dijiste /s/ en vez de /θ/: *sink* en vez de *think*», que es el
   mensaje más útil de toda la sección (§6.2).

---

## 2. Cómo lo hacen otros (y qué tomamos)

| Referencia | Qué hace | Qué tomamos |
|---|---|---|
| **Adrian Underhill, *Sound Foundations* y su tabla fonémica** (Macmillan; versiones británica y americana) | Tabla de 44 sonidos ordenada por **posición en la boca**: vocales en filas (de cerrada a abierta) y columnas (de delante a atrás), diptongos aparte, consonantes en **pares sordo/sonoro**. La usa como «dictado visual»: el profe toca símbolos y el alumno dice el sonido. Insiste en **sentir los músculos** (labios, lengua, mandíbula, voz) antes que memorizar símbolos. | La tabla como pantalla principal, con su lógica física (§7.2). Explicar cada sonido por sus **4 «palancas»**: labios, lengua, mandíbula, voz. |
| **BBC Learning English, «The Sounds of English»** | ~44 vídeos cortos, uno por sonido, más pares que se confunden. | Una ficha por sonido + lecciones de **contraste** (pares), no de sonidos sueltos. |
| **Rachel's English** (inglés americano) | Muy centrada en el **americano real**: t suave (*flap*), l oscura, reducción, ritmo y enlace; trabaja con palabras y frases, no con sonidos aislados. | La unidad 7 «Acento americano» (t suave, l oscura, ritmo). Enseñar el sonido **en palabra**. |
| **Sounds American / Cambridge (inventario de North American English)** | Inventario americano: 6 oclusivas, 9 fricativas, 2 africadas, 3 nasales, 4 aproximantes + flap, y unas 13 vocales (más diptongos). | El inventario de 40 de `inventario-fonemas.md`, y explicar que «44» es la cuenta británica. |
| **Cambridge English Pronouncing Dictionary** (Jones; ed. Roach, Setter, Esling) | Referencia de transcripciones británica y americana. | Convención de símbolos (/iː/, /uː/, /ɝ/, /ɚ/) y para resolver dudas de transcripción. |
| **ELSA Speak** | Reconocimiento propio que marca **el fonema** que falló con colores, con modelo visual y de audio. Según reseñas, solo inglés americano. | El color por sonido ya lo hace Habla con Azure. Tomamos el «te salió *esto* en vez de *aquello*». |
| **BoldVoice** | Vídeos de coaches de acento, **diagramas de la boca**, análisis sonido a sonido y plan diario según una evaluación inicial (*SpeechScan*). | El «Para ti» a partir de lo que ya mide Azure en tus clases (sin evaluación nueva). Diagramas sencillos, en fase 2. |
| **Duolingo / Speak** | Reconocimiento de palabra con feedback poco detallado; Duolingo tiene cursos de letras/sonidos para principiantes. | Lo contrario de lo que queremos: un aprobado/suspenso por palabra no enseña. Aun así, su formato de **micro-lecciones** (5 min) sí. |
| **Investigación**: Jenkins (núcleo de inglés como lengua franca), Munro & Derwing (carga funcional), Swan & Smith (*Learner English*) | Lo que **más afecta a que te entiendan**: consonantes (salvo /θ ð/ y l oscura), aspiración de p t k, no comerse consonantes en grupos, **longitud de vocales** (*live/leave*), acento principal de la frase. Los errores en contrastes de mucha «carga funcional» dañan más la comprensión. | El **orden de la ruta** (§4): primero lo que más estorba para ser entendido; /θ ð/ y la l oscura después, aunque sean «famosos». |

---

## 3. Inventario (resumen)

Tabla completa, con articulación en español, ejemplos por posición, grafías, comparación con el español, pares mínimos
y notas británicas: **`docs/fonemas/inventario-fonemas.md`**. En resumen:

- **15 vocales y diptongos + /ɚ/:** /iː ɪ ɛ æ ɑ ɔ ʊ uː ʌ ə ɝ ɚ/ y /eɪ aɪ ɔɪ aʊ oʊ/. Las «vocales con r» (*here, hair, car,
  more, tour*) son vocal + /ɹ/.
- **24 consonantes:** /p b t d k ɡ f v θ ð s z ʃ ʒ h tʃ dʒ m n ŋ l ɹ w j/.
- **Rasgos del americano:** t suave [ɾ] (*water*), t cortada [ʔ] (*button*), l oscura [ɫ] (*feel*), aspiración (*pen*).
- **Temas transversales:** s + consonante (*Spain*), consonantes finales, -s/-es, -ed, acento de palabra, ritmo y
  formas débiles, entonación.
- **Abecedario** en 7 familias por sonido (A H J K · B C D E G P T V Z · F L M N S X · I Y · O · Q U W · R).

**Americano o británico.** La app es en-US (Azure solo evalúa en-US con fonemas), pero el profe Leo habla en-GB. En
«Sonidos» **la voz es siempre la americana** (la de Emma, o la voz en-US que elija el usuario), aunque el profe sea
Leo: si no, *hot* o *teacher* sonarían distinto de lo que dice la ficha. Cada ficha con diferencia relevante lleva una
línea «En británico…» y, opcionalmente, un ▶ con la voz en-GB para comparar (fase 2).

---

## 4. Dificultades de los hispanohablantes, priorizadas

Prioridad = cuánto **estorba para que te entiendan** (núcleo de lengua franca y carga funcional) × cuánto **falla de
verdad** un hispanohablante (Swan & Smith, IH Journal, Pronunciation Studio, estudios de vocales). Para cada una, la
lección de la ruta y unos pares (más en el inventario).

| Prio. | Dificultad | Por qué | Pares mínimos / ejemplos | Lección |
|---|---|---|---|---|
| **P1** | /ɪ/ – /iː/ | 5 vocales españolas frente a ~15; la «i» corta es el error vocálico más frecuente. Longitud = núcleo LFC. | *ship/sheep, sit/seat, fill/feel, chip/cheap, hit/heat* | V1 |
| **P1** | /æ/ – /ʌ/ – /ɑ/ | Las tres se vuelven la «a» española: *cat, cut, cot* iguales. | *cat/cut/cot, cap/cup/cop, hat/hut/hot, bag/bug* | V3a, V3b |
| **P1** | /b/ – /v/ | En español son el mismo sonido; persiste hasta niveles altos. | *berry/very, boat/vote, ban/van, best/vest* | C1 |
| **P1** | s + consonante (*e-Spain*) | Inserción de vocal: cambia sílabas y ritmo. | *Spain, school, study, speak, star, small* | E1 |
| **P1** | -ed y -s finales; consonantes finales | Comerse consonantes en grupos es de lo que más daña (LFC); además se pierde la gramática (*I work* / *I worked*). | *worked /t/, played /d/, wanted /ɪd/; cats /s/, dogs /z/, buses /ɪz/; bet/bed* | E4, E3, E2 |
| **P1** | Schwa /ə/ y reducción | Sin vocales débiles el inglés suena «silabeado» y se entiende peor a velocidad normal. | *about, banana, problem; can /kən/, to /tə/, for /fɚ/* | V4, P2 |
| **P1** | Acento de palabra | Cognados con el acento del español (*chocolate, comfortable, vegetable, development*). | *PHOtograph / phoTOgraphy; REcord / reCORD* | P1 |
| **P2** | /z/ (frente a /s/) | No existe como fonema; *is, was, music* con /s/. | *zip/sip, eyes/ice, prize/price, lose/loose, peas/peace* | C3 |
| **P2** | /eɪ/ y /oʊ/ (diptongos «perdidos») | Se dicen «e» y «o» secas: *late* → *let*, *won't* → *want*. | *wait/wet, sale/sell, paper/pepper; won't/want, coat/caught* | D1, D2 |
| **P2** | La r americana /ɹ/ y /ɝ ɚ/ | La r española (golpe o vibrante) suena muy extranjera; *work* dicho «uork» suena *walk*. | *right/light, work/walk, heard/hard, first/fast* | R1, R2 |
| **P2** | /ʃ/ – /tʃ/ | /ʃ/ no existe en el español estándar: *ship* → *chip*. | *ship/chip, share/chair, wash/watch, cash/catch* | C4 |
| **P2** | /dʒ/ – /j/ | *yes* → *Jess*, *job* con jota española, *year* → *ear*. | *jet/yet, Jess/yes, joke/yolk, major/mayor, year/ear* | C5a |
| **P2** | /h/ | Muda en español o raspada como la j. | *hair/air, heat/eat, hold/old, hand/and* | C5b |
| **P2** | Aspiración de p, t, k | Sin soplo, *pear* suena *bear*, *tie* suena *die* (LFC). | *pear/bear, pea/bee, cold/gold* | C7 |
| **P2** | /ʊ/ – /uː/ | Igual que /ɪ/–/iː/, menos frecuente. | *full/fool, pull/pool, look/Luke* | V2 |
| **P2** | /w/ sin «g» | *would* → «güud», *woman* → «guoman». | *wood/good, west/vest* | C5c |
| **P3** | /ŋ/ y -ing | Existe en español (*tengo*), pero se cambia por /n/ o se añade /ɡ/. | *sing/sin, thing/thin, wing/win* | C6 |
| **P3** | /θ/ y /ð/ | Famosos, pero **no** imprescindibles para ser entendido (LFC). /ð/ sí existe en español (*nada*). | *think/sink/tink, three/tree, they/day, then/den* | C2a, C2b |
| **P3** | t suave, l oscura | Acento americano natural; no impide entender. | *water, better, city; feel, milk, people* | F1, F2 |
| **P3** | /ʒ/ | Poco frecuente; los rioplatenses ya la tienen. | *measure, usual, vision* | (en C4) |
| **P3** | Ritmo y entonación | Importante para sonar natural; difícil de puntuar (Azure da prosodia global). | formas débiles, enlace, preguntas ↗/↘ | P2, P3 |

---

## 5. Organización: ruta de clases

### 5.1 Unidades
| Unidad | Lecciones | Nivel |
|---|---|---|
| 0 · Empezar | S0 «Por qué el inglés no se lee como se escribe» | A1 |
| 1 · El abecedario | A1 letras /eɪ/ e /iː/ · A2 letras /ɛ/, /aɪ/, /oʊ/, /uː/, /ɑɹ/ · A3 deletrear | A1 |
| 2 · Vocales que cambian el significado | V1 /ɪ/–/iː/ · V2 /ʊ/–/uː/ · V3a /æ/–/ʌ/ · V3b /ɑ/ (la «o» que suena «a») · V4 la schwa | A1–A2 |
| 3 · Consonantes que el español no tiene | C1 /b/–/v/ · C2a /θ/ · C2b /ð/ · C3 /s/–/z/ · C4 /ʃ/–/tʃ/ (y /ʒ/) · C5a /dʒ/–/j/ · C5b /h/ · C5c /w/ · C6 /n/–/ŋ/ · C7 p t k con soplo | A1–A2 |
| 4 · Finales | E1 s + consonante · E2 consonantes finales y grupos · E3 -s/-es · E4 -ed | A1–A2 |
| 5 · Diptongos | D1 /eɪ/–/ɛ/ · D2 /oʊ/–/ɔ/–/ɑ/ · D3 /aɪ aʊ ɔɪ/ y trampas de grafía | A1–A2 |
| 6 · La r americana | R1 /ɹ/ · R2 /ɝ/, /ɚ/ y vocales con r | A2 |
| 7 · Acento americano | F1 t suave · F2 l oscura · P1 acento de palabra · P2 ritmo y formas débiles · P3 entonación | B1 |
| Repasos | RV1 (tras la 8), RV2 (tras la 16), RV3 (tras la 24), RV4 (tras la 33): mezclan los pares de las anteriores | — |

### 5.2 Orden recomendado (ruta)
Ordenado por prioridad (§4), **alternando vocales y consonantes** para no cansar y con el abecedario al principio:

| # | Lección | # | Lección | # | Lección |
|---|---|---|---|---|---|
| 1 | S0 Empezar | 12 | C3 /s/–/z/ | 23 | C7 p t k con soplo |
| 2 | A1 Letras (1) | 13 | V4 La schwa | 24 | C6 /n/–/ŋ/ |
| 3 | A2 Letras (2) | 14 | D1 /eɪ/–/ɛ/ | — | **RV3** |
| 4 | A3 Deletrear | 15 | D2 /oʊ/–/ɔ/–/ɑ/ | 25 | E2 Consonantes finales |
| 5 | V1 /ɪ/–/iː/ | 16 | R1 La r americana | 26 | C2a /θ/ |
| 6 | C1 /b/–/v/ | — | **RV2** | 27 | C2b /ð/ |
| 7 | E1 s + consonante | 17 | R2 /ɝ/, /ɚ/ y vocales con r | 28 | D3 Diptongos fáciles |
| 8 | V3a /æ/–/ʌ/ | 18 | C4 /ʃ/–/tʃ/ (y /ʒ/) | 29 | F1 t suave |
| — | **RV1** | 19 | C5a /dʒ/–/j/ | 30 | F2 l oscura |
| 9 | V3b /ɑ/ (la «o» que suena «a») | 20 | C5b /h/ | 31 | P1 Acento de palabra |
| 10 | E4 -ed | 21 | C5c /w/ | 32 | P2 Ritmo y formas débiles |
| 11 | E3 -s/-es | 22 | V2 /ʊ/–/uː/ | 33 | P3 Entonación |
| | | | | — | **RV4** |

En total: **33 lecciones + 4 repasos** (unas 4 h de práctica guiada). La ruta **sugiere**, no obliga: la tabla deja
abrir cualquier sonido, y el «Para ti» puede adelantar una lección (§5.5).

### 5.3 Una clase (5–10 min)
1. **Explícame (1–2 min):** la mascota cuenta el gesto (labios, lengua, mandíbula, voz) en 2–3 frases, con ▶ de la
   palabra clave a velocidad normal y lenta (`rate` 0,6). Debajo, «En español se parece a…» y el error típico.
2. **Escucha (2 min):** 8 rondas de «¿cuál dijo?»: suena una palabra de un par mínimo y eliges entre dos (o tres).
   Al fallar: «Era *sheep*: la "i" larga» y ▶ de las dos.
3. **Clasifica (1 min):** 6 palabras en dos columnas por su sonido (o «¿cuál es la intrusa?»). Entrena la **grafía**.
4. **Dilo tú (2–3 min):** 5 palabras + 2 pares + 1 frase. Con Azure: nota del sonido en cada palabra y «te salió /s/»;
   sin Azure: **Escúchate** (grabas, oyes tu versión y la del modelo, alternando) y te autoevalúas.
5. **Cierre:** resumen, estado del sonido (nuevo → visto → practicado → **dominado**), tarjetas al Repaso. El tiempo
   hablado suma a la meta diaria y a la racha (`addPracticeSeconds`, como Gramática).

**Dominado** = ≥ 85 % en «Escucha» **y** (con Azure) nota del sonido objetivo ≥ 80 en 4 de 5 palabras, en dos días
distintos. Sin Azure basta «Escucha» ≥ 85 % en dos días (y se indica que es solo de oído).

### 5.4 Enlace desde la fonética de Azure (como el 📘 de Gramática)
- **En la nota de pronunciación** (`PronunciationView`): debajo de «Cuida «think» (…)», una línea
  **«🔊 Practicar el sonido /θ/ en Sonidos»** para el sonido más flojo con lección (uno solo, para no llenar la tarjeta
  en 320×640). Tocarla abre la ficha /θ/ encima de la clase, como el «Ver en Gramática» (la clase no se pierde).
- **Cómo se elige la lección:** cada fonema del JSON lleva `azure: ["θ"]`. Mapa inverso símbolo → id. Casos especiales
  que ya detecta `soundTipEs()`: s + consonante → `E1`, -ed con sílaba de más → `E4`; omisión → sin enlace.
- **En el informe de la clase:** «Para practicar en Sonidos: /ɪ/ · /v/ · -ed» con los sonidos más flojos de la sesión.
- **En el Repaso y en Gramática «Dilo tú»**: mismo enlace (usan `PronunciationView`).

### 5.5 «Para ti» (sin coste)
- **Con Azure:** media de la nota por fonema en los turnos de los últimos 30 días (`Turn.pronunciation`), solo fonemas
  con ≥ 5 apariciones y sin palabras de función (como `weakWords()`). Los 3 más flojos no dominados salen arriba de la
  tabla con ⚠ y se marcan en la tabla.
- **Sin Azure:** la lista P1 de §4 (lo típico de un hispanohablante).

### 5.6 Encaje con el plan de 12 semanas y con la política de niveles
- El plan lo genera Gemini por semanas (`plan.ts`) y **no se toca** su esquema. En la tarjeta de la lección del día
  aparece, **opcional**, «🔊 Calentamiento: 2 min de /ɪ/» con el sonido de la semana (siguiente de la ruta o el más
  flojo del «Para ti»).
- **Política de niveles intacta:** «Sonidos» no cambia el nivel ni cuenta para el re-test (las lecciones solo
  proponen; solo el re-test cambia el nivel). Solo suma tiempo de práctica.
- **Clase centrada en un sonido** (fase 2): igual que «Practicar en una clase» de Gramática, con `classFocusEn`
  («Use many everyday words with /θ/… If the student says /t/ or /s/, model the word»). Azure puntúa como siempre.

---

## 6. Ejercicios y cómo hacerlos con lo que ya hay

### 6.1 Tipos de ejercicio
| Tipo (`type`) | Qué hace el alumno | Con qué | Coste | Limitaciones |
|---|---|---|---|---|
| `listen-choose` | Oye una palabra y elige cuál de un par mínimo fue | TTS del teléfono | 0 | La voz varía según el teléfono (en el A11 puede haber solo voces «local»). **Homógrafos prohibidos** (*live, read, close*…): el validador los rechaza. |
| `odd-one-out` | ¿Cuál tiene otro sonido? (*sit, seat, fill, bit*) | TTS al tocar | 0 | — |
| `sort` | Arrastra o toca para clasificar palabras en 2–3 columnas por sonido | sin audio (▶ opcional) | 0 | En 320×640, como máximo 6 palabras y 2 columnas; usar toques, no arrastrar. |
| `say-word` | Dice 5 palabras; nota del sonido objetivo | **Azure** (`assessWord`, §6.2) o **Escúchate** | Azure: ~2 s de audio por palabra | Sin Azure no hay nota (ver §6.4). |
| `say-pair` | Dice las dos palabras del par: ¿se distinguen? | Azure: compara la nota del fonema en cada una | ~4 s | Azure puntúa cada palabra contra su referencia: si dices *ship* dos veces, *sheep* saldrá con /iː/ flojo. Funciona. |
| `say-sentence` | Una frase o trabalenguas («Three thin thieves thought…») | Azure (frase con referencia) | ~5 s | Trabalenguas solo en B1; frases cortas en A1–A2. |
| `spell-listen` | La voz deletrea (*G-A-R-C-I-A*), el alumno escribe | TTS letra a letra con pausas | 0 | **A probar en F0**: una «A» sola puede leerse /ə/. Solución: tabla `ttsText` por letra («A.» o «ay») validada en el POCO y el A11. |
| `spell-say` | El alumno deletrea en voz alta su nombre o correo | **Gemini** (transcribe las letras: es contenido, no pronunciación) | 1 petición | Azure no sirve bien para letras sueltas. Gemini puede «arreglar» lo que oye: pedir la secuencia literal con temperatura 0. |
| `stress-tap` | Toca la sílaba fuerte (*pho-TO-gra-phy*) | TTS + toque | 0 | Azure no dice dónde pusiste el acento: solo se entrena el oído. |
| `twister` | Trabalenguas lento → normal | TTS (`rate`) + Azure opcional | ~5 s | — |

### 6.2 Puntuar con Azure (si hay clave)
- **Función nueva `assessWord(word)`** en `pronunciation.ts`: **una sola** evaluación con texto de referencia (la
  palabra o frase es conocida; no hace falta la pasada «sin referencia» de las clases → **la mitad de coste**),
  `EnableMiscue: false`, y **`NBestPhonemeCount: 5`** para saber qué sonido salió de verdad.
- **Mensaje:** «/θ/ 45 · te salió /s/ (*sink*)» cuando el fonema más probable dicho no es el esperado. Es el feedback
  que ELSA convirtió en su producto; Azure ya lo da en en-US.
- **Coste:** en F0 (5 h/mes = 18 000 s) y ~2 s por palabra → **unas 9 000 palabras al mes**; una clase con 12
  grabaciones gasta ~30 s → ~600 clases al mes. Cabe de sobra; la política F0/S0 y cuota agotada de `phonetics.ts` se
  aplica igual.
- **Detalles técnicos:** añadir ~300 ms de silencio antes y después (palabras sueltas muy cortas), y cortar la
  grabación al soltar (no 60 s).
- **Riesgos reales:** (a) Azure puntúa con cierta **generosidad** las palabras sueltas y hay quejas públicas de
  imprecisión a nivel de fonema; (b) los símbolos exactos (`ɚ` frente a `ɝ`, `ɡ` frente a `g`) hay que verlos en
  respuestas reales. **Por eso F0** (§10): el dueño graba 20 palabras bien y mal a propósito (*think* como *sink*,
  *very* como *berry*, *ship* como *sheep*) y se mide si la nota del fonema baja de verdad y si el «te salió /x/» acierta.
  Con eso se fijan los umbrales (hoy `weakWords()` usa < 70).

### 6.3 La voz: qué puede y qué no
- **La voz del teléfono NO pronuncia fonemas aislados de forma fiable.** «θ» o «/θ/» se leen como el nombre del símbolo
  o se omiten; «th» se lee como letras. `SSML <phoneme>` existe en Google Cloud TTS, pero en el motor de Android es
  inconsistente y el plugin `@capacitor-community/text-to-speech` pasa texto plano: **descartado**.
- **Sí pronuncia bien palabras y frases reales**, a varias velocidades. Por eso el MVP enseña **cada sonido en
  palabras** (palabra clave lenta, pares mínimos) y la mascota describe el gesto. Para los sonidos continuos se puede
  escribir la palabra «estirada» y que el alumno la imite (*sssun*, *zzzoo*, *shhh*): la voz **no** la dirá bien.
- **Opciones para tener sonidos aislados** (decisión del dueño, fase 3):

| Opción | Qué da | Calidad | Tamaño en el APK (hoy 2,1 MB) | Coste | Licencia | Veredicto |
|---|---|---|---|---|---|---|
| A. Sin audios propios (MVP) | Palabras con la voz del teléfono | Buena en el POCO; por comprobar en el A11 | 0 | 0 | — | **MVP** |
| B. Wikimedia Commons (grabaciones IPA de Denelson83 y otros, ~0,6 s, ~13 KB `.ogg`) | Sonidos **aislados** del AFI general | Correctos como AFI, no siempre como americano (/æ/, /ɑ/, /ɹ/ americanos, diptongos y /ɝ/ no están o difieren); voces distintas | ~40 × 13 KB ≈ **0,5 MB** (+25 %) | 0 | **CC BY-SA 3.0 o GFDL** por archivo: atribución (autor, licencia, enlace) en «Acerca de» y los audios siguen bajo esa licencia. Revisar archivo a archivo. | Solo consonantes continuas (f v θ ð s z ʃ ʒ m n ŋ l h) y vocales cercanas; no como única fuente |
| C. Gemini TTS en el PC, una vez (script del desarrollador) | Palabras con **una voz US uniforme** para todos los teléfonos | Alta; los sonidos aislados siguen sin ser fiables (el modelo lee el texto «tal cual», el estilo controla tono y ritmo, no la pronunciación) | ~3 KB por palabra en Opus 24 kbps: pares mínimos (~250 palabras) ≈ **0,75 MB**; todo (~600) ≈ **1,8 MB** (casi duplica el APK) | Tokens de salida de pago (modelos TTS sin capa gratis clara) | Términos de Google para el contenido generado | Solo si el A11 lee mal los pares |
| D. Gemini TTS en el teléfono, bajo demanda + caché en IndexedDB | Lo mismo, sin pesar en el APK | Alta | 0 | Cuota y clave del usuario; necesita red; latencia | Igual | Alternativa a C para teléfonos con voces pobres |
| E. Grabar a una persona nativa (con permiso escrito) | Sonidos aislados + palabras clave, con su gesto | **La mejor** | 40 sonidos + 40 palabras ≈ 0,8 MB | Tiempo o dinero | Propia | Ideal si el dueño tiene a alguien |

Recomendación: **A** en el MVP; en F0 escuchar los pares en el A11; si fallan, **D** (sin peso en el APK) o **C** solo
para los pares. **B/E** solo si el dueño quiere de verdad el «sonido suelto» del reel.

### 6.4 Sin Azure: qué hacer (crítico)
- **El reconocedor de Android no puntúa fonemas** (y Habla no lo usa; añadirlo sería un plugin nativo nuevo, que el
  internet lento desaconseja). Descartado.
- **Gemini como juez de pronunciación es débil:** `docs/decisiones.md` ya lo dice: entiende lo que quisiste decir
  aunque lo pronuncies mal. Un modo «aproximado» posible: mandar el audio con una **elección forzada** («¿Dijo *ship*
  o *sheep*? Responde solo la palabra que suena, aunque no tenga sentido»), temperatura 0, y **las 5 palabras de una
  clase en una sola petición** (cuota diaria). **Solo se activa si en F0 acierta ≥ 80 % con las grabaciones del dueño**;
  si no, no se ofrece. Se etiqueta siempre «aproximado».
- **Siempre disponible y gratis: «Escúchate».** Grabar, oír tu versión y la del modelo alternadas (A-B-A-B). Es la
  técnica clásica de toma de conciencia (Underhill); no da nota, pero enseña. La mascota lo explica la primera vez.

---

## 7. Interfaz

### 7.1 Dónde va
| Opción | A favor | En contra |
|---|---|---|
| **Cuarta pestaña del Inicio: «Sonidos»** (recomendada) | Se encuentra; la tabla necesita su propia pantalla; ejercicios distintos de Gramática; mismo patrón de panel con scroll propio. | Cuatro segmentos en 320 px: hay que **ocultar los números** de los segmentos por debajo de 360 px (Temas · Prácticas · Gramática · Sonidos caben en ~275 px sin números). |
| Una sección más dentro de Gramática | Cero cambios en el Inicio; reutiliza buscador y pila. | La pronunciación no es gramática; la tabla quedaría a 2 toques; las fichas no encajan en el formato de tema. |
| Dentro de Palabras (barra inferior) | Relaciona sonido y vocabulario. | Poco visible; Palabras ya es una lista larga. |

Se reutiliza de Gramática: la **pila de pantallas** (tabla → ficha → lección), el Atrás, el `InfiniteList`, el patrón
`MascotPage` de la primera vez y las piezas de ejercicio de `GrammarExercises`.

### 7.2 Tabla fonémica (estilo Underhill, para el móvil)
Vocales por posición en la boca (columnas: delante → atrás; filas: cerrada → abierta), diptongos en una fila, y
consonantes en **pares sordo | sonoro** (como Underhill). Cada celda: símbolo grande y, si cabe, la palabra clave.
Estado por color de borde (nuevo · visto · practicado · dominado) y punto ⚠ si es un sonido flojo tuyo (§5.5).

**Vertical (390×844 y 320×640)** — dentro del panel con scroll propio, sin scroll en el Inicio:
```
 [ Temas | Prácticas | Gramática | Sonidos ]
 ⭐ Para ti: /ɪ/ ship · /v/ very · -ed          ← o «Sigue la ruta: 6. b y v ›»
 [ 🛤 Ruta 5/33 ]  [ 🔤 Abecedario ]
 VOCALES                     delante → atrás
 ┌────┬────┬────┬────┐
 │ iː │ ɪ  │ ʊ  │ uː │  cerrada
 │sheep│ship│book│food│
 ├────┼────┼────┼────┤
 │ ɛ  │ ə  │ɝ ɚ │ ɔ  │
 ├────┼────┼────┼────┤
 │ æ  │ ʌ  │ ɑ  │ +r │  abierta   (+r = vocales con r)
 └────┴────┴────┴────┘
 DIPTONGOS  │ eɪ │ aɪ │ ɔɪ │ aʊ │ oʊ │
 CONSONANTES       sorda|sonora
 │ p  b │ t  d │ tʃ dʒ│ k  ɡ │
 │ f  v │ θ  ð │ s  z │ ʃ  ʒ │
 │ m  n │ ŋ  h │ l  ɹ │ w  j │
```
En 320 px: 4 columnas de vocales de ~68 px (símbolo + palabra) y 8 de consonantes de ~36 px (solo símbolo; la palabra
en la ficha). Alto total ≈ 8 filas × 40 px + títulos ≈ 380 px: cabe en el panel; si no, scroll **dentro** del panel.

**Horizontal (780×360)** — barra lateral de pestañas a la izquierda (como hoy), vocales y consonantes **lado a lado**,
sin scroll (celdas de 40–44 px: vocales 4×4 ≈ 180 px de alto; consonantes 8×3 ≈ 135 px).

Tocar una celda abre la **ficha** (pantalla de la pila, como un tema de Gramática):
```
 ‹  /θ/  think ▶  🐢▶                      [Practicar 6 min]
 🫧 Gota: «Saca un poquito la punta de la lengua entre los dientes y sopla, sin voz.»   ▶ (lee con toggleSpeakSpanish)
 👄 labios: sueltos   👅 lengua: entre los dientes   🔇 sin voz     [diagrama · fase 2]
 En español: no existe en Latinoamérica (en España, la «z» de «zapato»). Error típico: tink, sink.
 Al principio: think ▶ three ▶ · En medio: nothing ▶ · Al final: math ▶ both ▶
 Se escribe: th
 Pares: think/sink ▶▶ · three/tree ▶▶ · mouth/mouse ▶▶
 En británico: igual.
 [ Dilo tú ]
```

### 7.3 La mascota
- **Primera vez** (`MascotPage`, como Gramática): «El español tiene 5 vocales; el inglés, unas 15. Aquí aprendes a
  oírlas y a decirlas. Empieza por el abecedario o toca cualquier sonido.»
- **En cada ficha y lección** explica el gesto en 1–2 frases (`MascotSays`, `.tip-bubble`), y se puede escuchar con
  `toggleSpeakSpanish()`: el español con voz española y las palabras inglesas con la voz americana.
- **Al fallar** en «Escucha»: explica la diferencia en una línea. **Al dominar** un sonido: celebra (enlaza con los
  hitos de la 5.11 «Motivación»).

### 7.4 Diagrama de la boca: sí, pero sencillo y en fase 2
- Un diagrama malo confunde más que ayuda, y dibujar 40 perfiles bien es mucho trabajo. **MVP: tres pictogramas por
  sonido** (labios: estirados / neutros / redondos; lengua: dónde toca, en texto corto; voz: vibra / no vibra) y la
  explicación de la mascota.
- **Fase 2: 8 perfiles SVG** (corte lateral de la boca, ~1–2 KB cada uno), uno por **lugar** de articulación y
  compartidos por todas las consonantes de ese lugar: labios (p b m), labio-dientes (f v), entre dientes (θ ð),
  encías (t d s z n l), detrás de las encías (ʃ ʒ tʃ dʒ), r americana (ɹ), velo (k ɡ ŋ), garganta (h). Para las vocales,
  una **vista de frente** con 3 aperturas × 3 formas de labios. Con los colores del tema (`var(--acc)`), en claro y
  oscuro, sin animación.

---

## 8. Formato del contenido (contrato entre autores y desarrollo)

Archivos en `src/sounds/`, UTF-8, 2 espacios, comprobados por `node scripts/validate-sounds.mjs`:
- `phonemes.json`: las 41 fichas (40 sonidos + /ɚ/) y las fichas de rasgos (`F1`, `F2`, `E1`…) como `kind: "feature"`.
- `alphabet.json`: las 26 letras y sus familias.
- `lessons.json`: la ruta (lecciones y repasos) con sus ejercicios.

Textos en **español neutro latinoamericano** con «tú» (mismas reglas que `FORMATO-contenido.md` de Gramática);
palabras y frases en **inglés americano**. Estimación de tamaño: ~250 KB en total (Gramática ocupa 688 KB).

### 8.1 Ficha de sonido
| Campo | Regla |
|---|---|
| `id` | ARPAbet en minúsculas (`ih`, `th`, `axr`…), único. Para rasgos: `flap`, `dark-l`, `s-cluster`, `ed`, `s-ending`… |
| `ipa` | Símbolo que se enseña (/iː/, /uː/ con «ː»). |
| `azure` | Lista de símbolos que puede devolver Azure para él (`["i"]`, `["ɚ","ɝ"]`). Vacía en rasgos sin símbolo. |
| `kind` | `vowel` · `diphthong` · `consonant` · `feature`. |
| `chart` | `{ "block": "vowels" \| "diphthongs" \| "consonants", "row": n, "col": n }` (posición en la tabla, §7.2). |
| `keyword` | Palabra clave (frecuente, sin homógrafos). |
| `nameEs` | Nombre en español sencillo («i corta», «th sorda»). |
| `level` · `difficulty` · `priority` | `A1`–`B1` · `1`–`3` · `P1`–`P3` (§4). |
| `voiced` | `true`/`false` (consonantes); `null` en vocales. |
| `articulation` | `{ "lips": "spread"\|"neutral"\|"rounded", "jaw": "close"\|"mid"\|"open", "place": "…", "lipsEs", "tongueEs", "voiceEs" }`: frases cortas (≤ 120 car.). |
| `tipShortEs` | El consejo de una línea (≤ 90 car.) que usa la nota de Azure (`SOUND_TIPS` sale de aquí). |
| `explanationEs` | 1–3 párrafos (≤ 300 car.) que dice la mascota. |
| `spanishEs` | Comparación con el español, pensando en varios países (no solo España). |
| `mistakeEs` | El error típico del hispanohablante. |
| `spellings` | `[{ "pattern": "i", "examples": ["sit", "big"] }]`, de más a menos frecuente. |
| `examples` | `{ "initial": [], "medial": [], "final": [] }`, 2–4 palabras cada una; `[]` si no existe en esa posición (y se dice en `positionNoteEs`). |
| `minimalPairs` | `[{ "with": "<id>", "pairs": [["ship","sheep"], …] }]`: la primera palabra lleva **este** sonido; 4–8 pares por contraste. |
| `sentences` | 1–3 frases cortas `{ "en", "es" }` con muchas apariciones del sonido. |
| `ukNoteEs` | Opcional: diferencia con el británico. |
| `related` | Ids de otras fichas. |

### 8.2 Lección
| Campo | Regla |
|---|---|
| `id` · `order` · `unit` | `V1`, `C2a`…; orden en la ruta; unidad 0–7 o `review`. |
| `titleEs` · `level` · `minutes` | 5–10 min. |
| `phonemes` | Ids de las fichas que trabaja (la primera es la principal). |
| `introEs` | Lo que dice la mascota al empezar (≤ 300 car.). |
| `exercises` | Lista de ejercicios con los tipos de §6.1; ids `<lección>-<n>`. |
| `classFocusEn` | Para la clase centrada en el sonido (fase 2). |

### 8.3 Ejemplo completo: /ɪ/ y /θ/ con sus lecciones
```json
{
  "phonemes": [
    {
      "id": "ih",
      "ipa": "ɪ",
      "azure": ["ɪ"],
      "kind": "vowel",
      "chart": { "block": "vowels", "row": 1, "col": 2 },
      "keyword": "ship",
      "nameEs": "i corta",
      "level": "A1",
      "difficulty": 3,
      "priority": "P1",
      "voiced": null,
      "articulation": {
        "lips": "neutral",
        "jaw": "close",
        "place": "front",
        "lipsEs": "Labios relajados, sin sonreír.",
        "tongueEs": "La lengua un poco más baja y más atrás que para la «i».",
        "voiceEs": "Corta: no la estires."
      },
      "tipShortEs": "«i» corta y relajada, casi «e»: ship, no sheep",
      "explanationEs": [
        "Es una «i» floja y corta. Prepara la boca para decir «i» y relaja todo: los labios, la lengua y la mandíbula. Te sale un sonido entre «i» y «e».",
        "Si la dices larga y tensa, como en español, el americano oye otra palabra: ship (barco) se vuelve sheep (oveja)."
      ],
      "spanishEs": "No existe en español. Truco: di una «e» con la boca casi de «i».",
      "mistakeEs": "Decir la «i» española, larga y tensa: «I liv hir» en vez de I live here.",
      "spellings": [
        { "pattern": "i", "examples": ["sit", "big", "this"] },
        { "pattern": "y", "examples": ["gym", "system"] },
        { "pattern": "u", "examples": ["busy"] },
        { "pattern": "o", "examples": ["women"] },
        { "pattern": "ui", "examples": ["build"] }
      ],
      "examples": {
        "initial": ["it", "is", "in", "if"],
        "medial": ["sit", "big", "busy", "minute"],
        "final": []
      },
      "positionNoteEs": "Al final de palabra (happy, city) se oye una «i» más tensa: /i/.",
      "minimalPairs": [
        { "with": "iy", "pairs": [["ship", "sheep"], ["sit", "seat"], ["fill", "feel"], ["hit", "heat"], ["bit", "beat"], ["chip", "cheap"], ["it", "eat"], ["grin", "green"]] },
        { "with": "eh", "pairs": [["pin", "pen"], ["sit", "set"], ["bit", "bet"], ["lift", "left"]] }
      ],
      "sentences": [
        { "en": "This is a big ship.", "es": "Este es un barco grande." },
        { "en": "Is it in the kitchen?", "es": "¿Está en la cocina?" }
      ],
      "ukNoteEs": "Igual en británico.",
      "related": ["iy", "eh", "ax"]
    },
    {
      "id": "th",
      "ipa": "θ",
      "azure": ["θ"],
      "kind": "consonant",
      "chart": { "block": "consonants", "row": 1, "col": 3 },
      "keyword": "think",
      "nameEs": "th sorda",
      "level": "A2",
      "difficulty": 3,
      "priority": "P3",
      "voiced": false,
      "articulation": {
        "lips": "neutral",
        "jaw": "mid",
        "place": "dental",
        "lipsEs": "Labios sueltos, un poco abiertos.",
        "tongueEs": "La punta de la lengua asoma entre los dientes de arriba y de abajo.",
        "voiceEs": "Sin voz: solo aire. Se puede alargar."
      },
      "tipShortEs": "punta de la lengua entre los dientes y sopla, sin voz: think",
      "explanationEs": [
        "Saca un poquito la punta de la lengua entre los dientes y sopla aire, sin que vibre la garganta. La lengua no se mueve mientras suena: puedes alargarlo.",
        "Si la lengua golpea, te sale «t» (tink); si se queda detrás de los dientes, «s» (sink)."
      ],
      "spanishEs": "En Latinoamérica no existe. En España es la «z» o la «c» de «zapato» y «cielo».",
      "mistakeEs": "Cambiarla por «t» (tank por thank), por «s» (sink por think) o por «f» (free por three).",
      "spellings": [{ "pattern": "th", "examples": ["think", "math", "nothing"] }],
      "examples": {
        "initial": ["think", "three", "thank"],
        "medial": ["nothing", "birthday", "method"],
        "final": ["math", "both", "mouth", "teeth"]
      },
      "minimalPairs": [
        { "with": "s", "pairs": [["think", "sink"], ["thick", "sick"], ["thing", "sing"], ["mouth", "mouse"], ["path", "pass"], ["faith", "face"]] },
        { "with": "t", "pairs": [["three", "tree"], ["thank", "tank"], ["thought", "taught"], ["through", "true"], ["both", "boat"]] },
        { "with": "f", "pairs": [["three", "free"], ["thought", "fought"], ["death", "deaf"]] }
      ],
      "sentences": [
        { "en": "I think it's Thursday.", "es": "Creo que es jueves." },
        { "en": "Thank you for the three books.", "es": "Gracias por los tres libros." }
      ],
      "ukNoteEs": "Igual en británico (en Londres a veces se oye «f»: free por three).",
      "related": ["dh", "s", "t", "f"]
    }
  ],
  "lessons": [
    {
      "id": "V1",
      "order": 5,
      "unit": 2,
      "titleEs": "Ship o sheep: la «i» corta y la «i» larga",
      "level": "A1",
      "minutes": 7,
      "phonemes": ["ih", "iy"],
      "introEs": "En inglés hay dos «i»: una corta y floja (ship) y otra larga y tensa (sheep). Si las mezclas, cambias la palabra. Vamos a oírlas y a decirlas.",
      "exercises": [
        { "id": "V1-1", "type": "listen-choose", "pairs": [["ship", "sheep"], ["sit", "seat"], ["fill", "feel"], ["chip", "cheap"], ["hit", "heat"], ["bit", "beat"], ["it", "eat"], ["grin", "green"]], "rounds": 8 },
        { "id": "V1-2", "type": "sort", "columns": ["ih", "iy"], "words": [["big", "ih"], ["green", "iy"], ["sit", "ih"], ["team", "iy"], ["busy", "ih"], ["field", "iy"]] },
        { "id": "V1-3", "type": "odd-one-out", "words": ["fish", "this", "sheep", "milk"], "answer": 2, "whyEs": "Sheep lleva la «i» larga; las otras, la corta." },
        { "id": "V1-4", "type": "say-word", "target": "ih", "words": ["ship", "sit", "big", "this", "busy"] },
        { "id": "V1-5", "type": "say-pair", "pairs": [["ship", "sheep"], ["fill", "feel"]] },
        { "id": "V1-6", "type": "say-sentence", "en": "This is a big ship.", "es": "Este es un barco grande.", "targets": ["ih"] }
      ],
      "classFocusEn": "Practise the contrast /ɪ/–/iː/ (ship/sheep, live/leave). Use many everyday words with both vowels and model the word when the student merges them."
    },
    {
      "id": "C2a",
      "order": 26,
      "unit": 3,
      "titleEs": "Think, no tink ni sink: la th sorda",
      "level": "A2",
      "minutes": 7,
      "phonemes": ["th", "s", "t"],
      "introEs": "La th de think no existe en el español de Latinoamérica. Es fácil de hacer si sacas un poquito la lengua. Vamos a distinguirla de la «t» y de la «s».",
      "exercises": [
        { "id": "C2a-1", "type": "listen-choose", "pairs": [["think", "sink"], ["three", "tree"], ["thank", "tank"], ["mouth", "mouse"], ["thick", "sick"], ["both", "boat"], ["path", "pass"], ["thought", "taught"]], "rounds": 8 },
        { "id": "C2a-2", "type": "sort", "columns": ["th", "t"], "words": [["three", "th"], ["tree", "t"], ["math", "th"], ["mat", "t"], ["thank", "th"], ["tank", "t"]] },
        { "id": "C2a-3", "type": "say-word", "target": "th", "words": ["think", "three", "thank", "math", "birthday"] },
        { "id": "C2a-4", "type": "say-pair", "pairs": [["think", "sink"], ["three", "tree"]] },
        { "id": "C2a-5", "type": "say-sentence", "en": "I think it's Thursday.", "es": "Creo que es jueves.", "targets": ["th"] }
      ],
      "classFocusEn": "Practise /θ/ in everyday words (think, three, thank, Thursday, birthday, math). If the student says /t/, /s/ or /f/, model the word with the tongue between the teeth."
    }
  ]
}
```
(En los archivos reales, `phonemes` y `lessons` van en archivos separados; aquí juntos para el ejemplo.)

### 8.4 Validador mínimo (`scripts/validate-sounds.mjs`)
Sin dependencias, como `validate-grammar.mjs`. Comprueba formato, referencias y lo que más falla al escribir este
contenido: **homógrafos que la voz lee mal** y **pares que no son pares**. Si existe `scripts/data/cmudict.dict`
(CMU Pronouncing Dictionary, licencia tipo BSD, ~3,6 MB, **solo en el PC, nunca en el APK**), además verifica que cada
ejemplo contiene el sonido y que cada par se diferencia solo en él.

```js
// node scripts/validate-sounds.mjs — valida src/sounds/*.json (formato: docs/fonemas/DISENO-fonemas.md §8).
import { readFileSync, existsSync } from 'node:fs'

const read = (f) => JSON.parse(readFileSync(new URL(`../src/sounds/${f}`, import.meta.url), 'utf8'))
const { phonemes } = read('phonemes.json')
const { lessons } = read('lessons.json')
const errors = []
const err = (where, msg) => errors.push(`${where}: ${msg}`)

// La voz del teléfono no sabe cuál de las dos lecturas usar: prohibidos sueltos en lo que suena.
const HOMOGRAPHS = new Set(['live', 'read', 'lead', 'wind', 'tear', 'close', 'bow', 'row', 'wound', 'minute', 'object', 'present', 'record', 'use', 'does', 'bass', 'dove', 'sow', 'desert', 'content', 'permit', 'produce', 'refuse', 'invalid', 'polish'])
const IPA = new Set('iː ɪ ɛ æ ɑ ɔ ʊ uː ʌ ə ɝ ɚ eɪ aɪ ɔɪ aʊ oʊ p b t d k ɡ f v θ ð s z ʃ ʒ h tʃ dʒ m n ŋ l ɹ w j'.split(' '))
const AZURE = new Set('i ɪ ɛ æ ɑ ɔ ʊ u ʌ ə ɝ ɚ eɪ aɪ ɔɪ aʊ oʊ p b t d k ɡ g f v θ ð s z ʃ ʒ h tʃ dʒ m n ŋ l ɹ w j'.split(' '))
const LEVELS = new Set(['A1', 'A2', 'B1', 'B2'])
const TYPES = new Set(['listen-choose', 'odd-one-out', 'sort', 'say-word', 'say-pair', 'say-sentence', 'spell-listen', 'spell-say', 'stress-tap', 'twister'])

const ids = new Set()
for (const p of phonemes) {
  const w = `fonema ${p.id}`
  if (!/^[a-z][a-z0-9-]*$/.test(p.id ?? '')) err(w, 'id no válido')
  if (ids.has(p.id)) err(w, 'id repetido')
  ids.add(p.id)
  if (p.kind !== 'feature' && !IPA.has(p.ipa)) err(w, `IPA desconocido «${p.ipa}»`)
  for (const a of p.azure ?? []) if (!AZURE.has(a)) err(w, `símbolo de Azure desconocido «${a}»`)
  if (!LEVELS.has(p.level)) err(w, 'level no válido')
  if (!p.tipShortEs || p.tipShortEs.length > 90) err(w, 'tipShortEs vacío o de más de 90 caracteres')
  for (const t of p.explanationEs ?? []) if (t.length > 300) err(w, 'párrafo de explicación de más de 300 caracteres')
  if (p.kind !== 'feature') {
    const ex = p.examples ?? {}
    const total = ['initial', 'medial', 'final'].reduce((n, k) => n + (ex[k]?.length ?? 0), 0)
    if (total < 4) err(w, 'menos de 4 ejemplos')
    for (const k of ['initial', 'medial', 'final']) if ((ex[k]?.length ?? 0) === 0 && !p.positionNoteEs && p.kind === 'vowel' && k !== 'final') err(w, `sin ejemplos «${k}» y sin positionNoteEs`)
  }
  for (const mp of p.minimalPairs ?? []) {
    if (mp.pairs.length < 3) err(w, `menos de 3 pares con ${mp.with}`)
    for (const [a, b] of mp.pairs) {
      if (!a || !b || a === b) err(w, `par no válido ${a}/${b}`)
      for (const x of [a, b]) if (HOMOGRAPHS.has(x.toLowerCase())) err(w, `homógrafo «${x}» en un par: la voz puede leerlo mal`)
    }
  }
}
// Referencias cruzadas (después de leer todos los ids).
for (const p of phonemes) {
  for (const r of p.related ?? []) if (!ids.has(r)) err(`fonema ${p.id}`, `related desconocido ${r}`)
  for (const mp of p.minimalPairs ?? []) if (!ids.has(mp.with)) err(`fonema ${p.id}`, `par con fonema desconocido ${mp.with}`)
}
// Un símbolo de Azure lleva a una sola ficha (si no, el enlace «Practicar el sonido» sería ambiguo).
// Única excepción: /ɝ/ y /ɚ/ (er, axr) pueden compartir «ɝ»; el enlace va entonces a la lección R2, común a las dos.
const SHARED = new Set(['er', 'axr'])
const azureOwner = new Map()
for (const p of phonemes) for (const a of p.azure ?? []) {
  const owner = azureOwner.get(a)
  if (owner && !(SHARED.has(owner) && SHARED.has(p.id))) err(`fonema ${p.id}`, `símbolo ${a} ya es de ${owner}`)
  if (!owner) azureOwner.set(a, p.id)
}

const lessonIds = new Set()
for (const l of lessons) {
  const w = `lección ${l.id}`
  if (lessonIds.has(l.id)) err(w, 'id repetido')
  lessonIds.add(l.id)
  if (!(l.minutes >= 3 && l.minutes <= 10)) err(w, 'minutes fuera de 3–10')
  for (const ph of l.phonemes ?? []) if (!ids.has(ph)) err(w, `fonema desconocido ${ph}`)
  const exIds = new Set()
  for (const e of l.exercises ?? []) {
    if (!TYPES.has(e.type)) err(w, `tipo desconocido ${e.type}`)
    if (!e.id?.startsWith(`${l.id}-`) || exIds.has(e.id)) err(w, `id de ejercicio no válido ${e.id}`)
    exIds.add(e.id)
    const spoken = [...(e.pairs ?? []).flat(), ...(e.words ?? []).map((x) => (Array.isArray(x) ? x[0] : x))]
    for (const x of spoken) if (typeof x === 'string' && HOMOGRAPHS.has(x.toLowerCase())) err(w, `${e.id}: homógrafo «${x}»`)
    if (e.target && !ids.has(e.target)) err(w, `${e.id}: target desconocido ${e.target}`)
    if (e.type === 'odd-one-out' && !(e.answer >= 0 && e.answer < e.words.length)) err(w, `${e.id}: answer fuera de rango`)
    if (e.type === 'sort') for (const [, col] of e.words) if (!e.columns.includes(col)) err(w, `${e.id}: columna ${col} no está en columns`)
  }
}
const orders = lessons.map((l) => l.order)
if (new Set(orders).size !== orders.length) err('lecciones', 'order repetido')

// Opcional: comprobación con CMUdict (ARPAbet). ah1/ah2 = /ʌ/, ah0 = /ə/; er1/er2 = /ɝ/, er0 = /ɚ/.
const dictPath = new URL('./data/cmudict.dict', import.meta.url)
if (existsSync(dictPath)) {
  const dict = new Map()
  for (const line of readFileSync(dictPath, 'utf8').split('\n')) {
    // Formato de cmusphinx/cmudict: «ship SH IH1 P» (variantes «word(2)», comentarios con «#»).
    const [word, ...ph] = line.replace(/#.*/, '').trim().split(/\s+/)
    if (word && !word.includes('(')) dict.set(word.toLowerCase(), ph.map((x) => x.toLowerCase()))
  }
  const arpa = (id) => (id === 'ax' ? ['ah0'] : id === 'ah' ? ['ah1', 'ah2'] : id === 'axr' ? ['er0'] : id === 'er' ? ['er1', 'er2'] : [id])
  const has = (word, id) => (dict.get(word.toLowerCase()) ?? []).some((ph) => arpa(id).some((a) => ph === a || ph.replace(/\d$/, '') === a))
  for (const p of phonemes) {
    if (p.kind === 'feature') continue
    for (const k of ['initial', 'medial', 'final']) for (const x of p.examples?.[k] ?? []) {
      if (!dict.has(x.toLowerCase())) console.warn(`aviso: «${x}» no está en CMUdict`)
      else if (!has(x, p.id)) err(`fonema ${p.id}`, `«${x}» no contiene el sonido según CMUdict`)
    }
    for (const mp of p.minimalPairs ?? []) for (const [a, b] of mp.pairs) {
      if (dict.has(a.toLowerCase()) && !has(a, p.id)) err(`fonema ${p.id}`, `par ${a}/${b}: «${a}» no lleva el sonido`)
      if (dict.has(b.toLowerCase()) && !has(b, mp.with)) err(`fonema ${p.id}`, `par ${a}/${b}: «${b}» no lleva ${mp.with}`)
    }
  }
} else console.warn('aviso: sin scripts/data/cmudict.dict, no se comprueban las transcripciones')

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\n${errors.length} errores`)
  process.exit(1)
}
console.log(`OK: ${phonemes.length} fichas, ${lessons.length} lecciones`)
```
Notas: CMUdict refleja el americano general; marca /ɑ/ y /ɔ/ por separado aunque muchos hablantes los fundan, y en
algunas palabras (*dog*, *on*) da una sola variante: los avisos se revisan a mano. El validador también debería
comprobar el **abecedario** (26 letras, una familia cada una) y que ningún ejemplo repita frases del banco del test.

---

## 9. Datos y almacenamiento
- **Contenido:** `src/sounds/*.json` (sin red, sin coste). Un sonido o lección nueva = editar el JSON.
- **Progreso:** tabla nueva de Dexie `sounds` (id → visto, aciertos de escucha, mejor nota de Azure, días practicados,
  dominado, último uso). La migración solo añade; entra en las **copias de seguridad como opcional** (las copias
  antiguas sin ella se aceptan), como la tabla `grammar` de la 5.10.
- **Repaso (fase 2):** tarjetas `source: 'sounds'` de tipo «¿cuál oyes?» con los pares fallados (FSRS).
- **Ajustes:** `soundsIntroSeen` en `Settings` y `DEFAULTS`.
- **`pronunciation.ts`:** `assessWord()` con `NBestPhonemeCount`, lectura de `NBestPhonemes`, y `SOUND_TIPS` generado
  desde `tipShortEs`.

---

## 10. Plan de entrega, esfuerzo y riesgos

### 10.1 Fases
| Fase | Qué | Esfuerzo (días de trabajo con agentes, como Gramática) | Versión |
|---|---|---|---|
| **F0 · Prueba de viabilidad** (sin entrega) | En el POCO y, si el dueño lo autoriza, en el A11: (1) la voz en-US lee bien 40 pares mínimos y las 26 letras sueltas; (2) `assessWord` con 20 palabras bien y mal dichas por el dueño: ¿baja la nota del fonema?, ¿acierta «te salió /x/»?, símbolos reales de Azure; (3) Gemini con elección forzada sobre esas grabaciones (¿≥ 80 %?). Resultado: umbrales y decisiones de §6.3–6.4 por escrito. | 1–2 | — (en una rama) |
| **F1 · MVP «Sonidos»** | Pestaña, intro de la mascota, **tabla fonémica** (vertical, horizontal, 320×640), **41 fichas** (inventario → JSON), **abecedario** (A1–A3 con dictado de deletreo), **12 lecciones** de la ruta (S0, A1–A3, V1, C1, E1, V3a, V3b, E4, E3, C2a), ejercicios `listen-choose`, `sort`, `odd-one-out`, `say-word`, `say-pair`, `spell-listen`; Azure `assessWord` + «Escúchate»; enlace desde `PronunciationView`; Dexie + copias; validador + pruebas (`npm test`: mapa Azure → ficha, «dominado», migración y copia). | Contenido 2–3 + revisión 1 + código 5–6 = **8–10** | **5.13** (o 5.12) |
| **F2 · Ruta completa** | Las 21 lecciones restantes + 4 repasos, «Para ti» desde el historial de Azure, informe de la clase, calentamiento en el plan, Repaso, clase centrada en un sonido, diagramas SVG, `stress-tap`, `twister`, `spell-say`. | 6–8 | 5.14 |
| **F3 · Opcional** | Audios propios (opciones B–E de §6.3), comparar con la voz británica, modo «aproximado» con Gemini si F0 lo aprobó, ritmo y entonación con prosodia de Azure. | 2–5 según lo elegido | 5.15+ |

**Por qué la 5.13 y no antes:** la hoja de ruta acordada el 2026-10-20 es 5.10.1 → 5.11 «Motivación» → 5.12 «Juntos».
«Sonidos» no depende de ellas. **Alternativa razonable:** cambiarla por la 5.12, porque «Juntos» tiene decisiones de
arquitectura abiertas (qué se comparte, servidor sí o no) y «Sonidos» no; F0 se puede hacer ya, en paralelo.

### 10.2 Riesgos
| Riesgo | Severidad | Mitigación |
|---|---|---|
| **Errores de fonética en el contenido** (un par que no es par, un ejemplo con otro sonido) | Alta: enseña mal | Validador con CMUdict + revisor de contenido (profesor de fonética para hispanohablantes) como en Gramática. |
| **El dueño espera oír cada sonido suelto** (como en el reel) y el MVP no lo tiene | Media | Decirlo en la aprobación (§6.3); el MVP lo compensa con palabra clave lenta y explicación de la mascota; F3 con audios. |
| **La voz del A11 lee mal los pares o las letras** | Media | F0 lo mide; plan B: Gemini TTS bajo demanda con caché (D) o audios de pares en el APK (C, +0,75 MB). |
| **Azure puntúa mal palabras sueltas o con otros símbolos** | Media | F0 con grabaciones del dueño; umbrales calibrados; texto «nota orientativa». |
| **Sin Azure no hay nota** (la madre y las amistades probablemente no tienen clave) | Media | «Escucha» y «Clasifica» funcionan sin nada; «Escúchate» siempre; Gemini «aproximado» solo si F0 lo valida. |
| **Mezcla en-US / en-GB** (Leo dice *hot* con /ɒ/) | Baja | En «Sonidos», voz americana siempre; nota «En británico…». |
| **Espacio en 320×640 y 4 segmentos** | Baja | Números ocultos < 360 px; tabla con scroll dentro del panel; prueba en 320×640 y 780×360 como siempre. |
| **Licencias de audio** (CC BY-SA) | Baja | Solo si se eligen; atribución por archivo en «Acerca de». |
| **Consejos pensados para España** («z de España») | Baja | Regla de contenido: comparaciones válidas para Latinoamérica primero. |

### 10.3 Decisiones del dueño (2026-10-20)
- **Ubicación y nombre:** cuarta pestaña del Inicio, «Sonidos» (título «Sonidos del inglés»).
- **Acento:** inglés americano, con notas del británico.
- **Sonidos sueltos:** sí, con grabaciones de **Wikimedia Commons** (gratis; respetar la licencia y mostrar la atribución en Acerca de; +0,5 MB).
- **Versión:** **5.11**, junto con «Motivación» (la hoja de ruta queda: 5.10.1 correcciones → 5.11 Motivación + Sonidos → 5.12 Juntos).

### Preguntas que se hicieron al dueño
1. ¿Nombre «Sonidos» para la pestaña (título «Sonidos del inglés»)?
2. ¿Cuarta pestaña del Inicio (recomendado) o dentro de Gramática?
3. ¿Solo inglés americano, con notas del británico (recomendado)?
4. ¿Quieres sonidos sueltos (como el reel)? Si sí: ¿Wikimedia (gratis, licencia con atribución), Gemini TTS o grabar a
   una persona?
5. ¿5.13 (después de «Juntos») o la 5.12 en su lugar? ¿Hacemos ya la F0?

---

## 11. Fuentes
- Adrian Underhill, tabla fonémica interactiva (americana): https://www.onestopenglish.com/pronunciation/interactive-phonemic-chart-american-english/554313.article
- Underhill, tabla británica: https://www.onestopenglish.com/interactive-phonemic-chart-british-english/156649.article
- Macmillan, *Sounds: The Pronunciation App* (basada en *Sound Foundations*): https://www.onestopenglish.com/sounds-the-pronunciation-app/551162.article
- Macmillan, tablas fonémicas interactivas: https://www.macmillanenglish.com/pronunciation/interactive-phonemic-charts/
- Underhill, «Core activities for using the chart»: https://eltweekly.com/2010/11/75-article-core-activities-for-using-the-chart-to-integrate-pronunciation-by-adrian-underhill/
- BBC Learning English, «The Sounds of English» (descripción y lista): https://www.educa.jcyl.es/crol/es/repositorio-global/the-sounds-of-english · https://www.classcentral.com/course/youtube-the-sounds-of-english-53107 · https://www.phon.ucl.ac.uk/home/wells/blog0807.htm
- Rachel's English, t suave y l oscura: https://rachelsenglish.com/flap-t-really-d-sound/ · https://rachelsenglish.com/pronounce-little/ · libro *American English Pronunciation*: https://mhcc.pressbooks.pub/app/uploads/sites/42/2023/06/American-English-Pronunciation-Rachels-English.pdf
- Cambridge, «Sounds of North American English» (inventario): https://www.cambridge.org/highereducation/books/phonetics-and-speech-science/6D58417A84B7526A1637245CC3C7E7B5/sounds-of-north-american-english/2730B3361D95395DE690072D5EBAD753
- Cambridge English Pronouncing Dictionary (Jones; ed. Roach, Setter, Esling): https://assets.cambridge.org/97805211/52532/frontmatter/9780521152532_frontmatter.pdf · https://www.cambridge.es/en/catalogue/dictionaries/monolingual/cepd
- Tablas IPA americanas (Loughborough): https://lbas.lboro.ac.uk/chart/english-consonant-sounds-chart.html
- Swan & Smith (eds.), *Learner English*, 2.ª ed., Cambridge University Press, 2001 (capítulo de hispanohablantes): https://libraries.escp.eu/doc/SYRACUSE/20102
- IH Journal, «Pronunciation for Spanish speakers»: https://ihworld.com/ih-journal/issues/issue-48/pronunciation-for-spanish-speakers
- Pronunciation Studio, «10 English Pronunciation Errors by Spanish Speakers»: https://pronunciationstudio.com/spanish-speakers-english-pronunciation-errors/
- Errores vocálicos de hispanohablantes (Revista de Lingüística Moderna): https://byzantion.uchile.cl/index.php/LM/article/download/45871/47895/162058
- /ʃ/, /ʒ/ y /v/ en hispanohablantes (Universitat Jaume I): https://repositori.uji.es/xmlui/handle/10234/176580
- Jenkins, núcleo de inglés como lengua franca (resumen, British Council): https://www.britishcouncil.org/voices-magazine/how-teach-english-lingua-franca-elf · https://user.keio.ac.jp/~rhotta/hellog/2022-06-17.html
- Munro & Derwing (2006), «The functional load principle in ESL pronunciation instruction», *System* 34: https://www.sfu.ca/~mjmunro/articles-and-chapters.html · revisión: https://frontiersin.org/journals/communication/articles/10.3389/fcomm.2021.627378/full
- Microsoft, Pronunciation Assessment (IPA, sílabas y «spoken phoneme» solo en en-US, `NBestPhonemeCount`, límite de 30 s en REST): https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
- Microsoft, juego de fonemas SAPI de inglés americano: https://documentation.help/Microsoft-Speech-Platform-SDK-11/English_Phoneme.htm
- Microsoft Q&A, fonemas de la evaluación: https://learn.microsoft.com/en-us/answers/a/602956 · imprecisiones reportadas: https://learn.microsoft.com/en-in/answers/questions/5707709/azure-speech-pronunciation-assessment-word-and-pho
- Google, generación de voz con Gemini (modelos TTS, WAV 24 kHz, el texto se lee literal): https://ai.google.dev/gemini-api/docs/speech-generation · precios: https://ai.google.dev/gemini-api/docs/pricing
- SSML `<phoneme>` en Android (soporte inconsistente): https://b4x.com/android/forum/threads/providing-text-to-speech-with-phonetic-input.37939 · https://community.appinventor.mit.edu/t/text-to-speech-and-texts-containing-words-of-a-different-language-from-the-base-language/69557
- Wikimedia Commons, ejemplo de grabación IPA (/ɪ/, CC BY-SA 3.0 o GFDL, 0,6 s, 13 KB): https://commons.wikimedia.org/wiki/File:Near-close_near-front_unrounded_vowel.ogg
- ELSA Speak (reseñas): https://fluentu.com/blog/english/elsa-speak-review · https://www.alllanguageresources.com/elsa-speak/
- BoldVoice: https://apps.apple.com/app/id1567841142 · https://boldvoice.com/blog/boldvoice-app-guide/
- Duolingo frente a ELSA (comparativa, fuente comercial): https://www.talkdrill.com/blog/compare/duolingo-vs-elsa-speak/
- CMU Pronouncing Dictionary: https://github.com/cmusphinx/cmudict
- Reel que inspiró la idea (no consultable sin cuenta): https://www.instagram.com/reel/DenIef3B8mf/
