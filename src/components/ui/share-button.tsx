"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export interface ShareTarget {
  /** Unique id, passed to onShare. */
  id: string;
  /** Accessible name and tooltip, e.g. "Share on LinkedIn". */
  label: string;
  /** Icon inside the round button. */
  icon: ReactNode;
  /** Builds a link from the url and title. Renders an anchor. */
  href?: (url: string, title: string) => string;
  /** Runs on click when there is no href. */
  onClick?: (url: string, title: string) => void;
  /** Copies the url to the clipboard instead. */
  copy?: boolean;
  /** Background of the round button. Use a colour that keeps white icons readable. */
  color?: string;
}

export interface ShareButtonProps {
  /** The link to share. */
  url: string;
  /** Title used in share text and links. */
  title?: string;
  /** Extra text for navigator.share. */
  text?: string;
  /** Share targets. Defaults to X, LinkedIn, WhatsApp, Email and Copy link. */
  targets?: ShareTarget[];
  /** Fan the targets out in an arc, or slide them out in a row. */
  variant?: "radial" | "row";
  /** Which side of the trigger the radial arc opens on. */
  placement?: "top" | "bottom";
  size?: "sm" | "md" | "lg";
  /** Trigger text. Also its accessible name when iconOnly. */
  label?: string;
  /** Show only the share icon on the trigger. */
  iconOnly?: boolean;
  /** Use the native share sheet when the browser has one. */
  preferNative?: boolean;
  /** Called after a target is used ("native" for the share sheet). */
  onShare?: (targetId: string) => void;
  className?: string;
  /** Forwarded to the trigger button. */
  ref?: Ref<HTMLButtonElement>;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function useReducedMotion() {
  const subscribe = useCallback((onChange: () => void) => {
    const list = window.matchMedia(REDUCED_MOTION);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** A damped spring sampled into a CSS linear() easing. Pure maths, safe at module scope. */
function springEasing(stiffness: number, damping: number) {
  const w0 = Math.sqrt(stiffness);
  const zeta = damping / (2 * w0);
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  const duration = -Math.log(0.002) / (zeta * w0);
  const points: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * duration;
    const x = 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    points.push(x.toFixed(3));
  }
  return { easing: `linear(${points.join(", ")})`, duration: Math.round(duration * 1000) };
}

const SPRING = springEasing(240, 15);

/** Seeded pseudo-random numbers, so the confetti is the same on every render. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(7);
const CONFETTI = Array.from({ length: 12 }, (_, i) => ({
  angle: (i / 12) * Math.PI * 2 + rand() * 0.4,
  distance: 26 + rand() * 18,
  size: 4 + Math.round(rand() * 3),
  color: ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"][i % 6],
  round: i % 3 === 0,
}));

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[45%]" fill="currentColor">
      {children}
    </svg>
  );
}

const LinkIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-[45%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    <path d="M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);

/** Default targets built from the url and title. */
export const defaultShareTargets: ShareTarget[] = [
  {
    id: "x",
    label: "Share on X",
    color: "#0f0f10",
    icon: (
      <Svg>
        <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.57L16.67 19.2Z" />
      </Svg>
    ),
    href: (url, title) => `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: "linkedin",
    label: "Share on LinkedIn",
    color: "#0a66c2",
    icon: (
      <Svg>
        <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.83v1.54h.06c.53-1 1.84-2.05 3.79-2.05 4.05 0 4.8 2.67 4.8 6.13V21h-4v-4.98c0-1.19-.02-2.72-1.66-2.72-1.66 0-1.92 1.3-1.92 2.63V21h-4V9.75Z" />
      </Svg>
    ),
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "whatsapp",
    label: "Share on WhatsApp",
    color: "#128c7e",
    icon: (
      <Svg>
        <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.17-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.07.89.9-2.99-.2-.31a8.2 8.2 0 1 1 6.85 3.74Zm4.5-6.13c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04c0 1.2.88 2.37 1 2.53.12.16 1.73 2.64 4.2 3.7 1.56.67 2.17.73 2.95.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.16-.47-.29Z" />
      </Svg>
    ),
    href: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`.trim())}`,
  },
  {
    id: "email",
    label: "Share by email",
    color: "#7c3aed",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="size-[45%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
    href: (url, title) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
  { id: "copy", label: "Copy link", color: "#3f3f46", icon: <LinkIcon />, copy: true },
];

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or not focused: fall through to the legacy path.
  }
  const previous = document.activeElement as HTMLElement | null;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  previous?.focus();
  return ok;
}

const SIZES = {
  sm: { px: 36, radius: 72, trigger: "h-9 gap-1.5 px-3.5 text-sm", icon: "size-4" },
  md: { px: 44, radius: 88, trigger: "h-11 gap-2 px-4.5 text-sm", icon: "size-[18px]" },
  lg: { px: 52, radius: 104, trigger: "h-13 gap-2.5 px-6 text-base", icon: "size-5" },
} as const;

/** Arc of 150° centred above (or below) the trigger. */
const ARC = 150;

/**
 * A share button that blooms open into a spring-loaded radial fan (or a row
 * on narrow containers) of share targets, with a confetti "Copied!" state.
 */
export function ShareButton({
  url,
  title = "",
  text,
  targets = defaultShareTargets,
  variant = "radial",
  placement = "top",
  size = "md",
  label = "Share",
  iconOnly = false,
  preferNative = false,
  onShare,
  className,
  ref,
}: ShareButtonProps) {
  const baseId = useId();
  const listId = `${baseId}-targets`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const copyTimer = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [settled, setSettled] = useState(false);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const [burst, setBurst] = useState(0);
  const [message, setMessage] = useState("");

  const dims = SIZES[size];
  const mode = variant === "row" || narrow ? "row" : "radial";

  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  /**
   * Measures the room around the trigger inside the nearest clipping ancestor
   * (or the viewport). Too little room sideways falls back to a row; too little
   * room on the chosen side flips the arc.
   */
  const measure = () => {
    const trigger = triggerRef.current;
    if (!trigger || variant !== "radial") return;
    const box = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    for (let el = rootRef.current?.parentElement ?? null; el && el !== document.body; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (/hidden|clip|auto|scroll/.test(`${style.overflowX} ${style.overflowY}`)) {
        const rect = el.getBoundingClientRect();
        box.left = Math.max(box.left, rect.left);
        box.top = Math.max(box.top, rect.top);
        box.right = Math.min(box.right, rect.right);
        box.bottom = Math.min(box.bottom, rect.bottom);
        break;
      }
    }
    const rect = trigger.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const need = dims.radius + dims.px / 2 + 6;
    setNarrow(cx - box.left < need || box.right - cx < need);
    const above = cy - box.top;
    const below = box.bottom - cy;
    setFlipped(placement === "top" ? above < need + 28 && below > above : below < need + 28 && above > below);
  };

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setSettled(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Outside pointer down closes the fan.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      close(root.contains(document.activeElement));
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const items = () => [...(rootRef.current?.querySelectorAll<HTMLElement>("[data-share-target]") ?? [])];

  const toggle = async () => {
    if (open) {
      close(false);
      return;
    }
    if (preferNative && typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title: title || undefined, text });
        onShare?.("native");
        return;
      } catch (error) {
        // The person closed the sheet: do nothing. Other errors fall back to the fan.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    setCopied("idle");
    measure();
    setOpen(true);
  };

  const onCopy = async () => {
    const ok = await copyText(url);
    setCopied(ok ? "copied" : "failed");
    setMessage(ok ? "Link copied" : "Couldn't copy the link. Copy it from the address bar.");
    if (ok) {
      setBurst((n) => n + 1);
      onShare?.("copy");
    }
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => {
      setCopied("idle");
      setMessage("");
    }, 2000);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close(true);
      return;
    }
    if (!open) return;
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const onTrigger = document.activeElement === triggerRef.current;
    if (index < 0 && !onTrigger) return;
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = onTrigger ? 0 : (index + 1) % list.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = onTrigger ? list.length - 1 : (index - 1 + list.length) % list.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = list.length - 1;
    if (next >= 0) {
      event.preventDefault();
      list[next]?.focus();
    }
  };

  const count = targets.length;
  const sign = (placement === "top") !== flipped ? -1 : 1;
  const springStyle = reducedMotion ? undefined : SPRING.easing;

  return (
    <div
      ref={rootRef}
      className={cn("relative isolate inline-flex items-center", open && "z-30", className)}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        // Tabbing out of the whole widget closes it.
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null) && event.relatedTarget) close(false);
      }}
    >
      <style href="share-button" precedence="default">
        {`@keyframes share-button-halo { from { opacity: 0.55; transform: translate(-50%, -50%) scale(0.6); } to { opacity: 0; transform: translate(-50%, -50%) scale(1.35); } }`}
      </style>

      {/* Soft bloom behind the radial fan. */}
      {mode === "radial" ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 -z-10 rounded-full transition-[opacity,scale] duration-500 ease-out motion-reduce:transition-none",
            open ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
          style={{
            width: dims.radius * 2 + dims.px * 1.6,
            height: dims.radius * 2 + dims.px * 1.6,
            translate: "-50% -50%",
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--accent) 22%, transparent) 0%, color-mix(in oklab, #ec4899 12%, transparent) 45%, transparent 70%)",
          }}
        />
      ) : null}

      <button
        ref={setTriggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={iconOnly ? label : undefined}
        onClick={toggle}
        className={cn(
          "group/share relative z-10 inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
          "shadow-[0_8px_24px_-10px_rgb(0_0_0/0.55)]",
          open ? "bg-accent text-accent-foreground" : "bg-foreground text-background",
          "transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_color-mix(in_oklab,var(--accent)_80%,transparent)] active:translate-y-0 active:scale-95",
          "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-ring motion-reduce:transition-none",
          iconOnly ? "aspect-square p-0" : dims.trigger,
        )}
        style={iconOnly ? { width: dims.px, height: dims.px } : undefined}
      >
        {/* A ring pulse each time the fan opens. */}
        {open && !reducedMotion ? (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 size-full rounded-full border-2 border-accent"
            style={{ animation: "share-button-halo 600ms ease-out forwards" }}
          />
        ) : null}
        <span aria-hidden className={cn("relative grid place-items-center", dims.icon)}>
          <svg
            viewBox="0 0 24 24"
            className={cn(
              "absolute size-full transition-[opacity,rotate,scale] duration-300 motion-reduce:transition-none",
              open ? "rotate-90 scale-50 opacity-0" : "opacity-100",
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="19" r="2.5" />
            <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
          </svg>
          <svg
            viewBox="0 0 24 24"
            className={cn(
              "absolute size-full transition-[opacity,rotate,scale] duration-300 motion-reduce:transition-none",
              open ? "opacity-100" : "-rotate-90 scale-50 opacity-0",
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </span>
        {iconOnly ? null : <span>{label}</span>}
      </button>

      {/* Row mode: the tray grows in the flow with a grid column transition. */}
      <div
        className={cn(
          mode === "row"
            ? "grid transition-[grid-template-columns] duration-300 ease-out motion-reduce:transition-none"
            : "contents",
        )}
        style={mode === "row" ? { gridTemplateColumns: open ? "1fr" : "0fr" } : undefined}
        onTransitionEnd={(event) => {
          if (event.propertyName === "grid-template-columns" && open) setSettled(true);
        }}
      >
        <div
          className={cn(mode === "row" && "min-w-0", mode === "row" && !(open && (settled || reducedMotion)) && "overflow-hidden")}
          inert={!open}
        >
          <ul
            id={listId}
            role="list"
            aria-label={`${label} options`}
            className={cn(mode === "row" ? "flex items-center gap-2 py-3 pl-2.5 pr-1" : "contents")}
          >
            {targets.map((target, i) => {
              const angle = ((90 + ARC / 2 - (ARC / Math.max(count - 1, 1)) * i) * Math.PI) / 180;
              const x = count === 1 ? 0 : Math.cos(angle) * dims.radius;
              const y = (count === 1 ? dims.radius : Math.sin(angle) * dims.radius) * sign;
              const isCopy = !!target.copy;
              const done = isCopy && copied === "copied";
              const tip = isCopy && copied === "copied" ? "Copied!" : isCopy && copied === "failed" ? "Copy failed" : target.label;
              const delay = open ? i * 40 : (count - 1 - i) * 20;

              const style: CSSProperties =
                mode === "radial"
                  ? {
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: dims.px,
                      height: dims.px,
                      transform: open
                        ? `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(1)`
                        : "translate(-50%, -50%) scale(0.2)",
                      opacity: open ? 1 : 0,
                      transitionProperty: "transform, opacity",
                      transitionDuration: open ? `${SPRING.duration}ms, 200ms` : "180ms, 160ms",
                      transitionTimingFunction: open ? springStyle : "ease-in",
                      transitionDelay: `${delay}ms`,
                    }
                  : {
                      width: dims.px,
                      height: dims.px,
                      transform: open ? "translateX(0) scale(1)" : "translateX(-16px) scale(0.5)",
                      opacity: open ? 1 : 0,
                      transitionProperty: "transform, opacity",
                      transitionDuration: open ? `${SPRING.duration}ms, 200ms` : "160ms, 140ms",
                      transitionTimingFunction: open ? springStyle : "ease-in",
                      transitionDelay: `${delay}ms`,
                    };

              const itemClass = cn(
                "group/target relative grid size-full place-items-center rounded-full text-white",
                "shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_10px_22px_-10px_var(--target)] ring-1 ring-white/15",
                "transition-[translate,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_14px_26px_-8px_var(--target)] active:scale-90",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring motion-reduce:transition-none",
              );
              const itemStyle = { "--target": done ? "#15803d" : target.color ?? "#3f3f46", background: "var(--target)" } as CSSProperties;

              const content = (
                <>
                  {isCopy ? (
                    <span aria-hidden className="relative grid size-full place-items-center">
                      <span className={cn("absolute inset-0 grid place-items-center transition-[opacity,scale] duration-300 motion-reduce:transition-none", done ? "scale-50 opacity-0" : "opacity-100")}>
                        {target.icon}
                      </span>
                      <span className={cn("absolute inset-0 grid place-items-center transition-[opacity,scale] duration-300 motion-reduce:transition-none", done ? "opacity-100" : "scale-50 opacity-0")}>
                        <svg viewBox="0 0 24 24" className="size-[45%]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                      {burst > 0 && !reducedMotion ? <Confetti key={burst} /> : null}
                    </span>
                  ) : (
                    target.icon
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg",
                      "opacity-0 transition-opacity duration-150 group-hover/target:opacity-100 group-focus-visible/target:opacity-100",
                      isCopy && copied !== "idle" && "opacity-100",
                    )}
                  >
                    {tip}
                  </span>
                </>
              );

              return (
                <li key={target.id} style={style} className="motion-reduce:transition-none! list-none">
                  {target.href ? (
                    <a
                      data-share-target=""
                      href={target.href(url, title)}
                      target={target.href(url, title).startsWith("mailto:") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      aria-label={target.label}
                      className={itemClass}
                      style={itemStyle}
                      onClick={() => {
                        onShare?.(target.id);
                        close(true);
                      }}
                    >
                      {content}
                    </a>
                  ) : (
                    <button
                      type="button"
                      data-share-target=""
                      aria-label={isCopy && copied === "copied" ? "Link copied" : target.label}
                      className={itemClass}
                      style={itemStyle}
                      onClick={() => {
                        if (isCopy) {
                          void onCopy();
                          return;
                        }
                        target.onClick?.(url, title);
                        onShare?.(target.id);
                        close(true);
                      }}
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <span className="sr-only" role="status">
        {message}
      </span>
    </div>
  );
}

/** A one-shot burst of seeded confetti from the copy button. */
function Confetti() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const pieces = [...(ref.current?.children ?? [])] as HTMLElement[];
    const animations = pieces.map((piece, i) => {
      const p = CONFETTI[i];
      const dx = Math.cos(p.angle) * p.distance;
      const dy = Math.sin(p.angle) * p.distance;
      return piece.animate(
        [
          { transform: "translate(-50%, -50%) translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
          { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(1) rotate(${i * 50}deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(-50%, -50%) translate(${dx * 1.15}px, ${dy * 1.15 + 10}px) scale(0.4) rotate(${i * 80}deg)`, opacity: 0 },
        ],
        { duration: 700, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" },
      );
    });
    return () => animations.forEach((a) => a.cancel());
  }, []);

  return (
    <span ref={ref} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-0">
      {CONFETTI.map((p, i) => (
        <span
          key={i}
          className={cn("absolute left-0 top-0 opacity-0", p.round ? "rounded-full" : "rounded-[1px]")}
          style={{ width: p.size, height: p.round ? p.size : p.size * 1.6, background: p.color }}
        />
      ))}
    </span>
  );
}
