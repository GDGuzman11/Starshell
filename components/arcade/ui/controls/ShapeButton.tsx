'use client';

/**
 * One touch-control button, rendered by SHAPE so the silhouette signals its
 * purpose (fire pad / jump square / reload rectangle / swap capsule / hex
 * throwable / angular grapple / mini zoom). Retro-military CRT styling: pixel
 * glyph, neon outline, soft glow. Supports the Dynamic Combat HUD via `prominence`
 * (out-of-combat dim), `pulse` (attention), `cooldown` (a radial progress ring),
 * and `disabled` (desaturated). Positioning is owned by the layer; this only draws.
 */
import type { CSSProperties } from 'react';
import type { ButtonShape, ControlButton } from './layout';

const SHAPES: Record<ButtonShape, { w: number; h: number; clip?: string; radius?: string }> = {
  firepad: { w: 1, h: 1, radius: '50%' },
  roundsquare: { w: 1, h: 1, radius: '30%' },
  rectangle: { w: 1.7, h: 0.72, radius: '9px' },
  capsule: { w: 1.9, h: 0.66, radius: '999px' },
  hexagon: { w: 1.02, h: 1.08, clip: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)' },
  angular: { w: 1.16, h: 0.92, clip: 'polygon(16% 0, 100% 0, 100% 68%, 84% 100%, 0 100%, 0 32%)' },
  minicircle: { w: 1, h: 1, radius: '50%' },
};

export function ShapeButton({
  btn,
  scale = 1,
  prominence = 1,
  pulse = false,
  cooldown = 0,
  disabled = false,
  highContrast = false,
  onDown,
  onUp,
  onSelect,
  onDragMove,
  selected = false,
  style,
}: {
  btn: ControlButton;
  scale?: number;
  prominence?: number; // 0..1 → opacity (out-of-combat dim)
  pulse?: boolean; // subtle attention pulse
  cooldown?: number; // 0..1 → radial progress ring (e.g. reload)
  disabled?: boolean;
  highContrast?: boolean;
  onDown: () => void;
  onUp?: () => void;
  onSelect?: () => void; // editor: select this button
  onDragMove?: (clientX: number, clientY: number) => void; // editor: drag to move
  selected?: boolean; // editor: highlighted
  style?: CSSProperties; // absolute positioning from the layer
}) {
  const S = SHAPES[btn.shape];
  const h = btn.size * scale;
  const w = h * (S.w / S.h);
  const c = btn.color;
  const clipped = !!S.clip;
  const editing = !!onDragMove;
  const minOp = highContrast ? 0.62 : 0.28;
  const op = disabled ? 0.4 : editing ? 1 : Math.max(minOp, prominence) * (btn.opacity ?? 1);
  const bw = highContrast ? 2.5 : 1.5;

  return (
    <button
      type="button"
      aria-label={btn.label || btn.id}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); if (editing) onSelect?.(); else onDown(); }}
      onPointerMove={editing ? (e) => onDragMove?.(e.clientX, e.clientY) : undefined}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className={`pointer-events-auto absolute z-40 flex select-none flex-col items-center justify-center font-pixel leading-none transition-transform ${editing ? 'cursor-move' : 'active:scale-90'} ${pulse && !disabled && !editing ? 'animate-pulse' : ''}`}
      style={{
        width: w,
        height: h,
        color: c,
        opacity: op,
        filter: disabled ? 'grayscale(0.8)' : undefined,
        background: `radial-gradient(circle at 50% 38%, ${c}${highContrast ? '33' : '22'}, rgba(6,10,16,${highContrast ? 0.75 : 0.62}))`,
        border: clipped ? undefined : `${bw}px solid ${c}${highContrast ? 'ff' : 'cc'}`,
        borderRadius: S.radius,
        clipPath: S.clip,
        boxShadow: selected
          ? `0 0 0 2px #fff, 0 0 14px ${c}aa`
          : clipped
            ? `inset 0 0 0 ${bw}px ${c}${highContrast ? 'dd' : '88'}, 0 0 10px ${c}${highContrast ? '66' : '44'}`
            : `0 0 10px ${c}${highContrast ? '55' : '33'}, inset 0 0 8px ${c}18`,
        touchAction: 'none',
        ...style,
      }}
    >
      {/* radial cooldown / progress ring (e.g. reload) */}
      {cooldown > 0 && cooldown < 1 && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ borderRadius: S.radius ?? '12px', clipPath: S.clip, background: `conic-gradient(${c}aa ${cooldown * 360}deg, transparent 0deg)`, opacity: 0.35 }}
        />
      )}
      <span style={{ fontSize: (btn.shape === 'firepad' ? 26 : 16) * scale }}>{btn.icon}</span>
      {btn.shape !== 'firepad' && btn.label && <span style={{ fontSize: 6.5 * scale, marginTop: 2, letterSpacing: 0.5 }}>{btn.label}</span>}
    </button>
  );
}
