import type { ComponentType } from "react";
import MagneticButtonDemo from "@/components/demos/magnetic-button-demo";
import TestimonialMarqueeDemo from "@/components/demos/testimonial-marquee-demo";

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
];

export function getEntry(slug: string): RegistryEntry | undefined {
  return registry.find((entry) => entry.slug === slug);
}
