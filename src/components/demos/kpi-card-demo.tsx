"use client";

import { useEffect, useRef, useState } from "react";
import { KpiCard } from "@/components/ui/kpi-card";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const icons = {
  revenue: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5v13M11.5 4.5H6.75a2.25 2.25 0 0 0 0 4.5h2.5a2.25 2.25 0 0 1 0 4.5H4.5" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M11 3.2a2.5 2.5 0 0 1 0 4.6M12.5 10.3c1.3.5 2 1.8 2 3.7" />
    </svg>
  ),
  conversion: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2.5h12l-4.5 5.5v5l-3 1.5V8z" />
    </svg>
  ),
  churn: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l4.5 4.5 3-3L14 10M14 6.5V10h-3.5" />
    </svg>
  ),
};

const toggle =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-surface-2 aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring motion-reduce:transition-none";

export default function KpiCardDemo() {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const retry = () => {
    setRetrying(true);
    timer.current = window.setTimeout(() => {
      setRetrying(false);
      setFailed(false);
    }, 1200);
  };

  return (
    <div className="@container w-full py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Store overview</h2>
          <p className="text-sm text-muted">November, compared with October. Hover or tab into a chart to scrub.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={loading} onClick={() => setLoading((v) => !v)} className={toggle}>
            Loading card
          </button>
          <button
            type="button"
            aria-pressed={failed}
            onClick={() => {
              setRetrying(false);
              setFailed((v) => !v);
            }}
            className={toggle}
          >
            Error card
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
        <KpiCard
          variant="highlight"
          label="Revenue"
          icon={icons.revenue}
          format="currency"
          value={48213}
          previousValue={42890}
          period="last month"
          data={[31200, 29800, 33400, 35100, 34000, 37800, 39200, 38100, 41500, 44000, 42890, 48213]}
          dataLabels={MONTHS}
          target={60000}
          targetLabel="Q4 goal"
          href="#revenue"
        />
        <KpiCard
          label="Active users"
          icon={icons.users}
          format="compact"
          value={128400}
          previousValue={119700}
          data={[86000, 90500, 94200, 99000, 97600, 104300, 108900, 112000, 115800, 117200, 119700, 128400]}
          dataLabels={MONTHS}
          target={150000}
          loading={loading}
        />
        <KpiCard
          label="Conversion"
          icon={icons.conversion}
          format="percent"
          decimals={2}
          value={0.0342}
          previousValue={0.0365}
          data={[0.031, 0.0322, 0.0335, 0.0341, 0.0338, 0.0356, 0.0349, 0.0371, 0.0368, 0.0359, 0.0365, 0.0342]}
          dataLabels={MONTHS}
          loading={retrying}
          error={failed && !retrying ? "Couldn't reach the analytics service." : undefined}
          onRetry={retry}
        />
        <KpiCard
          label="Churn"
          icon={icons.churn}
          format="percent"
          value={0.021}
          previousValue={0.026}
          invert
          data={[0.034, 0.033, 0.031, 0.032, 0.029, 0.028, 0.03, 0.027, 0.026, 0.025, 0.026, 0.021]}
          dataLabels={MONTHS}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 @lg:grid-cols-3">
        <KpiCard variant="minimal" label="Avg. order" format="currency" decimals={2} value={64.18} delta={3.1} data={[58, 60, 59, 61, 62, 61, 63, 64.18]} />
        <KpiCard variant="minimal" label="Refunds" format="number" value={37} delta={-8.2} invert data={[52, 48, 45, 47, 41, 40, 37]} />
        <KpiCard variant="minimal" label="Page load (s)" format="number" decimals={2} value={1.84} delta={4.5} invert period="last week" data={[1.62, 1.7, 1.66, 1.75, 1.8, 1.84]} />
      </div>
    </div>
  );
}
