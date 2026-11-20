"use client";

import { useState } from "react";
import { AuroraHero, type AuroraHeroLogo } from "@/components/ui/aurora-hero";

const logos: AuroraHeroLogo[] = [
  {
    name: "Northwind",
    logo: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2l6 16-6-4-6 4z" />
      </svg>
    ),
  },
  {
    name: "Halcyon",
    logo: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="10" cy="10" r="7" />
        <path d="M3 10h14" />
      </svg>
    ),
  },
  {
    name: "Brightpath",
    logo: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <rect x="2" y="11" width="4" height="7" rx="1" />
        <rect x="8" y="6" width="4" height="12" rx="1" />
        <rect x="14" y="2" width="4" height="16" rx="1" />
      </svg>
    ),
  },
  {
    name: "Oakline",
    logo: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2c4 3 6 6 6 9a6 6 0 0 1-12 0c0-3 2-6 6-9z" />
      </svg>
    ),
  },
  {
    name: "Vantage",
    logo: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M3 4l7 12 7-12" />
      </svg>
    ),
  },
];

export default function AuroraHeroDemo() {
  const [action, setAction] = useState("Nothing clicked yet.");

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <AuroraHero
        headingLevel={2}
        eyebrow="New: Framecast 2.0 renders in 4K"
        headlineBefore="Turn any script into"
        rotatingWords={["launch films", "product demos", "explainers", "social ads"]}
        headlineAfter="in minutes."
        headlineLabel="Turn any script into launch films, product demos, explainers or social ads in minutes."
        description="Paste a script or a product link. Framecast plans the shots, picks a voice and renders a cut you can edit like a doc."
        primaryCta={{ label: "Start free", onClick: () => setAction("Start free: opening sign-up.") }}
        secondaryCta={{ label: "Watch the demo", onClick: () => setAction("Watch the demo: playing the 90-second tour.") }}
        stats={[
          { value: 2.4, suffix: "M", label: "videos rendered" },
          { value: 38, label: "voice languages" },
          { value: 92, suffix: "%", label: "less editing time" },
        ]}
        logos={logos}
      />
      <p aria-live="polite" className="px-1 text-sm text-muted">
        {action}
      </p>
    </div>
  );
}
