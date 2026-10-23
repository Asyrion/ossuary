import bpy, sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitjoints import build
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0])
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
bones = {b.name: (tuple(arm.matrix_world @ b.head_local), b.parent.name if b.parent else None) for b in arm.data.bones}
json.dump({k: list(v) for k, v in build(bones).items()}, open(a[1], 'w'), indent=0)
json.dump({k: list(v[0]) for k, v in bones.items()}, open(a[1].replace('.json', '_old.json'), 'w'), indent=0)
