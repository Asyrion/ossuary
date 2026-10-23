# Frames of a baked creature's clips, two views each. args: glb outdir spec (clip:frac,frac;clip:...)
import bpy, sys, math, os
a = sys.argv[sys.argv.index('--') + 1:]
src, outd, spec = a
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.color_type = 'TEXTURE'; sc.display.shading.light = 'STUDIO'
sc.render.resolution_x = sc.render.resolution_y = 360
sc.render.film_transparent = False
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.6
# floor line
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0)); fl = bpy.context.object
m = bpy.data.materials.new('floor'); m.diffuse_color = (0.25, 0.4, 0.25, 1); fl.data.materials.append(m)
H = max((o.matrix_world @ __import__('mathutils').Vector(c)).z for o in meshes for c in o.bound_box)
print('HEIGHT', H)
views = {'front': ((0, -4, H * 0.5 + 2.3), (math.radians(60), 0, 0)), 'side': ((4, 0, H * 0.5), (math.radians(90), 0, math.radians(90)))}
cam.data.ortho_scale = H * 1.6
arm.animation_data_create()
os.makedirs(outd, exist_ok=True)
for part in spec.split(';'):
    name, fr = part.split(':')
    act = next(x for x in bpy.data.actions if x.name == name or x.name.startswith(name + '_') or x.name.lower() == name)
    arm.animation_data.action = act
    if hasattr(arm.animation_data, 'action_slot') and act.slots: arm.animation_data.action_slot = act.slots[0]
    f0, f1 = act.frame_range
    for i, f in enumerate(fr.split(',')):
        sc.frame_set(int(round(f0 + (f1 - f0) * float(f))))
        for v, (loc, rot) in views.items():
            cam.location = loc; cam.rotation_euler = rot
            sc.render.filepath = f'{outd}/{name}_{i}_{v}.png'; bpy.ops.render.render(write_still=True)
print('ACTIONS', [x.name for x in bpy.data.actions])
