'use client';

/**
 * Static weapon thumbnails — renders a weapon model to a cached PNG data-URL using ONE
 * shared WebGL renderer, so the Premium storefront can show a whole grid of guns with
 * ZERO ongoing WebGL contexts (only the open inspect is live). Mirrors GunPreview's
 * lights, bounding-sphere framing and accent tint at a fixed 3/4 angle. Cached by id.
 */
import * as THREE from 'three';
import { accentOf, buildModel, disposeModel } from '../fps/models';

let renderer: THREE.WebGLRenderer | null = null;
const cache = new Map<string, string>();

function ensureRenderer(size: number): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  renderer.setSize(size, size);
  return renderer;
}

/** A cached PNG data-URL of the weapon `id`, rendered once at a fixed 3/4 angle. */
export function weaponThumb(id: string, size = 256): string {
  const hit = cache.get(id);
  if (hit) return hit;
  if (typeof window === 'undefined') return '';
  try {
    const r = ensureRenderer(size);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(1.2, 2, 1.6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb4ff, 0.6);
    rim.position.set(-1.5, 0.5, -1.2);
    scene.add(rim);
    const accentLight = new THREE.PointLight(accentOf(id), 6, 6);
    accentLight.position.set(-0.4, 0.3, 0.8);
    scene.add(accentLight);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
    const pivot = new THREE.Group();
    pivot.rotation.y = -Math.PI / 2 + 0.55; // side profile eased toward 3/4
    pivot.rotation.x = 0.12;
    scene.add(pivot);

    const m = buildModel(id, 'desktop');
    const bbox = new THREE.Box3().setFromObject(m);
    const center = bbox.getCenter(new THREE.Vector3());
    const sphere = bbox.getBoundingSphere(new THREE.Sphere());
    m.position.sub(center);
    pivot.add(m);

    const dist = (sphere.radius / Math.sin((camera.fov * Math.PI) / 180 / 2)) * 1.3;
    camera.position.set(0, dist * 0.16, dist);
    camera.lookAt(0, 0, 0);

    r.render(scene, camera);
    const url = r.domElement.toDataURL('image/png');

    disposeModel(m);
    scene.clear();
    cache.set(id, url);
    return url;
  } catch {
    return '';
  }
}

/** Free the shared renderer's WebGL context (call when leaving the store). The data-URL
 *  cache is kept, so returning to the store re-uses the already-rendered thumbnails. */
export function disposeWeaponThumbRenderer(): void {
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer = null;
  }
}
