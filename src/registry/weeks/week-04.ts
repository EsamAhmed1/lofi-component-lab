import HoloCardDemo from "@/components/demos/holo-card-demo";
import OrbitLoaderDemo from "@/components/demos/orbit-loader-demo";
import type { RegistryEntry } from "../types";

export const week04: RegistryEntry[] = [
  {
    slug: "holo-card",
    name: "Holo Foil Card",
    kind: "card",
    week: 4,
    added: "2026-11-20",
    summary:
      "A collectible trading card that tilts in 3D toward the pointer, with a rainbow foil, a sparkle or etched texture and a glare that follow it. Holo, gold and glass finishes, with stats on a solid panel and an optional link or button.",
    source: "src/components/ui/holo-card.tsx",
    Demo: HoloCardDemo,
    states: ["hover tilt", "spring return", "focus-visible tilt", "pressed", "tap to shine", "disabled", "reduced motion sheen", "link or button"],
    usage: `import { HoloCard } from "@/components/ui/holo-card";

export function AgentCard() {
  return (
    <HoloCard
      variant="holo"
      title="Nova"
      subtitle="Research agent"
      rarity="Mythic"
      art={<NovaIllustration />}
      stats={[
        { label: "Tasks", value: "1,284" },
        { label: "Accuracy", value: "98%" },
        { label: "Avg time", value: "1.4s" },
      ]}
      footer="#001 · Agent Series"
      href="/agents/nova"
    />
  );
}`,
    props: [
      { name: "title", type: "string", description: "Card name. Also names the link or button." },
      { name: "subtitle", type: "string", description: "Short line under the title." },
      { name: "image", type: "string", description: "Image URL for the art window." },
      { name: "imageAlt", type: "string", default: '""', description: "Alt text for the image. Empty means decorative." },
      { name: "art", type: "ReactNode", description: "Icon or illustration used when there is no image." },
      { name: "stats", type: "{ label: string; value: ReactNode }[]", default: "[]", description: "Stats shown in a row as a description list." },
      { name: "rarity", type: "string", description: "Tier badge in the top corner, e.g. \"Mythic\"." },
      { name: "footer", type: "ReactNode", description: "Small print at the bottom of the panel." },
      { name: "variant", type: '"holo" | "gold" | "glass"', default: '"holo"', description: "Foil finish. Glass follows the light or dark theme." },
      { name: "pattern", type: '"sparkle" | "etched" | "none"', description: "Texture layer. Defaults to sparkle (holo), etched (gold) or none (glass)." },
      { name: "intensity", type: "number", default: "1", description: "Strength of the foil and glare, from 0 to 1." },
      { name: "maxTilt", type: "number", default: "14", description: "Largest tilt in degrees." },
      { name: "href", type: "string", description: "Makes the whole card a link." },
      { name: "onClick", type: "(event) => void", description: "Makes the whole card a button. Ignored when href is set." },
      { name: "actionLabel", type: "string", description: "Accessible name for the link or button. Defaults to the title." },
      { name: "disabled", type: "boolean", default: "false", description: "Dims the card, stops the tilt and disables the link or button." },
      { name: "className / ref", type: "string / Ref<HTMLDivElement>", description: "Forwarded to the outer wrapper, along with other div props." },
    ],
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "HoloCard" (holographic trading card) for Next.js App Router.

- Props: title, subtitle, image + imageAlt or art (ReactNode), stats ({ label, value }[]), rarity badge, footer, variant ("holo" | "gold" | "glass"), pattern ("sparkle" | "etched" | "none"), intensity (0-1), maxTilt, href or onClick, actionLabel, disabled. Forward ref and className.
- The pointer drives rotateX/rotateY, a rainbow foil (repeating gradient, color-dodge or overlay, masked around the pointer), a texture layer and a glare. A small spring in requestAnimationFrame writes CSS variables, never React state, so the card wobbles back on leave.
- Parallax: preserve-3d with the art, badge and text panel at different translateZ. Blend layers sit in isolated groups.
- href or onClick adds a full-card link or button named by the title, with a focus ring. Keyboard focus gives a gentle static tilt and shine. Pressed scales down.
- Touch: moves are left to scrolling. A tap toggles the shine at the tapped spot.
- Text sits on an opaque panel for 4.5:1 contrast. Decorative layers are aria-hidden. Stats use a <dl>.
- Reduced motion (live listener): no tilt, a static diagonal sheen. Disabled: dimmed, no tilt.
Demo: three AI agent cards (holo, gold, glass) with SVG art and stats, 1 column on narrow containers and 3 on wide, plus a live "You picked" line.`,
    notes: [
      "Blend modes and preserve-3d fight each other: a 3D parent with overflow hidden gets flattened, and blending across 3D layers is unreliable. The tilting card has no overflow. The foil, texture and glare live inside isolated, clipped groups (the frame and the art window), which then move as whole 3D layers.",
      "The pointer position is measured on the untilted outer wrapper, not the card. The rotated card's box changes as it tilts, so measuring it would feed the tilt back into the pointer maths.",
      "The first spring loop was a useCallback that scheduled itself, and the react-hooks lint rule rejected it for using the callback before it was declared. The loop is now a plain function inside aim(), which only starts a new frame when none is running.",
      "Touch moves are ignored so a swipe over a card still scrolls the page. Touch fires pointerleave right after pointerup, so leave is also ignored for touch, otherwise the tap-to-shine state would reset at once.",
      "A keyboard audit after the build found no visible focus ring on the card. In Tailwind v4, outline-none sets the outline style variable to none, so focus-visible:outline-2 only changed the width. Adding focus-visible:outline-solid fixed it.",
    ],
  },
  {
    slug: "orbit-loader",
    name: "Orbit Loader",
    kind: "loader",
    week: 4,
    added: "2026-11-20",
    summary:
      "A loader with a glowing core and comet orbits. It can spin, fill a progress arc with a counting percentage, show pipeline steps, and morph into a success check or an error alert.",
    source: "src/components/ui/orbit-loader.tsx",
    Demo: OrbitLoaderDemo,
    states: ["indeterminate", "determinate", "steps", "idle (paused)", "success burst", "error shake", "reduced motion pulse", "sm / md / lg / px"],
    usage: `import { OrbitLoader } from "@/components/ui/orbit-loader";

const steps = ["Install packages", "Build pages", "Optimize images", "Go live"];

export function DeployStatus({ progress, step, failed }: { progress: number; step: number; failed: boolean }) {
  return (
    <OrbitLoader
      size="lg"
      label="Deploying your site"
      progress={progress}
      steps={steps}
      currentStep={step}
      status={failed ? "error" : progress >= 100 ? "success" : "loading"}
      successText="Your site is live."
      errorText="The build failed. Check the logs."
    />
  );
}`,
    props: [
      { name: "label", type: "string", description: "Required. What is loading. Names the progressbar or status." },
      { name: "hideLabel", type: "boolean", default: "false", description: "Keep the label and status text for screen readers only." },
      { name: "progress", type: "number", description: "0 to 100. Leave it out for an indeterminate spinner." },
      { name: "steps", type: "string[]", description: "Stage names shown under the loader as a pipeline." },
      { name: "currentStep", type: "number", default: "0", description: "Index of the active step. Earlier steps show as done." },
      { name: "status", type: '"idle" | "loading" | "success" | "error"', default: '"loading"', description: "Idle pauses the orbits. Success morphs into a check, error shakes and shows an alert." },
      { name: "size", type: '"sm" | "md" | "lg" | number', default: '"md"', description: "48, 96 or 144 px, or any pixel size. The % disc shows from 64 px up." },
      { name: "accent", type: "string", default: "var(--accent)", description: "Any CSS colour for the orbits, arc and steps." },
      { name: "speed", type: "number", default: "1", description: "Animation speed multiplier." },
      { name: "successText", type: "string", default: '"Done"', description: "Shown and announced on success." },
      { name: "errorText", type: "string", default: '"Something went wrong"', description: "Shown and announced on error." },
      { name: "className / ref", type: "string / Ref<HTMLDivElement>", description: "Forwarded to the outer wrapper, along with other div props." },
    ],
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "OrbitLoader" (kinetic loader) for Next.js App Router.

- SVG core with three comet orbits (1, 2 and 3 heads) at different speeds and directions. Trails are fading dots placed with rotate() so server and client markup match. The core glow pulses.
- Props: label (required), hideLabel, progress (0-100), steps, currentStep, status ("idle" | "loading" | "success" | "error"), size ("sm" | "md" | "lg" | px), accent (any CSS colour), speed, successText, errorText. Forward ref and className.
- Determinate: a progress arc plus a % disc that counts up in rAF, written to the DOM instead of state.
- Steps: a pipeline row under the loader. Done steps get a check, the current one pings, connectors fill.
- Success: orbits collapse and the core pops into a self-drawing check with a burst. Error: shake plus an alert icon. Idle pauses the orbits.
- A11y: role="progressbar" with aria-valuenow and valuetext when determinate, else role="status" with aria-busy. A polite live region shows and announces the step and final status. aria-current="step".
- Keyframes in a component <style> with href + precedence so React dedupes it. Names prefixed orbit-loader-.
- Reduced motion: orbits stop and breathe in opacity, no shake or burst, progress still updates.
Demo: a "Deploying your site" pipeline with 4 auto-running steps, Start/Restart and Simulate error buttons, plus a gallery of sizes, colours, speeds, success, error and an inline pill.`,
    notes: [
      "Placing trail dots with Math.cos and Math.sin risked hydration mismatches, because browsers can round the last digit differently from Node. Every dot now sits at the top of its ring and is placed with an SVG rotate() of a whole number of degrees, so the markup is identical everywhere.",
      "Caught in review: the glow pulse would have ignored the inline opacity meant to hide it on success, because a running CSS animation beats inline styles. The fade now lives on a wrapper group and the pulse animates only the inner circle.",
      "The percentage counts up in requestAnimationFrame and writes textContent directly. React renders the starting number once and never re-renders it, so the two never fight. The real value goes to aria-valuenow straight away.",
      "Idle was added on top of loading, success and error, so the demo can sit at 0% with the orbits paused and aria-busy false before the deploy starts.",
    ],
  },
];
