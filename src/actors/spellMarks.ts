/* Spell marks (M4.11, docs/archive/M4.11-plan.md; GDD: Spells, Spell marks): the mage's spells and what they know, shown on them.
   The rules are magic/marksData.ts; this is the look, moved each step (`updateSpellMarks`, from heroVisual).

   - A spell in hand: each slot's spell as a small light in its school's colour at a hand (Q at the casting hand, E at the
     off hand), with its school's motion (embers rise, rime falls, sparks crackle, motes drift up, shadow sinks). Ready it is
     full; cooling down it is faint and fills back, flashing when ready again; short of mana it greys and flickers.
   - A master's ring: a rune ring turning round the wrist of a spell whose whole school the mage knows well.
   - Attunement: both slots of one school, and its light all about the mage (a line the first time in a run).
   - The knowledge circle: standing still a moment, a rune circle round the feet, an arc per school and a rune for each
     spell known well (kept between runs), a school known in full closing its arc.
   All of it in world space (the scene, not the model), so the motes trail as the mage moves. */
import * as THREE from 'three';
import { G, after, player } from '../state';
import { CFG } from '../config';
import { STR } from '../strings';
import { scene } from '../render/renderer';
import { SCHOOL_LIGHT, rune } from '../render/arcane';
import { makeMotes } from '../render/fire';
import { disposeTree, glow, glowShared, mergeStill } from '../render/materials';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { line } from '../notify';
import { ringFx, strikeFx } from '../magic/spellFx';
import { SPELL_DEFS, type School } from '../magic/spellData';
import { payment, slotDef, spellCooldown, spellCost } from '../magic/cost';
import { knowledgeVersion, stage } from '../magic/memory';
import { attunedTo, circleOf, handState, masteredSchools, type CircleArc, type HandState } from '../magic/marksData';
import { castSide, offSide } from './costumeFit';
import { handAt } from './costume';
import { rune as runeDef } from '../magic/runeData';

const M = CFG.marks;
interface Hand {
  id: string;
  school: School;
  root: THREE.Group;
  glow: THREE.Sprite;
  motes: THREE.Object3D;
  ring: THREE.Group;
  was: HandState['state'];
  pulse: number;
  spark: number;
  /** M6 step 7: the runes it was built with (the socket's array: a new one on every change), their specks, and their spin. */ runes: readonly string[];
  specks: THREE.Mesh[];
  spin: number;
}
const hands: (Hand | null)[] = [null, null];
let aura: { school: School; root: THREE.Group } | null = null;
let circle: { key: string; root: THREE.Group; mats: THREE.MeshBasicMaterial[]; arcs: CircleArc[] } | null = null;
let circleFade = 0;
const v = new THREE.Vector3(),
  grey = new THREE.Color(0x8a8a8a),
  blood = new THREE.Color(0xd02020),
  veined = new THREE.Color();

/** The motes of a school's motion over (or under) a spot: how far they travel and which way. */
const motes = (
  school: School,
  specs: { x: number; y: number; z: number; h: number; w: number }[],
  n: number,
  speed: number,
) => makeMotes(specs, SCHOOL_LIGHT[school], n, M.rise[school], speed);

const R = M.runes;
function buildHand(id: string, school: School, runes: readonly string[]): Hand {
  const root = new THREE.Group(),
    color = SCHOOL_LIGHT[school];
  const g = glow(color, M.hand.size, M.hand.ready);
  root.add(g);
  const m = motes(school, [{ x: 0, y: 0, z: 0, h: 0.05, w: 0.07 }], M.hand.motes, 1.2);
  root.add(m);
  const ring = new THREE.Group(),
    turn = new THREE.Group();
  ring.add(turn); // (the master's ring: thin, with runes round it)
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  turn.add(new THREE.Mesh(new THREE.TorusGeometry(M.ring.radius, 0.005, 3, 24), mat));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    rune(turn, color, [Math.cos(a) * M.ring.radius, Math.sin(a) * M.ring.radius, 0], 0.035, [0, 0, a], mat);
  }
  mergeStill(turn);
  ring.rotation.x = Math.PI / 2;
  root.add(ring);
  // M6 step 7: a speck for each rune (Thrice three, fanned), and Wide's faint disc under the hand
  const specks: THREE.Mesh[] = [];
  runes.forEach((rid, i) => {
    const mat = new THREE.MeshBasicMaterial({
      color: runeDef(rid as never).color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let k = 0; k < (rid === 'thrice' ? 3 : 1); k++) {
      const sp = new THREE.Mesh(new THREE.OctahedronGeometry(R.size / 2, 0), mat);
      sp.userData = {
        a: (i / runes.length) * Math.PI * 2 + (rid === 'thrice' ? (k - 1) * 0.45 : 0),
        r: rid === 'seeking' ? R.seek : R.r,
      };
      specks.push(sp);
      root.add(sp);
    }
    if (rid === 'wide') {
      const disc = new THREE.Mesh(
        new THREE.RingGeometry(R.disc * 0.8, R.disc, 20),
        new THREE.MeshBasicMaterial({
          color: runeDef('wide').color,
          transparent: true,
          opacity: R.discOpacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = -0.05;
      root.add(disc);
    }
  });
  scene.add(root);
  return { id, school, root, glow: g, motes: m, ring, was: 'ready', pulse: 0, spark: 0, runes, specks, spin: 0 };
}
function dropHand(h: Hand | null) {
  if (h) {
    scene.remove(h.root);
    disposeTree(h.root);
  }
  return null;
}

function buildAura(school: School) {
  const root = new THREE.Group(),
    up = M.rise[school] > 0,
    n = M.aura.motes,
    r = M.aura.radius;
  root.add(
    motes(
      school,
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return { x: Math.cos(a) * r, y: up ? 0.1 : 1.15, z: Math.sin(a) * r, h: 0.1, w: 0.12 };
      }),
      n,
      0.7,
    ),
  );
  const g = glowShared(SCHOOL_LIGHT[school], M.aura.glow, 0.2);
  g.position.y = 0.6;
  root.add(g);
  scene.add(root);
  return { school, root };
}

/** The knowledge circle, built from what is known: an arc per school (bright and closed when known in full), a rune for
    each spell known well and a faint tick for each still to know. Baked into one mesh, its colours in its vertices (one
    draw call, one material to fade). */
function buildCircle(arcs: CircleArc[], key: string) {
  const draft = new THREE.Group(),
    R = M.circle.radius,
    span = (Math.PI * 2) / arcs.length,
    gap = M.circle.gap;
  const ink = (color: number, k: number) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });
    return m;
  };
  arcs.forEach((a, i) => {
    const color = SCHOOL_LIGHT[a.school],
      bright = ink(color, 0.9),
      faint = ink(color, 0.25),
      from = i * span + gap,
      w = a.mastered ? 0.016 : 0.006;
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(R - w, R + w, 20, 1, from, span - gap * 2),
      a.mastered ? bright : faint,
    );
    arc.rotation.x = -Math.PI / 2;
    draft.add(arc);
    a.spells.forEach((s, k) => {
      const t = from + ((k + 1) / (a.spells.length + 1)) * (span - gap * 2),
        x = Math.cos(t) * (R + M.circle.out),
        z = -Math.sin(t) * (R + M.circle.out);
      if (s.known) rune(draft, color, [x, 0.01, z], M.circle.rune, [-Math.PI / 2, 0, t - Math.PI / 2], bright);
      else {
        const tick = new THREE.Mesh(new THREE.CircleGeometry(0.012, 6), faint);
        tick.rotation.x = -Math.PI / 2;
        tick.position.set(x, 0.01, z);
        draft.add(tick);
      }
    });
  });
  draft.updateMatrixWorld(true);
  const geos: THREE.BufferGeometry[] = [],
    mats = new Set<THREE.Material>();
  draft.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
    const c = (m.material as THREE.MeshBasicMaterial).color,
      n = g.attributes.position.count,
      col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g);
    mats.add(m.material as THREE.Material);
  });
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const root = new THREE.Group();
  root.add(new THREE.Mesh(mergeGeometries(geos), mat));
  for (const g of geos) g.dispose();
  disposeTree(draft);
  for (const m of mats) m.dispose();
  root.visible = false;
  scene.add(root);
  return { key, root, mats: [mat], arcs };
}

/** What the mage knows now, as the circle's arcs and a key that changes when it does; worked out again only when what is
    known changes (`knowledgeVersion`). */
let known: { version: number; arcs: CircleArc[]; key: string } | null = null;
function knowledge() {
  if (known?.version !== knowledgeVersion()) {
    const arcs = circleOf(SPELL_DEFS, stage);
    known = {
      version: knowledgeVersion(),
      arcs,
      key: arcs.map((a) => a.spells.map((s) => +s.known).join('')).join('|'),
    };
  }
  return known;
}
/** A mark's line, the first time it shows in a run. */
const firstTime = (what: string, text: string) => {
  const k = 'marks:' + what;
  if (!G.run.hinted.has(k)) {
    G.run.hinted.add(k);
    line(text, M.line);
  }
};

/** Each step: the marks follow the mage and show what their spells and knowledge are. */
export function updateSpellMarks(dt: number) {
  const now = G.simClock,
    { arcs, key } = knowledge(),
    mastered = masteredSchools(arcs),
    off = player.dead;
  // the spells in hand
  for (const slot of [0, 1]) {
    const id = player.spells[slot],
      def = slotDef(slot),
      runes = player.sockets[slot]?.runes ?? []; // (M6: as its runes make it)
    if (hands[slot] && (!def || hands[slot].id !== id || hands[slot].runes !== runes))
      hands[slot] = dropHand(hands[slot]); // (built again when its runes change)
    if (!def || off) {
      if (hands[slot]) hands[slot].root.visible = false;
      continue;
    }
    const h = (hands[slot] ??= buildHand(def.id, def.school, runes));
    if (!handAt(slot === 0 ? castSide() : offSide(), v)) {
      h.root.visible = false;
      continue;
    }
    h.root.visible = true;
    h.root.position.copy(v);
    h.root.position.y += M.hand.lift;
    firstTime('hands', STR.marks.hands);
    const cost = spellCost(def),
      st = handState(
        player.spellCd[slot],
        spellCooldown(def),
        payment(slot) !== null,
        cost > 0 ? player.mana / cost : 1,
      );
    if (st.state === 'ready' && h.was !== 'ready') {
      h.pulse = 1;
      ringFx(v.x, v.y + M.hand.lift, v.z, SCHOOL_LIGHT[h.school], 0.03, M.hand.flash, 0.3); // (ready again: a flash)
      if (runes.includes('reprise')) {
        const at = h.root.position.clone(),
          c = SCHOOL_LIGHT[h.school];
        after(R.echo, () => ringFx(at.x, at.y, at.z, c, 0.02, M.hand.flash * 0.75, 0.3));
      } // (M6: Reprise's second, fainter)
    }
    h.was = st.state;
    h.pulse = Math.max(0, h.pulse - dt * M.hand.pulse * (runes.includes('lasting') ? R.lasting : 1)); // (M6: Lasting's slower fade)
    const mat = h.glow.material,
      color = runes.includes('vein')
        ? veined.set(SCHOOL_LIGHT[h.school]).lerp(blood, R.vein).getHex()
        : SCHOOL_LIGHT[h.school]; // (M6: Vein's red)
    h.spin += dt * R.spin * (runes.includes('quicken') ? R.quick : 1);
    for (const sp of h.specks) {
      const u = sp.userData as { a: number; r: number },
        a = u.a + h.spin,
        r = u.r * (u.r === R.seek ? 1 + Math.sin(now * 3 + u.a) * 0.25 : 1);
      sp.position.set(Math.cos(a) * r, 0.01 + Math.sin(a * 2) * 0.015, Math.sin(a) * r);
    }
    if (st.state === 'ready') {
      mat.color.set(color);
      mat.opacity = M.hand.ready + Math.sin(now * M.hand.shimmer + slot) * M.hand.shimmerBy;
    } else if (st.state === 'cooling') {
      mat.color.set(color);
      mat.opacity = M.hand.dim + (M.hand.ready - M.hand.dim) * st.fill * M.hand.cooling;
    } else {
      mat.color.set(color).lerp(grey, M.hand.grey);
      mat.opacity = M.hand.dim * (0.6 + 0.4 * Math.abs(Math.sin(now * M.hand.flicker)));
    }
    h.glow.scale.setScalar(M.hand.size * (st.state === 'ready' ? 1 : 0.7 + 0.3 * st.fill) * (1 + h.pulse * 0.8));
    h.motes.visible = st.state === 'ready';
    if (h.school === 'storm' && st.state === 'ready' && (h.spark -= dt) <= 0) {
      // (sparks crackling between the fingers)
      h.spark = M.hand.spark * (0.6 + Math.random() * 0.8);
      const a = Math.random() * Math.PI * 2,
        p = h.root.position;
      strikeFx(
        { x: p.x + Math.cos(a) * 0.07, y: p.y + 0.05, z: p.z + Math.sin(a) * 0.07 },
        { x: p.x - Math.cos(a) * 0.06, y: p.y - 0.03, z: p.z - Math.sin(a) * 0.06 },
        color,
        0.08,
        true,
      );
    }
    h.ring.visible = mastered.includes(h.school);
    h.ring.rotation.z += dt * M.ring.spin;
  }
  // attunement: both slots of one school
  const tuned = off ? null : attunedTo(hands.map((h) => (h?.root.visible ? h.school : null)));
  if (aura && aura.school !== tuned) {
    scene.remove(aura.root);
    disposeTree(aura.root);
    aura = null;
  }
  if (tuned) {
    aura ??= buildAura(tuned);
    aura.root.position.set(player.x, 0, player.z);
    if (!G.run.attuned.includes(tuned)) {
      G.run.attuned.push(tuned);
      line(STR.marks.attuned(STR.schools[tuned]), M.line);
    }
  }
  // the knowledge circle: shown while the mage stands still
  if (circle && circle.key !== key) {
    scene.remove(circle.root);
    disposeTree(circle.root);
    circle = null;
  }
  const want = !off && player.still > M.circle.after && arcs.some((a) => a.spells.some((s) => s.known));
  circleFade = Math.max(0, Math.min(1, circleFade + (want ? dt / M.circle.fadeIn : -dt / M.circle.fadeOut)));
  if (circleFade > 0) {
    firstTime('circle', STR.marks.circle);
    circle ??= buildCircle(arcs, key);
    circle.root.visible = true;
    circle.root.position.set(player.x, 0.02, player.z);
    circle.root.rotation.y += dt * M.circle.spin;
    for (const m of circle.mats) m.opacity = circleFade;
  } else if (circle) circle.root.visible = false;
}

/** A spell just came to be known well (from castSpell): if that completes its school, say so (the ring shows from now). */
export function knownWellNow(school: School) {
  if (circleOf(SPELL_DEFS, stage).find((a) => a.school === school)?.mastered)
    line(STR.marks.mastered(STR.schools[school]), M.line);
}

/** What the marks show now (the tests and the dev menu). */
export function marksNow() {
  const { arcs } = knowledge();
  return {
    hands: hands.map((h) =>
      h && h.root.visible
        ? {
            spell: h.id,
            school: h.school,
            state: h.was,
            glow: +h.glow.material.opacity.toFixed(2),
            ring: h.ring.visible,
            specks: h.specks.length,
            tint: '#' + h.glow.material.color.getHexString(),
          }
        : null,
    ),
    attuned: aura?.school ?? null,
    circle: {
      shown: !!circle?.root.visible,
      fade: +circleFade.toFixed(2),
      known: arcs.map((a) => a.spells.filter((s) => s.known).length),
      mastered: masteredSchools(arcs),
    },
  };
}
