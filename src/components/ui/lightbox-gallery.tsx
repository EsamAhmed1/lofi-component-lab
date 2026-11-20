"use client";

import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export interface LightboxItem {
  id: string;
  /** Image URL. Ignored when art is set. */
  src?: string;
  /** Any node (an SVG, a gradient) drawn instead of an image. It should fill its box. */
  art?: ReactNode;
  /** Required. Names the thumbnail button and the image in the viewer. */
  alt: string;
  caption?: string;
  /** Intrinsic size, used for the aspect ratio only. */
  width: number;
  height: number;
}

export interface LightboxOpenOptions {
  /** Start the slideshow as soon as the viewer opens. */
  slideshow?: boolean;
}

export interface LightboxGalleryHandle {
  open: (index?: number, options?: LightboxOpenOptions) => void;
  close: () => void;
}

export interface LightboxGalleryProps {
  items: LightboxItem[];
  /** Index that open() starts on when it gets no index. */
  startIndex?: number;
  /** Wrap from the last image to the first and back. */
  loop?: boolean;
  /** Called with the shown index, or null once the viewer has closed. */
  onIndexChange?: (index: number | null) => void;
  /** Most columns in the masonry grid. Narrow containers get fewer. */
  columns?: 2 | 3 | 4;
  /** Milliseconds per image in the slideshow. */
  slideshowInterval?: number;
  /** Largest zoom factor. */
  maxZoom?: number;
  /** Thumbnail strip under the viewer. */
  showThumbnails?: boolean;
  /** Accessible name of the grid. */
  label?: string;
  /** Accessible name of the viewer dialog. */
  viewerLabel?: string;
  className?: string;
  ref?: Ref<LightboxGalleryHandle>;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const OPEN_MS = 520;
const CLOSE_MS = 420;
const THUMB_RADIUS = 16;
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerMotion = () => false;

const columnClasses = {
  2: "columns-2",
  3: "columns-2 @2xl:columns-3",
  4: "columns-2 @2xl:columns-3 @4xl:columns-4",
} as const;

const ring = "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring";
const glassButton = cn(
  "grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition-[background-color,scale,opacity] duration-200",
  "hover:bg-white/20 active:scale-90 disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none",
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-white",
);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

/** The transform that makes an element laid out at `base` cover `rect`. */
function cover(rect: DOMRect, base: DOMRect) {
  return `translate(${rect.left - base.left}px, ${rect.top - base.top}px) scale(${rect.width / base.width}, ${rect.height / base.height})`;
}

/** Keeps the corner radius visually constant while the element is scaled. */
function radius(rect: DOMRect, base: DOMRect, px: number) {
  return `${(px * base.width) / rect.width}px / ${(px * base.height) / rect.height}px`;
}

function Media({ item }: { item: LightboxItem }) {
  if (item.art) {
    return (
      <span aria-hidden className="absolute inset-0 block [&>svg]:size-full">
        {item.art}
      </span>
    );
  }
  if (!item.src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.src} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />
  );
}

/** Fits the item inside the stage (a size container) at its own aspect ratio. */
const frameStyle = (item: LightboxItem): CSSProperties => ({
  aspectRatio: `${item.width} / ${item.height}`,
  width: `min(calc(100cqw - var(--lightbox-gallery-gutter) * 2), calc((100cqh - 1.5rem) * ${item.width / item.height}))`,
});

const layerClass = "absolute inset-0 grid place-items-center [--lightbox-gallery-gutter:0.75rem] @2xl:[--lightbox-gallery-gutter:4.75rem]";

type Gesture = {
  kind: "pending" | "swipe-x" | "swipe-y" | "pan" | "pinch" | "none";
  startX: number;
  startY: number;
  startT: number;
  dx: number;
  dy: number;
  panX: number;
  panY: number;
  onMedia: boolean;
  dist: number;
  zoom: number;
};

type Exit = { index: number; dir: 1 | -1; from: number; token: number };

type Latest = {
  items: LightboxItem[];
  reduced: boolean;
  open: (index: number, options?: LightboxOpenOptions) => void;
  close: () => void;
  advance: () => void;
};

/**
 * A masonry grid of images that opens into a full-screen viewer. The image
 * grows out of its thumbnail (a FLIP morph with the Web Animations API) inside
 * a native <dialog>, so focus is trapped and Escape works. The viewer has
 * slide transitions, swipe, pinch and double-tap zoom with panning, a
 * thumbnail strip and a slideshow. Closing morphs back into the thumbnail.
 */
export function LightboxGallery({
  items,
  startIndex = 0,
  loop = true,
  onIndexChange,
  columns = 3,
  slideshowInterval = 4000,
  maxZoom = 4,
  showThumbnails = true,
  label = "Gallery",
  viewerLabel = "Image viewer",
  className,
  ref,
}: LightboxGalleryProps) {
  const [index, setIndex] = useState<number | null>(null);
  const [exit, setExit] = useState<Exit | null>(null);
  const [zoom, setZoom] = useState(1);
  const [slideshow, setSlideshow] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, getServerMotion);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const exitRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressAnim = useRef<Animation | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const thumbs = useRef(new Map<string, HTMLButtonElement>());
  const animations = useRef<Animation[]>([]);
  const isOpen = useRef(false);
  const closing = useRef(false);
  const openedAt = useRef(0);
  const navToken = useRef(0);
  const scrollLock = useRef<ScrollLock>(null);
  const view = useRef({ z: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  // Latest props and handlers, for effects and the imperative handle.
  const latest = useRef<Latest>({ items, reduced, open: () => {}, close: () => {}, advance: () => {} });

  const count = items.length;
  const current = index === null ? null : (items[index] ?? null);
  const isShown = current !== null;

  // ---------- Helpers that act on the DOM ----------

  const play = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
    const animation = el.animate(frames, { fill: "both", ...options });
    animations.current.push(animation);
    return animation;
  };
  const stopAll = () => {
    for (const animation of animations.current.splice(0)) animation.cancel();
  };
  const chrome = () => [...(contentRef.current?.querySelectorAll<HTMLElement>("[data-lightbox-chrome]") ?? [])];

  const applyView = (animate: boolean) => {
    const el = zoomRef.current;
    if (!el) return;
    const { z, x, y } = view.current;
    el.style.transition = animate && !reduced ? `transform 320ms ${EASE}` : "none";
    el.style.transform = z === 1 && x === 0 && y === 0 ? "" : `translate(${x}px, ${y}px) scale(${z})`;
  };

  const clampPan = () => {
    const media = mediaRef.current;
    const stage = stageRef.current;
    if (!media || !stage) return;
    const { z } = view.current;
    const maxX = Math.max(0, (media.offsetWidth * z - stage.clientWidth) / 2 + 24);
    const maxY = Math.max(0, (media.offsetHeight * z - stage.clientHeight) / 2 + 24);
    view.current.x = z === 1 ? 0 : clamp(view.current.x, -maxX, maxX);
    view.current.y = z === 1 ? 0 : clamp(view.current.y, -maxY, maxY);
  };

  /** Zooms so the point under `at` (client coordinates) stays put. */
  const zoomTo = (next: number, at?: { x: number; y: number }, animate = true, commit = true) => {
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const { z: z0, x, y } = view.current;
    const z = clamp(next, 1, maxZoom);
    const px = (at?.x ?? cx) - cx;
    const py = (at?.y ?? cy) - cy;
    view.current = { z, x: px - ((px - x) / z0) * z, y: py - ((py - y) / z0) * z };
    clampPan();
    applyView(animate);
    if (commit) {
      setZoom(z);
      if (z > 1 && slideshow) setPaused(true);
    }
  };

  const resetView = () => {
    view.current = { z: 1, x: 0, y: 0 };
    applyView(false);
    setZoom(1);
  };

  // ---------- Open, navigate, close ----------

  const open = (i: number, options?: LightboxOpenOptions) => {
    if (isOpen.current || index !== null || count === 0) return;
    const target = clamp(Math.round(i), 0, count - 1);
    openedAt.current = target;
    setIndex(target);
    setSlideshow(Boolean(options?.slideshow));
    setPaused(false);
    onIndexChange?.(target);
  };

  const goTo = (next: number, dir: 1 | -1, from = 0) => {
    if (index === null || closing.current || next === index) return;
    resetView();
    navToken.current += 1;
    setExit({ index, dir, from, token: navToken.current });
    setIndex(next);
    onIndexChange?.(next);
  };

  /** Steps one image. Returns false at an end when not looping. */
  const step = (dir: 1 | -1, from = 0) => {
    if (index === null) return false;
    let next = index + dir;
    if (next < 0 || next >= count) {
      if (!loop) return false;
      next = (next + count) % count;
    }
    goTo(next, dir, from);
    return true;
  };

  const finish = () => {
    if (!isOpen.current) return;
    isOpen.current = false;
    closing.current = false;
    gesture.current = null;
    pointers.current.clear();
    stopAll();
    const thumb = current ? thumbs.current.get(current.id) : undefined;
    for (const t of thumbs.current.values()) t.style.visibility = "";
    if (backdropRef.current) backdropRef.current.style.opacity = "";
    if (slideRef.current) slideRef.current.style.transform = "";
    view.current = { z: 1, x: 0, y: 0 };
    if (dialogRef.current?.open) dialogRef.current.close();
    unlockScroll(scrollLock.current);
    scrollLock.current = null;
    setIndex(null);
    setExit(null);
    setZoom(1);
    setSlideshow(false);
    setPaused(false);
    onIndexChange?.(null);
    thumb?.focus({ preventScroll: true });
  };

  const requestClose = () => {
    if (closing.current || !isOpen.current) return;
    closing.current = true;
    setSlideshow(false);
    stopAll();
    const media = mediaRef.current;
    const backdrop = backdropRef.current;
    const slide = slideRef.current;
    const content = contentRef.current;
    const thumb = current ? thumbs.current.get(current.id) : undefined;
    if (exitRef.current) exitRef.current.style.visibility = "hidden";
    slide?.getAnimations().forEach((a) => a.cancel());
    const backdropFrom = backdrop?.style.opacity ? Number(backdrop.style.opacity) : 1;

    if (reduced || !thumb || !media || !slide || !backdrop) {
      if (content) play(content, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-in" });
      if (backdrop) play(backdrop, [{ opacity: backdropFrom }, { opacity: 0 }], { duration: 180, easing: "ease-in" });
    } else {
      thumb.scrollIntoView({ block: "nearest", inline: "nearest" });
      // Where the image is on screen now, including zoom and any swipe offset.
      const from = media.getBoundingClientRect();
      view.current = { z: 1, x: 0, y: 0 };
      applyView(false);
      slide.style.transform = "";
      const base = media.getBoundingClientRect();
      const to = thumb.getBoundingClientRect();
      thumb.style.visibility = "hidden";
      play(
        media,
        [
          { transformOrigin: "0 0", transform: cover(from, base), borderRadius: radius(from, base, 12) },
          { transformOrigin: "0 0", transform: cover(to, base), borderRadius: radius(to, base, THUMB_RADIUS) },
        ],
        { duration: CLOSE_MS, easing: EASE },
      );
      play(backdrop, [{ opacity: backdropFrom }, { opacity: 0 }], { duration: CLOSE_MS, easing: "ease-out" });
      for (const el of chrome()) play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-in" });
    }
    Promise.all(animations.current.map((a) => a.finished)).then(finish, () => {});
  };

  useLayoutEffect(() => {
    latest.current = {
      items,
      reduced,
      open,
      close: requestClose,
      advance: () => {
        if (!step(1)) setSlideshow(false);
      },
    };
  });

  useImperativeHandle(
    ref,
    () => ({
      open: (i, options) => latest.current.open(i ?? startIndex, options),
      close: () => latest.current.close(),
    }),
    [startIndex],
  );

  // Open: show the dialog and grow the image out of its thumbnail before the first paint.
  useLayoutEffect(() => {
    if (!isShown) return;
    const dialog = dialogRef.current;
    const media = mediaRef.current;
    const backdrop = backdropRef.current;
    const content = contentRef.current;
    if (!dialog || !media || !backdrop || !content) return;
    const { items: list, reduced: still } = latest.current;
    const thumb = thumbs.current.get(list[openedAt.current]?.id ?? "");
    if (!dialog.open) {
      scrollLock.current = lockScroll();
      dialog.showModal();
      isOpen.current = true;
    }
    closeRef.current?.focus({ preventScroll: true });
    const running: Animation[] = [];
    const add = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const a = el.animate(frames, { fill: "both", ...options });
      animations.current.push(a);
      running.push(a);
    };

    if (still || !thumb) {
      add(content, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
      add(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    } else {
      const from = thumb.getBoundingClientRect();
      const base = media.getBoundingClientRect();
      thumb.style.visibility = "hidden";
      add(
        media,
        [
          { transformOrigin: "0 0", transform: cover(from, base), borderRadius: radius(from, base, THUMB_RADIUS) },
          { transformOrigin: "0 0", transform: "none", borderRadius: "12px" },
        ],
        { duration: OPEN_MS, easing: EASE },
      );
      add(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS * 0.8, easing: "ease-out" });
      for (const el of content.querySelectorAll("[data-lightbox-chrome]")) {
        add(
          el,
          [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "translateY(0px)" },
          ],
          { duration: 360, delay: 160, easing: EASE },
        );
      }
    }
    Promise.all(running.map((a) => a.finished))
      .then(() => {
        if (closing.current) return;
        thumb?.style.removeProperty("visibility");
        for (const a of running) {
          a.cancel();
          const at = animations.current.indexOf(a);
          if (at >= 0) animations.current.splice(at, 1);
        }
      })
      .catch(() => {});
  }, [isShown]);

  // Slide between images: the old one leaves, the new one comes in from the side.
  useLayoutEffect(() => {
    const slide = slideRef.current;
    const out = exitRef.current;
    const stage = stageRef.current;
    if (!exit || !slide || !out || !stage) return;
    slide.style.transform = "";
    for (const el of [slide, out]) for (const a of el.getAnimations()) a.cancel();
    const shift = stage.clientWidth * 0.55;
    let leave: Animation;
    if (latest.current.reduced) {
      leave = out.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" });
      slide.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
    } else {
      leave = out.animate(
        [
          { transform: `translateX(${exit.from}px)`, opacity: 1 },
          { transform: `translateX(${exit.from - exit.dir * shift}px) scale(0.9)`, opacity: 0 },
        ],
        { duration: 420, easing: EASE, fill: "forwards" },
      );
      slide.animate(
        [
          { transform: `translateX(${exit.from + exit.dir * shift}px) scale(0.9)`, opacity: 0 },
          { transform: "translateX(0px) scale(1)", opacity: 1 },
        ],
        { duration: 480, easing: EASE },
      );
    }
    leave.finished
      .then(() => {
        if (navToken.current === exit.token) setExit(null);
      })
      .catch(() => {});
  }, [exit]);

  // Keep the active thumbnail in view in the strip.
  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (index === null || !strip) return;
    const button = strip.children[index] as HTMLElement | undefined;
    if (!button) return;
    const left = button.offsetLeft - strip.clientWidth / 2 + button.offsetWidth / 2;
    strip.scrollTo({ left, behavior: latest.current.reduced || !isOpen.current ? "auto" : "smooth" });
  }, [index]);

  // Slideshow: the progress bar is the timer. Moving to another image restarts it.
  useEffect(() => {
    const bar = progressRef.current;
    if (!slideshow || index === null || !bar) return;
    const anim = bar.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: slideshowInterval,
      easing: "linear",
      fill: "forwards",
    });
    progressAnim.current = anim;
    anim.onfinish = () => latest.current.advance();
    return () => {
      anim.onfinish = null;
      anim.cancel();
      progressAnim.current = null;
    };
  }, [slideshow, index, slideshowInterval]);

  useEffect(() => {
    const anim = progressAnim.current;
    if (!anim) return;
    if (paused) anim.pause();
    else if (anim.playState === "paused") anim.play();
  }, [paused, index, slideshow]);

  // Leave the page usable if the component unmounts while open.
  useEffect(() => {
    const list = animations.current;
    return () => {
      for (const a of list.splice(0)) a.cancel();
      if (isOpen.current) unlockScroll(scrollLock.current);
    };
  }, []);

  // ---------- Gestures ----------

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (closing.current || index === null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      slideRef.current?.style.removeProperty("transform");
      gesture.current = {
        kind: "pinch",
        startX: 0,
        startY: 0,
        startT: event.timeStamp,
        dx: 0,
        dy: 0,
        panX: 0,
        panY: 0,
        onMedia: true,
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
        zoom: view.current.z,
      };
      return;
    }
    gesture.current = {
      kind: view.current.z > 1 ? "pan" : "pending",
      startX: event.clientX,
      startY: event.clientY,
      startT: event.timeStamp,
      dx: 0,
      dy: 0,
      panX: view.current.x,
      panY: view.current.y,
      onMedia: Boolean(mediaRef.current?.contains(event.target as Node)),
      dist: 0,
      zoom: view.current.z,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo((g.zoom * dist) / g.dist, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, false, false);
      g.zoom = view.current.z;
      g.dist = dist;
      return;
    }
    g.dx = event.clientX - g.startX;
    g.dy = event.clientY - g.startY;
    if (g.kind === "pan") {
      view.current.x = g.panX + g.dx;
      view.current.y = g.panY + g.dy;
      clampPan();
      applyView(false);
      return;
    }
    if (g.kind === "pending" && Math.hypot(g.dx, g.dy) > 8) {
      g.kind = Math.abs(g.dx) > Math.abs(g.dy) ? "swipe-x" : g.dy > 0 ? "swipe-y" : "none";
    }
    const slide = slideRef.current;
    if (!slide || latest.current.reduced) return;
    if (g.kind === "swipe-x") {
      const atEnd = !loop && index !== null && ((g.dx > 0 && index === 0) || (g.dx < 0 && index === count - 1));
      slide.style.transform = `translateX(${atEnd ? g.dx * 0.3 : g.dx}px)`;
    } else if (g.kind === "swipe-y") {
      const dy = Math.max(0, g.dy);
      slide.style.transform = `translateY(${dy}px) scale(${1 - Math.min(dy, 400) / 1600})`;
      if (backdropRef.current) backdropRef.current.style.opacity = String(Math.max(0.25, 1 - dy / 400));
    }
  };

  const springBack = () => {
    const slide = slideRef.current;
    const backdrop = backdropRef.current;
    if (!slide) return;
    const from = slide.style.transform;
    const fromOpacity = backdrop?.style.opacity;
    slide.style.transform = "";
    if (backdrop) backdrop.style.opacity = "";
    if (!from || latest.current.reduced) return;
    slide.animate([{ transform: from }, { transform: "none" }], { duration: 360, easing: EASE });
    if (backdrop && fromOpacity) backdrop.animate([{ opacity: Number(fromOpacity) }, { opacity: 1 }], { duration: 360, easing: EASE });
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch") {
      if (pointers.current.size > 0) return;
      gesture.current = null;
      if (view.current.z < 1.05) zoomTo(1);
      else {
        setZoom(view.current.z);
        if (slideshow) setPaused(true);
      }
      return;
    }
    gesture.current = null;
    if (event.type === "pointercancel") {
      springBack();
      return;
    }
    const dt = Math.max(1, event.timeStamp - g.startT);
    if (g.kind === "pending") {
      // A tap. Two quick taps on the image toggle zoom; a tap beside it closes.
      const last = lastTap.current;
      if (g.onMedia && last && event.timeStamp - last.t < 320 && Math.hypot(event.clientX - last.x, event.clientY - last.y) < 30) {
        lastTap.current = null;
        if (view.current.z > 1) zoomTo(1);
        else zoomTo(2.5, { x: event.clientX, y: event.clientY });
        return;
      }
      lastTap.current = { t: event.timeStamp, x: event.clientX, y: event.clientY };
      if (!g.onMedia && view.current.z === 1) requestClose();
      return;
    }
    if (g.kind === "swipe-x") {
      if (Math.abs(g.dx) > 70 || Math.abs(g.dx / dt) > 0.5) {
        const from = slideRef.current ? new DOMMatrixReadOnly(getComputedStyle(slideRef.current).transform).m41 : g.dx;
        if (step(g.dx < 0 ? 1 : -1, from)) return;
      }
      springBack();
    } else if (g.kind === "swipe-y") {
      if (g.dy > 120 || (g.dy > 30 && g.dy / dt > 0.6)) requestClose();
      else springBack();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (index === null || closing.current || event.altKey || event.ctrlKey || event.metaKey) return;
    const z = view.current.z;
    const actions: Record<string, () => void> = {
      ArrowRight: () => step(1),
      ArrowLeft: () => step(-1),
      Home: () => goTo(0, -1),
      End: () => goTo(count - 1, 1),
      "+": () => zoomTo(z * 1.6),
      "=": () => zoomTo(z * 1.6),
      "-": () => zoomTo(z / 1.6 < 1.05 ? 1 : z / 1.6),
      "0": () => zoomTo(1),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const toggleSlideshow = () => {
    if (!slideshow) {
      if (view.current.z > 1) resetView();
      setSlideshow(true);
      setPaused(false);
    } else {
      setPaused((p) => !p);
      if (paused && view.current.z > 1) resetView();
    }
  };

  const canPrev = loop || (index ?? 0) > 0;
  const canNext = loop || (index ?? 0) < count - 1;
  const exitItem = exit ? items[exit.index] : null;
  const slideshowLabel = !slideshow ? "Start slideshow" : paused ? "Resume slideshow" : "Pause slideshow";

  return (
    <div className={cn("@container w-full", className)}>
      <ul aria-label={label} className={cn("list-none gap-3 p-0", columnClasses[columns])}>
        {items.map((item, i) => (
          <li key={item.id} className="mb-3 break-inside-avoid">
            <button
              type="button"
              aria-label={item.alt}
              aria-haspopup="dialog"
              ref={(el) => {
                if (el) thumbs.current.set(item.id, el);
                else thumbs.current.delete(item.id);
              }}
              onClick={() => open(i)}
              style={{ aspectRatio: `${item.width} / ${item.height}` }}
              className={cn(
                "group relative block w-full overflow-hidden rounded-2xl bg-surface-2 shadow-[0_1px_2px_rgb(0_0_0/0.08)]",
                "transition-[translate,box-shadow,scale] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-18px_rgb(0_0_0/0.5)] active:scale-[0.98]",
                "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
                ring,
              )}
            >
              <span className="absolute inset-0 block transition-[scale] duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                <Media item={item} />
              </span>
              <span aria-hidden className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
              <span
                aria-hidden
                className="absolute right-2 top-2 grid size-8 scale-75 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-[opacity,scale] duration-300 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5L9 7M2.5 13.5L7 9" />
                </svg>
              </span>
              {item.caption ? (
                <span
                  aria-hidden
                  className="absolute inset-x-2 bottom-2 translate-y-1 truncate rounded-lg bg-black/70 px-2.5 py-1.5 text-left text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-[opacity,translate] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                >
                  {item.caption}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={viewerLabel}
        onCancel={(event) => {
          event.preventDefault();
          requestClose();
        }}
        onClose={finish}
        onKeyDown={onKeyDown}
        className="m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-white backdrop:bg-transparent"
      >
        <div ref={backdropRef} aria-hidden className="absolute inset-0 bg-[#060609]/90 backdrop-blur-xl" />
        {current && index !== null ? (
          <div ref={contentRef} className="@container absolute inset-0 flex flex-col pb-[env(safe-area-inset-bottom)]">
            <div data-lightbox-chrome className="relative z-10 flex items-center gap-2 px-3 pt-3 @2xl:px-5 @2xl:pt-4">
              <p className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium tabular-nums text-white backdrop-blur-md">
                {index + 1} / {count}
              </p>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Zoom out"
                  disabled={zoom <= 1}
                  onClick={() => zoomTo(zoom / 1.6 < 1.05 ? 1 : zoom / 1.6)}
                  className={glassButton}
                >
                  <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="7" cy="7" r="4.5" />
                    <path d="M10.5 10.5L14 14M5 7h4" />
                  </svg>
                </button>
                <span aria-hidden className="w-11 text-center text-xs font-medium tabular-nums text-white/80 @max-sm:hidden">
                  {Math.round(zoom * 100)}%
                </span>
                <button type="button" aria-label="Zoom in" disabled={zoom >= maxZoom} onClick={() => zoomTo(zoom * 1.6)} className={glassButton}>
                  <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="7" cy="7" r="4.5" />
                    <path d="M10.5 10.5L14 14M5 7h4M7 5v4" />
                  </svg>
                </button>
                <button type="button" aria-label={slideshowLabel} onClick={toggleSlideshow} className={glassButton}>
                  <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="currentColor">
                    {slideshow && !paused ? <path d="M4.5 3h2.5v10H4.5zM9 3h2.5v10H9z" /> : <path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z" />}
                  </svg>
                </button>
                <button ref={closeRef} type="button" aria-label="Close viewer" onClick={requestClose} className={glassButton}>
                  <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
            </div>

            <div data-lightbox-chrome aria-hidden className={cn("mx-3 mt-2.5 h-0.5 overflow-hidden rounded-full @2xl:mx-5", slideshow ? "bg-white/15" : "bg-transparent")}>
              {slideshow ? <div ref={progressRef} className="h-full origin-left scale-x-0 rounded-full bg-white" /> : null}
            </div>

            <div
              ref={stageRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={cn("@container-size relative min-h-0 flex-1 touch-none select-none", zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
            >
              {exitItem ? (
                <div ref={exitRef} aria-hidden className={cn(layerClass, "pointer-events-none")}>
                  <div className="relative overflow-hidden rounded-xl shadow-2xl" style={frameStyle(exitItem)}>
                    <Media item={exitItem} />
                  </div>
                </div>
              ) : null}
              <div ref={slideRef} className={layerClass}>
                <div ref={zoomRef} className="will-change-transform">
                  <div
                    ref={mediaRef}
                    role="img"
                    aria-label={current.alt}
                    className={cn("relative overflow-hidden rounded-xl bg-white/5 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)]", zoom === 1 && "cursor-zoom-in")}
                    style={frameStyle(current)}
                  >
                    <Media item={current} />
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Previous image"
                disabled={!canPrev}
                onClick={() => step(-1)}
                data-lightbox-chrome
                className={cn(glassButton, "absolute left-2 top-1/2 z-10 -translate-y-1/2 @2xl:left-4 @2xl:size-12")}
              >
                <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3.5L5.5 8l4.5 4.5" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next image"
                disabled={!canNext}
                onClick={() => step(1)}
                data-lightbox-chrome
                className={cn(glassButton, "absolute right-2 top-1/2 z-10 -translate-y-1/2 @2xl:right-4 @2xl:size-12")}
              >
                <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3.5L10.5 8 6 12.5" />
                </svg>
              </button>
            </div>

            <div data-lightbox-chrome className="flex flex-col items-center gap-3 px-3 pb-3 pt-2 @2xl:pb-5">
              <p className="min-h-5 max-w-2xl text-center text-sm text-white/90">{current.caption ?? current.alt}</p>
              {showThumbnails && count > 1 ? (
                <div
                  ref={stripRef}
                  role="group"
                  aria-label="Thumbnails"
                  className="flex max-w-full gap-2 overflow-x-auto px-1 py-1.5 [scrollbar-width:none]"
                >
                  {items.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`Show image ${i + 1}: ${item.alt}`}
                      aria-current={i === index ? "true" : undefined}
                      onClick={() => goTo(i, i > index ? 1 : -1)}
                      className={cn(
                        "relative h-12 shrink-0 overflow-hidden rounded-lg transition-[opacity,scale,box-shadow] duration-300 motion-reduce:transition-none",
                        i === index ? "scale-105 opacity-100 shadow-[0_0_0_2px_#fff]" : "opacity-50 hover:opacity-90 active:scale-95",
                        "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-white",
                      )}
                      style={{ aspectRatio: `${Math.min(Math.max(item.width / item.height, 0.6), 1.6)}` }}
                    >
                      <Media item={item} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <p aria-live="polite" className="sr-only">
          {current && index !== null ? `Image ${index + 1} of ${count}: ${current.caption ?? current.alt}` : ""}
        </p>
      </dialog>
    </div>
  );
}
