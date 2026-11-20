"use client";

import { useId, useState, type ReactNode } from "react";
import { MagnifyDock, type DockItem } from "@/components/ui/magnify-dock";

/** Full-bleed app tile: a vertical gradient square with white artwork on top. */
function AppIcon({ from, to, children }: { from: string; to: string; children: ReactNode }) {
  const id = `g${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 48 48" aria-hidden focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" fill={`url(#${id})`} />
      {children}
    </svg>
  );
}

const appIcons: Record<string, ReactNode> = {
  files: (
    <AppIcon from="#7dd3fc" to="#2563eb">
      <path d="M11 16a3 3 0 0 1 3-3h7l3 3h10a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z" fill="#fff" opacity="0.95" />
      <path d="M11 21h26" stroke="#93c5fd" strokeWidth="2" />
    </AppIcon>
  ),
  mail: (
    <AppIcon from="#60a5fa" to="#4f46e5">
      <rect x="10" y="14" width="28" height="20" rx="3" fill="#fff" />
      <path d="M11 16l13 10 13-10" fill="none" stroke="#6366f1" strokeWidth="2.4" strokeLinejoin="round" />
    </AppIcon>
  ),
  messages: (
    <AppIcon from="#86efac" to="#16a34a">
      <path d="M24 12c-7.7 0-14 5-14 11.2 0 3.6 2.1 6.8 5.4 8.8L14 37l6.2-3.1c1.2.3 2.5.4 3.8.4 7.7 0 14-5 14-11.1S31.7 12 24 12z" fill="#fff" />
    </AppIcon>
  ),
  calendar: (
    <AppIcon from="#ffffff" to="#e4e4e7">
      <rect width="48" height="14" fill="#ef4444" />
      <text x="24" y="10.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">NOV</text>
      <text x="24" y="38" textAnchor="middle" fontSize="20" fontWeight="600" fill="#18181b" fontFamily="system-ui, sans-serif">20</text>
    </AppIcon>
  ),
  photos: (
    <AppIcon from="#ffffff" to="#f4f4f5">
      {["#f97316", "#facc15", "#22c55e", "#06b6d4", "#6366f1", "#ec4899"].map((color, i) => (
        <ellipse
          key={color}
          cx="24"
          cy="15"
          rx="5"
          ry="9"
          fill={color}
          opacity="0.85"
          transform={`rotate(${i * 60} 24 24)`}
        />
      ))}
    </AppIcon>
  ),
  music: (
    <AppIcon from="#fb7185" to="#e11d48">
      <path d="M20 31V15l14-3v16" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="17" cy="31" r="4" fill="#fff" />
      <circle cx="31" cy="28" r="4" fill="#fff" />
    </AppIcon>
  ),
  maps: (
    <AppIcon from="#6ee7b7" to="#0d9488">
      <path d="M8 14l10-4 12 4 10-4v24l-10 4-12-4-10 4z" fill="#ecfdf5" />
      <path d="M18 10v24M30 14v24" stroke="#99f6e4" strokeWidth="1.5" />
      <path d="M24 16a5 5 0 0 1 5 5c0 4-5 9-5 9s-5-5-5-9a5 5 0 0 1 5-5z" fill="#ef4444" />
      <circle cx="24" cy="21" r="1.8" fill="#fff" />
    </AppIcon>
  ),
  settings: (
    <AppIcon from="#a1a1aa" to="#3f3f46">
      <g fill="#e4e4e7" transform="translate(24 24)">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="-2.5" y="-15" width="5" height="7" rx="1.2" transform={`rotate(${i * 45})`} />
        ))}
        <circle r="10" />
      </g>
      <circle cx="24" cy="24" r="4.5" fill="#52525b" />
    </AppIcon>
  ),
  trash: (
    <AppIcon from="#e4e4e7" to="#a1a1aa">
      <path d="M15 17h18l-1.6 18a3 3 0 0 1-3 2.7h-8.8a3 3 0 0 1-3-2.7z" fill="#fafafa" stroke="#71717a" strokeWidth="1.5" />
      <path d="M13 15h22M21 12h6" stroke="#52525b" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M21 21l.6 12M27 21l-.6 12" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
    </AppIcon>
  ),
};

const apps: Array<Omit<DockItem, "icon" | "onSelect" | "active">> = [
  { id: "files", label: "Files", group: "apps" },
  { id: "mail", label: "Mail", badge: 12, group: "apps" },
  { id: "messages", label: "Messages", badge: 3, group: "apps" },
  { id: "calendar", label: "Calendar", group: "apps" },
  { id: "photos", label: "Photos", group: "apps" },
  { id: "music", label: "Music", group: "apps" },
  { id: "maps", label: "Maps (offline)", disabled: true, group: "apps" },
  { id: "settings", label: "Settings", group: "system" },
  { id: "trash", label: "Trash", group: "system" },
];

function LineIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      <path d={d} />
    </svg>
  );
}

const tools: Array<Omit<DockItem, "onSelect" | "active">> = [
  { id: "home", label: "Home", icon: <LineIcon d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /> },
  { id: "search", label: "Search", icon: <LineIcon d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" /> },
  { id: "inbox", label: "Inbox", badge: "New", icon: <LineIcon d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 13h5l1 2h4l1-2h5" /> },
  { id: "library", label: "Library", icon: <LineIcon d="M5 4h4v16H5zM10 4h4v16h-4zM15.5 5l3.8-1 2.7 15.6-3.8.9z" /> },
  { id: "profile", label: "Profile", group: "account", icon: <LineIcon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0" /> },
];

export default function MagnifyDockDemo() {
  const [app, setApp] = useState("music");
  const [read, setRead] = useState<string[]>([]);
  const [tool, setTool] = useState("home");

  const appItems: DockItem[] = apps.map((item) => ({
    ...item,
    icon: appIcons[item.id],
    active: item.id === app,
    badge: read.includes(item.id) ? undefined : item.badge,
    onSelect: () => {
      setApp(item.id);
      setRead((ids) => (ids.includes(item.id) ? ids : [...ids, item.id]));
    },
  }));

  const toolItems: DockItem[] = tools.map((item) => ({
    ...item,
    active: item.id === tool,
    onSelect: () => setTool(item.id),
  }));

  const appLabel = apps.find((item) => item.id === app)?.label ?? app;
  const toolLabel = tools.find((item) => item.id === tool)?.label ?? tool;

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3 py-4">
      <MagnifyDock items={appItems} label="Apps" tile="bare" />
      <p aria-live="polite" className="text-sm text-muted">
        Selected: <span className="font-medium text-foreground">{appLabel}</span>
      </p>

      <MagnifyDock items={toolItems} label="Workspace" baseSize={40} magnification={1.55} distance={110} />
      <p aria-live="polite" className="text-xs text-muted">
        Smaller glass variant. Current view: <span className="font-medium text-foreground">{toolLabel}</span>
      </p>
    </div>
  );
}
