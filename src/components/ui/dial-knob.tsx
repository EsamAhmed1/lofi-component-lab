"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/cn";

export interface DialKnobProps {
  /** Controlled value. */
  value?: number;
  /** Starting value when uncontrolled. Also the double-click reset target. */
  defaultValue?: number;
  /** Called with the new value each time the knob moves to another detent. */
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  /** Detent size. Values always snap to min + n × step. */
  step?: number;
  /** "log" spreads the sweep logarithmically (good for frequencies). Needs min > 0. */
  taper?: "linear" | "log";
  /** Visible label, also names the slider. */
  label: string;
  /** Unit shown under the value and read by screen readers, e.g. "%" or "Hz". */
  unit?: string;
  /** Formats the number in the centre, the end labels and aria-valuetext. */
  formatValue?: (value: number) => string;
  /** Value restored by double-click. Defaults to defaultValue, then min. */
  resetValue?: number;
  /** Diameter of the dial in px. */
  size?: number;
  /** Any CSS colour for the lit ticks, arc, notch and glow. */
  color?: string;
  disabled?: boolean;
  /** Name for a hidden input so the value submits with a form. */
  name?: string;
  /** Buzz briefly (navigator.vibrate) on each detent where supported. */
  haptics?: boolean;
  className?: string;
}

const START = -135;
const SWEEP = 270;
const TICKS = 37; // 7.5° apart; every 4th is a major tick.
/** Pixels of vertical drag for a full sweep. Shift makes it 4× finer. */
const DRAG_RANGE = 220;

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Point on a circle, 0° at the top, clockwise. Rounded so server and client markup match. */
function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [round3(50 + r * Math.cos(a)), round3(50 + r * Math.sin(a))];
}

const ARC_R = 37;
const [arcX0, arcY0] = polar(ARC_R, START);
const [arcX1, arcY1] = polar(ARC_R, START + SWEEP);
const ARC_PATH = `M ${arcX0} ${arcY0} A ${ARC_R} ${ARC_R} 0 1 1 ${arcX1} ${arcY1}`;

const TICK_LINES = Array.from({ length: TICKS }, (_, i) => {
  const major = i % 4 === 0;
  const deg = START + (SWEEP * i) / (TICKS - 1);
  const [x1, y1] = polar(major ? 42.5 : 44, deg);
  const [x2, y2] = polar(48, deg);
  return { i, major, x1, y1, x2, y2, at: i / (TICKS - 1) };
});

function decimals(step: number) {
  const text = String(step);
  return text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
}

/**
 * A rotary knob like a synth or hi-fi control. 270° sweep with lit ticks and a
 * glowing arc, a soft 3D body with a notch, and snapping detents. Drag up and
 * down on the body, drag around the ring, use the wheel or the keyboard.
 * Exposed as role="slider".
 */
export function DialKnob({
  value,
  defaultValue,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  taper = "linear",
  label,
  unit = "",
  formatValue,
  resetValue,
  size = 132,
  color = "var(--accent)",
  disabled = false,
  name,
  haptics = false,
  className,
}: DialKnobProps) {
  const [inner, setInner] = useState(defaultValue ?? min);
  const [dragging, setDragging] = useState(false);
  const current = Math.min(max, Math.max(min, value ?? inner));
  const log = taper === "log" && min > 0;

  const knobRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const latest = useRef(current);
  useLayoutEffect(() => {
    latest.current = current;
  }, [current]);
  const reducedMotion = useRef(false);
  const dragState = useRef<{ id: number; mode: "vertical" | "circular"; y: number; pos: number } | null>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<number | null>(null);
  const labelId = useId();

  /** Value → 0..1 position along the sweep. */
  const toPos = (v: number) => {
    if (max === min) return 0;
    if (log) return Math.log(v / min) / Math.log(max / min);
    return (v - min) / (max - min);
  };
  /** 0..1 position → raw value. */
  const fromPos = (p: number) => {
    const t = Math.min(1, Math.max(0, p));
    return log ? min * Math.pow(max / min, t) : min + t * (max - min);
  };
  const snap = (v: number) => {
    const snapped = Math.round((v - min) / step) * step + min;
    return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals(step)));
  };
  // One keyboard / wheel detent in position space.
  const posStep = log ? 0.01 : step / Math.max(step, max - min);

  const format = (v: number) => (formatValue ? formatValue(v) : String(v));
  const valueText = `${format(current)}${unit ? ` ${unit}` : ""}`;
  const pos = toPos(current);
  const angle = START + SWEEP * pos;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => (reducedMotion.current = query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const commit = (raw: number) => {
    const next = snap(raw);
    if (next === latest.current) return;
    latest.current = next;
    if (value === undefined) setInner(next);
    onChange?.(next);
    if (haptics && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(5);
    if (!reducedMotion.current) {
      bodyRef.current?.animate(
        [{ scale: "0.965" }, { scale: "1" }],
        { duration: 140, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
      );
    }
  };

  /** Moves by whole detents; always moves at least one step if it can. */
  const nudge = (detents: number) => {
    const v = latest.current;
    let next = snap(fromPos(toPos(v) + detents * posStep));
    if (next === v) next = snap(v + Math.sign(detents) * step);
    commit(next);
  };

  // Wheel needs a non-passive listener so it can stop the page from scrolling.
  // It only fires while the pointer is over the knob.
  const onWheelStep = useEffectEvent((detents: number) => nudge(detents));
  useEffect(() => {
    const el = knobRef.current;
    if (!el || disabled) return;
    let acc = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY;
      if (Math.abs(delta) >= 50) {
        // A mouse wheel notch is one detent.
        acc = 0;
        onWheelStep(delta < 0 ? 1 : -1);
        return;
      }
      // Trackpads send many small deltas; add them up.
      acc += delta;
      const detents = Math.trunc(acc / 24);
      if (detents) {
        acc -= detents * 24;
        onWheelStep(-detents);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [disabled]);

  const angleAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    return { deg: (Math.atan2(dx, -dy) * 180) / Math.PI, dist: Math.hypot(dx, dy) / rect.width };
  };

  const posFromAngle = (deg: number) => {
    if (deg < START || deg > START + SWEEP) {
      // In the dead zone at the bottom: stick to the nearer end.
      return toPos(latest.current) > 0.5 ? 1 : 0;
    }
    return (deg - START) / SWEEP;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const { deg, dist } = angleAt(event);
    // Grabbing the outer ring turns the dial to that point; the body drags vertically.
    const mode = dist > 0.34 ? "circular" : "vertical";
    dragState.current = { id: event.pointerId, mode, y: event.clientY, pos: toPos(latest.current) };
    setDragging(true);
    if (mode === "circular") commit(fromPos(posFromAngle(deg)));
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || state.id !== event.pointerId) return;
    if (state.mode === "circular") {
      pending.current = fromPos(posFromAngle(angleAt(event).deg));
    } else {
      const range = event.shiftKey ? DRAG_RANGE * 4 : DRAG_RANGE;
      pending.current = fromPos(state.pos + (state.y - event.clientY) / range);
    }
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        if (pending.current !== null) commit(pending.current);
        pending.current = null;
      });
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.id !== event.pointerId) return;
    dragState.current = null;
    setDragging(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const keys: Record<string, () => void> = {
      ArrowUp: () => nudge(1),
      ArrowRight: () => nudge(1),
      ArrowDown: () => nudge(-1),
      ArrowLeft: () => nudge(-1),
      PageUp: () => nudge(10),
      PageDown: () => nudge(-10),
      Home: () => commit(min),
      End: () => commit(max),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const reset = () => {
    if (!disabled) commit(resetValue ?? defaultValue ?? min);
  };

  const [minX, minY] = polar(50, START);
  const [maxX, maxY] = polar(50, START + SWEEP);
  const body = size * 0.62;

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-2", className)}
      style={{ "--dial-color": color } as CSSProperties}
    >
      <span id={labelId} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </span>

      <div
        ref={knobRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={labelId}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-valuetext={valueText}
        aria-orientation="vertical"
        aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onDoubleClick={reset}
        data-dragging={dragging || undefined}
        className={cn(
          "group relative shrink-0 touch-none select-none rounded-full outline-none",
          "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-ring",
          disabled ? "cursor-not-allowed" : "cursor-grab data-dragging:cursor-grabbing",
        )}
        style={{ width: size, height: size }}
      >
        {/* Track: unlit ticks and the empty arc. */}
        <svg aria-hidden viewBox="0 0 100 100" className={cn("absolute inset-0 size-full overflow-visible text-border", disabled && "opacity-60")}>
          <path d={ARC_PATH} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          {TICK_LINES.map((t) => (
            <line
              key={t.i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="currentColor"
              strokeWidth={t.major ? 1.6 : 1}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Lit layer. The glow is a CSS filter on the <svg> because filters on SVG children are unreliable in WebKit. */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className={cn(
            "absolute inset-0 size-full overflow-visible transition-[filter] duration-300",
            disabled
              ? "text-muted"
              : "text-(--dial-color) [filter:drop-shadow(0_0_2px_var(--dial-color))] group-hover:[filter:drop-shadow(0_0_5px_var(--dial-color))]",
          )}
        >
          <path
            d={ARC_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${round3(pos * 100)} 100`}
            opacity={pos > 0 ? 1 : 0}
          />
          {TICK_LINES.filter((t) => t.at <= pos + 1e-6).map((t) => (
            <line
              key={t.i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="currentColor"
              strokeWidth={t.major ? 1.8 : 1.2}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* End labels sit at the two ends of the sweep. */}
        <span
          aria-hidden
          className="absolute -translate-x-1/2 text-[10px] tabular-nums text-muted"
          style={{ left: `${minX}%`, top: `calc(${minY}% + 3px)` }}
        >
          {format(min)}
        </span>
        <span
          aria-hidden
          className="absolute -translate-x-1/2 text-[10px] tabular-nums text-muted"
          style={{ left: `${maxX}%`, top: `calc(${maxY}% + 3px)` }}
        >
          {format(max)}
        </span>

        {/* Knob body. */}
        <div
          ref={bodyRef}
          aria-hidden
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
            disabled && "opacity-60",
            "bg-[radial-gradient(circle_at_32%_28%,var(--surface)_0%,var(--surface-2)_70%)]",
            "shadow-[7px_8px_16px_rgb(0_0_0/0.16),-6px_-6px_14px_rgb(255_255_255/0.9),inset_1px_1px_1px_rgb(255_255_255/0.9),inset_-2px_-3px_6px_rgb(0_0_0/0.06)]",
            "dark:shadow-[8px_10px_20px_rgb(0_0_0/0.65),-5px_-5px_14px_rgb(255_255_255/0.045),inset_1px_1px_1px_rgb(255_255_255/0.08),inset_-2px_-3px_8px_rgb(0_0_0/0.5)]",
            "transition-shadow duration-200",
            "group-data-dragging:shadow-[3px_4px_8px_rgb(0_0_0/0.18),-3px_-3px_8px_rgb(255_255_255/0.8),inset_2px_3px_6px_rgb(0_0_0/0.08)]",
            "dark:group-data-dragging:shadow-[3px_4px_10px_rgb(0_0_0/0.6),-3px_-3px_8px_rgb(255_255_255/0.04),inset_2px_3px_8px_rgb(0_0_0/0.55)]",
          )}
          style={{ width: body, height: body }}
        >
          {/* Rotating cap with the pointer notch. A springy transition gives each detent a small click. */}
          <div
            className="absolute inset-[7%] rounded-full border border-border/70 transition-[rotate] duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
            style={{ rotate: `${round3(angle)}deg` }}
          >
            <span
              className={cn(
                "absolute left-1/2 top-[7%] size-[12%] -translate-x-1/2 rounded-full",
                disabled ? "bg-muted" : "bg-(--dial-color) shadow-[0_0_8px_var(--dial-color)]",
              )}
            />
          </div>
        </div>

        {/* Readout. Does not rotate. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none"
        >
          <span className={cn("font-mono font-semibold tabular-nums", disabled ? "text-muted" : "text-foreground")} style={{ fontSize: Math.max(12, size * 0.13) }}>
            {format(current)}
          </span>
          {unit ? (
            <span className="mt-1 text-muted" style={{ fontSize: Math.max(10, size * 0.075) }}>
              {unit}
            </span>
          ) : null}
        </span>
      </div>

      {name ? <input type="hidden" name={name} value={current} /> : null}
    </div>
  );
}
