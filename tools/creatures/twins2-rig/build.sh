#!/bin/bash
# The second Twin Guardian rigged on the first's skeleton in Blender (docs/creatures.md, The Twin Guardians): the
# joints fitted (dumpjoints.py, fitjoints.py), the mesh bound (rig2.py, mask.py), the GLB assembled (assemble.ts), its
# clips baked by the recipe (npm run animate-creature -- twins2), and with --check frames of its clips beside the first's.
#
#   tools/creatures/twins2-rig/build.sh [--check] [twins walk.glb] [twins2 rig.glb] [work dir]
#
# Inputs (Tripo's, not in the repo: docs/creatures.md, Rebuilding a creature) default to asset-previews/rig/twins/walk.glb
# (the first guardian rigged, with Tripo's walk: its armature and skin) and asset-previews/rig/twins2/rig.glb (the second's
# mesh); what it makes goes in the work dir (default asset-previews/rig/twins2/blender/: joints.json, bound.glb,
# rigged.glb, and the check's frames), then public/assets/creatures/twins2.glb. Blender 5.2: $BLENDER, else its default
# Windows path. Runs from anywhere; paths are taken from the repo's root.
set -e
check=0
if [ "$1" = "--check" ]; then
  check=1
  shift
fi
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../../.." && pwd)
cd "$root"
arm=${1:-asset-previews/rig/twins/walk.glb}
mesh=${2:-asset-previews/rig/twins2/rig.glb}
work=${3:-asset-previews/rig/twins2/blender}
B=${BLENDER:-"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"}
for f in "$arm" "$mesh"; do
  [ -s "$f" ] || { echo "missing $f: fetch it from Tripo (docs/creatures.md, Rebuilding a creature)" >&2; exit 1; }
done
mkdir -p "$work"
blend() { "$B" -b --factory-startup -P "$here/$1" -- "${@:2}" 2>&1; }
blend dumpjoints.py "$arm" "$work/joints.json" | grep -iE "^Error|Trace" -A3 || true
blend rig2.py "$arm" "$mesh" "$work/joints.json" "$work/bound.glb" | grep -iE "^Error|Trace|HEAT|MASK|CUT" -A2
npx tsx "$here/assemble.ts" "$arm" "$work/bound.glb" "$work/joints.json" "$work/rigged.glb"
npm run animate-creature -- twins2 "$work/rigged.glb" 2>&1 | tail -2
[ $check = 1 ] || exit 0
# the check: each clip's frames, front and side, the second guardian's (cl2) over the first's (cl1), in sheets
spec="statue:0;walk:0,0.25,0.5,0.75;slam:0,0.3,0.5,0.7,1;guard:1;rear:1;hit:0.1"
for n in 1 2; do
  id=twins; [ $n = 2 ] && id=twins2
  rm -rf "$work/cl$n"
  blend clips.py public/assets/creatures/$id.glb "$work/cl$n" "$spec" | grep -E "^Error|Trace" -A2 || true
done
sheet() {
  local out=$1 cols=$2 F=""
  shift 2
  for d in cl2 cl1; do for v in front side; do for x in "$@"; do F="$F $work/$d/${x}_$v.png"; done; done; done
  python "$here/sheet.py" "$work/$out" "$cols" $F
}
sheet slam_cmp.png 5 slam_0 slam_1 slam_2 slam_3 slam_4
sheet walk_cmp.png 5 statue_0 walk_0 walk_1 walk_2 walk_3
sheet misc_cmp.png 3 guard_0 rear_0 hit_0
echo "frames: $work/{slam,walk,misc}_cmp.png"
