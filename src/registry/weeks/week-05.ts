import PlanComparisonTableDemo from "@/components/demos/plan-comparison-table-demo";
import SlideToConfirmDemo from "@/components/demos/slide-to-confirm-demo";
import type { RegistryEntry } from "../types";

export const week05: RegistryEntry[] = [
  {
    slug: "plan-comparison-table",
    name: "Plan Comparison Table",
    kind: "table",
    week: 5,
    added: "2026-11-20",
    summary:
      "A pricing and feature comparison built on a real <table>. It has a Monthly/Yearly switch with rolling digits, collapsible feature groups, a sticky header and first column, and a border beam around the most popular plan.",
    source: "src/components/ui/plan-comparison-table.tsx",
    Demo: PlanComparisonTableDemo,
    states: [
      "monthly / yearly",
      "digit roll",
      "row hover",
      "column hover",
      "collapsed group",
      "tooltip",
      "sticky header",
      "sticky first column",
      "scroll fade hint",
      "one plan at a time",
    ],
    usage: `import { PlanComparisonTable, type ComparisonGroup, type ComparisonPlan } from "@/components/ui/plan-comparison-table";

const plans: ComparisonPlan[] = [
  { id: "free", name: "Free", description: "For side projects.", priceMonthly: 0, priceYearly: 0, cta: "Start free" },
  { id: "pro", name: "Pro", description: "For growing teams.", priceMonthly: 49, priceYearly: 39, cta: "Choose Pro", highlighted: true, badge: "Most popular" },
  { id: "enterprise", name: "Enterprise", description: "For large companies.", priceMonthly: "Custom", priceYearly: "Custom", cta: "Contact sales" },
];

const groups: ComparisonGroup[] = [
  {
    name: "Usage",
    features: [
      { name: "Team members", values: { free: { limit: 1 }, pro: { limit: 25 }, enterprise: { limit: "unlimited" } } },
      { name: "SSO / SAML", tooltip: "Okta, Entra ID or Google Workspace.", values: { free: false, pro: false, enterprise: true } },
      { name: "Support", values: { free: "Community", pro: "Priority email", enterprise: "Dedicated manager" } },
    ],
  },
];

export function Pricing() {
  return (
    <PlanComparisonTable
      plans={plans}
      groups={groups}
      defaultBilling="yearly"
      caption="Compare plans"
      onSelectPlan={(planId, billing) => router.push(\`/checkout?plan=\${planId}&billing=\${billing}\`)}
    />
  );
}`,
    props: [
      { name: "plans", type: "ComparisonPlan[]", description: "{ id, name, description, priceMonthly, priceYearly, currency?, cta, highlighted?, badge?, priceNote? }. A string price such as \"Custom\" is shown as-is. priceYearly is the per-month price on yearly billing." },
      { name: "groups", type: "ComparisonGroup[]", description: "{ name, features: { name, tooltip?, values: Record<planId, boolean | string | { limit, unit? }> }[] }." },
      { name: "billing", type: '"monthly" | "yearly"', description: "Controlled billing cycle." },
      { name: "defaultBilling", type: '"monthly" | "yearly"', default: '"monthly"', description: "Starting cycle when uncontrolled." },
      { name: "onBillingChange", type: "(billing) => void", description: "Called when the switch changes." },
      { name: "onSelectPlan", type: "(planId: string, billing) => void", description: "Called when a plan's CTA is pressed." },
      { name: "caption", type: "string", default: '"Compare plans and features"', description: "Table caption; also names the scroll region." },
      { name: "yearlyBadge", type: "string", default: '"Save 20%"', description: "Badge on the Yearly option. Empty string hides it." },
      { name: "maxHeight", type: "string", default: '"40rem"', description: "Max height of the scroll area. The header row sticks inside it." },
      { name: "mobilePicker", type: "boolean", default: "true", description: "Below a 42rem container width, show a picker that can show one plan at a time." },
      { name: "locale", type: "string", default: '"en-US"', description: "Locale for prices and limits." },
      { name: "labels", type: "Partial<PlanComparisonLabels>", description: "UI strings (Monthly, Included, per month, …) for translation." },
      { name: "className", type: "string", description: "Extra classes on the root." },
      { name: "ref", type: "Ref<HTMLDivElement>", description: "Forwarded to the root element." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 PlanComparisonTable, no dependencies: Monthly/Yearly switch with rolling prices, a real table with collapsible feature groups, sticky header and column, a highlighted plan with a border beam, and a one-plan picker on phones. Typed props, responsive, light/dark, accessible table, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called PlanComparisonTable with no dependencies: a pricing and feature comparison table. Monthly/Yearly switch with a sliding pill and \"Save 20%\" badge; prices roll digit by digit. Real table with caption, scoped headers, collapsible feature groups, check/dash cells, text and limit meters. Sticky header and first column, highlighted plan with a rotating border beam and glow, row and column hover. On phones a picker shows one plan at a time. Typed props (plans, groups, billing, defaultBilling, onBillingChange, onSelectPlan, caption, yearlyBadge, maxHeight, mobilePicker, locale, labels), responsive, light and dark mode, accessible (labelled scroll region, aria-expanded groups, \"Included\" / \"Not included\" text), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "PlanComparisonTable" (pricing + feature comparison) for Next.js App Router.

- Props: plans ({ id, name, description, priceMonthly, priceYearly, currency, cta, highlighted?, badge? }; string price = "Custom"), groups ({ name, features: { name, tooltip?, values: Record<planId, boolean | string | { limit, unit? }> }[] }), billing / defaultBilling, onBillingChange, onSelectPlan(planId, billing), caption, yearlyBadge, maxHeight, mobilePicker, locale, labels.
- Monthly/Yearly radiogroup with a sliding pill and "Save 20%" badge. Prices roll digit by digit like an odometer; sr-only text has the real price.
- Real <table>: caption, th scope col/row, one tbody per group with a rowgroup header button (aria-expanded). Cells: check/dash icon with sr-only "Included"/"Not included", text, or a limit with a log-scale meter.
- Sticky header row and sticky first column inside a role="region" scroll box (aria-label, tabIndex 0) with a right-edge fade hint.
- Highlighted plan: rotating conic border beam (@property angle), glow and tinted column. Row hover and plan-header hover highlight. CTA per plan.
- Container queries: when narrow, a select can show one plan column at a time.
- Tooltips open on hover/focus, close on Esc. Reduced motion: no roll, no beam spin.
Demo: SaaS with Free, Starter, Pro (highlighted) and Enterprise "Custom" across Usage, Features and Security groups, plus a selection readout.`,
    notes: [
      "overflow-x on the wrapper turns it into the scroll container in both directions, so a header cannot stick to the page from inside it. The region gets its own max-height and the header sticks inside that box.",
      "The table uses border-separate with borders on each cell. With border-collapse the borders of sticky cells stay behind while the cells scroll.",
      "The beam overlay must sit above the sticky header or the header hides its top half, but then it would paint over the sticky first column when scrolled sideways. It is clipped with clip-path from the first column's right edge on each scroll frame.",
      "The preview frame changes its own width, not the viewport, so the narrow layout and the plan picker use container queries instead of media queries.",      "Visual QA showed the Enterprise column pushed out of view at desktop width. The wrapper was w-max, so the table grew to fit every description on one line. w-fit lets the text wrap and only scrolls when the columns truly do not fit.",
      "On phones the picker now opens on the highlighted plan instead of all four squeezed columns. Wide layouts ignore the picker, so nothing changes there.",
    ],
  },
  {
    slug: "slide-to-confirm",
    name: "Slide to Confirm",
    kind: "button",
    week: 5,
    added: "2026-11-20",
    summary:
      "An iOS-style slide-to-confirm control for actions that should not happen by accident. Drag the thumb to the end, or use the keyboard, and it shows loading, success with a particle burst, or an error you can retry.",
    source: "src/components/ui/slide-to-confirm.tsx",
    Demo: SlideToConfirmDemo,
    states: ["shimmer", "dragging", "armed", "spring back", "keyboard", "loading", "success", "error", "auto reset", "disabled", "danger", "reduced motion"],
    usage: `import { SlideToConfirm } from "@/components/ui/slide-to-confirm";

export function PayButton({ amount }: { amount: string }) {
  return (
    <SlideToConfirm
      label={\`Slide to pay \${amount}\`}
      confirmLabel="Processing payment…"
      successLabel={\`Paid \${amount}\`}
      errorLabel="Payment failed. Slide to retry."
      onConfirm={() => fetch("/api/pay", { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error("Payment failed");
      })}
      resetAfter={3000}
    />
  );
}`,
    props: [
      { name: "label", type: "string", default: '"Slide to confirm"', description: "Track text and the slider's accessible name." },
      { name: "confirmLabel", type: "string", default: '"Confirming…"', description: "Shown and announced while onConfirm is pending." },
      { name: "successLabel", type: "string", default: '"Confirmed"', description: "Shown and announced when onConfirm resolves." },
      { name: "errorLabel", type: "string", default: '"Something went wrong. Slide to try again."', description: "Shown and announced when onConfirm rejects." },
      { name: "onConfirm", type: "() => void | Promise<unknown>", description: "Runs on confirm. A Promise keeps the loading state until it settles." },
      { name: "variant", type: '"default" | "danger" | "success"', default: '"default"', description: "Colour of the thumb, trail and success fill." },
      { name: "threshold", type: "number", default: "0.9", description: "How far (0–1) the thumb must travel before release confirms." },
      { name: "resetAfter", type: "number", description: "Milliseconds after success before it resets. Leave out to stay confirmed." },
      { name: "disabled", type: "boolean", default: "false", description: "Locks the control and shows a lock icon." },
      { name: "icon", type: "ReactNode", description: "Icon in the thumb. Defaults to a double chevron." },
      { name: "width", type: "number | string", default: "320", description: "Width in px or any CSS length. Never wider than its parent." },
      { name: "className", type: "string", description: "Extra classes on the root." },
      { name: "ref", type: "Ref<HTMLDivElement>", description: "Forwarded to the root element." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 SlideToConfirm, no dependencies: drag a thumb along a shimmering pill to confirm; released early it springs back, then it shows loading, success with a particle burst or error with a shake. Default, danger and success variants. Typed props, responsive, light/dark, slider role with keys, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called SlideToConfirm with no dependencies: an iOS-style slide-to-confirm button. Drag the thumb along a pill track with a shimmering label; the track fills behind it, the thumb rolls and turns into a check past the threshold, otherwise it springs back. onConfirm can return a Promise: loading spinner, then success (drawn check and particle burst) or error (shake and retry), with optional auto reset. Variants: default, danger and success. Typed props (label, confirmLabel, successLabel, errorLabel, onConfirm, variant, threshold, resetAfter, disabled, icon, width, className), responsive, light and dark mode, accessible (slider role with arrow keys, Enter or Space confirms, results announced), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "SlideToConfirm" (iOS slide to unlock) for Next.js App Router.

- Pill track with a draggable thumb (pointer events + pointer capture). Label has a shimmer: a masked copy in the foreground colour sweeps over solid muted text.
- While dragging, the trail fills behind the thumb, the label fades, the thumb rolls like a wheel and turns into a check past the threshold. Update CSS vars in rAF, not React state.
- Release past threshold (default 0.9) confirms; otherwise a rAF spring brings it back, bouncing off the start of the track.
- onConfirm may return a Promise: loading (spinner in thumb, trail pulses), then success (solid track, drawn check, successLabel, particle burst via WAAPI) and optional resetAfter. Rejection: error label, shake, spring back, retry.
- Props: label, confirmLabel, successLabel, errorLabel, onConfirm, variant (default | danger | success), threshold, resetAfter, disabled (lock icon), icon, width, className, ref.
- A11y: the track is role="slider" with aria-valuenow 0–100 and aria-valuetext. Arrows move 10%, Home/End jump, reaching the end or Enter/Space confirms. Blur springs back. sr-only role="status" announces results.
- Reduced motion: no shimmer, spring, roll, shake or particles. Never wider than its parent.
Demo: "Slide to pay $49.00", danger "Slide to delete account" that fails once then works, a success-variant deploy, a disabled one and an event log.`,
    notes: [
      "The whole track is the role=\"slider\", not the thumb. The thumb fades out on success, and focus has to stay on a visible element through loading, success and error.",
      "Dragging writes the position to CSS custom properties and to aria-valuenow / aria-valuetext directly inside requestAnimationFrame, so a drag never re-renders React.",
      "An overshoot easing would push the thumb past the start of the track on spring back. A small rAF spring treats both ends of the track as walls, so the thumb bounces off the start instead.",
      "The shimmer is a masked copy of the label in the foreground colour, on top of solid muted text. Gradient text with a transparent fill would make axe measure the contrast as 1:1.",
    ],
  },
];
