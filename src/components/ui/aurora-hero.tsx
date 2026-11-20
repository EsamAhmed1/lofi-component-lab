"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export interface AuroraHeroCta {
  label: string;
  /** Renders a link when set. */
  href?: string;
  /** Renders a button when there is no href. */
  onClick?: () => void;
}

export interface AuroraHeroStat {
  /** Final number the counter lands on. */
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  /** Decimal places. Defaults to the decimals in `value`. */
  decimals?: number;
}

export interface AuroraHeroLogo {
  /** Company name. Always shown as text next to the mark. */
  name: string;
  /** Optional decorative mark. */
  logo?: ReactNode;
}

export interface AuroraHeroProps {
  /** Small pill above the headline, rendered with a moving sheen. */
  eyebrow?: string;
  /** Headline text before the rotating word. */
  headlineBefore: string;
  /** Words that rotate on their own line. The first one is used for reduced motion. */
  rotatingWords: string[];
  /** Headline text after the rotating word. */
  headlineAfter?: string;
  /** Sentence read by screen readers. Defaults to before + first word + after. */
  headlineLabel?: string;
  description?: string;
  primaryCta?: AuroraHeroCta;
  secondaryCta?: AuroraHeroCta;
  /** Numbers that count up when scrolled into view. Up to 4. */
  stats?: AuroraHeroStat[];
  logos?: AuroraHeroLogo[];
  logosLabel?: string;
  /** Aurora palette, up to 4 CSS colours for the drifting blobs. */
  colors?: string[];
  align?: "center" | "left";
  /** Milliseconds each rotating word stays. */
  interval?: number;
  /** Heading level of the headline. Use 2 when the page already has an h1. */
  headingLevel?: 1 | 2 | 3;
  /** Shows a button that pauses every animation (WCAG 2.2.2). */
  showMotionToggle?: boolean;
  className?: string;
  ref?: Ref<HTMLElement>;
}

const DEFAULT_COLORS = ["#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b"];

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

// Keyframes live here (prefixed with the slug) so the file stays self-contained.
const CSS = `
@keyframes aurora-hero-drift-a { 0% { transform: translate3d(0,0,0) scale(1) rotate(0deg); } 100% { transform: translate3d(14%,10%,0) scale(1.2) rotate(25deg); } }
@keyframes aurora-hero-drift-b { 0% { transform: translate3d(0,0,0) scale(1.1) rotate(0deg); } 100% { transform: translate3d(-16%,12%,0) scale(0.9) rotate(-30deg); } }
@keyframes aurora-hero-drift-c { 0% { transform: translate3d(0,0,0) scale(0.95); } 100% { transform: translate3d(10%,-14%,0) scale(1.25); } }
@keyframes aurora-hero-drift-d { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(-12%,-8%,0) scale(1.15); } }
@keyframes aurora-hero-shine { from { background-position: 150% 0; } to { background-position: -50% 0; } }
@keyframes aurora-hero-flow { from { background-position: 0% 50%; } to { background-position: 200% 50%; } }
@keyframes aurora-hero-spin { from { transform: translate(-50%,-50%) rotate(0turn); } to { transform: translate(-50%,-50%) rotate(1turn); } }
@keyframes aurora-hero-ping { 0% { transform: scale(1); opacity: .7; } 80%, 100% { transform: scale(2.4); opacity: 0; } }
.aurora-hero-blob { position: absolute; border-radius: 9999px; opacity: .5; filter: blur(48px); will-change: transform; }
.aurora-hero-shiny {
  background: linear-gradient(110deg, var(--muted) 35%, var(--foreground) 50%, var(--muted) 65%) 0 0 / 250% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: aurora-hero-shine 3.5s linear infinite;
}
.aurora-hero-word {
  background-image: linear-gradient(90deg, #6d28d9, #a21caf, #be185d, #1d4ed8, #6d28d9);
  background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: aurora-hero-flow 8s linear infinite;
}
@media (prefers-color-scheme: dark) {
  .aurora-hero-blob { opacity: .42; }
  .aurora-hero-word { background-image: linear-gradient(90deg, #c4b5fd, #f0abfc, #f9a8d4, #7dd3fc, #c4b5fd); }
}
.aurora-hero[data-paused] .aurora-hero-anim { animation-play-state: paused !important; }
@media (prefers-reduced-motion: reduce) {
  .aurora-hero-anim { animation: none !important; }
}
`;

const blobs: Array<{ style: CSSProperties; color: number; anim: string }> = [
  { style: { left: "-18%", top: "-30%", width: "max(62%, 380px)", aspectRatio: "1" }, color: 0, anim: "aurora-hero-drift-a 22s" },
  { style: { right: "-20%", top: "-26%", width: "max(56%, 340px)", aspectRatio: "1" }, color: 1, anim: "aurora-hero-drift-b 26s" },
  { style: { left: "22%", top: "-38%", width: "max(48%, 300px)", aspectRatio: "1" }, color: 2, anim: "aurora-hero-drift-c 30s" },
  { style: { right: "-8%", bottom: "-34%", width: "max(40%, 260px)", aspectRatio: "1" }, color: 3, anim: "aurora-hero-drift-d 34s" },
];

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function useReducedMotion() {
  const subscribe = useCallback((onChange: () => void) => {
    const list = window.matchMedia(REDUCED_MOTION);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function formatStat(stat: AuroraHeroStat, progress: number) {
  const decimals = stat.decimals ?? (String(stat.value).split(".")[1]?.length ?? 0);
  const value = (stat.value * progress).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${stat.prefix ?? ""}${value}${stat.suffix ?? ""}`;
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

function Cta({ cta, primary }: { cta: AuroraHeroCta; primary?: boolean }) {
  const ring = "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring";
  const inner = primary ? (
    <>
      {/* Border beam: a conic gradient spinning behind a 1.5px gap. */}
      <span
        aria-hidden
        className="aurora-hero-anim pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[max(260%,320px)]"
        style={{
          transform: "translate(-50%, -50%)",
          background:
            "conic-gradient(from 0deg, transparent 0 62%, var(--aurora-1) 76%, var(--aurora-2) 86%, #fff 92%, transparent 100%)",
          animation: "aurora-hero-spin 3.6s linear infinite",
        }}
      />
      <span className="relative inline-flex h-full w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-colors group-hover:bg-foreground/90">
        {cta.label}
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none"
        >
          <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </>
  ) : (
    cta.label
  );
  const className = primary
    ? cn(
        "group relative isolate inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-full bg-border p-[1.5px] @sm:w-auto",
        "shadow-[0_10px_30px_-10px_var(--aurora-1)] transition-transform active:scale-[0.97] motion-reduce:transition-none",
        ring,
      )
    : cn(
        "inline-flex h-12 w-full items-center justify-center rounded-full border border-border bg-surface/85 px-6 text-sm font-semibold text-foreground backdrop-blur",
        "transition-[background-color,scale] hover:bg-surface-2 active:scale-[0.97] motion-reduce:transition-none @sm:w-auto",
        ring,
      );

  if (cta.href) {
    return (
      <a href={cta.href} onClick={cta.onClick} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={cta.onClick} className={className}>
      {inner}
    </button>
  );
}

/**
 * Cinematic landing hero: drifting aurora blobs, grain, a faint grid and a
 * pointer spotlight sit behind a readability veil. The headline rotates one
 * word with a blur-and-slide; screen readers get one static sentence. Stats
 * count up the first time they scroll into view. Reduced motion freezes the
 * aurora, shows the first word and the final numbers.
 */
export function AuroraHero({
  eyebrow,
  headlineBefore,
  rotatingWords,
  headlineAfter,
  headlineLabel,
  description,
  primaryCta,
  secondaryCta,
  stats = [],
  logos = [],
  logosLabel = "Trusted by teams at",
  colors = DEFAULT_COLORS,
  align = "center",
  interval = 2600,
  headingLevel = 1,
  showMotionToggle = true,
  className,
  ref,
}: AuroraHeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const statsRef = useRef<HTMLDListElement | null>(null);
  const frame = useRef<number | null>(null);
  const headingId = useId();
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [statsStarted, setStatsStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statsDone, setStatsDone] = useState(false);
  const [index, setIndex] = useState(0);

  const words = rotatingWords.length > 0 ? rotatingWords : [""];
  const still = reducedMotion || paused;
  const shown = reducedMotion ? 0 : index % words.length;
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 2 ? "h2" : "h3";
  const sentence =
    headlineLabel ?? [headlineBefore, words[0], headlineAfter].filter(Boolean).join(" ");
  const centered = align === "center";

  const setSectionRef = useCallback(
    (node: HTMLElement | null) => {
      sectionRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Only rotate words while the hero is on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || still || words.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [inView, still, words.length, interval]);

  // Stats start counting the first time 35% of the row is visible.
  useEffect(() => {
    const row = statsRef.current;
    if (!row || statsStarted) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStatsStarted(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(row);
    return () => observer.disconnect();
  }, [statsStarted]);

  useEffect(() => {
    if (!statsStarted || still || statsDone) return;
    const duration = 1800;
    let start: number | null = null;
    let raf = 0;
    const run = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      setProgress(easeOutExpo(t));
      if (t < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [statsStarted, still, statsDone]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch" || still) return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      el.style.setProperty("--spot-x", `${x}px`);
      el.style.setProperty("--spot-y", `${y}px`);
      el.style.setProperty("--spot-o", "1");
    });
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    event.currentTarget.style.setProperty("--spot-o", "0");
  };

  // Pausing mid-count jumps to the final numbers and keeps them there.
  const statProgress = still || statsDone ? 1 : progress;
  const palette = [0, 1, 2, 3].map((i) => colors[i % Math.max(colors.length, 1)] ?? DEFAULT_COLORS[i]);
  const statCols =
    stats.length >= 4 ? "grid-cols-2 @2xl:grid-cols-4" : stats.length === 3 ? "grid-cols-3" : stats.length === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <section
      ref={setSectionRef}
      aria-labelledby={headingId}
      data-paused={paused || undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "aurora-hero @container relative isolate w-full overflow-hidden rounded-[28px] border border-border bg-background",
        className,
      )}
      style={
        {
          "--aurora-1": palette[0],
          "--aurora-2": palette[1],
          "--aurora-3": palette[2],
          "--aurora-4": palette[3],
          "--spot-x": "50%",
          "--spot-y": "30%",
          "--spot-o": "0",
        } as CSSProperties
      }
    >
      <style>{CSS}</style>

      {/* Decorative background: aurora, grid, readability veil, spotlight, grain. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {blobs.map((blob, i) => (
          <span
            key={i}
            className="aurora-hero-blob aurora-hero-anim"
            style={{
              ...blob.style,
              background: `radial-gradient(circle at center, var(--aurora-${blob.color + 1}) 0%, transparent 68%)`,
              animation: `${blob.anim} ease-in-out infinite alternate`,
            }}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
          }}
        />
        {/* The veil keeps text at 4.5:1 or better: the aurora glows around the copy, not under it. */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 70% 62% at ${centered ? "50%" : "28%"} 56%, color-mix(in oklab, var(--background) 90%, transparent) 0%, color-mix(in oklab, var(--background) 78%, transparent) 50%, transparent 82%)`,
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-background via-background/80 to-transparent" />
        <div
          className="absolute inset-0 opacity-(--spot-o) transition-opacity duration-500 motion-reduce:transition-none"
          style={{
            background:
              "radial-gradient(520px circle at var(--spot-x) var(--spot-y), color-mix(in oklab, var(--aurora-1) 16%, transparent), transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.16] dark:opacity-[0.22] dark:invert"
          style={{ backgroundImage: GRAIN, backgroundSize: "160px 160px" }}
        />
      </div>

      {showMotionToggle && !reducedMotion ? (
        <button
          type="button"
          aria-pressed={paused}
          aria-label="Pause animations"
          onClick={() => {
            setPaused((p) => !p);
            if (statsStarted) setStatsDone(true);
          }}
          className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full border border-border bg-surface/85 text-foreground backdrop-blur transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {paused ? (
            <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-current">
              <path d="M5 3.5v9l7-4.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-current">
              <rect x="4" y="3.5" width="2.6" height="9" rx="0.8" />
              <rect x="9.4" y="3.5" width="2.6" height="9" rx="0.8" />
            </svg>
          )}
        </button>
      ) : null}

      <div
        className={cn(
          "relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pb-12 pt-16 @2xl:gap-8 @2xl:px-10 @2xl:pb-16 @2xl:pt-24",
          centered ? "items-center text-center" : "items-start text-left",
        )}
      >
        {eyebrow ? (
          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface/85 px-3.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
            <span aria-hidden className="relative flex size-2">
              <span className="aurora-hero-anim absolute inset-0 rounded-full bg-(--aurora-1)" style={{ animation: "aurora-hero-ping 2s cubic-bezier(0,0,0.2,1) infinite" }} />
              <span className="relative size-2 rounded-full bg-(--aurora-1)" />
            </span>
            <span className="aurora-hero-shiny aurora-hero-anim min-w-0 truncate">{eyebrow}</span>
          </p>
        ) : null}

        <Heading
          id={headingId}
          className="max-w-4xl text-balance text-[clamp(2.25rem,8cqw,4.75rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-foreground"
        >
          <span className="sr-only">{sentence}</span>
          <span aria-hidden className="block">{headlineBefore}</span>
          <span
            aria-hidden
            className={cn("grid", centered ? "justify-items-center" : "justify-items-start")}
          >
            {words.map((word, i) => {
              const state = i === shown ? "current" : i === (shown - 1 + words.length) % words.length ? "past" : "next";
              return (
                <span
                  key={`${word}-${i}`}
                  className="col-start-1 row-start-1 transition-[opacity,translate,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                  style={{
                    opacity: state === "current" ? 1 : 0,
                    translate: state === "current" ? "0 0" : state === "past" ? "0 -0.45em" : "0 0.45em",
                    filter: state === "current" ? "blur(0px)" : "blur(10px)",
                  }}
                >
                  <span className="aurora-hero-word aurora-hero-anim inline-block pb-[0.08em]">{word}</span>
                </span>
              );
            })}
          </span>
          {headlineAfter ? <span aria-hidden className="block">{headlineAfter}</span> : null}
        </Heading>

        {description ? (
          <p className="max-w-xl text-pretty text-base leading-relaxed text-muted @2xl:text-lg">{description}</p>
        ) : null}

        {primaryCta || secondaryCta ? (
          <div className={cn("flex w-full flex-col gap-3 @sm:w-auto @sm:flex-row", centered && "@sm:justify-center")}>
            {primaryCta ? <Cta cta={primaryCta} primary /> : null}
            {secondaryCta ? <Cta cta={secondaryCta} /> : null}
          </div>
        ) : null}

        {stats.length > 0 ? (
          <dl
            ref={statsRef}
            className={cn(
              "mt-4 grid w-full max-w-3xl gap-y-5 rounded-2xl border border-border bg-surface/85 px-3 py-5 shadow-[0_20px_50px_-30px_rgb(0_0_0/0.5)] backdrop-blur-md @2xl:px-6 @2xl:py-6",
              statCols,
            )}
          >
            {stats.slice(0, 4).map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse items-center gap-1 px-2 text-center">
                <dt className="text-xs leading-snug text-muted @2xl:text-sm">{stat.label}</dt>
                <dd className="text-2xl font-semibold tracking-tight text-foreground tabular-nums @2xl:text-4xl">
                  <span aria-hidden>{formatStat(stat, statProgress)}</span>
                  <span className="sr-only">{formatStat(stat, 1)}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {logos.length > 0 ? (
          <div className={cn("mt-2 flex w-full flex-col gap-4", centered ? "items-center" : "items-start")}>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">{logosLabel}</p>
            <ul className={cn("flex flex-wrap gap-x-7 gap-y-3", centered && "justify-center")}>
              {logos.map((logo) => (
                <li key={logo.name} className="flex items-center gap-2 text-sm font-semibold tracking-tight text-muted">
                  {logo.logo ? <span aria-hidden className="grid size-5 place-items-center [&_svg]:size-full">{logo.logo}</span> : null}
                  {logo.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
