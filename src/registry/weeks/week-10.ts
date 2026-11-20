import DataTableDemo from "@/components/demos/data-table-demo";
import LightboxGalleryDemo from "@/components/demos/lightbox-gallery-demo";
import SkeletonShimmerDemo from "@/components/demos/skeleton-shimmer-demo";
import type { RegistryEntry } from "../types";

export const week10: RegistryEntry[] = [
  {
    slug: "data-table",
    name: "Smart Data Table",
    kind: "table",
    week: 10,
    added: "2026-11-21",
    summary:
      "A sortable, filterable data table with search highlights, filter chips, multi-sort, paging, density and column toggles. Rows glide to their new order, and a bulk-action bar slides up when rows are selected.",
    source: "src/components/ui/data-table.tsx",
    Demo: DataTableDemo,
    states: ["sort asc / desc / none", "shift-click multi-sort", "search highlight", "filter chips", "row selection", "select all (indeterminate)", "bulk-action bar", "pagination", "compact / comfortable", "column visibility", "loading skeleton", "empty state", "sticky header", "scroll region", "reduced motion"],
    usage: `import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

const columns: DataTableColumn<Invoice>[] = [
  { key: "id", header: "Invoice", accessor: (r) => r.id, hideable: false },
  { key: "client", header: "Client", accessor: (r) => r.client, filter: "text" },
  {
    key: "status",
    header: "Status",
    accessor: (r) => r.status,
    filter: "select",
    cell: (r, { highlight }) => <StatusPill status={r.status}>{highlight(r.status)}</StatusPill>,
  },
  { key: "issued", header: "Issued", accessor: (r) => r.issued, hideBelow: "sm", searchable: false },
  { key: "amount", header: "Amount", accessor: (r) => r.amount, align: "right", cell: (r) => money(r.amount) },
];

export function Invoices({ rows, loading }: { rows: Invoice[]; loading: boolean }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      caption="Invoices"
      loading={loading}
      defaultSort={[{ key: "issued", direction: "desc" }]}
      bulkActions={[{ id: "paid", label: "Mark paid", onAction: (ids) => markPaid(ids) }]}
    />
  );
}`,
    props: [
      { name: "data", type: "T[]", description: "Rows. Any shape; columns read them through accessors." },
      { name: "columns", type: "DataTableColumn<T>[]", description: "{ key, header, accessor, cell?, sortable?, filter?: \"text\" | \"select\", filterOptions?, searchable?, align?, width?, hideBelow?: \"sm\" | \"md\" | \"lg\", hideable? }. cell gets a highlight(text) helper for search matches." },
      { name: "getRowId", type: "(row: T) => string", description: "Stable id per row. Used for selection and the FLIP animation." },
      { name: "caption", type: "string", description: "Table caption for screen readers. Also names the scroll region." },
      { name: "loading", type: "boolean", default: "false", description: "Shows shimmer skeleton rows and sets aria-busy." },
      { name: "selectable", type: "boolean", default: "true", description: "Adds the checkbox column with select all." },
      { name: "bulkActions", type: "{ id, label, onAction(ids), tone?: \"default\" | \"danger\" }[]", default: "[]", description: "Buttons in the floating bar that slides up when rows are selected." },
      { name: "onSelectionChange", type: "(ids: string[]) => void", description: "Called with the selected row ids after each change." },
      { name: "defaultSort", type: "{ key, direction: \"asc\" | \"desc\" }[]", default: "[]", description: "Starting sort rules, in priority order." },
      { name: "pageSize", type: "number", default: "10", description: "Starting rows per page." },
      { name: "pageSizeOptions", type: "number[]", default: "[10, 20, 50]", description: "Choices in the Rows per page select." },
      { name: "defaultDensity", type: '"comfortable" | "compact"', default: '"comfortable"', description: "Starting row density." },
      { name: "searchPlaceholder", type: "string", default: '"Search"', description: "Placeholder of the global search." },
      { name: "emptyTitle", type: "string", default: '"No matching rows"', description: "Heading of the empty state." },
      { name: "emptyDescription", type: "string", description: "Text under the empty-state heading when a search or filter is active." },
      { name: "maxHeight", type: "string", default: '"28rem"', description: "Max height of the scroll area. The header sticks inside it." },
      { name: "className", type: "string", description: "Extra classes on the root." },
      { name: "ref", type: "Ref<HTMLDivElement>", description: "Forwarded to the root element." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 DataTable, no dependencies: multi-sort, search highlights, filter chips, FLIP rows, bulk bar. Typed props, responsive, light/dark, ARIA, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called DataTable with no dependencies: a sortable, filterable data table like the ones in Linear and Vercel. Click a header to sort asc, desc or off with a springy arrow; shift-click adds a second sort with a priority badge. Global search highlights matches, filters show as removable chips, and rows glide to their new order with a FLIP animation. Checkbox selection with an indeterminate select all and a floating bulk-action bar. Paging, density toggle, column visibility, skeleton rows and an illustrated empty state. Typed generic columns, responsive (sticky header, labelled scroll region, low-priority columns hide), light and dark mode, accessible (aria-sort, caption, status), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "DataTable" (sortable, filterable data table) for Next.js App Router.

- Generic props: data, columns ({ key, header, accessor, cell?(row, { highlight }), sortable, filter "text" | "select", filterOptions, searchable, align, width, hideBelow, hideable }), getRowId, caption, loading, selectable, bulkActions, onSelectionChange, defaultSort, pageSize(Options), defaultDensity, empty texts, maxHeight, className, ref.
- Header click cycles asc, desc, none with a springy arrow. Shift-click adds a sort with a priority badge. aria-sort on the primary column.
- Search marks matches with <mark>. Filters panel: pill toggles for select, an input for text. Active filters become removable chips.
- FLIP: snapshot row positions in the handler, animate the delta with the Web Animations API, fade in new rows.
- Checkbox column, select all with indeterminate. A floating bar slides up with "3 selected", actions and clear; inert when hidden.
- Rows per page, pager, density toggle, Columns panel.
- Shimmer skeleton rows when loading (aria-busy). SVG empty state with a reset button.
- Sticky header in a focusable, labelled scroll region. Container queries hide low-priority columns. Polite row-count status.
- Reduced motion: no FLIP or shimmer, the bar only fades. Light/dark tokens, no dependencies.
Demo: 40 seeded invoices with initials avatars, status pills, owners, dates and amounts, plus Mark paid, Send reminder and Delete actions.`,
    notes: [
      "FLIP needs the old row positions, and they are gone by the time an effect runs. So every handler that can move rows (sort, search, filter, page) takes a snapshot first. A layout effect then cancels running animations, measures the new positions and plays the difference.",
      "The new React lint flagged the filter chips. Each chip kept a remove closure, and those closures reach the snapshot ref, which counts as reading a ref during render. Chips now hold plain data (column and value) and the click handler picks the action.",
      "The Filters and Columns panels close with a grid-rows 0fr transition. Visibility now transitions with it, so the hidden controls leave the tab order and axe skips them, while the panel still animates shut.",
      "The bulk bar floats over the last rows. Fading it out was not enough, because an invisible bar still caught clicks on those rows. When hidden it is now inert and has pointer-events: none.",
    ],
  },
  {
    slug: "lightbox-gallery",
    name: "Lightbox Gallery",
    kind: "modal",
    week: 10,
    added: "2026-11-21",
    summary:
      "A masonry photo grid that opens a full-screen viewer. The image grows out of its thumbnail, slides between photos with keys or swipe, zooms with a double-tap or pinch, and morphs back into its thumbnail on close.",
    source: "src/components/ui/lightbox-gallery.tsx",
    Demo: LightboxGalleryDemo,
    states: ["thumbnail hover", "focus-visible", "zoom open", "slide next / previous", "swipe", "double-tap zoom", "pinch zoom", "pan", "thumbnail strip", "slideshow", "paused", "swipe-down close", "no-loop ends", "reduced motion"],
    usage: `import { useRef } from "react";
import { LightboxGallery, type LightboxGalleryHandle, type LightboxItem } from "@/components/ui/lightbox-gallery";

const photos: LightboxItem[] = [
  { id: "reine", src: "/photos/reine.jpg", alt: "Snowy peaks above a fjord", caption: "Reine, Lofoten", width: 1600, height: 2000 },
  { id: "dunes", art: <DunesSvg />, alt: "Orange dunes at sunset", caption: "Erg Chebbi", width: 3, height: 2 },
];

export function Trip() {
  const gallery = useRef<LightboxGalleryHandle>(null);
  return (
    <>
      <button onClick={() => gallery.current?.open(0, { slideshow: true })}>Play slideshow</button>
      <LightboxGallery ref={gallery} items={photos} label="Trip photos" onIndexChange={(i) => console.log(i)} />
    </>
  );
}`,
    props: [
      { name: "items", type: "LightboxItem[]", description: "{ id, src?, art?, alt, caption?, width, height }. art is any node drawn instead of an image. width and height set the aspect ratio." },
      { name: "startIndex", type: "number", default: "0", description: "Index that open() starts on when it gets no index." },
      { name: "loop", type: "boolean", default: "true", description: "Wrap around at the ends. When false the ends rubber-band and the arrow buttons disable." },
      { name: "onIndexChange", type: "(index: number | null) => void", description: "Called with the shown index, or null once the viewer has closed." },
      { name: "columns", type: "2 | 3 | 4", default: "3", description: "Most masonry columns. Narrow containers get 2." },
      { name: "slideshowInterval", type: "number", default: "4000", description: "Milliseconds per image in the slideshow." },
      { name: "maxZoom", type: "number", default: "4", description: "Largest zoom factor." },
      { name: "showThumbnails", type: "boolean", default: "true", description: "Thumbnail strip at the bottom of the viewer." },
      { name: "label", type: "string", default: '"Gallery"', description: "Accessible name of the grid list." },
      { name: "viewerLabel", type: "string", default: '"Image viewer"', description: "Accessible name of the dialog." },
      { name: "className", type: "string", description: "Extra classes on the root." },
      { name: "ref", type: "Ref<LightboxGalleryHandle>", description: "{ open(index?, { slideshow? }), close() }." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 LightboxGallery, no dependencies: masonry grid, FLIP open, swipe, pinch zoom, slideshow. Typed props, responsive, light/dark, ARIA dialog, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called LightboxGallery with no dependencies: a masonry photo grid that opens a full-screen lightbox. The image grows out of its thumbnail with a FLIP animation inside a native dialog. Arrow keys and swipe slide to the next or previous photo. Zoom with a double-tap, pinch or the +/- buttons, and pan when zoomed. A thumbnail strip, caption, \"3 / 12\" counter and a slideshow with a progress bar and pause. Escape, a tap beside the image or a swipe down morphs it back into its thumbnail and returns focus there. Typed props (items with src or SVG art, startIndex, loop, onIndexChange, columns, slideshowInterval, maxZoom, ref with open/close), responsive, accessible (labelled dialog, live region, named buttons), reduced-motion fades.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "LightboxGallery" (masonry grid + full-screen viewer) for Next.js App Router.

- Props: items ({ id, src?, art?, alt, caption?, width, height }), startIndex, loop, onIndexChange, columns (2 | 3 | 4), slideshowInterval, maxZoom, showThumbnails, label, viewerLabel, className, ref with open(index?, { slideshow }) and close().
- Masonry with CSS columns and container queries, 2 columns on phones. Thumbnail buttons named by alt, hover caption.
- Native <dialog> + showModal. The image grows out of its thumbnail with a FLIP (Web Animations API). It is sized with cq units on a size container.
- Arrow keys, Home/End and swipe slide to next/previous. Without loop the ends rubber-band.
- Zoom by double-click/double-tap, pinch, +/- buttons or keys, around the pointer. Pan when zoomed, clamped.
- Thumbnail strip (aria-current), caption, "3 / 12" counter. Slideshow whose WAAPI progress bar is the timer, with pause.
- Escape, a tap beside the image or a swipe down morphs it back into its thumbnail from where it is, then focus returns there.
- A11y: labelled dialog, live region "Image 3 of 12: caption", named icon buttons. Page scroll locked.
- Reduced motion: fades only.
Demo: 12 SVG landscapes in mixed aspect ratios with captions, a Play slideshow button and a "Viewing" readout.`,
    notes: [
      "The viewer image is sized with container query units on a size container: the smaller of the stage width and the stage height times the aspect ratio. It fits any photo without JS measuring, and the open morph can read its final box right after showModal.",
      "Closing first measures the image where it is on screen, including zoom and any swipe-down offset. Then it clears those transforms and plays one morph from that box into the thumbnail. A swipe-down close carries on from the finger instead of jumping back first.",
      "Pointer capture on the stage makes every pointerup land on the stage itself. So whether a tap hit the image is decided at pointerdown and kept with the gesture. A tap beside the image closes; two quick taps on it toggle zoom.",
      "The slideshow has no separate timer. The progress bar is a Web Animations API animation, its finish moves to the next photo, and pause pauses that animation. The bar and the timing can never drift apart.",
    ],
  },
  {
    slug: "skeleton-shimmer",
    name: "Skeleton Shimmer",
    kind: "loader",
    week: 10,
    added: "2026-11-21",
    summary:
      "A skeleton loading system: line, circle, rect and text primitives plus card, list, profile, table-row and article presets. One diagonal shimmer sweeps across every skeleton on the page in sync, and the real content blurs in with a stagger when loading ends.",
    source: "src/components/ui/skeleton-shimmer.tsx",
    Demo: SkeletonShimmerDemo,
    states: ["shimmer", "pulse", "wave", "loading", "reveal (blur + stagger)", "loaded", "presets", "seeded line widths", "light / dark", "forced colours", "reduced motion"],
    usage: `import { Skeleton, SkeletonPreset, SkeletonText } from "@/components/ui/skeleton-shimmer";

export function Feed({ posts, loading }: { posts: Post[]; loading: boolean }) {
  return (
    <Skeleton loading={loading} preset="list-item" count={3} label="Loading the feed" className="flex flex-col gap-5">
      {posts.map((post) => (
        <PostRow key={post.id} post={post} />
      ))}
    </Skeleton>
  );
}

// Custom shape, same synced shimmer:
<Skeleton loading={!bio} skeleton={<SkeletonText lines={4} seed={7} />}>
  <p>{bio}</p>
</Skeleton>

// Static preset, e.g. in a Suspense fallback:
<SkeletonPreset variant="article" mode="wave" />`,
    props: [
      { name: "loading", type: "boolean", description: "Skeleton: shows the bones while true. When it turns false the children fade and unblur in." },
      { name: "children", type: "ReactNode", description: "Skeleton: the real content. Its top-level elements are revealed one after another." },
      { name: "skeleton", type: "ReactNode", description: "Skeleton: custom bones built from the primitives. Overrides preset." },
      { name: "preset", type: '"card" | "list-item" | "profile" | "table-row" | "article"', default: '"card"', description: "Skeleton and SkeletonPreset (as variant): ready-made layouts." },
      { name: "count", type: "number", default: "3", description: "Repeats for the list-item and table-row presets." },
      { name: "mode", type: '"shimmer" | "pulse" | "wave"', default: '"shimmer"', description: "Animation. Skeleton passes it to every bone inside through context; primitives also take it directly." },
      { name: "label", type: "string", default: '"Loading…"', description: "Skeleton: visually hidden status text, read once while loading." },
      { name: "stagger", type: "number", default: "70", description: "Skeleton: ms between revealed children." },
      { name: "seed", type: "number", default: "1", description: "SkeletonText and SkeletonPreset: seed for the line widths, so server and client match." },
      { name: "width / height / size / radius / aspectRatio", type: "string | number", description: "SkeletonLine, SkeletonCircle and SkeletonRect sizing. Numbers are px." },
      { name: "lines / minWidth / maxWidth / lineHeight / gap", type: "number", description: "SkeletonText: line count, width range in percent (last line shorter) and spacing." },
      { name: "className", type: "string", description: "Extra classes. On Skeleton they lay out both the bones and the content." },
      { name: "ref", type: "Ref<HTMLDivElement>", description: "Skeleton: forwarded to the container." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 SkeletonShimmer, no dependencies: 5 presets, synced shimmer, pulse/wave, blur-in reveal. Typed props, responsive, light/dark, aria-busy, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called SkeletonShimmer with no dependencies: a premium skeleton loading system. Primitives (line, circle, rect, text with seeded line widths) and presets (card, list-item, profile, table-row, article). One diagonal shimmer sweeps across every skeleton on the page in sync, using background-attachment: fixed and animations pinned to a shared start time. Pulse and wave modes too. A Skeleton wrapper with a loading prop cross-fades and blurs from the bones into the real children with a short stagger. Typed props (loading, preset, skeleton, count, mode, label, stagger, seed), light and dark tokens, accessible (aria-busy, one hidden \"Loading…\" status, aria-hidden bones), reduced motion becomes a soft pulse.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "SkeletonShimmer" loading system for Next.js App Router.

- Primitives: SkeletonLine, SkeletonCircle, SkeletonRect (aspectRatio, radius), SkeletonText (lines with seeded widths, shorter last line). SkeletonPreset: "card", "list-item", "profile", "table-row", "article", with count and seed.
- <Skeleton loading preset|skeleton count mode label stagger className>: aria-busy, one visually hidden role="status" "Loading…" while loading. Bones are aria-hidden.
- When loading ends the bones stay as an absolute overlay that fades and blurs out, while the children's top-level elements fade in from blur with a stagger.
- Page-wide synced shimmer: a 300% wide diagonal gradient with background-attachment: fixed, and each bone's animation pinned to startTime 0 via getAnimations().
- Modes: shimmer, pulse (in phase), wave (delay from each bone's screen position, so the dip travels diagonally). Mode flows through context.
- Colours via color-mix on the theme tokens, tuned for light and dark. One React 19 <style href precedence>, keyframes prefixed skeleton-shimmer-.
- Reduced motion: no sweep, a soft opacity pulse, plain fade reveal. Forced colours: GrayText bones.
Demo: a team feed and a profile that load for 1.5s, a Reload button, a Shimmer / Pulse / Wave toggle and a gallery of the five presets.`,
    notes: [
      "To keep the shimmer in sync, every bone paints the same viewport-sized gradient with background-attachment: fixed. One band crosses the page and each bone shows its own slice. Bones that mount later are pinned to startTime 0 on the document timeline, so they join in phase instead of starting their own sweep.",
      "Each bone renders the stylesheet as a React 19 <style href precedence> element. React hoists it into the head once, however many bones there are, and the file stays self-contained.",
      "On reveal the bones stay on top as an absolute overlay while they blur out. The real content sets the height, so nothing jumps. The switch is derived during render from the previous loading value, not set in an effect.",
      "Wave mode gives each bone a negative delay from its position on screen. The dip then travels diagonally across the layout, the same direction as the shimmer.",
    ],
  },
];
