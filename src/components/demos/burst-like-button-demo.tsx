"use client";

import { useEffect, useRef, useState } from "react";
import { BurstLikeButton } from "@/components/ui/burst-like-button";

function Flame({ filled }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

export default function BurstLikeButtonDemo() {
  const [status, setStatus] = useState("Tap the thumb. This request always fails.");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  // Simulates an API call that times out, so the button reverts and shakes.
  const flakySave = (next: boolean) => {
    setStatus(next ? "Saving your like…" : "Removing your like…");
    return new Promise<void>((_, reject) => {
      const id = window.setTimeout(() => {
        setStatus("Network error. The like was reverted.");
        reject(new Error("Request timed out"));
      }, 900);
      timers.current.push(id);
    });
  };

  return (
    <div className="flex w-full flex-col items-center gap-6 py-6">
      <article className="w-full max-w-md rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <header className="flex items-center gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-700 text-sm font-semibold text-white">
            MO
          </span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-semibold text-foreground">Maya Okafor</p>
            <p className="truncate text-muted">@mayamakes · 2h</p>
          </div>
        </header>
        <p className="mt-3 text-sm leading-relaxed text-foreground">
          Shipped the new onboarding flow today. Sign-ups finish 38% faster and support tickets dropped by half.
          Small details add up.
        </p>
        <div
          aria-hidden
          className="relative mt-3 h-36 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#db2777_55%,#f59e0b_100%)]"
        >
          <div className="absolute -left-6 top-6 size-28 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-4 right-6 h-16 w-32 rounded-xl border border-white/30 bg-white/15 backdrop-blur-sm" />
          <div className="absolute bottom-10 left-6 h-3 w-24 rounded-full bg-white/40" />
          <div className="absolute bottom-5 left-6 h-3 w-16 rounded-full bg-white/25" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <BurstLikeButton icon="heart" count={1249} />
          <BurstLikeButton icon="star" count={99} />
          <span className="flex-1" />
          <BurstLikeButton icon="bookmark" variant="icon" label="Save post" />
          <BurstLikeButton
            variant="icon"
            label="Mark as hot"
            icon={{ icon: <Flame />, activeIcon: <Flame filled />, color: "#ea580c", particles: ["#f97316", "#facc15", "#ef4444", "#fb923c"] }}
          />
        </div>
      </article>

      <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
        <BurstLikeButton icon="thumb" count={312} onToggle={flakySave} />
        <div className="min-w-0 text-sm">
          <p className="font-medium text-foreground">Flaky network</p>
          <p className="text-muted">{status}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <BurstLikeButton size="sm" count={8} />
        <BurstLikeButton size="md" count={42} defaultPressed />
        <BurstLikeButton size="lg" count={1204} />
        <BurstLikeButton count={57} disabled />
      </div>
    </div>
  );
}
