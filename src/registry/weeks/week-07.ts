import DialKnobDemo from "@/components/demos/dial-knob-demo";
import MorphCardModalDemo from "@/components/demos/morph-card-modal-demo";
import type { RegistryEntry } from "../types";

export const week07: RegistryEntry[] = [
  {
    slug: "morph-card-modal",
    name: "Morph Card Modal",
    kind: "modal",
    week: 7,
    added: "2026-11-20",
    summary:
      "A grid of cards where each card grows into a full modal from its exact position, then shrinks back into the card on close. On phones the modal is a bottom sheet you can swipe down.",
    source: "src/components/ui/morph-card-modal.tsx",
    Demo: MorphCardModalDemo,
    states: ["hover lift", "focus ring", "pressed", "morph open", "morph close", "Esc", "backdrop click", "swipe down", "scrolling content", "reduced motion"],
    usage: `import { MorphCardModal, type MorphCardItem } from "@/components/ui/morph-card-modal";

const items: MorphCardItem[] = [
  {
    id: "lofoten",
    title: "Lofoten, Norway",
    subtitle: "Arctic fjords under the midnight sun",
    image: "/trips/lofoten.jpg", // or any ReactNode, e.g. an SVG scene
    accent: "#38bdf8",
    content: <TripDetails id="lofoten" />,
    cta: { label: "Save this trip", onClick: () => saveTrip("lofoten") },
  },
  // ...
];

export function Trips() {
  return (
    <MorphCardModal
      items={items}
      columns={3}
      onOpenChange={(id) => track(id ? "trip_opened" : "trip_closed", { id })}
    />
  );
}`,
    props: [
      { name: "items", type: "MorphCardItem[]", description: "{ id, title, subtitle?, image (ReactNode or URL), accent?, content, cta?: { label, href?, onClick? } }." },
      { name: "columns", type: "1 | 2 | 3 | 4", default: "3", description: "Columns at the widest size. Uses container queries, so it collapses to one column in narrow containers." },
      { name: "onOpenChange", type: "(openId: string | null) => void", description: "Called with the item id on open, and with null once the close animation has finished." },
      { name: "renderCard", type: "(item: MorphCardItem) => ReactNode", description: "Custom card face, rendered inside the card button. Tag parts with data-morph=\"image\" | \"title\" | \"subtitle\" to morph them." },
      { name: "closeLabel", type: "string", default: '"Close"', description: "Accessible name of the close button." },
      { name: "className", type: "string", description: "Classes for the root element." },
    ],
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "MorphCardModal" for Next.js App Router.

- Grid of cards; clicking one grows it into a modal from the card's exact position and shrinks back on close.
- Native <dialog> + showModal() for focus trap, Escape and inert page. Lock page scroll and keep the scrollbar gutter.
- FLIP with the Web Animations API (no View Transitions, so it works in Firefox and WebKit): measure card and panel rects, start the panel translated onto the card and clip-path inset to its size and radius, animate to rest. Image, title and subtitle (data-morph) FLIP too; text scales by font-size ratio. Body fades up late, backdrop blurs in. Start before first paint.
- Close via button, Esc (cancel event), backdrop click or swipe down on the mobile sheet: reverse the morph, then close and focus the card.
- Props: items { id, title, subtitle?, image (ReactNode or URL), accent?, content, cta? }, columns 1-4 (container queries), onOpenChange(id | null), renderCard, closeLabel.
- Content scrolls inside. Under 640px: full-width bottom sheet with a drag handle.
- Reduced motion: plain fade, live matchMedia listener.
- A11y: dialog labelled by the title and described by the subtitle, cards are buttons with aria-haspopup="dialog", named close button, focus-visible rings.
- Light/dark tokens, no dependencies.
Demo: 4 travel cards with SVG + gradient art (no image URLs), stats, a day-by-day list and a "Save this trip" CTA with a live status line.`,
    notes: [
      "Scaling the whole panel would squash its text, so the panel only moves and is clipped to the card with clip-path inset. Its image, title and subtitle get their own FLIP in panel coordinates. Both run with the same timing, so the parts stay lined up.",
      "The open animation starts in a layout effect right after showModal(), before the browser paints, so the first frame on screen is already the card-sized start and never the finished modal.",
      "The card is hidden with style.visibility, not React state, and shown again in the same step as dialog.close(). A state update could land a frame later and leave a gap where neither the card nor the panel is visible.",
      "Locking scroll hides the page scrollbar, which would shift the cards sideways and make the close animation land a few pixels off. The lock also sets scrollbar-gutter: stable while the modal is open.",
    ],
  },
  {
    slug: "dial-knob",
    name: "Dial Knob",
    kind: "input",
    week: 7,
    added: "2026-11-20",
    summary:
      "A rotary knob like a synth or hi-fi control, with lit ticks, a glowing arc and snapping detents. Drag it, spin the ring, scroll or use the keyboard; it works with forms and screen readers.",
    source: "src/components/ui/dial-knob.tsx",
    Demo: DialKnobDemo,
    states: ["hover glow", "focus ring", "dragging (pressed)", "ring drag", "wheel", "arrow keys", "PageUp / PageDown", "Home / End", "double-click reset", "log taper", "disabled", "reduced motion"],
    usage: `import { useState } from "react";
import { DialKnob } from "@/components/ui/dial-knob";

export function FilterControls() {
  const [cutoff, setCutoff] = useState(2400);

  return (
    <form action="/api/preset">
      <DialKnob label="Volume" unit="%" defaultValue={72} name="volume" haptics />
      <DialKnob
        label="Cutoff"
        unit="Hz"
        min={20}
        max={20000}
        step={10}
        taper="log"
        value={cutoff}
        onChange={setCutoff}
        formatValue={(hz) => (hz >= 1000 ? \`\${(hz / 1000).toFixed(1)}k\` : String(hz))}
        color="#f59e0b"
        name="cutoff"
      />
    </form>
  );
}`,
    props: [
      { name: "value / defaultValue", type: "number", description: "Controlled value, or the starting value when uncontrolled. defaultValue is also the reset target." },
      { name: "onChange", type: "(value: number) => void", description: "Called each time the knob lands on a new detent." },
      { name: "min", type: "number", default: "0", description: "Lowest value." },
      { name: "max", type: "number", default: "100", description: "Highest value." },
      { name: "step", type: "number", default: "1", description: "Detent size. Values snap to min + n × step." },
      { name: "taper", type: '"linear" | "log"', default: '"linear"', description: "Log spreads the sweep logarithmically, for frequencies. Needs min > 0." },
      { name: "label", type: "string", description: "Visible label that also names the slider." },
      { name: "unit", type: "string", default: '""', description: "Shown under the value and added to aria-valuetext." },
      { name: "formatValue", type: "(value: number) => string", description: "Formats the centre value, the end labels and aria-valuetext." },
      { name: "resetValue", type: "number", description: "Value for double-click reset. Falls back to defaultValue, then min." },
      { name: "size", type: "number", default: "132", description: "Diameter in px." },
      { name: "color", type: "string", default: '"var(--accent)"', description: "Colour of the lit ticks, arc, notch and glow." },
      { name: "disabled", type: "boolean", default: "false", description: "Dims the knob and ignores all input." },
      { name: "name", type: "string", description: "Adds a hidden input so the value submits with a form." },
      { name: "haptics", type: "boolean", default: "false", description: "Calls navigator.vibrate(5) on each detent where supported." },
      { name: "className", type: "string", description: "Classes for the root element." },
    ],
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "DialKnob" (rotary synth knob) for Next.js App Router.

- 270° sweep in SVG: major and minor ticks plus an arc; ticks and arc light up to the value in a colour prop with a drop-shadow glow (CSS filter on the <svg>).
- Neumorphic body (radial gradient + light and dark shadows, pressed while dragging) with a rotating cap and glowing notch. Value and unit sit in the centre and do not rotate. Min and max labels at the sweep ends.
- Input: vertical drag on the body (Shift = finer), drag on the outer ring turns to that angle, both with pointer capture and rAF-batched updates. Wheel via a non-passive listener with preventDefault (a mouse notch = 1 detent, trackpad deltas add up). Double-click resets. Keys: arrows ±1 detent, PageUp/PageDown ±10, Home/End.
- Detents: snap to step; each new detent gives a springy rotate and a small scale pulse, plus navigator.vibrate(5) when haptics is on.
- Props: value / defaultValue / onChange, min, max, step, taper ("linear" | "log"), label, unit, formatValue, resetValue, size, color, disabled, name (hidden input), haptics.
- A11y: role="slider" with aria-valuemin/max/now, aria-valuetext with unit, aria-labelledby the visible label, focus-visible ring, disabled state.
- Reduced motion: no pulse or spring. SVG coords rounded so SSR matches.
Demo: mixer panel with Volume %, Cutoff 20-20k Hz (log, "2.4k"), Pan L/C/R, a disabled Reverb, a live filter curve and Reset all. Wraps at 375px.`,
    notes: [
      "Wheel events go through a listener added in an effect with passive: false. React's onWheel prop is passive, so preventDefault there would not stop the page from scrolling.",
      "The glow is a CSS drop-shadow on a separate lit <svg>, not an SVG filter on each tick. Filters on SVG child elements are unreliable in WebKit, and only the lit layer should glow.",
      "Tick and arc coordinates are rounded to 3 decimals. Math.cos is not guaranteed to give the same last digits in every engine, which could cause hydration mismatches in Firefox or WebKit.",
      "Keyboard and wheel steps move in position space, so a log taper gets even steps across 20 Hz to 20 kHz. If a step rounds back to the same value, it moves one step instead.",
      "A keyboard audit after the build found no visible focus ring on the knobs. In Tailwind v4, outline-none sets the outline style variable to none, so focus-visible:outline-2 only changed the width. Adding focus-visible:outline-solid fixed it.",
    ],
  },
];
