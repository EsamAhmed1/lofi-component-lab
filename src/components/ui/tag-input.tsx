"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export interface TagItem {
  /** Stable id. Also the value of the hidden form input. */
  id: string;
  /** Text shown on the chip and matched against the query. */
  label: string;
  /** Any CSS colour. Falls back to a colour hashed from the label. */
  color?: string;
  /** Secondary text shown in the suggestion list. */
  description?: string;
}

/** A plain string is turned into { id: text, label: text }. */
export type TagValue = string | TagItem;

export interface TagInputProps {
  /** Selected tags (controlled). */
  value?: TagValue[];
  /** Selected tags on first render (uncontrolled). */
  defaultValue?: TagValue[];
  /** Called with the new tags and their labels. */
  onChange?: (tags: TagItem[], labels: string[]) => void;
  /** Options for the autocomplete list. */
  suggestions?: TagValue[];
  /** Visible label of the field. */
  label: string;
  /** Helper text under the field. */
  description?: string;
  placeholder?: string;
  /** Maximum number of tags. Shows a "3/8" counter when set. */
  maxTags?: number;
  /** Allow free text that is not in the suggestions. */
  allowCustom?: boolean;
  /** Return an error message to reject a tag. */
  validate?: (label: string, tags: TagItem[]) => string | null | undefined;
  disabled?: boolean;
  /** Renders one hidden input per tag with this name, for plain forms. */
  name?: string;
  /** How many suggestions to show at once. */
  maxSuggestions?: number;
  className?: string;
  /** Forwarded to the text input. */
  ref?: Ref<HTMLInputElement>;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const SEPARATORS = /[,;\n]/;

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

/**
 * A damped spring sampled into a CSS linear() easing, so the Web Animations
 * API can play real spring physics. Pure maths, so it is safe at module scope.
 */
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

const SPRING = springEasing(320, 16);

function springTiming() {
  const supported = typeof CSS !== "undefined" && CSS.supports("transition-timing-function", "linear(0, 1)");
  return supported
    ? { easing: SPRING.easing, duration: SPRING.duration }
    : { easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", duration: 420 };
}

/** FNV-1a hash of the label mapped to a hue. Deterministic, so SSR matches. */
function hashColor(text: string) {
  let h = 2166136261;
  for (const ch of text.toLowerCase()) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return `oklch(0.68 0.17 ${(h >>> 0) % 360})`;
}

function toItem(value: TagValue, known: Map<string, TagItem>): TagItem {
  if (typeof value !== "string") return value;
  return known.get(value.trim().toLowerCase()) ?? { id: value.trim(), label: value.trim() };
}

interface Match {
  score: number;
  /** A contiguous match, as opposed to letters found in order. */
  strong: boolean;
  indices: number[];
}

/** Prefix beats word start beats substring beats letters in order ("tsc" → "TypeScript"). */
function fuzzyMatch(label: string, query: string): Match | null {
  const l = label.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return { score: 0, strong: true, indices: [] };
  const at = l.indexOf(q);
  if (at >= 0) {
    const wordStart = at === 0 || /[\s\-_./@]/.test(l[at - 1]);
    const indices = Array.from({ length: q.length }, (_, i) => at + i);
    return { score: (at === 0 ? 300 : wordStart ? 200 : 100) - at, strong: true, indices };
  }
  const indices: number[] = [];
  let qi = 0;
  for (let i = 0; i < l.length && qi < q.length; i++) {
    if (l[i] === q[qi]) {
      indices.push(i);
      qi++;
    }
  }
  if (qi < q.length) return null;
  return { score: 50 - (indices[indices.length - 1] - indices[0]), strong: false, indices };
}

function Highlighted({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <>{text}</>;
  const marked = new Set(indices);
  const runs: { text: string; marked: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const m = marked.has(i);
    const last = runs[runs.length - 1];
    if (last && last.marked === m) last.text += text[i];
    else runs.push({ text: text[i], marked: m });
  }
  return (
    <>
      {runs.map((run, i) =>
        run.marked ? (
          <mark key={i} className="rounded-[3px] bg-accent/20 font-semibold text-inherit">
            {run.text}
          </mark>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </>
  );
}

type Option =
  | { kind: "suggestion"; item: TagItem; match: Match }
  | { kind: "create"; label: string };

const CSS_TEXT = `
.tag-input-field {
  border: 1px solid transparent;
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    linear-gradient(var(--border), var(--border)) border-box;
  transition: box-shadow 200ms ease;
}
.tag-input-field:focus-within {
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    linear-gradient(120deg, #8b5cf6, #ec4899 50%, #06b6d4) border-box;
  box-shadow:
    0 0 0 4px color-mix(in oklab, var(--ring) 22%, transparent),
    0 12px 32px -16px color-mix(in oklab, #8b5cf6 70%, transparent);
}
.tag-input-field[data-invalid] {
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    linear-gradient(#ef4444, #ef4444) border-box;
}
.tag-input-field[data-disabled] {
  background:
    linear-gradient(var(--surface-2), var(--surface-2)) padding-box,
    linear-gradient(var(--border), var(--border)) border-box;
  cursor: not-allowed;
}
@media (prefers-reduced-motion: reduce) {
  .tag-input-field { transition: none; }
}
`;

/**
 * A multi-value tag field with a combobox autocomplete. Chips are coloured,
 * spring in, shrink out, and can be reached with Backspace and the arrow keys.
 */
export function TagInput({
  value,
  defaultValue = [],
  onChange,
  suggestions = [],
  label,
  description,
  placeholder = "Add a tag…",
  maxTags,
  allowCustom = true,
  validate,
  disabled = false,
  name,
  maxSuggestions = 8,
  className,
  ref,
}: TagInputProps) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const descId = `${baseId}-desc`;
  const errorId = `${baseId}-error`;
  const countId = `${baseId}-count`;
  const hintId = `${baseId}-hint`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const reducedMotion = useReducedMotion();

  const known = useMemo(() => {
    const map = new Map<string, TagItem>();
    for (const s of suggestions) {
      const item = typeof s === "string" ? { id: s, label: s } : s;
      map.set(item.label.toLowerCase(), item);
    }
    return map;
  }, [suggestions]);

  const [inner, setInner] = useState<TagItem[]>(() => defaultValue.map((v) => toItem(v, known)));
  const controlled = value !== undefined;
  const tags = useMemo(() => (controlled ? value.map((v) => toItem(v, known)) : inner), [controlled, value, inner, known]);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState({ text: "", n: 0 });
  const [exiting, setExiting] = useState<string[]>([]);
  const [fresh, setFresh] = useState<string[]>([]);

  // Removals finish after an animation, so they read the latest tags from here.
  const tagsRef = useRef(tags);
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  const full = maxTags !== undefined && tags.length >= maxTags;
  const trimmed = query.trim();

  const options = useMemo<Option[]>(() => {
    const taken = new Set(tags.map((t) => t.label.toLowerCase()));
    const ranked = [...known.values()]
      .filter((item) => !taken.has(item.label.toLowerCase()))
      .map((item, index) => ({ item, index, match: fuzzyMatch(item.label, trimmed) }))
      .filter((r): r is { item: TagItem; index: number; match: Match } => r.match !== null)
      .sort((a, b) => b.match.score - a.match.score || a.index - b.index)
      .slice(0, maxSuggestions);
    const strong: Option[] = ranked.filter((r) => r.match.strong).map((r) => ({ kind: "suggestion", item: r.item, match: r.match }));
    const weak: Option[] = ranked.filter((r) => !r.match.strong).map((r) => ({ kind: "suggestion", item: r.item, match: r.match }));
    const lower = trimmed.toLowerCase();
    const canCreate = allowCustom && trimmed !== "" && !known.has(lower) && !taken.has(lower);
    // Strong matches first, then "Create", then loose letter-order matches.
    return [...strong, ...(canCreate ? [{ kind: "create" as const, label: trimmed }] : []), ...weak];
  }, [known, tags, trimmed, allowCustom, maxSuggestions]);

  const showList = open && !disabled && !full && options.length > 0;
  const active = showList ? Math.min(activeIndex, options.length - 1) : -1;

  // Keep the active option in view while moving with the arrow keys.
  useEffect(() => {
    if (active < 0) return;
    document.getElementById(`${baseId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, baseId]);

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const announce = (text: string) => setMessage((m) => ({ text, n: m.n + 1 }));

  const commit = (next: TagItem[]) => {
    tagsRef.current = next;
    if (!controlled) setInner(next);
    onChange?.(next, next.map((t) => t.label));
  };

  const chipElement = (id: string) =>
    [...(rootRef.current?.querySelectorAll<HTMLElement>("[data-tag-id]") ?? [])].find((el) => el.dataset.tagId === id) ?? null;

  const removeButtons = () => [...(rootRef.current?.querySelectorAll<HTMLButtonElement>("[data-tag-remove]") ?? [])];

  const shake = (id: string) => {
    const el = chipElement(id);
    if (!el) return;
    const flash = [
      { boxShadow: "0 0 0 3px var(--tag)" },
      { boxShadow: "0 0 0 0 transparent" },
    ];
    if (reducedMotion) {
      el.animate(flash, { duration: 600, easing: "ease-out" });
      return;
    }
    el.animate(
      [
        { transform: "translateX(0)", boxShadow: "0 0 0 3px var(--tag)" },
        { transform: "translateX(-7px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(2px)" },
        { transform: "translateX(0)", boxShadow: "0 0 0 0 transparent" },
      ],
      { duration: 420, easing: "ease-out" },
    );
  };

  /** Adds what it can and returns the raw strings it had to reject. */
  const addMany = (raws: TagValue[]): string[] => {
    const next = [...tagsRef.current];
    const added: TagItem[] = [];
    const rejected: string[] = [];
    let duplicate: TagItem | null = null;
    let problem: string | null = null;

    for (const raw of raws) {
      const text = typeof raw === "string" ? raw.trim() : raw.label;
      if (!text) continue;
      const item = typeof raw === "string" ? known.get(text.toLowerCase()) ?? (allowCustom ? { id: text, label: text } : null) : raw;
      if (!item) {
        problem ??= `“${text}” is not in the list. Pick one of the suggestions.`;
        rejected.push(text);
        continue;
      }
      const existing = next.find((t) => t.id === item.id || t.label.toLowerCase() === item.label.toLowerCase());
      if (existing) {
        duplicate = existing;
        continue;
      }
      if (maxTags !== undefined && next.length >= maxTags) {
        problem ??= `You can add up to ${maxTags} tags.`;
        rejected.push(text);
        continue;
      }
      const invalid = validate?.(item.label, next);
      if (invalid) {
        problem ??= invalid;
        rejected.push(text);
        continue;
      }
      next.push(item);
      added.push(item);
    }

    if (added.length > 0) {
      commit(next);
      setFresh(added.map((t) => t.id));
    }
    if (duplicate) shake(duplicate.id);
    setError(problem);

    const parts: string[] = [];
    if (added.length === 1) parts.push(`Added ${added[0].label}.`);
    else if (added.length > 1) parts.push(`Added ${added.length} tags.`);
    if (added.length > 0 && maxTags !== undefined) parts.push(`${next.length} of ${maxTags}.`);
    if (duplicate) parts.push(`${duplicate.label} is already added.`);
    if (problem) parts.push(problem);
    if (parts.length > 0) announce(parts.join(" "));
    return rejected;
  };

  const remove = (id: string) => {
    if (exiting.includes(id)) return;
    const item = tagsRef.current.find((t) => t.id === id);
    if (!item) return;
    const finish = () => {
      commit(tagsRef.current.filter((t) => t.id !== id));
      setExiting((list) => list.filter((x) => x !== id));
      setError(null);
      announce(`Removed ${item.label}.`);
    };
    const el = chipElement(id);
    if (!el || reducedMotion) {
      finish();
      return;
    }
    setExiting((list) => [...list, id]);
    const animation = el.animate(
      [
        { width: `${el.offsetWidth}px`, transform: "scale(1)", opacity: 1, marginInlineEnd: "0px" },
        { width: "0px", paddingLeft: "0px", paddingRight: "0px", transform: "scale(0.4)", opacity: 0, marginInlineEnd: "-6px" },
      ],
      { duration: 200, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
    );
    animation.finished.then(finish, finish);
  };

  const choose = (option: Option) => {
    const rejected = addMany([option.kind === "create" ? option.label : option.item]);
    setQuery(rejected[0] ?? "");
    setOpen(false);
    setActiveIndex(0);
  };

  const submitText = () => {
    const rejected = addMany([query]);
    setQuery(rejected[0] ?? "");
    setOpen(false);
  };

  const focusChip = (index: number) => {
    const buttons = removeButtons();
    buttons[Math.max(0, Math.min(index, buttons.length - 1))]?.focus();
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const input = event.currentTarget;
    const count = options.length;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!showList) {
          setOpen(true);
          setActiveIndex(0);
        } else setActiveIndex((active + 1) % count);
        break;
      case "ArrowUp":
        if (showList) {
          event.preventDefault();
          setActiveIndex((active - 1 + count) % count);
        }
        break;
      case "Home":
      case "End":
        if (showList && !query) {
          event.preventDefault();
          setActiveIndex(event.key === "Home" ? 0 : count - 1);
        }
        break;
      case "Enter":
        if (showList && active >= 0) {
          event.preventDefault();
          choose(options[active]);
        } else if (trimmed) {
          event.preventDefault();
          submitText();
        }
        break;
      case "Tab":
        if (trimmed) {
          event.preventDefault();
          if (showList && active >= 0) choose(options[active]);
          else submitText();
        }
        break;
      case "Escape":
        if (showList) {
          event.preventDefault();
          setOpen(false);
        } else if (query) {
          event.preventDefault();
          setQuery("");
          setError(null);
        }
        break;
      case "Backspace":
        if (!query && removeButtons().length > 0) {
          event.preventDefault();
          setOpen(false);
          focusChip(Infinity);
        }
        break;
      case "ArrowLeft":
        if (input.selectionStart === 0 && input.selectionEnd === 0 && removeButtons().length > 0) {
          event.preventDefault();
          setOpen(false);
          focusChip(Infinity);
        }
        break;
    }
  };

  const onChipKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const buttons = removeButtons();
    const index = buttons.indexOf(event.currentTarget);
    switch (event.key) {
      case "Backspace":
      case "Delete":
        event.preventDefault();
        remove(id);
        inputRef.current?.focus();
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusChip(index - 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (index + 1 < buttons.length) focusChip(index + 1);
        else inputRef.current?.focus();
        break;
      case "Home":
        event.preventDefault();
        focusChip(0);
        break;
      case "End":
      case "Escape":
        event.preventDefault();
        inputRef.current?.focus();
        break;
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!SEPARATORS.test(text)) return;
    event.preventDefault();
    const rejected = addMany(`${query}${text}`.split(SEPARATORS));
    setQuery(rejected[0] ?? "");
    setOpen(false);
  };

  const describedBy = [description ? descId : null, hintId, maxTags !== undefined ? countId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <style href="tag-input" precedence="default">
        {CSS_TEXT}
      </style>

      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {maxTags !== undefined ? (
          <span
            id={countId}
            className={cn(
              "text-xs tabular-nums transition-colors",
              full ? "font-semibold text-amber-700 dark:text-amber-300" : "text-muted",
            )}
          >
            <span aria-hidden>
              {tags.length - exiting.length}/{maxTags}
            </span>
            <span className="sr-only">
              {tags.length - exiting.length} of {maxTags} tags
            </span>
          </span>
        ) : null}
      </div>

      <div
        className="tag-input-field flex min-h-12 w-full cursor-text flex-wrap items-center gap-1.5 rounded-2xl p-2"
        data-invalid={error ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        onMouseDown={(event) => {
          if (disabled || event.target !== event.currentTarget) return;
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <ul role="list" aria-label={`Selected ${label}`} className="contents">
          {tags.map((tag) => (
            <Chip
              key={tag.id}
              tag={tag}
              disabled={disabled}
              exiting={exiting.includes(tag.id)}
              popIn={fresh.includes(tag.id) && !reducedMotion}
              onRemove={() => {
                remove(tag.id);
                inputRef.current?.focus();
              }}
              onKeyDown={(event) => onChipKeyDown(event, tag.id)}
            />
          ))}
        </ul>
        <input
          ref={setInputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={disabled ? undefined : full ? "Limit reached" : tags.length ? "" : placeholder}
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setError(null);
            setActiveIndex(0);
            if (SEPARATORS.test(next)) {
              const parts = next.split(SEPARATORS);
              const last = parts.pop() ?? "";
              const rejected = addMany(parts);
              setQuery(rejected[0] ?? last.trimStart());
              setOpen(false);
              return;
            }
            setQuery(next);
            setOpen(next.trim() !== "");
          }}
          onClick={() => !disabled && setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onInputKeyDown}
          onPaste={onPaste}
          className="h-8 min-w-[9ch] flex-1 bg-transparent px-1.5 text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed"
        />
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label={`${label} suggestions`}
        hidden={!showList}
        className={cn(
          "absolute inset-x-0 z-30 mt-1.5 max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-border p-1.5",
          "bg-surface/95 shadow-[0_18px_48px_-12px_rgb(0_0_0/0.35)] backdrop-blur-xl",
          "transition-[opacity,translate] duration-150 ease-out starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none",
        )}
      >
        {options.map((option, index) => {
          const selected = index === active;
          const color = option.kind === "suggestion" ? option.item.color ?? hashColor(option.item.label) : undefined;
          return (
            <li
              key={option.kind === "create" ? "__create" : option.item.id}
              id={optionId(index)}
              role="option"
              aria-selected={selected}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => !selected && setActiveIndex(index)}
              onClick={() => choose(option)}
              className={cn(
                "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-foreground",
                selected && "bg-accent/12",
              )}
            >
              {option.kind === "create" ? (
                <>
                  <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full border border-dashed border-border text-muted">
                    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                  </span>
                  <span className="min-w-0 truncate">
                    Create <span className="font-semibold">“{option.label}”</span>
                  </span>
                </>
              ) : (
                <>
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                  <span className="min-w-0 flex-1 truncate">
                    <Highlighted text={option.item.label} indices={option.match.indices} />
                  </span>
                  {option.item.description ? (
                    <span className="shrink-0 truncate text-xs text-muted">{option.item.description}</span>
                  ) : null}
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-1.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs">
        <div className="min-w-0 flex-1">
          {error ? (
            <p id={errorId} className="flex items-start gap-1.5 font-medium text-red-600 dark:text-red-400">
              <svg aria-hidden viewBox="0 0 16 16" className="mt-px size-3.5 shrink-0" fill="currentColor">
                <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm-.75 3.25h1.5v4.5h-1.5v-4.5Zm0 5.75h1.5V12h-1.5v-1.5Z" />
              </svg>
              {error}
            </p>
          ) : description ? (
            <p id={descId} className="text-muted">
              {description}
            </p>
          ) : null}
          {error && description ? (
            <span id={descId} className="sr-only">
              {description}
            </span>
          ) : null}
        </div>
        <p id={hintId} className={cn("text-muted", disabled && "sr-only")}>
          <kbd className="rounded border border-border px-1 font-sans">Enter</kbd> or{" "}
          <kbd className="rounded border border-border px-1 font-sans">,</kbd> to add
          <span className="sr-only">. Backspace or Left arrow reaches the added tags.</span>
        </p>
      </div>

      {name
        ? tags.map((tag) => <input key={tag.id} type="hidden" name={name} value={tag.id} disabled={disabled} />)
        : null}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {message.text}
        {message.n % 2 ? " " : ""}
      </p>
    </div>
  );
}

interface ChipProps {
  tag: TagItem;
  disabled: boolean;
  exiting: boolean;
  popIn: boolean;
  onRemove: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

function Chip({ tag, disabled, exiting, popIn, onRemove, onKeyDown }: ChipProps) {
  const ref = useRef<HTMLLIElement>(null);
  const color = tag.color ?? hashColor(tag.label);

  // Spring in once, only for chips added after the first render.
  useEffect(() => {
    if (!popIn || !ref.current) return;
    const { easing, duration } = springTiming();
    ref.current.animate(
      [
        { transform: "scale(0.3)", opacity: 0 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration, easing },
    );
    // Only on mount: a chip that is already shown should not pop again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <li
      ref={ref}
      data-tag-id={tag.id}
      aria-hidden={exiting || undefined}
      style={{ "--tag": color } as CSSProperties}
      className={cn(
        "relative inline-flex h-8 max-w-full items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border text-sm font-medium text-foreground",
        "border-[color-mix(in_oklab,var(--tag)_45%,transparent)] bg-[color-mix(in_oklab,var(--tag)_14%,var(--surface))]",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_2px_10px_-4px_var(--tag)]",
        "transition-[background-color,box-shadow,scale] duration-150 motion-reduce:transition-none",
        "focus-within:scale-105 focus-within:bg-[color-mix(in_oklab,var(--tag)_30%,var(--surface))] focus-within:shadow-[0_0_0_2px_var(--tag),0_6px_18px_-6px_var(--tag)]",
        disabled ? "px-3" : "pl-2.5 pr-1",
        exiting && "pointer-events-none",
      )}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-[var(--tag)] shadow-[0_0_8px_var(--tag)]" />
      <span className="min-w-0 truncate">{tag.label}</span>
      {disabled ? null : (
        <button
          type="button"
          data-tag-remove={exiting ? undefined : ""}
          tabIndex={-1}
          aria-label={`Remove ${tag.label}`}
          onClick={onRemove}
          onKeyDown={onKeyDown}
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full text-muted transition-colors",
            "hover:bg-[color-mix(in_oklab,var(--tag)_35%,transparent)] hover:text-foreground active:scale-90",
            "focus-visible:bg-[color-mix(in_oklab,var(--tag)_35%,transparent)] focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring",
          )}
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </li>
  );
}
