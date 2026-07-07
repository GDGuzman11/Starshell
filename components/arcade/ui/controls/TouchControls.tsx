'use client';

/**
 * The whole mobile control layer. Left thumb = the floating joystick (move); right
 * (aim) thumb = look + a large FIRE PAD that fires while you keep aiming, with the
 * shaped action buttons (jump / reload / swap / throwable / grapple / zoom / crouch)
 * fanning along the thumb arc from the active layout. Buttons never move during play;
 * the layout + sizing come from `layout.ts` and the user's settings. Auto-fire stays
 * an assist (handled in the loop) — this pad is the manual/precise trigger.
 */
import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { FpsControls } from '../FpsControls';
import { ShapeButton } from './ShapeButton';
import { cbColor, type ControlLayout, type ControlButton } from './layout';
import { deriveHudState, buttonState } from './combatState';
import type { FpsSnapshot } from '../../useFpsLoop';

export interface ControlActions {
  onMove: (strafe: number, fwd: number) => void;
  onLook: (dx: number, dy: number) => void;
  setFire: (on: boolean) => void;
  jump: () => void;
  reload: () => void;
  swap: () => void;
  throwGrenade: () => void;
  grapple: () => void;
  zoom: () => void;
  crouch: () => void;
}

export function TouchControls({
  layout,
  cfg,
  actions,
  snap,
  crouched,
}: {
  layout: ControlLayout;
  cfg: { leftHanded: boolean; btnScale: number; joyOpacity: number; highContrast?: boolean; colorblind?: boolean };
  actions: ControlActions;
  snap: FpsSnapshot;
  crouched: boolean;
}) {
  const fireLast = useRef({ x: 0, y: 0 });
  const left = cfg.leftHanded;
  const scale = cfg.btnScale;
  const hc = !!cfg.highContrast;
  const cb = !!cfg.colorblind;
  const hud = deriveHudState(snap, typeof performance !== 'undefined' ? performance.now() : 0);

  // Centre each button on its (x from aim edge, y from bottom) point.
  const posOf = (b: ControlButton): CSSProperties => ({
    left: `${left ? b.x : 100 - b.x}%`,
    top: `${100 - b.y}%`,
    transform: 'translate(-50%,-50%)',
  });

  const fire = layout.buttons.find((b) => b.id === 'fire');
  const actionFor = (id: ControlButton['id']): (() => void) => {
    switch (id) {
      case 'jump': return actions.jump;
      case 'reload': return actions.reload;
      case 'swap': return actions.swap;
      case 'throw': return actions.throwGrenade;
      case 'grapple': return actions.grapple;
      case 'zoom': return actions.zoom;
      case 'crouch': return actions.crouch;
      default: return () => {};
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none">
      <FpsControls onMove={actions.onMove} onLook={actions.onLook} leftHanded={left} opacity={cfg.joyOpacity} />

      {/* FIRE PAD — fires on touch AND keeps aiming while you drag on it. */}
      {fire && (
        <button
          type="button"
          aria-label="Fire"
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); fireLast.current = { x: e.clientX, y: e.clientY }; actions.setFire(true); }}
          onPointerMove={(e) => { actions.onLook(e.clientX - fireLast.current.x, e.clientY - fireLast.current.y); fireLast.current = { x: e.clientX, y: e.clientY }; }}
          onPointerUp={() => actions.setFire(false)}
          onPointerCancel={() => actions.setFire(false)}
          className="pointer-events-auto absolute z-40 flex items-center justify-center rounded-full font-pixel active:scale-95"
          style={{
            width: fire.size * scale,
            height: fire.size * scale,
            color: cbColor(fire.color, cb),
            opacity: hc ? Math.max(0.65, buttonState('fire', hud).prominence) : buttonState('fire', hud).prominence,
            background: `radial-gradient(circle at 50% 40%, ${cbColor(fire.color, cb)}2a, rgba(6,10,16,${hc ? 0.7 : 0.5}))`,
            border: `${hc ? 3 : 2}px solid ${cbColor(fire.color, cb)}${hc ? 'ff' : 'cc'}`,
            boxShadow: `0 0 14px ${cbColor(fire.color, cb)}${hud.enemyNear ? '77' : '44'}, inset 0 0 12px ${cbColor(fire.color, cb)}22`,
            touchAction: 'none',
            ...posOf(fire),
          }}
        >
          <span style={{ fontSize: 26 * scale }}>{fire.icon}</span>
        </button>
      )}

      {/* Shaped action buttons, each with live Dynamic-Combat-HUD emphasis. */}
      {layout.buttons.filter((b) => b.id !== 'fire').map((b) => {
        const dyn = b.id === 'crouch' ? { ...b, icon: crouched ? '▲' : '▼', label: crouched ? 'STAND' : 'CROUCH' } : b;
        const bs = buttonState(b.id, hud);
        return (
          <ShapeButton
            key={b.id}
            btn={{ ...dyn, color: cbColor(dyn.color, cb) }}
            scale={scale}
            highContrast={hc}
            prominence={bs.prominence}
            pulse={bs.pulse}
            cooldown={bs.cooldown}
            onDown={actionFor(b.id)}
            style={posOf(b)}
          />
        );
      })}
    </div>
  );
}
