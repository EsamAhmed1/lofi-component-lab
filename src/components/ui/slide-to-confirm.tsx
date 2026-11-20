"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export type SlideToConfirmVariant = "default" | "danger" | "success";
export type SlideToConfirmStatus = "idle" | "loading" | "success" | "error";

export interface SlideToConfirmProps {
  /** Text in the track, also the slider's accessible name. */
  label?: string;
  /** Text shown while onConfirm is pending. */
  confirmLabel?: string;
  /** Text shown once onConfirm resolves. */
  successLabel?: string;
  /** Text shown if onConfirm rejects. The slider resets so the user can retry. */
  errorLabel?: string;
  /** Runs when the slide completes. Return a Promise to show loading until it settles. */
  onConfirm?: () => void | Promise<unknown>;
  variant?: SlideToConfirmVariant;
  /** Fraction of the track (0–1) the thumb must pass before release confirms. */
  threshold?: number;
  /** Milliseconds after success before it resets. Leave out to stay confirmed. */
  resetAfter?: number;
  disabled?: boolean;
  /** Icon inside the thumb. Defaults to a double chevron. */
  icon?: ReactNode;
  /** Width of the control (px number or any CSS length). Never exceeds its parent. */
  width?: number | string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const PAD = 4; // track padding, px
const THUMB = 48; // thumb size, px
const PARTICLES = 12;

const tones: Record<SlideToConfirmVariant, { color: string; solid: string }> = {
  default: { color: "var(--accent)", solid: "bg-accent text-accent-foreground" },
  danger: { color: "#dc2626", solid: "bg-red-600 text-white" },
  success: { color: "#10b981", solid: "bg-emerald-500 text-emerald-950" },
};

const STYLES = `
@keyframes slide-to-confirm-shimmer {
  from { -webkit-mask-position: 100% 0; mask-position: 100% 0; }
  to { -webkit-mask-position: 0% 0; mask-position: 0% 0; }
}
@keyframes slide-to-confirm-pulse {
  50% { opacity: 0.45; }
}
@keyframes slide-to-confirm-draw {
  to { stroke-dashoffset: 0; }
}
.slide-to-confirm-shimmer {
  -webkit-mask-image: linear-gradient(100deg, transparent 38%, #000 50%, transparent 62%);
  mask-image: linear-gradient(100deg, transparent 38%, #000 50%, transparent 62%);
  -webkit-mask-size: 250% 100%;
  mask-size: 250% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  animation: slide-to-confirm-shimmer 2.6s ease-in-out infinite;
}
.slide-to-confirm-pulse { animation: slide-to-confirm-pulse 1.1s ease-in-out infinite; }
.slide-to-confirm-check path {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: slide-to-confirm-draw 0.45s 0.15s ease-out forwards;
}
@media (prefers-reduced-motion: reduce) {
  .slide-to-confirm-shimmer { display: none; }
  .slide-to-confirm-pulse { animation: none; opacity: 0.7; }
  .slide-to-confirm-check path { animation: none; stroke-dashoffset: 0; }
}
`;

function Chevrons() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 5l5 5-5 5M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * iOS-style slide to confirm. Drag the thumb past the threshold and release, or
 * use the keyboard: it is a role="slider" where arrows and Home/End move the
 * thumb, reaching the end or pressing Enter/Space confirms. Handles async
 * confirmation with loading, success (with a particle burst) and error states.
 */
export function SlideToConfirm({
  label = "Slide to confirm",
  confirmLabel = "Confirming…",
  successLabel = "Confirmed",
  errorLabel = "Something went wrong. Slide to try again.",
  onConfirm,
  variant = "default",
  threshold = 0.9,
  resetAfter,
  disabled = false,
  icon,
  width = 320,
  className,
  ref,
}: SlideToConfirmProps) {
  const [status, setStatus] = useState<SlideToConfirmStatus>("idle");
  const trackRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<HTMLDivElement | null>(null);
  const x = useRef(0);
  const max = useRef(0);
  const statusRef = useRef<SlideToConfirmStatus>("idle");
  const drag = useRef<{ id: number; offset: number } | null>(null);
  const moveFrame = useRef<number | null>(null);
  const springFrame = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const reducedMotion = useRef(false);

  const tone = tones[variant];
  const limit = Math.min(1, Math.max(0.05, threshold));
  const inactive = disabled || status === "loading" || status === "success";

  const valueText = useCallback(
    (pct: number) => {
      const s = statusRef.current;
      if (s === "loading") return confirmLabel;
      if (s === "success") return successLabel;
      if (disabled) return `${pct}%, unavailable`;
      return `${pct}%. Press Enter to confirm`;
    },
    [confirmLabel, successLabel, disabled],
  );

  // Writes the thumb position to CSS custom properties and the slider's ARIA
  // values directly, so dragging never re-renders React.
  const apply = useCallback(
    (next: number) => {
      const el = trackRef.current;
      if (!el) return;
      x.current = next;
      const p = max.current > 0 ? next / max.current : 0;
      const pct = Math.round(p * 100);
      el.style.setProperty("--stc-x", `${next}px`);
      el.style.setProperty("--stc-p", p.toFixed(4));
      // The thumb rolls along the track like a wheel.
      el.style.setProperty("--stc-rot", reducedMotion.current ? "0deg" : `${((next / (THUMB / 2)) * 180) / Math.PI}deg`);
      el.toggleAttribute("data-armed", p >= limit);
      el.setAttribute("aria-valuenow", String(pct));
      el.setAttribute("aria-valuetext", valueText(pct));
    },
    [limit, valueText],
  );

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    max.current = Math.max(0, el.clientWidth - PAD * 2 - THUMB);
  }, []);

  const stopSpring = () => {
    if (springFrame.current) cancelAnimationFrame(springFrame.current);
    springFrame.current = null;
  };

  // Damped spring toward `target`. The ends of the track act as walls, so a
  // spring-back bounces off the start instead of overshooting out of the track.
  const springTo = useCallback(
    (target: number, stiffness = 380, damping = 20) => {
      stopSpring();
      if (reducedMotion.current) {
        apply(target);
        return;
      }
      let pos = x.current;
      let vel = 0;
      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(0.032, (now - last) / 1000);
        last = now;
        vel += (-stiffness * (pos - target) - damping * vel) * dt;
        pos += vel * dt;
        if (pos < 0) {
          pos = 0;
          vel = -vel * 0.45;
        } else if (pos > max.current) {
          pos = max.current;
          vel = -vel * 0.45;
        }
        if (Math.abs(vel) < 4 && Math.abs(pos - target) < 0.5) {
          apply(target);
          springFrame.current = null;
          return;
        }
        apply(pos);
        springFrame.current = requestAnimationFrame(step);
      };
      springFrame.current = requestAnimationFrame(step);
    },
    [apply],
  );

  const setStatusBoth = (next: SlideToConfirmStatus) => {
    statusRef.current = next;
    setStatus(next);
  };

  const reset = useCallback(() => {
    busy.current = false;
    statusRef.current = "idle";
    setStatus("idle");
    springTo(0, 260, 22);
  }, [springTo]);

  const confirm = async () => {
    if (busy.current || disabled) return;
    busy.current = true;
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    setStatusBoth("loading");
    springTo(max.current, 600, 32);
    try {
      const result = onConfirm?.();
      if (result && typeof (result as Promise<unknown>).then === "function") await result;
      if (!mounted.current) return;
      setStatusBoth("success");
      if (resetAfter !== undefined) resetTimer.current = window.setTimeout(reset, resetAfter);
    } catch {
      if (!mounted.current) return;
      busy.current = false;
      setStatusBoth("error");
      springTo(0);
    }
  };

  useEffect(() => {
    mounted.current = true;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => (reducedMotion.current = query.matches);
    update();
    query.addEventListener("change", update);
    return () => {
      mounted.current = false;
      query.removeEventListener("change", update);
      if (moveFrame.current) cancelAnimationFrame(moveFrame.current);
      if (springFrame.current) cancelAnimationFrame(springFrame.current);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  // Keep the thumb inside the track when the control resizes.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const sync = () => {
      measure();
      const s = statusRef.current;
      apply(s === "loading" || s === "success" ? max.current : Math.min(x.current, max.current));
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, apply]);

  // Refresh aria-valuetext when the status or labels change.
  useEffect(() => {
    apply(x.current);
  }, [status, apply]);

  // Error shake and success particle burst (skipped for reduced motion).
  useEffect(() => {
    if (reducedMotion.current) return;
    const animations: Animation[] = [];
    if (status === "error" && trackRef.current) {
      animations.push(
        trackRef.current.animate(
          [
            { translate: "0" },
            { translate: "-8px" },
            { translate: "7px" },
            { translate: "-4px" },
            { translate: "2px" },
            { translate: "0" },
          ],
          { duration: 420, easing: "ease-out" },
        ),
      );
    }
    if (status === "success" && particlesRef.current) {
      const dots = Array.from(particlesRef.current.children) as HTMLElement[];
      dots.forEach((dot, i) => {
        const angle = (i / dots.length) * Math.PI * 2 + 0.3;
        const dist = 34 + (i % 3) * 9;
        const dx = Math.cos(angle) * dist * 1.9;
        const dy = Math.sin(angle) * dist;
        animations.push(
          dot.animate(
            [
              { transform: "translate(0, 0) scale(1)", opacity: 1 },
              { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0 },
            ],
            { duration: 700 + (i % 4) * 70, delay: 120, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" },
          ),
        );
      });
    }
    return () => animations.forEach((a) => a.cancel());
  }, [status]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (inactive || (event.pointerType === "mouse" && event.button !== 0)) return;
    stopSpring();
    measure();
    if (statusRef.current === "error") setStatusBoth("idle");
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, offset: event.clientX - x.current };
    trackRef.current?.setAttribute("data-dragging", "");
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const next = Math.min(max.current, Math.max(0, event.clientX - d.offset));
    if (moveFrame.current) cancelAnimationFrame(moveFrame.current);
    moveFrame.current = requestAnimationFrame(() => apply(next));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    trackRef.current?.removeAttribute("data-dragging");
    if (moveFrame.current) cancelAnimationFrame(moveFrame.current);
    const final = Math.min(max.current, Math.max(0, event.clientX - d.offset));
    apply(final);
    if (!cancelled && max.current > 0 && final / max.current >= limit) void confirm();
    else springTo(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (inactive) return;
    measure();
    const step = max.current / 10;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = x.current + step;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = x.current - step;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = max.current;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        void confirm();
        return;
      default:
        return;
    }
    event.preventDefault();
    if (statusRef.current === "error") setStatusBoth("idle");
    const clamped = Math.min(max.current, Math.max(0, next));
    if (clamped >= max.current - 0.5) {
      void confirm();
      return;
    }
    springTo(clamped, 520, 30);
  };

  const onBlur = () => {
    if (!drag.current && statusRef.current !== "loading" && statusRef.current !== "success" && x.current > 0) springTo(0);
  };

  const statusMessage =
    status === "loading" ? confirmLabel
    : status === "success" ? successLabel
    : status === "error" ? errorLabel
    : "";

  return (
    <div
      ref={ref}
      className={cn("relative max-w-full select-none", className)}
      style={{ width, "--stc-color": tone.color } as CSSProperties}
    >
      <style href="slide-to-confirm" precedence="default">
        {STYLES}
      </style>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        aria-valuetext={disabled ? "0%, unavailable" : "0%. Press Enter to confirm"}
        aria-disabled={inactive || undefined}
        aria-busy={status === "loading" || undefined}
        data-status={status}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={cn(
          "group/slide relative h-14 w-full overflow-hidden rounded-full border bg-surface-2 transition-[border-color,box-shadow] duration-300",
          "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
          status === "error" ? "border-red-500/70" : "border-border",
          disabled && "cursor-not-allowed",
        )}
      >
        {/* Trail that fills behind the thumb. */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-[color-mix(in_oklab,var(--stc-color)_22%,transparent)]",
            "group-data-armed/slide:bg-[color-mix(in_oklab,var(--stc-color)_32%,transparent)]",
            status === "loading" && "slide-to-confirm-pulse",
            disabled && "hidden",
          )}
          style={{ width: `calc(var(--stc-x, 0px) + ${THUMB + PAD * 2}px)` }}
        />

        {/* Idle / error label with a light sweep. Fades as the thumb moves. */}
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center pr-5 pl-15 text-sm font-medium transition-opacity duration-200",
            (status === "loading" || status === "success") && "opacity-0",
          )}
          style={status === "idle" || status === "error" ? { opacity: "calc(1 - var(--stc-p, 0) * 1.7)" } : undefined}
        >
          <span className="relative min-w-0 truncate">
            <span className={status === "error" ? "text-red-700 dark:text-red-300" : "text-muted"}>
              {status === "error" ? errorLabel : label}
            </span>
            {status === "idle" && !disabled ? (
              <span aria-hidden className="slide-to-confirm-shimmer absolute inset-0 truncate text-foreground">
                {label}
              </span>
            ) : null}
          </span>
        </span>

        {/* Loading text, left of the parked thumb. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center pr-15 pl-5 text-sm font-medium text-foreground transition-opacity duration-300",
            status === "loading" ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="truncate">{confirmLabel}</span>
        </span>

        {/* Thumb. */}
        <div
          aria-hidden
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => endDrag(event, false)}
          onPointerCancel={(event) => endDrag(event, true)}
          className={cn(
            "absolute top-1/2 left-1 z-10 grid size-12 -translate-y-1/2 touch-pan-y place-items-center rounded-full",
            "shadow-[0_6px_16px_-6px_var(--stc-color)] transition-[scale,opacity,box-shadow] duration-300 ease-[cubic-bezier(0.3,1.5,0.5,1)]",
            "group-data-armed/slide:shadow-[0_0_0_6px_color-mix(in_oklab,var(--stc-color)_28%,transparent),0_6px_20px_-4px_var(--stc-color)]",
            disabled ? "cursor-not-allowed border border-border bg-surface text-muted shadow-none" : tone.solid,
            !inactive && "cursor-grab hover:scale-105 active:scale-95 active:cursor-grabbing",
            status === "success" && "scale-50 opacity-0",
          )}
          style={{ transform: "translateX(var(--stc-x, 0px))" }}
        >
          {disabled ? (
            <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4.5" y="9" width="11" height="8" rx="2" />
              <path d="M7 9V6.5a3 3 0 016 0V9" strokeLinecap="round" />
            </svg>
          ) : status === "loading" ? (
            <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-[spin_2s_linear_infinite]" />
          ) : (
            <span className="relative grid place-items-center">
              <span
                className="grid place-items-center transition-[opacity,scale] duration-200 group-data-armed/slide:scale-50 group-data-armed/slide:opacity-0"
                style={{ transform: "rotate(var(--stc-rot, 0deg))" }}
              >
                {icon ?? <Chevrons />}
              </span>
              <svg
                viewBox="0 0 20 20"
                className="absolute size-5 scale-50 opacity-0 transition-[opacity,scale] duration-200 group-data-armed/slide:scale-100 group-data-armed/slide:opacity-100"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
              >
                <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>

        {/* Success: the whole track turns solid with a drawn check. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-opacity duration-300",
            tone.solid,
            status === "success" ? "opacity-100" : "opacity-0",
          )}
        >
          {status === "success" ? (
            <>
              <svg viewBox="0 0 20 20" className="slide-to-confirm-check size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="truncate">{successLabel}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Particle burst on success. */}
      <div ref={particlesRef} aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: PARTICLES }, (_, i) => (
          <span
            key={i}
            className={cn("absolute top-1/2 left-1/2 -translate-1/2 rounded-full opacity-0", i % 2 ? "size-1.5" : "size-2")}
            style={{ background: i % 3 === 0 ? "#fbbf24" : "var(--stc-color)" }}
          />
        ))}
      </div>

      <span role="status" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}
