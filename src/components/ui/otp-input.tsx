"use client";

import {
  Fragment,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";

export type OtpStatus = "idle" | "loading" | "error" | "success";

export interface OtpInputProps {
  /** Number of characters. */
  length?: number;
  /** Controlled value. */
  value?: string;
  /** Starting value when uncontrolled. */
  defaultValue?: string;
  /** Called on every change with the current code. */
  onChange?: (value: string) => void;
  /** Called once every box is filled. */
  onComplete?: (value: string) => void;
  /** Digits only, or letters and digits. */
  mode?: "numeric" | "alphanumeric";
  /** Hide characters like a password. */
  mask?: boolean;
  /** Visual and ARIA state. "loading" also locks the boxes. */
  status?: OtpStatus;
  /** Visible label above the boxes. */
  label?: string;
  /** Helper or status text under the boxes (announced to screen readers). */
  message?: string;
  /** Insert a separator after every N boxes, e.g. 3 → 123-456. */
  groupSize?: number;
  disabled?: boolean;
  /** Name for a hidden input so the code submits with a form. */
  name?: string;
  autoFocus?: boolean;
  className?: string;
}

const statusRing: Record<OtpStatus, string> = {
  idle: "border-border focus:border-accent",
  loading: "border-border",
  error: "border-red-500 dark:border-red-400",
  success: "border-emerald-500 dark:border-emerald-400",
};

const statusText: Record<OtpStatus, string> = {
  idle: "text-muted",
  loading: "text-muted",
  error: "text-red-700 dark:text-red-300",
  success: "text-emerald-700 dark:text-emerald-300",
};

/**
 * One-time-code input with one box per character. Handles typing, paste,
 * SMS autofill (autocomplete="one-time-code"), Backspace, arrow keys and
 * form submission through a hidden input.
 */
export function OtpInput({
  length = 6,
  value,
  defaultValue = "",
  onChange,
  onComplete,
  mode = "numeric",
  mask = false,
  status = "idle",
  label = "Verification code",
  message,
  groupSize,
  disabled = false,
  name,
  autoFocus = false,
  className,
}: OtpInputProps) {
  const [inner, setInner] = useState(defaultValue.slice(0, length));
  const code = (value ?? inner).slice(0, length);
  // Handlers read the latest code from a ref: fast typing moves focus before
  // React re-renders, so the rendered `code` can be one keystroke behind.
  const latest = useRef(code);
  useLayoutEffect(() => {
    latest.current = code;
  }, [code]);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const messageId = `${baseId}-message`;
  const locked = disabled || status === "loading";
  const pattern = mode === "numeric" ? /[0-9]/ : /[a-zA-Z0-9]/;

  const sanitize = (raw: string) =>
    [...raw].filter((ch) => pattern.test(ch)).join("").toUpperCase();

  const focusBox = (index: number) => {
    const i = Math.max(0, Math.min(length - 1, index));
    const el = refs.current[i];
    el?.focus();
    el?.select();
  };

  const commit = (next: string) => {
    const trimmed = next.slice(0, length);
    const wasComplete = latest.current.length === length;
    latest.current = trimmed;
    if (value === undefined) setInner(trimmed);
    onChange?.(trimmed);
    if (trimmed.length === length && !wasComplete) onComplete?.(trimmed);
  };

  // Writes `chars` starting at `index` (typing, paste and autofill all use this).
  const insert = (index: number, chars: string) => {
    if (!chars) return;
    const code = latest.current;
    const start = Math.min(index, code.length);
    const next = (code.slice(0, start) + chars + code.slice(start + chars.length)).slice(0, length);
    commit(next);
    focusBox(Math.min(start + chars.length, length - 1));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    const code = latest.current;
    switch (event.key) {
      case "Backspace": {
        event.preventDefault();
        if (code[index]) {
          commit(code.slice(0, index) + code.slice(index + 1));
          focusBox(index);
        } else if (index > 0) {
          commit(code.slice(0, index - 1) + code.slice(index));
          focusBox(index - 1);
        }
        break;
      }
      case "Delete":
        event.preventDefault();
        commit(code.slice(0, index) + code.slice(index + 1));
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusBox(index - 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        focusBox(Math.min(index + 1, code.length));
        break;
      case "Home":
        event.preventDefault();
        focusBox(0);
        break;
      case "End":
        event.preventDefault();
        focusBox(Math.min(code.length, length - 1));
        break;
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    event.preventDefault();
    insert(index, sanitize(event.clipboardData.getData("text")));
  };

  const boxes = Array.from({ length }, (_, i) => i);

  return (
    <div className={cn("inline-flex w-full max-w-md flex-col gap-2", className)}>
      <span id={labelId} className="text-sm font-medium text-foreground">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={messageId}
        className={cn("flex items-center gap-1.5 sm:gap-2", status === "error" && "animate-[otp-shake_0.35s_ease-in-out] motion-reduce:animate-none")}
      >
        {boxes.map((i) => (
          <Fragment key={i}>
            {groupSize && i > 0 && i % groupSize === 0 ? (
              <span aria-hidden className="w-2 shrink-0 text-center text-muted sm:w-3">
                –
              </span>
            ) : null}
            <input
              ref={(node) => {
                refs.current[i] = node;
              }}
              type={mask ? "password" : "text"}
              inputMode={mode === "numeric" ? "numeric" : "text"}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              autoFocus={autoFocus && i === 0}
              aria-label={`${mode === "numeric" ? "Digit" : "Character"} ${i + 1} of ${length}`}
              aria-invalid={status === "error" || undefined}
              disabled={locked}
              value={code[i] ?? ""}
              onFocus={(event) => {
                // Never leave a gap: jump to the first empty box.
                if (i > latest.current.length) focusBox(latest.current.length);
                else event.currentTarget.select();
              }}
              onChange={(event) => {
                const chars = sanitize(event.target.value);
                // A single keystroke replaces the box; longer input is autofill.
                const current = latest.current[i];
                insert(i, chars.length > 1 && current ? chars.replace(current, "") || chars : chars);
              }}
              onKeyDown={(event) => onKeyDown(event, i)}
              onPaste={(event) => onPaste(event, i)}
              className={cn(
                "aspect-[4/5] w-full min-w-0 max-w-14 rounded-xl border-2 bg-surface text-center text-xl font-semibold text-foreground caret-accent outline-none transition-[border-color,box-shadow,background-color] sm:text-2xl",
                "focus:ring-4 focus:ring-accent/20",
                code[i] && status === "idle" && "border-accent/60",
                statusRing[status],
                locked && "cursor-not-allowed opacity-60",
              )}
            />
          </Fragment>
        ))}
      </div>
      {name ? <input type="hidden" name={name} value={code} /> : null}
      <p id={messageId} aria-live="polite" className={cn("min-h-5 text-sm", statusText[status])}>
        {status === "loading" ? (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
            {message ?? "Checking code…"}
          </span>
        ) : (
          message
        )}
      </p>
    </div>
  );
}
