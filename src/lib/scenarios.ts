import type { IconName } from '../ui/icons'

export interface Scenario {
  id: string
  title: string // en español, para la UI
  subtitle: string
  emoji: string
  icon: IconName
  /** Escenario interno: no aparece en la lista de prácticas guiadas. */
  hidden?: boolean
  brief: string // instrucciones para el profe (en inglés)
  topic?: boolean // usa un tema dinámico (noticias, IA, viajes…)
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'free',
    title: 'Charla libre',
    subtitle: 'Conversación relajada sobre lo que sea',
    emoji: '💬',
    icon: 'mic',
    brief:
      'Relaxed, lively conversation about today\'s topic, like two friends chatting over coffee.',
    topic: true,
    hidden: true,
  },
  {
    id: 'open',
    title: 'Charla libre',
    subtitle: 'Habla de lo que quieras',
    emoji: '🎙️',
    icon: 'mic',
    hidden: true,
    brief:
      'Open conversation with no fixed topic. Start by asking about the student\'s day, then follow whatever they want to talk about, asking curious follow-up questions. Never steer towards their job unless they bring it up.',
  },
  {
    id: 'weak',
    title: 'Mis puntos débiles',
    subtitle: 'Preguntas que fuerzan mis errores típicos',
    emoji: '🎯',
    icon: 'target',
    brief:
      'Targeted practice of the student\'s weaknesses (see "Weaknesses found in their placement test" and "Structures this student often gets wrong"). Ask everyday questions designed so that answering them naturally FORCES the student to use those structures. Rotate between the targets, one per question, and keep it friendly.',
  },
  {
    id: 'interview',
    title: 'Entrevista de trabajo',
    subtitle: 'Practica una entrevista en inglés para tu profesión',
    emoji: '🧑‍💼',
    icon: 'laptop',
    brief:
      'You are a friendly interviewer at an international company. The student is the candidate for a job that matches what they do (see "What they do"); if that is unknown or they are not working, run a general interview for a job they would like (ask them first which one). Ask one interview question at a time: experience, strengths, a challenge they solved, teamwork, why this job, questions for you. Ask follow-ups that push for longer, structured answers (situation, action, result). Adapt the difficulty to their level.',
  },
  {
    id: 'client',
    title: 'Explicar a qué me dedico',
    subtitle: 'Alguien curioso te pregunta por tu trabajo o tu día a día',
    emoji: '🤝',
    icon: 'hand',
    brief:
      'You are a curious person from another country who knows nothing about the student\'s field (see "What they do"). Ask them to explain what they do: a typical day, what they like and dislike, how things work in their job, what is difficult, advice for a beginner. If they are retired, studying or not working, ask about their daily life, their former job or their studies instead. Ask simple, genuine follow-up questions so they have to explain clearly.',
  },
  {
    id: 'debate',
    title: 'Debate',
    subtitle: 'Defiende una opinión y argumenta',
    emoji: '⚖️',
    icon: 'scale',
    brief:
      'Friendly debate about today\'s topic. Turn it into a clear debatable question, ask for the student\'s opinion and then politely take the opposite side so they have to argue, give reasons and examples. Use phrases like "I see your point, but…" and push them to defend their view.',
    topic: true,
  },
  {
    id: 'story',
    title: 'Contar una historia',
    subtitle: 'Narra experiencias en pasado',
    emoji: '📖',
    icon: 'book',
    brief:
      'Storytelling practice with past tenses. Ask the student to tell a story (a trip, a difficult project, a funny moment, their first job) and keep it going with questions like "What happened next?", "How did you feel?", pushing them to narrate in past simple and past continuous.',
  },
]

export function getScenario(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
}
