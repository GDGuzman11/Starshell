'use client';

/**
 * COMBAT DIVISION — the Marine's graduation. Preview each of the five divisions on a
 * rotating Marine (each has an unmistakable silhouette), read its two philosophies,
 * and commit to one. In production the choice unlocks at Marine Level 5 and is
 * permanent; while building it is freely (re)selectable. Selecting a division swaps
 * the Marine's base body everywhere and opens that division's engineering in the Armory.
 */
import { useState } from 'react';
import { MarinePreview } from './MarinePreview';
import { DIVISIONS, type DivisionId } from '../fps/marine/divisions';
import { loadMarine, saveMarine, setDivision, type MarineSave } from '../fps/marine/store';
import { emitProgressChanged } from '../lib/progressEvent';

const NO_PIECES: [] = [];
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function FpsDivision({ onBack }: { onBack: () => void }) {
  const [save, setSave] = useState<MarineSave>(() => loadMarine());
  const [focus, setFocus] = useState<DivisionId>((save.division as DivisionId) || 'vanguard');
  const div = DIVISIONS.find((d) => d.id === focus) ?? DIVISIONS[0];
  const selected = save.division;

  const choose = (id: DivisionId) => {
    setSave((s) => {
      const next = setDivision(s, id);
      saveMarine(next);
      return next;
    });
    emitProgressChanged();
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col gap-2 overflow-auto bg-black/90 px-3 py-4 font-pixel">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#c8a8ff] sm:text-[15px]">COMBAT DIVISION · GRADUATION</p>
        <button type="button" onClick={onBack} className="rounded border border-white/20 px-3 py-1.5 text-[9px] uppercase text-white/70 hover:bg-white/10">◂ Back</button>
      </div>
      <p className="text-[7px] text-white/45 sm:text-[8px]">Each division is a hybrid of two battlefield philosophies with its own silhouette + engineering. Normally chosen at Marine Level 5 and permanent — selectable now for testing.</p>

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

        {/* focused division: rotating silhouette + info + select */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="relative h-64 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#4a5568] to-[#26303f] sm:h-80">
            <MarinePreview equipped={NO_PIECES} divisionId={focus} />
            <p className="pointer-events-none absolute left-2 top-2 text-[10px] sm:text-[13px]" style={{ color: hex(div.accent) }}>{div.name}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[8px] text-white/85 sm:text-[9px]">{div.primary} <span className="text-white/40">/ {div.secondary}</span></p>
            <p className="mt-1 text-[7px] leading-relaxed text-white/55 sm:text-[8px]">{div.philosophy}</p>
            <button
              type="button"
              onClick={() => choose(div.id)}
              disabled={selected === div.id}
              className="mt-2 w-full rounded border py-1.5 text-[8px] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:text-[9px]"
              style={{ borderColor: `${hex(div.accent)}66`, color: hex(div.accent), background: `${hex(div.accent)}14` }}
            >
              {selected === div.id ? 'CURRENT DIVISION ✓' : `GRADUATE INTO ${div.name}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
