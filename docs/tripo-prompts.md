# Tripo Studio prompts: the townspeople, the Ferryman, Kaelith and Dr. Jelly

> **Superseded (2026-10-09).** These prompts used the miniature format, made for figurines to 3D-print, and the owner had to
> rewrite most of them. For the next character, use **`docs/assets.md`, "Prompts for game characters in Tripo"**, which
> says what went wrong and gives the structure to use. The prompts stay here as the record of the first batch.
>
> **What came back** (2026-10-09, all rigged in Tripo with its Mixamo skeleton, no clips): the ten townspeople, the
> Ferryman, Kaelith and Dr. Jelly, each about 18,000 to 20,000 triangles with a 2,048 px texture. Three of them (the
> cloud-forest wizard, the forager, the storm caller) came through an FBX converter (`FB_ngon_encoding`) and lost their
> rest pose: every bone at the origin and every vertex on the hips. The animate tool rebuilds them.

Written 2026-10-09 at the owner's ask, for M7's townspeople (`docs/M7-plan.md`, step 7). These are Nano Banana 2 prompts for
Tripo Studio's model generator, one for each figure that stands at the Vigil. Each figure is now built in code
(`src/vigil/townLooks.ts`). Kaelith and Dr. Jelly were added at the owner's ask the same day (below the Ferryman): each
follows the look the owner chose for it in code. A made model replaces its code figure through the creature pipeline (`docs/creatures.md`).

## How they become pixel art

The game has no 2D sprites. A Tripo model is drawn as pixel art by the game itself:

- `tools/texel-bake.ts` shrinks its texture to one texel a game pixel and cuts it to a palette (the owner's rule of
  2026-10-05).
- The pixel look then draws it at the room kit's texel, outlined and lit in bands.

So the job in Tripo is a clean, readable miniature with **large flat areas of colour**: fine painted detail is lost at
about 50 pixels tall. Ask for no more detail than that.

## How to use them

1. **Generate the image.** In Tripo Studio's model generator, choose Nano Banana 2 and paste a prompt as it is. Each one
   ends on the word `Miniature`, which brings the painted base and miniature proportions.
2. **Negative prompt field:** `text, letters, scenery, second figure, transparent, glass, particles, smoke`.
3. **Keep the set consistent.** Make the one you like best first, then attach it to each of the others with: *"Using the
   attached image as the style and palette reference, keep the same rendering medium, proportions and colour grading,
   and generate: ..."* followed by the prompt.
4. **Image to 3D, then rig.**
   - Budget: the **Enemy** kind (up to 8,000 triangles, 1,024 px texture).
   - Size in the game: about 1.05 units tall, a little shorter than the mage.
   - Rig it in Tripo, or bring it through your EDA-ModelWebViewer (the Chameleon Wyvern's way).
5. **Hand over.** Export a GLB and upload it with the image. I take it through `npm run animate-creature`:
   - the idle sway, the head turning to the mage, and a speaking gesture;
   - the texel bake into pixel art;
   - the Galleries tab for your review.

**Why the poses are calm.** The townspeople stand, sway, turn their heads and gesture while they talk, all animated in
code. So each prompt gives a characterful standing pose with the arms held clear of the body (what rigging needs), not a
leap or a lunge. If one comes back stiff, the pose sentence is the dial to turn first.

**Why they glow in their own light.** Each is a shade: a soul given form. A see-through body doesn't survive image-to-3D,
so each is asked for as pale robes lit from within in its own colour (the same light it has in `data/shades.json`). The
game adds its own glow round each figure.

---

**The storm caller** (light: lightning yellow)

```
A chibi storm caller, the freed spirit of a weather mage, planted wide on both feet with a tall crooked staff thrust skyward in its right hand and its left arm flung out to the side, palm open to the sky. Its robes are pale and lit faintly from within in yellow because it is a shade, a soul given form rather than a living body. Head about a third of its height, a wide-brimmed pointed hood shading the face so only two small yellow eyes show. The staff is as tall as the figure, topped with a hooked crook like a shepherd's, a small storm cloud of carved wood perched on the hook and a zigzag spark curling round it. Black spiral markings run down both sleeves; a sash of storm-grey wool at the waist. Surfaces: undyed linen, weathered ash wood, grey wool. Palette: pale ivory and storm grey, with lightning yellow on the eyes, the spark and the spirals. Miniature
```

**The cloud-forest wizard** (light: leaf green)

```
A chibi cloud-forest wizard, the freed spirit of an old hermit mage, leaning forward on a long staff with both hands stacked on its top and one foot stepping ahead, head tilted kindly to one side. Its robes glow faintly green from within because it is a shade, a soul given form. Bare-headed, with a long white beard reaching its belt and moss growing in it; head about a third of its height. The staff is taller than the figure, a living branch still sprouting five round leaves near its top and a curl of new shoot. Its robe's hem is scalloped like layered lichen; a pouch of seeds hangs at the hip. Surfaces: soft green-grey wool, living bark, moss, birch leaves. Palette: sage green and pale grey, with bright leaf green on the leaves, the shoot and the eyes. Miniature
```

**A forager of the valleys** (light: harvest tan)

```
A chibi valley forager, the freed spirit of a young hunter and gatherer, crouched low on one knee with the other foot planted, a short bow held out to the side in its left hand and its right hand raised to shade its eyes as it looks into the distance. It glows faintly warm tan from within because it is a shade, a soul given form. A short hooded cape to the waist, head about a third of its height, the hood pushed back to show cropped hair and a round, friendly face. A woven wicker basket of mushrooms and roots sits on its back, strapped over both shoulders; a quiver of four arrows at the hip. Surfaces: undyed homespun, oiled leather, wicker, fletching. Palette: oatmeal and moss brown, with warm amber on the eyes, the basket's mushrooms and the bow's grip. Miniature
```

**The scribe** (light: parchment white)

```
A chibi scribe, the freed spirit of a monastery copyist, stooped forward over a large open book held flat on its left forearm, its right hand lifted high with a long quill as if about to write, one foot slightly behind the other. It glows faintly parchment white from within because it is a shade, a soul given form. Deep hood, head about a third of its height, round spectacles catching the light on a face bent towards the page. The book is half the figure's height, open with thick pages and a ribbon marker hanging down; an ink pot and two rolled scrolls hang from a cord at its belt. Surfaces: undyed wool, vellum, brass spectacles, oak-gall ink. Palette: cream and dove grey, with deep ink black on the quill tip, the pot and the book's spine. Miniature
```

**The sexton** (light: bone grey)

```
A chibi sexton, the freed spirit of a gravedigger, broad and square-shouldered, standing with feet planted wide and a long spade resting over its right shoulder, its left arm held out holding up a small iron lantern by its ring. It glows faintly bone-grey from within because it is a shade, a soul given form. Heavy hood and a short cape, head about a third of its height, a stubbled jaw and a crooked, patient smile. The spade is as tall as the figure, with an iron blade and a worn T-handle. A ring of three large iron keys hangs on its belt beside a coil of rope. Surfaces: heavy waxed canvas, oiled wood, black iron, coarse hemp. Palette: ash grey and earth brown, with warm candle amber in the lantern and the eyes. Miniature
```

**The chorister** (light: candle gold)

```
A chibi chorister, the freed spirit of a temple singer, slim and upright on its toes with its back arched slightly, head tilted up and both arms raised high and wide in a V, palms open, mouth open in song. It glows faintly gold from within because it is a shade, a soul given form. Long plain choir robe falling straight to the base with a wide ruffled collar like a white lily, a small hood resting on its shoulders, head about a third of its height, short curled hair. A thin ribbon with a tiny bell trails from one wrist. Surfaces: fine linen, starched lace, a brass bell. Palette: warm ivory and pale gold, with bright candle gold on the eyes, the collar's edge and the bell. Miniature
```

**The bell-ringer** (light: pale ward blue)

```
A chibi bell-ringer, the freed spirit of a tower bell-keeper, standing with its weight on its back foot, its right arm lifted high ringing a hand bell held up beside its head, its left hand cupped to its ear as if listening to the echo. It glows faintly pale blue from within because it is a shade, a soul given form. Plain hooded robe tied with rope, head about a third of its height, cheeks puffed in a little grin. The hand bell is the size of its head, bronze with a wooden handle; a thick coil of bell rope hangs across its chest from one shoulder to the opposite hip. Surfaces: grey wool, hemp rope, cast bronze, turned wood. Palette: slate blue and soft grey, with pale ward blue on the eyes and a warm bronze bell as the one warm accent. Miniature
```

**The novice** (light: violet)

```
A chibi novice, the freed spirit of a young temple student, small and round, stepping forward with one foot lifted and both hands holding a lit candle out in front of it at arm's length, its head tucked down but eyes looking up, brave and a little afraid. It glows faintly violet from within because it is a shade, a soul given form. Oversized hood that falls past its eyebrows, head about half its height for an even younger look, a robe too long for it pooling at the feet. The candle is thick and short in a dish-shaped iron holder with a ring handle; its flame is a teardrop of violet light. Surfaces: plain undyed wool, beeswax, black iron. Palette: soft lilac and pale grey, with bright violet on the eyes and the candle flame. Miniature
```

**The embalmer** (light: mint green)

```
A chibi embalmer, the freed spirit of a temple apothecary for the dead, standing tall with one hand on its hip and the other holding a stoppered glass jar up to eye level as if checking its contents. It glows faintly mint green from within because it is a shade, a soul given form. A long leather apron from chest to ankles over its robe, a close-fitting cap and a cloth mask pulled down under the chin, head about a third of its height. A belt of three small clay jars with wax-sealed lids sits at the waist, and a bundle of dried herbs hangs from it. Surfaces: dark oiled leather, linen, glazed clay, sealing wax. Palette: sage green and dark brown, with mint green on the eyes and the liquid in the jar. Miniature
```

**The pilgrim** (light: periwinkle)

```
A chibi pilgrim, the freed spirit of a road-worn traveller, mid-stride with its left leg forward and the right heel lifted, leaning on a long walking staff planted ahead of it, its other hand holding the strap of a bundle on its back. It glows faintly periwinkle from within because it is a shade, a soul given form. A broad round hat with a wide flat brim and a scallop shell pinned to its front, head about a third of its height, a short cloak over a travelling robe. The staff is taller than the figure with a gourd tied near the top; the bundle is a rolled blanket strapped over a small pack. Surfaces: felt, wool, ash wood, a dried gourd, a seashell. Palette: dusty blue and pale grey, with periwinkle on the eyes and the shell. Miniature
```

**The Ferryman** (not a shade: dark robes, his lantern's warm light)

```
A chibi ferryman of the dead, tall and narrow, standing upright with both hands on a long punting pole planted beside it, the pole twice the figure's height and curving at the top into a hook from which a small iron lantern hangs. It is darker and more solid than any shade, because it has carried the dead across for longer than anyone remembers. A deep hood hides the face entirely except two small pale eyes like coins. Long layered robes fall to the base, their hem scalloped and damp, a single obol hanging on a cord round the neck. Surfaces: heavy black-brown wool, tarred wood, black iron, tarnished silver. Palette: charcoal and deep umber, with warm amber in the lantern and pale silver on the eyes and the coin. Miniature
```

## Kaelith and Dr. Jelly

These two follow the looks the owner chose for their code figures, so a made model matches what the game shows now:
- **Kaelith** wears the Winged Watcher (2026-10-06, `src/actors/kaelithLooks.ts`). It is a boss: the **Boss** kind (up to
  15,000 triangles), about twice the mage's height. Its fight moves its sword, its wings, the hand that holds the seal shut
  and its kneel at the end, all in code. So its prompt asks for the sword raised and out and the wings spread clear of the
  body, and for proportions closer to heroic than chibi, so it towers over the mage.
- **Dr. Jelly** is the plague doctor (2026-10-02, `src/world/jellyLooks.ts`). He is about the mage's height, the
  **Enemy** kind's budget (up to 8,000 triangles), animated in code: he leans, turns to the mage, and reaches out to hand
  over a potion, so his right arm is held out with the flask.

Each stands apart from the set, but attaching a townsperson's image as the style reference still keeps the rendering
the same.

**Kaelith, the Shadow Sentinel** (the Seal's boss: Umbral, violet light)

```
A towering winged sentinel of shadow, the last guardian of an ancient seal, standing on long armoured legs with its left foot forward, its right arm raising a long two-handed sword up and out to the side and its left hand held open before its chest, palm out, as if holding something shut. It has stood guard so long that its armour and its shadow have become one body. Its face is a hooded stone mask like a temple statue's, smooth and calm, with two narrow violet slits for eyes. Two great bat-like wings spread wide from its back, their edges torn into long points, each wing as wide as the figure is tall. The sword is as long as the sentinel's legs, its blade edged with a thin violet line. Gaunt plate armour, dark and smooth. Surfaces: blackened steel, grey stone, dark leathery membrane. Palette: deep violet-black and slate grey, with bright violet on the eyes, the sword's edge and a rune ring floating behind its head. Miniature
```

**Dr. Jelly** (the alchemist of the laboratory: jelly green)

```
A chibi plague doctor alchemist, cheerful and eccentric, leaning forward on its back foot with its right arm held out at shoulder height offering a round glass flask of glowing green jelly, its left hand resting on a small jar at its hip. Its mask is a long curved bird beak, because the jelly's fumes are strong and the beak holds dried herbs against them. Round brass-rimmed glass eyes on the mask glow jelly green. A wide-brimmed hat tipped back over a dark hood, head about a third of its height. A long grey greatcoat with wide lapels over a dark front, leather gloves, and a belt of pouches and a row of four small vials. In the jar at its hip sits a small jelly with two dot eyes, its familiar. A coil of glass tube curls from the flask's neck. Surfaces: grey felted wool, dark oiled leather, brass, clear glass. Palette: ash grey and dark brown, with jelly green in the flask, the jar and the mask's eyes. Miniature
```

## If they come back wrong

| What came back | Change in the prompt |
| --- | --- |
| A stiff, upright figure | The pose sentence: name the torso's angle, which foot is planted, where each arm points |
| A staff or pole too short | It already says "as tall as the figure"; add "reaching above its head" |
| The figure see-through, or made of smoke | Remove nothing; add "solid painted figure" after "a soul given form" |
| Two figures, or a prop on its own base | Add "rising from the same base" to the prop |
| The glow colour all over | Name the robe's colour again next to the glow ("pale ivory robes, a faint yellow glow") |
| Kaelith's mask came back as a face | Add "a sealed full-face stone mask" |
| Kaelith too small beside its wings | Add "the sentinel tall and narrow, its wings no wider than twice its height" |
