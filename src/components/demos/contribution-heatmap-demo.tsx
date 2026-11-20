"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  ContributionHeatmap,
  dayNumberFromISO,
  isoFromDayNumber,
  type ContributionDay,
  type HeatmapPreset,
  type HeatmapRange,
  type SelectedDay,
} from "@/components/ui/contribution-heatmap";

/** Small seeded PRNG (mulberry32), so server and client build the same data. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const START = dayNumberFromISO("2025-11-01")!;
const END = dayNumberFromISO("2026-10-31")!;
const BREAKS = [
  [dayNumberFromISO("2025-12-22")!, dayNumberFromISO("2026-01-02")!],
  [dayNumberFromISO("2026-08-10")!, dayNumberFromISO("2026-08-21")!],
];

const DATA: ContributionDay[] = (() => {
  const rand = mulberry32(20261120);
  const out: ContributionDay[] = [];
  for (let day = START; day <= END; day++) {
    const weekday = (((day % 7) + 7) % 7 + 4) % 7;
    const weekend = weekday === 0 || weekday === 6;
    const onBreak = BREAKS.some(([from, to]) => day >= from && day <= to);
    const r = rand();
    let count = 0;
    if (!onBreak && r > (weekend ? 0.7 : 0.12)) {
      const trend = 2 + ((day - START) / (END - START)) * 6;
      count = Math.round(trend * (0.4 + rand() * 1.4));
      if (rand() < 0.04) count *= 3;
    }
    out.push({ date: isoFromDayNumber(day), count });
  }
  return out;
})();

const RANGES: HeatmapRange[] = [
  { id: "12m", label: "12 months", startDate: "2025-11-01", endDate: "2026-10-31" },
  { id: "6m", label: "6 months", startDate: "2026-05-01", endDate: "2026-10-31" },
  { id: "3m", label: "3 months", startDate: "2026-08-01", endDate: "2026-10-31" },
];

const PRESETS: { id: HeatmapPreset; label: string; swatch: string }[] = [
  { id: "accent", label: "Accent", swatch: "bg-accent" },
  { id: "emerald", label: "Emerald", swatch: "bg-emerald-500" },
  { id: "ember", label: "Ember", swatch: "bg-orange-500" },
  { id: "ocean", label: "Ocean", swatch: "bg-sky-500" },
];

export default function ContributionHeatmapDemo() {
  const [preset, setPreset] = useState<HeatmapPreset>("emerald");
  const [weekStart, setWeekStart] = useState<"sun" | "mon">("sun");
  const [selected, setSelected] = useState<SelectedDay | null>(null);

  const segment = (active: boolean) =>
    cn(
      "flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-[color,background-color,transform] focus-visible:outline-2 focus-visible:outline-ring active:scale-95",
      active ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
    );

  return (
    <div className="w-full min-w-0 max-w-4xl py-2">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <div role="group" aria-label="Colour preset" className="flex flex-wrap rounded-lg bg-surface-2 p-0.5">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => setPreset(p.id)} className={segment(preset === p.id)}>
              <span aria-hidden="true" className={cn("size-2.5 rounded-full", p.swatch)} />
              {p.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Week starts on" className="flex rounded-lg bg-surface-2 p-0.5">
          {(["sun", "mon"] as const).map((ws) => (
            <button key={ws} type="button" aria-pressed={weekStart === ws} onClick={() => setWeekStart(ws)} className={segment(weekStart === ws)}>
              {ws === "sun" ? "Sun first" : "Mon first"}
            </button>
          ))}
        </div>
      </div>

      <ContributionHeatmap
        title="Commits to lofi-component-lab"
        description="Every push to main, by day."
        data={DATA}
        ranges={RANGES}
        preset={preset}
        weekStart={weekStart}
        unit={{ one: "commit", other: "commits" }}
        selectedDate={selected?.date ?? null}
        onSelectDay={setSelected}
      />

      <p aria-live="polite" className="mt-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-muted">
        <span className="font-medium text-foreground">Selected day: </span>
        {selected ? selected.label : "click a cell, or focus the grid and press Enter."}
      </p>
    </div>
  );
}
