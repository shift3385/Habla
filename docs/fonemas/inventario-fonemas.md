# Inventario de sonidos del inglés americano (General American) para hispanohablantes

Fecha: 2026-10-20. Autor: diseño de la sección «Sonidos» (ver `DISENO-fonemas.md`). Estado: **borrador para revisar**.

Este documento es la **materia prima del contenido**: cada ficha tiene los campos del JSON propuesto en
`DISENO-fonemas.md` §8 (`id`, `ipa`, `azure`, `keyword`, ejemplos por posición, grafías, articulación, comparación con
el español, pares mínimos, nota británica, dificultad y nivel). Al pasarla a JSON, los textos de articulación se pueden
copiar tal cual (ya están en español neutro latinoamericano, con «tú»).

## Cómo leer las fichas

- **`id`**: código ARPAbet en minúsculas (el de CMUdict y del alfabeto SAPI de Microsoft). Sirve de id del sonido en
  el JSON y permite comprobar los ejemplos contra CMUdict (`DISENO-fonemas.md` §8.4). Ojo: en ARPAbet `ah` es /ʌ/
  (*cup*) y `ax` es la schwa /ə/ (*about*).
- **`ipa`**: símbolo que se enseña. Para las vocales largas se enseña /iː/ y /uː/ (como los diccionarios de Cambridge
  y Oxford), pero **Azure devuelve `i` y `u`** sin «ː» (ya lo anota `pronunciation.ts`).
- **`azure`**: símbolo que devuelve Azure Pronunciation Assessment en en-US con `PhonemeAlphabet: 'IPA'`. Está
  deducido del juego SAPI de Microsoft y de lo que ya maneja `SOUND_TIPS`; **hay que confirmarlo con respuestas reales**
  (fase 0 del plan), sobre todo `ɚ` frente a `ɝ` y `ɔ` frente a `ɑ`.
- **Ejemplos**: inicial · en medio · final. «—» significa que el sonido no aparece en esa posición en inglés (p. ej.
  /ŋ/ nunca va al principio, /h/ nunca va al final). Las palabras elegidas son frecuentes (A1–B1).
- **Dificultad** para un hispanohablante: **1** = existe en español casi igual · **2** = existe algo parecido o solo
  como variante · **3** = no existe y cambia el significado.
- **Nivel**: cuándo conviene la lección (MCER orientativo).
- **Pares mínimos**: dos palabras que solo se diferencian en ese sonido. **Evitados a propósito** los homógrafos que
  la voz del teléfono puede leer de dos formas (*live*, *read*, *lead*, *close*, *use*…): ver la lista negra en
  `DISENO-fonemas.md` §8.4. Cuando un par necesita uno (*live/leave*), se marca con ⚠ y se lee en frase («to live»).
- **UK**: diferencia con el británico estándar (RP / SSB) solo cuando ayuda; la app mezcla voces en-US (Emma) y
  en-GB (Leo).

## Resumen: 40 sonidos (15 vocales + 24 consonantes + la schwa con r)

El famoso «44 sonidos» es la cuenta del **británico** (12 vocales + 8 diptongos + 24 consonantes). En americano no hay
los diptongos centrales /ɪə eə ʊə/ (se dicen vocal + r: *here* /hɪɹ/, *hair* /hɛɹ/, *tour* /tʊɹ/) ni la /ɒ/ de *hot*, y
la r se pronuncia siempre. Por eso aquí salen 40, más los **rasgos del acento americano** (t suave, l oscura, etc.),
que se enseñan aparte.

| # | id | IPA | Azure | Palabra clave | Tipo | Dif. | Nivel | Lección (ruta) |
|---|---|---|---|---|---|---|---|---|
| 1 | `iy` | iː | i | sheep | vocal larga | 2 | A1 | V1 |
| 2 | `ih` | ɪ | ɪ | ship | vocal corta | 3 | A1 | V1 |
| 3 | `eh` | ɛ | ɛ | bed | vocal corta | 1 | A1 | V4 / D1 |
| 4 | `ae` | æ | æ | cat | vocal corta | 3 | A1 | V3 |
| 5 | `aa` | ɑ | ɑ | hot, father | vocal | 2 | A1 | V3 |
| 6 | `ao` | ɔ | ɔ | law, thought | vocal | 2 | A2 | D2 |
| 7 | `uh` | ʊ | ʊ | book | vocal corta | 3 | A2 | V2 |
| 8 | `uw` | uː | u | food | vocal larga | 2 | A1 | V2 |
| 9 | `ah` | ʌ | ʌ | cup | vocal corta | 3 | A1 | V3 |
| 10 | `ax` | ə | ə | about (schwa) | vocal débil | 3 | A2 | V4 |
| 11 | `er` | ɝ | ɝ | bird | vocal con r | 3 | A2 | R2 |
| 12 | `axr` | ɚ | ɚ (¿o ɝ?) | teacher | vocal débil con r | 3 | A2 | R2 |
| 13 | `ey` | eɪ | eɪ | day | diptongo | 2 | A1 | D1 |
| 14 | `ay` | aɪ | aɪ | my | diptongo | 1 | A1 | D3 |
| 15 | `oy` | ɔɪ | ɔɪ | boy | diptongo | 1 | A1 | D3 |
| 16 | `aw` | aʊ | aʊ | now | diptongo | 1 | A1 | D3 |
| 17 | `ow` | oʊ | oʊ | go | diptongo | 2 | A1 | D2 |
| 18 | `p` | p | p | pen | oclusiva sorda | 2 | A1 | C7 |
| 19 | `b` | b | b | bed | oclusiva sonora | 2 | A1 | C1 |
| 20 | `t` | t | t | top | oclusiva sorda | 2 | A1 | C7 / F1 |
| 21 | `d` | d | d | dog | oclusiva sonora | 2 | A1 | C2 |
| 22 | `k` | k | k | key | oclusiva sorda | 1 | A1 | C7 |
| 23 | `g` | ɡ | ɡ | go | oclusiva sonora | 1 | A1 | C7 |
| 24 | `f` | f | f | fish | fricativa sorda | 1 | A1 | C1 |
| 25 | `v` | v | v | very | fricativa sonora | 3 | A1 | C1 |
| 26 | `th` | θ | θ | think | fricativa sorda | 3 | A2 | C2 |
| 27 | `dh` | ð | ð | this | fricativa sonora | 2 | A2 | C2 |
| 28 | `s` | s | s | sun | fricativa sorda | 1 | A1 | C3 / E1 |
| 29 | `z` | z | z | zoo | fricativa sonora | 3 | A1 | C3 |
| 30 | `sh` | ʃ | ʃ | she | fricativa sorda | 3 | A2 | C4 |
| 31 | `zh` | ʒ | ʒ | measure | fricativa sonora | 2 | B1 | C4 |
| 32 | `hh` | h | h | house | fricativa (aire) | 2 | A1 | C5 |
| 33 | `ch` | tʃ | tʃ | chair | africada sorda | 1 | A1 | C4 |
| 34 | `jh` | dʒ | dʒ | job | africada sonora | 3 | A2 | C5 |
| 35 | `m` | m | m | man | nasal | 1 | A1 | E2 |
| 36 | `n` | n | n | no | nasal | 1 | A1 | C6 |
| 37 | `ng` | ŋ | ŋ | sing | nasal (atrás) | 2 | A2 | C6 |
| 38 | `l` | l | l | light, feel | lateral | 2 | A2 | F2 |
| 39 | `r` | ɹ | ɹ | red | aproximante | 3 | A1 | R1 |
| 40 | `w` | w | w | we | semivocal | 2 | A1 | C5 |
| 41 | `y` | j | j | yes | semivocal | 3 | A1 | C5 |

(41 filas: la 12, /ɚ/, es la versión débil de /ɝ/; muchos libros la cuentan como el mismo fonema.)

---

## 1. El abecedario (nombres de las letras en inglés americano)

Agrupado **por el sonido de la vocal del nombre**: así se aprende de memoria con 7 «familias» y se ven a la vez las
trampas del hispanohablante. La columna «suena como» es una ayuda escrita al estilo español, **no** una transcripción.

| Familia | Letras | IPA | Suena como | Trampa típica |
|---|---|---|---|---|
| /eɪ/ «ei» | A H J K | eɪ · eɪtʃ · dʒeɪ · keɪ | «ei», «eich», «yei», «kei» | **A** se dice «ei», no «a». **H** es «eich», no «hache». **J** es «yei» (con la y fuerte de /dʒ/), no «jota». |
| /iː/ «i» | B C D E G P T V Z | biː · siː · diː · iː · dʒiː · piː · tiː · viː · ziː | «bi», «si», «di», «i», «yi», «pi», «ti», «vi», «zi» | **E** se dice «i» (la trampa n.º 1: «E» e «I» van al revés). **G** es «yi», **J** es «yei»: se confunden entre sí. **B** y **V** se distinguen: «bi» con labios juntos, «vi» con el labio en los dientes. **Z** es «zi» en EE. UU. y «zed» en el Reino Unido. |
| /ɛ/ «e» | F L M N S X | ɛf · ɛl · ɛm · ɛn · ɛs · ɛks | «ef», «el», «em», «en», «es», «eks» | **M** termina con los labios cerrados; **N**, con la lengua arriba: al deletrear por teléfono se confunden. |
| /aɪ/ «ai» | I Y | aɪ · waɪ | «ai», «uai» | **I** se dice «ai», no «i». **Y** es «uai», no «i griega». |
| /oʊ/ «ou» | O | oʊ | «ou» | Es un diptongo: termina con los labios más cerrados («ou»), no «o» seca. En números de teléfono, el 0 se dice «oh». |
| /uː/ «iu» | Q U W | kjuː · juː · ˈdʌbəljuː | «kiu», «iu», «dábel-iu» | **U** es «iu», no «u». **W** es «double u» («dábel-iu», en habla rápida «dáb-ia»). |
| /ɑɹ/ «ar» | R | ɑɹ | «ar» con r americana | Sin vibrar la r: la lengua se recoge hacia atrás y no toca nada. |

### Para deletrear (clase A3)
- **Pedir y dar el deletreo:** «How do you spell that?», «Could you spell your last name, please?», «It's spelled…».
- **Letras dobles:** «double L», «double S», «double E» (*Mississippi*: «M, I, double S, I, double S, I, double P, I»).
- **Correos y webs:** «at» (@), «dot» (.), «dash» o «hyphen» (-), «underscore» (_), «slash» (/), «all lowercase»,
  «capital A» o «uppercase A». Ej.: «maria dot lopez at gmail dot com».
- **Aclarar una letra** (el alfabeto OTAN se oye mucho en EE. UU.): «B as in boy», «V as in Victor», «M as in Mike»,
  «N as in Nancy», «S as in Sam», «F as in Frank».
- **Números:** el 0 se dice «oh» en teléfonos («five-oh-two») y «zero» en lo demás.
- **Pares de letras que se confunden** (para el dictado): E/I · A/E · G/J · B/V · M/N · U/W · Y/I · H/A (la H es «eich», no «hache»).

---

## 2. Vocales

> Idea clave para la mascota: **el español tiene 5 vocales; el inglés americano, unas 15**. Donde tú tienes una «i»,
> el inglés tiene dos (*sheep* y *ship*); donde tienes una «a», tiene tres (*cat*, *cup*, *hot*). Además, casi todas
> las sílabas sin acento se convierten en una vocal floja, la **schwa**.

### `iy` · /iː/ · sheep — «i» larga y tensa
- **Azure:** `i` · **Tipo:** vocal larga, anterior, cerrada · **Dificultad:** 2 · **Nivel:** A1
- **Ejemplos:** inicial *eat, easy, each* · medio *sheep, team, field, people* · final *see, tea, key, me*
- **Grafías:** ee (*see*), ea (*tea*), e (*me, be*), e_e (*these*), ie (*field*), ey (*key*), i (*pizza, machine*)
- **Articulación:** labios estirados, como si sonrieras. La lengua, alta y adelante, **tensa**. Es más larga que la
  «i» española: estírala un poquito («shiiip»).
- **Comparada con el español:** la «i» de «sí», pero más larga y con más tensión.
- **Pares mínimos:** con /ɪ/: *sheep/ship, seat/sit, feel/fill, heat/hit, beat/bit, cheap/chip, leave/live ⚠, eat/it,
  peel/pill, green/grin*
- **Error típico:** se dice bien, pero también se usa en lugar de /ɪ/ (entonces *ship* suena *sheep*).
- **UK:** igual.

### `ih` · /ɪ/ · ship — «i» corta y relajada
- **Azure:** `ɪ` · **Tipo:** vocal corta, casi cerrada, anterior · **Dificultad:** 3 · **Nivel:** A1
- **Ejemplos:** inicial *it, is, in, if* · medio *sit, big, busy, women, gym, build, minute* · final — (al final de
  palabra se oye /i/: *happy*, *city*)
- **Grafías:** i (*sit*), y (*gym*), u (*busy*), o (*women*), ui (*build*), e (*pretty, English*)
- **Articulación:** como para decir «i», pero **relaja todo**: labios sueltos (sin sonrisa), la lengua baja un poco y
  se va algo hacia atrás, y la mandíbula se abre apenas. Es **corta**. Suena entre una «i» y una «e».
- **Comparada con el español:** no existe. Truco: «di una "e" con la boca casi de "i"».
- **Pares mínimos:** con /iː/: *ship/sheep, sit/seat, fill/feel, hit/heat, bit/beat, chip/cheap, it/eat, pill/peel,
  grin/green, live ⚠/leave* · con /ɛ/: *pin/pen, sit/set, bit/bet, will/well, did/dead, lift/left*
- **Error típico:** decir /iː/ («I liv hir» por *I live here*), o una «i» española tensa en *this, is, it*.
- **UK:** igual.

### `eh` · /ɛ/ · bed — «e» abierta
- **Azure:** `ɛ` · **Tipo:** vocal corta, media, anterior · **Dificultad:** 1 · **Nivel:** A1
- **Ejemplos:** inicial *egg, end, every, any* · medio *bed, head, said, friend, many* · final —
- **Grafías:** e (*bed*), ea (*head, bread*), ai (*said, again*), ie (*friend*), a (*any, many*)
- **Articulación:** como la «e» española, con la boca un poco más abierta. Labios relajados.
- **Comparada con el español:** la «e» de «pez». Casi igual.
- **Pares mínimos:** con /æ/: *bed/bad, pen/pan, men/man, set/sat, said/sad, head/had* · con /eɪ/: *wet/wait,
  sell/sale, let/late, get/gate, pepper/paper, test/taste* · con /ɪ/: *pen/pin, set/sit, well/will*
- **Error típico:** usarla en lugar de /æ/ (*man* suena *men*) o en lugar de /eɪ/ (*late* suena *let*).
- **UK:** la británica es algo más cerrada.

### `ae` · /æ/ · cat — entre «a» y «e», boca muy abierta
- **Azure:** `æ` · **Tipo:** vocal corta, abierta, anterior · **Dificultad:** 3 · **Nivel:** A1
- **Ejemplos:** inicial *apple, at, and, after, ask* · medio *cat, bag, man, black, laugh, class* · final —
- **Grafías:** a (*cat*), au (*laugh*), ai (*plaid*, raro)
- **Articulación:** abre mucho la boca (la mandíbula baja), la lengua va **abajo y adelante**, y estira un poco los
  labios. Es una «a» con la lengua en posición de «e». Las mejillas se tensan.
- **Comparada con el español:** no existe. Truco: «di "e" y abre la boca hasta que salga casi "a"».
- **Pares mínimos:** con /ʌ/: *cat/cut, cap/cup, bag/bug, ban/bun, match/much, bat/but, hat/hut* · con /ɑ/: *hat/hot,
  cap/cop, black/block, sack/sock, tap/top, map/mop* · con /ɛ/: *bad/bed, man/men, pan/pen, sad/said*
- **Error típico:** la «a» española para /æ/, /ʌ/ y /ɑ/ a la vez: *cat*, *cut* y *cot* suenan igual.
- **UK:** en *ask, after, bath, dance, can't, class* el británico dice /ɑː/; el americano, /æ/.

### `aa` · /ɑ/ · hot, father — «a» abierta y atrás
- **Azure:** `ɑ` · **Tipo:** vocal abierta, posterior · **Dificultad:** 2 · **Nivel:** A1
- **Ejemplos:** inicial *odd, on, October, honest* · medio *hot, stop, box, father, watch, want* · final *spa, bra*
- **Grafías:** o (*hot, stop*), a (*father, watch, want*), (h muda) o (*honest*)
- **Articulación:** boca muy abierta, labios relajados (sin redondear), la lengua **baja y atrás**, como cuando el
  médico te dice «di "aaa"».
- **Comparada con el español:** la «a» de «casa», pero más abierta y desde más atrás. La trampa es la grafía: en *hot*,
  *stop*, *box* se escribe **o** pero suena «a».
- **Pares mínimos:** con /æ/: *hot/hat, cop/cap, block/black, sock/sack, top/tap* · con /ʌ/: *cot/cut, shot/shut,
  not/nut, lock/luck, cop/cup* · con /oʊ/: *want/won't, cost/coast, not/note, rod/road, hop/hope*
- **Error típico:** decir «o» por la grafía (*hot* como «jot» con o española; el oyente americano oye otra vocal).
- **UK:** en *hot, stop, box, want* el británico tiene /ɒ/, una «o» corta y redonda. Con la voz de Leo (en-GB) estas
  palabras suenan distintas: en la lección se usa la voz en-US.

### `ao` · /ɔ/ · law, thought — «o» abierta (en muchas zonas, igual que /ɑ/)
- **Azure:** `ɔ` · **Tipo:** vocal abierta-media, posterior, redondeada · **Dificultad:** 2 · **Nivel:** A2
- **Ejemplos:** inicial *all, always, August, author* · medio *thought, caught, talk, walk, dog* · final *law, saw,
  draw, raw*
- **Grafías:** aw (*law*), au (*caught*), al (*talk, walk*), ough (*thought, bought*), o (*dog, long*, varía)
- **Articulación:** boca abierta y labios **un poco redondeados**, la lengua baja y atrás.
- **Comparada con el español:** una «o» muy abierta. **Importante:** muchos americanos (oeste, Canadá, jóvenes) ya no
  distinguen /ɔ/ de /ɑ/ (*caught* = *cot*). Si te sale una «a» abierta, se entiende. Lo que **sí** importa es no
  confundirla con /oʊ/.
- **Pares mínimos:** con /oʊ/: *law/low, saw/so, bought/boat, caught/coat, called/cold, walk/woke, ball/bowl* ·
  con /ɝ/: *walk/work, ward/word* (clásico: *I walk* / *I work*)
- **Error típico:** decir una «o» española en *walk* (suena entre *walk* y *woke*).
- **UK:** /ɔː/, más cerrada y larga, sin la fusión con /ɑ/.

### `uh` · /ʊ/ · book — «u» corta y relajada
- **Azure:** `ʊ` · **Tipo:** vocal corta, casi cerrada, posterior · **Dificultad:** 3 · **Nivel:** A2
- **Ejemplos:** inicial — · medio *book, good, put, could, woman, full, sugar* · final —
- **Grafías:** oo (*book, good*), u (*put, full*), ou (*could, would, should*), o (*woman*)
- **Articulación:** como «u» pero **suelta**: labios poco redondeados, lengua algo más baja y menos atrás. Corta.
- **Comparada con el español:** no existe; suena entre una «u» y una «o».
- **Pares mínimos:** con /uː/: *full/fool, pull/pool, look/Luke, could/cooed, wood/wooed, soot/suit*
- **Error típico:** decir una «u» larga y tensa (*full* suena *fool*, *pull* suena *pool*).
- **UK:** igual.

### `uw` · /uː/ · food — «u» larga y redonda
- **Azure:** `u` · **Tipo:** vocal larga, cerrada, posterior, redondeada · **Dificultad:** 2 · **Nivel:** A1
- **Ejemplos:** inicial *ooze, Uber* · medio *food, school, soup, fruit, move, rule* · final *too, two, blue, shoe, new,
  do*
- **Grafías:** oo (*food*), u_e (*rule*), ew (*new*), ue (*blue*), ou (*soup*), ui (*fruit*), o (*do, who, move*)
- **Articulación:** labios **muy redondos y hacia adelante**, como para dar un beso; lengua alta y atrás; larga.
- **Comparada con el español:** la «u» de «tú», más larga y con los labios más adelante.
- **Pares mínimos:** con /ʊ/: *fool/full, pool/pull, Luke/look, suit/soot*
- **Ojo:** muchas palabras con «u» llevan /juː/ (la semivocal + u): *use, music, cute, few, beautiful*.
- **UK:** igual; tras t, d, n el británico añade /j/: *new* /njuː/, *tune* /tjuːn/ (en EE. UU. /nu/, /tun/).

### `ah` · /ʌ/ · cup — «a» corta y relajada
- **Azure:** `ʌ` · **Tipo:** vocal corta, media-abierta, central · **Dificultad:** 3 · **Nivel:** A1
- **Ejemplos:** inicial *up, us, under, other, oven, onion* · medio *cup, bus, love, money, blood, young, does* ·
  final —
- **Grafías:** u (*cup, bus*), o (*love, money, come, son, month*), ou (*young, country, touch*), oo (*blood, flood*),
  oe (*does*)
- **Articulación:** boca medio abierta, labios relajados, la lengua en el centro, sin esfuerzo. Corta y seca, como
  un «ah» de sorpresa leve.
- **Comparada con el español:** una «a» corta y floja, con la boca menos abierta que la «a» española. La trampa es la
  grafía: *love, money, come, son* se escriben con **o** pero suenan «a».
- **Pares mínimos:** con /æ/: *cup/cap, cut/cat, bug/bag, bun/ban, much/match, but/bat* · con /ɑ/: *cut/cot, shut/shot,
  nut/not, luck/lock, duck/dock* · con /ʊ/: *luck/look, buck/book, tuck/took*
- **Error típico:** leer la «o» de *love*, *money*, *come*, *Monday* como una «o» española.
- **UK:** más abierta y adelantada; en el norte de Inglaterra no existe (se dice /ʊ/).

### `ax` · /ə/ · about — la schwa, la vocal floja
- **Azure:** `ə` · **Tipo:** vocal débil, central (solo en sílabas sin acento) · **Dificultad:** 3 · **Nivel:** A2
- **Ejemplos:** inicial *about, ago, again, America* · medio *banana, lemon, problem, family, today* · final *sofa,
  pizza, China, data*
- **Grafías:** **cualquier vocal** sin acento: a (*about, sofa*), e (*problem, taken*), o (*lemon, today*), u (*support*),
  i (*family*)
- **Articulación:** todo en reposo: boca entreabierta, lengua quieta en el medio, labios sueltos. **Muy corta y suave**,
  casi no suena. Es el sonido de dudar («eh…»), pero más corto.
- **Comparada con el español:** no existe. En español cada vocal suena entera aunque no lleve acento («ba-na-na»); en
  inglés, las vocales sin acento se aflojan: *banana* /bəˈnænə/ es «bə-NÆ-nə».
- **Pares:** no se trabaja con pares mínimos sino con **formas fuertes y débiles**: *can* /kæn/ ↔ /kən/ (*I can go*),
  *to* /tuː/ ↔ /tə/, *for* /fɔɹ/ ↔ /fɚ/, *and* ↔ /ən/, *of* ↔ /əv/, *a* ↔ /ə/, *was* ↔ /wəz/, y con familias de palabras:
  *PHOtograph* /ˈfoʊtəɡræf/ · *phoTOgraphy* /fəˈtɑɡrəfi/
- **Error típico:** pronunciar todas las vocales llenas: el inglés suena «silabeado» y cuesta entenderlo.
- **UK:** igual; además el británico usa /ə/ donde el americano dice /ɚ/ (*teacher* /ˈtiːtʃə/).

### `er` · /ɝ/ · bird — vocal con r (acentuada)
- **Azure:** `ɝ` · **Tipo:** vocal con r, central · **Dificultad:** 3 · **Nivel:** A2
- **Ejemplos:** inicial *early, earth, earn, urban* · medio *bird, work, learn, nurse, first, word, journey* · final
  *her, fur, sir, were, prefer*
- **Grafías:** ir (*bird*), er (*her*), ur (*nurse*), or tras w (*work, word, world*), ear (*learn, early*), our (*journey*)
- **Articulación:** la vocal **entera** es una r: recoge la lengua hacia atrás (o levanta la punta) **sin tocar nada**,
  labios un poco redondos, boca casi cerrada. No hay una vocal y luego una r: es un solo sonido.
- **Comparada con el español:** no existe. No digas «er» ni «ir» con la r vibrada.
- **Pares mínimos:** con /ɔ/: *work/walk, word/ward* · con /ɑɹ/: *heard/hard, fur/far, firm/farm, burn/barn* · con /ɛ/
  /ɛɹ/: *bird/bed, her/hair, were/where* · con /æ/: *first/fast, hurt/hat*
- **Error típico:** *work* dicho como «uork» suena *walk*; *first* como «ferst» con r vibrada.
- **UK:** /ɜː/, sin r: *bird* /bɜːd/.

### `axr` · /ɚ/ · teacher — schwa con r (sin acento)
- **Azure:** probablemente `ɚ` (puede venir como `ɝ`: confirmar) · **Tipo:** vocal débil con r · **Dificultad:** 3 ·
  **Nivel:** A2
- **Ejemplos:** inicial *perhaps* (/pɚˈhæps/) · medio *understand, afternoon, Saturday, different* · final *teacher,
  doctor, water, color, sugar, better*
- **Grafías:** er (*teacher*), or (*doctor*), ar (*sugar*), ure (*picture*), our (*color* en UK *colour*)
- **Articulación:** como /ɝ/ pero corta y floja, en sílaba sin acento.
- **Comparada con el español:** no existe. Trampa: decir «-or» o «-er» con vocal llena y r vibrada (*doctor* «dok-TOR»).
- **UK:** /ə/ sin r: *teacher* /ˈtiːtʃə/, *water* /ˈwɔːtə/.

### Vocales con r del americano (no son fonemas aparte: vocal + /ɹ/)
Se enseñan juntas en la lección R2 porque Azure las devuelve como vocal + `ɹ`, y en británico son vocales distintas.

| Secuencia | Ejemplos | UK |
|---|---|---|
| /ɪɹ/ | *here, near, beer, year* | /ɪə/ |
| /ɛɹ/ | *hair, where, care, there, their* | /eə/ |
| /ɑɹ/ | *car, start, heart, far* | /ɑː/ |
| /ɔɹ/ | *more, door, four, north, warm* | /ɔː/ |
| /ʊɹ/ | *tour, sure, poor* (a menudo /ɝ/) | /ʊə/ o /ɔː/ |
| /aɪɚ/ | *fire, tired, hire* | /aɪə/ |
| /aʊɚ/ | *hour, our, flower* | /aʊə/ |

---

## 3. Diptongos

> Para la mascota: **tres son fáciles** porque el español ya los tiene (*hay*, *hoy*, *causa*). **Dos son trampa**:
> /eɪ/ y /oʊ/, porque el hispanohablante los convierte en «e» y «o» secas.

### `ey` · /eɪ/ · day — «ei»
- **Azure:** `eɪ` · **Dificultad:** 2 · **Nivel:** A1
- **Ejemplos:** inicial *eight, ate, able, age, April* · medio *make, rain, great, break, came* · final *day, say,
  they, weigh, okay*
- **Grafías:** a_e (*make*), ai (*rain*), ay (*day*), ea (*great, break, steak*), eigh (*eight, weigh*), ey (*they*)
- **Articulación:** empieza en «e» y la lengua sube hacia «i» sin cortar: «ei». La segunda parte es más débil.
- **Comparada con el español:** el «ei» de «rey» o «peine». Existe; el problema es **olvidarse de la «i»** cuando se
  escribe solo con «a» (*late*, *make*, *table*).
- **Pares mínimos:** con /ɛ/: *wait/wet, sale/sell, late/let, gate/get, paper/pepper, taste/test, main/men* · con /aɪ/:
  *lake/like, may/my, late/light*
- **UK:** igual.

### `ay` · /aɪ/ · my — «ai»
- **Azure:** `aɪ` · **Dificultad:** 1 · **Nivel:** A1
- **Ejemplos:** inicial *I, ice, eye, idea* · medio *time, night, fine, write* · final *my, buy, fly, high, pie*
- **Grafías:** i_e (*time*), igh (*night, high*), y (*my, fly*), ie (*pie*), uy (*buy*), eye (*eye*), i (*kind, find*)
- **Articulación y español:** el «ai» de «hay». Igual.
- **Trampa:** la grafía. *I*, *time*, *my* se escriben con i/y y suenan «ai»; y la letra **I** se llama «ai».
- **Pares mínimos:** con /eɪ/: *like/lake, my/may, light/late* · con /ɪ/: *bite/bit, ride/rid, fine/fin, quite/quit*

### `oy` · /ɔɪ/ · boy — «oi»
- **Azure:** `ɔɪ` · **Dificultad:** 1 · **Nivel:** A1
- **Ejemplos:** inicial *oil, oyster, ointment* · medio *coin, noise, voice, point, boil* · final *boy, toy, enjoy*
- **Grafías:** oi (*coin*), oy (*boy*)
- **Articulación y español:** el «oi» de «hoy». Igual.
- **Pares mínimos:** *boy/buy, toy/tie, oil/aisle* (con /aɪ/); *coin/cone* (con /oʊ/)

### `aw` · /aʊ/ · now — «au»
- **Azure:** `aʊ` · **Dificultad:** 1 · **Nivel:** A1
- **Ejemplos:** inicial *out, our, owl, hour* · medio *house, town, down, cloud, about* · final *now, how, cow, allow*
- **Grafías:** ou (*house, out*), ow (*now, town*)
- **Articulación y español:** el «au» de «causa». Igual.
- **Trampa:** «ow» puede ser /aʊ/ (*now, how, town*) o /oʊ/ (*know, show, low*): *now* y *know* no riman.
- **Pares mínimos:** con /oʊ/: *now/know, town/tone, found/phoned* · con /ɑ/: *down/Don, shout/shot*

### `ow` · /oʊ/ · go — «ou»
- **Azure:** `oʊ` · **Dificultad:** 2 · **Nivel:** A1
- **Ejemplos:** inicial *old, open, own, only, okay* · medio *home, boat, road, phone, those* · final *go, no, show,
  know, though*
- **Grafías:** o (*go, old*), o_e (*home*), oa (*boat*), ow (*show, know*), ough (*though*), oe (*toe*)
- **Articulación:** empieza en «o» y los labios **se cierran** hacia «u» mientras suena: «ou». La «u» final es suave.
- **Comparada con el español:** «ou» no existe en palabras españolas comunes; el hispanohablante dice una «o» seca y
  el americano oye otra vocal (/ɔ/ o /ɑ/).
- **Pares mínimos:** con /ɔ/: *low/law, so/saw, boat/bought, coat/caught, cold/called, woke/walk, bowl/ball* · con /ɑ/:
  *won't/want, coast/cost, note/not, road/rod, hope/hop* (*I want* / *I won't*: ¡significan lo contrario!)
- **UK:** /əʊ/, empieza más central.

---

## 4. Consonantes

> Para la mascota: el inglés tiene **pares sordo/sonoro** (mismo gesto, con o sin vibración en la garganta):
> p/b, t/d, k/g, f/v, θ/ð, s/z, ʃ/ʒ, tʃ/dʒ. Pon la mano en la garganta: si vibra, es sonora. Varias sonoras del inglés
> **no existen en español** (/v/, /z/, /ʒ/, /dʒ/), así que el hispanohablante dice la sorda.

### `p` · /p/ · pen
- **Azure:** `p` · **Dificultad:** 2 · **Nivel:** A1 · **Ejemplos:** *pen, park, people* · *happy, apple, open* ·
  *stop, cup, help*
- **Grafías:** p, pp
- **Articulación:** labios juntos y se sueltan con **un soplo de aire** («p-h») al principio de sílaba acentuada
  (*pen*, *people*). Prueba con un papel delante de la boca: se mueve. Tras s no hay soplo (*speak, spin*).
- **Comparada con el español:** la «p» española no lleva soplo, y al oído americano suena casi a **b**.
- **Pares mínimos:** con /b/: *pear/bear, pea/bee, pig/big, park/bark, cap/cab, rope/robe*

### `b` · /b/ · bed
- **Azure:** `b` · **Dificultad:** 2 · **Nivel:** A1 · **Ejemplos:** *bed, big, boy* · *rabbit, about, table* · *job,
  web, club*
- **Grafías:** b, bb (muda en *climb, comb, doubt*)
- **Articulación:** labios bien **cerrados** y se sueltan, con voz. Siempre cierra los labios, también entre vocales.
- **Comparada con el español:** en español, la b/v entre vocales se dice sin cerrar los labios («ca**b**o», «u**v**a»
  [β]). En inglés hay que cerrarlos siempre, y **nunca** se usa para la letra v.
- **Pares mínimos:** con /v/: *berry/very, boat/vote, ban/van, best/vest, bet/vet, curb/curve* · con /p/: *bear/pear,
  big/pig, cab/cap*

### `t` · /t/ · top
- **Azure:** `t` · **Dificultad:** 2 · **Nivel:** A1 · **Ejemplos:** *top, ten, time* · *hotel, attack, after* · *cat,
  eat, light*
- **Grafías:** t, tt, -ed tras sorda (*worked*)
- **Articulación:** la punta de la lengua toca **el borde de encías detrás de los dientes de arriba** (no los dientes),
  y al principio de sílaba acentuada sale con soplo (*top* «t-h-op»).
- **Comparada con el español:** la «t» española toca los dientes y no lleva soplo.
- **Variantes americanas** (lección F1): entre vocales suena como una **r simple española** (*water* ≈ «uó-rer»,
  *better*, *city*, *get up*): es la «t suave» o *flap* [ɾ]; antes de /n/ se corta en la garganta (*button*, *mountain*);
  al final, a menudo no se suelta (*cat*).
- **Pares mínimos:** con /θ/: *tank/thank, tree/three, true/through, team/theme, taught/thought, boat/both* · con /d/
  (final): *bet/bed, cart/card, neat/need, write/ride*
- **UK:** sin t suave: *water* /ˈwɔːtə/ con t clara.

### `d` · /d/ · dog
- **Azure:** `d` · **Dificultad:** 2 · **Nivel:** A1 · **Ejemplos:** *dog, day, door* · *window, lady, ladder* ·
  *bed, good, need*
- **Grafías:** d, dd, -ed tras sonora (*played*)
- **Articulación:** como /t/ pero con voz, la lengua en las encías de arriba. Siempre con contacto.
- **Comparada con el español:** entre vocales, la «d» española se afloja («na**d**a», «de**d**o» [ð]): en inglés eso es
  otro sonido, /ð/. Al final, el español la pierde («Madrí»): en inglés hay que decirla (*bed* ≠ *bet*).
- **Pares mínimos:** con /ð/: *day/they, den/then, dare/there, dough/though, doze/those, breed/breathe* · con /t/
  (final): *bed/bet, card/cart, need/neat*

### `k` · /k/ · key
- **Azure:** `k` · **Dificultad:** 1 · **Nivel:** A1 · **Ejemplos:** *cat, key, cold* · *lucky, school, breakfast* ·
  *back, book, like*
- **Grafías:** c (*cat*), k (*key*), ck (*back*), ch (*school, chemistry*), qu = /kw/ (*quick*), x = /ks/ (*box*); k muda
  en *know, knife, knee*
- **Articulación:** la parte de atrás de la lengua toca el paladar blando; con soplo al principio de sílaba acentuada.
- **Comparada con el español:** igual que «c/k/qu», más el soplo.
- **Pares mínimos:** con /ɡ/: *coat/goat, cold/gold, class/glass, back/bag, pick/pig, duck/dug*

### `g` · /ɡ/ · go
- **Azure:** `ɡ` (puede venir como `g`) · **Dificultad:** 1 · **Nivel:** A1 · **Ejemplos:** *go, get, good* · *bigger,
  again, sugar* · *dog, bag, big*
- **Grafías:** g, gg, gu (*guess*), gh (*ghost*); g muda en *sign, foreign*
- **Articulación:** como /k/ con voz, siempre con contacto (también entre vocales).
- **Comparada con el español:** igual que «g» de «gato»; entre vocales el español la afloja («la**g**o» [ɣ]).
- **Trampa de lectura:** g + e/i a veces es /dʒ/ (*gym, giant, age*), a veces /ɡ/ (*get, give, girl*).
- **Pares mínimos:** con /k/: *goat/coat, gold/cold, bag/back, dog/dock* · con /dʒ/: *got/jot*

### `f` · /f/ · fish
- **Azure:** `f` · **Dificultad:** 1 · **Nivel:** A1 · **Ejemplos:** *fish, phone, four* · *coffee, often, after* ·
  *laugh, leaf, safe*
- **Grafías:** f, ff, ph (*phone*), gh (*laugh, enough*)
- **Articulación y español:** dientes de arriba sobre el labio de abajo, sin voz. Igual que la «f» española.
- **Pares mínimos:** con /v/: *fan/van, fine/vine, few/view, leaf/leave, safe/save, half/have, ferry/very* · con /θ/:
  *free/three, fought/thought, deaf/death*

### `v` · /v/ · very
- **Azure:** `v` · **Dificultad:** 3 · **Nivel:** A1 · **Ejemplos:** *very, voice, video* · *seven, river, never* ·
  *have, love, five*
- **Grafías:** v (siempre; *of* = /əv/)
- **Articulación:** **los dientes de arriba tocan el labio de abajo** (como /f/) y **la voz vibra**: es una «f con voz».
  Si la dices bien, notas cosquillas en el labio.
- **Comparada con el español:** no existe: en español la b y la v suenan igual. Es el error más visible del
  hispanohablante.
- **Pares mínimos:** con /b/: *very/berry, vote/boat, van/ban, vest/best, vet/bet, curve/curb* · con /f/: *van/fan,
  view/few, save/safe, leave/leaf, have/half* · con /w/: *vest/west, vine/wine, veil/whale*
- **UK:** igual.

### `th` · /θ/ · think — la «th» sorda
- **Azure:** `θ` · **Dificultad:** 3 (2 si eres de España) · **Nivel:** A2 · **Ejemplos:** *think, three, thank* ·
  *nothing, birthday, method* · *math, both, mouth, teeth*
- **Grafías:** th
- **Articulación:** la punta de la lengua **asoma entre los dientes** (o toca la parte de atrás de los de arriba) y
  soplas aire **sin voz**. La lengua no se mueve mientras suena: es un sonido continuo, se puede alargar («θθθink»).
- **Comparada con el español:** es la «z/c» de España (*zapato*, *cielo*). En Latinoamérica no existe: se cambia por /t/
  (*tink*), /s/ (*sink*) o /f/ (*fink*). El consejo «como la z de España» **no sirve** a un latinoamericano: la mascota
  debe explicar el gesto.
- **Pares mínimos:** con /s/: *think/sink, thick/sick, thing/sing, mouth/mouse, path/pass, faith/face, worth/worse* ·
  con /t/: *three/tree, thank/tank, thought/taught, through/true, both/boat, theme/team* · con /f/: *three/free,
  thought/fought, death/deaf* · con /ð/: *thigh/thy, teeth/teethe, bath/bathe, breath/breathe*
- **Nota:** en el «núcleo de inglés como lengua franca» (Jenkins) /θ/ y /ð/ **no son imprescindibles** para que te
  entiendan; los americanos entienden *tink*. Se enseñan en A2 porque el dueño quiere precisión, pero no van primero.

### `dh` · /ð/ · this — la «th» sonora
- **Azure:** `ð` · **Dificultad:** 2 · **Nivel:** A2 · **Ejemplos:** *this, the, they, there* · *mother, other,
  weather, together* · *breathe, smooth, with*
- **Grafías:** th (en palabras de función —*the, this, that, they, there, then, than, though*— y entre vocales)
- **Articulación:** como /θ/ pero **con voz**: lengua entre los dientes y vibración.
- **Comparada con el español:** **sí lo tienes**: es la «d» suave de «na**d**a», «de**d**o», «ca**d**a» dicha relajada.
  Truco de la mascota: «di "nada" despacio y fíjate en la segunda d: ese es el sonido de *the*». El error es decir una
  «d» fuerte (*day* por *they*) o, al principio de palabra, poner una d española.
- **Pares mínimos:** con /d/: *they/day, then/den, there/dare, though/dough, those/doze, breathe/breed* · con /θ/:
  *thy/thigh, teethe/teeth, bathe/bath, breathe/breath* · con /z/: *breathe/breeze*

### `s` · /s/ · sun
- **Azure:** `s` · **Dificultad:** 1 · **Nivel:** A1 · **Ejemplos:** *sun, see, city* · *messy, basic, decide* · *bus,
  yes, nice*
- **Grafías:** s, ss, c + e/i (*city, nice*), sc (*science*), x = /ks/
- **Articulación y español:** como la «s» española.
- **Dos trampas** (lección E1): no añadas una «e» delante de s + consonante (*Spain*, no «Espain»; *school*, *study*,
  *speak*, *star*, *small*, *snow*); y no la uses por /z/ (*is*, *was*, *music*).
- **Pares mínimos:** con /z/: *sip/zip, sue/zoo, ice/eyes, price/prize, peace/peas, bus/buzz, loose/lose, place/plays* ·
  con /ʃ/: *see/she, sip/ship, sort/short, so/show, mass/mash* · con /θ/: *sink/think, sick/thick, mouse/mouth*

### `z` · /z/ · zoo
- **Azure:** `z` · **Dificultad:** 3 · **Nivel:** A1 · **Ejemplos:** *zoo, zero, zip* · *busy, easy, music, reason* ·
  *is, was, his, rose, because*
- **Grafías:** z, zz, **s** (muy a menudo: *is, was, his, rose, music*), -s/-es de plural y verbo tras sonido sonoro
  (*dogs, plays*), x = /ɡz/ (*exam*)
- **Articulación:** la boca de la /s/ y **la voz vibrando**: el zumbido de una abeja («zzzz»). La vocal de delante se
  alarga un poco (*eyes* es más larga que *ice*).
- **Comparada con el español:** no existe como sonido propio, pero sale solo en «mi**s**mo», «de**s**de», «i**s**la»
  (s antes de consonante sonora). La «z» escrita del español no es /z/.
- **Pares mínimos:** con /s/: *zip/sip, zoo/sue, eyes/ice, prize/price, peas/peace, buzz/bus, lose/loose, plays/place,
  rise/rice*
- **Error típico:** decir /s/ en *is, was, his, because, music, easy*.

### `sh` · /ʃ/ · she
- **Azure:** `ʃ` · **Dificultad:** 3 · **Nivel:** A2 · **Ejemplos:** *she, ship, sure, shop* · *fashion, machine,
  special, nation* · *fish, wash, push, English*
- **Grafías:** sh (*she*), ti (*nation*), ci (*special*), ch (*machine, chef*), s (*sure, sugar*), ss (*mission*)
- **Articulación:** labios **hacia adelante y redondeados**, la lengua un poco más atrás que en /s/, **sin tocar el
  paladar**: el aire sale continuo. Es el «shhh» de pedir silencio.
- **Comparada con el español:** no existe en el español estándar; sí en el «yo» rioplatense joven («sho») y en la
  «ch» de Chile o Panamá. El error típico es decir **ch** (*chip* por *ship*) o **s** (*see* por *she*).
- **Pares mínimos:** con /tʃ/: *ship/chip, shoe/chew, sheep/cheap, share/chair, wash/watch, cash/catch, wish/which,
  shin/chin* · con /s/: *she/see, ship/sip, short/sort, show/so, mash/mass*

### `zh` · /ʒ/ · measure
- **Azure:** `ʒ` · **Dificultad:** 2 · **Nivel:** B1 · **Ejemplos:** *genre* (raro al principio) · *measure, vision,
  usual, television, Asia, pleasure* · *beige, garage, massage*
- **Grafías:** s (*measure, usual*), si (*vision*), g (*beige, garage*)
- **Articulación:** como /ʃ/ pero **con voz**.
- **Comparada con el español:** es la «y/ll» rioplatense de «yo», «calle» («zho», «cazhe»). Fuera del Río de la Plata no
  existe; se cambia por /dʒ/ o /j/ (*meyur*).
- **Pares:** casi no hay pares mínimos útiles; se practica en palabras (*usually, television, decision*).

### `hh` · /h/ · house
- **Azure:** `h` · **Dificultad:** 2 · **Nivel:** A1 · **Ejemplos:** *hat, house, who, happy* · *ahead, behind,
  perhaps* · — (nunca al final)
- **Grafías:** h, wh (*who, whole*). Muda en *hour, honest, honor, heir*.
- **Articulación:** solo aire que sale de la garganta abierta, sin roce en la boca, como cuando empañas un espejo.
- **Comparada con el español:** la h española es muda y la «j» española raspa al fondo de la boca. La /h/ inglesa es
  **mucho más suave que la j**: no raspes. Errores: callarla (*ham* → *am*) o rasparla («jappy»).
- **Pares mínimos:** con nada: *hair/air, heat/eat, hill/ill, hold/old, high/eye, heart/art, hand/and, hear/ear*

### `ch` · /tʃ/ · chair
- **Azure:** `tʃ` · **Dificultad:** 1 · **Nivel:** A1 · **Ejemplos:** *chair, cheese, child* · *kitchen, nature,
  picture* · *watch, much, teach*
- **Grafías:** ch, tch (*watch*), t + ure (*nature, picture*), c (*cello*)
- **Articulación y español:** la «ch» de «chocolate». Igual.
- **Pares mínimos:** con /ʃ/: *chair/share, chip/ship, cheap/sheep, watch/wash, catch/cash, chin/shin* · con /dʒ/:
  *rich/ridge, batch/badge, cheap/jeep, choke/joke, chain/Jane*, y la letra *H* /eɪtʃ/ frente a *age* /eɪdʒ/

### `jh` · /dʒ/ · job
- **Azure:** `dʒ` · **Dificultad:** 3 · **Nivel:** A2 · **Ejemplos:** *job, just, gym, giant* · *soldier, magic,
  major, danger* · *age, bridge, large, page*
- **Grafías:** j (*job*), g + e/i/y (*gym, age*), dge (*bridge*), di (*soldier*)
- **Articulación:** una «ch» **con voz**: la lengua toca detrás de los dientes de arriba y se suelta con vibración.
- **Comparada con el español:** se parece a la «y» enfática de «¡**y**a!», «c**ó**n**y**uge» en muchas zonas. Los dos
  errores: leer la **j** como la jota española (*job* → «job» raspado) y decir /j/ (*Jess* → *yes*, *jet* → *yet*).
- **Pares mínimos:** con /j/: *jet/yet, jam/yam, joke/yolk, Jess/yes, jail/Yale, major/mayor* · con /tʃ/: *ridge/rich,
  badge/batch, jeep/cheap, joke/choke, Jane/chain*

### `m` · /m/ · man
- **Azure:** `m` · **Dificultad:** 1 · **Nivel:** A1 · **Ejemplos:** *man, me, more* · *summer, family, number* · *home,
  come, them*
- **Grafías:** m, mm, mb (*climb*), mn (*autumn*)
- **Articulación y español:** labios cerrados, aire por la nariz. Igual.
- **Trampa al final:** el español casi no termina palabras en m y tiende a decir **n** (*I'm* → «ain»). Cierra los
  labios al final.
- **Pares mínimos:** con /n/ (final): *some/sun, came/cane, team/teen, gum/gun, seem/seen, dime/dine*

### `n` · /n/ · no
- **Azure:** `n` · **Dificultad:** 1 · **Nivel:** A1 · **Ejemplos:** *no, name, nice* · *money, dinner, any* · *sun,
  ten, phone*
- **Grafías:** n, nn, kn (*know*), gn (*sign*)
- **Articulación y español:** la punta de la lengua en las encías de arriba. Igual.
- **Trampa:** en el Caribe y otras zonas la n final se dice atrás (/ŋ/: «pa**ŋ**»), y *sun* suena *sung*.
- **Pares mínimos:** con /ŋ/: *sin/sing, thin/thing, win/wing, ran/rang, ban/bang, kin/king, sun/sung* · con /m/:
  *sun/some, cane/came*

### `ng` · /ŋ/ · sing
- **Azure:** `ŋ` · **Dificultad:** 2 · **Nivel:** A2 · **Ejemplos:** — (nunca al principio) · *singer, finger, think,
  bank, English* · *sing, long, going, morning*
- **Grafías:** ng (*sing*), n + k/g (*think, bank, finger*)
- **Articulación:** la parte de **atrás** de la lengua sube y toca el paladar blando; el aire sale por la nariz. Al
  final de palabra **no** sueltes una «g» (*sing*, no «sing-g»). En *finger* sí suena /ɡ/ después; en *singer*, no.
- **Comparada con el español:** **sí lo tienes**: es la n de «te**n**go», «ba**n**co», «ma**n**go» (antes de g o k).
- **Pares mínimos:** con /n/: *sing/sin, thing/thin, wing/win, rang/ran, bang/ban, king/kin, sung/sun* · y la
  terminación *-ing*: *going*, *working* (no «goin»)

### `l` · /l/ · light, feel
- **Azure:** `l` · **Dificultad:** 2 · **Nivel:** A2 · **Ejemplos:** *light, look, love* · *hello, color, only* ·
  *feel, call, people, milk*
- **Grafías:** l, ll; muda en *walk, talk, half, could, would, should*
- **Articulación:** al principio de sílaba, como la «l» española (**l clara**). Después de vocal (*feel, call, milk,
  people, world*) es la **l oscura** [ɫ]: la parte de atrás de la lengua también sube, y suena hueca, casi como una «u»
  antes de la l.
- **Comparada con el español:** la clara es igual; la oscura no existe (lección F2).
- **Pares mínimos:** con /ɹ/: *light/right, led/red, load/road, play/pray, glass/grass,
  collect/correct*

### `r` · /ɹ/ · red — la r americana
- **Azure:** `ɹ` · **Dificultad:** 3 · **Nivel:** A1 · **Ejemplos:** *red, right, run* · *very, sorry, around* ·
  *car, more, here*
- **Grafías:** r, rr, wr (*write*)
- **Articulación:** la punta de la lengua se **levanta y se curva hacia atrás** (o la lengua se amontona atrás) **sin
  tocar el paladar**, y los labios se redondean un poco. **Nunca vibra** ni golpea. En americano se pronuncia
  **siempre**, también al final (*car*, *more*).
- **Comparada con el español:** no existe. La «r» de «pero» (un golpe) y la de «perro» (vibrante) suenan muy
  extranjeras. Curiosidad útil: el golpe de la «r» de «pero» es justo la **t suave** americana de *water* (F1).
- **Pares mínimos:** con /l/: *right/light, red/led, road/load, pray/play, grass/glass, correct/collect* · con /w/:
  *ring/wing, rest/west, red/wed*
- **UK:** solo suena antes de vocal (*red*, *very*); en *car*, *more* no se pronuncia.

### `w` · /w/ · we
- **Azure:** `w` · **Dificultad:** 2 · **Nivel:** A1 · **Ejemplos:** *we, water, one, why* · *away, between,
  language* · — (no va al final como consonante)
- **Grafías:** w, wh (*why, what*), u tras q/g (*quick, language*), o (*one, once*)
- **Articulación:** labios **muy redondos**, que se abren rápido hacia la vocal: una «u» cortísima delante.
- **Comparada con el español:** el «hu» de «**hu**evo», pero **sin «g»**: el hispanohablante dice «güud» (*would*),
  «guoman» (*woman*).
- **Pares mínimos:** con /v/: *west/vest, wine/vine, wet/vet, whale/veil* · con /ɡw/ (el error): *wood/good* (el
  oyente oye *good*)

### `y` · /j/ · yes
- **Azure:** `j` · **Dificultad:** 3 · **Nivel:** A1 · **Ejemplos:** *yes, you, year, use* · *beyond, onion,
  million, beautiful* · — (no va al final como consonante)
- **Grafías:** y (*yes*), u = /juː/ (*use, music*), ew = /juː/ (*few*), i (*onion, million*)
- **Articulación:** una «i» cortísima antes de la vocal; la lengua se acerca al paladar **sin tocarlo** y sin roce.
- **Comparada con el español:** la «i» de «h**i**elo» o «t**i**erra». El hispanohablante la endurece como la «y» de
  «yo» ([ʝ] o [dʒ]) y *yes* suena *Jess*; o se la come delante de /iː/ (*year* → *ear*).
- **Pares mínimos:** con /dʒ/: *yet/jet, yes/Jess, yolk/joke, Yale/jail, mayor/major* · con nada: *year/ear, yeast/east,
  yell/L* (la letra L)

---

## 5. Rasgos del acento americano y temas transversales

### F1 · La t suave (flap) y la t cortada
- **Flap [ɾ]:** /t/ y /d/ entre vocales cuando la segunda no lleva acento: *water, better, city, party, little,
  get up, a lot of* (t) y *ladder, body, lady* (d). Suena como la **r simple española** de «pe**r**o»: *water* ≈ «uó-rer»,
  *get it* ≈ «gué-rit». Azure lo puntúa como `t`/`d` normales (no tiene un símbolo propio): **no se puede puntuar el
  flap en sí**; solo se enseña y se escucha.
- **Glotal [ʔ]:** antes de /n/ sin acento: *button, mountain, cotton, written*. Opcional para A2.
- **UK:** sin flap (t clara).

### F2 · La l oscura
- *feel, call, milk, people, little, world, school*. Practicar con familias: *feel/feeling* (en *feeling* es clara).

### C7 · Aspiración de p, t, k
- Soplo al principio de sílaba acentuada: *pen, top, key, police, today*; sin soplo tras s: *spin, stop, sky*. Si no
  soplas, *pear* suena *bear*. (Es del «núcleo de lengua franca»: importa para que te entiendan.)

### E1 · La «e» de más: s + consonante al principio
- *school, Spain, star, study, speak, small, sleep, snow, sweet, stop, stress, street, spring*. El español no admite
  «s» + consonante al principio y añade «e» («eschool»). Truco: alarga la s y empieza ahí («sss-chool»), o une con la
  palabra anterior (*my school* → «mai-schul»).
- Lo detecta ya `soundTipEs()` en `pronunciation.ts` (fonema `s` flojo y palabra que empieza por s + consonante).

### E2 · Consonantes finales y grupos
- El español termina palabras casi solo en vocal, n, l, s, r, d, z. El inglés termina en todo y en grupos: *asked*
  /æskt/, *texts* /tɛksts/, *months* /mʌnθs/, *world* /wɝld/, *helped* /hɛlpt/, *first* /fɝst/, *desk*. Errores: comerse
  la última (*I ask* por *I asked*) o añadir vocal («desk-e»). Pares: *bet/bed, back/bag, card/cart, sick/sit, ten/tent*.

### E3 · La -s y la -es (plural, verbo y posesivo)
| Suena | Cuándo | Ejemplos |
|---|---|---|
| /s/ | tras sonido sordo (p, t, k, f, θ) | *cats, books, stops, laughs, months* |
| /z/ | tras sonido sonoro (vocal, b, d, g, v, l, m, n, r…) | *dogs, plays, calls, lives, cars, John's* |
| /ɪz/ (sílaba más) | tras s, z, ʃ, ʒ, tʃ, dʒ | *buses, watches, washes, judges, pages, roses* |

### E4 · La -ed del pasado
| Suena | Cuándo | Ejemplos |
|---|---|---|
| /t/ | tras sordo (p, k, f, s, ʃ, tʃ, θ) | *worked, stopped, laughed, washed, watched, missed* |
| /d/ | tras sonoro (vocal, b, g, v, z, l, m, n, r, dʒ) | *played, called, lived, cleaned, loved, changed* |
| /ɪd/ (sílaba más) | tras t, d | *wanted, needed, started, decided, visited* |

Error típico: «work-ed» con sílaba de más (ya lo detecta `soundTipEs()`), o comerse la -ed (*I work yesterday*).

### P1 · Acento de palabra
- El español suele cargar la penúltima y marca la tilde; el inglés no marca nada y **la vocal sin acento se vuelve
  schwa**. Cognados trampa: *CHOC-late* (2 sílabas), *COMF-ter-ble*, *VEJ-ta-ble*, *IN-tres-ting*, *de-VEL-op-ment*,
  *tech-NOL-o-gy*, *ho-TEL*, *e-CON-o-my*, *a-MER-i-ca*, *PHO-to-graph / pho-TOG-ra-phy / pho-to-GRAPH-ic*.
- Nombre y verbo: *REcord / reCORD, PREsent / preSENT, OBject / obJECT, PERmit / perMIT* (⚠ homógrafos: solo con
  frase, la voz del teléfono no sabe cuál es).
- Azure da puntuación por **sílaba** en en-US, pero **no** dice dónde pusiste el acento: se practica de oído (ejercicio
  «toca la sílaba fuerte») y la nota de entonación (prosodia) solo da una idea general.

### P2 · Ritmo, formas débiles y enlace
- Inglés: ritmo por acentos (las sílabas débiles se aprietan); español: ritmo por sílabas. Formas débiles: *a, an, the,
  and, of, to, for, from, can, was, were, have, has, them, him, her, some* (ver la schwa).
- Enlace: *an apple* → «a-napple», *turn off* → «tur-noff», *pick it up* → «pi-ki-tup».

### P3 · Entonación básica
- Baja al final en las preguntas con *wh-* y en las afirmaciones; sube en las de sí/no (*Are you ready?↗*). Azure:
  prosodia y «monótono».
