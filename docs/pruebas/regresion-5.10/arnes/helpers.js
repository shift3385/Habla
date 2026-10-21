window.s = (ms) => new Promise((r) => setTimeout(r, ms))
window.clickText = (t) => { const el = [...document.querySelectorAll('button,a,[role=button]')].find((b) => b.innerText.trim().includes(t)); if (!el) return 'no ' + t; el.click(); return 'ok ' + el.innerText.trim().slice(0, 30) }
window.clickAria = (t) => { const el = [...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === t); if (!el) return 'no ' + t; el.click(); return 'ok ' + t }
window.btns = () => [...document.querySelectorAll('button')].map((b) => (b.innerText.trim() || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean)
window.st = () => { const S = __b3.summary(); return JSON.stringify({ now: S.now, tl: S.tl.slice(-4), ev: S.ev.slice(-8), rec: S.rec.map((r) => r.id + ':' + r.state), mic: S.mic.map((m) => m.id + ':' + (m.live ? 'live' : 'off')), net: S.net.map((n) => n.t + (n.audio ? ' audio ' : ' ') + n.kb + 'KB') }) }
'helpers ok'
// Revisión móvil 5.9: toque real (pointerdown + pointerup) en el botón de hablar, que ya no usa click().
window.tapTalk = (id = 1, holdMs = 60) => { const b = document.querySelector('button[aria-label="Tocar para hablar"],button[aria-label="Enviar"]'); if (!b) return 'no botón'; const r = b.getBoundingClientRect(); const o = { bubbles: true, cancelable: true, pointerId: id, isPrimary: id === 1, pointerType: 'touch', clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }; b.dispatchEvent(new PointerEvent('pointerdown', o)); setTimeout(() => { b.dispatchEvent(new PointerEvent('pointerup', o)); b.dispatchEvent(new MouseEvent('click', o)) }, holdMs); return 'tap ' + b.getAttribute('aria-label') }
'helpers 5.9 ok'
