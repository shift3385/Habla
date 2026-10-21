const T = {
 ember:{dark:{bg:'#0a0605',b1:'#ff4d12',tx:'#ffffff',sub:[255,255,255,.64],acc:'#ff6a2b'},light:{bg:'#f7efe8',b1:'#ffab7f',tx:'#1d1411',sub:[29,20,17,.64],acc:'#e04a14'}},
 lumi:{dark:{bg:'#020c07',b1:'#0f6b45',tx:'#ffffff',sub:[255,255,255,.64],acc:'#1f9d66'},light:{bg:'#eef6f1',b1:'#9fe0c0',tx:'#0d1f16',sub:[13,31,22,.62],acc:'#147f4f'}},
 marea:{dark:{bg:'#061420',b1:'#1f6fb8',tx:'#ffffff',sub:[255,255,255,.64],acc:'#7fd0ff'},light:{bg:'#eef7fb',b1:'#a8d4ff',tx:'#0d2530',sub:[13,37,48,.64],acc:'#1a7fc0'}},
 nimbo:{dark:{bg:'#0b0a1f',b1:'#5a4be0',tx:'#ffffff',sub:[255,255,255,.64],acc:'#b7a8ff'},light:{bg:'#f4f2fb',b1:'#d9d2ff',tx:'#1a1838',sub:[26,24,56,.62],acc:'#6a5ad6'}},
}
const hex=(h)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16))
const mix=(a,b,k)=>a.map((v,i)=>v*(1-k)+b[i]*k)
const lum=(c)=>{const f=c.map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*f[0]+.7152*f[1]+.0722*f[2]}
const cr=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)}
const out=[]
for (const [k,m] of Object.entries(T)) for (const [mode,v] of Object.entries(m)) {
  const bg=hex(v.bg), white=[255,255,255]
  const alpha = mode==='dark'?.07:.55
  // peor caso actual: cristal sobre la mancha b1 (con su opacidad .85 y el velo) ≈ mezcla bg/b1 al 50 %
  const blobArea = mix(bg, hex(v.b1), .5)
  const glassNow = mix(blobArea, white, alpha)
  const glassSolid = mix(bg, white, alpha) // propuesta: cristal opaco = mismo tono medio, sin fondo de manchas
  const sub = (base)=>mix(base, v.sub.slice(0,3), v.sub[3])
  out.push([k,mode, cr(hex(v.tx),glassNow).toFixed(1), cr(sub(glassNow),glassNow).toFixed(1), cr(hex(v.tx),glassSolid).toFixed(1), cr(sub(glassSolid),glassSolid).toFixed(1), cr(hex(v.acc),glassSolid).toFixed(1)].join(' | '))
}
console.log(out.join('\n'))
