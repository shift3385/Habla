import info from '../../version.json'

// Versión instalada (misma fuente que el APK: version.json) y novedades de cada versión.

export const APP_VERSION: string = info.version
export const APP_BUILD: number = info.build
export const APP_DATE: string = info.date

export interface Release {
  v: string
  date: string // AAAA-MM-DD
  title: string
  added?: string[]
  fixed?: string[]
  improved?: string[]
  /**
   * Parches de seguridad y corrección de esta versión (5.8 → 5.8.1, 5.8.2), del más antiguo al más reciente.
   * Siempre cuelgan de su versión: en Novedades se ven dentro de ella, cada uno en su propio desplegable.
   */
  patches?: Release[]
}

/** La versión o el parche `v` y, si es un parche, la versión a la que pertenece. */
export function findRelease(v: string): { release: Release; parent: Release | null } | null {
  for (const r of RELEASES) {
    if (r.v === v) return { release: r, parent: null }
    const p = r.patches?.find((x) => x.v === v)
    if (p) return { release: p, parent: r }
  }
  return null
}

/** Lo último que salió: el parche más reciente de la última versión, o la versión si no tiene parches. */
export function latestEntry(): Release {
  const r = RELEASES[0]
  return r.patches?.at(-1) ?? r
}

export const RELEASES: Release[] = [
  {
    v: '5.11',
    date: '2026-10-21',
    title: 'Sonidos del inglés y más ganas de practicar',
    added: [
      'Nueva pestaña «Sonidos»: los 40 sonidos del inglés americano en una tabla, cada uno con cómo se pone la boca, ejemplos, pares de palabras y el error típico de quien habla español. Muchos se oyen también sueltos',
      'El abecedario en inglés y 12 lecciones cortas para oír, distinguir y decir los sonidos. Con «Dilo tú» te digo qué sonido te salió; sin Azure, «Escúchate» te deja comparar tu voz con el modelo',
      'Debajo de tu nota de pronunciación, «Practicar el sonido» te lleva a su ficha',
      'Tu mascota celebra tus logros: rachas, frases repasadas, tu primer tema dominado… Y en Progreso, «Tus logros»',
      'Comodín de racha: un día de descanso a la semana no rompe tu racha',
      'Modo ligero (Ajustes → Apariencia → Rendimiento): apaga el cristal desenfocado, el fondo de colores, los brillos, las animaciones y el movimiento de la mascota para que la app vaya fluida en teléfonos modestos. Todo funciona igual, y puedes elegir efecto por efecto',
    ],
    improved: [
      'Tu informe te compara contigo: cada cifra con una flecha frente a tu media de las últimas clases',
      'Apariencia, ordenada en secciones: Tema y mascota, Tamaño de letra, Rendimiento y Pantalla y globos',
      'Tu profe varía: a veces, en vez de preguntarte, te propone un mini-reto',
      'Repaso: de vez en cuando, «Escucha y repite»; y la opción «Que decida Habla» para pasar sola a la siguiente',
      'Tu mascota dice las cosas de varias formas y retira los consejos que ya viste',
      'Si no se puede preparar tu lección, tu mascota te propone charlar de uno de tus temas favoritos',
      'Pronunciación: si Azure lo detecta, te digo qué sonido te salió («te salió /s/ en vez de /θ/»), con consejos pensados para Latinoamérica',
    ],
  },
  {
    v: '5.10',
    date: '2026-10-18',
    title: 'Gramática: cada tema explicado por tu mascota, con ejercicios y para decirlo en voz alta',
    added: [
      'Nueva pestaña «Gramática» en el Inicio: 12 secciones y 90 temas (tiempos verbales, negaciones y preguntas, modales, «debería, podría, desearía», condicionales, pasiva, estilo indirecto, artículos, preposiciones, orden y conectores, falsos amigos y pronombres), con su nombre técnico y en español',
      'Buscador de temas («wish», «pasado», «debería»…). Los temas de tus errores en clase y de la lección de hoy llevan una ⭐',
      'Cada tema: explicación de tu mascota con fórmulas, ejemplos para oír y los errores típicos de quien habla español; ejercicios (lo que fallas va al Repaso); «Dilo tú» para practicarlo en voz alta (suma a tu meta diaria) y «Pregúntale» a tu mascota cualquier duda',
      'Practica cualquier tema en una clase con tu profe. En la clase, cada corrección te lleva a su tema de Gramática, y el informe te dice qué repasar',
      'Palabras: sinónimos y antónimos de cada palabra consultada. Toca uno para ver qué significa (y vuelve atrás paso a paso) o escúchalo con ▶',
      'Al terminar el Repaso, tu resumen: frases repasadas, aciertos, nota y qué te costó más',
      'Explicaciones de Gramática con ▶/⏸: tu mascota te las lee en español, despacio, y las palabras en inglés con voz inglesa',
    ],
    improved: [
      'El Repaso graba como la clase: el mismo micro con el anillo de 60 s en cuenta atrás y la onda que sigue tu voz',
      'Inicio: la tarjeta de tu mascota es igual en todos los temas («Gota te espera», tu meta de hoy y ✦ Sorpréndeme)',
      'Progreso: los días que practicaste se ven con el color de tu tema; los días sin práctica, en gris',
      'Palabras: buscador más compacto. Una sola línea; la frase donde viste la palabra se añade si quieres y la explicación está en ⓘ',
      'Repaso: botón «Terminar» para acabar cuando quieras y ver tu resumen; las frases que falten siguen pendientes',
      'Gramática: más sitio para la lista de secciones y buscador «Buscar tema de gramática»',
      'Prueba de sonido y «Probar voz»: sin el texto «… hablando»; lo dicen tu mascota y el botón ▶/⏸',
      'Las clases de un tema de Gramática van a la regla: te la recuerda y te pide traducir, completar o decir si una frase es correcta. Y te corrige todos los errores, no solo los del tema',
      'Una corrección te lleva a todos sus temas de Gramática (hasta 3), no solo a uno',
      'La música de otras apps baja cuando habla tu profe y se pausa mientras grabas',
      'Al tocar el micro verás «Abriendo el micro… espera» y la grabación empieza cuando de verdad entra tu voz: ya no se pierden las primeras palabras',
      'Las ideas de «¿Qué digo?» muestran ▶/⏸ mientras suenan y se paran tocando otra vez',
    ],
    fixed: [
      'Tras leer una idea de «¿Qué digo?», a veces se enviaba la idea en vez de lo que dijiste: ahora se espera a que calle la voz y, si se cuela, te pide grabar otra vez',
    ],
    patches: [
      {
        v: '5.10.1',
        date: '2026-10-21',
        title: 'Actualización de parches de seguridad y corrección de la v5.10',
        fixed: [
          'Con auriculares, el micro está listo en cuanto tu profe termina de hablar: ya no tarda 3–6 s en cada toque. Tu profe sigue sonando con buena calidad y los auriculares solo pasan a modo llamada mientras te toca hablar',
          'Si una grabación no se envía (muy corta, sin voz o era la idea leída), siempre te digo por qué, y el aviso se queda hasta que vuelves a tocar el micro. Con «Enviar igualmente» si crees que sí hablaste',
          '«Abriendo el micro… espera» también en el Repaso, en «Dilo tú» y en el test',
          'Si sales de la app justo al tocar el micro, ya no se abre después',
          'La explicación de Gramática deja de sonar al pasar a Ejercicios, abrir «Pregúntale», empezar una clase o salir del tema',
          'Las fechas se leen bien: «May 5th» suena «May fifth». Y cada palabra con su voz: las españolas en español y las inglesas en inglés',
          'Ejercicios: la frase correcta que oyes y que va al Repaso ya no lleva la pista del enunciado. Tus tarjetas antiguas se corrigen solas',
          'Ejercicios que daban por mala una respuesta válida (otro orden correcto, otra palabra posible) ahora la aceptan',
          '«¿Leíste la idea?» solo salta si dijiste la idea tal cual, no si la usaste para decir algo tuyo',
          'La copia de seguridad y el resumen del test ya no se quedan en el teléfono después de compartirlos',
          'Ver la clave de Gemini ya no deja abierta un minuto la de Azure: cada clave pide tu huella',
        ],
        improved: [
          'Prueba de sonido en un solo paso: tu mascota te pide que repitas una frase y te escucha sola, sin tocar nada. Solo sale con auriculares nuevos y nunca antes de la bienvenida ni durante el test',
          'Ajustes → Apariencia: elige el tamaño de la letra (Pequeña, Normal, Grande, Muy grande) con vista previa. La app respeta también la letra de tu teléfono',
          'Mientras tu mascota te explica un tema largo, la música de otras apps se pausa (y vuelve al acabar) en vez de subir y bajar',
          'Pronunciación: cada sonido a cuidar trae un consejo en español para decirlo bien',
          'Las clases de Gramática no te felicitan si tu respuesta tiene fallos, y la frase en español de la tarea se lee con voz española',
          'Gramática en español neutro («tomar», «ustedes», «celular»…), inglés americano coherente y explicaciones revisadas',
          'Avisos con tu mascota en lugar de las ventanas del sistema en inglés (terminar una clase, importar una copia)',
          'Tu informe te pone la meta de tu nivel, no la de un B2',
          '«Pregúntale» conserva su respuesta cuando abres un tema y vuelves; Atrás te deja a la misma altura de la pantalla',
          'Colores de acierto y fallo legibles en los temas claros, y botones más fáciles de tocar',
        ],
      },
    ],
  },
  {
    v: '5.9',
    date: '2026-10-07',
    title: 'Toca para hablar, tú decides el repaso y tu fonética en todas partes',
    added: [
      'Toca el micro para hablar y tócalo otra vez para enviar: ya no hay que mantenerlo pulsado. Cada respuesta dura como mucho 60 s y la papelera la descarta',
      'Icono nuevo: «la H que habla», una H cuyo puente es una onda de voz (también en los iconos temáticos de Android 13+)',
      'Un anillo alrededor del micro cuenta tus 60 s: se vacía como un reloj y se pone naranja en los últimos 10 s y rojo en los últimos 5',
      'Mientras hablas, las barras junto al micro siguen tu voz de verdad: suben cuando hablas y se quedan quietas en silencio',
      'Tu profe es tu mascota: Gota, Chispa, Musgo o Brisa te dan la clase. Emma y Leo pasan a ser las voces (americana y británica)',
      'El micrófono solo se abre mientras grabas: el punto verde ya no se queda encendido toda la clase, ni entre frases del repaso o tareas del test',
      'Tu clase a medias se puede terminar desde el Inicio, con su informe, como dentro de la clase',
      'Test y re-test: «Posponer», una sola vez por test (tu mascota te pregunta antes si estás seguro). Si pospones el re-test, tu mascota te recuerda que lo tienes a medias',
      'Repaso: tú decides cuándo vuelve cada frase, con botones que dicen cuándo («10 min», «9 días») y una explicación de tu mascota. Hay que elegir para pasar a la siguiente',
      'Repaso: «Ya me la sé» para que una frase no vuelva. La recuperas en Palabras → Ya las sé',
      'Fonética de Azure también en el repaso y en el test (en el test solo informativa: no cuenta para tu nivel), con un interruptor en cada pantalla. Al entrar a clase, tu mascota te recuerda que puedes encenderla o apagarla',
    ],
    improved: [
      'Lo que hablas en el repaso y en una clase a medias cuenta para tu meta de hoy y tu racha',
      'Antes de importar una copia se guarda sola una copia de lo que tenías, en Documentos/Habla',
      'Recordatorio diario: si Android no deja avisarte, tu mascota te lo dice y te explica cómo arreglarlo. Los avisos duran 30 días aunque no abras la app',
      'Tu privacidad, clara: en la bienvenida y en Ajustes → Mis datos se explica qué se queda en el teléfono y qué se envía a Google o a Microsoft',
      'En horizontal, el micrófono y «¿Qué digo?» siempre se pueden tocar, y el repaso deja ver los botones para elegir',
      '«Salir» mientras se prepara la clase',
      'En clase, una sola mascota arriba (más grande) y mucha menos batería en reposo: el brillo de la tarjeta del tema ya no gasta y tu mascota descansa cuando no pasa nada',
    ],
    fixed: [
      'Si se agota el plan gratis de Azure en mitad de una clase, el aviso ya no te saca de ella',
      'Al importar una copia desde la bienvenida ya no te saltas el paso de la clave ni vuelve a salir el tutorial',
      'Tras importar una copia, la clase guardada y los tests a medias de antes ya no se mezclan con los datos nuevos',
      'Si sales de la app mientras grabas, al volver ya no parece que sigues grabando: tu mascota te dice que la grabación se cortó',
      'Tu racha ya no se rompe si ese día hablaste en una clase que dejaste a medias',
      'Test: la audición dice «duración 1 min 20 s»',
      'Prueba de sonido: cada vez que conectas unos auriculares, tu mascota te habla («¿Me oyes?») y luego te pide que digas algo; sigues cuando pasa. Si su micrófono no te oye, puedes hablarle al teléfono y seguir oyendo por los auriculares. También en Ajustes → Profe y voz → Prueba de sonido',
      'Con auriculares, la grabación empieza al momento al tocar el micro (antes tardaba unos 9 s en cada toque)',
    ],
    patches: [
      {
        v: '5.9.1',
        date: '2026-10-08',
        title: 'Actualización de parches de seguridad y corrección de la v5.9',
        fixed: [
          'Si desconectas los auriculares, el repaso ya no falla con «Gemini error 400»: una grabación sin sonido no se envía, te digo «No te he oído» y la siguiente vuelve a buscar un micrófono que funcione',
          'Repaso: la nota de pronunciación se mide sobre lo que dijiste. Si tu frase es correcta aunque no sea la de la tarjeta, ya no te marco palabras que no dijiste',
        ],
        improved: [
          'Junto a cada corrección de la clase y del informe hay un botón para oír cómo se dice la frase correcta',
          'Todos los botones de escuchar se convierten en pausa mientras suenan: tócalo otra vez para pararlo (en el test de nivel no se puede pausar)',
        ],
      },
    ],
  },
  {
    v: '5.8',
    date: '2026-10-05',
    title: 'Tu pronunciación, con nota, y tu mascota te habla',
    added: [
      'Al instalar Habla, tu mascota te explica cómo funciona: que tu profe es una IA (Gemini), para qué es tu clave, cómo conseguirla gratis paso a paso y qué aporta Azure (opcional) para la pronunciación',
      'Si ya usabas Habla, tu mascota te cuenta una vez para qué sirve la clave que pusiste y qué es Azure',
      'Corrector fonético opcional (Azure Speech): bajo cada respuesta, tu nota de pronunciación con Precisión, Fluidez, Completa y Entonación, y las palabras o sonidos a cuidar. Toca cada nota y una burbuja te explica qué mide',
      'Ajustes → Modelos (antes «Gemini»): bloque «Azure Speech (fonética)» con clave, región, interruptor y plan. Ver o cambiar la clave pide tu patrón, PIN o huella, como la de Gemini',
      'Con la fonética activa, cada respuesta dura como máximo 60 s, con cuenta atrás (naranja en los últimos 10 s) y envío automático',
      'Si se acaba el plan gratis de Azure del mes, la fonética se apaga sola, sigues con Gemini y tu mascota te dice cuánto costaría un plan de pago. Con acceso a Azure Monitor ves las horas gratis usadas',
      'Tu mascota te habla en el Inicio con globos: tu clase a medias, la lección de hoy, tu meta, el repaso, tu racha y cuándo repetir el test. Los que tienen botón te llevan directo. Tócala para oír el siguiente',
      'Y te da consejos: qué significa cada nota (fluidez, ppm, pausas…), dónde cambiar tus temas o tu perfil y trucos de la clase. Avisos y consejos se activan por separado en Ajustes → Tema y mascota',
      'El recordatorio diario te lo da tu mascota, con su nombre y su imagen. En Meta diaria puedes probar el aviso en 5 s',
    ],
    improved: [
      'Progreso y Palabras: Errores, Palabras, Sesiones, Historial y Guardadas en un panel con scroll infinito del tamaño de la pantalla',
      'Palabras de Progreso con el mismo estilo que Errores (inglés, español y altavoz)',
      'La tarjeta del tema empieza plegada y brilla hasta que la abres: «Toca para ver el objetivo de esta clase» (o «de esta conversación»)',
      'Las frases largas de la lección van cada una en su caja, en inglés y español, sin salirse',
      'Ajustes más limpio: «Nivel B1» en la tarjeta de tu nivel y la tarjeta Modelos con Gemini y Azure con su plan',
      'Los globos y burbujas de ayuda se tiñen con el color de tu tema y salen sin agobiar (de 9 a 20 s cada uno, casi un minuto entre uno y otro)',
    ],
    fixed: [
      'El test de nivel guarda tu progreso sobre la marcha: si la app se cierra o se actualiza a mitad, sigue en la misma pregunta o tarea',
      'En horizontal, la parte de Habla del test ya se desplaza y se llega al botón «Siguiente»',
      'El recordatorio diario llega a la hora exacta sin pedir permisos extra, y si Android quita el permiso de notificaciones, la app te lo dice',
      'Al guardar tu clave de Azure, la fonética se enciende al momento (antes hacía falta reabrir la app)',
      'Fonética más fiel: si Azure entiende otra palabra («jesterday» → «just stared»), se evalúa contra lo que querías decir',
      'Si Azure no puede evaluar una respuesta, la clase te dice por qué en lugar de callarlo',
      'Tus claves ya no aparecen en el registro interno del teléfono',
    ],
    patches: [
      {
        v: '5.8.1',
        date: '2026-10-06',
        title: 'Actualización de parches de seguridad y corrección de la v5.8',
        fixed: [
          'Tu micrófono, a salvo: si tocas el micro dos veces seguidas, ya no se queda abierto un segundo micrófono escuchando a escondidas',
          'Si sales de la app justo mientras se abre el micro, ya no se vuelve a abrir solo, ni en segundo plano ni al volver',
          'En el Debate y en Tema libre, si vuelves atrás o cierras mientras dictas, el dictado se cancela: se apaga el micro y no se envía nada',
          'Si apoyas un segundo dedo en el botón de hablar, ya no empieza otra grabación escondida',
          'En una habitación en silencio, el micro abre en un par de segundos (antes podía tardar más de 10) y no pierde la cancelación de eco, así la voz de tu profe no se cuela en tus respuestas',
          'Con la app en segundo plano, Android no deja que Habla vuelva a abrir el micrófono',
        ],
      },
      {
        v: '5.8.2',
        date: '2026-10-07',
        title: 'Tus claves y tus datos, más seguros, y menos batería',
        fixed: [
          'La app ya no deja leer tus claves desde un ordenador conectado por cable: ahora se instala la versión final, no la de pruebas',
          'Si pegas una clave de Gemini mal copiada, primero se comprueba con Google: si no vale, sigues con la anterior y la app no se queda sin profe',
          'Al restaurar una copia, se comprueba entera antes de tocar nada: si está dañada o no es de Habla, te lo explica y tus datos siguen como estaban. Antes de sustituir te dice cuántas sesiones y errores trae',
          'Si algo falla al abrir la app, ya no se queda la pantalla en negro: te ofrece volver a intentar o exportar tus datos',
          'Si Google falla al preparar tu plan, ya no lo vuelve a pedir cada vez que vuelves al Inicio: lo intentas tú con «Reintentar», así no gastas tu cuota',
          'En el acceso a Azure Monitor se comprueban los datos que pegas, y cambiarlos pide tu patrón, PIN o huella',
        ],
        improved: [
          'Menos batería y menos calor: el fondo ya no se mueve y tu mascota solo se anima a tope cuando hace algo; quieta, se dibuja a un ritmo mucho más bajo',
          'Si tienes activado «Reducir movimiento» en Android, las animaciones que se repiten se paran',
          'Textos más claros: qué pasa con tu clase a medias si empiezas otra, qué protege tu patrón o PIN, y qué hacer si una clave no es válida',
        ],
      },
    ],
  },
  {
    v: '5.7',
    date: '2026-10-04',
    title: 'Tu clase te espera y la batería dura',
    added: [
      'Si sales de una clase, queda guardada: tu mascota se despide y al volver puedes continuarla donde quedó',
      'Al abrir la app con una clase a medias, tu mascota te ofrece seguirla',
      'Tu mascota te pregunta antes de cerrar la app',
      'Todas las correcciones de cada respuesta, no solo una',
      'Dicta por voz el tema en Tema libre y Debate',
      'Resumen con tus respuestas y las correctas al final de cada parte del test',
      'Duración del audio y transcripción por personas en la audición del test',
      'Nueva sección Mi nivel, separada de Mi perfil',
      'Orientación de la pantalla en Tema y mascota: automática, vertical u horizontal fija (aunque el teléfono no gire)',
    ],
    improved: [
      'Batería: en segundo plano la app se queda quieta (micrófono, voz y animaciones apagados)',
      'Las respuestas escritas aceptan formas de la misma palabra (reversible / reversibility)',
      'La fórmula del nivel se ve como una fracción, con tus números',
      'Pantallas pequeñas (p. ej. Galaxy A11) y en horizontal se ven bien',
      'Palabras: nada se sale de las tarjetas',
      'Tu clave de Gemini ya no entra en las copias automáticas de Android',
      'Para ver o cambiar tu clave de Gemini se pide el patrón, PIN o huella del teléfono',
    ],
  },
  {
    v: '5.6',
    date: '2026-10-03',
    title: 'Un test de nivel nuevo, con banco de preguntas',
    added: [
      'Banco de 450 preguntas, textos y audios originales (estilo IELTS y Cambridge), de A1 a C2: el test ya no gasta tokens salvo para corregir tu habla',
      'Gramática con 20 preguntas (5 de escribir), lectura y audición adaptativas por bloques y 3 tareas de habla',
      'Audición con vista previa de las preguntas, 3 escuchas con nota, varias voces y la revisión de respuestas',
      'Tu mascota te explica antes cómo se calcula tu nivel, y en el resultado te enseña la fórmula con tus números y la confianza de cada destreza',
      'Nunca repetirás un texto o audio que ya viste en un test anterior',
      'Si Gemini se satura, va lento, se queda sin cuota o rechaza la clave, tu mascota te propone otro modelo u otra clave',
      'Si falla la evaluación del test, tus respuestas y audios quedan guardados para reintentar sin repetirlo',
    ],
    improved: [
      'Las clases ya no cambian tu nivel: proponen tu progreso, y solo el re-test lo ajusta (70 % test + 30 % clases)',
      'Nivel general: las cuatro destrezas pesan igual, con tope por la destreza más débil',
      'El primer test ya no aparece como un cambio desde B1',
    ],
  },
  {
    v: '5.5',
    date: '2026-10-03',
    title: 'Tu mascota te cuenta las novedades',
    added: [
      'Antes del Inicio, tu mascota te cuenta las novedades, tu tarea de hoy, el re-test y otros avisos, de uno en uno',
      'Tema libre y Debate con la mascota: te pregunta de qué quieres hablar o qué quieres debatir',
    ],
    improved: [
      'El Inicio ya no tiene avisos: todo cabe sin scroll',
      'Tema libre respeta exactamente tu tema y el profe sabe que lo elegiste tú',
      'En un debate la tarjeta muestra que es un debate',
    ],
  },
  {
    v: '5.4',
    date: '2026-10-03',
    title: 'Tus 3 temas y un Inicio sin scroll',
    added: [
      'Eliges exactamente 3 temas favoritos: son los que ves en el Inicio',
      'Tema libre: escribe de qué quieres hablar y el profe prepara la clase',
      'Más temas: todos los temas para hablar de cualquiera, y cambiar tus 3',
      'Debate: eliges si el tema lo pone el profe o lo propones tú',
    ],
    improved: [
      'Temas y Prácticas caben en la pantalla, sin scroll',
      'Si tenías más o menos de 3 temas, la app te pide elegir tus 3 al abrirla',
    ],
  },
  {
    v: '5.3',
    date: '2026-10-02',
    title: 'Auriculares: elige por dónde escuchar y hablar',
    added: [
      'Al conectar auriculares, Habla te pregunta por dónde escuchar al profe y por dónde hablar (todo por los auriculares, escuchar por los auriculares y hablar al teléfono, o todo por el teléfono) y lo recuerda para esos auriculares',
      'Ajustes → Profe y voz → Audio con auriculares',
    ],
    fixed: [
      'Con auriculares Bluetooth la app grababa silencio y no te entendía: ahora usa de verdad el micrófono de los auriculares (con el permiso de Dispositivos cercanos), también si los conectas o desconectas con la app abierta',
    ],
  },
  {
    v: '5.2',
    date: '2026-10-02',
    title: 'Tu compañero te da la bienvenida',
    improved: ['La pantalla de inicio la protagoniza tu mascota (Chispa, Musgo, Gota o Brisa) en lugar del muñequito anterior'],
  },
  {
    v: '5.1',
    date: '2026-10-02',
    title: 'Elige a tu compañero',
    added: [
      'Cuatro mascotas, una por tema: Chispa (Ember), Musgo (Lumi), Gota (Marea) y Brisa (Nimbo)',
      'Tu mascota escucha mientras grabas, piensa mientras el profe responde y habla con su voz',
      'Tócala, estírala o agítala: cada una reacciona a su manera y guarda un secreto (5 toques seguidos)',
      'Nuevos temas Marea (cielo y agua, claro) y Nimbo (violeta); en la bienvenida eliges tu compañero',
      'Ajustes → Tema y mascota',
    ],
    improved: ['El tema Aurora pasa a Marea'],
  },
  {
    v: '5.0',
    date: '2026-10-02',
    title: 'Tu plan de 12 semanas',
    added: [
      'Plan personalizado de 12 semanas según tu test: un objetivo por semana y 5 lecciones con situación, frases y misión',
      '"Lección de hoy" en el Inicio y pantalla Mi plan con tu progreso',
      'Recordatorio diario con la lección que toca (Ajustes → Meta diaria)',
      'Re-test cada 4 semanas: aviso en el Inicio, notificación y comparación antes → después',
      'Tras cada re-test, el plan se adapta a tu nuevo nivel',
      'Historial de tus tests en Ajustes → Mi perfil',
    ],
  },
  {
    v: '4.10',
    date: '2026-10-01',
    title: 'Respuestas mucho más rápidas',
    improved: [
      'Si un modelo se queda sin cuota, la app pasa al de respaldo al instante y lo recuerda (antes perdía 15–20 s en cada respuesta)',
      'Modelo rápido para ideas, tema del día, informe y palabras: responden en 1–2 s',
      'Tu voz se envía 5 veces más ligera: menos espera con datos móviles',
      'En el test de habla cada respuesta se evalúa mientras grabas la siguiente: el resultado final sale en segundos',
      'Tiempo máximo de espera con mensaje claro, en vez de quedarse pensando sin fin',
    ],
    added: ['Ajustes → Diagnóstico: velocidad de Gemini, errores recientes y modelos sin cuota, para compartir'],
    fixed: [
      'El nivel global del test podía salir C1 aunque al hablar fueras B1: ahora el habla cuenta doble',
      'El profe ya no "corrige" frases que estaban bien (por ejemplo "actually")',
    ],
  },
  {
    v: '4.9',
    date: '2026-10-01',
    title: 'Escribe tus respuestas y elige cualquier modelo',
    added: [
      'Botón de teclado en la clase: alterna entre hablar y escribir tu respuesta',
      'Puedes elegir cualquier modelo de Gemini (también los Flash-Lite), actualizar la lista o escribir otro a mano',
    ],
    fixed: ['Al salir de una clase se cancela lo que el profe estaba preparando: ya no habla ni gasta reintentos cuando estás en otra pantalla'],
  },
  {
    v: '4.8',
    date: '2026-10-01',
    title: 'Bienvenida animada y test más claro',
    added: ['Bienvenida con el muñequito de Habla: alta para usuarios nuevos y "Welcome back" para los que vuelven', 'Instrucciones antes de la parte de gramática', 'La animación de carga dice qué parte del test se prepara'],
    fixed: ['El botón de grabar del test de habla podía quedarse bloqueado: ahora el micrófono se reabre solo y se puede saltar la pregunta si sigue fallando'],
  },
  {
    v: '4.7',
    date: '2026-10-01',
    title: 'Repaso de tus errores en voz alta',
    added: [
      'Cuaderno de errores con repetición espaciada (FSRS): cada corrección y cada palabra guardada vuelven en el momento justo',
      'Ejercicio oral: ves la frase en español, la dices en inglés y el profe te corrige',
      '"Repaso de hoy" en el Inicio y botón Repasar en Progreso → Errores',
    ],
  },
  {
    v: '4.6',
    date: '2026-10-01',
    title: 'Nueva animación de preparación y página Acerca de',
    added: [
      'Animación al preparar clases y tests: los iconos se reúnen en el orbe cuando todo está listo',
      'Página Acerca de con novedades, créditos, privacidad y ayuda',
      'Aviso de novedades en el Inicio al instalar una versión nueva',
    ],
    improved: ['Los reintentos cuando Google está saturado ocurren en segundo plano, sin mensajes "Reintentando 1/2/3"'],
  },
  {
    v: '4.5',
    date: '2026-10-01',
    title: 'Una app para cualquier persona',
    added: ['Paso "Tu perfil": nombre, a qué te dedicas, para qué quieres el inglés y temas favoritos', 'Prácticas generales: Entrevista de trabajo y Explicar a qué me dedico'],
    fixed: ['Las debilidades detectadas en el test no llegaban al profe', 'Algunos textos usaban un nivel fijo en vez del tuyo'],
  },
  {
    v: '4.4',
    date: '2026-10-01',
    title: 'Instrucciones en el test',
    added: ['Pantalla de instrucciones antes de lectura, escucha y habla, con recomendación de auriculares'],
  },
  {
    v: '4.3',
    date: '2026-10-01',
    title: 'Opción «No lo sé»',
    added: ['Quinta opción honesta en todas las preguntas del test; el profe trabaja esas lagunas'],
  },
  {
    v: '4.2',
    date: '2026-10-01',
    title: 'Consultas de palabras en contexto',
    added: ['Pestaña Palabras: qué significa una palabra en la frase donde la viste', 'Toca cualquier palabra del profe para consultarla sin salir de la clase'],
  },
  {
    v: '4.1',
    date: '2026-10-01',
    title: 'Corrección en la prueba de escucha',
    fixed: ['El botón Siguiente no se activaba si un audio se interrumpía a medias'],
  },
  {
    v: '4.0',
    date: '2026-10-01',
    title: 'Test de nivel',
    added: ['Test obligatorio de gramática, lectura, escucha y habla', 'Tu nivel ya no se cambia a mano: sube con la práctica y con un re-test cada 4 semanas'],
  },
  {
    v: '3.1',
    date: '2026-10-01',
    title: 'Voces por profe',
    improved: ['Se elige automáticamente una voz femenina para Emma y masculina para Leo si el teléfono la tiene'],
  },
  {
    v: '3.0',
    date: '2026-09-30',
    title: 'Nuevo diseño',
    added: ['Temas Ember, Lumi y Aurora en modo claro y oscuro', 'Profes Emma y Leo', 'Bienvenida en 3 pasos'],
  },
  {
    v: '2.1',
    date: '2026-09-30',
    title: 'Micrófono estilo WhatsApp',
    added: ['Desliza hacia arriba para bloquear la grabación y hacia la izquierda para cancelar'],
  },
  {
    v: '2.0',
    date: '2026-09-30',
    title: 'Fluidez, temas reales y progreso',
    added: ['Nota de fluidez, informe y tarea para mañana', 'Temas con noticias reales y recientes', 'Racha, meta diaria y pestaña Progreso'],
  },
  {
    v: '1.3',
    date: '2026-09-28',
    title: 'Reintentos automáticos',
    improved: ['Si Google está saturado, la app reintenta sola y usa un modelo de respaldo'],
  },
  {
    v: '1.1',
    date: '2026-09-28',
    title: 'Profe con Gemini',
    improved: ['Una sola llamada transcribe tu voz, te corrige y responde'],
  },
  {
    v: '1.0',
    date: '2026-09-28',
    title: 'Primera versión',
    added: ['Conversación por voz con corrección al momento', 'Copias de seguridad de tu progreso'],
  },
]

export function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}
