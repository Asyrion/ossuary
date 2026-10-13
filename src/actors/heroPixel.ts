/* The mage in the pixel-art look (2026-10-01, the owner: everything in the one pixel-art look). The Tripo model stays (the
   owner's choice) but sheds what made it read as a smooth render at the game's pixel size: its painted texture (a
   thousand small islands of fine strokes, which drawn some 45 pixels tall broke into speckle and mush) is baked into
   its vertices and cut down to a small palette (`render/palette.ts`), and its light falls in a few flat bands, as the
   foes' and the room kit's do. Each mesh keeps both materials (`userData.made`, `userData.pixel`); the dev menu's Look
   tab switches between them (`setHeroPixel`, remembered in this browser). Tuning in CFG.heroPixel. */
import * as THREE from 'three';
import { CFG } from '../config';
import { quantize } from '../render/palette';

const KEY = 'ossuary.heroPixel';
let on = true;
try {
  on = localStorage.getItem(KEY) !== 'off';
} catch {
  /* no storage: on */
}
/** Whether the mage wears the pixel-art look. */
export const heroPixel = () => on;

/** The few tones light falls in on the mage, darkest first. */
let tones: THREE.DataTexture | null = null;
export function toneMap() {
  if (tones) return tones;
  const t = CFG.heroPixel.tones,
    data = new Uint8Array(t.map((v) => Math.round(v * 255)));
  tones = new THREE.DataTexture(data, t.length, 1, THREE.RedFormat);
  tones.minFilter = tones.magFilter = THREE.NearestFilter;
  tones.generateMipmaps = false;
  tones.needsUpdate = true;
  return tones;
}

/** The texels of a texture's image, read once. */
function texels(tex: THREE.Texture): ImageData | null {
  const img = tex.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!img?.width || typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const g = cv.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0);
  return g.getImageData(0, 0, cv.width, cv.height);
}

/** Bake the pixel-art look for every textured mesh under `root` (the prepared hero): each vertex takes the colour of the
    texture where it lies (a few texels' mean, so a painted stroke doesn't decide it), the colours of the whole model are
    cut down to CFG.heroPixel.colours, and a toon material lights them in bands, with the same faint self-light the
    model had so it reads in the dark. The look worn is the one chosen. */
export function bakeHeroPixel(root: THREE.Object3D) {
  const P = CFG.heroPixel;
  const meshes: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; rgb: Float32Array }[] = [];
  const read = new Map<THREE.Texture, ImageData | null>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh,
      mat = mesh.material as THREE.MeshStandardMaterial;
    if (!mesh.isMesh || Array.isArray(mesh.material) || !mat.map || !mesh.geometry.attributes.uv) return;
    if (!read.has(mat.map)) read.set(mat.map, texels(mat.map));
    const img = read.get(mat.map);
    if (!img) return;
    const uv = mesh.geometry.attributes.uv,
      rgb = new Float32Array(uv.count * 3),
      { width: W, height: H, data } = img;
    const flip = mat.map.flipY,
      r = P.sample;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i) - Math.floor(uv.getX(i)),
        v = uv.getY(i) - Math.floor(uv.getY(i));
      const x = Math.min(W - 1, Math.floor(u * W)),
        y = Math.min(H - 1, Math.floor((flip ? 1 - v : v) * H));
      let n = 0;
      const s = [0, 0, 0];
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > r) continue; // (a small diamond round the texel)
          const px = Math.min(W - 1, Math.max(0, x + dx)),
            py = Math.min(H - 1, Math.max(0, y + dy)),
            k = (py * W + px) * 4;
          s[0] += data[k];
          s[1] += data[k + 1];
          s[2] += data[k + 2];
          n++;
        }
      rgb[i * 3] = s[0] / n / 255;
      rgb[i * 3 + 1] = s[1] / n / 255;
      rgb[i * 3 + 2] = s[2] / n / 255;
    }
    meshes.push({ mesh, mat, rgb });
  });
  if (!meshes.length) return;
  const all = new Float32Array(meshes.reduce((s, m) => s + m.rgb.length, 0));
  let at = 0;
  for (const m of meshes) {
    all.set(m.rgb, at);
    at += m.rgb.length;
  }
  const { palette, index } = quantize(all, P.colours, P.refine, P.chroma),
    c = new THREE.Color();
  // (each palette colour once into linear light, as three keeps vertex colours)
  const linear = palette.map((p) => c.setRGB(p[0], p[1], p[2], THREE.SRGBColorSpace).toArray() as number[]);
  at = 0;
  for (const { mesh, mat, rgb } of meshes) {
    const out = new Float32Array(rgb.length);
    for (let i = 0; i < rgb.length / 3; i++) out.set(linear[index[at + i]], i * 3);
    at += rgb.length / 3;
    mesh.geometry.setAttribute('color', new THREE.BufferAttribute(out, 3));
    const pixel = new THREE.MeshToonMaterial({
      vertexColors: true,
      gradientMap: toneMap(),
      color: 0xffffff,
      side: mat.side,
    }); // (two-sided where the model was: Tripo winds some faces inward and marks the material doubleSided)
    const glow = P.glow.toFixed(3);
    pixel.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * ${glow};`,
      );
    };
    mesh.userData.made = mat;
    mesh.userData.pixel = pixel;
    mesh.material = on ? pixel : mat;
  }
}

/** Wear the pixel-art look (or the model as made) on every baked mesh under `root`, and remember the choice. */
export function setHeroPixel(root: THREE.Object3D | null, pixel: boolean) {
  on = pixel;
  try {
    localStorage.setItem(KEY, pixel ? 'on' : 'off');
  } catch {
    /* not remembered */
  }
  root?.traverse((o) => {
    const u = o.userData;
    if (u.made && u.pixel) (o as THREE.Mesh).material = pixel ? u.pixel : u.made;
  });
}
