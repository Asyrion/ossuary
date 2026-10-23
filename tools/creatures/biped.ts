/* What the recipes of Tripo's biped bosses share (tools/creatures/pyre.ts, twins.ts): Tripo's humanoid rig of its own
   (`BoneRoot`, `Hip`, `Pelvis`, `L_Thigh` to `R_ToeBase`, `Waist`, `Spine01`, `Spine02`, `Head`, the arms from the
   clavicles to the fingers, twist bones that carry no skin), set facing +x (turned with `face = -90`), its skin kept,
   and four preset animations fetched for the same rig (`idle`, `walk`, `slash`, `hurt`: asset-previews/rig/<id>/). The
   clips are cut from the presets where they read (a window of the slash, the walk replayed in place) and posed in code on
   top of them where they don't. */
import type { LegDef, Rig, SkinBone } from '../creatureRig';
import { preset, type Preset, type PresetUse } from './moves';

export const face = -90;
export const TOP = 'BoneRoot',
  HIPS = 'Hip',
  WAIST = 'Waist',
  SPINE1 = 'Spine01',
  SPINE2 = 'Spine02',
  NECK = 'NeckTwist01',
  HEAD = 'Head';

/** Its legs for the IK: thigh, calf and foot, the foot kept as it lay, the toes too. */
export const LEGS: Record<string, LegDef> = {
  left: { root: 'L_Thigh', mid: 'L_Calf', end: 'L_Foot', paw: ['L_Foot'], toes: ['L_ToeBase'] },
  right: { root: 'R_Thigh', mid: 'R_Calf', end: 'R_Foot', paw: ['R_Foot'], toes: ['R_ToeBase'] },
};
/** Tripo's own weights, kept: its biped rig bound the skin to the limbs cleanly. */
export const SKIN: SkinBone[] | null = null;
export const MOVING = [TOP, HIPS];

/** The four presets of `id`, read once. */
export async function presets(id: string) {
  const dir = `asset-previews/rig/${id}`;
  const [idle, walk, slash, hurt] = await Promise.all(
    ['idle', 'walk', 'slash', 'hurt'].map((n) => preset(`${dir}/${n}.glb`)),
  );
  return { idle, walk, slash, hurt };
}
/** A preset replayed on the turned rig, `t` seconds in; a walk (`inPlace`) without its travel, which the game makes. */
export const play = (rig: Rig, p: Preset, t: number, o: PresetUse = {}) =>
  p.sample(rig, t, { face, top: TOP, hips: HIPS, ...o });

/** Its feet planted where they stand now, while the body is moved or bent above them. */
export function plant(rig: Rig) {
  const at = Object.fromEntries(Object.keys(LEGS).map((l) => [l, rig.at(LEGS[l].end)]));
  return () => {
    rig.update();
    for (const [leg, p] of Object.entries(at)) {
      const d = p.clone().sub(rig.foot(leg));
      rig.place(leg, [d.x, d.y, d.z]);
    }
  };
}

/** Its hips turned back to face ahead (a preset that swings it round, as the guardian's slash does, kept facing the
    mage): the line across its thighs laid back along its left-right. */
export function square(rig: Rig) {
  rig.update();
  const across = rig.at(LEGS.left.root).sub(rig.at(LEGS.right.root));
  rig.turn(HIPS, [0, 1, 0], (Math.atan2(across.z, across.x) * 180) / Math.PI);
  rig.update();
}
