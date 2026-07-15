/**
 * The 10 doctrine class models — each a `buildHumanoid` call with a distinct
 * silhouette per Gabe's spec (proportions, leg style, armor, weapon, back gear,
 * accent). Same rig → one animator poses them all.
 *
 * FACTION: these are ALIEN troopers (armored aliens) — every class sets `alien: true`
 * so the army shares one species language (non-human sensor-pod head, bio veins,
 * forward carapace hunch); SHAPE carries the faction, per-class ACCENT carries the
 * role. The four squad specials (tank / commander / marksman / engineer) get bespoke
 * silhouettes so they read instantly at 100 m.
 */
import type * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { buildHumanoid } from './humanoid';

/** RIFLEMAN — the baseline alien trooper: pod head, light carapace, pulse rifle, blue. */
export function buildRifleman(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, alien: true, alienHead: 'pod', carapace: 0.5, accent: 0x49a6ff, body: 0x363b43, shoulders: 0.5, weapon: 'rifle' });
}

/** SCOUT — tall, thin, digitigrade legs, minimal armor, cyan. */
export function buildScout(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, alien: true, alienHead: 'pod', scale: 1.15, girth: 0.7, accent: 0x6ad0ff, body: 0x2e3a45, legs: 'digi', shoulders: 0.1, carapace: 0.3, weapon: 'rifle' });
}

/** BREACHER — wide chest, heavy forearms, mandible head, shotgun, orange reactor. */
export function buildBreacher(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, alien: true, alienHead: 'mandible', scale: 0.95, girth: 1.4, accent: 0xff7a2a, body: 0x4a3b30, legs: 'thick', shoulders: 1.4, heavyArms: true, weapon: 'shotgun', backpack: 'reactor', carapace: 0.8 });
}

/** MARKSMAN — "LONGSIGHT": emaciated, tall + very thin, elongated cyclops optic head,
 *  long precision rifle, back targeting fins, purple. A fragile, high-value silhouette. */
export function buildMarksman(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, alien: true, alienHead: 'cyclops', scale: 1.3, girth: 0.55, accent: 0xb15cff, body: 0x33323e, shoulders: 0.2, weapon: 'long', fins: true, carapace: 0.3, hunch: 0.06 });
}

/** SUPPRESSOR — largest infantry, huge backpack + ammo drum, belt-fed, red. */
export function buildSuppressor(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, alien: true, alienHead: 'pod', scale: 1.05, girth: 1.5, accent: 0xff3a48, body: 0x3a3a44, legs: 'thick', shoulders: 1.2, heavyArms: true, weapon: 'beltfed', backpack: 'ammo', carapace: 0.9 });
}

/** ENGINEER — "BIO-WEAVER" (healer): hunched support, bulbous glowing organ backpack +
 *  tendril heal-emitters, floating heal-motes, green core, no gun. */
export function buildEngineer(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, alien: true, alienHead: 'pod', scale: 0.95, girth: 0.85, accent: 0x63ff84, body: 0x2f3a36, shoulders: 0.2, weapon: 'none', organPack: true, drones: 2, hunch: 0.2 });
}

/** TANK — "SIEGE-CARAPACE": hulking forward-hunched siege-beast; ONE oversized asymmetric
 *  shoulder carapace + arm cannon; armor skirt over reverse-jointed piston legs; reactor
 *  hump. A walking bunker, readable from any angle. Apex size. */
export function buildTank(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, alien: true, alienHead: 'pod', scale: 1.5, girth: 2.0, accent: 0xff5a2a, body: 0x44403a, legs: 'piston', shoulders: 0.8, heavyArms: true, weapon: 'cannon', asymShoulder: 'R', skirt: true, spine: true, carapace: 1.2, hunch: 0.22 });
}

/** ELITE — fast-flank officer: pod head, medium carapace, purple energy. */
export function buildElite(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, alien: true, alienHead: 'pod', scale: 1.1, girth: 0.95, accent: 0xb15cff, body: 0x3a3346, shoulders: 0.7, weapon: 'rifle', carapace: 0.6 });
}

/** COMMANDER — "WARCALLER" (captain): tall crowned officer; sensor-crown head + command
 *  shoulder mantle + control drones + reactor spine; white energy. Reads as authority. */
export function buildCommander(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, alien: true, alienHead: 'crown', scale: 1.35, girth: 1.1, accent: 0xffffff, body: 0x4a4e57, shoulders: 0.9, weapon: 'rifle', mantle: true, spine: true, drones: 3, carapace: 0.5 });
}

/** BERSERKER — no gun, mandible head, massive forearms + energy claws, forward-hunched, red. */
export function buildBerserker(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, alien: true, alienHead: 'mandible', scale: 1.0, girth: 1.3, accent: 0xff3a48, body: 0x4a2f2f, legs: 'thick', shoulders: 0.8, heavyArms: true, weapon: 'claws', hunch: 0.35, carapace: 0.7 });
}
