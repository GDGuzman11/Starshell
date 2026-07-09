/**
 * Shared setup for armor PRODUCT builders (Armor Overhaul Pt2). Provides the materials +
 * a compressed bulk (so higher tiers read as craftsmanship, not size) + glow/spin taggers
 * the MarinePreview animates. Every product family reuses this.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { accent, metal } from '../../models/parts';
import type { ArmorModelSpec } from '../parts';

export function kit(spec: ArmorModelSpec, rt: RenderTier, compress = 0.3) {
  const g = new THREE.Group();
  const b = 0.92 + (spec.bulk - 0.85) * compress; // compressed bulk range (premium ≠ bigger)
  const body = metal(spec.body, rt);
  const dark = metal(0x15171b, rt);
  const glow = accent(spec.accent, rt, 1.3 + spec.emissive);
  const gl = (m: THREE.Mesh): THREE.Mesh => { m.name = 'glow'; g.add(m); return m; };
  // REALISM: only genuinely rotary kit (a power core's reactor ring, a backpack
  // turbine) actually SPINS; everything else pulses (glow). No spinning helmets/plates.
  const rotary = spec.family === 'core' || spec.family === 'backpack';
  const moving = (m: THREE.Mesh): THREE.Mesh => { m.name = spec.animated && rotary ? 'spin' : 'glow'; g.add(m); return m; };
  return { g, b, body, dark, glow, gl, moving };
}
