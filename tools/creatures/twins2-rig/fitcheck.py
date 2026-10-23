# Slabs of twins2's mesh, side and front, with joints (json, Blender frame) and their parent links. args: armfile meshfile joints.json outprefix
import bpy, sys, math, json, bmesh
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
armf, meshf, jf, out = a
J = json.load(open(jf))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=armf)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
par = {b.name: b.parent.name if b.parent else None for b in arm.data.bones}
for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o)
bpy.ops.import_scene.gltf(filepath=meshf)
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
for o in list(bpy.context.scene.objects):
    if o is not mesh: bpy.data.objects.remove(o)
mesh.parent = None
for m in list(mesh.modifiers): mesh.modifiers.remove(m)
red = bpy.data.materials.new('red'); red.diffuse_color = (1, 0.1, 0.1, 1)
grn = bpy.data.materials.new('grn'); grn.diffuse_color = (0.2, 0.6, 0.2, 1)
skip = lambda n: ('Twist' in n and 'Neck' not in n) or 'Share' in n or any(k in n for k in ['Pinky','Ring','Mid','Index','Thumb','Eye','neutral'])
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.color_type = 'MATERIAL'; sc.display.shading.light = 'STUDIO'
sc.render.resolution_x = sc.render.resolution_y = 600
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.1
src = mesh.data.copy()
def grid(axis):
    obs = []
    for i in range(-10, 11):
        for horiz in (0, 1):
            if axis == 'y':  # side view: grid in x/z at y=-2
                loc = (0, -2, 0.45 + i/20) if horiz else (i/20, -2, 0.45); s = (0.6, 0.001, 0.0008) if horiz else (0.0008, 0.001, 0.6)
            else:  # front view: grid in y/z at x=2
                loc = (2, 0, 0.45 + i/20) if horiz else (2, i/20, 0.45); s = (0.001, 0.6, 0.0008) if horiz else (0.001, 0.0008, 0.6)
            bpy.ops.mesh.primitive_cube_add(size=2, location=loc); c = bpy.context.object; c.scale = s; c.data.materials.append(grn); obs.append(c)
    return obs
def marks(proj, inside):
    obs = []
    for n, p in J.items():
        if skip(n) or not inside(p): continue
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.01, location=proj(p)); s = bpy.context.object; s.data.materials.append(red); obs.append(s)
        q = J.get(par.get(n) or '')
        if q and not skip(par[n]):
            h, pp = Vector(proj(p)), Vector(proj(q)); d = h - pp
            if d.length > 1e-4:
                bpy.ops.mesh.primitive_cylinder_add(radius=0.003, depth=d.length, location=(h+pp)/2)
                c = bpy.context.object; c.rotation_mode='QUATERNION'; c.rotation_quaternion = d.to_track_quat('Z','Y'); c.data.materials.append(red); obs.append(c)
    return obs
views = [('side', 'y', name, lo, hi) for name, lo, hi in [('arm', -0.55, -0.27), ('leg', -0.27, -0.06), ('mid', -0.06, 0.06)]] + \
        [('front', 'x', name, lo, hi) for name, lo, hi in [('back', -0.3, -0.08), ('centre', -0.08, 0.08), ('fore', 0.08, 0.3)]]
for view, axis, name, lo, hi in views:
    ax = 1 if axis == 'y' else 0
    me = src.copy(); mesh.data = me
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (lo <= v.co[ax] <= hi)], context='VERTS')
    bm.to_mesh(me); bm.free()
    if axis == 'y':
        cam.location = (0, -3, 0.45); cam.rotation_euler = (math.radians(90), 0, 0)
        proj = lambda p: (p[0], -1.5, p[2])
    else:
        cam.location = (3, 0, 0.45); cam.rotation_euler = (math.radians(90), 0, math.radians(90))
        proj = lambda p: (1.5, p[1], p[2])
    g = grid(axis); mk = marks(proj, lambda p: lo - 0.03 <= p[ax] <= hi + 0.03)
    for m in mesh.data.materials: pass
    sc.render.filepath = f'{out}_{view}_{name}.png'; bpy.ops.render.render(write_still=True)
    for o in g + mk: bpy.data.objects.remove(o)
