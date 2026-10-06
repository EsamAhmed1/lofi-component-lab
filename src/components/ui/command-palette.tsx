"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export interface CommandItem {
  /** Unique id. */
  id: string;
  /** Text shown and matched against the query. */
  label: string;
  /** Heading the item is grouped under. */
  group?: string;
  /** Secondary line under the label. */
  description?: string;
  /** Extra words that should also match (synonyms, ids). */
  keywords?: string[];
  /** Keys shown on the right, e.g. ["⌘", "S"]. Display only. */
  shortcut?: string[];
  /** Icon shown before the label. */
  icon?: ReactNode;
  disabled?: boolean;
  /** Runs when the item is chosen with Enter or a click. */
  onSelect: () => void;
}

export interface CommandPaletteProps {
  /** Whether the palette is open (controlled). */
  open: boolean;
  /** Called when the palette asks to open or close. */
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
  /** Shown when nothing matches the query. */
  emptyMessage?: string;
  /** Letter that toggles the palette with ⌘/Ctrl. Pass false to disable. */
  hotkey?: string | false;
  /** Show skeleton rows while items are loading. */
  loading?: boolean;
  /** Accessible name of the dialog. */
  label?: string;
  /** Close after an item is selected. */
  closeOnSelect?: boolean;
  className?: string;
}

/** Higher is a better match; -1 means no match. */
function scoreItem(item: CommandItem, query: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const label = item.label.toLowerCase();
  if (label.startsWith(q)) return 4;
  if (label.split(/\s+/).some((word) => word.startsWith(q))) return 3;
  if (label.includes(q)) return 2;
  if (item.keywords?.some((k) => k.toLowerCase().includes(q))) return 1.5;
  if (item.description?.toLowerCase().includes(q)) return 1;
  // Loose match: every typed character appears in order ("nwp" → "New project").
  let i = 0;
  for (const ch of label) if (ch === q[i]) i++;
  return i === q.length ? 0.5 : -1;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-accent/20 text-inherit">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

/**
 * A ⌘K command menu built on the native <dialog> element (focus trap, Escape,
 * top layer and inert background for free) with the ARIA combobox pattern.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  placeholder = "Type a command or search…",
  emptyMessage = "No results found.",
  hotkey = "k",
  loading = false,
  label = "Command palette",
  closeOnSelect = true,
  className,
}: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const safe = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-");
  const optionId = (id: string) => `${baseId}-option-${safe(id)}`;

  // Filter, rank and group the items. Groups keep their original order.
  const groups = useMemo(() => {
    const ranked = items
      .map((item, index) => ({ item, index, score: scoreItem(item, query.trim()) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score || a.index - b.index);
    const order = [...new Set(items.map((i) => i.group ?? ""))];
    return order
      .map((name) => ({ name, items: ranked.filter((r) => (r.item.group ?? "") === name).map((r) => r.item) }))
      .filter((g) => g.items.length > 0);
  }, [items, query]);

  const visible = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const enabled = useMemo(() => visible.filter((i) => !i.disabled), [visible]);
  const active = enabled.find((i) => i.id === activeId) ?? enabled[0] ?? null;

  // Open and close the native dialog from the controlled prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    if (!hotkey) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === hotkey.toLowerCase()) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey, open, onOpenChange]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!active) return;
    const el = document.getElementById(optionId(active.id));
    el?.scrollIntoView({ block: "nearest" });
    // optionId is derived from a stable useId value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const handleClose = () => {
    document.documentElement.style.overflow = "";
    setQuery("");
    setActiveId(null);
    if (open) onOpenChange(false);
    returnFocus.current?.focus?.();
  };

  const choose = (item: CommandItem) => {
    if (item.disabled) return;
    item.onSelect();
    if (closeOnSelect) onOpenChange(false);
  };

  const move = (step: number) => {
    if (enabled.length === 0) return;
    const current = active ? enabled.indexOf(active) : -1;
    const next = (current + step + enabled.length) % enabled.length;
    setActiveId(enabled[next].id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        if (enabled[0]) {
          event.preventDefault();
          setActiveId(enabled[0].id);
        }
        break;
      case "End":
        if (enabled.length) {
          event.preventDefault();
          setActiveId(enabled[enabled.length - 1].id);
        }
        break;
      case "Enter":
        if (active) {
          event.preventDefault();
          choose(active);
        }
        break;
      case "Escape":
        // First Escape clears the query; the second closes the dialog.
        if (query) {
          event.preventDefault();
          setQuery("");
        }
        break;
    }
  };

  const count = visible.length;

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onClose={handleClose}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === dialogRef.current) onOpenChange(false);
      }}
      className={cn(
        "m-0 mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl overflow-visible bg-transparent p-0 text-foreground",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "opacity-100 transition-[opacity,scale] duration-150 ease-out starting:open:scale-95 starting:open:opacity-0 motion-reduce:transition-none",
        className,
      )}
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active ? optionId(active.id) : undefined}
            aria-label={label}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveId(null);
            }}
            onKeyDown={onKeyDown}
            className="h-14 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted sm:inline-block">
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Results"
          aria-busy={loading || undefined}
          className="max-h-[min(60vh,380px)] overflow-y-auto overscroll-contain p-2"
        >
          {loading ? (
            <div className="space-y-2 p-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
              ))}
            </div>
          ) : count === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted">{emptyMessage}</p>
          ) : (
            groups.map((group) => {
              const headingId = `${baseId}-group-${safe(group.name || "default")}`;
              return (
                <div key={group.name || "default"} role="group" aria-labelledby={group.name ? headingId : undefined} className="mb-1 last:mb-0">
                  {group.name ? (
                    <div id={headingId} className="px-3 pb-1 pt-2 text-xs font-medium text-muted">
                      {group.name}
                    </div>
                  ) : null}
                  {group.items.map((item) => {
                    const selected = active?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        id={optionId(item.id)}
                        role="option"
                        aria-selected={selected}
                        aria-disabled={item.disabled || undefined}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseMove={() => !item.disabled && !selected && setActiveId(item.id)}
                        onClick={() => choose(item)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                          selected && "bg-accent/12 text-foreground",
                          item.disabled && "cursor-not-allowed opacity-50",
                        )}
                      >
                        {item.icon ? (
                          <span aria-hidden className={cn("grid size-7 shrink-0 place-items-center rounded-md bg-surface-2 text-muted", selected && "text-accent")}>
                            {item.icon}
                          </span>
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            <Highlight text={item.label} query={query.trim()} />
                          </span>
                          {item.description ? (
                            <span className="block truncate text-xs text-muted">{item.description}</span>
                          ) : null}
                        </span>
                        {item.shortcut ? (
                          <span className="hidden shrink-0 gap-1 sm:flex" aria-label={`Shortcut ${item.shortcut.join(" ")}`}>
                            {item.shortcut.map((key) => (
                              <kbd key={key} className="min-w-5 rounded border border-border px-1 text-center font-mono text-[11px] text-muted">
                                {key}
                              </kbd>
                            ))}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="hidden items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted sm:flex">
          <span><kbd className="font-mono">↑↓</kbd> to move</span>
          <span><kbd className="font-mono">↵</kbd> to select</span>
          <span><kbd className="font-mono">esc</kbd> to close</span>
        </div>
        <p className="sr-only" aria-live="polite">
          {loading ? "Loading results" : `${count} ${count === 1 ? "result" : "results"}`}
        </p>
      </div>
    </dialog>
  );
}
