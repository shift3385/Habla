import json
A=json.load(open('anat.json'))
def section(k, uid, voiced, tx='#0d2530'):
    a=A[k]
    folds = a['folds']
    vib = ('<g stroke="#2f7fd0" stroke-width=".9" fill="none" stroke-linecap="round">'
           '<path d="M121 200 q2 -2 4 0 t4 0"/><path d="M121 210 q2 -2 4 0 t4 0"/></g>') if voiced else ''
    return f'''
<svg viewBox="84 96 118 124" width="100%" style="display:block">
 <defs>
  <linearGradient id="skin{uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9a487"/><stop offset=".65" stop-color="#f0c4a6"/><stop offset="1" stop-color="#f6d3bb"/></linearGradient>
  <radialGradient id="brain{uid}" cx=".55" cy=".45" r=".7"><stop offset="0" stop-color="#e8b9b0"/><stop offset="1" stop-color="#c98d86"/></radialGradient>
  <linearGradient id="tongue{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2717c"/><stop offset=".55" stop-color="#c9505f"/><stop offset="1" stop-color="#a63b4b"/></linearGradient>
  <linearGradient id="muc{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e88f8f"/><stop offset="1" stop-color="#c8616a"/></linearGradient>
  <linearGradient id="bone{uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf0d8"/><stop offset="1" stop-color="#e3cfa6"/></linearGradient>
  <linearGradient id="tooth{uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4e0d6"/></linearGradient>
  <linearGradient id="air{uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f7e3df"/><stop offset="1" stop-color="#fdf3ef"/></linearGradient>
  <clipPath id="hc{uid}"><path d="{a['head']}"/></clipPath>
  <marker id="ar{uid}" viewBox="0 0 8 8" refX="5" refY="4" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#1a7fc0"/></marker>
  <pattern id="fib{uid}" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="3" stroke="#8f2f3d" stroke-width=".35" opacity=".35"/></pattern>
 </defs>
 <!-- huecos de aire (nariz, boca, garganta) -->
 <path d="M90 92 C100 84 120 80 150 80 L160 96 L156 110 L160 132 L158 150 L150 160 L130 200 L122 226 L95 226 L92 180 L88 140 Z" fill="url(#air{uid})"/>
 <!-- cabeza -->
 <path d="{a['head']}" fill="url(#skin{uid})" stroke="#8c5a45" stroke-width=".5"/>
 <g clip-path="url(#hc{uid})">
  <!-- cráneo y cerebro -->
  <ellipse cx="74" cy="50" rx="66" ry="45" fill="url(#bone{uid})" stroke="#b79a6a" stroke-width=".5"/>
  <ellipse cx="74" cy="52" rx="61" ry="40" fill="url(#brain{uid})" stroke="#a86c66" stroke-width=".5"/>
  <clipPath id="bc{uid}"><ellipse cx="74" cy="52" rx="60" ry="39"/></clipPath><g clip-path="url(#bc{uid})" fill="none" stroke="#a5655f" stroke-width=".7" opacity=".7" stroke-linecap="round"><path d="M6 14 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0"/><path d="M10 22 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0"/><path d="M6 30 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0"/><path d="M10 38 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0"/><path d="M6 46 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0"/><path d="M10 54 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0"/><path d="M6 62 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0"/><path d="M10 70 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0"/><path d="M6 78 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0"/><path d="M10 86 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0 a4.2 4.6 0 0 1 8.4 0"/></g><path d="M40 70 C60 62 90 62 110 70" fill="none" stroke="#9a5a55" stroke-width="1.2" opacity=".6"/>
  <!-- cerebelo y tronco -->
  <ellipse cx="38" cy="96" rx="18" ry="12" fill="#d79b93" stroke="#a5655f" stroke-width=".5"/>
  <g stroke="#a5655f" stroke-width=".4" opacity=".7"><path d="M24 92 h28 M23 97 h30 M25 102 h26"/></g>
  <path d="M62 82 C66 96 66 110 64 126 L58 126 C59 110 58 96 54 84 Z" fill="#e7c3a6" stroke="#b08a6a" stroke-width=".5"/>
  <!-- columna: médula y vértebras -->
  <rect x="57" y="124" width="8" height="125" rx="3" fill="#f1dcae" stroke="#b79a6a" stroke-width=".4"/>
  {''.join(f'<rect x="68" y="{118+i*12.5}" width="16" height="10" rx="2.5" fill="url(#bone{uid})" stroke="#b79a6a" stroke-width=".4"/><rect x="69" y="{128.3+i*12.5}" width="14" height="2.2" rx="1" fill="#9db7c9"/>' for i in range(10))}
  <!-- senos nasales y cornetes -->
  <g fill="#e9a0a0" stroke="#b9666c" stroke-width=".4">
   <path d="M118 92 q12 -5 24 0 q-12 4 -24 0z"/><path d="M114 100 q15 -6 30 0 q-15 5 -30 0z"/><path d="M112 108 q16 -5 32 0 q-16 4 -32 0z"/>
  </g>
  <ellipse cx="128" cy="76" rx="10" ry="6" fill="#f4dccf" stroke="#c9a08a" stroke-width=".4"/>
 </g>
 <!-- paladar duro, velo y labio de arriba -->
 <path d="{a['palate']}" fill="url(#muc{uid})" stroke="#9b4552" stroke-width=".5"/>
 <path d="M114 118.5 L150 111 L151 113.5 L115 121.5 Z" fill="url(#bone{uid})" stroke="#b79a6a" stroke-width=".3"/>
 <!-- mandíbula, labio de abajo y cuello -->
 <path d="{a['jaw']}" fill="url(#skin{uid})" stroke="#8c5a45" stroke-width=".5"/>
 <path d="M146 160 C150 168 152 176 150 182 C142 188 132 190 124 190 L124 186 C132 185 141 182 145 177 C146 172 145 166 142 161 Z" fill="url(#bone{uid})" stroke="#b79a6a" stroke-width=".4"/>
 <ellipse cx="117" cy="194" rx="3.5" ry="2" fill="url(#bone{uid})" stroke="#b79a6a" stroke-width=".4"/>
 <!-- dientes -->
 <path d="M149.6 124 C151 122.6 153.6 122.4 154.4 124 L154.8 135.6 C154.2 137.2 152.4 137.6 151 136.4 C150 133 149.6 128 149.6 124 Z" fill="url(#tooth{uid})" stroke="#9a9384" stroke-width=".4"/>
 <path d="M148.6 156 L151.8 156 L152.6 142.2 C152 140.8 150.6 140.6 149.6 141.8 C149 146 148.6 151 148.6 156 Z" fill="url(#tooth{uid})" stroke="#9a9384" stroke-width=".4"/>
 <!-- lengua (músculo) -->
 <path d="{a['tongue']}" fill="url(#tongue{uid})" stroke="#8f2f3d" stroke-width=".6"/>
 <path d="{a['tongue']}" fill="url(#fib{uid})"/>
 <!-- epiglotis y laringe -->
 <path d="{a['epi']}" fill="url(#muc{uid})" stroke="#9b4552" stroke-width=".5"/>
 <path d="{folds}" fill="#f3f0ea" stroke="#2f7fd0" stroke-width="{1.1 if voiced else .7}"/>
 {vib}
 <!-- tráquea con anillos -->
 <g stroke="#c9b48c" stroke-width="1.1" opacity=".9">{''.join(f'<line x1="103" y1="{214+i*6}" x2="108.5" y2="{214+i*6}"/>' for i in range(5))}</g>
 <!-- aire -->
 <path d="M110 214 C108 196 101 186 96 168 C93 150 96 136 106 132 C118 128 136 130 148 135 C152 137 156 138 166 138" fill="none" stroke="#1a7fc0" stroke-width="1.3" stroke-dasharray="3 2.4" marker-end="url(#ar{uid})"/>
 <path d="M172 133 l5 -2 M173 138 l6 0 M172 143 l5 2" stroke="#1a7fc0" stroke-width=".9" stroke-linecap="round"/>
 <circle cx="152.5" cy="138.5" r="5.5" fill="none" stroke="#1a7fc0" stroke-width="1" stroke-dasharray="1.8 1.4"/>
 {labels(tx, voiced)}
</svg>'''

def labels(tx, voiced):
    # (texto, x del texto, y, punto señalado): solo lo que hace falta para el sonido
    L = [('Dientes', 182, 121, (154.5, 127)), ('Lengua', 182, 151, (154, 140)), ('Labios', 182, 163, (160.5, 153))]
    if voiced: L.append(('Cuerdas vocales: vibran', 124, 216, (114, 206)))
    out = []
    for t, x, y, (px, py) in L:
        out.append(f'<line x1="{x - 1.5}" y1="{y - 1.6}" x2="{px}" y2="{py}" stroke="{tx}" stroke-width=".45" opacity=".7"/>'
                   f'<circle cx="{px}" cy="{py}" r=".9" fill="{tx}"/>'
                   f'<text x="{x}" y="{y}" font-size="4.8" font-weight="700" fill="{tx}" font-family="Outfit,system-ui,sans-serif">{t}</text>')
    return ''.join(out)

def front(uid):
    return f'''
<svg viewBox="0 0 120 120" width="100%" style="display:block">
 <defs>
  <radialGradient id="fs{uid}" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#f6d3bb"/><stop offset="1" stop-color="#d9a487"/></radialGradient>
  <linearGradient id="lu{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9797a"/><stop offset="1" stop-color="#b8545c"/></linearGradient>
  <linearGradient id="ll{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c25c63"/><stop offset=".6" stop-color="#df8a88"/><stop offset="1" stop-color="#c96f70"/></linearGradient>
  <radialGradient id="tt{uid}" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#ec8a93"/><stop offset="1" stop-color="#c24f5f"/></radialGradient>
  <linearGradient id="th{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3ded2"/></linearGradient>
 </defs>
 <rect width="120" height="120" fill="url(#fs{uid})"/>
 <path d="M40 -4 C42 6 40 12 34 16 C38 22 48 22 52 19 C55 22 65 22 68 19 C72 22 82 22 86 16 C80 12 78 6 80 -4" fill="#efc3a6" stroke="#c48b70" stroke-width=".8"/>
 <ellipse cx="50" cy="16" rx="5" ry="2.4" fill="#9a5f4c" opacity=".75"/><ellipse cx="70" cy="16" rx="5" ry="2.4" fill="#9a5f4c" opacity=".75"/>
 <path d="M55 23 C57 30 58 36 60 40 C62 36 63 30 65 23" fill="none" stroke="#c48b70" stroke-width=".9" opacity=".7"/>
 <path d="M26 24 C18 36 14 50 14 60 M94 24 C102 36 106 50 106 60" fill="none" stroke="#c48b70" stroke-width="1" opacity=".55"/>
 <path d="M34 104 C44 116 76 116 86 104" fill="none" stroke="#c48b70" stroke-width="1" opacity=".55"/>
 <!-- boca abierta -->
 <path d="M18 58 C30 50 46 47 60 49 C74 47 90 50 102 58 C90 70 76 76 60 76 C44 76 30 70 18 58 Z" fill="#5e2229"/>
 <!-- dientes de arriba -->
 {''.join(f'<rect x="{34+i*7}" y="51" width="6.4" height="{8 if 2<=i<=5 else 6.5}" rx="1.6" fill="url(#th{uid})" stroke="#bdb6a6" stroke-width=".4"/>' for i in range(8))}
 <!-- dientes de abajo -->
 {''.join(f'<rect x="{38+i*6.3}" y="{66 if 2<=i<=4 else 65.5}" width="5.8" height="5.5" rx="1.4" fill="url(#th{uid})" stroke="#bdb6a6" stroke-width=".4"/>' for i in range(7))}
 <!-- punta de la lengua entre los dientes -->
 <path d="M44 61 C48 57 72 57 76 61 C76 66 70 68 60 68 C50 68 44 66 44 61 Z" fill="url(#tt{uid})" stroke="#9c3a48" stroke-width=".6"/>
 <path d="M60 59 v6" stroke="#a8404f" stroke-width=".6" opacity=".6"/>
 <!-- labios -->
 <path d="M14 58 C26 44 44 38 52 42 C56 40 64 40 68 42 C76 38 94 44 106 58 C92 52 76 48 60 50 C44 48 28 52 14 58 Z" fill="url(#lu{uid})"/>
 <path d="M14 58 C28 68 44 76 60 76 C76 76 92 68 106 58 C98 74 80 88 60 88 C40 88 22 74 14 58 Z" fill="url(#ll{uid})"/>
 <path d="M40 80 C50 84 70 84 80 80" stroke="#f3b2ad" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/>
 <circle cx="60" cy="62" r="20" fill="none" stroke="#1a7fc0" stroke-width="1.6" stroke-dasharray="3 2.4"/>
</svg>'''

P = {
 'th': dict(ipa='θ', word='think', es='Como una «s», pero con la lengua entre los dientes', voiced=False,
   chips=['🔇 Sorda: no vibra','💨 Aire por la boca','👅 Entre los dientes'],
   steps=['Saca la punta de la lengua entre los dientes','Sopla suave por encima de la lengua','Sin voz: tus cuerdas vocales no vibran']),
 'dh': dict(ipa='ð', word='this', es='La misma posición que /θ/, pero con voz', voiced=True,
   chips=['〰️ Sonora: vibra','💨 Aire por la boca','👅 Entre los dientes'],
   steps=['Saca la punta de la lengua entre los dientes','Sopla suave y a la vez di «zzz»','Pon la mano en el cuello: tiene que vibrar']),
}
# Etiquetas (x,y en % del dibujo) con su punto
# (nombre, x etiqueta %, y %, x punto %, y punto %) sobre la caja del dibujo (cabeza entera en el 23–81 %)
LAB = [('Cerebro',1,10,45,20),('Senos nasales',1,30,66,42),('Lengua',1,46,64,62),('Velo del\npaladar',1,58,55,58),
       ('Epiglotis',1,72,56,82),('Cuerdas\nvocales',1,82,58,88),('Tráquea',1,93,57,97),
       ('Paladar duro',99,40,67,54),('Dientes',99,52,75,59),('Labios',99,62,78,64),('Columna',99,92,43,90)]
def phone(mode,k):
    p=P[k]; dark= mode=='dark'
    t = dict(bg='#061420',b1='#1f6fb8',b2='#14a39a',b3='#123a5a',tx='#fff',sub='rgba(255,255,255,.64)',acc='#7fd0ff',ink='#04202a',g='rgba(255,255,255,.07)',gb='rgba(255,255,255,.14)',field='rgba(255,255,255,.06)',glow='rgba(127,208,255,.35)',card='#0d2232') if dark else \
        dict(bg='#eef7fb',b1='#a8d4ff',b2='#a6f0e2',b3='#cfe6ff',tx='#0d2530',sub='rgba(13,37,48,.64)',acc='#1a7fc0',ink='#fff',g='rgba(255,255,255,.55)',gb='rgba(255,255,255,.95)',field='rgba(255,255,255,.6)',glow='rgba(26,127,192,.28)',card='#f7fbfd')
    labs=''.join(f'''<div class="lab" style="{'left' if lx<50 else 'right'}:{lx if lx<50 else 100-lx}%;top:{ly}%;text-align:{'left' if lx<50 else 'right'}">{n.replace(chr(10),'<br>')}</div>
      <svg class="lead" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="{lx+ (19 if lx<50 else -17)}" y1="{ly+1.8}" x2="{px}" y2="{py}" stroke="{t['tx']}" stroke-width=".35" opacity=".55"/><circle cx="{px}" cy="{py}" r=".7" fill="{t['tx']}"/></svg>''' for n,lx,ly,px,py in LAB)
    return f'''
<div class="phone" style="--g:{t['g']};--gb:{t['gb']};--sub:{t['sub']};--acc:{t['acc']};--ink:{t['ink']};--field:{t['field']};--glow:{t['glow']};color:{t['tx']}">
 <div class="bg" style="background:{t['bg']}"><div class="blob" style="width:420px;height:420px;left:-150px;top:-70px;background:{t['b1']};opacity:.85"></div><div class="blob" style="width:380px;height:380px;right:-170px;top:240px;background:{t['b2']};opacity:.8"></div></div>
 <div class="content">
  <div class="row"><div class="glass back">‹</div><div><div style="font-size:26px;font-weight:700;letter-spacing:-.5px">/{p['ipa']}/ <span style="font-weight:500">{p['word']}</span></div><div class="sub" style="font-size:12.5px;margin-top:-2px">{p['es']}</div></div></div>
  <div class="glass" style="padding:8px">
   <div style="position:relative;border-radius:18px;overflow:hidden;background:{t['card']};font-size:9.5px;padding:6px 0">
     <div>{section(k, k+mode, p['voiced'], t['tx'])}</div>
     
   </div>
   <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
     <div style="width:96px;flex:none;border-radius:50%;overflow:hidden;border:2px solid {t['acc']};box-shadow:0 4px 14px rgba(0,0,0,.2)">{front(k+mode)}</div>
     <div style="display:flex;flex-direction:column;gap:5px"><div style="font-size:11px;font-weight:700;opacity:.8">DE FRENTE</div>{''.join(f'<span class="chip">{c}</span>' for c in p['chips'])}</div>
   </div>
   <div style="display:flex;gap:8px;margin-top:8px"><div class="btn btn-acc" style="flex:1.4">▶ Escuchar y ver</div><div class="btn field" style="flex:1">↻ Otra vez</div></div>
  </div>
  <div class="glass" style="padding:10px 12px;display:flex;flex-direction:column;gap:6px">{''.join(f'<div class="step"><span class="num">{i+1}</span><span>{s}</span></div>' for i,s in enumerate(p['steps']))}</div>
  <div class="btn btn-acc">🎤 Dilo tú</div>
 </div>
</div>'''
css='''*{box-sizing:border-box;margin:0;padding:0}body{background:#d9dee4;font-family:Outfit,system-ui,sans-serif;display:flex;gap:24px;padding:24px}
.phone{width:360px;height:780px;border-radius:34px;overflow:hidden;position:relative;box-shadow:0 10px 40px rgba(0,0,0,.25)}.bg{position:absolute;inset:0}.blob{position:absolute;border-radius:50%;filter:blur(70px)}
.content{position:relative;padding:18px 14px;display:flex;flex-direction:column;gap:10px;height:100%}.glass{background:var(--g);border:1px solid var(--gb);border-radius:22px;backdrop-filter:blur(22px)}
.row{display:flex;align-items:center;gap:10px}.back{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-size:20px}.sub{color:var(--sub)}
.chip{font-size:11.5px;padding:4px 8px;border-radius:999px;background:var(--field);border:1px solid var(--gb)}.btn{height:42px;border-radius:21px;display:flex;align-items:center;justify-content:center;gap:6px;font-weight:600;font-size:15px}
.btn-acc{background:var(--acc);color:var(--ink);box-shadow:0 8px 22px var(--glow)}.field{background:var(--field);border:1px solid var(--gb)}
.step{display:flex;gap:8px;font-size:13px;line-height:1.3}.num{flex:none;width:19px;height:19px;border-radius:50%;background:var(--acc);color:var(--ink);font-size:11px;font-weight:700;display:grid;place-items:center}
.lab{position:absolute;font-weight:700;letter-spacing:.2px;text-transform:uppercase;font-size:8px;line-height:1.1}.lead{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}'''
open('maqueta2.html','w').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{phone("light","th")}{phone("dark","dh")}</body></html>')
# Ilustración sola, grande, para revisar
open('anat-grande.html','w').write(f'<!doctype html><html><body style="margin:0;background:#fff;display:flex;gap:10px"><div style="width:520px">{section("th","a",False)}</div><div style="width:300px">{front("b")}</div></body></html>')
