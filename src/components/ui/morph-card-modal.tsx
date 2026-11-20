"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export interface MorphCardCta {
  label: string;
  /** Renders a link when set, otherwise a button. */
  href?: string;
  onClick?: () => void;
}

export interface MorphCardItem {
  /** Unique id. */
  id: string;
  title: string;
  /** Short line under the title on the card and in the modal. */
  subtitle?: string;
  /** Any node (an SVG, a gradient, an <img>) or an image URL used as a cover. */
  image: ReactNode | string;
  /** Any CSS colour. Used for the hover glow and the accent bar. */
  accent?: string;
  /** Rich content shown in the modal body. */
  content: ReactNode;
  /** Optional call to action at the bottom of the modal. */
  cta?: MorphCardCta;
}

export interface MorphCardModalProps {
  items: MorphCardItem[];
  /** Columns at the widest size. The grid collapses to fit narrow containers. */
  columns?: 1 | 2 | 3 | 4;
  /** Called with the open item's id, or null once the modal has fully closed. */
  onOpenChange?: (openId: string | null) => void;
  /**
   * Custom card face. It renders inside the card button, so keep it free of
   * interactive elements. Mark parts with data-morph="image", "title" or
   * "subtitle" to have them morph into the modal.
   */
  renderCard?: (item: MorphCardItem) => ReactNode;
  /** Accessible name of the close button. */
  closeLabel?: string;
  className?: string;
}

const columnClasses: Record<NonNullable<MorphCardModalProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 @md:grid-cols-2",
  3: "grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3",
  4: "grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-4",
};

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const OPEN_MS = 560;
const CLOSE_MS = 420;
/** Elements that morph from the card into the modal, matched by data-morph. */
const SHARED = ["image", "title", "subtitle"] as const;

function Cover({ image }: { image: ReactNode | string }) {
  if (typeof image === "string") {
    return (
      <span
        aria-hidden
        className="absolute inset-0 block bg-cover bg-center"
        style={{ backgroundImage: `url("${image.replace(/"/g, "%22")}")` }}
      />
    );
  }
  return (
    <span aria-hidden className="absolute inset-0 block">
      {image}
    </span>
  );
}

type Frames = { el: HTMLElement; frames: Keyframe[] };

function play(list: Animation[], el: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
  list.push(el.animate(frames, { fill: "both", ...options }));
}

function stopAll(list: Animation[]) {
  for (const animation of list.splice(0)) animation.cancel();
}

const fadeTargets = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>("[data-morph-fade]")];

type ScrollLock = { overflow: string; gutter: string } | null;

/** Locks page scroll and keeps the scrollbar gutter so the cards do not shift sideways. */
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

/**
 * FLIP: works out where the panel and its shared parts must start so they sit
 * exactly on top of the card, then returns keyframes from there to their real
 * place. The panel only translates (no scale) and is clipped to the card's
 * size, so its children can be FLIPped in panel coordinates without distortion
 * piling up. `dragY` is how far a swiped sheet has been pulled down.
 */
function buildMorph(card: HTMLElement, panel: HTMLElement, dragY = 0): Frames[] {
  const c = card.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  // Where the panel rests without the drag offset.
  const restTop = p.top - dragY;
  const right = Math.max(0, p.width - c.width);
  const bottom = Math.max(0, p.height - c.height);
  const panelStyle = getComputedStyle(panel);
  const r = getComputedStyle(card).borderTopLeftRadius;
  const pr = [
    panelStyle.borderTopLeftRadius,
    panelStyle.borderTopRightRadius,
    panelStyle.borderBottomRightRadius,
    panelStyle.borderBottomLeftRadius,
  ].join(" ");

  const result: Frames[] = [
    {
      el: panel,
      frames: [
        {
          transform: `translate(${c.left - p.left}px, ${c.top - restTop}px)`,
          clipPath: `inset(0px ${right}px ${bottom}px 0px round ${r} ${r} ${r} ${r})`,
        },
        { transform: `translate(0px, ${dragY}px)`, clipPath: `inset(0px 0px 0px 0px round ${pr})` },
      ],
    },
  ];

  for (const key of SHARED) {
    const from = card.querySelector<HTMLElement>(`[data-morph="${key}"]`);
    const to = panel.querySelector<HTMLElement>(`[data-morph="${key}"]`);
    if (!from || !to) continue;
    const f = from.getBoundingClientRect();
    const t = to.getBoundingClientRect();
    if (!t.width || !t.height) continue;
    // Offsets inside the card versus inside the panel.
    const x = f.left - c.left - (t.left - p.left);
    const y = f.top - c.top - (t.top - p.top);
    let sx = f.width / t.width;
    let sy = f.height / t.height;
    if (key !== "image") {
      // Text scales uniformly by font size so it never looks squashed.
      sx = sy = parseFloat(getComputedStyle(from).fontSize) / parseFloat(getComputedStyle(to).fontSize) || 1;
    }
    result.push({
      el: to,
      frames: [
        { transformOrigin: "0 0", transform: `translate(${x}px, ${y}px) scale(${sx}, ${sy})` },
        { transformOrigin: "0 0", transform: "translate(0px, 0px) scale(1, 1)" },
      ],
    });
  }
  return result;
}

const ctaClass =
  "inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:w-full";

/**
 * A grid of cards. Clicking one grows it into a modal from the card's exact
 * position (a FLIP morph with the Web Animations API, so it runs the same in
 * Chromium, Firefox and WebKit). Built on the native <dialog> for the focus
 * trap, Escape and the inert page. On phones the modal is a bottom sheet that
 * can be swiped down. Closing plays the morph backwards into the card.
 */
export function MorphCardModal({
  items,
  columns = 3,
  onOpenChange,
  renderCard,
  closeLabel = "Close",
  className,
}: MorphCardModalProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const sourceCard = useRef<HTMLButtonElement | null>(null);
  const animations = useRef<Animation[]>([]);
  const isOpen = useRef(false);
  const closing = useRef(false);
  const reducedMotion = useRef(false);
  const scrollLock = useRef<ScrollLock>(null);
  const drag = useRef<{ id: number; startY: number; startT: number; dy: number } | null>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const subtitleId = `${baseId}-subtitle`;
  const active = items.find((item) => item.id === activeId) ?? null;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => (reducedMotion.current = query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Open: show the dialog and start the morph before the first paint.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const card = sourceCard.current;
    if (!activeId || !dialog || !panel || !backdrop || !card) return;
    const list = animations.current;
    if (!dialog.open) {
      scrollLock.current = lockScroll();
      dialog.showModal();
      isOpen.current = true;
    }
    closeRef.current?.focus({ preventScroll: true });
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    stopAll(list);

    if (reducedMotion.current) {
      play(list, panel, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
      play(list, backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
    } else {
      card.style.visibility = "hidden";
      for (const { el, frames } of buildMorph(card, panel)) {
        play(list, el, frames, { duration: OPEN_MS, easing: EASE });
      }
      play(
        list,
        backdrop,
        [
          { opacity: 0, backdropFilter: "blur(0px)" },
          { opacity: 1, backdropFilter: "blur(12px)" },
        ],
        { duration: OPEN_MS * 0.8, easing: "ease-out" },
      );
      for (const el of fadeTargets(panel)) {
        play(
          list,
          el,
          [
            { opacity: 0, transform: "translateY(12px)" },
            { opacity: 0, transform: "translateY(12px)", offset: 0.35 },
            { opacity: 1, transform: "translateY(0px)" },
          ],
          { duration: OPEN_MS, easing: EASE },
        );
      }
    }
    const running = [...list];
    // Drop the fills once done so CSS owns the resting state again.
    Promise.all(running.map((a) => a.finished))
      .then(() => {
        if (closing.current) return;
        for (const a of running) {
          a.cancel();
          const index = list.indexOf(a);
          if (index >= 0) list.splice(index, 1);
        }
      })
      .catch(() => {});
  }, [activeId]);

  // Leave the page usable if the component unmounts while open.
  useEffect(() => {
    const list = animations.current;
    return () => {
      stopAll(list);
      if (isOpen.current) unlockScroll(scrollLock.current);
    };
  }, []);

  /** Ends a close: hides the dialog, shows the card again and returns focus to it. */
  const finish = () => {
    if (!isOpen.current) return;
    isOpen.current = false;
    closing.current = false;
    drag.current = null;
    const card = sourceCard.current;
    stopAll(animations.current);
    if (card) card.style.visibility = "";
    if (panelRef.current) panelRef.current.style.transform = "";
    if (backdropRef.current) backdropRef.current.style.opacity = "";
    if (dialogRef.current?.open) dialogRef.current.close();
    unlockScroll(scrollLock.current);
    scrollLock.current = null;
    setActiveId(null);
    onOpenChange?.(null);
    card?.focus({ preventScroll: true });
  };

  const requestClose = (dragY = 0) => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const card = sourceCard.current;
    if (closing.current || !isOpen.current || !panel || !backdrop) return;
    closing.current = true;
    const list = animations.current;
    stopAll(list);
    const backdropFrom = backdrop.style.opacity ? Number(backdrop.style.opacity) : 1;

    if (reducedMotion.current || !card) {
      play(list, panel, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-in" });
      play(list, backdrop, [{ opacity: backdropFrom }, { opacity: 0 }], { duration: 160, easing: "ease-in" });
    } else {
      // Measure with the content scrolled to the top so the shared parts line up.
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      for (const { el, frames } of buildMorph(card, panel, dragY)) {
        play(list, el, [...frames].reverse(), { duration: CLOSE_MS, easing: EASE });
      }
      play(
        list,
        backdrop,
        [
          { opacity: backdropFrom, backdropFilter: "blur(12px)" },
          { opacity: 0, backdropFilter: "blur(0px)" },
        ],
        { duration: CLOSE_MS, easing: "ease-out" },
      );
      for (const el of fadeTargets(panel)) {
        play(list, el, [{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], {
          duration: CLOSE_MS,
          easing: "linear",
        });
      }
    }
    Promise.all(list.map((a) => a.finished)).then(finish, () => {});
  };

  const open = (item: MorphCardItem) => {
    if (isOpen.current || activeId) return;
    sourceCard.current = cards.current.get(item.id) ?? null;
    setActiveId(item.id);
    onOpenChange?.(item.id);
  };

  // Swipe down on the cover to dismiss the bottom sheet (phones only).
  const onDragStart = (event: PointerEvent<HTMLDivElement>) => {
    if (!window.matchMedia("(max-width: 639.98px)").matches) return;
    if (closing.current || (scrollRef.current?.scrollTop ?? 0) > 0) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, startY: event.clientY, startT: event.timeStamp, dy: 0 };
  };

  const onDragMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    state.dy = Math.max(0, event.clientY - state.startY);
    if (panelRef.current) panelRef.current.style.transform = `translateY(${state.dy}px)`;
    if (backdropRef.current) backdropRef.current.style.opacity = String(Math.max(0.2, 1 - state.dy / 500));
  };

  const onDragEnd = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    drag.current = null;
    const velocity = state.dy / Math.max(1, event.timeStamp - state.startT);
    if (state.dy > 110 || (state.dy > 24 && velocity > 0.6)) {
      requestClose(state.dy);
      return;
    }
    // Not far enough: spring back.
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;
    const from = Number(backdrop.style.opacity || "1");
    panel.style.transform = "";
    backdrop.style.opacity = "";
    if (reducedMotion.current || state.dy === 0) return;
    panel.animate([{ transform: `translateY(${state.dy}px)` }, { transform: "translateY(0px)" }], { duration: 300, easing: EASE });
    backdrop.animate([{ opacity: from }, { opacity: 1 }], { duration: 300, easing: EASE });
  };

  return (
    <div className={cn("@container w-full", className)}>
      <ul className={cn("grid list-none gap-4 p-0", columnClasses[columns])}>
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <button
              type="button"
              aria-haspopup="dialog"
              ref={(el) => {
                if (el) cards.current.set(item.id, el);
                else cards.current.delete(item.id);
              }}
              onClick={() => open(item)}
              style={{ "--morph-accent": item.accent ?? "var(--accent)" } as CSSProperties}
              className={cn(
                "group relative flex w-full flex-col overflow-hidden rounded-3xl border border-border bg-surface text-left text-foreground",
                "shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-[translate,scale,box-shadow] duration-300 ease-out",
                "hover:-translate-y-1 hover:shadow-[0_22px_44px_-22px_var(--morph-accent)] active:translate-y-0 active:scale-[0.98]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
              )}
            >
              {renderCard ? (
                renderCard(item)
              ) : (
                <>
                  <span data-morph="image" className="relative block aspect-[4/3] w-full overflow-hidden">
                    <span className="absolute inset-0 block transition-[scale] duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                      <Cover image={item.image} />
                    </span>
                    <span
                      aria-hidden
                      className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-[rotate] duration-300 group-hover:rotate-90 motion-reduce:transition-none"
                    >
                      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                    </span>
                  </span>
                  <span className="flex flex-col gap-1 p-4">
                    <span data-morph="title" className="block text-base font-semibold leading-snug">
                      {item.title}
                    </span>
                    {item.subtitle ? (
                      <span data-morph="subtitle" className="block text-sm text-muted">
                        {item.subtitle}
                      </span>
                    ) : null}
                  </span>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-labelledby={active ? titleId : undefined}
        aria-describedby={active?.subtitle ? subtitleId : undefined}
        onCancel={(event) => {
          event.preventDefault();
          requestClose();
        }}
        // Reached when the browser closes the dialog without our animation.
        onClose={finish}
        className="m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-foreground backdrop:bg-transparent"
      >
        <div ref={backdropRef} aria-hidden onClick={() => requestClose()} className="absolute inset-0 bg-black/55 backdrop-blur-md" />
        {active ? (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-6">
            <div
              ref={panelRef}
              style={{ "--morph-accent": active.accent ?? "var(--accent)" } as CSSProperties}
              className={cn(
                "pointer-events-auto relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-border bg-surface shadow-2xl",
                "sm:max-h-[min(88dvh,780px)] sm:max-w-2xl sm:rounded-[28px]",
              )}
            >
              <button
                ref={closeRef}
                type="button"
                aria-label={closeLabel}
                data-morph-fade
                onClick={() => requestClose()}
                className={cn(
                  "absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md",
                  "transition-[background-color,scale] hover:bg-black/75 active:scale-95 motion-reduce:transition-none",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>

              <div
                ref={scrollRef}
                role="region"
                aria-labelledby={titleId}
                tabIndex={0}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <div
                  data-morph="image"
                  onPointerDown={onDragStart}
                  onPointerMove={onDragMove}
                  onPointerUp={onDragEnd}
                  onPointerCancel={onDragEnd}
                  className="relative h-56 w-full overflow-hidden max-sm:cursor-grab max-sm:touch-none sm:h-72"
                >
                  <Cover image={active.image} />
                  <span
                    aria-hidden
                    data-morph-fade
                    className="absolute left-1/2 top-2.5 h-1.5 w-11 -translate-x-1/2 rounded-full bg-white/85 shadow-[0_1px_4px_rgb(0_0_0/0.35)] sm:hidden"
                  />
                </div>

                <div className="flex flex-col gap-1.5 px-5 pb-6 pt-5 sm:px-7 sm:pb-7">
                  <span
                    aria-hidden
                    data-morph-fade
                    className="mb-2 block h-1 w-12 rounded-full bg-(--morph-accent) shadow-[0_0_14px_var(--morph-accent)]"
                  />
                  <h2 id={titleId} data-morph="title" className="text-2xl font-semibold leading-tight tracking-tight">
                    {active.title}
                  </h2>
                  {active.subtitle ? (
                    <p id={subtitleId} data-morph="subtitle" className="text-sm text-muted">
                      {active.subtitle}
                    </p>
                  ) : null}
                  <div data-morph-fade className="mt-4 text-sm leading-relaxed text-foreground">
                    {active.content}
                  </div>
                  {active.cta ? (
                    <div data-morph-fade className="mt-6">
                      {active.cta.href ? (
                        <a href={active.cta.href} onClick={active.cta.onClick} className={ctaClass}>
                          {active.cta.label}
                        </a>
                      ) : (
                        <button type="button" onClick={active.cta.onClick} className={ctaClass}>
                          {active.cta.label}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
