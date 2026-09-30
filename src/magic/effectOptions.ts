/* Spell effect options (the owner's request, 2026-09-29): the spells' effects built in code in the same arcane style as
   the enemy options, for the pixel look. Each is a looping demo that plays one cast from start to end over and over
   (a charge, the cast, its flight or its hold, the impact), worked out from the time alone. The owner liked them
   (2026-09-30): the spells now wear these looks (magic/spellFx.ts), and the gallery stays as the style book, with the
   previews of the schools to come (docs/effects.md). Names and notes in STR.effects. */
import * as THREE from 'three';
import type { Room } from '../types';
import { disposeTree, glow } from '../render/materials';
import { freeSpotNear } from '../world/rooms';
import { SCHOOL_LIGHT, box, circle, crystal, lightningBolt, lit, part, rune, runeRing, shine, sphere, std, wave, type School, type V3 } from '../render/arcane';

interface Demo { group: THREE.Group; play: (t: number) => void }
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** How far into the span [a, b) the phase k is (0 before it, 1 after). */
const span = (k: number, a: number, b: number) => clamp01((k - a) / (b - a));
const smooth = (v: number) => v * v * (3 - 2 * v);
const ARCANE = 0xffb060; // the mage's own magic (the cantrip), torch amber

/** The mage's cantrip: a spinning arcane missile trailing runes, bursting on impact. */
function arcaneBolt(): Demo {
  const g = new THREE.Group(), y = .6, missile = new THREE.Group(); g.add(missile);
  crystal(missile, 0xffffff, [0, 0, 0], .24, [0, 0, Math.PI / 2]); part(missile, sphere(.13), shine(ARCANE, .7), [0, 0, 0]);
  runeRing(missile, ARCANE, .17, [0, 0, 0], 4, [Math.PI / 4, 0, 0]);
  const halo = glow(ARCANE, 1, .9); missile.add(halo);
  const trail = [0, 1, 2, 3, 4].map(i => rune(g, ARCANE, [0, y, 0], .15 - i * .02, [Math.PI / 4, 0, 0], shine(ARCANE, .85 - i * .14)));
  const ring = wave(g, ARCANE, [1, y, 0], [0, 0, 0]), ringMat = ring.material as THREE.MeshBasicMaterial;
  const sparks = Array.from({ length: 7 }, () => part(g, new THREE.OctahedronGeometry(.03), lit(0xfff0c0), [1, y, 0]));
  return { group: g, play: t => {
    const k = t % 1.2 / 1.2, fly = span(k, 0, .5), hit = span(k, .5, .8), x = -1.1 + fly * 2.1;
    missile.visible = k < .5; missile.position.set(x, y + Math.sin(fly * 9) * .03, 0); missile.rotation.x = t * 14;
    trail.forEach((r, i) => { r.visible = k < .5 && fly > i * .05; r.position.set(x - (i + 1) * .16, y, 0); r.rotation.z = t * 6 + i; });
    ring.visible = hit > 0 && hit < 1; ring.scale.setScalar(.05 + hit * .4); ringMat.opacity = .9 * (1 - hit);
    sparks.forEach((s, i) => { const a = i / 7 * Math.PI * 2; s.visible = ring.visible; s.position.set(1 + Math.cos(a) * hit * .5, y + Math.sin(a) * hit * .5 - hit * hit * .2, 0); });
    halo.material.opacity = .7 + Math.sin(t * 30) * .2;
  } };
}

/** Ember, Cinder Lance: runes gather, then a white-hot beam through three turning rune rings, embers spiralling round it. */
function cinderLance(): Demo {
  const E = SCHOOL_LIGHT.ember, g = new THREE.Group(), y = .6, x0 = -1.1, len = 2.3;
  const gather = runeRing(g, E, .3, [x0, y, 0], 6, [Math.PI / 4, 0, 0]); // (facing the camera, which looks down at 45°)
  const beam = new THREE.Group(); beam.position.set(x0, y, 0); g.add(beam);
  const coreMat = lit(0xfff4d0, 1), sheathMat = shine(E, .7), outerMat = shine(0xffc060, .25);
  part(beam, box(len, .05, .05), coreMat, [len / 2, 0, 0]);
  part(beam, new THREE.CylinderGeometry(.1, .1, len, 10, 1, true), sheathMat, [len / 2, 0, 0], { rot: [0, 0, Math.PI / 2] });
  part(beam, new THREE.CylinderGeometry(.2, .2, len, 10, 1, true), outerMat, [len / 2, 0, 0], { rot: [0, 0, Math.PI / 2] });
  const rings = [.55, 1.25, 1.95].map(x => { const hold = new THREE.Group(); hold.position.x = x; hold.rotation.set(Math.PI / 4, .6, 0); beam.add(hold); return runeRing(hold, E, .26, [0, 0, 0], 5); });
  const embers = Array.from({ length: 10 }, () => part(beam, new THREE.OctahedronGeometry(.025), lit(0xffc060), [0, 0, 0]));
  const tip = glow(E, 1, .9); beam.add(tip); tip.position.x = len;
  return { group: g, play: t => {
    const k = t % 1.8 / 1.8, charge = span(k, 0, .25), on = span(k, .25, .32), off = span(k, .7, .85), lit01 = on * (1 - off);
    gather.visible = k < .32; gather.scale.setScalar(1.3 - charge * .8); gather.rotation.y = t * 10;
    beam.visible = lit01 > 0; beam.scale.set(1, .4 + lit01 * .6, .4 + lit01 * .6);
    coreMat.opacity = lit01; coreMat.transparent = true; sheathMat.opacity = .7 * lit01; outerMat.opacity = .25 * lit01;
    rings.forEach((r, i) => { r.rotation.y = t * (4 + i); });
    embers.forEach((e, i) => { const u = (i / 10 + t * 1.4) % 1, a = u * 18 + i; e.position.set(u * len, Math.cos(a) * .17, Math.sin(a) * .17); });
    tip.material.opacity = .9 * lit01;
  } };
}

/** Ember, Pyre Seal: a burning circle drawn on the floor, a star turning inside it, then a crown of flame and a pillar. */
function pyreSeal(): Demo {
  const E = SCHOOL_LIGHT.ember, g = new THREE.Group(), circleMat = shine(E, .6);
  const seal = circle(g, E, .85, circleMat), ring = runeRing(g, E, .95, [0, .03, 0], 8);
  const star = new THREE.Group(); star.position.y = .02; g.add(star);
  for (const off of [0, Math.PI]) for (let i = 0; i < 3; i++) { const a = off + i / 3 * Math.PI * 2, b = a + Math.PI * 2 / 3, r = .6; part(star, box(.02, .004, r * Math.sqrt(3)), circleMat, [(Math.cos(a) + Math.cos(b)) / 2 * r, 0, (Math.sin(a) + Math.sin(b)) / 2 * r], { rot: [0, -((a + b) / 2), 0] }); }
  const flames = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2, f = new THREE.Group(); f.position.set(Math.cos(a) * .72, 0, Math.sin(a) * .72); g.add(f); part(f, new THREE.ConeGeometry(.1, .5, 6), shine(E, .8), [0, .25, 0]); part(f, new THREE.ConeGeometry(.05, .3, 5), lit(0xffe0a0), [0, .15, 0]); return f; });
  const pillarMat = shine(0xffa040, .5), pillar = part(g, new THREE.CylinderGeometry(.35, .5, 1.8, 12, 1, true), pillarMat, [0, .9, 0]);
  const heat = glow(E, 2, .6); heat.position.y = .6; g.add(heat);
  return { group: g, play: t => {
    const k = t % 2.4 / 2.4, draw = smooth(span(k, 0, .3)), burst = span(k, .35, .5), fade = span(k, .75, .95);
    seal.scale.setScalar(.2 + draw * .8); circleMat.opacity = .6 * draw * (1 - fade); seal.rotation.y = t * .4;
    ring.scale.setScalar(draw); ring.visible = draw > .05 && fade < 1; ring.rotation.y = -t * .6; star.rotation.y = t * .9; star.visible = draw > .3 && fade < 1;
    flames.forEach((f, i) => { const h = burst * (1 - fade) * (.8 + Math.sin(t * 13 + i * 2) * .25); f.scale.set(1, Math.max(.01, h), 1); f.visible = h > .02; });
    pillar.visible = burst > 0 && fade < 1; pillar.scale.set(1 - fade * .5, burst, 1 - fade * .5); pillarMat.opacity = .5 * (1 - fade);
    heat.material.opacity = .6 * burst * (1 - fade);
  } };
}

/** Frost, Rime Shards: a fan of ice crystals with frost trails, bursting into splinters where they land. */
function rimeShards(): Demo {
  const F = SCHOOL_LIGHT.frost, g = new THREE.Group(), y = .55, from = new THREE.Vector3(-1.1, y, 0);
  const shards = [-.45, -.22, 0, .22, .45].map(a => {
    const s = new THREE.Group(); g.add(s); crystal(s, 0xe8f8ff, [0, 0, 0], .34, [0, 0, Math.PI / 2]); s.add(glow(F, .5, .8));
    const trail = part(s, box(.5, .05, .05), shine(F, .7), [-.3, 0, 0]);
    const bits = Array.from({ length: 5 }, () => part(g, new THREE.TetrahedronGeometry(.045), lit(0xe8f8ff), [0, 0, 0]));
    return { s, trail, bits, a };
  });
  const burst = wave(g, F, [1, .02, 0]), burstMat = burst.material as THREE.MeshBasicMaterial;
  return { group: g, play: t => {
    const k = t % 1.4 / 1.4, fly = span(k, 0, .5), shatter = span(k, .5, .8);
    for (const { s, trail, bits, a } of shards) {
      const d = fly * 2.1, x = from.x + Math.cos(a) * d, z = Math.sin(a) * d;
      s.visible = k < .5; s.position.set(x, y, z); s.rotation.y = -a; trail.scale.x = .3 + fly * .9;
      bits.forEach((b, i) => { const ang = i / 5 * Math.PI * 2; b.visible = shatter > 0 && shatter < 1; b.position.set(from.x + Math.cos(a) * 2.1 + Math.cos(ang) * shatter * .3, y + Math.sin(ang) * shatter * .3 - shatter * shatter * .3, Math.sin(a) * 2.1); b.rotation.set(t * 9, t * 7, 0); });
    }
    burst.visible = shatter > 0 && shatter < 1; burst.scale.setScalar(.1 + shatter * .7); burstMat.opacity = .7 * (1 - shatter);
  } };
}

/** Frost, Glacial Wall: a row of ice pillars bursting up out of a frost line, then cracking and sinking. */
function glacialWall(): Demo {
  const F = SCHOOL_LIGHT.frost, g = new THREE.Group(), iceMat = std(0xbfe6ff, { transparent: true, opacity: .82, emissive: 0x1e5a8a, roughness: .2, flatShading: true });
  const lineMat = shine(F, .5); part(g, box(2.1, .004, .12), lineMat, [0, .02, 0]);
  const cols = [-.84, -.42, 0, .42, .84].map((x, i) => {
    const c = new THREE.Group(); c.position.set(x, 0, (i % 2) * .08); g.add(c);
    const h = .75 + (i % 3) * .15;
    part(c, new THREE.CylinderGeometry(.14, .19, h, 6), iceMat, [0, h / 2, 0]); part(c, new THREE.ConeGeometry(.14, .26, 6), iceMat, [0, h + .13, 0]);
    crystal(c, 0xe8f8ff, [0, h * .5, .1], .3);
    return c;
  });
  const mist = Array.from({ length: 6 }, (_, i) => part(g, sphere(.08, 6, 5), shine(F, .25), [(i - 2.5) * .38, .1, .12]));
  return { group: g, play: t => {
    const k = t % 2.6 / 2.6, rise = span(k, 0, .15), sink = span(k, .72, .95);
    cols.forEach((c, i) => { const r = clamp01(rise * 1.6 - i * .12); const over = r < 1 ? r * (1 + Math.sin(r * Math.PI) * .25) : 1; c.scale.set(1, Math.max(.01, over * (1 - sink)), 1); c.visible = over > .01 && sink < 1; c.rotation.z = sink * (i % 2 ? .2 : -.2); });
    lineMat.opacity = .5 * (1 - sink); mist.forEach((m, i) => { m.position.y = .1 + ((t * .3 + i * .17) % 1) * .4; m.visible = k > .05 && k < .95; });
  } };
}

/** Storm, Arc: lightning leaping between three floating sparks, flickering, the sparks crackling. */
function arc(): Demo {
  const S = SCHOOL_LIGHT.storm, g = new THREE.Group(), nodes: V3[] = [[-1.05, .55, .1], [0, .95, -.1], [1.05, .6, .15]];
  const orbs = nodes.map(p => { const o = part(g, sphere(.06, 8, 6), lit(0xffffff), p); o.add(glow(S, .6, .9)); return o; });
  const bolts = [lightningBolt(g, S), lightningBolt(g, S), lightningBolt(g, S, 5, .02)];
  return { group: g, play: t => {
    const f = Math.floor(t * 18), on = f % 5 !== 0;
    bolts[0].set(nodes[0], nodes[1], f, .14, on); bolts[1].set(nodes[1], nodes[2], f + 3, .14, on);
    bolts[2].set(nodes[0], [nodes[0][0] + .3, .1, nodes[0][2]], f + 9, .08, f % 3 === 0);
    orbs.forEach((o, i) => { o.scale.setScalar(.8 + Math.abs(Math.sin(t * 20 + i)) * .5); });
  } };
}

/** Storm, Static Mantle: three rings of lightning turning round the mage, sparks jumping between them. */
function staticMantle(): Demo {
  const S = SCHOOL_LIGHT.storm, g = new THREE.Group(), c: V3 = [0, .65, 0];
  const rings = [[0, 0, 0], [1.1, 0, 0], [0, 0, 1.1]].map(r => part(g, new THREE.TorusGeometry(.48, .015, 4, 36), shine(S, .8), c, { rot: r as V3 }));
  const core = glow(S, 1.4, .45); core.position.set(...c); g.add(core);
  part(g, new THREE.CapsuleGeometry(.14, .45, 4, 8), std(0x3a3a4a), [0, .45, 0]); // (someone to wear it)
  const jumps = [lightningBolt(g, S, 4, .02), lightningBolt(g, S, 4, .02), lightningBolt(g, S, 4, .02)];
  const pt = (a: number, b: number): V3 => [c[0] + Math.cos(a) * Math.cos(b) * .48, c[1] + Math.sin(b) * .48, c[2] + Math.sin(a) * Math.cos(b) * .48];
  return { group: g, play: t => {
    rings[0].rotation.y = t * 2; rings[1].rotation.set(1.1 + t * 1.5, 0, 0); rings[2].rotation.set(0, t * 1.2, 1.1 + t);
    const f = Math.floor(t * 14);
    jumps.forEach((j, i) => { const a = (f * 1.7 + i * 2.1) % 6.28, b = ((f + i) % 5 - 2) * .4; j.set(pt(a, b), pt(a + 1.1, -b), f * 3 + i, .07, (f + i) % 3 !== 0); });
    core.material.opacity = .35 + Math.abs(Math.sin(t * 9)) * .25;
  } };
}

/** Frost and Storm, Shatter: a frozen block charged with sparks bursts into shards and a flash. */
function shatter(): Demo {
  const F = SCHOOL_LIGHT.frost, S = SCHOOL_LIGHT.storm, g = new THREE.Group(), y = .5;
  const block = part(g, box(.5, .6, .5), std(0xbfe6ff, { transparent: true, opacity: .8, emissive: 0x1e5a8a, roughness: .2 }), [0, y, 0]);
  const charge = [lightningBolt(g, S, 4, .02), lightningBolt(g, S, 4, .02)];
  const shards = Array.from({ length: 12 }, (_, i) => ({ m: crystal(g, i % 3 ? 0xe8f8ff : F, [0, y, 0], .18), d: new THREE.Vector3(Math.cos(i * 2.4), .4 + (i % 4) * .25, Math.sin(i * 2.4)).normalize() }));
  const flash = wave(g, 0xffffff, [0, y, .3], [0, 0, 0]), flashMat = flash.material as THREE.MeshBasicMaterial;
  const floorRing = wave(g, 0xcfeeff, [0, .02, 0]), floorMat = floorRing.material as THREE.MeshBasicMaterial;
  return { group: g, play: t => {
    const k = t % 1.8 / 1.8, build = span(k, 0, .4), boom = span(k, .42, .75), f = Math.floor(t * 16);
    block.visible = k < .42; block.rotation.y = build * .3; block.position.x = k > .3 && k < .42 ? Math.sin(t * 90) * .02 : 0;
    charge.forEach((c, i) => c.set([-.3 + i * .6, y + .35, .26], [.3 - i * .6, y - .3, .26], f + i * 5, .06, k > .15 && k < .42 && (f + i) % 2 === 0));
    shards.forEach(({ m, d }) => { m.visible = boom > 0 && boom < 1; m.position.set(d.x * boom * 1.1, y + d.y * boom * .9 - boom * boom * .6, d.z * boom * 1.1); m.rotation.set(t * 8, t * 5, 0); });
    flash.visible = boom > 0 && boom < .6; flash.scale.setScalar(.2 + boom * 1.2); flashMat.opacity = .9 * (1 - boom / .6);
    floorRing.visible = boom > 0 && boom < 1; floorRing.scale.setScalar(.2 + boom * 1); floorMat.opacity = .7 * (1 - boom);
  } };
}

/** Ember and Storm, Overload: a crackling ball of fire and lightning swells, then bursts in a shockwave. */
function overload(): Demo {
  const E = SCHOOL_LIGHT.ember, S = SCHOOL_LIGHT.storm, g = new THREE.Group(), y = .6;
  const ballMat = shine(0xffb040, .7), ball = part(g, sphere(.25, 14, 10), ballMat, [0, y, 0]);
  const heart = glow(0xffe080, 1.2, .8); heart.position.y = y; g.add(heart);
  const crackles = [lightningBolt(g, S, 4, .02), lightningBolt(g, S, 4, .02), lightningBolt(g, S, 4, .02)];
  const shock = wave(g, E, [0, .02, 0]), shockMat = shock.material as THREE.MeshBasicMaterial;
  const sparks = Array.from({ length: 12 }, (_, i) => ({ m: part(g, new THREE.OctahedronGeometry(.035), lit(i % 2 ? S : E), [0, y, 0]), a: i / 12 * Math.PI * 2 }));
  return { group: g, play: t => {
    const k = t % 1.8 / 1.8, swell = span(k, 0, .45), boom = span(k, .45, .8), f = Math.floor(t * 18);
    ball.visible = k < .47; ball.scale.setScalar(.4 + swell * .9 + Math.sin(t * 40) * .04); ballMat.opacity = .5 + swell * .3;
    heart.material.opacity = k < .47 ? .5 + swell * .4 : .9 * (1 - boom); heart.scale.setScalar(1.2 + boom * 2);
    crackles.forEach((c, i) => { const a = f * .9 + i * 2.1, r = .2 + swell * .25; c.set([Math.cos(a) * r, y + Math.sin(a * 1.3) * r, Math.sin(a) * r], [Math.cos(a + 2.5) * r, y - Math.sin(a) * r, Math.sin(a + 2.5) * r], f + i * 4, .06, k < .47 && (f + i) % 2 === 0); });
    shock.visible = boom > 0 && boom < 1; shock.scale.setScalar(.2 + boom * 1.3); shockMat.opacity = .8 * (1 - boom);
    sparks.forEach(({ m, a }) => { m.visible = boom > 0 && boom < 1; m.position.set(Math.cos(a) * boom * 1.1, y + Math.sin(a * 3) * .2 + boom * .5 - boom * boom * .9, Math.sin(a) * boom * 1.1); });
  } };
}

/** Hallow (a school to come): a pillar of gold light falling on a rune circle, motes rising through it. */
function hallowPillar(): Demo {
  const H = SCHOOL_LIGHT.hallow, g = new THREE.Group(), circleMat = shine(H, .55);
  const ground = circle(g, H, .7, circleMat), ring = runeRing(g, H, .5, [0, 1.2, 0], 6);
  const beamMat = shine(0xfff0c0, .45), beam = part(g, new THREE.CylinderGeometry(.32, .32, 3, 14, 1, true), beamMat, [0, 1.5, 0]);
  const inner = part(g, new THREE.CylinderGeometry(.12, .12, 3, 10, 1, true), shine(0xffffff, .5), [0, 1.5, 0]);
  const risers = Array.from({ length: 8 }, () => part(g, new THREE.OctahedronGeometry(.03), lit(0xfff0c0), [0, 0, 0]));
  return { group: g, play: t => {
    const k = t % 2.2 / 2.2, draw = smooth(span(k, 0, .25)), fall = span(k, .25, .4), fade = span(k, .75, .95);
    ground.scale.setScalar(.3 + draw * .7); circleMat.opacity = .55 * draw * (1 - fade); ground.rotation.y = t * .3;
    beam.visible = inner.visible = fall > 0 && fade < 1; beam.scale.set(1 - fade * .6, fall, 1 - fade * .6); beam.position.y = 3 - fall * 1.5; inner.scale.copy(beam.scale); inner.position.y = beam.position.y;
    beamMat.opacity = .45 * (1 - fade);
    ring.visible = fall > .5 && fade < 1; ring.rotation.y = t * 1.5; ring.position.y = .9 + Math.sin(t * 2) * .1;
    risers.forEach((m, i) => { const u = (t * .5 + i / 8) % 1, a = i * 2.4; m.visible = beam.visible; m.position.set(Math.cos(a) * .22, u * 2, Math.sin(a) * .22); });
  } };
}

/** Umbral (a school to come): a dark orb with violet tendrils coiling down into a ring of shadow, then collapsing. */
function umbralHex(): Demo {
  const U = SCHOOL_LIGHT.umbral, g = new THREE.Group(), y = .8;
  const orb = part(g, sphere(.18, 12, 10), std(0x0c0812, { emissive: 0x2a0a4a }), [0, y, 0]);
  const aura = glow(U, 1.3, .7); aura.position.y = y; g.add(aura);
  const eyeRing = part(g, new THREE.TorusGeometry(.12, .012, 4, 20), lit(U), [0, y, .19], { scale: [1.4, .7, 1] }); const pupil = part(g, sphere(.035, 6, 5), lit(0xe0c0ff), [0, y, .2]);
  const shadow = wave(g, 0x2a0a4a, [0, .02, 0]); (shadow.material as THREE.MeshBasicMaterial).blending = THREE.NormalBlending;
  const rim = wave(g, U, [0, .025, 0]), rimMat = rim.material as THREE.MeshBasicMaterial;
  const tendrils = [0, 1, 2, 3].map(() => Array.from({ length: 7 }, (_, j) => part(g, sphere(.045 - j * .004, 6, 5), j % 2 ? lit(U) : std(0x140a20, { emissive: 0x1a0630 }), [0, 0, 0])));
  return { group: g, play: t => {
    const k = t % 2.4 / 2.4, grow = smooth(span(k, 0, .25)), collapse = span(k, .75, .92), s = grow * (1 - collapse);
    orb.scale.setScalar(.2 + s * .8); aura.material.opacity = .7 * s; eyeRing.visible = pupil.visible = s > .5; pupil.position.x = Math.sin(t * 1.5) * .05;
    shadow.scale.setScalar(.1 + s * .75); rim.scale.setScalar(.1 + s * .8 + Math.sin(t * 4) * .03); rimMat.opacity = .7 * s;
    tendrils.forEach((tr, i) => tr.forEach((m, j) => { const u = j / 7, a = t * 1.6 + i * Math.PI / 2 + u * 3; m.visible = s > .1; m.position.set(Math.cos(a) * (.2 + u * .45) * s, y - u * (y - .05), Math.sin(a) * (.2 + u * .45) * s); }));
  } };
}

/** The options (names and notes in STR.effects), with each one's school (or the mage's own magic, or a reaction). */
export const EFFECT_OPTIONS = [
  { id: 'arcaneBolt', school: 'arcane', build: arcaneBolt }, { id: 'cinderLance', school: 'ember', build: cinderLance },
  { id: 'pyreSeal', school: 'ember', build: pyreSeal }, { id: 'rimeShards', school: 'frost', build: rimeShards },
  { id: 'glacialWall', school: 'frost', build: glacialWall }, { id: 'arc', school: 'storm', build: arc },
  { id: 'staticMantle', school: 'storm', build: staticMantle }, { id: 'shatter', school: 'reaction', build: shatter },
  { id: 'overload', school: 'reaction', build: overload }, { id: 'hallowPillar', school: 'hallow', build: hallowPillar },
  { id: 'umbralHex', school: 'umbral', build: umbralHex },
] as const satisfies readonly { id: string; school: School | 'arcane' | 'reaction'; build: () => Demo }[];

/* ---------- the gallery ---------- */

const shown: { room: Room; group: THREE.Group; play: (t: number) => void }[] = [];
let clock = 0;
/** Play the effects (every one, or those in `only`) ahead of (north of) world (x, z) in `room`, in rows of four; returns
    where each plays. */
export function showEffectOptions(room: Room, x: number, z: number, only?: readonly string[]) {
  const list = EFFECT_OPTIONS.filter(o => !only || only.includes(o.id)), cols = 4, gap = 2.6;
  return list.map((o, i) => {
    const inRow = Math.min(cols, list.length - Math.floor(i / cols) * cols);
    const at = only && list.length === 1 ? freeSpotNear(room, x, z - 2) : freeSpotNear(room, x + (i % cols - (inRow - 1) / 2) * gap, z - 1.7 - Math.floor(i / cols) * 2);
    const d = o.build(); d.group.position.set(at.x - room.cx, 0, at.z - room.cz); room.group.add(d.group);
    shown.push({ room, group: d.group, play: d.play });
    return { id: o.id, x: at.x, z: at.z };
  });
}
/** Every step: the effects in the room shown play on. */
export function updateEffectOptions(dt: number, current: Room) {
  clock += dt;
  for (const s of shown) if (s.room === current) s.play(clock);
}
/** Take the effects playing in `room` away. */
export function removeEffectOptions(room: Room) {
  for (let i = shown.length - 1; i >= 0; i--) if (shown[i].room === room) { room.group.remove(shown[i].group); disposeTree(shown[i].group); shown.splice(i, 1); }
}
/** A new floor: its rooms are gone, and the effects with them. */
export function clearEffectOptions() { shown.length = 0; }
