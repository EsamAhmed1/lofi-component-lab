"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export interface IslandNavItem {
  id: string;
  label: string;
  /** Renders an <a>. Without it the item is a button that calls onNavigate. */
  href?: string;
  icon?: ReactNode;
  /** Secondary line shown in the menu and search panels. */
  description?: string;
}

export interface IslandNavLink extends IslandNavItem {
  /** Turns the link into a button that opens a mega menu of these links. */
  children?: IslandNavLink[];
}

export interface IslandNotification {
  id: string;
  title: string;
  body: string;
  /** Display text, e.g. "2m ago". */
  time: string;
  unread?: boolean;
}

export type IslandSearchItem = IslandNavItem;

export interface IslandNavbarProps {
  /** Logo or wordmark, usually a home link. */
  brand: ReactNode;
  /** 3 to 5 links. A link with `children` opens a mega menu. */
  links: IslandNavLink[];
  /** Id of the current page. A parent link is highlighted when a child is active. */
  activeId?: string;
  /** Called when a link, menu item or search result is chosen. */
  onNavigate?: (item: IslandNavItem, event: MouseEvent<HTMLElement>) => void;
  /** Shows a bell button and a notifications panel. */
  notifications?: IslandNotification[];
  onNotificationClick?: (notification: IslandNotification, event: MouseEvent<HTMLButtonElement>) => void;
  /** Shows a "Mark all read" button when there are unread items. */
  onMarkAllRead?: () => void;
  /** Shows a search button and a panel that filters these items. */
  searchItems?: IslandSearchItem[];
  /** Called as the search query changes (for remote search or analytics). */
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  /** Extra controls on the right, e.g. an avatar button. Also shown in the mobile panel. */
  actions?: ReactNode;
  /** "sticky" pins the island to the top of the scroll container. */
  position?: "static" | "sticky";
  /** Solid black pill, or frosted glass that follows the colour scheme. */
  tone?: "dark" | "glass";
  /** Accessible name of the nav landmark. */
  label?: string;
  className?: string;
}

type ToneStyles = {
  shell: string;
  link: string;
  muted: string;
  hover: string;
  indicator: string;
  divider: string;
  tile: string;
  field: string;
  spot: string;
  ringFix: string;
};

const tones: Record<"dark" | "glass", ToneStyles> = {
  dark: {
    shell:
      "bg-zinc-950 text-white ring-1 ring-white/10 shadow-[0_20px_44px_-14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]",
    link: "text-zinc-300 hover:text-white data-[active=true]:text-white aria-[current=page]:text-white",
    muted: "text-zinc-400",
    hover: "hover:bg-white/10",
    indicator: "bg-white/15",
    divider: "bg-white/15",
    tile: "bg-white/10 text-zinc-100",
    field: "bg-white/10 text-white placeholder:text-zinc-400",
    spot: "rgba(255, 255, 255, 0.14)",
    ringFix: "ring-zinc-950",
  },
  glass: {
    shell:
      "bg-surface/90 text-foreground ring-1 ring-border backdrop-blur-xl backdrop-saturate-150 shadow-[0_20px_44px_-18px_rgba(0,0,0,0.35)]",
    link: "text-muted hover:text-foreground data-[active=true]:text-foreground aria-[current=page]:text-foreground",
    muted: "text-muted",
    hover: "hover:bg-foreground/[0.06]",
    indicator: "bg-foreground/10",
    divider: "bg-border",
    tile: "bg-surface-2 text-foreground",
    field: "bg-surface-2 text-foreground placeholder:text-muted",
    spot: "color-mix(in oklab, var(--accent) 22%, transparent)",
    ringFix: "ring-surface",
  },
};

const focusRing = "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-ring";
const FOCUSABLE = 'input, a[href], button:not([disabled]), [tabindex="0"]';
// Spring-like curve with a small overshoot, used for the size morph and indicator.
const SPRING = "cubic-bezier(0.32, 1.2, 0.42, 1)";

const safe = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-");
/** Element id of a panel. useId values contain colons, so they are sanitised. */
const panelIdFor = (baseId: string, key: string) => `${safe(baseId)}-panel-${safe(key)}`;

function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.5 13.5 17 17" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8a5 5 0 0 1 10 0c0 4 1.5 5.5 1.5 5.5h-13S5 12 5 8Z" />
      <path d="M8.5 16.5a1.6 1.6 0 0 0 3 0" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className={cn("size-3 transition-transform duration-300 motion-reduce:transition-none", open && "rotate-180")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 4.5 6 7.5l3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A floating pill navbar that morphs like the iPhone Dynamic Island. The pill
 * measures its content with a ResizeObserver and animates width, height and
 * radius to fit it, so opening a mega menu, search or notifications panel
 * grows the island in place. Below 640px of container width it collapses to a
 * logo and a menu button that opens a full-width panel.
 */
export function IslandNavbar({
  brand,
  links,
  activeId,
  onNavigate,
  notifications,
  onNotificationClick,
  onMarkAllRead,
  searchItems,
  onSearch,
  searchPlaceholder = "Search docs, features, pages…",
  actions,
  position = "static",
  tone = "dark",
  label = "Main",
  className,
}: IslandNavbarProps) {
  const t = tones[tone];
  const baseId = useId();
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const outerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const triggerRef = useRef<HTMLElement | null>(null);
  const activeTopRef = useRef<string | undefined>(undefined);
  const placed = useRef(false);
  const frame = useRef<number | null>(null);

  const panelId = (key: string) => panelIdFor(baseId, key);
  const activeTop = links.find((l) => l.id === activeId || l.children?.some((c) => c.id === activeId))?.id;
  const unread = notifications?.filter((n) => n.unread).length ?? 0;
  const hasSearch = searchItems !== undefined || onSearch !== undefined;

  // Slide the active pill under the current top-level link.
  const placeIndicator = useCallback(() => {
    const el = indicatorRef.current;
    if (!el) return;
    const id = activeTopRef.current;
    const item = id ? itemRefs.current.get(id) : undefined;
    if (!item || item.offsetWidth === 0) {
      el.style.opacity = "0";
      return;
    }
    if (!placed.current) {
      // First placement jumps into position instead of sliding in from 0.
      el.style.transition = "none";
      el.style.left = `${item.offsetLeft}px`;
      el.style.width = `${item.offsetWidth}px`;
      void el.offsetWidth;
      el.style.transition = "";
      placed.current = true;
    }
    el.style.left = `${item.offsetLeft}px`;
    el.style.width = `${item.offsetWidth}px`;
    el.style.opacity = "1";
  }, []);

  useLayoutEffect(() => {
    activeTopRef.current = activeTop;
    placeIndicator();
  }, [activeTop, placeIndicator]);

  // Measure the content; the shell animates to this size.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const w = Math.ceil(rect.width);
      const h = Math.ceil(rect.height);
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
      placeIndicator();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [placeIndicator]);

  // Close a panel that no longer fits the layout (mobile panel on a wide
  // screen, desktop panel on a narrow one).
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const narrow = entry.contentRect.width < 640;
      setOpen((current) =>
        current && (current === "mobile") !== narrow ? null : current,
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Move focus into the panel that just opened.
  useEffect(() => {
    if (!open) return;
    const panel = document.getElementById(panelIdFor(baseId, open));
    const target = panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
    target?.focus({ preventScroll: true });
  }, [open, baseId]);

  // A click outside the island closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: globalThis.PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpen(null);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
  }, []);

  const close = (returnFocus: boolean) => {
    setOpen(null);
    setQuery("");
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const toggle = (key: string, event: MouseEvent<HTMLButtonElement>) => {
    if (open === key) {
      close(false);
      return;
    }
    triggerRef.current = event.currentTarget;
    setQuery("");
    setOpen(key);
  };

  const navigate = (item: IslandNavItem, event: MouseEvent<HTMLElement>) => {
    onNavigate?.(item, event);
    if (open) close(true);
  };

  // Spotlight glow: CSS variables updated inside rAF, never React state.
  const setSpot = (x: number, y: number, on: boolean) => {
    const el = shellRef.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--sx", `${x}px`);
      el.style.setProperty("--sy", `${y}px`);
      el.style.setProperty("--spot", on ? "1" : "0");
    });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    setSpot(event.clientX - rect.left, event.clientY - rect.top, true);
  };

  const onFocusIn = (event: FocusEvent<HTMLDivElement>) => {
    const shell = shellRef.current;
    if (!shell || !(event.target instanceof HTMLElement)) return;
    const a = shell.getBoundingClientRect();
    const b = event.target.getBoundingClientRect();
    setSpot(b.left - a.left + b.width / 2, b.top - a.top + b.height / 2, true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close(true);
    }
  };

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    // Only react to focus moving to another element (Tab). A null
    // relatedTarget (Safari clicks) is handled by the outside-click listener.
    const next = event.relatedTarget as Node | null;
    if (next && !navRef.current?.contains(next)) {
      setSpot(0, 0, false);
      if (open) close(false);
    }
  };

  const q = query.trim().toLowerCase();
  const results = (searchItems ?? [])
    .filter((item) => !q || item.label.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q))
    .slice(0, q ? 6 : 5);

  // Arrow keys move between the search box and its results.
  const onSearchKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const panel = document.getElementById(panelId("search"));
    if (!panel) return;
    const stops = Array.from(panel.querySelectorAll<HTMLElement>("input, [data-island-result]"));
    const index = stops.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === "ArrowDown" ? Math.min(index + 1, stops.length - 1) : Math.max(index - 1, 0);
    stops[next]?.focus();
  };

  const panelClass = (width: string) =>
    cn(
      "min-w-full border-t p-2 outline-none",
      tone === "dark" ? "border-white/10" : "border-border",
      width,
      // Content fades in after the size morph has started.
      "opacity-100 transition-[opacity,translate,filter] delay-150 duration-300 ease-out",
      "starting:translate-y-1 starting:opacity-0 starting:blur-[2px]",
      "motion-reduce:transition-none motion-reduce:delay-0",
    );

  const itemLink = (
    item: IslandNavItem,
    extra: string,
    children: ReactNode,
    attrs: Record<`data-${string}`, string | boolean> = {},
  ) => {
    const current = item.id === activeId ? ("page" as const) : undefined;
    const shared = {
      "aria-current": current,
      className: cn(extra, focusRing),
      onClick: (event: MouseEvent<HTMLElement>) => navigate(item, event),
      ...attrs,
    };
    return item.href ? (
      <a href={item.href} {...shared}>
        {children}
      </a>
    ) : (
      <button type="button" {...shared}>
        {children}
      </button>
    );
  };

  const rowContent = (item: IslandNavItem, showDescription: boolean) => (
    <>
      {item.icon ? (
        <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-xl [&>svg]:size-[18px]", t.tile)}>
          {item.icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.label}</span>
        {showDescription && item.description ? (
          <span className={cn("mt-0.5 block text-xs leading-snug", t.muted)}>{item.description}</span>
        ) : null}
      </span>
    </>
  );

  const rowClass = cn(
    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
    t.hover,
    tone === "dark" ? "aria-[current=page]:bg-white/10" : "aria-[current=page]:bg-foreground/[0.06]",
  );

  const iconButton = cn(
    "relative grid size-9 shrink-0 place-items-center rounded-full transition-colors",
    t.link,
    t.hover,
    focusRing,
  );

  return (
    <div
      ref={outerRef}
      className={cn(
        "@container z-30 h-16 w-full",
        position === "sticky" ? "sticky top-0" : "relative",
        className,
      )}
    >
      <nav
        ref={navRef}
        aria-label={label}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className="pointer-events-none absolute inset-x-0 top-2 flex justify-center"
      >
        <div
          ref={shellRef}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setSpot(0, 0, false)}
          onFocus={onFocusIn}
          className={cn(
            "pointer-events-auto relative isolate flex items-start justify-center overflow-hidden [--spot:0]",
            "transition-[width,height,border-radius] duration-[560ms] motion-reduce:transition-none",
            t.shell,
          )}
          style={{
            width: size?.w,
            height: size?.h,
            borderRadius: open ? 26 : 24,
            transitionTimingFunction: SPRING,
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-(--spot) transition-opacity duration-300"
            style={{
              background: `radial-gradient(220px circle at var(--sx, 50%) var(--sy, 50%), ${t.spot}, transparent 70%)`,
            }}
          />

          <div ref={contentRef} className="w-max shrink-0">
            {/* Bar */}
            <div className="flex h-12 items-center justify-center gap-1 px-1.5">
              <div className="flex shrink-0 items-center pl-1.5 pr-1">{brand}</div>

              <div className="relative hidden @min-[640px]:block">
                <span
                  ref={indicatorRef}
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute top-1/2 h-8 -translate-y-1/2 rounded-full opacity-0",
                    "transition-[left,width,opacity] duration-500 motion-reduce:transition-none",
                    t.indicator,
                  )}
                  style={{ transitionTimingFunction: SPRING }}
                />
                <ul className="flex items-center">
                  {links.map((link) => {
                    const key = `menu:${link.id}`;
                    const isActive = link.id === activeTop;
                    const base = cn(
                      "relative inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-sm font-medium whitespace-nowrap transition-colors @min-[768px]:px-3.5",
                      t.link,
                      !isActive && t.hover,
                    );
                    return (
                      <li
                        key={link.id}
                        ref={(node) => {
                          if (node) itemRefs.current.set(link.id, node);
                          else itemRefs.current.delete(link.id);
                        }}
                        className="relative"
                      >
                        {link.children?.length ? (
                          <button
                            type="button"
                            aria-expanded={open === key}
                            aria-controls={panelId(key)}
                            data-active={isActive}
                            onClick={(event) => toggle(key, event)}
                            className={cn(base, focusRing)}
                          >
                            {link.label}
                            <Chevron open={open === key} />
                          </button>
                        ) : (
                          itemLink(link, base, link.label, { "data-active": isActive })
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="hidden items-center gap-0.5 @min-[640px]:flex">
                <span aria-hidden className={cn("mx-1 h-5 w-px", t.divider)} />
                {hasSearch ? (
                  <button
                    type="button"
                    aria-label="Search"
                    aria-expanded={open === "search"}
                    aria-controls={panelId("search")}
                    onClick={(event) => toggle("search", event)}
                    className={iconButton}
                  >
                    <SearchIcon />
                  </button>
                ) : null}
                {notifications ? (
                  <button
                    type="button"
                    aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
                    aria-expanded={open === "notifications"}
                    aria-controls={panelId("notifications")}
                    onClick={(event) => toggle("notifications", event)}
                    className={iconButton}
                  >
                    <BellIcon />
                    {unread ? (
                      <span aria-hidden className={cn("absolute right-2 top-2 size-2 rounded-full bg-sky-400 ring-2", t.ringFix)} />
                    ) : null}
                  </button>
                ) : null}
                {actions ? <div className="flex items-center gap-1 pl-1">{actions}</div> : null}
              </div>

              {/* Mobile: logo + menu button */}
              <span aria-hidden className="w-10 @min-[640px]:hidden" />
              <button
                type="button"
                aria-label="Menu"
                aria-expanded={open === "mobile"}
                aria-controls={panelId("mobile")}
                onClick={(event) => toggle("mobile", event)}
                className={cn(iconButton, "@min-[640px]:hidden")}
              >
                <span aria-hidden className="relative block h-3 w-4">
                  <span
                    className={cn(
                      "absolute left-0 h-0.5 w-4 rounded-full bg-current transition-transform duration-300 motion-reduce:transition-none",
                      open === "mobile" ? "top-[5px] rotate-45" : "top-0.5",
                    )}
                  />
                  <span
                    className={cn(
                      "absolute left-0 h-0.5 w-4 rounded-full bg-current transition-transform duration-300 motion-reduce:transition-none",
                      open === "mobile" ? "top-[5px] -rotate-45" : "top-[8px]",
                    )}
                  />
                </span>
              </button>
            </div>

            {/* Mega menus, one per link with children */}
            {links
              .filter((link) => link.children?.length)
              .map((link) => {
                const key = `menu:${link.id}`;
                return (
                  <div
                    key={key}
                    id={panelId(key)}
                    hidden={open !== key}
                    tabIndex={-1}
                    className={panelClass("w-[min(36rem,calc(100cqw_-_1rem))]")}
                  >
                    <p className={cn("px-2.5 pb-1 pt-1.5 text-xs font-medium", t.muted)}>{link.label}</p>
                    <ul className="grid gap-1 @min-[640px]:grid-cols-2">
                      {link.children?.map((child) => (
                        <li key={child.id}>{itemLink(child, rowClass, rowContent(child, true))}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}

            {/* Search */}
            {hasSearch ? (
              <div
                id={panelId("search")}
                hidden={open !== "search"}
                tabIndex={-1}
                onKeyDown={onSearchKeyDown}
                className={panelClass("w-[min(26rem,calc(100cqw_-_1rem))]")}
              >
                <div role="search" className="relative">
                  <label htmlFor={`${panelId("search")}-input`} className="sr-only">
                    Search
                  </label>
                  <span aria-hidden className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2", t.muted)}>
                    <SearchIcon />
                  </span>
                  <input
                    id={`${panelId("search")}-input`}
                    type="search"
                    autoComplete="off"
                    spellCheck={false}
                    value={query}
                    placeholder={searchPlaceholder}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      onSearch?.(event.target.value);
                    }}
                    className={cn("h-11 w-full rounded-xl pl-10 pr-3 text-sm", t.field, focusRing)}
                  />
                </div>
                <p className={cn("px-2.5 pb-1 pt-3 text-xs font-medium", t.muted)}>{q ? "Results" : "Quick links"}</p>
                {results.length ? (
                  <ul className="grid gap-0.5">
                    {results.map((item) => (
                      <li key={item.id}>{itemLink(item, rowClass, rowContent(item, true), { "data-island-result": "" })}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={cn("px-2.5 py-4 text-sm", t.muted)}>No results for “{query.trim()}”.</p>
                )}
                <p className="sr-only" role="status" aria-live="polite">
                  {open === "search" ? `${results.length} ${results.length === 1 ? "result" : "results"}` : ""}
                </p>
              </div>
            ) : null}

            {/* Notifications */}
            {notifications ? (
              <div
                id={panelId("notifications")}
                hidden={open !== "notifications"}
                tabIndex={-1}
                aria-labelledby={`${panelId("notifications")}-title`}
                role="group"
                className={panelClass("w-[min(24rem,calc(100cqw_-_1rem))]")}
              >
                <div className="flex items-center justify-between gap-3 px-2.5 pb-1.5 pt-1">
                  <p id={`${panelId("notifications")}-title`} className="text-sm font-semibold">
                    Notifications
                    <span className={cn("ml-2 text-xs font-normal", t.muted)}>{unread ? `${unread} unread` : "All read"}</span>
                  </p>
                  {onMarkAllRead && unread > 0 ? (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className={cn("rounded-md px-1.5 py-1 text-xs font-medium underline-offset-2 hover:underline", t.link, focusRing)}
                    >
                      Mark all read
                    </button>
                  ) : null}
                </div>
                {notifications.length ? (
                  <ul className="grid gap-0.5">
                    {notifications.map((n) => {
                      const inner = (
                        <>
                          <span
                            aria-hidden
                            className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.unread ? "bg-sky-400" : "bg-transparent")}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="truncate text-sm font-medium">
                                {n.unread ? <span className="sr-only">Unread: </span> : null}
                                {n.title}
                              </span>
                              <span className={cn("shrink-0 text-xs", t.muted)}>{n.time}</span>
                            </span>
                            <span className={cn("mt-0.5 block text-xs leading-snug", t.muted)}>{n.body}</span>
                          </span>
                        </>
                      );
                      const cls = cn("flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors", t.hover);
                      return (
                        <li key={n.id}>
                          {onNotificationClick ? (
                            <button type="button" onClick={(event) => onNotificationClick(n, event)} className={cn(cls, focusRing)}>
                              {inner}
                            </button>
                          ) : (
                            <div className={cls}>{inner}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={cn("px-2.5 py-4 text-sm", t.muted)}>You&apos;re all caught up.</p>
                )}
              </div>
            ) : null}

            {/* Mobile panel */}
            <div
              id={panelId("mobile")}
              hidden={open !== "mobile"}
              tabIndex={-1}
              className={panelClass("w-[calc(100cqw_-_1rem)]")}
            >
              <ul className="grid max-h-[min(60vh,24rem)] gap-0.5 overflow-y-auto overscroll-contain">
                {links.map((link) =>
                  link.children?.length ? (
                    <li key={link.id}>
                      <p className={cn("px-2.5 pb-1 pt-2 text-xs font-medium", t.muted)}>{link.label}</p>
                      <ul className="grid gap-0.5">
                        {link.children.map((child) => (
                          <li key={child.id}>{itemLink(child, rowClass, rowContent(child, false))}</li>
                        ))}
                      </ul>
                    </li>
                  ) : (
                    <li key={link.id}>{itemLink(link, rowClass, rowContent(link, false))}</li>
                  ),
                )}
              </ul>
              {actions ? (
                <div className={cn("mt-2 flex items-center justify-end gap-2 border-t px-1 pt-2", tone === "dark" ? "border-white/10" : "border-border")}>
                  {actions}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
