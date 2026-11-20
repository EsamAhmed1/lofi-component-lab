"use client";

import { useId, useState } from "react";
import { DialKnob } from "@/components/ui/dial-knob";

const DEFAULTS = { volume: 72, cutoff: 2400, pan: 0 };

const formatHz = (hz: number) => {
  if (hz >= 10000) return `${Math.round(hz / 1000)}k`;
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)}k`;
  return String(Math.round(hz));
};

const formatPan = (pan: number) => (pan === 0 ? "C" : pan < 0 ? `L${-pan}` : `R${pan}`);

/** Points for a 2-pole low-pass response drawn on a log frequency axis. */
function responsePath(cutoff: number, volume: number) {
  const width = 300;
  const height = 64;
  const points: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const f = 20 * Math.pow(1000, i / 60);
    const gain = 1 / Math.sqrt(1 + Math.pow(f / cutoff, 4));
    const x = (i / 60) * width;
    const y = height - 4 - gain * (height - 12) * (volume / 100);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M0,${height} L${points.join(" L")} L${width},${height} Z`;
}

export default function DialKnobDemo() {
  const titleId = useId();
  const [volume, setVolume] = useState(DEFAULTS.volume);
  const [cutoff, setCutoff] = useState(DEFAULTS.cutoff);
  const [pan, setPan] = useState(DEFAULTS.pan);

  const reset = () => {
    setVolume(DEFAULTS.volume);
    setCutoff(DEFAULTS.cutoff);
    setPan(DEFAULTS.pan);
  };

  return (
    <div className="w-full max-w-3xl py-6">
      <section
        aria-labelledby={titleId}
        className="rounded-[28px] border border-border bg-surface-2 p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] sm:p-7"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id={titleId} className="text-sm font-semibold text-foreground">
              Channel 3 · Warm Pad
            </h3>
            <p className="text-xs text-muted">Drag, scroll or use the arrow keys. Double-click a knob to reset it.</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="h-9 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-background active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Reset all
          </button>
        </div>

        <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-8 sm:gap-x-10">
          <DialKnob
            label="Volume"
            unit="%"
            value={volume}
            onChange={setVolume}
            defaultValue={DEFAULTS.volume}
            name="volume"
            haptics
            size={128}
          />
          <DialKnob
            label="Cutoff"
            unit="Hz"
            min={20}
            max={20000}
            step={10}
            taper="log"
            value={cutoff}
            onChange={setCutoff}
            defaultValue={DEFAULTS.cutoff}
            formatValue={formatHz}
            name="cutoff"
            color="#f59e0b"
            haptics
            size={128}
          />
          <DialKnob
            label="Pan"
            min={-50}
            max={50}
            value={pan}
            onChange={setPan}
            defaultValue={DEFAULTS.pan}
            formatValue={formatPan}
            name="pan"
            color="#06b6d4"
            haptics
            size={128}
          />
          <DialKnob label="Reverb" unit="%" defaultValue={35} disabled size={128} />
        </div>

        <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <svg aria-hidden viewBox="0 0 300 64" preserveAspectRatio="none" className="h-16 w-full text-accent">
            <path d={responsePath(cutoff, volume)} fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="font-mono text-xs tabular-nums text-foreground sm:text-right">
            Vol {volume}% · Cutoff {formatHz(cutoff)}Hz · Pan {formatPan(pan)}
            <span className="block text-muted">Reverb is bypassed on this channel.</span>
          </p>
        </div>
      </section>
    </div>
  );
}
