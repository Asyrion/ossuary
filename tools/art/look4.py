# Renders a GLB from four sides at the game's 45 degree camera into one strip. Usage: python look4.py <in.glb> <out.png>
import bpy, math, sys
from mathutils import Vector
src, out = sys.argv[1], sys.argv[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
lo = Vector((1e9,)*3); hi = Vector((-1e9,)*3)
for o in ms:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
centre = (lo + hi) / 2; s = max(hi - lo)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 16; sc.cycles.use_denoising = False
sc.render.resolution_x = sc.render.resolution_y = 200; sc.render.film_transparent = True
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = 'ORTHO'; cam.data.ortho_scale = s * 1.3
sun = bpy.data.objects.new('key', bpy.data.lights.new('key', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 3; sun.rotation_euler = (math.radians(35), math.radians(-25), 0)
sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.5, 0.5, 0.55)
for i, yaw in enumerate((0, 90, 180, 270)):
    a = math.radians(yaw); cam.location = centre + Vector((math.sin(a) * 7, -math.cos(a) * 7, 7))
    cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = f'{out}_{yaw}.png'; bpy.ops.render.render(write_still=True)
