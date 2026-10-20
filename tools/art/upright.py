# Stands a long model upright: its longest axis (from its vertices) turned to Blender's Z, the end that is heavier kept
# down unless --flip, and written again. Usage: python upright.py <in> <out> [--flip]
import bpy, sys
import numpy as np
from mathutils import Matrix, Vector
src, out = sys.argv[1], sys.argv[2]
flip = '--flip' in sys.argv
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
pts = np.array([list(o.matrix_world @ v.co) for o in ms for v in o.data.vertices])
c = pts.mean(0)
w, v = np.linalg.eigh(np.cov((pts - c).T))
axis = Vector(v[:, np.argmax(w)])
proj = (pts - c) @ np.array(axis)
if (np.abs(proj[proj > 0]).sum() > np.abs(proj[proj < 0]).sum()) != flip:
    axis = -axis  # (the heavier end points along -axis, so it ends at the bottom)
rot = axis.rotation_difference(Vector((0, 0, -1))).to_matrix().to_4x4()
for o in bpy.context.scene.objects:
    if o.parent is None:
        o.matrix_world = Matrix.Translation(Vector(c)) @ rot @ Matrix.Translation(-Vector(c)) @ o.matrix_world
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG')
