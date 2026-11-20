"use client";

import { RevenueAreaChart, type ChartDatum, type ChartSeries } from "@/components/ui/revenue-area-chart";

const DAY = 86_400_000;
const END = Date.UTC(2026, 10, 20);
const DAYS = 365 * 3;

/** Seeded PRNG (mulberry32), so the server and the client build the same data. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Three years of daily revenue: growth, a yearly wave, quieter weekends, noise and a few launch spikes.
const rand = mulberry32(2611);
const raw = Array.from({ length: DAYS }, (_, i) => {
  const t = END - (DAYS - 1 - i) * DAY;
  const weekday = (Math.floor(t / DAY) + 4) % 7; // 1 Jan 1970 was a Thursday.
  const trend = 2400 * (1 + (i / DAYS) * 1.2);
  const weekly = weekday === 0 || weekday === 6 ? 0.76 : 1;
  const season = 1 + 0.12 * Math.sin((i / 365) * Math.PI * 2 - 1.2);
  const noise = 0.88 + rand() * 0.24;
  const spike = rand() > 0.985 ? 1.7 : 1;
  return { t, value: Math.round(trend * weekly * season * noise * spike) };
});

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

// The last two years are "this year"; "last year" is the same day 365 days earlier.
const revenue: ChartDatum[] = raw.slice(365).map((p) => ({ date: iso(p.t), value: p.value }));
const lastYear: ChartDatum[] = raw.slice(365).map((p, i) => ({ date: iso(p.t), value: raw[i].value }));
const orders: ChartDatum[] = raw.slice(365).map((p, i) => ({
  date: iso(p.t),
  value: Math.round(p.value / (38 + 6 * Math.sin(i / 9))),
}));

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const formatCount = (v: number) => compact.format(v);

// Defined once, outside render, so the chart only recomputes when the data really changes.
const revenueSeries: ChartSeries[] = [
  { id: "revenue", label: "This year", data: revenue, color: "var(--accent)" },
  { id: "last-year", label: "Last year", data: lastYear, color: "#64748b", dashed: true },
];
const orderSeries: ChartSeries[] = [{ id: "orders", label: "Orders", data: orders, color: "#059669" }];
const refundSeries: ChartSeries[] = [{ id: "refunds", label: "Refunds", data: [], color: "#e11d48" }];

export default function RevenueAreaChartDemo() {
  return (
    <div className="@container grid w-full max-w-5xl gap-5 py-6">
      <RevenueAreaChart
        title="Revenue"
        series={revenueSeries}
        height={300}
      />
      <div className="grid gap-5 @3xl:grid-cols-2">
        <RevenueAreaChart
          title="Orders"
          series={orderSeries}
          formatValue={formatCount}
          defaultRange="7d"
          height={200}
        />
        <RevenueAreaChart title="Refunds" series={refundSeries} loading height={200} />
      </div>
    </div>
  );
}
