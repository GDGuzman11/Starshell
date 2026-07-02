'use client';

/**
 * Marine avatar preview — a self-contained crisp Three.js turntable that renders the
 * player's permanent Marine (buildMarine) wearing its equipped armour, frames it,
 * and slow-spins it. A hovered `previewPiece` is tried on live (replacing the equipped
 * piece in its own slot) so the Armory bench shows before-buy. Renderer/scene/camera
 * are created once; only the Marine swaps when the loadout changes. Disposes on
 * unmount. Reduced-motion → static 3/4 view. Cloned from GunPreview.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { disposeModel } from '../fps/models';
import { buildMarine } from '../fps/marine/model';
import type { ArmorPiece } from '../fps/marine/parts';

export function MarinePreview({ equipped, previewPiece }: { equipped: ArmorPiece[]; previewPiece?: ArmorPiece | null }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pivotRef = useRef<THREE.Group | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const spinRef = useRef<THREE.Object3D[]>([]);
  const glowRef = useRef<{ mat: THREE.MeshStandardMaterial; base: number }[]>([]);
  const reducedRef = useRef(false);

  // One-time renderer/scene/camera/lights + animation loop.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth || 320, mount.clientHeight || 220);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(30, (mount.clientWidth || 320) / (mount.clientHeight || 220), 0.05, 50);
    camera.position.set(0, 0.9, 3.2);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(1.2, 2, 1.8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb4ff, 0.7);
    rim.position.set(-1.6, 0.8, -1.4);
    scene.add(rim);
    const fill = new THREE.PointLight(0x7fdfff, 4, 8);
    fill.position.set(-0.5, 0.6, 1.2);
    scene.add(fill);

    const pivot = new THREE.Group();
    scene.add(pivot);
    pivotRef.current = pivot;

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;
      if (!reducedRef.current && pivot) pivot.rotation.y += dt * 0.5;
      for (const s of spinRef.current) s.rotation.z += dt * 3.2;
      for (const g of glowRef.current) g.mat.emissiveIntensity = g.base * (0.7 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3)));
      renderer.render(scene, camera);
    };
    tick();

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth || 320;
      const h = mount.clientHeight || 220;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (modelRef.current) disposeModel(modelRef.current);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Swap the Marine when the equipped/try-on set changes.
  useEffect(() => {
    const pivot = pivotRef.current;
    const camera = cameraRef.current;
    if (!pivot || !camera) return;

    if (modelRef.current) {
      pivot.remove(modelRef.current);
      disposeModel(modelRef.current);
    }
    // Try-on: the hovered piece replaces the equipped piece in its own slot.
    const list = equipped.filter((p) => !previewPiece || p.slot !== previewPiece.slot);
    if (previewPiece) list.push(previewPiece);
    const m = buildMarine(list, 'desktop');

    // Centre at the pivot so it spins in place, then frame it.
    const bbox = new THREE.Box3().setFromObject(m);
    const center = bbox.getCenter(new THREE.Vector3());
    const sphere = bbox.getBoundingSphere(new THREE.Sphere());
    m.position.sub(center);
    pivot.add(m);
    modelRef.current = m;

    const dist = (sphere.radius / Math.sin((camera.fov * Math.PI) / 180 / 2)) * 1.15;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);

    const spins: THREE.Object3D[] = [];
    const glows: { mat: THREE.MeshStandardMaterial; base: number }[] = [];
    m.traverse((o) => {
      if (o.name === 'spin') spins.push(o);
      if (o.name === 'glow') {
        const mat = (o as THREE.Mesh).material as THREE.Material;
        if (mat instanceof THREE.MeshStandardMaterial) glows.push({ mat, base: mat.emissiveIntensity });
      }
    });
    spinRef.current = spins;
    glowRef.current = glows;
  }, [equipped, previewPiece]);

  return <div ref={mountRef} className="h-full w-full" aria-hidden />;
}
