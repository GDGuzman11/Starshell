'use client';

/**
 * Landscape-only gate for /arcade on phones. When the device is portrait the
 * game pauses (the caller drops the loop's `active`) and this blurs + dims the
 * screen with an animated rotating-phone hint until the player turns landscape.
 */
export function OrientationGate({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-black/85 text-center backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* rotating phone */}
      <div
        aria-hidden
        className="h-16 w-10 rounded-[7px] border-2 border-[#7fdfff]/80"
        style={{ animation: 'gdg-rotate-phone 2.6s ease-in-out infinite' }}
      >
        <div className="mx-auto mt-1 h-0.5 w-3 rounded-full bg-[#7fdfff]/60" />
        <div className="mx-auto mt-[26px] h-1.5 w-1.5 rounded-full bg-[#7fdfff]/60" />
      </div>
      <div>
        <p className="font-pixel text-[12px] text-white sm:text-[14px]">ROTATE YOUR PHONE</p>
        <p className="mt-1 font-pixel text-[7px] uppercase tracking-wider text-white/50 sm:text-[8px]">Starshell plays in landscape</p>
      </div>
    </div>
  );
}
