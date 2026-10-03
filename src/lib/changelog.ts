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
    v: '5.3',
    date: '2026-10-02',
    title: 'Micrófono con auriculares Bluetooth',
    fixed: ['Con auriculares Bluetooth la app grababa silencio y no te entendía: ahora detecta el micrófono mudo y usa el del teléfono, también si conectas o desconectas los auriculares con la app abierta'],
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
