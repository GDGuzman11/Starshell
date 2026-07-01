/**
 * Procedural wall textures for the raycaster — generated into small offscreen
 * canvases at runtime (no asset files, no CSP surface). Each is 64x64 and the
 * raycaster samples 1px-wide columns from them. STARSHELL look: dark sci-fi
 * panels with neon seams (our own brand — Star Wars scale, arcade punch).
 */
export type Tex = HTMLCanvasElement;
export const TEX_SIZE = 64;

function panel(base: string, seam: string, rivet: string): Tex {
  const c = document.createElement('canvas');
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  const x = c.getContext('2d')!;
  x.fillStyle = base;
  x.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  // subtle noise
  for (let i = 0; i < 420; i++) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    x.fillRect(Math.random() * TEX_SIZE, Math.random() * TEX_SIZE, 1, 1);
  }
  // panel seams (glowing)
  x.strokeStyle = seam;
  x.lineWidth = 2;
  x.strokeRect(1, 1, TEX_SIZE - 2, TEX_SIZE - 2);
  x.beginPath();
  x.moveTo(TEX_SIZE / 2, 2);
  x.lineTo(TEX_SIZE / 2, TEX_SIZE - 2);
  x.stroke();
  // rivets
  x.fillStyle = rivet;
  for (const [px, py] of [[8, 8], [56, 8], [8, 56], [56, 56], [32, 32]]) {
    x.beginPath();
    x.arc(px, py, 2, 0, Math.PI * 2);
    x.fill();
  }
  return c;
}

function hazard(): Tex {
  const c = document.createElement('canvas');
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  const x = c.getContext('2d')!;
  x.fillStyle = '#15171f';
  x.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  for (let i = -TEX_SIZE; i < TEX_SIZE; i += 12) {
    x.fillStyle = (i / 12) % 2 === 0 ? '#e6b800' : '#1b1d26';
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + 12, 0);
    x.lineTo(i + 12 + TEX_SIZE, TEX_SIZE);
    x.lineTo(i + TEX_SIZE, TEX_SIZE);
    x.closePath();
    x.fill();
  }
  x.strokeStyle = '#2a2d3a';
  x.strokeRect(1, 1, TEX_SIZE - 2, TEX_SIZE - 2);
  return c;
}

/** Tiling floor grid — dark metal deck with glowing seams. Defaults to the
 *  original palette; a theme passes its own {base, seam}. */
export function groundTex(pal: { base: string; seam: string } = { base: '#0e1018', seam: '#243047' }): Tex {
  const c = document.createElement('canvas');
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  const x = c.getContext('2d')!;
  x.fillStyle = pal.base;
  x.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  for (let i = 0; i < 300; i++) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    x.fillRect(Math.random() * TEX_SIZE, Math.random() * TEX_SIZE, 1, 1);
  }
  x.strokeStyle = pal.seam;
  x.lineWidth = 2;
  x.strokeRect(0, 0, TEX_SIZE, TEX_SIZE);
  return c;
}

/** Distinct boss sprites (transparent bg): xeno / warrior / octopus. */
export function bossTex(kind: 'xeno' | 'warrior' | 'octopus'): Tex {
  const W = 48;
  const H = 64;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const px = (xx: number, yy: number, w: number, h: number, col: string) => {
    x.fillStyle = col;
    x.fillRect(xx, yy, w, h);
  };
  if (kind === 'xeno') {
    // Xenomorph — biomechanical, elongated dome, inner jaw, tail, claws.
    px(18, 2, 22, 10, '#1d2330'); // long curved dome
    px(14, 8, 30, 8, '#232a3a');
    px(20, 14, 8, 4, '#3a4660'); // inner jaw
    px(16, 18, 16, 26, '#1a2030'); // torso (ribbed)
    for (let y = 20; y < 42; y += 4) px(16, y, 16, 1, '#0d111c');
    px(10, 20, 6, 20, '#161b29'); // arms / claws
    px(32, 20, 6, 20, '#161b29');
    px(8, 38, 4, 4, '#8fa0c0'); // claw tips
    px(36, 38, 4, 4, '#8fa0c0');
    px(14, 44, 8, 16, '#161b29'); // legs
    px(26, 44, 8, 16, '#161b29');
    px(40, 30, 8, 4, '#1a2030'); // tail
    px(44, 26, 4, 8, '#1a2030');
    px(22, 9, 3, 2, '#9cff6a'); // faint glow
  } else if (kind === 'warrior') {
    // Warlord — armoured humanoid with a rifle + sword.
    px(18, 4, 12, 12, '#5a4a2e'); // helmet
    px(20, 8, 8, 3, '#ffae3a'); // visor
    px(14, 16, 20, 24, '#6e5836'); // armoured torso
    px(14, 16, 20, 3, '#8a6e44');
    px(22, 22, 4, 8, '#ffae3a'); // chest emblem
    px(8, 18, 6, 18, '#4a3c26'); // arms
    px(34, 18, 6, 18, '#4a3c26');
    px(14, 40, 8, 20, '#4a3c26'); // legs
    px(26, 40, 8, 20, '#4a3c26');
    px(2, 22, 12, 4, '#3a3a44'); // rifle
    px(0, 24, 4, 2, '#222');
    px(40, 6, 3, 34, '#cfe0ff'); // sword blade
    px(39, 38, 5, 4, '#8a6e44'); // hilt
  } else {
    // Kraken — bulbous head, big eyes, hanging tentacles + projectile claws.
    px(12, 4, 24, 18, '#5a3a7a'); // bulbous head
    px(10, 8, 28, 12, '#6a458f');
    px(15, 11, 6, 6, '#c8ff5a'); // big eyes
    px(27, 11, 6, 6, '#c8ff5a');
    px(17, 13, 2, 3, '#0a0a0a');
    px(29, 13, 2, 3, '#0a0a0a');
    px(16, 22, 16, 8, '#5a3a7a'); // mantle
    for (let i = 0; i < 6; i++) {
      const tx = 8 + i * 6;
      px(tx, 30, 3, 18 + ((i * 5) % 14), '#4a2f6a'); // tentacles
      px(tx, 46 + ((i * 5) % 12), 4, 4, '#c08bff'); // claw tips
    }
  }
  return c;
}

let cache: Tex[] | null = null;
/** Lazily build the default texture set (client-only). */
export function getTextures(): Tex[] {
  if (cache) return cache;
  cache = [
    panel('#1c2233', '#3a6ea5', '#5a7fb5'), // blue tech
    panel('#241c2e', '#7a4bb0', '#a06fd0'), // violet tech
    panel('#22201a', '#b06a2a', '#d08a4a'), // rust
    hazard(), // hazard stripes
  ];
  return cache;
}

/** Build a THEMED wall texture set (3 panel variants + the shared hazard stripes).
 *  Not cached — a level is built once, and themes vary per level. */
export function getThemedTextures(panels: { base: string; seam: string; rivet: string }[]): Tex[] {
  return [panel(panels[0].base, panels[0].seam, panels[0].rivet), panel(panels[1].base, panels[1].seam, panels[1].rivet), panel(panels[2].base, panels[2].seam, panels[2].rivet), hazard()];
}
