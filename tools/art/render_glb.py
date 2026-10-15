"""Render a GLB's clips to PNG frames from Ossuary's camera, in four facings (R3, the sprite route; ported from
Godot-Tamer's tools/bake/render_glb.py).

Runs inside Blender (5.2, headless):

  blender -b -P tools/art/render_glb.py -- --glb <file.glb> --out <dir> --units 1.3
          [--canvas 96] [--down 2] [--facings S,E,N,W] [--clips idle,walk] [--fps 12] [--max-frames 16] [--still]
          [--front -Y] [--margin 8]

The camera is the game's: orthographic, pitched 45 degrees down, looking north, at the room kit's texel (48 game pixels
a unit on the picture plane: 48 across, 34 down the floor; `--down` renders that many times larger, for pixelize.py's
box filter). The model is scaled so its rest pose stands `--units` tall (the game's height for it) with its feet at the
origin, and turned for each facing: S faces the camera, E faces screen right, N away, W left. Every frame of a facing
shares one placement, so the sprite does not swim.

Light (art bible 4.5): a cool ambient in floor 1's shadow hue, a key from above and a little left, a weak cool fill from
the front right, and a rim from behind on the upper left that lights the top left edge. Materials go matte (no
specular). A second, unlit pass (<frame>_flat.png) holds the texture's own colours, from which pixelize.py takes each
pixel's colour family.

Output: <out>/<facing>/<clip>/f####.png (+ _flat.png), and <out>/clips.json.
"""
import argparse, json, math, os, sys
import bpy
from mathutils import Vector

PPU = 48  # game pixels a unit on the picture plane (CFG.roomKit.texel: 48 across)
AMBIENT = (0x2B / 255, 0x30 / 255, 0x47 / 255)  # floor 1's shadow, art bible 4.1
FACING_YAW = {"S": 0.0, "E": 90.0, "N": 180.0, "W": -90.0}


def parse():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--glb", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--units", type=float, required=True, help="rest height in game units (the mage 1.3)")
    ap.add_argument("--canvas", type=int, default=96, help="frame size in game pixels")
    ap.add_argument("--down", type=int, default=2, help="render this many times larger than the game pixel")
    ap.add_argument("--facings", default="S,E,N,W")
    ap.add_argument("--fps", type=int, default=12)
    ap.add_argument("--clips", default="", help="comma list of clip names (substring match; default all)")
    ap.add_argument("--max-frames", type=int, default=16, help="cap a clip (frames sampled evenly)")
    ap.add_argument("--still", action="store_true", help="the rest pose only")
    ap.add_argument("--front", default="-Y", choices=("-Y", "+Y", "+X", "-X"), help="the model axis its face looks along "
                    "after import (glTF +z comes in as Blender -Y)")
    ap.add_argument("--margin", type=int, default=8, help="game pixels between the origin and the bottom edge")
    ap.add_argument("--rest-clip", default="", help="the clip whose first frame sets the scale (default: the first)")
    ap.add_argument("--range", default="", help="clip:f0-f1,... a part of a clip only, in its frames (the mage's cast "
                    "is 5.4 s; the game plays its thrust)")
    ap.add_argument("--pin", default="", help="a bone kept over the origin (the game's centreHips: the run carries the "
                    "hips forward)")
    return ap.parse_args(argv)


def import_model(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if path.lower().endswith(".fbx"):
        bpy.ops.import_scene.fbx(filepath=path)
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    objs = list(bpy.context.scene.objects)
    meshes = [o for o in objs if o.type == "MESH"]
    arm = next((o for o in objs if o.type == "ARMATURE"), None)
    skinned = [o for o in meshes if any(m.type == "ARMATURE" for m in o.modifiers)]
    if arm is not None and skinned:
        for o in meshes:
            if o not in skinned:  # Tripo's helper meshes (an "Icosphere" with no armature)
                o.hide_render = True
        meshes = skinned
    # one parent for everything, to scale, place and turn the model
    root = bpy.data.objects.new("proof_root", None)
    bpy.context.scene.collection.objects.link(root)
    for o in objs:
        if o.parent is None:
            o.parent = root
    return meshes, arm, root


def bounds(objs):
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        ev = o.evaluated_get(dg)
        for v in ev.data.vertices:
            p = ev.matrix_world @ v.co
            lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    return lo, hi


def matte():
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b is None:
            continue
        b.inputs["Roughness"].default_value = 1.0
        for name in ("Specular IOR Level", "Metallic", "Coat Weight", "Sheen Weight"):
            if name in b.inputs:
                b.inputs[name].default_value = 0.0


def camera_and_lights(a):
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("cam"); cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("cam", cam_data); scene.collection.objects.link(cam)
    pitch = math.radians(45)
    cam.location = Vector((0, -20 * math.cos(pitch), 20 * math.sin(pitch)))
    cam.rotation_euler = (-cam.location).normalized().to_track_quat("-Z", "Y").to_euler()
    cam_data.ortho_scale = a.canvas / PPU
    cam_data.shift_y = (a.canvas / 2 - a.margin) / a.canvas  # the origin (the feet) sits `margin` px above the bottom
    cam_data.clip_start = 0.1; cam_data.clip_end = 100
    scene.camera = cam

    def sun(name, energy, toward, colour):
        ld = bpy.data.lights.new(name, "SUN"); ld.energy = energy; ld.color = colour; ld.angle = 0.0
        o = bpy.data.objects.new(name, ld); scene.collection.objects.link(o)
        o.rotation_euler = Vector(toward).normalized().to_track_quat("Z", "Y").to_euler()  # +Z toward the light
    sun("key", 3.2, (-0.35, -0.3, 1.0), (1.0, 0.95, 0.86))   # from above, a little left
    sun("fill", 0.5, (0.7, -0.8, 0.35), (0.62, 0.7, 1.0))    # cool, front right
    sun("rim", 4.0, (-0.7, 0.9, 0.55), (1.0, 0.93, 0.8))     # behind, upper left: the top left edge
    scene.world = bpy.data.worlds.new("w"); scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (*AMBIENT, 1); bg.inputs[1].default_value = 1.2


def render_settings(a):
    scene = bpy.context.scene
    engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    size = a.canvas * a.down
    scene.render.resolution_x = size; scene.render.resolution_y = size; scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "RGBA"
    scene.render.filter_size = 0.0
    scene.view_settings.view_transform = "Standard"
    scene.render.fps = a.fps
    for attr, val in (("taa_render_samples", 4), ("use_shadows", False)):
        try:
            setattr(scene.eevee, attr, val)
        except Exception:
            pass


FLAT = {"lights": {}, "world": None}


def flat_mode(on):
    """Unlit pass: every material emits its base colour, lights and world off."""
    scene = bpy.context.scene
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b is None:
            continue
        base, emis, strength = b.inputs["Base Color"], b.inputs["Emission Color"], b.inputs["Emission Strength"]
        if on:
            m["_strength"] = strength.default_value
            m["_emis_link"] = [(l.from_node.name, l.from_socket.name) for l in emis.links]
            for l in list(emis.links):
                nt.links.remove(l)
            if base.is_linked:
                m["_base_from"] = (base.links[0].from_node.name, base.links[0].from_socket.name)
                nt.links.new(base.links[0].from_socket, emis)
                nt.links.remove(base.links[0])
            else:
                m["_base_from"] = None
                emis.default_value = base.default_value
            m["_base"] = list(base.default_value); base.default_value = (0, 0, 0, 1)
            strength.default_value = 1.0
        else:
            for l in list(emis.links):
                nt.links.remove(l)
            if m.get("_base_from"):
                n, s = m["_base_from"]; nt.links.new(nt.nodes[n].outputs[s], base)
            base.default_value = m["_base"]
            for n, s in m.get("_emis_link", []):
                nt.links.new(nt.nodes[n].outputs[s], emis)
            strength.default_value = m["_strength"]
    for o in scene.objects:
        if o.type == "LIGHT":
            if on:
                FLAT["lights"][o.name] = o.data.energy; o.data.energy = 0.0
            else:
                o.data.energy = FLAT["lights"][o.name]
    bg = scene.world.node_tree.nodes.get("Background")
    if on:
        FLAT["world"] = bg.inputs[1].default_value; bg.inputs[1].default_value = 0.0
    else:
        bg.inputs[1].default_value = FLAT["world"]


def render_pair(path):
    scene = bpy.context.scene
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    flat_mode(True)
    scene.render.filepath = path[:-4] + "_flat.png"
    bpy.ops.render.render(write_still=True)
    flat_mode(False)


def main():
    a = parse()
    meshes, arm, root = import_model(os.path.abspath(a.glb))
    if not meshes:
        sys.exit("no mesh in " + a.glb)
    matte()
    scene = bpy.context.scene
    actions = list(bpy.data.actions)
    if arm is not None and actions:
        if arm.animation_data is None:
            arm.animation_data_create()
        rest = next((x for x in actions if a.rest_clip and a.rest_clip in x.name), actions[0])
        arm.animation_data.action = rest
        scene.frame_set(int(rest.frame_range[0]))
    else:
        rest = None
    # face the camera (-Y), then scale to --units and stand the feet on the origin
    turn = {"-Y": 0.0, "+X": -90.0, "+Y": 180.0, "-X": 90.0}[a.front]
    root.rotation_euler = (0, 0, math.radians(turn))
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    s = a.units / max(hi.z - lo.z, 1e-6)
    root.scale = (s, s, s)
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    centre = (lo + hi) / 2
    root.location = (-centre.x, -centre.y, -lo.z)
    src_fps = scene.render.fps  # the clips' keys are at the import's frame rate
    camera_and_lights(a)
    render_settings(a)
    out = os.path.abspath(a.out)
    wanted = [c for c in a.clips.split(",") if c]
    info = {"glb": os.path.abspath(a.glb), "units": a.units, "canvas": a.canvas, "down": a.down, "fps": a.fps,
            "facings": {}, "clips": {}}
    base_loc = root.location.copy()
    ranges = {k: tuple(map(float, v.split("-"))) for k, v in (r.split(":", 1) for r in a.range.split(",") if r)}
    pin = arm.pose.bones.get(a.pin) if (arm is not None and a.pin) else None

    def pin_bone(place):
        """Move the root so the pinned bone stays over `place` (world x, y) all clip long, as the game centres the hips."""
        if pin is None:
            return
        bpy.context.view_layer.update()
        head = arm.matrix_world @ pin.head
        root.location.x += place[0] - head.x; root.location.y += place[1] - head.y
    for facing in a.facings.split(","):
        # turn about the model's own centre (the origin, after placing): rotate the root, keep the feet on the origin
        yaw = math.radians(turn + FACING_YAW[facing])
        root.rotation_euler = (0, 0, yaw)
        r = math.radians(FACING_YAW[facing])
        root.location = (base_loc.x * math.cos(r) - base_loc.y * math.sin(r),
                         base_loc.x * math.sin(r) + base_loc.y * math.cos(r), base_loc.z)
        pinned = (0.0, 0.0)
        if pin is not None:  # where the rest pose holds it, in this facing
            arm.animation_data.action = rest
            scene.frame_set(int(rest.frame_range[0]))
            bpy.context.view_layer.update()
            pinned = tuple((arm.matrix_world @ pin.head)[:2])
        if a.still or not actions or arm is None:
            render_pair(os.path.join(out, facing, "still", "f0000.png"))
            info["clips"]["still"] = {"frames": 1, "ms": 1000}
            continue
        for act in actions:
            if wanted and not any(w in act.name for w in wanted):
                continue
            arm.animation_data.action = act
            f0, f1 = next((v for k, v in ranges.items() if k in act.name), act.frame_range)
            n = min(a.max_frames, max(1, int(f1 - f0)))
            home = (root.location.x, root.location.y)
            for i in range(n):
                scene.frame_set(int(round(f0 + (f1 - f0) * i / n)))
                root.location.x, root.location.y = home
                pin_bone(pinned)
                render_pair(os.path.join(out, facing, act.name.split(":")[-1], f"f{i:04d}.png"))
            info["clips"][act.name.split(":")[-1]] = {"frames": n, "ms": int(round(1000 * (f1 - f0) / src_fps / n))}
            print("rendered", facing, act.name, n)
    info["facings"] = a.facings.split(",")
    with open(os.path.join(out, "clips.json"), "w", encoding="utf-8") as f:
        json.dump(info, f, indent=1)
    print("done", out)


main()
