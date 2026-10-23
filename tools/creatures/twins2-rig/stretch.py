# Triangles stretched by a clip's frame: rest-pose places of the vertices on edges grown > K times, rendered at rest
# in red. args: glb clip frac outprefix [K]
import bpy, sys, math, collections
import numpy as np
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
src, clip, frac, out = a[0], a[1], float(a[2]), a[3]; K = float(a[4]) if len(a) > 4 else 2.0
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
me = mesh.data
rest = np.array([ (mesh.matrix_world @ v.co)[:] for v in me.vertices ])
act = next(x for x in bpy.data.actions if x.name == clip)
arm.animation_data_create(); arm.animation_data.action = act
if hasattr(arm.animation_data, 'action_slot') and act.slots: arm.animation_data.action_slot = act.slots[0]
f0, f1 = act.frame_range; bpy.context.scene.frame_set(int(round(f0 + (f1 - f0) * frac)))
dg = bpy.context.evaluated_depsgraph_get(); ev = mesh.evaluated_get(dg); em = ev.to_mesh()
posed = np.array([ (mesh.matrix_world @ v.co)[:] for v in em.vertices ])
ev.to_mesh_clear()
E = np.array([e.vertices[:] for e in me.edges])
lr = np.linalg.norm(rest[E[:,0]] - rest[E[:,1]], axis=1); lp = np.linalg.norm(posed[E[:,0]] - posed[E[:,1]], axis=1)
bad = (lp > K * lr) & (lp > 0.03)
bv = np.unique(E[bad].ravel())
print('STRETCHED', int(bad.sum()), 'edges of', len(E), 'verts', len(bv))
names = {g.index: g.name for g in mesh.vertex_groups}
c = collections.Counter()
for i in bv:
    gs = sorted(me.vertices[i].groups, key=lambda g: -g.weight)
    c[tuple(names[g.group] for g in gs[:2])] += 1
for k, n in c.most_common(25): print('BONES', k, n)
# rest places (in the creature frame: Blender after the game's turn: x left?, -y forward, z up)
P = rest[bv]
if len(P): print('BOX', P.min(0).round(2), P.max(0).round(2))
attr = me.color_attributes.new('s', 'FLOAT_COLOR', 'POINT')
cols = np.tile([0.5, 0.5, 0.5, 1], (len(me.vertices), 1)); cols[bv] = [1, 0, 0, 1]
attr.data.foreach_set('color', cols.ravel()); me.color_attributes.active_color = attr
arm.data.pose_position = 'REST'
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.color_type = 'VERTEX'; sc.display.shading.light = 'STUDIO'
sc.render.resolution_x = sc.render.resolution_y = 450
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.2 * (rest[:,2].max())
H = rest[:,2].max()
for n, (loc, rot) in {'front': ((0, -4, H/2), (math.radians(90), 0, 0)), 'side': ((4, 0, H/2), (math.radians(90), 0, math.radians(90))), 'back': ((0, 4, H/2), (math.radians(90), 0, math.radians(180))), 'under': ((0, -3, -2.5), (math.radians(140), 0, 0))}.items():
    cam.location = loc; cam.rotation_euler = rot
    sc.render.filepath = f'{out}_{n}.png'; bpy.ops.render.render(write_still=True)
