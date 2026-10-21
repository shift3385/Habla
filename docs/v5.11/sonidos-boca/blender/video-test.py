import sys, time, bpy, runpy
# Reutiliza la escena del prototipo sin renderizar la imagen fija
sys.argv = [sys.argv[0], '--rapido', '--', '/dev/null']
src = open('/tmp/claude-0/-home-user-Habla/91a5086f-2d27-5619-ab40-8caa6d462f32/scratchpad/b3d/proto1.py').read().split('t = time.time(); bpy.ops.render.render')[0]
exec(src)
sc = bpy.context.scene
# Mandíbula, dientes de abajo y lengua giran juntos: la boca se abre (prueba de animación)
jaw = [o for o in bpy.data.objects if o.name in ('Mandible', 'Tongue') or o.name.startswith('Lower ')]
from mathutils import Matrix
sc.frame_start, sc.frame_end, sc.frame_step = 1, 12, 1
P = Vector((0, -0.005, 1.565))
orig = {o.name: o.matrix_world.copy() for o in jaw}
print('DEBUG mandíbula: restricciones', [(o.name, [c.type for c in o.constraints], bool(o.animation_data)) for o in jaw][:4])
for f, ang in ((1, 0.0), (12, 0.35)):
    sc.frame_set(f)
    R = Matrix.Translation(P) @ Matrix.Rotation(ang, 4, 'X') @ Matrix.Translation(-P)
    for o in jaw:
        o.matrix_world = R @ orig[o.name]
        o.keyframe_insert('location', frame=f); o.keyframe_insert('rotation_euler', frame=f); o.keyframe_insert('rotation_quaternion', frame=f)
sc.render.image_settings.media_type = 'VIDEO'
sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.ffmpeg.constant_rate_factor = 'MEDIUM'
sc.render.fps = 24
sc.render.filepath = '/tmp/claude-0/-home-user-Habla/91a5086f-2d27-5619-ab40-8caa6d462f32/scratchpad/b3d/prueba-video.mp4'
t = time.time(); bpy.ops.render.render(animation=True); print('VIDEO s', round(time.time() - t, 1))
