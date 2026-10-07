// B6 · Genera en el navegador una copia de seguridad FICTICIA de Habla (perfil calibrado + 1 sesión abierta, 2 turnos,
// 1 consulta, 1 tarjeta) y deja en window.__bkFile un File listo para el <input type=file> de importar.
// window.__bkOpts = { sessionEnded: false, noCards: false, cardsNotArray: false }  (opcional, antes de inyectar)
(() => {
  const o = Object.assign({ sessionEnded: false, noCards: false, cardsNotArray: false }, window.__bkOpts || {})
  const now = Date.now()
  const day = 86400000
  const L = { grammar: 'B1', reading: 'B1', listening: 'B1', speaking: 'B1', overall: 'B1' }
  const weeks = Array.from({ length: 12 }, (_, i) => ({
    n: i + 1, titleEs: 'Semana copia ' + (i + 1), focusEn: 'Focus ' + (i + 1), focusEs: 'Foco ' + (i + 1), canDoEs: 'Podrás x', themeEn: 'Travel', review: [4, 8, 12].includes(i + 1),
    ...(i === 0 ? { lessons: Array.from({ length: 5 }, (_, j) => ({ id: `w1l${j + 1}`, week: 1, n: j + 1, titleEs: 'Lección copia ' + (j + 1), kind: 'conversation', situationEn: 'Chat', targetEn: 'x', phrases: [], missionEs: 'x', openerEn: 'Hi from the backup?' })) } : {}),
  }))
  const profile = {
    id: 'me', name: 'Copia B6', about: 'Tecnología', interests: ['travel', 'food', 'sports'], levels: L, weaknesses: ['Tenses'], goal: '', startedAt: now - 20 * day,
    calibratedAt: now - 10 * day, tests: [{ date: now - 10 * day, levels: L, testLevels: L, confidence: { grammar: 'high', reading: 'high', listening: 'high', speaking: 'high' }, bankVersion: 1, strengthsEs: [], weaknessesEs: [], summaryEs: 'x', grammarAnswers: [] }],
    levelEvents: [], bankUsage: { seen: [], uses: {} },
    plan: { createdAt: now - 10 * day, start: now - 3 * day, levelAtStart: 'B1', weeks, done: {} },
  }
  const sessions = [{ id: 7001, scenario: 'free', startedAt: now - day, ...(o.sessionEnded ? { endedAt: now - day + 600000 } : {}), topic: { title: 'Backup topic', titleEs: 'Tema de la copia' } }]
  const turns = [
    { id: 9001, sessionId: 7001, role: 'teacher', text: 'Hi from the backup? (turn A)', createdAt: now - day + 1000 },
    { id: 9002, sessionId: 7001, role: 'user', text: 'I am the backup student (turn B)', createdAt: now - day + 2000 },
  ]
  const lookups = [{ id: 1, query: 'backup', context: '', saved: true, createdAt: now - day, result: { headword: 'backup', ipa: 'x', partOfSpeech: 'noun', translation: 'copia', meaningEs: 'copia', whyEs: '', otherMeanings: [], register: 'neutral', collocations: [], falseFriendEs: '', exampleEn: 'A backup.', exampleEs: 'Una copia.' } }]
  const cards = [{ id: 1, front: 'backup', back: 'copia', due: now - day, createdAt: now - day }]
  const tables = { sessions, turns, mistakes: [], profile: [profile], lookups }
  if (o.cardsNotArray) tables.cards = 'x'
  else if (!o.noCards) tables.cards = cards
  const json = JSON.stringify({ format: 'habla-backup', version: 1, exportedAt: new Date().toISOString(), tables })
  window.__bkFile = new File([json], 'habla-backup-b6.json', { type: 'application/json' })
  // Pone el archivo en el primer <input type=file> visible y dispara change (como si se eligiera en el selector).
  window.feedFile = (file = window.__bkFile) => {
    const inp = document.querySelector('input[type=file]')
    if (!inp) return 'sin input file'
    const dt = new DataTransfer()
    dt.items.add(file)
    inp.files = dt.files
    inp.dispatchEvent(new Event('change', { bubbles: true }))
    return 'ok ' + file.name + ' ' + file.size
  }
  return 'copia ficticia lista ' + json.length + ' B ' + JSON.stringify(o)
})()
