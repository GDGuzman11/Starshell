'use client';

/**
 * COMBAT DIVISIONS — the Marine's graduation. Preview each of the five divisions on a
 * rotating Marine (each has an unmistakable silhouette) and read its two philosophies.
 * The choice unlocks at Marine Level 5 and is PERMANENT: below Level 5 (or once already
 * chosen) this screen is read-only info; at Level 5 with no division yet it becomes a
 * one-time graduation. Selecting a division swaps the Marine's base body everywhere and
 * opens that division's engineering in the Armory.
 */
import { useState } from 'react';
import { MarinePreview } from './MarinePreview';
import { DIVISIONS, type DivisionId } from '../fps/marine/divisions';
import { loadMarine, saveMarine, setDivision, type MarineSave } from '../fps/marine/store';
import { emitProgressChanged } from '../lib/progressEvent';

const NO_PIECES: [] = [];
const GRADUATE_LEVEL = 5;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function FpsDivision({ onBack }: { onBack: () => void }) {
  const [save, setSave] = useState<MarineSave>(() => loadMarine());
  const [focus, setFocus] = useState<DivisionId>((save.division as DivisionId) || 'vanguard');
  const div = DIVISIONS.find((d) => d.id === focus) ?? DIVISIONS[0];
  const selected = save.division;
  // Graduation is a one-time permanent pick, gated to Marine Level 5 with no division yet.
  const canGraduate = !selected && save.marineLevel >= GRADUATE_LEVEL;

  const choose = (id: DivisionId) => {
    if (selected || !canGraduate) return; // permanent — never re-selectable
    setSave((s) => {
      const next = setDivision(s, id);
      saveMarine(next);
      return next;
    });
    emitProgressChanged();
  };

  const heading = canGraduate ? 'COMBAT DIVISION · GRADUATION' : 'COMBAT DIVISIONS';
  const subline = selected
    ? 'Your division is permanent — its silhouette and engineering are locked in.'
    : canGraduate
      ? 'You have reached Marine Level 5. You serve as a MARINE — choose ONE division to graduate into. This choice is permanent.'
      : `You serve as a MARINE — the standard frame every recruit starts with. Each division below hybridises two battlefield philosophies with its own silhouette + engineering; you graduate into ONE, permanently, at Marine Level ${GRADUATE_LEVEL} (currently Level ${save.marineLevel}).`;

  return (
    <div className="absolute inset-0 z-40 flex flex-col gap-2 overflow-auto bg-black/90 px-3 py-4 font-pixel">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#c8a8ff] sm:text-[15px]">{heading}</p>
        <button type="button" onClick={onBack} className="rounded border border-white/20 px-3 py-1.5 text-[9px] uppercase text-white/70 hover:bg-white/10">◂ Back</button>
      </div>
      <p className="text-[7px] text-white/45 sm:text-[8px]">{subline}</p>

      <div className="flex flex-1 flex-col gap-2 lg:flex-row">
        {/* division list */}
        <div className="flex flex-row flex-wrap gap-1.5 lg:w-[28%] lg:flex-col">
          {DIVISIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setFocus(d.id)}
              className={`flex-1 rounded-lg border p-2 text-left transition-colors ${d.id === focus ? 'bg-white/[0.06]' : 'bg-white/[0.02] hover:bg-white/[0.05]'}`}
              style={{ borderColor: d.id === focus ? hex(d.accent) : 'rgba(255,255,255,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[11px]" style={{ color: hex(d.accent) }}>{d.name}</span>
                {selected === d.id && <span className="text-[6px] text-[#aef5c8]">✓ CURRENT</span>}
              </div>
              <span className="text-[6px] text-white/45 sm:text-[7px]">{d.primary} · {d.secondary}</span>
            </button>
          ))}
        </div>

        {/* focused division: rotating silhouette + info + (graduation only) select */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="relative h-64 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#4a5568] to-[#26303f] sm:h-80">
            <MarinePreview equipped={NO_PIECES} divisionId={focus} />
            <p className="pointer-events-none absolute left-2 top-2 text-[10px] sm:text-[13px]" style={{ color: hex(div.accent) }}>{div.name}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[8px] text-white/85 sm:text-[9px]">{div.primary} <span className="text-white/40">/ {div.secondary}</span></p>
            <p className="mt-1 text-[7px] leading-relaxed text-white/55 sm:text-[8px]">{div.philosophy}</p>
            {selected ? (
              <p className="mt-2 w-full rounded border border-[#aef5c8]/40 bg-[#aef5c8]/10 py-1.5 text-center text-[8px] uppercase text-[#aef5c8] sm:text-[9px]">
                {selected === div.id ? 'YOUR DIVISION ✓' : `LOCKED · ${DIVISIONS.find((d) => d.id === selected)?.name ?? ''} CHOSEN`}
              </p>
            ) : canGraduate ? (
              <button
                type="button"
                onClick={() => choose(div.id)}
                className="mt-2 w-full rounded border py-1.5 text-[8px] uppercase transition-colors sm:text-[9px]"
                style={{ borderColor: `${hex(div.accent)}66`, color: hex(div.accent), background: `${hex(div.accent)}14` }}
              >
                GRADUATE INTO {div.name}
              </button>
            ) : (
              <p className="mt-2 w-full rounded border border-white/15 bg-white/[0.03] py-1.5 text-center text-[8px] uppercase text-white/45 sm:text-[9px]">
                UNLOCKS AT MARINE LEVEL {GRADUATE_LEVEL}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
