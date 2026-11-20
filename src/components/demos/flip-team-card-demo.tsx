"use client";

import { useState } from "react";
import { FlipTeamCard, type FlipTeamCardProps } from "@/components/ui/flip-team-card";

type Person = Omit<FlipTeamCardProps, "flipOn" | "onContact">;

const team: Person[] = [
  {
    name: "Maya Chen",
    role: "Design Lead",
    location: "Lisbon, PT",
    colors: ["#6d28d9", "#be185d"],
    variant: "featured",
    badge: "Team lead",
    bio: "Leads the design system and the onboarding flow. Ten years in product design, the last four on tools for small studios.",
    skills: ["Design systems", "Figma", "Prototyping", "Workshops"],
    socials: [
      { label: "Dribbble", href: "https://example.com/maya/dribbble", icon: "dribbble" },
      { label: "LinkedIn", href: "https://example.com/maya/linkedin", icon: "linkedin" },
    ],
  },
  {
    name: "Jonas Weber",
    role: "Staff Engineer",
    location: "Berlin, DE",
    colors: ["#1d4ed8", "#0e7490"],
    bio: "Owns the sync engine and the offline mode. Happiest when a slow query becomes a fast one.",
    skills: ["TypeScript", "Postgres", "Rust", "CRDTs"],
    socials: [
      { label: "GitHub", href: "https://example.com/jonas/github", icon: "github" },
      { label: "Website", href: "https://example.com/jonas", icon: "website" },
    ],
  },
  {
    name: "Amara Okafor",
    role: "Product Manager",
    location: "Lagos, NG",
    colors: ["#b45309", "#be123c"],
    bio: "Talks to customers every week and turns what she hears into the roadmap. Runs the monthly release notes.",
    skills: ["Discovery", "Roadmaps", "SQL", "Interviews"],
    socials: [
      { label: "LinkedIn", href: "https://example.com/amara/linkedin", icon: "linkedin" },
      { label: "X", href: "https://example.com/amara/x", icon: "x" },
    ],
  },
  {
    name: "Diego Santos",
    role: "Motion Designer",
    location: "São Paulo, BR",
    colors: ["#047857", "#0e7490"],
    bio: "Makes the product feel alive: loaders, transitions and the launch videos. Keeps every animation under 400 ms.",
    skills: ["After Effects", "Rive", "CSS motion"],
    socials: [{ label: "Dribbble", href: "https://example.com/diego/dribbble", icon: "dribbble" }],
  },
  {
    name: "Priya Nair",
    role: "Data Scientist",
    location: "Bengaluru, IN",
    colors: ["#7e22ce", "#1d4ed8"],
    bio: "Builds the forecasting models behind the usage dashboard. Writes the team's favourite internal newsletter.",
    skills: ["Python", "Forecasting", "dbt", "Experiments"],
    socials: [
      { label: "GitHub", href: "https://example.com/priya/github", icon: "github" },
      { label: "Email", href: "mailto:priya@example.com", icon: "email" },
    ],
  },
  {
    name: "Liam O'Connor",
    role: "Developer Advocate",
    location: "Dublin, IE",
    colors: ["#be185d", "#9a3412"],
    bio: "Writes the guides, runs the community calls and answers the hard questions on the forum.",
    skills: ["Docs", "Talks", "Next.js", "Video"],
    socials: [
      { label: "X", href: "https://example.com/liam/x", icon: "x" },
      { label: "GitHub", href: "https://example.com/liam/github", icon: "github" },
    ],
  },
];

export default function FlipTeamCardDemo() {
  const [flipOn, setFlipOn] = useState<"click" | "hover">("click");
  const [contacted, setContacted] = useState("");

  return (
    <div className="@container w-full max-w-5xl py-6">
      <div className="mb-6 flex flex-col gap-3 @xl:flex-row @xl:items-end @xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Meet the team</h2>
          <p className="mt-1 text-sm text-muted">Flip a card to see what each person works on.</p>
        </div>
        <div role="group" aria-label="Flip cards on" className="flex w-fit rounded-xl border border-border bg-surface-2 p-1">
          {(["click", "hover"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={flipOn === mode}
              onClick={() => setFlipOn(mode)}
              className={
                flipOn === mode
                  ? "rounded-lg bg-surface px-3 py-1.5 text-sm font-medium text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring"
                  : "rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring"
              }
            >
              {mode === "click" ? "Flip on click" : "Flip on hover"}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-6 @2xl:grid-cols-2 @4xl:grid-cols-3">
        {team.map((person) => (
          <li key={person.name} className="flex">
            <FlipTeamCard {...person} flipOn={flipOn} onContact={() => setContacted(person.name)} />
          </li>
        ))}
      </ul>

      <p aria-live="polite" className="mt-6 min-h-5 text-center text-sm text-muted">
        {contacted ? `Contact form opened for ${contacted}.` : "Press Contact on the back of a card."}
      </p>
    </div>
  );
}
