import type { ComponentType } from "react";
import MagneticButtonDemo from "@/components/demos/magnetic-button-demo";
import TestimonialMarqueeDemo from "@/components/demos/testimonial-marquee-demo";
import CommandPaletteDemo from "@/components/demos/command-palette-demo";
import OtpInputDemo from "@/components/demos/otp-input-demo";

/** Plain type label used for the challenge submission (keeps components distinct). */
export type ComponentKind =
  | "button"
  | "form"
  | "card"
  | "modal"
  | "navbar"
  | "table"
  | "loader"
  | "section"
  | "chart"
  | "input";

export interface PropDoc {
  name: string;
  type: string;
  default?: string;
  description: string;
}

export interface RegistryEntry {
  slug: string;
  name: string;
  kind: ComponentKind;
  /** Challenge week the component shipped in. */
  week: number;
  /** Date it was added, YYYY-MM-DD. */
  added: string;
  summary: string;
  /** Path of the component source, relative to the project root. */
  source: string;
  /** Interactive demo rendered in the preview pane. */
  Demo: ComponentType;
  usage: string;
  props: PropDoc[];
  /** States the component handles, shown as chips. */
  states: string[];
  /** The final prompt used to build it (required by the challenge). */
  prompt: string;
  /** What went wrong while building it and how it was fixed. */
  notes: string[];
}

export const registry: RegistryEntry[] = [
  {
    slug: "magnetic-button",
    name: "Magnetic Button",
    kind: "button",
    week: 1,
    added: "2026-10-02",
    summary:
      "A call-to-action button that drifts toward the pointer and lights up under it. Three variants, three sizes, icon slots, loading and disabled states.",
    source: "src/components/ui/magnetic-button.tsx",
    Demo: MagneticButtonDemo,
    states: ["hover", "focus-visible", "active", "disabled", "loading", "reduced motion", "touch"],
    usage: `import { MagneticButton } from "@/components/ui/magnetic-button";

export function Hero() {
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex gap-3">
      <MagneticButton size="lg" rightIcon={<ArrowRight />}>
        Get started
      </MagneticButton>
      <MagneticButton
        variant="outline"
        loading={saving}
        loadingLabel="Saving changes"
        onClick={() => setSaving(true)}
      >
        Save changes
      </MagneticButton>
    </div>
  );
}`,
    props: [
      { name: "variant", type: '"solid" | "outline" | "ghost"', default: '"solid"', description: "Visual style." },
      { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Height, padding and font size." },
      { name: "strength", type: "number", default: "14", description: "Max drift toward the pointer in px. 0 turns the magnet off." },
      { name: "loading", type: "boolean", default: "false", description: "Shows a spinner, sets aria-busy and ignores clicks." },
      { name: "loadingLabel", type: "string", default: '"Loading"', description: "Screen-reader text while loading." },
      { name: "leftIcon / rightIcon", type: "ReactNode", description: "Optional icons around the label." },
      { name: "fullWidth", type: "boolean", default: "false", description: "Stretch to the parent's width." },
      { name: "...rest", type: "ButtonHTMLAttributes", description: "Any native button prop (onClick, type, disabled, aria-*)." },
    ],
    prompt: `Build a reusable React + TypeScript + Tailwind CSS v4 "MagneticButton" component for a Next.js App Router project.

Requirements:
- Client component that forwards its ref and spreads all native <button> props.
- Props (typed interface): variant ("solid" | "outline" | "ghost"), size ("sm" | "md" | "lg"), strength (px the button drifts toward the pointer, 0 = off), loading, loadingLabel, leftIcon, rightIcon, fullWidth.
- Magnetic effect: on pointer move, translate the button toward the cursor (x by strength, y by 60% of it) using CSS custom properties updated inside requestAnimationFrame; reset on pointer leave. A soft radial "glow" follows the cursor inside the button.
- Skip the magnet and glow for touch pointers, when disabled or loading, and when prefers-reduced-motion is set (listen for changes).
- States: hover, focus-visible ring with offset, active press scale, disabled (opacity + not-allowed cursor), loading (spinner centred over a hidden label, aria-busy, clicks ignored, sr-only loading text).
- Use theme tokens (bg-accent, text-accent-foreground, border-border, bg-surface) so it works in light and dark mode.
- No external dependencies. Keep it accessible and fully responsive; add a fullWidth option for mobile layouts.
Also write a demo showing all variants, sizes, a working async loading example, a disabled button, strength={0}, and a full-width button.`,
    notes: [
      "Touch screens fire pointer moves while you scroll, which made the button jump on phones. The magnet now ignores pointerType \"touch\".",
      "Pointer moves write CSS variables inside requestAnimationFrame instead of React state, so the button never re-renders while it follows the cursor.",
      "The code samples on this page first used Shiki's default GitHub theme. The axe scan failed it at 4.09:1 contrast in Chromium and WebKit, so the site switched to the high-contrast GitHub themes.",
    ],
  },
  {
    slug: "testimonial-marquee",
    name: "Testimonial Marquee",
    kind: "section",
    week: 1,
    added: "2026-10-02",
    summary:
      "An endless, two-way scrolling wall of testimonials with ratings and avatars. Pure CSS motion that pauses on hover or focus and turns into a scrollable list for reduced motion.",
    source: "src/components/ui/testimonial-marquee.tsx",
    Demo: TestimonialMarqueeDemo,
    states: ["hover pause", "focus pause", "reduced motion", "1 or 2 rows", "no avatar fallback", "empty list"],
    usage: `import { TestimonialMarquee } from "@/components/ui/testimonial-marquee";

const testimonials = [
  { quote: "Setup took an afternoon.", name: "Priya Nair", role: "Founder, Sprout", rating: 5 },
  { quote: "Our conversion rate went up 18%.", name: "Tom Becker", role: "Growth, Fieldwork", rating: 5 },
  // ...
];

export function SocialProof() {
  return (
    <TestimonialMarquee
      heading="Loved by teams who ship"
      subheading="Real words from real customers."
      testimonials={testimonials}
      rows={2}
      duration={45}
    />
  );
}`,
    props: [
      { name: "testimonials", type: "Testimonial[]", description: "{ quote, name, role?, avatarUrl?, rating? } items. Split evenly across rows." },
      { name: "heading", type: "string", description: "Optional section heading (also labels the region)." },
      { name: "subheading", type: "string", description: "Optional supporting line." },
      { name: "rows", type: "1 | 2", default: "2", description: "Number of rows. Row two scrolls the other way." },
      { name: "duration", type: "number", default: "40", description: "Seconds per loop. Higher is slower." },
      { name: "pauseOnHover", type: "boolean", default: "true", description: "Pause while hovered or focused." },
      { name: "ariaLabel", type: "string", default: '"Customer testimonials"', description: "Region name when no heading is set." },
      { name: "className", type: "string", description: "Extra classes for the section." },
    ],
    prompt: `Build a reusable React + TypeScript + Tailwind CSS v4 "TestimonialMarquee" section component for a Next.js App Router project. It should work as a Server Component (no client JS).

Requirements:
- Props (typed interfaces): testimonials: { quote, name, role?, avatarUrl?, rating? }[], heading?, subheading?, rows (1 | 2, default 2), duration (seconds per loop), pauseOnHover (default true), ariaLabel, className.
- Each testimonial is a <figure> card with an optional 5-star rating (role="img" with an "N out of 5 stars" label), the quote in a <blockquote>, and a figcaption with avatar (image or initials fallback), name and role.
- Infinite horizontal marquee done in pure CSS: render the list twice side by side and animate translateX(0 → -50%) with a keyframe; the duplicate list is aria-hidden. Row two runs in reverse. Speed comes from a CSS variable set from the duration prop.
- Fade the edges with a mask gradient. Pause the animation on hover and on focus-within.
- prefers-reduced-motion: stop the animation, hide the duplicate list, remove the mask and make the row horizontally scrollable instead.
- Use a <section> with aria-labelledby (useId for the heading id) or aria-label when there is no heading. Return null for an empty list.
- Responsive: narrower cards and gaps on mobile. Use theme tokens (bg-surface, border-border, text-muted, accent) for light and dark mode.
Also write a demo with eight realistic testimonials across two rows.`,
    notes: [
      "The first version used a fixed heading id, which would clash if two marquees were on one page. It now uses useId.",
      "The duplicate list needed for the seamless loop is aria-hidden, and hidden completely under reduced motion, so each testimonial is read once.",
      "The usage snippet's comment colour failed contrast in dark mode (3.67:1) in the axe scan; fixed with the high-contrast code theme.",
    ],
  },
  {
    slug: "command-palette",
    name: "Command Palette",
    kind: "modal",
    week: 2,
    added: "2026-10-06",
    summary:
      "A ⌘K / Ctrl+K command menu with ranked search, grouped results, keyboard navigation, match highlighting, shortcuts, disabled and loading states. Built on the native <dialog> element.",
    source: "src/components/ui/command-palette.tsx",
    Demo: CommandPaletteDemo,
    states: ["⌘K / Ctrl+K", "arrow keys", "Enter", "Esc clears then closes", "backdrop click", "disabled item", "loading", "no results"],
    usage: `import { useState } from "react";
import { CommandPalette, type CommandItem } from "@/components/ui/command-palette";

const items: CommandItem[] = [
  { id: "new", group: "Actions", label: "New project", shortcut: ["⌘", "N"], onSelect: () => createProject() },
  { id: "billing", group: "Navigation", label: "Go to billing", keywords: ["invoice", "plan"], onSelect: () => router.push("/billing") },
  { id: "archive", group: "Actions", label: "Archive workspace", disabled: true, onSelect: () => {} },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Search…</button>
      {/* ⌘K / Ctrl+K also toggles it */}
      <CommandPalette open={open} onOpenChange={setOpen} items={items} />
    </>
  );
}`,
    props: [
      { name: "open", type: "boolean", description: "Whether the palette is open (controlled)." },
      { name: "onOpenChange", type: "(open: boolean) => void", description: "Called when it asks to open or close (hotkey, Esc, backdrop, select)." },
      { name: "items", type: "CommandItem[]", description: "{ id, label, group?, description?, keywords?, shortcut?, icon?, disabled?, onSelect }." },
      { name: "placeholder", type: "string", default: '"Type a command or search…"', description: "Search input placeholder." },
      { name: "emptyMessage", type: "string", default: '"No results found."', description: "Shown when nothing matches." },
      { name: "hotkey", type: "string | false", default: '"k"', description: "Letter that toggles it with ⌘/Ctrl. false disables it." },
      { name: "loading", type: "boolean", default: "false", description: "Show skeleton rows and set aria-busy." },
      { name: "label", type: "string", default: '"Command palette"', description: "Accessible name of the dialog." },
      { name: "closeOnSelect", type: "boolean", default: "true", description: "Close after an item runs." },
    ],
    prompt: `Build a reusable React + TypeScript + Tailwind v4 "CommandPalette" (⌘K menu) for Next.js App Router.

- Controlled: open / onOpenChange. Typed items: { id, label, group?, description?, keywords?, shortcut?, icon?, disabled?, onSelect }. Props: placeholder, emptyMessage, hotkey (⌘/Ctrl + letter, default "k", false = off), loading, label, closeOnSelect.
- Use native <dialog> + showModal() for focus trap, Escape, top layer and inert page. Close on backdrop click, restore focus to the opener, lock page scroll.
- Search ranking: label starts with query > word starts with it > contains > keyword > description > loose in-order match ("nwp" → "New project"). Keep group order, sort inside groups, highlight matches with <mark>.
- A11y: input is a combobox (aria-expanded, aria-controls, aria-autocomplete="list", aria-activedescendant) for a listbox of options in role="group" sections with headings. Live region announces the result count. Disabled items get aria-disabled and are skipped.
- Keys: ArrowUp/Down wrap, Home/End, Enter runs, first Esc clears the query, second closes. Keep active option in view; mousedown must not steal focus.
- States: loading skeleton (aria-busy), empty message, disabled, <kbd> shortcuts, footer hints, @starting-style entry animation that respects reduced motion.
- Responsive (max-w-xl, list capped at 60vh), light/dark tokens, no dependencies.
Demo: Actions / Navigation / Theme / Help groups with icons, shortcuts, one disabled item, a search-style trigger and a "Ran: …" readout.`,
    notes: [
      "Group headings like \"Go to\" and item ids with spaces produced invalid element ids, which breaks aria-activedescendant and aria-labelledby. Ids are now sanitised before use.",
      "Escape is owned by the native dialog's cancel event. The search box intercepts the first press so it clears the query, and only the second press closes; checked in Chromium, Firefox and WebKit.",
      "Option rows cancel mousedown so clicking a result never takes focus away from the search box, so arrow keys keep working after mouse use.",
      "The hotkey listens for both ⌘ and Ctrl so it works on macOS and Windows; the tests press Meta+K in WebKit and Ctrl+K elsewhere.",
    ],
  },
  {
    slug: "otp-input",
    name: "OTP Code Input",
    kind: "input",
    week: 2,
    added: "2026-10-06",
    summary:
      "A one-time-code input with a box per character. Typing, paste, SMS autofill, Backspace and arrow keys all work; it has numeric or alphanumeric modes, masking, grouping, loading, error and success states, and submits with forms.",
    source: "src/components/ui/otp-input.tsx",
    Demo: OtpInputDemo,
    states: ["typing", "paste", "SMS autofill", "Backspace", "arrow keys", "loading", "error", "success", "disabled", "masked"],
    usage: `import { useState } from "react";
import { OtpInput, type OtpStatus } from "@/components/ui/otp-input";

export function VerifyStep() {
  const [status, setStatus] = useState<OtpStatus>("idle");

  return (
    <form action="/api/verify">
      <OtpInput
        name="otp"
        length={6}
        groupSize={3}
        status={status}
        message={status === "error" ? "That code didn't match." : "We sent a code to your phone."}
        onComplete={async (code) => {
          setStatus("loading");
          const ok = await verifyCode(code);
          setStatus(ok ? "success" : "error");
        }}
      />
    </form>
  );
}`,
    props: [
      { name: "length", type: "number", default: "6", description: "Number of boxes." },
      { name: "value / defaultValue", type: "string", description: "Controlled value, or the starting value when uncontrolled." },
      { name: "onChange", type: "(value: string) => void", description: "Called on every change." },
      { name: "onComplete", type: "(value: string) => void", description: "Called once when every box is filled." },
      { name: "mode", type: '"numeric" | "alphanumeric"', default: '"numeric"', description: "Allowed characters (letters are upper-cased) and the mobile keyboard." },
      { name: "mask", type: "boolean", default: "false", description: "Hide characters like a password." },
      { name: "status", type: '"idle" | "loading" | "error" | "success"', default: '"idle"', description: "Colours, ARIA and locking. Error shakes once." },
      { name: "label", type: "string", default: '"Verification code"', description: "Visible label, also names the group." },
      { name: "message", type: "string", description: "Helper or status text, announced politely." },
      { name: "groupSize", type: "number", description: "Insert a separator every N boxes (e.g. 3 → 123–456)." },
      { name: "disabled", type: "boolean", default: "false", description: "Lock every box." },
      { name: "name", type: "string", description: "Adds a hidden input so the code submits with a form." },
      { name: "autoFocus", type: "boolean", default: "false", description: "Focus the first box on mount." },
    ],
    prompt: `Build a reusable React + TypeScript + Tailwind v4 "OtpInput" (one-time code) for Next.js App Router.

- One <input> per character. Typed props: length (6), value / defaultValue (controlled or not), onChange, onComplete (fires once when full), mode ("numeric" | "alphanumeric", upper-case letters), mask, status ("idle" | "loading" | "error" | "success"), label, message, groupSize (separator every N), disabled, name (hidden input for forms), autoFocus.
- Typing fills and advances; invalid characters are ignored. Paste fills from that box (strip spaces/dashes). SMS autofill via autocomplete="one-time-code" on box 1 (whole code may land in one box). Backspace clears or steps back; Arrow keys, Home/End move. Never allow gaps: focusing past the first empty box jumps back to it. Select on focus. Must survive very fast typing.
- A11y: role="group" labelled by the label and described by the message (polite live region); each box aria-label "Digit 3 of 6"; aria-invalid on error; correct inputMode.
- States: loading (locked + spinner), error (red + one shake, reduced-motion safe), success (green), disabled, filled highlight.
- Boxes shrink to fit 320px screens; light/dark tokens; no dependencies.
Demo: verify flow with a fake check (code shown in the hint), resend countdown, clear button, plus a masked 4-digit PIN, an 8-char alphanumeric key grouped 4-4 and a disabled example.`,
    notes: [
      "Bug caught by the Playwright typing test: typing \"246810\" quickly produced \"480\". Focus moved to the next box before React re-rendered, so that box still saw the old code, thought it was past the first empty box and sent focus back. Handlers now read the latest code from a ref.",
      "The first fix wrote that ref during render, which the react-hooks/refs lint rule rejects. It is now synced in a layout effect, and commit() updates it immediately.",
      "The SMS-autofill test failed only in WebKit because it filled the box before React hydrated. A trace showed the component handles a whole code in one box correctly; the tests now wait for the page to settle.",
      "Firefox ignores clipboardData on synthetic paste events, so the paste test runs in Chromium and WebKit and is skipped (with a reason) in Firefox.",
    ],
  },
];

export function getEntry(slug: string): RegistryEntry | undefined {
  return registry.find((entry) => entry.slug === slug);
}
