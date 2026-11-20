"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/cn";

export type SheetSide = "bottom" | "right";

export interface BottomSheetProps {
  /** Controlled open state. Leave undefined to let the sheet manage it. */
  open?: boolean;
  /** Starting open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when the sheet asks to open or close (drag, Escape, backdrop, close button). */
  onOpenChange?: (open: boolean) => void;
  /**
   * Snap points as fractions (0 to 1) of the track: the viewport height for a
   * bottom sheet, or the drawer's max width for a side drawer.
   */
  snapPoints?: number[];
  /** Snap index used when the sheet opens (uncontrolled). */
  defaultSnap?: number;
  /** Controlled snap index. */
  activeSnap?: number;
  /** Called with the snap index the user picked by drag, flick or keyboard. */
  onSnapChange?: (index: number) => void;
  /** Visible title. It labels the dialog. */
  title: ReactNode;
  /** Optional line under the title. It describes the dialog. */
  description?: ReactNode;
  /** When false, Escape, the backdrop and a downward flick cannot close it. */
  dismissible?: boolean;
  /** "right" makes a side drawer when the viewport is at least 640px wide. */
  side?: SheetSide;
  /** Caps the track in px. Defaults to the viewport for "bottom" and 480 for "right". */
  maxSize?: number;
  /** Pinned bar at the bottom. It stays in view at every snap point. */
  footer?: ReactNode;
  /** Element behind the sheet that scales down and rounds as the sheet opens. */
  backgroundRef?: RefObject<HTMLElement | null>;
  /** Accessible name of the drag handle. */
  handleLabel?: string;
  /** Accessible name of the close button. */
  closeLabel?: string;
  children?: ReactNode;
  /** Extra classes on the sheet panel. */
  className?: string;
}

/* ---------------------------------------------------------------- engine */

/** Extra panel length hidden past the edge, revealed by the rubber band. */
const BUFFER = 96;
/** Gap kept between the fully open sheet and the far edge of the viewport. */
const EDGE_GAP = 24;
/** Pixels a pointer must travel before a press turns into a drag. */
const SLOP = 6;
/** Release speed (px per ms) that counts as a flick. */
const FLICK = 0.45;
const STIFFNESS = 420;
const DAMPING = 36;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const rubber = (distance: number) => BUFFER * (1 - 1 / ((distance / BUFFER) * 0.6 + 1));

type ScrollLock = { overflow: string; gutter: string } | null;

function lockScroll(): ScrollLock {
  const root = document.documentElement;
  const saved = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
  if (window.innerWidth > root.clientWidth) root.style.scrollbarGutter = "stable";
  root.style.overflow = "hidden";
  return saved;
}

function unlockScroll(saved: ScrollLock) {
  if (!saved) return;
  const root = document.documentElement;
  root.style.overflow = saved.overflow;
  root.style.scrollbarGutter = saved.gutter;
}

interface EngineNodes {
  dialog: HTMLDialogElement | null;
  backdrop: HTMLDivElement | null;
  panel: HTMLDivElement | null;
  content: HTMLDivElement | null;
  footer: HTMLDivElement | null;
}

interface EngineOptions {
  points: number[];
  snap: number;
  dismissible: boolean;
  side: SheetSide;
  maxSize?: number;
  reduced: boolean;
  background: HTMLElement | null;
  onSnap: (index: number) => void;
  onClose: () => void;
}

type DragSource = "header" | "content";

interface Drag {
  id: number;
  source: DragSource;
  el: HTMLElement;
  startX: number;
  startY: number;
  base: number;
  active: boolean;
  samples: { t: number; p: number }[];
}

/**
 * All the motion lives here, outside React. Position is the visible size of
 * the sheet in px. A spring in requestAnimationFrame moves it toward a target
 * and every frame is written straight to the DOM (transform, backdrop opacity,
 * pinned footer, scaled background), so dragging never re-renders React.
 */
function createSheetEngine(
  nodes: () => EngineNodes,
  opts: () => EngineOptions,
  onSide: (side: SheetSide) => void,
) {
  let shown = false;
  let closing = false;
  let x = 0;
  let v = 0;
  let target = 0;
  let raf = 0;
  let last = 0;
  let onSettle: (() => void) | null = null;
  let sizes: number[] = [];
  let top = 0;
  let side: SheetSide = "bottom";
  let drag: Drag | null = null;
  let suppressClick = false;
  let returnFocus: HTMLElement | null = null;
  let scrollLock: ScrollLock = null;
  let savedBg: { el: HTMLElement; transform: string; origin: string; radius: string; transition: string; base: number } | null = null;

  const layout = () => {
    const { dialog, panel } = nodes();
    if (!dialog || !panel) return;
    const o = opts();
    side = o.side === "right" && dialog.clientWidth >= 640 ? "right" : "bottom";
    onSide(side);
    const vertical = side === "bottom";
    const room = (vertical ? dialog.clientHeight : dialog.clientWidth) - EDGE_GAP;
    const cap = o.maxSize ?? (vertical ? Infinity : 480);
    const track = Math.max(160, Math.min(room, cap));
    sizes = o.points.map((p) => Math.round(p * track));
    top = sizes[sizes.length - 1] ?? track;
    const s = panel.style;
    if (vertical) {
      Object.assign(s, {
        top: "auto",
        left: "0px",
        right: "0px",
        bottom: `${-BUFFER}px`,
        width: "",
        maxWidth: "",
        height: `${top + BUFFER}px`,
        paddingBottom: `${BUFFER}px`,
        paddingRight: "",
      });
    } else {
      Object.assign(s, {
        top: "0px",
        bottom: "0px",
        left: "auto",
        right: `${-BUFFER}px`,
        height: "",
        width: `${top + BUFFER}px`,
        maxWidth: "none",
        paddingRight: `${BUFFER}px`,
        paddingBottom: "",
      });
    }
  };

  const paint = () => {
    const { panel, backdrop, footer } = nodes();
    if (!panel) return;
    const size = clamp(x, 0, top + BUFFER);
    const offset = top - size;
    panel.style.transform = side === "bottom" ? `translate3d(0, ${offset}px, 0)` : `translate3d(${offset}px, 0, 0)`;
    const first = sizes[0] || 1;
    const p1 = clamp(size / first, 0, 1);
    const p2 = top > first ? clamp((size - first) / (top - first), 0, 1) : 0;
    if (backdrop) backdrop.style.opacity = String(Math.round((0.34 * p1 + 0.2 * p2) * 1000) / 1000);
    // Keep the footer on the visible edge at every snap point.
    if (footer) {
      footer.style.transform = side === "bottom" ? `translate3d(0, ${-clamp(offset, 0, top - first)}px, 0)` : "";
    }
    if (savedBg) {
      const bg = savedBg.el.style;
      bg.transform = `translateY(${side === "bottom" ? 10 * p1 : 0}px) scale(${1 - 0.05 * p1})`;
      bg.borderRadius = `${Math.round(Math.max(savedBg.base, 22 * p1))}px`;
    }
  };

  const settle = () => {
    const done = onSettle;
    onSettle = null;
    done?.();
  };

  const step = (now: number) => {
    const dt = clamp((now - last) / 1000, 0.001, 0.032);
    last = now;
    const a = -STIFFNESS * (x - target) - DAMPING * v;
    v += a * dt;
    x += v * dt;
    const closingDone = target === 0 && x <= 0.5;
    if (closingDone || (Math.abs(x - target) < 0.5 && Math.abs(v) < 8)) {
      x = target;
      v = 0;
      raf = 0;
      paint();
      settle();
      return;
    }
    paint();
    raf = requestAnimationFrame(step);
  };

  const animateTo = (to: number, done?: () => void) => {
    target = to;
    onSettle = done ?? null;
    if (opts().reduced) {
      cancelAnimationFrame(raf);
      raf = 0;
      x = to;
      v = 0;
      paint();
      settle();
      return;
    }
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    }
  };

  const onResize = () => engine.resize();

  const finish = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (!shown) return;
    shown = false;
    closing = false;
    drag = null;
    window.removeEventListener("resize", onResize);
    const { dialog, panel } = nodes();
    panel?.removeAttribute("data-dragging");
    if (dialog?.open) dialog.close();
    unlockScroll(scrollLock);
    scrollLock = null;
    if (savedBg) {
      const { el, transform, origin, radius, transition } = savedBg;
      Object.assign(el.style, { transform, transformOrigin: origin, borderRadius: radius, transition });
      savedBg = null;
    }
    const back = returnFocus;
    returnFocus = null;
    if (back?.isConnected) back.focus({ preventScroll: true });
  };

  /** Picks where a released drag should go, from its position and speed. */
  const release = (velocity: number) => {
    const o = opts();
    const candidates = sizes.map((s, i) => ({ s, i }));
    if (o.dismissible) candidates.unshift({ s: 0, i: -1 });
    let pick = candidates[0];
    if (Math.abs(velocity) > FLICK) {
      pick =
        velocity > 0
          ? (candidates.find((c) => c.s > x + 4) ?? candidates[candidates.length - 1])
          : ([...candidates].reverse().find((c) => c.s < x - 4) ?? candidates[0]);
    } else {
      for (const c of candidates) if (Math.abs(c.s - x) < Math.abs(pick.s - x)) pick = c;
    }
    // Carry the finger's speed into the spring.
    v = velocity * 1000;
    if (pick.i < 0) {
      // Head for the lowest point; hide() takes over once the parent agrees to close.
      animateTo(sizes[0] ?? 0);
      o.onClose();
      return;
    }
    if (pick.i !== o.snap) o.onSnap(pick.i);
    animateTo(pick.s);
  };

  const engine = {
    show() {
      const { dialog } = nodes();
      if (!dialog) return;
      if (closing) closing = false;
      if (!shown) {
        const active = document.activeElement;
        returnFocus = active instanceof HTMLElement ? active : null;
        scrollLock = lockScroll();
        const bg = opts().background;
        if (bg) {
          savedBg = {
            el: bg,
            transform: bg.style.transform,
            origin: bg.style.transformOrigin,
            radius: bg.style.borderRadius,
            transition: bg.style.transition,
            base: parseFloat(getComputedStyle(bg).borderTopLeftRadius) || 0,
          };
          bg.style.transformOrigin = "50% 0";
          bg.style.transition = "none";
        }
        if (!dialog.open) dialog.showModal();
        dialog.scrollTop = 0;
        shown = true;
        x = 0;
        v = 0;
        window.addEventListener("resize", onResize);
      }
      layout();
      paint();
      const o = opts();
      animateTo(sizes[clamp(o.snap, 0, sizes.length - 1)] ?? top);
    },
    hide() {
      if (!shown || closing) return;
      closing = true;
      drag = null;
      animateTo(0, finish);
    },
    snapTo(index: number) {
      if (!shown || closing || drag?.active) return;
      animateTo(sizes[clamp(index, 0, sizes.length - 1)] ?? top);
    },
    resize() {
      if (!shown) return;
      layout();
      if (closing || drag?.active) {
        paint();
        return;
      }
      cancelAnimationFrame(raf);
      raf = 0;
      x = target = sizes[clamp(opts().snap, 0, sizes.length - 1)] ?? top;
      v = 0;
      paint();
    },
    /** The browser closed the dialog without us (for example a forced Escape). */
    closedByBrowser() {
      if (!shown) return;
      finish();
      opts().onClose();
    },
    destroy() {
      finish();
    },
    pointerDown(event: PointerEvent<HTMLElement>, source: DragSource) {
      suppressClick = false;
      if (!shown || closing) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const el = event.target as Element;
      if (el.closest("input[type=range], textarea, select, [data-sheet-no-drag]")) return;
      if (source === "content" && side === "bottom") {
        const expanded = opts().snap === sizes.length - 1;
        // At the top snap point the content scrolls. A mouse can still pull it down from the top.
        if (expanded && (event.pointerType !== "mouse" || (nodes().content?.scrollTop ?? 0) > 0)) return;
      }
      drag = {
        id: event.pointerId,
        source,
        el: event.currentTarget,
        startX: event.clientX,
        startY: event.clientY,
        base: x,
        active: false,
        samples: [],
      };
    },
    pointerMove(event: PointerEvent<HTMLElement>) {
      const d = drag;
      if (!d || d.id !== event.pointerId) return;
      const dx = event.clientX - d.startX;
      const dy = event.clientY - d.startY;
      const along = side === "bottom" ? -dy : -dx;
      const across = side === "bottom" ? dx : dy;
      if (!d.active) {
        if (Math.abs(along) < SLOP) {
          if (Math.abs(across) > SLOP * 2) drag = null;
          return;
        }
        if (Math.abs(across) > Math.abs(along)) {
          drag = null;
          return;
        }
        const expanded = opts().snap === sizes.length - 1;
        if (d.source === "content" && side === "bottom" && expanded && along > 0) {
          drag = null;
          return;
        }
        d.active = true;
        d.base = x - along;
        cancelAnimationFrame(raf);
        raf = 0;
        v = 0;
        onSettle = null;
        suppressClick = true;
        try {
          d.el.setPointerCapture(event.pointerId);
        } catch {
          // The pointer may already be gone.
        }
        window.getSelection()?.removeAllRanges();
        nodes().panel?.setAttribute("data-dragging", "");
      }
      const raw = d.base + along;
      const low = sizes[0] ?? 0;
      if (raw > top) x = top + rubber(raw - top);
      else if (!opts().dismissible && raw < low) x = low - rubber(low - raw);
      else x = Math.max(0, raw);
      d.samples.push({ t: event.timeStamp, p: raw });
      while (d.samples.length > 2 && event.timeStamp - d.samples[0].t > 100) d.samples.shift();
      paint();
    },
    pointerUp(event: PointerEvent<HTMLElement>) {
      const d = drag;
      if (!d || d.id !== event.pointerId) return;
      drag = null;
      if (!d.active) return;
      nodes().panel?.removeAttribute("data-dragging");
      const first = d.samples[0];
      const end = d.samples[d.samples.length - 1];
      const span = first && end ? end.t - first.t : 0;
      // A pointer that stopped before letting go has no speed.
      const velocity =
        event.type === "pointerup" && span > 0 && event.timeStamp - end.t < 80 ? (end.p - first.p) / span : 0;
      release(velocity);
    },
    clickCapture(event: MouseEvent) {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
  return engine;
}

type SheetEngine = ReturnType<typeof createSheetEngine>;

/* ----------------------------------------------------------- component */

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerMotion = () => false;

const DEFAULT_POINTS = [0.35, 0.65, 1];

function normalizePoints(points: number[] | undefined) {
  const list = (points ?? DEFAULT_POINTS)
    .filter((p) => Number.isFinite(p))
    .map((p) => clamp(p, 0.1, 1))
    .sort((a, b) => a - b)
    .filter((p, i, all) => i === 0 || p !== all[i - 1]);
  return list.length ? list : DEFAULT_POINTS;
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring";

/**
 * A draggable sheet on the native <dialog> (focus trap, Escape, inert page).
 * Drag the handle or header, or the content below the top snap point. On
 * release it springs to the nearest snap point, or the next one on a flick.
 * The backdrop and an optional background element follow the drag.
 */
export function BottomSheet({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  snapPoints,
  defaultSnap = 0,
  activeSnap,
  onSnapChange,
  title,
  description,
  dismissible = true,
  side = "bottom",
  maxSize,
  footer,
  backgroundRef,
  handleLabel = "Resize sheet",
  closeLabel = "Close",
  children,
  className,
}: BottomSheetProps) {
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, getServerMotion);
  const points = normalizePoints(snapPoints);
  const pointsKey = points.join(",");
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const [innerSnap, setInnerSnap] = useState(defaultSnap);
  const [resolvedSide, setResolvedSide] = useState<SheetSide>("bottom");
  const [announcement, setAnnouncement] = useState("");
  const open = openProp ?? innerOpen;
  const snap = clamp(Math.round(activeSnap ?? innerSnap), 0, points.length - 1);
  const isTop = snap === points.length - 1;
  const bottom = resolvedSide === "bottom";
  const scrollable = !bottom || isTop;
  const noun = bottom ? "Sheet" : "Drawer";

  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SheetEngine | null>(null);
  const latest = useRef<EngineOptions | null>(null);

  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;
  const hintId = `${baseId}-hint`;

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInnerOpen(next);
    if (!next && activeSnap === undefined) setInnerSnap(clamp(defaultSnap, 0, points.length - 1));
    onOpenChange?.(next);
  };

  const requestSnap = (index: number) => {
    const i = clamp(index, 0, points.length - 1);
    if (activeSnap === undefined) setInnerSnap(i);
    onSnapChange?.(i);
    setAnnouncement(`${noun} at ${Math.round(points[i] * 100)}%`);
  };

  // Hand the engine the latest props before any effect below runs.
  useLayoutEffect(() => {
    latest.current = {
      points,
      snap,
      dismissible,
      side,
      maxSize,
      reduced,
      background: backgroundRef?.current ?? null,
      onSnap: requestSnap,
      onClose: () => setOpen(false),
    };
  });

  useEffect(() => {
    const engine = createSheetEngine(
      () => ({
        dialog: dialogRef.current,
        backdrop: backdropRef.current,
        panel: panelRef.current,
        content: contentRef.current,
        footer: footerRef.current,
      }),
      () => latest.current as EngineOptions,
      setResolvedSide,
    );
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (open) engine.show();
    else engine.hide();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    engineRef.current?.snapTo(snap);
    // Lower snap points show the start of the content again.
    if (snap !== points.length - 1 && contentRef.current && bottom) contentRef.current.scrollTop = 0;
  }, [snap, open, points.length, bottom]);

  useEffect(() => {
    engineRef.current?.resize();
  }, [pointsKey, maxSize, side]);

  const onHandleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const grow = bottom ? ["ArrowUp", "ArrowRight"] : ["ArrowUp", "ArrowLeft"];
    const shrink = bottom ? ["ArrowDown", "ArrowLeft"] : ["ArrowDown", "ArrowRight"];
    let next = snap;
    if (grow.includes(event.key)) next = snap + 1;
    else if (shrink.includes(event.key)) next = snap - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = points.length - 1;
    else return;
    event.preventDefault();
    next = clamp(next, 0, points.length - 1);
    if (next !== snap) requestSnap(next);
  };

  const drag = {
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => engineRef.current?.pointerMove(event),
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => engineRef.current?.pointerUp(event),
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => engineRef.current?.pointerUp(event),
  };

  const handle = (
    <>
      <button
        type="button"
        aria-label={handleLabel}
        aria-describedby={hintId}
        onClick={() => requestSnap((snap + 1) % points.length)}
        onKeyDown={onHandleKey}
        className={cn(
          "group/handle flex cursor-grab items-center justify-center rounded-full",
          focusRing,
          bottom ? "mx-auto mt-1.5 h-7 w-20" : "h-20 w-7",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "rounded-full bg-muted/45 transition-[width,height,background-color] duration-200 group-hover/handle:bg-muted/80 group-data-dragging/sheet:bg-accent motion-reduce:transition-none",
            bottom ? "h-1.5 w-10 group-hover/handle:w-14 group-data-dragging/sheet:w-14" : "h-10 w-1.5 group-hover/handle:h-14 group-data-dragging/sheet:h-14",
          )}
        />
      </button>
      <span id={hintId} className="sr-only">
        Arrow keys change the size. Enter cycles through the sizes.
      </span>
    </>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) setOpen(false);
      }}
      onClose={() => engineRef.current?.closedByBrowser()}
      className="m-0 h-full max-h-none w-full max-w-none overflow-clip border-0 bg-transparent p-0 text-foreground backdrop:bg-transparent"
    >
      <div
        ref={backdropRef}
        aria-hidden
        onClick={() => dismissible && setOpen(false)}
        className="absolute inset-0 bg-black opacity-0 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        onClickCapture={(event) => engineRef.current?.clickCapture(event)}
        className={cn(
          "group/sheet absolute flex flex-col border border-border bg-surface text-foreground will-change-transform data-dragging:select-none",
          "shadow-[0_-24px_60px_-24px_rgb(0_0_0/0.45),inset_0_1px_0_rgb(255_255_255/0.06)]",
          bottom ? "mx-auto w-full max-w-xl rounded-t-[28px] border-b-0" : "rounded-l-[28px] border-r-0",
          className,
        )}
      >
        {/* Soft sheen along the leading edge. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute from-accent/12 to-transparent",
            bottom ? "inset-x-0 top-0 h-24 rounded-t-[28px] bg-linear-to-b" : "inset-y-0 left-0 w-24 rounded-l-[28px] bg-linear-to-r",
          )}
        />
        <div
          onPointerDown={(event) => engineRef.current?.pointerDown(event, "header")}
          {...drag}
          className={cn("relative shrink-0 touch-none select-none", bottom && "cursor-grab active:cursor-grabbing")}
        >
          {bottom ? handle : null}
          <div className={cn("flex items-start gap-3 pb-3 pr-4", bottom ? "pl-5 pt-0.5" : "pl-10 pt-5")}>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-semibold leading-tight tracking-tight">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            {dismissible ? (
              <button
                type="button"
                aria-label={closeLabel}
                onClick={() => setOpen(false)}
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition-[color,background-color,scale]",
                  "hover:bg-border hover:text-foreground active:scale-95 motion-reduce:transition-none",
                  focusRing,
                )}
              >
                <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {bottom ? null : (
          <div
            onPointerDown={(event) => engineRef.current?.pointerDown(event, "header")}
            {...drag}
            className="absolute inset-y-0 left-0 z-10 flex w-9 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
          >
            {handle}
          </div>
        )}

        <div
          ref={contentRef}
          role={scrollable ? "region" : undefined}
          aria-labelledby={scrollable ? titleId : undefined}
          tabIndex={scrollable ? 0 : undefined}
          onPointerDown={(event) => engineRef.current?.pointerDown(event, "content")}
          {...drag}
          onFocus={(event) => {
            // Keyboard focus that lands below the visible edge opens the sheet fully.
            if (!bottom || isTop) return;
            const el = event.target;
            if (!(el instanceof HTMLElement) || !el.matches(":focus-visible")) return;
            const limit = window.innerHeight - (footerRef.current?.offsetHeight ?? 0);
            if (el.getBoundingClientRect().bottom > limit) requestSnap(points.length - 1);
          }}
          className={cn(
            "relative min-h-0 flex-1 overscroll-contain pb-5 pr-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring",
            bottom ? "pl-5" : "pl-10",
            scrollable ? "touch-pan-y overflow-y-auto" : "touch-none overflow-hidden",
          )}
        >
          {children}
        </div>

        {footer ? (
          <div ref={footerRef} className="relative z-10 shrink-0 border-t border-border bg-surface px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        ) : null}

        <p role="status" className="sr-only">
          {announcement}
        </p>
      </div>
    </dialog>
  );
}
