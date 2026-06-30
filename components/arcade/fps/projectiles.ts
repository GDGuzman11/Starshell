/**
 * Pooled traveling-projectile system for boss + minion attacks (acid blobs,
 * rockets, void bolts) — the Boss Overhaul P0 foundation. Guns are hitscan and
 * grenades arc on their own sim; this covers everything that flies toward the
 * player with travel time, optional gravity, and an impact (direct + splash).
 *
 * Scene-agnostic: each projectile keeps its mesh, so a level rebuild that swaps
 * the scene is handled by `clear()` (removes meshes from whatever parent they're
 * on). `update()` is pure-ish — it moves + collides and RETURNS impact events;
 * the caller (useFpsLoop) applies player damage + spawns zones/VFX/shake/sound,
 * keeping those consequences in one place.
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import { segBlocked, type Vec3 } from './combat';
import type { Level3D } from './level3d';
import type { SpatialGrid } from './level/grid';

export interface ProjectileSpawn {
  kind: string; // 'acid' | 'rocket' | 'bolt' | … (caller maps to zone/VFX/sound)
  scene: THREE.Scene;
  x: number;
  y: number;
  z: number;
  dir: Vec3; // need not be normalized
  speed: number;
  dmg: number; // direct-hit damage to the player
  color: number;
  gravity?: number; // 0 = straight (energy), >0 = arcing
  radius?: number; // visual + hit radius (default 0.3)
  splash?: number; // AoE radius on impact (0 = direct only)
  life?: number; // seconds before it silently fizzles (default 5)
}

export interface ProjectileImpact {
  kind: string;
  x: number;
  y: number;
  z: number;
  dmg: number; // damage to apply to the player (0 if it missed)
  hitPlayer: boolean;
  splash: number;
  color: number;
}

interface Projectile {
  kind: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  radius: number;
  dmg: number;
  splash: number;
  color: number;
  life: number;
  mesh: THREE.Mesh;
}

const PLAYER_R = 0.6; // player hit cylinder radius
const PLAYER_CY = 1.0; // chest height above feet

export class ProjectileSystem {
  private geo = new THREE.SphereGeometry(1, 10, 8);
  private list: Projectile[] = [];

  spawn(o: ProjectileSpawn): void {
    const dl = Math.hypot(o.dir[0], o.dir[1], o.dir[2]) || 1;
    const radius = o.radius ?? 0.3;
    const mat = new THREE.MeshBasicMaterial({ color: o.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.scale.setScalar(radius);
    mesh.position.set(o.x, o.y, o.z);
    o.scene.add(mesh);
    this.list.push({
      kind: o.kind,
      x: o.x,
      y: o.y,
      z: o.z,
      vx: (o.dir[0] / dl) * o.speed,
      vy: (o.dir[1] / dl) * o.speed,
      vz: (o.dir[2] / dl) * o.speed,
      gravity: o.gravity ?? 0,
      radius,
      dmg: o.dmg,
      splash: o.splash ?? 0,
      color: o.color,
      life: o.life ?? 5,
      mesh,
    });
  }

  /** Advance every projectile, resolve wall/ground/player collisions, and return
   *  the impacts that occurred this frame (the caller applies damage + effects). */
  update(dt: number, player: { x: number; y: number; z: number }, level: Level3D, grid?: SpatialGrid): ProjectileImpact[] {
    const impacts: ProjectileImpact[] = [];
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      const px = p.x;
      const py = p.y;
      const pz = p.z;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.life -= dt;

      // What did it hit this step?
      const pcx = player.x;
      const pcy = player.y + PLAYER_CY;
      const pcz = player.z;
      const distToPlayer = Math.hypot(p.x - pcx, p.y - pcy, p.z - pcz);
      const hitPlayer = distToPlayer < p.radius + PLAYER_R;
      const hitGround = p.gravity > 0 && p.y <= 0.12;
      const hitWall = segBlocked([px, py, pz], [p.x, p.y, p.z], level, grid);

      if (hitPlayer || hitGround || hitWall || p.life <= 0) {
        if (p.life <= 0 && !hitPlayer && !hitGround && !hitWall) {
          this.remove(i); // fizzled in flight, no impact
          continue;
        }
        const ix = hitGround ? p.x : p.x - p.vx * dt * 0.5;
        const iy = hitGround ? 0.1 : p.y - p.vy * dt * 0.5;
        const iz = hitGround ? p.z : p.z - p.vz * dt * 0.5;
        impacts.push(this.resolveImpact(p, ix, iy, iz, player));
        this.remove(i);
        continue;
      }
      p.mesh.position.set(p.x, p.y, p.z);
    }
    return impacts;
  }

  private resolveImpact(p: Projectile, ix: number, iy: number, iz: number, player: { x: number; y: number; z: number }): ProjectileImpact {
    const d = Math.hypot(ix - player.x, iy - (player.y + PLAYER_CY), iz - player.z);
    let dmg = 0;
    let hitPlayer = false;
    if (p.splash > 0) {
      if (d < p.splash) {
        dmg = Math.round(p.dmg * (1 - d / p.splash));
        hitPlayer = d < p.radius + PLAYER_R;
      }
    } else if (d < p.radius + PLAYER_R) {
      dmg = p.dmg;
      hitPlayer = true;
    }
    return { kind: p.kind, x: ix, y: iy, z: iz, dmg, hitPlayer, splash: p.splash, color: p.color };
  }

  private remove(i: number): void {
    const p = this.list[i];
    p.mesh.parent?.remove(p.mesh);
    (p.mesh.material as THREE.Material).dispose();
    this.list.splice(i, 1);
  }

  /** Remove every active projectile (level rebuild / recovery window). */
  clear(): void {
    for (const p of this.list) {
      p.mesh.parent?.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
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
