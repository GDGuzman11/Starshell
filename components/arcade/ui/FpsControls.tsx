'use client';

import { useRef, useState } from 'react';

/**
 * Touch controls: a left thumb-stick for movement (strafe + forward) and a
 * right-half look zone for turning. Firing is automatic on mobile (handled in
 * the game once shooting lands). Each zone tracks its own pointer for two-thumb
 * play. Pointer events unify touch + mouse, but this only renders on touch.
 */
export function FpsControls({
  onMove,
  onLook,
}: {
  onMove: (strafe: number, fwd: number) => void;
  onLook: (dx: number, dy: number) => void;
}) {
  const R = 52;
  const stickId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    let dx = clientX - origin.current.x;
    let dy = clientY - origin.current.y;
    const d = Math.hypot(dx, dy) || 1;
    const cl = Math.min(d, R);
    dx = (dx / d) * cl;
    dy = (dy / d) * cl;
    setThumb({ x: dx, y: dy });
    onMove(dx / R, -dy / R);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none">
      {/* Right look zone */}
      <div
        className="pointer-events-auto absolute inset-y-0 right-0 w-[58%] touch-none"
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

      {/* Left move stick */}
      <div
        className="pointer-events-auto absolute bottom-5 left-5 h-28 w-28 touch-none rounded-full border border-white/15 bg-white/5"
        onPointerDown={(e) => {
          stickId.current = e.pointerId;
          const r = e.currentTarget.getBoundingClientRect();
          origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (stickId.current === e.pointerId) update(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (stickId.current !== e.pointerId) return;
          stickId.current = null;
          setThumb({ x: 0, y: 0 });
          onMove(0, 0);
        }}
        onPointerCancel={() => {
          stickId.current = null;
          setThumb({ x: 0, y: 0 });
          onMove(0, 0);
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-[#7fdfff]/40"
          style={{ transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))` }}
        />
      </div>
    </div>
  );
}
