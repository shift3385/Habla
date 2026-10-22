import re, json, sys
def paths(f):
    src=open(f,encoding='utf-8').read()
    return [re.search(r'\sd="([^"]+)"',p).group(1) for p in re.findall(r'<path(.*?)/>',src,re.S)]
def absolute(d):
    # solo m/l relativos con pares (como exporta WMF→SVG); devuelve lista de subtrazos de puntos absolutos
    toks=re.findall(r'[mMlLzZcC]|-?[\d.]+(?:e-?\d+)?',d)
    pts=[];cur=[0,0];cmd='m';subs=[];i=0;start=None
    while i<len(toks):
        t=toks[i]
        if t in 'mMlLzZcC':
            cmd=t; i+=1
            if t in 'zZ':
                if pts: subs.append(pts); pts=[]
            continue
        x=float(toks[i]);y=float(toks[i+1]);i+=2
        if cmd in 'ml': cur=[cur[0]+x,cur[1]+y]
        else: cur=[x,y]
        if cmd in 'mM' and pts: subs.append(pts); pts=[]
        pts.append(tuple(cur))
        if cmd=='m': cmd='l'
        if cmd=='M': cmd='L'
    if pts: subs.append(pts)
    return subs
if __name__=='__main__':
    for f in sys.argv[1:]:
        for k,d in enumerate(paths(f)):
            s=absolute(d)
            print(f.split('/')[-1],k,[len(x) for x in s], 'cmds:',sorted(set(re.findall(r'[a-zA-Z]',d))))
