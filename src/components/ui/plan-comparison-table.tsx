"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export type BillingCycle = "monthly" | "yearly";

export interface ComparisonPlan {
  id: string;
  name: string;
  description: string;
  /** Price per month on monthly billing. A string (e.g. "Custom") is shown as-is. */
  priceMonthly: number | string;
  /** Price per month on yearly billing. A string (e.g. "Custom") is shown as-is. */
  priceYearly: number | string;
  /** ISO currency code. */
  currency?: string;
  /** Call-to-action button text. */
  cta: string;
  /** Marks the recommended plan: border beam, glow and tinted column. */
  highlighted?: boolean;
  /** Small pill above the name, e.g. "Most popular". */
  badge?: string;
  /** Overrides the small line under the price. */
  priceNote?: string;
}

/** A numeric quota. The row draws a small meter scaled to the largest value. */
export interface FeatureLimit {
  limit: number | "unlimited";
  unit?: string;
}

/** true/false render a check or a dash, a string renders as text, a FeatureLimit as value + meter. */
export type FeatureValue = boolean | string | FeatureLimit;

export interface ComparisonFeature {
  name: string;
  /** Extra detail shown in a tooltip next to the name. */
  tooltip?: string;
  /** Value for each plan, keyed by plan id. Missing ids count as "not included". */
  values: Record<string, FeatureValue>;
}

export interface ComparisonGroup {
  name: string;
  features: ComparisonFeature[];
}

export interface PlanComparisonLabels {
  billing: string;
  monthly: string;
  yearly: string;
  features: string;
  included: string;
  notIncluded: string;
  unlimited: string;
  perMonth: string;
  billedYearly: (total: string) => string;
  showPlan: string;
  allPlans: string;
  announce: (billing: BillingCycle) => string;
}

export interface PlanComparisonTableProps {
  plans: ComparisonPlan[];
  groups: ComparisonGroup[];
  /** Controlled billing cycle. */
  billing?: BillingCycle;
  /** Starting billing cycle when uncontrolled. */
  defaultBilling?: BillingCycle;
  onBillingChange?: (billing: BillingCycle) => void;
  /** Called when a plan's CTA is pressed. */
  onSelectPlan?: (planId: string, billing: BillingCycle) => void;
  /** Table caption; also names the scroll region. */
  caption?: string;
  /** Badge on the Yearly option. Empty string hides it. */
  yearlyBadge?: string;
  /** Max height of the scroll area. The header row sticks inside it. */
  maxHeight?: string;
  /** Show a "one plan at a time" picker when the component is narrow. */
  mobilePicker?: boolean;
  /** Locale used to format prices and limits. */
  locale?: string;
  /** UI strings, for translation. */
  labels?: Partial<PlanComparisonLabels>;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const defaultLabels: PlanComparisonLabels = {
  billing: "Billing period",
  monthly: "Monthly",
  yearly: "Yearly",
  features: "Features",
  included: "Included",
  notIncluded: "Not included",
  unlimited: "Unlimited",
  perMonth: "per month",
  billedYearly: (total) => `per month, ${total} billed yearly`,
  showPlan: "Show",
  allPlans: "All plans",
  announce: (billing) => `Showing ${billing} prices.`,
};

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// Opaque tints so sticky cells never show content scrolling underneath.
const tint = (pct: number, base = "var(--surface)") =>
  `color-mix(in oklab, var(--accent) ${pct}%, ${base})`;

const STYLES = `
@property --plan-comparison-table-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
@keyframes plan-comparison-table-spin {
  to { --plan-comparison-table-angle: 360deg; }
}
@keyframes plan-comparison-table-row-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.plan-comparison-table-beam {
  padding: 2px;
  border-radius: inherit;
  background: conic-gradient(from var(--plan-comparison-table-angle), transparent 0deg 230deg, var(--accent) 290deg, #f0abfc 330deg, transparent 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  animation: plan-comparison-table-spin 5s linear infinite;
}
.plan-comparison-table-row-in {
  animation: plan-comparison-table-row-in 0.35s ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .plan-comparison-table-beam {
    animation: none;
    background: linear-gradient(160deg, var(--accent), #f0abfc 50%, var(--accent));
  }
  .plan-comparison-table-row-in { animation: none; }
}
`;

const formatPrice = (value: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

const isLimit = (value: FeatureValue | undefined): value is FeatureLimit =>
  typeof value === "object" && value !== null && "limit" in value;

/** Prints a price where every digit rolls to its new value like an odometer. */
function RollingPrice({ text }: { text: string }) {
  const chars = [...text];
  return (
    <span aria-hidden className="inline-flex items-start leading-none tabular-nums">
      {chars.map((ch, i) => {
        // Key from the right so the ones digit stays the ones digit when the length changes.
        const pos = chars.length - i;
        if (!/[0-9]/.test(ch)) {
          return (
            <span key={`s${pos}`} className="inline-block h-[1em] whitespace-pre">
              {ch}
            </span>
          );
        }
        return (
          <span key={`d${pos}`} className="relative inline-block h-[1em] overflow-hidden">
            <span className="invisible">0</span>
            <span
              className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.2,1.35,0.4,1)] motion-reduce:transition-none"
              style={{ transform: `translateY(${-Number(ch) * 10}%)`, transitionDelay: `${pos * 45}ms` }}
            >
              {DIGITS.map((d) => (
                <span key={d} className="h-[1em]">
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function InfoTip({ id, feature, text }: { id: string; feature: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`About ${feature}`}
        aria-describedby={id}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="grid size-6 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 7.25v4M8 4.75v.01" strokeLinecap="round" />
        </svg>
      </button>
      <span
        role="tooltip"
        id={id}
        className={cn(
          "absolute bottom-full left-0 z-10 mb-1.5 w-52 rounded-lg bg-foreground px-3 py-2 text-xs font-normal leading-snug text-background shadow-lg transition-[opacity,translate] duration-150",
          open ? "visible translate-y-0 opacity-100" : "invisible pointer-events-none translate-y-1 opacity-0",
        )}
      >
        {text}
      </span>
    </span>
  );
}

function CellValue({
  value,
  rowMax,
  labels,
  locale,
}: {
  value: FeatureValue | undefined;
  rowMax: number;
  labels: PlanComparisonLabels;
  locale: string;
}) {
  if (value === true) {
    return (
      <span className="inline-grid size-6 place-items-center rounded-full bg-accent text-accent-foreground shadow-[0_4px_12px_-4px_var(--accent)]">
        <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">{labels.included}</span>
      </span>
    );
  }
  if (value === false || value === undefined) {
    return (
      <span className="inline-grid size-6 place-items-center text-muted">
        <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 8h8" strokeLinecap="round" />
        </svg>
        <span className="sr-only">{labels.notIncluded}</span>
      </span>
    );
  }
  if (isLimit(value)) {
    const unlimited = value.limit === "unlimited";
    const amount = unlimited ? labels.unlimited : `${(value.limit as number).toLocaleString(locale)}${value.unit ? ` ${value.unit}` : ""}`;
    // Log scale so 1 GB and 250 GB both read on the same meter; unlimited fills it.
    const fill = unlimited
      ? 1
      : rowMax > 0
        ? 0.12 + 0.73 * (Math.log1p(value.limit as number) / Math.log1p(rowMax))
        : 0;
    return (
      <span className="inline-flex w-full max-w-28 flex-col items-center gap-1.5">
        <span className="text-sm font-medium text-foreground">{amount}</span>
        <span aria-hidden className="h-1 w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-border ring-inset">
          <span
            className={cn("block h-full rounded-full", unlimited ? "bg-[linear-gradient(90deg,var(--accent),#f0abfc)]" : "bg-accent")}
            style={{ width: `${fill * 100}%` }}
          />
        </span>
      </span>
    );
  }
  return <span className="text-sm text-foreground">{value}</span>;
}

/**
 * Pricing and feature comparison table. A real <table> with a caption, column
 * and row headers, collapsible feature groups, a sticky header row and a sticky
 * first column. The highlighted plan gets a rotating border beam. Prices roll
 * digit by digit when the billing cycle changes.
 */
export function PlanComparisonTable({
  plans,
  groups,
  billing: billingProp,
  defaultBilling = "monthly",
  onBillingChange,
  onSelectPlan,
  caption = "Compare plans and features",
  yearlyBadge = "Save 20%",
  maxHeight = "40rem",
  mobilePicker = true,
  locale = "en-US",
  labels: labelsProp,
  className,
  ref,
}: PlanComparisonTableProps) {
  const labels = { ...defaultLabels, ...labelsProp };
  const [innerBilling, setInnerBilling] = useState<BillingCycle>(defaultBilling);
  const billing = billingProp ?? innerBilling;
  const [announcement, setAnnouncement] = useState("");
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  const [justOpened, setJustOpened] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<string | null>(null);
  // Narrow layouts open on the highlighted plan; wide layouts ignore the pick and show every column.
  const [pick, setPick] = useState<string>(() => plans.find((plan) => plan.highlighted)?.id ?? "all");
  const [canScrollRight, setCanScrollRight] = useState(false);

  const baseId = useId();
  const regionRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const beamRef = useRef<HTMLDivElement | null>(null);
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const frame = useRef<number | null>(null);

  const highlighted = plans.find((p) => p.highlighted)?.id ?? null;
  const cycles: BillingCycle[] = ["monthly", "yearly"];

  const setBilling = (next: BillingCycle) => {
    if (next === billing) return;
    if (billingProp === undefined) setInnerBilling(next);
    onBillingChange?.(next);
    setAnnouncement(labels.announce(next));
  };

  const onBillingKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next: BillingCycle =
      event.key === "Home" ? "monthly"
      : event.key === "End" ? "yearly"
      : billing === "monthly" ? "yearly" : "monthly";
    setBilling(next);
    radioRefs.current[cycles.indexOf(next)]?.focus();
  };

  // Positions the beam over the highlighted column and clips it where the
  // sticky first column covers it, so it never paints over feature names.
  const syncBeam = useCallback(() => {
    const table = tableRef.current;
    const beam = beamRef.current;
    const region = regionRef.current;
    if (!table || !beam || !region) return;
    const head = highlighted ? table.querySelector<HTMLElement>(`th[data-plan="${CSS.escape(highlighted)}"]`) : null;
    const first = table.querySelector<HTMLElement>("th[data-corner]");
    if (!head || head.offsetWidth === 0) {
      beam.style.display = "none";
      return;
    }
    beam.style.display = "block";
    beam.style.left = `${head.offsetLeft}px`;
    beam.style.width = `${head.offsetWidth}px`;
    beam.style.height = `${table.offsetHeight}px`;
    const covered = region.scrollLeft + (first?.offsetWidth ?? 0) - head.offsetLeft;
    beam.style.clipPath = `inset(-24px -24px -24px ${covered > 0 ? `${covered}px` : "-24px"})`;
  }, [highlighted]);

  const syncScroll = useCallback(() => {
    const region = regionRef.current;
    if (!region) return;
    setCanScrollRight(region.scrollLeft + region.clientWidth < region.scrollWidth - 2);
    syncBeam();
  }, [syncBeam]);

  useLayoutEffect(() => {
    syncScroll();
    const region = regionRef.current;
    const table = tableRef.current;
    if (!region || !table) return;
    const observer = new ResizeObserver(() => syncScroll());
    observer.observe(region);
    observer.observe(table);
    return () => observer.disconnect();
  }, [syncScroll, pick, collapsed]);

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
  }, []);

  const onScroll = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(syncScroll);
  };

  const toggleGroup = (index: number) => {
    const opening = collapsed.has(index);
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setJustOpened(opening ? index : null);
  };

  // Hides other plan columns when a single plan is picked on a narrow layout.
  const colHidden = (planId: string) =>
    mobilePicker && pick !== "all" && pick !== planId && "@max-2xl:hidden";

  const cellBg = (planId: string) => {
    const isHi = planId === highlighted;
    const isHover = planId === hoverCol;
    if (isHi) return isHover ? "bg-(--pct-hi-strong)" : "bg-(--pct-hi) group-hover/row:bg-(--pct-hi-strong)";
    return isHover ? "bg-(--pct-col)" : "group-hover/row:bg-surface-2";
  };

  const priceFor = (plan: ComparisonPlan) => (billing === "yearly" ? plan.priceYearly : plan.priceMonthly);

  return (
    <div
      ref={ref}
      className={cn("@container w-full", className)}
      style={
        {
          "--pct-hi": tint(7),
          "--pct-hi-strong": tint(13),
          "--pct-col": "color-mix(in oklab, var(--foreground) 5%, var(--surface))",
        } as CSSProperties
      }
    >
      <style href="plan-comparison-table" precedence="default">
        {STYLES}
      </style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="radiogroup"
          aria-label={labels.billing}
          className="relative grid grid-cols-2 rounded-full border border-border bg-surface-2 p-1"
        >
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent shadow-[0_6px_20px_-6px_var(--accent)] transition-transform duration-500 ease-[cubic-bezier(0.3,1.4,0.5,1)] motion-reduce:transition-none",
              billing === "yearly" && "translate-x-full",
            )}
          />
          {cycles.map((cycle, i) => {
            const active = billing === cycle;
            return (
              <button
                key={cycle}
                ref={(node) => {
                  radioRefs.current[i] = node;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setBilling(cycle)}
                onKeyDown={onBillingKey}
                className={cn(
                  "relative z-10 inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active ? "text-accent-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {cycle === "monthly" ? labels.monthly : labels.yearly}
                {cycle === "yearly" && yearlyBadge ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {yearlyBadge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {mobilePicker ? (
          <label className="flex items-center gap-2 text-sm text-muted @2xl:hidden">
            {labels.showPlan}
            <select
              value={pick}
              onChange={(event) => setPick(event.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <option value="all">{labels.allPlans}</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <span role="status" className="sr-only">
          {announcement}
        </span>
      </div>

      <div className="relative">
        <div
          ref={regionRef}
          role="region"
          aria-label={caption}
          tabIndex={0}
          onScroll={onScroll}
          style={{ maxHeight }}
          className="relative isolate overflow-auto overscroll-x-contain rounded-2xl border border-border bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <div className="relative w-fit min-w-full">
            <table
              ref={tableRef}
              className={cn(
                "w-full min-w-[46rem] border-separate border-spacing-0 text-left",
                mobilePicker && pick !== "all" && "@max-2xl:min-w-0",
              )}
            >
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    data-corner
                    className="sticky top-0 left-0 z-30 w-40 min-w-32 border-b border-border bg-surface p-4 align-bottom text-xs font-medium uppercase tracking-wider text-muted @2xl:w-56"
                  >
                    {labels.features}
                  </th>
                  {plans.map((plan) => {
                    const price = priceFor(plan);
                    const currency = plan.currency ?? "USD";
                    const isHi = plan.id === highlighted;
                    const nameId = `${baseId}-plan-${plan.id}`;
                    const priceText = typeof price === "number" ? formatPrice(price, currency, locale) : price;
                    const note =
                      plan.priceNote ??
                      (typeof price !== "number"
                        ? ""
                        : billing === "yearly"
                          ? labels.billedYearly(formatPrice(price * 12, currency, locale))
                          : labels.perMonth);
                    return (
                      <th
                        key={plan.id}
                        scope="col"
                        data-plan={plan.id}
                        onPointerEnter={() => setHoverCol(plan.id)}
                        onPointerLeave={() => setHoverCol(null)}
                        onFocus={() => setHoverCol(plan.id)}
                        onBlur={() => setHoverCol(null)}
                        className={cn(
                          "sticky top-0 z-20 min-w-40 border-b border-border p-4 align-top font-normal transition-colors duration-200",
                          isHi
                            ? hoverCol === plan.id ? "bg-(--pct-hi-strong)" : "bg-(--pct-hi)"
                            : hoverCol === plan.id ? "bg-(--pct-col)" : "bg-surface",
                          colHidden(plan.id),
                        )}
                      >
                        <div className="flex h-full flex-col gap-3">
                          <div className="flex min-h-6 items-center gap-2">
                            <span id={nameId} className="text-base font-semibold text-foreground">
                              {plan.name}
                            </span>
                            {plan.badge ? (
                              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                                {plan.badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="min-h-10 text-xs leading-relaxed text-muted">{plan.description}</p>
                          <div>
                            <span className="block text-3xl font-semibold tracking-tight text-foreground">
                              {typeof price === "number" ? <RollingPrice text={priceText} /> : priceText}
                              <span className="sr-only">
                                {typeof price === "number" ? `${priceText} ${note}` : note}
                              </span>
                            </span>
                            <span aria-hidden className="mt-1 block min-h-4 text-xs text-muted">
                              {note}
                            </span>
                          </div>
                          <button
                            type="button"
                            aria-describedby={nameId}
                            onClick={() => onSelectPlan?.(plan.id, billing)}
                            className={cn(
                              "mt-auto inline-flex h-10 w-full items-center justify-center rounded-xl px-3 text-sm font-medium transition-[background-color,box-shadow,scale] duration-200 active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                              isHi
                                ? "bg-accent text-accent-foreground shadow-[0_8px_24px_-8px_var(--accent)] hover:shadow-[0_12px_32px_-8px_var(--accent)]"
                                : "border border-border bg-surface text-foreground hover:bg-surface-2",
                            )}
                          >
                            {plan.cta}
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {groups.map((group, g) => {
                const open = !collapsed.has(g);
                const rowIds = group.features.map((_, f) => `${baseId}-g${g}-f${f}`);
                return (
                  <tbody key={`${group.name}-${g}`}>
                    <tr>
                      <th
                        scope="rowgroup"
                        colSpan={plans.length + 1}
                        className="border-b border-border bg-surface-2 p-0 text-left"
                      >
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={rowIds.join(" ")}
                          onClick={() => toggleGroup(g)}
                          className="sticky left-0 inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-foreground hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                        >
                          <svg
                            aria-hidden
                            viewBox="0 0 16 16"
                            className={cn("size-4 text-muted transition-transform duration-300 motion-reduce:transition-none", open ? "rotate-90" : "rotate-0")}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {group.name}
                          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                            {group.features.length}
                          </span>
                        </button>
                      </th>
                    </tr>
                    {group.features.map((feature, f) => {
                      const rowMax = Math.max(
                        0,
                        ...plans.map((p) => {
                          const v = feature.values[p.id];
                          return isLimit(v) && typeof v.limit === "number" ? v.limit : 0;
                        }),
                      );
                      return (
                        <tr
                          key={`${feature.name}-${f}`}
                          id={rowIds[f]}
                          hidden={!open}
                          className={cn("group/row", justOpened === g && "plan-comparison-table-row-in")}
                        >
                          <th
                            scope="row"
                            className="sticky left-0 z-10 border-b border-border bg-surface px-4 py-3 text-sm font-normal text-foreground transition-colors group-hover/row:bg-surface-2"
                          >
                            <span className="flex items-center gap-1">
                              <span>{feature.name}</span>
                              {feature.tooltip ? (
                                <InfoTip id={`${rowIds[f]}-tip`} feature={feature.name} text={feature.tooltip} />
                              ) : null}
                            </span>
                          </th>
                          {plans.map((plan) => (
                            <td
                              key={plan.id}
                              className={cn(
                                "border-b border-border px-4 py-3 text-center transition-colors duration-200",
                                cellBg(plan.id),
                                colHidden(plan.id),
                              )}
                            >
                              <CellValue value={feature.values[plan.id]} rowMax={rowMax} labels={labels} locale={locale} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })}
            </table>

            {/* Border beam + glow over the highlighted column. Positioned by syncBeam. */}
            <div
              ref={beamRef}
              aria-hidden
              className="pointer-events-none absolute top-0 z-[25] hidden rounded-2xl shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_45%,transparent),0_0_28px_-6px_color-mix(in_oklab,var(--accent)_55%,transparent)]"
            >
              <div className="plan-comparison-table-beam absolute inset-0" />
            </div>
          </div>
        </div>

        {/* Edge fade that hints at more columns to the right. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-px right-px z-10 w-12 rounded-r-2xl bg-linear-to-l from-surface to-transparent transition-opacity duration-300",
            canScrollRight ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </div>
  );
}

