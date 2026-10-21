# Prototipo 1 (estilo Tools for Clear Speech): piel semitransparente y anatomía real de Z-Anatomy (CC BY-SA 4.0) dentro.
import bpy, re, time, sys
from mathutils import Vector
OUT = sys.argv[-1]
bpy.ops.wm.open_mainfile(filepath='/tmp/claude-0/-home-user-Habla/91a5086f-2d27-5619-ab40-8caa6d462f32/scratchpad/dl/za/Z-Anatomy/Startup.blend')
sc = bpy.context.scene
def zmin(o):
    return min((o.matrix_world @ Vector(c))[2] for c in o.bound_box)
INNER = {
  'tongue': ['Tongue', 'Genioglossus muscle.l', 'Genioglossus muscle.r', 'Hyoglossus muscle.l', 'Hyoglossus muscle.r'],
  'mucosa': ['Soft palate', 'Uvula of palate', 'Mucosa of nasal cavity', 'Epiglottis', 'Superior pharyngeal constrictor.l', 'Middle pharyngeal constrictor.l', 'Inferior pharyngeal constrictor.l', 'Trachea'],
  'lips': ['Orbicularis oris muscle.l', 'Orbicularis oris muscle.r'],
  'cart': ['Thyroid cartilage', 'Cricoid cartilage', 'Arytenoid cartilage.l', 'Arytenoid cartilage.r'],
  'bone': ['Mandible', 'Maxilla.l', 'Maxilla.r', 'Hyoid bone', 'Palatine bone.l', 'Palatine bone.r', 'Atlas (C1)', 'Axis (C2)', 'Vertebra C3', 'Vertebra C4', 'Vertebra C5', 'Vertebra C6', 'Vertebra C7',
           'Frontal bone', 'Sphenoid bone', 'Occipital bone', 'Parietal bone.l', 'Nasal bone.l', 'Nasal bone.r', 'Vomer', 'Ethmoid bone'],
  'disc': ['Intervertebral disc C2-C3', 'Intervertebral disc C3-C4', 'Intervertebral disc C4-C5', 'Intervertebral disc C5-C6', 'Intervertebral disc C6-C7'],
}
TEETH = [o.name for o in bpy.data.objects if o.type == 'MESH' and re.match(r'(Upper|Lower) .*(incisor|canine|premolar|molar)', o.name) and not re.search(r'\.[ij]$', o.name)]
INNER['teeth'] = TEETH
reg = bpy.data.collections['9: Regions of human body']
SKIN = [o.name for o in reg.all_objects if o.type == 'MESH' and not re.search(r'\.[ij]$|Hairs|Eyelash|Eyebrow', o.name) and zmin(o) > 1.36]
keep = set(SKIN) | {n for v in INNER.values() for n in v}
for o in list(bpy.data.objects):
    o.hide_render = o.name not in keep
    o.hide_viewport = o.name not in keep
def unexclude(lc):
    lc.exclude = False; lc.hide_viewport = False; lc.holdout = False; lc.indirect_only = False
    for c in lc.children: unexclude(c)
for vl in sc.view_layers: unexclude(vl.layer_collection)
for c in bpy.data.collections: c.hide_render = False; c.hide_viewport = False
QUICK = '--rapido' in sys.argv
for n in keep:
    o = bpy.data.objects.get(n)
    if o:
        o.visible_camera = True; o.visible_diffuse = True; o.visible_glossy = True; o.visible_transmission = True; o.is_holdout = False
        o.display_type = 'TEXTURED'
print('DEBUG cam vis falsas antes', sum(1 for o in bpy.data.objects if o.name in keep and not o.visible_camera))
print('piel', len(SKIN), 'dentro', sum(len(v) for v in INNER.values()))

def mat(name, color, rough=.5, sss=0., alpha=1., coat=0.):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Subsurface Weight'].default_value = sss
    b.inputs['Alpha'].default_value = alpha
    b.inputs['Coat Weight'].default_value = coat
    return m
M = {
  'skin': mat('piel', (0.80, 0.55, 0.45), .55, .15, .22),
  'tongue': mat('lengua', (0.62, 0.12, 0.14), .45, .3, coat=.3),
  'mucosa': mat('mucosa', (0.75, 0.30, 0.30), .45, .25, coat=.2),
  'lips': mat('labios', (0.70, 0.25, 0.25), .5, .2),
  'cart': mat('cartilago', (0.80, 0.85, 0.88), .35, .1),
  'bone': mat('hueso', (0.88, 0.80, 0.62), .6),
  'disc': mat('disco', (0.55, 0.70, 0.85), .4),
  'teeth': mat('dientes', (0.96, 0.95, 0.90), .2, coat=.5),
}
for k, names in INNER.items():
    for n in names:
        o = bpy.data.objects.get(n)
        if o: o.data.materials.clear(); o.data.materials.append(M[k]); o.active_material = M[k]
        for s in (o.material_slots if o else []): s.material = M[k]
for n in SKIN:
    o = bpy.data.objects[n]
    for s in o.material_slots: s.material = M['skin']
    if not o.material_slots: o.data.materials.append(M['skin'])
# Cámara ortográfica de perfil (la cara mira a la izquierda) y luz de estudio
cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 0.30
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co)
co.location = (1.0, -0.02, 1.53); co.rotation_euler = (1.5708, 0, 1.5708); sc.camera = co
for loc, e in [((0.6, -0.5, 1.9), 60), ((0.6, 0.4, 1.4), 25), ((-0.3, -0.6, 1.7), 20)]:
    ld = bpy.data.lights.new('l', 'AREA'); ld.energy = e; ld.size = 0.6
    lo = bpy.data.objects.new('l', ld); lo.location = loc; sc.collection.objects.link(lo)
    lo.rotation_euler = (Vector((0, -0.02, 1.53)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.95, 0.95, 0.95, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 8 if QUICK else 48; sc.cycles.use_denoising = True
sc.render.resolution_x = 800; sc.render.resolution_y = 1000; sc.render.resolution_percentage = 40 if QUICK else 100; sc.render.film_transparent = False
sc.view_settings.view_transform = 'AgX'; sc.render.use_freestyle = False
for vl in sc.view_layers: vl.use_freestyle = False
sc.render.use_compositing = False; sc.render.use_sequencer = False
print('DEBUG escenas', [x.name for x in bpy.data.scenes], 'nodos comp', sc.use_nodes, 'secuencias', bool(sc.sequence_editor))
sc.render.filepath = OUT
dg = bpy.context.evaluated_depsgraph_get()
vis = [i.object.name for i in dg.object_instances if i.object.type == 'MESH']
print('DEBUG mallas en render', len(vis), vis[:5])
from bpy_extras.object_utils import world_to_camera_view
for n in ['Tongue', 'Mandible']:
    o = bpy.data.objects[n]; print('DEBUG', n, 'en cámara', tuple(round(x, 2) for x in world_to_camera_view(sc, co, o.matrix_world @ Vector(o.bound_box[0]))), 'hide_render', o.hide_render, 'visible', o.visible_get())
t = time.time(); bpy.ops.render.render(write_still=True); print('render s', round(time.time() - t, 1))
