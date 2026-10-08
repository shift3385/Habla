# Prompt · Vídeo promocional de Habla (Remotion)

> Pega este documento entero como prompt en una sesión de Claude Code abierta en `D:\My Apps\habla-promo` (proyecto Remotion ya creado, con las Agent Skills de Remotion instaladas). Todo lo que cuenta sobre la app está comprobado en el código de Habla 5.9 (`D:\My Apps\HABLA`).

---

## 0. Tu papel
Eres director creativo y desarrollador de motion graphics con Remotion. Vas a producir el vídeo promocional de **Habla**, una app Android para practicar inglés **hablando** con un profe de IA que es una mascota animada. El objetivo: que una persona hispanohablante que *entiende* inglés pero *se bloquea al hablar* sienta «esto es para mí» y sepa exactamente cómo se usa.

Antes de escribir código usa `/remotion-best-practices`. Para dudas de la API, `/remotion-docs`.

## 1. La gran idea: «La onda que faltaba»
Todo el vídeo gira alrededor de **una forma de onda de voz** (como la de un audio de WhatsApp):

- **Al principio está plana.** Una nota de voz de 0:00 que nunca se envía: el silencio de quien sabe inglés pero no se atreve.
- **La mascota la despierta.** Cae, rebota y, cuando la tocas, la onda da su primer latido.
- **Cada parte de la app hace crecer la onda:** el test, las clases, las palabras, el repaso.
- **Al final la onda es una voz segura y continua** que se convierte en la escalera de niveles **A2 → B1 → B2 → C1**. En cada escalón la mascota desbloquea su «secreto»: Chispa, fuego azul; Musgo, florece; Gota, arcoíris; Brisa, voltereta. Así, subir de nivel se siente como un logro de videojuego.

La onda es el hilo conductor visual: aparece en cada escena, en transiciones (wipes con forma de onda) y como el **anillo de 60 s** y las **10 barras** del micrófono real de la app.

**Tono:** cálido, valiente, con humor ligero. Nada de «aprende inglés en 7 días». La promesa honesta es: *«Por fin, a hablar.»*

## 1 bis. El arco emocional (lo más importante de todo)
La gente no se emociona con funciones: se emociona cuando **se ve reflejada** y luego **se ve capaz**. Diseña cada segundo para recorrer este arco:

1. **Herida (0–6 s), reconocerse:**
   - Antes del primer texto, tres flashes de 1 s, en silencio total y en planos ilustrados, cálidos y sin caras concretas:
     - una entrevista de trabajo en la que alguien abre la boca… y no sale nada;
     - un turista que pregunta una dirección y la persona sonríe con vergüenza y señala con la mano;
     - una videollamada con la cámara apagada y el micro en mute.
   - Sobre cada flash, la onda plana. El espectador debe pensar *«ese soy yo»*.
2. **Esperanza (6–14 s), alguien a tu lado:**
   - Entra Gota. La música empieza con **un solo piano** (pocas notas, en tono mayor y lento).
   - La mascota no es una profesora que juzga: es **una amiga que no se cansa**.
   - Frase: «Aquí puedes equivocarte. Nadie te mira.»
3. **Camino (14–61 s), te ves avanzar:**
   - Entra el ritmo (104 BPM) con el primer «go → went».
   - Cada escena suma una capa al sonido (bajo, percusión, coros) igual que la onda suma amplitud: **la música crece contigo**.
4. **Triunfo (61–70 s), te ves capaz:**
   - Los mismos tres momentos del principio se repiten, **ahora resueltos**:
     - en la entrevista, la persona responde y el entrevistador asiente;
     - el turista sonríe: «Thank you so much!»;
     - en la videollamada se enciende la cámara y el micro, y la persona saluda.
   - La onda está llena en los tres. Es el pico emocional: música en su punto más alto y la escalera llegando a C1.
5. **Verdad (70–80 s), la firma del creador:**
   - Todo se calma. Silencio, una nota de piano y fondo oscuro del tema.
   - Texto que aparece palabra a palabra, despacio:
     > «Yo también entendía inglés… y me quedaba callado.
     > Por eso creé Habla.»
     > — **Liomar**, creador de Habla
   - Después, la nota de voz del principio se envía (*whoosh*), su onda se convierte en la **H que habla** (revelación del logo, §3): «Hoy, tu primera frase.»
   - **Con la voz de Liomar** (`public/voz-liomar.mp3`, unos 8–9 s; hasta que exista, `// TODO voz-liomar.mp3` y el texto en pantalla):
     > «Yo también entendía inglés… pero me quedaba callado. Por eso creé Habla.» *(pausa de 1 s)* «Now it's your turn. Say your first sentence.»
     - La primera parte, en español, es la confesión. La segunda, **en inglés con su propia voz**, es la prueba viva de que funciona.
     - Mientras habla, la onda de la nota de voz sigue **su voz real** (`@remotion/media-utils`, `visualizeAudio`). Al terminar la frase en inglés, esa onda se convierte en la H del logo.
     - Música al 15 % durante su voz (ducking).

**Reglas para que emocione de verdad:**
- **El silencio también suena:** deja 0,5–1 s de silencio real antes del primer latido y antes de la firma. Los contrastes son los que ponen la piel de gallina.
- **Ritmo de lectura:** las frases emotivas, como mucho 7 palabras por pantalla y al menos 1,8 s visibles.
- **Nada de dramatizar de más:** cálido y luminoso, nunca triste ni lastimero. El mensaje es *«no te pasa nada malo, solo te falta practicar en un sitio seguro»*.
- Amplía `PromoVertical` y `PromoHorizontal` a **~80 s** (2400 frames) para que quepa la firma sin prisas. El `Teaser15` usa: un flash de herida → el latido → el triunfo → «Hoy, tu primera frase.» → la firma corta «Creada por Liomar».

## 2. Formatos (tres composiciones, mismo código)
| id | Tamaño | fps | Duración | Uso |
|---|---|---|---|---|
| `PromoVertical` | 1080×1920 | 30 | ~75 s (2250 f) | Reels, TikTok, Shorts, estados de WhatsApp |
| `PromoHorizontal` | 1920×1080 | 30 | ~75 s | YouTube, presentaciones |
| `Teaser15` | 1080×1920 | 30 | 15 s (450 f) | Gancho: escenas 0, 4 y 8 recortadas |

- La disposición se adapta con `useVideoConfig()`: en vertical, el teléfono en el centro y los textos arriba/abajo; en horizontal, el teléfono a un lado y los textos al otro.
- **Subtítulos OPCIONALES** (decisión del dueño): el vídeo sale **limpio, sin subtítulos grabados en la imagen**, y los subtítulos van en un archivo aparte que quien lo vea activa si quiere (botón CC). Ver §6 bis.
  - Ojo: los **textos de diseño** del guion («Entiendes inglés.», «Elige a tu compañero»…) son parte de la animación y se quedan. Los subtítulos son solo la **transcripción de lo que se oye**: la voz en off, las frases del profe y la voz de Liomar.
- Usa `<TransitionSeries>` (@remotion/transitions). Recuerda que cada transición **acorta** la duración total.

## 3. Identidad visual (tomada de la app; respétala)
- **Fuente:** Outfit (`@remotion/google-fonts/Outfit`), igual que la app.
- **Tema principal del vídeo:** *Marea*, con la mascota **Gota** (agua, «Curiosa y juguetona»).
  - Claro: acento `#1a7fc0`.
  - Oscuro: acento `#7fd0ff`, fondo `#061420`.
  - Las otras mascotas aparecen en la escena 2 y en el final.
- **Los 4 temas:**

| Tema | Mascota | Elemento | Personalidad | Acento (oscuro / claro) | Fondo oscuro | Secreto |
|---|---|---|---|---|---|---|
| Ember | **Chispa** | fuego | «Enérgica y valiente» | `#ff6a2b` / `#e04a14` | `#0a0605` | fuego azul |
| Lumi | **Musgo** | tierra | «Tranquilo y paciente» | `#1f9d66` / `#147f4f` | `#020c07` | florece |
| Marea | **Gota** | agua | «Curiosa y juguetona» | `#7fd0ff` / `#1a7fc0` | `#061420` | arcoíris |
| Nimbo | **Brisa** | aire | «Ligera y soñadora» | `#b7a8ff` / `#6a5ad6` | `#0b0a1f` | voltereta |

- **Estilo:** tarjetas de cristal (fondo translúcido con borde suave), globos de consejo teñidos del color del tema, brillo suave en la tarjeta destacada, botones redondeados tipo píldora.
- **Mascotas:**
  - PNG en `D:\My Apps\HABLA\android\app\src\main\res\drawable-nodpi\mascot_{gota,chispa,musgo,brisa}.png` → cópialos a `public/`.
  - La mascota animada de la app (`src/ui/Mascot.tsx`) es un SVG tipo *slime* de 16 puntos: ojos que siguen el dedo, se estira y tiene un secreto a los 5 toques. Si la portas, **hazla determinista con `useCurrentFrame()`**: nada de `requestAnimationFrame` ni `Math.random()` sin semilla (usa `random('semilla')` de Remotion).
  - Estados de ánimo: idle, listening, thinking, speaking y happy.
- **Logo / icono de la app: «La H que habla»** (elegido por el dueño, 5.9):
  - Dos columnas redondeadas forman una **H** y su puente es una **onda de voz de 4 barras**.
  - Degradado horizontal `#7fd0ff` → `#b7a8ff` (Marea → Nimbo) sobre fondo noche (`#0b1a2e` → `#061420`).
  - Archivos en `public/`:
    - `logo-habla.svg`: vector, con cada pieza con su id (`columna-izq`, `columna-der`, `onda-1`…`onda-4`) para animarlas por separado;
    - `icono-habla.png` y `icono-habla-redondo.png`: 192 px, como se ve en el teléfono.
  - **Es la firma visual del vídeo:** la onda conductora y el puente de la H son la misma cosa. Úsalo así:
    - **Revelación del logo (cierre):** la onda llena de la nota de voz se encoge hasta 4 barras, dos columnas suben desde abajo con un `spring()` y la encierran formando la H. Después aparece el fondo noche con esquinas redondeadas y el logo queda como icono de app. Esa es la última imagen del vídeo, con «Creada por Liomar».
    - **Aparición sutil (escena 1):** al primer latido de la onda, durante 4–6 frames, se intuyen las dos columnas de la H a su alrededor y desaparecen. Es una semilla que solo se entiende al final.
    - **Marca de agua** pequeña (logo en blanco al 60 %) en una esquina durante las escenas 3–8, y en el `Teaser15` como último plano.
  - No lo deformes ni cambies sus colores; sobre fondos claros, ponlo dentro de su cuadrado noche.
- **UI dentro del teléfono:** recrea las pantallas en React, con nitidez vectorial y animables, a partir de las capturas de referencia:
  - `D:\My Apps\HABLA\docs\correccion\evidencia-movil\`:
    - `R22-globo.png`: Inicio;
    - `R9-clase.png`: clase;
    - `R19-informe.png`: informe;
    - `R20-resultado.png`: repaso;
    - `PRUEBA-SONIDO-oir.png`: prueba de sonido;
    - `ANILLO-*.png` y `BARRAS-10.png`: micrófono.
  - `D:\My Apps\HABLA\docs\evidencia-v5.7\*.jpg`: horizontal, «Mi nivel» y resumen del test.
  - ⚠️ En R9 y R22 el profe se llama «Emma». En la 5.9 **el profe es la mascota** (dice «Gota»), y Emma y Leo son solo voces. Usa siempre el nombre de la mascota.
  - ⚠️ El micro es **«toca para hablar, toca para enviar»**, con un anillo de 60 s alrededor. No muestres el gesto antiguo de mantener pulsado o deslizar al candado.
  - Usa capturas reales solo como fondo o detalle.

## 4. Guion (vertical, ~75 s). Textos en pantalla en español; lo que dice el profe, en inglés
**Escena 0 · El silencio (0–4 s)**
- Pantalla oscura. Una nota de voz con la onda **plana** y el contador «0:00».
- Texto: **«Entiendes inglés.»** … pausa … **«Pero cuando toca hablar…»**
- La onda sigue plana. Suena un «tic» y nada más.

**Escena 1 · Llega tu profe (4–9 s)**
- Gota cae desde arriba, rebota (squash & stretch) y mira al espectador. Globo: **«Hola, soy tu profe de inglés»**.
- En la pantalla de la app se lee **«Welcome back, Liomar»**. Un dedo la toca → **«¡Otra vez!»** → la onda plana da su primer latido.

**Escena 2 · Elige a tu compañero (9–14 s)**
- Título: **«Elige a tu compañero»**.
- Las 4 mascotas en fila. Al pasar de una a otra, un círculo del color de su tema llena la pantalla (así lo hace la app). Debajo, el nombre y la personalidad: «Chispa · Enérgica y valiente», etc.
- Texto pequeño: «Tu profe es tu mascota. Tú eliges su voz: americana o británica.»

**Escena 3 · El test que te conoce (14–25 s)**
- Título: **«Vamos a conocer tu inglés»**.
- 4 tarjetas de cristal que se giran una tras otra:
  - Gramática · 20 preguntas, de A1 a C2;
  - Lectura · 2 textos × 6 preguntas;
  - Audición · 2 audios × 6 preguntas;
  - Habla · 3 respuestas por voz.
- Detalle honesto: un botón **«No lo sé»** que brilla («mejor que adivinar»).
- Revelación del resultado: 4 barras que crecen como ondas → Gramática A2 · Lectura A2 · **Audición B1** · Habla A2 → sello **«Tu punto de partida: A2»**.
- Subtexto: «Unos 25–30 minutos. 450 preguntas en el banco, de A1 a C2.»

**Escena 4 · La clase: hablas como en un audio de WhatsApp (25–40 s)** — el corazón del vídeo
- Teléfono con la clase.
- Un dedo toca el micro → el **anillo de 60 s** empieza a vaciarse en sentido horario y las **10 barras** siguen una voz real (la onda del principio, ¡por fin viva!).
- Subtítulo de lo que dice el alumno, con un error: *«Yesterday I go to the cinema with my friends»*.
- Respuesta del profe en burbuja: transcripción → corrección resaltada **go → went** con la etiqueta «tiempo verbal» → respuesta natural: *«Nice! What did you watch?»*, con la traducción ES debajo.
- Métricas que suben como un velocímetro: **ppm** (palabras por minuto, «la meta ronda las 120»), palabras y pausas.
- Botón **«¿Qué digo?»** que despliega 3 ideas (inglés + español) para cuando te quedas en blanco.
- Detalle del anillo: naranja en los últimos 10 s y rojo en los últimos 5.

**Escena 5 · Toca cualquier palabra (40–46 s)**
- El dedo toca «**brilliant**» en la frase del profe → sube una hoja con: IPA /ˈbrɪl.jənt/ · «adjetivo» · traducción · **«significado aquí»** · registro · combinaciones · ejemplo · aviso de **falso amigo** cuando lo hay.
- Botón «Guardar». Globo: **«Te explico qué significa en esa frase.»**

**Escena 6 · Temas reales y prácticas (46–54 s)**
- Carrusel de tarjetas que pasan como un *swipe* infinito:
  - con punto «en vivo»: **Noticias de hoy**, **IA y nuevos modelos**, Tecnología, Negocios, Startups, Ciencia, Cine, Deportes;
  - prácticas: **Entrevista de trabajo**, **Debate**, **Contar una historia**, **Explicar a qué me dedico**, **Mis puntos débiles**, **Sorpréndeme**.
- Texto: **«Hablamos de lo que pasa hoy.»** (los temas con punto traen noticias reales).

**Escena 7 · Tu plan y tu repaso (54–61 s)**
- Un camino de **12 semanas** que se dibuja: semanas 1–3 «tus puntos débiles», 5–7 «amplía», 9–11 «fluidez», 12 «un paso por encima».
- Tarjetas de repaso con el español arriba: «Dilo en inglés» → botones *No me salió · Me costó · Bien · Fácil* → **«Tú decides cuándo vuelve.»**
- Llama de la racha encendiéndose: **«¡Llevas 7 días seguidos practicando!»**

**Escena 8 · La escalera hasta C1 (61–70 s)** — el clímax
- Un calendario pasa páginas: **cada 28 días, un re-test**.
- La onda, ahora potente, se transforma en una escalera de 4 escalones: **A2 → B1 → B2 → C1**.
- En cada escalón cambia el tema y la mascota celebra con su secreto: Gota, arcoíris (B1); Chispa, fuego azul (B2); Musgo, florece (C1); Brisa, voltereta en el último salto.
- Texto: **«Tu nivel sube cuando tú lo demuestras.»** (en Habla el nivel solo cambia con el re-test: 70 % test + 30 % lo que demuestras en clase).
- Microtexto honesto, abajo y pequeño: «Recorrido ilustrativo. Tu ritmo depende de tu práctica.»

**Escena 9 · Cierre (70–75 s)**
- Vuelve la nota de voz del principio, ahora llena y con «0:42». Se envía con un *whoosh*.
- **Revelación del logo «La H que habla»** (ver §3) + **«Habla. Por fin, a hablar.»** → **«Hoy, tu primera frase.»**
- Debajo, en pequeño: «Android · Gratis con tu propia clave de Gemini · Tus datos se quedan en tu teléfono».
- **Firma de autoría** (deseo expreso del dueño, que quede constancia de que la app es suya): «Creada por **Liomar**» con el año (© 2026), visible al menos 2 s en el cierre de las tres composiciones, también en el `Teaser15`. Pon el texto en `copy.ts` (`AUTHOR`) para poder añadir el apellido o un enlace.

## 5. Sonido
- **Música:** pop/lo-fi optimista, 100–110 BPM, que **arranca en el primer latido de la onda** (escena 1). Antes, silencio con un «tic».
- **Efectos:** toque (tap), *pop* de burbujas, *whoosh* en transiciones, campanita al subir de nivel y chisporroteo/flor/gota/viento en cada secreto de mascota.
- **Voz:**
  - Opcional, una voz en off cálida en español neutro con las frases en negrita.
  - Las frases del profe en inglés, con voz TTS americana (Emma) o británica (Leo).
  - Coloca el audio en `public/` y cárgalo con `<Audio>` de `@remotion/media`. Si no hay audio todavía, deja los huecos marcados con `// TODO audio` y el vídeo debe funcionar en silencio.
- Sincroniza los cortes con los golpes de la música (calcula los frames a partir del BPM).

## 6. Requisitos técnicos
- Remotion 4. Todos los `@remotion/*` en **la misma versión exacta** que `remotion`.
- **Estructura:**
  - `src/Root.tsx`: las 3 composiciones.
  - `src/scenes/Scene0Silence.tsx` … `Scene9Close.tsx`.
  - `src/components/`: `Phone` (mockup), `Mascot`, `VoiceWave`, `MicRing`, `VoiceBars10`, `GlassCard`, `TipBubble`, `Caption`.
  - `src/theme.ts`: tokens de la tabla de §3.
  - Los textos en un único `src/copy.ts`, para cambiarlos sin tocar las animaciones.
- **Animación:**
  - Todo con `useCurrentFrame()`, `interpolate()` (con `extrapolateRight: 'clamp'`) y `spring()`.
  - Nada que dependa del reloj real.
  - Para la aleatoriedad, `random()` con semilla.
- **Accesibilidad:** contraste AA en los textos, con un tamaño mínimo de 44 px en vertical. Nada importante en el 10 % superior e inferior (zonas que tapan las apps).
- **Comprobación:**
  - Abre `npx remotion studio` y revisa cada escena.
  - Renderiza primero el `Teaser15` y después los otros:
    - `npx remotion render Teaser15 out/teaser.mp4`
    - `npx remotion render PromoVertical out/habla-vertical.mp4`
    - `npx remotion render PromoHorizontal out/habla-horizontal.mp4`
  - Saca fotogramas de control con `npx remotion still` en los segundos 3, 12, 30, 43, 65 y 73, y revísalos.
- **Internet lento:** antes del primer render, `npx remotion browser ensure`, y no borres `node_modules`.

## 6 bis. Subtítulos como pista aparte (opcionales para quien lo ve)
- Define las líneas habladas con sus tiempos en `src/subtitles.ts` (`{ from, to, es, en? }` en frames). Esa es la única fuente: si cambia el montaje, se cambian ahí.
- Crea un script `npm run subs` que genere desde ese archivo:
  - `out/habla-promo.es.srt` y `out/habla-promo.es.vtt`: español, con las frases en inglés del profe y de Liomar tal cual y su traducción entre corchetes;
  - `out/habla-promo.en.srt`: versión en inglés, opcional.
- **Pista incrustada (soft subs):** después del render, añade la pista al MP4 **sin quemarla en la imagen**, con el FFmpeg que trae Remotion:
  `npx remotion ffmpeg -i out/habla-vertical.mp4 -i out/habla-promo.es.srt -c copy -c:s mov_text -metadata:s:s:0 language=spa out/habla-vertical-cc.mp4`
  (lo mismo para el horizontal). Los reproductores que lo admiten (YouTube, VLC, la galería de muchos Android) muestran el botón CC.
- **Dónde funciona cada cosa** (pon esta tabla en el README del proyecto):

  | Plataforma | Cómo se activan los subtítulos |
  |---|---|
  | YouTube | Sube el `.srt` en Subtítulos; el espectador pulsa CC |
  | Facebook / LinkedIn | Sube el `.srt` al publicar; se activan desde el reproductor |
  | Instagram / TikTok | No admiten archivo: activa sus **subtítulos automáticos** (el espectador los enciende o apaga) |
  | WhatsApp / estados | No admite subtítulos opcionales: se ve sin ellos |
- **Variante opcional para WhatsApp:** prop `burnSubtitles` (por defecto `false`) en las composiciones. Solo si el dueño lo pide, render aparte `out/habla-vertical-subtitulado.mp4` con los subtítulos dibujados (fuente Outfit, fondo semitransparente, abajo y fuera del 10 % inferior).

## 7. Reglas de honestidad (obligatorias)
- No prometas plazos («C1 en 3 meses») ni resultados garantizados.
- No muestres claves reales. **El dueño autoriza usar su nombre, Liomar** (2026-10-08): en las pantallas de la app (p. ej. «Welcome back, Liomar») y en los créditos de autoría. Ningún otro dato personal.
- La app es para **Android** y se instala con un APK; no digas que está en Google Play.
- Cada persona usa **su propia clave gratuita de Gemini** (con límite diario). La fonética con Azure es opcional.
- Todo lo que se muestre debe existir en Habla 5.9. Si quieres una licencia creativa (p. ej. la escalera hasta C1), márcala como ilustrativa.

## 7 bis. Toques que lo hacen memorable
- **Mapa de tiempos a 104 BPM** (1 compás ≈ 2,31 s ≈ 69 frames): cada cambio de escena cae en el primer tiempo de un compás. El «drop» de la música coincide con la primera respuesta del profe (escena 4) y el segundo, con el escalón C1 (escena 8).
- **Pantalla partida del antes y el después** (5 frames, justo antes del cierre): a la izquierda la onda plana del principio y a la derecha la onda llena. Sin texto: se entiende sola.
- **Contador de valentía:** en la esquina, un pequeño «🔥 1 → 7 → 30 días» que avanza con la racha durante las escenas 7 y 8.
- **Micro-humor de la mascota:** en la escena 5, Gota se pone unas gafas para «leer» la palabra; en la escena 3, se rasca la cabeza al ver «No lo sé» y luego asiente: «mejor que adivinar».
- **Frases motivadoras** (elige una por escena en `copy.ts`; tono cercano, de tú):
  - «El miedo a hablar se quita hablando.»
  - «Equivocarte aquí es gratis. Y cada error te enseña algo.»
  - «Tu profe tiene paciencia infinita. Y cero prisa.»
  - «Cinco minutos de voz al día cambian más que una hora de apuntes.»
  - «No memorizas: conversas.»
- **Gancho alternativo para el `Teaser15`** (prueba las dos versiones):
  - A: «¿Entiendes inglés pero te quedas callado?»
  - B: «Tu inglés no está mal. Solo está callado.»
- **Llamada a la acción final** (texto grande, 1,5 s): **«Hoy, tu primera frase.»**, y después la firma de autoría.
- **Coherencia del color:** cada escena toma el acento del tema de la mascota protagonista. Las transiciones entre temas son wipes con forma de onda, que es la firma visual del vídeo.

## 8. Entregables
1. Las 3 composiciones funcionando en el Studio.
2. `out/teaser.mp4`, `out/habla-vertical.mp4` y `out/habla-horizontal.mp4`.
3. `out/stills/*.png` con los fotogramas de control.
4. Un `README.md` breve: cómo cambiar textos (`copy.ts`), colores (`theme.ts`), música y cómo renderizar.

**Antes de programar, propón en 10 líneas cómo vas a resolver la onda conductora y la escena 8, y espera mi visto bueno.**
