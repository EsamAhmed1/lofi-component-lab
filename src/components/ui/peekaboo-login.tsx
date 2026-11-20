"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export interface PeekabooLoginValues {
  email: string;
  password: string;
  remember: boolean;
}

/** Every piece of text the form shows. Pass any subset through `labels` to override it. */
export interface PeekabooLoginLabels {
  email: string;
  password: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  showPassword: string;
  remember: string;
  forgot: string;
  submit: string;
  submitting: string;
  signUpPrompt: string;
  signUp: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordTooShort: (min: number) => string;
  genericError: string;
  successTitle: string;
  successMessage: (email: string) => string;
  again: string;
}

export interface PeekabooLoginProps {
  /** Called with the form values. Resolve to show success, reject to show the error banner. */
  onSubmit: (values: PeekabooLoginValues) => Promise<unknown>;
  title?: string;
  subtitle?: string;
  /** Extra helper content under the subtitle, e.g. demo credentials. */
  hint?: ReactNode;
  /** Body colour of the owl. Any CSS colour. */
  mascotColor?: string;
  /** Shortest password that passes validation. */
  minPasswordLength?: number;
  forgotHref?: string;
  /** Shows a "Create an account" link when set. */
  signUpHref?: string;
  labels?: Partial<PeekabooLoginLabels>;
  /** Locks every field and the submit button. */
  disabled?: boolean;
  className?: string;
}

const defaultLabels: PeekabooLoginLabels = {
  email: "Email",
  password: "Password",
  emailPlaceholder: "you@company.com",
  passwordPlaceholder: "Your password",
  showPassword: "Show password",
  remember: "Remember me",
  forgot: "Forgot password?",
  submit: "Sign in",
  submitting: "Signing in…",
  signUpPrompt: "New here?",
  signUp: "Create an account",
  emailRequired: "Enter your email address.",
  emailInvalid: "That email doesn't look right. Check for a missing @ or dot.",
  passwordRequired: "Enter your password.",
  passwordTooShort: (min) => `Passwords are at least ${min} characters.`,
  genericError: "We couldn't sign you in. Check your details and try again.",
  successTitle: "You're in",
  successMessage: (email) => `Signed in as ${email}.`,
  again: "Sign in with another account",
};

type Mood = "idle" | "watch" | "hide" | "peek" | "loading" | "error" | "success";
type Status = "idle" | "loading" | "error" | "success";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SPRING = "transition-[transform,opacity] duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] motion-reduce:transition-none";

// Reduced-motion preference as an external store: no setState in effects and
// it follows the OS setting live.
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerMotion = () => false;

/* Mood → transforms for each part of the owl. Values are in SVG user units. */
const wingPose: Record<Mood, [string, string]> = {
  idle: ["translate(-14px, 96px) rotate(-10deg)", "translate(14px, 96px) rotate(10deg)"],
  watch: ["translate(-14px, 92px) rotate(-6deg)", "translate(14px, 92px) rotate(6deg)"],
  hide: ["translate(0px, 0px) rotate(0deg)", "translate(0px, 0px) rotate(0deg)"],
  peek: ["translate(0px, 0px) rotate(0deg)", "translate(10px, 50px) rotate(20deg)"],
  loading: ["translate(-14px, 96px) rotate(-10deg)", "translate(14px, 96px) rotate(10deg)"],
  error: ["translate(-18px, 100px) rotate(-14deg)", "translate(18px, 100px) rotate(14deg)"],
  success: ["translate(-10px, 84px) rotate(-22deg)", "translate(10px, 84px) rotate(22deg)"],
};

const pupilPose: Record<Mood, string> = {
  idle: "translate(0px, 0px)",
  watch: "translate(0px, 0px)",
  hide: "translate(0px, 0px)",
  peek: "translate(-5px, -2px)",
  loading: "translate(0px, 6px)",
  error: "translate(0px, 5px)",
  success: "translate(0px, 0px)",
};

const lidPose: Record<Mood, number> = {
  idle: 0,
  watch: 0,
  hide: 0,
  peek: 0.15,
  loading: 0.25,
  error: 0.45,
  success: 0,
};

/** side: -1 for the left brow, 1 for the right. */
function browPose(mood: Mood, side: -1 | 1) {
  switch (mood) {
    case "error":
      return `translate(0px, 3px) rotate(${side * 18}deg)`;
    case "hide":
    case "success":
      return "translate(0px, -6px) rotate(0deg)";
    case "peek":
      return side === 1 ? `translate(0px, -5px) rotate(${-side * 10}deg)` : "translate(0px, -6px) rotate(0deg)";
    case "watch":
      return "translate(0px, -2px) rotate(0deg)";
    case "loading":
      return `translate(0px, 0px) rotate(${side * -6}deg)`;
    default:
      return "translate(0px, 0px) rotate(0deg)";
  }
}

const EYES = [
  { x: 74, side: -1 as const },
  { x: 126, side: 1 as const },
];

/**
 * Sign-in form with an owl that reacts to the user: it follows the caret in
 * the email field, covers its eyes for the password, peeks when the password
 * is shown, shakes its head on errors and bounces on success.
 */
export function PeekabooLogin({
  onSubmit,
  title = "Welcome back",
  subtitle = "Sign in to continue.",
  hint,
  mascotColor = "#8b6cf6",
  minPasswordLength = 8,
  forgotHref = "#",
  signUpHref,
  labels,
  disabled = false,
  className,
}: PeekabooLoginProps) {
  const L = { ...defaultLabels, ...labels };
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, getServerMotion);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");
  const [focus, setFocus] = useState<"email" | "password" | null>(null);
  const [sad, setSad] = useState(false);
  const [signedInAs, setSignedInAs] = useState("");

  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = {
    title: `${uid}-title`,
    email: `${uid}-email`,
    emailError: `${uid}-email-error`,
    password: `${uid}-password`,
    passwordError: `${uid}-password-error`,
    clip: `${uid}-clip`,
    sky: `${uid}-sky`,
    sheen: `${uid}-sheen`,
  };

  const svgRef = useRef<SVGSVGElement>(null);
  const shakeRef = useRef<SVGGElement>(null);
  const bounceRef = useRef<SVGGElement>(null);
  const lidRefs = useRef<Array<SVGEllipseElement | null>>([]);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const sadTimer = useRef(0);
  const measure = useRef<CanvasRenderingContext2D | null>(null);
  const alive = useRef(true);

  const loading = status === "loading";
  const mood: Mood =
    status === "success" ? "success"
    : sad ? "error"
    : loading ? "loading"
    : focus === "password" ? (show ? "peek" : "hide")
    : focus === "email" ? "watch"
    : "idle";

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancelAnimationFrame(frame.current);
      window.clearTimeout(sadTimer.current);
    };
  }, []);

  // Idle blink every few seconds while the eyes are open.
  const canBlink = !reduced && (mood === "idle" || mood === "watch");
  useEffect(() => {
    if (!canBlink) return;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        for (const lid of lidRefs.current) {
          lid?.animate(
            [{ transform: "scaleY(0)" }, { transform: "scaleY(1)", offset: 0.45 }, { transform: "scaleY(0)" }],
            { duration: 220, easing: "ease-in-out" },
          );
        }
        schedule();
      }, 2400 + Math.random() * 2600);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [canBlink]);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const setLook = (px: number, py: number, tilt: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.style.setProperty("--peekaboo-px", `${px.toFixed(2)}px`);
    svg.style.setProperty("--peekaboo-py", `${py.toFixed(2)}px`);
    svg.style.setProperty("--peekaboo-tilt", `${tilt.toFixed(2)}deg`);
  };

  // Estimate where the caret sits in the email field and aim the eyes at it.
  // type="email" has no selection API, so the caret is taken as the end of the value.
  const trackCaret = (input: HTMLInputElement) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (!measure.current) measure.current = document.createElement("canvas").getContext("2d");
      const ctx = measure.current;
      const style = getComputedStyle(input);
      let width = 0;
      if (ctx) {
        ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        width = ctx.measureText(input.value).width;
      }
      const padding = parseFloat(style.paddingLeft) || 0;
      const ratio = Math.min(1, Math.max(0, (padding + width - input.scrollLeft) / Math.max(1, input.clientWidth)));
      const centred = ratio - 0.5;
      setLook(centred * 14, 5, centred * 12);
    });
  };

  const resetLook = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setLook(0, 0, 0));
  };

  const validateEmail = (value: string) =>
    !value.trim() ? L.emailRequired : EMAIL_PATTERN.test(value.trim()) ? "" : L.emailInvalid;
  const validatePassword = (value: string) =>
    !value ? L.passwordRequired : value.length < minPasswordLength ? L.passwordTooShort(minPasswordLength) : "";

  const flagError = () => {
    setSad(true);
    window.clearTimeout(sadTimer.current);
    sadTimer.current = window.setTimeout(() => setSad(false), 1600);
    if (!reduced) {
      shakeRef.current?.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-9deg)" },
          { transform: "rotate(8deg)" },
          { transform: "rotate(-6deg)" },
          { transform: "rotate(4deg)" },
          { transform: "rotate(0deg)" },
        ],
        { duration: 600, easing: "ease-in-out" },
      );
    }
  };

  const celebrate = () => {
    if (reduced) return;
    bounceRef.current?.animate(
      [
        { transform: "translateY(0px)" },
        { transform: "translateY(-16px)", offset: 0.28 },
        { transform: "translateY(0px)", offset: 0.52 },
        { transform: "translateY(-7px)", offset: 0.74 },
        { transform: "translateY(0px)" },
      ],
      { duration: 900, easing: "ease-out" },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || loading) return;
    const next = { email: validateEmail(email), password: validatePassword(password) };
    setErrors(next);
    setFormError("");
    if (next.email || next.password) {
      flagError();
      (next.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setStatus("loading");
    try {
      await onSubmit({ email: email.trim(), password, remember });
      if (!alive.current) return;
      setSignedInAs(email.trim());
      setStatus("success");
      setPassword("");
      setShow(false);
      celebrate();
    } catch (error) {
      if (!alive.current) return;
      setStatus("error");
      setFormError(error instanceof Error && error.message ? error.message : L.genericError);
      flagError();
    }
  };

  const reset = () => {
    setStatus("idle");
    setEmail("");
    setErrors({});
    setFormError("");
    requestAnimationFrame(() => emailRef.current?.focus());
  };

  const clearAuthError = () => {
    if (status === "error") setStatus("idle");
    if (formError) setFormError("");
  };

  const wings = wingPose[mood];
  const rootStyle = {
    "--peekaboo-mascot": mascotColor,
    "--peekaboo-dark": "color-mix(in oklab, var(--peekaboo-mascot) 68%, black)",
    "--peekaboo-light": "color-mix(in oklab, var(--peekaboo-mascot) 28%, white)",
  } as CSSProperties;

  const inputClass = (invalid: boolean) =>
    cn(
      "h-12 w-full rounded-xl border bg-surface-2/60 px-3.5 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted sm:text-sm",
      "focus:border-accent focus:ring-4 focus:ring-accent/25",
      "disabled:cursor-not-allowed disabled:opacity-60",
      invalid ? "border-red-500 dark:border-red-400" : "border-border",
    );

  return (
    <div
      style={rootStyle}
      className={cn(
        "relative isolate w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-surface/85 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8",
        className,
      )}
    >
      {/* Soft coloured glow behind the mascot. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full opacity-35 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--peekaboo-mascot), transparent 70%)" }}
      />

      <div className="mx-auto size-36 rounded-full bg-surface p-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] ring-1 ring-border">
        <svg
          ref={svgRef}
          viewBox="0 0 200 200"
          aria-hidden
          focusable="false"
          className="block size-full"
          style={{ "--peekaboo-px": "0px", "--peekaboo-py": "0px", "--peekaboo-tilt": "0deg" } as CSSProperties}
        >
          <defs>
            <clipPath id={ids.clip}>
              <circle cx="100" cy="100" r="100" />
            </clipPath>
            <radialGradient id={ids.sky} cx="50%" cy="30%" r="75%">
              <stop offset="0%" style={{ stopColor: "color-mix(in oklab, var(--peekaboo-mascot) 22%, var(--surface))" }} />
              <stop offset="100%" style={{ stopColor: "var(--surface-2)" }} />
            </radialGradient>
            <radialGradient id={ids.sheen} cx="35%" cy="25%" r="60%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g clipPath={`url(#${ids.clip})`}>
            <circle cx="100" cy="100" r="100" fill={`url(#${ids.sky})`} />

            <g ref={shakeRef} style={{ transformOrigin: "100px 196px" }}>
              <g ref={bounceRef}>
                <g
                  className="transition-transform duration-200 ease-out motion-reduce:transition-none"
                  style={{ transform: "rotate(var(--peekaboo-tilt))", transformOrigin: "100px 210px" }}
                >
                  {/* Ear tufts */}
                  <path d="M54 80 L42 36 L82 62 Z" strokeLinejoin="round" strokeWidth="8" style={{ fill: "var(--peekaboo-dark)", stroke: "var(--peekaboo-dark)" }} />
                  <path d="M146 80 L158 36 L118 62 Z" strokeLinejoin="round" strokeWidth="8" style={{ fill: "var(--peekaboo-dark)", stroke: "var(--peekaboo-dark)" }} />
                  {/* Body */}
                  <ellipse cx="100" cy="138" rx="80" ry="82" style={{ fill: "var(--peekaboo-mascot)" }} />
                  <ellipse cx="100" cy="138" rx="80" ry="82" fill={`url(#${ids.sheen})`} />
                  {/* Belly with feather marks */}
                  <ellipse cx="100" cy="182" rx="48" ry="40" style={{ fill: "var(--peekaboo-light)" }} />
                  <g fill="none" strokeWidth="3" strokeLinecap="round" style={{ stroke: "var(--peekaboo-mascot)" }} opacity="0.5">
                    <path d="M80 168 q5 6 10 0" />
                    <path d="M95 168 q5 6 10 0" />
                    <path d="M110 168 q5 6 10 0" />
                    <path d="M88 182 q5 6 10 0" />
                    <path d="M103 182 q5 6 10 0" />
                  </g>
                  {/* Face discs */}
                  {EYES.map(({ x }) => (
                    <circle key={x} cx={x} cy="108" r="30" opacity="0.9" style={{ fill: "var(--peekaboo-light)" }} />
                  ))}
                  {/* Brows */}
                  {EYES.map(({ x, side }) => (
                    <g key={x} transform={`translate(${x} 78)`}>
                      <path
                        d="M-13 2 Q0 -6 13 2"
                        fill="none"
                        strokeWidth="5"
                        strokeLinecap="round"
                        className={SPRING}
                        style={{ stroke: "var(--peekaboo-dark)", transform: browPose(mood, side), transformBox: "fill-box", transformOrigin: "center" }}
                      />
                    </g>
                  ))}
                  {/* Open eyes */}
                  <g className="transition-opacity duration-200 motion-reduce:transition-none" opacity={mood === "success" ? 0 : 1}>
                    {EYES.map(({ x }, i) => (
                      <g key={x} transform={`translate(${x} 108)`}>
                        <circle r="19" fill="#fff" />
                        <g className={SPRING} style={{ transform: pupilPose[mood] }}>
                          <g
                            className="transition-transform duration-150 ease-out motion-reduce:transition-none"
                            style={{ transform: "translate(var(--peekaboo-px), var(--peekaboo-py))" }}
                          >
                            <circle r="9.5" fill="#1c1530" />
                            <circle cx="-3" cy="-3.5" r="3" fill="#fff" />
                          </g>
                        </g>
                        <ellipse
                          ref={(node) => {
                            lidRefs.current[i] = node;
                          }}
                          rx="20"
                          ry="20"
                          className="transition-transform duration-300 ease-out motion-reduce:transition-none"
                          style={{
                            fill: "var(--peekaboo-mascot)",
                            transform: `scaleY(${lidPose[mood]})`,
                            transformBox: "fill-box",
                            transformOrigin: "50% 0%",
                          }}
                        />
                      </g>
                    ))}
                  </g>
                  {/* Happy closed eyes */}
                  <g
                    fill="none"
                    strokeWidth="5"
                    strokeLinecap="round"
                    className="transition-opacity duration-200 motion-reduce:transition-none"
                    opacity={mood === "success" ? 1 : 0}
                    style={{ stroke: "var(--peekaboo-dark)" }}
                  >
                    <path d="M61 112 Q74 98 87 112" />
                    <path d="M113 112 Q126 98 139 112" />
                  </g>
                  {/* Beak */}
                  <path d="M100 120 L91 130 L100 144 L109 130 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
                  {/* Blush */}
                  <g
                    className="transition-opacity duration-300 motion-reduce:transition-none"
                    opacity={mood === "success" ? 0.85 : mood === "hide" || mood === "peek" ? 0.55 : 0}
                    fill="#fb7185"
                  >
                    <ellipse cx="50" cy="136" rx="11" ry="6.5" />
                    <ellipse cx="150" cy="136" rx="11" ry="6.5" />
                  </g>
                </g>
              </g>
            </g>

            {/* Wings rise from below to cover the eyes. */}
            {EYES.map(({ x }, i) => (
              <g key={x} transform={`translate(${x} 108)`}>
                <g
                  className={SPRING}
                  style={{ transform: wings[i], transitionDelay: reduced ? "0ms" : `${i * 60}ms` }}
                >
                  <g style={{ fill: "var(--peekaboo-dark)" }}>
                    <ellipse rx="31" ry="37" />
                    <circle cx="-18" cy="-28" r="11" />
                    <circle cx="0" cy="-35" r="12" />
                    <circle cx="18" cy="-28" r="11" />
                  </g>
                  <g fill="none" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" style={{ stroke: "var(--peekaboo-light)" }}>
                    <path d="M-10 -14 v18" />
                    <path d="M0 -18 v20" />
                    <path d="M10 -14 v18" />
                  </g>
                </g>
              </g>
            ))}
          </g>
        </svg>
      </div>

      <div className="mt-5 text-center">
        <h2 id={ids.title} className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        {hint ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-surface-2/70 px-3 py-2 text-xs text-muted">
            {hint}
          </div>
        ) : null}
      </div>

      {/* Polite announcements for loading and success. */}
      <p aria-live="polite" className="sr-only">
        {loading ? L.submitting : status === "success" ? `${L.successTitle}. ${L.successMessage(signedInAs)}` : ""}
      </p>

      {status === "success" ? (
        <div
          ref={successRef}
          tabIndex={-1}
          className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden className="grid size-10 place-items-center rounded-full bg-emerald-600 text-white">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <p className="text-base font-semibold text-foreground">{L.successTitle}</p>
          <p className="text-sm text-muted">{L.successMessage(signedInAs)}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-1 min-h-11 rounded-xl px-4 text-sm font-medium text-accent hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {L.again}
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={handleSubmit} aria-labelledby={ids.title} aria-busy={loading || undefined} className="mt-6 flex flex-col gap-4">
          <div role="alert" aria-atomic="true">
            {formError ? (
              <p className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v5.5M12 16.5v.01" />
                </svg>
                <span>{formError}</span>
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.email} className="text-sm font-medium text-foreground">
              {L.email}
            </label>
            <input
              ref={emailRef}
              id={ids.email}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder={L.emailPlaceholder}
              value={email}
              disabled={disabled}
              readOnly={loading}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? ids.emailError : undefined}
              onFocus={(event) => {
                setFocus("email");
                trackCaret(event.currentTarget);
              }}
              onBlur={() => {
                setFocus((f) => (f === "email" ? null : f));
                resetLook();
                if (email || errors.email) setErrors((e) => ({ ...e, email: validateEmail(email) }));
              }}
              onChange={(event) => {
                const value = event.target.value;
                setEmail(value);
                setSad(false);
                clearAuthError();
                if (errors.email) setErrors((e) => ({ ...e, email: validateEmail(value) }));
                trackCaret(event.currentTarget);
              }}
              onSelect={(event) => trackCaret(event.currentTarget)}
              className={inputClass(Boolean(errors.email))}
            />
            {errors.email ? (
              <p id={ids.emailError} className="text-sm text-red-700 dark:text-red-300">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.password} className="text-sm font-medium text-foreground">
              {L.password}
            </label>
            {/* The input and its toggle share one focus zone so the owl keeps its eyes covered. */}
            <div
              className="relative"
              onFocus={() => setFocus("password")}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setFocus((f) => (f === "password" ? null : f));
                }
              }}
            >
              <input
                ref={passwordRef}
                id={ids.password}
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                spellCheck={false}
                autoCapitalize="none"
                placeholder={L.passwordPlaceholder}
                value={password}
                disabled={disabled}
                readOnly={loading}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? ids.passwordError : undefined}
                onBlur={() => {
                  if (password || errors.password) setErrors((e) => ({ ...e, password: validatePassword(password) }));
                }}
                onChange={(event) => {
                  const value = event.target.value;
                  setPassword(value);
                  setSad(false);
                  clearAuthError();
                  if (errors.password) setErrors((e) => ({ ...e, password: validatePassword(value) }));
                }}
                className={cn(inputClass(Boolean(errors.password)), "pr-12")}
              />
              <button
                type="button"
                aria-label={L.showPassword}
                aria-pressed={show}
                aria-controls={ids.password}
                disabled={disabled}
                // Keep focus in the input on mouse click (Safari would otherwise drop focus).
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
                  <circle cx="12" cy="12" r="3" />
                  {show ? null : <path d="M4 4l16 16" />}
                </svg>
              </button>
            </div>
            {errors.password ? (
              <p id={ids.passwordError} className="text-sm text-red-700 dark:text-red-300">
                {errors.password}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground has-disabled:cursor-not-allowed">
              <input
                type="checkbox"
                name="remember"
                checked={remember}
                disabled={disabled}
                onChange={(event) => setRemember(event.target.checked)}
                className="size-4 rounded accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              {L.remember}
            </label>
            <a
              href={forgotHref}
              className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {L.forgot}
            </a>
          </div>

          <button
            type="submit"
            disabled={disabled}
            aria-disabled={loading || undefined}
            className={cn(
              "relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground",
              "shadow-[0_10px_30px_-12px_var(--accent)] transition-[transform,box-shadow,filter] duration-200 hover:brightness-110 active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
              loading && "cursor-progress",
            )}
          >
            {loading ? (
              <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
            ) : null}
            {loading ? L.submitting : L.submit}
          </button>

          {signUpHref ? (
            <p className="text-center text-sm text-muted">
              {L.signUpPrompt}{" "}
              <a
                href={signUpHref}
                className="rounded-md font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {L.signUp}
              </a>
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
