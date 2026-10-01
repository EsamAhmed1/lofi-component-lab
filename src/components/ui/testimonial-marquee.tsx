import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

export interface Testimonial {
  /** The quote itself. Keep it to one or two sentences. */
  quote: string;
  /** Person's name. */
  name: string;
  /** Role and company, e.g. "Head of Growth, Northwind". */
  role?: string;
  /** Optional avatar image. Falls back to initials. */
  avatarUrl?: string;
  /** Star rating from 0 to 5. Hidden when omitted. */
  rating?: number;
}

export interface TestimonialMarqueeProps {
  /** Testimonials to scroll. Rows split them evenly. */
  testimonials: Testimonial[];
  /** Optional heading shown above the marquee. */
  heading?: string;
  /** Optional supporting line under the heading. */
  subheading?: string;
  /** Number of scrolling rows. The second row runs the other way. */
  rows?: 1 | 2;
  /** Seconds for one full loop. Higher is slower. */
  duration?: number;
  /** Pause the motion while the pointer or keyboard focus is inside. */
  pauseOnHover?: boolean;
  /** Accessible name for the region when there is no heading. */
  ariaLabel?: string;
  className?: string;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Stars({ value }: { value: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rounded} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          aria-hidden
          className={cn("size-4", i < rounded ? "fill-amber-400" : "fill-border")}
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </div>
  );
}

function Card({ item }: { item: Testimonial }) {
  return (
    <figure className="flex w-[280px] shrink-0 flex-col justify-between gap-5 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:w-[340px] sm:p-6">
      <div className="space-y-3">
        {typeof item.rating === "number" ? <Stars value={item.rating} /> : null}
        <blockquote className="text-[15px] leading-relaxed text-foreground">
          “{item.quote}”
        </blockquote>
      </div>
      <figcaption className="flex items-center gap-3">
        {item.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.avatarUrl}
            alt=""
            className="size-10 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-10 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent"
          >
            {initials(item.name)}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{item.name}</span>
          {item.role ? (
            <span className="block truncate text-xs text-muted">{item.role}</span>
          ) : null}
        </span>
      </figcaption>
    </figure>
  );
}

function Row({
  items,
  reverse,
  duration,
  pauseOnHover,
}: {
  items: Testimonial[];
  reverse: boolean;
  duration: number;
  pauseOnHover: boolean;
}) {
  const style = { "--marquee-duration": `${duration}s` } as CSSProperties;
  return (
    <div
      className={cn(
        "group/row relative overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        // Reduced motion: no animation, scroll by hand instead.
        "motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]",
      )}
    >
      <div
        style={style}
        className={cn(
          "flex w-max gap-4 py-1 sm:gap-6",
          "animate-[marquee-x_var(--marquee-duration)_linear_infinite] motion-reduce:animate-none",
          reverse && "[animation-direction:reverse]",
          pauseOnHover &&
            "group-hover/row:[animation-play-state:paused] group-focus-within/row:[animation-play-state:paused]",
        )}
      >
        {/* The list is rendered twice so the loop is seamless; the copy is hidden from assistive tech. */}
        <ul className="flex shrink-0 gap-4 sm:gap-6" role="list">
          {items.map((item, i) => (
            <li key={`${item.name}-${i}`}>
              <Card item={item} />
            </li>
          ))}
        </ul>
        <ul aria-hidden className="flex shrink-0 gap-4 motion-reduce:hidden sm:gap-6">
          {items.map((item, i) => (
            <li key={`copy-${item.name}-${i}`}>
              <Card item={item} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * An infinitely scrolling wall of testimonials. Pure CSS animation (no JS),
 * pauses on hover or focus, and becomes a scrollable row for users who prefer
 * reduced motion.
 */
export function TestimonialMarquee({
  testimonials,
  heading,
  subheading,
  rows = 2,
  duration = 40,
  pauseOnHover = true,
  ariaLabel = "Customer testimonials",
  className,
}: TestimonialMarqueeProps) {
  const headingId = useId();
  if (testimonials.length === 0) return null;

  const rowCount = rows === 2 && testimonials.length > 1 ? 2 : 1;
  const split = Math.ceil(testimonials.length / rowCount);
  const groups =
    rowCount === 2
      ? [testimonials.slice(0, split), testimonials.slice(split)]
      : [testimonials];

  return (
    <section
      aria-label={heading ? undefined : ariaLabel}
      aria-labelledby={heading ? headingId : undefined}
      className={cn("w-full space-y-8", className)}
    >
      {heading || subheading ? (
        <header className="mx-auto max-w-2xl px-4 text-center">
          {heading ? (
            <h2
              id={headingId}
              className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
            >
              {heading}
            </h2>
          ) : null}
          {subheading ? (
            <p className="mt-3 text-sm text-muted text-pretty sm:text-base">{subheading}</p>
          ) : null}
        </header>
      ) : null}
      <div className="space-y-4 sm:space-y-6">
        {groups.map((group, i) => (
          <Row
            key={i}
            items={group}
            reverse={i === 1}
            duration={duration}
            pauseOnHover={pauseOnHover}
          />
        ))}
      </div>
    </section>
  );
}
