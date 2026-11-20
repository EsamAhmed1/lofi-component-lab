"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export type TeamSocialIcon = "x" | "linkedin" | "github" | "dribbble" | "website" | "email";

export interface TeamSocial {
  /** Visible name, e.g. "GitHub". */
  label: string;
  href: string;
  /** Built-in icon name or your own icon node. */
  icon?: TeamSocialIcon | ReactNode;
}

export interface FlipTeamCardProps {
  name: string;
  role: string;
  location?: string;
  /** Defaults to the first letters of the first and last name. */
  initials?: string;
  /** Two colours for the portrait gradient. Pick deep tones: the initials are white. */
  colors?: [string, string];
  /** Short line on the portrait, e.g. "Team lead". */
  badge?: string;
  bio?: string;
  skills?: string[];
  socials?: TeamSocial[];
  contactLabel?: string;
  /** Contact link, e.g. a mailto: URL. */
  contactHref?: string;
  /** Called when Contact is pressed (used when there is no contactHref). */
  onContact?: () => void;
  /** "click" flips on click, tap or Enter. "hover" also flips while a mouse is over the card. */
  flipOn?: "click" | "hover";
  /** "featured" adds a glowing animated ring. */
  variant?: "default" | "featured";
  /** Controlled flip state. */
  flipped?: boolean;
  defaultFlipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
  /** Largest pointer tilt in degrees. 0 turns it off. */
  maxTilt?: number;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  ref?: Ref<HTMLElement>;
}

const STYLES = `
@keyframes flip-team-card-spin { to { transform: rotate(360deg); } }
.flip-team-card-ring { animation: flip-team-card-spin 5s linear infinite; }
@media (prefers-reduced-motion: reduce) { .flip-team-card-ring { animation: none; } }`;

function SocialIcon({ icon }: { icon: TeamSocialIcon }) {
  const common = { viewBox: "0 0 24 24", className: "size-4", "aria-hidden": true } as const;
  switch (icon) {
    case "x":
      return (
        <svg {...common} fill="currentColor">
          <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common} fill="currentColor">
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3v-11zm6.5 0h3.8v1.5h.06c.53-1 1.83-2 3.77-2 4.03 0 4.77 2.65 4.77 6.1v5.4h-4v-4.8c0-1.14-.02-2.62-1.6-2.62-1.6 0-1.84 1.25-1.84 2.54v4.88h-4v-11z" />
        </svg>
      );
    case "github":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
        </svg>
      );
    case "dribbble":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M5 5.5c4 4.2 9.5 6 15.8 5.2M8.5 21c1-5.5 4.6-9.2 11-10.3M9 3c3.2 3.8 5.4 9 6.3 17.5" />
        </svg>
      );
    case "email":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M4 7l8 6 8-6" />
        </svg>
      );
    default:
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M2.5 12h19M12 2.5c2.6 2.7 3.9 5.9 3.9 9.5s-1.3 6.8-3.9 9.5c-2.6-2.7-3.9-5.9-3.9-9.5S9.4 5.2 12 2.5z" />
        </svg>
      );
  }
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")).toUpperCase();
};

/**
 * Team member card that flips in 3D. The front shows a gradient portrait with
 * initials, the name, role and location; the back shows a bio, skills, social
 * links and a Contact button. One toggle button (aria-pressed) controls the
 * flip, and the hidden face is inert. Pointer tilt and gloss are written to
 * CSS custom properties in requestAnimationFrame.
 */
export function FlipTeamCard({
  name,
  role,
  location,
  initials,
  colors = ["#6d28d9", "#be185d"],
  badge,
  bio,
  skills = [],
  socials = [],
  contactLabel = "Contact",
  contactHref,
  onContact,
  flipOn = "click",
  variant = "default",
  flipped: controlled,
  defaultFlipped = false,
  onFlippedChange,
  maxTilt = 8,
  headingLevel = 3,
  className,
  ref,
}: FlipTeamCardProps) {
  const [inner, setInner] = useState(defaultFlipped);
  const flipped = controlled ?? inner;
  const H = `h${headingLevel}` as "h3";
  const id = useId();
  const nameId = `${id}-name`;
  const featured = variant === "featured";
  const [c1, c2] = colors;

  const wrapRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const frame = useRef(0);
  const target = useRef({ rx: 0, ry: 0, gx: 50, gy: 30, gloss: 0 });
  const reducedMotion = useRef(false);
  const lastPointer = useRef<string>("mouse");

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => (reducedMotion.current = query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const setFlipped = (next: boolean) => {
    if (next === flipped) return;
    if (controlled === undefined) setInner(next);
    onFlippedChange?.(next);
  };

  const write = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = tiltRef.current;
      if (!el) return;
      const t = target.current;
      el.style.setProperty("--rx", `${t.rx.toFixed(2)}deg`);
      el.style.setProperty("--ry", `${t.ry.toFixed(2)}deg`);
      el.style.setProperty("--gx", `${t.gx.toFixed(1)}%`);
      el.style.setProperty("--gy", `${t.gy.toFixed(1)}%`);
      el.style.setProperty("--gloss", t.gloss.toFixed(2));
    });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || reducedMotion.current || maxTilt <= 0) return;
    const el = wrapRef.current;
    if (!el) return;
    // Measure the untransformed wrapper so the tilt never feeds back into the maths.
    const rect = el.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    target.current = { rx: (0.5 - ny) * 2 * maxTilt, ry: (nx - 0.5) * 2 * maxTilt, gx: nx * 100, gy: ny * 100, gloss: 1 };
    write();
  };

  const onPointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (flipOn === "hover" && event.pointerType === "mouse") setFlipped(true);
  };

  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    target.current = { rx: 0, ry: 0, gx: 50, gy: 30, gloss: 0 };
    write();
    if (flipOn === "hover" && event.pointerType === "mouse") setFlipped(false);
  };

  // A click on the card itself flips it. Links, buttons and hover-mode mouse clicks are left alone.
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a, button")) return;
    if (flipOn === "hover" && lastPointer.current === "mouse") return;
    setFlipped(!flipped);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && flipped) {
      event.stopPropagation();
      setFlipped(false);
      toggleRef.current?.focus();
    }
  };

  const faceBase =
    "relative col-start-1 row-start-1 flex flex-col overflow-hidden rounded-[1.6rem] border border-border bg-surface backface-hidden shadow-[0_22px_50px_-28px_rgb(15_23_42/0.55)] motion-reduce:transition-opacity motion-reduce:duration-300";

  return (
    <article
      ref={ref}
      aria-labelledby={nameId}
      onKeyDown={onKeyDown}
      className={cn("relative w-full min-w-0", className)}
    >
      <style>{STYLES}</style>
      <div
        ref={wrapRef}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={(e) => (lastPointer.current = e.pointerType)}
        onClick={onClick}
        className="relative cursor-pointer"
      >
        <div
          ref={tiltRef}
          className="relative transition-transform duration-300 ease-out [perspective:1400px] motion-reduce:transition-none"
          style={{ transform: "perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))" }}
        >
          {featured ? (
            <>
              <div aria-hidden className="pointer-events-none absolute -inset-3 rounded-[2.2rem] opacity-60 blur-xl dark:opacity-70" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
              <div aria-hidden className="pointer-events-none absolute -inset-[3px] overflow-hidden rounded-[1.8rem]">
                <div
                  className="flip-team-card-ring absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2"
                  style={{ background: `conic-gradient(from 0deg, ${c1}, ${c2}, #f59e0b, ${c1})` }}
                />
              </div>
            </>
          ) : null}

          <div
            className={cn(
              "relative grid transition-transform duration-[850ms] ease-[cubic-bezier(0.34,1.4,0.5,1)] [transform-style:preserve-3d]",
              flipped && "[transform:rotateY(180deg)]",
              "motion-reduce:transition-none motion-reduce:[transform:none]",
            )}
          >
            {/* Front */}
            <div inert={flipped} aria-hidden={flipped || undefined} className={cn(faceBase, flipped && "motion-reduce:opacity-0")}>
              <div
                className="relative flex aspect-[4/3] items-center justify-center overflow-hidden"
                style={{
                  backgroundImage: `radial-gradient(circle at 18% 12%, ${c1} 0%, transparent 58%), radial-gradient(circle at 88% 92%, ${c2} 0%, transparent 60%), linear-gradient(135deg, ${c1}, ${c2})`,
                }}
              >
                <svg aria-hidden viewBox="0 0 200 150" className="absolute inset-0 size-full opacity-35" fill="none" stroke="#fff" strokeWidth="0.6">
                  <circle cx="100" cy="75" r="48" />
                  <circle cx="100" cy="75" r="64" strokeDasharray="2 4" />
                  <circle cx="100" cy="75" r="82" />
                  <path d="M0 120 C 50 95, 150 140, 200 105" />
                </svg>
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-25"
                  style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.6) 1px, transparent 1.2px)", backgroundSize: "14px 14px" }}
                />
                <div
                  className="relative flex size-24 items-center justify-center rounded-full text-3xl font-semibold tracking-tight text-white shadow-[0_12px_30px_-8px_rgb(0_0_0/0.5),inset_0_0_0_4px_rgb(255_255_255/0.28)]"
                  style={{ backgroundImage: `linear-gradient(rgb(0 0 0 / 0.28), rgb(0 0 0 / 0.28)), linear-gradient(135deg, ${c1}, ${c2})` }}
                  aria-hidden
                >
                  {initials ?? getInitials(name)}
                </div>
                {badge ? (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-zinc-950/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                    <svg viewBox="0 0 16 16" className="size-3 text-amber-300" fill="currentColor" aria-hidden>
                      <path d="M8 1.5l1.9 4 4.4.5-3.3 3 .9 4.3L8 11.2l-3.9 2.1.9-4.3-3.3-3 4.4-.5z" />
                    </svg>
                    {badge}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-5 pr-16">
                <H id={nameId} className="text-lg font-semibold tracking-tight text-foreground">
                  {name}
                </H>
                <p className="text-sm text-muted">{role}</p>
                {location ? (
                  <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-foreground">
                    <svg viewBox="0 0 16 16" className="size-3.5 text-muted" fill="currentColor" aria-hidden>
                      <path d="M8 1a5 5 0 0 0-5 5c0 3.6 5 9 5 9s5-5.4 5-9a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
                    </svg>
                    {location}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Back */}
            <div
              inert={!flipped}
              aria-hidden={!flipped || undefined}
              className={cn(faceBase, "[transform:rotateY(180deg)] motion-reduce:[transform:none]", !flipped && "motion-reduce:opacity-0")}
            >
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-20 dark:opacity-30" style={{ background: `linear-gradient(180deg, ${c1}, transparent)` }} />
              <div className="relative flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-center gap-3 pr-12">
                  <span
                    aria-hidden
                    className="size-10 shrink-0 rounded-full shadow-[inset_0_0_0_2px_rgb(255_255_255/0.3)]"
                    style={{ backgroundImage: `linear-gradient(135deg, ${c1}, ${c2})` }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{name}</p>
                    <p className="truncate text-xs text-muted">{role}</p>
                  </div>
                </div>
                {bio ? <p className="text-sm leading-relaxed text-muted">{bio}</p> : null}
                {skills.length ? (
                  <ul aria-label="Skills" className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <li key={skill} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-border">
                        {skill}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-auto flex flex-col gap-3">
                  {socials.length ? (
                    <ul aria-label={`${name} online`} className="flex flex-wrap gap-1.5">
                      {socials.map((s) => (
                        <li key={s.href}>
                          <a
                            href={s.href}
                            target={s.href.startsWith("mailto:") ? undefined : "_blank"}
                            rel="noreferrer"
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-medium text-foreground transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-surface-2 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                          >
                            {typeof s.icon === "string" || s.icon === undefined ? <SocialIcon icon={(s.icon as TeamSocialIcon) ?? "website"} /> : s.icon}
                            {s.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {contactHref ? (
                    <a
                      href={contactHref}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring motion-reduce:transition-none"
                    >
                      {contactLabel}
                      <span className="sr-only"> {name}</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={onContact}
                      disabled={!onContact}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                    >
                      {contactLabel}
                      <span className="sr-only"> {name}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Gloss follows the pointer. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[1.6rem] transition-opacity duration-300"
            style={{
              opacity: "calc(var(--gloss, 0) * 0.9)",
              backgroundImage:
                "radial-gradient(circle at var(--gx, 50%) var(--gy, 30%), rgb(255 255 255 / 0.32) 0%, rgb(255 255 255 / 0.08) 28%, transparent 55%)",
              mixBlendMode: "soft-light",
            }}
          />

          <button
            ref={toggleRef}
            type="button"
            aria-pressed={flipped}
            aria-label={`Show details for ${name}`}
            onClick={() => setFlipped(!flipped)}
            className={cn(
              "absolute right-4 flex size-11 items-center justify-center rounded-full border shadow-sm transition-[background-color,transform] duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring motion-reduce:transition-none",
              flipped ? "top-4" : "bottom-4",
              featured || flipped
                ? "border-transparent bg-accent text-accent-foreground"
                : "border-border bg-surface-2 text-foreground hover:bg-surface",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className={cn("size-5 transition-transform duration-500 motion-reduce:transition-none", flipped && "rotate-180")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20 11a8 8 0 0 0-14.7-4.3M4 4v3h3M4 13a8 8 0 0 0 14.7 4.3M20 20v-3h-3" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
