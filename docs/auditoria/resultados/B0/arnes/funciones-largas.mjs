// Lista las funciones más largas de src/ (solo lectura). Uso: node funciones-largas.mjs <raíz-proyecto>
import ts from 'typescript'; import fs from 'node:fs'; import path from 'node:path';
const root = process.argv[2] || '.'; const out = [];
function walk(d){ for (const f of fs.readdirSync(d,{withFileTypes:true})) { const p=path.join(d,f.name); if (f.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(f.name)) scan(p); } }
function scan(p){ const src=fs.readFileSync(p,'utf8'); const sf=ts.createSourceFile(p,src,ts.ScriptTarget.Latest,true,p.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const visit=(n)=>{ if (ts.isFunctionDeclaration(n)||ts.isArrowFunction(n)||ts.isFunctionExpression(n)||ts.isMethodDeclaration(n)) {
      const s=sf.getLineAndCharacterOfPosition(n.getStart()).line+1, e=sf.getLineAndCharacterOfPosition(n.getEnd()).line+1;
      let name=n.name?.getText?.(sf); if(!name && ts.isVariableDeclaration(n.parent)) name=n.parent.name.getText(sf); if(!name && ts.isCallExpression(n.parent)) name=`(callback de ${n.parent.expression.getText(sf).slice(0,30)})`;
      out.push({file:path.relative(root,p).split(path.sep).join('/'),name:name||'(anónima)',start:s,lines:e-s+1}); }
    ts.forEachChild(n,visit); }; visit(sf); }
walk(path.join(root,'src')); out.sort((a,b)=>b.lines-a.lines);
for (const o of out.slice(0,15)) console.log(`${String(o.lines).padStart(5)}  ${o.file}:${o.start}  ${o.name}`);
