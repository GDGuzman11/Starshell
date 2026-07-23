/**
 * In-game first-person viewmodel. Renders the selected weapon model (the SAME
 * primitive builders the loadout preview uses) in its own scene + camera, drawn
 * right after the world composer into the SAME 480×270 buffer with the depth
 * cleared — so the gun is pixelated + never clips into walls. Animations are
 * driven by the game loop: idle bob from movement, recoil kick + muzzle flash on
 * fire, a drop/tilt reload pose, spinning rotary clusters, and pulsing coils.
 *
 * Imported ONLY by the /arcade chunk (useFpsLoop) — never the homepage tree.
 */
import * as THREE from 'three';
import type { RenderTier } from './materials';
import { buildGun, disposeModel } from './models';
import { buildEngineeredGun } from './arsenal/partModel';
import type { EngPart } from './arsenal/parts';
import { gunById } from './weapons';

// Rest pose + framing — all one-line tunable (bottom-right, barrel angled inward).
const REST = { x: 0.2, y: -0.17, z: -0.36, ry: 0.16, rx: 0.03, size: 0.52 };

export class Viewmodel {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  private holder: THREE.Group;
  private model: THREE.Group | null = null;
  private spins: THREE.Object3D[] = [];
  private glows: { mat: THREE.MeshStandardMaterial; base: number }[] = [];
  private scans: { o: THREE.Object3D; from: number; to: number; speed: number }[] = [];
  private bobs: { o: THREE.Object3D; amp: number; speed: number; base: number }[] = [];
  private bolt: THREE.Object3D | null = null;
  private boltBaseZ = 0;
  private flash: THREE.Mesh;
  private tier: RenderTier;
  private reduced: boolean;
  private kick = 0; // recoil 1→0
  private empowered = false; // OVERDRIVE: flood the gun red for the boss fight
  private redMats: { mat: THREE.MeshStandardMaterial; emissive: number; intensity: number }[] = []; // originals to restore
  private bob = 0; // bob phase
  private reloadDur = 0;
  private flashT = 0;
  private spinV = 0; // barrel/cylinder spin velocity (spools up while firing)

  constructor(tier: RenderTier, aspect: number) {
    this.tier = tier;
    this.reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.01, 10);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(0.6, 1, 0.7);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.5);
    rim.position.set(-0.8, -0.2, 0.6);
    this.scene.add(rim);

    this.holder = new THREE.Group();
    this.scene.add(this.holder);

    this.flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false }),
    );
    this.flash.visible = false;
    this.holder.add(this.flash);
  }

  setGun(id: string, parts?: EngPart[]): void {
    if (this.model) {
      this.holder.remove(this.model);
      disposeModel(this.model);
      this.redMats = []; // old materials are gone
    }
    // Build the ENGINEERED model when components are equipped so installed parts are
    // visible first-person (same builder the loadout preview uses); else the base gun.
    const m = parts && parts.length > 0 ? buildEngineeredGun(id, this.tier, parts) : buildGun(id, this.tier);
    // Normalize to a consistent on-screen size + centre at the holder origin.
    const bbox = new THREE.Box3().setFromObject(m);
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = REST.size / maxDim;
    const center = bbox.getCenter(new THREE.Vector3());
    m.scale.setScalar(s);
    m.position.set(-center.x * s, -center.y * s, -center.z * s);
    this.holder.add(m);
    this.model = m;

    this.spins = [];
    this.glows = [];
    this.scans = [];
    this.bobs = [];
    m.traverse((o) => {
      if (o.name === 'spin') this.spins.push(o);
      if (o.name === 'scan' && o.userData.scan) this.scans.push({ o, ...(o.userData.scan as { from: number; to: number; speed: number }) });
      if (o.name === 'bob' && o.userData.bob) this.bobs.push({ o, base: o.position.y, ...(o.userData.bob as { amp: number; speed: number }) });
      if (o.name === 'coil' || o.name === 'glow' || o.name === 'scan') {
        const mat = (o as THREE.Mesh).material;
        if (mat instanceof THREE.MeshStandardMaterial) this.glows.push({ mat, base: mat.emissiveIntensity });
      }
    });
    this.bolt = m.getObjectByName('bolt') ?? null;
    this.boltBaseZ = this.bolt ? this.bolt.position.z : 0;

    // Muzzle flash takes the gun's own colour (from the reference sheet) so energy
    // weapons flash their hue and ballistics flash warm — per Gabe's spec.
    (this.flash.material as THREE.MeshBasicMaterial).color.setHex(gunById(id).color);

    // Park the flash at the muzzle (in holder space, so it tracks the gun pose).
    this.holder.updateWorldMatrix(true, true);
    const muzzle = m.getObjectByName('muzzle');
    if (muzzle) {
      const wp = muzzle.getWorldPosition(new THREE.Vector3());
      this.holder.worldToLocal(wp);
      this.flash.position.copy(wp);
    } else {
      this.flash.position.set(0, 0, -REST.size * 0.6);
    }

    if (this.empowered) this.applyEmpowerTint(); // a weapon switch during OVERDRIVE stays red
  }

  /** OVERDRIVE red state: flood the gun's materials with a red emissive so every held
   *  weapon glows red during a boss fight. Toggled by the loop from `g.weaponBuff`. */
  setEmpowered(on: boolean): void {
    this.empowered = on;
    this.applyEmpowerTint();
  }

  private applyEmpowerTint(): void {
    for (const r of this.redMats) { r.mat.emissive.setHex(r.emissive); r.mat.emissiveIntensity = r.intensity; } // restore
    this.redMats = [];
    if (!this.empowered || !this.model) return;
    const seen = new Set<THREE.MeshStandardMaterial>();
    this.model.traverse((o) => {
      const mat = (o as THREE.Mesh).material;
      const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
      for (const m of mats) {
        if (m instanceof THREE.MeshStandardMaterial && !seen.has(m)) {
          seen.add(m);
          this.redMats.push({ mat: m, emissive: m.emissive.getHex(), intensity: m.emissiveIntensity });
          m.emissive.setHex(0xff0808); // bright red
          m.emissiveIntensity = Math.max(m.emissiveIntensity, 2.2);
        }
      }
    });
  }

  fire(): void {
    this.kick = 1;
    this.flashT = 0.05;
    this.spinV = Math.min(42, this.spinV + 16);
  }

  reload(dur: number): void {
    this.reloadDur = dur;
  }

  /** Per-frame animation tick. `reloading` = seconds remaining (0 = not). */
  update(dt: number, moveSpeed: number, reloading: number): void {
    // Idle bob from movement.
    const bobAmt = Math.min(1, moveSpeed / 4);
    if (!this.reduced) this.bob += dt * (5 + moveSpeed * 1.4);
    const bx = Math.sin(this.bob) * 0.007 * bobAmt;
    const by = Math.abs(Math.sin(this.bob)) * 0.006 * bobAmt;

    // Recoil decay.
    this.kick = Math.max(0, this.kick - dt * 6);

    // Reload pose: dip + tilt, peaking mid-reload.
    let rDrop = 0;
    let rTilt = 0;
    if (reloading > 0 && this.reloadDur > 0) {
      const env = Math.sin(Math.min(1, 1 - reloading / this.reloadDur) * Math.PI);
      rDrop = env * 0.09;
      rTilt = env * 0.5;
    }

    this.holder.position.set(REST.x + bx, REST.y + by - rDrop, REST.z - this.kick * 0.05);
    this.holder.rotation.set(REST.rx + this.kick * 0.13 + rTilt * 0.25, REST.ry, rTilt);

    // Rotary clusters spool down; constant slow idle turn for energy cores.
    this.spinV = Math.max(0, this.spinV - dt * 14);
    for (const o of this.spins) o.rotation.z += dt * (this.spinV + 0.4);

    // Pulsing coils.
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const t = now * 0.003;
    for (const g of this.glows) g.mat.emissiveIntensity = g.base * (0.7 + 0.4 * (0.5 + 0.5 * Math.sin(t)));
    // Traveling laser + levitating parts, so the premium/animated graphics show in-game too.
    const ts = now / 1000;
    for (const sc of this.scans) sc.o.position.z = sc.from + (sc.to - sc.from) * (0.5 + 0.5 * Math.sin(ts * sc.speed));
    for (const b of this.bobs) b.o.position.y = b.base + b.amp * Math.sin(ts * b.speed);

    // Bolt cycle on recoil.
    if (this.bolt) this.bolt.position.z = this.boltBaseZ + this.kick * 0.03;

    // Muzzle flash.
    this.flashT = Math.max(0, this.flashT - dt);
    const fm = this.flash.material as THREE.MeshBasicMaterial;
    this.flash.visible = this.flashT > 0;
    fm.opacity = this.flashT > 0 ? 0.9 : 0;
    this.flash.scale.setScalar(this.flashT > 0 ? 0.7 + Math.random() * 0.8 : 1);
  }

  /** Draw over the composed (pixelated) frame with the depth buffer cleared. */
  render(renderer: THREE.WebGLRenderer): void {
    renderer.setRenderTarget(null);
    const prevAuto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = prevAuto;
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    if (this.model) disposeModel(this.model);
    this.flash.geometry.dispose();
    (this.flash.material as THREE.Material).dispose();
  }
}
