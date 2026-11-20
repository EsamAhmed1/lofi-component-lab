"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export type SortDirection = "asc" | "desc";

export interface SortRule {
  key: string;
  direction: SortDirection;
}

export type CellValue = string | number | null | undefined;

export interface DataTableColumn<T> {
  /** Unique key. Used for sorting, filters and visibility. */
  key: string;
  header: string;
  /** Raw value used to sort, filter and search. */
  accessor: (row: T) => CellValue;
  /** Custom cell. Call highlight(text) to mark search matches inside it. */
  cell?: (row: T, helpers: { highlight: (text: string) => ReactNode }) => ReactNode;
  /** Defaults to true. */
  sortable?: boolean;
  /** Adds a filter for this column: free text, or a pick list of its values. */
  filter?: "text" | "select";
  /** Options for a select filter. Defaults to the distinct values in the data. */
  filterOptions?: string[];
  /** Include in the global search. Defaults to true. */
  searchable?: boolean;
  align?: "left" | "center" | "right";
  /** Any CSS width for the column, e.g. "8rem". */
  width?: string;
  /** Hide the column when the table is narrower than 512px (sm), 672px (md) or 896px (lg). */
  hideBelow?: "sm" | "md" | "lg";
  /** Can be switched off in the Columns menu. Defaults to true. */
  hideable?: boolean;
}

export interface DataTableBulkAction {
  id: string;
  label: string;
  onAction: (ids: string[]) => void;
  tone?: "default" | "danger";
}

export type DataTableDensity = "compact" | "comfortable";

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** Table caption (screen readers) and the name of the scroll region. */
  caption: string;
  /** Shows skeleton rows and sets aria-busy. */
  loading?: boolean;
  /** Adds a checkbox column. */
  selectable?: boolean;
  /** Buttons in the floating bar that slides up when rows are selected. */
  bulkActions?: DataTableBulkAction[];
  onSelectionChange?: (ids: string[]) => void;
  defaultSort?: SortRule[];
  /** Rows per page. */
  pageSize?: number;
  pageSizeOptions?: number[];
  defaultDensity?: DataTableDensity;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Max height of the scroll area. The header sticks inside it. */
  maxHeight?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

type FilterValue = string | string[];
type Panel = "filters" | "columns" | null;

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SPRING = "ease-[cubic-bezier(0.34,1.56,0.64,1)]";
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerMotion = () => false;

const hideClass: Record<NonNullable<DataTableColumn<unknown>["hideBelow"]>, string> = {
  sm: "@max-lg:hidden",
  md: "@max-2xl:hidden",
  lg: "@max-4xl:hidden",
};

const alignClass = { left: "text-left", center: "text-center", right: "text-right" } as const;
const justifyClass = { left: "justify-start", center: "justify-center", right: "justify-end" } as const;

const ring = "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring";

const STYLES = `
@keyframes data-table-shimmer {
  from { background-position: 100% 0; }
  to { background-position: 0% 0; }
}
.data-table-bone {
  background-color: color-mix(in oklab, var(--foreground) 8%, var(--surface));
  background-image: linear-gradient(100deg, transparent 40%, color-mix(in oklab, var(--surface) 70%, transparent) 50%, transparent 60%);
  background-size: 300% 100%;
  animation: data-table-shimmer 1.6s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .data-table-bone { animation: none; background-image: none; }
}
`;

const text = (value: CellValue) => (value == null ? "" : String(value));

function compare(a: CellValue, b: CellValue) {
  if (a == null || a === "") return b == null || b === "" ? 0 : 1;
  if (b == null || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** Wraps every case-insensitive match of the query in a <mark>. */
function highlightText(value: string, query: string): ReactNode {
  if (!query) return value;
  const lower = value.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(query);
  while (at !== -1) {
    if (at > from) parts.push(value.slice(from, at));
    parts.push(
      <mark key={at} className="rounded-[3px] bg-accent/20 px-px text-foreground">
        {value.slice(at, at + query.length)}
      </mark>,
    );
    from = at + query.length;
    at = lower.indexOf(query, from);
  }
  if (from === 0) return value;
  if (from < value.length) parts.push(value.slice(from));
  return parts;
}

function Checkbox({
  checked,
  indeterminate = false,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: string;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <span className="relative inline-grid size-[18px] shrink-0 place-items-center">
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={cn(
          "peer size-[18px] cursor-pointer appearance-none rounded-[5px] border border-muted/60 bg-surface transition-[background-color,border-color,scale] duration-200",
          "checked:border-accent checked:bg-accent indeterminate:border-accent indeterminate:bg-accent active:scale-90",
          "disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
          ring,
        )}
      />
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className={cn(
          "pointer-events-none absolute size-3 scale-50 text-accent-foreground opacity-0 transition-[opacity,scale] duration-200 peer-checked:scale-100 peer-checked:opacity-100 motion-reduce:transition-none",
          SPRING,
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute size-3 text-accent-foreground opacity-0 peer-indeterminate:opacity-100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <path d="M4 8h8" />
      </svg>
    </span>
  );
}

function EmptyArt() {
  return (
    <svg aria-hidden viewBox="0 0 160 120" className="h-28 w-36 text-muted" fill="none">
      <ellipse cx="80" cy="108" rx="54" ry="6" className="fill-current opacity-15" />
      <rect x="30" y="22" width="78" height="74" rx="10" className="fill-surface-2 stroke-current" strokeOpacity="0.35" transform="rotate(-8 69 59)" />
      <rect x="44" y="16" width="78" height="78" rx="10" className="fill-surface stroke-current" strokeOpacity="0.45" />
      <rect x="56" y="32" width="40" height="6" rx="3" className="fill-current opacity-30" />
      <rect x="56" y="46" width="54" height="5" rx="2.5" className="fill-current opacity-20" />
      <rect x="56" y="58" width="30" height="5" rx="2.5" className="fill-current opacity-20" />
      <circle cx="112" cy="74" r="17" className="fill-surface stroke-accent" strokeWidth="5" />
      <path d="M124 87l14 14" className="stroke-accent" strokeWidth="7" strokeLinecap="round" />
      <path d="M106 70l12 8M118 70l-12 8" className="stroke-current" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" className="fill-accent opacity-70" />
      <circle cx="140" cy="34" r="3" className="fill-accent opacity-50" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"} />
    </svg>
  );
}

/**
 * A sortable, filterable data table. Sorting (shift-click for more than one
 * column), search with highlighted matches, filter chips, page size, density
 * and column visibility all run on the client. Rows glide to their new place
 * with a FLIP animation (Web Animations API) whenever the order changes.
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  caption,
  loading = false,
  selectable = true,
  bulkActions = [],
  onSelectionChange,
  defaultSort = [],
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  defaultDensity = "comfortable",
  searchPlaceholder = "Search",
  emptyTitle = "No matching rows",
  emptyDescription = "Try a different search or remove a filter.",
  maxHeight = "28rem",
  className,
  ref,
}: DataTableProps<T>) {
  const baseId = useId();
  const captionId = `${baseId}-caption`;
  const hintId = `${baseId}-hint`;
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, getServerMotion);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});
  const [sort, setSort] = useState<SortRule[]>(defaultSort);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [density, setDensity] = useState<DataTableDensity>(defaultDensity);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [panel, setPanel] = useState<Panel>(null);

  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const snapshot = useRef<Map<string, number> | null>(null);

  const q = query.trim().toLowerCase();
  const columnMap = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);
  const visibleColumns = columns.filter((c) => !hidden.has(c.key));
  const filterColumns = columns.filter((c) => c.filter);

  const selectOptions = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const col of columns) {
      if (col.filter !== "select") continue;
      const values = col.filterOptions ?? [...new Set(data.map((row) => text(col.accessor(row))).filter(Boolean))].sort((a, b) => compare(a, b));
      result.set(col.key, values);
    }
    return result;
  }, [columns, data]);

  const rows = useMemo(() => {
    const searchCols = columns.filter((c) => c.searchable !== false);
    const active = Object.entries(filters).filter(([, f]) => (Array.isArray(f) ? f.length > 0 : f.trim() !== ""));
    const filtered = data.filter((row) => {
      for (const [key, f] of active) {
        const col = columnMap.get(key);
        if (!col) continue;
        const value = text(col.accessor(row));
        if (Array.isArray(f) ? !f.includes(value) : !value.toLowerCase().includes(f.trim().toLowerCase())) return false;
      }
      return !q || searchCols.some((c) => text(c.accessor(row)).toLowerCase().includes(q));
    });
    if (sort.length === 0) return filtered;
    return [...filtered].sort((a, b) => {
      for (const rule of sort) {
        const col = columnMap.get(rule.key);
        if (!col) continue;
        const result = compare(col.accessor(a), col.accessor(b));
        if (result !== 0) return rule.direction === "asc" ? result : -result;
      }
      return 0;
    });
  }, [data, columns, columnMap, filters, q, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  // Drop selected ids whose rows no longer exist (deleted by a bulk action).
  const allIds = useMemo(() => new Set(data.map(getRowId)), [data, getRowId]);
  const selectedIds = [...selected].filter((id) => allIds.has(id));
  const rowIds = rows.map(getRowId);
  const selectedInView = rowIds.filter((id) => selected.has(id)).length;
  const allChecked = rowIds.length > 0 && selectedInView === rowIds.length;

  /** One chip per active filter value. `value` is null for a text filter. */
  const chips: { id: string; column: string; value: string | null; label: string }[] = [];
  for (const [key, f] of Object.entries(filters)) {
    const col = columnMap.get(key);
    if (!col) continue;
    if (Array.isArray(f)) {
      for (const value of f) chips.push({ id: `${key}:${value}`, column: key, value, label: `${col.header}: ${value}` });
    } else if (f.trim()) {
      chips.push({ id: key, column: key, value: null, label: `${col.header} contains "${f.trim()}"` });
    }
  }
  const filtering = q !== "" || chips.length > 0;

  /** Records where every row is on screen, just before a change that may move them. */
  function takeSnapshot() {
    const body = tbodyRef.current;
    if (!body || reduced) return;
    const map = new Map<string, number>();
    for (const row of body.querySelectorAll<HTMLElement>("tr[data-row-id]")) {
      map.set(row.dataset.rowId!, row.getBoundingClientRect().top);
    }
    snapshot.current = map;
  }

  // FLIP: rows that moved slide from their old place, new rows fade in.
  useLayoutEffect(() => {
    const before = snapshot.current;
    const body = tbodyRef.current;
    if (!before || !body) return;
    snapshot.current = null;
    const list = [...body.querySelectorAll<HTMLElement>("tr[data-row-id]")];
    for (const row of list) for (const a of row.getAnimations()) a.cancel();
    list.forEach((row, index) => {
      const old = before.get(row.dataset.rowId!);
      const now = row.getBoundingClientRect().top;
      if (old === undefined) {
        row.animate(
          [
            { opacity: 0, transform: "translateY(10px)" },
            { opacity: 1, transform: "translateY(0px)" },
          ],
          { duration: 360, delay: Math.min(index, 10) * 18, easing: EASE, fill: "backwards" },
        );
      } else if (Math.abs(old - now) > 0.5) {
        row.animate([{ transform: `translateY(${old - now}px)` }, { transform: "translateY(0px)" }], {
          duration: 460,
          easing: EASE,
        });
      }
    });
  });

  function updateSelection(next: Set<string>) {
    setSelected(next);
    onSelectionChange?.([...next].filter((id) => allIds.has(id)));
  }

  function toggleSort(key: string, multi: boolean) {
    takeSnapshot();
    setSort((current) => {
      const existing = current.find((r) => r.key === key);
      const nextRule: SortRule | null = !existing
        ? { key, direction: "asc" }
        : existing.direction === "asc"
          ? { key, direction: "desc" }
          : null;
      if (!multi) return nextRule ? [nextRule] : [];
      if (!existing) return [...current, nextRule!];
      return nextRule ? current.map((r) => (r.key === key ? nextRule : r)) : current.filter((r) => r.key !== key);
    });
  }

  function changeQuery(value: string) {
    takeSnapshot();
    setQuery(value);
    setPage(0);
  }

  function changeFilter(key: string, value: FilterValue) {
    takeSnapshot();
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  }

  function toggleOption(key: string, value: string) {
    takeSnapshot();
    setFilters((current) => {
      const list = Array.isArray(current[key]) ? (current[key] as string[]) : [];
      return { ...current, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
    setPage(0);
  }

  function clearAll() {
    takeSnapshot();
    setFilters({});
    setQuery("");
    setPage(0);
  }

  function goToPage(next: number) {
    takeSnapshot();
    setPage(Math.max(0, Math.min(pageCount - 1, next)));
  }

  const cellPad = density === "compact" ? "px-3 py-1.5" : "px-4 py-3";
  const colSpan = visibleColumns.length + (selectable ? 1 : 0);
  const firstRow = rows.length === 0 ? 0 : safePage * pageSize + 1;
  const lastRow = Math.min(rows.length, safePage * pageSize + pageSize);
  const status = loading
    ? "Loading rows"
    : `${rows.length} ${rows.length === 1 ? "row" : "rows"}${selectedIds.length ? `, ${selectedIds.length} selected` : ""}`;

  const toolButton = (active: boolean) =>
    cn(
      "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-[background-color,border-color,color] duration-200 motion-reduce:transition-none",
      active ? "border-accent/50 bg-accent/10 text-foreground" : "border-border bg-surface text-foreground hover:bg-surface-2",
      "active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
      ring,
    );

  return (
    <div ref={ref} className={cn("@container relative w-full min-w-0 text-foreground", className)}>
      <style href="data-table" precedence="default">
        {STYLES}
      </style>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-18px_rgb(0_0_0/0.25)]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-0 flex-1 basis-48">
            <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault();
                  changeQuery("");
                }
              }}
              aria-label={`Search ${caption}`}
              placeholder={searchPlaceholder}
              className={cn(
                "h-10 w-full rounded-xl border border-border bg-surface-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted",
                "transition-[border-color,box-shadow] focus:border-accent/60 focus:bg-surface focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_15%,transparent)]",
                ring,
              )}
            />
          </div>
          {filterColumns.length > 0 ? (
            <button
              type="button"
              aria-expanded={panel === "filters"}
              aria-controls={`${baseId}-filters`}
              onClick={() => setPanel((p) => (p === "filters" ? null : "filters"))}
              className={toolButton(panel === "filters")}
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2.5 4h11M4.5 8h7M6.5 12h3" />
              </svg>
              Filters
              {chips.length ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground">{chips.length}</span>
              ) : null}
            </button>
          ) : null}
          <button
            type="button"
            aria-expanded={panel === "columns"}
            aria-controls={`${baseId}-columns`}
            onClick={() => setPanel((p) => (p === "columns" ? null : "columns"))}
            className={toolButton(panel === "columns")}
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="2" y="2.5" width="12" height="11" rx="2" />
              <path d="M6 2.5v11M10 2.5v11" />
            </svg>
            Columns
          </button>
          <div role="group" aria-label="Row density" className="flex h-10 items-center rounded-xl border border-border bg-surface-2 p-0.5">
            {(["comfortable", "compact"] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={density === d}
                aria-label={d === "compact" ? "Compact rows" : "Comfortable rows"}
                onClick={() => setDensity(d)}
                className={cn(
                  "grid size-9 place-items-center rounded-[10px] transition-[background-color,color,box-shadow] duration-200 motion-reduce:transition-none",
                  density === d ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
                  ring,
                )}
              >
                <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  {d === "compact" ? <path d="M2.5 3.5h11M2.5 6.5h11M2.5 9.5h11M2.5 12.5h11" /> : <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />}
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Filter panel */}
        {filterColumns.length > 0 ? (
          <div
            id={`${baseId}-filters`}
            inert={panel !== "filters"}
            className={cn(
              "grid transition-[grid-template-rows,visibility] duration-300 motion-reduce:transition-none",
              panel === "filters" ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-wrap gap-x-6 gap-y-4 border-b border-border bg-surface-2/60 p-3">
                {filterColumns.map((col) =>
                  col.filter === "select" ? (
                    <fieldset key={col.key} className="min-w-0">
                      <legend className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">{col.header}</legend>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectOptions.get(col.key) ?? []).map((option) => {
                          const on = Array.isArray(filters[col.key]) && (filters[col.key] as string[]).includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleOption(col.key, option)}
                              className={cn(
                                "h-8 rounded-full border px-3 text-sm transition-[background-color,border-color,color,scale] duration-200 active:scale-95 motion-reduce:transition-none",
                                on ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground hover:border-accent/50",
                                ring,
                              )}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ) : (
                    <label key={col.key} className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted">{col.header} contains</span>
                      <input
                        type="text"
                        value={typeof filters[col.key] === "string" ? (filters[col.key] as string) : ""}
                        onChange={(event) => changeFilter(col.key, event.target.value)}
                        className={cn("h-8 w-44 max-w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-foreground", ring)}
                      />
                    </label>
                  ),
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Column visibility panel */}
        <div
          id={`${baseId}-columns`}
          inert={panel !== "columns"}
          className={cn(
            "grid transition-[grid-template-rows,visibility] duration-300 motion-reduce:transition-none",
            panel === "columns" ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <fieldset className="flex flex-wrap gap-2 border-b border-border bg-surface-2/60 p-3">
              <legend className="sr-only">Visible columns</legend>
              {columns.map((col) => {
                const on = !hidden.has(col.key);
                const locked = col.hideable === false || (on && visibleColumns.length === 1);
                return (
                  <label
                    key={col.key}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm",
                      locked ? "opacity-60" : "cursor-pointer hover:border-accent/50",
                    )}
                  >
                    <Checkbox
                      checked={on}
                      disabled={locked}
                      onChange={(checked) =>
                        setHidden((current) => {
                          const next = new Set(current);
                          if (checked) next.delete(col.key);
                          else next.add(col.key);
                          return next;
                        })
                      }
                    />
                    {col.header}
                  </label>
                );
              })}
            </fieldset>
          </div>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2">
            <span className="mr-1 text-xs font-medium text-muted">Filtered by</span>
            {chips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-accent/40 bg-accent/10 pl-2.5 pr-1 text-xs font-medium text-foreground"
              >
                {chip.label}
                <button
                  type="button"
                  aria-label={`Remove filter ${chip.label}`}
                  onClick={() => (chip.value === null ? changeFilter(chip.column, "") : toggleOption(chip.column, chip.value))}
                  className={cn("grid size-5 place-items-center rounded-full text-muted transition-colors hover:bg-accent/20 hover:text-foreground", ring)}
                >
                  <svg aria-hidden viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
                  </svg>
                </button>
              </span>
            ))}
            <button type="button" onClick={clearAll} className={cn("ml-1 rounded-md px-1.5 text-xs font-medium text-accent hover:underline", ring)}>
              Clear all
            </button>
          </div>
        ) : null}

        {/* Table */}
        <div className="relative">
          <div
            role="region"
            aria-labelledby={captionId}
            tabIndex={0}
            className="overflow-auto overscroll-x-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
            style={{ maxHeight }}
          >
            <table aria-busy={loading || undefined} className="w-full border-separate border-spacing-0 text-sm">
              <caption id={captionId} className="sr-only">
                {caption}
              </caption>
              <thead>
                <tr>
                  {selectable ? (
                    <th scope="col" className="sticky top-0 z-[2] w-12 border-b border-border bg-surface-2/90 px-4 py-2.5 text-left backdrop-blur-md">
                      <Checkbox
                        checked={allChecked}
                        indeterminate={selectedInView > 0 && !allChecked}
                        disabled={loading || rowIds.length === 0}
                        label={allChecked ? "Deselect all rows" : `Select all ${rowIds.length} rows`}
                        onChange={() => {
                          const next = new Set(selected);
                          for (const id of rowIds) {
                            if (allChecked) next.delete(id);
                            else next.add(id);
                          }
                          updateSelection(next);
                        }}
                      />
                    </th>
                  ) : null}
                  {visibleColumns.map((col) => {
                    const ruleIndex = sort.findIndex((r) => r.key === col.key);
                    const rule = ruleIndex >= 0 ? sort[ruleIndex] : null;
                    const align = col.align ?? "left";
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={ruleIndex === 0 && rule ? (rule.direction === "asc" ? "ascending" : "descending") : undefined}
                        style={{ width: col.width }}
                        className={cn(
                          "sticky top-0 z-[1] whitespace-nowrap border-b border-border bg-surface-2/90 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted backdrop-blur-md",
                          alignClass[align],
                          col.hideBelow && hideClass[col.hideBelow],
                        )}
                      >
                        {col.sortable === false ? (
                          col.header
                        ) : (
                          <button
                            type="button"
                            aria-describedby={hintId}
                            onClick={(event) => toggleSort(col.key, event.shiftKey)}
                            className={cn(
                              "group -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 uppercase tracking-wider transition-colors hover:text-foreground",
                              rule && "text-foreground",
                              justifyClass[align],
                              align === "right" && "flex-row-reverse",
                              ring,
                            )}
                          >
                            {col.header}
                            <span className="relative inline-grid size-4 place-items-center">
                              <svg
                                aria-hidden
                                viewBox="0 0 16 16"
                                className={cn(
                                  "size-3.5 transition-[rotate,opacity,translate] duration-300 motion-reduce:transition-none",
                                  SPRING,
                                  rule ? "opacity-100" : "translate-y-0.5 opacity-0 group-hover:translate-y-0 group-hover:opacity-50",
                                  rule?.direction === "desc" && "rotate-180",
                                )}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M8 13V3M4 7l4-4 4 4" />
                              </svg>
                            </span>
                            {rule && sort.length > 1 ? (
                              <span className="grid size-4 place-items-center rounded-full bg-accent text-[10px] font-bold leading-none text-accent-foreground">
                                {ruleIndex + 1}
                              </span>
                            ) : null}
                            <span className="sr-only">
                              {rule ? `, sorted ${rule.direction === "asc" ? "ascending" : "descending"}${sort.length > 1 ? `, priority ${ruleIndex + 1}` : ""}` : ""}
                            </span>
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody ref={tbodyRef}>
                {loading ? (
                  Array.from({ length: Math.min(pageSize, 8) }, (_, r) => (
                    <tr key={`skeleton-${r}`} aria-hidden>
                      {selectable ? (
                        <td className={cn("border-b border-border", cellPad)}>
                          <span className="data-table-bone block size-[18px] rounded-[5px]" />
                        </td>
                      ) : null}
                      {visibleColumns.map((col, c) => (
                        <td key={col.key} className={cn("border-b border-border", cellPad, col.hideBelow && hideClass[col.hideBelow])}>
                          <span
                            className={cn("data-table-bone block h-3 rounded-full", col.align === "right" && "ml-auto")}
                            style={{ width: `${45 + ((r * 7 + c * 13) % 5) * 11}%` }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-12">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <EmptyArt />
                        <p className="text-base font-semibold text-foreground">{emptyTitle}</p>
                        <p className="max-w-xs text-sm text-muted">{filtering ? emptyDescription : "There is nothing here yet."}</p>
                        {filtering ? (
                          <button
                            type="button"
                            onClick={clearAll}
                            className={cn("mt-2 h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-surface-2 active:scale-95", ring)}
                          >
                            Clear search and filters
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const id = getRowId(row);
                    const isSelected = selected.has(id);
                    return (
                      <tr
                        key={id}
                        data-row-id={id}
                        className={cn(
                          "group/row relative transition-colors duration-150",
                          isSelected ? "bg-accent/[0.07]" : "hover:bg-surface-2/70",
                        )}
                      >
                        {selectable ? (
                          <td className={cn("border-b border-border", cellPad)}>
                            <Checkbox
                              checked={isSelected}
                              label={`Select row ${id}`}
                              onChange={(checked) => {
                                const next = new Set(selected);
                                if (checked) next.add(id);
                                else next.delete(id);
                                updateSelection(next);
                              }}
                            />
                          </td>
                        ) : null}
                        {visibleColumns.map((col) => {
                          const highlight = (value: string) => (col.searchable === false ? value : highlightText(value, q));
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                "whitespace-nowrap border-b border-border",
                                cellPad,
                                alignClass[col.align ?? "left"],
                                col.hideBelow && hideClass[col.hideBelow],
                              )}
                            >
                              {col.cell ? col.cell(row, { highlight }) : highlight(text(col.accessor(row)))}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Floating bulk-action bar */}
          {selectable ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[3] flex justify-center px-3">
              <div
                inert={selectedIds.length === 0}
                className={cn(
                  "flex max-w-full items-center gap-1.5 rounded-2xl border border-border bg-surface/95 p-1.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.35)] backdrop-blur-xl",
                  "transition-[translate,opacity,scale] duration-500 motion-reduce:transition-opacity",
                  SPRING,
                  selectedIds.length > 0 ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-[calc(100%+1rem)] scale-95 opacity-0",
                )}
              >
                <span className="flex h-9 items-center gap-2 whitespace-nowrap pl-2 pr-1 text-sm font-medium">
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold tabular-nums text-accent-foreground">
                    {selectedIds.length}
                  </span>
                  selected
                </span>
                <span aria-hidden className="h-5 w-px bg-border" />
                <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
                  {bulkActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => action.onAction(selectedIds)}
                      className={cn(
                        "h-9 shrink-0 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition-[background-color,scale] active:scale-95",
                        action.tone === "danger"
                          ? "text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
                          : "text-foreground hover:bg-surface-2",
                        ring,
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Clear selection"
                  onClick={() => updateSelection(new Set())}
                  className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-foreground", ring)}
                >
                  <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer: page size and pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm text-muted">
          <label className="flex items-center gap-2">
            Rows per page
            <select
              value={pageSize}
              onChange={(event) => {
                takeSnapshot();
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
              className={cn("h-9 rounded-lg border border-border bg-surface px-2 text-sm text-foreground", ring)}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              {firstRow}–{lastRow} of {rows.length}
            </span>
            <button
              type="button"
              aria-label="Previous page"
              disabled={safePage === 0 || loading}
              onClick={() => goToPage(safePage - 1)}
              className={cn("grid size-9 place-items-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40", ring)}
            >
              <Chevron dir="left" />
            </button>
            <span className="tabular-nums text-foreground">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={safePage >= pageCount - 1 || loading}
              onClick={() => goToPage(safePage + 1)}
              className={cn("grid size-9 place-items-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40", ring)}
            >
              <Chevron dir="right" />
            </button>
          </div>
        </div>
      </div>

      <span id={hintId} className="sr-only">
        Shift-click to sort by more than one column.
      </span>
      <span role="status" className="sr-only">
        {status}
      </span>
    </div>
  );
}
