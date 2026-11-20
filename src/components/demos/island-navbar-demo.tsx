"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import {
  IslandNavbar,
  type IslandNavItem,
  type IslandNavLink,
  type IslandNotification,
  type IslandSearchItem,
} from "@/components/ui/island-navbar";
import { cn } from "@/lib/cn";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const icons = {
  dashboards: (
    <Icon>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="11" y="3" width="6" height="4" rx="1.5" />
      <rect x="11" y="9" width="6" height="8" rx="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" />
    </Icon>
  ),
  funnels: (
    <Icon>
      <path d="M3 4h14l-5 6v5l-4 2v-7L3 4Z" />
    </Icon>
  ),
  replay: (
    <Icon>
      <circle cx="10" cy="10" r="7" />
      <path d="m8.5 7.5 4 2.5-4 2.5v-5Z" />
    </Icon>
  ),
  alerts: (
    <Icon>
      <path d="M10 3 2.5 16h15L10 3Z" />
      <path d="M10 8v3.5M10 13.8v.2" />
    </Icon>
  ),
  page: (
    <Icon>
      <path d="M5 2.5h7l3 3v12H5v-15Z" />
      <path d="M8 9h4M8 12h4" />
    </Icon>
  ),
};

const links: IslandNavLink[] = [
  {
    id: "product",
    label: "Product",
    children: [
      { id: "dashboards", label: "Dashboards", href: "#dashboards", icon: icons.dashboards, description: "Live charts your whole team can read." },
      { id: "funnels", label: "Funnels", href: "#funnels", icon: icons.funnels, description: "See where users drop off, step by step." },
      { id: "replay", label: "Session replay", href: "#replay", icon: icons.replay, description: "Watch real sessions with private data masked." },
      { id: "alerts", label: "Alerts", href: "#alerts", icon: icons.alerts, description: "Get pinged in Slack when a metric moves." },
    ],
  },
  { id: "customers", label: "Customers", href: "#customers" },
  { id: "pricing", label: "Pricing", href: "#pricing" },
  { id: "docs", label: "Docs", href: "#docs" },
];

const searchItems: IslandSearchItem[] = [
  { id: "dashboards", label: "Dashboards", href: "#dashboards", icon: icons.dashboards, description: "Product" },
  { id: "funnels", label: "Funnels", href: "#funnels", icon: icons.funnels, description: "Product" },
  { id: "pricing", label: "Pricing", href: "#pricing", icon: icons.page, description: "Plans and limits" },
  { id: "docs", label: "Install the SDK", href: "#docs", icon: icons.page, description: "Docs · Getting started" },
  { id: "docs-events", label: "Track custom events", href: "#docs", icon: icons.page, description: "Docs · Events" },
  { id: "replay", label: "Session replay", href: "#replay", icon: icons.replay, description: "Product" },
  { id: "alerts", label: "Alerts", href: "#alerts", icon: icons.alerts, description: "Product" },
  { id: "customers", label: "Customer stories", href: "#customers", icon: icons.page, description: "Customers" },
];

const initialNotifications: IslandNotification[] = [
  { id: "n1", title: "Weekly report is ready", body: "Sign-ups are up 12% on last week.", time: "2m ago", unread: true },
  { id: "n2", title: "Alert: checkout errors", body: "Error rate passed 2% on /checkout.", time: "1h ago", unread: true },
  { id: "n3", title: "Priya shared a dashboard", body: "“Q4 activation” is now in your workspace.", time: "Yesterday" },
];

const pages: Record<string, { title: string; body: string }> = {
  pricing: { title: "Simple pricing that scales", body: "Free up to 10k events a month. Pay as you grow after that." },
  customers: { title: "Teams that ship with Lumen", body: "See how product teams cut their reporting time in half." },
  docs: { title: "Get set up in five minutes", body: "Install the SDK, track your first event and build a chart." },
};

export default function IslandNavbarDemo() {
  const [active, setActive] = useState("pricing");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [tone, setTone] = useState<"dark" | "glass">("dark");
  const [log, setLog] = useState("Open Product, search or the bell.");

  const onNavigate = (item: IslandNavItem, event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setActive(item.id);
    setLog(`Navigated to ${item.label}.`);
  };

  const page = pages[active] ?? {
    title: links[0].children?.find((c) => c.id === active)?.label ?? "Lumen analytics",
    body: links[0].children?.find((c) => c.id === active)?.description ?? "Product analytics for small teams.",
  };

  return (
    <div className="relative w-full min-h-[480px] overflow-hidden rounded-2xl border border-border bg-background">
      <IslandNavbar
        label="Lumen"
        tone={tone}
        brand={
          <a
            href="#home"
            onClick={(event) => {
              event.preventDefault();
              setLog("Navigated to Home.");
            }}
            className="flex items-center gap-2 rounded-full px-1 text-sm font-semibold outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span aria-hidden className="grid size-6 place-items-center rounded-full bg-[conic-gradient(from_180deg,#38bdf8,#a78bfa,#f472b6,#38bdf8)]">
              <span className="size-2.5 rounded-full bg-zinc-950" />
            </span>
            Lumen
          </a>
        }
        links={links}
        activeId={active}
        onNavigate={onNavigate}
        searchItems={searchItems}
        notifications={notifications}
        onNotificationClick={(n) => {
          setNotifications((list) => list.map((item) => (item.id === n.id ? { ...item, unread: false } : item)));
          setLog(`Opened “${n.title}”.`);
        }}
        onMarkAllRead={() => setNotifications((list) => list.map((item) => ({ ...item, unread: false })))}
        actions={
          <button
            type="button"
            aria-label="Account: Jordan Lee"
            onClick={() => setLog("Opened the account menu.")}
            className="grid size-8 place-items-center rounded-full bg-violet-700 text-xs font-semibold text-white outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            JL
          </button>
        }
      />

      {/* Mock page under the nav, so the expanded panels have room. */}
      <div className="px-5 pb-8 pt-10 sm:px-10">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Lumen</p>
        <h2 className="mt-2 max-w-md text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{page.title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted">{page.body}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Pill style" className="flex rounded-full border border-border bg-surface p-0.5">
            {(["dark", "glass"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={tone === value}
                onClick={() => setTone(value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring",
                  tone === value ? "bg-foreground text-background" : "text-muted hover:text-foreground",
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">{log}</p>
        </div>

        <div aria-hidden className="mt-6 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-3">
              <div className="h-2 w-10 rounded-full bg-surface-2" />
              <div className="mt-3 h-12 rounded-lg bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_22%,transparent),transparent)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
