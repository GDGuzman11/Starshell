/**
 * Parametric weapon assembler — turns a `WeaponBlueprint` into a Three.js model with
 * ZERO hand-coding, so the DNA generator can mint new guns at runtime. It picks the
 * blueprint's silhouette template (base frame + slot anchors), then attaches each
 * generated slot by REUSING the engineering-parts renderer (`buildPartMesh`), applies
 * the DNA palette, and tags moving parts ('spin'/'glow'/'coil'/'muzzle'/'bolt') so the
 * existing viewmodel + loadout preview animate them for free.
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { accent, metal, model } from '../models/parts';
import { buildPartMesh } from '../arsenal/partModel';
import type { PartModelSpec } from '../arsenal/parts';
import { TEMPLATES, defaultAnchor, muzzleAt } from './templates';
import type { BlueprintSlot, WeaponBlueprint } from './blueprint';

/** Darken a hex colour (for the secondary/dark body metal when only one is given). */
function darken(hex: number, f = 0.55): number {
  const r = Math.round(((hex >> 16) & 0xff) * f);
  const g = Math.round(((hex >> 8) & 0xff) * f);
  const b = Math.round((hex & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

function slotToSpec(s: BlueprintSlot, bodyColor: number, accentColor: number): PartModelSpec {
  return {
    slot: s.slot,
    len: s.len,
    girth: s.girth,
    segs: s.segs,
    vents: s.vents,
    muzzle: s.muzzle,
    taper: s.taper,
    emissive: s.emissive,
    animated: s.moving === 'spin' || s.moving === 'coil',
    accent: accentColor,
    body: bodyColor,
  };
}

/** Build a full weapon model from a blueprint. Never throws — an unknown template
 *  falls back to the compact rifle. */
export function buildGeneratedGun(bp: WeaponBlueprint, tier: RenderTier): THREE.Group {
  const pal = bp.model.palette;
  const body0 = pal.body[0] ?? 0x363b43;
  const body1 = pal.body[1] ?? darken(body0);
  const acc = pal.accent;

  const body = metal(body0, tier);
  const dark = metal(body1, tier);
  const glow = accent(acc, tier);

  const t = TEMPLATES[bp.model.template] ?? TEMPLATES.compactRifle;
  const parts: THREE.Object3D[] = [...t.frame({ tier, body, dark, glow })];

  for (const s of bp.model.slots) {
    const mesh = buildPartMesh(slotToSpec(s, body0, acc), tier);
    const a = t.anchors[s.slot] ?? defaultAnchor(s.slot);
    mesh.position.set(a.pos[0], a.pos[1], a.pos[2]);
    if (a.rot) mesh.rotation.set(a.rot[0], a.rot[1], a.rot[2]);
    // Tag moving/emissive parts so the animators (preview spin, viewmodel recoil,
    // glow pulse) can find them. 'coil' maps to 'spin' visually (rotating rings).
    if (s.moving === 'spin' || s.moving === 'coil') mesh.name = 'spin';
    else if (s.moving === 'glow') mesh.name = 'glow';
    else if (s.moving === 'bolt') mesh.name = 'bolt';
    parts.push(mesh);
  }

  parts.push(muzzleAt(t.muzzleZ));
  return model(parts);
}
