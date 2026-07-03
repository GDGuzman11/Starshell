/**
 * GHOST SENSOR-BACKPACK PRODUCTS — compact, slim recon packs with sensor/drone systems.
 * Back-mounted; each a distinct silhouette. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

const antennae: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.22 * b, 0.3 * b, 0.12 * b, body, 0, 0, -0.02)); // compact slim body
  for (let i = 0; i < 3; i++) g.add(cylY(0.012, (0.24 + i * 0.06) * b, dark, -0.06 * b + i * 0.06 * b, 0.24 * b, -0.04)); // antenna array
  gl(box(0.03, 0.03, 0.03, glow, 0.06 * b, 0.4 * b, -0.04)); // tip light
  return g;
};

const dish: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl, moving } = kit(spec, rt);
  g.add(box(0.2 * b, 0.28 * b, 0.12 * b, body, 0, 0, -0.02));
  g.add(cylY(0.014, 0.16 * b, dark, 0, 0.24 * b, -0.05)); // mast
  moving(cylZ(0.09 * b, 0.02, glow, 0, 0.3 * b, -0.06, 12)); // rotating scanner dish
  gl(box(0.16 * b, 0.02, 0.03, glow, 0, -0.06 * b, 0.04)); // status strip
  return g;
};

const droneport: B = (spec, rt) => {
  const { g, b, body, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.22 * b, 0.26 * b, 0.13 * b, body, 0, 0, -0.02));
  g.add(box(0.14 * b, 0.1 * b, 0.12 * b, dark, 0, -0.06 * b, -0.06)); // drone bay
  moving(cylZ(0.05 * b, 0.02, glow, 0, -0.06 * b, -0.13, 8)); // rotating launch port
  g.add(cylY(0.012, 0.2 * b, dark, 0.07 * b, 0.22 * b, -0.04)); // short antenna
  return g;
};

const datacore: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.2 * b, 0.32 * b, 0.11 * b, body, 0, 0, -0.02));
  for (let i = 0; i < 3; i++) gl(box(0.16 * b, 0.03, 0.03, glow, 0, 0.1 * b - i * 0.1 * b, 0.03)); // stacked data modules
  g.add(cylY(0.012, 0.22 * b, dark, 0, 0.26 * b, -0.05)); // single mast
  return g;
};

export const GHOST_SENSORPACK: ArmorProduct[] = [
  { id: 'antennae', name: 'Antennae', noun: 'Sensor Pack', build: antennae },
  { id: 'dish', name: 'Dish', noun: 'Scan Pack', build: dish },
  { id: 'droneport', name: 'Droneport', noun: 'Drone Pack', build: droneport },
  { id: 'datacore', name: 'Datacore', noun: 'Data Pack', build: datacore },
];
