import AuroraHeroDemo from "@/components/demos/aurora-hero-demo";
import MagnifyDockDemo from "@/components/demos/magnify-dock-demo";
import type { RegistryEntry } from "../types";

export const week03: RegistryEntry[] = [
  {
    slug: "magnify-dock",
    name: "Magnify Dock",
    kind: "navbar",
    week: 3,
    added: "2026-11-20",
    summary:
      "A macOS-style glass dock. Icons and their neighbours grow smoothly as the pointer or keyboard focus moves along it, with tooltips, badges, an active dot and a launch bounce. On touch or narrow screens it turns into a scrollable bar with snap.",
    source: "src/components/ui/magnify-dock.tsx",
    Demo: MagnifyDockDemo,
    states: ["hover magnify", "focus magnify", "tooltip", "arrow keys", "Enter / Space", "click bounce", "active dot", "badge", "divider", "disabled", "scroll mode", "reduced motion"],
    usage: `import { MagnifyDock, type DockItem } from "@/components/ui/magnify-dock";

const items: DockItem[] = [
  { id: "home", label: "Home", icon: <HomeIcon />, href: "/", active: true },
  { id: "inbox", label: "Inbox", icon: <InboxIcon />, href: "/inbox", badge: 4 },
  { id: "search", label: "Search", icon: <SearchIcon />, onSelect: () => openSearch() },
  { id: "settings", label: "Settings", icon: <GearIcon />, href: "/settings", group: "system" },
];

export function AppShell() {
  return <MagnifyDock items={items} label="Main" position="bottom-fixed" />;
}`,
    props: [
      { name: "items", type: "DockItem[]", description: "{ id, label, icon, href?, onSelect?, badge?, active?, disabled?, group? }. href renders a link, otherwise a button. A change of group draws a divider." },
      { name: "magnification", type: "number", default: "1.8", description: "Scale of the icon under the pointer. 1 turns magnification off." },
      { name: "distance", type: "number", default: "140", description: "Pixels from the pointer within which neighbours still grow." },
      { name: "baseSize", type: "number", default: "48", description: "Resting icon size in px. Gap and padding scale with it." },
      { name: "position", type: '"inline" | "bottom-fixed"', default: '"inline"', description: "Sit in the flow, or pin to the bottom of the viewport (safe-area aware)." },
      { name: "tile", type: '"glass" | "bare"', default: '"glass"', description: "Glass centres the icon on a frosted tile; bare lets the icon fill the tile, for app artwork." },
      { name: "label", type: "string", default: '"Dock"', description: "Accessible name of the nav landmark." },
      { name: "onSelect", type: "(item: DockItem) => void", description: "Called after any item is activated." },
      { name: "className", type: "string", description: "Extra classes on the nav." },
      { name: "ref", type: "Ref<HTMLElement>", description: "Forwarded to the nav element." },
    ],
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called MagnifyDock with no dependencies: a macOS-style glass dock navbar. Icons grow smoothly around the pointer (cosine falloff, CSS variables in requestAnimationFrame), neighbours grow too and the dock widens. Tooltip on hover or focus, active dot, badge counts, group divider, disabled items and a bounce on click. If the magnified dock does not fit, it switches to a scrollable bar with snap and labels. Typed props (items, magnification, distance, baseSize, position, tile, label, onSelect, className), responsive, light and dark mode, accessible (nav list, roving tabindex with arrow keys, aria-current, focus magnifies too), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "MagnifyDock" (macOS-style glass dock navbar) for Next.js App Router.

- Props: items { id, label, icon, href?, onSelect?, badge?, active?, disabled?, group? }, magnification (1.8), distance (140px), baseSize (48), position ("inline" | "bottom-fixed"), tile ("glass" | "bare"), label, onSelect, className, ref.
- Icons grow with a raised-cosine falloff around the pointer. Ease sizes in rAF and write a CSS variable per item (no React state per move). Neighbours grow, the dock widens, icons rise above a fixed-height glass bar.
- Tooltip above each icon on hover or focus-visible. Active dot, red badge (99+), divider when group changes, disabled tiles. Bounce on click with the Web Animations API.
- A11y: nav + ul, links or buttons, roving tabindex, arrows / Home / End skip disabled, Enter and Space activate, keyboard focus magnifies too. aria-current on the active item, badge read as "3 new".
- Measure the space with ResizeObserver. If the magnified dock cannot fit, switch to scroll mode: no magnification, overflow-x scroll with snap, labels under icons, a pop instead of a jump. Touch and reduced motion turn magnification and bounce off. Never overflow the page.
- Light/dark tokens, no dependencies.
Demo: 9 hand-drawn gradient app icons with a divider, badges that clear on open, a disabled app and a "Selected: X" readout, plus a smaller glass variant with line icons.`,
    notes: [
      "Sizes come from each icon's live position, but growing an icon moves its neighbours' centres, which feeds back into the next frame. So each size eases a quarter of the way toward its target every frame instead of jumping. That damps the feedback and still feels instant.",
      "A scroll container clips vertical overflow, so magnified icons and tooltips cannot rise out of a scrolling bar. Instead of mixing the two, the dock picks one mode. It works out the widest the magnified row can get, and if that does not fit it switches to scroll mode with labels under the icons.",
      "The fit check uses the item count and sizes, not a measurement of the rendered list. Measuring the list would change when the mode changes and could flip back and forth.",
      "The bounce uses the Web Animations API on an inner tile, so the click animation never fights the size variable the magnify loop writes on the outer element.",
    ],
  },
  {
    slug: "aurora-hero",
    name: "Aurora Hero",
    kind: "section",
    week: 3,
    added: "2026-11-20",
    summary:
      "A cinematic landing hero with a drifting aurora, grain, a faint grid and a pointer spotlight. One headline word rotates with a blur and slide, the main button has a travelling border beam, and the stats count up when they scroll into view.",
    source: "src/components/ui/aurora-hero.tsx",
    Demo: AuroraHeroDemo,
    states: ["aurora drift", "pointer spotlight", "word rotation", "border beam", "count-up stats", "pause motion", "hover", "focus-visible", "pressed", "reduced motion", "center / left"],
    usage: `import { AuroraHero } from "@/components/ui/aurora-hero";

export default function Page() {
  return (
    <AuroraHero
      eyebrow="New: Framecast 2.0 renders in 4K"
      headlineBefore="Turn any script into"
      rotatingWords={["launch films", "product demos", "explainers"]}
      headlineAfter="in minutes."
      description="Paste a script or a product link and get an editable cut."
      primaryCta={{ label: "Start free", href: "/signup" }}
      secondaryCta={{ label: "Watch the demo", href: "#demo" }}
      stats={[
        { value: 2.4, suffix: "M", label: "videos rendered" },
        { value: 38, label: "voice languages" },
      ]}
      colors={["#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b"]}
    />
  );
}`,
    props: [
      { name: "headlineBefore", type: "string", description: "Headline text before the rotating word." },
      { name: "rotatingWords", type: "string[]", description: "Words that rotate on their own line. The first is shown under reduced motion." },
      { name: "headlineAfter", type: "string", description: "Headline text after the rotating word." },
      { name: "headlineLabel", type: "string", default: "before + first word + after", description: "The static sentence screen readers get instead of the rotation." },
      { name: "eyebrow", type: "string", description: "Pill above the headline with a moving sheen." },
      { name: "description", type: "string", description: "Subheading under the headline." },
      { name: "primaryCta", type: "{ label, href?, onClick? }", description: "Main button with the border beam. href renders a link." },
      { name: "secondaryCta", type: "{ label, href?, onClick? }", description: "Outlined glass button." },
      { name: "stats", type: "{ value, prefix?, suffix?, label, decimals? }[]", default: "[]", description: "Up to 4 numbers that count up once when 35% visible." },
      { name: "logos", type: "{ name, logo? }[]", default: "[]", description: "Optional logo row. The name is always shown as text." },
      { name: "logosLabel", type: "string", default: '"Trusted by teams at"', description: "Caption above the logo row." },
      { name: "colors", type: "string[]", default: "violet, pink, cyan, amber", description: "Aurora palette for the four blobs; the first two also tint the beam." },
      { name: "align", type: '"center" | "left"', default: '"center"', description: "Text alignment. The readability veil follows it." },
      { name: "interval", type: "number", default: "2600", description: "Milliseconds each rotating word stays." },
      { name: "headingLevel", type: "1 | 2 | 3", default: "1", description: "Heading level of the headline." },
      { name: "showMotionToggle", type: "boolean", default: "true", description: "Shows a pause button that freezes every animation." },
      { name: "className", type: "string", description: "Extra classes on the section." },
      { name: "ref", type: "Ref<HTMLElement>", description: "Forwarded to the section element." },
    ],
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called AuroraHero with no dependencies: a cinematic landing hero. Animated aurora background (drifting blurred colour blobs, grain, faint grid, pointer spotlight), an eyebrow pill with shiny text, a headline where one word rotates with a blur and slide, two CTAs (the primary with a light beam running round its border), stats that count up when scrolled into view and a logo row. A pause button stops all motion. Typed props (eyebrow, headline parts, rotatingWords, description, primaryCta, secondaryCta, stats, logos, colors, align, headingLevel, className), responsive, light and dark mode with 4.5:1 text contrast, accessible (static sentence for screen readers, pause control), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "AuroraHero" (cinematic landing hero) for Next.js App Router.

- Props: eyebrow, headlineBefore, rotatingWords, headlineAfter, headlineLabel, description, primaryCta / secondaryCta ({ label, href? | onClick? }), stats ({ value, prefix?, suffix?, label, decimals? }), logos, colors (aurora palette), align ("center" | "left"), interval, headingLevel, showMotionToggle, className, ref.
- Background (aria-hidden): 4 blurred gradient blobs drifting on slug-prefixed keyframes in a <style> tag, feTurbulence grain data URI, faint masked grid, pointer spotlight via CSS vars in rAF.
- A readability veil and bottom fade keep the copy at 4.5:1 in light and dark. Gradient word colours are picked per scheme.
- Eyebrow pill with sheen text. One word rotates with blur + slide; the heading holds a static sr-only sentence and the rotation is aria-hidden. Primary CTA has a conic border beam.
- Stats in a glass card count up once via IntersectionObserver with an sr-only final value. Optional logo row.
- Pause button (aria-pressed) freezes everything (WCAG 2.2.2). Reduced motion: static aurora, first word, final stats.
- Container queries and clamp() type so it fits a 375px box.
Demo: a fictional AI video app hero with 4 rotating words, 3 stats, 5 logos and a click readout.`,
    notes: [
      "Text over a bright aurora fails contrast, especially muted text in light mode over pastel blobs. A radial veil of the background colour sits under the copy, so the aurora glows around the text instead of under it. The stats sit on their own glass card.",
      "The preview frame narrows the box without changing the window width, so sm: and md: breakpoints would not fire at the 375px setting. The hero uses container queries and clamp() with cqw units for the headline instead.",
      "The pause button sets a data attribute that pauses the CSS animations. A review caught that it would not pause the blobs, because their inline animation shorthand resets the play state to running. The pause rule now uses !important.",
      "Rotating words share one grid cell, so the line height never jumps and the outgoing word can blur up while the next one slides in. Screen readers only hear the static sentence.",
    ],
  },
];
