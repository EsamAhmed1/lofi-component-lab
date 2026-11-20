import ContributionHeatmapDemo from "@/components/demos/contribution-heatmap-demo";
import StickyScrollStoryDemo from "@/components/demos/sticky-scroll-story-demo";
import type { RegistryEntry } from "../types";

export const week08: RegistryEntry[] = [
  {
    slug: "sticky-scroll-story",
    name: "Sticky Scroll Story",
    kind: "section",
    week: 8,
    added: "2026-11-20",
    summary:
      "A scroll-driven feature story. Steps light up as they cross the middle, a progress line fills between the dots and a sticky panel cross-fades to each step's visual with a scroll-linked tilt.",
    source: "src/components/ui/sticky-scroll-story.tsx",
    Demo: StickyScrollStoryDemo,
    states: ["active step", "dot click", "focus-visible", "contained scroll", "page scroll", "visual left / right", "stacked mobile", "reduced motion"],
    usage: `import { StickyScrollStory, type StoryStep } from "@/components/ui/sticky-scroll-story";

const steps: StoryStep[] = [
  {
    id: "upload",
    title: "Upload your footage",
    description: "We transcribe it while it uploads.",
    bullets: ["Files up to 10 GB"],
    visual: <UploadMock />,
    gradient: "aurora",
    accent: "#8b5cf6",
  },
  { id: "export", title: "Export everywhere", description: "Three formats in one go.", gradient: "forest" },
];

export function HowItWorks() {
  return (
    <StickyScrollStory
      eyebrow="AI video editor"
      title="How our AI editor works"
      steps={steps}
      height="28rem" // leave out to scroll with the page
      onStepChange={(index, step) => track("story_step", { step: step.id })}
    />
  );
}`,
    props: [
      { name: "steps", type: "StoryStep[]", description: "{ id, title, description, bullets?, visual?, gradient?, accent? }. visual is a decorative ReactNode; gradient is a panel backdrop preset." },
      { name: "eyebrow", type: "string", description: "Small label above the title." },
      { name: "title", type: "string", description: "Section heading (h2). Also names the section." },
      { name: "description", type: "ReactNode", description: "Intro text under the title." },
      { name: "height", type: "string", description: "Contained mode, e.g. \"28rem\". Steps scroll inside a focusable region that is also the observer root. Leave out to use the page." },
      { name: "align", type: '"start" | "end"', default: '"end"', description: "Side of the sticky visual panel on wide layouts." },
      { name: "onStepChange", type: "(index: number, step: StoryStep) => void", description: "Called when the active step changes." },
      { name: "regionLabel", type: "string", default: '"{title}, scrollable steps"', description: "Accessible name of the scroll region in contained mode." },
      { name: "className", type: "string", description: "Extra classes on the section." },
      { name: "ref", type: "Ref<HTMLElement>", description: "Forwarded to the section element (React 19 ref prop)." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 StickyScrollStory, no dependencies: steps scroll past a sticky visual panel; the active step lights up, a progress line fills and the panel cross-fades with a parallax tilt. Can scroll in its own box and stacks on phones. Typed props, light/dark, labelled region, dots with aria-current, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called StickyScrollStory with no dependencies: a scroll-driven feature section. A column of steps sits next to a sticky visual panel; as each step reaches the middle it lights up, a progress line fills between the dots and the panel cross-fades to that step's visual with a parallax tilt. A height prop makes it scroll inside its own box. On phones each visual shows above its step. Typed props (eyebrow, title, description, steps, height, align, onStepChange, regionLabel, className), responsive, light and dark mode, accessible (labelled scroll region, step dots as buttons with aria-current), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "Sticky Scroll Story" section for Next.js App Router.

- Column of steps (number, h3 title, description, optional bullets) next to a sticky visual panel. Typed props: eyebrow, title, description, steps ({ id, title, description, bullets?, visual?, gradient?, accent? }), height?, align ("start" | "end"), onStepChange, regionLabel, className, ref.
- IntersectionObserver with a thin band across the middle picks the active step. Inactive titles turn muted (no opacity, so contrast holds). A rail measured from the dot centres fills to the active dot.
- Panel cross-fades and scales between layers (gradient preset + ReactNode visual). Each layer gets its own scroll progress (--p, set in rAF) for a parallax tilt and moving light.
- height="28rem" = contained mode: scrollable role="region" with aria-label and tabIndex=0, used as the observer root. Without it, the page scrolls.
- Dots are buttons with aria-label and aria-current="step"; click scrolls the step to the middle (smooth, or instant with reduced motion).
- Container queries, not viewport breakpoints: narrow containers stack, show each visual inline above its text and move the rail to the left edge.
- Visuals are decorative: aria-hidden + inert.
- Reduced motion (live): no tilt or scale, instant swaps.
Demo: "How our AI editor works", 4 steps with hand-built mocks (upload, timeline, captions, export), contained 28rem, a left/right toggle and a live step readout.`,
    notes: [
      "The preview box can be 375px wide on a wide screen, so viewport breakpoints put the side-by-side layout in a phone-sized box. The layout switches with container queries on the section instead.",
      "Dimming inactive steps with opacity would push the muted text below 4.5:1. Inactive titles switch to the muted colour instead, which passes in both schemes.",
      "Each panel layer gets its own scroll progress (--p) through its step. One shared value would reset at every step change and make the tilt jump; this way the outgoing visual keeps moving while it fades.",
      "The progress rail is measured from the dot centres with a ResizeObserver, so it lines up even when steps have different heights or the layout stacks.",
    ],
  },
  {
    slug: "contribution-heatmap",
    name: "Contribution Heatmap",
    kind: "chart",
    week: 8,
    added: "2026-11-20",
    summary:
      "A GitHub-style calendar heatmap with streak stats, a range switcher, four colour presets and a keyboard-navigable grid. Cells pop in along the diagonal and glow with a tooltip on hover or focus.",
    source: "src/components/ui/contribution-heatmap.tsx",
    Demo: ContributionHeatmapDemo,
    states: ["hover tooltip", "focus-visible", "arrow keys", "Home / End", "Enter selects", "selected", "range switch", "loading", "empty", "reduced motion"],
    usage: `import { ContributionHeatmap } from "@/components/ui/contribution-heatmap";

export function ActivityCard({ days }: { days: { date: string; count: number }[] }) {
  return (
    <ContributionHeatmap
      title="Commits"
      data={days}
      preset="emerald"
      weekStart="mon"
      ranges={[
        { id: "12m", label: "12 months", startDate: "2025-11-01", endDate: "2026-10-31" },
        { id: "3m", label: "3 months", startDate: "2026-08-01", endDate: "2026-10-31" },
      ]}
      unit={{ one: "commit", other: "commits" }}
      onSelectDay={(day) => openDay(day.date)}
    />
  );
}`,
    props: [
      { name: "data", type: "{ date: string; count: number }[]", description: "Daily counts as YYYY-MM-DD. Missing days are 0, duplicates are summed." },
      { name: "startDate / endDate", type: "string", description: "Range shown. endDate defaults to the latest date in data." },
      { name: "weeks", type: "number", default: "52", description: "Weeks shown when startDate is not set." },
      { name: "ranges", type: "HeatmapRange[]", description: "{ id, label, startDate, endDate } for the segmented switcher. Overrides startDate / endDate." },
      { name: "rangeId / defaultRangeId", type: "string", description: "Controlled or starting range." },
      { name: "onRangeChange", type: "(range: HeatmapRange) => void", description: "Called when the range changes." },
      { name: "preset", type: '"accent" | "emerald" | "ember" | "ocean"', default: '"accent"', description: "Colour scale with separate light and dark values." },
      { name: "colorScale", type: "[string, string, string, string, string]", description: "Custom colours for levels 0 to 4. Overrides preset." },
      { name: "cellSize", type: "number", default: "12", description: "Cell size in px." },
      { name: "gap", type: "number", default: "3", description: "Gap between cells in px." },
      { name: "weekStart", type: '"sun" | "mon"', default: '"sun"', description: "First row of each week column." },
      { name: "showStats", type: "boolean", default: "true", description: "Total, longest streak, current streak and best day." },
      { name: "showLegend", type: "boolean", default: "true", description: "The Less to More legend." },
      { name: "selectedDate / defaultSelectedDate", type: "string | null", description: "Controlled or starting selected day." },
      { name: "onSelectDay", type: "(day: SelectedDay) => void", description: "Click, Enter or Space on a day. Gets { date, count, level, label }." },
      { name: "title", type: "string", default: '"Contributions"', description: "Heading (h3). Also names the grid." },
      { name: "description", type: "string", description: "Line under the title." },
      { name: "unit", type: "{ one: string; other: string }", default: '{ one: "contribution", other: "contributions" }', description: "Words used in labels, tooltip and stats." },
      { name: "loading", type: "boolean", default: "false", description: "Pulsing cells, stat skeletons and aria-busy." },
      { name: "className", type: "string", description: "Extra classes on the card." },
      { name: "ref", type: "Ref<HTMLDivElement>", description: "Forwarded to the card (React 19 ref prop)." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 ContributionHeatmap, no dependencies: a GitHub-style calendar with 4 colour presets, diagonal pop-in, hover glow and tooltip, streak stats, range switcher and legend, no Date during render. Typed props, scrolls sideways on phones, light/dark, grid role with arrow keys, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called ContributionHeatmap with no dependencies: a GitHub-style calendar heatmap. Weeks as columns and days as rows, 5 colour levels with 4 presets, cells that pop in along the diagonal, a glow and tooltip on hover or focus, stats (total, longest streak, current streak, best day), a range switcher and a legend. Scrolls sideways on phones, starting at the latest weeks. No Date during render, so no hydration errors. Typed props (data, startDate, endDate, weeks, ranges, preset, colorScale, cellSize, gap, weekStart, showStats, onSelectDay, title, unit, loading), light and dark mode, accessible (grid role with arrow-key navigation, a label on every day, hidden summary), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "Contribution Heatmap" chart for Next.js App Router.

- GitHub-style calendar: weeks are columns, days are rows, month labels on top, Mon/Wed/Fri in a fixed column outside the scroll area. Typed props: data ({ date, count }[]), startDate/endDate or weeks, ranges, preset ("accent" | "emerald" | "ember" | "ocean") or colorScale, cellSize, gap, weekStart ("sun" | "mon"), showStats, showLegend, selectedDate, onSelectDay, title, unit, loading.
- 5 levels from quartiles of non-zero days. Presets have separate light and dark values so empty cells stay visible.
- useMemo stats: total, longest streak, current streak, best day. Segmented range switcher with a sliding pill (aria-pressed). Legend "Less ▢▢▢▢▢ More".
- Cells pop in along the diagonal when scrolled into view; hover or focus scales a cell with a glow and a tooltip ("12 commits on Tue, Mar 4").
- A11y: role="grid" with weekday rows, rowheaders and gridcells (aria-label, aria-selected). Roving tabindex: arrows move by day/week, PageUp/Down by 4 weeks, Home/End along the row, Ctrl+Home/End to range ends. Enter, Space or click calls onSelectDay. sr-only live summary.
- Scrolls in a labelled, focusable region that starts at the latest weeks; no page overflow.
- No Date during render: integer day maths, fixed en-US formatting. Reduced motion via CSS.
Demo: seeded PRNG data for 2025-11-01 to 2026-10-31, preset and week-start switchers, 3 ranges and a "Selected day" readout.`,
    notes: [
      "Dates are integer day numbers converted with a civil-calendar algorithm, never Date objects, so the server and every timezone agree. The maths was checked against Date.UTC for about 120,000 days.",
      "The DOM is row-major: each role=\"row\" is a weekday and each gridcell is one week. That matches the visual layout, so screen reader rows read the way the chart looks.",
      "The pop-in animation runs on an inner span and the hover scale on the cell. Keeping them on separate elements means the stagger delay never slows down hover.",
      "The reveal is a data attribute set by an IntersectionObserver, not React state, so the 365 cells do not re-render when the chart scrolls into view.",      "Visual QA caught the sticky weekday labels showing as white blocks on the tinted card, with cells peeking through the gaps on phones. The labels now sit in their own column outside the scroll area, and each row keeps a screen-reader-only row header.",
    ],
  },
];
