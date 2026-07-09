/**
 * fit-to-slot — the shared geometry primitive behind "components piece together
 * rather than overlay." A part/piece is built centred at the origin; `fitToSlot`
 * scales + translates it so its bounding box maps into a TARGET box (the space the
 * replaced base part occupied), so it lands flush, sized from what it replaced.
 *
 * The `mode` protects the component's proportions so nothing squishes:
 *   axisZ     — match length along Z, keep girth uniform (barrels/tubes/emitters).
 *   footprint — match the top footprint, keep height proportional (optics/scopes).
 *   hang      — match width + drop (magazines/feeds).
 *   fill      — per-axis fill, clamped near the mean so no axis distorts hard
 *               (receivers, cores, and every ARMOUR piece — chunky, wraps a region).
 *
 * Used by BOTH the weapon renderer (`arsenal/partModel.ts`) and the armour renderer
 * (`marine/model.ts`). Pure three.js maths, no per-frame cost. On the sync path.
 */
import * as THREE from 'three';

export type FitMode = 'axisZ' | 'footprint' | 'hang' | 'fill';

/** Scale + position `part` (built centred at origin) so it maps into `target`
 *  (a box in the SAME local frame `part` will be added to). */
export function fitToSlot(part: THREE.Object3D, target: THREE.Box3, mode: FitMode): void {
  const pb = new THREE.Box3().setFromObject(part);
  if (pb.isEmpty()) return;
  const ps = pb.getSize(new THREE.Vector3());
  const pc = pb.getCenter(new THREE.Vector3());
  const ts = target.getSize(new THREE.Vector3());
  const tc = target.getCenter(new THREE.Vector3());
  const r = (a: number, b: number) => (a > 1e-4 ? b / a : 1);
  let sx = r(ps.x, ts.x);
  let sy = r(ps.y, ts.y);
  let sz = r(ps.z, ts.z);
  if (mode === 'axisZ') {
    const g = Math.min(sx, sy); // uniform girth so a barrel stays round
    sx = g;
    sy = g;
  } else if (mode === 'footprint') {
    sy = Math.min(sx, sz); // optic height proportional to its footprint
  } else if (mode === 'fill') {
    // per-axis fill, but clamp each axis near the mean so nothing distorts hard
    const mean = Math.cbrt(sx * sy * sz);
    const cl = (v: number) => Math.max(mean / 1.6, Math.min(mean * 1.6, v));
    sx = cl(sx);
    sy = cl(sy);
    sz = cl(sz);
  }
  part.scale.set(sx, sy, sz);
  part.position.set(tc.x - pc.x * sx, tc.y - pc.y * sy, tc.z - pc.z * sz);
}

/** The world-space bbox of `obj` re-expressed in `frame`'s LOCAL coordinates — used
 *  when the target mesh and the part live under a parent group that has its own
 *  transform (the marine's positioned/rotated body-part groups). */
export function localBox(obj: THREE.Object3D, frame: THREE.Object3D): THREE.Box3 {
  frame.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(frame.matrixWorld).invert();
  const b = new THREE.Box3().setFromObject(obj);
  b.applyMatrix4(inv);
  return b;
}

/** Every visible descendant of `g` whose name is one of `names`. */
export function meshesByName(g: THREE.Object3D, names: string[]): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  g.traverse((o) => {
    if (o.name && names.includes(o.name) && o.visible) out.push(o);
  });
  return out;
}
