"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export interface ActivityRing {
  id: string;
  label: string;
  value: number;
  goal: number;
  /** Unit shown after the numbers, e.g. "kcal". */
  unit: string;
  /** Gradient colours from the start of the ring to the end of a full lap. */
  colors: [from: string, to: string];
  /** Small icon for the legend chip. Rendered on top of the gradient. */
  icon?: ReactNode;
}

export interface ActivityDay {
  /** Short label under the mini rings, e.g. "Mon". */
  label: string;
  /** Longer name used in accessible labels, e.g. "Monday". Defaults to label. */
  fullLabel?: string;
  /** Value for each ring on that day, keyed by ring id. Missing ids fall back to the ring's value. */
  values: Record<string, number>;
}

export interface ActivityRingsProps {
  rings: ActivityRing[];
  /** Diameter of the main rings in px. Shrinks to fit narrow containers. */
  size?: number;
  /** Stroke width of each ring in px. */
  thickness?: number;
  /** Space between rings in px. */
  gap?: number;
  /** Optional week of data. Shows a row of mini ring sets that pick the day. */
  days?: ActivityDay[];
  /** Selected day index (controlled). */
  selectedDay?: number;
  /** Starting day when uncontrolled. Defaults to the last day. */
  defaultSelectedDay?: number;
  onSelectDay?: (index: number) => void;
  title?: string;
  showLegend?: boolean;
  /** Draw the rings in when they scroll into view, and tween between days. */
  animate?: boolean;
  className?: string;
}

const SEGMENTS = 90;
const STEP = 360 / SEGMENTS;
const MAX_LAPS = 2;

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerMotion = () => false;

const round = (n: number) => Math.round(n * 1000) / 1000;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const progressOf = (value: number, goal: number) => (goal > 0 ? Math.max(0, value / goal) : 0);
const percentOf = (value: number, goal: number) => Math.round(progressOf(value, goal) * 100);

/** Colour at fraction t of a lap. The browser does the mixing, so any CSS colour works. */
const mix = (from: string, to: string, t: number) =>
  `color-mix(in oklab, ${to} ${round(Math.min(1, Math.max(0, t)) * 100)}%, ${from})`;

/** Point on the circle, with 0° at 12 o'clock going clockwise. */
function polar(c: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return [round(c + r * Math.sin(a)), round(c - r * Math.cos(a))] as const;
}

function arcPath(c: number, r: number, from: number, to: number) {
  const [x0, y0] = polar(c, r, from);
  const [x1, y1] = polar(c, r, Math.min(to, 359.99));
  return `M${x0} ${y0}A${round(r)} ${round(r)} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

interface RingModel {
  c: number;
  r: number;
  circumference: number;
  from: string;
  to: string;
}

interface RingNodes {
  segs: Array<SVGPathElement | null>;
  head: SVGPathElement | null;
  start: SVGCircleElement | null;
  tip: SVGGElement | null;
  shadowUnder: SVGGElement | null;
  shadowOver: SVGGElement | null;
  lap2: SVGCircleElement | null;
  /** Number of full segments currently visible, to skip needless DOM writes. */
  shown: number;
}

const emptyNodes = (): RingNodes => ({
  segs: [],
  head: null,
  start: null,
  tip: null,
  shadowUnder: null,
  shadowOver: null,
  lap2: null,
  shown: 0,
});

/**
 * Paints one ring at progress p (1 = one lap) straight onto the DOM. The
 * gradient lap is made of short solid segments (an SVG stand-in for a conic
 * gradient), a partial "head" segment and round end caps. Laps past 100%
 * draw a darker stroke on top, with a soft shadow ahead of the tip.
 */
function paint(nodes: RingNodes, m: RingModel, p: number) {
  const total = Math.min(Math.max(p, 0), MAX_LAPS) * 360;
  const lap1 = Math.min(total, 360);
  const full = Math.min(SEGMENTS, Math.floor(lap1 / STEP + 1e-6));
  const show = (node: Element | null, visible: boolean) =>
    node?.setAttribute("visibility", visible ? "visible" : "hidden");
  const rotate = (deg: number) => `rotate(${round(deg)} ${m.c} ${m.c})`;

  if (full !== nodes.shown) {
    nodes.segs.forEach((seg, k) => show(seg, k < full));
    nodes.shown = full;
  }
  const rest = lap1 - full * STEP;
  if (nodes.head) {
    const visible = full < SEGMENTS && rest > 0.05;
    if (visible) {
      nodes.head.setAttribute("d", arcPath(m.c, m.r, full * STEP, lap1));
      nodes.head.style.stroke = mix(m.from, m.to, (full + 0.5) / SEGMENTS);
    }
    show(nodes.head, visible);
  }
  show(nodes.start, p > 0);
  if (nodes.tip) {
    nodes.tip.setAttribute("transform", rotate(lap1));
    nodes.tip.style.fill = mix(m.from, m.to, lap1 / 360);
  }
  show(nodes.tip, p > 0 && p <= 1);
  nodes.shadowUnder?.setAttribute("transform", rotate(total));
  show(nodes.shadowUnder, p > 0 && p <= 1);
  nodes.shadowOver?.setAttribute("transform", rotate(total));
  show(nodes.shadowOver, p > 1);
  nodes.lap2?.setAttribute(
    "stroke-dasharray",
    `${round((m.circumference * Math.max(0, total - 360)) / 360)} ${round(m.circumference)}`,
  );
  show(nodes.lap2, p > 1);
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Apple Watch style concentric progress rings. Each ring has a gradient
 * stroke, rounded caps and a shadowed tip; values over 100% wrap into a
 * darker second lap. Rings draw in when scrolled into view, highlight on
 * hover or legend focus, and an optional week row picks the day shown.
 */
export function ActivityRings({
  rings,
  size = 260,
  thickness = 20,
  gap = 6,
  days,
  selectedDay,
  defaultSelectedDay,
  onSelectDay,
  title = "Activity",
  showLegend = true,
  animate = true,
  className,
}: ActivityRingsProps) {
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, getServerMotion);
  const [innerDay, setInnerDay] = useState(defaultSelectedDay ?? (days ? days.length - 1 : 0));
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(!animate);

  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const titleId = `${uid}-title`;
  const blurId = `${uid}-blur`;

  const rootRef = useRef<HTMLElement>(null);
  const nodes = useRef<RingNodes[]>([]);
  const models = useRef<RingModel[]>([]);
  const current = useRef<number[]>([]);

  const dayIndex = days?.length ? Math.min(Math.max(selectedDay ?? innerDay, 0), days.length - 1) : -1;
  const day = dayIndex >= 0 ? days?.[dayIndex] : undefined;
  const dayName = day ? (day.fullLabel ?? day.label) : "";

  const c = size / 2;
  const data = rings.map((ring, i) => {
    const value = day?.values[ring.id] ?? ring.value;
    const r = Math.max(thickness / 2, c - thickness / 2 - i * (thickness + gap));
    return {
      ...ring,
      value,
      progress: progressOf(value, ring.goal),
      percent: percentOf(value, ring.goal),
      model: { c, r, circumference: 2 * Math.PI * r, from: ring.colors[0], to: ring.colors[1] },
    };
  });

  const active = hovered ?? pinned;
  const activeRing = data.find((d) => d.id === active);
  const closed = data.filter((d) => d.progress >= 1).length;
  const innerHole = Math.max(0, 2 * ((data[data.length - 1]?.model.r ?? c) - thickness / 2));
  const targetKey = data.map((d) => round(d.progress)).join("|");
  const geoKey = `${size}|${thickness}|${gap}|${rings.map((r) => r.colors.join(",")).join("|")}`;

  const describe = (d: (typeof data)[number]) => `${d.label} ${fmt(d.value)} of ${fmt(d.goal)} ${d.unit} (${d.percent}%)`;
  const summary = `${title}${dayName ? `, ${dayName}` : ""}: ${data.map(describe).join(", ")}.`;

  // Latest geometry for the imperative painter.
  useLayoutEffect(() => {
    models.current = data.map((d) => d.model);
  });

  // Reveal on scroll into view. Without IntersectionObserver, reveal on the next frame.
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
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [revealed]);

  // Tween every ring from where it is now to its target. Runs before paint, so
  // there is never a frame showing the wrong value.
  useLayoutEffect(() => {
    const targets = revealed ? targetKey.split("|").map(Number) : targetKey.split("|").map(() => 0);
    const from = targets.map((_, i) => current.current[i] ?? 0);
    const draw = (values: number[]) => {
      values.forEach((p, i) => {
        const node = nodes.current[i];
        const model = models.current[i];
        if (node && model) paint(node, model, p);
      });
      current.current = values;
    };

    if (reduced || !animate || !revealed) {
      draw(targets);
      return;
    }

    const firstDraw = from.every((p) => p === 0);
    const duration = firstDraw ? 1400 : 750;
    const stagger = firstDraw ? 140 : 60;
    let frame = 0;
    // The clock starts on the first animation frame.
    let start = -1;
    draw(from);
    const tick = (now: number) => {
      if (start < 0) start = now;
      let done = true;
      const values = targets.map((target, i) => {
        const t = Math.min(1, Math.max(0, (now - start - i * stagger) / duration));
        if (t < 1) done = false;
        return from[i] + (target - from[i]) * easeOut(t);
      });
      draw(values);
      if (!done) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [revealed, targetKey, geoKey, reduced, animate]);

  const selectDay = (index: number) => {
    if (selectedDay === undefined) setInnerDay(index);
    onSelectDay?.(index);
  };

  const slot = (i: number) => (nodes.current[i] ??= emptyNodes());

  return (
    <section
      ref={rootRef}
      aria-labelledby={title ? titleId : undefined}
      className={cn("@container w-full", className)}
    >
      {title ? (
        <h2 id={titleId} className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          {title}
          {dayName ? <span className="font-normal text-muted"> · {dayName}</span> : null}
        </h2>
      ) : null}

      <div className="flex flex-col items-center gap-6 @xl:flex-row @xl:items-center @xl:justify-center @xl:gap-10">
        <div className="relative isolate aspect-square w-full shrink-0" style={{ maxWidth: size }}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[6%] -z-10 rounded-full opacity-30 blur-2xl dark:opacity-45"
            style={{
              background: `conic-gradient(${data.map((d) => d.colors[0]).join(", ")}, ${data[0]?.colors[0] ?? "transparent"})`,
              // Keep the centre clear so the readout sits on a plain background.
              maskImage: "radial-gradient(circle, transparent 40%, #000 65%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 40%, #000 65%)",
            }}
          />
          <svg
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label={summary}
            className="block size-full overflow-visible"
            onPointerLeave={() => setHovered(null)}
          >
            <defs>
              <filter id={blurId} x="-1" y="-1" width="3" height="3">
                <feGaussianBlur stdDeviation={round(thickness * 0.14)} />
              </filter>
            </defs>
            {data.map((d, i) => {
              const { r, circumference } = d.model;
              const top = c - r;
              const dimmed = active !== null && active !== d.id;
              return (
                <g
                  key={d.id}
                  className="transition-opacity duration-300 motion-reduce:transition-none"
                  style={{ opacity: dimmed ? 0.2 : 1 }}
                  onPointerEnter={() => setHovered(d.id)}
                >
                  {/* Track */}
                  <circle
                    cx={c}
                    cy={c}
                    r={round(r)}
                    fill="none"
                    strokeWidth={thickness}
                    style={{ stroke: `color-mix(in oklab, ${d.colors[0]} 20%, transparent)` }}
                  />
                  {/* Shadow cast on the track ahead of the tip */}
                  <g
                    ref={(node) => {
                      slot(i).shadowUnder = node;
                    }}
                    visibility="hidden"
                  >
                    <circle cx={round(c + thickness * 0.3)} cy={round(top)} r={round(thickness * 0.48)} fill="#000" opacity="0.28" filter={`url(#${blurId})`} />
                  </g>
                  {/* First lap: gradient segments */}
                  {Array.from({ length: SEGMENTS }, (_, k) => (
                    <path
                      key={k}
                      ref={(node) => {
                        slot(i).segs[k] = node;
                      }}
                      d={arcPath(c, r, k * STEP, Math.min((k + 1) * STEP + 0.6, 360))}
                      fill="none"
                      strokeWidth={thickness}
                      visibility="hidden"
                      style={{ stroke: mix(d.colors[0], d.colors[1], (k + 0.5) / SEGMENTS) }}
                    />
                  ))}
                  <path
                    ref={(node) => {
                      slot(i).head = node;
                    }}
                    d={arcPath(c, r, 0, 1)}
                    fill="none"
                    strokeWidth={thickness}
                    visibility="hidden"
                  />
                  {/* Round start cap */}
                  <circle
                    ref={(node) => {
                      slot(i).start = node;
                    }}
                    cx={c}
                    cy={round(top)}
                    r={thickness / 2}
                    visibility="hidden"
                    style={{ fill: d.colors[0] }}
                  />
                  {/* Round end cap that follows the tip */}
                  <g
                    ref={(node) => {
                      slot(i).tip = node;
                    }}
                    visibility="hidden"
                  >
                    <circle cx={c} cy={round(top)} r={thickness / 2} />
                    <circle cx={round(c - thickness * 0.12)} cy={round(top - thickness * 0.14)} r={round(thickness * 0.16)} fill="#fff" opacity="0.28" />
                  </g>
                  {/* Second lap: darker overlap with its own shadow */}
                  <g
                    ref={(node) => {
                      slot(i).shadowOver = node;
                    }}
                    visibility="hidden"
                  >
                    <circle cx={round(c + thickness * 0.3)} cy={round(top)} r={round(thickness * 0.5)} fill="#000" opacity="0.55" filter={`url(#${blurId})`} />
                  </g>
                  <circle
                    ref={(node) => {
                      slot(i).lap2 = node;
                    }}
                    cx={c}
                    cy={c}
                    r={round(r)}
                    fill="none"
                    strokeWidth={thickness}
                    strokeLinecap="round"
                    strokeDasharray={`0 ${round(circumference)}`}
                    transform={`rotate(-90 ${c} ${c})`}
                    visibility="hidden"
                    style={{ stroke: `color-mix(in oklab, ${d.colors[0]} 60%, ${d.colors[1]})` }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Centre readout */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center"
            style={{ width: `${(innerHole / size) * 100}%` }}
          >
            {activeRing ? (
              <>
                <span className="max-w-full truncate text-xs font-medium text-muted">{activeRing.label}</span>
                <span className="text-2xl font-semibold leading-tight tabular-nums text-foreground">{activeRing.percent}%</span>
                <span className="max-w-full truncate text-xs tabular-nums text-muted">
                  {fmt(activeRing.value)}/{fmt(activeRing.goal)} {activeRing.unit}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-semibold leading-tight tabular-nums text-foreground">
                  {closed}/{data.length}
                </span>
                <span className="text-xs text-muted">closed</span>
              </>
            )}
          </div>
        </div>

        {showLegend ? (
          <ul className="flex w-full flex-col gap-2 @xl:max-w-xs">
            {data.map((d) => {
              const isActive = active === d.id;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    aria-pressed={pinned === d.id}
                    onPointerEnter={() => setHovered(d.id)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered(d.id)}
                    onBlur={() => setHovered(null)}
                    onClick={() => setPinned((p) => (p === d.id ? null : d.id))}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-[background-color,border-color,opacity,transform] duration-200 motion-reduce:transition-none",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98]",
                      isActive ? "border-border bg-surface-2" : "border-transparent hover:bg-surface-2",
                      active !== null && !isActive && "opacity-60",
                    )}
                  >
                    <span
                      aria-hidden
                      className="grid size-10 shrink-0 place-items-center rounded-full text-white shadow-sm [&_svg]:size-5"
                      style={{ background: `linear-gradient(135deg, ${d.colors[0]}, ${d.colors[1]})` }}
                    >
                      {d.icon ?? <span className="size-2.5 rounded-full bg-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{d.label}</span>
                      <span className="block text-sm tabular-nums text-muted">
                        {fmt(d.value)}
                        <span aria-hidden> / </span>
                        <span className="sr-only"> of </span>
                        {fmt(d.goal)} {d.unit}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">{d.percent}%</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {days?.length ? (
        <div role="group" aria-label="Choose a day" className="mt-6 grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((dd, index) => {
            const selected = index === dayIndex;
            const mini = 32;
            const miniT = Math.max(2, Math.min(4, 12 / Math.max(1, rings.length)));
            const label = `${dd.fullLabel ?? dd.label}: ${rings
              .map((ring) => `${ring.label} ${percentOf(dd.values[ring.id] ?? ring.value, ring.goal)}%`)
              .join(", ")}`;
            return (
              <button
                key={`${dd.label}-${index}`}
                type="button"
                aria-pressed={selected}
                aria-label={label}
                onClick={() => selectDay(index)}
                className={cn(
                  "flex min-h-14 min-w-0 flex-col items-center gap-1 rounded-xl py-2 transition-colors motion-reduce:transition-none",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95",
                  selected ? "bg-surface-2 ring-1 ring-border" : "hover:bg-surface-2/70",
                )}
              >
                <svg viewBox={`0 0 ${mini} ${mini}`} aria-hidden className="size-8">
                  {rings.map((ring, i) => {
                    const r = mini / 2 - miniT / 2 - i * (miniT + 1.2);
                    if (r <= 0) return null;
                    const circ = 2 * Math.PI * r;
                    const p = Math.min(1, progressOf(dd.values[ring.id] ?? ring.value, ring.goal));
                    return (
                      <g key={ring.id}>
                        <circle cx={mini / 2} cy={mini / 2} r={round(r)} fill="none" strokeWidth={miniT} style={{ stroke: `color-mix(in oklab, ${ring.colors[0]} 22%, transparent)` }} />
                        {p > 0 ? (
                          <circle
                            cx={mini / 2}
                            cy={mini / 2}
                            r={round(r)}
                            fill="none"
                            strokeWidth={miniT}
                            strokeLinecap="round"
                            strokeDasharray={`${round(circ * p)} ${round(circ)}`}
                            transform={`rotate(-90 ${mini / 2} ${mini / 2})`}
                            style={{ stroke: mix(ring.colors[0], ring.colors[1], 0.5) }}
                          />
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
                <span className={cn("text-xs", selected ? "font-semibold text-foreground" : "text-muted")}>{dd.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {dayName ? `${dayName}: ` : ""}
        {closed} of {data.length} rings closed.
      </p>

      <table className="sr-only">
        <caption>
          {title}
          {dayName ? `, ${dayName}` : ""}
        </caption>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">Value</th>
            <th scope="col">Goal</th>
            <th scope="col">Progress</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.id}>
              <th scope="row">{d.label}</th>
              <td>
                {fmt(d.value)} {d.unit}
              </td>
              <td>
                {fmt(d.goal)} {d.unit}
              </td>
              <td>{d.percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
