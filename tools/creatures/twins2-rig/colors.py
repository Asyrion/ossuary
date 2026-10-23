# Each vertex coloured by the bone weighing most on it. args: bound.glb outprefix
import bpy, sys, math, colorsys, zlib
import numpy as np
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0])
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and len(o.data.vertices) > 1000)
for o in list(bpy.context.scene.objects):
    if o is not mesh: bpy.data.objects.remove(o)
mesh.parent = None
for m in list(mesh.modifiers): mesh.modifiers.remove(m)
names = {g.index: g.name for g in mesh.vertex_groups}
def col(n):
    h = (zlib.crc32(n.encode()) % 997) / 997
    return colorsys.hsv_to_rgb(h, 0.8, 1) + (1,)
cols = {}
me = mesh.data
attr = me.color_attributes.new('dom', 'FLOAT_COLOR', 'POINT')
for v in me.vertices:
    if v.groups:
        n = names[max(v.groups, key=lambda g: g.weight).group]
        c = cols.get(n) or cols.setdefault(n, col(n))
    else: c = (0, 0, 0, 1)
    attr.data[v.index].color = c
me.color_attributes.active_color = attr
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.color_type = 'VERTEX'; sc.display.shading.light = 'FLAT'
sc.render.resolution_x = sc.render.resolution_y = 500
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.15
views = {'front': ((3,0,0.45),(math.radians(90),0,math.radians(90))), 'side': ((0,-3,0.45),(math.radians(90),0,0)),
         'back': ((-3,0,0.45),(math.radians(90),0,math.radians(-90))), 'under': ((0.6,-2,-1.2),(math.radians(130),0,math.radians(15)))}
for n,(loc,rot) in views.items():
    cam.location = loc; cam.rotation_euler = rot
    sc.render.filepath = f'{a[1]}_{n}.png'; bpy.ops.render.render(write_still=True)
