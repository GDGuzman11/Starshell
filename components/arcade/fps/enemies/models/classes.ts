/**
 * The doctrine class models — each a `buildHumanoid` call tuned to its BLACKSTAR LEGION
 * concept sheet (`Screenshots/*Redesign*.png`): proportions/height, armour plating + emissive
 * seams, head, weapon, back gear and per-class palette. Same rig → one animator poses them all.
 *
 * FACTION = BLACKSTAR LEGION. The line soldiers (Rifleman/Scout/Breacher/Marksman/Suppressor)
 * are sleek ARMOURED troopers (angular T-visor helm, layered plate, glowing seams); the support
 * & shock units (Engineer/Elite/Commander/Berserker) lean bio-organic (veins, carapace, crown).
 * Heights follow the sheets (humanoid `scale 1 ≈ 1.8 m`). Tank + Artillery are big-mech builders
 * elsewhere. Retro low-poly throughout — silhouette + a few signature features, not photoreal.
 */
import type * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { buildHumanoid } from './humanoid';

/** RIFLEMAN — blue Legion line trooper: T-visor helm, layered combat shell, plasma rifle. ~2.0 m. */
export function buildRifleman(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.11, girth: 1.0, alien: true, alienHead: 'visor', hunch: 0, accent: 0x49a6ff, body: 0x2a3340, dark: 0x14181f, shoulders: 0.6, weapon: 'rifle', abs: true, collar: true, kneePads: true, seams: 1 });
}

/** SCOUT — cyan light recon: lean, digitigrade, carbine, minimal plate. ~2.0 m. */
export function buildScout(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.11, girth: 0.82, alien: true, alienHead: 'visor', hunch: 0.05, accent: 0x6ad0ff, body: 0x263038, dark: 0x141a1f, legs: 'digi', shoulders: 0.25, weapon: 'rifle', seams: 0.8, kneePads: true });
}

/** BREACHER — orange CQB shock: heavy plate, thick legs, big shoulders, shotgun. ~2.2 m. */
export function buildBreacher(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.22, girth: 1.35, alien: true, alienHead: 'visor', hunch: 0.08, accent: 0xff7a2a, body: 0x39302a, dark: 0x201a16, legs: 'thick', shoulders: 1.3, heavyArms: true, weapon: 'shotgun', backpack: 'reactor', abs: true, collar: true, seams: 0.7 });
}

/** MARKSMAN — purple stealth sniper: lean + tall, cloak drape, Voidsniper long rifle. ~2.4 m. */
export function buildMarksman(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.33, girth: 0.72, alien: true, alienHead: 'visor', hunch: 0.04, accent: 0xb15cff, body: 0x241f2e, dark: 0x14121a, shoulders: 0.3, weapon: 'long', cape: 'stealth', seams: 0.9, kneePads: true });
}

/** SUPPRESSOR — red heavy fire support: massive hunched frame, belt-fed HMG + ammo hose → drum. ~3.1 m. */
export function buildSuppressor(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.72, girth: 1.6, alien: true, alienHead: 'visor', hunch: 0.12, accent: 0xff3a48, body: 0x2e2226, dark: 0x1a1416, legs: 'thick', shoulders: 1.3, heavyArms: true, weapon: 'beltfed', backpack: 'ammo', ammoHose: true, abs: true, collar: true, seams: 0.8 });
}

/** ENGINEER — green technical: hunched, bio-organ back mass + tendrils, 2 drones, plasma welder. ~2.2 m. */
export function buildEngineer(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.22, girth: 0.9, alien: true, alienHead: 'visor', hunch: 0.22, accent: 0x63ff84, body: 0x25302a, dark: 0x161b17, shoulders: 0.25, weapon: 'welder', organPack: true, drones: 2, seams: 0.6 });
}

/** ELITE — tan/gold carapace assassin: insect head, digitigrade, DUAL carapace blades (melee). ~2.6 m. */
export function buildElite(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.44, girth: 0.95, alien: true, alienHead: 'insect', veins: true, hunch: 0.1, accent: 0xd8b46a, body: 0x8f7c50, dark: 0x40382a, legs: 'digi', shoulders: 0.6, weapon: 'blades', carapace: 0.7, seams: 0.5 });
}

/** COMMANDER — bone-white/gold warlord: crown helm, command mantle + cape, spine array, 3 drones,
 *  energy command scepter. ~2.5 m. */
export function buildCommander(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.39, girth: 1.1, alien: true, alienHead: 'crown', hunch: 0, accent: 0xffe08a, body: 0xc9c3b6, dark: 0x5a564d, shoulders: 0.9, weapon: 'scepter', mantle: true, cape: 'command', spine: true, drones: 3, collar: true, seams: 0.6 });
}

/** BERSERKER — red xenotech shock monster: mandible head, hulking hunch, dual laser claws. ~2.7 m. */
export function buildBerserker(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.5, girth: 1.35, alien: true, alienHead: 'mandible', veins: true, hunch: 0.35, accent: 0xff3a48, body: 0x3a2020, dark: 0x1a1010, legs: 'thick', shoulders: 0.8, heavyArms: true, weapon: 'claws', carapace: 0.9, seams: 0.4 });
}
