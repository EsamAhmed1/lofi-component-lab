"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export interface FaqItem {
  /** Unique id. Also the DOM id, so /faq#refunds opens this item. */
  id: string;
  question: string;
  answer: ReactNode;
  /** Category name, matching one of `categories`. */
  category?: string;
  /** Plain text of the answer for search, when the answer is not a string. */
  answerText?: string;
  /** Extra words that should match the search. */
  keywords?: string[];
}

export interface FaqAccordionProps {
  title?: string;
  description?: ReactNode;
  /** Tab names. Defaults to the categories used by the items, in order. */
  categories?: string[];
  items: FaqItem[];
  /** One item open at a time, or many. */
  type?: "single" | "multiple";
  /** Id or ids open on first render. */
  defaultOpen?: string | string[];
  /** Shows the live search box. */
  searchable?: boolean;
  /** Called when someone answers "Was this helpful?". */
  onFeedback?: (id: string, helpful: boolean) => void;
  /** Link for the "Contact support" buttons. Hidden when not set. */
  contactHref?: string;
  contactLabel?: string;
  /** Label of the first tab. */
  allLabel?: string;
  /** Level of the title heading. Questions use the next level. */
  headingLevel?: 2 | 3;
  className?: string;
  ref?: Ref<HTMLElement>;
}

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** The URL hash without "#". Empty on the server, so hydration matches. */
function useHash() {
  return useSyncExternalStore(
    subscribeHash,
    () => {
      try {
        return decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return window.location.hash.slice(1);
      }
    },
    () => "",
  );
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textOf(item: FaqItem) {
  const answer = item.answerText ?? (typeof item.answer === "string" ? item.answer : "");
  return `${item.question} ${answer} ${(item.keywords ?? []).join(" ")}`.toLowerCase();
}

function Highlight({ text, pattern }: { text: string; pattern: RegExp | null }) {
  if (!pattern) return <>{text}</>;
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[3px] bg-amber-200 px-0.5 text-foreground dark:bg-amber-400/30">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * A complete FAQ section: intro, live search with highlighted matches,
 * category tabs with a sliding pill, an animated accordion, deep links,
 * per-item feedback and an empty state.
 */
export function FaqAccordion({
  title = "Frequently asked questions",
  description,
  categories,
  items,
  type = "single",
  defaultOpen,
  searchable = true,
  onFeedback,
  contactHref,
  contactLabel = "Contact support",
  allLabel = "All",
  headingLevel = 2,
  className,
  ref,
}: FaqAccordionProps) {
  const baseId = useId();
  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const hash = useHash();

  const tabs = useMemo(() => {
    const names = categories ?? [...new Set(items.map((i) => i.category).filter((c): c is string => !!c))];
    return [allLabel, ...names];
  }, [categories, items, allLabel]);

  const [tab, setTab] = useState(allLabel);
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<string[]>(() =>
    defaultOpen === undefined ? [] : Array.isArray(defaultOpen) ? defaultOpen : [defaultOpen],
  );
  const [feedback, setFeedback] = useState<Record<string, boolean>>({});
  const [thanks, setThanks] = useState(0);

  // Open the item named in the URL hash. Adjusting state during render on a
  // change is the React-recommended way to react to an external value.
  const [seenHash, setSeenHash] = useState("");
  if (hash !== seenHash) {
    setSeenHash(hash);
    if (items.some((i) => i.id === hash)) {
      setOpenIds((ids) => (type === "single" ? [hash] : ids.includes(hash) ? ids : [...ids, hash]));
      setTab(allLabel);
      setQuery("");
    }
  }

  // Scroll to a deep-linked item once it is rendered (it may have been filtered out).
  useEffect(() => {
    if (!hash || !items.some((i) => i.id === hash)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(hash)?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, [hash, items]);

  const words = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const pattern = useMemo(
    () => (words.length ? new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi") : null),
    [words],
  );

  const matching = useMemo(
    () => items.filter((item) => words.every((w) => textOf(item).includes(w))),
    [items, words],
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>([[allLabel, matching.length]]);
    for (const item of matching) if (item.category) map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return map;
  }, [matching, allLabel]);
  const visible = tab === allLabel ? matching : matching.filter((i) => i.category === tab);

  // Slide the pill under the active tab. Writes styles directly, no re-render.
  useLayoutEffect(() => {
    const list = tabsRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;
    const place = () => {
      const active = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!active) return;
      pill.style.setProperty("--x", `${active.offsetLeft}px`);
      pill.style.setProperty("--w", `${active.offsetWidth}px`);
      pill.style.opacity = "1";
      // Keep the active tab in view inside the scrolling strip without moving the page.
      const left = active.offsetLeft - list.scrollLeft;
      if (left < 0 || left + active.offsetWidth > list.clientWidth) {
        list.scrollTo({ left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2 });
      }
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [tab, counts]);

  const toggle = (id: string) => {
    setOpenIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      return type === "single" ? [id] : [...ids, id];
    });
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = tabs.indexOf(tab);
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    setTab(tabs[next]);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  const vote = (id: string, helpful: boolean) => {
    setFeedback((f) => ({ ...f, [id]: helpful }));
    setThanks((n) => n + 1);
    onFeedback?.(id, helpful);
  };

  const Title = headingLevel === 2 ? "h2" : "h3";
  const Question = headingLevel === 2 ? "h3" : "h4";
  const titleId = `${baseId}-title`;
  const panelId = `${baseId}-panel`;
  const activeTabIndex = tabs.indexOf(tab);
  const showTabs = tabs.length > 2;
  const resultText =
    visible.length === 0
      ? "No questions found."
      : `${visible.length} ${visible.length === 1 ? "question" : "questions"}${words.length ? ` match “${query.trim()}”` : ""}${tab !== allLabel ? ` in ${tab}` : ""}.`;

  const clearSearch = () => {
    setQuery("");
    setTab(allLabel);
    searchRef.current?.focus();
  };

  return (
    <section ref={ref} aria-labelledby={titleId} className={cn("@container w-full text-foreground", className)}>
      <div className="grid gap-8 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @3xl:gap-12">
        {/* Intro column. */}
        <div className="flex flex-col gap-5 @3xl:sticky @3xl:top-6 @3xl:self-start">
          <div className="space-y-3">
            <Title id={titleId} className="text-balance text-3xl font-semibold tracking-tight @3xl:text-4xl">
              {title}
            </Title>
            {description ? <div className="text-pretty text-base leading-relaxed text-muted">{description}</div> : null}
          </div>

          {searchable ? (
            <div className="relative">
              <label htmlFor={`${baseId}-search`} className="sr-only">
                Search questions
              </label>
              <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="9" r="6" />
                <path d="m14 14 4 4" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                id={`${baseId}-search`}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && query) {
                    event.preventDefault();
                    setQuery("");
                  }
                }}
                placeholder="Search questions…"
                autoComplete="off"
                className={cn(
                  "h-12 w-full rounded-2xl border border-border bg-surface pl-11 pr-11 text-sm text-foreground shadow-sm placeholder:text-muted",
                  "transition-[border-color,box-shadow] duration-200 [&::-webkit-search-cancel-button]:appearance-none",
                  "focus-visible:border-ring focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_25%,transparent)] focus-visible:outline-none motion-reduce:transition-none",
                )}
              />
              {query ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring"
                >
                  <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              ) : null}
            </div>
          ) : null}

          {contactHref ? (
            <div className="relative hidden overflow-hidden rounded-2xl border border-border bg-surface p-5 @3xl:block">
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-accent/15 blur-2xl" />
              <p className="font-medium">Still stuck?</p>
              <p className="mt-1 text-sm text-muted">Our team answers most messages within two hours.</p>
              <a
                href={contactHref}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-[filter,scale] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring active:scale-95 motion-reduce:transition-none"
              >
                {contactLabel}
                <span aria-hidden>→</span>
              </a>
            </div>
          ) : null}
        </div>

        {/* List column. */}
        <div className="flex min-w-0 flex-col gap-4">
          {showTabs ? (
            <div
              ref={tabsRef}
              role="tablist"
              aria-label="Question categories"
              className="relative flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface-2 p-1 [scrollbar-width:none]"
            >
              <span
                ref={pillRef}
                aria-hidden
                className="pointer-events-none absolute bottom-1 left-0 top-1 rounded-xl bg-surface opacity-0 shadow-[0_1px_2px_rgb(0_0_0/0.08),0_6px_16px_-8px_color-mix(in_oklab,var(--accent)_60%,transparent)] ring-1 ring-border transition-[translate,width] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none"
                style={{ translate: "var(--x, 0) 0", width: "var(--w, 0)" }}
              />
              {tabs.map((name, index) => {
                const selected = name === tab;
                const count = counts.get(name) ?? 0;
                return (
                  <button
                    key={name}
                    id={`${baseId}-tab-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={panelId}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setTab(name)}
                    onKeyDown={onTabKeyDown}
                    className={cn(
                      "relative z-10 flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring",
                      selected ? "text-foreground" : "text-muted hover:text-foreground",
                    )}
                  >
                    {name}
                    <span
                      className={cn(
                        "min-w-5 rounded-full px-1.5 text-center text-[11px] tabular-nums leading-5",
                        selected ? "bg-accent text-accent-foreground" : "bg-surface text-muted",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div
            id={panelId}
            role={showTabs ? "tabpanel" : undefined}
            aria-labelledby={showTabs ? `${baseId}-tab-${activeTabIndex}` : undefined}
            className="flex flex-col gap-3"
          >
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
                <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5M8.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.4v.3M11 15.5h.01" />
                  </svg>
                </span>
                <p className="font-medium">No questions match “{query.trim()}”</p>
                <p className="max-w-xs text-sm text-muted">Try a different word, or ask us directly.</p>
                <div className="mt-1 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
                  >
                    Clear search
                  </button>
                  {contactHref ? (
                    <a
                      href={contactHref}
                      className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
                    >
                      {contactLabel}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              visible.map((item) => {
                const open = openIds.includes(item.id);
                const buttonId = `${baseId}-q-${item.id}`;
                const regionId = `${baseId}-a-${item.id}`;
                const vote_ = feedback[item.id];
                return (
                  <div
                    key={item.id}
                    id={item.id}
                    className={cn(
                      "group/item relative scroll-mt-6 overflow-hidden rounded-2xl border bg-surface transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none",
                      open
                        ? "border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--accent)_80%,transparent)]"
                        : "border-border hover:border-[color-mix(in_oklab,var(--accent)_25%,var(--border))]",
                    )}
                  >
                    {/* Accent bar that grows down the left edge when open. */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-0 left-0 w-1 origin-top bg-gradient-to-b from-violet-500 via-fuchsia-500 to-sky-400 transition-[scale] duration-500 motion-reduce:transition-none",
                        open ? "scale-y-100" : "scale-y-0",
                      )}
                    />
                    <Question className="m-0">
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={open}
                        aria-controls={regionId}
                        onClick={() => toggle(item.id)}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left text-base font-medium transition-colors hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
                      >
                        <span className="min-w-0 flex-1">
                          <Highlight text={item.question} pattern={pattern} />
                        </span>
                        <span
                          aria-hidden
                          className={cn(
                            "relative grid size-8 shrink-0 place-items-center rounded-full transition-[background-color,rotate,color] duration-300 motion-reduce:transition-none",
                            open ? "rotate-180 bg-accent text-accent-foreground" : "bg-surface-2 text-muted",
                          )}
                        >
                          <span className="absolute h-0.5 w-3.5 rounded-full bg-current" />
                          <span
                            className={cn(
                              "absolute h-3.5 w-0.5 rounded-full bg-current transition-[rotate,opacity] duration-300 motion-reduce:transition-none",
                              open ? "rotate-90 opacity-0" : "opacity-100",
                            )}
                          />
                        </span>
                      </button>
                    </Question>
                    <div
                      className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
                      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                    >
                      <div
                        id={regionId}
                        role="region"
                        aria-labelledby={buttonId}
                        inert={!open}
                        className={cn("min-h-0 overflow-hidden transition-opacity duration-300 motion-reduce:transition-none", open ? "opacity-100" : "opacity-0")}
                      >
                        <div className="px-5 pb-5 text-sm leading-relaxed text-muted">
                          <div className="[&_a]:font-medium [&_a]:text-accent [&_a]:underline [&_p+p]:mt-2">
                            {typeof item.answer === "string" ? <p><Highlight text={item.answer} pattern={pattern} /></p> : item.answer}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3 text-xs">
                            {vote_ === undefined ? (
                              <>
                                <span>Was this helpful?</span>
                                <span className="flex gap-1.5">
                                  {([true, false] as const).map((helpful) => (
                                    <button
                                      key={String(helpful)}
                                      type="button"
                                      onClick={() => vote(item.id, helpful)}
                                      aria-label={helpful ? "Yes, this was helpful" : "No, this was not helpful"}
                                      className="grid h-8 min-w-10 place-items-center rounded-full border border-border bg-surface px-2.5 text-base transition-[scale,background-color] hover:scale-110 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring active:scale-90 motion-reduce:transition-none motion-reduce:hover:scale-100"
                                    >
                                      <span aria-hidden>{helpful ? "👍" : "👎"}</span>
                                    </button>
                                  ))}
                                </span>
                              </>
                            ) : (
                              <span className="flex items-center gap-2 font-medium text-foreground">
                                <span aria-hidden className="grid size-6 place-items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m3.5 8.5 3 3 6-7" />
                                  </svg>
                                </span>
                                {vote_ ? "Thanks! Glad it helped." : "Thanks. We'll use this to improve the answer."}
                              </span>
                            )}
                            <a
                              href={`#${item.id}`}
                              className="ml-auto rounded-md font-medium text-muted underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
                            >
                              Link to this answer
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {contactHref ? (
            <p className="text-sm text-muted @3xl:hidden">
              Still stuck?{" "}
              <a href={contactHref} className="rounded-sm font-medium text-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring">
                {contactLabel}
              </a>
            </p>
          ) : null}
        </div>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {words.length || tab !== allLabel ? resultText : ""}
      </p>
      <p className="sr-only" aria-live="polite">
        {thanks ? `Thanks for your feedback.${thanks % 2 ? "" : " "}` : ""}
      </p>
    </section>
  );
}

