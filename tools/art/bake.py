# Bakes the colour of a high-poly Tripo model onto its simplified version: the low model gets new UVs (smart project) and
# a texture baked from the high one's base colour (selected to active, no light), then is written as a GLB and rendered
# from the game's 45 degree camera. Usage: python bake.py <high.glb> <low.glb> <out.glb> <size> <preview.png>
import bpy, math, sys
from mathutils import Vector
high_p, low_p, out, size, prev = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
bpy.ops.wm.read_factory_settings(use_empty=True)
def load(p):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=p)
    ms = [o for o in bpy.context.scene.objects if o not in before and o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in ms: o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o
high = load(high_p); low = load(low_p)
# the low one: its own UVs and a fresh material with an image to bake into
bpy.ops.object.select_all(action='DESELECT'); low.select_set(True); bpy.context.view_layer.objects.active = low
for uv in list(low.data.uv_layers): low.data.uv_layers.remove(uv)
low.data.uv_layers.new(name='UVMap')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
# the simplifier leaves gaps and faces turned inward: its seams welded, its holes filled, every face outward
bpy.ops.mesh.remove_doubles(threshold=max(low.dimensions) * 0.004)
bpy.ops.mesh.fill_holes(sides=0)
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.02)
bpy.ops.object.mode_set(mode='OBJECT')
img = bpy.data.images.new('baked', size, size)
mat = bpy.data.materials.new('baked'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 1.0
low.data.materials.clear(); low.data.materials.append(mat)
nt.nodes.active = tex
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 4
bpy.ops.object.select_all(action='DESELECT'); high.select_set(True); low.select_set(True); bpy.context.view_layer.objects.active = low
dims = max(low.dimensions)
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_selected_to_active=True, cage_extrusion=dims * 0.08, max_ray_distance=dims * 0.3, margin=4)
img.filepath_raw = out + '.png'; img.file_format = 'PNG'; img.save()
# write the low one alone
bpy.data.objects.remove(high, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT'); low.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_image_format='JPEG')
# a look from the game's camera
lo = Vector((1e9,)*3); hi = Vector((-1e9,)*3)
for c in low.bound_box:
    w = low.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
centre = (lo + hi) / 2; s = max(hi - lo)
sc.cycles.samples = 16; sc.render.resolution_x = sc.render.resolution_y = 256; sc.render.film_transparent = True
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = s * 1.3
cam.location = centre + Vector((0, -7, 7)); cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
sun = bpy.data.objects.new('key', bpy.data.lights.new('key', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 3; sun.rotation_euler = (math.radians(35), math.radians(-25), 0)
sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.5, 0.5, 0.55)
sc.render.filepath = prev; bpy.ops.render.render(write_still=True)
print('baked', len(low.data.polygons), 'faces')
