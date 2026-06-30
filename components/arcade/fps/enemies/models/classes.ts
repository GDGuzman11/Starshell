/**
 * The 10 doctrine class models — each a `buildHumanoid` call with a distinct
 * silhouette per Gabe's spec (proportions, leg style, armor, weapon, back gear,
 * accent). Same rig → one animator poses them all.
 */
import type * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { buildHumanoid } from './humanoid';

/** RIFLEMAN — balanced core infantry, angular shoulders, pulse rifle, blue visor. */
export function buildRifleman(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, accent: 0x49a6ff, body: 0x363b43, shoulders: 0.5, weapon: 'rifle', antenna: 1 });
}

/** SCOUT — tall, thin, digitigrade legs, minimal armor, long antenna sensors. */
export function buildScout(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.15, girth: 0.7, accent: 0x6ad0ff, body: 0x2e3a45, legs: 'digi', shoulders: 0.1, weapon: 'rifle', antenna: 2 });
}

/** BREACHER — wide chest, heavy forearms, massive shoulder plates, shotgun, orange reactor. */
export function buildBreacher(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 0.95, girth: 1.4, accent: 0xff7a2a, body: 0x4a3b30, legs: 'thick', shoulders: 1.4, heavyArms: true, weapon: 'shotgun', backpack: 'reactor' });
}

/** MARKSMAN — tallest, very narrow, long rifle, back targeting fins, purple optics. */
export function buildMarksman(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.3, girth: 0.65, accent: 0xb15cff, body: 0x33323e, shoulders: 0.2, weapon: 'long', fins: true });
}

/** SUPPRESSOR — largest infantry, huge backpack + ammo drum, belt-fed, heavy shoulders. */
export function buildSuppressor(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.05, girth: 1.5, accent: 0xff3a48, body: 0x3a3a44, legs: 'thick', shoulders: 1.2, heavyArms: true, weapon: 'beltfed', backpack: 'ammo' });
}

/** ENGINEER — slim, mechanical backpack, floating repair drones, green core, no gun. */
export function buildEngineer(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 0.95, girth: 0.8, accent: 0x63ff84, body: 0x2f3a36, shoulders: 0.2, weapon: 'none', backpack: 'tech', drones: 2 });
}

/** TANK — twice as wide, reverse-jointed piston legs, oversized shoulders, arm cannon,
 *  missile pods, reactor spine. A walking armored vehicle. */
export function buildTank(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.5, girth: 2.0, accent: 0xff5a2a, body: 0x44403a, legs: 'piston', shoulders: 1.6, heavyArms: true, weapon: 'cannon', missilePods: true, spine: true });
}

/** ELITE — officer: elegant armor, long crest, advanced shoulder plates, purple energy. */
export function buildElite(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.1, girth: 0.95, accent: 0xb15cff, body: 0x3a3346, shoulders: 0.7, weapon: 'rifle', crest: true });
}

/** COMMANDER — largest after Tank, white energy, tall back reactor, command drones. */
export function buildCommander(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.35, girth: 1.1, accent: 0xffffff, body: 0x4a4e57, shoulders: 0.9, weapon: 'rifle', spine: true, drones: 3 });
}

/** BERSERKER — no gun, massive forearms + energy claws, forward-hunched, red core. */
export function buildBerserker(tier: RenderTier): THREE.Group {
  return buildHumanoid({ tier, scale: 1.0, girth: 1.3, accent: 0xff3a48, body: 0x4a2f2f, legs: 'thick', shoulders: 0.8, heavyArms: true, weapon: 'claws', hunch: 0.35 });
}
