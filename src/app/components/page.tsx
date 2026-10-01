import type { Metadata } from "next";
import { registry } from "@/registry";
import { ComponentCard } from "@/components/site/component-card";

export const metadata: Metadata = {
  title: "All components",
  description: "Every component in the Lofi Component Lab, grouped by challenge week.",
};

export default function ComponentsIndex() {
  const weeks = [...new Set(registry.map((entry) => entry.week))].sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">All components</h1>
      <p className="mt-3 text-muted">
        {registry.length} components so far. Each one has its own page with a live preview and the code.
      </p>
      <div className="mt-10 space-y-12">
        {weeks.map((week) => (
          <section key={week} aria-labelledby={`week-${week}`}>
            <h2 id={`week-${week}`} className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
              Week {String(week).padStart(2, "0")}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {registry
                .filter((entry) => entry.week === week)
                .map((entry) => (
                  <ComponentCard key={entry.slug} entry={entry} />
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
