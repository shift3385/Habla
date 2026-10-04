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
}

export const RELEASES: Release[] = [
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
