/* The hero: any Tripo GLB, auto-normalised, with a layered animation controller (heroAnim.ts)
   or a procedural bob/lean for static models. */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { CFG } from '../config';
import { STR } from '../strings';
import { G, player } from '../state';
import { scene } from '../render/renderer';
import { lantern } from '../render/lights';
import { M, blob } from '../render/materials';
import { shootDir } from '../input';
import { angleLerp, lerp } from '../util';
import { findMiniatureBase } from './baseDetect';
import { fitCostumes } from './costume';
import { buildHeroAnim, playCast, playDeath, playGesture, playHit, resetAnim, updateHeroAnim, type HeroAnim } from './heroAnim';

export const hero = {
  root: new THREE.Group(), yaw: new THREE.Group(), lean: new THREE.Group(),
  model: null as THREE.Object3D | null, anim: null as HeroAnim | null, info: '',
};
hero.root.add(hero.yaw); hero.yaw.add(hero.lean); hero.root.add(blob(.95)); scene.add(hero.root);
const loader = new GLTFLoader();

interface PreparedHero { holder: THREE.Group; skinned: boolean; stripped: boolean; tris: number }

/** Normalise any GLB to CFG.hero.height tall, centred, feet on the floor. */
export function prepareHero(gltf: GLTF): PreparedHero {
  const src = gltf.scene; src.updateMatrixWorld(true);
  let skinned = false; src.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true; });
  let obj: THREE.Object3D = src, stripped = false, tris = 0;
  if (!skinned) {
    // bake every static mesh into world space so we can analyse the whole silhouette
    const group = new THREE.Group(); const meshes: THREE.Mesh[] = [];
    src.traverse(o => {
      const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
      const g = mesh.geometry.clone(); g.applyMatrix4(mesh.matrixWorld);
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      const m = new THREE.Mesh(g, mesh.material); meshes.push(m); group.add(m);
    });
    obj = group;
    if (CFG.hero.stripBase) stripped = stripMiniatureBase(meshes);
  }
  const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3());
  obj.scale.setScalar(CFG.hero.height / (size.y || 1));
  const box2 = new THREE.Box3().setFromObject(obj); const c = box2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= box2.min.y;
  obj.traverse(o => {
    const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
    const geo = mesh.geometry;
    tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[];
    const plain = mats.every(m => !m.map && !m.normalMap && !geo.attributes.color);
    if (plain) { mesh.material = M.hero; return; } // untextured export: give it an undercoat so it reads in the dark
    for (const m of mats) {
      if (!m.map) { m.color?.set(0xb9ae9c); continue; } // normal map only: keep detail, add undercoat
      // faint self-light from the colour texture so the hero stays readable in dark rooms
      if ('emissiveMap' in m) { m.emissiveMap = m.map; m.emissive.set(0xffffff); m.emissiveIntensity = .14; m.needsUpdate = true; }
    }
  });
  const holder = new THREE.Group(); holder.add(obj);
  return { holder, skinned, stripped, tris: Math.round(tris) };
}

/** Tripo figurines often stand on a round base. Detect a disc at the bottom and cut it away. */
function stripMiniatureBase(meshes: THREE.Mesh[]) {
  const data = meshes.map(m => {
    const p = m.geometry.attributes.position; const positions = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { positions[i * 3] = p.getX(i); positions[i * 3 + 1] = p.getY(i); positions[i * 3 + 2] = p.getZ(i); }
    return { positions, index: m.geometry.index!.array };
  });
  const keep = findMiniatureBase(data);
  if (!keep) return false;
  meshes.forEach((m, i) => m.geometry.setIndex(keep[i]));
  return true;
}

export function setHero(prep: PreparedHero, gltf: Pick<GLTF, 'animations'>, label: string) {
  if (hero.model) hero.lean.remove(hero.model);
  hero.model = prep.holder; hero.lean.add(hero.model);
  hero.anim = null; hero.lean.rotation.set(0, 0, 0); hero.lean.position.set(0, 0, 0);
  fitCostumes(prep.holder); // measured in the rest pose, before a clip moves the bones
  const clips = (gltf.animations || []).slice();
  if (prep.skinned && clips.length) hero.anim = buildHeroAnim(prep.holder, clips);
  const roles = hero.anim?.roles ?? {};
  const clipList = Object.entries(roles).filter(([, c]) => c).map(([k, c]) => `${k}: ${c!.name.replace(/\.\d+$/, '')}`).join(', ');
  hero.info = STR.heroInfo(label, prep.tris, prep.stripped, prep.skinned, clipList);
}

export function loadHeroBuffer(buf: ArrayBuffer, label: string) {
  return new Promise<void>((res, rej) => loader.parse(buf, '', gltf => {
    try { setHero(prepareHero(gltf), gltf, label); res(); } catch (e) { rej(e); }
  }, rej));
}

export function fallbackHero(): PreparedHero {
  const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.CapsuleGeometry(.25, .4, 4, 8), M.hero); body.position.y = .5; g.add(body);
  const holder = new THREE.Group(); holder.add(g); return { holder, skinned: false, stripped: false, tris: 0 };
}

export function heroCast() { if (hero.anim) playCast(hero.anim, player.stats.fireDelay); }
export function heroHit() { if (hero.anim) playHit(hero.anim); }
/** The mage drinks in a heart's warmth (healing), when the model has a drinking clip. */
export function heroDrink() { if (hero.anim) playGesture(hero.anim, 'drink'); }
/** Returns how long the death animation takes, in seconds. */
export function heroDie() { player.dead = true; return hero.anim ? playDeath(hero.anim) : .9; }
export function heroReset() {
  player.dead = false; hero.lean.rotation.set(0, 0, 0); hero.lean.position.set(0, 0, 0);
  if (hero.anim) resetAnim(hero.anim);
}

/** Per-frame hero pose: facing, animation (or procedural bob and lean), invulnerability blink, lantern. */
export function heroVisual(dt: number, now: number) {
  const moving = Math.hypot(player.vx, player.vz); const sd = shootDir();
  let targetYaw = player.yawA;
  if (player.dead) targetYaw = player.yawA;
  else if (sd && G.state === 'play') targetYaw = Math.atan2(sd.x, sd.z);
  else if (moving > .4) targetYaw = Math.atan2(player.vx, player.vz);
  player.yawA = angleLerp(player.yawA, targetYaw, 1 - Math.exp(-16 * dt));
  hero.root.position.set(player.x, 0, player.z); hero.yaw.rotation.y = player.yawA;
  const sp = moving / CFG.hero.speed;
  const lean = hero.lean;
  if (hero.anim) updateHeroAnim(hero.anim, dt, player.dead ? 0 : sp);
  if (player.dead && !hero.anim?.deaths.length) { // a static model, or a rig with no death clip: just topple over
    lean.rotation.x = lerp(lean.rotation.x, 1.45, 1 - Math.exp(-6 * dt)); lean.position.y = lerp(lean.position.y, .1, 1 - Math.exp(-6 * dt));
  } else if (!hero.anim) {
    player.bob += dt * (moving > .3 ? 13 : 2.2);
    lean.position.y = moving > .3 ? Math.abs(Math.sin(player.bob)) * .07 : Math.sin(player.bob) * .012;
    const fwd = (player.vx * Math.sin(player.yawA) + player.vz * Math.cos(player.yawA)) / CFG.hero.speed;
    const side = (player.vx * Math.cos(player.yawA) - player.vz * Math.sin(player.yawA)) / CFG.hero.speed;
    lean.rotation.x = lerp(lean.rotation.x, fwd * .16, 1 - Math.exp(-10 * dt));
    lean.rotation.z = lerp(lean.rotation.z, -side * .12 + (moving > .3 ? Math.sin(player.bob) * .05 : 0), 1 - Math.exp(-10 * dt));
  }
  player.squash = Math.max(0, player.squash - dt * 7);
  const sq = hero.anim ? 0 : player.squash * .1; lean.scale.set(1 + sq * .6, 1 - sq, 1 + sq * .6);
  hero.root.visible = player.dead || !(player.invuln > 0 && Math.floor(now * 14) % 2 === 0);
  lantern.position.set(player.x, 1.4, player.z + .2);
}
