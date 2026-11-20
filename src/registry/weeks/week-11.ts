import CheckoutFormDemo from "@/components/demos/checkout-form-demo";
import FlipTeamCardDemo from "@/components/demos/flip-team-card-demo";
import RevenueAreaChartDemo from "@/components/demos/revenue-area-chart-demo";
import type { RegistryEntry } from "../types";

export const week11: RegistryEntry[] = [
  {
    slug: "checkout-form",
    name: "Multi-step Checkout",
    kind: "form",
    week: 11,
    added: "2026-11-21",
    summary:
      "A three-step checkout: shipping, payment and review. A 3D card preview fills in as you type, detects the brand and flips for the CVC. Each step is validated, a promo code animates the total, and placing the order ends on a success screen with confetti.",
    source: "src/components/ui/checkout-form.tsx",
    Demo: CheckoutFormDemo,
    states: ["stepper progress", "step slide", "click back to step", "field errors", "focus first error", "Luhn check", "brand detect", "card flip on CVC", "promo applied", "promo invalid", "placing order", "declined", "success confetti", "summary accordion", "empty cart", "reduced motion"],
    usage: `import { CheckoutForm, type CheckoutItem } from "@/components/ui/checkout-form";

const items: CheckoutItem[] = [
  { id: "lamp", name: "Halo desk lamp", variant: "Warm white", price: 89, quantity: 1 },
  { id: "mug", name: "Stoneware mug", price: 18, quantity: 2 },
];

export function Checkout() {
  return (
    <CheckoutForm
      items={items}
      currency="USD"
      taxRate={0.08}
      promoCodes={[{ code: "LOFI10", percentOff: 10 }]}
      onSubmit={async (order) => {
        const res = await fetch("/api/orders", { method: "POST", body: JSON.stringify(toTokenizedOrder(order)) });
        if (!res.ok) throw new Error("The payment was declined.");
        return { orderId: (await res.json()).id };
      }}
    />
  );
}`,
    props: [
      { name: "items", type: "CheckoutItem[]", description: "{ id, name, variant?, price, quantity, swatch? }. swatch is a CSS colour or gradient for the thumbnail." },
      { name: "currency", type: "string", default: '"USD"', description: "ISO 4217 code used to format money." },
      { name: "locale", type: "string", default: '"en-US"', description: "Locale used to format money." },
      { name: "shippingOptions", type: "ShippingOption[]", default: "Standard (free), Express", description: "{ id, label, description?, price }. Shown as radio cards; the first is selected." },
      { name: "promoCodes", type: "PromoCode[]", default: "[]", description: "{ code, percentOff?, amountOff? }. Codes match case-insensitively." },
      { name: "taxRate", type: "number", default: "0", description: "Tax as a fraction of the discounted subtotal. 0 hides the tax row." },
      { name: "countries", type: "string[]", default: "5 countries", description: "Options for the country select." },
      { name: "onSubmit", type: "(data: CheckoutSubmitData) => Promise<void | { orderId?: string }>", description: "Gets contact, shipping, raw card details, promo and totals. Resolve to show success, reject with an Error to show its message." },
      { name: "labels", type: "Partial<CheckoutLabels>", description: "Every visible string, including step names, buttons, error messages and paymentHint." },
      { name: "today", type: "Date | string", default: "now, read on Continue", description: "Date used to reject expired cards. Never read during render." },
      { name: "headingLevel", type: "2 | 3 | 4", default: "2", description: "Level of the step, summary and success headings." },
      { name: "className", type: "string", description: "Extra classes on the root." },
      { name: "ref", type: "Ref<HTMLDivElement>", description: "Forwarded to the root element." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 CheckoutForm, no dependencies: 3-step checkout, live 3D card, Luhn check, promo, confetti. Typed props, responsive, light/dark, ARIA errors, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called CheckoutForm with no dependencies: a three-step checkout (shipping, payment, review). An animated stepper fills a progress line and draws checks, and steps slide in while the height animates. The payment step has a 3D card preview that groups the number, detects Visa, Mastercard or Amex and changes colour, and flips when the CVC is focused. Per-step validation with a Luhn check and an expiry check that never reads the clock in render. Order summary with a promo code that animates the total. Typed props (items, currency, shippingOptions, promoCodes, onSubmit, labels), responsive with a summary accordion, light and dark mode, accessible (linked errors, focus first error, live region), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "CheckoutForm" (3-step checkout) for Next.js App Router.

- Props: items { id, name, variant?, price, quantity, swatch? }, currency, locale, shippingOptions, promoCodes { code, percentOff? | amountOff? }, taxRate, countries, onSubmit(data) => Promise<void | { orderId }>, labels, today, headingLevel, className, ref.
- Shipping, Payment, Review. Stepper line scales in, done steps draw a check, reached steps are clickable (forward jumps validate). Steps slide in with WAAPI while the height animates.
- Payment: aria-hidden 3D card. Number groups 4-4-4-4 (Amex 4-6-5) with the caret kept in place, brand from the prefix cross-fades the skin, name and expiry fill in, card flips while CVC has focus.
- Per-step checks: required, email, Luhn + length, MM/YY not past (date read in the handler or from today), CVC length. aria-invalid, aria-describedby errors, focus first error.
- Summary: items, promo field with a live message, discount row slides in, totals count to the new value. Container query: sidebar at @3xl, accordion below (visibility hides closed content).
- Submit: spinner + aria-busy, role=alert on reject, success screen with a drawn check and seeded WAAPI confetti, focus on the heading.
- Live region for step changes. Reduced motion: no slide, flip, count-up or confetti.
Demo: a clearly fake checkout, test card 4242 4242 4242 4242, a decline card, promo LOFI10.`,
    notes: [
      "The expiry check needs today's date, and reading the clock during render can differ between server and client. The date is read only when the shopper presses Continue, or taken from the today prop.",
      "Reformatting the card number moved the caret to the end when editing in the middle. The change handler counts the digits before the caret, reformats, and a layout effect puts the caret back after the same digit.",
      "Gradients cannot transition, so each card brand has its own skin layer and the layers cross-fade with opacity. The glow under the card is a plain colour, so it transitions directly.",
      "The summary is always open on wide containers and an accordion on narrow ones. inert cannot follow a container query, so the closed panel uses visibility: hidden, which also takes its fields out of the tab order, and @3xl forces it visible.",
    ],
  },
  {
    slug: "flip-team-card",
    name: "Flip Team Card",
    kind: "card",
    week: 11,
    added: "2026-11-21",
    summary:
      "A team member card that flips in 3D with a springy overshoot. The front has a gradient portrait with initials, the name, role and location. The back has a bio, skills, social links and a Contact button. It tilts toward the pointer with a glossy highlight, and a featured variant gets a glowing animated ring.",
    source: "src/components/ui/flip-team-card.tsx",
    Demo: FlipTeamCardDemo,
    states: ["front", "back", "flip on click", "flip on hover", "Enter / Space", "Escape to front", "pointer tilt", "gloss", "featured ring", "badge", "hover", "focus-visible", "disabled contact", "reduced motion"],
    usage: `import { FlipTeamCard } from "@/components/ui/flip-team-card";

export function Team() {
  return (
    <FlipTeamCard
      name="Maya Chen"
      role="Design Lead"
      location="Lisbon, PT"
      colors={["#6d28d9", "#be185d"]}
      variant="featured"
      badge="Team lead"
      bio="Leads the design system and the onboarding flow."
      skills={["Design systems", "Figma", "Prototyping"]}
      socials={[{ label: "LinkedIn", href: "https://linkedin.com/in/maya", icon: "linkedin" }]}
      contactHref="mailto:maya@example.com"
    />
  );
}`,
    props: [
      { name: "name", type: "string", description: "Shown on both faces and used in the toggle's label." },
      { name: "role", type: "string", description: "Job title under the name." },
      { name: "location", type: "string", description: "Shown in a chip with a pin icon." },
      { name: "initials", type: "string", default: "from name", description: "Text in the portrait circle." },
      { name: "colors", type: "[string, string]", default: '["#6d28d9", "#be185d"]', description: "Portrait gradient. Use deep tones: the initials are white." },
      { name: "badge", type: "string", description: "Small label on the portrait, e.g. \"Team lead\"." },
      { name: "bio", type: "string", description: "Paragraph on the back." },
      { name: "skills", type: "string[]", default: "[]", description: "Chips on the back." },
      { name: "socials", type: "TeamSocial[]", default: "[]", description: "{ label, href, icon? }. icon is x, linkedin, github, dribbble, website, email or a node." },
      { name: "contactLabel", type: "string", default: '"Contact"', description: "Text of the Contact button. The name is added for screen readers." },
      { name: "contactHref", type: "string", description: "Makes Contact a link, e.g. mailto:." },
      { name: "onContact", type: "() => void", description: "Contact handler when there is no contactHref. Without either, the button is disabled." },
      { name: "flipOn", type: '"click" | "hover"', default: '"click"', description: "Hover also flips while a mouse is over the card. Taps and the toggle always work." },
      { name: "variant", type: '"default" | "featured"', default: '"default"', description: "Featured adds a glowing rotating ring." },
      { name: "flipped", type: "boolean", description: "Controlled flip state." },
      { name: "defaultFlipped", type: "boolean", default: "false", description: "Starting state when uncontrolled." },
      { name: "onFlippedChange", type: "(flipped: boolean) => void", description: "Called when the card flips." },
      { name: "maxTilt", type: "number", default: "8", description: "Largest pointer tilt in degrees. 0 turns it off." },
      { name: "headingLevel", type: "2 | 3 | 4", default: "3", description: "Level of the name heading." },
      { name: "className", type: "string", description: "Extra classes on the article." },
      { name: "ref", type: "Ref<HTMLElement>", description: "Forwarded to the article element." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 FlipTeamCard, no dependencies: 3D flip team card with bio, skills, links, tilt and gloss. Typed props, responsive, light/dark, inert back, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called FlipTeamCard with no dependencies: a team member card that flips in 3D with a springy overshoot. Front: gradient portrait with initials, name, role and a location chip. Back: bio, skill chips, social links with icons and names, and a Contact button. Flips on click, tap or Enter, or on hover with flipOn=\"hover\". Tilts toward the pointer with a glossy highlight, and a featured variant gets a glowing rotating ring. Typed props (name, role, location, colors, bio, skills, socials, contactHref, onContact, flipOn, variant, flipped, className), responsive, light and dark mode, accessible (aria-pressed toggle, the hidden face is inert and aria-hidden, Escape flips back), reduced motion cross-fades instead.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "FlipTeamCard" (3D flipping team member card) for Next.js App Router.

- Props: name, role, location, initials, colors [c1, c2], badge, bio, skills, socials { label, href, icon? }, contactLabel, contactHref | onContact, flipOn ("click" | "hover"), variant ("default" | "featured"), flipped / defaultFlipped / onFlippedChange, maxTilt, headingLevel, className, ref.
- Front: gradient portrait with rings and dots, initials in a circle (no image URLs), optional badge, name heading, role, location chip. Back: mini header, bio, skill chips, social links with icon + name, full-width Contact.
- Faces share one grid cell (height = taller face), backface-visibility hidden, rotateY(180deg) with an overshoot cubic-bezier.
- One toggle button outside the faces: aria-pressed, aria-label "Show details for {name}". A click on the card flips too (links and buttons excluded). flipOn="hover" flips on mouse enter and leave and ignores mouse clicks. Escape flips back and refocuses the toggle.
- The hidden face is inert and aria-hidden.
- Pointer tilt and a soft-light gloss via CSS variables in rAF (mouse and pen only). Featured: blurred glow and a rotating conic ring.
- Reduced motion: no tilt or ring spin, and the faces cross-fade instead of flipping.
Demo: a 6-person team grid (1 column on phones), one featured card, a click / hover switch and a Contact readout.`,
    notes: [
      "The faces share one grid cell instead of being absolutely positioned, so the card takes the height of the taller face and the back never clips its links.",
      "The toggle button sits outside both faces. On a face it would become inert whenever that face hides, and keyboard focus would be lost on every flip.",
      "The tilt layer is flat (no preserve-3d), so the gloss and the toggle always paint on top of the turning faces instead of cutting through them mid-flip.",
      "In hover mode a mouse click would undo the hover flip, so mouse clicks are ignored there. Taps still flip, because touch has no hover.",
    ],
  },
  {
    slug: "revenue-area-chart",
    name: "Revenue Area Chart",
    kind: "chart",
    week: 11,
    added: "2026-11-21",
    summary:
      "An SVG area chart with a smooth monotone curve and a fading gradient fill. The line draws in on scroll, a crosshair snaps to the nearest day with a tooltip, and range tabs morph the curve between 7 days and a year. KPIs and an optional dashed comparison line sit on top.",
    source: "src/components/ui/revenue-area-chart.tsx",
    Demo: RevenueAreaChartDemo,
    states: ["draw-in", "range morph", "hover crosshair", "touch scrub", "arrow keys", "tooltip", "glow dot", "comparison line", "KPI up / down", "count-up total", "axis thinning", "loading", "empty range", "reduced motion"],
    usage: `import { RevenueAreaChart, type ChartSeries } from "@/components/ui/revenue-area-chart";

// Daily points with UTC dates. Keep the array stable (module scope or useMemo).
const series: ChartSeries[] = [
  { id: "rev", label: "This year", data: revenue, color: "var(--accent)" },
  { id: "ly", label: "Last year", data: lastYear, color: "#64748b", dashed: true },
];

export function RevenueCard() {
  return <RevenueAreaChart title="Revenue" series={series} height={300} onRangeChange={(id) => track("range", id)} />;
}`,
    props: [
      { name: "series", type: "ChartSeries[]", description: "{ id, label, data: { date, value }[], color, dashed? }. The first is the main series (area and KPIs); the others share its dates and draw as lines." },
      { name: "ranges", type: "ChartRange[]", default: "7D, 30D, 90D, 1Y", description: "{ id, label, name, days }. Each shows the last N days of data." },
      { name: "defaultRange", type: "string", default: "second range", description: "Id of the range shown first." },
      { name: "formatValue", type: "(value: number) => string", default: "compact USD", description: "Formats the axis, total and tooltip, e.g. $12.4K." },
      { name: "formatDate", type: '(ms: number, mode: "axis" | "tooltip", days: number) => string', default: "UTC month and day", description: "Formats dates. Long ranges get month labels on the axis." },
      { name: "height", type: "number", default: "280", description: "Plot height in px. The width follows the container." },
      { name: "title", type: "string", default: '"Revenue"', description: "Heading and the start of the screen reader summary." },
      { name: "loading", type: "boolean", default: "false", description: "Shows a shimmer skeleton and sets aria-busy." },
      { name: "onRangeChange", type: "(rangeId: string) => void", description: "Called when a range tab is picked." },
      { name: "headingLevel", type: "2 | 3 | 4", default: "2", description: "Level of the title heading." },
      { name: "className", type: "string", description: "Extra classes on the section." },
      { name: "ref", type: "Ref<HTMLElement>", description: "Forwarded to the section element." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 RevenueAreaChart, no dependencies: SVG area chart, snap tooltip, range morph, KPIs. Typed props, responsive, light/dark, keyboard + table, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called RevenueAreaChart with no dependencies: an SVG area chart with a monotone cubic curve that never overshoots and a gradient fill that fades down. The line draws in on scroll and the area fades up. A crosshair snaps to the nearest point with a floating tooltip (date, value, change) and a glow dot. Range tabs (7D, 30D, 90D, 1Y) morph the curve in requestAnimationFrame. Header total that counts up and a green or red % badge, optional dashed comparison line, nice y ticks ($12.4K) and thinning date ticks. Typed props (series, ranges, formatValue, formatDate, height, title, onRangeChange), ResizeObserver sizing, light and dark mode, accessible (role=img summary, arrow keys with a live region, hidden data table), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "RevenueAreaChart" (SVG area chart) for Next.js App Router.

- Props: series { id, label, data: { date, value }[], color, dashed? } (first = main), ranges { id, label, name, days }, defaultRange, formatValue, formatDate(ms, mode, days), height, title, loading, onRangeChange, headingLevel, className, ref.
- Monotone cubic (Fritsch-Butland) curve sampled to a polyline, gradient area fading down. IntersectionObserver: line draws in (pathLength + dashoffset), area fades up.
- Range tabs (aria-pressed, sliding pill) slice the last N days. Morph: resample old samples to the new count and tween samples and y max in rAF, writing path d directly.
- Nice y ticks (1, 2, 2.5, 5) with compact labels; shared ticks glide. Date ticks thin with width. ResizeObserver sets the SVG width.
- Crosshair snaps to the nearest point (binary search), tooltip with date, value, Δ vs previous and comparison value, glowing pulsing dot. Touch scrubs (touch-action pan-y).
- Header: count-up total and a green or red % badge vs the previous period. Legend for 2+ series, dashed comparison line.
- A11y: focusable role="img" with a summary, arrow / Home / End / PageUp / PageDown move the crosshair, live region reads the point, sr-only table.
- UTC dates, no clock in render. Loading skeleton, empty state. Reduced motion: no draw-in, morph or pulse.
Demo: seeded daily revenue vs last year, an orders chart and a loading one.`,
    notes: [
      "A morph needs arrays of the same length, but the ranges hold 7 to 365 points. Each series is sampled from its own monotone curve at a fixed count, and the old samples are resampled to the new count before the tween. The polyline is the curve itself, so nothing jumps when the tween ends.",
      "During a morph the path d attributes are written directly in requestAnimationFrame. React renders the final path, and a layout effect paints the starting frame before the browser paints, so the end state never flashes.",
      "The React Compiler lint refused to keep the memoised samples because the axis maximum came out of an object it treated as mutable. Giving the nice-ticks calculation its own useMemo fixed it.",
      "Colours go through style instead of SVG presentation attributes, because var() is not reliable in attributes. That lets a series use var(--accent) and follow light and dark mode.",
    ],
  },
];
