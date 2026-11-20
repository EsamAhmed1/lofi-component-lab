"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export interface DockItem {
  /** Stable key. */
  id: string;
  /** Shown in the tooltip and used as the accessible name. */
  label: string;
  /** Icon or full tile artwork. Decorative: the label names the item. */
  icon: ReactNode;
  /** Renders a link when set, otherwise a button. */
  href?: string;
  /** Called when the item is activated (click, Enter or Space). */
  onSelect?: () => void;
  /** Small count or text in a red badge, e.g. 3 or "New". */
  badge?: number | string;
  /** Marks the current app or page with a dot and aria-current. */
  active?: boolean;
  disabled?: boolean;
  /** Items with a different group from the previous item get a divider before them. */
  group?: string;
}

export interface MagnifyDockProps {
  items: DockItem[];
  /** Scale of the icon right under the pointer. 1 turns magnification off. */
  magnification?: number;
  /** How far (px) from the pointer neighbours still grow. */
  distance?: number;
  /** Resting icon size in px. */
  baseSize?: number;
  /** "inline" sits in the flow; "bottom-fixed" pins it to the bottom of the viewport. */
  position?: "inline" | "bottom-fixed";
  /** "glass" centres the icon on a frosted tile; "bare" lets the icon fill the tile (app icons). */
  tile?: "glass" | "bare";
  /** Accessible name of the nav landmark. */
  label?: string;
  /** Called after any item is activated. */
  onSelect?: (item: DockItem) => void;
  className?: string;
  ref?: Ref<HTMLElement>;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const COARSE_POINTER = "(hover: none), (pointer: coarse)";

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Raised cosine: 1 at the pointer, easing smoothly to 0 at `distance`. */
function falloff(d: number, distance: number) {
  if (d >= distance) return 0;
  return (1 + Math.cos((Math.PI * d) / distance)) / 2;
}

/** Widest the row can get while magnified, so we know if it fits without scrolling. */
function magnifiedExtra(count: number, base: number, gap: number, scale: number, distance: number) {
  if (scale <= 1 || count === 0) return 0;
  const step = base + gap;
  let worst = 0;
  for (let k = 0; k <= (count - 1) * 2; k++) {
    const pointer = (k / 2) * step;
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += base * (scale - 1) * falloff(Math.abs(pointer - i * step), distance);
    }
    worst = Math.max(worst, sum);
  }
  return worst;
}

function badgeText(badge: number | string) {
  return typeof badge === "number" && badge > 99 ? "99+" : String(badge);
}

const bounceFrames: Keyframe[] = [
  { transform: "translateY(0)", easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
  { transform: "translateY(-42%)", offset: 0.28, easing: "cubic-bezier(0.6, 0, 0.8, 0.4)" },
  { transform: "translateY(0)", offset: 0.52, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
  { transform: "translateY(-16%)", offset: 0.72, easing: "cubic-bezier(0.6, 0, 0.8, 0.4)" },
  { transform: "translateY(0)" },
];

// Scroll mode clips vertical overflow, so it uses a press-and-pop instead of a jump.
const popFrames: Keyframe[] = [
  { transform: "scale(1)" },
  { transform: "scale(0.86)", offset: 0.3 },
  { transform: "scale(1.08)", offset: 0.65 },
  { transform: "scale(1)" },
];

/**
 * macOS-style glass dock. Icons grow with a cosine falloff around the pointer
 * (or the keyboard focus), neighbours grow too and the dock widens. Sizes are
 * eased in requestAnimationFrame and written to a CSS variable per item, so
 * React never re-renders while the pointer moves.
 *
 * When the dock cannot fit (even unmagnified plus headroom) it switches to a
 * scroll mode: no magnification, horizontal scroll with snap and labels under
 * the icons. Touch input and reduced motion also turn magnification off.
 */
export function MagnifyDock({
  items,
  magnification = 1.8,
  distance = 140,
  baseSize = 48,
  position = "inline",
  tile = "glass",
  label = "Dock",
  onSelect,
  className,
  ref,
}: MagnifyDockProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const sizes = useRef<number[]>([]);
  const pointerX = useRef<number | null>(null);
  const focusIndex = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const coarse = useMediaQuery(COARSE_POINTER);
  const [fits, setFits] = useState(true);
  const [roving, setRoving] = useState<number | null>(null);

  const gap = Math.round(baseSize * 0.2);
  const pad = Math.round(baseSize * 0.2);
  const scale = Math.max(1, magnification);
  const scrollMode = !fits;
  const canMagnify = !reducedMotion && !coarse && !scrollMode && scale > 1;
  const canMagnifyRef = useRef(canMagnify);

  const dividers = items.reduce(
    (count, item, i) => (i > 0 && item.group !== items[i - 1].group ? count + 1 : count),
    0,
  );

  // The tab stop: the item last focused, else the active item, else the first enabled one.
  const firstEnabled = items.findIndex((item) => !item.disabled);
  const activeIndex = items.findIndex((item) => item.active && !item.disabled);
  const tabStop =
    roving !== null && items[roving] && !items[roving].disabled
      ? roving
      : activeIndex >= 0
        ? activeIndex
        : firstEnabled;

  const setNavRef = useCallback(
    (node: HTMLElement | null) => {
      navRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Decide between magnify mode and scroll mode from the space available.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const restWidth =
      2 * pad + items.length * baseSize + Math.max(0, items.length - 1) * gap + dividers * (gap + 1) + 2;
    const extra = reducedMotion || coarse ? 0 : magnifiedExtra(items.length, baseSize, gap, scale, distance);
    const observer = new ResizeObserver(([entry]) => {
      setFits(restWidth + extra <= entry.contentRect.width);
    });
    observer.observe(nav);
    return () => observer.disconnect();
  }, [items.length, dividers, baseSize, gap, pad, scale, distance, reducedMotion, coarse]);

  /** Moves every size one easing step toward its target. Returns true while still moving. */
  const easeSizes = useCallback((): boolean => {
    const els = itemRefs.current.slice(0, items.length);
    let x = pointerX.current;
    if (x === null && focusIndex.current !== null) {
      const focused = els[focusIndex.current];
      if (focused) {
        const rect = focused.getBoundingClientRect();
        x = rect.left + rect.width / 2;
      }
    }
    // Read every rect before writing any size to avoid layout thrash.
    const centers = els.map((el) => {
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });
    let moving = false;
    els.forEach((el, i) => {
      if (!el) return;
      let target = baseSize;
      if (canMagnifyRef.current && x !== null) {
        target = baseSize * (1 + (scale - 1) * falloff(Math.abs(x - centers[i]), distance));
      }
      const current = sizes.current[i] ?? baseSize;
      let next = current + (target - current) * 0.24;
      if (Math.abs(target - next) < 0.15) next = target;
      else moving = true;
      sizes.current[i] = next;
      el.style.setProperty("--dock-size", `${next.toFixed(2)}px`);
    });
    return moving;
  }, [items.length, baseSize, scale, distance]);

  const kick = useCallback(() => {
    if (frame.current !== null) return;
    function loop() {
      frame.current = easeSizes() ? requestAnimationFrame(loop) : null;
    }
    frame.current = requestAnimationFrame(loop);
  }, [easeSizes]);

  // Turning magnification off (touch, reduced motion, scroll mode) snaps sizes back.
  useEffect(() => {
    canMagnifyRef.current = canMagnify;
    if (canMagnify) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    sizes.current = [];
    itemRefs.current.forEach((el) => el?.style.removeProperty("--dock-size"));
  }, [canMagnify]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const handlePointerMove = (event: PointerEvent<HTMLUListElement>) => {
    if (event.pointerType === "touch" || !canMagnifyRef.current) return;
    pointerX.current = event.clientX;
    kick();
  };

  const handlePointerLeave = () => {
    pointerX.current = null;
    if (canMagnifyRef.current) kick();
  };

  const bounce = (el: HTMLElement) => {
    if (reducedMotion) return;
    const tileEl = el.querySelector<HTMLElement>("[data-dock-tile]");
    if (!tileEl || typeof tileEl.animate !== "function") return;
    tileEl.getAnimations().forEach((animation) => animation.cancel());
    tileEl.animate(scrollMode ? popFrames : bounceFrames, {
      duration: scrollMode ? 420 : 760,
      easing: scrollMode ? "cubic-bezier(0.3, 0.7, 0.4, 1)" : "linear",
    });
  };

  const activate = (event: MouseEvent<HTMLElement>, item: DockItem, index: number) => {
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    setRoving(index);
    bounce(event.currentTarget);
    item.onSelect?.();
    onSelect?.(item);
  };

  const focusItem = (index: number) => {
    setRoving(index);
    itemRefs.current[index]?.focus();
  };

  const step = (from: number, dir: 1 | -1) => {
    for (let n = 1; n <= items.length; n++) {
      const i = (from + dir * n + items.length) % items.length;
      if (!items[i].disabled) return i;
    }
    return from;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusItem(step(index, 1));
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusItem(step(index, -1));
        break;
      case "Home":
        event.preventDefault();
        focusItem(step(items.length - 1, 1));
        break;
      case "End":
        event.preventDefault();
        focusItem(step(0, -1));
        break;
      case " ":
        // Buttons handle Space natively; links only handle Enter.
        if (event.currentTarget instanceof HTMLAnchorElement) {
          event.preventDefault();
          event.currentTarget.click();
        }
        break;
    }
  };

  const handleFocus = (event: FocusEvent<HTMLElement>, index: number) => {
    setRoving(index);
    let visible = true;
    try {
      visible = event.currentTarget.matches(":focus-visible");
    } catch {
      // Very old engines: treat every focus as keyboard focus.
    }
    if (!visible) return;
    focusIndex.current = index;
    if (canMagnifyRef.current) kick();
  };

  const handleBlur = () => {
    focusIndex.current = null;
    if (canMagnifyRef.current) kick();
  };

  const headroom = scrollMode ? 0 : Math.ceil(baseSize * (scale - 1) * (canMagnify ? 1 : 0) + 40);

  return (
    <nav
      ref={setNavRef}
      aria-label={label}
      data-mode={scrollMode ? "scroll" : "magnify"}
      className={cn(
        "flex w-full justify-center overflow-x-clip",
        position === "bottom-fixed" &&
          "pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        className,
      )}
      style={
        {
          "--dock-base": `${baseSize}px`,
          "--dock-gap": `${gap}px`,
          "--dock-pad": `${pad}px`,
          paddingTop: headroom,
        } as CSSProperties
      }
    >
      <div
        className={cn(
          "pointer-events-auto relative flex max-w-full min-w-0",
          "rounded-[calc(var(--dock-base)*0.46)] border border-border/80 bg-surface/65 backdrop-blur-2xl backdrop-saturate-150",
          "shadow-[0_18px_40px_-18px_rgb(0_0_0/0.45),inset_0_1px_0_rgb(255_255_255/0.55)] dark:shadow-[0_18px_40px_-14px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.08)]",
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-b from-white/40 via-white/5 to-transparent dark:from-white/10 dark:via-transparent"
        />
        <ul
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className={cn(
            "relative flex min-w-0 items-end gap-(--dock-gap) p-(--dock-pad)",
            scrollMode
              ? "snap-x snap-mandatory scroll-px-(--dock-pad) overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_var(--dock-pad),black_calc(100%_-_var(--dock-pad)),transparent)]"
              : "h-[calc(var(--dock-base)_+_2*var(--dock-pad))]",
          )}
        >
          {items.map((item, index) => {
            const showDivider = index > 0 && item.group !== items[index - 1].group;
            const badge = item.badge !== undefined && item.badge !== "" ? badgeText(item.badge) : null;
            const srBadge =
              badge === null ? "" : typeof item.badge === "number" ? `, ${item.badge} new` : `, ${badge}`;
            const shared = {
              ref: (node: HTMLElement | null) => {
                itemRefs.current[index] = node;
              },
              tabIndex: index === tabStop ? 0 : -1,
              onKeyDown: (event: KeyboardEvent<HTMLElement>) => handleKeyDown(event, index),
              onFocus: (event: FocusEvent<HTMLElement>) => handleFocus(event, index),
              onBlur: handleBlur,
              onClick: (event: MouseEvent<HTMLElement>) => activate(event, item, index),
              className: cn(
                "group/item relative flex shrink-0 flex-col items-center rounded-[calc(var(--dock-base)*0.26)]",
                "w-[var(--dock-size,var(--dock-base))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                !scrollMode && "h-[var(--dock-size,var(--dock-base))]",
                item.disabled ? "cursor-not-allowed" : "cursor-pointer",
              ),
            };

            const content = (
              <>
                <span
                  data-dock-tile
                  className={cn(
                    "relative grid aspect-square w-full place-items-center overflow-hidden rounded-[24%] will-change-transform",
                    "shadow-[0_8px_18px_-8px_rgb(0_0_0/0.45)] transition-[filter] duration-150 group-active/item:brightness-90",
                    tile === "glass"
                      ? "border border-border bg-linear-to-b from-surface to-surface-2 text-foreground [&_svg]:size-[52%]"
                      : "[&>svg]:size-full",
                    item.disabled && "opacity-45 grayscale",
                  )}
                >
                  {item.icon}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/30 to-transparent"
                  />
                </span>

                {badge !== null ? (
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold leading-none text-white shadow-md ring-2 ring-surface"
                  >
                    {badge}
                  </span>
                ) : null}

                <span
                  className={cn(
                    scrollMode
                      ? "mt-1 block max-w-[calc(var(--dock-base)_+_var(--dock-gap))] truncate text-center text-[11px] leading-tight text-foreground"
                      : [
                          "pointer-events-none absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2 whitespace-nowrap",
                          "rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg",
                          "translate-y-1 scale-95 opacity-0 transition-[opacity,translate,scale] duration-150 ease-out motion-reduce:transition-none",
                          "group-hover/item:translate-y-0 group-hover/item:scale-100 group-hover/item:opacity-100",
                          "group-focus-visible/item:translate-y-0 group-focus-visible/item:scale-100 group-focus-visible/item:opacity-100",
                        ].join(" "),
                  )}
                >
                  {item.label}
                  {srBadge ? <span className="sr-only">{srBadge}</span> : null}
                </span>

                {item.active ? (
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-full mt-[3px] size-1 -translate-x-1/2 rounded-full bg-foreground"
                  />
                ) : null}
              </>
            );

            return (
              <li key={item.id} className={cn("flex shrink-0 items-end", scrollMode && "snap-start")}>
                {showDivider ? (
                  <span
                    aria-hidden
                    className="mr-(--dock-gap) mb-[calc(var(--dock-base)*0.15)] h-[calc(var(--dock-base)*0.7)] w-px self-end bg-border"
                  />
                ) : null}
                {item.href && !item.disabled ? (
                  <a
                    {...shared}
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                  >
                    {content}
                  </a>
                ) : (
                  <button
                    {...shared}
                    type="button"
                    disabled={item.disabled}
                    aria-current={item.active ? "true" : undefined}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
