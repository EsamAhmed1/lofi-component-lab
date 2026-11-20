import ActivityRingsDemo from "@/components/demos/activity-rings-demo";
import PeekabooLoginDemo from "@/components/demos/peekaboo-login-demo";
import type { RegistryEntry } from "../types";

export const week06: RegistryEntry[] = [
  {
    slug: "peekaboo-login",
    name: "Peekaboo Login Form",
    kind: "form",
    week: 6,
    added: "2026-11-20",
    summary:
      "A sign-in form with an owl mascot that follows your typing, covers its eyes for the password and peeks when you show it. It shakes its head on errors and bounces when you get in.",
    source: "src/components/ui/peekaboo-login.tsx",
    Demo: PeekabooLoginDemo,
    states: [
      "watching the caret",
      "eyes covered",
      "peeking",
      "idle blink",
      "inline errors",
      "loading",
      "error banner",
      "success",
      "disabled",
      "reduced motion",
    ],
    usage: `import { useRouter } from "next/navigation";
import { PeekabooLogin } from "@/components/ui/peekaboo-login";

export function SignInPage() {
  const router = useRouter();
  return (
    <PeekabooLogin
      title="Welcome back"
      subtitle="Sign in to your workspace."
      minPasswordLength={8}
      forgotHref="/reset-password"
      signUpHref="/sign-up"
      onSubmit={async ({ email, password, remember }) => {
        const res = await fetch("/api/sign-in", {
          method: "POST",
          body: JSON.stringify({ email, password, remember }),
        });
        // A rejected promise shows its message in the error banner.
        if (!res.ok) throw new Error("That email and password don't match.");
        router.push("/dashboard");
      }}
    />
  );
}`,
    props: [
      { name: "onSubmit", type: "(values: { email; password; remember }) => Promise<unknown>", description: "Runs after validation passes. Resolve for the success state; reject to show the error banner with the error's message." },
      { name: "title", type: "string", default: '"Welcome back"', description: "Heading above the form." },
      { name: "subtitle", type: "string", default: '"Sign in to continue."', description: "Line under the heading." },
      { name: "hint", type: "ReactNode", description: "Extra helper box under the subtitle, e.g. demo credentials." },
      { name: "mascotColor", type: "string", default: '"#8b6cf6"', description: "Owl body colour. Darker and lighter shades are mixed from it." },
      { name: "minPasswordLength", type: "number", default: "8", description: "Shortest password that passes validation." },
      { name: "forgotHref", type: "string", default: '"#"', description: "Link for the forgot password action." },
      { name: "signUpHref", type: "string", description: "Shows a \"Create an account\" link when set." },
      { name: "labels", type: "Partial<PeekabooLoginLabels>", description: "Override any text: field labels, placeholders, error messages, button text, success copy." },
      { name: "disabled", type: "boolean", default: "false", description: "Locks every field, the toggle and the submit button." },
      { name: "className", type: "string", description: "Extra classes for the card." },
    ],
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "PeekabooLogin" sign-in form with an animated owl mascot for Next.js App Router.

- Inline SVG owl in a round window. Email focus: eyes and head follow the caret (canvas measureText of the value). Password focus: wings rise to cover the eyes. Show password on: one wing drops so it peeks. Error: head shake, sad brows, droopy lids. Success: bounce, happy eyes, blush. Idle blink on a timer via Web Animations.
- Props: onSubmit({ email, password, remember }) => Promise (reject shows the banner with its message), title, subtitle, hint, mascotColor, minPasswordLength, forgotHref, signUpHref, labels (partial overrides), disabled, className.
- Validate on blur and submit: email format, password min length. Errors linked with aria-describedby and aria-invalid. Focus the first invalid field.
- Show/hide toggle with aria-pressed that keeps focus in the field. Remember me checkbox, forgot link, submit with spinner and aria-busy, role="alert" banner, polite live region, focused success panel.
- Reduced motion (live via matchMedia): poses snap with no tween, no shake, bounce or blink. Caret tracking writes CSS variables in rAF.
- Light/dark tokens, 44px targets, fits 320px, no dependencies.
Demo: fake auth (demo@lofi.dev / lofi1234 succeeds, anything else fails after 900ms) with the hint shown, plus a disabled teal variant.`,
    notes: [
      "Inputs with type=\"email\" have no selection API, so selectionStart is null. The caret is taken as the end of the value and measured with canvas measureText using the input's computed font, minus scrollLeft.",
      "Clicking the eye toggle would move focus off the password field, and Safari does not focus buttons on click at all. The owl would drop its wings mid-click. The field and toggle now share one focus zone and the toggle cancels mousedown, so focus stays in the field.",
      "The blink, head shake and bounce use the Web Animations API on SVG groups, so they never re-render the form. Pose changes are CSS transitions that motion-reduce turns off, so with reduced motion the owl snaps between poses.",
      "Reduced motion is read through useSyncExternalStore. It follows the OS setting live without calling setState inside an effect, which the react-hooks lint rules reject.",
    ],
  },
  {
    slug: "activity-rings",
    name: "Activity Rings",
    kind: "chart",
    week: 6,
    added: "2026-11-20",
    summary:
      "Apple Watch style progress rings with gradient strokes, shadowed tips and a darker second lap past 100%. They draw in on scroll, highlight from the legend, and a week row switches the day.",
    source: "src/components/ui/activity-rings.tsx",
    Demo: ActivityRingsDemo,
    states: [
      "draw-in on scroll",
      "over 100% lap",
      "hover / focus highlight",
      "pinned legend item",
      "day picker",
      "tween between days",
      "no legend",
      "static",
      "reduced motion",
    ],
    usage: `import { useState } from "react";
import { ActivityRings, type ActivityDay, type ActivityRing } from "@/components/ui/activity-rings";

const rings: ActivityRing[] = [
  { id: "move", label: "Move", value: 420, goal: 500, unit: "kcal", colors: ["#e11d48", "#fb7185"] },
  { id: "exercise", label: "Exercise", value: 38, goal: 30, unit: "min", colors: ["#65a30d", "#bef264"] },
  { id: "stand", label: "Stand", value: 9, goal: 12, unit: "hr", colors: ["#0891b2", "#67e8f9"] },
];

export function TodayCard({ week }: { week: ActivityDay[] }) {
  const [day, setDay] = useState(week.length - 1);
  return (
    <ActivityRings
      title="This week"
      rings={rings}
      days={week} // [{ label: "Mon", values: { move: 512, exercise: 34, stand: 12 } }, ...]
      selectedDay={day}
      onSelectDay={setDay}
    />
  );
}`,
    props: [
      { name: "rings", type: "ActivityRing[]", description: "{ id, label, value, goal, unit, colors: [from, to], icon? }. Outermost first." },
      { name: "size", type: "number", default: "260", description: "Diameter of the main rings in px. Shrinks to fit narrow containers." },
      { name: "thickness", type: "number", default: "20", description: "Stroke width of each ring in px." },
      { name: "gap", type: "number", default: "6", description: "Space between rings in px." },
      { name: "days", type: "ActivityDay[]", description: "{ label, fullLabel?, values: Record<ringId, number> }[]. Shows the week row of mini rings." },
      { name: "selectedDay", type: "number", description: "Selected day index (controlled)." },
      { name: "defaultSelectedDay", type: "number", default: "last day", description: "Starting day when uncontrolled." },
      { name: "onSelectDay", type: "(index: number) => void", description: "Called when a day is picked." },
      { name: "title", type: "string", default: '"Activity"', description: "Heading. The selected day name is added after it." },
      { name: "showLegend", type: "boolean", default: "true", description: "Show the legend buttons next to the rings." },
      { name: "animate", type: "boolean", default: "true", description: "Draw in on scroll and tween between days. Off under reduced motion." },
      { name: "className", type: "string", description: "Extra classes for the root section." },
    ],
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "ActivityRings" chart (Apple Watch style) for Next.js App Router.

- Concentric SVG rings with a track, an angular gradient (90 color-mix arc segments), round caps and a soft shadow ahead of the tip. Over 100% wraps a darker second lap on top, capped at 2 laps.
- Draw in when scrolled into view (IntersectionObserver), staggered per ring. Switching days tweens from the current value. Paint each frame straight to the DOM in rAF, not React state.
- Hover a ring, or hover or focus a legend item, to dim the others and show label, percent and value/goal in the centre. Click pins it (aria-pressed).
- Legend: icon chip, label, value / goal unit, percent.
- Optional week mode: 7 mini ring sets as buttons with aria-pressed and full aria-labels. Clicking one sets the main rings. Controlled or uncontrolled.
- Props: rings ({ id, label, value, goal, unit, colors: [from, to], icon? }[]), size, thickness, gap, days, selectedDay, defaultSelectedDay, onSelectDay, title, showLegend, animate, className.
- A11y: svg role="img" with a full aria-label summary, a visually hidden data table, a polite "x of 3 rings closed" region.
- Reduced motion: no draw-in. Container queries stack rings and legend when narrow and put them side by side when wide.
Demo: Move 420/500 kcal, Exercise 38/30 min, Stand 9/12 hr with 7 days, plus a compact no-legend set and a static two-ring set.`,
    notes: [
      "SVG has no conic gradient. The first lap is 90 short arc segments, each coloured with color-mix, plus a partial head segment and round caps drawn as discs. This gives a real angular gradient in all three engines without masks or foreignObject.",
      "The draw-in is painted straight to the DOM inside requestAnimationFrame, so React does not re-render every frame. React renders those attributes with constant values, so a hover re-render never overwrites the painted progress.",
      "The react-hooks purity lint rule flagged performance.now() inside the effect. The tween clock now starts from the first animation frame's timestamp instead.",
      "In the first preview the blurred glow behind the rings tinted the centre under the readout. It now has a radial mask, so the centre text sits on the plain card background.",
    ],
  },
];
