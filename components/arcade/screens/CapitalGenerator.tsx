'use client';

/**
 * DEV-ONLY Capital Ship ("Star Destroyer") CATALOG viewer. Pick one of the 100 baked
 * ships from the dropdown (or Random); a live rotating 3D preview builds it and its
 * cinematic write-up shows beside it. Click the preview to enlarge to (near) fullscreen.
 * The AI "author" flow was removed — the catalog is the single source of ships now.
 * Never mounted outside dev.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { animateCapital, buildCapital } from '../fps/capital/model';
import { CAPITAL_CATALOG } from '../fps/capital/catalog';
import type { CapitalSpec } from '../fps/capital/spec';

const disposeGroup = (o: THREE.Object3D) => {
  o.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
  });
};

export function CapitalGenerator({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [spec, setSpec] = useState<CapitalSpec | null>(CAPITAL_CATALOG[0] ?? null);
  const [expanded, setExpanded] = useState(false); // click the preview to fill the screen

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CAPITAL_CATALOG;
    return CAPITAL_CATALOG.filter((s) => s.name.toLowerCase().includes(q) || s.hull.includes(q) || s.primary.toLowerCase().includes(q));
  }, [query]);
  // Index of the currently-shown ship within the catalog (for the dropdown's value).
  const catalogIdx = useMemo(() => (spec ? CAPITAL_CATALOG.findIndex((s) => s.name === spec.name && s.seed === spec.seed) : -1), [spec]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const shipRef = useRef<THREE.Group | null>(null);
  const fitRef = useRef(200); // bounding-sphere radius of the current ship
  const centerRef = useRef(new THREE.Vector3()); // its visual centre (families aren't centred on origin)

  // Renderer + orbit loop (mount once).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x05070d);
    scene.add(new THREE.HemisphereLight(0x9fbfff, 0x202028, 1.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(1, 1.4, 0.8);
    scene.add(dir);
    const camera = new THREE.PerspectiveCamera(45, 1.6, 0.5, 3000);
    const resize = () => {
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 360;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      const now = performance.now();
      if (shipRef.current) animateCapital(shipRef.current, 0.016, now);
      const t = (now - t0) / 1000;
      // Frame the ship's real bounding sphere to BOTH the vertical and horizontal FOV
      // (with margin), and orbit its actual centre — so tall families fit, not just wide.
      const radius = fitRef.current;
      const vFov = (camera.fov * Math.PI) / 180;
      const distV = radius / Math.sin(vFov / 2);
      const distH = radius / Math.sin(Math.atan(Math.tan(vFov / 2) * camera.aspect));
      const dist = Math.max(distV, distH) * 1.2;
      const c = centerRef.current;
      camera.position.set(c.x + Math.cos(t * 0.22) * dist, c.y + dist * 0.32, c.z + Math.sin(t * 0.22) * dist);
      camera.lookAt(c);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (shipRef.current) disposeGroup(shipRef.current);
      renderer.dispose();
    };
  }, []);

  // Rebuild the ship whenever the spec changes.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !spec) return;
    if (shipRef.current) {
      scene.remove(shipRef.current);
      disposeGroup(shipRef.current);
    }
    const ship = buildCapital(spec, 'desktop');
    scene.add(ship);
    shipRef.current = ship;
    // Measure the actual geometry so every silhouette family frames correctly.
    const box = new THREE.Box3().setFromObject(ship);
    box.getCenter(centerRef.current);
    fitRef.current = Math.max(20, box.getBoundingSphere(new THREE.Sphere()).radius);
  }, [spec]);

  // Re-fit the renderer to the canvas after enlarge/restore (layout change, not a window resize).
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => cancelAnimationFrame(id);
  }, [expanded]);

  const Line = ({ label, value }: { label: string; value?: string }) =>
    value ? (
      <div className="mt-1.5">
        <p className="font-pixel text-[6px] uppercase tracking-[0.2em] text-[#ffd27a]/70">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/85">{value}</p>
      </div>
    ) : null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-black/90 px-3 py-2 sm:px-5 sm:py-3">
      <div className="flex items-center justify-between">
        <p className="font-pixel text-[10px] tracking-[0.2em] text-[#ff7a2a] sm:text-[13px]">⬢ CAPITAL SHIP CATALOG · {CAPITAL_CATALOG.length}</p>
        <button type="button" onClick={onBack} className="min-h-[28px] rounded border border-white/20 bg-white/[0.04] px-3 font-pixel text-[8px] uppercase text-white/60 hover:bg-white/10">◂ BACK</button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-pixel text-[7px] uppercase tracking-[0.2em] text-white/40">Destroyer</span>
        <select
          value={catalogIdx}
          onChange={(e) => { const s = CAPITAL_CATALOG[+e.target.value]; if (s) setSpec(s); }}
          className="min-w-[220px] max-w-full flex-1 rounded border border-white/15 bg-black/60 px-2 py-1.5 font-pixel text-[9px] text-[#ffb27a]"
        >
          <option value={-1} disabled>Select a Destroyer… ({filtered.length}/{CAPITAL_CATALOG.length})</option>
          {filtered.map((s) => {
            const idx = CAPITAL_CATALOG.indexOf(s);
            return <option key={idx} value={idx}>{s.name} — {s.hull}</option>;
          })}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="filter…" className="w-[140px] rounded border border-white/15 bg-black/60 px-2 py-1.5 font-pixel text-[9px] text-white/80 placeholder:text-white/30" />
        <button type="button" onClick={() => setSpec(CAPITAL_CATALOG[Math.floor(Math.random() * CAPITAL_CATALOG.length)])} className="min-h-[30px] rounded border border-[#7fdfff]/50 bg-[#7fdfff]/10 px-3 font-pixel text-[9px] uppercase text-[#7fdfff] hover:bg-[#7fdfff]/20">⚄ Random</button>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        {/* preview — click to enlarge to (near) fullscreen */}
        <div className={expanded ? 'fixed inset-2 z-[60] overflow-hidden rounded-md border border-white/25 bg-black shadow-2xl' : 'relative min-h-[240px] flex-1 overflow-hidden rounded-md border border-white/10 bg-black'}>
          <canvas ref={canvasRef} onClick={() => setExpanded((e) => !e)} className="h-full w-full cursor-pointer" title={expanded ? 'Click to shrink' : 'Click to enlarge'} />
          <button type="button" onClick={() => setExpanded((e) => !e)} className="absolute right-2 top-2 min-h-[26px] rounded border border-white/25 bg-black/60 px-3 font-pixel text-[8px] uppercase text-white/70 hover:bg-white/10">
            {expanded ? '✕ Close' : '⤢ Enlarge'}
          </button>
          {spec && (
            <div className="pointer-events-none absolute bottom-2 left-3">
              <p className="font-pixel text-[14px] text-white drop-shadow sm:text-[18px]">{spec.name}</p>
              <p className="font-pixel text-[7px] uppercase tracking-[0.2em] text-[#ff7a2a]/90">{spec.classification} · {spec.primary} ▸ {spec.secondary}</p>
            </div>
          )}
        </div>
        {/* spec write-up */}
        <div className="min-h-0 w-full overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] p-3 md:w-[42%]">
          {spec ? (
            <>
              <div className="flex flex-wrap gap-x-3 gap-y-1 font-pixel text-[7px] uppercase tracking-[0.15em] text-white/50">
                <span>HULL {spec.hull}</span><span>BRIDGE {spec.bridge}</span><span>LEN {spec.length}</span>
                <span>ENGINES {spec.engines}</span><span>TURRETS {spec.turrets}</span><span>BAYS {spec.bays}</span>
              </div>
              <Line label="Lore" value={spec.lore} />
              <Line label="Silhouette" value={spec.silhouette} />
              <Line label="Engineering" value={spec.engineering} />
              <Line label="Arrival" value={spec.arrival} />
              <Line label="Weapons" value={spec.weapons} />
              <Line label="Audio" value={spec.audio} />
              <Line label="Deployment" value={spec.deployment} />
              <Line label="Departure" value={spec.departure} />
              <Line label="Why it's unlike any other" value={spec.whyUnique} />
            </>
          ) : (
            <p className="font-pixel text-[8px] text-white/40">No ships in the catalog.</p>
          )}
        </div>
      </div>
    </div>
  );
}
