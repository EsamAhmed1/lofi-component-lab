"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type KpiFormat = "currency" | "percent" | "number" | "compact";
export type KpiVariant = "default" | "highlight" | "minimal";

export interface KpiCardProps {
  /** Metric name, e.g. "Revenue". */
  label: string;
  /** Current value. For "percent", pass a fraction (0.034 is 3.4%). */
  value: number;
  /** Value of the previous period. Used for the delta when `delta` is not set. */
  previousValue?: number;
  /** Change in percent (12.4 means +12.4%). Overrides the one worked out from previousValue. */
  delta?: number;
  /** Treat a fall as good, e.g. churn or load time. Flips the badge colours. */
  invert?: boolean;
  /** Comparison period, used in "vs $42,890 last month" and the screen-reader delta. */
  period?: string;
  format?: KpiFormat;
  /** BCP 47 locale for every number. */
  locale?: string;
  /** ISO currency code for the "currency" format. */
  currency?: string;
  /** Fraction digits. Defaults: currency 0, percent 1, compact 1, number 0. */
  decimals?: number;
  /** Sparkline values, oldest first. Two or more draws the chart. */
  data?: number[];
  /** Label per data point for the scrub readout, e.g. "Mar 12". */
  dataLabels?: string[];
  /** Goal for the progress bar (value / target). */
  target?: number;
  /** Word after the target, e.g. "goal" in "82% of $60K goal". */
  targetLabel?: string;
  /** Small icon next to the label. */
  icon?: ReactNode;
  variant?: KpiVariant;
  /** Shows a shimmer skeleton. */
  loading?: boolean;
  /** Shows an error state. A string replaces the default message. */
  error?: boolean | string;
  /** Shows a retry button in the error state. */
  onRetry?: () => void;
  /** Makes the whole card a link. */
  href?: string;
  className?: string;
}

const CSS = `
@keyframes kpi-card-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes kpi-card-shimmer { from { background-position: 150% 0; } to { background-position: -50% 0; } }
.kpi-card-spin { animation: kpi-card-spin 6s linear infinite; transform: translate(-50%, -50%); }
.kpi-card-shimmer {
  background-image: linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--foreground) 9%, transparent) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: kpi-card-shimmer 1.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .kpi-card-spin, .kpi-card-shimmer { animation: none; }
}
`;

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerMotion = () => false;

function makeFormatter(format: KpiFormat, locale: string, currency: string, decimals?: number) {
  const options: Intl.NumberFormatOptions =
    format === "currency"
      ? { style: "currency", currency, minimumFractionDigits: decimals ?? 0, maximumFractionDigits: decimals ?? 0 }
      : format === "percent"
        ? { style: "percent", minimumFractionDigits: decimals ?? 1, maximumFractionDigits: decimals ?? 1 }
        : format === "compact"
          ? { notation: "compact", maximumFractionDigits: decimals ?? 1 }
          : { maximumFractionDigits: decimals ?? 0 };
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return new Intl.NumberFormat("en-US", options);
  }
}

/* --------------------------------------------------------------- ticker */

const ROLL = Array.from({ length: 30 }, (_, i) => i % 10);
const ROW = 1.1; // em

/**
 * Draws a formatted number where every digit is a column of 0-9 that rolls to
 * its place. The string never changes length while rolling, so nothing shifts.
 */
function Ticker({ text, revealed, reduced }: { text: string; revealed: boolean; reduced: boolean }) {
  const chars = Array.from(text);
  let order = 0;
  return (
    <span aria-hidden className="inline-flex">
      {chars.map((ch, i) => {
        const key = chars.length - i;
        if (!/[0-9]/.test(ch)) {
          return (
            <span key={`s${key}-${ch}`} className="inline-block h-[1.1em] whitespace-pre leading-[1.1em]">
              {ch}
            </span>
          );
        }
        const n = revealed ? Number(ch) + 20 : 0;
        const delay = order++ * 70;
        return (
          <span key={`d${key}`} className="relative inline-block h-[1.1em] overflow-hidden leading-[1.1em]">
            <span className="invisible">{ch}</span>
            <span
              className="absolute inset-x-0 top-0 flex flex-col"
              style={{
                transform: `translateY(${-n * ROW}em)`,
                transition: reduced ? "none" : `transform 1500ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
              }}
            >
              {ROLL.map((digit, j) => (
                <span key={j} className="block h-[1.1em] text-center">
                  {digit}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------ sparkline */

const W = 100;
const H = 40;
const PAD = 4;

function geometry(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: values.length === 1 ? W / 2 : (i / (values.length - 1)) * W,
    y: PAD + (1 - (v - min) / span) * (H - PAD * 2),
  }));
  const r = (n: number) => Math.round(n * 100) / 100;
  let line = `M${r(pts[0].x)} ${r(pts[0].y)}`;
  // Catmull-Rom turned into cubic Béziers for a smooth curve through every point.
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1y = Math.min(H, Math.max(0, p1.y + (p2.y - p0.y) / 6));
    const c2y = Math.min(H, Math.max(0, p2.y - (p3.y - p1.y) / 6));
    line += `C${r(p1.x + (p2.x - p0.x) / 6)} ${r(c1y)} ${r(p2.x - (p3.x - p1.x) / 6)} ${r(c2y)} ${r(p2.x)} ${r(p2.y)}`;
  }
  const area = `${line}L${W} ${H}L0 ${H}Z`;
  return { pts, line, area, min, max };
}

/* ------------------------------------------------------------- the card */

const tones = {
  good: {
    vars: "[--kpi-tone:var(--color-emerald-600)] dark:[--kpi-tone:var(--color-emerald-400)]",
    badge: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  bad: {
    vars: "[--kpi-tone:var(--color-rose-600)] dark:[--kpi-tone:var(--color-rose-400)]",
    badge: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
  flat: {
    vars: "[--kpi-tone:var(--accent)]",
    badge: "bg-surface-2 text-muted",
  },
};

const ring = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring";

/**
 * A dashboard stat card: a label, a big value whose digits roll into place on
 * first view, a delta badge, a scrubbable sparkline and an optional target bar.
 * Handles loading and error states, and can be a link.
 */
export function KpiCard({
  label,
  value,
  previousValue,
  delta,
  invert = false,
  period = "last month",
  format = "number",
  locale = "en-US",
  currency = "USD",
  decimals,
  data,
  dataLabels,
  target,
  targetLabel = "goal",
  icon,
  variant = "default",
  loading = false,
  error,
  onRetry,
  href,
  className,
}: KpiCardProps) {
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, getServerMotion);
  const rootRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  // Armed one frame after the value mounts, so a remount (after loading) rolls in again.
  const [armed, setArmed] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const gradientId = `${baseId.replace(/[^a-zA-Z0-9_-]/g, "")}-kpi-fill`;

  const fmt = makeFormatter(format, locale, currency, decimals);
  const formatted = fmt.format(value);
  const pct =
    delta ?? (previousValue !== undefined && previousValue !== 0 ? ((value - previousValue) / Math.abs(previousValue)) * 100 : undefined);
  const dir = pct === undefined ? null : pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat";
  const tone = dir === null || dir === "flat" ? "flat" : (dir === "up") !== invert ? "good" : "bad";
  const pctText =
    pct === undefined ? "" : `${Math.abs(pct).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const deltaSr = dir === null ? "" : dir === "flat" ? `no change from ${period}` : `${dir} ${pctText} from ${period}`;

  const series = data && data.length > 1 ? data : null;
  const geo = series ? geometry(series) : null;
  const pointName = (i: number) => dataLabels?.[i] ?? `Point ${i + 1}`;
  const readout = series && active !== null ? `${pointName(active)}: ${fmt.format(series[active])}` : "";
  const summary = series
    ? `${label} trend over ${series.length} points: from ${fmt.format(series[0])} to ${fmt.format(series[series.length - 1])}, low ${fmt.format(geo!.min)}, high ${fmt.format(geo!.max)}.`
    : "";
  const progress = target && target > 0 ? Math.max(0, value / target) : null;
  const isError = Boolean(error) && !loading;
  const ready = !loading && !isError;
  const [prevReady, setPrevReady] = useState(ready);
  if (ready !== prevReady) {
    setPrevReady(ready);
    if (!ready) setArmed(false);
  }
  const shown = reduced || (revealed && armed);

  useEffect(() => {
    if (!ready || armed) return;
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, [ready, armed]);

  // Roll the digits in once the card is 40% visible.
  useEffect(() => {
    if (revealed) return;
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [revealed]);

  const indexAt = (event: PointerEvent<HTMLDivElement>) => {
    if (!series) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
    return Math.round(t * (series.length - 1));
  };

  const onScrubKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!series) return;
    const lastIndex = series.length - 1;
    const current = active ?? lastIndex;
    let next = current;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = current - 1;
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = current + 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = lastIndex;
    else if (event.key === "Escape") {
      setActive(null);
      return;
    } else return;
    event.preventDefault();
    setActive(Math.min(lastIndex, Math.max(0, next)));
  };

  const highlight = variant === "highlight";
  const minimal = variant === "minimal";
  const point = geo && active !== null ? geo.pts[active] : null;

  const body = (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-busy={loading || undefined}
      className={cn(
        "@container relative isolate flex h-full flex-col text-foreground",
        tones[tone].vars,
        minimal && "rounded-xl p-1",
        highlight && "rounded-[calc(1rem-1px)] bg-surface p-5",
        variant === "default" && "rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)]",
      )}
    >
      {highlight ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-[radial-gradient(120%_70%_at_0%_0%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_60%)]"
        />
      ) : null}

      <div className="flex min-h-8 items-center gap-2.5">
        {icon ? (
          <span
            aria-hidden
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg [&>svg]:size-4",
              highlight ? "bg-accent text-accent-foreground shadow-[0_6px_16px_-6px_var(--accent)]" : "bg-surface-2 text-muted",
            )}
          >
            {icon}
          </span>
        ) : null}
        {href ? (
          <a
            id={labelId}
            href={href}
            className={cn(
              "min-w-0 flex-1 truncate text-sm font-medium text-muted outline-none",
              "after:absolute after:inset-0 after:z-[5] after:rounded-2xl after:content-['']",
              "focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-solid focus-visible:after:outline-ring",
            )}
          >
            {label}
          </a>
        ) : (
          <span id={labelId} className="min-w-0 flex-1 truncate text-sm font-medium text-muted">
            {label}
          </span>
        )}
        {ready && (dir || series) ? (
          <span className="grid shrink-0 justify-items-end">
            {dir ? (
              <span
                aria-hidden
                className={cn(
                  "col-start-1 row-start-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums transition-[opacity,translate] duration-200 motion-reduce:transition-none",
                  tones[tone].badge,
                  readout && "-translate-y-1 opacity-0",
                )}
              >
                <span className="text-[9px]">{dir === "up" ? "▲" : dir === "down" ? "▼" : "■"}</span>
                {pctText}
              </span>
            ) : null}
            <span
              aria-hidden
              className={cn(
                "col-start-1 row-start-1 whitespace-nowrap rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground transition-[opacity,translate] duration-200 motion-reduce:transition-none",
                readout ? "opacity-100" : "translate-y-1 opacity-0",
              )}
            >
              {readout}
            </span>
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 flex flex-1 flex-col gap-3" aria-hidden>
          <span className="kpi-card-shimmer block h-9 w-2/3 rounded-lg bg-surface-2" />
          <span className="kpi-card-shimmer block h-3 w-1/2 rounded bg-surface-2" />
          <span className="kpi-card-shimmer mt-auto block h-14 w-full rounded-lg bg-surface-2" />
        </div>
      ) : null}
      {loading ? <span className="sr-only">Loading {label}</span> : null}

      {isError ? (
        <div role="alert" className="mt-4 flex flex-1 flex-col items-start gap-3">
          <p className="flex items-start gap-2 text-sm text-foreground">
            <svg aria-hidden viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4.5v4M8 11v.5" strokeLinecap="round" />
            </svg>
            {typeof error === "string" ? error : `Couldn't load ${label.toLowerCase()}.`}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className={cn(
                "relative z-10 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium transition-[background-color,scale] hover:bg-surface-2 active:scale-[0.97] motion-reduce:transition-none",
                ring,
              )}
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v2.5h-2.5" />
              </svg>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {ready ? (
        <>
          <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums @min-[15rem]:text-4xl">
            <span className="sr-only">{formatted}</span>
            <Ticker text={formatted} revealed={shown} reduced={reduced} />
          </p>
          {dir ? <p className="sr-only">{deltaSr}</p> : null}
          {previousValue !== undefined ? (
            <p className="mt-1 text-xs text-muted">
              vs {fmt.format(previousValue)} {period}
            </p>
          ) : null}

          {series && geo ? (
            <div className={cn("relative z-10 mt-4", minimal ? "h-12" : "h-14")}>
              <svg
                role="img"
                aria-label={summary}
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                className="absolute inset-0 size-full overflow-visible"
                style={{
                  clipPath: shown ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
                  transition: reduced ? "none" : "clip-path 1200ms cubic-bezier(0.16, 1, 0.3, 1) 150ms",
                }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" style={{ stopColor: "var(--kpi-tone)", stopOpacity: 0.32 }} />
                    <stop offset="100%" style={{ stopColor: "var(--kpi-tone)", stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path d={geo.area} fill={`url(#${gradientId})`} />
                <path
                  d={geo.line}
                  fill="none"
                  stroke="var(--kpi-tone)"
                  strokeWidth={minimal ? 1.5 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {point ? (
                <span aria-hidden className="pointer-events-none absolute inset-0">
                  <span className="absolute inset-y-0 w-px bg-border" style={{ left: `${point.x}%` }} />
                  <span
                    className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--kpi-tone) ring-2 ring-surface shadow-[0_0_0_6px_color-mix(in_oklab,var(--kpi-tone)_22%,transparent)]"
                    style={{ left: `${point.x}%`, top: `${(point.y / H) * 100}%` }}
                  />
                </span>
              ) : null}
              <div
                role="slider"
                tabIndex={0}
                aria-label={`${label} history`}
                aria-valuemin={0}
                aria-valuemax={series.length - 1}
                aria-valuenow={active ?? series.length - 1}
                aria-valuetext={`${pointName(active ?? series.length - 1)}: ${fmt.format(series[active ?? series.length - 1])}`}
                onPointerMove={(event) => {
                  const i = indexAt(event);
                  if (i !== null && i !== active) setActive(i);
                }}
                onPointerDown={(event) => {
                  const i = indexAt(event);
                  if (i !== null) setActive(i);
                }}
                onPointerLeave={(event) => {
                  if (document.activeElement !== event.currentTarget || event.pointerType !== "mouse") setActive(null);
                }}
                onFocus={(event) => {
                  if (event.currentTarget.matches(":focus-visible") && active === null) setActive(series.length - 1);
                }}
                onBlur={() => setActive(null)}
                onKeyDown={onScrubKey}
                className="absolute -inset-x-1 -inset-y-1 cursor-crosshair touch-pan-y rounded-md focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring"
              />
            </div>
          ) : null}

          {progress !== null && target ? (
            <div className="mt-4">
              <p className="flex justify-between gap-2 text-xs text-muted">
                <span>
                  {Math.round(progress * 100)}% of {fmt.format(target)} {targetLabel}
                </span>
              </p>
              <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full origin-left rounded-full bg-linear-to-r from-(--kpi-tone) to-accent"
                  style={{
                    transform: `scaleX(${shown ? Math.min(1, progress) : 0})`,
                    transition: reduced ? "none" : "transform 1200ms cubic-bezier(0.16, 1, 0.3, 1) 250ms",
                  }}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative min-w-0 rounded-2xl",
        highlight && "isolate overflow-hidden bg-border p-px shadow-[0_0_44px_-14px_var(--accent)]",
        href &&
          "transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-20px_var(--accent)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <style href="kpi-card" precedence="default">
        {CSS}
      </style>
      {highlight ? (
        <span
          aria-hidden
          className="kpi-card-spin pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[180%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_200deg,var(--accent)_290deg,#ec4899_330deg,transparent_360deg)]"
        />
      ) : null}
      {body}
    </div>
  );
}
