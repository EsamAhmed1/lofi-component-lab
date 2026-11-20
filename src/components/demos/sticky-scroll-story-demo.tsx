"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { StickyScrollStory, type StoryStep } from "@/components/ui/sticky-scroll-story";

// Deterministic waveform heights (no Math.random during render).
const WAVE = Array.from({ length: 36 }, (_, i) =>
  Math.round(30 + 60 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37))),
);

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full max-w-[19rem] rounded-2xl border border-border bg-surface p-4 text-foreground shadow-xl", className)}>
      {children}
    </div>
  );
}

function UploadMock() {
  return (
    <Card>
      <div className="grid place-items-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-surface-2 px-3 py-4 text-center">
        <svg viewBox="0 0 24 24" className="size-6 text-violet-600 dark:text-violet-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <p className="text-sm font-medium">Drop footage here</p>
        <p className="text-xs text-muted">MP4 or MOV, up to 10 GB</p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-700 dark:text-violet-300">
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-2 text-xs">
            <span className="truncate font-medium">interview-raw.mp4</span>
            <span className="tabular-nums text-muted">72%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-[72%] rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500" />
          </div>
          <p className="mt-1 text-xs text-muted">1.2 GB · 18:42</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs">
        <span className="size-3 animate-spin rounded-full border-2 border-violet-500 border-t-transparent motion-reduce:animate-none" />
        <span className="text-muted">Transcribing audio, 2 speakers found</span>
      </div>
    </Card>
  );
}

function TimelineMock() {
  return (
    <Card>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Timeline</span>
        <span className="font-mono tabular-nums text-muted">00:07:31</span>
      </div>
      <div className="relative mt-3 grid gap-2">
        <div className="flex gap-1">
          <div className="h-8 w-[22%] rounded-md bg-sky-500/80" />
          <div className="h-8 w-[30%] rounded-md bg-sky-400/80" />
          <div className="h-8 w-[14%] rounded-md bg-indigo-500/80" />
          <div className="h-8 flex-1 rounded-md bg-sky-500/80" />
        </div>
        <div className="flex h-8 items-center gap-[2px] rounded-md bg-surface-2 px-1.5">
          {WAVE.map((h, i) => (
            <span key={i} className="flex-1 rounded-full bg-cyan-600 dark:bg-cyan-300" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="flex gap-1">
          <div className="h-3 w-[18%] rounded bg-rose-400/70" />
          <div className="h-3 w-[9%] rounded bg-rose-400/70" />
          <div className="h-3 w-[12%] rounded bg-rose-400/70" />
        </div>
        <div className="absolute -top-1 bottom-0 left-[41%] w-0.5 bg-foreground">
          <span className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rotate-45 rounded-sm bg-foreground" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/12 px-2.5 py-1.5 text-xs text-emerald-800 dark:text-emerald-200">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m3.5 8.5 3 3 6-7" /></svg>
        Removed 14 filler words, 52s saved
      </div>
    </Card>
  );
}

function CaptionMock() {
  return (
    <Card>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900">
        <div className="absolute bottom-0 left-1/2 h-3/5 w-1/3 -translate-x-1/2 rounded-t-full bg-zinc-700" />
        <div className="absolute top-[18%] left-1/2 size-1/4 -translate-x-1/2 rounded-full bg-zinc-600" />
        <p className="absolute inset-x-3 bottom-2.5 text-center text-[13px] leading-snug font-bold text-white">
          <span className="rounded bg-black px-1.5 py-0.5">
            We shipped it in <span className="text-amber-300">two weeks.</span>
          </span>
        </p>
      </div>
      <div className="mt-3 flex gap-1.5 text-xs">
        <span className="rounded-full border border-border px-2.5 py-1 text-muted">Bold</span>
        <span className="rounded-full bg-amber-400 px-2.5 py-1 font-medium text-zinc-900">Karaoke</span>
        <span className="rounded-full border border-border px-2.5 py-1 text-muted">Minimal</span>
      </div>
      <div className="mt-3 grid gap-1 text-xs">
        <div className="flex gap-2 rounded-md bg-surface-2 px-2 py-1">
          <span className="font-mono text-muted">00:12</span>
          <span>We shipped it in two weeks.</span>
        </div>
        <div className="flex gap-2 px-2 py-1">
          <span className="font-mono text-muted">00:15</span>
          <span className="text-muted">The beta list filled in a day.</span>
        </div>
      </div>
    </Card>
  );
}

function ExportMock() {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0">
          <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
            <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-surface-2" />
            <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round" stroke="#10b981" strokeDasharray={c} strokeDashoffset={c * 0.14} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">86%</span>
        </div>
        <div>
          <p className="text-sm font-medium">Rendering 3 formats</p>
          <p className="text-xs text-muted">About 40 seconds left</p>
        </div>
      </div>
      <ul className="mt-3 grid gap-1.5 text-xs">
        {[
          { label: "Vertical 9:16", sub: "TikTok, Reels", state: "Done" },
          { label: "Landscape 16:9", sub: "YouTube", state: "86%" },
          { label: "Square 1:1", sub: "LinkedIn", state: "Queued" },
        ].map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5">
            <span>
              <span className="font-medium">{row.label}</span> <span className="text-muted">{row.sub}</span>
            </span>
            <span
              className={cn(
                "tabular-nums",
                row.state === "Done" ? "font-medium text-emerald-800 dark:text-emerald-200" : "text-muted",
              )}
            >
              {row.state}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const steps: StoryStep[] = [
  {
    id: "upload",
    title: "Upload your footage",
    description: "Drop in a raw recording. We transcribe it while it uploads, so the edit is ready when the upload finishes.",
    bullets: ["Files up to 10 GB", "Speakers are labelled for you"],
    visual: <UploadMock />,
    gradient: "aurora",
    accent: "#8b5cf6",
  },
  {
    id: "cut",
    title: "Cut the dead air",
    description: "The editor removes silences, filler words and retakes. Every cut stays on the timeline, so you can undo any of them.",
    bullets: ["Filler words and long pauses", "Keeps the best take of each line"],
    visual: <TimelineMock />,
    gradient: "ocean",
    accent: "#0ea5e9",
  },
  {
    id: "captions",
    title: "Style the captions",
    description: "Captions are timed to each word. Pick a style, fix a typo in the text, and the video updates with it.",
    bullets: ["Word-by-word highlight", "Edit captions like a document"],
    visual: <CaptionMock />,
    gradient: "sunset",
    accent: "#f59e0b",
  },
  {
    id: "export",
    title: "Export everywhere",
    description: "Render vertical, landscape and square versions in one go. Faces stay in frame when the video is reframed.",
    bullets: ["Smart reframing per format", "Direct upload to your channels"],
    visual: <ExportMock />,
    gradient: "forest",
    accent: "#10b981",
  },
];

export default function StickyScrollStoryDemo() {
  const [align, setAlign] = useState<"start" | "end">("end");
  const [current, setCurrent] = useState(0);

  return (
    <div className="w-full min-w-0 py-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <p aria-live="polite" className="text-sm text-muted">
          Step {current + 1} of {steps.length}:{" "}
          <span className="font-medium text-foreground">{steps[current].title}</span>
        </p>
        <div role="group" aria-label="Visual panel side" className="flex rounded-lg bg-surface-2 p-0.5 text-xs">
          {(["start", "end"] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-pressed={align === side}
              onClick={() => setAlign(side)}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring active:scale-95",
                align === side ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
              )}
            >
              Visual {side === "start" ? "left" : "right"}
            </button>
          ))}
        </div>
      </div>
      <StickyScrollStory
        eyebrow="AI video editor"
        title="How our AI editor works"
        description="Scroll inside the panel or use the step dots. Four steps take a raw recording to a published clip."
        steps={steps}
        height="28rem"
        align={align}
        onStepChange={(index) => setCurrent(index)}
      />
    </div>
  );
}
