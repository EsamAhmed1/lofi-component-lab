"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type BurstIconPreset = "heart" | "star" | "bookmark" | "thumb";
export type BurstLikeButtonSize = "sm" | "md" | "lg";
export type BurstLikeButtonVariant = "pill" | "icon";

/** A custom icon. Pass SVGs that use currentColor so they pick up the colour. */
export interface BurstIconConfig {
  /** Icon in the resting state (usually an outline). */
  icon: ReactNode;
  /** Icon in the pressed state (usually filled). Falls back to `icon`. */
  activeIcon?: ReactNode;
  /** Pressed colour, any CSS colour. Used for the icon, ring and count. */
  color: string;
  /** Particle colours. Defaults to shades of `color`. */
  particles?: string[];
}

export interface BurstLikeButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onToggle" | "children" | "type" | "aria-pressed" | "aria-label"
  > {
  /** Pressed state (controlled). */
  pressed?: boolean;
  /** Starting state when uncontrolled. */
  defaultPressed?: boolean;
  /**
   * Called with the next state. Return a Promise to save it: the button
   * updates at once and reverts (with a shake) if the Promise rejects.
   */
  onToggle?: (next: boolean) => void | Promise<unknown>;
  /**
   * Total count. Uncontrolled: the starting total (it already includes your
   * like if defaultPressed); the button adds or removes one as you toggle.
   * Controlled: shown as is, so update it together with `pressed`.
   */
  count?: number;
  /** A preset icon with its own colour and particles, or a custom icon. */
  icon?: BurstIconPreset | BurstIconConfig;
  /** Accessible name of the action, e.g. "Like". */
  label?: string;
  /** Words used for the count in the accessible name. */
  countNoun?: { one: string; other: string };
  /** Messages read by screen readers after a toggle or a failed save. */
  messages?: { on?: string; off?: string; error?: string };
  size?: BurstLikeButtonSize;
  /** "pill" shows the icon and count. "icon" shows the icon only. */
  variant?: BurstLikeButtonVariant;
  /** Formats the visible count. Defaults to compact notation (1.2K). */
  formatCount?: (count: number) => string;
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-US");

const PARTICLES = 12;

/** Small deterministic pseudo-random number in [0, 1) (mulberry32 step). */
function rand(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function Glyph({ preset, filled }: { preset: BurstIconPreset; filled: boolean }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    fillOpacity: filled ? 1 : 0,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "size-full transition-[fill-opacity] duration-200",
    "aria-hidden": true,
  };
  switch (preset) {
    case "heart":
      return (
        <svg {...common}>
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95L12 2.5z" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...common}>
          <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "thumb":
      return (
        <svg {...common}>
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
      );
  }
}

/**
 * Preset colours. `--burst` is the pressed colour, picked per colour scheme so
 * the count keeps 4.5:1 contrast on the tinted pill.
 */
const presets: Record<
  BurstIconPreset,
  { tone: string; particles: string[]; label: string; noun: { one: string; other: string } }
> = {
  heart: {
    tone: "[--burst:#e11d48] dark:[--burst:#fb7185]",
    particles: ["#f43f5e", "#fb7185", "#f97316", "#facc15", "#ec4899", "#a855f7"],
    label: "Like",
    noun: { one: "like", other: "likes" },
  },
  star: {
    tone: "[--burst:#b45309] dark:[--burst:#fcd34d]",
    particles: ["#f59e0b", "#fbbf24", "#fde047", "#fb923c", "#facc15", "#f97316"],
    label: "Star",
    noun: { one: "star", other: "stars" },
  },
  bookmark: {
    tone: "[--burst:#0369a1] dark:[--burst:#7dd3fc]",
    particles: ["#0ea5e9", "#38bdf8", "#6366f1", "#22d3ee", "#818cf8", "#06b6d4"],
    label: "Save",
    noun: { one: "save", other: "saves" },
  },
  thumb: {
    tone: "[--burst:#047857] dark:[--burst:#34d399]",
    particles: ["#10b981", "#34d399", "#84cc16", "#22d3ee", "#facc15", "#14b8a6"],
    label: "Like",
    noun: { one: "like", other: "likes" },
  },
};

const sizes: Record<BurstLikeButtonSize, { icon: number; pill: string; square: string; text: string }> = {
  sm: { icon: 16, pill: "h-8 gap-1.5 pl-2.5 pr-3", square: "size-8", text: "text-xs" },
  md: { icon: 20, pill: "h-10 gap-2 pl-3 pr-3.5", square: "size-10", text: "text-sm" },
  lg: { icon: 24, pill: "h-12 gap-2.5 pl-3.5 pr-4", square: "size-12", text: "text-base" },
};

// Digit-roll keyframes. Names are prefixed with the slug (no globals.css).
const ROLL_CSS = `
@keyframes burst-like-button-in-up { from { transform: translateY(100%); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes burst-like-button-in-down { from { transform: translateY(-100%); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes burst-like-button-out-up { from { transform: none; opacity: 1 } to { transform: translateY(-100%); opacity: 0 } }
@keyframes burst-like-button-out-down { from { transform: none; opacity: 1 } to { transform: translateY(100%); opacity: 0 } }
@media (prefers-reduced-motion: reduce) { [data-burst-roll] { animation: none !important } [data-burst-roll="out"] { opacity: 0 } }
`;

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** Live `prefers-reduced-motion` value. The server snapshot is false. */
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(motionQuery).matches,
    () => false,
  );
}

/** One character of the count. When it changes, the old one rolls out and the new one rolls in. */
function RollChar({ char, dir, animate, delay }: { char: string; dir: 1 | -1; animate: boolean; delay: number }) {
  const [state, setState] = useState({ cur: char, prev: null as string | null, n: 0 });
  if (state.cur !== char) {
    setState({ cur: char, prev: animate ? state.cur : null, n: state.n + 1 });
  }
  const way = dir > 0 ? "up" : "down";
  const timing = `460ms cubic-bezier(0.3, 1.45, 0.5, 1) ${delay}ms both`;
  return (
    <span className="relative inline-flex h-[1.25em] overflow-hidden leading-[1.25em]">
      {state.prev !== null ? (
        <span
          key={`out-${state.n}`}
          data-burst-roll="out"
          className="absolute inset-x-0 top-0 text-center"
          style={{ animation: `burst-like-button-out-${way} ${timing}` }}
        >
          {state.prev}
        </span>
      ) : null}
      <span
        key={`in-${state.n}`}
        data-burst-roll="in"
        className="block"
        style={state.prev !== null ? { animation: `burst-like-button-in-${way} ${timing}` } : undefined}
      >
        {state.cur}
      </span>
    </span>
  );
}

/** Odometer-style count: each changed character rolls, rightmost first. */
function RollingCount({ value, text, animate }: { value: number; text: string; animate: boolean }) {
  const [last, setLast] = useState({ value, dir: 1 as 1 | -1 });
  if (last.value !== value) {
    setLast({ value, dir: value > last.value ? 1 : -1 });
  }
  const chars = [...text];
  return (
    <span aria-hidden className="inline-flex tabular-nums">
      {chars.map((ch, i) => {
        const fromRight = chars.length - 1 - i;
        return <RollChar key={fromRight} char={ch} dir={last.dir} animate={animate} delay={fromRight * 45} />;
      })}
    </span>
  );
}

/**
 * A toggle reaction button with a squash-and-stretch pop, an expanding ring,
 * a burst of particles and an odometer count. Saves optimistically: if
 * `onToggle` returns a Promise that rejects, it reverts, shakes and announces
 * the error. Reduced motion turns every animation off.
 */
export const BurstLikeButton = forwardRef<HTMLButtonElement, BurstLikeButtonProps>(
  function BurstLikeButton(
    {
      pressed,
      defaultPressed = false,
      onToggle,
      count,
      icon = "heart",
      label,
      countNoun,
      messages,
      size = "md",
      variant = "pill",
      formatCount = (n) => compact.format(n),
      disabled = false,
      className,
      style,
      onClick,
      ...rest
    },
    forwardedRef,
  ) {
    const controlled = pressed !== undefined;
    const [inner, setInner] = useState(defaultPressed);
    // Optimistic value while onToggle is saving; null when settled.
    const [pending, setPending] = useState<boolean | null>(null);
    const [error, setError] = useState(false);
    const [announcement, setAnnouncement] = useState("");
    const reduced = useReducedMotion();

    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const glyphRef = useRef<HTMLSpanElement | null>(null);
    const ringRef = useRef<HTMLSpanElement | null>(null);
    const particleRefs = useRef<Array<HTMLSpanElement | null>>([]);
    const burstCount = useRef(0);
    const errorTimer = useRef<number | null>(null);

    useEffect(() => () => {
      if (errorTimer.current) window.clearTimeout(errorTimer.current);
    }, []);

    const setRefs = useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const preset = typeof icon === "string" ? presets[icon] : null;
    const custom = typeof icon === "string" ? null : icon;
    const name = label ?? preset?.label ?? "Like";
    const noun = countNoun ?? preset?.noun ?? { one: "like", other: "likes" };
    const palette = preset?.particles ?? custom?.particles ?? [
      "var(--burst)",
      "color-mix(in oklab, var(--burst) 70%, white)",
      "color-mix(in oklab, var(--burst) 70%, black)",
    ];

    const confirmed = controlled ? pressed : inner;
    const shown = pending ?? confirmed;
    const base = count === undefined ? undefined : controlled ? count : count + (inner ? 1 : 0) - (defaultPressed ? 1 : 0);
    const value =
      base === undefined ? undefined : Math.max(0, base + (pending !== null && pending !== confirmed ? (pending ? 1 : -1) : 0));

    const words = (n: number) => `${full.format(n)} ${n === 1 ? noun.one : noun.other}`;
    const ariaLabel = value === undefined ? name : `${name}, ${words(value)}`;
    const dims = sizes[size];

    const play = (next: boolean) => {
      if (reduced) return;
      const glyph = glyphRef.current;
      if (!next) {
        glyph?.animate(
          [{ transform: "scale(1)" }, { transform: "scale(0.72)", offset: 0.4 }, { transform: "scale(1.06)", offset: 0.75 }, { transform: "scale(1)" }],
          { duration: 380, easing: "ease-out" },
        );
        return;
      }
      // Squash, stretch, settle.
      glyph?.animate(
        [
          { transform: "scale(1, 1)" },
          { transform: "scale(1.25, 0.7)", offset: 0.14 },
          { transform: "scale(0.8, 1.3)", offset: 0.36 },
          { transform: "scale(1.14, 0.9)", offset: 0.58 },
          { transform: "scale(0.96, 1.04)", offset: 0.8 },
          { transform: "scale(1, 1)" },
        ],
        { duration: 640, easing: "ease-out" },
      );
      ringRef.current?.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.2)", opacity: 1, borderWidth: `${dims.icon * 0.45}px` },
          { transform: "translate(-50%, -50%) scale(1)", opacity: 0, borderWidth: "0px" },
        ],
        { duration: 520, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
      );
      // Particle positions come from the index plus a seeded jitter per burst.
      const seed = ++burstCount.current * 131;
      const radius = dims.icon * 1.7;
      particleRefs.current.forEach((el, i) => {
        if (!el) return;
        el.getAnimations().forEach((a) => a.cancel());
        const angle = (i / PARTICLES) * Math.PI * 2 + (rand(seed + i) - 0.5) * 0.55;
        const dist = radius * (0.75 + rand(seed + i + 40) * 0.6);
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const scale = 0.7 + rand(seed + i + 80) * 0.6;
        const spin = (rand(seed + i + 120) - 0.5) * 220;
        el.animate(
          [
            { transform: "translate(-50%, -50%) translate(0, 0) scale(0)", opacity: 1 },
            { transform: `translate(-50%, -50%) translate(${x * 0.82}px, ${y * 0.82}px) scale(${scale}) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate(-50%, -50%) translate(${x}px, ${y + 4}px) scale(0) rotate(${spin}deg)`, opacity: 0 },
          ],
          { duration: 620 + rand(seed + i + 160) * 260, delay: 70, easing: "cubic-bezier(0.15, 0.75, 0.3, 1)" },
        );
      });
    };

    const fail = () => {
      setPending(null);
      setError(true);
      setAnnouncement(messages?.error ?? `Couldn't save your ${name.toLowerCase()}. Try again.`);
      if (errorTimer.current) window.clearTimeout(errorTimer.current);
      errorTimer.current = window.setTimeout(() => setError(false), 1600);
      if (!reduced) {
        buttonRef.current?.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-5px)" },
            { transform: "translateX(5px)" },
            { transform: "translateX(-3px)" },
            { transform: "translateX(2px)" },
            { transform: "translateX(0)" },
          ],
          { duration: 420, easing: "ease-in-out" },
        );
      }
    };

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented || disabled || pending !== null) return;
      const next = !shown;
      const nextValue = base === undefined ? undefined : Math.max(0, base + (next === confirmed ? 0 : next ? 1 : -1));
      setError(false);
      setPending(next);
      play(next);
      const state = next ? (messages?.on ?? `${name} added`) : (messages?.off ?? `${name} removed`);
      setAnnouncement(nextValue === undefined ? `${state}.` : `${state}. ${words(nextValue)}.`);

      const settle = () => {
        if (!controlled) setInner(next);
        setPending(null);
      };
      let result: void | Promise<unknown>;
      try {
        result = onToggle?.(next);
      } catch {
        fail();
        return;
      }
      if (result && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<unknown>).then(settle, fail);
      } else {
        settle();
      }
    };

    const tone = preset?.tone;
    const toneStyle = custom ? ({ "--burst": custom.color } as CSSProperties) : undefined;
    const glyphNode = (filled: boolean) =>
      typeof icon === "string" ? (
        <Glyph preset={icon} filled={filled} />
      ) : (
        <span aria-hidden className="grid size-full place-items-center [&>svg]:size-full">
          {filled ? (icon.activeIcon ?? icon.icon) : icon.icon}
        </span>
      );

    return (
      <>
        <style>{ROLL_CSS}</style>
        <button
          ref={setRefs}
          type="button"
          aria-pressed={shown}
          aria-label={ariaLabel}
          aria-busy={pending !== null || undefined}
          disabled={disabled}
          onClick={handleClick}
          data-state={shown ? "on" : "off"}
          style={{ ...toneStyle, ...style }}
          className={cn(
            "group relative inline-flex shrink-0 select-none items-center justify-center rounded-full border font-semibold",
            "transition-[background-color,border-color,color,box-shadow] duration-200",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[-webkit-tap-highlight-color:transparent]",
            tone,
            variant === "pill" ? dims.pill : dims.square,
            dims.text,
            shown
              ? "border-[color-mix(in_oklab,var(--burst)_35%,var(--border))] bg-[color-mix(in_oklab,var(--burst)_10%,var(--surface))] text-(color:--burst)"
              : "border-border bg-surface text-muted enabled:hover:border-[color-mix(in_oklab,var(--burst)_35%,var(--border))] enabled:hover:bg-[color-mix(in_oklab,var(--burst)_8%,var(--surface))] enabled:hover:text-(color:--burst)",
            error && "border-red-500 ring-2 ring-red-500/40 dark:border-red-400",
            className,
          )}
          {...rest}
        >
          <span
            className="relative grid shrink-0 place-items-center transition-transform duration-200 group-enabled:group-hover:scale-110 group-enabled:group-active:scale-90 motion-reduce:transition-none"
            style={{ width: dims.icon, height: dims.icon }}
          >
            <span
              aria-hidden
              ref={ringRef}
              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border-solid border-(color:--burst) opacity-0"
              style={{ width: dims.icon * 2.6, height: dims.icon * 2.6, transform: "translate(-50%, -50%)" }}
            />
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-0">
              {Array.from({ length: PARTICLES }, (_, i) => {
                const glyph = i % 3 === 0;
                const px = glyph ? Math.round(dims.icon * 0.5) : 3 + (i % 4);
                return (
                  <span
                    key={i}
                    ref={(node) => {
                      particleRefs.current[i] = node;
                    }}
                    className={cn("absolute left-0 top-0 opacity-0", !glyph && "rounded-full")}
                    style={{
                      width: px,
                      height: px,
                      transform: "translate(-50%, -50%) scale(0)",
                      ...(glyph ? { color: palette[i % palette.length] } : { background: palette[i % palette.length] }),
                    }}
                  >
                    {glyph ? glyphNode(true) : null}
                  </span>
                );
              })}
            </span>
            <span ref={glyphRef} className="relative block size-full will-change-transform">
              {glyphNode(shown)}
            </span>
          </span>
          {variant === "pill" && value !== undefined ? (
            <RollingCount value={value} text={formatCount(value)} animate={!reduced} />
          ) : null}
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
      </>
    );
  },
);
