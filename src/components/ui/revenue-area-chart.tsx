"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export interface ChartDatum {
  /** ISO date string (read as UTC), epoch milliseconds or a Date. */
  date: string | number | Date;
  value: number;
}

export interface ChartSeries {
  id: string;
  label: string;
  data: ChartDatum[];
  /** Any CSS colour. The first series is the main one and gets the area fill. */
  color: string;
  /** Draws a dashed line, e.g. for "last year". */
  dashed?: boolean;
}

export interface ChartRange {
  id: string;
  /** Short tab text, e.g. "30D". */
  label: string;
  /** Spoken name, e.g. "30 days". Also used in "vs previous 30 days". */
  name: string;
  /** Number of days back from the latest point. */
  days: number;
}

export interface RevenueAreaChartProps {
  /** The first series is the main one (area, KPIs). Others share its dates and draw as lines. */
  series: ChartSeries[];
  ranges?: ChartRange[];
  /** Range shown first. Defaults to the second range (30D). */
  defaultRange?: string;
  /** Formats values on the axis, header and tooltip. Defaults to compact USD ($12.4K). */
  formatValue?: (value: number) => string;
  /** Formats dates (epoch ms, UTC). `mode` is "axis" or "tooltip"; `days` is the range length. */
  formatDate?: (ms: number, mode: "axis" | "tooltip", days: number) => string;
  /** Plot height in px. */
  height?: number;
  title?: string;
  /** Shows a skeleton and sets aria-busy. */
  loading?: boolean;
  onRangeChange?: (rangeId: string) => void;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  ref?: Ref<HTMLElement>;
}

const DAY = 86_400_000;

const DEFAULT_RANGES: ChartRange[] = [
  { id: "7d", label: "7D", name: "7 days", days: 7 },
  { id: "30d", label: "30D", name: "30 days", days: 30 },
  { id: "90d", label: "90D", name: "90 days", days: 90 },
  { id: "1y", label: "1Y", name: "12 months", days: 365 },
];

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
const defaultFormatValue = (v: number) => compactUsd.format(v);

const axisDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const axisMonth = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
const tooltipDay = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const defaultFormatDate = (ms: number, mode: "axis" | "tooltip", days: number) =>
  mode === "tooltip" ? tooltipDay.format(ms) : days > 120 ? axisMonth.format(ms) : axisDay.format(ms);

const pct = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

const toMs = (d: ChartDatum["date"]) => (typeof d === "number" ? d : typeof d === "string" ? Date.parse(d) : d.getTime());

const STYLES = `
@keyframes revenue-area-chart-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes revenue-area-chart-pulse { 0% { transform: scale(0.6); opacity: 0.7; } 100% { transform: scale(2.2); opacity: 0; } }
@keyframes revenue-area-chart-shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
.revenue-area-chart-fade { animation: revenue-area-chart-fade 0.5s ease-out both; }
.revenue-area-chart-pulse { transform-box: fill-box; transform-origin: center; animation: revenue-area-chart-pulse 1.6s ease-out infinite; }
.revenue-area-chart-shimmer { animation: revenue-area-chart-shimmer 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .revenue-area-chart-fade, .revenue-area-chart-pulse, .revenue-area-chart-shimmer { animation: none; }
}`;

/**
 * Monotone cubic (Fritsch-Butland) tangents. The harmonic mean keeps every
 * segment monotone, so the curve never overshoots the data.
 */
function tangents(xs: number[], ys: number[]) {
  const n = xs.length;
  const m = new Array<number>(n).fill(0);
  if (n < 2) return m;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i] || 1));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue;
    const h0 = xs[i] - xs[i - 1];
    const h1 = xs[i + 1] - xs[i];
    const w1 = 2 * h1 + h0;
    const w2 = h1 + 2 * h0;
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  return m;
}

/** Evaluates the monotone curve at `count` evenly spaced x positions in [0, 1]. */
function sampleCurve(xs: number[], ys: number[], count: number) {
  const n = xs.length;
  if (n === 0) return new Array<number>(count).fill(0);
  if (n === 1) return new Array<number>(count).fill(ys[0]);
  const m = tangents(xs, ys);
  const out: number[] = [];
  let k = 0;
  for (let s = 0; s < count; s++) {
    const x = s / (count - 1);
    while (k < n - 2 && x > xs[k + 1]) k++;
    const h = xs[k + 1] - xs[k] || 1;
    const t = Math.min(1, Math.max(0, (x - xs[k]) / h));
    const t2 = t * t;
    const t3 = t2 * t;
    out.push(
      (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1],
    );
  }
  return out;
}

/** Linear resample so two sample arrays of different lengths can be tweened. */
function resample(values: number[], count: number) {
  if (values.length === count) return values;
  if (values.length === 0) return new Array<number>(count).fill(0);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const pos = (i / Math.max(1, count - 1)) * (values.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(values.length - 1, lo + 1);
    out.push(values[lo] + (values[hi] - values[lo]) * (pos - lo));
  }
  return out;
}

/** "Nice" axis maximum and step (1, 2, 2.5 or 5 times a power of ten). */
function niceTicks(max: number, count: number) {
  const top = max > 0 ? max : 1;
  const raw = top / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const ceil = Math.ceil(top / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= ceil + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { max: ceil, ticks };
}

interface Geometry {
  left: number;
  top: number;
  plotW: number;
  plotH: number;
}

function linePath(samples: number[], yMax: number, g: Geometry) {
  const last = samples.length - 1;
  let d = "";
  for (let i = 0; i <= last; i++) {
    const x = g.left + (last ? i / last : 0.5) * g.plotW;
    const y = g.top + g.plotH * (1 - samples[i] / (yMax || 1));
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

function areaPath(samples: number[], yMax: number, g: Geometry) {
  if (!samples.length) return "";
  const base = (g.top + g.plotH).toFixed(1);
  return `${linePath(samples, yMax, g)}L${(g.left + g.plotW).toFixed(1)} ${base}L${g.left.toFixed(1)} ${base}Z`;
}

/** Number that counts to its new value; screen readers get the final text only. */
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const last = useRef(value);
  useEffect(() => {
    const from = last.current;
    if (from === value) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = duration ? Math.min(1, (now - start) / duration) : 1;
      const next = p >= 1 ? value : from + (value - from) * (1 - Math.pow(1 - p, 3));
      last.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <>
      <span aria-hidden className="tabular-nums">
        {format(shown)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}

const PAD_TOP = 14;
const PAD_RIGHT = 14;
const PAD_BOTTOM = 30;

/**
 * Area chart with a monotone curve, gradient fill, draw-in on scroll, a
 * snapping crosshair with a tooltip, keyboard exploration, an optional dashed
 * comparison series, and range tabs that morph the curve between datasets.
 */
export function RevenueAreaChart({
  series,
  ranges = DEFAULT_RANGES,
  defaultRange,
  formatValue = defaultFormatValue,
  formatDate = defaultFormatDate,
  height = 280,
  title = "Revenue",
  loading = false,
  onRangeChange,
  headingLevel = 2,
  className,
  ref,
}: RevenueAreaChartProps) {
  const H = `h${headingLevel}` as "h2";
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges[Math.min(1, ranges.length - 1)]?.id ?? "");
  const [width, setWidth] = useState(640);
  const [revealed, setRevealed] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const boxRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<SVGPathElement | null>>([]);
  const areaRef = useRef<SVGPathElement>(null);
  const shown = useRef<{ samples: number[][]; yMax: number } | null>(null);
  const geoRef = useRef<Geometry>({ left: 0, top: PAD_TOP, plotW: 0, plotH: 0 });

  const range = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const days = range?.days ?? 30;
  const primary = series[0];

  // Sorted points with epoch ms, per series.
  const parsed = useMemo(
    () =>
      series.map((s) =>
        s.data
          .map((d) => ({ t: toMs(d.date), v: d.value }))
          .filter((d) => Number.isFinite(d.t) && Number.isFinite(d.v))
          .sort((a, b) => a.t - b.t),
      ),
    [series],
  );

  const view = useMemo(() => {
    const main = parsed[0] ?? [];
    const end = main.length ? main[main.length - 1].t : 0;
    const startCut = end - days * DAY;
    const startIndex = main.findIndex((p) => p.t > startCut);
    const points = startIndex < 0 ? [] : main.slice(startIndex);
    const t0 = points[0]?.t ?? 0;
    const span = Math.max(1, end - t0);
    const lines = parsed.map((pts) => pts.filter((p) => p.t >= t0 && p.t <= end));
    const total = points.reduce((sum, p) => sum + p.v, 0);
    const previous = main.filter((p) => p.t > startCut - days * DAY && p.t <= startCut);
    const prevTotal = previous.reduce((sum, p) => sum + p.v, 0);
    const change = previous.length >= points.length * 0.8 && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
    const max = lines.reduce((m, pts) => pts.reduce((mm, p) => Math.max(mm, p.v), m), 0);
    // Value by timestamp for every series, for the tooltip, table and comparison dots.
    const lookups = lines.map((pts) => new Map(pts.map((p) => [p.t, p.v])));
    return { points, lines, lookups, t0, span, total, change, max, startIndex };
  }, [parsed, days]);

  const tickCount = Math.max(3, Math.min(6, Math.floor(height / 60)));
  const nice = useMemo(() => niceTicks(view.max, tickCount), [view.max, tickCount]);
  const yMax = nice.max;
  const ticks = nice.ticks;
  const tickLabels = ticks.map((t) => formatValue(t));
  const left = Math.ceil(Math.max(34, ...tickLabels.map((t) => t.length * 6.6 + 12)));
  const geometry: Geometry = {
    left,
    top: PAD_TOP,
    plotW: Math.max(10, width - left - PAD_RIGHT),
    plotH: Math.max(10, height - PAD_TOP - PAD_BOTTOM),
  };

  const sampleCount = Math.min(1200, Math.max(120, (view.points.length - 1) * 3 + 1));
  const target = useMemo(() => {
    const samples = view.lines.map((pts) =>
      sampleCurve(
        pts.map((p) => (p.t - view.t0) / view.span),
        pts.map((p) => p.v),
        sampleCount,
      ),
    );
    return { samples, yMax };
  }, [view, sampleCount, yMax]);

  // Track the container width.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Draw in once the chart scrolls into view.
  useEffect(() => {
    if (revealed) return;
    const el = boxRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [revealed]);

  useLayoutEffect(() => {
    geoRef.current = geometry;
  });

  // Morph: tween every sample and the y maximum from what is on screen to the new target.
  useLayoutEffect(() => {
    const from = shown.current;
    shown.current = target;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!from || reduce || from.samples.length !== target.samples.length) return;
    const same =
      from.yMax === target.yMax &&
      from.samples.every((s, i) => s.length === target.samples[i].length && s.every((v, k) => v === target.samples[i][k]));
    if (same) return;
    const start = from.samples.map((s, i) => resample(s, target.samples[i].length));
    const paint = (samples: number[][], max: number) => {
      const g = geoRef.current;
      samples.forEach((s, i) => lineRefs.current[i]?.setAttribute("d", linePath(s, max, g)));
      if (samples[0]) areaRef.current?.setAttribute("d", areaPath(samples[0], max, g));
    };
    const duration = 700;
    const t0 = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const max = from.yMax + (target.yMax - from.yMax) * e;
      const samples = start.map((s, i) => s.map((v, k) => v + (target.samples[i][k] - v) * e));
      shown.current = { samples, yMax: max };
      paint(samples, max);
      if (p < 1) frame = requestAnimationFrame(step);
      else shown.current = target;
    };
    paint(start, from.yMax);
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target]);

  const xOf = (t: number) => geometry.left + ((t - view.t0) / view.span) * geometry.plotW;
  const yOf = (v: number) => geometry.top + geometry.plotH * (1 - v / (yMax || 1));

  const pickRange = (id: string) => {
    if (id === rangeId) return;
    setRangeId(id);
    setActive(null);
    onRangeChange?.(id);
  };

  // Nearest point to an x position (binary search on time).
  const nearest = (clientX: number) => {
    const el = boxRef.current;
    const pts = view.points;
    if (!el || !pts.length) return null;
    const rect = el.getBoundingClientRect();
    const scale = rect.width / width || 1;
    const x = (clientX - rect.left) / scale;
    const t = view.t0 + ((x - geometry.left) / geometry.plotW) * view.span;
    let lo = 0;
    let hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].t < t) lo = mid;
      else hi = mid;
    }
    return Math.abs(pts[lo].t - t) <= Math.abs(pts[hi].t - t) ? lo : hi;
  };

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const i = nearest(event.clientX);
    if (i !== null && i !== active) setActive(i);
  };

  const describePoint = (i: number) => {
    const p = view.points[i];
    const prev = primary ? (parsed[0][view.startIndex + i - 1] ?? null) : null;
    const delta = prev && prev.v ? ((p.v - prev.v) / prev.v) * 100 : null;
    const others = view.lookups
      .slice(1)
      .map((lookup, k) => {
        const v = lookup.get(p.t);
        return v === undefined ? "" : `, ${series[k + 1].label} ${formatValue(v)}`;
      })
      .join("");
    const deltaText = delta === null ? "" : `, ${delta >= 0 ? "up" : "down"} ${pct.format(Math.abs(delta))}% from the previous point`;
    return { p, delta, text: `${formatDate(p.t, "tooltip", days)}: ${formatValue(p.v)}${deltaText}${others}.` };
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const n = view.points.length;
    if (!n) return;
    const current = active ?? n - 1;
    const jump = Math.max(1, Math.round(n / 10));
    let next: number | null = null;
    if (event.key === "ArrowRight") next = Math.min(n - 1, active === null ? n - 1 : current + 1);
    else if (event.key === "ArrowLeft") next = Math.max(0, active === null ? n - 1 : current - 1);
    else if (event.key === "PageUp") next = Math.min(n - 1, current + jump);
    else if (event.key === "PageDown") next = Math.max(0, current - jump);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    else if (event.key === "Escape") {
      setActive(null);
      return;
    } else return;
    event.preventDefault();
    setActive(next);
    setAnnouncement(describePoint(next).text);
  };

  const n = view.points.length;
  const activeInfo = active !== null && active < n ? describePoint(active) : null;
  const ax = activeInfo ? xOf(activeInfo.p.t) : 0;
  const ay = activeInfo ? yOf(activeInfo.p.v) : 0;
  const tooltipW = 176;
  // Beside the crosshair when there is room, otherwise above or below the point.
  const tooltipH = 96 + (series.length - 1) * 26;
  let tooltipLeft = ax + 16;
  let tooltipTop = Math.min(Math.max(0, ay - 48), height - tooltipH);
  if (ax + 16 + tooltipW > width) {
    if (ax - 16 - tooltipW >= 0) tooltipLeft = ax - 16 - tooltipW;
    else {
      tooltipLeft = Math.min(Math.max(0, ax - tooltipW / 2), width - tooltipW);
      tooltipTop = ay > tooltipH + 16 ? ay - tooltipH - 14 : ay + 16;
    }
  }

  const xTickCount = Math.max(2, Math.min(n, Math.floor(geometry.plotW / (days > 120 ? 64 : 76)) + 1));
  const xTicks =
    n === 0
      ? []
      : n === 1
        ? [0]
        : Array.from(new Set(Array.from({ length: xTickCount }, (_, k) => Math.round((k * (n - 1)) / (xTickCount - 1)))));

  const peak = view.points.reduce<{ t: number; v: number } | null>((best, p) => (!best || p.v > best.v ? p : best), null);
  const changeText =
    view.change === null ? "" : `${view.change >= 0 ? "up" : "down"} ${pct.format(Math.abs(view.change))}% vs the previous ${range?.name}`;
  const summary =
    n === 0
      ? `${title}: no data for ${range?.name}.`
      : `${title}, last ${range?.name}: total ${formatValue(view.total)}${changeText ? `, ${changeText}` : ""}. ${formatDate(view.points[0].t, "tooltip", days)} to ${formatDate(view.points[n - 1].t, "tooltip", days)}${peak ? `. Peak ${formatValue(peak.v)} on ${formatDate(peak.t, "tooltip", days)}` : ""}.`;

  const color = primary?.color ?? "var(--accent)";
  const up = (view.change ?? 0) >= 0;

  return (
    <section
      ref={ref}
      aria-labelledby={`${uid}-title`}
      aria-busy={loading || undefined}
      className={cn("@container w-full min-w-0 rounded-3xl border border-border bg-surface p-4 shadow-[0_24px_60px_-34px_rgb(15_23_42/0.4)] @md:p-6", className)}
    >
      <style>{STYLES}</style>
      <div className="mb-5 flex flex-col gap-4 @xl:flex-row @xl:items-start @xl:justify-between">
        <div className="min-w-0">
          <H id={`${uid}-title`} className="text-sm font-medium text-muted">
            {title}
          </H>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-3xl font-semibold tracking-tight text-foreground @md:text-4xl">
              {loading ? <span className="inline-block h-9 w-32 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" /> : <CountUp value={view.total} format={formatValue} />}
            </p>
            {!loading && view.change !== null ? (
              <p
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                  up ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
                )}
              >
                <svg viewBox="0 0 12 12" className={cn("size-3", !up && "rotate-180")} fill="currentColor" aria-hidden>
                  <path d="M6 2l4 5H7v3H5V7H2z" />
                </svg>
                <span className="sr-only">{up ? "Up" : "Down"}</span>
                {pct.format(Math.abs(view.change))}%
                <span className="font-normal opacity-90">vs previous {range?.name}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div role="group" aria-label="Time range" className="relative grid w-full shrink-0 rounded-xl bg-surface-2 p-1 @xl:w-auto" style={{ gridTemplateColumns: `repeat(${ranges.length}, minmax(0, 1fr))` }}>
          <span
            aria-hidden
            className="absolute bottom-1 left-1 top-1 rounded-lg bg-surface shadow-sm ring-1 ring-border transition-transform duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)] motion-reduce:transition-none"
            style={{
              width: `calc((100% - 0.5rem) / ${ranges.length})`,
              transform: `translateX(${Math.max(0, ranges.findIndex((r) => r.id === rangeId)) * 100}%)`,
            }}
          />
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={r.id === rangeId}
              disabled={loading}
              onClick={() => pickRange(r.id)}
              className={cn(
                "relative min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 @xl:min-w-12",
                r.id === rangeId ? "text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              <span aria-hidden>{r.label}</span>
              <span className="sr-only">{r.name}</span>
            </button>
          ))}
        </div>
      </div>

      {series.length > 1 ? (
        <ul aria-label="Legend" className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {series.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 20 4" className="h-1 w-5" aria-hidden>
                <line x1="0" y1="2" x2="20" y2="2" style={{ stroke: s.color }} strokeWidth="3" strokeDasharray={s.dashed ? "4 3" : undefined} strokeLinecap="round" />
              </svg>
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        ref={boxRef}
        role="img"
        aria-label={loading ? `${title}: loading` : summary}
        aria-describedby={`${uid}-help`}
        tabIndex={loading ? -1 : 0}
        onKeyDown={onKeyDown}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
        onBlur={() => setActive(null)}
        className="relative touch-pan-y rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
        style={{ height }}
      >
        {loading ? (
          <div className="absolute inset-0 overflow-hidden rounded-2xl bg-surface-2">
            <div className="revenue-area-chart-shimmer absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent dark:via-white/5" />
          </div>
        ) : (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block h-full w-full overflow-visible">
            <defs>
              <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopOpacity="0.38" style={{ stopColor: color }} />
                <stop offset="70%" stopOpacity="0.06" style={{ stopColor: color }} />
                <stop offset="100%" stopOpacity="0" style={{ stopColor: color }} />
              </linearGradient>
              <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>

            {/* Grid and y axis. Shared tick values glide to their new place. */}
            {ticks.map((t, i) => (
              <g
                key={t}
                className="revenue-area-chart-fade transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
                style={{ transform: `translateY(${yOf(t).toFixed(1)}px)` }}
              >
                <line x1={geometry.left} x2={geometry.left + geometry.plotW} y1={0} y2={0} style={{ stroke: "var(--border)" }} strokeDasharray={i === 0 ? undefined : "3 4"} />
                <text x={geometry.left - 10} y={0} dy="0.32em" textAnchor="end" fontSize="11" style={{ fill: "var(--muted)" }} className="tabular-nums">
                  {tickLabels[i]}
                </text>
              </g>
            ))}

            {/* X axis */}
            {xTicks.map((i, k) => {
              const p = view.points[i];
              const anchor = xTicks.length === 1 ? "middle" : k === 0 ? "start" : k === xTicks.length - 1 ? "end" : "middle";
              return (
                <text
                  key={`${rangeId}-${p.t}`}
                  x={xOf(p.t)}
                  y={height - 8}
                  textAnchor={anchor}
                  fontSize="11"
                  style={{ fill: "var(--muted)" }}
                  className="revenue-area-chart-fade"
                >
                  {formatDate(p.t, "axis", days)}
                </text>
              );
            })}

            {n === 0 ? (
              <text x={geometry.left + geometry.plotW / 2} y={geometry.top + geometry.plotH / 2} textAnchor="middle" fontSize="13" style={{ fill: "var(--muted)" }}>
                No data for this range
              </text>
            ) : (
              <>
                <path
                  ref={areaRef}
                  d={areaPath(target.samples[0] ?? [], yMax, geometry)}
                  fill={`url(#${uid}-fill)`}
                  className={cn(
                    "transition-[opacity,transform] delay-300 duration-1000 ease-out motion-reduce:transition-none",
                    revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                  )}
                />
                {series.map((s, i) =>
                  i === 0 ? null : (
                    <path
                      key={s.id}
                      ref={(el) => {
                        lineRefs.current[i] = el;
                      }}
                      d={linePath(target.samples[i] ?? [], yMax, geometry)}
                      fill="none"
                      style={{ stroke: s.color }}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={s.dashed ? "5 5" : undefined}
                      className={cn("transition-opacity delay-500 duration-700 motion-reduce:transition-none", revealed ? "opacity-80" : "opacity-0")}
                    />
                  ),
                )}
                <path
                  ref={(el) => {
                    lineRefs.current[0] = el;
                  }}
                  d={linePath(target.samples[0] ?? [], yMax, geometry)}
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray="1 1"
                  className="transition-[stroke-dashoffset] duration-[1400ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
                  style={{
                    stroke: color,
                    strokeDashoffset: revealed ? 0 : 1,
                    filter: `drop-shadow(0 6px 10px color-mix(in srgb, ${color} 40%, transparent))`,
                  }}
                />
              </>
            )}

            {activeInfo ? (
              <g aria-hidden>
                <line x1={ax} x2={ax} y1={geometry.top} y2={geometry.top + geometry.plotH} style={{ stroke: "var(--muted)" }} strokeOpacity="0.5" strokeDasharray="3 3" />
                {view.lookups.slice(1).map((lookup, k) => {
                  const v = lookup.get(activeInfo.p.t);
                  return v === undefined ? null : <circle key={series[k + 1].id} cx={ax} cy={yOf(v)} r="3.5" strokeWidth="2" style={{ fill: "var(--surface)", stroke: series[k + 1].color }} />;
                })}
                <circle cx={ax} cy={ay} r="10" style={{ fill: color }} opacity="0.45" filter={`url(#${uid}-glow)`} />
                <circle cx={ax} cy={ay} r="6" style={{ fill: color }} opacity="0.35" className="revenue-area-chart-pulse" />
                <circle cx={ax} cy={ay} r="5" strokeWidth="2.5" style={{ fill: color, stroke: "var(--surface)" }} />
              </g>
            ) : null}
          </svg>
        )}

        {activeInfo ? (
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 rounded-2xl border border-border bg-surface/95 p-3 text-left shadow-[0_16px_40px_-16px_rgb(15_23_42/0.45)] backdrop-blur transition-transform duration-150 ease-out motion-reduce:transition-none"
            style={{ width: tooltipW, transform: `translate(${tooltipLeft.toFixed(1)}px, ${tooltipTop.toFixed(1)}px)` }}
          >
            <p className="text-xs text-muted">{formatDate(activeInfo.p.t, "tooltip", days)}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-base font-semibold tabular-nums text-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
              {formatValue(activeInfo.p.v)}
            </p>
            {activeInfo.delta !== null ? (
              <p className={cn("mt-0.5 text-xs font-medium tabular-nums", activeInfo.delta >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>
                {activeInfo.delta >= 0 ? "▲" : "▼"} {pct.format(Math.abs(activeInfo.delta))}% vs previous
              </p>
            ) : null}
            {view.lookups.slice(1).map((lookup, k) => {
              const v = lookup.get(activeInfo.p.t);
              return v === undefined ? null : (
                <p key={series[k + 1].id} className="mt-1.5 flex items-center justify-between gap-2 border-t border-border pt-1.5 text-xs text-muted">
                  <span>{series[k + 1].label}</span>
                  <span className="font-medium tabular-nums text-foreground">{formatValue(v)}</span>
                </p>
              );
            })}
          </div>
        ) : null}
      </div>

      <p id={`${uid}-help`} className="sr-only">
        Use the left and right arrow keys to read each point. Home and End jump to the first and last point.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <table className="sr-only">
        <caption>
          {title}, last {range?.name}
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            {series.map((s) => (
              <th key={s.id} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.points.map((p) => (
            <tr key={p.t}>
              <th scope="row">{formatDate(p.t, "tooltip", days)}</th>
              {view.lookups.map((lookup, k) => {
                const v = lookup.get(p.t);
                return <td key={series[k].id}>{v === undefined ? "–" : formatValue(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
