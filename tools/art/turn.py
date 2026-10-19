# Turns a GLB about the vertical axis (degrees, Blender's Z) and writes it again. Usage: python turn.py <in> <out> <deg>
import bpy, math, sys
src, out, deg = sys.argv[1], sys.argv[2], float(sys.argv[3])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in bpy.context.scene.objects:
    if o.parent is None:
        o.rotation_mode = 'XYZ'; o.rotation_euler.z += math.radians(deg)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG')
