/* Fen-Nex in its full shape (a Tripo model; docs/creatures.md): the familiar's stage 3, a long white beast between fox,
   cat and dragon, dark blue horns, flame-tipped feathers on its shoulders and tail, dark blue plated legs with red spirals,
   a flame at its tail's tip. Tripo's quadruped rig (`walk.glb`), facing +z already; in that frame its back stands about
   0.44 high, the hind legs hanging from the rump (`Spine_0` by bone_27, z -0.11), the forelegs from the neck's base
   (`0_Left_Limb_0`, as Tripo named it, z 0.21) with the shoulder feathers (bone_25 left, bone_26 right); the neck bone_9,
   `Head_0`, `Head_1` leads to the skull (`Head_2`, which carries the ears and horns), the tail bone_2, `Tail_0`, `Tail_1`.
   Its forelegs have four bones (shoulder, elbow, wrist, paw), its hind legs four (hip, stifle, hock, paw). No jaw bone.
   The skin kept (`SKIN = null`). Its clips are the Rune Fox's recipe (fennex.ts) with a longer stride and its breath. */
import type { SkinBone } from '../creatureRig';
import { foxClips, type FoxBones } from './fennex';

export const face = 0;

const BONES: FoxBones = {
  root: 'tripo::Root',
  pelvis: 'tripo::Spine_0',
  chest: 'tripo::Spine_3',
  neck: ['bone_9', 'tripo::Head_0', 'tripo::Head_1'],
  head: 'tripo::Head_2',
  tail: ['bone_2', 'tripo::Tail_0', 'tripo::Tail_1'],
  wings: ['bone_25', 'bone_26'],
  legs: {
    frontLeft: {
      root: 'tripo::0_Left_Limb_1',
      mid: 'tripo::0_Left_Limb_2',
      end: 'tripo::0_Left_Limb_3',
      paw: ['tripo::0_Left_Limb_3'],
      toes: ['tripo::0_Left_Limb_4'],
    },
    frontRight: { root: 'bone_21', mid: 'bone_22', end: 'bone_23', paw: ['bone_23'], toes: ['bone_24'] },
    rearLeft: {
      root: 'tripo::1_Left_Limb_0',
      mid: 'tripo::1_Left_Limb_1',
      end: 'tripo::1_Left_Limb_2',
      paw: ['tripo::1_Left_Limb_2'],
      toes: ['tripo::1_Left_Limb_3'],
    },
    rearRight: {
      // (Tripo named the right hind leg's bones `0_Right`, as if a foreleg's)
      root: 'tripo::0_Right_Limb_0',
      mid: 'tripo::0_Right_Limb_1',
      end: 'tripo::0_Right_Limb_2',
      paw: ['tripo::0_Right_Limb_2'],
      toes: ['tripo::0_Right_Limb_3'],
    },
  },
};
export const LEGS = BONES.legs;
export const SKIN: SkinBone[] | null = null;
export const MOVING = [BONES.root];
export const { CLIPS, WALK_SPEED } = foxClips(
  BONES,
  {
    trot: { cycle: 0.38, stance: 0.42, stride: 0.32, lift: 0.06 },
    run: { cycle: 0.32, stance: 0.3, stride: 0.4, lift: 0.08 },
  },
  true,
);
