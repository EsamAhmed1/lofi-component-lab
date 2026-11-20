"use client";

import { useState } from "react";
import { ShareButton } from "@/components/ui/share-button";

const POST_URL = "https://lofi-component-lab.vercel.app/blog/spring-physics-in-css";

export default function ShareButtonDemo() {
  const [last, setLast] = useState<string | null>(null);
  const names: Record<string, string> = {
    x: "X",
    linkedin: "LinkedIn",
    whatsapp: "WhatsApp",
    email: "email",
    copy: "copied link",
    native: "the share sheet",
  };
  const onShare = (id: string) => setLast(names[id] ?? id);

  return (
    <div className="@container w-full py-8">
      <div className="mx-auto grid w-full max-w-4xl gap-6 @3xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* 1. Blog post footer with the row variant. */}
        <article className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
          <div className="space-y-3 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Engineering · 6 min read</p>
            <h2 className="text-xl font-semibold leading-snug text-foreground">Spring physics in plain CSS</h2>
            <p className="text-sm leading-relaxed text-muted">
              The linear() easing function lets you sample a real damped spring into a CSS curve. No library, no
              requestAnimationFrame loop, and it still respects reduced motion.
            </p>
          </div>
          <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-border bg-surface-2 px-6 py-4">
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-sm font-bold text-white">
                PN
              </span>
              <div className="text-sm">
                <p className="font-medium text-foreground">Priya Nair</p>
                <p className="text-muted">Nov 18, 2026</p>
              </div>
            </div>
            <ShareButton url={POST_URL} title="Spring physics in plain CSS" variant="row" size="sm" onShare={onShare} />
          </footer>
        </article>

        <div className="flex flex-col gap-6">
          {/* 2. Radial fan above a centred button. */}
          <section
            aria-label="Launch announcement"
            className="relative flex flex-col items-center gap-2 overflow-hidden rounded-3xl border border-border bg-surface px-6 pb-8 pt-44 text-center shadow-sm"
          >
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent)]" />
            <p className="text-sm font-semibold text-foreground">Framecast 2.0 is live</p>
            <p className="mb-3 text-sm text-muted">Tell your team. The fan opens above the button.</p>
            <ShareButton url="https://framecast.app/launch" title="Framecast 2.0 is live" onShare={onShare} preferNative={false} />
          </section>

          {/* 3. Compact icon-only button in a toolbar. */}
          <section aria-label="Photo actions" className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface px-5 pb-5 pt-32 shadow-sm">
            <div className="flex items-center gap-3 rounded-full border border-border bg-surface-2 p-1.5">
              <button
                type="button"
                aria-label="Like photo"
                className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
                  <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
                </svg>
              </button>
              <ShareButton url="https://photos.example.com/p/fjord-at-dawn" title="Fjord at dawn" iconOnly size="sm" label="Share photo" onShare={onShare} />
              <button
                type="button"
                aria-label="Download photo"
                className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-muted">Fjord at dawn.jpg · icon only, small</p>
          </section>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted" aria-live="polite">
        {last ? `Last shared via ${last}.` : "Open a share button and pick a target."}
      </p>
    </div>
  );
}
