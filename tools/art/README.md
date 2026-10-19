# tools/art

The art tools of R3 (`docs/art-bible.md`), ported from Godot-Tamer (`Asyrion/Godot-Tamer`: `tools/bake/` and
`tools/pipeline/pixel.py`) for the proof of R3 step 2, and the ones the proof added. Python 3 with Pillow and numpy;
Blender 5.2 for the bake; the dev server (`npm run dev`) for the TypeScript ones. Outputs go to `asset-previews/`
(ignored); only picks and comparisons are committed, under `docs/art/`.

The proof chose **route A** (2026-10-15): actors stay models drawn at the texel, rooms stay the code-drawn kit, both in
their floor's ramps (art bible 4.8). `render_glb.py` (route B's bake) goes in the step that builds route A in the game.

| Tool | What it does |
| --- | --- |
| `render_glb.py` | Route B. Blender, headless: a GLB's clips as PNG frames from the game's camera (orthographic, 45 degrees, 48 game pixels a unit), four facings (S, E, N, W), the art bible's light (cool ambient, key from above left, rim). Each frame also unlit (`_flat.png`). |
| `route-a.html`, `route-a.ts` | Route A. The same GLB, camera, light and facings drawn by three.js in real time at the game pixel, written in `render_glb.py`'s layout. |
| `pixelize.py` | Frames to pixel art: colour families clustered from the unlit texture, a hue-shifted ramp each from the floor's palette (4.2), the step from how lit a pixel is, a closed one-pixel outline (4.4). `--smooth 0` for route A (a shader maps each pixel alone); `--centres-from` shares one subject's families between the routes; `--recolour` builds the ramps round chosen colours. Writes the palette made and a report (colours, hues, outline check). |
| `palettes.json`, `oklab.py` | The floors' ramps (art bible 4.1) and the OKLab maths. |
| `pixel.py` | Generator images: the drawn pixel grid (`detect_pitch`, `resample`), the magenta key, quantising, `downscale_ink` (shrinks pixel art and keeps dark lines), Scale2x. |
| `room-shot.ts` | A room of the game alone (no HUD, no mage) at a fixed seed, with where its floor lies on screen. |
| `room.py` | A room at the game pixel: `code` recolours the kit's shot to floor 1's ramp, `tiles` cuts generator tiles to the tile's pixels, `compose` builds a 13 x 7 room from them lit in steps, `stand` puts sprites in, `measure` takes the art bible's measures on the walkable floor (4.3). |
| `compare.py`, `sheet.py`, `compose_gif.py` | Route A beside route B at play size and enlarged; a review sheet of a clip; a clip as a GIF in a room. |
| `remesh.py`, `bake.py`, `turn.py`, `look4.py` | A Tripo model (some 2 million triangles) made into a prop: `remesh.py` a closed voxel hull collapsed to the budget (no holes, nothing inside out), `bake.py` the original's colour baked onto it (new UVs; bake at 2048 px, or the many small islands come out black), `turn.py` its face to the camera, `look4.py` four views from the game's camera. Blender's `bpy` module (`pip install bpy==5.2.2`, Python 3.13; Cycles on the CPU, no display needed): run them with its Python, e.g. `python tools/art/remesh.py in.glb low.glb 2000 120`. |
| `darken.ts` | A pale model's textures darker and a little more contrasted before `prepare-asset` (pale stone and bone wash out under the game's camera): `npx tsx tools/art/darken.ts in.glb out.glb 0.7`. |
| `tripo_get.py` | Downloads a Tripo image task's pictures (the CLI's "no image URLs" bug). |

## The proof's commands (2026-10-15)

```
# route B: bake, then pixelize (the mage's run pushes the hips forward: --pin holds them over the rest pose)
blender -b -P tools/art/render_glb.py -- --glb public/assets/hero_default.glb --out asset-previews/r3-proof/render/mage --units 1.3 --margin 16 --rest-clip standing_relax --clips run,standing_relax --range standing_relax:0-96 --max-frames 8 --pin mixamorig:Hips
python tools/art/pixelize.py asset-previews/r3-proof/render/mage --out asset-previews/r3-proof/sprites/B/mage --families 10

# route A: the same in three.js (paths from the server's root), then pixelize per pixel with route B's families
npx tsx tools/art/route-a.ts --glb assets/hero_default.glb --out asset-previews/r3-proof/renderA/mage --units 1.3 --margin 16 --pin mixamorig:Hips --rest standing_relax --clips run,standing_relax --range standing_relax:0-4 --frames 8
python tools/art/pixelize.py asset-previews/r3-proof/renderA/mage --out asset-previews/r3-proof/sprites/A/mage --smooth 0 --centres-from asset-previews/r3-proof/sprites/B/mage/palette.json

# the other subjects: the Warden (--units 1.45 --canvas 160 --margin 44, recoloured), the Gloom Weaver (--front +X --units 1.0 --margin 30, --glow 0.38)

# the room
npx tsx tools/art/room-shot.ts chapel_nave asset-previews/r3-proof/room/code
python tools/art/room.py code asset-previews/r3-proof/room/code/chapel_nave.png asset-previews/r3-proof/room/code/chapel_nave.json --out asset-previews/r3-proof/room/room_code.png
python tools/art/room.py measure asset-previews/r3-proof/room/room_code.png
```

Run the Python tools from the repository root or from `tools/art/` (they import each other). From Git Bash, a path
starting with `/` given to `route-a.ts` becomes a Windows path: give it without the slash.
