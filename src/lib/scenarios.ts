export interface Scenario {
  id: string
  title: string // en español, para la UI
  subtitle: string
  emoji: string
  brief: string // instrucciones para el profe (en inglés)
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'free',
    title: 'Charla libre',
    subtitle: 'Conversación relajada sobre lo que sea',
    emoji: '💬',
    brief:
      'Free conversation. Talk about everyday topics: their day, plans, hobbies, news, food, travel. Follow their interests and keep it relaxed.',
  },
  {
    id: 'weak',
    title: 'Mis puntos débiles',
    subtitle: 'Preguntas que fuerzan mis errores típicos',
    emoji: '🎯',
    brief:
      'Targeted practice of the student\'s known weaknesses. Ask questions that force them to use: articles with uncountable nouns (software, advice, paperwork, information), continuous tenses with the auxiliary (I\'m working / I was attending), passive voice (is written / was approved), and the words "actually" vs "currently". Rotate between these targets.',
  },
  {
    id: 'interview',
    title: 'Entrevista técnica',
    subtitle: 'Entrevista para un puesto de ingeniero de IA',
    emoji: '🧑‍💻',
    brief:
      'You are a friendly interviewer at an international tech company hiring a senior AI/agents engineer (the student is the candidate). Ask one interview question at a time: experience, a project they are proud of, system design of an AI agent, trade-offs, a conflict with a teammate, why this company. Ask follow-up questions that push for longer, structured answers (situation, action, result).',
  },
  {
    id: 'client',
    title: 'Explicar mi trabajo a un cliente',
    subtitle: 'Una gestoría quiere automatizar trámites con IA',
    emoji: '🤝',
    brief:
      'You are the owner of a small administrative agency (gestoría) in the UK who is interested in automating paperwork with AI agents but knows nothing about technology. The student is the consultant. Ask about how it works, costs, risks, data privacy, timelines, and what happens when the AI makes a mistake. Be a bit skeptical so the student has to explain clearly.',
  },
  {
    id: 'debate',
    title: 'Debate',
    subtitle: 'Defiende una opinión y argumenta',
    emoji: '⚖️',
    brief:
      'Friendly debate. Propose a controversial but safe topic (e.g. remote work vs office, AI replacing jobs, four-day work week, cities vs countryside), ask for the student\'s opinion and then politely take the opposite side so they have to argue, give reasons and examples.',
  },
  {
    id: 'story',
    title: 'Contar una historia',
    subtitle: 'Narra experiencias en pasado',
    emoji: '📖',
    brief:
      'Storytelling practice with past tenses. Ask the student to tell a story (a trip, a difficult project, a funny moment, their first job) and keep it going with questions like "What happened next?", "How did you feel?", pushing them to narrate in past simple and past continuous.',
  },
]

export function getScenario(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
}
