#!/usr/bin/env python3
# Genera src/sounds/mouth.ts: cortes de perfil de la boca (27 poses) y vistas de frente (9) para la sección Sonidos.
# Python 3 sin dependencias. Contrato: docs/v5.11/sonidos-boca/CONTRATO.md. Estilo: variante B de la maqueta
# (docs/v5.11/sonidos-boca/maqueta/build3.py): lengua de dos capas, suelo de la boca macizo, dientes propios.
# Anatomía de partida: cortes sagitales CC0 de Richard Wright y Dan McCloy (repositorio drammock/phonetics-teaching-assets,
# carpeta midsaggital_articulations). Uso: python3 scripts/mouth/build.py <carpeta midsaggital_articulations> [--sheet salida.html]
import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
VB = (86.0, 96.0, 96.0, 124.0)  # x, y, ancho, alto: de la nariz a la laringe (coordenadas de los cortes CC0)
VIEWBOX = ' '.join(f'{v:g}' for v in VB)
U = '__U'  # sufijo de los id de <defs>: el componente lo cambia por un id único

# ---------------------------------------------------------------- lectura de los SVG CC0 (WMF exportado: m/l/L/z)


def svg_paths(f):
    src = open(f, encoding='utf-8').read()
    return [re.search(r'\sd="([^"]+)"', p).group(1) for p in re.findall(r'<path(.*?)/>', src, re.S)]


def absolute(d):
    toks = re.findall(r'[mMlLzZ]|-?[\d.]+(?:e-?\d+)?', d)
    pts, cur, cmd, subs, i = [], [0.0, 0.0], 'm', [], 0
    while i < len(toks):
        t = toks[i]
        if t in 'mMlLzZ':
            cmd = t
            i += 1
            if t in 'zZ' and pts:
                subs.append(pts)
                pts = []
            continue
        x, y = float(toks[i]), float(toks[i + 1])
        i += 2
        cur = [cur[0] + x, cur[1] + y] if cmd in 'ml' else [x, y]
        if cmd in 'mM' and pts:
            subs.append(pts)
            pts = []
        pts.append((cur[0], cur[1]))
        cmd = {'m': 'l', 'M': 'L'}.get(cmd, cmd)
    if pts:
        subs.append(pts)
    # puntos repetidos fuera
    out = []
    for p in subs[0]:
        if not out or abs(out[-1][0] - p[0]) + abs(out[-1][1] - p[1]) > 1e-3:
            out.append(p)
    return out


def load(base, name):
    ps = [absolute(d) for d in svg_paths(os.path.join(base, name + '.svg'))]
    head = next(p for p in ps if min(y for _, y in p) < 40)
    rest = [p for p in ps if p is not head]
    rest.sort(key=len)
    big = rest[-2:]  # paladar (~160 puntos) y mandíbula+lengua (~300): en los «laminal» vienen en otro orden
    pal, jaw = sorted(big, key=len)
    small = rest[:-2]
    folds = min(small, key=lambda p: max(y for _, y in p) - min(y for _, y in p))
    epi = next(p for p in small if p is not folds)
    return dict(head=head, palate=pal, jaw=jaw, epi=epi, folds=folds)


# ---------------------------------------------------------------- geometría


def argbest(pts, lo, hi, key):
    lo, hi = max(lo, 0), min(hi, len(pts) - 1)
    return max(range(lo, hi + 1), key=lambda i: key(pts[i]))


def landmarks(J, tipmode='front'):
    tt = argbest(J, 90, 140, lambda p: -p[1] if p[0] > 140 else -1e9)  # borde del incisivo de abajo
    ls = argbest(J, tt - 25, tt - 1, lambda p: p[1])  # fondo entre labio y diente
    sb = argbest(J, tt + 1, tt + 45, lambda p: p[1])  # fondo bajo la lengua (suelo de la boca)
    ys = J[sb][1]
    if tipmode == 'top':  # R retrofleja: la punta es lo más alto del rizo
        tip = argbest(J, sb, sb + 40, lambda p: -p[1])
    else:  # punta: lo más adelantado (y alto) tras el suelo de la boca
        tip = argbest(J, sb, sb + 40, lambda p: p[0] + 0.3 * (ys - p[1]))
    # raíz: el primer mínimo de x bajando por detrás (antes de la vallécula); luego, el fondo de la vallécula
    rmin = tip + 20
    for i in range(tip + 20, len(J)):
        if J[i][0] < J[rmin][0]:
            rmin = i
        elif J[i][0] > J[rmin][0] + 4:
            break
    vt = argbest(J, rmin, rmin + 35, lambda p: p[0] if J[rmin][1] - 3 < p[1] < 185 and p[0] < 120 else -1e9)
    return dict(tt=tt, ls=ls, sb=sb, tip=tip, vt=vt)


def cubic(p0, c1, c2, p3, n=16):
    out = []
    for k in range(1, n + 1):
        t = k / n
        a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
        out.append((a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]))
    return out


def vcross(poly, x, closed=True):
    ys = []
    n = len(poly)
    for i in range(n if closed else n - 1):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
        if (x1 <= x < x2) or (x2 <= x < x1):
            ys.append(y1 + (x - x1) * (y2 - y1) / (x2 - x1))
    return ys


def hcross(poly, y, closed=True):
    xs = []
    n = len(poly)
    for i in range(n if closed else n - 1):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
        if (y1 <= y < y2) or (y2 <= y < y1):
            xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
    return xs


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def rot(p, c, deg):
    a = math.radians(deg)
    dx, dy = p[0] - c[0], p[1] - c[1]
    return (c[0] + dx * math.cos(a) - dy * math.sin(a), c[1] + dx * math.sin(a) + dy * math.cos(a))


def similarity(a1, a2, b1, b2):
    """Giro + traslación (sin escala) que lleva el segmento a1→a2 sobre b1→b2."""
    ang = math.atan2(b2[1] - b1[1], b2[0] - b1[0]) - math.atan2(a2[1] - a1[1], a2[0] - a1[0])
    c, s = math.cos(ang), math.sin(ang)

    def f(p):
        dx, dy = p[0] - a1[0], p[1] - a1[1]
        return (b1[0] + dx * c - dy * s, b1[1] + dx * s + dy * c)

    return f


# ---------------------------------------------------------------- trazados a mano (comandos absolutos M L C Q Z → puntos)


def sample(d, n=10):
    toks = re.findall(r'[MLCQZ]|-?[\d.]+', d)
    pts, i, cmd = [], 0, None
    while i < len(toks):
        if toks[i] in 'MLCQZ':
            cmd = toks[i]
            i += 1
            continue
        k = {'M': 2, 'L': 2, 'C': 6, 'Q': 4}[cmd]
        v = [float(t) for t in toks[i:i + k]]
        i += k
        if cmd in 'ML':
            pts.append((v[0], v[1]))
        elif cmd == 'C':
            pts += cubic(pts[-1], (v[0], v[1]), (v[2], v[3]), (v[4], v[5]), n)
        else:
            p0 = pts[-1]
            c1 = (p0[0] + 2 / 3 * (v[0] - p0[0]), p0[1] + 2 / 3 * (v[1] - p0[1]))
            c2 = (v[2] + 2 / 3 * (v[0] - v[2]), v[3] + 2 / 3 * (v[1] - v[3]))
            pts += cubic(p0, c1, c2, (v[2], v[3]), n)
    return pts


UPPER_TOOTH = sample('M149.6 124 C151 122.6 153.6 122.4 154.4 124 L154.8 135.6 C154.2 137.2 152.4 137.6 151 136.4 C150 133 149.6 128 149.6 124 Z', 6)
# Incisivo de abajo y mandíbula dibujados sobre el corte de /θ/: se mueven con la mandíbula de cada pose
LOWER_TOOTH = sample('M148.4 157 L151.6 157 L152.4 142.4 C151.8 141 150.4 140.8 149.4 142 C148.8 146 148.4 151 148.4 157 Z', 6)
MANDIBLE = sample('M146 160 C150 168 152 176 150 182 C142 188 132 190 124 190 L124 186 C132 185 141 182 145 177 C146 172 145 166 142 161 Z', 8)

# ---------------------------------------------------------------- salida compacta


def clip_poly(poly, m=3.0):
    x0, y0, w, h = VB
    edges = [(0, x0 - m, 1), (0, x0 + w + m, -1), (1, y0 - m, 1), (1, y0 + h + m, -1)]
    out = list(poly)
    for ax, v, sgn in edges:
        if not out:
            break
        inp, out = out, []
        for i in range(len(inp)):
            a, b = inp[i - 1], inp[i]
            ina, inb = (a[ax] - v) * sgn >= 0, (b[ax] - v) * sgn >= 0
            if inb:
                if not ina:
                    out.append(_inter(a, b, ax, v))
                out.append(b)
            elif ina:
                out.append(_inter(a, b, ax, v))
    return out


def _inter(a, b, ax, v):
    t = (v - a[ax]) / (b[ax] - a[ax])
    return (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))


def inside(p, m=3.0):
    x0, y0, w, h = VB
    return x0 - m <= p[0] <= x0 + w + m and y0 - m <= p[1] <= y0 + h + m


def clip_line(pts, m=3.0):
    runs, cur = [], []
    for i, p in enumerate(pts):
        near = inside(p, m) or (i > 0 and inside(pts[i - 1], m)) or (i + 1 < len(pts) and inside(pts[i + 1], m))
        if near:
            cur.append(p)
        elif cur:
            runs.append(cur)
            cur = []
    if cur:
        runs.append(cur)
    return [r for r in runs if len(r) > 1]


def rdp(pts, eps=0.12):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1e-9
    best, idx = -1, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d = abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / L if L > 1e-6 else math.hypot(p[0] - a[0], p[1] - a[1])
        if d > best:
            best, idx = d, i
    if best <= eps:
        return [a, b]
    return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)


def num(t):
    """Décimas enteras → texto mínimo («-.3», «12», «4.5»)."""
    s = f'{t / 10:.1f}'
    if s.endswith('.0'):
        s = s[:-2]
    if s.startswith('0.'):
        s = s[1:]
    elif s.startswith('-0.'):
        s = '-' + s[2:]
    return '0' if s in ('-0', '') else s


def join(nums):
    out = ''
    for s in nums:
        if out and not s.startswith('-') and not (s.startswith('.') and '.' in out.split(' ')[-1].split('-')[-1]):
            out += ' '
        out += s
    return out


def path_d(pts, closed=True, eps=0.12):
    pts = rdp(pts, eps) if len(pts) > 2 else pts
    q = [(round(x * 10), round(y * 10)) for x, y in pts]
    ded = [q[0]]
    for p in q[1:]:
        if p != ded[-1]:
            ded.append(p)
    q = ded
    d = 'M' + join([num(q[0][0]), num(q[0][1])])
    rel = []
    for (x1, y1), (x2, y2) in zip(q, q[1:]):
        rel += [num(x2 - x1), num(y2 - y1)]
    if rel:
        d += 'l' + join(rel)
    return d + ('z' if closed else '')


def fill_d(poly, eps=0.12):
    c = clip_poly(poly)
    return path_d(c, True, eps) if len(c) > 2 else ''


def line_d(pts, eps=0.12):
    return ''.join(path_d(r, False, eps) for r in clip_line(pts))


def f1(v):
    return num(round(v * 10))


def curve_d(pts):
    """Catmull-Rom → Bézier cúbicas (camino del aire)."""
    d = f'M{f1(pts[0][0])} {f1(pts[0][1])}'
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += 'C' + ' '.join(f'{f1(a)} {f1(b)}' for a, b in (c1, c2, p2))
    return d


# ---------------------------------------------------------------- poses
# src: corte CC0 de partida. ops: adaptaciones (ver apply()). key: punto clave (círculo punteado). air: 'oral', 'nasal',
# 'lateral' (la punta cierra en el centro y el aire sale por los lados). Comentario: descripción de PROMPTS-gemini.md §3.
POSES = {
    'neutral': dict(src='consonants/svg/neutral', key=('dorsum',)),
    # labios apretados, lengua relajada, velo subido
    'p-b': dict(src='consonants/svg/p', key=('gap', 155, 166)),
    # labios cerrados, velo bajado: aire por la nariz
    'm': dict(src='consonants/svg/m', key=('gap', 155, 166), air='nasal'),
    # punta en los alvéolos (no en los dientes), labios algo separados
    't-d': dict(src='consonants/svg/t', key=('gap', 143, 153)),
    'n': dict(src='consonants/svg/n', key=('gap', 143, 153), air='nasal'),
    # como /t/, con la parte de atrás algo levantada (L oscura); el aire sale por los lados
    'l': dict(src='consonants/svg/t', ops=[('warp', 116, 124, 9, -0.5, -3.2)], key=('gap', 143, 153), air='lateral'),
    # dorso contra el velo, punta abajo
    'k-g': dict(src='consonants/svg/k', key=('gap', 104, 128)),
    'ng': dict(src='consonants/svg/ŋ', key=('gap', 104, 128), air='nasal'),
    # labio de abajo contra el borde de los dientes de arriba
    'f-v': dict(src='consonants/svg/f', key=('gap', 151, 160)),
    # punta plana asomando entre los dientes
    'th-dh': dict(src='consonants/svg/θ', key=('gap', 149, 157)),
    # punta muy cerca de los alvéolos sin tocar, dientes casi cerrados
    's-z': dict(src='consonants/svg/s_laminal', ops=[('mingap', 136, 152, 0.9)], key=('gap', 141, 152)),
    # hoja de la lengua tras los alvéolos, algo más atrás que /s/; labios adelantados y algo redondeados
    'sh-zh': dict(src='consonants/svg/ʃ_laminal', ops=[('mingap', 130, 150, 1.0), ('lips', 1.6)], key=('gap', 136, 149)),
    # como /ʃ/ pero con cierre completo de la hoja contra la zona tras los alvéolos
    'ch-jh': dict(src='consonants/svg/ʃ_laminal', ops=[('contact', 136, 149, 5.0), ('lips', 1.6)], key=('gap', 136, 149)),
    # R americana: punta curvada hacia arriba y atrás sin tocar, cuerpo recogido, labios algo redondeados
    'r': dict(src='consonants/svg/r_retroflex', tipmode='top', ops=[('warp', 122, 140, 8, 0, -4.5), ('mingap', 125, 152, 2.2), ('lips', 1.4)],
              key=('tip',)),
    # labios muy redondeados y adelantados, parte de atrás de la lengua hacia el velo sin tocar
    'w': dict(src='vowels/svg/u', ops=[('lips', 1.0), ('mingap', 100, 130, 2.0)], key=('lips',)),
    # parte delantera de la lengua cerca del paladar duro sin tocar, labios estirados
    'y': dict(src='vowels/svg/i', ops=[('raise', 122, 146, 1.6), ('lips', -0.6)], key=('gap', 122, 146)),
    # boca abierta, lengua baja y relajada: el aire sale libre desde la garganta
    'h': dict(src='consonants/svg/neutral', ops=[('jaw', 6.5)], key=('folds',)),
    'iy': dict(src='vowels/svg/i', ops=[('lips', -0.6)], key=('gap', 122, 146)),
    'ih': dict(src='vowels/svg/ɪ', key=('dorsum',)),
    'eh': dict(src='vowels/svg/ɛ', key=('dorsum',)),
    # mandíbula muy abierta (el corte CC0 la abre poco: se abre algo más para que se vea la diferencia con /ɛ/)
    'ae': dict(src='vowels/svg/æ', ops=[('jaw', 3.0)], key=('dorsum',)),
    'aa': dict(src='vowels/svg/a', ops=[('jaw', 3.5)], key=('dorsum',)),
    # lengua baja y atrás, mandíbula abierta, labios algo redondeados
    'ao': dict(src='vowels/svg/a', ops=[('jaw', 1.5), ('lips', 1.8)], key=('lips',)),
    'uh': dict(src='vowels/svg/ʊ', ops=[('lips', 0.6)], key=('dorsum',)),
    'uw': dict(src='vowels/svg/u', key=('lips',)),
    # lengua en el centro, relajada, media-baja; mandíbula medio abierta
    'ah': dict(src='vowels/svg/ɛ', ops=[('warp', 134, 128, 11, -3.0, 2.6)], key=('dorsum',)),
    # todo relajado en el centro, mandíbula algo abierta
    'ax': dict(src='consonants/svg/neutral', ops=[('jaw', 2.5)], key=('dorsum',)),
}


def palate_under(P, x):
    ys = [y for y in vcross(P, x) if y < 160]
    return max(ys) if ys else None


def tongue_poly(J, L):
    sb, vt = L['sb'], L['vt']
    a, b = J[vt], J[sb]
    # cierre por debajo: de la raíz (vallécula) al suelo bajo la punta, sin hueco (la lengua no flota)
    curve = cubic(a, (a[0] + 0.3 * (b[0] - a[0]), a[1] + 4), (b[0] - 0.3 * (b[0] - a[0]), b[1] + 9), b, 18)
    return J[sb:vt + 1] + curve[:-1], curve


def apply(pose, data, L):
    J = list(data['jaw'])
    P = list(data['palate'])
    sb, vt = L['sb'], L['vt']
    for op in pose.get('ops', []):
        k = op[0]
        if k == 'warp':  # desplazamiento suave de la lengua alrededor de (cx, cy)
            _, cx, cy, sg, dx, dy = op
            for i in range(sb, vt + 1):
                x, y = J[i]
                w = math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * sg * sg))
                J[i] = (x + w * dx, y + w * dy)
        elif k in ('mingap', 'contact', 'raise'):
            # mingap: separa la lengua del paladar hasta un mínimo; contact: la sube hasta tocar; raise: la acerca
            _, x0, x1, v = op
            best = None
            for i in range(L['tip'] - 4, vt):
                x, y = J[i]
                if x0 <= x <= x1:
                    pu = palate_under(P, x)
                    if pu is not None and y > pu - 4:
                        g = y - pu
                        if best is None or g < best[0]:
                            best = (g, i)
            if best is None:
                continue
            g, i = best
            if k == 'mingap':
                dy = v - g if g < v else 0
            elif k == 'contact':
                dy = -(g + 0.5)
                sg = v
            else:
                dy = -min(v, max(0, g - 1.2))
            if dy:
                cx, cy = J[i]
                sg = 5.0 if k != 'contact' else v
                for j in range(sb, vt + 1):
                    x, y = J[j]
                    w = math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * sg * sg))
                    J[j] = (x, y + w * dy)
        elif k == 'jaw':  # abre (o cierra) la mandíbula girando alrededor de la articulación
            deg = op[1]
            piv = (84.0, 112.0)
            for i in range(len(J)):
                x, y = J[i]
                w = smooth((x - 98) / 30) * smooth((198 - y) / 18)
                J[i] = rot((x, y), piv, deg * w)
        elif k == 'lips':  # adelanta (redondea) o estira los labios
            a = op[1]
            for arr, sgn in ((J, 1), (P, -1)):
                for i in range(len(arr)):
                    x, y = arr[i]
                    w = smooth((x - 154.5) / 7) * smooth((y - 112) / 12) * smooth((168 - y) / 10)
                    arr[i] = (x + a * w, y + sgn * (-0.25 * a * w if a > 0 else 0))
    return J, P


def build_pose(pid, base, theta):
    pose = POSES[pid]
    data = load(base, pose['src'])
    L = landmarks(data['jaw'], pose.get('tipmode', 'front'))
    J, P = apply(pose, data, L)
    T, curve = tongue_poly(J, L)
    sb, vt, tip, tt = L['sb'], L['vt'], L['tip'], L['tt']
    head, epi = data['head'], data['epi']
    folds = theta['folds']  # las mismas cuerdas (rectas) en todas: la vibración la pinta el componente
    LT = similarity(theta['J'][theta['L']['tt']], theta['J'][theta['L']['ls']], J[tt], J[L['ls']])
    lvl = J[tt][1] + 2.5  # nivel del suelo de la boca bajo la punta
    notch = clip_half(J[tt:tip + 1], lvl)

    # ------ camino del aire
    nasal = pose.get('air') == 'nasal'
    lateral = pose.get('air') == 'lateral'
    fc = centroid(folds)
    pts = [(fc[0] - 4, 223), (fc[0] - 2.5, fc[1])]
    fronts = [T, epi, J]
    phar = []
    for y in range(190, 133 if not nasal else 117, -8):
        wall = [x for x in hcross(head, y) if 84 < x < 106]
        if not wall:
            continue
        w = max(wall)
        fr = [x for poly in fronts + ([P] if nasal else []) for x in hcross(poly, y) if x > w + 0.8]
        if not fr:
            continue
        phar.append(((w + min(fr)) / 2, y))
    # media móvil: el camino no hace eses por la epiglotis
    pts += [(sum(p[0] for p in phar[max(0, i - 1):i + 2]) / len(phar[max(0, i - 1):i + 2]), phar[i][1]) for i in range(len(phar))]
    stations = []
    end = None
    if not nasal:
        x = 103.0
        while x <= 160.5:
            top = palate_under(P, x)
            bot = [y for poly in (T, J) for y in vcross(poly, x) if y > 100]
            if top is not None and bot:
                b = min(bot)
                gap = b - top
                stations.append((x, top, b, gap))
                if gap < 0.6 and not lateral:
                    end = (x, top, b)
                    break
            x += 3.0 if x < 140 else 1.5
        oral = [(x, (t + b) / 2) for x, t, b, g in stations if g >= 0.6 or lateral]
        if lateral:  # la punta cierra en el centro: el aire rodea por los lados (lo dibujamos por encima, más fino)
            oral = [(x, (t + b) / 2 if g >= 0.6 else t - 0.2) for x, t, b, g in stations]
        oral = [p for p in thin(oral, 4.0) if p[0] >= 106]
        # media móvil en y: el aire no hace ganchos al pasar entre los dientes
        oral = [(p[0], sum(q[1] for q in oral[max(0, i - 1):i + 2]) / len(oral[max(0, i - 1):i + 2]) if p[0] > 138 else p[1])
                for i, p in enumerate(oral)]
        if oral:  # el último tramo de la faringe se funde con el primero de la boca (sin bucle bajo el velo)
            while len(pts) > 3 and pts[-1][1] < oral[0][1] + 5:
                pts.pop()
        pts += oral
        if end is None:
            ex = pts[-1]
            pts.append((ex[0] + 6, ex[1]))
    else:
        # por el suelo de la nariz (bajo los cornetes) hasta la ventana de la nariz
        for x in range(104, 161, 8):
            bot = [y for y in vcross(P, x) if y < 128]
            if bot:
                pts.append((x, min(bot) - 2.6))
        pts.append((164, 107.4))
    pts = dedupe(pts)
    air = curve_d(pts)
    rays = ''
    if end is None:
        ex, ey = pts[-1]
        rays = f'<path d="M{f1(ex + 5)} {f1(ey - 5)}l5 -2M{f1(ex + 6)} {f1(ey)}h6M{f1(ex + 5)} {f1(ey + 5)}l5 2" stroke="#1a7fc0" stroke-width=".9" stroke-linecap="round"/>'

    # ------ punto clave
    key = pose['key']
    if key[0] == 'gap':
        cand = [s for s in stations if key[1] <= s[0] <= key[2]]
        if not cand:  # sin estaciones (nasales): mirar la geometría directamente
            cand = []
            for x in frange(key[1], key[2], 0.5):
                top = palate_under(P, x)
                bot = [y for poly in (T, J) for y in vcross(poly, x) if y > 100]
                if top is not None and bot:
                    cand.append((x, top, min(bot), min(bot) - top))
        s = min(cand, key=lambda s: s[3])
        kp = (s[0], (s[1] + s[2]) / 2)
    elif key[0] == 'dorsum':
        i = min(range(tip, vt), key=lambda i: J[i][1])
        kp = (J[i][0], J[i][1] - 2)
    elif key[0] == 'tip':
        kp = J[tip]
    elif key[0] == 'lips':
        kp = lips_point(J, P, L)
    else:
        kp = fc

    # ------ marcas para las etiquetas
    di = min(range(tip, vt), key=lambda i: math.hypot(J[i][0] - kp[0], J[i][1] - kp[1]))
    tmark = J[di] if math.hypot(J[di][0] - kp[0], J[di][1] - kp[1]) < 9 else J[min(range(tip, vt), key=lambda i: J[i][1])]
    tmark = (tmark[0] - 0.6, tmark[1] + 1.6)
    li = argbest(J, 50, L['ls'], lambda p: p[0] if p[1] < J[L['ls']][1] else -1e9)
    vel = max((p for p in P if 100 < p[0] < 126), key=lambda p: p[1])
    marks = dict(
        tongue=tmark,
        teeth=(152.3, 128.5),
        lips=(J[li][0] - 1.2, J[li][1]),
        folds=fc,
        velum=(vel[0] + 0.5, vel[1] - 2),
    )

    # ------ dibujo
    g = []
    g.append(DEFS)
    li = argbest(J, 50, L['ls'], lambda p: p[0] if p[1] < J[L['ls']][1] else -1e9)
    up = [p for p in P if p[1] > 118 and p[0] > 152]
    ul = max(up, key=lambda p: p[0]) if up else (160, 130)
    bg = [(90, 226), (88, 140), (92, 92), (120, 80), (150, 80), (160, 96), (157, 112)] + [(ul[0] - 1.5, ul[1]), (J[li][0] - 1.5, J[li][1])] + [(150, 172), (130, 200), (122, 226)]
    g.append(f'<path d="{fill_d(bg)}" fill="url(#air{U})"/>')
    g.append(f'<path d="{fill_d(head)}" fill="url(#skin{U})" stroke="#8c5a45" stroke-width=".5"/>')
    g.append(TURBINATES)
    g.append(f'<path d="{fill_d(P)}" fill="url(#muc{U})" stroke="#9b4552" stroke-width=".5"/>')
    g.append(f'<path d="{fill_d(sample("M114 118.5 L150 111 L151 113.5 L115 121.5 Z"))}" fill="url(#bone{U})" stroke="#b79a6a" stroke-width=".3"/>')
    # mandíbula, labio de abajo y cuello: relleno entero, contorno solo fuera de la lengua (sin la silueta vieja de la lengua)
    g.append(f'<path d="{fill_d(J)}" fill="url(#skin{U})"/>')
    if len(notch) > 2:
        g.append(f'<path d="{fill_d(notch)}" fill="url(#skin{U})" stroke="url(#skin{U})" stroke-width=".5"/>')
    g.append(f'<path d="{line_d(J[:tt + 1])}{line_d(J[vt:])}" fill="none" stroke="#8c5a45" stroke-width=".5"/>')
    g.append(f'<path d="{fill_d([LT(p) for p in MANDIBLE])}" fill="url(#bone{U})" stroke="#b79a6a" stroke-width=".4"/>')
    g.append(f'<ellipse cx="117" cy="194" rx="3.5" ry="2" fill="url(#bone{U})" stroke="#b79a6a" stroke-width=".4"/>')
    g.append(f'<path d="{fill_d(UPPER_TOOTH, .05)}" fill="url(#tooth{U})" stroke="#9a9384" stroke-width=".4"/>')
    g.append(f'<path d="{fill_d([LT(p) for p in LOWER_TOOTH], .05)}" fill="url(#tooth{U})" stroke="#9a9384" stroke-width=".4"/>')
    # frenillo: del suelo de la boca hacia la cara de abajo de la lengua
    under = J[sb:tip + 1]
    if len(under) > 4:
        k = max(2, int(len(under) * 0.45))
        fr = [(x + 1.1, y) for x, y in under[:k]]
        g.append(f'<path d="{line_d(fr, .2)}" fill="none" stroke="#c96b76" stroke-width="1.1" stroke-linecap="round"/>')
    # lengua: músculo con fibras y mucosa rosada encima
    dors = J[tip:vt + 1]
    td = fill_d(T, .1)
    md = line_d(dors[:max(3, int(len(dors) * 0.93))], .15)
    # la silueta y la mucosa se escriben una vez y se reutilizan con <use> (pesa menos)
    g.append(f'<defs><path id="tp{U}" d="{td}"/><path id="dm{U}" d="{md}" fill="none" stroke-linecap="round"/>'
             f'<clipPath id="tg{U}"><use href="#tp{U}"/></clipPath></defs>')
    g.append(f'<use href="#tp{U}" fill="url(#mb{U})"/>')
    g.append(f'<g clip-path="url(#tg{U})"><g fill="none" stroke="#6f1d2a" stroke-width=".5" opacity=".45" stroke-linecap="round">{fibers(dors, curve)}</g>')
    g.append(f'<use href="#dm{U}" stroke="#ec9aa3" stroke-width="3.2"/><use href="#dm{U}" stroke="#f7c2c7" stroke-width=".9" opacity=".8"/></g>')
    g.append(f'<use href="#tp{U}" fill="none" stroke="#7d2533" stroke-width=".55" stroke-linejoin="round"/>')
    # epiglotis, cuerdas vocales y tráquea
    g.append(f'<path d="{fill_d(epi)}" fill="url(#muc{U})" stroke="#9b4552" stroke-width=".5"/>')
    g.append(f'<path d="{fill_d(folds, .05)}" fill="#f3f0ea" stroke="#2f7fd0" stroke-width=".7"/>')
    g.append('<g stroke="#c9b48c" stroke-width="1.1" opacity=".9"><path d="M103 214h5.5M103 220h5.5"/></g>')
    # aire y punto clave
    g.append(f'<path d="{air}" fill="none" stroke="#1a7fc0" stroke-width="1.3" stroke-dasharray="3 2.4" stroke-linecap="round" marker-end="url(#ar{U})"/>')
    g.append(rays)
    g.append(f'<circle cx="{f1(kp[0])}" cy="{f1(kp[1])}" r="5.5" fill="none" stroke="#1a7fc0" stroke-width="1" stroke-dasharray="1.8 1.4"/>')
    body = ''.join(g)
    return dict(id=pid, viewBox=VIEWBOX, body=body, marks={k: [round(v[0], 1), round(v[1], 1)] for k, v in marks.items()}, nasal=nasal)


def frange(a, b, s):
    while a <= b:
        yield a
        a += s


def thin(pts, d):
    out = []
    for p in pts:
        if not out or abs(p[0] - out[-1][0]) >= d or abs(p[1] - out[-1][1]) >= d:
            out.append(p)
    if pts and out[-1] != pts[-1]:
        out[-1] = pts[-1]
    return out


def dedupe(pts):
    out = []
    for p in pts:
        if not out or math.hypot(p[0] - out[-1][0], p[1] - out[-1][1]) > 1.5:
            out.append(p)
    return out


def centroid(pts):
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def clip_half(poly, lvl):
    out = []
    for i in range(len(poly)):
        a, b = poly[i - 1], poly[i]
        ina, inb = a[1] >= lvl, b[1] >= lvl
        if inb:
            if not ina:
                out.append(_inter(a, b, 1, lvl))
            out.append(b)
        elif ina:
            out.append(_inter(a, b, 1, lvl))
    return out


def lips_point(J, P, L):
    li = argbest(J, 50, L['ls'], lambda p: p[0] if p[1] < J[L['ls']][1] else -1e9)
    up = [p for p in P if p[1] > 125 and p[0] > 152]
    ui = max(up, key=lambda p: p[0]) if up else J[li]
    return ((J[li][0] + ui[0]) / 2 - 1, (J[li][1] + ui[1]) / 2)


def fibers(dors, curve):
    # fibras del músculo: de la mucosa del dorso hacia el suelo (recortadas por la silueta de la lengua)
    n = len(dors)
    out = []
    for k in range(9):
        f = 0.12 + k * 0.095
        p = dors[min(n - 1, int(n * f))]
        q = curve[max(0, min(len(curve) - 1, int(len(curve) * (1 - f))))]
        q = (q[0] + (p[0] - q[0]) * -0.15, q[1] + (q[1] - p[1]) * 0.15)
        c = ((p[0] + q[0]) / 2 + 2, (p[1] + q[1]) / 2)
        out.append(f'<path d="M{f1(p[0])} {f1(p[1])}Q{f1(c[0])} {f1(c[1])} {f1(q[0])} {f1(q[1])}"/>')
    return ''.join(out)


DEFS = (
    '<defs>'
    f'<linearGradient id="skin{U}" gradientUnits="userSpaceOnUse" x1="88" y1="0" x2="170" y2="0"><stop offset="0" stop-color="#d9a487"/><stop offset=".65" stop-color="#f0c4a6"/><stop offset="1" stop-color="#f6d3bb"/></linearGradient>'
    f'<linearGradient id="muc{U}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e88f8f"/><stop offset="1" stop-color="#c8616a"/></linearGradient>'
    f'<linearGradient id="bone{U}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf0d8"/><stop offset="1" stop-color="#e3cfa6"/></linearGradient>'
    f'<linearGradient id="tooth{U}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4e0d6"/></linearGradient>'
    f'<linearGradient id="air{U}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f7e3df"/><stop offset="1" stop-color="#fdf3ef"/></linearGradient>'
    f'<linearGradient id="mb{U}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c7404f"/><stop offset="1" stop-color="#8e2737"/></linearGradient>'
    f'<marker id="ar{U}" viewBox="0 0 8 8" refX="5" refY="4" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#1a7fc0"/></marker>'
    '</defs>'
)
# cornetes de la nariz (encima del camino del aire por la nariz)
TURBINATES = ('<g fill="#e9a0a0" stroke="#b9666c" stroke-width=".4"><path d="M118 90q12-4.5 24 0q-12 3.6-24 0z"/>'
              '<path d="M114 97q15-5 30 0q-15 4.2-30 0z"/><path d="M112 104q16-4.4 32 0q-16 3.6-32 0z"/></g>')


# ---------------------------------------------------------------- vista de frente (viewBox 0 0 120 120)

FRONT_DEFS = (
    '<defs>'
    f'<radialGradient id="fs{U}" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#f6d3bb"/><stop offset="1" stop-color="#d9a487"/></radialGradient>'
    f'<linearGradient id="lu{U}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9797a"/><stop offset="1" stop-color="#b8545c"/></linearGradient>'
    f'<linearGradient id="ll{U}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c25c63"/><stop offset=".6" stop-color="#df8a88"/><stop offset="1" stop-color="#c96f70"/></linearGradient>'
    f'<radialGradient id="tt{U}" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#ec8a93"/><stop offset="1" stop-color="#c24f5f"/></radialGradient>'
    f'<linearGradient id="th{U}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3ded2"/></linearGradient>'
    '</defs>'
)
FACE = (
    f'<rect width="120" height="120" fill="url(#fs{U})"/>'
    '<path d="M40 -4C42 6 40 12 34 16C38 22 48 22 52 19C55 22 65 22 68 19C72 22 82 22 86 16C80 12 78 6 80 -4" fill="#efc3a6" stroke="#c48b70" stroke-width=".8"/>'
    '<ellipse cx="50" cy="16" rx="5" ry="2.4" fill="#9a5f4c" opacity=".75"/><ellipse cx="70" cy="16" rx="5" ry="2.4" fill="#9a5f4c" opacity=".75"/>'
    '<path d="M55 23C57 30 58 36 60 40C62 36 63 30 65 23" fill="none" stroke="#c48b70" stroke-width=".9" opacity=".7"/>'
    '<path d="M26 24C18 36 14 50 14 60M94 24C102 36 106 50 106 60" fill="none" stroke="#c48b70" stroke-width="1" opacity=".55"/>'
    '<path d="M34 104C44 116 76 116 86 104" fill="none" stroke="#c48b70" stroke-width="1" opacity=".55"/>'
)


def F(v):
    return f1(v)


def front_mouth(W, up, dn, ut=8.0, lt=10.0, cy=60.0, uteeth=0.0, lteeth=0.0, tongue=None, fv=False, round_=False, key=None):
    """Boca de frente. W: media anchura; up/dn: apertura por encima/debajo de la línea de las comisuras;
    ut/lt: grosor de los labios; uteeth/lteeth: cuánto se ven los dientes; tongue: 'th' (entre los dientes) o 'low'."""
    cx = 60.0
    lx, rx = cx - W, cx + W
    k = 1.33
    sw = 0.62 if round_ else 0.5  # en la boca redonda, la abertura es casi una O
    # bordes de la abertura (de comisura a comisura)
    open_top = f'M{F(lx)} {F(cy)}C{F(cx - W * sw)} {F(cy - up * k)} {F(cx + W * sw)} {F(cy - up * k)} {F(rx)} {F(cy)}'
    open_bot = f'C{F(cx + W * sw)} {F(cy + dn * k)} {F(cx - W * sw)} {F(cy + dn * k)} {F(lx)} {F(cy)}Z'
    hole = open_top + open_bot
    out = []
    if up + dn > 0.6:
        out.append(f'<clipPath id="mo{U}"><path d="{hole}"/></clipPath><path d="{hole}" fill="#5e2229"/>')
        inner = []
        tw = 6.6 if not round_ else 5.6
        if uteeth > 0:
            n = 8
            x0 = cx - n / 2 * (tw + .4)
            ytop = cy - up - 3
            for i in range(n):
                hgt = (uteeth + 3) * (1.0 if 2 <= i <= 5 else 0.8)
                inner.append(f'<rect x="{F(x0 + i * (tw + .4))}" y="{F(ytop)}" width="{F(tw)}" height="{F(hgt)}" rx="1.6" fill="url(#th{U})" stroke="#bdb6a6" stroke-width=".4"/>')
        if lteeth > 0:
            n = 7
            lw = tw * .9
            x0 = cx - n / 2 * (lw + .4)
            for i in range(n):
                hgt = (lteeth + 4) * (1.0 if 2 <= i <= 4 else 0.85)
                inner.append(f'<rect x="{F(x0 + i * (lw + .4))}" y="{F(cy + dn + 4 - hgt)}" width="{F(lw)}" height="{F(hgt)}" rx="1.4" fill="url(#th{U})" stroke="#bdb6a6" stroke-width=".4"/>')
        if tongue == 'low':
            tw2 = W * 0.75
            inner.append(f'<path d="M{F(cx - tw2)} {F(cy + dn + 3)}C{F(cx - tw2)} {F(cy + dn * 0.2)} {F(cx + tw2)} {F(cy + dn * 0.2)} {F(cx + tw2)} {F(cy + dn + 3)}Z" fill="url(#tt{U})" stroke="#9c3a48" stroke-width=".6"/>')
        out.append(f'<g clip-path="url(#mo{U})">{"".join(inner)}</g>')
        if tongue == 'th':
            out.append(f'<path d="M44 {F(cy + 1)}C48 {F(cy - 3)} 72 {F(cy - 3)} 76 {F(cy + 1)}C76 {F(cy + 6)} 70 {F(cy + 8)} 60 {F(cy + 8)}C50 {F(cy + 8)} 44 {F(cy + 6)} 44 {F(cy + 1)}Z" fill="url(#tt{U})" stroke="#9c3a48" stroke-width=".6"/>'
                       f'<path d="M60 {F(cy - 1)}v6" stroke="#a8404f" stroke-width=".6" opacity=".6"/>')
    # labio de arriba: borde exterior con arco de Cupido y borde interior = borde superior de la abertura
    bw = 3.6 if not round_ else 2.4
    top = cy - up - ut
    upper = (f'M{F(lx - 3)} {F(cy + 0.5)}C{F(cx - W * 0.75)} {F(top + ut * 0.25)} {F(cx - bw * 2.4)} {F(top - 1.2)} {F(cx - bw)} {F(top - 0.6)}'
             f'Q{F(cx)} {F(top + 1.4)} {F(cx + bw)} {F(top - 0.6)}C{F(cx + bw * 2.4)} {F(top - 1.2)} {F(cx + W * 0.75)} {F(top + ut * 0.25)} {F(rx + 3)} {F(cy + 0.5)}'
             f'L{F(rx)} {F(cy)}C{F(cx + W * sw)} {F(cy - up * k)} {F(cx - W * sw)} {F(cy - up * k)} {F(lx)} {F(cy)}Z')
    bot = cy + dn + lt
    lower = (f'M{F(lx - 3)} {F(cy + 0.5)}L{F(lx)} {F(cy)}C{F(cx - W * sw)} {F(cy + dn * k)} {F(cx + W * sw)} {F(cy + dn * k)} {F(rx)} {F(cy)}'
             f'L{F(rx + 3)} {F(cy + 0.5)}C{F(cx + W * 0.8)} {F(bot + lt * 0.1)} {F(cx + W * 0.35)} {F(bot + 2)} {F(cx)} {F(bot + 2)}'
             f'C{F(cx - W * 0.35)} {F(bot + 2)} {F(cx - W * 0.8)} {F(bot + lt * 0.1)} {F(lx - 3)} {F(cy + 0.5)}Z')
    out.append(f'<path d="{lower}" fill="url(#ll{U})"/>')
    if fv:  # dientes de arriba apoyados en el labio de abajo
        n, tw = 6, 6.6
        x0 = cx - n / 2 * (tw + .4)
        out.append(''.join(f'<rect x="{F(x0 + i * (tw + .4))}" y="{F(cy - 3)}" width="{F(tw)}" height="{F(7 if 1 <= i <= 4 else 6)}" rx="1.6" fill="url(#th{U})" stroke="#bdb6a6" stroke-width=".4"/>' for i in range(n)))
    out.append(f'<path d="{upper}" fill="url(#lu{U})"/>')
    out.append(f'<path d="M{F(cx - W * 0.45)} {F(bot - lt * 0.25)}C{F(cx - W * 0.15)} {F(bot + 0.6)} {F(cx + W * 0.15)} {F(bot + 0.6)} {F(cx + W * 0.45)} {F(bot - lt * 0.25)}" stroke="#f3b2ad" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/>')
    if round_:  # labios adelantados: brillo y arrugas del redondeo
        out.append(''.join(f'<path d="M{F(cx + dx)} {F(top + 1.5)}l{F(dx * 0.08)} {F(ut * 0.55)}" stroke="#a9444f" stroke-width=".5" opacity=".5"/>' for dx in (-W * 0.5, -W * 0.2, W * 0.2, W * 0.5)))
    if up + dn <= 0.6 and not fv:
        out.append(f'<path d="M{F(lx)} {F(cy)}C{F(cx - W * 0.4)} {F(cy - 1)} {F(cx + W * 0.4)} {F(cy - 1)} {F(rx)} {F(cy)}" stroke="#8e3a43" stroke-width="1" fill="none"/>')
    if key:
        out.append(f'<circle cx="60" cy="{F(cy + key[1])}" r="{F(key[0])}" fill="none" stroke="#1a7fc0" stroke-width="1.6" stroke-dasharray="3 2.4"/>')
    return FRONT_DEFS + FACE + ''.join(out)


FRONT_SHAPES = {
    'closed': front_mouth(36, 0, 0, 8, 10, key=(14, 0)),  # p b m: labios apretados
    'fv': front_mouth(37, 1.0, 0, 8, 7, fv=True, key=(14, 1)),  # f v: dientes de arriba sobre el labio de abajo
    'th': front_mouth(40, 5, 6, 8, 10, uteeth=3.5, lteeth=3, tongue='th', key=(20, 2)),  # θ ð: punta entre los dientes
    'spread': front_mouth(45, 4, 3.5, 6, 8, uteeth=4, lteeth=3),  # iː j: labios estirados, dientes casi juntos
    'neutral': front_mouth(37, 4.5, 3.5, 8, 10, uteeth=4),  # labios relajados, algo abiertos
    'open': front_mouth(36, 9, 15, 7, 9, uteeth=5, lteeth=3, tongue='low'),  # æ ɑ h: boca muy abierta, lengua baja
    'round-open': front_mouth(20, 8, 10, 10, 12, uteeth=4, tongue='low', round_=True),  # ɔ oʊ: labios en O
    'round-close': front_mouth(13, 2.6, 2.8, 11, 13, round_=True),  # uː ʊ w ɹ: muy redondeados, abertura pequeña
    'sh': front_mouth(23, 4.5, 4.5, 10, 12, uteeth=4, lteeth=3.5, round_=True),  # ʃ ʒ tʃ dʒ: adelantados, dientes casi juntos
}

# ---------------------------------------------------------------- fichas (las 44 de phonemes.json)
# pose, poseEnd (diptongos), front, labels
BY = {
    'iy': ('iy', None, 'spread', ['tongue', 'lips', 'folds']),
    'ih': ('ih', None, 'neutral', ['tongue', 'lips', 'folds']),
    'eh': ('eh', None, 'neutral', ['tongue', 'lips', 'folds']),
    'ae': ('ae', None, 'open', ['tongue', 'lips', 'folds']),
    'aa': ('aa', None, 'open', ['tongue', 'lips', 'folds']),
    'ao': ('ao', None, 'round-open', ['lips', 'tongue', 'folds']),
    'uh': ('uh', None, 'round-close', ['tongue', 'lips', 'folds']),
    'uw': ('uw', None, 'round-close', ['lips', 'tongue', 'folds']),
    'ah': ('ah', None, 'neutral', ['tongue', 'lips', 'folds']),
    'ax': ('ax', None, 'neutral', ['tongue', 'lips', 'folds']),
    'er': ('r', None, 'round-close', ['tongue', 'lips', 'folds']),
    'axr': ('r', None, 'round-close', ['tongue', 'lips', 'folds']),
    'ey': ('eh', 'iy', 'spread', ['tongue', 'lips', 'folds']),
    'ay': ('aa', 'ih', 'open', ['tongue', 'lips', 'folds']),
    'oy': ('ao', 'ih', 'round-open', ['tongue', 'lips', 'folds']),
    'aw': ('aa', 'uh', 'open', ['tongue', 'lips', 'folds']),
    'ow': ('ao', 'uh', 'round-open', ['lips', 'tongue', 'folds']),
    'p': ('p-b', None, 'closed', ['lips']),
    'b': ('p-b', None, 'closed', ['lips', 'folds']),
    't': ('t-d', None, 'neutral', ['tongue', 'teeth']),
    'd': ('t-d', None, 'neutral', ['tongue', 'teeth', 'folds']),
    'ch': ('ch-jh', None, 'sh', ['tongue', 'lips']),
    'jh': ('ch-jh', None, 'sh', ['tongue', 'lips', 'folds']),
    'k': ('k-g', None, 'neutral', ['tongue']),
    'g': ('k-g', None, 'neutral', ['tongue', 'folds']),
    'f': ('f-v', None, 'fv', ['teeth', 'lips']),
    'v': ('f-v', None, 'fv', ['teeth', 'lips', 'folds']),
    'th': ('th-dh', None, 'th', ['tongue', 'teeth']),
    'dh': ('th-dh', None, 'th', ['tongue', 'teeth', 'folds']),
    's': ('s-z', None, 'neutral', ['tongue', 'teeth']),
    'z': ('s-z', None, 'neutral', ['tongue', 'teeth', 'folds']),
    'sh': ('sh-zh', None, 'sh', ['tongue', 'lips']),
    'zh': ('sh-zh', None, 'sh', ['tongue', 'lips', 'folds']),
    'm': ('m', None, 'closed', ['lips', 'velum', 'folds']),
    'n': ('n', None, 'neutral', ['tongue', 'velum', 'folds']),
    'ng': ('ng', None, 'neutral', ['tongue', 'velum', 'folds']),
    'hh': ('h', None, 'open', ['tongue', 'lips']),
    'l': ('l', None, 'neutral', ['tongue', 'teeth', 'folds']),
    'r': ('r', None, 'round-close', ['tongue', 'lips', 'folds']),
    'w': ('w', None, 'round-close', ['lips', 'tongue', 'folds']),
    'y': ('y', None, 'spread', ['tongue', 'lips', 'folds']),
    's-cluster': ('s-z', None, 'neutral', ['tongue', 'teeth']),
    'ed': ('t-d', None, 'neutral', ['tongue', 'teeth']),
    's-ending': ('s-z', None, 'neutral', ['tongue', 'teeth']),
}


def ts_str(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def main():
    args = sys.argv[1:]
    sheet = None
    if '--sheet' in args:
        i = args.index('--sheet')
        sheet = args[i + 1]
        del args[i:i + 2]
    base = args[0] if args else os.environ.get('MOUTH_CC0', '')
    if not os.path.isdir(base):
        sys.exit('Falta la carpeta midsaggital_articulations de drammock/phonetics-teaching-assets (ver README.md)')
    th = load(base, 'consonants/svg/θ')
    theta = dict(J=th['jaw'], L=landmarks(th['jaw']), folds=th['folds'])
    poses = {pid: build_pose(pid, base, theta) for pid in POSES}
    phon = json.load(open(os.path.join(ROOT, 'src', 'sounds', 'phonemes.json'), encoding='utf-8'))['phonemes']
    ids = [p['id'] for p in phon]
    assert set(ids) == set(BY), set(ids) ^ set(BY)
    lines = [
        '// GENERADO por scripts/mouth/build.py: no se edita a mano (contrato en docs/v5.11/sonidos-boca/CONTRATO.md).',
        '// Anatomía basada en los cortes sagitales CC0 (dominio público) de Richard Wright y Dan McCloy,',
        '// github.com/drammock/phonetics-teaching-assets (midsaggital_articulations), redibujados y adaptados.',
        "export type MouthMark = 'tongue' | 'teeth' | 'lips' | 'folds' | 'velum'",
        'export interface MouthPose {',
        '  id: string',
        '  viewBox: string',
        '  body: string',
        '  marks: Partial<Record<MouthMark, [number, number]>>',
        '  nasal: boolean',
        '}',
        'export interface MouthInfo {',
        '  pose: string',
        '  poseEnd?: string',
        '  front: string',
        '  labels: MouthMark[]',
        '  voiced: boolean',
        '}',
        '',
        'export const MOUTH_POSES: Record<string, MouthPose> = {',
    ]
    for pid, p in poses.items():
        mk = ', '.join(f'{k}: [{v[0]:g}, {v[1]:g}]' for k, v in p['marks'].items())
        lines.append(f"  {ts_str(pid)}: {{ id: {ts_str(pid)}, viewBox: {ts_str(p['viewBox'])}, nasal: {str(p['nasal']).lower()}, marks: {{ {mk} }},")
        lines.append(f"    body: {ts_str(p['body'])} }},")
    lines.append('}')
    lines.append('')
    lines.append('export const FRONT_SHAPES: Record<string, string> = {')
    for k, v in FRONT_SHAPES.items():
        lines.append(f'  {ts_str(k)}: {ts_str(v)},')
    lines.append('}')
    lines.append('')
    lines.append('export const MOUTH_BY_PHONEME: Record<string, MouthInfo> = {')
    for p in phon:
        pose, end, front, labels = BY[p['id']]
        voiced = True if p['kind'] in ('vowel', 'diphthong') else bool(p.get('voiced'))
        if p['kind'] not in ('vowel', 'diphthong') and p.get('voiced') is None:
            voiced = False  # rasgos (-ed, -s, grupos con s): la ficha enseña la variante sorda
        if not voiced:
            labels = [m for m in labels if m != 'folds']
        assert len(labels) <= 4 and pose in poses and (end is None or end in poses) and front in FRONT_SHAPES
        assert ('velum' in labels) == poses[pose]['nasal'], p['id']
        e = f', poseEnd: {ts_str(end)}' if end else ''
        lines.append(f"  {ts_str(p['id'])}: {{ pose: {ts_str(pose)}{e}, front: {ts_str(front)}, labels: [{', '.join(ts_str(m) for m in labels)}], voiced: {str(voiced).lower()} }},")
    lines.append('}')
    out = os.path.join(ROOT, 'src', 'sounds', 'mouth.ts')
    open(out, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
    print(f'{out}: {os.path.getsize(out) / 1024:.1f} KB, {len(poses)} poses, {len(FRONT_SHAPES)} formas de frente')
    if sheet:
        write_sheet(sheet, poses)


def write_sheet(path, poses):
    cells = []
    for i, (pid, p) in enumerate(poses.items()):
        body = p['body'].replace(U, f'_{i}')
        dots = ''.join(f'<circle cx="{v[0]}" cy="{v[1]}" r=".9" fill="#000"/><text x="{v[0] + 1.2}" y="{v[1] - 1}" font-size="3" fill="#000">{k}</text>' for k, v in p['marks'].items())
        cells.append(f'<div class="c"><h3>{pid}{" · nasal" if p["nasal"] else ""}</h3><svg viewBox="{p["viewBox"]}" width="300">{body}{dots}</svg></div>')
    for i, (k, v) in enumerate(FRONT_SHAPES.items()):
        cells.append(f'<div class="c"><h3>frente: {k}</h3><svg viewBox="0 0 120 120" width="160" style="border-radius:50%">{v.replace(U, f"_f{i}")}</svg></div>')
    css = 'body{margin:0;padding:10px;background:#eef3f6;font-family:system-ui;display:flex;flex-wrap:wrap;gap:8px}.c{background:#f7fbfd;border-radius:10px;padding:4px}h3{margin:2px 6px;font-size:14px}'
    open(path, 'w', encoding='utf-8').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{"".join(cells)}</body></html>')


if __name__ == '__main__':
    main()
