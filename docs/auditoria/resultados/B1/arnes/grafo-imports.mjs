// B1: grafo de importaciones de src/, capas y ciclos. Solo lectura.
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2] || '.', 'src');
const files = [];
(function walk(d){ for (const e of fs.readdirSync(d,{withFileTypes:true})) { const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(/\.(ts|tsx)$/.test(e.name)) files.push(p);} })(root);
const rel = p => path.relative(root,p).split(path.sep).join('/');
const graph = {}; const ext = {};
for (const f of files) {
  const src = fs.readFileSync(f,'utf8'); const deps = new Set(); const ex = new Set();
  for (const m of src.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const s = m[1]||m[2];
    if (s.startsWith('.')) { let t = path.resolve(path.dirname(f), s);
      for (const c of [t, t+'.ts', t+'.tsx', path.join(t,'index.ts')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) { deps.add(rel(c)); break; }
    } else ex.add(s);
  }
  graph[rel(f)] = [...deps]; ext[rel(f)] = [...ex];
}
const layer = f => f.split('/').length>1 ? f.split('/')[0] : 'root';
// violaciones de capa: lib -> components/screens/ui ; components -> screens ; ui -> screens
const order = { lib:0, ui:1, components:2, screens:3, root:4, bank:-1 };
console.log('== Violaciones de capa (importa de una capa superior) ==');
for (const [f,ds] of Object.entries(graph)) for (const d of ds) if (order[layer(d)] > order[layer(f)]) console.log(`${f} -> ${d}`);
console.log('\n== Ciclos (SCC > 1 o autoimport) ==');
let idx=0; const st=[], on=new Set(), I={}, L={}, sccs=[];
function sc(v){ I[v]=L[v]=idx++; st.push(v); on.add(v); for(const w of graph[v]||[]){ if(I[w]===undefined){sc(w); L[v]=Math.min(L[v],L[w]);} else if(on.has(w)) L[v]=Math.min(L[v],I[w]); }
  if(L[v]===I[v]){ const c=[]; let w; do{ w=st.pop(); on.delete(w); c.push(w);}while(w!==v); if(c.length>1) sccs.push(c);} }
for (const v of Object.keys(graph)) if (I[v]===undefined) sc(v);
for (const c of sccs) console.log(`SCC (${c.length}): ${c.join(', ')}`);
// ciclos mínimos de 2
console.log('\n== Ciclos directos A<->B ==');
for (const [a,ds] of Object.entries(graph)) for (const b of ds) if (a<b && (graph[b]||[]).includes(a)) console.log(`${a} <-> ${b}`);
console.log('\n== Fan-in / fan-out ==');
const fanin = {}; for (const ds of Object.values(graph)) for (const d of ds) fanin[d]=(fanin[d]||0)+1;
for (const f of Object.keys(graph).sort()) console.log(`${f}\tin=${fanin[f]||0}\tout=${graph[f].length}\text=${ext[f].join(' ')}`);
console.log('\n== Aristas por capa ==');
const agg={}; for (const [f,ds] of Object.entries(graph)) for (const d of ds){ const k=layer(f)+' -> '+layer(d); agg[k]=(agg[k]||0)+1;} console.log(agg);
