'use client';

/**
 * PREMIUM STORE (scaffold) — shows the three real-cash prestige tiers (Apex / Sovereign /
 * Legendary), each with ten locked "TBD · COMING SOON" weapon slots. Purely presentational
 * for now: no payments, no real weapons. The real store (payment processor + secure
 * entitlement backend) is a separate future build.
 */
import { PREMIUM_TIERS } from '../fps/arsenal/premium';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function FpsPremium({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col gap-3 overflow-auto bg-[#05070c]/97 px-4 py-4 font-pixel">
      <div className="flex items-center justify-between">
        <p className="text-[12px] tracking-[0.2em] text-[#ffd27a] sm:text-[16px]">✦ PREMIUM ARSENAL</p>
        <button type="button" onClick={onBack} className="rounded border border-white/20 px-3 py-1.5 text-[9px] uppercase text-white/70 hover:bg-white/10">◂ Back</button>
      </div>
      <p className="text-[7px] leading-relaxed text-white/45 sm:text-[8px]">
        Prestige-tier hardware acquired with real currency. Each weapon houses its own premium engineering components — far stronger, with unique perks. COMING SOON — the store is not yet live.
      </p>

      {PREMIUM_TIERS.map((tier) => (
        <div key={tier.id} className="rounded-lg border p-3" style={{ borderColor: `${hex(tier.accent)}55`, background: `${hex(tier.accent)}0a` }}>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[11px] tracking-[0.2em] sm:text-[13px]" style={{ color: hex(tier.accent) }}>
              {tier.name}
            </p>
            <p className="text-[6px] uppercase text-white/40 sm:text-[7px]">{tier.slots} WEAPONS · REAL CASH</p>
          </div>
          <p className="mb-2 text-[6px] text-white/40 sm:text-[7px]">{tier.blurb}</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {Array.from({ length: tier.slots }, (_, i) => (
              <div
                key={i}
                className="flex h-14 flex-col items-center justify-center rounded border border-dashed text-center"
                style={{ borderColor: `${hex(tier.accent)}30` }}
              >
                <span className="text-[7px] text-white/45">
                  {tier.code}-{String(i + 1).padStart(2, '0')}
                </span>
                <span className="mt-0.5 text-[6px] text-white/25">TBD</span>
                <span className="mt-0.5 text-[5px] uppercase" style={{ color: `${hex(tier.accent)}aa` }}>
                  🔒 soon
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
