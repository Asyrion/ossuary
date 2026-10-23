# Bind twins2's mesh to the first guardian's armature, its joints moved into twins2's body (joints.json), with
# Blender's automatic (bone heat) weights computed on a decimated proxy and carried to the full mesh.
# args: armfile(twins walk.glb) meshfile(twins2 rig.glb) joints.json out.glb
import bpy, sys, json, time
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]
armf, meshf, jf, out = a
J = {k: Vector(v) for k, v in json.load(open(jf)).items()}
T0 = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=armf)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
for o in list(bpy.context.scene.objects):
    if o is not arm: bpy.data.objects.remove(o)
for x in list(bpy.data.actions): bpy.data.actions.remove(x)
arm.animation_data_clear()
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=meshf)
mesh = next(o for o in bpy.context.scene.objects if o not in before and o.type == 'MESH')
for o in list(bpy.context.scene.objects):
    if o not in before and o is not mesh: bpy.data.objects.remove(o)
mesh.parent = None
assert arm.matrix_world == arm.matrix_world.Identity(4), arm.matrix_world
# the joints moved: each bone's head to its place, its tail to its connected child's head (or kept as long as it was)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
old = {b.name: (b.head.copy(), b.tail.copy()) for b in eb}
for b in eb:
    h, t = old[b.name]
    kid = next((c for c in b.children if (old[c.name][0] - t).length < 1e-4 and c.name in J and 'Twist' not in c.name and 'Share' not in c.name), None)
    b.use_connect = False
for b in eb:
    h, t = old[b.name]
    kid = next((c for c in b.children if (old[c.name][0] - t).length < 1e-4 and 'Twist' not in c.name and 'Share' not in c.name), None)
    nh = J[b.name]
    b.head = nh
    b.tail = J[kid.name] if kid and (J[kid.name] - nh).length > 1e-3 else nh + (t - h)
bpy.ops.object.mode_set(mode='OBJECT')
# bones that carry no skin in Tripo's rig carry none here
NOSKIN = lambda n: 'Twist' in n or 'Share' in n or n in ('BoneRoot', 'Hip', 'FacialBone', 'L_Eye', 'R_Eye', 'neutral_bone')
for b in arm.data.bones: b.use_deform = not NOSKIN(b.name)
# the proxy: welded, decimated
proxy = mesh.copy(); proxy.data = mesh.data.copy(); bpy.context.scene.collection.objects.link(proxy)
bpy.ops.object.select_all(action='DESELECT'); proxy.select_set(True); bpy.context.view_layer.objects.active = proxy
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=1e-4); bpy.ops.object.mode_set(mode='OBJECT')
d = proxy.modifiers.new('dec', 'DECIMATE'); d.ratio = float(__import__('os').environ.get('DEC', '0.06'))
bpy.ops.object.modifier_apply(modifier='dec')
print('PROXY', len(proxy.data.polygons), 'polys', round(time.time() - T0), 's')
# (bone heat fails at this small a size: weighed ten times larger, on a copy of the armature)
SC = float(__import__('os').environ.get('SC', '10'))
arm2 = arm.copy(); arm2.data = arm.data.copy(); bpy.context.scene.collection.objects.link(arm2)
arm2.scale = (SC, SC, SC); proxy.scale = (SC, SC, SC); bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT'); proxy.select_set(True); arm2.select_set(True); bpy.context.view_layer.objects.active = arm2
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
proxy.parent = None; proxy.matrix_world = proxy.matrix_world.Identity(4)
for m in list(proxy.modifiers): proxy.modifiers.remove(m)
bpy.data.objects.remove(arm2); bpy.context.view_layer.update()
import os
empty = [g.name for g in proxy.vertex_groups if not any(g.index in [x.group for x in v.groups] for v in proxy.data.vertices[:0])]
unweighted = sum(1 for v in proxy.data.vertices if not any(g.weight > 1e-4 for g in v.groups))
print('HEAT', 'groups', len(proxy.vertex_groups), 'unweighted verts', unweighted, 'of', len(proxy.data.vertices), round(time.time() - T0), 's')
# each region keeps its own bones' weights (mask.py); a vertex left with none goes to its nearest allowed bone
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mask import allowed
gname = {g.index: g.name for g in proxy.vertex_groups}
segs = {b.name: (arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local) for b in arm.data.bones if b.use_deform}
from mathutils.geometry import intersect_point_line
def nearest(p):
    best, bn = 1e9, None
    for n, (h, t) in segs.items():
        if not allowed(p, n): continue
        q, f = intersect_point_line(p, h, t); f = min(1, max(0, f)); d = (p - (h + (t - h) * f)).length
        if d < best: best, bn = d, n
    return bn
cut = fell = 0
for v in proxy.data.vertices:
    p = v.co
    keep = 0.0
    for g in list(v.groups):
        if allowed(p, gname[g.group]): keep += g.weight
        elif g.weight > 0: g.weight = 0.0; cut += 1
    if keep < 1e-4:
        proxy.vertex_groups[nearest(p)].add([v.index], 1.0, 'REPLACE'); fell += 1
print('MASK', cut, 'weights cut', fell, 'vertices given their nearest allowed bone')
bpy.ops.object.select_all(action='DESELECT'); proxy.select_set(True); bpy.context.view_layer.objects.active = proxy
bpy.ops.object.vertex_group_clean(group_select_mode='ALL', limit=0.0)
# (smoothed a little, so a region's edge blends over a few rings rather than tearing)
SM = int(os.environ.get('SMOOTH', '3'))
if SM:
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT'); bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=SM); bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
# carried to the full mesh
for g in proxy.vertex_groups: mesh.vertex_groups.new(name=g.name)
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
dt = mesh.modifiers.new('dt', 'DATA_TRANSFER'); dt.object = proxy; dt.use_vert_data = True
dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
bpy.ops.object.modifier_apply(modifier='dt')
# the arms cut free below the shoulders: each face goes to an arm (its vertices weighed mostly to that arm's bones) or
# to the rest; the edges between them split below CUTZ, and each side's vertices keep only their own side's bones, so a
# raised arm leaves the thigh it was fused to instead of dragging a sheet of skin up with it
import bmesh
from mask import is_arm, side
CUTZ = float(os.environ.get('CUTZ', '0.5'))
gname = {g.index: g.name for g in mesh.vertex_groups}
armof = {i: (side(n) if is_arm(n) else '') for i, n in gname.items()}
bm = bmesh.new(); bm.from_mesh(mesh.data)
dl = bm.verts.layers.deform.verify()
def vregion(v):
    s = {'L_': 0.0, 'R_': 0.0, '': 0.0}
    for g, w in v[dl].items(): s[armof[g]] += w
    return max(s, key=s.get) if max(s['L_'], s['R_']) > 0.5 else ''
vr = [vregion(v) for v in bm.verts]
bm.faces.ensure_lookup_table()
fr = {}
for f in bm.faces:
    c = {}
    for v in f.verts: c[vr[v.index]] = c.get(vr[v.index], 0) + 1
    fr[f.index] = max(c, key=lambda k: (c[k], k == ''))
edges = [e for e in bm.edges if len(e.link_faces) == 2 and fr[e.link_faces[0].index] != fr[e.link_faces[1].index]
         and max(v.co.z for v in e.verts) < CUTZ]
bmesh.ops.split_edges(bm, edges=edges)
bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
cut2 = 0
for v in bm.verts:
    if v.co.z >= CUTZ + 0.05: continue
    regs = {fr.get(f.index, '') for f in v.link_faces}
    if len(regs) != 1: continue
    r = regs.pop(); d = v[dl]
    for g in list(d.keys()):
        a = armof[g]
        if (r and a != r and v.co.z < CUTZ) or (not r and a and v.co.z < CUTZ):
            del d[g]; cut2 += 1
    if not d.keys():
        # (nothing left: the nearest bone of its own side)
        best = None
        for n, (h, t) in segs.items():
            gi = mesh.vertex_groups[n].index
            if (r and armof[gi] != r) or (not r and armof[gi]): continue
            q, f = intersect_point_line(v.co, h, t); f = min(1, max(0, f)); dd = (v.co - (h + (t - h) * f)).length
            if best is None or dd < best[0]: best = (dd, gi)
        d[best[1]] = 1.0
print('CUT', len(edges), 'edges split', cut2, 'weights dropped', sum(1 for r in vr if r), 'arm vertices')
bm.to_mesh(mesh.data); bm.free()
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
bpy.data.objects.remove(proxy)
am = mesh.modifiers.new('Armature', 'ARMATURE'); am.object = arm
mesh.parent = arm
print('BOUND', round(time.time() - T0), 's')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=False, export_skins=True, export_all_influences=False, use_selection=False)
print('DONE', round(time.time() - T0), 's')
