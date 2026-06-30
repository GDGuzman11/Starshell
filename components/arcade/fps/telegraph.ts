/**
 * Ground telegraph / decal system — the Boss Overhaul P0 "fair warning" layer.
 * A telegraph is a flat ground decal that grows + pulses during a windup, then
 * RESOLVES at a fixed time (Tentacle Eruption, Slam Wave epicentre, acid-pool
 * marker, etc.). `update()` returns the telegraphs that fired this frame (with
 * whether the player was inside the radius); the caller spawns the real effect —
 * damage / knockback / projectile / zone — keeping consequences in one place.
 *
 * Retro-readability rule: every heavy boss attack is telegraphed before it lands.
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';

export interface TelegraphSpawn {
  kind: string; // 'eruption' | 'slam' | 'pool' | … (caller maps to the effect)
  scene: THREE.Scene;
  x: number;
  z: number;
  radius: number;
  delay: number; // seconds of warning before it fires
  color?: number; // warning colour (default warning-red)
}

export interface TelegraphFire {
  kind: string;
  x: number;
  z: number;
  radius: number;
  hitPlayer: boolean; // player inside the radius at the moment it fired
}

interface Telegraph {
  kind: string;
  x: number;
  z: number;
  radius: number;
  born: number;
  fireAt: number;
  mesh: THREE.Mesh;
}

export class TelegraphSystem {
  private geo = new THREE.CircleGeometry(1, 28);
  private list: Telegraph[] = [];

  constructor() {
    this.geo.rotateX(-Math.PI / 2); // lie flat on the ground (XZ plane)
  }

  spawn(o: TelegraphSpawn, now: number): void {
    const mat = new THREE.MeshBasicMaterial({
      color: o.color ?? 0xff3344,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.position.set(o.x, 0.06, o.z);
    mesh.scale.set(o.radius * 0.3, 1, o.radius * 0.3);
    o.scene.add(mesh);
    this.list.push({ kind: o.kind, x: o.x, z: o.z, radius: o.radius, born: now, fireAt: now + o.delay * 1000, mesh });
  }

  /** Grow + pulse warnings; return the ones that resolved this frame (removed). */
  update(now: number, player: { x: number; z: number }): TelegraphFire[] {
    const fired: TelegraphFire[] = [];
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      if (now >= t.fireAt) {
        fired.push({ kind: t.kind, x: t.x, z: t.z, radius: t.radius, hitPlayer: Math.hypot(player.x - t.x, player.z - t.z) < t.radius });
        this.remove(i);
        continue;
      }
      const prog = Math.min(1, (now - t.born) / (t.fireAt - t.born)); // 0 → 1 toward fire
      const s = t.radius * (0.3 + 0.7 * prog);
      t.mesh.scale.set(s, 1, s);
      const mat = t.mesh.material as THREE.MeshBasicMaterial;
      // Pulse faster + brighter as it nears resolution.
      mat.opacity = 0.22 + 0.3 * prog + 0.12 * Math.sin(now * 0.012 * (1 + prog * 2));
    }
    return fired;
  }

  private remove(i: number): void {
    const t = this.list[i];
    t.mesh.parent?.remove(t.mesh);
    (t.mesh.material as THREE.Material).dispose();
    this.list.splice(i, 1);
  }

  clear(): void {
    for (const t of this.list) {
      t.mesh.parent?.remove(t.mesh);
      (t.mesh.material as THREE.Material).dispose();
    }
    this.list.length = 0;
  }

  get count(): number {
    return this.list.length;
  }

  dispose(): void {
    this.clear();
    this.geo.dispose();
  }
}
