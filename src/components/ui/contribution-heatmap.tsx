"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export interface ContributionDay {
  /** Calendar day as "YYYY-MM-DD". */
  date: string;
  count: number;
}

export interface HeatmapRange {
  id: string;
  label: string;
  /** First day, "YYYY-MM-DD". */
  startDate: string;
  /** Last day, "YYYY-MM-DD". */
  endDate: string;
}

export interface SelectedDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  /** Human label, e.g. "12 contributions on Tuesday, March 4, 2026". */
  label: string;
}

export type HeatmapPreset = "accent" | "emerald" | "ember" | "ocean";
/** Five colours from "no activity" to "most activity". */
export type HeatmapColorScale = readonly [string, string, string, string, string];

export interface ContributionHeatmapProps {
  /** Daily counts. Missing days count as 0; duplicate dates are summed. */
  data: ContributionDay[];
  /** First day shown. Defaults to `weeks` (or 52 weeks) before `endDate`. */
  startDate?: string;
  /** Last day shown. Defaults to the latest date in `data`. */
  endDate?: string;
  /** Number of weeks to show when `startDate` is not set. */
  weeks?: number;
  /** Optional range switcher. The active range overrides startDate / endDate. */
  ranges?: HeatmapRange[];
  /** Controlled active range id. */
  rangeId?: string;
  /** Starting range id when uncontrolled. */
  defaultRangeId?: string;
  onRangeChange?: (range: HeatmapRange) => void;
  /** Built-in colour scale, tuned for light and dark. */
  preset?: HeatmapPreset;
  /** Custom colours (level 0 to 4). Overrides `preset`. */
  colorScale?: HeatmapColorScale;
  /** Cell size in px. */
  cellSize?: number;
  /** Gap between cells in px. */
  gap?: number;
  /** First row of each week. */
  weekStart?: "sun" | "mon";
  /** Show total, streaks and best day above the chart. */
  showStats?: boolean;
  /** Show the "Less … More" legend. */
  showLegend?: boolean;
  /** Controlled selected day ("YYYY-MM-DD" or null). */
  selectedDate?: string | null;
  /** Starting selected day when uncontrolled. */
  defaultSelectedDate?: string | null;
  /** Called when a day is clicked or chosen with Enter / Space. */
  onSelectDay?: (day: SelectedDay) => void;
  title?: string;
  description?: string;
  /** Singular and plural unit, e.g. { one: "commit", other: "commits" }. */
  unit?: { one: string; other: string };
  /** Skeleton cells and stats, sets aria-busy. */
  loading?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/* ---------- UTC-free calendar maths on integer day numbers (days since 1970-01-01) ---------- */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function daysFromCivil(y: number, m: number, d: number) {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(day: number) {
  const z = day + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m, d };
}

/** "2026-03-04" → day number, or null when the string is not a valid date. */
export function dayNumberFromISO(iso: string | null | undefined): number | null {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return daysFromCivil(y, m, d);
}

/** Day number → "YYYY-MM-DD". */
export function isoFromDayNumber(day: number): string {
  const { y, m, d } = civilFromDays(day);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 0 = Sunday … 6 = Saturday. Day 0 (1970-01-01) was a Thursday. */
function weekdayOf(day: number) {
  return (((day % 7) + 7) % 7 + 4) % 7;
}

function formatLong(day: number) {
  const { y, m, d } = civilFromDays(day);
  return `${WEEKDAYS[weekdayOf(day)]}, ${MONTHS[m - 1]} ${d}, ${y}`;
}
function formatShort(day: number) {
  const { m, d } = civilFromDays(day);
  return `${WEEKDAYS[weekdayOf(day)].slice(0, 3)}, ${MONTHS[m - 1].slice(0, 3)} ${d}`;
}
function formatMedium(day: number) {
  const { y, m, d } = civilFromDays(day);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`;
}

const numberFormat = new Intl.NumberFormat("en-US");

/* ---------- Colour scales ---------- */

const CSS = `
.chm-root{--chm-0:#e8e8ec;--chm-0-ring:rgb(0 0 0/.05)}
.chm-root[data-preset=accent]{--chm-1:color-mix(in oklab,var(--accent) 25%,#fff);--chm-2:color-mix(in oklab,var(--accent) 50%,#fff);--chm-3:color-mix(in oklab,var(--accent) 78%,#fff);--chm-4:color-mix(in oklab,var(--accent) 80%,#000)}
.chm-root[data-preset=emerald]{--chm-1:#a7f3d0;--chm-2:#34d399;--chm-3:#059669;--chm-4:#065f46}
.chm-root[data-preset=ember]{--chm-1:#fed7aa;--chm-2:#fb923c;--chm-3:#ea580c;--chm-4:#9a3412}
.chm-root[data-preset=ocean]{--chm-1:#bae6fd;--chm-2:#38bdf8;--chm-3:#0284c7;--chm-4:#075985}
@media (prefers-color-scheme:dark){
.chm-root{--chm-0:#232329;--chm-0-ring:rgb(255 255 255/.05)}
.chm-root[data-preset=accent]{--chm-1:color-mix(in oklab,var(--accent) 28%,#18181c);--chm-2:color-mix(in oklab,var(--accent) 52%,#18181c);--chm-3:color-mix(in oklab,var(--accent) 78%,#18181c);--chm-4:color-mix(in oklab,var(--accent) 70%,#fff)}
.chm-root[data-preset=emerald]{--chm-1:#064e3b;--chm-2:#047857;--chm-3:#10b981;--chm-4:#6ee7b7}
.chm-root[data-preset=ember]{--chm-1:#5a1d0a;--chm-2:#9a3412;--chm-3:#f97316;--chm-4:#fdba74}
.chm-root[data-preset=ocean]{--chm-1:#0c3a5a;--chm-2:#0369a1;--chm-3:#0ea5e9;--chm-4:#7dd3fc}
}
.chm-fill{background:var(--chm-c);opacity:0;transition:background-color .45s ease}
.chm-fill[data-level="0"]{box-shadow:inset 0 0 0 1px var(--chm-0-ring)}
[data-revealed] .chm-fill{animation:contribution-heatmap-pop .55s cubic-bezier(.34,1.56,.64,1) var(--d,0ms) both}
@keyframes contribution-heatmap-pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:none}}
.chm-cell{transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease}
.chm-cell:hover,.chm-cell:focus-visible,.chm-cell[data-tip]{transform:scale(1.6);z-index:3;box-shadow:0 0 0 1.5px var(--surface),0 0 14px 3px color-mix(in oklab,var(--chm-c) 75%,transparent)}
.chm-cell[aria-selected=true]{outline:2px solid var(--foreground);outline-offset:1px;z-index:2}
.chm-cell:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.chm-busy .chm-fill{animation:contribution-heatmap-pulse 1.4s ease-in-out infinite;opacity:1}
@keyframes contribution-heatmap-pulse{50%{opacity:.45}}
@media (prefers-reduced-motion:reduce){
.chm-fill,[data-revealed] .chm-fill,.chm-busy .chm-fill{animation:none;opacity:1;transition:none}
.chm-cell{transition:none}
.chm-cell:hover,.chm-cell:focus-visible,.chm-cell[data-tip]{transform:none}
}
`;

const LEVELS = [0, 1, 2, 3, 4] as const;
const DEFAULT_UNIT = { one: "contribution", other: "contributions" };

interface Tip {
  day: number;
  x: number;
  y: number;
}

/**
 * GitHub-style calendar heatmap: weeks are columns, weekdays are rows. Cells
 * pop in along the diagonal, glow on hover or focus, and form an ARIA grid
 * with roving focus. All date maths uses integer day numbers, so server and
 * client always agree.
 */
export function ContributionHeatmap({
  data,
  startDate,
  endDate,
  weeks,
  ranges,
  rangeId,
  defaultRangeId,
  onRangeChange,
  preset = "accent",
  colorScale,
  cellSize = 12,
  gap = 3,
  weekStart = "sun",
  showStats = true,
  showLegend = true,
  selectedDate,
  defaultSelectedDate = null,
  onSelectDay,
  title = "Contributions",
  description,
  unit = DEFAULT_UNIT,
  loading = false,
  className,
  ref,
}: ContributionHeatmapProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const summaryId = `${baseId}-summary`;
  const regionRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [innerRange, setInnerRange] = useState(defaultRangeId ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((r) => r.id === (rangeId ?? innerRange)) ?? ranges?.[0];
  const [innerSelected, setInnerSelected] = useState<string | null>(defaultSelectedDate);
  const selectedDay = dayNumberFromISO(selectedDate !== undefined ? selectedDate : innerSelected);
  const [focusDay, setFocusDay] = useState<number | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const counts = useMemo(() => {
    const map = new Map<number, number>();
    let latest: number | null = null;
    for (const entry of data) {
      const day = dayNumberFromISO(entry.date);
      if (day === null || !Number.isFinite(entry.count)) continue;
      map.set(day, (map.get(day) ?? 0) + Math.max(0, entry.count));
      if (latest === null || day > latest) latest = day;
    }
    return { map, latest };
  }, [data]);

  const endDay = dayNumberFromISO(activeRange?.endDate ?? endDate) ?? counts.latest;
  const startDay =
    dayNumberFromISO(activeRange?.startDate ?? startDate) ??
    (endDay === null ? null : endDay - (weeks ? weeks * 7 : 364) + 1);

  const model = useMemo(() => {
    if (endDay === null || startDay === null || startDay > endDay) return null;
    const ws = weekStart === "mon" ? 1 : 0;
    const firstColumnDay = startDay - ((weekdayOf(startDay) - ws + 7) % 7);
    const columns = Math.floor((endDay - firstColumnDay) / 7) + 1;
    const count = (day: number) => counts.map.get(day) ?? 0;

    // Stats.
    let total = 0;
    let longest = 0;
    let run = 0;
    let bestDay = -1;
    let bestCount = 0;
    const nonZero: number[] = [];
    for (let day = startDay; day <= endDay; day++) {
      const c = count(day);
      total += c;
      if (c > 0) {
        run += 1;
        longest = Math.max(longest, run);
        nonZero.push(c);
      } else run = 0;
      if (c > bestCount) {
        bestCount = c;
        bestDay = day;
      }
    }
    // Current streak ends on the last day, or the day before if the last day is still empty.
    let cursor = count(endDay) > 0 ? endDay : endDay - 1;
    let current = 0;
    while (cursor >= startDay && count(cursor) > 0) {
      current += 1;
      cursor -= 1;
    }

    // Quartiles of the non-zero days decide levels 1–4.
    nonZero.sort((a, b) => a - b);
    const q = (p: number) => nonZero[Math.floor(p * (nonZero.length - 1))] ?? 0;
    const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
    const levelOf = (c: number): SelectedDay["level"] =>
      c <= 0 ? 0 : c <= q1 ? 1 : c <= q2 ? 2 : c <= q3 ? 3 : 4;

    // Month labels sit over the first column that contains the 1st of a month (or the first column).
    const months: { column: number; label: string }[] = [];
    for (let col = 0; col < columns; col++) {
      for (let row = 0; row < 7; row++) {
        const day = firstColumnDay + col * 7 + row;
        if (day < startDay || day > endDay) continue;
        const { d, m } = civilFromDays(day);
        if (d === 1 || day === startDay) {
          months.push({ column: col, label: MONTHS[m - 1].slice(0, 3) });
          break;
        }
      }
    }
    if (months.length > 1 && months[1].column - months[0].column < 3) months.shift();

    const rows = Array.from({ length: 7 }, (_, row) => (row + ws) % 7);
    const stagger = Math.min(14, 900 / (columns + 7));
    return { firstColumnDay, columns, total, longest, current, bestDay, bestCount, levelOf, count, months, rows, stagger };
  }, [counts, startDay, endDay, weekStart]);

  const plural = (n: number) => `${numberFormat.format(n)} ${n === 1 ? unit.one : unit.other}`;
  const describe = (day: number, c: number) =>
    `${c === 0 ? `No ${unit.other}` : plural(c)} on ${formatLong(day)}`;

  // Reveal the cells once the chart scrolls into view (a data attribute, so no re-render).
  const hasGrid = model !== null;
  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          region.dataset.revealed = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(region);
    return () => observer.disconnect();
  }, [hasGrid]);

  // Start scrolled to the most recent weeks.
  const rangeKey = `${startDay}-${endDay}-${weekStart}`;
  useLayoutEffect(() => {
    const region = regionRef.current;
    if (region) region.scrollLeft = region.scrollWidth;
  }, [rangeKey, cellSize, gap]);

  if (!model || startDay === null || endDay === null) {
    return (
      <div
        ref={ref}
        className={cn("rounded-3xl border border-border bg-surface p-6 text-sm text-muted", className)}
      >
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p role="status" className="mt-2">No activity to show yet.</p>
      </div>
    );
  }

  const clampDay = (day: number) => Math.max(startDay, Math.min(endDay, day));
  const tabbable = clampDay(focusDay ?? (selectedDay !== null && selectedDay >= startDay && selectedDay <= endDay ? selectedDay : endDay));

  const select = (day: number) => {
    const iso = isoFromDayNumber(day);
    const c = model.count(day);
    if (selectedDate === undefined) setInnerSelected(iso);
    onSelectDay?.({ date: iso, count: c, level: model.levelOf(c), label: describe(day, c) });
  };

  const showTipFor = (cell: HTMLElement) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const a = cell.getBoundingClientRect();
    const b = wrap.getBoundingClientRect();
    const x = Math.max(92, Math.min(b.width - 92, a.left + a.width / 2 - b.left));
    setTip({ day: Number(cell.dataset.day), x, y: a.top - b.top });
  };

  const cellFrom = (target: EventTarget | null) =>
    target instanceof HTMLElement ? target.closest<HTMLElement>("[data-day]") : null;

  const moveFocus = (day: number) => {
    const next = clampDay(day);
    setFocusDay(next);
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const cell = cellFrom(event.target);
    if (!cell) return;
    const day = Number(cell.dataset.day);
    let next: number;
    switch (event.key) {
      case "ArrowUp":
        next = day - 1;
        break;
      case "ArrowDown":
        next = day + 1;
        break;
      case "ArrowLeft":
        next = day - 7;
        break;
      case "ArrowRight":
        next = day + 7;
        break;
      case "PageUp":
        next = day - 28;
        break;
      case "PageDown":
        next = day + 28;
        break;
      case "Home":
        // Ctrl+Home: first day. Home: same weekday in the first week of the row.
        next = event.ctrlKey || event.metaKey ? startDay : day - 7 * Math.floor((day - startDay) / 7);
        break;
      case "End":
        next = event.ctrlKey || event.metaKey ? endDay : day + 7 * Math.floor((endDay - day) / 7);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        select(day);
        return;
      default:
        return;
    }
    event.preventDefault();
    moveFocus(next);
  };

  const onPointerOver = (event: PointerEvent<HTMLDivElement>) => {
    const cell = cellFrom(event.target);
    if (cell && Number(cell.dataset.day) !== tip?.day) showTipFor(cell);
  };
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const cell = cellFrom(event.target);
    if (!cell) return;
    setFocusDay(Number(cell.dataset.day));
    showTipFor(cell);
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!gridRef.current?.contains(event.relatedTarget as Node | null)) setTip(null);
  };
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const cell = cellFrom(event.target);
    if (cell) select(Number(cell.dataset.day));
  };

  const scaleVars = colorScale
    ? (Object.fromEntries(colorScale.map((c, i) => [`--chm-${i}`, c])) as CSSProperties)
    : undefined;
  const pitch = cellSize + gap;
  const labelWidth = 32;
  const rangeIndex = ranges ? Math.max(0, ranges.findIndex((r) => r.id === activeRange?.id)) : 0;
  const summary = `${plural(model.total)} from ${formatMedium(startDay)} to ${formatMedium(endDay)}. Longest streak ${model.longest} days, current streak ${model.current} days.${
    model.bestDay >= 0 ? ` Best day ${formatMedium(model.bestDay)} with ${plural(model.bestCount)}.` : ""
  }`;

  const stats = [
    { label: "Total", value: numberFormat.format(model.total), sub: unit.other },
    { label: "Longest streak", value: String(model.longest), sub: model.longest === 1 ? "day" : "days" },
    { label: "Current streak", value: String(model.current), sub: model.current === 1 ? "day" : "days" },
    {
      label: "Best day",
      value: model.bestDay >= 0 ? numberFormat.format(model.bestCount) : "None",
      sub: model.bestDay >= 0 ? formatShort(model.bestDay) : "yet",
    },
  ];

  return (
    <div
      ref={ref}
      data-preset={preset}
      aria-busy={loading || undefined}
      className={cn(
        "chm-root @container relative isolate w-full min-w-0 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-6",
        loading && "chm-busy",
        className,
      )}
      style={scaleVars}
    >
      <style href="contribution-heatmap" precedence="default">
        {CSS}
      </style>

      {/* Soft colour wash in the corner, tinted by the scale. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
        <div className="absolute -top-24 -right-16 size-72 rounded-full opacity-25 blur-3xl" style={{ background: "var(--chm-3)" }} />
        <div className="absolute -bottom-28 -left-20 size-64 rounded-full opacity-15 blur-3xl" style={{ background: "var(--chm-4)" }} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={titleId} className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {ranges && ranges.length > 1 && (
          <div
            role="group"
            aria-label="Date range"
            className="relative grid rounded-xl border border-border bg-surface-2 p-1"
            style={{ gridTemplateColumns: `repeat(${ranges.length}, minmax(0, 1fr))` }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 rounded-lg bg-surface shadow-sm ring-1 ring-border transition-transform duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
              style={{
                width: `calc((100% - 0.5rem) / ${ranges.length})`,
                transform: `translateX(${rangeIndex * 100}%)`,
              }}
            />
            {ranges.map((range) => (
              <button
                key={range.id}
                type="button"
                aria-pressed={range.id === activeRange?.id}
                onClick={() => {
                  if (rangeId === undefined) setInnerRange(range.id);
                  setFocusDay(null);
                  setTip(null);
                  onRangeChange?.(range);
                }}
                className="relative z-10 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap text-muted transition-[color,transform] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:scale-95 aria-pressed:text-foreground"
              >
                {range.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {showStats && (
        <dl className="mt-4 grid grid-cols-2 gap-2 @xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-surface-2 px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: "var(--chm-3)" }} />
                {stat.label}
              </dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                {loading ? (
                  <span className="h-6 w-14 animate-pulse rounded-md bg-border motion-reduce:animate-none" />
                ) : (
                  <>
                    <span className="text-xl font-semibold tracking-tight tabular-nums text-foreground">{stat.value}</span>
                    <span className="truncate text-xs text-muted">{stat.sub}</span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div ref={wrapRef} className="relative mt-5 flex">
        {/* Weekday labels sit outside the scroll area so they stay put without covering cells. */}
        <div aria-hidden="true" className="flex shrink-0 flex-col py-3 text-[11px] leading-none text-muted" style={{ width: labelWidth, gap }}>
          <span className="h-4" style={{ marginBottom: `calc(0.375rem - ${gap}px)` }} />
          {model.rows.map((weekday) => (
            <span key={weekday} className="flex items-center" style={{ height: cellSize }}>
              {weekday % 2 === 1 ? WEEKDAYS[weekday].slice(0, 3) : ""}
            </span>
          ))}
        </div>
        <div
          ref={regionRef}
          role="region"
          aria-label={`${title} calendar, scrolls sideways`}
          tabIndex={0}
          onScroll={() => tip && setTip(null)}
          className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain rounded-xl px-1 py-3 focus-visible:outline-2 focus-visible:outline-ring"
          style={{ scrollPaddingLeft: 8 }}
        >
          <div key={rangeKey} className="w-max">
            {/* Month labels (decorative; every cell names its own date). */}
            <div aria-hidden="true" className="relative mb-1.5 h-4 text-[11px] text-muted">
              {model.months.map((month) => (
                <span key={`${month.column}-${month.label}`} className="absolute top-0" style={{ left: month.column * pitch }}>
                  {month.label}
                </span>
              ))}
            </div>

            <div
              ref={gridRef}
              role="grid"
              aria-labelledby={titleId}
              aria-describedby={summaryId}
              className="flex flex-col"
              style={{ gap }}
              onKeyDown={onKeyDown}
              onPointerOver={onPointerOver}
              onPointerLeave={() => setTip(null)}
              onFocus={onFocus}
              onBlur={onBlur}
              onClick={onClick}
            >
              {model.rows.map((weekday, row) => (
                <div key={weekday} role="row" className="flex" style={{ gap }}>
                  <div role="rowheader" className="sr-only">
                    {WEEKDAYS[weekday]}
                  </div>
                  {Array.from({ length: model.columns }, (_, col) => {
                    const day = model.firstColumnDay + col * 7 + row;
                    if (day < startDay || day > endDay) {
                      return <span key={col} aria-hidden="true" className="shrink-0" style={{ width: cellSize, height: cellSize }} />;
                    }
                    const c = loading ? 0 : model.count(day);
                    const level = model.levelOf(c);
                    return (
                      <div
                        key={col}
                        role="gridcell"
                        data-day={day}
                        data-tip={tip?.day === day ? "" : undefined}
                        tabIndex={day === tabbable ? 0 : -1}
                        aria-label={loading ? `Loading ${formatLong(day)}` : describe(day, c)}
                        aria-selected={day === selectedDay}
                        className="chm-cell relative shrink-0 cursor-pointer rounded-[3px] outline-none"
                        style={{ width: cellSize, height: cellSize, "--chm-c": `var(--chm-${level})` } as CSSProperties}
                      >
                        <span
                          aria-hidden="true"
                          data-level={level}
                          className="chm-fill absolute inset-0 rounded-[inherit]"
                          style={{ "--d": `${Math.round((col + row) * model.stagger)}ms` } as CSSProperties}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {tip && !loading && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-background shadow-lg"
            style={{ left: tip.x, top: tip.y - 10 }}
          >
            {(() => {
              const c = model.count(tip.day);
              return `${c === 0 ? `No ${unit.other}` : plural(c)} on ${formatShort(tip.day)}`;
            })()}
            <span className="absolute top-full left-1/2 size-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-foreground" />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <p>{model.total === 0 && !loading ? `No ${unit.other} in this range yet.` : `${plural(model.total)} in this range`}</p>
        {showLegend && (
          <div className="flex items-center gap-1.5">
            <span className="sr-only">Darker cells mean more {unit.other}.</span>
            <span aria-hidden="true">Less</span>
            {LEVELS.map((level) => (
              <span
                key={level}
                aria-hidden="true"
                className="rounded-[3px]"
                style={{
                  width: 11,
                  height: 11,
                  background: `var(--chm-${level})`,
                  boxShadow: level === 0 ? "inset 0 0 0 1px var(--chm-0-ring)" : undefined,
                }}
              />
            ))}
            <span aria-hidden="true">More</span>
          </div>
        )}
      </div>

      <p id={summaryId} className="sr-only" aria-live="polite">
        {loading ? "Loading activity." : summary}
      </p>
    </div>
  );
}
