/**
 * OUTLANDER gun models — procedurally ASSEMBLED per gun so no two look alike. A per-gun
 * seed (hashed from its id) drives the silhouette: receiver shape, barrel style, handguard,
 * optic, stock, magazine, and a signature GLOW feature. Every gun carries prominent emissive
 * accents tinted to its own colour, plus MOVING parts the previews/viewmodel animate:
 *   • 'glow'  → pulsing emissive
 *   • 'spin'  → rotating coil/cluster
 *   • 'scan'  → a bright light that travels along a rail/chamber (userData.scan = {from,to,speed})
 * One builder serves every Outlander gun (10 starters + the full roster).
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { COL, accent, box, coneZ, cylX, cylZ, finStack, grip, metal, model } from './parts';
import { rng } from '../rand';
import type { WeaponCategory } from '../weapons';

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface Mats {
  body: THREE.Material;
  body2: THREE.Material;
  dark: THREE.Material;
  glow: THREE.Material; // bright emissive, gun colour
  hot: THREE.Material; // hotter core
}
function mats(color: number, tier: RenderTier, bodyCol = COL.gunmetal): Mats {
  return {
    body: metal(bodyCol, tier),
    body2: metal(COL.titanium, tier),
    dark: metal(COL.matteBlack, tier),
    glow: accent(color, tier, 2.6),
    hot: accent(color, tier, 3.4),
  };
}

function muzzleAt(z: number, y = 0): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}
function glowBox(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = box(w, h, d, mat, x, y, z);
  m.name = 'glow';
  return m;
}
/** A bright bar that travels along Z between from..to — the "laser across the chamber". */
function scanBar(mat: THREE.Material, x: number, y: number, from: number, to: number, speed: number, w = 0.03, h = 0.03): THREE.Mesh {
  const m = box(w, h, 0.05, mat, x, y, from);
  m.name = 'scan';
  m.userData.scan = { from, to, speed };
  return m;
}
/** A glowing coil ring stack that spins (name 'spin'). */
function spinCoil(r: number, count: number, gap: number, mat: THREE.Material, x: number, y: number, z0: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'spin';
  for (let i = 0; i < count; i++) g.add(cylZ(r, 0.02, mat, 0, 0, z0 - i * gap, 12));
  g.position.set(x, y, 0);
  return g;
}

type Pick = <T>(a: T[]) => T;

/** Profile per rifle-like category — base proportions + which flourishes suit it. */
interface Profile {
  len: number; // receiver length
  girth: number; // receiver half-height
  scopeChance: number;
  bodyCol: number;
  drum: boolean; // MGs favour drums/belts
  organic: boolean; // alien
}

/** The shared, richly-varied firearm assembly (assault / MG / sniper / alien). */
function buildFirearm(p: Profile, color: number, tier: RenderTier, r: () => number): THREE.Group {
  const M = mats(color, tier, p.bodyCol);
  const pick: Pick = (a) => a[Math.floor(r() * a.length)];
  const parts: THREE.Object3D[] = [];
  const L = p.len * (0.85 + r() * 0.3); // per-gun length jitter
  const G = p.girth * (0.85 + r() * 0.35);
  const zc = 0.02;

  // ── RECEIVER ────────────────────────────────────────────────────────────────
  const recStyle = p.organic ? 'organic' : pick(['box', 'capsule', 'angular', 'heavy', 'split']);
  if (recStyle === 'capsule' || recStyle === 'organic') {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(G, L * 0.7, 5, 12), p.organic ? M.body2 : M.body);
    m.rotation.x = Math.PI / 2;
    m.position.z = zc;
    parts.push(m);
  } else if (recStyle === 'angular') {
    parts.push(box(G * 2, G * 1.6, L, M.body, 0, 0, zc));
    parts.push(box(G * 1.4, G * 2.4, L * 0.5, M.body2, 0, G * 0.7, zc - L * 0.1)); // raised hump
  } else if (recStyle === 'heavy') {
    parts.push(box(G * 2.4, G * 2.2, L * 1.05, M.body2, 0, 0, zc));
  } else if (recStyle === 'split') {
    parts.push(box(G * 2.2, G * 0.8, L, M.body, 0, G * 0.7, zc));
    parts.push(box(G * 2.2, G * 0.8, L, M.body, 0, -G * 0.7, zc));
    parts.push(glowBox(G * 1.4, G * 0.5, L * 0.8, M.glow, 0, 0, zc)); // exposed energy spine
  } else {
    parts.push(box(G * 2, G * 1.8, L, M.body, 0, 0, zc));
  }

  // ── BARREL + its glow flavour ───────────────────────────────────────────────
  const barStyle = pick(['long', 'shroud', 'heavy', 'coil', 'ported']);
  const barLen = L * (barStyle === 'long' ? 1.4 : barStyle === 'heavy' ? 0.9 : 1.1);
  const barZ = -L / 2 - barLen / 2 + 0.02;
  const barR = G * (barStyle === 'heavy' ? 0.5 : 0.32);
  parts.push(cylZ(barR, barLen, M.dark, 0, 0.01, barZ));
  // glowing barrel core — a bright emissive tube just inside/under the barrel (pulses)
  parts.push(glowBox(barR * 0.5, barR * 0.5, barLen * 0.85, M.hot, 0, 0.01, barZ));
  if (barStyle === 'shroud') parts.push(box(barR * 2.4, barR * 2.4, barLen * 0.6, M.body, 0, 0.01, barZ + barLen * 0.1));
  if (barStyle === 'coil') parts.push(spinCoil(barR * 1.5, 4, barLen * 0.16, M.glow, 0, 0.01, barZ - barLen * 0.2));
  if (barStyle === 'ported') parts.push(finStack(3, barLen * 0.14, barR * 2.6, barR * 0.5, M.dark, 0, 0.01 + barR, barZ));
  if (barStyle === 'long') parts.push(box(0.015, G * 0.7, 0.02, M.glow, 0, G + 0.02, barZ - barLen * 0.35)); // front sight

  // ── HANDGUARD ───────────────────────────────────────────────────────────────
  const hg = pick(['slim', 'rail', 'vent', 'none']);
  if (hg === 'slim') parts.push(box(G * 1.6, G * 1.4, L * 0.55, M.body, 0, 0.01, -L * 0.28));
  else if (hg === 'rail') { parts.push(box(G * 1.7, G * 1.5, L * 0.6, M.body2, 0, 0.01, -L * 0.3)); for (let i = 0; i < 4; i++) parts.push(box(G * 1.75, 0.01, 0.03, M.dark, 0, G * 0.9, -L * 0.1 - i * L * 0.14)); }
  else if (hg === 'vent') { parts.push(box(G * 1.6, G * 1.3, L * 0.5, M.body, 0, 0.01, -L * 0.28)); parts.push(finStack(4, L * 0.1, G * 1.7, G * 0.9, M.dark, 0, 0.01, -L * 0.12)); }

  // ── SIGNATURE GLOW FEATURE (animated) ───────────────────────────────────────
  const feat = pick(['scanrail', 'chamber', 'coilcore', 'sidevents', 'topcore']);
  if (feat === 'scanrail') {
    // a bright laser dot that travels the length of the top rail
    parts.push(box(G * 0.5, G * 0.35, L * 0.8, M.dark, 0, G * 1.15, zc)); // rail housing
    parts.push(scanBar(M.hot, 0, G * 1.32, -L * 0.4, L * 0.4, 1.6 + r() * 1.4, G * 0.6, G * 0.28));
  } else if (feat === 'chamber') {
    parts.push(glowBox(G * 1.1, G * 1.0, L * 0.3, M.glow, 0, 0, zc + L * 0.12)); // big pulsing chamber
    parts.push(scanBar(M.hot, 0, G * 0.6, -L * 0.15, L * 0.35, 2.2, G * 0.9, 0.05));
  } else if (feat === 'coilcore') {
    parts.push(spinCoil(G * 1.2, 5, L * 0.09, M.glow, 0, 0, zc + L * 0.05));
    parts.push(glowBox(G * 0.4, G * 0.4, L * 0.5, M.hot, 0, 0, zc)); // inner core
  } else if (feat === 'sidevents') {
    parts.push(glowBox(0.02, G * 1.0, L * 0.5, M.glow, G * 1.05, 0, zc));
    parts.push(glowBox(0.02, G * 1.0, L * 0.5, M.glow, -G * 1.05, 0, zc));
    parts.push(scanBar(M.hot, G * 1.06, 0, -L * 0.25, L * 0.25, 2.0, 0.04, G * 0.7));
  } else {
    parts.push(glowBox(G * 0.7, G * 0.5, L * 0.7, M.hot, 0, G * 0.6, zc)); // top energy core
  }

  // ── OPTIC ───────────────────────────────────────────────────────────────────
  const scoped = p.scopeChance > r();
  if (scoped) {
    const big = p.scopeChance > 0.9;
    parts.push(cylZ(G * (big ? 0.7 : 0.45), L * (big ? 0.45 : 0.28), M.dark, 0, G * 1.5, zc + (big ? 0.02 : 0)));
    parts.push(glowBox(G * 0.4, G * 0.4, 0.02, M.hot, 0, G * 1.5, zc + L * (big ? 0.24 : 0.16))); // glowing lens
  } else if (r() < 0.5) {
    parts.push(box(G * 0.5, G * 0.4, G * 0.6, M.dark, 0, G * 1.35, zc)); // red-dot
    parts.push(glowBox(G * 0.16, G * 0.16, 0.02, M.hot, 0, G * 1.4, zc - G * 0.3));
  }

  // ── MAGAZINE ────────────────────────────────────────────────────────────────
  const magStyle = p.drum ? pick(['drum', 'drum', 'box']) : pick(['box', 'curve', 'cell']);
  if (magStyle === 'drum') { const d = cylX(G * 1.4, G * 0.7, M.dark, 0, -G * 1.6, zc + L * 0.05); parts.push(d); parts.push(glowBox(0.03, G * 0.8, G * 0.8, M.glow, G * 0.72, -G * 1.6, zc + L * 0.05)); }
  else if (magStyle === 'curve') { const m = box(G * 1.0, G * 2.4, G * 1.4, M.dark, 0, -G * 2.0, zc + L * 0.08); m.rotation.x = 0.3; parts.push(m); }
  else if (magStyle === 'cell') { parts.push(box(G * 1.3, G * 1.6, G * 1.3, M.dark, 0, -G * 1.6, zc + L * 0.06)); parts.push(glowBox(G * 0.9, G * 1.1, 0.04, M.glow, 0, -G * 1.6, zc + L * 0.06 - G * 0.7)); }
  else parts.push(box(G * 1.0, G * 2.2, G * 1.2, M.dark, 0, -G * 1.9, zc + L * 0.08));

  // ── GRIP + STOCK ────────────────────────────────────────────────────────────
  parts.push(grip(G * 1.0, G * 2.0, G * 1.1, M.dark, 0, -G * 1.5, zc + L * 0.28));
  const stock = pick(['solid', 'skeleton', 'folding', 'none']);
  if (stock === 'solid') parts.push(box(G * 1.2, G * 1.6, L * 0.28, M.body, 0, -G * 0.2, L / 2 + L * 0.1));
  else if (stock === 'skeleton') { parts.push(box(G * 0.5, 0.02, L * 0.3, M.dark, 0, G * 0.7, L / 2 + L * 0.08)); parts.push(box(G * 0.5, 0.02, L * 0.3, M.dark, 0, -G * 0.9, L / 2 + L * 0.08)); parts.push(box(G * 0.5, G * 1.8, 0.03, M.dark, 0, -G * 0.1, L / 2 + L * 0.22)); }
  else if (stock === 'folding') { const s = box(G * 1.0, G * 1.2, L * 0.24, M.body, 0, -G * 0.5, L / 2 + L * 0.06); s.rotation.y = 0.25; parts.push(s); }

  parts.push(muzzleAt(barZ - barLen / 2 - 0.02, 0.01));
  return model(parts);
}

// ── RPG + Handgun (their own seeded builders) ───────────────────────────────────
function buildRPG(color: number, tier: RenderTier, r: () => number): THREE.Group {
  const M = mats(color, tier, COL.olive);
  const pick: Pick = (a) => a[Math.floor(r() * a.length)];
  const parts: THREE.Object3D[] = [];
  const R = 0.085 * (0.85 + r() * 0.4);
  const style = pick(['tube', 'twin', 'boxy']);
  if (style === 'twin') { parts.push(cylZ(R * 0.8, 0.5, M.body, -R * 0.7, 0, 0)); parts.push(cylZ(R * 0.8, 0.5, M.body, R * 0.7, 0, 0)); }
  else if (style === 'boxy') parts.push(box(R * 2.2, R * 2.2, 0.56, M.body, 0, 0, 0));
  else parts.push(cylZ(R, 0.56, M.body, 0, 0, 0));
  parts.push(coneZ(R * 1.3, R * 0.6, 0.14, M.dark, 0, 0, 0.32)); // exhaust
  parts.push(coneZ(R * 0.35, R * 0.95, 0.16, M.hot, 0, 0, -0.32)); // glowing warhead
  parts.push(scanBar(M.hot, 0, R * 1.1, -0.2, 0.24, 1.8, R * 1.2, 0.03)); // charge indicator travels
  if (r() < 0.6) parts.push(spinCoil(R * 1.2, 3, 0.07, M.glow, 0, 0, -0.05));
  parts.push(box(R * 0.6, R * 0.5, 0.1, M.dark, 0, -R * 0.6, -0.04));
  parts.push(glowBox(R * 0.4, R * 0.5, 0.08, M.glow, 0, R * 1.2, -0.02)); // sight
  parts.push(grip(R * 0.9, R * 1.8, R * 1.0, M.dark, 0, -R * 1.7, 0.06));
  parts.push(muzzleAt(-0.42, 0));
  return model(parts);
}

function buildHandgun(color: number, tier: RenderTier, r: () => number): THREE.Group {
  const M = mats(color, tier, COL.steel);
  const pick: Pick = (a) => a[Math.floor(r() * a.length)];
  const parts: THREE.Object3D[] = [];
  const L = 0.22 * (0.85 + r() * 0.35);
  const style = pick(['slide', 'bull', 'compact', 'energy']);
  parts.push(box(0.05, 0.07, L, M.body, 0, 0.03, -0.02));
  parts.push(cylZ(0.02, style === 'bull' ? 0.12 : 0.07, M.dark, 0, 0.035, -L * 0.7));
  if (style === 'energy') { parts.push(glowBox(0.035, 0.04, L * 0.5, M.hot, 0, 0.02, 0)); parts.push(scanBar(M.hot, 0, 0.06, -0.06, 0.05, 2.6, 0.02, 0.02)); }
  else parts.push(glowBox(0.03, 0.03, L * 0.4, M.glow, 0, 0.02, 0.02)); // ejection-port glow
  if (style === 'compact') parts.push(box(0.05, 0.02, L * 0.5, M.dark, 0, 0.07, 0)); // top serrations
  parts.push(glowBox(0.014, 0.014, 0.02, M.hot, 0, 0.075, -L * 0.4)); // front sight
  parts.push(grip(0.05, 0.14, 0.06, M.dark, 0, -0.08, 0.06));
  parts.push(box(0.035, 0.1, 0.04, M.dark, 0, -0.08, 0.06)); // mag
  parts.push(muzzleAt(-L * 0.9, 0.035));
  return model(parts);
}

const PROFILES: Record<Exclude<WeaponCategory, 'rpg' | 'handgun'>, Profile> = {
  assault: { len: 0.42, girth: 0.055, scopeChance: 0.5, bodyCol: COL.gunmetal, drum: false, organic: false },
  alienAssault: { len: 0.42, girth: 0.06, scopeChance: 0.45, bodyCol: 0x2a2438, drum: false, organic: true },
  mg: { len: 0.5, girth: 0.075, scopeChance: 0.3, bodyCol: COL.titanium, drum: true, organic: false },
  sniper: { len: 0.6, girth: 0.05, scopeChance: 1.0, bodyCol: COL.gunmetal, drum: false, organic: false },
};

/** A group whose children ORBIT the origin (spin-group with offset children). */
function orbitGroup(nodes: number, radius: number, mat: THREE.Material, size: number, speed: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'spin';
  g.userData.spin = { speed, axis: 'z' };
  for (let i = 0; i < nodes; i++) {
    const a = (i / nodes) * Math.PI * 2;
    const n = box(size, size, size, mat, Math.cos(a) * radius, Math.sin(a) * radius, 0);
    n.name = 'glow';
    g.add(n);
  }
  g.position.z = z;
  return g;
}

/** PREMIUM flair — a SECOND creative animated feature + prestige trim, so premium guns
 *  always have ≥2 glowing/moving parts working together. Refer to the premium sheets:
 *  ornate energy cores, orbiting nodes, levitating shards, reactor rings. */
function addPremiumFlair(parts: THREE.Object3D[], M: Mats, G: number, L: number, r: () => number): void {
  const pick: Pick = (a) => a[Math.floor(r() * a.length)];
  // prestige trim: thin glowing edge rails down the receiver (glow via bloom)
  parts.push(box(0.012, 0.012, L * 0.9, M.hot, G * 1.02, G * 0.9, 0.02));
  parts.push(box(0.012, 0.012, L * 0.9, M.hot, -G * 1.02, G * 0.9, 0.02));

  const kind = pick(['orbit', 'levitate', 'reactor', 'twinscan']);
  if (kind === 'orbit') {
    // energy nodes orbiting the receiver core
    parts.push(orbitGroup(3, G * 1.7, M.hot, G * 0.55, 2.0 + r(), 0.02));
    const core = box(G * 0.6, G * 0.6, G * 0.6, M.glow, 0, 0, 0.02);
    core.name = 'glow';
    parts.push(core);
  } else if (kind === 'levitate') {
    // a crystalline shard floating above the receiver, bobbing (glows via bloom)
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(G * 0.8), M.hot);
    shard.name = 'bob';
    shard.userData.bob = { amp: G * 0.5, speed: 1.8 + r() };
    shard.position.set(0, G * 2.4, 0.02);
    parts.push(shard);
    parts.push(orbitGroup(2, G * 0.9, M.glow, G * 0.3, 3.0, 0.02)); // tiny orbiters under it
  } else if (kind === 'reactor') {
    // a spinning reactor ring around a pulsing core
    const ring = new THREE.Mesh(new THREE.TorusGeometry(G * 1.4, G * 0.16, 8, 22), M.glow);
    ring.name = 'spin';
    ring.userData.spin = { speed: 1.6 + r(), axis: 'z' };
    ring.position.z = 0.02;
    parts.push(ring);
    const core = box(G * 0.7, G * 0.7, G * 0.7, M.hot, 0, 0, 0.02);
    core.name = 'glow';
    parts.push(core);
  } else {
    // a second scan running the opposite side, phase-offset
    parts.push(scanBar(M.hot, -G * 1.06, 0, L * 0.3, -L * 0.3, 2.4 + r(), 0.04, G * 0.7));
    const chamber = box(G * 1.0, G * 0.8, L * 0.25, M.glow, 0, 0, 0.02 + L * 0.1);
    chamber.name = 'glow';
    parts.push(chamber);
  }
}

/** Build any Outlander gun, seeded from its id so each is visually distinct. Premium guns
 *  get a second creative animated feature + prestige trim. */
export function buildOutlanderGun(category: WeaponCategory, color: number, tier: RenderTier, id: string, premium = false): THREE.Group {
  const r = rng(hashId(id) ^ 0x9e3779b9);
  let g: THREE.Group;
  const M = mats(color, tier, category === 'rpg' ? COL.olive : category === 'handgun' ? COL.steel : category === 'alienAssault' ? 0x2a2438 : COL.gunmetal);
  if (category === 'rpg') g = buildRPG(color, tier, r);
  else if (category === 'handgun') g = buildHandgun(color, tier, r);
  else g = buildFirearm(PROFILES[category], color, tier, r);
  if (premium) {
    const extra: THREE.Object3D[] = [];
    const G = category === 'rpg' ? 0.07 : category === 'handgun' ? 0.05 : PROFILES[category].girth * 1.1;
    const L = category === 'rpg' ? 0.4 : category === 'handgun' ? 0.2 : PROFILES[category].len;
    addPremiumFlair(extra, M, G, L, r);
    for (const e of extra) g.add(e);
  }
  return g;
}
