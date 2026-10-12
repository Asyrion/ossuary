# Eda lore

This folder holds the owner's lore of Eda in one place: the Obsidian exports that lived in `docs/` (characters, places, peoples, creatures), the lore notes of `inspiration/EDA/` copied in, and the text of the owner's three PDFs. It is the source for names and story, and nothing here is game design: the game adopts a name or a fact only once `docs/GDD.md` does (its Vision, Setting and "Open questions and placeholders" say which). The owner's wishlist, `docs/IDEAS.md for OSSUARY.md`, is not lore and stays where it is; `docs/ideas.md` holds Claude's reading of the first lore drop ("The Eda lore drop").

How to read the tables. **Words** counts what the owner wrote: front matter, image embeds, bare `[[links]]` and the unfilled page template (the "Lorem ipsum dolor sit amet" lines, kept as they were) are not counted; merged pages count everything after the merge. **State**: *stub* under 50 words, *partial* 50 to 299, *full* 300 or more. **Origin**: *docs* is a page that was already in `docs/` (moved here with its images); *EDA copy* is a note copied unchanged from `inspiration/EDA/` (the original stays there); a *merged* page keeps the longer text and adds the other source's facts under a heading "From <source path>".

Notes on the files: pages keep their Obsidian syntax (`[[links]]`, `![[images]]`). The images they embed are in the owner's vault, not in this repo; only `Characters/asyrion-apprentice.webp` came along. Pages that say "Lorem ipsum" are the owner's empty template (Lore, Appearance, Sounds, Abilities, Gameplay, Notes); fill them in the vault or here.

## Characters

| Page | Words | State | Origin | What the game already uses |
| --- | ---: | --- | --- | --- |
| [Asyrion](<Characters/Asyrion.md>) | 0 | stub | docs; merged with EDA/Characters/Azyrion - The Protagonist.md (an empty template) | The mage: the pitch and Setting in GDD Vision, `STR` title and end text, Asyrion's arc (four stages) and the Rune Fox as his companion. |
| [Boketto - The Storm Caller](<Characters/Boketto - The Storm Caller.md>) | 997 | full | docs; merged with EDA/Characters/Boketto.md and the Master Guide PDF | The Stormcaller transformation's look (white hair, glowing storm sigils; GDD Artifacts) and a storm-teaching shade in the Vigil plan (GDD Between runs; `data/shades.json` has `stormcaller`, named only "the storm caller"). The name Boketto is not in `STR` or `data/`. |
| [Cloud Forest Wizard](<Characters/Cloud Forest Wizard.md>) | 3 | stub | docs | The shade `wizard`, "the cloud-forest wizard", who teaches Verdant (GDD Between runs; `data/shades.json`, `STR`). Only the name and the Longwood link are in the page. |
| [Esakki Raja Arumugam - WIP](<Characters/Esakki Raja Arumugam - WIP.md>) | 0 | stub | docs; merged with EDA/Characters/Esakki Raja.md (an empty template) | Nothing yet. |
| [Kalopsia - The Witch](<Characters/Kalopsia - The Witch.md>) | 3 | stub | EDA copy | Nothing yet. |
| [Leron Lubilar - Fierce and Proud Fox-Man](<Characters/Leron Lubilar - Fierce and Proud Fox-Man.md>) | 108 | partial | EDA copy (from Huruhui/Characters) | Nothing directly. Close to Fen-Nex (a fox-man) and the Beastcaller idea. |
| [Male Fire Mage Assasin](<Characters/Male Fire Mage Assasin.md>) | 0 | stub | docs | Image only ("Male chaos wizard named Asyrion"). Behind the GDD's "apprentice turned chaos mage" (Setting, `docs/ideas.md`). |
| [The Stormbringer - Manuel](<Characters/The Stormbringer - Manuel.md>) | 0 | stub | EDA copy | Nothing yet. |
| [Varun Tiramdasu](<Characters/Varun Tiramdasu.md>) | 0 | stub | EDA copy | Nothing yet. |
| [Wandering Merchant of Belerial](<Characters/Wandering Merchant of Belerial.md>) | 0 | stub | docs | The Wandering Merchant (GDD Pickups and room types, M4.2 step 5; `src/items/wanderer.ts`, `STR`). The page is an image and a link only. |

## Places

| Page | Words | State | Origin | What the game already uses |
| --- | ---: | --- | --- | --- |
| [(Ancient Forest) Longwood](<Places/(Ancient Forest) Longwood.md>) | 45 | stub | docs | Named in GDD Vision as part of the world above. No mechanic or room uses it. |
| [(Region) Patagoi Atoll](<Places/(Region) Patagoi Atoll.md>) | 0 | stub | docs | Nothing. `docs/ideas.md` suggests the name for a drowned floor's biome (M8). |
| [(Region) The Plains of Belerial](<Places/(Region) The Plains of Belerial.md>) | 0 | stub | docs | Where the Wandering Merchant comes from (GDD Vision, Pickups; `STR`). |
| [Dr. Jelly's House](<Places/Dr. Jelly's House.md>) | 0 | stub | docs | Dr. Jelly's laboratory (GDD Potions and alchemy, M5; room type `laboratory`, templates `lab_*`, `world/jellyLooks.ts`). Image only. |
| [Gekiryu - Village of Endless Torrents of Water](<Places/Gekiryu - Village of Endless Torrents of Water.md>) | 0 | stub | docs | The idea source for M4.2's currents and waterfalls (`docs/ideas.md`, GDD Floors). Image only. |
| [Huruhui - City Concept](<Places/Huruhui - City Concept.md>) | 0 | stub | EDA copy (from Huruhui/Homeland) | Behind the Vigil's Cave Mouth, which fills in "as the Huruhui's cave cities do" (GDD Between runs, `vigil/unfoldLooks.ts`). |
| [Huruhui - Homeland Concept](<Places/Huruhui - Homeland Concept.md>) | 19 | stub | EDA copy (from Huruhui/Homeland) | Nothing directly. A map image and a link to the Homeland PDF (see [sources](<sources/Huruhui Homeland Summary-1.md>)). |
| [Huruhui Buildings - Housing Concept](<Places/Huruhui Buildings - Housing Concept.md>) | 39 | stub | EDA copy (from Huruhui/Homeland) | The Cave Mouth's houses and terraces (GDD Between runs), loosely. |
| [Huruhui Buildings - Leader Mansion Tree House Concept](<Places/Huruhui Buildings - Leader Mansion Tree House Concept.md>) | 0 | stub | EDA copy (from Huruhui/Homeland) | Nothing yet. |
| [Huruhui Buildings - Library Concept](<Places/Huruhui Buildings - Library Concept.md>) | 0 | stub | EDA copy (from Huruhui/Homeland) | Nothing yet. |
| [Ruins of Lukuku - Longwood](<Places/Ruins of Lukuku - Longwood.md>) | 0 | stub | docs | Nothing. `docs/ideas.md` offers it as a deeper floor's look. |
| [The Gate of Belregi](<Places/The Gate of Belregi.md>) | 733 | full | docs | The gate towards the valleys, "carved and bright" (GDD Vision, Setting). The drinking ward and its five Wardlings were taken from its barrier that absorbs spells (`docs/ideas.md`; GDD Magic, M4.2 step 3). The Heart of Belregi is still only an idea (`docs/ideas.md`). |
| [The Gate of Uzulim](<Places/The Gate of Uzulim.md>) | 871 | full | docs | The setting of the whole vault (GDD Vision, Open questions; `STR` title "Beneath the Gate of Uzulim"): the Wardens and their vault, watching statues (the hooded guardians), sapping obelisks (the ring of obelisks), the Twin Guardians, the Hollow Warden, Kaelith the Shadow Sentinel (the Seal, the final boss, the voice in the Vigil). |
| [The Swamps of Ulum](<Places/The Swamps of Ulum.md>) | 0 | stub | docs | Nothing. `docs/ideas.md` suggests it as the drowned floor's biome (M8). |
| [World Trees of Longwood](<Places/World Trees of Longwood.md>) | 0 | stub | docs | Named in GDD Vision as part of the world above. Image only. |

## Civilizations, countries, cultures

| Page | Words | State | Origin | What the game already uses |
| --- | ---: | --- | --- | --- |
| [Nomadic Cultures of Belerial](<Civilizations_Countries_Cultures/Nomadic Cultures of Belerial.md>) | 0 | stub | docs | The riders behind the Wandering Merchant. Images only. |
| [The Huruhui - Flower Attire Cave Dwellers](<Civilizations_Countries_Cultures/The Huruhui - Flower Attire Cave Dwellers.md>) | 1041 | full | docs; merged with EDA/Huruhui/The Huruhui - Forest Dwelling People.md | The world above the vault (GDD Vision): the Cave Mouth and the Vigil's cave cities, Verdant as the Huruhui's biomancy (GDD Magic), the overgrown garden, flower crowns and foragers in the Vigil. The Tarakus and Taliks are not in the game. |
| [The Source - Deity](<Civilizations_Countries_Cultures/The Source - Deity.md>) | 0 | stub | EDA copy (from Huruhui) | Nothing yet. |

## Creatures and animals

| Page | Words | State | Origin | What the game already uses |
| --- | ---: | --- | --- | --- |
| [Bird-Snail](<Creatures_Animals/Bird-Snail.md>) | 0 | stub | EDA copy (Animals) | Nothing yet. |
| [Casith - Evil Cat Spirits](<Creatures_Animals/Casith - Evil Cat Spirits.md>) | 0 | stub | EDA copy (Creatures) | Nothing yet. |
| [Creatures of the Longwood](<Creatures_Animals/Creatures of the Longwood.md>) | 0 | stub | docs | Nothing. Images only. |
| [Dragon Falcon - The Warrior](<Creatures_Animals/Dragon Falcon - The Warrior.md>) | 0 | stub | EDA copy (Animals) | Nothing yet. |
| [Fen-Nex - Fox Shapeshifter](<Creatures_Animals/Fen-Nex - Fox Shapeshifter.md>) | 9 | stub | docs | Fen-Nex, Asyrion's companion: the Rune Fox familiar and its full shape (GDD Artifacts; `combat/fennex.ts`, the Rune of Fen-Nex). Only the name's meaning is from the page. |
| [Kitsune - Fox Spirit](<Creatures_Animals/Kitsune - Fox Spirit.md>) | 195 | partial | EDA copy (Creatures) | Nothing directly. Related to Fen-Nex and Leron Lubilar (fox spirits). |
| [Little Fire - Fire Spirit](<Creatures_Animals/Little Fire - Fire Spirit.md>) | 0 | stub | EDA copy (Creatures) | Nothing yet. |
| [Living Seeds](<Creatures_Animals/Living Seeds.md>) | 170 | partial | EDA copy (Creatures) | Nothing yet. |
| [Object Mimics](<Creatures_Animals/Object Mimics.md>) | 92 | partial | EDA copy (Creatures) | Mimic foes: the Urn Mimic and the Grimoire Mimic (`mimic`, `tome` behaviours). The chest mimic is not built. |
| [Talik's - Birds of the Huruhui](<Creatures_Animals/Talik's - Birds of the Huruhui.md>) | 104 | partial | EDA copy (Animals) | Nothing yet. |
| [Taraku's - Carrying Birds of the Huruhui](<Creatures_Animals/Taraku's - Carrying Birds of the Huruhui.md>) | 75 | partial | EDA copy (Animals) | Nothing. The Tarakus Blessing Day PDF tells their festival. |
| [Thornwife & the Hollow Stag](<Creatures_Animals/Thornwife & the Hollow Stag.md>) | 387 | full | EDA copy (Animals) | Nothing yet. |
| [War-Tigers of Longwood](<Creatures_Animals/War-Tigers of Longwood.md>) | 0 | stub | docs | The War-Tiger boss (GDD Combat, M4.2 step 6; `actors/bosses.ts`). Image only. |
| [White Elk of Mirazul](<Creatures_Animals/White Elk of Mirazul.md>) | 67 | partial | EDA copy (Animals) | Nothing yet. |

## World

| Page | Words | State | Origin | What the game already uses |
| --- | ---: | --- | --- | --- |
| [Eda - The Planet Earth](<World/Eda - The Planet Earth.md>) | 115 | partial | EDA copy | The name Eda (GDD Vision). Nothing of the pantheon, the continent or the secular beliefs. |
| [The Shattering](<World/The Shattering.md>) | 22 | stub | EDA copy | Nothing yet. |

## Magic

| Page | Words | State | Origin | What the game already uses |
| --- | ---: | --- | --- | --- |
| [Magic](<Magic/Magic.md>) | 0 | stub | EDA copy | Nothing from the page (an empty template). The six schools are the GDD's own, with Verdant adopted from the Huruhui's biomancy. |

## Items

| Page | Words | State | Origin | What the game already uses |
| --- | ---: | --- | --- | --- |
| [Items - Book of Misspells](<Items/Items - Book of Misspells.md>) | 97 | partial | EDA copy | Nothing yet. |
| [Items - Bottled Death](<Items/Items - Bottled Death.md>) | 0 | stub | EDA copy | Nothing yet. |
| [Items - Dagger of Teleportation](<Items/Items - Dagger of Teleportation.md>) | 0 | stub | EDA copy | Nothing. |
| [Items - Dead Sea Scrolls](<Items/Items - Dead Sea Scrolls.md>) | 0 | stub | EDA copy | Nothing yet. |
| [Items - Firebreath Potion](<Items/Items - Firebreath Potion.md>) | 0 | stub | EDA copy | Nothing yet. |
| [Items - Flask of Life](<Items/Items - Flask of Life.md>) | 0 | stub | EDA copy | Nothing yet. |
| [Items - Kozyrev's Mirror](<Items/Items - Kozyrev's Mirror.md>) | 0 | stub | EDA copy | Nothing yet. |
| [Items - Pen of the Spellweaver](<Items/Items - Pen of the Spellweaver.md>) | 0 | stub | EDA copy | Nothing yet. |
| [Items - Sword of Destiny](<Items/Items - Sword of Destiny.md>) | 150 | partial | EDA copy | Nothing yet. |

## Gameplay notes

| Page | Words | State | Origin | What the game already uses |
| --- | ---: | --- | --- | --- |
| [Gameplay - Name Generator Website](<Gameplay/Gameplay - Name Generator Website.md>) | 1 | stub | EDA copy | A link only. |
| [Gameplay - Quotes on Loading Screens](<Gameplay/Gameplay - Quotes on Loading Screens.md>) | 88 | partial | EDA copy | Nothing. |
| [Gameplay - SCP Foundation InGame](<Gameplay/Gameplay - SCP Foundation InGame.md>) | 0 | stub | EDA copy | Nothing. An image only. |
| [Gameplay - Screenshots for marking Spots on the map](<Gameplay/Gameplay - Screenshots for marking Spots on the map.md>) | 47 | stub | EDA copy | Nothing. |
| [Gameplay - Spell Symbiosis](<Gameplay/Gameplay - Spell Symbiosis.md>) | 260 | partial | EDA copy | The idea is the game's reactions, weaves and chains (GDD M4.8 to M4.10); the page is a generic outline. |
| [Gameplay - World Map Mechanics](<Gameplay/Gameplay - World Map Mechanics.md>) | 88 | partial | EDA copy | Nothing. |

## Sources: the owner's PDFs

Text of the three PDFs in `inspiration/EDA/Huruhui/Documents/`, extracted with `pdftotext`, cleaned of page numbers and page breaks, tables rebuilt. The PDFs themselves are untouched.

| Page | Words | State | What the game already uses |
| --- | ---: | --- | --- |
| [Azyrion World Master Guide](<sources/Azyrion World Master Guide.md>) | 1934 | full | Eda as a world (Sumerian, Akkadian, Egyptian and Greek mythology; the Shattering), the Huruhui, the Drygefolk, the High Kingdom, magic and its rules, NPC and creature design with examples. Nothing yet: none of its peoples or the Empire is in the GDD. |
| [Huruhui Homeland Summary-1](<sources/Huruhui Homeland Summary-1.md>) | 1115 | full | Nothing yet: the four regions, landmarks and paths are not in the GDD (it names only the valleys and the cave cities). |
| [Azyrion_Tarakus_Blessing_Day_Pretty](<sources/Azyrion_Tarakus_Blessing_Day_Pretty.md>) | 421 | full | Nothing yet: a short scene of Azyrion's childhood in a Huruhui village. |
## Canon (the owner's answers)

Settled by the owner on 2026-10-12. Where these touch a contradiction below, they win.

1. **The `inspiration/EDA` story is canon.** Boketto is an outcast, found as a baby inside a pyramid. He holds
   fearsome magical power and can bend sand without spending much mana. The Huruhui storm-caller legend in
   `Characters/Boketto - The Storm Caller.md` is not Boketto's story.
2. **The hero is Azyrion.** The spelling Asyrion (in the GDD, the game's text and some pages) gives way to Azyrion.
3. **Magic is feared and outlawed in Eda**, as the Master Guide tells it (the Great Purge, the anti-magic laws, the
   hidden High Order). That is the owner's first idea for the game's world, and the story builds on it.

What follows from them for the game (renaming the hero, Boketto's role and look, a world where magic is outlawed) is
worked out in the story bible (`docs/RESET-plan.md`, R4); the GDD records it there.

## Contradictions and open points

Where two sources disagree, and what the GDD still asks. None of this is settled by this folder: the owner decides, and the GDD records it.

### Where the sources disagree

1. **Boketto is two people.** The page in `Characters/` (733 words) makes Boketto a Huruhui legend: born at a convergence of stars, the storm caller who ended the Great Drought, white hair and glowing sigils, who helped ward the Gate of Belregi and held the pass; told in the past tense, with "they". The note in `inspiration/EDA` and the Master Guide PDF make Boketto a Drygefolk outcast: found as a baby inside a pyramid, shunned for suspected magic, left the village at 14, about 18 when he meets Azyrion, calm near pyramids. The GDD follows the first (the Stormcaller look, a storm-teaching shade) and uses none of the second.
2. **Asyrion, Azyrion, Azrion.** The `docs` pages, the GDD and the game say Asyrion (the mage). The vault's tags, the three PDFs and `CLAUDE.md` say Azyrion, and every `docs` page links `[[Azrion Mother Node]]`. `CLAUDE.md` calls the owner Azyrion and the mage Asyrion. The PDFs treat Azyrion as the protagonist, a boy of a Huruhui village (his mother Ylani, Elder Kaien, the Tarakus Moro) whose "awakening threatens balance and Empire's control", and the Huruhui note says "Player is raised in a Huruhui village". The GDD's Asyrion is an apprentice who breaks into the Wardens' vault. Is it one character, and is the spelling the owner's or the hero's?
3. **Is magic outlawed?** The Master Guide's Eda has magic feared after the Shattering: the High Kingdom's Great Purge, anti-magic laws, secret testing of children, a hidden High Order, a Drygefolk taboo; the Huruhui keep only subtle nature magic. The Gate pages know none of that (they have the Huruhui council and the Wardens, who use "darker aspects of Huruhui magic"), and the game is a world of schools, grimoires, alchemists and shades. The GDD's open question "who teaches alchemy, and is it respected or forbidden?" depends on this.
4. **Who and where the Huruhui are.** "Flower Attire Cave Dwellers" (misty valleys, homes cut into cliffs, magical farming) against "Forest Dwelling People" (jungle and forest houses, valleys, forests and plains) against the Homeland PDF (valleys, steppe, mountains and cliffs in four named regions, with no Pass of Buluiain or gates) against the Longwood page (the Huruhui's home region is a long narrow forest between two strips of the "Mahjula (WIP NAME)" desert). The notes say the Huruhui "never appear as enemies", are "unconcerned about everything outside" and have no central rulers; the Uzulim Wardens are an order drawn from the Huruhui clans, led by a Shadow Sentinel, and the game's Hollow Warden is one of them.
5. **Kaelith.** The Uzulim page has a Shadow Sentinel named Kaelith who died casting the spell that banished a horde from the wilderness, and calls the Wardens' leader "the Shadow Sentinel" as a title. The GDD has Kaelith still down there as "the seal", a voice and a final boss, with the horde below the vault rather than outside the gate.
6. **Fen-Nex.** The page: Fen = fox, Nex = man, "Fox Shapeshifter" (the file name), with a cat-dragon image. The GDD: a rune fox familiar that grows into a beast "between fox, cat and dragon". The notes add Leron Lubilar, a fox-man chief with five tails, and the Kitsune (a tail for every hundred years, nine at most). Is Fen-Nex a person, a spirit or a beast?
7. **The Shattering.** `World/The Shattering.md`: the supercontinent split into landmasses divided by oceans. The Master Guide: the Shattering was magical devastation that made magic feared. Same event, no stated cause.
8. **Gods.** `World/Eda - The Planet Earth.md`: a pantheon of 12 to 13 gods almost forgotten, belief in the intangible seen as superstitious or almost evil. The Master Guide: an "imperial pantheon respected but largely secularized". The Huruhui: no gods but "the Source", whose page is empty and whose Source Spring is in the Homeland PDF. The game's rule (`CLAUDE.md`, lore cards) is to invent no gods.
9. **Spellings.** "Mispells" in the text of the Book of Misspells page, "Misspells" in its file name; "Gekiryu" on the page, "Gekiry" in its image prompts; "Assasin" in a file name; "Taraku", "Taraku's", "Tarakus"; "Esakki Raja Arumugam" and "Esakki Raja"; "Talik's" and "Taliks"; "Sequioa". Boketto is "they" in one page and "he" in the others.

### Provenance, to be sure what is canon

The Homeland PDF credits "ChatGPT" and "Hephaestus" with structuring and writing it, and "Azyrion" with direction and final authorship. The Gate, Boketto and Huruhui pages read in the same register, and several notes look like assistant output: the Thornwife page ends with an offer ("Would you like to explore this duo's place in a larger ecosystem?"), Living Seeds quotes two web pages, and Spell Symbiosis is a generic how-to. The index treats everything as the owner's until told otherwise.

### Open questions from the GDD ("Open questions and placeholders")

Still open (lore, not tech):
- Should artifacts come from Eda's factions or gods (one pool per faction)? The Master Guide offers factions (Huruhui, Drygefolk, the High Kingdom).
- Who teaches alchemy in Eda, and is it respected or forbidden? (Dr. Jelly is in the game; see point 3 above.)
- Should the disciplines be separate playable characters with their own models, or one mage with different loadouts?

Placeholder names waiting for Eda names (M8): the title "Ossuary" and floor 1's name; the old foes (Rotling, Wisp, Crypt hound); the Drowned Abbess and the Pyre Knight; the Ember Sigil; "Ordeal" and "Bone altar"; the coins (the idea is obols); the merchant (who trades with the dead in Eda). `CLAUDE.md` adds: the rest of the owner's names wait for M8. The unused place names are candidates for the floors' biomes (`docs/ideas.md`: the Swamps of Ulum, the Patagoi Atoll, Gekiryu, the Ruins of Lukuku).

Already answered in the GDD: the hero (Asyrion), the dungeon (the vault beneath the Gate of Uzulim, in the Pass of Buluiain), and the schools (they stay, and the Huruhui's biomancy adds Verdant).

One more, from the Uzulim page: the gate is "rarely opened, and only with the express permission of the Huruhui council". How Asyrion gets in is the GDD's "breaks in"; the lore does not say.

## Richest pages

The pages with the most usable story material for a mage who goes down into the vault beneath the Gate of Uzulim:

1. [The Gate of Uzulim](<Places/The Gate of Uzulim.md>): the setting itself. The Wardens' secret order in a fortress in the cliffs, the ring of obelisks that saps will, the hooded statues whose eyes follow you, the vault of artifacts taken from the wilderness, and Kaelith's sacrifice.
2. [The Gate of Belregi](<Places/The Gate of Belregi.md>): the bright twin at the other end of the pass, with its guardians, its High Warden, the Heart of Belregi that is said to command nature, and the battle where the storm swept the invaders away. What the gate keeps safe, and what the mage climbs back to.
3. [Azyrion World Master Guide](<sources/Azyrion World Master Guide.md>): the only source with a conflict that could drive a story: an Empire that outlaws magic, a Great Purge, a hidden High Order and academies that dull children's gifts. It explains why a mage would go down in secret. It also has example NPCs and creatures.
4. [Boketto - The Storm Caller](<Characters/Boketto - The Storm Caller.md>): a mentor with a sacrificial arc (three days on a peak, white hair, glowing sigils) and, in the other version, an outcast pyramid-guide with a hidden past. Both fit a shade the mage frees.
5. [The Huruhui](<Civilizations_Countries_Cultures/The Huruhui - Flower Attire Cave Dwellers.md>) with the [Homeland Summary](<sources/Huruhui Homeland Summary-1.md>): the world above, with named regions, landmarks, settlements and four sacred paths, council circles and the Source Spring. Material for what the Vigil's cave mouth looks out on.
6. [Thornwife & the Hollow Stag](<Creatures_Animals/Thornwife & the Hollow Stag.md>): a parasite that feeds on a broken soul and a stag that loses its memories, a revenant with an omen of death. It is a ready pattern for a hollowed guardian, such as a Warden who never came back up.
7. [Azyrion and the Tarakus Blessing Day](<sources/Azyrion_Tarakus_Blessing_Day_Pretty.md>): a gentle scene from a childhood in a Huruhui village (a mother, an elder, a bird partner), foreshadowing "his future connection to the Source". The warmth the dark floors can be set against.
8. [Leron Lubilar](<Characters/Leron Lubilar - Fierce and Proud Fox-Man.md>): a proud fox-man chief and shaman who changes shape and weaves illusions; an ally, rival or guide, and a link to Fen-Nex.
