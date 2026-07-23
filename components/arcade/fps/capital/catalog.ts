/**
 * THE 100-SHIP CAPITAL CATALOG — the STARSHELL "Star Destroyer" roster, hand-derived from
 * Gabe's five reference sheets (StarDestroyerDesign1-5, 20 ships each). Names + taglines
 * are reused VERBATIM from the sheets; each is assigned one of the ~11 silhouette families
 * (`hull`) + a mood accent so it reads distinct in the procedural model.
 *
 * Deterministic + baked (no API), mirroring the weapon `generated.json` bake: length /
 * engines / turrets / bays / bridge / body come from a stable per-index `rollCapitalDNA`
 * seed, and the identity fields (name / DNA / family / accent / lore) are pinned per entry.
 * `buildCapital(spec, tier)` renders any of these directly.
 */
import { ACCENT_BY_DNA, CLASS_BY_DNA, type CapitalDNAType, type HullShape, rollCapitalDNA } from './dna';
import type { CapitalSpec } from './spec';

// mood accents (match the sheets' backlit glows)
const RED = 0xff3a48;
const EMBER = 0xff7a2a;
const AMBER = 0xffc24a;
const GREEN = 0x63ff84;
const BLUE = 0x49a6ff;
const CYAN = 0x7fe8ff;
const PURPLE = 0xb15cff;
const VIOLET = 0x9d5cff;

/** [name, tagline, primary DNA, secondary DNA, silhouette family, accent] */
type Row = [string, string, CapitalDNAType, CapitalDNAType, HullShape, number];

const ROWS: Row[] = [
  // ── Sheet 1 — "20 STAR DESTROYERS · STARSHELL" ───────────────────────────────
  ['Dread Harbinger', 'The Prison Shadow.', 'heavyIndustrial', 'executionVessel', 'dreadnought', RED],
  ['Silent Sepulcher', 'The Tomb Below.', 'executionVessel', 'voidFortress', 'obelisk', AMBER],
  ['Void Reaver', 'The Mad Wave Maze.', 'gravaticManipulator', 'voidFortress', 'ring', PURPLE],
  ['Iron Oblivion', 'The Hammer of Futility.', 'heavyIndustrial', 'mobileFactory', 'dreadnought', EMBER],
  ['Eternal Judge', 'The Court of None.', 'executionVessel', 'machineCathedral', 'obelisk', RED],
  ['Night Suffocator', 'The Light Eater.', 'voidFortress', 'gravaticManipulator', 'sphere', VIOLET],
  ['Ash Prophet', 'The Omen of Ending.', 'machineCathedral', 'executionVessel', 'cathedral', AMBER],
  ['Grave Anchor', 'The World Pit.', 'gravaticManipulator', 'heavyIndustrial', 'trident', PURPLE],
  ['Soul Drainer', 'The Hollow King.', 'livingFortress', 'voidFortress', 'biomech', GREEN],
  ['Black Colossus', 'The Endless Wall.', 'heavyIndustrial', 'mobileFactory', 'dreadnought', EMBER],
  ['Starfell', 'The Morgue Above.', 'deepSpaceHunter', 'orbitalSiege', 'dagger', BLUE],
  ['Bone Citadel', 'The Fortress of Corpses.', 'livingFortress', 'machineCathedral', 'biomech', GREEN],
  ['Oblivion Spear', 'The Point of No Return.', 'orbitalSiege', 'deepSpaceHunter', 'dagger', AMBER],
  ['The Unmaker', 'The End Before the Fall.', 'voidFortress', 'gravaticManipulator', 'ring', VIOLET],
  ['Dusk Devourer', 'The Twilight Grave.', 'livingFortress', 'voidFortress', 'biomech', EMBER],
  ['Primordial Tyrant', 'The Ambient Above.', 'heavyIndustrial', 'livingFortress', 'dreadnought', AMBER],
  ['Nothingbringer', 'The Great Unmake.', 'gravaticManipulator', 'voidFortress', 'ring', PURPLE],
  ['System Reaper', 'The Cleaver.', 'executionVessel', 'orbitalSiege', 'dagger', RED],
  ['The Great Stillness', 'The Lord of Motion.', 'machineCathedral', 'voidFortress', 'obelisk', CYAN],
  ['World Breaker', 'The Last Word.', 'heavyIndustrial', 'mobileFactory', 'dreadnought', RED],
  // ── Sheet 2 — "20 STAR DESTROYERS. 20 NIGHTMARES." ───────────────────────────
  ["Harrow's Maw", 'The Devourer of Hope.', 'livingFortress', 'voidFortress', 'biomech', RED],
  ['Eclipse Monolith', 'The Light Killer.', 'voidFortress', 'gravaticManipulator', 'ring', VIOLET],
  ['Oblivion Lance', 'The Spear at Finality.', 'orbitalSiege', 'deepSpaceHunter', 'dagger', AMBER],
  ['Thresher Titan', 'The Harvest Engine.', 'mobileFactory', 'heavyIndustrial', 'catamaran', AMBER],
  ['Void Cathedral', 'The Church of Nothing.', 'machineCathedral', 'voidFortress', 'cathedral', PURPLE],
  ['Omega Bulwark', 'The Wall That Ends Worlds.', 'heavyIndustrial', 'mobileFactory', 'dreadnought', EMBER],
  ['Requiem Atlantis', 'The Drowned Empire.', 'carrier', 'machineCathedral', 'catamaran', CYAN],
  ['Caustic Judgment', 'The Purifier.', 'livingFortress', 'mobileFactory', 'biomech', GREEN],
  ['Ashen Revenant', 'The Undying.', 'livingFortress', 'voidFortress', 'biomech', AMBER],
  ['Crown of Vorax', 'The Fallen God.', 'machineCathedral', 'executionVessel', 'cathedral', PURPLE],
  ['Perdition Core', 'The Meltdown Driver.', 'mobileFactory', 'heavyIndustrial', 'sphere', EMBER],
  ['Gravaton Anchor', 'The Weight of the End.', 'gravaticManipulator', 'heavyIndustrial', 'trident', VIOLET],
  ['Nightfall Sentinel', 'The Perpetual Guard.', 'deepSpaceHunter', 'machineCathedral', 'spine', BLUE],
  ['Dread Harbinger', 'The First Signal.', 'orbitalSiege', 'executionVessel', 'dagger', RED],
  ['Singularity Behemoth', 'The Collapse Engine.', 'gravaticManipulator', 'voidFortress', 'ring', PURPLE],
  ['Nemesis Atlas', 'The World-Breaker.', 'heavyIndustrial', 'mobileFactory', 'dreadnought', EMBER],
  ['Halcyon Abyss', 'The False Dawn.', 'voidFortress', 'gravaticManipulator', 'sphere', CYAN],
  ['Umbra Titanis', 'The Shadow Made Flesh.', 'livingFortress', 'voidFortress', 'biomech', VIOLET],
  ['Warship Colossus', 'The Endless Armada.', 'carrier', 'heavyIndustrial', 'carrier', AMBER],
  ['The Unmaking', 'The Final Erasure.', 'gravaticManipulator', 'voidFortress', 'ring', VIOLET],
  // ── Sheet 3 — "20 STAR DESTROYERS. 20 ENDINGS." ──────────────────────────────
  ['Malevolence Class', "It doesn't chase. It swallows.", 'heavyIndustrial', 'voidFortress', 'dreadnought', RED],
  ['Silent Pharaoh', 'Older than your language.', 'executionVessel', 'machineCathedral', 'obelisk', AMBER],
  ["Oblivion's Gate", 'It is not a ship. It is an event.', 'gravaticManipulator', 'voidFortress', 'ring', VIOLET],
  ['Necrolord Dreadnaught', 'Built from dead worlds.', 'livingFortress', 'heavyIndustrial', 'dreadnought', GREEN],
  ['Eclipse Reaper', "When it blocks the sun, you've understood your place.", 'voidFortress', 'gravaticManipulator', 'ring', PURPLE],
  ['Void Anvil', 'It forges silence.', 'mobileFactory', 'heavyIndustrial', 'dreadnought', EMBER],
  ['Nightmare Bastion', 'A fortress that holds the dark.', 'machineCathedral', 'voidFortress', 'cathedral', PURPLE],
  ['The Unspeakable', 'No one knows where it came from.', 'livingFortress', 'gravaticManipulator', 'biomech', GREEN],
  ['Gravity Maelstrom', 'It bends space around itself.', 'gravaticManipulator', 'voidFortress', 'ring', VIOLET],
  ['Empyrean Scourge', "It doesn't cleanse planets. It unbuilds them.", 'executionVessel', 'orbitalSiege', 'dagger', AMBER],
  ['Ashen Dominion', 'It leaves nothing but tremors and regret.', 'heavyIndustrial', 'livingFortress', 'dreadnought', AMBER],
  ['Chorus of Ending', 'Its engines sing the last hymn.', 'machineCathedral', 'carrier', 'spine', CYAN],
  ['The Long Night', 'It brings the age after war.', 'voidFortress', 'executionVessel', 'obelisk', VIOLET],
  ['Starveil Titan', 'It feeds on light, hope, and time. Equally.', 'gravaticManipulator', 'livingFortress', 'sphere', PURPLE],
  ['The Unraveler', 'It unmakes reality. Thread by thread.', 'gravaticManipulator', 'voidFortress', 'ring', VIOLET],
  ['Doom Harbor', 'Every ship that enters never leaves.', 'carrier', 'voidFortress', 'carrier', CYAN],
  ['Abyssal Lancer', 'It is the tip of something much larger.', 'orbitalSiege', 'deepSpaceHunter', 'dagger', BLUE],
  ['The World-Reject', 'Killed by its own kind. Now it carves worlds.', 'executionVessel', 'livingFortress', 'dagger', RED],
  ['Terminus Judge', 'It does not negotiate. It executes.', 'executionVessel', 'heavyIndustrial', 'obelisk', RED],
  ['The Final Horizon', 'It is when it stops. Then it comes after you.', 'voidFortress', 'gravaticManipulator', 'ring', VIOLET],
  // ── Sheet 4 — "20 STAR DESTROYERS. 20 APOCALYPSES." ──────────────────────────
  ['The Devourer', 'It hungers each time. Never full.', 'livingFortress', 'mobileFactory', 'dreadnought', RED],
  ["Oblivion's Hand", 'It reaches in. It grasps.', 'gravaticManipulator', 'livingFortress', 'biomech', VIOLET],
  ['The World Reaper', 'Civilizations end in its wake.', 'executionVessel', 'heavyIndustrial', 'dreadnought', RED],
  ['The Silent King', 'It never speaks. It simply arrives.', 'executionVessel', 'machineCathedral', 'obelisk', AMBER],
  ['The Night Blade', 'It cuts across the dark. It carves the wound.', 'deepSpaceHunter', 'orbitalSiege', 'dagger', BLUE],
  ['Dread Ascendant', 'It rises. Everything falls.', 'machineCathedral', 'voidFortress', 'cathedral', PURPLE],
  ['The Void Crown', 'It wears greatness at cost.', 'machineCathedral', 'executionVessel', 'cathedral', VIOLET],
  ['Eternal Hunger', 'Time bends to its appetites.', 'gravaticManipulator', 'livingFortress', 'sphere', GREEN],
  ['Soul Harvester', 'It collects. Souls are its currency.', 'livingFortress', 'voidFortress', 'biomech', GREEN],
  ["Omega's Anvil", 'Worlds are hammered. Reality is reforged.', 'mobileFactory', 'heavyIndustrial', 'dreadnought', EMBER],
  ['The Great Unmaker', 'It unravels what others built.', 'gravaticManipulator', 'voidFortress', 'ring', VIOLET],
  ['The Ash Mother', 'She leaves only ash.', 'livingFortress', 'mobileFactory', 'biomech', EMBER],
  ['Doom Conflux', 'All paths lead to ruin.', 'gravaticManipulator', 'machineCathedral', 'ring', PURPLE],
  ['The Gravebinder', 'It binds worlds to its will. Escape is forgotten.', 'gravaticManipulator', 'heavyIndustrial', 'trident', VIOLET],
  ['Starfall Titan', 'It pulls stars from the sky and drowns them.', 'gravaticManipulator', 'voidFortress', 'sphere', PURPLE],
  ['The Cradle of Nothing', 'Before time. Before light. It waited.', 'voidFortress', 'gravaticManipulator', 'ring', VIOLET],
  ['Black Sun Forge', 'It forges annihilation.', 'mobileFactory', 'voidFortress', 'ring', EMBER],
  ['The Final Verdict', 'It judges. There is only silence.', 'executionVessel', 'machineCathedral', 'obelisk', RED],
  ['Abyssal Monarch', 'From beyond the dark. It commands the end.', 'voidFortress', 'livingFortress', 'biomech', VIOLET],
  ['The All-Ending', 'It is the end of a world.', 'heavyIndustrial', 'voidFortress', 'dreadnought', RED],
  // ── Sheet 5 — "20 STAR DESTROYERS. 20 WAYS THE WORLD ENDS." ──────────────────
  ['The Inquisitor', "It doesn't orbit. It watches.", 'deepSpaceHunter', 'executionVessel', 'dagger', BLUE],
  ['Parasite', 'It attaches. Then it becomes part of you.', 'livingFortress', 'gravaticManipulator', 'biomech', GREEN],
  ['The Unspeakable', 'Form was a mistake. This is the correction.', 'executionVessel', 'voidFortress', 'obelisk', RED],
  ['Grave of Stars', 'It carries galaxies to their funerals.', 'carrier', 'gravaticManipulator', 'carrier', PURPLE],
  ['The Harrower', "It doesn't fire weapons. It causes wars.", 'deepSpaceHunter', 'orbitalSiege', 'dagger', BLUE],
  ["Oblivion's Lung", 'It breathes in worlds. You are the sin.', 'livingFortress', 'voidFortress', 'sphere', GREEN],
  ['The Guillotine', 'One cut. Countless ends.', 'orbitalSiege', 'executionVessel', 'dagger', RED],
  ['Maelstrom Heart', 'It is not a ship. It is a wound.', 'gravaticManipulator', 'voidFortress', 'sphere', VIOLET],
  ['The Silent Tower', 'It never moves. You move to it.', 'executionVessel', 'machineCathedral', 'obelisk', AMBER],
  ['The Devouring Mirror', 'It shows you the end. Then erases it.', 'gravaticManipulator', 'voidFortress', 'ring', CYAN],
  ['Nexus of Null', 'Reality folds where it goes.', 'gravaticManipulator', 'machineCathedral', 'ring', VIOLET],
  ['The Shepherd', 'It gathers ends. Like livestock.', 'carrier', 'voidFortress', 'carrier', CYAN],
  ['The World Crusher', 'Simple. Effective. Final.', 'heavyIndustrial', 'mobileFactory', 'slab', EMBER],
  ['Eclipse Monarch', 'It blots out more than light.', 'voidFortress', 'gravaticManipulator', 'ring', PURPLE],
  ['The Bone Ship', 'Built from what it kills.', 'livingFortress', 'executionVessel', 'biomech', AMBER],
  ['The Void Whale', 'It swims in nothing.', 'livingFortress', 'gravaticManipulator', 'sphere', BLUE],
  ['The Hive Mother', 'A trillion ships. One will.', 'livingFortress', 'carrier', 'biomech', GREEN],
  ['The Dark Horizon', 'Always just beyond survival.', 'carrier', 'deepSpaceHunter', 'carrier', CYAN],
  ['The False Dawn', 'It brings light. Then takes everything.', 'gravaticManipulator', 'machineCathedral', 'sphere', AMBER],
  ['The Endless Pyre', "It burns forever. So you can't.", 'mobileFactory', 'livingFortress', 'dreadnought', EMBER],
];

/** The baked 100-ship roster as ready-to-build CapitalSpecs. */
export const CAPITAL_CATALOG: CapitalSpec[] = ROWS.map(([name, tag, primary, secondary, hull, accent], i) => {
  const base = rollCapitalDNA(1009 + i * 7); // stable per-index variety for length/counts/scatter
  return {
    ...base,
    primary,
    secondary,
    hull,
    name,
    classification: CLASS_BY_DNA[primary],
    accent: accent || ACCENT_BY_DNA[primary],
    lore: tag,
    whyUnique: tag,
  };
});
