/**
 * Builds the Three.js world from a Level3D. Low-poly boxes + canvas textures
 * (nearest-filtered) under bright lighting + light fog, wrapped in a soft,
 * SEEDED light-shade sky (a smooth colour-graded backdrop — no stars). Every
 * level's sky is a different blend, so each arena has its own view. Rendered at
 * low resolution (see useFpsLoop) and CSS-upscaled for the '93 pixel look.
 */
import * as THREE from 'three';
import type { Box, Level3D } from './level3d';
import { getTextures, getThemedTextures, groundTex } from './textures';
import { rng } from './rand';
import { makeWallMaterial, makeGroundMaterial, type RenderTier } from './materials';
import { themeById } from './kit/themes';

export interface World {
  scene: THREE.Scene;
  dispose: () => void;
  hideBox: (b: Box) => void; // collapse a destroyed structure's instance
}

function tex(canvas: HTMLCanvasElement, repeat = 1): THREE.Texture {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Each entry = [zenith, mid, horizon] shades for a seeded sky blend.
const SKIES: string[][] = [
  ['#0a1330', '#243a72', '#5b7fc4'],
  ['#10112e', '#3a2f6e', '#7a5bb0'],
  ['#06121c', '#123a44', '#2aa1a1'],
  ['#1a1030', '#5a2f5e', '#c4738f'],
  ['#06101e', '#1e3a5e', '#4b8fc4'],
  ['#101a14', '#2a5e44', '#5bc48f'],
];

/** Soft vertical light-shade gradient (equirect canvas → sky sphere). A theme
 *  passes its own [zenith, mid, horizon]; otherwise one is seeded from SKIES. */
function skyTexture(seed: number, themeSky?: readonly [string, string, string]): HTMLCanvasElement {
  const r = rng(seed ^ 0x51ed);
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const x = c.getContext('2d')!;
  const pal = themeSky ?? SKIES[Math.floor(r() * SKIES.length)];
  const g = x.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, pal[0]);
  g.addColorStop(0.55, pal[1]);
  g.addColorStop(1, pal[2]);
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

export function buildWorld(level: Level3D, tier: RenderTier = 'desktop'): World {
  const theme = themeById(level.theme); // undefined = original seeded look
  const scene = new THREE.Scene();
  // Slightly deeper fog gives the bloomed neon more atmosphere to read against.
  scene.fog = new THREE.Fog(theme?.fog ?? '#0e1426', level.size * 0.5, level.size * 2.1);

  // Bright, even lighting so the arena reads clearly.
  scene.add(new THREE.HemisphereLight('#cfe0ff', '#3a4366', 1.7));
  const dir = new THREE.DirectionalLight('#f0f5ff', 1.8);
  dir.position.set(0.4, 1, 0.25);
  scene.add(dir);
  scene.add(new THREE.AmbientLight('#6b7796', 0.9));

  const disposables: { dispose: () => void }[] = [];

  // Soft sky (no stars), unfogged so it stays vivid. Theme-driven if set.
  const sky = new THREE.CanvasTexture(skyTexture(level.seed, theme?.sky));
  sky.colorSpace = THREE.SRGBColorSpace;
  const skyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(level.size * 3, 24, 16),
    new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  scene.add(skyMesh);
  disposables.push(skyMesh.geometry, skyMesh.material as THREE.Material, sky);

  // Ground
  const gtex = tex(groundTex(theme?.ground), level.size);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(level.size, level.size),
    makeGroundMaterial(gtex, tier),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  disposables.push(ground.geometry, ground.material as THREE.Material, gtex);

  // Walls / boxes — rendered as ONE InstancedMesh per material (a war-torn city
  // is hundreds of boxes; per-box meshes would be hundreds of draw calls). Boxes
  // are AABBs, so a shared unit cube scaled/translated per instance is exact.
  // Each box records its (instancedMesh, index) so `hideBox` can collapse a
  // destroyed structure by zeroing its instance matrix.
  const canvases = theme ? getThemedTextures(theme.panels) : getTextures();
  const mats = canvases.map((c) => makeWallMaterial(tex(c), tier));
  disposables.push(...mats);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  disposables.push(unitBox);

  // Bucket boxes by material index.
  const buckets: Box[][] = mats.map(() => []);
  for (const b of level.boxes) buckets[b.tex % mats.length].push(b);

  const boxSlot = new Map<Box, { im: THREE.InstancedMesh; idx: number }>();
  const m4 = new THREE.Matrix4();
  const q0 = new THREE.Quaternion();
  const vPos = new THREE.Vector3();
  const vScale = new THREE.Vector3();
  buckets.forEach((bucket, mi) => {
    if (bucket.length === 0) return;
    const im = new THREE.InstancedMesh(unitBox, mats[mi], bucket.length);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // The geometry is a unit cube at the origin; its bounds don't reflect the
    // spread-out instances, so per-object frustum culling would wrongly drop the
    // whole mesh. It's one draw call covering the arena — just always render it.
    im.frustumCulled = false;
    for (let i = 0; i < bucket.length; i++) {
      const b = bucket[i];
      m4.compose(vPos.set(b.x, b.y, b.z), q0, vScale.set(b.sx, b.sy, b.sz));
      im.setMatrixAt(i, m4);
      boxSlot.set(b, { im, idx: i });
    }
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
  });

  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const hideBox = (b: Box) => {
    const slot = boxSlot.get(b);
    if (!slot) return;
    slot.im.setMatrixAt(slot.idx, zero);
    slot.im.instanceMatrix.needsUpdate = true;
  };

  // Ramps — VISUAL sloped slabs. The collider is the height function in physics;
  // this mesh is only what you see. A thin box tilted to the incline, sized to
  // the footprint across-slope and to the true incline length along-slope.
  for (const rmp of level.ramps ?? []) {
    const alongX = rmp.dir === '+x' || rmp.dir === '-x';
    const run = alongX ? rmp.sx : rmp.sz; // horizontal run along the slope
    const across = alongX ? rmp.sz : rmp.sx; // width perpendicular to the slope
    const dy = rmp.yHi - rmp.yLo;
    const inclineLen = Math.hypot(run, dy);
    const angle = Math.atan2(dy, run); // tilt up toward the high end
    const geo = new THREE.BoxGeometry(alongX ? inclineLen : across, 0.2, alongX ? across : inclineLen);
    const mesh = new THREE.Mesh(geo, mats[rmp.tex % mats.length]);
    mesh.position.set(rmp.x, (rmp.yLo + rmp.yHi) / 2, rmp.z);
    // Rotate so the high end lifts up in the ramp's direction. (Three.js: +rot
    // about Z sends +X→+Y; +rot about X sends +Z→-Y.)
    if (rmp.dir === '+x') mesh.rotation.z = angle; // raise +X end
    else if (rmp.dir === '-x') mesh.rotation.z = -angle; // raise -X end
    else if (rmp.dir === '+z') mesh.rotation.x = -angle; // raise +Z end
    else mesh.rotation.x = angle; // '-z' → raise -Z end
    scene.add(mesh);
    disposables.push(geo);
  }

  // Jump pads — glowing green discs.
  const padMat = new THREE.MeshBasicMaterial({ color: '#aef5c8', transparent: true, opacity: 0.65 });
  disposables.push(padMat);
  for (const pad of level.pads) {
    const geo = new THREE.CylinderGeometry(pad.r, pad.r, 0.14, 18);
    const m = new THREE.Mesh(geo, padMat);
    m.position.set(pad.x, 0.07, pad.z);
    scene.add(m);
    disposables.push(geo);
  }

  // Grapple points — a floating glowing ring marker above each rooftop target.
  if (level.grapplePoints && level.grapplePoints.length) {
    const grMat = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    disposables.push(grMat);
    for (const gp of level.grapplePoints) {
      const gGeo = new THREE.TorusGeometry(0.7, 0.12, 8, 20);
      const m = new THREE.Mesh(gGeo, grMat);
      m.position.set(gp.x, gp.y + 1.7, gp.z);
      m.rotation.x = Math.PI / 2; // lie flat (ring you drop into)
      scene.add(m);
      disposables.push(gGeo);
    }
  }

  // Ziplines — glowing cyan cables + a marker at the grab end.
  const zipMat = new THREE.LineBasicMaterial({ color: '#7fdfff' });
  const nodeMat = new THREE.MeshBasicMaterial({ color: '#7fdfff' });
  disposables.push(zipMat, nodeMat);
  for (const z of level.ziplines) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(z.x0, z.y0, z.z0),
      new THREE.Vector3(z.x1, z.y1, z.z1),
    ]);
    scene.add(new THREE.Line(g, zipMat));
    disposables.push(g);
    const nGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const node = new THREE.Mesh(nGeo, nodeMat);
    node.position.set(z.x0, z.y0, z.z0);
    scene.add(node);
    disposables.push(nGeo);
  }

  // Ladder rungs (thin emissive bars, orientation-aware)
  const ladMat = new THREE.MeshBasicMaterial({ color: '#7fdfff' });
  disposables.push(ladMat);
  for (const l of level.ladders) {
    const along = l.sx >= l.sz;
    const rw = along ? l.sx : 0.1;
    const rd = along ? 0.1 : l.sz;
    for (let y = l.y0 + 0.35; y < l.y1; y += 0.45) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.06, rd), ladMat);
      rung.position.set(l.x, y, l.z);
      scene.add(rung);
      disposables.push(rung.geometry);
    }
  }

  return { scene, dispose: () => disposables.forEach((d) => d.dispose()), hideBox };
}
