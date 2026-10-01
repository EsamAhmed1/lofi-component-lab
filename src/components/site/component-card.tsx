import Link from "next/link";
import type { RegistryEntry } from "@/registry";

export function ComponentCard({ entry }: { entry: RegistryEntry }) {
  return (
    <li>
      <Link
        href={`/components/${entry.slug}`}
        className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface p-5 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="rounded-full bg-accent/12 px-2.5 py-1 font-medium text-accent">
            {entry.kind}
          </span>
          <span className="text-muted">Week {String(entry.week).padStart(2, "0")}</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">{entry.name}</h3>
          <p className="text-sm leading-relaxed text-muted">{entry.summary}</p>
        </div>
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-accent">
          Open component
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </Link>
    </li>
  );
}
