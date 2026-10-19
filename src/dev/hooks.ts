/* `window.__game`: the dev and test hooks, kept in production builds so the deployed site can be tested too. The
   browser tests and the tools in tools/ drive the game through them; the dev menu does the same by buttons. */
import { kaelithInfo, kaelithToPhase, kneltAt, shutAllWards } from '../actors/kaelith';
import { daylightInfo, enterDaylight } from '../world/daylight';
import { exportSave, giveHome, importSave, veteranSave, vigil, wipeSave } from '../vigil/save';
import { POTION_IDS, type PotionId, type ReagentId } from '../items/alchemyData';
import {
  addPotion,
  addReagent,
  beltSlots,
  choosePotion,
  identify,
  knownPotion,
  moveInBelt,
  potionFx,
  usePotion,
} from '../items/potions';
import { throwsNow, flightsNow } from '../items/potionThrow';
import { forgetBrews } from '../items/alchemyMemory';
import { buyRecipe, jellyIdentifies, knownRecipes } from '../items/brewing';
import { DEV, G, player } from '../state';
import { camera, draw, renderer, setCloseUp } from '../render/renderer';
import { hero } from '../actors/hero';
import { givingNow, jellyGives, type Gift } from '../world/jellyGives';
import { arrowOrder, keys, padsNow } from '../input';
import { type RuneId } from '../magic/runeData';
import { carve, clearRunes, liftRune, runeOdds, setSockets } from '../magic/runes';
import { slotDef } from '../magic/cost';
import {
  dropsHere,
  forceKinds,
  objectsHere,
  rebuildFloor,
  showAssetsHere,
  showCoins,
  takeCoins,
  useAssets,
  wearFace,
} from './menu';
import { obolFace, obolFaces } from '../items/obolFace';
import type { Kinds } from '../world/kitData';
import { serpentInfo } from '../actors/jellySerpent';
import { breakOut, crackVat } from '../world/laboratory';
import { brewAtTable, closeLab, labNow, openLab, type LabTab } from '../ui/alchemyTable';
import {
  carveHere,
  closeWaystone,
  openWaystone,
  secondSocket,
  takeFromStone,
  waystoneNow,
  type StoneTab,
} from '../ui/waystone';
import { raiseWaystone } from '../world/waystone';
import { warePanelNow } from '../ui/warePanel';
import { renderHearts, roomFinished, updateVision } from '../ui/hud';
import { renderBelt } from '../notify';
import { bargainNow, openBargainHere } from '../world/bargain';
import { chooseFor, levelEsc, offerNow, openLevelUp, takeBargainCard } from '../ui/levelUp';
import { giveById, refreshStats } from '../items/artifacts';
import { removeArtifactGallery, showArtifactGallery } from './artifactGallery';
import { clearRoom, descend, startGame, wakeAtVigil, warp } from '../flow';
import { closeLectern, holdIn, lecternNow, openLectern } from '../ui/lectern';
import { board, openWayNow, vigilInfo } from '../vigil/place';
import { answerShade, bindIt, breakAllChains, freeIt, layShade, shadeInfo } from '../vigil/shades';
import { shadeHelpInfo, walkWith } from '../vigil/shadeHelp';
import { talkTo, townInfo } from '../vigil/town';
import { takeTownGallery, townGallery } from './townGallery';
import { bondTo, giftsInfo, givePower, questTo } from '../vigil/gifts';
import { chooseGarden, lightBlessing, unfoldInfo } from '../vigil/unfold';
import { disciplinesOpen } from '../vigil/giftData';
import { closeTalk, goOn, say, talkNow } from '../ui/talk';
import { forgetHeard, setFlag, setParts } from '../vigil/save';
import { gainInsight, insightNow, setLevel } from '../progression/insight';
import { pointsToSpend, spendPoint } from '../progression/points';
import { boonsNow, dealNow, takeBoon } from '../progression/boons';
import { boonsActed, boonsSaid } from '../progression/boonHooks';
import { setOffBoon } from './boonTest';
import type { Attr } from '../progression/attributes';
import { STEP, step } from '../loop';
import { FLOORS, planToText } from '../world/generate';
import { CFG } from '../config';
import { damageEnemy } from '../combat/damage';
import { DROPS, type Drop, type Resource, type Soul } from '../items/loot';
import { gainSoul, hallowedMend } from '../items/souls';
import { giveResources, spawnPickup } from '../items/pickups';
import { openSecretRoom } from '../world/secret';
import { cleanseAtOnce, riteState } from '../world/shrine';
import { type SpellStatus, type StatusKind } from '../magic/spellData';
import { inflict, pollenNow } from '../magic/statusFx';
import { makeEnemy, spawnFoe } from '../actors/enemies';
import { attuneTo, castSpell, learnSpell } from '../magic/spells';
import { mantleLeft, wardLeft } from '../magic/shapes';
import { mothCount, saltCircle } from '../combat/familiars';
import { fxShowing } from '../magic/spellFx';
import { answerPage, dropPage } from '../magic/pages';
import { pagePanelSpell } from '../ui/pagePanel';
import { fireAt, poolsDo } from '../world/pools';
import { spawnShot } from '../combat/projectiles';
import { lightLevels } from '../render/lights';
import { dress, heldNow, robeTint, takeAllOff, tryOn, wornDetail, wornNow } from '../actors/costume';
import { clearTransforms, formTransform } from '../items/transforms';
import { blinkRest } from '../items/gifts';
import { arcHeld, arcNow } from '../items/arc';
import { marksNow } from '../actors/spellMarks';
import type { TransformId } from '../items/transformData';
import { placeProp } from '../world/props';
import { assetList, assetsOn } from '../assets/models';
import { scatterOf } from '../world/themes';
import { drawnRows, gradeNow, pixelLook, setPixelLook, type PixelLook, fineLayerDrawn } from '../render/pixelLook';
import { removeModelOptions, showBestiary, showBossLooks, showJellyLooks } from './modelGallery';
import { removeEffectOptions, showEffectOptions } from './effectOptions';
import { elementDev, sapMul } from '../world/mechanisms';
import { wardFoe } from '../actors/wardShield';
import { callWanderer, wandererState } from '../items/wanderer';
import { dragonInfo } from '../actors/pillarDragon';
import { fennexInfo, growFennex } from '../combat/fennex';
import { fullness, mostDrunk } from '../magic/drinking';
import {
  findEveryReaction,
  findEveryWeave,
  forgetKnowledge,
  forgetReactions,
  forgetWeaves,
  knowledgeNow,
  reactionsFound,
  setStage,
  weavesFound,
} from '../magic/memory';
import { WEAVE_IDS, type WeaveId } from '../magic/weaves';
import { setOffWeave } from './weaveTest';
import { REACTION_IDS, type Stage } from '../magic/knowledge';
import { setOffReaction } from './reactionTest';
import type { Reaction } from '../magic/status';
import type { PropKind } from '../world/propData';
import { type FoeType, type School } from '../actors/foeData';
import { bestiary, forgetBestiary } from '../actors/bestiary';
import { findEveryCounter } from '../actors/counters';
import { burningGround, sparkGround } from '../actors/foes';
import { lookContract } from '../actors/fantasyLooks';
import { groundCount, groundDrawn } from '../actors/bestiaryGround';
import { blastAt } from '../combat/glyphs';
import { inSteam, steamAt, steamCount } from '../magic/steam';
import type { MantleId } from '../actors/mantleData';
import { groundPace, layDevGround } from '../actors/foeGround';
import { AudioDirector, type Forced } from '../audio/director';
import { creaturesNow, roarNow, showCreature, takeCreatures } from './creatureGallery';
import { freeSpotNear } from '../world/rooms';
import { renderAudio, type RenderAsk } from '../audio/render';
import { SOUND_FILES, preloadSamples } from '../audio/samples';
import type { PairTable } from '../actors/foeData';

/** Each floor's pair chance as the data has it, kept while `pairsAlways` raises it. */
const pairChance = new Map<PairTable, number>();

/** Dev and test hooks. Kept in production builds so the deployed site can be tested too. */
export function installHooks() {
  window.__game = {
    get state() {
      return G.flow.state;
    },
    player,
    get enemies() {
      return G.room.enemies;
    },
    get current() {
      return G.room.current;
    },
    get seed() {
      return G.run.seed;
    },
    get floor() {
      return G.run.floor;
    },
    get run() {
      return G.run;
    },
    get bolts() {
      return G.room.bolts;
    },
    rooms: () => G.floor.rooms,
    startGame,
    hero,
    camera,
    keys,
    arrowOrder,
    warp,
    descend,
    clearRoom,
    /** Insight and levels: the insight gained, the level, the level choices waiting, insight to the next level; gain
        some (it runs to the hand as a fallen foe's does) or set the level. */
    get insight() {
      return insightNow();
    },
    get level() {
      return G.run.level;
    },
    giveInsight: (n: number) => gainInsight(n),
    setLevel: (n: number) => setLevel(n),
    /** The points spent on each attribute and those left to spend; spend one (a level's point, or `free`). */
    get attrs() {
      return { ...G.run.attrs, free: pointsToSpend() };
    },
    spend: (attr: Attr, free = false) => spendPoint(attr, free),
    /** The boons taken (each one's rank), the pledge and the casts by school; deal three as a level would; take one. */
    /** Each slot's socket (its spell, size and runes, and the spell as they make it), the pouch, and which runes
        have acted (`acted`, counted) and said their line (`said`). */
    get sockets() {
      return {
        slots: player.sockets.map((k, i) => {
          const d = slotDef(i);
          return {
            spell: player.spells[i],
            size: k.size,
            runes: [...k.runes],
            def: d && {
              mana: d.mana,
              cooldown: d.cooldown,
              damage: d.damage,
              params: { ...d.params },
              status: { ...d.status },
            },
          };
        }),
        pouch: [...player.runes],
        acted: Object.fromEntries(Object.entries(G.run.acted).filter(([k]) => k.startsWith('rune:'))),
        said: [...G.run.hinted].filter((k) => k.startsWith('rune:')),
      };
    },
    /** Carve rune `id` into slot `slot` (null: why not), or empty the socket (`id` null); `size` opens a second socket. */
    socket: (slot: number, id: RuneId | null, size?: number) => {
      if (size) setSockets(slot, size);
      if (!id) {
        clearRunes(slot);
        return null;
      }
      return carve(slot, id);
    },
    get boons() {
      return {
        taken: boonsNow(),
        pledge: G.run.pledge,
        casts: { ...G.run.casts },
        acted: boonsActed(),
        said: boonsSaid(),
      };
    },
    deal: () => dealNow(),
    giveBoon: (id: string) => takeBoon(id),
    /** A school boon taken if need be and set off ahead (the dev menu's "Boons here"); `acted` above counts each
        boon at work this run, `said` the names risen in this room. */
    boonHere: (id: string) => setOffBoon(id),
    /** The level-up screen: what it offers (open, phase, the level, its cards); open it now; choose for a level
        (card i, then attribute a: the screen's or, closed, as `?autolevel` does); levels choose for themselves. */
    get offer() {
      return offerNow();
    },
    openLevelUp: () => openLevelUp(),
    chooseLevel: (i = 0, a?: Attr) => chooseFor(i, a),
    set autoLevel(how: false | 'choose' | 'skip') {
      DEV.autoLevel = how;
    },
    get autoLevel() {
      return DEV.autoLevel;
    },
    /** The current floor as text: S start, B boss, T treasure, # normal, @ you. */
    map() {
      return G.run.plan ? planToText(G.run.plan, G.room.current.plan.id) : '';
    },
    /** Run the simulation for `sec` seconds in fixed steps; optionally render once afterwards. */
    sim(sec: number, render = false) {
      for (let t = 0; t < sec; t += STEP) step(STEP);
      if (render) {
        draw();
        updateVision();
      }
    },
    draw() {
      draw();
      updateVision();
    },
    /** The made assets (data/assets.json): whether they are used, and each one's status; turn them on or off
        (this floor is built again to compare). */
    get assets() {
      return { on: assetsOn(), list: assetList().map((a) => ({ ...a })) };
    },
    useAssets: (on: boolean) => useAssets(on),
    /** The kinds of wall, floor, wall light and brazier the room the mage is in drew (the room kit's variety). */
    get kinds() {
      return { ...G.room.current.look.kinds };
    },
    /** Force kinds on every room of this floor, e.g. forceKinds({ wall: 'ashlar' }) ({} to draw per room again); built again. */
    forceKinds: (k: Partial<Kinds>) => forceKinds(k),
    /** The pixel look: its grid ('texel', rows of pixels, or 0 for off), outlines, light in bands; set any of them. */
    get pixelLook() {
      return { ...pixelLook() };
    },
    /** The pixel look's grade in force (the floor's `grade` in data/floors.json): shadow colour, amount and lift. */
    get grade() {
      return gradeNow();
    },
    /** The rows of game pixels the pixel look drew in the last frame (at the texel: the view's height in texels). */
    get pixelRows() {
      return drawnRows();
    },
    /** Every artifact floating ahead of the mage, as the room kit builds them (the dev menu's artifact gallery); how many;
        and taken away again. */
    artifactGallery: () => showArtifactGallery(G.room.current, player.x, player.z),
    takeArtifactGallery: () => removeArtifactGallery(G.room.current),
    /** Take the bosses, the bestiary and Dr. Jelly stood by the galleries below away again. */
    takeModelOptions: () => removeModelOptions(G.room.current),
    /** Stand the bestiary's candidates (every one, or those named) ahead of the mage, in rows by kind. */
    bestiaryOptions: (ids?: string[]) => showBestiary(G.room.current, player.x, player.z, ids),
    /** The bosses built in code (the Hollow Warden's looks, and floors 4 and 5's): stand them ahead of the mage; the look the Warden wears in its fight, and choosing it. */
    bossLooks: (ids?: string[]) => showBossLooks(G.room.current, player.x, player.z, ids),
    /** For each fantasy look: the parts its foe's behaviour moves that the look lacks, and whether its parts are known. */
    lookContract: () => lookContract(),
    /** Dr. Jelly (the plague doctor): stood ahead of the mage giving, a gift handed over in this laboratory,
        and what he is giving now. */
    jellyLooks: () => showJellyLooks(G.room.current, player.x, player.z),
    jellyGive: (gift: Gift) => jellyGives(gift),
    get giving() {
      return givingNow();
    },
    /** Spell effect options (looks only): play them (or those named) ahead of the mage; take them away again. */
    effectOptions: (ids?: string[]) => showEffectOptions(G.room.current, player.x, player.z, ids),
    takeEffectOptions: () => removeEffectOptions(G.room.current),
    setPixelLook: (change: Partial<PixelLook>) => setPixelLook(change),
    /** Ahead of the mage: a plain and a sealed urn, and an artifact on a pedestal (one with a made model if any). */
    showAssets: () => showAssetsHere(),
    /** The coin face the obols wear, every face they can wear, wearing another, and all side by side. */
    get obolFace() {
      return obolFace();
    },
    get obolFaces() {
      return obolFaces();
    },
    wearFace: (id: string) => wearFace(id),
    coinGallery: () => showCoins(),
    takeCoinGallery: () => takeCoins(),
    /** Whether the pixel look's fine layer (the coins' finer pixel) drew anything in the last frame. */
    get fineLayerDrawn() {
      return fineLayerDrawn();
    },
    /** Every object and pile, and two urns, in rows ahead of the mage (the dev menu's "Objects here"). */
    objectsHere: () => objectsHere(),
    /** What the room's scatter put down, by kind (a theme's, or a plain room's from its floor's `scatter`). */
    get scatterHere() {
      return scatterOf(G.room.current);
    },
    dropsHere: () => dropsHere(),
    /** The soundscapes and the music (docs/archive/sound-plan.md): what plays; turned on (the browser tests start with it off);
        forced to a floor's soundscape, a room's, a piece and mood; a stretch of any rendered offline, as a base64 WAV. */
    get audio() {
      return AudioDirector.info;
    },
    audioOn: (v = true) => AudioDirector.set(v),
    forceAudio: (f: Forced | null) => AudioDirector.force(f),
    renderAudio: async (ask: RenderAsk) => {
      const r = await renderAudio(ask);
      let bin = '';
      const u8 = new Uint8Array(r.wav);
      for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      return { wav: btoa(bin), seconds: r.seconds, peak: r.peak, rms: r.rms };
    },
    /** Creatures made in Tripo and animated in code (docs/creatures.md): stand one ahead of the mage (resolves once it
        stands), what stands, a roar now, and all taken away. */
    showCreature: async (id = 'owlbear', side = CFG.creatures.standSide) => {
      const at = freeSpotNear(G.room.current, player.x + side, player.z + CFG.creatures.standSouth);
      await showCreature(id, G.room.current, at.x, at.z);
      return creaturesNow();
    },
    get creatures() {
      return creaturesNow();
    },
    roarNow: () => roarNow(),
    takeCreatures: () => takeCreatures(G.room.current),
    // the sounds played from files (data/sounds.json), each loaded and decoded: its seconds, or null where it failed
    soundFiles: async () => {
      const ctx = new OfflineAudioContext(1, 44100, 44100),
        names = Object.keys(SOUND_FILES);
      const b = await Promise.all(names.map((n) => preloadSamples(ctx, [n])));
      return Object.fromEntries(names.map((n, i) => [n, b[i].map((x) => x && +x.duration.toFixed(2))]));
    },
    /** What the last frame cost the GPU (draw calls, triangles) and what is held in memory (geometries, textures). */
    renderInfo: () => ({
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    }),
    lightLevels,
    /** Give the mage artifacts by id, e.g. give('bone_lens', 'twin_staff'). */
    give: (...ids: string[]) => giveById(ids),
    /** Hand out obols, keys or glyphs, e.g. loot({ glyphs: 3 }). */
    loot: (v: Partial<Record<Resource, number>>) => giveResources(v),
    /** Drop a pickup (halfHeart, heart, coin, purse, key, glyph, mana, the soul motes paleSoul, blackSoul and
        hallowedSoul, shard, coffer, chest) at (x, z), or just ahead of the mage; a chest is plain unless `gilded` is set; `asLoot` drops it as loot would (a mana vial turns into an
        obol while the mage knows no spell). */
    drop(
      kind: Drop,
      x = player.x,
      z = player.z - 1.5,
      opts: { gilded?: boolean; asLoot?: boolean; potion?: PotionId; reagent?: ReagentId; rune?: RuneId } = {},
    ) {
      if (!DROPS.includes(kind)) throw new Error(`drop: use one of ${DROPS.join(', ')}`);
      spawnPickup(kind, x, z, {
        gilded: opts.gilded ?? false,
        asIs: !opts.asLoot,
        potion: opts.potion,
        reagent: opts.reagent,
        rune: opts.rune,
      });
    },
    /** The soul motes held, in the order taken; give one (false when as many are kept as can be); a floor's end
        for the hallowed ones (the half hearts they gave back). */
    get souls() {
      return [...player.souls];
    },
    soul: (kind: Soul) => gainSoul(kind),
    hallowedMend: () => hallowedMend(),
    /** Break open every cracked wall of this floor's secret room. */
    openSecret() {
      const r = G.floor.rooms.find((x) => x.type === 'secret');
      if (r) openSecretRoom(r);
      return !!r;
    },
    /** Learn a spell into a slot (0 or 1); cast the spell in a slot, as if its key were pressed (optionally
        aiming); read or set mana. */
    learn: (id: string, slot?: number) => learnSpell(id, slot, true),
    cast: (slot: number, aim?: { x: number; z: number }) =>
      answerShade(slot) || answerPage(slot) || castSpell(slot, aim ?? null),
    mana(v?: number) {
      if (v !== undefined) player.mana = Math.min(player.stats.maxMana, Math.max(0, v));
      return player.mana;
    },
    /** Spell knowledge: every spell's stage; bring one to a stage; forget everything (kept between runs). */
    get knowledge() {
      return knowledgeNow();
    },
    know: (id: string, stage: Stage) => setStage(id, stage),
    forgetKnowledge: () => forgetKnowledge(),
    /** The reactions found (codex, kept between runs); find them all or forget them; set one off on dummies ahead. */
    get reactions() {
      return [...reactionsFound()];
    },
    findReactions: () => findEveryReaction(REACTION_IDS),
    forgetReactions: () => forgetReactions(),
    reaction: (r: Reaction, x = player.x, z = player.z - 3) =>
      setOffReaction(r, x, z).map((d) => G.room.enemies.indexOf(d)),
    /** The weaves and chains found (kept between runs); find them all or forget them; set one up ahead of the mage. */
    get weaves() {
      return [...weavesFound()];
    },
    findWeaves: () => findEveryWeave(WEAVE_IDS),
    forgetWeaves: () => forgetWeaves(),
    weave: (id: WeaveId) => setOffWeave(id),
    /** The spell whose panel shows over a page near the mage, and the panel's text. */
    get pagePanel() {
      return {
        spell: pagePanelSpell(),
        text: document.getElementById('pagePanel')?.classList.contains('on')
          ? document.getElementById('pagePanel')!.textContent
          : '',
      };
    },
    /** Spawn a foe (e.g. 'dummy', the training dummy) at (x, z), or ahead of the mage; put statuses on every
        foe in the room, e.g. inflict({ burn: 3 }). */
    spawn(kind: FoeType, x = player.x, z = player.z - 2.5) {
      return spawnFoe(kind, x, z, 1);
    }, // (a swarm comes whole)
    champion(kind: FoeType, mantle?: MantleId, x = player.x, z = player.z - 2.5) {
      return makeEnemy(kind, x, z, 1, undefined, { champion: true, mantle });
    }, // (a champion, in a mantle if named)
    layGround(
      kind: 'web' | 'ink' | 'rime' | 'blackice' | 'fire' | 'spark' | 'spores',
      x: number,
      z: number,
      by?: string,
    ) {
      layDevGround(kind, x, z, by);
    }, // (ground left by a foe of kind `by`)
    foeGround(i: number) {
      const e = G.room.enemies[i];
      return e && { pace: groundPace(e), at: e.inGround, slide: !!e.slide };
    }, // (what the ground under foe i does to it)
    /** Strike the room's foe `i` for `dmg`, of `school` if given (its weakness and resistance count). */
    hit: (i: number, dmg: number, school?: School, by: 'spell' | 'cantrip' = 'spell', dx = 0, dz = 0) => {
      const e = G.room.enemies[i];
      if (e) damageEnemy(e, dmg, dx, dz, 0, by, school);
      return e?.hp;
    }, // (dx, dz: the way the blow travels)
    /** What the mage has found of the foes, kept between runs; forget it all. */
    get bestiary() {
      return bestiary();
    },
    forgetBestiary: () => forgetBestiary(),
    findCounters: () => findEveryCounter(), // (every counter found)
    /** Patches of ground a salamander has set burning in this room. */
    get burningGround() {
      return burningGround();
    },
    get sparkGround() {
      return sparkGround();
    },
    get pollen() {
      return pollenNow();
    }, // (Pollen Spark's clouds in the room)
    get steam() {
      return steamCount();
    },
    steamAt(x: number, z: number) {
      steamAt(x, z);
    },
    inSteam(x: number, z: number) {
      return inSteam(x, z);
    }, // (Steam's clouds in the room)
    /** The webs, ink and rime on the floor of the current room; a glyph's blast at (x, z). */
    get ground() {
      return {
        web: groundCount('web'),
        ink: groundCount('ink'),
        rime: groundCount('rime'),
        blackice: groundCount('blackice'),
        blackiceDrawn: groundDrawn('blackice'),
      };
    },
    blast: (x: number, z: number) => blastAt(x, z),
    /** The simulation's clock (seconds), against which timed states are kept (a lark's song). */
    get clock() {
      return G.flow.clock;
    },
    inflict(status: Partial<Record<SpellStatus, number>>) {
      for (const e of G.room.enemies) inflict(e, status);
    },
    /** Fire a foe's shot from (x, z) along (dx, dz) (a wall of ice stops it); seconds of the Static Mantle and of
        Wardlight left. */
    shoot(x: number, z: number, dx: number, dz: number, o: Parameters<typeof spawnShot>[8] = {}) {
      const l = Math.hypot(dx, dz) || 1;
      spawnShot(x, z, dx / l, dz / l, CFG.afflict.testShot, 0xb784ff, 0.8, undefined, o);
    }, // (o: what the shot carries, `{ hex: 8 }`)
    get mantle() {
      return mantleLeft();
    },
    get ward() {
      return wardLeft();
    },
    /** The Salt Circle lying round the mage: where, and how long; null when none. */
    get salt() {
      return saltCircle();
    },
    /** The spells' looks showing now: the Cinder Lance, and how many rings of light and bolts of lightning. */
    get spellFx() {
      return fxShowing();
    },
    /** Drop a grimoire page (of `id`, or a spell the mage doesn't know) at (x, z) or ahead of the mage; the pages
        in the room; the spells given up this run. */
    page(id?: string, x = player.x, z = player.z - 1.5) {
      return dropPage(G.room.current, x, z, id)?.spell ?? null;
    },
    get pages() {
      return G.room.current.pages ?? [];
    },
    get forgotten() {
      return G.run.forgotten;
    },
    /** The water and oil in the room: kind, state, its tiles' centres. */
    get pools() {
      return (G.room.current.pools ?? []).map((p) => ({
        kind: p.kind,
        state: p.state,
        t: p.t,
        mud: !!p.mud,
        tiles: p.tiles.map((t) => ({ x: t.x, z: t.z })),
      }));
    },
    /** Set the room's oil alight, freeze its water, or shock it (as the dev menu does). */
    pool: (what: 'fire' | 'frost' | 'shock') => poolsDo(what),
    /** Cleanse the oldest curse held at once (no fight, no obols); the shrine's rite under way, if any. */
    cleanse: () => cleanseAtOnce(),
    get rite() {
      return riteState();
    },
    get pickups() {
      return G.room.pickups;
    },
    get glyphs() {
      return G.room.glyphs;
    },
    get shots() {
      return G.room.shots;
    },
    /** Put one of the rooms' objects down at (x, z) (on free floor), e.g. prop('cask'); the objects in the room. */
    prop(kind: PropKind, x = player.x, z = player.z - 1.5) {
      return !!placeProp(kind, x, z);
    },
    get props() {
      return (G.room.current.props ?? []).map((b) => ({
        kind: b.prop.kind,
        x: b.x,
        z: b.z,
        burning: b.prop.burning,
        hits: b.prop.hits,
        lit: !!b.prop.lit,
        school: b.prop.school ?? null,
        cd: b.prop.cd ?? 0,
        charge: b.prop.charge ?? 0,
        blind: b.prop.blind ?? 0,
        aiming: !!b.prop.aim,
        ward: b.prop.ward ?? null,
        broken: !!b.prop.broken,
        open: b.prop.open ?? 0,
        black: !!b.prop.black,
        sown: !!b.prop.sown,
      }));
    }, // (open: sluice; black: brazier; sown: Seedfall)
    /** Whether the mage stands in a sapping obelisk's field (what the cantrip's blows are worth there). */
    get sap() {
      return sapMul();
    },
    /** The drinking wards: every vault's on the floor (sealed or not, how full, what it drank most, the vault's
        warden) and every warded foe's; `wardFoe(i)` wards the i-th foe. */
    get wards() {
      const seals = [...new Set(G.floor.rooms.flatMap((r) => r.doors.map((d) => d.seal)).filter((s) => !!s))];
      return {
        vaults: seals.map((s) => ({
          sealed: s.sealed,
          fill: fullness(s.drink),
          top: s.drink.total ? mostDrunk(s.drink) : null,
          guard: s.vault.waves?.[0]?.[0]?.kind ?? null,
        })),
        foes: G.room.enemies
          .filter((e) => e.ward && !e.dead)
          .map((e) => ({ type: e.type, fill: fullness(e.ward!.drink), top: mostDrunk(e.ward!.drink) })),
      };
    },
    wardFoe(i: number) {
      const e = G.room.enemies[i];
      if (e) wardFoe(e);
      return !!e?.ward;
    },
    /** The way the room's water runs (n, s, e, w or none) and how many waterfalls feed it. */
    get flow() {
      return { dir: G.room.current.flow ?? null, falls: G.room.current.falls?.length ?? 0 };
    },
    /** The Wandering Merchant rides into this room (`callWanderer()`), and whether the merchant is here, the wares out, and what. */
    callWanderer() {
      callWanderer();
    },
    get wanderer() {
      return wandererState();
    },
    /** The Pillar Dragon's pillars, whether it is on one, how high its head is, and whether the pillars it raised are up. */
    get dragon() {
      return dragonInfo();
    },
    get kaelith() {
      return kaelithInfo();
    },
    get kaelithKnelt() {
      return kneltAt;
    },
    kaelithToPhase,
    shutAllWards, // (Kaelith's fight)
    get daylight() {
      return daylightInfo();
    },
    daylightNow: () => enterDaylight(), // (a won run's dawn)
    get vigil() {
      return JSON.parse(JSON.stringify(vigil())) as ReturnType<typeof vigil>;
    },
    giveHome,
    wipeSave,
    veteranSave,
    exportSave,
    importSave, // (the save)
    /** The Vigil as a place: where the mage is in it, the candles, the lectern's screen and hands, the boat; wake
        there (for the first time: dark, its candle lighting), put a spell in a hand at the lectern, take the boat down. */
    get vigilPlace() {
      return {
        ...vigilInfo(),
        lectern: { ...('lectern' in vigilInfo() ? (vigilInfo() as { lectern: object }).lectern : {}), ...lecternNow() },
      };
    },
    /** Chained shades: the floor's (where it lies, its chains, its state); one chained ahead of the mage; its chains
        broken; freed or bound; a shade walking with the mage this run (its help) and what the helps have done. */
    get shade() {
      return shadeInfo();
    },
    shadeHere: (id: string) => {
      const p = freeSpotNear(G.room.current, player.x, player.z - 1.6);
      layShade(id, G.room.current, p.x, p.z);
    },
    breakChains: () => breakAllChains(),
    freeShade: () => freeIt(),
    bindShade: () => bindIt(),
    walkWith: (id: string) => walkWith(id),
    get shadeHelp() {
      return shadeHelpInfo();
    },
    /** The townspeople: who stands where (each one's glint), the lines heard and the flags; one talks (at the
        last run's moment, or the one given), the panel's state, go on, take a choice, set or clear a flag, forget the lines;
        the ten in a row for review. */
    get town() {
      return townInfo();
    },
    talkTo: (id: string, moment?: 'death' | 'won' | 'boss' | null) => talkTo(id, moment),
    get talkNow() {
      return talkNow();
    },
    talkOn: () => goOn(),
    say: (i: number) => say(i),
    closeTalk,
    setFlag: (k: string, v?: string | number | boolean) => setFlag(k, v),
    forgetHeard,
    townGallery: (ids?: string[]) => townGallery(player.x, player.z, ids),
    takeTownGallery,
    /** Gifts, bonds and powers: each townsperson's bond, power and quest, the powers owned, what a descent begins
        with, the disciplines open; a power given or taken, a bond set, a quest given or done (or forgotten: null). */
    get gifts() {
      return { ...giftsInfo(), disciplines: disciplinesOpen(vigil().freed) };
    },
    givePower: (id: string, owned = true) => {
      givePower(id, owned);
      refreshStats(false);
    },
    bondTo,
    questTo,
    /** The unfolding: the parts opened, the candle lit, the garden's reagent, what the Cave Mouth holds, the chapel's
        candles and the garden's beds; a way opened at once (at the Vigil, there and then), every way closed (or opened) again,
        a candle lit (or none), the garden's reagent chosen. */
    get unfold() {
      return unfoldInfo();
    },
    openPart: (school: School) => openWayNow(school),
    setParts: (schools: string[]) => setParts(schools),
    lightBlessing: (id: string | null) => lightBlessing(id),
    chooseGarden: (id: ReagentId | null) => chooseGarden(id),
    toVigil: (first = false) => wakeAtVigil(first),
    lecternChoose: (hand: number, id: string | null) => holdIn(hand, id),
    openLectern,
    closeLectern,
    takeBoat: () => board(),
    /** Fen-Nex (its stage, where it is, whether it hunts), and growing it a stage. */
    get fennex() {
      return fennexInfo();
    },
    growFennex() {
      growFennex();
    },
    /** Fire, frost or shock landing at (x, z), as a spell's would: lights braziers and candles, charges rune stones,
        sets lodestones leaping. */
    element: (kind: StatusKind | 'sanct' | 'hex', x = player.x, z = player.z - 1.5) => elementDev(kind, x, z),
    get spores() {
      return (G.room.current.spores ?? []).length;
    },
    /** Fire reaches (x, z) and `r` round it, as a burning bolt or a blast would: oil, roots, briars, webs, spores. */
    burn(x: number, z: number, r = 0) {
      fireAt(x, z, r);
    },
    /** The costume pieces the mage wears (a hood, from the Pilgrim's Cowl; an artifact's id for one carried at a spot),
        and the focus held in the casting hand; try a piece on as if held, or take all off. */
    get costume() {
      return wornNow();
    },
    get costumeDetail() {
      return wornDetail();
    },
    get held() {
      return heldNow();
    },
    wear: (id: string) => tryOn(id),
    takeAllOff: () => takeAllOff(),
    closeUp: (on = true) => setCloseUp(on),
    /** The run's transformations, the latest last; form one at once, or undo them all; the blink's rest; how far the
        robes are tinted. */
    get transforms() {
      return [...G.run.transforms];
    },
    transform: (id: TransformId) => formTransform(id),
    clearTransforms: () => clearTransforms(),
    /** Spell marks: what the slotted spells and the knowledge show on the mage; attune to a school (both its spells
        in the slots). */
    get spellMarks() {
      return marksNow();
    },
    attune: (school: School) => attuneTo(school),
    // the potion belt (ids, the chosen one), what each potion is (known or not, its bottle), what a drink left on the
    // mage, what is in the air; give, use and choose as the keys do
    get belt() {
      return {
        ids: [...player.belt],
        at: player.beltAt,
        slots: beltSlots(),
        known: player.belt.map((id) => knownPotion(id as PotionId)),
        reagents: { ...player.reagents },
        html: document.getElementById('belt')?.innerHTML ?? '',
      };
    },
    get potionFx() {
      return { ...potionFx, remedy: G.run.remedy, scale: hero.root.scale.x };
    },
    get bottles() {
      return G.run.bottles;
    },
    get throws() {
      return throwsNow();
    },
    get flights() {
      return flightsNow();
    },
    givePotion: (id: PotionId) => addPotion(id),
    giveReagent: (id: ReagentId, n = 1) => addReagent(id, n),
    usePotion: (how: 'drink' | 'throw') => usePotion(how),
    choosePotion: (d: number) => choosePotion(d),
    /** The waystone in this room (where, how far risen, kindled, rested, its pair, the slot it carves into, and
        its screen), raised ahead of the mage (`raiseWaystone`, kindled at once), its screen opened or closed, the pair
        taken, a rune carved from the pouch or lifted out, Second Socket's socket opened, the belt reordered. */
    // the shrine's bargain: its stone (state, school, runes' colour), its deal opened on a school, a card taken
    // (the heart paid), or backed out of
    get bargain() {
      return bargainNow();
    },
    set heartsPaid(n: number) {
      player.heartsPaid = n;
      refreshStats();
      renderHearts();
    },
    openBargain: (s: School) => openBargainHere(s),
    takeBargain: (i = 0) => takeBargainCard(i),
    refuseBargain: () => levelEsc(),
    get waystone() {
      const w = G.room.current.waystone;
      return w
        ? {
            x: w.x,
            z: w.z,
            rise: w.rise,
            lit: w.lit,
            rested: w.rested,
            pair: w.pair && [...w.pair],
            target: w.target,
            screen: waystoneNow(),
          }
        : null;
    },
    raiseWaystone: (x = player.x, z = player.z - 2.2) => {
      const w = raiseWaystone(G.room.current, x, z);
      w.rise = Math.max(w.rise, 0.999);
      return true;
    },
    openWaystone: (tab: StoneTab = 'runes', slot?: number) => openWaystone(tab, slot),
    closeWaystone: () => closeWaystone(),
    stoneTake: (i: number) => takeFromStone(i),
    stoneCarve: (slot: number, id: RuneId) => carveHere(id, slot),
    stoneLift: (slot: number, id: RuneId) => liftRune(slot, id),
    stoneSocket: (slot: number) => secondSocket(slot),
    moveInBelt: (from: number, to: number) => moveInBelt(from, to),
    reagentsAlways: (on: boolean) => {
      DEV.reagents = on;
    },
    /** A rune wherever one can lie (`DEV.runes`; this floor built again, so a shop restocks), and the chance of
        each here (times the floor's `runes`). */
    runesAlways: (on: boolean) => {
      DEV.runes = on;
      rebuildFloor();
    },
    /** Every chance the run's drop stream rolls comes up (`G.run.drops`, until a new run makes a new one), the stream
        still drawn as it would be: for a test of what a drop is, not of how often it falls. */
    dropsAlways: (on: boolean) => {
      const drops = G.run.drops;
      if (on)
        drops.chance = (p: number) => {
          drops.next();
          return p > 0;
        };
      else Reflect.deleteProperty(drops, 'chance'); // (the stream's own again)
    },
    /** Every fight of this floor that can roll a pair rolls one (the floor's pair chance at 1; this floor built again).
     *  It changes the shared FLOORS table until turned off, so a test that turns it on turns it off or ends its page. */
    pairsAlways: (on: boolean) => {
      const table = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].pairs;
      if (!table) return;
      pairChance.set(table, pairChance.get(table) ?? table.chance);
      table.chance = on ? 1 : pairChance.get(table)!;
      rebuildFloor();
    },
    get runeOdds() {
      return {
        merchant: runeOdds('merchant'),
        secret: runeOdds('secret'),
        wanderer: runeOdds('wanderer'),
        gilded: runeOdds('gilded'),
      };
    },
    // Dr. Jelly's laboratory: the table's screen (open, tab, mortar), the room's table and Dr. Jelly, the recipes
    // known; open or close the table, brew two reagents at it, buy a recipe, have Dr. Jelly look at a potion
    get lab() {
      const l = G.room.current.lab;
      return {
        ...labNow(),
        here: !!l,
        table: l && { ...l.table },
        jelly: l && { x: l.jelly.x, z: l.jelly.z },
        identified: l?.identified ?? false,
        recipes: knownRecipes(),
      };
    },
    openLab: (t: LabTab = 'brew') => openLab(t),
    closeLab: () => closeLab(),
    // the jelly serpent: its state, whether it is under, where, its trap, and the jelly in the room (tiles, frozen);
    // the vat's cracks and whether it is broken; crack the vat window as a bolt does, or let the serpent out at once
    get serpent() {
      const l = G.room.current.lab;
      return {
        ...serpentInfo(),
        run: G.run.serpent,
        restless: G.run.restless,
        cracks: l?.cracks ?? 0,
        broken: l?.broken ?? false,
      };
    },
    crackVat: () => crackVat(),
    breakVat: () => !!breakOut(),
    set restless(on: boolean) {
      G.run.restless = on;
    },
    /** Whether a trapdoor lies open on this floor (a floor's boss fell; the serpent out of its vat leaves none). */
    get trapdoor() {
      return !!G.floor.trapdoor;
    },
    /** Where the trapdoor lies (world x, z) and the room it is in (the waystone room's, or the boss room's). */
    get wayDown() {
      const t = G.floor.trapdoor;
      return (
        t && {
          x: t.x,
          z: t.z,
          kind: t.kind ?? 'trapdoor',
          room:
            G.floor.rooms.find(
              (r) => t.x >= r.bounds.minX && t.x <= r.bounds.maxX && t.z >= r.bounds.minZ && t.z <= r.bounds.maxZ,
            )?.type ?? null,
        }
      );
    },
    /** The gamepads the browser reports (name, layout, buttons held, sticks), as the dev menu's Gamepads shows them. */
    get pads() {
      return padsNow();
    },
    /** The ware whose panel shows over it: its name, and whether he would refuse it now. */
    get warePanel() {
      return warePanelNow();
    },
    /** The rooms the minimap marks finished: been in, the fight won, nothing left to take. */
    get finished() {
      return G.floor.rooms.filter((r) => roomFinished(r)).map((r) => r.plan.id);
    },
    brew: (a: ReagentId, b: ReagentId) => brewAtTable(a, b),
    buyRecipe: (id: PotionId) => buyRecipe(id),
    jellyIdentifies: (id: PotionId) => jellyIdentifies(id),
    identifyAll: () => {
      for (const id of POTION_IDS) identify(id);
    },
    forgetPotions: () => {
      G.run.identified.length = 0;
      forgetBrews();
      renderBelt();
    },
    get blinkRest() {
      return blinkRest();
    },
    get robeTint() {
      return robeTint();
    },
    get moths() {
      return mothCount();
    },
    /** Azyrion's arc: the stage now, the artifacts that count, the stage reached this run; force a stage (or `undefined`
        for as held). */
    get arc() {
      return { stage: arcNow(), held: arcHeld(), reached: G.run.arc };
    },
    setArc: (n?: number) => {
      DEV.arc = n;
      dress();
    },
  };
}
