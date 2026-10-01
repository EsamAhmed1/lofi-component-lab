import Link from "next/link";
import { registry } from "@/registry";
import { ComponentCard } from "@/components/site/component-card";

const GOAL = 30;

export default function Home() {
  const kinds = new Set(registry.map((entry) => entry.kind)).size;
  const latest = [...registry].sort((a, b) => b.week - a.week || b.added.localeCompare(a.added));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="py-16 sm:py-24">
        <p className="text-sm font-medium text-accent">LofiStack 90 Day Build Challenge</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Reusable components, shipped two at a time.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted text-pretty sm:text-lg">
          Every component is typed, responsive, accessible and lives on its own page with a live
          preview, the source code and the prompt used to build it.
        </p>
        <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4">
          {[
            { label: "Components", value: `${registry.length}/${GOAL}` },
            { label: "Types covered", value: kinds },
            { label: "Current week", value: Math.max(...registry.map((e) => e.week)) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-surface p-4">
              <dt className="text-xs text-muted">{stat.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
        <div
          className="mt-6 h-2 max-w-xl overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Challenge progress"
          aria-valuemin={0}
          aria-valuemax={GOAL}
          aria-valuenow={registry.length}
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${(registry.length / GOAL) * 100}%` }}
          />
        </div>
      </section>

      <section aria-labelledby="latest-heading" className="pb-24">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="latest-heading" className="text-xl font-semibold tracking-tight">
            Latest components
          </h2>
          <Link
            href="/components"
            className="rounded-md text-sm font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            View all
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latest.slice(0, 6).map((entry) => (
            <ComponentCard key={entry.slug} entry={entry} />
          ))}
        </ul>
      </section>
    </div>
  );
}
