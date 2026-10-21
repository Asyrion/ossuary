# Cuts a made container's lid off at a height, so it can open in the game: the model (its front to the camera, Blender's -Y)
# is split by a level plane at `cut` (a share of its height) into `body` and `lid`, each closed where it was cut by a
# plain dark face (the inside), and the lid's origin set on its hinge, the back of the cut. Usage:
#   python lid.py <in.glb> <out.glb> <cut>
import bpy, bmesh, sys
from mathutils import Vector

src, out, cut = sys.argv[1], sys.argv[2], float(sys.argv[3])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in ms: o.select_set(True)
bpy.context.view_layer.objects.active = ms[0]
if len(ms) > 1: bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
zs = [v.co.z for v in body.data.vertices]
z = min(zs) + (max(zs) - min(zs)) * cut
inside = bpy.data.materials.new('inside'); inside.use_nodes = True
bsdf = inside.node_tree.nodes['Principled BSDF']
bsdf.inputs['Base Color'].default_value = (0.1, 0.045, 0.02, 1)  # (dark wood, in linear light: near black read as a hole)
# (a little light of its own: the lid's underside faces away from every light once it is open)
bsdf.inputs['Emission Color'].default_value = (0.1, 0.045, 0.02, 1); bsdf.inputs['Emission Strength'].default_value = 0.6
lid = body.copy(); lid.data = body.data.copy(); bpy.context.scene.collection.objects.link(lid)
body.name, lid.name = 'body', 'lid'
for ob, keep_above in ((body, False), (lid, True)):
    ob.data.materials.append(inside)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)  # (glTF splits vertices at UV seams: joined again, so it closes)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1),
                                 clear_inner=keep_above, clear_outer=not keep_above)
    bm.to_mesh(ob.data); bm.free()
    had = len(ob.data.polygons)
    # (closed where it was cut: every open edge filled, the new faces dark)
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='EDGE'); bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.mesh.select_non_manifold(extend=False, use_wire=False, use_boundary=True, use_multi_face=False,
                                     use_non_contiguous=False, use_verts=False)
    bpy.ops.mesh.fill_holes(sides=0)
    bpy.ops.object.mode_set(mode='OBJECT')
    for f in ob.data.polygons[had:]: f.material_index = len(ob.data.materials) - 1
    print(ob.name, len(ob.data.polygons), 'faces,', len(ob.data.polygons) - had, 'caps')
# the hinge: the back of the cut, in the middle
back = max(v.co.y for v in lid.data.vertices if abs(v.co.z - z) < 0.02)
bpy.context.scene.cursor.location = Vector((0, back, z))
bpy.ops.object.select_all(action='DESELECT'); lid.select_set(True); bpy.context.view_layer.objects.active = lid
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
print('cut at', round(z, 3), 'hinge', (0, round(back, 3), round(z, 3)))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG')
