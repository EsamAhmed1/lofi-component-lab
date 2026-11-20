"use client";

import {
  createContext,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export type SkeletonMode = "shimmer" | "pulse" | "wave";
export type SkeletonPresetName = "card" | "list-item" | "profile" | "table-row" | "article";

type Size = string | number;

const ModeContext = createContext<SkeletonMode>("shimmer");

const WAVE_MS = 1800;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerMotion = () => false;

/*
 * Shimmer: every bone paints the same viewport-sized gradient with
 * background-attachment: fixed, so one diagonal band sweeps across the whole
 * page and every skeleton shows its own slice of it. Each animation is also
 * pinned to startTime 0 on the document timeline, so bones mounted at
 * different moments stay in phase (this also keeps them in sync where fixed
 * backgrounds are not supported, like iOS Safari).
 */
const STYLES = `
@keyframes skeleton-shimmer-sweep {
  from { background-position: 100% 0; }
  to { background-position: 0% 0; }
}
@keyframes skeleton-shimmer-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
@keyframes skeleton-shimmer-wave {
  0%, 45%, 100% { opacity: 1; }
  20% { opacity: 0.35; }
}
@keyframes skeleton-shimmer-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.skeleton-shimmer-bone {
  --skeleton-shimmer-base: color-mix(in oklab, var(--foreground) 9%, var(--surface));
  --skeleton-shimmer-shine: color-mix(in oklab, #ffffff 85%, var(--surface));
  background-color: var(--skeleton-shimmer-base);
  border-radius: 6px;
}
@media (prefers-color-scheme: dark) {
  .skeleton-shimmer-bone {
    --skeleton-shimmer-base: color-mix(in oklab, var(--foreground) 10%, var(--surface));
    --skeleton-shimmer-shine: color-mix(in oklab, var(--foreground) 22%, var(--surface));
  }
}
.skeleton-shimmer-bone[data-mode="shimmer"] {
  background-image: linear-gradient(110deg, transparent 0 42%, var(--skeleton-shimmer-shine) 50%, transparent 58% 100%);
  background-size: 300% 100%;
  background-repeat: no-repeat;
  background-attachment: fixed;
  animation: skeleton-shimmer-sweep 2.2s linear infinite;
}
.skeleton-shimmer-bone[data-mode="pulse"] {
  animation: skeleton-shimmer-pulse 1.6s ease-in-out infinite;
}
.skeleton-shimmer-bone[data-mode="wave"] {
  animation: skeleton-shimmer-wave ${WAVE_MS}ms ease-in-out infinite;
  animation-delay: var(--skeleton-shimmer-delay, 0ms);
}
@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer-bone[data-mode] {
    background-image: none;
    animation: skeleton-shimmer-soft 2.4s ease-in-out infinite;
    animation-delay: 0ms;
  }
}
@media (forced-colors: active) {
  .skeleton-shimmer-bone { background: GrayText; }
}
`;

/** Seeded pseudo-random numbers so line widths match on server and client. */
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const px = (value: Size | undefined) => (typeof value === "number" ? `${value}px` : value);

/** Puts a bone's animation on the shared clock. Wave mode also offsets it by its place on screen. */
function syncBone(el: HTMLElement, mode: SkeletonMode) {
  if (mode === "wave") {
    const r = el.getBoundingClientRect();
    const phase = (((r.left + r.top * 0.6) / 900) % 1 + 1) % 1;
    el.style.setProperty("--skeleton-shimmer-delay", `${Math.round(-(1 - phase) * WAVE_MS)}ms`);
  } else {
    el.style.removeProperty("--skeleton-shimmer-delay");
  }
  if (typeof el.getAnimations !== "function") return;
  for (const animation of el.getAnimations()) animation.startTime = 0;
}

interface BoneProps {
  className?: string;
  style?: CSSProperties;
  mode?: SkeletonMode;
}

function Bone({ className, style, mode: modeProp }: BoneProps) {
  const inherited = useContext(ModeContext);
  const mode = modeProp ?? inherited;
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (ref.current) syncBone(ref.current, mode);
  }, [mode]);
  return (
    <>
      <style href="skeleton-shimmer" precedence="default">
        {STYLES}
      </style>
      <span ref={ref} aria-hidden data-mode={mode} className={cn("skeleton-shimmer-bone block shrink-0", className)} style={style} />
    </>
  );
}

export interface SkeletonLineProps {
  width?: Size;
  height?: Size;
  mode?: SkeletonMode;
  className?: string;
}

export function SkeletonLine({ width = "100%", height = 12, mode, className }: SkeletonLineProps) {
  return <Bone mode={mode} className={cn("rounded-full", className)} style={{ width: px(width), height: px(height), maxWidth: "100%" }} />;
}

export interface SkeletonCircleProps {
  size?: Size;
  mode?: SkeletonMode;
  className?: string;
}

export function SkeletonCircle({ size = 40, mode, className }: SkeletonCircleProps) {
  return <Bone mode={mode} className={cn("rounded-full", className)} style={{ width: px(size), height: px(size) }} />;
}

export interface SkeletonRectProps {
  width?: Size;
  height?: Size;
  /** CSS aspect-ratio, e.g. "16 / 9". Used when height is not set. */
  aspectRatio?: string;
  radius?: Size;
  mode?: SkeletonMode;
  className?: string;
}

export function SkeletonRect({ width = "100%", height, aspectRatio, radius = 12, mode, className }: SkeletonRectProps) {
  return (
    <Bone
      mode={mode}
      className={className}
      style={{ width: px(width), height: px(height), aspectRatio: height === undefined ? aspectRatio : undefined, borderRadius: px(radius), maxWidth: "100%" }}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  /** Seed for the line widths. Same seed, same widths, on server and client. */
  seed?: number;
  /** Shortest and longest full line, in percent. The last line is shorter. */
  minWidth?: number;
  maxWidth?: number;
  lineHeight?: Size;
  gap?: Size;
  mode?: SkeletonMode;
  className?: string;
}

export function SkeletonText({ lines = 3, seed = 1, minWidth = 72, maxWidth = 100, lineHeight = 10, gap = 10, mode, className }: SkeletonTextProps) {
  const rand = seeded(seed * 7919);
  const widths = Array.from({ length: lines }, (_, i) =>
    i === lines - 1 && lines > 1 ? 35 + rand() * 30 : minWidth + rand() * (maxWidth - minWidth),
  );
  return (
    <div aria-hidden className={cn("flex w-full flex-col", className)} style={{ gap: px(gap) }}>
      {widths.map((w, i) => (
        <SkeletonLine key={i} mode={mode} width={`${w.toFixed(1)}%`} height={lineHeight} />
      ))}
    </div>
  );
}

export interface SkeletonPresetProps {
  variant: SkeletonPresetName;
  /** Repeats for "list-item" and "table-row". */
  count?: number;
  seed?: number;
  mode?: SkeletonMode;
  className?: string;
}

export function SkeletonPreset({ variant, count = 3, seed = 1, mode, className }: SkeletonPresetProps) {
  const rand = seeded(seed * 104729);
  const pct = (min: number, max: number) => `${(min + rand() * (max - min)).toFixed(1)}%`;

  if (variant === "list-item" || variant === "table-row") {
    return (
      <div aria-hidden className={cn("flex w-full flex-col", variant === "list-item" ? "gap-5" : "gap-0", className)}>
        {Array.from({ length: count }, (_, i) =>
          variant === "list-item" ? (
            <div key={i} className="flex items-start gap-3">
              <SkeletonCircle mode={mode} size={40} />
              <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <SkeletonLine mode={mode} width={pct(28, 42)} height={12} />
                  <SkeletonLine mode={mode} width={28} height={8} />
                </div>
                <SkeletonText mode={mode} lines={2} seed={seed + i} lineHeight={9} gap={8} />
              </div>
            </div>
          ) : (
            <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border py-3 last:border-b-0">
              <SkeletonCircle mode={mode} size={28} />
              <SkeletonLine mode={mode} width={pct(45, 85)} height={10} />
              <SkeletonRect mode={mode} width={56} height={20} radius={999} />
              <SkeletonLine mode={mode} width={52} height={10} />
            </div>
          ),
        )}
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div aria-hidden className={cn("flex w-full flex-col items-center gap-3", className)}>
        <SkeletonCircle mode={mode} size={72} />
        <SkeletonLine mode={mode} width="45%" height={16} />
        <SkeletonLine mode={mode} width="30%" height={10} />
        <SkeletonText mode={mode} lines={3} seed={seed} className="mt-1 items-center" />
        <div className="mt-1 grid w-full grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <SkeletonRect key={i} mode={mode} height={44} radius={10} />
          ))}
        </div>
        <SkeletonRect mode={mode} width="60%" height={36} radius={999} />
      </div>
    );
  }

  if (variant === "article") {
    return (
      <div aria-hidden className={cn("flex w-full flex-col gap-3", className)}>
        <SkeletonLine mode={mode} width="92%" height={18} />
        <SkeletonLine mode={mode} width={pct(50, 65)} height={18} />
        <div className="my-1 flex items-center gap-2.5">
          <SkeletonCircle mode={mode} size={32} />
          <div className="flex flex-1 flex-col gap-2">
            <SkeletonLine mode={mode} width="35%" height={10} />
            <SkeletonLine mode={mode} width="22%" height={8} />
          </div>
        </div>
        <SkeletonRect mode={mode} aspectRatio="2 / 1" radius={14} />
        <SkeletonText mode={mode} lines={5} seed={seed} className="mt-1" />
      </div>
    );
  }

  // card
  return (
    <div aria-hidden className={cn("flex w-full flex-col gap-3", className)}>
      <SkeletonRect mode={mode} aspectRatio="16 / 9" radius={14} />
      <SkeletonLine mode={mode} width={pct(55, 75)} height={14} className="mt-1" />
      <SkeletonText mode={mode} lines={2} seed={seed} />
      <div className="flex items-center gap-2 pt-1">
        <SkeletonCircle mode={mode} size={26} />
        <SkeletonLine mode={mode} width="38%" height={10} />
      </div>
    </div>
  );
}

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** While true the skeleton shows. When it turns false the real children fade and unblur in. */
  loading: boolean;
  /** The real content. Its top-level elements are revealed one after another. */
  children?: ReactNode;
  /** Custom skeleton. Defaults to the preset. */
  skeleton?: ReactNode;
  preset?: SkeletonPresetName;
  /** Repeats for list and table presets. */
  count?: number;
  /** Animation for every bone inside. */
  mode?: SkeletonMode;
  /** Visually hidden status text read once while loading. */
  label?: string;
  /** Delay between revealed children, in ms. */
  stagger?: number;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Wraps content that loads. While loading it shows skeleton bones (aria-hidden)
 * and one visually hidden status message, and sets aria-busy. When loading
 * ends the skeleton blurs out on top while the children fade in with a stagger.
 * The container's className lays out both the skeleton and the content.
 */
export function Skeleton({
  loading,
  children,
  skeleton,
  preset = "card",
  count,
  mode = "shimmer",
  label = "Loading…",
  stagger = 70,
  className,
  ref,
  ...rest
}: SkeletonProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, getServerMotion);
  // The skeleton stays on top while it fades out, so the swap never jumps.
  const [revealing, setRevealing] = useState(false);
  const [wasLoading, setWasLoading] = useState(loading);
  if (wasLoading !== loading) {
    setWasLoading(loading);
    setRevealing(!loading);
  }

  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const overlay = overlayRef.current;
    if (!revealing || !root || !overlay) return;
    const children = [...root.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el.dataset.skeletonLayer === undefined);
    const running: Animation[] = [];
    if (reduced) {
      running.push(overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }));
      for (const el of children) running.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "backwards" }));
    } else {
      running.push(
        overlay.animate(
          [
            { opacity: 1, filter: "blur(0px)" },
            { opacity: 0, filter: "blur(8px)" },
          ],
          { duration: 420, easing: "ease-out", fill: "forwards" },
        ),
      );
      children.forEach((el, i) => {
        running.push(
          el.animate(
            [
              { opacity: 0, filter: "blur(10px)", transform: "translateY(6px)" },
              { opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" },
            ],
            { duration: 560, delay: Math.min(i, 8) * stagger, easing: EASE, fill: "backwards" },
          ),
        );
      });
    }
    let live = true;
    Promise.all(running.map((a) => a.finished))
      .then(() => {
        if (live) setRevealing(false);
      })
      .catch(() => {});
    return () => {
      live = false;
      for (const a of running) a.cancel();
    };
  }, [revealing, reduced, stagger]);

  const bones = skeleton ?? <SkeletonPreset variant={preset} count={count} />;

  return (
    <ModeContext.Provider value={mode}>
      <div ref={rootRef} aria-busy={loading} className={cn("relative", className)} {...rest}>
        <span role="status" data-skeleton-layer="" className="sr-only">
          {loading ? label : ""}
        </span>
        {loading ? (
          <div data-skeleton-layer="" className="contents">
            {bones}
          </div>
        ) : (
          <>
            {children}
            {revealing ? (
              <div ref={overlayRef} data-skeleton-layer="" aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                {bones}
              </div>
            ) : null}
          </>
        )}
      </div>
    </ModeContext.Provider>
  );
}
