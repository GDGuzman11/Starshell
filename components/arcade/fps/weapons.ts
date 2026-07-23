/**
 * Player gun arsenal — across the rifle / MG / laser / sniper / pistol families,
 * each with its own feel (auto vs semi, fire rate, damage, mag, reload, ADS
 * zoom, tracer colour). Hitscan. The loadout is 2 primaries + 1 sidearm; the
 * full 20-weapon pool + selection screen + gold shop build on top of this.
 */
export type Family = 'rifle' | 'mg' | 'laser' | 'sniper' | 'pistol' | 'launcher';

// OUTLANDER weapon taxonomy (from the reference sheets). CATEGORY = the sheet type;
// SECTION = the loadout slot it fills; TIER = free (starter) / premium / store.
export type WeaponCategory = 'assault' | 'alienAssault' | 'mg' | 'sniper' | 'rpg' | 'handgun';
export type WeaponSection = 'primary' | 'heavy' | 'secondary';
export type WeaponTier = 'free' | 'premium';
// A premium gun's thematic ON-HIT effect, so it does what its name/description says.
export type WeaponTrait = 'burn' | 'cryo' | 'shock' | 'void';

/** Derive a premium gun's trait from keywords in its name + tagline (free guns get none). */
export function deriveTrait(name: string, tagline = ''): WeaponTrait | undefined {
  const s = `${name} ${tagline}`.toLowerCase();
  if (/burn|fire|inferno|dragon|solar|flare|phoenix|ember|pyre|magma|molten|blaze|scorch|hell/.test(s)) return 'burn';
  if (/cryo|glacier|frost|\bice\b|frozen|winter|arctic|\bcold\b|glacial/.test(s)) return 'cryo';
  if (/storm|shock|thunder|tesla|lightning|\bvolt|\bemp\b|electric|arc\b/.test(s)) return 'shock';
  if (/void|gravity|graviton|singularity|abyss|maelstrom|vortex|black\s?star|oblivion|null/.test(s)) return 'void';
  return undefined;
}

/** Which loadout SECTION each category fills. */
export const CATEGORY_SECTION: Record<WeaponCategory, WeaponSection> = {
  assault: 'primary',
  alienAssault: 'primary',
  mg: 'primary',
  sniper: 'heavy',
  rpg: 'heavy',
  handgun: 'secondary',
};
/** Which mechanical FAMILY (fire feel / audio / combat) each category maps to. */
export const CATEGORY_FAMILY: Record<WeaponCategory, Family> = {
  assault: 'rifle',
  alienAssault: 'rifle',
  mg: 'mg',
  sniper: 'sniper',
  rpg: 'launcher',
  handgun: 'pistol',
};
/** Human-readable category labels (store / loadout headers). */
export const CATEGORY_LABEL: Record<WeaponCategory, string> = {
  assault: 'Assault Rifle',
  alienAssault: 'Alien Assault Rifle',
  mg: 'Machine Gun',
  sniper: 'Sniper Rifle',
  rpg: 'RPG',
  handgun: 'Handgun',
};
export const SECTION_LABEL: Record<WeaponSection, string> = { primary: 'Primary', heavy: 'Heavy', secondary: 'Secondary' };

export interface GunDef {
  id: string;
  name: string;
  family: Family;
  category: WeaponCategory; // the reference-sheet type
  section: WeaponSection; // loadout slot (derived from category)
  tier: WeaponTier; // free starter vs premium
  owner: string; // whom the weapon belongs to (Store grouping) — 'outlander' for now
  dmg: number;
  rate: number; // seconds between shots
  mag: number;
  reserve: number;
  reload: number;
  auto: boolean; // hold-to-fire vs one-per-click
  scoped: boolean; // sniper scope overlay on ADS
  hipFov: number;
  adsFov: number;
  color: number; // tracer + muzzle-flash + gun-light colour (from the sheet art)
  caliber?: string; // flavour, from the sheet
  tagline?: string; // flavour, from the sheet
  trait?: WeaponTrait; // premium thematic on-hit effect (burn / cryo / shock / void)
  splash?: number; // explosive AoE radius (launchers); 0/undefined = hitscan single-target
  burst?: number; // fires an N-round burst per trigger pull
  heat?: boolean; // energy weapon: no reload — builds heat + overheats instead
  charge?: number; // seconds to hold before the shot releases (snipers / heavy)
}

/** Compact starter row → expanded GunDef (fills family/section from the category). */
type Starter = {
  id: string;
  name: string;
  category: WeaponCategory;
  tier: WeaponTier;
  dmg: number;
  rate: number;
  mag: number;
  reserve: number;
  reload: number;
  auto: boolean;
  hipFov: number;
  adsFov: number;
  color: number;
  caliber?: string;
  tagline?: string;
  splash?: number;
  charge?: number;
  scoped?: boolean;
};
function starter(s: Starter): GunDef {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    section: CATEGORY_SECTION[s.category],
    family: CATEGORY_FAMILY[s.category],
    tier: s.tier,
    owner: 'outlander',
    dmg: s.dmg,
    rate: s.rate,
    mag: s.mag,
    reserve: s.reserve,
    reload: s.reload,
    auto: s.auto,
    scoped: s.scoped ?? s.category === 'sniper',
    hipFov: s.hipFov,
    adsFov: s.adsFov,
    color: s.color,
    caliber: s.caliber,
    tagline: s.tagline,
    // Premium guns get a thematic on-hit trait so they DO what the description says.
    ...(s.tier === 'premium' ? { trait: deriveTrait(s.name, s.tagline) } : {}),
    ...(s.splash != null ? { splash: s.splash } : {}),
    ...(s.charge != null ? { charge: s.charge } : {}),
  };
}

// ── OUTLANDER STARTERS — 10 weapons available immediately (5 free + 5 premium) ──
// Colours are pulled from the reference sheets so the muzzle flash + gun lights match.
const STARTERS: GunDef[] = [
  // FREE (5) — a complete loadout on their own: 2 primary, 2 heavy, 1 secondary.
  starter({ id: 'aurora7', name: 'AURORA-7', category: 'assault', tier: 'free', dmg: 34, rate: 0.11, mag: 32, reserve: 224, reload: 1.6, auto: true, hipFov: 78, adsFov: 56, color: 0x8fbaff, caliber: '5.56×45mm', tagline: 'Light. Precise. Deadly.' }),
  starter({ id: 'm12vindicator', name: 'M-12 VINDICATOR', category: 'mg', tier: 'free', dmg: 24, rate: 0.07, mag: 60, reserve: 360, reload: 2.3, auto: true, hipFov: 82, adsFov: 66, color: 0x9fc0e0, caliber: '7.62mm', tagline: 'Reliable. Rugged. Ruthless.' }),
  starter({ id: 'vanguardsr1', name: 'VANGUARD SR-1', category: 'sniper', tier: 'free', dmg: 220, rate: 1.5, mag: 6, reserve: 36, reload: 2.4, auto: false, hipFov: 78, adsFov: 24, color: 0x9ec8ff, caliber: '.338 Lapua', tagline: 'Built for extreme distances.' }),
  starter({ id: 'm57punisher', name: 'M-57 PUNISHER', category: 'rpg', tier: 'free', dmg: 200, rate: 1.3, mag: 4, reserve: 16, reload: 2.6, auto: false, hipFov: 78, adsFov: 60, color: 0xffb04a, caliber: '90mm HEAT', tagline: 'Anti-armor devastation.', splash: 6 }),
  starter({ id: 'm7defender', name: 'M-7 DEFENDER', category: 'handgun', tier: 'free', dmg: 38, rate: 0.2, mag: 15, reserve: 105, reload: 1.1, auto: false, hipFov: 78, adsFov: 60, color: 0xaecbff, caliber: '9mm Kinetic', tagline: 'Always at your side.' }),
  // PREMIUM (5) — a tier up, mirroring the free set section-for-section.
  starter({ id: 'celestialaegis', name: 'CELESTIAL AEGIS', category: 'assault', tier: 'premium', dmg: 42, rate: 0.1, mag: 36, reserve: 252, reload: 1.5, auto: true, hipFov: 78, adsFov: 55, color: 0xffd27a, caliber: '6.8mm', tagline: 'Divine protection.' }),
  starter({ id: 'typhonmg3', name: 'TYPHON MG-3', category: 'mg', tier: 'premium', dmg: 27, rate: 0.06, mag: 75, reserve: 450, reload: 2.2, auto: true, hipFov: 82, adsFov: 66, color: 0x7fbfff, caliber: '7.62mm', tagline: 'Built for storms.' }),
  starter({ id: 'celestiallance', name: 'CELESTIAL LANCE', category: 'sniper', tier: 'premium', dmg: 320, rate: 1.3, mag: 5, reserve: 35, reload: 2.5, auto: false, hipFov: 78, adsFov: 22, color: 0xcfe8ff, caliber: 'Energy Core', tagline: 'Light of Olympus.' }),
  starter({ id: 'voidstormm10', name: 'VOIDSTORM M-10', category: 'rpg', tier: 'premium', dmg: 300, rate: 1.6, mag: 3, reserve: 12, reload: 2.9, auto: false, hipFov: 78, adsFov: 58, color: 0xb15cff, caliber: 'Void Energy', tagline: 'The void answers.', splash: 7.5 }),
  starter({ id: 'pulsefirem9', name: 'PULSEFIRE M9', category: 'handgun', tier: 'premium', dmg: 30, rate: 0.12, mag: 20, reserve: 140, reload: 1.2, auto: true, hipFov: 80, adsFov: 62, color: 0xc08bff, caliber: '9mm Energy', tagline: 'Never cools down.' }),
];

// ── STORE ROSTER — buyable weapons beyond the starters (grows toward the full sheets).
// Free-tier (from the non-premium sheets) → bought with GOLD; premium-tier → AstroDiamonds.
function assaultGun(id: string, name: string, color: number, caliber: string, tagline: string, dmg = 36, rate = 0.11): GunDef {
  return starter({ id, name, category: 'assault', tier: 'free', dmg, rate, mag: 30, reserve: 210, reload: 1.6, auto: true, hipFov: 78, adsFov: 56, color, caliber, tagline });
}
function mgGun(id: string, name: string, color: number, caliber: string, tagline: string, dmg = 24, rate = 0.07, mag = 60): GunDef {
  return starter({ id, name, category: 'mg', tier: 'free', dmg, rate, mag, reserve: mag * 6, reload: 2.4, auto: true, hipFov: 82, adsFov: 66, color, caliber, tagline });
}
function sniperGun(id: string, name: string, color: number, caliber: string, tagline: string, dmg = 200, rate = 1.4): GunDef {
  // Bolt-action: single click + a 1.3-1.6s cycle, no hold-to-charge.
  return starter({ id, name, category: 'sniper', tier: 'free', dmg, rate, mag: 6, reserve: 36, reload: 2.5, auto: false, hipFov: 78, adsFov: 24, color, caliber, tagline });
}
function rpgGun(id: string, name: string, color: number, caliber: string, tagline: string, dmg = 200, splash = 6): GunDef {
  return starter({ id, name, category: 'rpg', tier: 'free', dmg, rate: 1.4, mag: 4, reserve: 16, reload: 2.7, auto: false, hipFov: 78, adsFov: 60, color, caliber, tagline, splash });
}
function alienGun(id: string, name: string, color: number, tagline: string, dmg = 38, rate = 0.11): GunDef {
  return starter({ id, name, category: 'alienAssault', tier: 'free', dmg, rate, mag: 32, reserve: 224, reload: 1.7, auto: true, hipFov: 78, adsFov: 56, color, caliber: 'Xeno-tech', tagline });
}
function handgunGun(id: string, name: string, color: number, caliber: string, tagline: string, dmg = 40, rate = 0.2, mag = 15, auto = false): GunDef {
  return starter({ id, name, category: 'handgun', tier: 'free', dmg, rate, mag, reserve: mag * 7, reload: 1.2, auto, hipFov: 78, adsFov: 60, color, caliber, tagline });
}
// PREMIUM helper — tier 'premium' → Astro-priced + auto on-hit trait + rich animated flair.
function premAssault(id: string, name: string, color: number, tagline: string, dmg = 44, rate = 0.1): GunDef {
  return starter({ id, name, category: 'assault', tier: 'premium', dmg, rate, mag: 36, reserve: 252, reload: 1.5, auto: true, hipFov: 78, adsFov: 55, color, caliber: '6.8mm', tagline });
}
function premSniper(id: string, name: string, color: number, tagline: string, dmg = 300, rate = 1.4): GunDef {
  return starter({ id, name, category: 'sniper', tier: 'premium', dmg, rate, mag: 5, reserve: 35, reload: 2.5, auto: false, hipFov: 78, adsFov: 22, color, caliber: 'Energy Core', tagline });
}
function premRPG(id: string, name: string, color: number, tagline: string, dmg = 300, splash = 7.5): GunDef {
  return starter({ id, name, category: 'rpg', tier: 'premium', dmg, rate: 1.6, mag: 3, reserve: 12, reload: 2.9, auto: false, hipFov: 78, adsFov: 58, color, caliber: 'Prime', tagline, splash });
}
function premAlien(id: string, name: string, color: number, tagline: string, dmg = 46, rate = 0.1): GunDef {
  return starter({ id, name, category: 'alienAssault', tier: 'premium', dmg, rate, mag: 36, reserve: 252, reload: 1.6, auto: true, hipFov: 78, adsFov: 55, color, caliber: 'Xeno-Prime', tagline });
}

export const STORE_GUNS: GunDef[] = [
  // FREE ASSAULT RIFLES — "20 Space Assault Rifles // Human Design" sheet (02-20; AURORA-7 is a starter).
  assaultGun('nebulacarbine', 'NEBULA CARBINE', 0x5fe0d0, '5.56×45mm', 'Adapt. Overcome. Survive.', 34, 0.1),
  assaultGun('pulsarvx9', 'PULSAR-VX9', 0x9fe8ff, '8.6×43mm SPC', 'Energy conduit. Hyper velocity.', 38, 0.1),
  assaultGun('orionprime', 'ORION PRIME', 0xff9a3a, '7.62×39mm', 'Built for the frontier.', 42, 0.13),
  assaultGun('eclipser12', 'ECLIPSE R-12', 0xff4a4a, '6.5×39mm', 'Stalk. Strike. Disappear.', 36, 0.11),
  assaultGun('helixrifle', 'HELIX RIFLE', 0xbfe0ff, '5.56×45mm', 'Evolved. Superior. Lethal.', 35, 0.1),
  assaultGun('nova22', 'NOVA-22', 0xffb347, '6.8×43mm SPC', 'Star-born. Battle-proven.', 40, 0.12),
  assaultGun('quantumedge', 'QUANTUM EDGE', 0x6ff0a0, '6.5×39mm', 'Reality distortion in a barrel.', 37, 0.1),
  assaultGun('voidhunter', 'VOID HUNTER', 0xb15cff, '6.5 Grendel', 'No end. No escape.', 39, 0.12),
  assaultGun('starfall11', 'STARFALL-11', 0x7fdfff, '7.62×51mm', 'From the stars, to the stars.', 44, 0.14),
  assaultGun('hyperionlegion', 'HYPERION LEGION', 0xff6a3a, '7.62×39mm', 'Loyalty. Honor. Destruction.', 41, 0.12),
  assaultGun('astra6', 'ASTRA-6', 0x6fb0ff, '5.56×45mm', 'Beyond the limits.', 34, 0.1),
  assaultGun('titanbreaker', 'TITAN BREAKER', 0xffa838, '8.6×43mm', 'Nothing can stand.', 46, 0.15),
  assaultGun('vegax1', 'VEGA X-1', 0x6fd0ff, '5.56×39mm', 'Sleek. Deadly. Efficient.', 35, 0.09),
  assaultGun('chimera9', 'CHIMERA-9', 0x5fe0b0, '6.5 Creedmoor', 'Adapt or die.', 38, 0.11),
  assaultGun('blackstarfury', 'BLACKSTAR FURY', 0xff3a48, '7.62×39mm', 'Fueled by rage.', 43, 0.13),
  assaultGun('horizonrifle', 'HORIZON RIFLE', 0x7fb8ff, '5.56×45mm', 'No borders. No mercy.', 36, 0.11),
  assaultGun('gravitywell', 'GRAVITY WELL', 0x9a7cff, '6.8×43mm SPC', 'Pull them into oblivion.', 40, 0.12),
  assaultGun('solstice9', 'SOLSTICE-9', 0xffd27a, '5.56×45mm', 'Light in the dark.', 37, 0.11),
  assaultGun('apogee33', 'APOGEE 33', 0x6ff0c0, '8.6×43mm', 'Ascend. Conquer. Repeat.', 45, 0.14),
  // FREE MACHINE GUNS — "20 Space Machine Guns" sheet (skip M-12 VINDICATOR starter + TYPHON MG-3).
  // Single-barrel (02-10):
  mgGun('eclipsewraith', 'ECLIPSE WRAITH', 0x6a8cff, '7.62mm', 'Lightweight. Deadly. Silent.', 22, 0.065, 55),
  mgGun('solarisc97', 'SOLARIS ARMS C-97', 0xff9a3a, '7.62mm', 'Power meets precision.', 26, 0.075, 65),
  mgGun('auroramg1', 'AURORA MG-1', 0x5fe0b0, '5.56mm', 'Strike with the northern light.', 21, 0.06, 70),
  mgGun('hyperionguard', 'HYPERION GUARD', 0x7fb8ff, '7.62mm', 'Defend. Deter. Destroy.', 25, 0.07, 60),
  mgGun('novacarbinex1', 'NOVA CARBINE X1', 0xffb347, '6.8mm', 'Compact fury. Maximum impact.', 23, 0.065, 55),
  mgGun('orionlmg', 'ORION LMG', 0x6fb0ff, '7.62mm', 'Reach beyond the stars.', 27, 0.08, 75),
  mgGun('voidstalker', 'VOID STALKER', 0xb15cff, '6.5mm', 'From the void, we reign.', 24, 0.07, 60),
  mgGun('sentinelm12', 'SENTINEL M12', 0xbfe0ff, '5.56mm', 'Vigilant. Unyielding. Unstoppable.', 22, 0.065, 65),
  // Gatling-style (11-20) — higher mag, faster spin:
  mgGun('ga7hurricane', 'GA-7 HURRICANE', 0x6fd0ff, '7.62mm', 'Unleash the storm.', 20, 0.05, 100),
  mgGun('titanmauler', 'TITAN MAULER', 0xff8a3a, '7.62mm', 'Breaching power. Unmatched.', 24, 0.05, 100),
  mgGun('vortexr880', 'VORTEX R-880', 0x7fdfff, '5.56mm', 'Spin up. Wipe out.', 19, 0.045, 120),
  mgGun('celestialspinner', 'CELESTIAL SPINNER', 0xb15cff, '6.5mm', 'A universe of hurt.', 22, 0.05, 100),
  mgGun('apocalypsegatx', 'APOCALYPSE GAT-X', 0xff3a48, '7.62mm', 'End times, delivered fast.', 23, 0.05, 110),
  mgGun('chronosminigun', 'CHRONOS MINIGUN', 0xffd27a, '5.56mm', 'Time bends to our firepower.', 18, 0.04, 130),
  mgGun('nebuladevastator', 'NEBULA DEVASTATOR', 0x9a7cff, '7.62mm', 'From dust to dust.', 25, 0.055, 100),
  mgGun('omegaresetter', 'OMEGA RESETTER', 0xff4a4a, '7.62mm', 'Erase. Rewrite. Repeat.', 24, 0.05, 110),
  mgGun('polarisrotor', 'POLARIS ROTOR', 0x6fb0ff, '5.56mm', 'Freeze them in their tracks.', 20, 0.05, 100),
  mgGun('dragonfirex6', 'DRAGONFIRE X6', 0xff6a3a, '7.62mm', 'Burn everything.', 22, 0.05, 110),
  // FREE SNIPER RIFLES — "20 Space Sniper Rifles" sheet 1 (02-20; VANGUARD SR-1 is a starter).
  sniperGun('lonestarmt7', 'LONESTAR MT7', 0x9ec8ff, '7.62×61mm', 'High velocity. Pinpoint accuracy.', 230, 1.5),
  sniperGun('eclipserift', 'ECLIPSE RIFT', 0xb15cff, '.408 CheyTac', 'Cold forged. Silent operator.', 250, 1.6),
  sniperGun('polarislance', 'POLARIS LANCE', 0x7fb8ff, '.50 BMG', 'Guided by the north star.', 260, 1.6),
  sniperGun('novaspecter', 'NOVA SPECTER', 0x63ff84, '.338 Lapua', 'Strike from shadow.', 210, 1.4),
  sniperGun('orionr9', 'ORION R-9', 0xff9a3a, '.300 WM', 'Electromagnetic stabilized.', 235, 1.5),
  sniperGun('celestialmarksman', 'CELESTIAL MARKSMAN', 0xbfe0ff, '.408 CheyTac', 'Engineered for orbital drop.', 240, 1.5),
  sniperGun('voidlineage', 'VOID LINEAGE', 0x9a7cff, '.375 CT', 'Ghost rounds. Silent kills.', 245, 1.55),
  sniperGun('silenthorizon', 'SILENT HORIZON', 0x7fdfff, '.338 Lapua', 'Lightweight frame. Heavy impact.', 215, 1.4),
  sniperGun('starfallx1', 'STARFALL X1', 0x6fd0ff, '.50 BMG', 'Anti-material capable.', 260, 1.6),
  sniperGun('quasarprime', 'QUASAR PRIME', 0x9a7cff, '.338 Lapua', 'Reality bends. Dark hour weapon.', 240, 1.5),
  sniperGun('phantomdistance', 'PHANTOM DISTANCE', 0x8fbaff, '.408 CheyTac', 'Ghost round. Guardian series.', 235, 1.5),
  sniperGun('aegislongshot', 'AEGIS LONGSHOT', 0x6ff0a0, '12.7×108mm', 'Shield breaker. Guardian tanks.', 255, 1.6),
  sniperGun('zenith7', 'ZENITH-7', 0x7fb8ff, '.338 Lapua', 'Classic build. Modern response.', 225, 1.45),
  sniperGun('nebulawraith', 'NEBULA WRAITH', 0xb15cff, '.408 CheyTac', 'Clean. Fast. Lethal.', 240, 1.5),
  sniperGun('solarissrx', 'SOLARIS SRX', 0xff7a3a, '.50 BMG', 'Built to end worlds.', 260, 1.65),
  sniperGun('glacieredge', 'GLACIER EDGE', 0xbfe0ff, '.338 Lapua', 'From the void.', 235, 1.5),
  sniperGun('oblivionguard', 'OBLIVION GUARD', 0x9a7cff, '.408 CheyTac', 'Extreme cold. Extreme precision.', 245, 1.55),
  sniperGun('hyperionstrike', 'HYPERION STRIKE', 0xffb347, '.300 WM', 'Speed. Power. Precision.', 220, 1.4),
  sniperGun('duskhunter', 'DUSK HUNTER', 0xff6a3a, '.338 Lapua', 'For the mysteries. By the stars.', 230, 1.5),
  // FREE RPGs — "20 Space RPGs" sheet 1 (02-20; M-57 PUNISHER is a starter).
  rpgGun('arclightrl7', 'ARCLIGHT RL-7', 0xb15cff, '70mm Plasma', 'Light the way to ruin.', 210, 6.5),
  rpgGun('starfiresr3', 'STARFIRE SR-3', 0xff7a3a, '100mm Thermobaric', 'A sun in every shell.', 260, 7.5),
  rpgGun('thunderclap9', 'THUNDERCLAP 9', 0x7fdfff, '120mm HE', 'They hear it before they die.', 240, 7),
  rpgGun('voidstormv2', 'VOIDSTORM V2', 0x9a7cff, '80mm Void', 'The void takes all.', 230, 7),
  rpgGun('ironhailm82', 'IRONHAIL M-82', 0xff9a3a, '60mm HEAP', 'Armor is a suggestion.', 200, 5.5),
  rpgGun('omegadevastator', 'OMEGA DEVASTATOR', 0xffb347, '90mm Cluster', 'Nothing left standing.', 220, 8),
  rpgGun('frostbitefb8', 'FROSTBITE FB-8', 0x7fdfff, '75mm Cryo', 'The last cold they feel.', 190, 6),
  rpgGun('scorpionrl1', 'SCORPION RL-1', 0xff7a3a, '65mm HEAT', 'One sting. One kill.', 210, 5.5),
  rpgGun('heliosh12', 'HELIOS H-12', 0xff5a2a, '100mm Incendiary', 'Burn it to the ground.', 250, 7),
  rpgGun('ravagerr11', 'RAVAGER R-11', 0x9ec8ff, '80mm Anti-Armor', 'Built to break tanks.', 240, 6),
  rpgGun('eclipsee6', 'ECLIPSE E-6', 0x9af0ff, '65mm EMP', 'Kill the lights.', 180, 6),
  rpgGun('bansheeb7', 'BANSHEE B-7', 0xff9a3a, '70mm HE', 'You will hear it coming.', 205, 6),
  rpgGun('dragonflydf2', 'DRAGONFLY DF-2', 0xff7a3a, '100mm Thermobaric', 'Small wings. Big fire.', 255, 7.5),
  rpgGun('novaripper', 'NOVA RIPPER', 0xffb347, '65mm Fragmentation', 'Shred the horizon.', 210, 7),
  rpgGun('wraithw4', 'WRAITH W-4', 0xb15cff, '75mm Guided', 'It finds them.', 220, 6),
  rpgGun('javelinx15', 'JAVELIN X-15', 0x7fb8ff, '80mm Tandem', 'Twice the punch.', 245, 6.5),
  rpgGun('predatorpr5', 'PREDATOR PR-5', 0xff9a3a, '85mm HEAT', 'Hunt. Lock. Erase.', 235, 6),
  rpgGun('titanbreakerrpg', 'TITAN BREAKER', 0x7fdfff, '120mm HE', 'For the giants.', 270, 8),
  rpgGun('blackstarbs2', 'BLACKSTAR BS-2', 0x9a7cff, '75mm Smart', 'It chooses its target.', 225, 6.5),
  // FREE ALIEN ASSAULT RIFLES — "20 Alien Assault Rifles" sheet 1 (Primary section).
  alienGun('xiltharbladecarbine', 'XILTHAR BLADECARBINE', 0x49a6ff, 'Bio-electric discharge.', 36, 0.1),
  alienGun('vorlaxincisor', 'VORLAX INCISOR', 0xb15cff, 'Acidic payload. Life sever.', 40, 0.12),
  alienGun('zyrethpulser', 'ZYRETH PULSER', 0x6fd0ff, 'Phase disruptor. Shield breaker.', 34, 0.09),
  alienGun('korvaxseeker', 'KORVAX SEEKER', 0xffb347, 'Auto-aim swarm rounds.', 32, 0.08),
  alienGun('nergalharbinger', 'NERGAL HARBINGER', 0xff3a48, 'Spore infestation launcher.', 42, 0.13),
  alienGun('qorathdevourer', 'QORATH DEVOURER', 0xff6a3a, 'Feeds on the target it kills.', 44, 0.13),
  alienGun('elysianchorus', 'ELYSIAN CHORUS', 0x63ff84, 'Sonic tremors. Radius kills.', 35, 0.1),
  alienGun('thalixshredder', 'THALIX SHREDDER', 0x6ff0a0, 'Neural overload. Mind break.', 38, 0.11),
  alienGun('maevrisynapse', 'MAEVRI SYNAPSE', 0xb15cff, 'Neural overload. Mind break.', 37, 0.1),
  alienGun('drachonriftmaw', 'DRACHON RIFTMAW', 0xff9a3a, 'Tears through armor and flesh.', 43, 0.12),
  alienGun('solenaestarforge', 'SOLENAE STARFORGE', 0xffd27a, 'Stellar plasma. Infinite pierce.', 39, 0.11),
  alienGun('vaskaobsidian', 'VASKA OBSIDIAN', 0x9a7cff, 'Void-etched. Infinite pierce.', 40, 0.12),
  alienGun('ghorixmauler', 'GHORIX MAULER', 0xff3a48, 'Toxic assault. Armor melt.', 42, 0.13),
  alienGun('illitharlament', 'ILLITHAR LAMENT', 0x7fdfff, 'Memory bane. Sanity fade.', 35, 0.1),
  alienGun('varuunjudicator', "VA'RUUN JUDICATOR", 0x63ff84, 'Extends the eternal law.', 38, 0.11),
  alienGun('uultakcarver', "UUL'TAK CARVER", 0x6ff0a0, 'Bone shatter. No escape.', 41, 0.12),
  alienGun('sarnixobliterator', 'SARNIX OBLITERATOR', 0xff6a3a, 'Nanite swarm. Total erasure.', 43, 0.13),
  alienGun('ryvnnphantom', 'RYVNN PHANTOM', 0x9a7cff, 'Hits without warning.', 36, 0.1),
  alienGun('kerzulannihilator', 'KERZUL ANNIHILATOR', 0xb15cff, 'Pure destruction, weaponized.', 44, 0.13),
  alienGun('omeganullifier', 'OMEGA NULLIFIER', 0x7fb8ff, 'Cosmic collapse. Total end.', 40, 0.12),
  // FREE HANDGUNS — "20 Handguns" sheet (02-20; M-7 DEFENDER + PULSEFIRE M9 are starters). Secondary section.
  handgunGun('orion11c', 'ORION-11C', 0xff9a3a, '10mm Auto', 'Fast trigger. Faster exit.', 42, 0.16, 15),
  handgunGun('novacustom', 'NOVA CUSTOM', 0x7fdfff, '9.5mm Caseless', 'No brass. No trace.', 38, 0.14, 18),
  handgunGun('vanguard2', 'VANGUARD-2', 0xff3a48, '.45 ACP', 'Heavy hitter. Old faithful.', 55, 0.28, 12),
  handgunGun('rift22', 'RIFT-22', 0x6ff0a0, '7.62×25mm', 'Punches above its class.', 44, 0.18, 14),
  handgunGun('kraken13', 'KRAKEN-13', 0xffb347, '.50 AE', 'One hand. All the power.', 72, 0.5, 7),
  handgunGun('specter9', 'SPECTER-9', 0x9ec8ff, '9mm Subsonic', 'Quiet. Clean. Gone.', 40, 0.2, 15),
  handgunGun('helix01', 'HELIX-01', 0x63ff84, '5.7×28mm', 'Armor means nothing.', 36, 0.13, 20),
  handgunGun('ravager3', 'RAVAGER-3', 0xff7a3a, '12.7mm Pistol', 'A cannon in your palm.', 68, 0.46, 7),
  handgunGun('dusk7', 'DUSK-7', 0x9a7cff, '.44 Magnum', 'Do you feel lucky.', 66, 0.42, 6),
  handgunGun('ionix77', 'IONIX-77', 0x7fdfff, 'Energy Cell', 'Never runs dry.', 34, 0.12, 24, true),
  handgunGun('striker45', 'STRIKER-45', 0xff9a3a, '.45 AP', 'Through armor. Through cover.', 58, 0.3, 12),
  handgunGun('cyclone9', 'CYCLONE-9', 0x6fd0ff, '9mm Gyrojet', 'Rockets in a pistol.', 46, 0.2, 15),
  handgunGun('wraith5', 'WRAITH-5', 0xb15cff, '8.6mm Blackout', 'From the shadows.', 48, 0.24, 12),
  handgunGun('bolt10', 'BOLT-10', 0x6ff0a0, '10mm Auto', 'Snap. Snap. Snap.', 42, 0.16, 16),
  handgunGun('eclipse9pistol', 'ECLIPSE-9', 0xff5a2a, '9mm Solar', 'Bottled sunlight.', 40, 0.15, 18),
  handgunGun('talon22', 'TALON-22', 0x7fb8ff, '.22 LR', 'Small bite. Fast bite.', 28, 0.1, 24, true),
  handgunGun('ghost6', 'GHOST-6', 0xbfe0ff, '300 BLK', 'They never see it.', 52, 0.26, 12),
  handgunGun('hawker4', 'HAWKER-4', 0x9af0ff, '9mm EMP', 'Short out the fight.', 38, 0.18, 15),
  // PREMIUM ASSAULT RIFLES — "20 Premium Space Assault Rifles" sheet 1 (Astro-priced; CELESTIAL AEGIS is a starter).
  premAssault('nebulalux', 'NEBULA LUX', 0x7fdfff, 'Light made deadly.', 44, 0.1),
  premAssault('solarisprimear', 'SOLARIS PRIME', 0xff9a3a, 'Power of a star.', 46, 0.1),
  premAssault('voidimperator', 'VOID IMPERATOR', 0x9a7cff, 'Rule the dark.', 45, 0.1),
  premAssault('eternalparagon', 'ETERNAL PARAGON', 0xffd27a, 'Legends never fall.', 44, 0.1),
  premAssault('dragonsbreathar', "DRAGON'S BREATH", 0xff3a48, 'Burn worlds.', 47, 0.11),
  premAssault('stardustmarauder', 'STARDUST MARAUDER', 0x6fd0ff, 'Made of cosmic dust.', 43, 0.09),
  premAssault('chronosedge', 'CHRONOS EDGE', 0x7fb8ff, 'Time is your weapon.', 44, 0.1),
  premAssault('galaxyhunter', 'GALAXY HUNTER', 0x6ff0a0, 'No prey escapes.', 45, 0.1),
  premAssault('auroradisciple', 'AURORA DISCIPLE', 0xff7ac0, 'Beauty. Precision. Death.', 43, 0.09),
  premAssault('titansfuryar', "TITAN'S FURY", 0xff6a3a, 'Crush. Destroy. Repeat.', 48, 0.12),
  premAssault('lunareclipsear', 'LUNAR ECLIPSE', 0x9a7cff, 'Shadows align.', 45, 0.1),
  premAssault('exoduselite', 'EXODUS ELITE', 0xbfe0ff, 'Forged for survival.', 44, 0.1),
  premAssault('psionicrequiem', 'PSIONIC REQUIEM', 0xb15cff, 'Silence their souls.', 45, 0.1),
  premAssault('omegaprotocol', 'OMEGA PROTOCOL', 0xffd27a, 'End of all threats.', 46, 0.11),
  premAssault('empyreanwraithar', 'EMPYREAN WRAITH', 0x7fdfff, 'From heaven, judgment.', 44, 0.1),
  premAssault('vortexphantomar', 'VORTEX PHANTOM', 0x9a7cff, 'Disappear. Strike. Erase.', 45, 0.1),
  premAssault('radiantoathar', 'RADIANT OATH', 0xffd27a, 'Light be your weapon.', 44, 0.1),
  premAssault('abyssalredeemer', 'ABYSSAL REDEEMER', 0x6fd0ff, 'Even darkness bows.', 46, 0.11),
  premAssault('infinityguard', 'INFINITY GUARD', 0xbfe0ff, 'Power beyond limits.', 47, 0.11),
  // PREMIUM SNIPER RIFLES — "20 Premium Sniper Rifles" sheet 1 (CELESTIAL LANCE is a starter).
  premSniper('voidedge', 'VOID EDGE', 0x9a7cff, 'Made of nothing.', 320, 1.4),
  premSniper('stellarphantom', 'STELLAR PHANTOM', 0x7fdfff, 'Wide like the stars.', 315, 1.35),
  premSniper('eclipseprime', 'ECLIPSE PRIME', 0xb15cff, 'In the dark, we rule.', 325, 1.45),
  premSniper('novabreaker', 'NOVA BREAKER', 0xff3a48, 'Erupt. Obliterate.', 330, 1.5),
  premSniper('hyperionsentinel', 'HYPERION SENTINEL', 0x7fb8ff, 'Beyond the horizon.', 310, 1.35),
  premSniper('solsticewhisper', 'SOLSTICE WHISPER', 0xffd27a, 'Silent. Deadly. Divine.', 315, 1.4),
  premSniper('galacticharbinger', 'GALACTIC HARBINGER', 0x63ff84, 'Messenger of doom.', 320, 1.4),
  premSniper('aurorahunter', 'AURORA HUNTER', 0x6fd0ff, 'Chase the light.', 315, 1.4),
  premSniper('omegareach', 'OMEGA REACH', 0xff9a3a, 'The last thing they see.', 335, 1.5),
  premSniper('quantumlongshot', 'QUANTUM LONGSHOT', 0xb15cff, 'Reality, divided.', 320, 1.4),
  premSniper('dragonflightsr', 'DRAGONFLIGHT SR', 0xff6a3a, 'Swift. Precise. Relentless.', 325, 1.45),
  premSniper('lunarghost', 'LUNAR GHOST', 0xbfe0ff, 'Fade and unseen.', 315, 1.4),
  premSniper('titansbane', "TITAN'S BANE", 0x9ec8ff, 'Built to end gods.', 340, 1.55),
  premSniper('nebulastrike', 'NEBULA STRIKE', 0xb15cff, 'Born from stardust.', 320, 1.4),
  premSniper('polarisexecutioner', 'POLARIS EXECUTIONER', 0x7fb8ff, 'Guided by the north star.', 325, 1.45),
  premSniper('starfallsr7', 'STARFALL SR-7', 0x6fd0ff, 'When stars collide.', 320, 1.4),
  premSniper('vortexfury', 'VORTEX FURY', 0x9a7cff, 'Pull, and destroy.', 330, 1.5),
  premSniper('chronosriflesr', 'CHRONOS RIFLE', 0x7fdfff, 'Time is on your side.', 315, 1.4),
  premSniper('obscureraven', 'OBSCURE RAVEN', 0x9a7cff, 'Shadows never miss.', 325, 1.45),
  // PREMIUM RPGs — "Premium Arsenal Heavy" sheet 1 (VOIDSTORM M-10 is a starter).
  premRPG('atlasrl97', 'ATLAS RL-97', 0x7fb8ff, 'Anti-armor. Anti-everything.', 300, 7),
  premRPG('ironcladm5', 'IRONCLAD M-5', 0x9ec8ff, 'Heavy impact. Total collapse.', 310, 7.5),
  premRPG('starfalls3', 'STARFALL S-3', 0x7fdfff, 'Precision rocket launcher.', 290, 7),
  premRPG('dragonbreathr6', 'DRAGONBREATH R-6', 0xff3a48, 'Thermobaric hellfire.', 320, 8),
  premRPG('cryobreakercb9', 'CRYO BREAKER CB-9', 0x7fdfff, 'The cold that ends worlds.', 285, 7),
  premRPG('thunderbolttb7', 'THUNDERBOLT TB-7', 0x9af0ff, 'Electro-magnetic ruin.', 300, 7),
  premRPG('helixr12', 'HELIX R-12', 0x6ff0a0, 'Smart-lock. No escape.', 295, 7),
  premRPG('novaeruptorn8', 'NOVA ERUPTOR N-8', 0xff9a3a, 'High-explosive supernova.', 315, 7.5),
  premRPG('sabersr7', 'SABER SR-7', 0x9ec8ff, 'Kinetic. Precise. Lethal.', 300, 7),
  premRPG('phoenixrla1', 'PHOENIX RLA-1', 0xff5a2a, 'Rise from their ashes.', 320, 8),
  premRPG('predatorpr3', 'PREDATOR PR-3', 0xff9a3a, 'Top-attack devastation.', 310, 7),
  premRPG('blackstarb9', 'BLACKSTAR B-9', 0x9a7cff, 'Gravity, weaponized.', 305, 7.5),
  premRPG('quasarq2', 'QUASAR Q-2', 0x7fdfff, 'A star in every shell.', 300, 7),
  premRPG('apocalypsea20', 'APOCALYPSE A-20', 0xffb347, 'Heavy nuclear payload.', 330, 8.5),
  premRPG('dreadnoughtdn9', 'DREADNOUGHT DN-9', 0x9ec8ff, 'Anti-vehicle supremacy.', 315, 7.5),
  premRPG('spectersp4', 'SPECTER SP-4', 0x6ff0a0, 'Stealth. Strike. Vanish.', 290, 7),
  premRPG('hrm23harbinger', 'HRM-23 HARBINGER', 0xff9a3a, 'Multi-purpose annihilation.', 310, 7.5),
  premRPG('goliathgl1', 'GOLIATH GL-1', 0xff6a3a, 'Super-heavy siege.', 340, 8.5),
  premRPG('eclipsev9', 'ECLIPSE V-9', 0xb15cff, 'The void collects.', 305, 7.5),
  // PREMIUM ALIEN ASSAULT RIFLES — "Premium Alien" sheet 1 (Primary section).
  premAlien('celestialherald', 'CELESTIAL HERALD', 0xffd27a, 'Divine light. Endless glory.', 46, 0.1),
  premAlien('omegaregulator', 'OMEGA REGULATOR', 0xff3a48, 'Control. Dominate. Desecrate.', 48, 0.12),
  premAlien('nebulasovereign', 'NEBULA SOVEREIGN', 0xb15cff, 'Made of starlight. Built to rule.', 47, 0.11),
  premAlien('voideclipse', 'VOID ECLIPSE', 0x9a7cff, 'Erase. Obliterate. Repeat.', 47, 0.11),
  premAlien('auroraprimealien', 'AURORA PRIME', 0x6fd0ff, 'The light before destruction.', 46, 0.1),
  premAlien('draconicascent', 'DRACONIC ASCENT', 0xff6a3a, 'Rise of the ancient.', 48, 0.12),
  premAlien('solarflare', 'SOLAR FLARE', 0xff9a3a, 'Burn brighter than a star.', 47, 0.11),
  premAlien('lunarphantom', 'LUNAR PHANTOM', 0xbfe0ff, 'Silent as shadow. Deadly as night.', 45, 0.1),
  premAlien('quantumoverlord', 'QUANTUM OVERLORD', 0x7fdfff, 'Beyond the beyond limits.', 47, 0.11),
  premAlien('infernochampion', 'INFERNO CHAMPION', 0xff3a48, 'Victory burns.', 48, 0.12),
  premAlien('stellardestroyer', 'STELLAR DESTROYER', 0x7fb8ff, 'Built to end worlds.', 47, 0.11),
  premAlien('empyreanwarden', 'EMPYREAN WARDEN', 0xffd27a, "Heaven's wrath unleashed.", 46, 0.1),
  premAlien('chaosbringer', 'CHAOS BRINGER', 0xb15cff, 'Order fades. Chaos remains.', 47, 0.11),
  premAlien('hyperionelite', 'HYPERION ELITE', 0x6ff0a0, 'Advanced. Superior. Unstoppable.', 47, 0.11),
  premAlien('shadowrealm', 'SHADOW REALM', 0x9a7cff, 'Fear the darkness.', 46, 0.1),
  premAlien('eternalparadoxalien', 'ETERNAL PARADOX', 0x7fdfff, 'Infinite power. Zero mercy.', 48, 0.12),
  premAlien('crimsonreaper', 'CRIMSON REAPER', 0xff3a48, 'Death walks with you.', 48, 0.12),
  premAlien('galacticsentinel', 'GALACTIC SENTINEL', 0x63ff84, 'Defender of the cosmos.', 46, 0.1),
  premAlien('apexpredatoralien', 'APEX PREDATOR', 0x6ff0a0, 'Perfect. Precise. Deadly.', 47, 0.11),
  premAlien('orionsupremacy', 'ORION SUPREMACY', 0x7fb8ff, 'We are the stars.', 47, 0.11),
  // FREE ASSAULT RIFLES — sheet 2 "Infinite Frontiers" (20 distinct).
  assaultGun('aurorareach', 'AURORA REACH', 0x8fbaff, '5.56×45mm', 'Balanced. Reliable. Deadly.', 35, 0.11),
  assaultGun('solsticecarbine', 'SOLSTICE CARBINE', 0xffd27a, '6.8mm SPC', 'Lightweight. Fast. Precise.', 38, 0.12),
  assaultGun('gravitonv7', 'GRAVITON V7', 0xb15cff, '6.5mm', 'Control the pull.', 39, 0.12),
  assaultGun('starforget9', 'STARFORGE T9', 0xff9a3a, '7.62×39mm', 'Built for siege. Born to win.', 42, 0.13),
  assaultGun('cryobreakerar', 'CRYO BREAKER', 0x7fdfff, '5.56mm', 'Freeze. Shatter. Dominate.', 36, 0.1),
  assaultGun('nebulaphantom', 'NEBULA PHANTOM', 0x9a7cff, '6.5mm', 'Silent. Deadly. Unseen.', 37, 0.11),
  assaultGun('eclipse9ar', 'ECLIPSE-9', 0xff5a2a, '6.8mm', 'No light escapes.', 40, 0.12),
  assaultGun('horizonguardian', 'HORIZON GUARDIAN', 0x7fb8ff, '5.56mm', 'Defend what matters.', 35, 0.1),
  assaultGun('voidrifter', 'VOIDRIFTER', 0x9a7cff, '6.5mm', 'Tear through reality.', 39, 0.12),
  assaultGun('zenith11', 'ZENITH-11', 0x6fd0ff, '5.56mm', 'Peak performance.', 36, 0.1),
  assaultGun('orionswrath', "ORION'S WRATH", 0xff6a3a, '7.62×39mm', 'Rage among the stars.', 43, 0.13),
  assaultGun('pulsar16', 'PULSAR-16', 0xff3a48, '6.8mm', 'Rhythm of destruction.', 40, 0.12),
  assaultGun('titanfallar', 'TITANFALL AR', 0xffb347, '8.6mm', 'Built to bring titans down.', 46, 0.15),
  assaultGun('velocityx', 'VELOCITY-X', 0x6ff0a0, '5.56×39mm', 'Speed. Accuracy. Dominance.', 35, 0.09),
  assaultGun('omegasentinelar', 'OMEGA SENTINEL', 0x7fdfff, '6.5mm', 'The last line.', 38, 0.11),
  assaultGun('astraeus', 'ASTRAEUS', 0xbfe0ff, '5.56mm', 'Guided by the stars.', 36, 0.11),
  assaultGun('reaperix', 'REAPER-IX', 0xff3a48, '7.62×39mm', 'Death from orbit.', 43, 0.13),
  assaultGun('quantumdisruptor', 'QUANTUM DISRUPTOR', 0x6fd0ff, '6.8mm', 'Break their world.', 38, 0.11),
  assaultGun('novaburst', 'NOVA BURST', 0xff9a3a, '6.5mm', 'Ignite. Consume. Erase.', 40, 0.12),
  assaultGun('blacklight', 'BLACKLIGHT', 0x9a7cff, '6.5mm', 'Strike from the dark.', 39, 0.12),
  // FREE SNIPER RIFLES — sheet 2 (20 distinct).
  sniperGun('sentinels12', 'SENTINEL S-12', 0x9ec8ff, '.50 BMG', 'All-weather. All distances.', 255, 1.6),
  sniperGun('hawkeyem77', 'HAWK EYE M-77', 0xffb347, '7.62×61mm', 'High velocity. Pinpoint accuracy.', 230, 1.5),
  sniperGun('glaciervx3', 'GLACIER VX-3', 0x7fdfff, '.408 CheyTac', 'Cold forged. Silent operator.', 245, 1.55),
  sniperGun('blacklinexr', 'BLACKLINE XR', 0x9a7cff, '13.2×108mm', 'Erase the line.', 260, 1.65),
  sniperGun('astraprotocol', 'ASTRA PROTOCOL', 0xff9a3a, '.338 Lapua', 'Precision from above.', 235, 1.5),
  sniperGun('thunderboltt6', 'THUNDERBOLT T6', 0x9af0ff, '.300 WM', 'Electromagnetic stabilized.', 235, 1.5),
  sniperGun('phantomsr17', 'PHANTOM SR-17', 0xb15cff, '.300 WM', 'Ghost rounds. Silent kills.', 240, 1.5),
  sniperGun('orbitalmark8', 'ORBITAL MARK 8', 0x7fb8ff, '.375 CT', 'Engineered for orbital drop.', 250, 1.6),
  sniperGun('solsticem1', 'SOLSTICE M1', 0xffd27a, '.338 Lapua', 'Lightweight frame. Heavy impact.', 225, 1.45),
  sniperGun('iridiumlongshot', 'IRIDIUM LONGSHOT', 0x6fd0ff, '.50 BMG', 'Anti-material capable.', 260, 1.6),
  sniperGun('eclipsesr9', 'ECLIPSE SR-9', 0x9a7cff, '.338 Lapua', 'Extreme cold. Dark-hour weapon.', 240, 1.5),
  sniperGun('vortexrifle', 'VORTEX RIFLE', 0xb15cff, '.408 CheyTac', 'Pull them into the dark.', 245, 1.55),
  sniperGun('aegisprimesr', 'AEGIS PRIME', 0x6ff0a0, '12.7×108mm', 'Shield breaker. Guardian series.', 255, 1.6),
  sniperGun('longbowsr2', 'LONGBOW SR-2', 0x9ec8ff, '12.7×108mm', 'Classic build. Modern response.', 250, 1.55),
  sniperGun('silverliner11', 'SILVERLINE R-11', 0xbfe0ff, '.338 Lapua', 'Clean. Fast. Lethal.', 235, 1.5),
  sniperGun('titanreachsr', 'TITAN REACH', 0xff9a3a, '.50 BMG', 'Built to end giants.', 265, 1.65),
  sniperGun('voidwalkersr', 'VOIDWALKER SR', 0x9a7cff, '.408 CheyTac', 'From the void.', 245, 1.55),
  sniperGun('borealissr22', 'BOREALIS SR-22', 0x63ff84, '.338 Lapua', 'Extreme cold. Extreme precision.', 235, 1.5),
  sniperGun('hyperionr13', 'HYPERION R-13', 0x7fb8ff, '.300 WM', 'Speed. Power. Precision.', 225, 1.45),
  sniperGun('stellarmarksman', 'STELLAR MARKSMAN', 0x6fd0ff, '.408 CheyTac', 'For the marksman. By the stars.', 245, 1.55),
  // FREE RPGs — sheet 2 (skip ATLAS RL-97, a premium name).
  rpgGun('m202redeemer', 'M202 REDEEMER', 0xff9a3a, '90mm HEAT', 'Deliver the reckoning.', 210, 6.5),
  rpgGun('vulcanhr7', 'VULCAN HR-7', 0xffb347, '75mm Thermobaric', 'Forge fire. Rain ruin.', 240, 7),
  rpgGun('reaperrpg11', 'REAPER RPG-11', 0x9a7cff, '80mm Tandem', 'It comes for all.', 230, 6.5),
  rpgGun('sabersr1', 'SABER SR-1', 0x7fdfff, '100mm Smart', 'Slice through armor.', 250, 7),
  rpgGun('eclipserl4', 'ECLIPSE RL-4', 0xb15cff, '80mm EMP', 'Kill the lights. Kill the fight.', 200, 6),
  rpgGun('thunderboltt85', 'THUNDERBOLT T-85', 0x9af0ff, '120mm HE', 'They hear it coming.', 245, 7.5),
  rpgGun('cryobreakercb5', 'CRYO BREAKER CB-5', 0x7fdfff, '80mm Cryo', 'The last cold they feel.', 195, 6),
  rpgGun('devastatorrl09', 'DEVASTATOR RL-09', 0xff6a3a, '150mm High-Explosive', 'Nothing left standing.', 270, 8),
  rpgGun('phoenixrla3', 'PHOENIX RLA-3', 0xff5a2a, '90mm Incendiary', 'Rise from their ashes.', 250, 7),
  rpgGun('harbingerh7', 'HARBINGER H-7', 0xff9a3a, '85mm Fragmentation', 'The end announced.', 220, 7),
  rpgGun('voidstalkervs2', 'VOID STALKER VS-2', 0x9a7cff, '75mm Void', 'The void collects.', 230, 7),
  rpgGun('titanbustertb2', 'TITAN BUSTER TB-2', 0xffb347, '110mm Armor Piercing', 'Built for giants.', 260, 7),
  rpgGun('stormbringersb6', 'STORMBRINGER SB-6', 0x9af0ff, '90mm Multi-Purpose', 'Bring the storm.', 235, 7),
  rpgGun('hellfirer6', 'HELLFIRE R-6', 0xff3a48, '100mm Incendiary', 'Burn it all down.', 250, 7),
  rpgGun('outrideror10', 'OUTRIDER OR-10', 0xff9a3a, '105mm HEAT', 'First in. Last out.', 235, 6.5),
  rpgGun('novalaunchern8', 'NOVA LAUNCHER N-8', 0xffb347, '80mm Plasma', 'A star in every shell.', 225, 7),
  rpgGun('skybreakersb9', 'SKYBREAKER SB-9', 0x7fb8ff, '120mm Guided', 'It finds them.', 245, 7),
  rpgGun('dreadnoughtdn5', 'DREADNOUGHT DN-5', 0x9ec8ff, '160mm HE', 'Anti-vehicle supremacy.', 275, 8),
  rpgGun('blackoutrl12', 'BLACKOUT RL-12', 0x9a7cff, '75mm Smart', 'Lights out.', 225, 6.5),
  // FREE ALIEN ASSAULT RIFLES — sheet 2 (Primary section).
  alienGun('uzkiandisintegrator', 'UZKIAN DISINTEGRATOR', 0x49a6ff, 'Matter deletion. Nothing remains.', 42, 0.12),
  alienGun('xylrakpredator', 'XYLRAK PREDATOR', 0x6ff0a0, 'Hunts through dimensions.', 40, 0.12),
  alienGun('zenkouobserver', 'ZENKOU OBSERVER', 0x7fdfff, 'Pierces fate. Ignores distance.', 36, 0.1),
  alienGun('vortexharvester', 'VORTEXHARVESTER', 0xb15cff, 'Harvests energy. Feeds the void.', 43, 0.13),
  alienGun('rakthulswrath', "RAKTHUL'S WRATH", 0xff3a48, 'Rage made weapon.', 44, 0.13),
  alienGun('phorasynsprinter', 'PHORASYN SPRINTER', 0x9a7cff, 'Fast. Silent. Devours.', 34, 0.09),
  alienGun('tyrandbiovorax', 'TYRAND BIO-VORAX', 0x63ff84, 'Bio-acid delivery system.', 41, 0.12),
  alienGun('ilkarruptor', "IL'KAR RUPTOR", 0xff9a3a, 'Tears through armor and flesh.', 43, 0.13),
  alienGun('etherloomweaver', 'ETHERLOOM WEAVER', 0xb15cff, 'Threads reality. Unravels enemies.', 38, 0.11),
  alienGun('kureexannihilator', 'KUREEX ANNIHILATOR', 0xff6a3a, 'Simple. Brutal. Effective.', 44, 0.13),
  alienGun('oblivionsowers', 'OBLIVION SOWERS', 0x6ff0a0, 'Plants the seed of extinction.', 40, 0.12),
  alienGun('xilthorclawstrike', 'XILTHOR CLAWSTRIKE', 0x7fdfff, 'Shreds. Rips. Consumes.', 41, 0.12),
  alienGun('nazulparasite', "NA'ZUL PARASITE", 0x9a7cff, 'Infests. Spreads. Controls.', 37, 0.1),
  alienGun('sentinelofora', 'SENTINEL OF ORA', 0xffb347, 'Ora Protectorate.', 39, 0.11),
  alienGun('vexulonpulserifter', 'VEXULON PULSE RIFTER', 0x6fd0ff, 'Rifts open. Worlds break.', 40, 0.12),
  alienGun('naglorswarmscourge', 'NAGLOR SWARMSCOURGE', 0x63ff84, 'A thousand stings.', 38, 0.11),
  alienGun('zolnxphasecarbine', 'ZOLNX PHASECARBINE', 0xb15cff, 'Phases through cover.', 39, 0.11),
  alienGun('grakkonmawbreaker', 'GRAKKON MAWBREAKER', 0xff3a48, 'Breaks anything. Anywhere.', 44, 0.13),
  alienGun('lumorianharbinger', 'LUMORIAN HARBINGER', 0xffd27a, 'Lumorian Star Council.', 40, 0.12),
  alienGun('thraxxusdreadshot', 'THRAXXUS DREADSHOT', 0xff6a3a, 'Dread made manifest.', 43, 0.13),
  // PREMIUM ASSAULT RIFLES — sheet 2 (20 distinct, Astro-priced).
  premAssault('novainquisitor', 'NOVA INQUISITOR', 0xffd27a, 'Pure judgment.', 45, 0.1),
  premAssault('stellarkraken', 'STELLAR KRAKEN', 0x7fdfff, 'Fear from the deep.', 46, 0.1),
  premAssault('dracoascendant', 'DRACO ASCENDANT', 0xff3a48, 'Born of fire. Made to rule.', 47, 0.11),
  premAssault('eclipsedominion', 'ECLIPSE DOMINION', 0x9a7cff, 'The void obeys.', 46, 0.1),
  premAssault('aurumsovereign', 'AURUM SOVEREIGN', 0xffd27a, 'Power is elegance.', 45, 0.1),
  premAssault('pulsarvanguard', 'PULSAR VANGUARD', 0x7fb8ff, 'Lead the frontier.', 45, 0.1),
  premAssault('cosmicphoenix', 'COSMIC PHOENIX', 0xff6a3a, 'Reborn. Renewed. Relentless.', 47, 0.11),
  premAssault('oblivionharvester', 'OBLIVION HARVESTER', 0x9a7cff, 'Nothing escapes.', 46, 0.1),
  premAssault('nebulaspecterar', 'NEBULA SPECTER', 0xb15cff, 'Ghost in the stars.', 44, 0.09),
  premAssault('solarisrevenant', 'SOLARIS REVENANT', 0xff9a3a, 'Rising. Burning. Enduring.', 46, 0.11),
  premAssault('hyperionsentinelar', 'HYPERION SENTINEL', 0x7fb8ff, 'Defend. Protect. Prevail.', 44, 0.1),
  premAssault('voidlanceprime', 'VOIDLANCE PRIME', 0x9a7cff, 'Pierce reality.', 46, 0.1),
  premAssault('quantumarbiter', 'QUANTUM ARBITER', 0x7fdfff, 'Order through chaos.', 45, 0.1),
  premAssault('blackstarapocalypse', 'BLACKSTAR APOCALYPSE', 0xff3a48, 'The end is beautiful.', 48, 0.12),
  premAssault('lunareminence', 'LUNAR EMINENCE', 0xbfe0ff, 'Light in the abyss.', 44, 0.1),
  premAssault('titanforgeexile', 'TITANFORGE EXILE', 0xff9a3a, 'Forged in war. Exiled in glory.', 47, 0.11),
  premAssault('celestialharbingerar', 'CELESTIAL HARBINGER', 0xffd27a, 'Messenger of fate.', 45, 0.1),
  premAssault('gravitonmaelstrom', 'GRAVITON MAELSTROM', 0xb15cff, 'Twist. Pull. Destroy.', 46, 0.1),
  premAssault('empyreanchosen', 'EMPYREAN CHOSEN', 0x7fdfff, 'Chosen by the heavens.', 45, 0.1),
  premAssault('omegapunisherar', 'OMEGA PUNISHER', 0xff3a48, 'The final. Worst.', 48, 0.12),
  // PREMIUM ALIEN ASSAULT RIFLES — sheet 2 (Primary section, Astro-priced).
  premAlien('eclipsenova', 'ECLIPSE NOVA', 0xffd27a, 'Light consumes. Power remains.', 47, 0.11),
  premAlien('stellarace', 'STELLAR ACE', 0x7fdfff, 'Built from starfire.', 46, 0.1),
  premAlien('voidwalkeralien', 'VOIDWALKER', 0x9a7cff, 'Between reality and oblivion.', 47, 0.11),
  premAlien('dragonsmaw', "DRAGON'S MAW", 0xff3a48, 'Ancient fury. Modern menace.', 48, 0.12),
  premAlien('celestialsentinelalien', 'CELESTIAL SENTINEL', 0xbfe0ff, 'Guarded by the heavens.', 46, 0.1),
  premAlien('omegahelix', 'OMEGA HELIX', 0x6ff0a0, 'Evolution is inevitable.', 47, 0.11),
  premAlien('luminary', 'LUMINARY', 0xffd27a, 'The universe, aligned.', 46, 0.1),
  premAlien('chaosengine', 'CHAOS ENGINE', 0xff3a48, 'Disorder, amplified.', 48, 0.12),
  premAlien('nebulahunter', 'NEBULA HUNTER', 0xb15cff, 'Chase the light.', 46, 0.1),
  premAlien('empyreanwrathalien', 'EMPYREAN WRATH', 0x7fdfff, 'Heaven falls. We rise.', 47, 0.11),
  premAlien('infinityprotocol', 'INFINITY PROTOCOL', 0x7fb8ff, 'No beginning. No end.', 46, 0.1),
  premAlien('arcanepredator', 'ARCANE PREDATOR', 0x9a7cff, 'Magic meets machinery.', 47, 0.11),
  premAlien('quantumedgealien', 'QUANTUM EDGE', 0x7fdfff, 'Cutting through possibilities.', 47, 0.11),
  premAlien('solarisvanguard', 'SOLARIS VANGUARD', 0xff9a3a, 'Defend the light.', 46, 0.1),
  premAlien('dreadstar', 'DREAD STAR', 0x9a7cff, 'Feared across galaxies.', 48, 0.12),
  premAlien('titanreaper', 'TITAN REAPER', 0xff6a3a, 'Built to end titans.', 48, 0.12),
  premAlien('galacticemperor', 'GALACTIC EMPEROR', 0xffd27a, 'Rule. Conquer. Ascend.', 47, 0.11),
  premAlien('chronosguardian', 'CHRONOS GUARDIAN', 0x7fdfff, 'Master of time.', 46, 0.1),
  premAlien('radiantoathalien', 'RADIANT OATH', 0xffd27a, 'Loyalty burns bright.', 46, 0.1),
  premAlien('abyssalsupremacy', 'ABYSSAL SUPREMACY', 0x9a7cff, 'The deep bows to none.', 48, 0.12),
  // PREMIUM RPGs — sheet 2 "Double/Triple Barrel" (20 distinct, Astro-priced).
  premRPG('m21harbinger', 'M-21 HARBINGER', 0x9ec8ff, 'Anti-armor. Twin barrel.', 300, 7),
  premRPG('starfallr2', 'STARFALL R-2', 0xff9a3a, 'Precision rocket launcher.', 295, 7),
  premRPG('thunderboltd7', 'THUNDERBOLT D-7', 0x9af0ff, 'High-explosive lightning.', 305, 7.5),
  premRPG('cryohunter', 'CRYO HUNTER', 0x7fdfff, 'Cryogenic twin barrel.', 285, 7),
  premRPG('apocalypsed12', 'APOCALYPSE D-12', 0xff3a48, 'Thermobaric annihilation.', 325, 8),
  premRPG('ravagerd66', 'RAVAGER D-66', 0xff6a3a, 'Anti-personnel devastation.', 300, 7.5),
  premRPG('eclipsed3', 'ECLIPSE D-3', 0xb15cff, 'Stealth rocket launcher.', 290, 7),
  premRPG('helixd5', 'HELIX D-5', 0x6ff0a0, 'Guided rocket system.', 295, 7),
  premRPG('vortexd9', 'VORTEX D-9', 0x9a7cff, 'Gravity twin barrel.', 305, 7.5),
  premRPG('novabreakerrpg', 'NOVA BREAKER', 0xffb347, 'Nuclear payload.', 330, 8.5),
  premRPG('titan3', 'TITAN-3', 0x9ec8ff, 'Heavy triple-barrel assault.', 320, 8),
  premRPG('berserkert7', 'BERSERKER T-7', 0xff5a2a, 'High-explosive triple.', 315, 8),
  premRPG('phantomt9', 'PHANTOM T-9', 0xb15cff, 'Stealth triple barrel.', 300, 7.5),
  premRPG('glaciert9', 'GLACIER T-9', 0x7fdfff, 'Cryo triple launcher.', 290, 7.5),
  premRPG('infernot12', 'INFERNO T-12', 0xff3a48, 'Thermobaric triple.', 335, 8.5),
  premRPG('doombringert1', 'DOOMBRINGER T-1', 0xff9a3a, 'Anti-armor triple.', 320, 8),
  premRPG('cosmost6', 'COSMOS T-6', 0x7fb8ff, 'Guided triple rocket.', 305, 7.5),
  premRPG('stormcallert5', 'STORMCALLER T-5', 0x9af0ff, 'Electric triple launcher.', 310, 7.5),
  premRPG('voidrippert3', 'VOID RIPPER T-3', 0x9a7cff, 'Anti-structure triple.', 315, 8),
  premRPG('omegat21', 'OMEGA T-21', 0xffb347, 'Nuclear triple launcher.', 340, 9),
  // PREMIUM SNIPER RIFLES — sheet 2 (distinct entries; overlaps with sheet 1 skipped).
  premSniper('solarisprimesr', 'SOLARIS PRIME', 0xff9a3a, 'Light of Olympus.', 320, 1.4),
  premSniper('voidrecon', 'VOID RECON', 0x9a7cff, 'From the abyss.', 315, 1.35),
  premSniper('lunarwarden', 'LUNAR WARDEN', 0xbfe0ff, 'Guarded by the moon.', 315, 1.4),
  premSniper('stellarsentinel', 'STELLAR SENTINEL', 0x7fdfff, 'Watcher of the stars.', 320, 1.4),
  premSniper('eclipsehunter', 'ECLIPSE HUNTER', 0xb15cff, 'Strike from shadow.', 325, 1.45),
  premSniper('aurorastrike', 'AURORA STRIKE', 0x6fd0ff, 'Beauty. Death. Glory.', 320, 1.4),
  premSniper('polarisedge', 'POLARIS EDGE', 0x7fb8ff, 'Guided by the north star.', 320, 1.4),
  premSniper('hyperionspear', 'HYPERION SPEAR', 0x9ec8ff, 'Beyond all limits.', 315, 1.4),
  premSniper('celestiallongshot', 'CELESTIAL LONGSHOT', 0xffd27a, 'Born from starlight.', 320, 1.4),
  premSniper('nebulaghost', 'NEBULA GHOST', 0xb15cff, 'Silent. Deadly. Endless.', 315, 1.4),
  premSniper('orionscall', "ORION'S CALL", 0xff9a3a, 'Hear the universe.', 325, 1.45),
  premSniper('apolloprime', 'APOLLO PRIME', 0xffd27a, 'Light the way.', 320, 1.4),
  premSniper('vortexmarksman', 'VORTEX MARKSMAN', 0x9a7cff, 'Drawn into oblivion.', 330, 1.5),
  premSniper('infinitywatcher', 'INFINITY WATCHER', 0x7fdfff, 'Forever observing.', 315, 1.4),
  premSniper('zenithguardian', 'ZENITH GUARDIAN', 0x6fd0ff, 'Peak. Aim. Conquer.', 320, 1.4),
  premSniper('oblivionmarksr', 'OBLIVION MARK', 0x9a7cff, 'Leave nothing behind.', 325, 1.45),
];

/** Every buildable/equippable gun: the 10 owned starters + the (buyable) store roster. */
export const GUNS: GunDef[] = [...STARTERS, ...STORE_GUNS];

export function gunById(id: string): GunDef {
  return GUNS.find((g) => g.id === id) ?? GUNS[0];
}

// Loadout pools by SECTION (disjoint): PRIMARY = assault / alien-assault / MG;
// HEAVY = sniper / RPG; SECONDARY = handguns. The exported names are kept for
// back-compat with existing importers (SECONDARIES == the Heavy pool, SIDEARMS ==
// the Secondary pool); the loadout screen labels them Primary / Heavy / Secondary.
export const PRIMARIES = GUNS.filter((g) => g.section === 'primary');
export const HEAVIES = GUNS.filter((g) => g.section === 'heavy');
export const SECONDARIES = HEAVIES; // alias: old "secondary" fire-role pool == new Heavy
export const SIDEARMS = GUNS.filter((g) => g.section === 'secondary');

/** Throwables — one occupies the loadout's throwable slot.
 *  Each detonation can do up to four things: an instant blast (AoE damage), a
 *  status applied to enemies in radius (stun/slow/burn/blind), a lingering zone
 *  (fire/gas/cryo/smoke/decoy), and a pull/push impulse. */
export type ThrowKind =
  | 'frag'
  | 'smoke'
  | 'incendiary'
  | 'cryo'
  | 'shock'
  | 'flash'
  | 'cluster'
  | 'gas'
  | 'gravity'
  | 'concussion'
  | 'decoy'
  | 'plasma';
export type ZoneKind = 'fire' | 'gas' | 'cryo' | 'smoke' | 'decoy';
export interface ThrowDef {
  id: string;
  name: string;
  kind: ThrowKind;
  count: number;
  fuse: number; // seconds
  color: number;
  blast: { dmg: number; radius: number };
  status?: { radius: number; duration: number; stun?: number; slow?: number; burn?: number; blind?: number };
  zone?: { kind: ZoneKind; radius: number; duration: number; dps?: number; slow?: number; blocksLoS?: boolean; lure?: boolean };
  cluster?: number; // number of delayed secondary blasts
  pull?: number; // yank enemies toward the blast (gravity)
  push?: number; // shove enemies away from the blast (concussion)
}

export const THROWABLES: ThrowDef[] = [
  { id: 'frag', name: 'FRAG', kind: 'frag', count: 10, fuse: 1.4, color: 0xffae3a, blast: { dmg: 360, radius: 6.5 } },
  { id: 'smoke', name: 'SMOKE', kind: 'smoke', count: 10, fuse: 1.0, color: 0x9aa3b8, blast: { dmg: 0, radius: 0 }, zone: { kind: 'smoke', radius: 5.5, duration: 8, blocksLoS: true } },
  { id: 'incendiary', name: 'MOLOTOV', kind: 'incendiary', count: 10, fuse: 1.1, color: 0xff5a2a, blast: { dmg: 95, radius: 4 }, zone: { kind: 'fire', radius: 4.5, duration: 6, dps: 90 } },
  { id: 'cryo', name: 'CRYO BOMB', kind: 'cryo', count: 10, fuse: 1.3, color: 0x7fdfff, blast: { dmg: 80, radius: 4.5 }, status: { radius: 5.5, duration: 4.5, slow: 0.6 }, zone: { kind: 'cryo', radius: 5, duration: 4.5, slow: 0.5 } },
  { id: 'shock', name: 'EMP SHOCK', kind: 'shock', count: 10, fuse: 1.2, color: 0x9af0ff, blast: { dmg: 120, radius: 5 }, status: { radius: 5.5, duration: 2.4, stun: 2.4 } },
  { id: 'flash', name: 'FLASHBANG', kind: 'flash', count: 10, fuse: 1.4, color: 0xffffff, blast: { dmg: 0, radius: 0 }, status: { radius: 10, duration: 4.5, blind: 4.5 } },
  { id: 'cluster', name: 'CLUSTER', kind: 'cluster', count: 10, fuse: 1.3, color: 0xffd27a, blast: { dmg: 150, radius: 4 }, cluster: 5 },
  { id: 'gas', name: 'TOXIN', kind: 'gas', count: 10, fuse: 1.2, color: 0x9cff6a, blast: { dmg: 0, radius: 0 }, zone: { kind: 'gas', radius: 5.5, duration: 7, dps: 60, blocksLoS: true } },
  { id: 'gravity', name: 'SINGULARITY', kind: 'gravity', count: 10, fuse: 1.6, color: 0xc08bff, blast: { dmg: 360, radius: 7 }, pull: 5 },
  { id: 'concussion', name: 'CONCUSSION', kind: 'concussion', count: 10, fuse: 1.1, color: 0xffe9a8, blast: { dmg: 130, radius: 6 }, status: { radius: 6, duration: 1.3, stun: 1.3 }, push: 5 },
  { id: 'decoy', name: 'DECOY', kind: 'decoy', count: 10, fuse: 0.5, color: 0xaef5c8, blast: { dmg: 0, radius: 0 }, zone: { kind: 'decoy', radius: 1.2, duration: 6, lure: true } },
  { id: 'plasma', name: 'PLASMA ORB', kind: 'plasma', count: 10, fuse: 1.0, color: 0xff5d6e, blast: { dmg: 480, radius: 5 } },
];
export function throwById(id: string): ThrowDef {
  return THROWABLES.find((t) => t.id === id) ?? THROWABLES[0];
}

/** STANDARD ISSUE — the weapons every Marine starts with, free from level 1. Every OTHER
 *  gun is LOCKED and bought permanently with AstroDiamonds (after reaching level 5). */
// Only the 10 Outlander starters are owned immediately; STORE_GUNS are bought.
export const RECRUIT_WEAPONS = new Set(STARTERS.map((g) => g.id));
/** Campaign level a player must have reached before locked guns can be purchased. */
export const UNLOCK_GATE_LEVEL = 5;
