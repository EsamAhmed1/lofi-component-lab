"use client";

import { useMemo, useState } from "react";
import { CommandPalette, type CommandItem } from "@/components/ui/command-palette";

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function CommandPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  const items = useMemo<CommandItem[]>(() => {
    const run = (label: string) => () => setLast(label);
    return [
      { id: "new-project", group: "Actions", label: "New project", description: "Start from a blank canvas", shortcut: ["⌘", "N"], icon: <Icon d="M10 4v12M4 10h12" />, onSelect: run("New project") },
      { id: "invite", group: "Actions", label: "Invite teammates", keywords: ["share", "members"], icon: <Icon d="M7 9a3 3 0 100-6 3 3 0 000 6zM2 17a5 5 0 0110 0M14 7v6M11 10h6" />, onSelect: run("Invite teammates") },
      { id: "export", group: "Actions", label: "Export as PDF", keywords: ["download", "print"], shortcut: ["⌘", "E"], icon: <Icon d="M10 3v10M6 9l4 4 4-4M4 17h12" />, onSelect: run("Export as PDF") },
      { id: "archive", group: "Actions", label: "Archive workspace", description: "Only owners can do this", disabled: true, icon: <Icon d="M3 5h14v3H3zM5 8v8h10V8M8 11h4" />, onSelect: run("Archive workspace") },
      { id: "dashboard", group: "Navigation", label: "Go to dashboard", keywords: ["home"], shortcut: ["G", "D"], icon: <Icon d="M3 10l7-6 7 6M5 9v7h10V9" />, onSelect: run("Go to dashboard") },
      { id: "billing", group: "Navigation", label: "Go to billing", keywords: ["invoice", "plan", "payment"], shortcut: ["G", "B"], icon: <Icon d="M3 6h14v9H3zM3 9h14" />, onSelect: run("Go to billing") },
      { id: "settings", group: "Navigation", label: "Open settings", keywords: ["preferences", "account"], shortcut: ["⌘", ","], icon: <Icon d="M10 13a3 3 0 100-6 3 3 0 000 6zM10 2v2M10 16v2M2 10h2M16 10h2" />, onSelect: run("Open settings") },
      { id: "light", group: "Theme", label: "Switch to light theme", icon: <Icon d="M10 14a4 4 0 100-8 4 4 0 000 8zM10 1v2M10 17v2M1 10h2M17 10h2" />, onSelect: run("Light theme") },
      { id: "dark", group: "Theme", label: "Switch to dark theme", icon: <Icon d="M16 12A7 7 0 018 4a7 7 0 108 8z" />, onSelect: run("Dark theme") },
      { id: "docs", group: "Help", label: "Search documentation", keywords: ["help", "guide"], icon: <Icon d="M4 4h9l3 3v9H4zM7 9h6M7 12h6" />, onSelect: run("Search documentation") },
      { id: "support", group: "Help", label: "Contact support", keywords: ["chat", "email"], icon: <Icon d="M3 5h14v9H8l-4 3v-3H3z" />, onSelect: run("Contact support") },
    ];
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-5 py-10 text-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm text-muted shadow-sm transition-colors hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="9" r="6" />
          <path d="M14 14l4 4" strokeLinecap="round" />
        </svg>
        <span className="flex-1">Search or jump to…</span>
        <kbd className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px]">Ctrl K</kbd>
      </button>
      <p className="text-sm text-muted">
        Press <kbd className="rounded border border-border px-1 font-mono text-xs">⌘K</kbd> or{" "}
        <kbd className="rounded border border-border px-1 font-mono text-xs">Ctrl K</kbd> anywhere on this page. Try typing “bill” or “nwp”.
      </p>
      <p aria-live="polite" className="min-h-6 text-sm font-medium">
        {last ? <>Ran: <span className="text-accent">{last}</span></> : null}
      </p>
      <CommandPalette open={open} onOpenChange={setOpen} items={items} />
    </div>
  );
}
