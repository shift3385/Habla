const T = {
  ember: { dark: { bg: '#0a0605', acc: '#ff6a2b', acc2: '#5fd3df', ink: '#fff', tx: '#ffffff', sub: 'rgba(255,255,255,.64)', g: 'rgba(255,255,255,.07)' }, light: { bg: '#f7efe8', tx: '#1d1411', sub: 'rgba(29,20,17,.64)', acc: '#e04a14', acc2: '#0d7480', ink: '#fff', g: 'rgba(255,255,255,.55)' } },
  lumi: { dark: { bg: '#020c07', acc: '#1f9d66', acc2: '#7fe0b0', ink: '#fff', tx: '#ffffff', sub: 'rgba(255,255,255,.64)', g: 'rgba(255,255,255,.07)' }, light: { bg: '#eef6f1', tx: '#0d1f16', sub: 'rgba(13,31,22,.62)', acc: '#147f4f', acc2: '#0f6b45', ink: '#fff', g: 'rgba(255,255,255,.55)' } },
  marea: { dark: { bg: '#061420', acc: '#7fd0ff', acc2: '#7fe8dc', ink: '#04202a', tx: '#ffffff', sub: 'rgba(255,255,255,.64)', g: 'rgba(255,255,255,.07)' }, light: { bg: '#eef7fb', tx: '#0d2530', sub: 'rgba(13,37,48,.64)', acc: '#1a7fc0', acc2: '#0d7f7a', ink: '#fff', g: 'rgba(255,255,255,.55)' } },
  nimbo: { dark: { bg: '#0b0a1f', acc: '#b7a8ff', acc2: '#d8d0ff', ink: '#140f3a', tx: '#ffffff', sub: 'rgba(255,255,255,.64)', g: 'rgba(255,255,255,.07)' }, light: { bg: '#f4f2fb', tx: '#1a1838', sub: 'rgba(26,24,56,.62)', acc: '#6a5ad6', acc2: '#5a4be0', ink: '#fff', g: 'rgba(255,255,255,.55)' } },
}
const parse = (c) => { if (c.startsWith('#')) { let h = c.slice(1); if (h.length === 3) h = [...h].map((x) => x + x).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1) } const m = c.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number); return [m[0], m[1], m[2], m[3] ?? 1] }
const over = (fg, bg) => { const [r, g, b, a] = parse(fg); const [R, G, B] = typeof bg === 'string' ? parse(bg) : bg; return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)] }
const mix = (c1, p, c2) => { const a = parse(c1), b = parse(c2); return [0, 1, 2].map((i) => a[i] * p + b[i] * (1 - p)) }
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(2) }
const rows = []
for (const [k, m] of Object.entries(T)) for (const [mode, t] of Object.entries(m)) {
  const bg = parse(t.bg).slice(0, 3)
  const glass = over(t.g, bg)
  const tip = mix(t.acc, 0.2, t.bg)
  const c = (fg, base) => cr(typeof fg === 'string' ? over(fg, base) : fg, base)
  rows.push([k + ' ' + mode, c(t.tx, glass), c(t.sub, glass), c(t.tx, tip), c(t.sub, tip), c(t.acc2, glass), c('#22c58b', glass), c('#f87171', glass), cr(parse(t.ink).slice(0, 3), parse(t.acc).slice(0, 3))].join(' | '))
}
console.log('tema | tx/cristal | sub/cristal | tx/globo | sub/globo | acc2/cristal | verde OK/cristal | rojo BAD/cristal | ink/acc')
console.log(rows.join('\n'))
console.log('--- alternativas en claro (sobre cristal de cada tema)')
for (const c of ['#0f8a5f', '#0b7a53', '#c2410c', '#dc2626', '#b91c1c']) console.log(c, Object.entries(T).map(([k, m]) => k + ' ' + cr(parse(c).slice(0,3), over(m.light.g, parse(m.light.bg).slice(0,3))) + ' globo ' + cr(parse(c).slice(0,3), mix(m.light.acc, 0.2, m.light.bg))).join(' · '))
