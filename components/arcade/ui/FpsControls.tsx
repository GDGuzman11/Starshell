'use client';

import { useRef, useState } from 'react';

/**
 * Touch controls: a FLOATING left thumb-stick (spawns wherever you press on the
 * left half, with a deadzone) for movement, and a right-half drag zone for look.
 * Firing is automatic on target (handled in the loop). Each zone tracks its own
 * pointer for two-thumb play. The stick visuals are `fixed` so they sit exactly
 * under the thumb regardless of safe-area padding.
 */
export function FpsControls({
  onMove,
  onLook,
  leftHanded = false,
  opacity = 1,
}: {
  onMove: (strafe: number, fwd: number) => void;
  onLook: (dx: number, dy: number) => void;
  leftHanded?: boolean;
  opacity?: number;
}) {
  const R = 58;
  const DEAD = 0.15;
  const stickId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [stick, setStick] = useState<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  const apply = (cx: number, cy: number) => {
    let dx = cx - origin.current.x;
    let dy = cy - origin.current.y;
    const d = Math.hypot(dx, dy) || 1;
    const cl = Math.min(d, R);
    dx = (dx / d) * cl;
    dy = (dy / d) * cl;
    setStick((s) => (s ? { ...s, tx: dx, ty: dy } : s));
    let sx = dx / R;
    let sy = -dy / R;
    if (Math.hypot(sx, sy) < DEAD) {
      sx = 0;
      sy = 0;
    }
    onMove(sx, sy);
  };
  const endStick = () => {
    stickId.current = null;
    setStick(null);
    onMove(0, 0);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none">
      {/* Look zone (right by default, left when left-handed) */}
      <div
        className={`pointer-events-auto absolute inset-y-0 ${leftHanded ? 'left-0' : 'right-0'} w-1/2 touch-none`}
        onPointerDown={(e) => {
          lookId.current = e.pointerId;
          lookLast.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (lookId.current !== e.pointerId) return;
          onLook(e.clientX - lookLast.current.x, e.clientY - lookLast.current.y);
          lookLast.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (lookId.current === e.pointerId) lookId.current = null;
        }}
        onPointerCancel={() => (lookId.current = null)}
      />

      {/* Floating-joystick zone (left by default, right when left-handed) */}
      <div
        className={`pointer-events-auto absolute inset-y-0 ${leftHanded ? 'right-0' : 'left-0'} w-1/2 touch-none`}
        onPointerDown={(e) => {
          stickId.current = e.pointerId;
          origin.current = { x: e.clientX, y: e.clientY };
          setStick({ x: e.clientX, y: e.clientY, tx: 0, ty: 0 });
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (stickId.current === e.pointerId) apply(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (stickId.current === e.pointerId) endStick();
        }}
        onPointerCancel={endStick}
      />

      {stick && (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed z-[34] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-white/[0.06]"
            style={{ left: stick.x, top: stick.y, opacity }}
          />
          <div
            aria-hidden
            className="pointer-events-none fixed z-[34] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7fdfff]/45"
            style={{ left: stick.x + stick.tx, top: stick.y + stick.ty, opacity }}
          />
        </>
      )}
    </div>
  );
}
