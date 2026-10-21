# Prototipo 2 · ventana sagital solo en la zona del habla; el resto de la cabeza, cerrado (piel, pelo, oreja).
# Base: prototipo 1 · corte sagital estilo maqueta anatómica (Z-Anatomy, CC BY-SA 4.0).
# Se queda con la mitad derecha (x ≤ 0) y la mira desde la línea media (cámara en +X: la cara mira a la izquierda).
# Las piezas que cruzan la línea media se cortan con bmesh y la cara del corte se rellena con su tejido.
import bpy, bmesh, re, sys, time
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = ARGS[0] if ARGS else '/tmp/proto3.png'
QUICK = '--rapido' in sys.argv
BLEND = '/tmp/claude-0/-home-user-Habla/91a5086f-2d27-5619-ab40-8caa6d462f32/scratchpad/dl/za/Z-Anatomy/Startup.blend'
bpy.ops.wm.open_mainfile(filepath=BLEND)
sc = bpy.context.scene

def unexclude(lc):
    lc.exclude = False; lc.hide_viewport = False; lc.holdout = False; lc.indirect_only = False
    for c in lc.children: unexclude(c)
for vl in sc.view_layers:
    unexclude(vl.layer_collection); vl.use_freestyle = False
for c in bpy.data.collections: c.hide_render = False; c.hide_viewport = False

def top_collection(o):
    for c in o.users_collection:
        n = c.name
        # sube hasta la colección de sistema («1: Skeletal system»…)
        for parent in bpy.data.collections:
            if c.name in [x.name for x in parent.children_recursive] and re.match(r'\d+: ', parent.name): n = parent.name
        return n
    return ''

def wbox(o):
    v = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector([min(p[i] for p in v) for i in range(3)]), Vector([max(p[i] for p in v) for i in range(3)])

SYS_OK = ('1: Skeletal', '3: Joints', '4: Muscular', '7: Nervous', '8: Visceral', '9: Regions')
SKIP = re.compile(r'Falx|Tentorium|septal|Septum|Vomer|Perpendicular plate|Hairs of head|thyroid gland|Lung|pleura|Clavic|Sternum|Rib|pector|Deltoid|Trapezius|Sternocleidomastoid|nerve|artery|vein|node|ganglion|plexus|Hairs|Eyelash|Eyebrow|ligament|membrane|fascia|retinacul|axis of|line|plane|eyeball|lens|cornea|iris|retina|conjunctiva|lacrimal|bulb|Auricular|auricle|Helix|concha|tragus|scapha|antihelix|fossa', re.I)
sel = []
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    suf = re.search(r'\.([a-z0-9]+)$', o.name)
    if suf and suf.group(1) != 'r': continue  # sin «.l», etiquetas «.i/.j» ni inserciones
    if SKIP.search(o.name): continue
    sysname = top_collection(o)
    if not sysname.startswith(SYS_OK): continue
    mn, mx = wbox(o)
    if mx.z < 1.36 or mn.z > 1.80 or mn.y < -0.14 or mx.y > 0.13: continue
    if mn.z < 1.40 and not re.search(r'Trachea|Oesophag|Vertebra|disc|Thyroid cart|Cricoid|Spinal', o.name): continue
    if sysname.startswith('3: Joints') and 'disc' not in o.name.lower(): continue
    sel.append((o, sysname))
keep = {o.name for o, _ in sel}
for o in bpy.data.objects:
    o.hide_render = o.name not in keep
print('PIEZAS', len(sel))
reg = bpy.data.collections['9: Regions of human body']

# --- Materiales de «resina»: colores saturados con barniz ---------------------------------------------------------
def mat(name, color, rough=.42, coat=.6, sss=0.0, inner=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = .18
    b.inputs['Subsurface Weight'].default_value = sss
    if inner:  # cara interior (backface) de otro color: la piel por dentro se ve como carne
        geo = nt.nodes.new('ShaderNodeNewGeometry'); mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
        mix.inputs['A'].default_value = (*color, 1); mix.inputs['B'].default_value = (*inner, 1)
        nt.links.new(geo.outputs['Backfacing'], mix.inputs['Factor']); nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    return m
def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + .055) / 1.055) ** 2.4 if x > .04045 else x / 12.92 for x in c)
M = dict(
    skin=mat('piel', srgb('#e2a684'), .5, .35, .1, inner=srgb('#9a3a36')),
    bone=mat('hueso', srgb('#ecdcb4'), .5, .5), bonecut=mat('hueso-corte', srgb('#e6c58e'), .6, .4),
    cart=mat('cartilago', srgb('#c9d8de'), .35, .6), disc=mat('disco', srgb('#7fb0d6'), .35, .6),
    muscle=mat('musculo', srgb('#a8323a'), .45, .5), tongue=mat('lengua', srgb('#c0404c'), .38, .7),
    mucosa=mat('mucosa', srgb('#d9707a'), .35, .7), brain=mat('cerebro', srgb('#d39686'), .5, .5),
    nerve=mat('medula', srgb('#efe0b8'), .45, .5), teeth=mat('dientes', srgb('#f6f2e6'), .2, .8),
)
def pick(o, sysname):
    n = o.name
    if re.search(r'incisor|canine|premolar|molar', n, re.I): return 'teeth'
    if re.search(r'Tongue|glossus', n): return 'tongue'
    if re.search(r'disc', n, re.I): return 'disc'
    if re.search(r'cartilage|Epiglottis', n): return 'cart'
    if sysname.startswith('1:'): return 'bone'
    if sysname.startswith('4:'): return 'muscle'
    if sysname.startswith('7:'): return 'nerve' if re.search(r'spinal|medulla|pons|midbrain', n, re.I) else 'brain'
    if sysname.startswith('9:'): return 'skin'
    return 'mucosa'

# --- Corte por la línea media --------------------------------------------------------------------------------------
dg = bpy.context.evaluated_depsgraph_get()
cut = 0
for o, sysname in sel:
    key = pick(o, sysname)
    mn, mx = wbox(o)
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))  # con modificadores aplicados (espejo, grosor…)
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(o.matrix_world)
    if mn.x < -0.0005 and mx.x > 0.0005 and key != 'skin':
        r = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(1, 0, 0), clear_outer=True)
        edges = [e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        if edges:
            fill = bmesh.ops.holes_fill(bm, edges=edges, sides=0)
            for f in fill['faces']: f.material_index = 1
            cut += 1
    bm.to_mesh(me); bm.free()
    o.data = me; o.matrix_world = Matrix.Identity(4)
    o.modifiers.clear()
    if key == 'skin':
        s = o.modifiers.new('grosor', 'SOLIDIFY'); s.thickness = 0.003
    me.materials.clear(); me.materials.append(M[key]); me.materials.append(M['bonecut'] if key == 'bone' else M[key])
print('CORTADAS', cut)
import math
# --- Cabeza por fuera: escaneo 3D de Lee Perry-Smith (Infinite-Realities, CC BY 3.0), encajado sobre el atlas ----------
atlas_skin = [o for o, k in sel if pick(o, k) == 'skin']
av = [v.co for o in atlas_skin for v in o.data.vertices]
a_nose = min(av, key=lambda v: v.y); a_top = max(av, key=lambda v: v.z)
for o in atlas_skin: o.hide_render = True
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath='/tmp/claude-0/-home-user-Habla/91a5086f-2d27-5619-ab40-8caa6d462f32/scratchpad/dl/lps/LeePerrySmith.glb')
scan = [o for o in bpy.data.objects if o not in before and o.type == 'MESH'][0]
for o in [o for o in bpy.data.objects if o not in before and o.type != 'MESH']: bpy.data.objects.remove(o)
me = scan.data; me.transform(scan.matrix_world); scan.matrix_world = Matrix.Identity(4)
sv = [v.co.copy() for v in me.vertices]
s_nose = min(sv, key=lambda v: v.y); s_top = max(sv, key=lambda v: v.z)
k = (a_top.z - a_nose.z) / (s_top.z - s_nose.z)
me.transform(Matrix.Translation((0, a_nose.y, a_nose.z)) @ Matrix.Scale(k, 4) @ Matrix.Translation((-s_nose.x * 0 - 0, -s_nose.y, -s_nose.z)))
print('ESCANEO escala', round(k, 5), 'nariz atlas', tuple(round(x, 3) for x in a_nose), 'arriba atlas', round(a_top.z, 3))
WIN = [(-0.16, 1.618), (-0.005, 1.618), (0.040, 1.588), (0.046, 1.30), (-0.16, 1.30)]
def inside(y, z):
    c = False
    for i in range(len(WIN)):
        (y1, z1), (y2, z2) = WIN[i], WIN[(i + 1) % len(WIN)]
        if (z1 > z) != (z2 > z) and y < (y2 - y1) * (z - z1) / (z2 - z1) + y1: c = not c
    return c
bm = bmesh.new(); bm.from_mesh(me)
pts = [(v.co.y, v.co.z) for v in bmesh.ops.bisect_plane(bm.copy(), geom=[], plane_co=(0, 0, 0), plane_no=(1, 0, 0))['geom_cut']] if False else []
cutb = bm.copy()
r = bmesh.ops.bisect_plane(cutb, geom=cutb.verts[:] + cutb.edges[:] + cutb.faces[:], plane_co=(-0.0015, 0, 0), plane_no=(1, 0, 0))
pts = [(v.co.y, v.co.z) for v in r['geom_cut'] if isinstance(v, bmesh.types.BMVert)]
cutb.free()
for i in range(len(WIN)):
    (y1, z1), (y2, z2) = WIN[i], WIN[(i + 1) % len(WIN)]
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, y1, z1), plane_no=(0, z2 - z1, y1 - y2))
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().x > -0.002 and inside(f.calc_center_median().y, f.calc_center_median().z)], context='FACES')
bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
sol = scan.modifiers.new('grosor', 'SOLIDIFY'); sol.thickness = 0.003; sol.offset = -1
print('ESCANEO perfil', len(pts))
C = (0.0, 1.575)
best = {}
for y, z in pts:  # en cada dirección desde el centro, el punto más lejano = el contorno exterior del perfil
    a = round(math.atan2(z - C[1], y - C[0]) / (math.pi / 360))
    d = (y - C[0]) ** 2 + (z - C[1]) ** 2
    if a not in best or d > best[a][0]: best[a] = (d, y, z)
prof = [(best[a][1], best[a][2]) for a in sorted(best)]
def plate(name, poly, x, material):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for y, z in poly]; bm.faces.new(vs); bm.normal_update(); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); me.materials.append(material); return ob
FLESH = mat('carne', srgb('#cf7d6c'), .45, .5)
AIR = mat('aire', srgb('#4a161c'), .5, .3)
plate('carne', prof, -0.012, FLESH)
VT = [(-0.100, 1.537), (-0.111, 1.556), (-0.108, 1.577), (-0.085, 1.598), (-0.040, 1.601), (-0.012, 1.593), (-0.005, 1.560),
      (-0.005, 1.500), (-0.009, 1.462), (-0.016, 1.462), (-0.021, 1.500), (-0.032, 1.514), (-0.055, 1.516), (-0.085, 1.512), (-0.098, 1.526)]
plate('aire', VT, -0.0115, AIR)
print('PERFIL puntos', len(prof))

# --- Cámara, luz y fondo ---------------------------------------------------------------------------------------
cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 0.40
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co)
co.location = (1.0, -0.005, 1.57); co.rotation_euler = (1.5708, 0, 1.5708); sc.camera = co
def area(loc, energy, size, color=(1, 1, 1)):
    ld = bpy.data.lights.new('l', 'AREA'); ld.energy = energy; ld.size = size; ld.color = color
    lo = bpy.data.objects.new('l', ld); lo.location = loc; sc.collection.objects.link(lo)
    lo.rotation_euler = (Vector((0, -0.01, 1.55)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
area((0.55, -0.35, 1.85), 9, .35, (1, .97, .92))   # principal: arriba y delante (sombras suaves con volumen)
area((0.6, 0.35, 1.45), 2.5, .8, (.92, .95, 1))     # relleno
area((-0.2, 0.3, 1.9), 3, .3)                        # contraluz: separa el contorno del fondo
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (*srgb('#d9dde2'), 1); w.node_tree.nodes['Background'].inputs[1].default_value = .35
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 12 if QUICK else 96; sc.cycles.use_denoising = True
sc.render.resolution_x = 800; sc.render.resolution_y = 1000; sc.render.resolution_percentage = 45 if QUICK else 100
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
sc.render.use_freestyle = False; sc.render.use_compositing = False; sc.render.use_sequencer = False
sc.render.filepath = OUT
t = time.time(); bpy.ops.render.render(write_still=True); print('render s', round(time.time() - t, 1))
