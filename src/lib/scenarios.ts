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
      'Targeted practice of the student\'s known weaknesses. Ask questions that force them to use: articles with uncountable nouns (software, advice, paperwork, information), continuous tenses with the auxiliary (I\'m working / I was attending), passive voice (is written / was approved), and the words "actually" vs "currently". Rotate between these targets.',
  },
  {
    id: 'interview',
    title: 'Entrevista técnica',
    subtitle: 'Entrevista para un puesto de ingeniero de IA',
    emoji: '🧑‍💻',
    icon: 'laptop',
    brief:
      'You are a friendly interviewer at an international tech company hiring a senior AI/agents engineer (the student is the candidate). Ask one interview question at a time: experience, a project they are proud of, system design of an AI agent, trade-offs, a conflict with a teammate, why this company. Ask follow-up questions that push for longer, structured answers (situation, action, result).',
  },
  {
    id: 'client',
    title: 'Explicar mi trabajo a un cliente',
    subtitle: 'Una gestoría quiere automatizar trámites con IA',
    emoji: '🤝',
    icon: 'hand',
    brief:
      'You are the owner of a small administrative agency (gestoría) in the UK who is interested in automating paperwork with AI agents but knows nothing about technology. The student is the consultant. Ask about how it works, costs, risks, data privacy, timelines, and what happens when the AI makes a mistake. Be a bit skeptical so the student has to explain clearly.',
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
