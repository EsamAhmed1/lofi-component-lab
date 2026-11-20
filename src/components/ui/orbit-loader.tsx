"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export type OrbitLoaderStatus = "idle" | "loading" | "success" | "error";
export type OrbitLoaderSize = "sm" | "md" | "lg" | number;

export interface OrbitLoaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** What is loading. Names the progressbar or status for screen readers. */
  label: string;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  /** 0 to 100. Leave undefined for an indeterminate spinner. */
  progress?: number;
  /** Stage names shown under the loader as a pipeline. */
  steps?: string[];
  /** Index of the active step (0-based). Earlier steps show as done. */
  currentStep?: number;
  /** "idle" pauses the orbits, "success" morphs into a check, "error" shakes and shows an alert. */
  status?: OrbitLoaderStatus;
  /** Preset or a pixel size. */
  size?: OrbitLoaderSize;
  /** Any CSS colour for the orbits, arc and steps. */
  accent?: string;
  /** Animation speed multiplier. 2 is twice as fast. */
  speed?: number;
  /** Shown and announced on success. */
  successText?: string;
  /** Shown and announced on error. */
  errorText?: string;
}

const SIZES = { sm: 48, md: 96, lg: 144 } as const;

const SUCCESS = "#059669";
const ERROR = "#dc2626";

interface Ring {
  r: number;
  count: number;
  /** Seconds per turn at speed 1. */
  dur: number;
  /** 1 = clockwise, -1 = counter-clockwise. */
  dir: 1 | -1;
  dot: number;
  trail: number;
  /** Degrees between trail dots. */
  step: number;
  dashed?: boolean;
}

const RINGS: Ring[] = [
  { r: 24, count: 1, dur: 1.3, dir: 1, dot: 3.4, trail: 8, step: 7 },
  { r: 35, count: 2, dur: 2.2, dir: -1, dot: 2.8, trail: 6, step: 6 },
  { r: 45, count: 3, dur: 3.6, dir: 1, dot: 2.1, trail: 4, step: 5, dashed: true },
];

const round = (n: number) => Number(n.toFixed(3));
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// Keyframes live with the component. React 19 hoists and de-duplicates a
// <style> that has href + precedence, so many loaders share one copy.
const CSS = `
@keyframes orbit-loader-spin { to { transform: rotate(360deg); } }
@keyframes orbit-loader-pulse { 0%, 100% { transform: scale(0.85); opacity: 0.45; } 50% { transform: scale(1.2); opacity: 0.12; } }
@keyframes orbit-loader-breathe { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
@keyframes orbit-loader-shake { 0%, 100% { transform: translateX(0); } 15%, 55% { transform: translateX(-7%); } 35%, 75% { transform: translateX(7%); } 90% { transform: translateX(-2%); } }
@keyframes orbit-loader-pop { from { transform: scale(0.3); opacity: 0; } 60% { transform: scale(1.1); opacity: 1; } to { transform: scale(1); opacity: 1; } }
@keyframes orbit-loader-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes orbit-loader-burst { from { transform: scale(0.55); opacity: 0; } 30% { opacity: 1; } to { transform: scale(1.3); opacity: 0; } }
@keyframes orbit-loader-ripple { from { transform: scale(1); opacity: 0.6; } to { transform: scale(2.1); opacity: 0; } }
@keyframes orbit-loader-ping { from { transform: scale(1); opacity: 0.55; } to { transform: scale(2.3); opacity: 0; } }
.orbit-loader-spin { transform-origin: 50px 50px; animation: orbit-loader-spin calc(var(--ol-dur) / var(--ol-speed, 1)) linear infinite; }
.orbit-loader-ccw { animation-direction: reverse; }
.orbit-loader-pulse { transform-origin: 50px 50px; animation: orbit-loader-pulse calc(2.4s / var(--ol-speed, 1)) ease-in-out infinite; }
.orbit-loader-fade { transform-origin: 50px 50px; transition: opacity 0.45s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
.orbit-loader-arc { transition: stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease; }
.orbit-loader-shake { animation: orbit-loader-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
.orbit-loader-pop { transform-origin: 50px 50px; animation: orbit-loader-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.orbit-loader-check { animation: orbit-loader-draw 0.4s 0.2s ease-out both; }
.orbit-loader-burst { transform-origin: 50px 50px; animation: orbit-loader-burst 0.7s 0.1s ease-out both; }
.orbit-loader-ripple { transform-origin: 50px 50px; animation: orbit-loader-ripple 0.8s ease-out both; }
.orbit-loader-ping { animation: orbit-loader-ping 1.4s ease-out infinite; }
[data-ol-status="idle"] .orbit-loader-spin, [data-ol-status="idle"] .orbit-loader-pulse { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .orbit-loader-spin, .orbit-loader-pulse, .orbit-loader-shake, .orbit-loader-pop, .orbit-loader-check, .orbit-loader-ping { animation: none; }
  .orbit-loader-burst, .orbit-loader-ripple { display: none; }
  .orbit-loader-fade, .orbit-loader-arc { transition: none; }
  [data-ol-status="loading"] .orbit-loader-orbits { animation: orbit-loader-breathe 2.2s ease-in-out infinite; }
}
`;

/** One orbit: a faint track plus comet heads with fading trails. */
function OrbitRing({ ring }: { ring: Ring }) {
  const y = 50 - ring.r;
  return (
    <g>
      <circle
        cx={50}
        cy={50}
        r={ring.r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.14}
        strokeWidth={ring.dashed ? 1 : 1.4}
        strokeDasharray={ring.dashed ? "1 3" : undefined}
      />
      <g
        className={cn("orbit-loader-spin", ring.dir < 0 && "orbit-loader-ccw")}
        style={{ "--ol-dur": `${ring.dur}s` } as CSSProperties}
      >
        {Array.from({ length: ring.count }, (_, i) => (
          <g key={i} transform={`rotate(${round((360 / ring.count) * i)} 50 50)`}>
            {/* Trail sits behind the head, so its side depends on direction.
                Rotations instead of trig keep server and client markup identical. */}
            {Array.from({ length: ring.trail }, (_, k) => {
              const t = (k + 1) / (ring.trail + 1);
              return (
                <circle
                  key={k}
                  cx={50}
                  cy={y}
                  r={round(ring.dot * (1 - t * 0.7))}
                  fill="currentColor"
                  opacity={round(0.6 * (1 - t))}
                  transform={`rotate(${-ring.dir * ring.step * (k + 1)} 50 50)`}
                />
              );
            })}
            <circle cx={50} cy={y} r={round(ring.dot * 2.6)} fill="currentColor" opacity={0.16} />
            <circle cx={50} cy={y} r={ring.dot} fill="currentColor" />
          </g>
        ))}
      </g>
    </g>
  );
}

/**
 * A kinetic loader: a glowing core with comet orbits. It can be
 * indeterminate, show a progress arc with an animated percentage, list
 * pipeline steps, and morph into a success check or an error alert.
 */
export const OrbitLoader = forwardRef<HTMLDivElement, OrbitLoaderProps>(function OrbitLoader(
  {
    label,
    hideLabel = false,
    progress,
    steps,
    currentStep = 0,
    status = "loading",
    size = "md",
    accent,
    speed = 1,
    successText = "Done",
    errorText = "Something went wrong",
    className,
    style,
    ...rest
  },
  ref,
) {
  const id = useId();
  const labelId = `${id}-label`;
  const px = typeof size === "number" ? size : SIZES[size];
  const determinate = typeof progress === "number" && Number.isFinite(progress);
  const value = determinate ? clamp(progress, 0, 100) : 0;
  const stepCount = steps?.length ?? 0;
  const active = stepCount ? clamp(Math.floor(currentStep), 0, stepCount - 1) : 0;
  const running = status === "loading" || status === "idle";
  const tone = status === "success" ? SUCCESS : status === "error" ? ERROR : "var(--ol-accent)";

  // The percentage counts up smoothly. It is written straight to the DOM in
  // rAF so React does not re-render every frame.
  const numRef = useRef<HTMLSpanElement | null>(null);
  const shown = useRef(value);
  const [initialNumber] = useState(() => Math.round(value));
  const reducedMotion = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => (reducedMotion.current = query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!determinate) return;
    const el = numRef.current;
    const from = shown.current;
    if (!el || reducedMotion.current || from === value) {
      shown.current = value;
      if (el) el.textContent = String(Math.round(value));
      return;
    }
    let frame = 0;
    let start: number | null = null;
    const animate = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / 600);
      const eased = 1 - Math.pow(1 - t, 3);
      shown.current = from + (value - from) * eased;
      el.textContent = String(Math.round(shown.current));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [determinate, value]);

  const announcement =
    status === "success"
      ? successText
      : status === "error"
        ? errorText
        : stepCount
          ? `Step ${active + 1} of ${stepCount}: ${steps![active]}`
          : "";

  const valueText = determinate
    ? stepCount
      ? `${Math.round(value)}%, step ${active + 1} of ${stepCount}: ${steps![active]}`
      : `${Math.round(value)}%`
    : undefined;

  return (
    <div
      ref={ref}
      {...rest}
      data-ol-status={status}
      className={cn(
        "flex flex-col items-center gap-3 text-center",
        stepCount ? "w-full max-w-md" : "w-max max-w-full",
        className,
      )}
      style={
        {
          "--ol-accent": accent ?? "var(--accent)",
          "--ol-speed": Math.max(0.1, speed),
          ...style,
        } as CSSProperties
      }
    >
      <style href="orbit-loader" precedence="default">
        {CSS}
      </style>

      <div
        role={determinate ? "progressbar" : "status"}
        aria-label={hideLabel ? label : undefined}
        aria-labelledby={hideLabel ? undefined : labelId}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
        aria-valuenow={determinate ? Math.round(value) : undefined}
        aria-valuetext={valueText}
        aria-busy={status === "loading"}
        className="relative shrink-0"
        style={{ width: px, height: px }}
      >
        <div className={cn("absolute inset-0", status === "error" && "orbit-loader-shake")}>
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            className="size-full overflow-visible transition-[color] duration-500"
            style={{ color: tone }}
          >
            {/* Glow pulse behind the core or the percentage disc. */}
            <g className="orbit-loader-fade" style={{ opacity: running ? 1 : 0 }}>
              <circle
                className="orbit-loader-pulse"
                cx={50}
                cy={50}
                r={determinate ? 20 : 15}
                fill="currentColor"
                opacity={0.25}
              />
            </g>

            <g
              className="orbit-loader-fade"
              style={{ opacity: running ? (status === "idle" ? 0.5 : 1) : 0, transform: running ? "scale(1)" : "scale(0.55)" }}
            >
              <g className="orbit-loader-orbits">
                {RINGS.map((ring, i) =>
                  determinate && i === 0 ? null : <OrbitRing key={ring.r} ring={ring} />,
                )}
              </g>
            </g>

            {determinate ? (
              <g>
                <circle cx={50} cy={50} r={24} fill="none" stroke="currentColor" strokeOpacity={0.16} strokeWidth={4} />
                <circle
                  className="orbit-loader-arc"
                  cx={50}
                  cy={50}
                  r={24}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={4}
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="100 100"
                  strokeDashoffset={100 - value}
                  transform="rotate(-90 50 50)"
                  opacity={value > 0 ? 1 : 0}
                />
              </g>
            ) : (
              <g className="orbit-loader-fade" style={{ opacity: running ? 1 : 0, transform: running ? "scale(1)" : "scale(0.4)" }}>
                <circle cx={50} cy={50} r={9} fill="currentColor" />
                <circle cx={47} cy={47} r={3.2} fill="#fff" opacity={0.55} />
              </g>
            )}

            {status === "success" ? (
              <g>
                <circle className="orbit-loader-ripple" cx={50} cy={50} r={21} fill="none" stroke="currentColor" strokeWidth={2} />
                {Array.from({ length: 8 }, (_, i) => (
                  <g key={i} transform={`rotate(${i * 45} 50 50)`}>
                    <line
                      className="orbit-loader-burst"
                      x1={50}
                      y1={22}
                      x2={50}
                      y2={14}
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  </g>
                ))}
                <g className="orbit-loader-pop">
                  <circle cx={50} cy={50} r={20} fill="currentColor" />
                  <path
                    className="orbit-loader-check"
                    d="M40 50.5 L47 57.5 L61 43"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={5.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray="1 1"
                    strokeDashoffset={0}
                  />
                </g>
              </g>
            ) : null}

            {status === "error" ? (
              <g className="orbit-loader-pop">
                <circle cx={50} cy={50} r={20} fill="currentColor" />
                <path d="M50 39 V52" stroke="#fff" strokeWidth={5.5} strokeLinecap="round" />
                <circle cx={50} cy={60.5} r={3.1} fill="#fff" />
              </g>
            ) : null}
          </svg>

          {determinate ? (
            <div
              aria-hidden
              className={cn(
                "absolute left-1/2 top-1/2 grid aspect-square w-[38%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface text-foreground shadow-[0_0_0_1px_var(--border)]",
                "transition-[opacity,scale] duration-300 motion-reduce:transition-none",
                running ? "scale-100 opacity-100" : "scale-50 opacity-0",
                px < 64 && "hidden",
              )}
              style={{ fontSize: Math.round(px * 0.12) }}
            >
              <span className="font-semibold leading-none tabular-nums">
                <span ref={numRef}>{initialNumber}</span>
                <span className="text-[0.7em] text-muted">%</span>
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* With hideLabel the whole block is visually hidden, so it adds no gap. */}
      <div className={cn("flex flex-col items-center gap-0.5", hideLabel && "sr-only")}>
        <p id={labelId} className="text-sm font-medium text-foreground">
          {label}
        </p>
        {/* Polite live region: step changes and the final status. */}
        <p
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            "min-h-4 text-xs",
            status === "success"
              ? "font-medium text-emerald-700 dark:text-emerald-300"
              : status === "error"
                ? "font-medium text-red-700 dark:text-red-300"
                : "text-muted",
          )}
        >
          {announcement}
        </p>
      </div>

      {stepCount ? (
        <ol className="grid w-full" style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))` }}>
          {steps!.map((step, i) => {
            const state =
              status === "success" || i < active
                ? "done"
                : i === active
                  ? status === "error"
                    ? "error"
                    : "current"
                  : "todo";
            return (
              <li
                key={`${i}-${step}`}
                aria-current={state === "current" || state === "error" ? "step" : undefined}
                className="relative flex flex-col items-center gap-1.5 px-1 text-center"
              >
                {i < stepCount - 1 ? (
                  <span
                    aria-hidden
                    className="absolute left-[calc(50%+16px)] right-[calc(-50%+16px)] top-[11px] h-0.5 overflow-hidden rounded-full bg-border"
                  >
                    <span
                      className="block h-full bg-[var(--ol-accent)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
                      style={{ width: state === "done" ? "100%" : "0%" }}
                    />
                  </span>
                ) : null}
                <span
                  aria-hidden
                  className={cn(
                    "relative grid size-6 place-items-center rounded-full text-[11px] font-semibold transition-colors duration-300",
                    state === "done" &&
                      "bg-[color-mix(in_oklab,var(--ol-accent)_16%,var(--surface))] text-[var(--ol-accent)] ring-1 ring-[var(--ol-accent)]",
                    state === "current" && "bg-surface ring-2 ring-[var(--ol-accent)]",
                    state === "error" && "bg-red-600 text-white",
                    state === "todo" && "bg-surface text-muted ring-1 ring-border",
                  )}
                >
                  {state === "done" ? (
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 8.5 6.5 11.5 12.5 5" />
                    </svg>
                  ) : state === "current" ? (
                    <>
                      <span className="orbit-loader-ping absolute inset-0 rounded-full bg-[var(--ol-accent)]" />
                      <span className="relative size-2.5 rounded-full bg-[var(--ol-accent)]" />
                    </>
                  ) : state === "error" ? (
                    "!"
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-xs leading-snug [overflow-wrap:anywhere]",
                    state === "current" && "font-medium text-foreground",
                    state === "done" && "text-foreground",
                    state === "error" && "font-medium text-red-700 dark:text-red-300",
                    state === "todo" && "text-muted",
                  )}
                >
                  {step}
                  {state === "done" ? <span className="sr-only"> (done)</span> : null}
                  {state === "error" ? <span className="sr-only"> (failed)</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
});
