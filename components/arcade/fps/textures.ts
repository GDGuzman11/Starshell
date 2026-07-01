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

/** A billboard ALIEN SOLDIER sprite (transparent bg), drawn front-on so it
 *  reads from any angle. `frame` selects the pose: 0/1 = running stride, 2 =
 *  firing (gun raised + muzzle flash), 3 = crouched (hunkered, peeking). An
 *  armoured void-trooper: skull-helm, glowing eyes, chest core, rifle held up. */
export function enemyTex(frame: number): Tex {
  const W = 40;
  const H = 54;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const px = (xx: number, yy: number, w: number, h: number, col: string) => {
    x.fillStyle = col;
    x.fillRect(xx, yy, w, h);
  };
  const skin = '#6a9a4a';
  const skinD = '#466930';
  const armor = '#2c3340';
  const armorH = '#3e4a5e';
  const dark = '#161b24';
  const eye = '#c8ff5a';
  const core = '#aef5c8';
  const gun = '#222834';
  const gunD = '#12151d';
  const flashO = '#ffae3a';
  const flashC = '#fff6c8';

  const crouch = frame === 3;
  const fire = frame === 2;
  const yo = crouch ? 7 : 0; // drop the upper body when crouching

  // head: antennae, skull-helm, glowing eyes, breather
  px(15, 1 + yo, 1, 4, skinD);
  px(24, 1 + yo, 1, 4, skinD);
  px(14, 4 + yo, 12, 9, skin);
  px(12, 6 + yo, 16, 6, skin);
  px(13, 12 + yo, 14, 2, skinD);
  px(15, 8 + yo, 4, 3, eye);
  px(21, 8 + yo, 4, 3, eye);
  px(16, 9 + yo, 1, 1, '#ffffff');
  px(22, 9 + yo, 1, 1, '#ffffff');
  px(18, 13 + yo, 4, 2, dark);

  // torso: armour, shoulder pads, glowing chest core
  px(11, 16 + yo, 18, 16, armor);
  px(11, 16 + yo, 18, 2, armorH);
  px(8, 16 + yo, 5, 5, armorH);
  px(27, 16 + yo, 5, 5, armorH);
  px(18, 22 + yo, 4, 5, core);
  px(11, 28 + yo, 18, 1, dark);

  // arms + rifle held up across the chest (barrel to the viewer's left)
  px(8, 21 + yo, 4, 7, skin);
  px(28, 21 + yo, 4, 7, skin);
  const gy = 24 + yo;
  px(24, gy, 7, 5, gunD); // receiver / stock
  px(12, gy + 1, 14, 4, gun); // body
  px(3, gy + 2, 11, 2, gunD); // barrel
  px(18, gy - 2, 2, 2, gun); // sight
  px(21, gy + 5, 3, 4, gunD); // magazine
  px(22, gy + 1, 3, 4, skinD); // trigger hand
  px(11, gy + 1, 3, 4, skinD); // fore hand
  if (fire) {
    px(0, gy, 5, 4, flashO);
    px(1, gy + 1, 3, 2, flashC);
  }

  // legs: stride / planted / crouched
  if (crouch) {
    px(12, 39, 6, 7, skin);
    px(22, 39, 6, 7, skin);
    px(11, 45, 6, 4, skinD);
    px(23, 45, 6, 4, skinD);
    px(10, 48, 7, 3, dark);
    px(23, 48, 7, 3, dark);
  } else if (fire) {
    px(13, 32, 6, 15, skin);
    px(21, 32, 6, 15, skin);
    px(12, 46, 7, 4, dark);
    px(21, 46, 7, 4, dark);
  } else {
    const fwdX = frame ? 6 : -3;
    const bwdX = frame ? -3 : 6;
    px(13 + bwdX, 32, 6, 13, skinD); // back leg (behind, darker)
    px(13 + fwdX, 32, 6, 14, skin); // forward leg
    px(13 + bwdX, 44, 7, 4, dark);
    px(12 + fwdX, 45, 7, 4, dark);
  }
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
