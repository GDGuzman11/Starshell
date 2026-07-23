'use client';

/**
 * BOSS OVERDRIVE cutscene — the "power up your gun" beat that plays after the boss
 * reveal. Shows the WEAPON CURRENTLY IN USE (built from the same primitives as the loadout
 * preview), a button-press cue, then floods it BRIGHT RED (emissive ignition + bloom) before
 * handing back to the fight, where the ×2.5 buff is live and every weapon glows red when held.
 * Self-contained Three scene; disposes on unmount. Reduced-motion → quick static beat.
 *
 * Imported only by the /arcade tree.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { buildGun, disposeModel } from '../fps/models';

const DUR = 3.6; // total cutscene seconds

export function WeaponOverdrive({ gunId, onDone }: { gunId: string; onDone: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // 0 present · 1 arm(press) · 2 ignite

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, w / h, 0.05, 50);
    camera.position.set(0, 0.1, 2.7);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(1.2, 2, 1.6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff6a6a, 0.5);
    rim.position.set(-1.5, 0.4, -1.2);
    scene.add(rim);

    // Build the CURRENTLY EQUIPPED gun, normalized + centred in the frame.
    const guns: THREE.Group[] = [];
    const redMats: { mat: THREE.MeshStandardMaterial; emissive: THREE.Color; intensity: number }[] = [];
    {
      const holder = new THREE.Group();
      const m = buildGun(gunId, 'desktop');
      const bbox = new THREE.Box3().setFromObject(m);
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = 1.5 / maxDim;
      const center = bbox.getCenter(new THREE.Vector3());
      m.scale.setScalar(s);
      m.position.set(-center.x * s, -center.y * s, -center.z * s);
      holder.add(m);
      holder.rotation.y = -Math.PI / 2; // side profile (best silhouette)
      scene.add(holder);
      guns.push(holder);
      const seen = new Set<THREE.MeshStandardMaterial>();
      m.traverse((o) => {
        const mat = (o as THREE.Mesh).material;
        const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
        for (const mm of mats) {
          if (mm instanceof THREE.MeshStandardMaterial && !seen.has(mm)) {
            seen.add(mm);
            redMats.push({ mat: mm, emissive: mm.emissive.clone(), intensity: mm.emissiveIntensity });
          }
        }
      });
    }

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new BloomEffect({ intensity: 1.9, luminanceThreshold: 0.15, luminanceSmoothing: 0.3, mipmapBlur: true });
    composer.addPass(new EffectPass(camera, bloom));

    const RED = new THREE.Color(0xff0808); // bright red ignition
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = reduced ? DUR : (performance.now() - start) / 1000;
      // timeline: 0–1 present · 1–1.7 arm (dip) · 1.7–2.6 ignite (red ramp) · hold
      const red = reduced ? 1 : Math.max(0, Math.min(1, (t - 1.7) / 0.9));
      const dip = reduced ? 0 : Math.max(0, Math.sin(Math.max(0, Math.min(1, (t - 1.0) / 0.7)) * Math.PI)) * 0.12;
      for (let i = 0; i < guns.length; i++) {
        if (!reduced) guns[i].rotation.y = -Math.PI / 2 + Math.sin(t * 0.6 + i) * 0.12;
        guns[i].position.y = -dip;
      }
      for (const r of redMats) {
        r.mat.emissive.copy(r.emissive).lerp(RED, red);
        r.mat.emissiveIntensity = r.intensity + red * (3.2 + 0.8 * Math.sin(t * 9)); // bright, pulsing
      }
      bloom.intensity = 1.9 + red * 2.2;
      composer.render();
    };
    tick();

    // DOM phase text + completion (reduced-motion collapses the timing).
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (reduced) {
      setPhase(2);
      timers.push(setTimeout(() => onDoneRef.current(), 900));
    } else {
      timers.push(setTimeout(() => setPhase(1), 1000));
      timers.push(setTimeout(() => setPhase(2), 1700));
      timers.push(setTimeout(() => onDoneRef.current(), DUR * 1000));
    }

    return () => {
      cancelAnimationFrame(raf);
      for (const tm of timers) clearTimeout(tm);
      for (const g of guns) disposeModel(g);
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [gunId]);

  return (
    <div className="absolute inset-0 z-[46] flex flex-col items-center justify-center overflow-hidden bg-[#07070c]/92 font-pixel [animation:gdg-fade-in_0.35s_ease-out]">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="relative z-10 flex flex-col items-center">
        {phase < 2 ? (
          <>
            <p className="text-[9px] tracking-[0.35em] text-white/60 sm:text-[12px]">WEAPONS SYSTEM</p>
            <div className={`mt-4 flex flex-col items-center ${phase === 1 ? '[animation:gdg-count-pop_0.4s_ease-out]' : ''}`}>
              <span className="text-[10px] tracking-[0.3em] text-[#ff6a6a] sm:text-[13px]">⚡ ENGAGE OVERDRIVE</span>
              <span className={`mt-2 inline-block rounded-md border px-4 py-1.5 text-[9px] tracking-[0.2em] sm:text-[11px] ${phase === 1 ? 'translate-y-[2px] border-[#ff2a2a] bg-[#ff2a2a]/25 text-white' : 'border-[#ff6a6a]/40 bg-[#ff2a2a]/10 text-[#ff9a9a]'}`}>
                ▼ PRESS
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="text-[30px] leading-none tracking-[0.15em] text-[#ff3a3a] sm:text-[46px] [animation:gdg-count-pop_0.6s_ease-out]" style={{ textShadow: '0 0 18px rgba(255,40,40,0.8)' }}>
              OVERDRIVE
            </p>
            <p className="mt-3 text-[9px] tracking-[0.35em] text-white/80 sm:text-[12px]">WEAPONS HOT · ×2.5 DAMAGE</p>
          </>
        )}
      </div>
    </div>
  );
}
