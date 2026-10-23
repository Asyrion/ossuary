/* The second Twin Guardian (a Tripo model; docs/creatures.md, The Twin Guardians): the greyer guardian with the forked
   beard and the crest, which Tripo's biped auto-rig twice failed to rig (its head bone in its chest, its thighs at two
   heights). It was rigged in Blender instead on the first guardian's skeleton (asset-previews/rig/twins2/blender/): the
   first's armature, its joints moved into the second's body and its bones' rest rotations kept, bound with Blender's
   automatic weights. Its skeleton is the first's, so it plays the first's clips from the first's Tripo presets (read by
   bone name): `idle`, `walk`, `slam`, `statue`, `guard`, `rear` and `hit` (tools/creatures/twins.ts). Its skin is the one
   Blender bound (`SKIN = null`, kept). Read with `npm run animate-creature -- --bones --face=-90`. */
export { face, LEGS, SKIN, MOVING, CLIPS, WALK_SPEED, prepare } from './twins';
