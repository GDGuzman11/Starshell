/**
 * Builds the Three.js world from a Level3D. Low-poly boxes + canvas textures
 * (nearest-filtered) under bright lighting + light fog, wrapped in a soft,
 * SEEDED light-shade sky (a smooth colour-graded backdrop — no stars). Every
 * level's sky is a different blend, so each arena has its own view. Rendered at
 * low resolution (see useFpsLoop) and CSS-upscaled for the '93 pixel look.
 */
import * as THREE from 'three';
import type { Level3D } from './level3d';
import { getTextures, groundTex } from './textures';
import { rng } from './rand';

export interface World {
  scene: THREE.Scene;
  dispose: () => void;
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

/** Soft vertical light-shade gradient (equirect canvas → sky sphere). */
function skyTexture(seed: number): HTMLCanvasElement {
  const r = rng(seed ^ 0x51ed);
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const x = c.getContext('2d')!;
  const pal = SKIES[Math.floor(r() * SKIES.length)];
  const g = x.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, pal[0]);
  g.addColorStop(0.55, pal[1]);
  g.addColorStop(1, pal[2]);
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

export function buildWorld(level: Level3D): World {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#0e1426', level.size * 0.55, level.size * 2.1);

  // Bright, even lighting so the arena reads clearly.
  scene.add(new THREE.HemisphereLight('#cfe0ff', '#3a4366', 1.7));
  const dir = new THREE.DirectionalLight('#f0f5ff', 1.7);
  dir.position.set(0.4, 1, 0.25);
  scene.add(dir);
  scene.add(new THREE.AmbientLight('#6b7796', 0.9));

  const disposables: { dispose: () => void }[] = [];

  // Soft seeded sky (no stars), unfogged so it stays vivid.
  const sky = new THREE.CanvasTexture(skyTexture(level.seed));
  sky.colorSpace = THREE.SRGBColorSpace;
  const skyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(level.size * 3, 24, 16),
    new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  scene.add(skyMesh);
  disposables.push(skyMesh.geometry, skyMesh.material as THREE.Material, sky);

  // Ground
  const gtex = tex(groundTex(), level.size);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(level.size, level.size),
    new THREE.MeshLambertMaterial({ map: gtex }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  disposables.push(ground.geometry, ground.material as THREE.Material, gtex);

  // Walls / boxes
  const canvases = getTextures();
  const mats = canvases.map((c) => new THREE.MeshLambertMaterial({ map: tex(c) }));
  disposables.push(...mats);
  for (const b of level.boxes) {
    const geo = new THREE.BoxGeometry(b.sx, b.sy, b.sz);
    const mesh = new THREE.Mesh(geo, mats[b.tex % mats.length]);
    mesh.position.set(b.x, b.y, b.z);
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

  return { scene, dispose: () => disposables.forEach((d) => d.dispose()) };
}
