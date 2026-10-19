# A closed low version of a Tripo model: a voxel remesh (no holes, no inside-out faces), then a collapse down to about
# `target` triangles. Its colour is baked from the original afterwards (bake.py). Usage: python remesh.py <in> <out> <target> <voxels>
import bpy, sys
src, out, target, vox = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in ms: o.select_set(True)
bpy.context.view_layer.objects.active = ms[0]
if len(ms) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
m = ob.modifiers.new('re', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = max(ob.dimensions) / vox; m.use_smooth_shade = False
bpy.ops.object.modifier_apply(modifier=m.name)
tris = lambda: sum(len(p.vertices) - 2 for p in ob.data.polygons)
n = tris()
d = ob.modifiers.new('dec', 'DECIMATE'); d.decimate_type = 'COLLAPSE'; d.ratio = min(1, target / n); d.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=d.name)
print('remeshed', n, '->', tris())
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False)
