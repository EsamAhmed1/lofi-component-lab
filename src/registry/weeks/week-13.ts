import BottomSheetDemo from "@/components/demos/bottom-sheet-demo";
import FileDropzoneDemo from "@/components/demos/file-dropzone-demo";
import KpiCardDemo from "@/components/demos/kpi-card-demo";
import type { RegistryEntry } from "../types";

export const week13: RegistryEntry[] = [
  {
    slug: "bottom-sheet",
    name: "Snap Bottom Sheet",
    kind: "modal",
    week: 13,
    added: "2026-11-21",
    summary:
      "A draggable sheet like the Apple Maps and Vaul drawers. It snaps between heights with a spring, a fast flick jumps to the next point or closes it, and the backdrop and the page behind follow your finger. On wide screens it can be a side drawer.",
    source: "src/components/ui/bottom-sheet.tsx",
    Demo: BottomSheetDemo,
    states: ["drag handle", "drag content", "flick", "spring snap", "rubber band", "backdrop fade", "scaled page", "pinned footer", "arrow keys", "Escape", "not dismissible", "side drawer", "reduced motion"],
    usage: `import { useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";

export function RidePicker() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState(0);

  return (
    <div ref={pageRef}>
      <button onClick={() => setOpen(true)}>Choose a ride</button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        snapPoints={[0.35, 0.65, 1]}
        activeSnap={snap}
        onSnapChange={setSnap}
        backgroundRef={pageRef}
        title="Choose a ride"
        description="6 options to SFO Terminal 2."
        footer={<button onClick={() => setOpen(false)}>Choose Comfort</button>}
      >
        <RideList />
      </BottomSheet>
    </div>
  );
}`,
    props: [
      { name: "open", type: "boolean", description: "Controlled open state. Leave it out to let the sheet manage it." },
      { name: "defaultOpen", type: "boolean", default: "false", description: "Starting open state when uncontrolled." },
      { name: "onOpenChange", type: "(open: boolean) => void", description: "Called when the sheet asks to open or close (drag, flick, Escape, backdrop, close button)." },
      { name: "snapPoints", type: "number[]", default: "[0.35, 0.65, 1]", description: "Fractions of the track: the viewport height for a bottom sheet, or the max width for a side drawer." },
      { name: "defaultSnap", type: "number", default: "0", description: "Snap index used on open when uncontrolled. The sheet returns to it after closing." },
      { name: "activeSnap", type: "number", description: "Controlled snap index." },
      { name: "onSnapChange", type: "(index: number) => void", description: "Called with the snap index picked by drag, flick, handle click or arrow keys." },
      { name: "title", type: "ReactNode", description: "Heading of the sheet. It labels the dialog." },
      { name: "description", type: "ReactNode", description: "Line under the title. It describes the dialog." },
      { name: "dismissible", type: "boolean", default: "true", description: "When false, Escape, the backdrop and a downward flick cannot close it, and there is no close button." },
      { name: "side", type: '"bottom" | "right"', default: '"bottom"', description: '"right" makes a side drawer when the viewport is at least 640px wide. Narrower screens get a bottom sheet.' },
      { name: "maxSize", type: "number", description: "Caps the track in px. Defaults to the viewport for a bottom sheet and 480 for a side drawer." },
      { name: "footer", type: "ReactNode", description: "Bar pinned to the visible bottom edge at every snap point." },
      { name: "backgroundRef", type: "RefObject<HTMLElement | null>", description: "Element behind the sheet that scales down and rounds its corners as the sheet opens." },
      { name: "handleLabel", type: "string", default: '"Resize sheet"', description: "Accessible name of the drag handle button." },
      { name: "closeLabel", type: "string", default: '"Close"', description: "Accessible name of the close button." },
      { name: "children", type: "ReactNode", description: "Sheet content. It scrolls only at the top snap point." },
      { name: "className", type: "string", description: "Extra classes on the sheet panel." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 BottomSheet, no dependencies: a draggable dialog with snap points, flicks and a spring. Typed props, responsive, light/dark, focus trap, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called BottomSheet with no dependencies: a draggable sheet like Vaul on the native <dialog>. Drag the handle, header or content with pointer capture. On release it springs (rAF) to the nearest snap point, and a fast flick goes to the next one or closes it. Rubber band past the top, the backdrop fades with the drag, the page behind scales down and a footer stays pinned. Content scrolls only at the top snap point. A side prop turns it into a right drawer on wide screens. Typed props (open, onOpenChange, snapPoints, defaultSnap, activeSnap, onSnapChange, title, description, dismissible, side), responsive, light and dark mode, accessible (focus trap, labelled dialog, handle with arrow keys, focus return), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "BottomSheet" (draggable snap sheet, like Vaul) for Next.js App Router.

- Props: open / defaultOpen / onOpenChange, snapPoints (fractions, default [0.35, 0.65, 1]), defaultSnap, activeSnap / onSnapChange, title, description, dismissible, side ("bottom" | "right"), maxSize, footer, backgroundRef, handleLabel, closeLabel, className.
- Native <dialog> with showModal for the focus trap, Escape and inert page. overflow: clip so focus never scrolls the layer. Scroll lock.
- A small engine outside React: pointer events with capture and a 6px slop, a spring in rAF, writes transform and backdrop opacity straight to the DOM.
- Release: nearest snap point, or the next one on a flick (0.45 px/ms); the finger's speed carries into the spring. Closes below the first point when dismissible. Rubber band past the top (panel is 96px longer than its top snap).
- Content scrolls only at the top snap point; below it, dragging the content moves the sheet. Clicks after a drag are swallowed.
- Footer pinned to the visible edge. backgroundRef scales and rounds the page behind.
- side="right" is a drawer at 640px and up, a bottom sheet below.
- A11y: aria-labelledby/describedby, handle button "Resize sheet" (arrows, Home/End, Enter cycles), live region "Sheet at 65%", focus returns to the trigger.
- Reduced motion: jumps, no spring.
Demo: a "Choose a ride" sheet with 6 rides and a pinned confirm button, a "Filters" side drawer, and a snap readout.`,
    notes: [
      "All the motion runs in a small engine outside React. It keeps the size, speed and target, runs the spring in requestAnimationFrame and writes the transform and backdrop opacity straight to the DOM. React only re-renders when the snap index changes, so dragging stays smooth.",
      "The sheet starts below the screen, and showModal focuses the handle straight away. A box with overflow: hidden can still scroll to reveal a focused child, which would shift the whole layer. The dialog uses overflow: clip, which never scrolls.",
      "The panel is 96px longer than its top snap point and hangs below the screen edge. So the rubber band past the top shows more sheet, not a gap. The footer moves up by the panel's offset, which keeps the confirm button on screen at every snap point.",
      "At the top snap point the content scrolls natively with touch-action: pan-y, so a touch drag on the list cannot also pull the sheet down. The header always can, and a mouse can pull the content down once the list is at the top.",
    ],
  },
  {
    slug: "kpi-card",
    name: "KPI Spark Card",
    kind: "card",
    week: 13,
    added: "2026-11-21",
    summary:
      "A dashboard stat card. The value rolls in digit by digit when it scrolls into view, a badge shows the change, and the sparkline can be scrubbed with a pointer or the arrow keys. It has a target bar, a glowing highlight variant, and loading and error states.",
    source: "src/components/ui/kpi-card.tsx",
    Demo: KpiCardDemo,
    states: ["digit roll", "delta up / down", "inverted delta", "sparkline scrub", "keyboard scrub", "target bar", "highlight glow", "minimal", "link hover", "focus-visible", "loading", "error + retry", "reduced motion"],
    usage: `import { KpiCard } from "@/components/ui/kpi-card";

export function RevenueTile({ revenue, history }: { revenue: number; history: number[] }) {
  return (
    <KpiCard
      variant="highlight"
      label="Revenue"
      icon={<DollarIcon />}
      format="currency"
      value={revenue}
      previousValue={42890}
      data={history}
      dataLabels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
      target={60000}
      targetLabel="Q4 goal"
      href="/reports/revenue"
    />
  );
}`,
    props: [
      { name: "label", type: "string", description: "Metric name. It labels the card and, with href, is the link." },
      { name: "value", type: "number", description: 'Current value. For "percent", pass a fraction (0.034 is 3.4%).' },
      { name: "previousValue", type: "number", description: "Previous period. Used for the delta and the \"vs $42,890 last month\" line." },
      { name: "delta", type: "number", description: "Change in percent (12.4 is +12.4%). Overrides the one worked out from previousValue." },
      { name: "invert", type: "boolean", default: "false", description: "A fall is good (churn, load time), so a down arrow is green." },
      { name: "period", type: "string", default: '"last month"', description: 'Used in "vs ... last month" and the screen-reader delta.' },
      { name: "format", type: '"currency" | "percent" | "number" | "compact"', default: '"number"', description: "How every number on the card is formatted, with Intl.NumberFormat." },
      { name: "locale", type: "string", default: '"en-US"', description: "Locale for all numbers." },
      { name: "currency", type: "string", default: '"USD"', description: 'ISO code for the "currency" format.' },
      { name: "decimals", type: "number", description: "Fraction digits. Defaults: currency 0, percent 1, compact 1, number 0." },
      { name: "data", type: "number[]", description: "Sparkline values, oldest first. Needs two or more." },
      { name: "dataLabels", type: "string[]", description: 'Name of each point for the scrub readout, e.g. "Mar".' },
      { name: "target", type: "number", description: "Shows a progress bar of value / target." },
      { name: "targetLabel", type: "string", default: '"goal"', description: 'Word after the target, as in "80% of $60,000 goal".' },
      { name: "icon", type: "ReactNode", description: "Small icon next to the label." },
      { name: "variant", type: '"default" | "highlight" | "minimal"', default: '"default"', description: "Bordered card, card with a rotating glow border, or no frame." },
      { name: "loading", type: "boolean", default: "false", description: "Shows a shimmer skeleton and sets aria-busy." },
      { name: "error", type: "boolean | string", description: "Shows the error state. A string replaces the default message." },
      { name: "onRetry", type: "() => void", description: "Adds a Retry button to the error state." },
      { name: "href", type: "string", description: "Makes the whole card a link with a lift on hover." },
      { name: "className", type: "string", description: "Extra classes on the outer element." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 KpiCard, no dependencies: stat card with digit roll, delta, scrub sparkline, goal bar. Typed props, responsive, light/dark, keyboard + ARIA, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called KpiCard with no dependencies: a dashboard stat card. The value rolls in digit by digit when scrolled into view, a delta badge shows the change (green or red, invert for churn), an SVG sparkline with a gradient fill can be scrubbed with the pointer or arrow keys and shows the point in the header, and an optional target bar fills up. Variants default, highlight (rotating glow border) and minimal, plus loading skeleton and error with retry. Typed props (label, value, previousValue, delta, invert, format, locale, data, dataLabels, target, icon, variant, loading, error, onRetry, href), responsive, light and dark mode, accessible (sr-only delta, sparkline summary, slider for scrubbing, card link), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "KpiCard" (dashboard stat card) for Next.js App Router.

- Props: label, value, previousValue or delta, invert, period, format ("currency" | "percent" | "number" | "compact"), locale, currency, decimals, data, dataLabels, target, targetLabel, icon, variant ("default" | "highlight" | "minimal"), loading, error, onRetry, href, className.
- Format with Intl.NumberFormat. The big value is a ticker: each digit is a column of 0-9 that rolls into place with a stagger once 40% visible (IntersectionObserver). sr-only text holds the real value.
- Delta badge ▲ 12.4% green / ▼ red, flipped by invert. sr-only "up 12.4% from last month".
- SVG sparkline (Catmull-Rom curve, gradient fill, non-scaling stroke) revealed with a clip-path wipe. role="img" with a trend summary.
- Scrub: a role="slider" overlay. Pointer or touch picks the nearest point, arrows / Home / End step, aria-valuetext reads it. The header badge swaps to "Mar: $41,500".
- Optional target bar. Highlight variant: rotating conic glow border.
- Loading shimmer skeleton (aria-busy) and error state (role="alert") with Retry. Digits roll in again after loading.
- href: the label is a link whose ::after covers the card, with the focus ring on the card. The sparkline sits above it.
- Container queries. Reduced motion: no roll, wipe, spin or shimmer.
Demo: Revenue, Active users, Conversion and Churn (inverted) in 1, 2 or 4 columns, with loading and error toggles, plus three minimal cards.`,
    notes: [
      "A whole-card link cannot hold the focusable sparkline or the Retry button inside it. So the label is the link and its ::after stretches over the card and carries the focus ring. The sparkline and the Retry button sit above it with a higher z-index.",
      "The sparkline SVG uses preserveAspectRatio=\"none\" so it fills any width. That would squash a circle into an oval, so the scrub dot and guide line are HTML placed in percent, and the line uses vector-effect: non-scaling-stroke.",
      "The ticker renders the final formatted string and only animates digit columns. The width never jumps while rolling, and Intl still handles currency signs, separators and compact suffixes.",
      "After a loading or error state the value mounts again, but the card has already been seen, so it would appear without rolling. An armed flag is reset during render when the card leaves the ready state and set again one frame later, so the digits, wipe and bar animate again.",
    ],
  },
  {
    slug: "file-dropzone",
    name: "File Dropzone",
    kind: "form",
    week: 13,
    added: "2026-11-21",
    summary:
      "An upload area you can drop files on, click or paste into. Dragging lights it up with marching ants, a bouncing icon and a file count. Each file gets a thumbnail or type icon, a progress ring, and cancel, retry and remove buttons, with an overall bar on top.",
    source: "src/components/ui/file-dropzone.tsx",
    Demo: FileDropzoneDemo,
    states: ["idle", "hover", "focus-visible", "drag over", "file count", "paste", "rejected type / size / count", "queued", "uploading", "done", "error + retry", "cancelled", "disabled", "reduced motion"],
    usage: `import { FileDropzone, type UploadFn } from "@/components/ui/file-dropzone";

const upload: UploadFn = (file, onProgress, signal) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", \`/api/uploads/\${encodeURIComponent(file.name)}\`);
    xhr.upload.onprogress = (e) => onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Upload failed.")));
    xhr.onerror = () => reject(new Error("Network error."));
    signal.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });

export function AssetUploader() {
  return (
    <FileDropzone
      accept="image/*,.pdf,.zip"
      maxSize={10 * 1024 * 1024}
      maxFiles={8}
      upload={upload}
      onFilesChange={(files) => console.log(files.map((f) => f.status))}
    />
  );
}`,
    props: [
      { name: "accept", type: "string", description: 'Same syntax as the input accept attribute, e.g. "image/*,.pdf".' },
      { name: "acceptLabel", type: "string", description: 'Readable list for messages, e.g. "Images, PDF or ZIP". Worked out from accept by default.' },
      { name: "maxSize", type: "number", description: "Largest file in bytes." },
      { name: "maxFiles", type: "number", description: "Most files in the list. Extra files are rejected with a message." },
      { name: "multiple", type: "boolean", default: "true", description: "When false, one file at a time, and a new file replaces the old one." },
      { name: "upload", type: "(file, onProgress, signal) => Promise<void>", description: "Uploads one file. Report progress from 0 to 1, reject with an Error to show its message, stop on abort." },
      { name: "concurrency", type: "number", default: "2", description: "Uploads that run at the same time." },
      { name: "onFilesChange", type: "(files: DropzoneFile[]) => void", description: "Called with the whole list ({ id, file, status, progress, error?, previewUrl? }) after every change." },
      { name: "disabled", type: "boolean", default: "false", description: "Blocks click, drop and paste." },
      { name: "label", type: "string", default: '"Drop files here, or click to browse"', description: "Main line in the drop area. It names the button." },
      { name: "description", type: "string", description: "Instructions under the label. Built from accept, maxSize and maxFiles by default." },
      { name: "className", type: "string", description: "Extra classes on the wrapper." },
      { name: "ref", type: "Ref<FileDropzoneHandle>", description: "{ addFiles(files), clear() } to add files from code or reset the list." },
    ],
    brief:
      "Build a React 19 + TypeScript + Tailwind v4 FileDropzone, no dependencies: drop/click/paste files, marching ants, previews, progress. Typed props, responsive, light/dark, live region, reduced motion.",
    postPrompt:
      "Build a React 19 + TypeScript + Tailwind v4 component called FileDropzone with no dependencies: an upload area. Drop files on it, click it (a real button with a hidden input) or paste. While dragging it lights up with marching ants, a bouncing icon and a \"Drop 3 files\" count. Files are checked against accept, maxSize and maxFiles, with a message per file. Each file shows an image thumbnail (object URL, revoked on remove) or a type icon, its size, a progress ring and bar, and cancel, retry and remove buttons, plus an overall bar. An upload(file, onProgress, signal) prop does the work. Typed props (accept, maxSize, maxFiles, multiple, upload, onFilesChange, disabled, label, description), responsive, light and dark mode, accessible (named buttons, live region), reduced-motion support.",
    prompt: `Build a reusable React 19 + TypeScript + Tailwind v4 "FileDropzone" (upload area with progress) for Next.js App Router.

- Props: accept, acceptLabel, maxSize, maxFiles, multiple, upload(file, onProgress, signal) => Promise, concurrency (2), onFilesChange, disabled, label, description, className, ref ({ addFiles, clear }).
- The zone is a native button (Enter/Space/click opens a hidden input) with aria-labelledby and aria-describedby instructions. Drop handlers sit on a wrapper. Paste works while focus is inside.
- Drag over: SVG rect border with marching ants, radial glow, slight scale, bouncing gradient icon, "Drop 3 files" plus a fan of page cards.
- Validation per file with friendly text: type, size ("It's 14 MB. The limit is 10 MB."), count. Rejections listed with Dismiss buttons.
- Files: image thumbnails via URL.createObjectURL (revoked on remove, replace and unmount), else a typed icon. Name, size, status (queued, uploading %, done, error), progress ring and bar. Cancel aborts, Retry, Remove.
- Uploads run through a queue with AbortControllers; a ref store avoids stale closures. Overall progress bar on top (by bytes).
- role="status" live region: added, rejected, uploaded, failed. Every action is a named button.
- Reduced motion: no marching, bounce or sheen. Container queries.
Demo: an "Upload project assets" form with sample files (one always fails, two rejected), a fake timer upload, and Save enabled when all are done. Files never leave the browser.`,
    notes: [
      "Upload callbacks finish long after the render that started them. The file list lives in a ref store as well as state, so progress, done and error updates always patch the latest list, not a stale copy from an old closure.",
      "The drop handlers sit on a wrapper div, not on the button. When the zone is disabled the button has pointer-events: none, so a drop still lands on the wrapper and is swallowed instead of the browser opening the file in the tab.",
      "Thumbnails are object URLs made when files are added, never during render. They are revoked when a file is removed, when single mode replaces a file, and on unmount.",
      "A CSS dashed border cannot animate, so the border is an SVG rect inset by 1px with a rounded corner and an animated dash offset. The same rect gives the idle dashed look, so the switch to marching ants has no jump.",
    ],
  },
];
