# Credits

Every asset that ships with the game, where it came from, and its licence. Add a row when an asset goes
in. For generated assets, name the tool and the plan it was made on, since rights depend on the plan.

## 3D models

| Asset | Source | Licence |
| --- | --- | --- |
| `public/assets/hero_default.glb` | Made by Azyrion in Tripo3D | Tripo3D Master plan: commercial rights to creations are the owner's |
| `public/assets/creatures/owlbear.glb`, `dragonling.glb` and `chameleon.glb` (each with its `.full.glb`) | Made by Azyrion in Tripo3D (2026-10-03, 2026-10-03, 2026-10-05); animated in code | As above |

## Images and textures

| Asset | Source | Licence |
| --- | --- | --- |
| Floor, wall, glow and shadow textures | Generated in code (`src/render/textures.ts`) | Own work |

## Sound

| Asset | Source | Licence |
| --- | --- | --- |
| All sound effects but those below | Synthesised in code (`src/audio/sfx.ts`, `src/audio/creatureSounds.ts`) | Own work |
| `public/assets/sounds/chameleon/growl_1.ogg`, `screech_1.ogg`, `slam_1.ogg`, `slam_2.ogg` | Synthesised in code by Azyrion's EDA-ModelWebViewer (github.com/Asyrion/EDA-ModelWebViewer, `web/js/sounds.js`), made at 48 kHz from its recipe with `tools/viewer-sounds.ts`, 2026-10-05 | Own work |

## Fonts

Bundled with the game from the Fontsource npm packages, so nothing is loaded from Google. The licence
texts ship in `public/licenses/`.

| Font | Designer | Licence |
| --- | --- | --- |
| Cinzel | Natanael Gama (The Cinzel Project Authors) | SIL Open Font License 1.1 |
| Alegreya | Huerta Tipográfica (Juan Pablo del Peral) | SIL Open Font License 1.1 |
| Alegreya Sans | Huerta Tipográfica (Juan Pablo del Peral) | SIL Open Font License 1.1 |

## Code shipped in the game

| Library | Licence |
| --- | --- |
| three.js (r186), including the GLTFLoader addon | MIT |

Development tools (Vite, TypeScript, Playwright, glTF-Transform, sharp) are not part of the published
game.
