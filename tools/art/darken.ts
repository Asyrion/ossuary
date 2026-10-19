// Darkens a GLB's textures (pale stone and bone wash out under the game's camera; art bible section 1): brightness
// times `k`, a little more contrast. Usage: npx tsx tools/art/darken.ts <in.glb> <out.glb> <k>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
const [src, out, k] = [process.argv[2], process.argv[3], +process.argv[4]];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
for (const t of doc.getRoot().listTextures()) {
  const img = await sharp(Buffer.from(t.getImage()!))
    .modulate({ brightness: k, saturation: 1.15 })
    .linear(1.15, -18)
    .jpeg({ quality: 90 })
    .toBuffer();
  t.setImage(new Uint8Array(img)).setMimeType('image/jpeg');
}
await io.write(out, doc);
