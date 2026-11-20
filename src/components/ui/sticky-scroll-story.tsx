"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

/** Background presets for the visual panel. */
export type StoryGradient = "aurora" | "sunset" | "ocean" | "forest" | "mono";

export interface StoryStep {
  /** Stable key for the step. */
  id: string;
  title: string;
  description: ReactNode;
  /** Optional short bullet points under the description. */
  bullets?: ReactNode[];
  /**
   * Illustration shown in the sticky panel (and inline on narrow screens).
   * It is decorative: it is hidden from assistive tech and made inert, so keep
   * the real information in the title and description. Leave it out to show
   * the gradient alone.
   */
  visual?: ReactNode;
  /** Panel background behind the visual. */
  gradient?: StoryGradient;
  /** CSS colour for this step's dot, progress line and number. */
  accent?: string;
}

export interface StickyScrollStoryProps {
  steps: StoryStep[];
  /** Small label above the title. */
  eyebrow?: string;
  /** Section heading (rendered as an h2). */
  title?: string;
  /** Intro text under the title. */
  description?: ReactNode;
  /**
   * Height of a self-contained scroll area, e.g. "28rem". When set, the steps
   * scroll inside their own focusable region and the observer uses it as the
   * root. When left out, the section scrolls with the page.
   */
  height?: string;
  /** Side of the sticky visual panel on wide layouts. */
  align?: "start" | "end";
  /** Called with the index and step whenever the active step changes. */
  onStepChange?: (index: number, step: StoryStep) => void;
  /** Accessible name of the scroll region in contained mode. */
  regionLabel?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

const gradients: Record<StoryGradient, string> = {
  aurora:
    "bg-linear-135 from-violet-200 via-indigo-100 to-cyan-200 dark:from-violet-950 dark:via-indigo-950 dark:to-cyan-950",
  sunset:
    "bg-linear-135 from-rose-200 via-orange-100 to-amber-200 dark:from-rose-950 dark:via-orange-950 dark:to-amber-950",
  ocean:
    "bg-linear-135 from-sky-200 via-cyan-100 to-blue-200 dark:from-sky-950 dark:via-cyan-950 dark:to-blue-950",
  forest:
    "bg-linear-135 from-emerald-200 via-teal-100 to-lime-200 dark:from-emerald-950 dark:via-teal-950 dark:to-lime-950",
  mono: "bg-linear-135 from-zinc-200 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800",
};

const EASE = "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Live prefers-reduced-motion flag. False on the server and during hydration. */
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Gradient backdrop with a soft light spot, used by the panel and inline
 * visuals. The content tilts with the --p custom property (0 when unset).
 */
function VisualSurface({
  step,
  inline = false,
  children,
}: {
  step: StoryStep;
  inline?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={cn(inline ? "relative" : "absolute inset-0", gradients[step.gradient ?? "aurora"])}>
      <div className="absolute inset-0 bg-radial-[at_calc(30%_+_var(--p,0)*40%)_0%] from-white/50 to-transparent to-60% dark:from-white/10" />
      <div
        className="absolute -bottom-1/4 left-1/2 size-3/4 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: step.accent ?? "var(--accent)" }}
      />
      <div
        className={cn(
          "relative grid place-items-center [transform:perspective(900px)_rotateX(calc(var(--p,0)*-10deg))_rotateY(calc(var(--p,0)*4deg))_translateY(calc(var(--p,0)*-20px))]",
          inline ? "p-4" : "h-full p-5",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Scroll-driven feature story: a column of steps next to a sticky visual
 * panel. The step crossing the middle of the scroll area becomes active, the
 * progress line fills up to its dot and the panel cross-fades to its visual
 * with a scroll-linked tilt. Narrow containers show each visual inline.
 */
export function StickyScrollStory({
  steps,
  eyebrow,
  title,
  description,
  height,
  align = "end",
  onStepChange,
  regionLabel,
  className,
  ref,
}: StickyScrollStoryProps) {
  const [active, setActive] = useState(0);
  const [stops, setStops] = useState<number[] | null>(null);
  const reduced = useReducedMotion();
  const contained = Boolean(height);
  const baseId = useId();
  const titleId = `${baseId}-title`;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const columnRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);
  const dotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const onStepChangeRef = useRef(onStepChange);
  const stepsRef = useRef(steps);

  useEffect(() => {
    onStepChangeRef.current = onStepChange;
    stepsRef.current = steps;
  });

  const current = Math.min(active, Math.max(steps.length - 1, 0));

  useEffect(() => {
    const step = stepsRef.current[current];
    if (step) onStepChangeRef.current?.(current, step);
  }, [current]);

  // The step that touches a thin band across the middle of the root is active.
  useEffect(() => {
    const root = contained ? scrollRef.current : null;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.index));
          }
        }
      },
      { root, rootMargin: "-49% 0px -49% 0px", threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [contained, steps.length]);

  // Measure the dot centres so the progress line runs exactly from dot to dot.
  useEffect(() => {
    const column = columnRef.current;
    if (!column) return;
    const measure = () => {
      const top = column.getBoundingClientRect().top;
      const next = dotRefs.current
        .slice(0, steps.length)
        .map((dot) => {
          if (!dot) return 0;
          const rect = dot.getBoundingClientRect();
          return Math.round(rect.top + rect.height / 2 - top);
        });
      setStops((prev) =>
        prev && prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(column);
    return () => observer.disconnect();
  }, [steps.length]);

  // Scroll-linked parallax: each panel layer gets its own progress (-1..1)
  // through its step, so the tilt never jumps when the active step changes.
  useEffect(() => {
    const layers = layerRefs.current;
    if (reduced) {
      layers.forEach((layer) => layer?.style.setProperty("--p", "0"));
      return;
    }
    const scroller = contained ? scrollRef.current : null;
    let frame = 0;
    const update = () => {
      frame = 0;
      let middle = window.innerHeight / 2;
      if (scroller) {
        const rect = scroller.getBoundingClientRect();
        middle = rect.top + rect.height / 2;
      }
      stepRefs.current.forEach((step, i) => {
        const layer = layers[i];
        if (!step || !layer) return;
        const rect = step.getBoundingClientRect();
        const progress = (middle - (rect.top + rect.height / 2)) / Math.max(rect.height, 1);
        layer.style.setProperty("--p", Math.max(-1, Math.min(1, progress)).toFixed(3));
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [contained, reduced, steps.length]);

  const goTo = useCallback(
    (index: number) => {
      const el = stepRefs.current[index];
      if (!el) return;
      const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
      const scroller = scrollRef.current;
      const rect = el.getBoundingClientRect();
      if (contained && scroller) {
        const top = rect.top - scroller.getBoundingClientRect().top + scroller.scrollTop;
        scroller.scrollTo({ top: top + rect.height / 2 - scroller.clientHeight / 2, behavior });
      } else {
        window.scrollTo({ top: rect.top + window.scrollY + rect.height / 2 - window.innerHeight / 2, behavior });
      }
      setActive(index);
    },
    [contained, reduced],
  );

  const accentOf = (step: StoryStep | undefined) => step?.accent ?? "var(--accent)";
  const end = align === "end";
  const first = stops?.[0] ?? 0;
  const span = stops && stops.length > 1 ? stops[stops.length - 1] - first : 0;
  const filled = stops && span > 0 ? (stops[current] - first) / span : 0;

  const vars = {
    "--story-h": height ?? "100vh",
    "--story-panel-h": "min(calc(var(--story-h) - 3rem), 32rem)",
    "--story-accent": accentOf(steps[current]),
  } as CSSProperties;

  const body = (
    <div
      className={cn(
        "relative px-3 @3xl:grid @3xl:gap-10 @3xl:px-6",
        end
          ? "@3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
          : "@3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
      )}
    >
      <div ref={columnRef} className="relative">
        {/* Progress rail: track from the first to the last dot, fill up to the active one. */}
        {stops && span > 0 && (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-[21px] w-0.5 rounded-full bg-border",
              end && "@3xl:right-[21px] @3xl:left-auto",
            )}
            style={{ top: first, height: span }}
          >
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-full origin-top rounded-full",
                reduced ? "transition-none" : cn("transition-transform duration-700", EASE),
              )}
              style={{
                transform: `scaleY(${filled})`,
                background: "linear-gradient(to bottom, var(--accent), var(--story-accent))",
              }}
            />
            <div
              className={cn(
                "absolute left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[6px]",
                reduced ? "transition-none" : cn("transition-[top] duration-700", EASE),
              )}
              style={{ top: `${filled * 100}%`, background: "var(--story-accent)" }}
            />
          </div>
        )}

        <ol>
          {steps.map((step, i) => {
            const isActive = i === current;
            const done = i < current;
            const accent = accentOf(step);
            return (
              <li
                key={step.id}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                data-index={i}
                className="flex min-h-[calc(var(--story-h)*0.72)] flex-col justify-center gap-4 py-6"
                style={{ "--dot": accent } as CSSProperties}
              >
                {/* Inline visual for narrow containers (the sticky panel takes over when wide). */}
                <div
                  aria-hidden="true"
                  inert
                  className={cn(
                    "relative ml-11 overflow-hidden rounded-2xl border border-border @3xl:hidden",
                    reduced ? "transition-none" : cn("transition-[transform,filter] duration-500", EASE),
                    isActive ? "scale-100 grayscale-0" : "scale-[0.97] grayscale-[0.5]",
                  )}
                >
                  <VisualSurface step={step} inline>
                    {step.visual ?? <div className="h-40" />}
                  </VisualSurface>
                </div>

                <div className={cn("flex items-start", end && "@3xl:flex-row-reverse")}>
                  <div className="flex w-11 shrink-0 justify-center pt-[1.1rem]">
                    <button
                      ref={(el) => {
                        dotRefs.current[i] = el;
                      }}
                      type="button"
                      aria-label={`Go to step ${i + 1}: ${step.title}`}
                      aria-current={isActive ? "step" : undefined}
                      onClick={() => goTo(i)}
                      className="group/dot relative z-10 grid size-8 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-3.5 rounded-full border-2 group-hover/dot:scale-125 group-active/dot:scale-90",
                          reduced ? "transition-none" : "transition-[transform,background-color,border-color,box-shadow] duration-300",
                          isActive
                            ? "scale-125 border-transparent bg-(--dot) shadow-[0_0_0_5px_color-mix(in_oklab,var(--dot)_22%,transparent),0_0_18px_2px_var(--dot)]"
                            : done
                              ? "border-transparent bg-(--dot)"
                              : "border-border bg-surface",
                        )}
                      />
                    </button>
                  </div>

                  <div
                    className={cn(
                      "min-w-0 flex-1 rounded-2xl border p-4 sm:p-5",
                      reduced ? "transition-none" : cn("transition-[background-color,border-color,box-shadow,transform] duration-500", EASE),
                      isActive
                        ? "border-border bg-surface shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--dot)_70%,transparent)]"
                        : cn("border-transparent", !reduced && (end ? "@3xl:-translate-x-1" : "@3xl:translate-x-1")),
                    )}
                  >
                    <div className="flex items-baseline gap-3">
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums transition-colors duration-300",
                          isActive
                            ? "bg-[color-mix(in_oklab,var(--dot)_18%,transparent)] text-foreground"
                            : "text-muted",
                        )}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3
                        className={cn(
                          "text-lg font-semibold tracking-tight transition-colors duration-300 sm:text-xl",
                          isActive ? "text-foreground" : "text-muted",
                        )}
                      >
                        {step.title}
                      </h3>
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-muted text-pretty">{step.description}</div>
                    {step.bullets && step.bullets.length > 0 && (
                      <ul className="mt-3 grid gap-1.5 text-sm text-muted">
                        {step.bullets.map((bullet, b) => (
                          <li key={b} className="flex gap-2">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 16 16"
                              className="mt-0.5 size-4 shrink-0"
                              fill="none"
                              stroke="var(--dot)"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m3.5 8.5 3 3 6-7" />
                            </svg>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Sticky panel (wide containers only). */}
      <div className={cn("hidden @3xl:block", !end && "@3xl:order-first")}>
        <div
          aria-hidden="true"
          inert
          className="sticky top-[calc((var(--story-h)_-_var(--story-panel-h))/2)] my-6 h-(--story-panel-h)"
        >
          <div className="relative h-full overflow-hidden rounded-3xl border border-border bg-surface-2 shadow-[0_30px_60px_-30px_color-mix(in_oklab,var(--story-accent)_55%,transparent)]">
            {steps.map((step, i) => {
              const state = i === current ? "active" : i < current ? "past" : "next";
              return (
                <div
                  key={step.id}
                  ref={(el) => {
                    layerRefs.current[i] = el;
                  }}
                  className={cn(
                    "absolute inset-0",
                    reduced
                      ? "transition-none"
                      : cn("transition-[opacity,transform,filter,visibility] duration-700", EASE),
                    state === "active" && "visible opacity-100",
                    state !== "active" && "invisible opacity-0",
                    !reduced && state === "past" && "-translate-y-6 scale-[1.04] blur-sm",
                    !reduced && state === "next" && "translate-y-6 scale-[0.94] blur-sm",
                  )}
                >
                  <VisualSurface step={step}>{step.visual}</VisualSurface>
                </div>
              );
            })}

            {/* Step counter and pips. */}
            <div className="absolute inset-x-4 top-4 flex gap-1.5">
              {steps.map((step, i) => (
                <span key={step.id} className="h-1 flex-1 overflow-hidden rounded-full bg-surface">
                  <span
                    className={cn(
                      "block h-full origin-left rounded-full",
                      reduced ? "transition-none" : "transition-transform duration-500",
                      i <= current ? "scale-x-100" : "scale-x-0",
                    )}
                    style={{ background: accentOf(steps[current]) }}
                  />
                </span>
              ))}
            </div>
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground shadow-sm">
              <span className="font-mono tabular-nums text-muted">
                {String(current + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
              </span>
              <span>{steps[current]?.title}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      className={cn("@container w-full min-w-0", className)}
      style={vars}
    >
      {(eyebrow || title || description) && (
        <header className="mb-4 max-w-2xl px-3 @3xl:px-6">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>}
          {title && (
            <h2 id={titleId} className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground text-balance sm:text-3xl">
              {title}
            </h2>
          )}
          {description && <div className="mt-2 text-sm leading-relaxed text-muted text-pretty">{description}</div>}
        </header>
      )}

      {contained ? (
        <div
          ref={scrollRef}
          role="region"
          aria-label={regionLabel ?? (title ? `${title}, scrollable steps` : "Scrollable steps")}
          tabIndex={0}
          className="relative overflow-y-auto overscroll-contain rounded-3xl border border-border bg-background focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          style={{ height }}
        >
          {body}
        </div>
      ) : (
        body
      )}
    </section>
  );
}
