"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type MagneticButtonVariant = "solid" | "outline" | "ghost";
export type MagneticButtonSize = "sm" | "md" | "lg";

export interface MagneticButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style of the button. */
  variant?: MagneticButtonVariant;
  /** Height, padding and font size. */
  size?: MagneticButtonSize;
  /** How far (px) the button can drift toward the pointer. 0 turns the magnet off. */
  strength?: number;
  /** Shows a spinner, sets aria-busy and blocks clicks. */
  loading?: boolean;
  /** Text read by screen readers while loading. */
  loadingLabel?: string;
  /** Icon placed before the label. */
  leftIcon?: ReactNode;
  /** Icon placed after the label. */
  rightIcon?: ReactNode;
  /** Stretch to the width of the parent. */
  fullWidth?: boolean;
}

const variants: Record<MagneticButtonVariant, string> = {
  solid:
    "bg-accent text-accent-foreground shadow-[0_8px_24px_-8px_var(--accent)] hover:shadow-[0_12px_32px_-8px_var(--accent)]",
  outline:
    "border border-border bg-surface text-foreground hover:border-accent/60",
  ghost: "bg-transparent text-foreground hover:bg-surface-2",
};

const sizes: Record<MagneticButtonSize, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-6 text-sm gap-2",
  lg: "h-13 px-8 text-base gap-2.5",
};

/**
 * A button that drifts toward the pointer and lights up where the pointer is.
 * The magnet and glow switch off for touch input, disabled/loading states and
 * users who prefer reduced motion.
 */
export const MagneticButton = forwardRef<HTMLButtonElement, MagneticButtonProps>(
  function MagneticButton(
    {
      variant = "solid",
      size = "md",
      strength = 14,
      loading = false,
      loadingLabel = "Loading",
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      onPointerMove,
      onPointerLeave,
      onClick,
      type = "button",
      ...rest
    },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLButtonElement | null>(null);
    const frame = useRef<number | null>(null);
    const reducedMotion = useRef(false);
    const inactive = disabled || loading;

    useEffect(() => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      const update = () => (reducedMotion.current = query.matches);
      update();
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }, []);

    useEffect(() => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    }, []);

    const setRefs = useCallback(
      (node: HTMLButtonElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const reset = () => {
      const el = innerRef.current;
      if (!el) return;
      el.style.setProperty("--mx", "0px");
      el.style.setProperty("--my", "0px");
      el.style.setProperty("--glow", "0");
    };

    useEffect(() => {
      if (inactive) reset();
    }, [inactive]);

    const handleMove = (event: PointerEvent<HTMLButtonElement>) => {
      onPointerMove?.(event);
      if (inactive || event.pointerType === "touch") return;
      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const dx = (px / rect.width - 0.5) * 2;
      const dy = (py / rect.height - 0.5) * 2;
      const pull = reducedMotion.current ? 0 : strength;
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.setProperty("--mx", `${dx * pull}px`);
        el.style.setProperty("--my", `${dy * pull * 0.6}px`);
        el.style.setProperty("--gx", `${px}px`);
        el.style.setProperty("--gy", `${py}px`);
        el.style.setProperty("--glow", "1");
      });
    };

    const handleLeave = (event: PointerEvent<HTMLButtonElement>) => {
      onPointerLeave?.(event);
      if (frame.current) cancelAnimationFrame(frame.current);
      reset();
    };

    return (
      <button
        ref={setRefs}
        type={type}
        disabled={disabled}
        aria-disabled={inactive || undefined}
        aria-busy={loading || undefined}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onClick={(event) => {
          if (loading) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        className={cn(
          "group relative isolate inline-flex select-none items-center justify-center overflow-hidden rounded-full font-medium",
          "translate-x-(--mx) translate-y-(--my) [--mx:0px] [--my:0px] [--glow:0]",
          "transition-[translate,box-shadow,background-color,border-color,scale] duration-300 ease-out",
          "active:scale-[0.96] motion-reduce:transition-none",
          "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
          loading && "cursor-progress",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className,
        )}
        {...rest}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-(--glow) transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(120px circle at var(--gx, 50%) var(--gy, 50%), color-mix(in oklab, white 35%, transparent), transparent 70%)",
          }}
        />
        <span
          className={cn(
            "inline-flex items-center gap-[inherit] transition-opacity",
            loading && "opacity-0",
          )}
        >
          {leftIcon ? <span aria-hidden className="shrink-0">{leftIcon}</span> : null}
          <span>{children}</span>
          {rightIcon ? (
            <span
              aria-hidden
              className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
            >
              {rightIcon}
            </span>
          ) : null}
        </span>
        {loading ? (
          <span className="absolute inset-0 grid place-items-center">
            <span
              aria-hidden
              className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            />
            <span className="sr-only">{loadingLabel}</span>
          </span>
        ) : null}
      </button>
    );
  },
);
