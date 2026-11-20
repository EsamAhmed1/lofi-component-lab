"use client";

import { useEffect, useState } from "react";
import { Skeleton, SkeletonPreset, type SkeletonMode, type SkeletonPresetName } from "@/components/ui/skeleton-shimmer";

const POSTS = [
  { name: "Ines Moreau", handle: "@ines", time: "12m", tint: "linear-gradient(135deg,#6d28d9,#db2777)", body: "Shipped the new onboarding flow. Activation is up 9% in the first week." },
  { name: "Kofi Mensah", handle: "@kofi", time: "40m", tint: "linear-gradient(135deg,#0f766e,#1d4ed8)", body: "Anyone else seeing slow builds on CI today? Ours went from 4 to 11 minutes." },
  { name: "Hana Sato", handle: "@hana", time: "2h", tint: "linear-gradient(135deg,#b45309,#be123c)", body: "Design crit at 3pm. Bring the pricing page drafts and any open questions." },
];

const MODES: { id: SkeletonMode; label: string }[] = [
  { id: "shimmer", label: "Shimmer" },
  { id: "pulse", label: "Pulse" },
  { id: "wave", label: "Wave" },
];

const PRESETS: { id: SkeletonPresetName; label: string; count?: number }[] = [
  { id: "card", label: "card" },
  { id: "list-item", label: "list-item", count: 2 },
  { id: "profile", label: "profile" },
  { id: "table-row", label: "table-row", count: 4 },
  { id: "article", label: "article" },
];

const ring = "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring";

function Initials({ name, tint, size = "md" }: { name: string; tint: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={
        size === "lg"
          ? "grid size-[72px] shrink-0 place-items-center rounded-full text-xl font-semibold text-white shadow-lg ring-4 ring-surface"
          : "grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
      }
      style={{ background: tint }}
    >
      {name
        .split(" ")
        .map((w) => w[0])
        .join("")}
    </span>
  );
}

export default function SkeletonShimmerDemo() {
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(0);
  const [mode, setMode] = useState<SkeletonMode>("shimmer");

  useEffect(() => {
    if (!loading) return;
    const id = window.setTimeout(() => setLoading(false), 1500);
    return () => window.clearTimeout(id);
  }, [loading, round]);

  return (
    <div className="@container flex w-full flex-col gap-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Skeleton animation" className="flex rounded-xl border border-border bg-surface-2 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`h-8 rounded-lg px-3 text-sm font-medium transition-colors ${mode === m.id ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"} ${ring}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setRound((r) => r + 1);
          }}
          disabled={loading}
          className={`inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-[opacity,scale] hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${ring}`}
        >
          <svg aria-hidden viewBox="0 0 16 16" className={`size-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" />
          </svg>
          {loading ? "Loading" : "Reload"}
        </button>
      </div>

      <div className="grid gap-4 @2xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="skeleton-demo-feed" className="rounded-2xl border border-border bg-surface p-4">
          <h2 id="skeleton-demo-feed" className="mb-4 text-sm font-semibold text-foreground">
            Team feed
          </h2>
          <Skeleton loading={loading} preset="list-item" count={3} mode={mode} label="Loading the team feed" className="flex flex-col gap-5">
            {POSTS.map((post) => (
              <article key={post.handle} className="flex items-start gap-3">
                <Initials name={post.name} tint={post.tint} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold text-foreground">{post.name}</span>{" "}
                    <span className="text-muted">
                      {post.handle} · {post.time}
                    </span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{post.body}</p>
                </div>
              </article>
            ))}
          </Skeleton>
        </section>

        <section aria-labelledby="skeleton-demo-profile" className="rounded-2xl border border-border bg-surface p-4">
          <h2 id="skeleton-demo-profile" className="sr-only">
            Profile
          </h2>
          <Skeleton loading={loading} preset="profile" mode={mode} label="Loading the profile" className="flex flex-col items-center gap-3 text-center">
            <Initials name="Ines Moreau" tint="linear-gradient(135deg,#6d28d9,#db2777)" size="lg" />
            <div>
              <p className="text-base font-semibold text-foreground">Ines Moreau</p>
              <p className="text-sm text-muted">Product designer, Lisbon</p>
            </div>
            <p className="text-sm leading-relaxed text-foreground">Designing calm onboarding for busy teams. Previously at two fintech startups.</p>
            <dl className="grid w-full grid-cols-3 gap-2">
              {[
                ["Posts", "128"],
                ["Followers", "4.2k"],
                ["Following", "310"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-surface-2 px-2 py-2">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <button type="button" className={`h-9 w-3/5 rounded-full bg-accent text-sm font-semibold text-accent-foreground hover:opacity-90 active:scale-95 ${ring}`}>
              Follow
            </button>
          </Skeleton>
        </section>
      </div>

      <section aria-labelledby="skeleton-demo-presets">
        <h2 id="skeleton-demo-presets" className="mb-3 text-sm font-semibold text-foreground">
          Presets
        </h2>
        <ul className="grid list-none gap-3 p-0 @lg:grid-cols-2 @3xl:grid-cols-3">
          {PRESETS.map((preset, i) => (
            <li key={preset.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <SkeletonPreset variant={preset.id} count={preset.count} seed={i + 3} mode={mode} />
              <p className="font-mono text-xs text-muted">{preset.label}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
