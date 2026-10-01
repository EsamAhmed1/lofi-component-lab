"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const viewports = [
  { id: "full", label: "Desktop", width: "100%" },
  { id: "tablet", label: "Tablet", width: "768px" },
  { id: "mobile", label: "Mobile", width: "375px" },
] as const;

type ViewportId = (typeof viewports)[number]["id"];

/** Live preview with a width switcher to check responsive behaviour. */
export function PreviewFrame({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState<ViewportId>("full");
  const width = viewports.find((v) => v.id === viewport)?.width ?? "100%";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">Live preview</span>
        <div role="group" aria-label="Preview width" className="flex rounded-lg bg-surface-2 p-0.5">
          {viewports.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={viewport === v.id}
              onClick={() => setViewport(v.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                viewport === v.id
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground",
                v.id !== "full" && "hidden sm:inline-block",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px] px-2 py-6 sm:px-6">
        <div
          className="mx-auto flex min-h-[320px] items-center justify-center overflow-hidden transition-[max-width] duration-300"
          style={{ maxWidth: width }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
