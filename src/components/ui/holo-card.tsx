"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type HoloCardVariant = "holo" | "gold" | "glass";
export type HoloCardPattern = "sparkle" | "etched" | "none";

export interface HoloCardStat {
  label: string;
  value: ReactNode;
}

export interface HoloCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "onClick"> {
  /** Card name. Also names the link or button. */
  title: string;
  /** Short line under the title. */
  subtitle?: string;
  /** Image URL shown in the art window. */
  image?: string;
  /** Alt text for `image`. Leave empty for a decorative image. */
  imageAlt?: string;
  /** Icon or illustration shown in the art window when there is no image. */
  art?: ReactNode;
  /** Up to 3 or 4 stats, shown in a row. */
  stats?: HoloCardStat[];
  /** Rarity or tier badge, e.g. "Mythic". */
  rarity?: string;
  /** Small print at the bottom of the card. */
  footer?: ReactNode;
  /** Foil finish. */
  variant?: HoloCardVariant;
  /** Texture over the foil. Defaults to sparkle (holo), etched (gold) or none (glass). */
  pattern?: HoloCardPattern;
  /** Strength of the foil and glare, 0 to 1. */
  intensity?: number;
  /** Largest tilt in degrees. */
  maxTilt?: number;
  /** Makes the whole card a link. */
  href?: string;
  /** Makes the whole card a button (ignored when `href` is set). */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Accessible name for the link or button. Defaults to the title. */
  actionLabel?: string;
  /** Dims the card, stops the tilt and disables the link or button. */
  disabled?: boolean;
}

interface VariantStyle {
  frame: string;
  frameStyle?: CSSProperties;
  art: string;
  foil: string;
  frameBlend: CSSProperties["mixBlendMode"];
  artBlend: CSSProperties["mixBlendMode"];
  panel: string;
  muted: string;
  divider: string;
  badge: string;
  glow: string;
  pattern: HoloCardPattern;
}

// Card colours are fixed per finish (like a printed card), except glass, which
// follows the theme. Text always sits on an opaque panel to keep 4.5:1 contrast.
const variants: Record<HoloCardVariant, VariantStyle> = {
  holo: {
    frame: "shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)]",
    frameStyle: {
      backgroundImage:
        "linear-gradient(150deg, #3730a3 0%, #1e1b4b 34%, #0f172a 64%, #4c1d95 100%)",
    },
    art: "radial-gradient(circle at 50% 30%, #4f46e5 0%, #1e1b4b 58%, #0b1020 100%)",
    foil: "repeating-linear-gradient(115deg, hsl(2 100% 73%) 0%, hsl(48 100% 68%) 5%, hsl(96 100% 70%) 10%, hsl(178 100% 72%) 15%, hsl(226 100% 74%) 20%, hsl(284 100% 74%) 25%, hsl(2 100% 73%) 30%)",
    frameBlend: "color-dodge",
    artBlend: "color-dodge",
    panel: "bg-[#0b1020] text-zinc-50",
    muted: "text-indigo-200",
    divider: "border-white/12",
    badge: "bg-[#0b1020] text-indigo-100 ring-1 ring-white/30",
    glow: "rgb(167 139 250 / 0.55)",
    pattern: "sparkle",
  },
  gold: {
    frame: "shadow-[inset_0_0_0_1px_rgb(255_244_200/0.45)]",
    frameStyle: {
      backgroundImage:
        "linear-gradient(135deg, #7c5a17 0%, #e9c46a 22%, #fff3c4 38%, #b8892c 56%, #f4d58d 76%, #7c5a17 100%)",
    },
    art: "radial-gradient(circle at 50% 32%, #7a5312 0%, #3a2608 55%, #170f04 100%)",
    foil: "repeating-linear-gradient(120deg, #6b4a12 0%, #d9ad4f 4%, #fff1c1 6.5%, #d9ad4f 9%, #6b4a12 13%)",
    frameBlend: "overlay",
    artBlend: "color-dodge",
    panel: "bg-[#1a1206] text-amber-50",
    muted: "text-amber-200",
    divider: "border-amber-200/15",
    badge: "bg-[#1a1206] text-amber-200 ring-1 ring-amber-300/50",
    glow: "rgb(251 191 36 / 0.5)",
    pattern: "etched",
  },
  glass: {
    frame:
      "bg-linear-to-br from-white/85 to-white/40 backdrop-blur-xl shadow-[inset_0_0_0_1px_rgb(15_23_42/0.1)] dark:from-white/15 dark:to-white/[0.03] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)]",
    art: "radial-gradient(circle at 30% 20%, #e0f2fe 0%, transparent 55%), linear-gradient(135deg, #c7d2fe 0%, #fbcfe8 55%, #bae6fd 100%)",
    foil: "repeating-linear-gradient(125deg, #a5f3fc 0%, #c4b5fd 8%, #fbcfe8 16%, #fde68a 24%, #a5f3fc 32%)",
    frameBlend: "soft-light",
    artBlend: "overlay",
    panel: "bg-surface text-foreground ring-1 ring-border",
    muted: "text-muted",
    divider: "border-border",
    badge: "bg-foreground text-background",
    glow: "rgb(125 211 252 / 0.55)",
    pattern: "none",
  },
};

const patterns: Record<Exclude<HoloCardPattern, "none">, CSSProperties> = {
  sparkle: {
    backgroundImage:
      "radial-gradient(circle at 20% 30%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 70% 62%, #fff 0 1.2px, transparent 2px), radial-gradient(circle at 46% 86%, #fff 0 0.8px, transparent 1.4px)",
    backgroundSize: "38px 38px, 53px 53px, 29px 29px",
    backgroundPosition:
      "calc(var(--px) * -0.4px) calc(var(--py) * -0.4px), calc(var(--px) * 0.3px) calc(var(--py) * 0.3px), calc(var(--px) * -0.2px) calc(var(--py) * 0.2px)",
    mixBlendMode: "color-dodge",
    opacity: "calc(var(--intensity) * (0.25 + var(--shine) * 0.75))",
  },
  etched: {
    backgroundImage:
      "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.22) 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, rgb(255 255 255 / 0.14) 0 1px, transparent 1px 7px)",
    mixBlendMode: "overlay",
    opacity: "calc(var(--intensity) * (0.35 + var(--shine) * 0.65))",
    maskImage:
      "radial-gradient(circle at calc(var(--px) * 1%) calc(var(--py) * 1%), #000 0%, rgb(0 0 0 / 0.25) 65%)",
    WebkitMaskImage:
      "radial-gradient(circle at calc(var(--px) * 1%) calc(var(--py) * 1%), #000 0%, rgb(0 0 0 / 0.25) 65%)",
  },
};

const glare =
  "radial-gradient(farthest-corner circle at calc(var(--px) * 1%) calc(var(--py) * 1%), rgb(255 255 255 / 0.85) 0%, rgb(255 255 255 / 0.3) 18%, rgb(255 255 255 / 0) 52%)";

const foilMask =
  "radial-gradient(circle at calc(var(--px) * 1%) calc(var(--py) * 1%), #000 8%, rgb(0 0 0 / 0.4) 62%)";

/** Foil, texture, glare and the reduced-motion sheen. Decorative only. */
function ShineLayers({
  style,
  blend,
  pattern,
}: {
  style: VariantStyle;
  blend: CSSProperties["mixBlendMode"];
  pattern: HoloCardPattern;
}) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: style.foil,
          backgroundSize: "220% 220%",
          backgroundPosition: "calc(100% - var(--px) * 1%) calc(100% - var(--py) * 1%)",
          mixBlendMode: blend,
          opacity: "calc(var(--intensity) * (0.2 + var(--shine) * 0.6))",
          maskImage: foilMask,
          WebkitMaskImage: foilMask,
        }}
      />
      {pattern !== "none" ? (
        <div aria-hidden className="pointer-events-none absolute inset-0" style={patterns[pattern]} />
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: glare,
          mixBlendMode: "overlay",
          opacity: "calc(var(--intensity) * var(--shine) * 0.9)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden motion-reduce:block"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 25%, rgb(255 255 255 / 0.22) 45%, transparent 62%)",
        }}
      />
    </>
  );
}

type SpringKey = "rx" | "ry" | "px" | "py" | "shine";
type SpringValues = Record<SpringKey, number>;
const KEYS: SpringKey[] = ["rx", "ry", "px", "py", "shine"];
const REST: SpringValues = { rx: 0, ry: 0, px: 50, py: 50, shine: 0 };
const ZERO: SpringValues = { rx: 0, ry: 0, px: 0, py: 0, shine: 0 };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * A collectible trading card with a 3D tilt, a rainbow foil, a texture layer
 * and a glare that follow the pointer. A small spring drives every value so
 * the card settles back with a soft wobble. All motion is written to CSS
 * custom properties inside requestAnimationFrame, never React state.
 */
export const HoloCard = forwardRef<HTMLDivElement, HoloCardProps>(function HoloCard(
  {
    title,
    subtitle,
    image,
    imageAlt = "",
    art,
    stats = [],
    rarity,
    footer,
    variant = "holo",
    pattern,
    intensity = 1,
    maxTilt = 14,
    href,
    onClick,
    actionLabel,
    disabled = false,
    className,
    style,
    onPointerMove,
    onPointerLeave,
    onPointerUp,
    onFocus,
    onBlur,
    ...rest
  },
  forwardedRef,
) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const reducedMotion = useRef(false);
  const touchLit = useRef(false);
  const focused = useRef(false);
  const sim = useRef({ cur: { ...REST }, vel: { ...ZERO }, target: { ...REST } });

  const id = useId();
  const titleId = `${id}-title`;
  const subtitleId = `${id}-subtitle`;
  const v = variants[variant];
  const activePattern = pattern ?? v.pattern;
  const interactive = Boolean(href || onClick);
  const level = clamp(intensity, 0, 1);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const write = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const { cur } = sim.current;
    el.style.setProperty("--rx", cur.rx.toFixed(2));
    el.style.setProperty("--ry", cur.ry.toFixed(2));
    el.style.setProperty("--px", cur.px.toFixed(2));
    el.style.setProperty("--py", cur.py.toFixed(2));
    el.style.setProperty("--shine", clamp(cur.shine, 0, 1).toFixed(3));
  }, []);

  // Starts the spring loop if it is not already running. Each frame moves
  // every value toward its target and stops once everything is at rest.
  const aim = useCallback(
    (target: SpringValues) => {
      sim.current.target = target;
      if (frame.current !== null) return;

      function tick(now: number) {
        const s = sim.current;
        const dt = lastTime.current === null ? 1 / 60 : Math.min(0.032, (now - lastTime.current) / 1000);
        lastTime.current = now;
        let moving = false;
        for (const k of KEYS) {
          // Light point (px/py) follows tightly; tilt and shine wobble a little.
          const stiffness = k === "px" || k === "py" ? 240 : 170;
          const damping = k === "px" || k === "py" ? 28 : 16;
          const force = (s.target[k] - s.cur[k]) * stiffness - s.vel[k] * damping;
          s.vel[k] += force * dt;
          s.cur[k] += s.vel[k] * dt;
          if (Math.abs(s.vel[k]) < 0.01 && Math.abs(s.target[k] - s.cur[k]) < 0.01) {
            s.cur[k] = s.target[k];
            s.vel[k] = 0;
          } else {
            moving = true;
          }
        }
        write();
        if (moving) {
          frame.current = requestAnimationFrame(tick);
        } else {
          frame.current = null;
          lastTime.current = null;
        }
      }

      frame.current = requestAnimationFrame(tick);
    },
    [write],
  );

  const aimAtPoint = (clientX: number, clientY: number) => {
    const el = rootRef.current;
    if (!el) return;
    // Measure the untransformed wrapper, not the tilted card, so the
    // tilt never feeds back into the pointer maths.
    const rect = el.getBoundingClientRect();
    const nx = clamp((clientX - rect.left) / rect.width, 0, 1);
    const ny = clamp((clientY - rect.top) / rect.height, 0, 1);
    aim({
      rx: (0.5 - ny) * 2 * maxTilt,
      ry: (nx - 0.5) * 2 * maxTilt,
      px: nx * 100,
      py: ny * 100,
      shine: 1,
    });
  };

  const focusPose: SpringValues = { rx: maxTilt * 0.35, ry: -maxTilt * 0.5, px: 28, py: 22, shine: 0.8 };

  const settle = () => {
    touchLit.current = false;
    aim(focused.current ? focusPose : { ...REST });
  };

  const hardReset = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    lastTime.current = null;
    touchLit.current = false;
    sim.current = { cur: { ...REST }, vel: { ...ZERO }, target: { ...REST } };
    const el = rootRef.current;
    if (!el) return;
    for (const k of ["--rx", "--ry", "--px", "--py", "--shine"]) el.style.removeProperty(k);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedMotion.current = query.matches;
      if (query.matches) hardReset();
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [hardReset]);

  useEffect(() => {
    if (disabled) hardReset();
  }, [disabled, hardReset]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const still = () => disabled || reducedMotion.current;

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    // Touch moves usually mean scrolling; leave them to the browser.
    if (still() || event.pointerType === "touch") return;
    aimAtPoint(event.clientX, event.clientY);
  };

  const handleLeave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    if (still() || event.pointerType === "touch") return;
    settle();
  };

  const handleUp = (event: PointerEvent<HTMLDivElement>) => {
    onPointerUp?.(event);
    if (still() || event.pointerType !== "touch") return;
    // A tap toggles the shine at the tapped spot.
    if (touchLit.current) {
      settle();
    } else {
      touchLit.current = true;
      aimAtPoint(event.clientX, event.clientY);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    let visible = false;
    try {
      visible = event.target.matches(":focus-visible");
    } catch {
      visible = true;
    }
    if (!visible) return;
    focused.current = true;
    if (!still()) aim(focusPose);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    if (!focused.current) return;
    focused.current = false;
    if (!still()) settle();
  };

  const actionClass = cn(
    "absolute inset-0 z-10 rounded-[22px] outline-none",
    "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-ring",
    disabled ? "cursor-not-allowed" : "cursor-pointer",
  );

  const action = !interactive ? null : href ? (
    <a
      data-holo-action=""
      href={disabled ? undefined : href}
      role={disabled ? "link" : undefined}
      aria-disabled={disabled || undefined}
      aria-label={actionLabel}
      aria-labelledby={actionLabel ? undefined : titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      className={actionClass}
    />
  ) : (
    <button
      data-holo-action=""
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={actionLabel}
      aria-labelledby={actionLabel ? undefined : titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      className={actionClass}
    />
  );

  return (
    <div
      ref={setRefs}
      {...rest}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onPointerUp={handleUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
      data-variant={variant}
      className={cn(
        "relative w-full max-w-72 [perspective:1000px]",
        "[--px:50] [--py:50] [--rx:0] [--ry:0] [--shine:0]",
        "transition-[scale,opacity] duration-150 ease-out motion-reduce:transition-none",
        interactive && !disabled && "[&:has([data-holo-action]:active)]:scale-[0.98]",
        disabled && "opacity-55 saturate-50",
        className,
      )}
      style={{ "--intensity": level, ...style } as CSSProperties}
    >
      <div
        className="relative rounded-[22px] [transform-style:preserve-3d]"
        style={{
          transform:
            "rotateX(calc(var(--rx) * 1deg)) rotateY(calc(var(--ry) * 1deg)) scale(calc(1 + var(--shine) * 0.03))",
          boxShadow:
            `calc(var(--ry) * -0.9px) calc(18px + var(--rx) * 0.9px) 42px -14px rgb(0 0 0 / 0.5), 0 0 calc(var(--shine) * 28px) calc(var(--shine) * -6px) ${v.glow}`,
        }}
      >
        {/* Frame: base finish plus foil, isolated so blend modes stay inside it. */}
        <div
          aria-hidden
          className={cn("absolute inset-0 isolate overflow-hidden rounded-[inherit]", v.frame)}
          style={v.frameStyle}
        >
          <ShineLayers style={v} blend={v.frameBlend} pattern={activePattern} />
        </div>

        <div
          className={cn(
            "relative flex flex-col gap-2.5 p-2.5 [transform-style:preserve-3d]",
            interactive && "pointer-events-none",
          )}
        >
          {/* Art window, lifted toward the viewer for parallax. */}
          <div
            className="relative isolate grid aspect-[4/3] place-items-center overflow-hidden rounded-[15px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]"
            style={{ backgroundImage: v.art, transform: "translateZ(28px)" }}
          >
            {image ? (
              // A plain img keeps the component free of next/image config.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={imageAlt} className="absolute inset-0 size-full object-cover" draggable={false} />
            ) : art ? (
              <div aria-hidden className="relative grid size-full place-items-center">
                {art}
              </div>
            ) : null}
            <ShineLayers style={v} blend={v.artBlend} pattern={activePattern} />
          </div>

          {rarity ? (
            <span
              className={cn(
                "absolute right-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider shadow-lg",
                v.badge,
              )}
              style={{ transform: "translateZ(56px)" }}
            >
              {rarity}
            </span>
          ) : null}

          {/* Text panel: opaque so the foil never lowers text contrast. */}
          <div
            className={cn("rounded-[15px] px-3.5 pb-3 pt-3", v.panel)}
            style={{ transform: "translateZ(18px)" }}
          >
            <h3 id={titleId} className="truncate text-base font-semibold leading-tight">
              {title}
            </h3>
            {subtitle ? (
              <p id={subtitleId} className={cn("mt-0.5 truncate text-xs", v.muted)}>
                {subtitle}
              </p>
            ) : null}

            {stats.length > 0 ? (
              <dl
                className={cn("mt-3 grid divide-x border-t pt-2.5", v.divider)}
                style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
              >
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className={cn("flex min-w-0 flex-col-reverse items-center px-1 text-center", v.divider)}
                  >
                    <dt className={cn("truncate text-[10px] font-medium uppercase tracking-wider", v.muted)}>
                      {stat.label}
                    </dt>
                    <dd className="truncate text-sm font-semibold tabular-nums">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {footer ? (
              <div className={cn("mt-2.5 border-t pt-2 text-[11px]", v.divider, v.muted)}>{footer}</div>
            ) : null}
          </div>
        </div>

        {action}
      </div>
    </div>
  );
});
