// Revisión móvil 5.9 · R13 (SEG-501/RES-704): importar una copia mal formada y otra vacía en com.shift.habla.debug.
// window.__R13 = 'mal' | 'vacia'  (se pasa delante). No espera al confirm() nativo: lo dispara y vuelve.
const nav = [...document.querySelectorAll('nav button')]
nav[3].click()
await s(1500)
clickText('Mi perfil y datos')
await s(1500)
const inp = document.querySelector('input[type=file]')
const body = window.__R13 === 'mal' ? '{"format":"habla-backup","version":3,"tables":{"sessions":[{"id":1,' : JSON.stringify({ format: 'habla-backup', version: 1, exportedAt: Date.now(), tables: {} })
const f = new File([body], 'copia-' + window.__R13 + '.json', { type: 'application/json' })
const dt = new DataTransfer()
dt.items.add(f)
inp.files = dt.files
setTimeout(() => inp.dispatchEvent(new Event('change', { bubbles: true })), 200)
'cargada ' + window.__R13 + ' (' + f.size + ' B)'
